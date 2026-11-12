// Rules assistant. Usage: node tests/test_chat.mjs <base-url> <shots-dir> [--no-key | --mock-web]
//   --no-key   local `wrangler dev` without DEEPSEEK_API_KEY: a clear error, no model name shown
//   --mock-web local `wrangler dev --var DEEPSEEK_API_KEY:fake --var DEEPSEEK_BASE:http://127.0.0.1:8790 --var CHAT_CF_MODEL:@cf/none/missing`:
//              web search when the site's notes don't cover a question (DeepSeek and its search API are a local mock)
import assert from 'node:assert/strict';
import {BASE, OUT, browser, phone, shot} from './helpers.mjs';
const mode = process.argv.find(a => a.startsWith('--'));
assert(['--no-key', '--mock-web'].includes(mode), 'Run with --no-key or --mock-web');

if (mode === '--no-key') {
  const b = await browser();
  try {
    const c = await phone(b), p = await c.newPage();
    await p.goto(BASE); await p.click('.cfab'); await p.fill('.cin textarea', '卖货得几分？'); await p.click('.cin button');
    await p.waitForFunction(() => document.querySelector('.clog').textContent.includes('还没有配置好'));
    assert.doesNotMatch(await p.locator('.clog').textContent(), /DeepSeek|Qwen|Flash|Pro/);
    assert.match(await p.locator('.chd').innerText(), /查不到会联网找/);
    await shot(p, 'chat_no_key'); await p.click('.cx'); assert(await p.locator('.cfab').isVisible());
    console.log('PASS chat --no-key: explicit error, no model label');
  } finally { await b.close(); }
}

if (mode === '--mock-web') {
  // The mock model asks to search for questions containing 「网上」; the mock search API answers per `search`.
  const {createServer} = await import('node:http');
  let search = 'ok', asked = [], systems = [];   // search: 'ok' | 'empty' | 'fail'; asked: search queries received
  const sse = text => `data: ${JSON.stringify({choices: [{delta: {content: text}}]})}\n\ndata: [DONE]\n\n`;
  const srv = createServer((req, res) => {
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', () => {
      const j = JSON.parse(body);
      if (req.url === '/v1/tools/search') {
        asked.push(j.query);
        if (search === 'fail') { res.writeHead(500); return res.end('{}'); }
        res.writeHead(200, {'content-type': 'application/json'});
        return res.end(JSON.stringify({results: search === 'empty' ? [] : [
          {title: 'Inn question <b>', url: 'https://boardgamegeek.com/thread/1', site_name: 'BoardGameGeek', summary: 'Publisher: inns are not removed.'},
          {title: '旅店讨论', url: 'https://example.cn/a', site_name: null, snippet: '网友说旅店不清走。'}]}));
      }
      const sys = j.messages[0].content, q = j.messages.at(-1).content;
      systems.push(sys);
      res.writeHead(200, {'content-type': 'text/event-stream'});
      if (sys.includes('联网搜索到的网页摘要')) return res.end(sse(`依据网上说法：旅店不清走 [1]（摘要条数 ${(sys.match(/^\[\d\] /gm) || []).length}）`));
      if (q.includes('先解释')) {   // the model explains first and asks to search at the end
        res.write(`data: ${JSON.stringify({choices: [{delta: {content: '资料里没有提到这一点。'}}]})}\n\n`);
        return setTimeout(() => res.end(sse('\n\n【需联网】Castles of Burgundy Special Edition vineyard')), 300);
      }
      if (q.includes('网上')) {   // the marker arrives split over two chunks, like a real stream
        res.write(`data: ${JSON.stringify({choices: [{delta: {content: '【需'}}]})}\n\n`);
        return setTimeout(() => res.end(sse('联网】Castles of Burgundy inn')), 200);
      }
      res.end(sse(q.includes('无关') ? '我只解答勃艮第城堡的规则。' : '资料里的回答'));
    });
  }).listen(8790);
  const b = await browser();
  try {
    const c = await phone(b), page = await c.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const bodies = []; page.on('request', r => r.url().endsWith('/api/chat') && bodies.push(JSON.parse(r.postData())));
    await page.goto(BASE); await page.click('.cfab');
    const askOnce = async (q, s) => {
      search = s; asked = [];
      await page.fill('.cin textarea', q); await page.press('.cin textarea', 'Enter');
      await page.waitForFunction(() => !document.querySelector('.cin button').disabled);
      return page.$$eval('.cm.a', l => { const a = l.at(-1); return {err: a.className.includes('err'), label: !!a.querySelector('.cweb'),
        text: [...a.childNodes].filter(n => !n.classList?.contains('cweb') && !n.classList?.contains('csrc')).map(n => n.textContent).join(''),
        src: [...a.querySelectorAll('.csrc a')].map(x => [x.textContent, x.getAttribute('href'), x.target])}; });
    };
    const SRC = [['[1] Inn question <b>BoardGameGeek', 'https://boardgamegeek.com/thread/1', '_blank'], ['[2] 旅店讨论example.cn', 'https://example.cn/a', '_blank']];
    assert.deepEqual([await askOnce('黑市一回合能买几块？', 'ok'), asked], [{err: false, label: false, text: '资料里的回答', src: []}, []]);
    console.log('PASS covered by the notes: answered directly, no search');
    // The notes round tells the model how to write search words; the web round carries the version rules.
    assert.match(systems[0], /以 Castles of Burgundy 开头[\s\S]*Castles of Burgundy Special Edition/);
    assert.deepEqual([await askOnce('网上怎么说旅店？', 'ok'), asked],
      [{err: false, label: true, text: '依据网上说法：旅店不清走 [1]（摘要条数 2）', src: SRC}, ['Castles of Burgundy inn site:boardgamegeek.com', 'Castles of Burgundy inn']]);
    assert.match(systems.at(-1), /三个版本[\s\S]*看不出版本时，提醒玩家按自己手里的版本核对规则书/);
    console.log('PASS not covered: marker split over chunks, searched BGG then the web, labelled, sources open in a new window, version rules in the prompt');
    await shot(page, 'chat_web');
    assert(!(await page.$$eval('.cm.a', l => l.map(x => x.textContent).join(''))).includes('需联网'), 'the search request never reaches the page');
    assert.deepEqual([await askOnce('网上还有啥？', 'empty'), asked.length],
      [{err: false, label: false, text: '本站资料里没有这一条，网上也没找到可靠的说法。建议翻一下规则书，或者问问桌上的老玩家。', src: []}, 2]);
    console.log('PASS nothing found: says so, no label, nothing made up');
    assert.deepEqual(bodies.at(-1).messages.slice(-3).map(m => m.content), ['网上怎么说旅店？', '依据网上说法：旅店不清走 [1]（摘要条数 2）', '网上还有啥？']);
    console.log('PASS web answer goes back as plain history (no label, no sources)');
    assert.equal((await askOnce('网上第三问？', 'fail')).text, '本站资料里没有这一条，联网查找也失败了，请过一会儿再问，或者翻一下规则书。');
    console.log('PASS search API down: says so');
    assert.deepEqual([(await askOnce('无关的问题', 'ok')).text, asked], ['我只解答勃艮第城堡的规则。', []]);
    console.log('PASS off-topic: no search');
    assert.deepEqual([await askOnce('先解释再查', 'ok'), asked],
      [{err: false, label: true, text: '依据网上说法：旅店不清走 [1]（摘要条数 2）', src: SRC}, ['Castles of Burgundy Special Edition vineyard site:boardgamegeek.com', 'Castles of Burgundy Special Edition vineyard']]);
    console.log('PASS marker at the end of an explanation: explanation dropped, searched');
    assert.deepEqual(errors, []);
    console.log('ALL PASS chat --mock-web');
  } finally { await b.close(); srv.close(); }
}
