// Rules assistant without a DeepSeek key: a clear error, and no model name shown.
import assert from 'node:assert/strict';
import {BASE, browser, phone, shot} from './helpers.mjs';
assert(process.argv.includes('--no-key'), 'This test needs --no-key (wrangler dev without DEEPSEEK_API_KEY)');
const b = await browser();
try {
  const c = await phone(b), p = await c.newPage();
  await p.goto(BASE); await p.click('.cfab'); await p.fill('.cin textarea', '卖货得几分？'); await p.click('.cin button');
  await p.waitForFunction(() => document.querySelector('.clog').textContent.includes('还没有配置好'));
  assert.doesNotMatch(await p.locator('.clog').textContent(), /DeepSeek|Qwen|Flash|Pro/);
  await shot(p, 'chat_no_key'); await p.click('.cx'); assert(await p.locator('.cfab').isVisible());
  console.log('PASS chat --no-key: explicit error, no model label');
} finally { await b.close(); }
