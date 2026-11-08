// Two phones, full game: setup sync, phase A–E, scoring with a tie, result, long image, archive, revision.
import assert from 'node:assert/strict';
import {BASE, browser, phone, act, pick, mod, room, shot, score} from './helpers.mjs';
const b = await browser();
try {
  const c1 = await phone(b), c2 = await phone(b), p = await c1.newPage(), q = await c2.newPage(), errors = [];
  for (const x of [p, q]) x.on('pageerror', e => errors.push(e.message));
  const code = await room(p);
  await pick(p, 'n', 3); await mod(p, 'shields'); await mod(p, 'inns');
  await p.fill('[data-player="p0"][data-field="name"]', '阿青'); await p.locator('[data-player="p0"][data-field="name"]').blur(); assert.match(await p.locator('[data-act="order"]').innerText(), /手指轮盘/); await pick(p, 'first', 1);
  await q.goto(p.url()); await q.waitForSelector('#checklist');
  assert(await q.locator('[data-act="begin"]').isDisabled(), 'guest cannot start');
  assert.match(await q.locator('#checklist').innerText(), /1、3、5 号各 1 块，2、4、6 号各 2 块/);
  await q.locator('[data-check="board"] + .tick').click(); await p.waitForSelector('[data-check="board"]:checked');
  await shot(p, 'setup');
  await act(p, 'begin'); await q.waitForSelector('.phase');
  assert.match(await q.locator('.phase').innerText(), /A 阶段[\s\S]*10/);
  await act(p, 'next'); await q.waitForSelector('.initial:has-text("B")');
  assert.match(await q.locator('main').innerText(), /3BD」格，本阶段放银矿/);
  await q.locator('[data-check="s-clear"] + .tick').click(); await p.waitForSelector('[data-check="s-clear"]:checked');
  await shot(p, 'phase_b');
  await act(p, 'undo'); await q.waitForSelector('[data-check="s-clear"]:not(:checked)');   // undo reverts the last action
  for (let i = 0; i < 4; i++) await act(p, 'next');
  await q.waitForSelector('#score-form');
  // A draft on one phone survives the other phone's update.
  await p.fill('#score-form [name="track0"]', '77');
  await score(q, 'p1', {track0: 90});
  assert.equal(await p.inputValue('#score-form [name="track0"]'), '77');
  await score(p, 'p0', {track0: 80, goods: 2, silver: 3, workers: 5, mon: 8});
  await score(p, 'p2', {track0: 95});
  await act(p, 'finish'); assert.match(await p.locator('#notice').innerText(), /空格数/);
  await score(p, 'p0', {empty: 3}); await score(p, 'p2', {empty: 5});
  await shot(p, 'score');
  await act(p, 'finish'); await p.waitForSelector('#shot'); await q.waitForSelector('#shot');
  const rows = await p.locator('#shot .rank').allInnerTexts();
  assert.equal(rows.length, 3); assert.match(rows[2], /90/);
  await shot(p, 'result');
  await act(p, 'image'); assert((await p.locator('.overlay img').getAttribute('src')).startsWith('data:image/png')); await shot(p, 'long_image'); await p.click('#close-image');
  const saved = async () => (await (await p.request.get(new URL('/api/games', BASE).href)).json()).filter(g => g.code === code);
  await p.waitForFunction(async c => (await (await fetch('/api/games')).json()).some(g => g.code === c), code);
  let games = await saved(); assert.equal(games.length, 1); assert.equal(games[0].config.ed, 'se'); assert.equal(games[0].results.find(r => r.id === 'p0').total, 95);
  await act(p, 'reopen'); await p.waitForSelector('#score-form');
  await score(p, 'p1', {track0: 99}); await act(p, 'finish'); await p.waitForSelector('#shot');
  await p.waitForFunction(async c => (await (await fetch('/api/games')).json()).some(g => g.code === c && g.results[0].total === 99), code);
  games = await saved(); assert.equal(games.length, 1, 'a revised game replaces its record');
  assert.deepEqual(errors, []);
  console.log('PASS two phones: setup sync, checklist sync, phases, undo, drafts, tie fields, result, long image, archive, revision');
} finally { await b.close(); }
