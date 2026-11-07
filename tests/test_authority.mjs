// Server authority over WebSocket: host token never sent, guests can't run host actions, stale revisions and bad scores rejected.
import assert from 'node:assert/strict';
const BASE = process.argv[2] || 'http://localhost:8951';
assert(['localhost', '127.0.0.1'].includes(new URL(BASE).hostname));
const {code} = await (await fetch(new URL('/api/room', BASE), {method: 'POST'})).json();
async function client(actor) {
  const ws = new WebSocket(new URL(`/api/room/${code}/ws?actor=${actor}`, BASE.replace('http', 'ws')));
  const queue = [], waiters = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (waiters.length) waiters.shift()(m); else queue.push(m); };
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  return {ws, next: () => queue.length ? Promise.resolve(queue.shift()) : new Promise(ok => waiters.push(ok)), send: (action, revision) => ws.send(JSON.stringify({action, revision}))};
}
const a = await client('host-123456789012'), b = await client('guest-123456789012');
try {
  let s = (await a.next()).state; await b.next();
  a.send({t: 'claim'}, s.revision); s = (await a.next()).state; let g = (await b.next()).state;
  assert.equal(s.isHost, true); assert.equal(g.isHost, false); assert(!('host' in s) && !('host' in g));
  b.send({t: 'begin'}, g.revision); assert.match((await b.next()).error, /主持人/); await b.next();
  b.send({t: 'check', id: 'board', value: true}, g.revision); g = (await b.next()).state; s = (await a.next()).state;
  assert.equal(s.checks.board, true);   // anyone can tick the checklist
  a.send({t: 'config', config: {...s.config, ed: 'r11', n: 1}}, s.revision); assert.match((await a.next()).error, /单人/); await a.next();
  a.send({t: 'direct'}, s.revision); s = (await a.next()).state; await b.next();
  b.send({t: 'finish'}, 0); assert.match((await b.next()).error, /更新/); await b.next();
  b.send({t: 'score', id: 'p0', score: {track: [-1, null]}}, s.revision); assert.match((await b.next()).error, /分数轨|整数/); await b.next();
  console.log('PASS server authority: host token hidden, guest host actions denied, shared checklist, invalid config, stale revision, invalid score');
} finally { a.ws.close(); b.ws.close(); }
