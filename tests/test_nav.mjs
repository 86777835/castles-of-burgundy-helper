// Back buttons, no horizontal overflow at 320px, guide search, tile filters, room code kept on sub pages.
import assert from 'node:assert/strict';
import {BASE, browser, phone, act, room, shot} from './helpers.mjs';
const b = await browser();
try {
  const c = await phone(b), p = await c.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  async function check(label) {
    await p.evaluate(() => scrollTo(0, 0));
    const bad = await p.locator('.back-nav:not(.rate-nav)').evaluate(nav => {
      const a = nav.getBoundingClientRect(), out = [];
      if (a.height < 36 || a.top < 0) out.push('back button not visible');
      if (document.documentElement.scrollWidth > innerWidth) out.push('horizontal overflow');
      for (const el of document.querySelectorAll('a,button,input,select,h1,.conn')) {
        if (el === nav || el.contains(nav) || el.closest('.cpanel')) continue;
        const r = el.getBoundingClientRect();
        if (r.width && r.height && a.left < r.right && a.right > r.left && a.top < r.bottom && a.bottom > r.top) out.push('overlap ' + el.textContent.slice(0, 10));
      }
      return out;
    });
    assert.deepEqual(bad, [], label); console.log('PASS layout', label);
  }
  await p.goto(BASE);
  assert.equal(await p.locator('.back-nav:not(.rate-nav)').textContent(), '‹ 全部游戏');
  assert.equal(await p.locator('.back-nav:not(.rate-nav)').getAttribute('href'), 'https://boardgame.leisurecat.cloud');
  await check('landing'); await shot(p, 'landing');
  const code = await room(p); assert.equal(await p.locator('.back-nav:not(.rate-nav)').textContent(), '‹ 首页'); await check('setup');
  await act(p, 'begin'); await check('play'); await shot(p, 'play');
  for (const page of ['guide', 'tiles', 'history']) {
    await p.goto(new URL(`${page}.html?r=${code}`, BASE).href);
    assert.equal(await p.locator('.back-nav:not(.rate-nav)').textContent(), '‹ 返回');
    assert.equal(await p.locator('.back-nav:not(.rate-nav)').getAttribute('href'), '/?r=' + code);
    await check(page); await shot(p, page);
    await p.setViewportSize({width: 320, height: 700}); await check(page + ' 320px'); await p.setViewportSize({width: 390, height: 844});
  }
  // Guide: lessons render, mistakes anchor, FAQ search understands player nicknames.
  await p.goto(new URL('guide.html', BASE).href); await p.waitForSelector('#mistakes');
  await p.fill('#search', '黑市'); assert(await p.locator('.faq-item:not([hidden])').count() > 0);
  await p.fill('#search', '完全不存在的词'); assert(await p.locator('#no-faq').isVisible());
  // Tiles: number search and per-edition differences.
  await p.goto(new URL('tiles.html?ed=r11', BASE).href);
  await p.fill('#q', '26'); assert.match(await p.locator('#list').innerText(), /2011 版：每块 2 分/);
  await p.click('#ed [data-ed="se"]'); assert.match(await p.locator('#list').innerText(), /典藏版：每块 3 分/);
  await p.fill('#q', '18'); assert.match(await p.locator('#list').innerText(), /16–23|盾徽 18/);
  await p.fill('#q', ''); await p.click('#kind [data-kind="shield"]'); assert.equal(await p.locator('.tile-row').count(), 18);
  await p.click('#ed [data-ed="r11"]'); assert.equal(await p.locator('.tile-row').count(), 0);
  await shot(p, 'tiles_filter');
  await p.goto(BASE); await p.setViewportSize({width: 320, height: 700}); await check('landing 320px');
  assert.deepEqual(errors, []);
  console.log('ALL PASS navigation, layout, guide search, tile filters');
} finally { await b.close(); }
