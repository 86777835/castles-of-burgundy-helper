// Other modes and conditions: 2019 team game, official solo, Châteauma, 2011 edition, offline draft.
import assert from 'node:assert/strict';
import {BASE, browser, phone, act, pick, mod, room, shot, score, choose} from './helpers.mjs';
const b = await browser();
try {
  const c = await phone(b), p = await c.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  // 2019 team game
  await room(p); await pick(p, 'ed', 'r19'); await pick(p, 'n', 4);
  await p.locator('[data-config="team"] + .tbox').click(); await p.waitForSelector('[data-config="team"]:checked');
  assert.match(await p.locator('#checklist').innerText(), /12a1 \+ 12a2[\s\S]*A 队 3 个，B 队 5 个/);
  await act(p, 'direct');
  await score(p, 'tA', {track0: 70, track1: 60, silver: 4, workers: 3});
  await score(p, 'tB', {track0: 65, track1: 64});
  await act(p, 'finish'); await p.waitForSelector('#shot');
  assert.match(await p.locator('#shot').innerText(), /A 队[\s\S]*135[\s\S]*B 队[\s\S]*129/);
  await shot(p, 'team_result');
  console.log('PASS 2019 team game: team boards, workers, two tracks per team');
  // Official solo (SE)
  await room(p); await pick(p, 'n', 1);
  assert.match(await p.locator('#checklist').innerText(), /33 号/);
  await act(p, 'direct'); await p.click('[data-act="filled"][data-val="true"]'); await p.fill('#score-form [name="target"]', '45');
  await p.click('#score-form [value="confirm"]'); await p.waitForSelector('[data-act="mine"]:has-text("✓")');
  await act(p, 'finish'); await p.waitForSelector('#shot'); assert.match(await p.locator('#shot').innerText(), /挑战成功[\s\S]*45/);
  console.log('PASS official solo');
  // Châteauma with 2 players: board for 3, Châteauma always last, wins ties
  await room(p); await p.locator('[data-config="bot"] + .tbox').click(); await p.waitForSelector('[data-config="bot"]:checked');
  assert(await p.locator('[data-act="mod"][data-val="inns"]').isDisabled());
  const list = await p.locator('#checklist').innerText();
  assert.match(list, /3–4 人面[\s\S]*自动机/); assert.match(list, /自动机永远是最后一位/);
  await act(p, 'begin'); assert.match(await p.locator('.fillsum').innerText(), /18 \/ 24[\s\S]*6 \/ 8/);
  await act(p, 'next'); await act(p, 'next'); await act(p, 'next'); await act(p, 'next'); await act(p, 'next');
  await score(p, 'p0', {track0: 88}); await score(p, 'p1', {track0: 70}); await score(p, 'bot', {track0: 88});
  await act(p, 'finish'); await p.waitForSelector('#shot'); assert.match((await p.locator('#shot .rank').first().innerText()), /自动机/);
  console.log('PASS Châteauma: 3-player board for 2 humans, inns blocked, wins ties');
  // 2011 edition: no solo, no expansions, 2-player depots
  await room(p); await pick(p, 'ed', 'r11');
  assert.equal(await p.locator('[data-act="config"][data-key="n"][data-val="1"]').count(), 0);
  assert.equal(await p.locator('[data-act="mod"]').count(), 0);
  await act(p, 'begin'); assert.match(await p.locator('main').innerText(), /只补标「2」的格，共 12 格/);
  console.log('PASS 2011 edition options and depots');
  // Offline: a score draft survives reconnecting
  await room(p); await act(p, 'direct'); await choose(p, 'p0');
  await c.setOffline(true); await p.waitForSelector('.conn.off');
  await p.fill('#score-form [name="track0"]', '81');
  await c.setOffline(false); await p.waitForSelector('.conn.on');
  assert.equal(await p.inputValue('#score-form [name="track0"]'), '81');
  console.log('PASS offline draft survives reconnect');
  assert.deepEqual(errors, []);
} finally { await b.close(); }
