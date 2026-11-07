// Review card posts to the hub (intercepted, never sent online) with this game's key; not in the long image.
import assert from 'node:assert/strict';
import {browser, phone, act, room, score} from './helpers.mjs';
const b = await browser();
try {
  const c = await phone(b), p = await c.newPage(); let body;
  await p.route('https://boardgame.leisurecat.cloud/api/reviews', r => { body = r.request().postDataJSON(); return r.fulfill({json: {ok: true}}); });
  await room(p); await act(p, 'direct');
  await score(p, 'p0', {track0: 80}); await score(p, 'p1', {track0: 70});
  await act(p, 'finish'); await p.waitForSelector('#shot');
  await p.click('[data-act="star"][data-v="4"]'); await p.fill('#review-text', '本地拦截测试'); await act(p, 'review');
  assert.equal(body.game, 'castles-of-burgundy'); assert.equal(body.stars, 4); assert.equal(body.text, '本地拦截测试'); assert.match(body.room, /^[A-Z0-9]{4}$/);
  assert(!(await p.locator('#shot').innerText()).includes('本地拦截测试'));
  console.log('PASS review: intercepted, key castles-of-burgundy, stars/text/room, not in long image');
} finally { await b.close(); }
