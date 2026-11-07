// Rules logic: configs, checklists per edition, scoring, tie-breaks, authority.
import assert from 'node:assert/strict';
import * as L from '../public/logic.js';
import {setupList, phaseStart, phaseEnd, summary} from '../public/steps.js';
import {TILES} from '../public/tiles-data.js';
const cfg = o => ({...L.defaultConfig(), ...o});
const text = list => list.map(x => x.text).join('\n');
function game(o) { let s = L.initialState(); s = L.reduce(s, {t: 'claim'}, 'host'); return L.reduce(s, {t: 'config', config: cfg(o)}, 'host'); }

// Config validation
assert.equal(L.configError(cfg({})), '');
assert.match(L.configError(cfg({ed: 'r11', n: 1})), /单人/);
assert.match(L.configError(cfg({ed: 'r19', n: 3, team: true})), /4 人/);
assert.match(L.configError(cfg({ed: 'r19', n: 2, bot: true})), /典藏版/);
assert.match(L.configError(cfg({ed: 'se', n: 2, bot: true, mods: {inns: true}})), /旅店/);
assert.match(L.configError(cfg({ed: 'r11', mods: {shields: true}})), /扩展/);
assert.match(L.configError(cfg({ed: 'se', mods: {vine: true}, n: 1, boards: 'random'})), /专用版图/);
assert.equal(L.configError(cfg({ed: 'se', n: 3, bot: true, mods: {vine: true, shields: true}})), '');
console.log('PASS config validation');

// Board player count and checklists
assert.equal(L.boardN(cfg({n: 1})), 2);
assert.equal(L.boardN(cfg({n: 3, bot: true})), 4);
let s = game({ed: 'se', n: 3});
assert.match(text(setupList(s)[0].items), /3–4 人面/);
assert.match(text(phaseStart(s, 1)), /3BD.*银矿/s);
assert.match(text(phaseStart(s, 2)), /3BD.*城堡/s);
assert.match(text(phaseStart(s, 0)), /补满 <b>6 格<\/b>/);
assert.doesNotMatch(text(phaseStart(s, 0)), /清走/);
assert.match(text(phaseStart(s, 3)), /清走/);
s = game({ed: 'r19', n: 2});
assert.match(text(setupList(s)[0].items), /2–3 人面/);
assert.match(text(phaseStart(s, 0)), /只补内圈 12 格/);
assert.match(text(phaseStart(s, 0)), /补满 <b>4 格<\/b>/);
s = game({ed: 'r11', n: 4});
assert.match(text(phaseStart(s, 0)), /全部补满/);
assert.match(text(phaseStart(s, 0)), /8 格.*印错/s);
s = game({ed: 'se', n: 4, first: 2});
const workers = setupList(s)[1].items.find(x => x.id === 'workers').text;
assert.match(workers, /玩家3 <b>1<\/b> 个，玩家4 <b>2<\/b> 个，玩家1 <b>3<\/b> 个，玩家2 <b>4<\/b> 个/);
s = game({ed: 'se', n: 2, bot: true, mods: {shields: true, routes: true}});
const all = setupList(s).flatMap(x => x.items);
assert(all.some(x => /2 号盾徽/.test(x.text)) && all.some(x => /挑出每种各 1 块/.test(x.text)) && all.some(x => x.id === 'botCards'));
assert.match(all.find(x => x.id === 'routes').text, /4 张/);   // 2 people + Châteauma = 3-player counts
assert.match(text(phaseEnd(s, 0)), /纳贡[\s\S]*银矿/);
s = game({ed: 'r19', n: 4, team: true});
assert.match(text(setupList(s)[1].items), /A 队 3 个，B 队 5 个/);
assert.match(text(setupList(s)[1].items), /A1、B1、A2、B2/);
s = game({ed: 'se', n: 1});
assert.match(text(setupList(s).flatMap(x => x.items)), /33 号/);
assert.match(text(setupList(s)[0].items), /不拿奖励板块/);
assert.equal(new Set(setupList(game({ed: 'se', n: 3, mods: {tiles2: true, white: true, inns: true, routes: true, shields: true, border: true, vine: true}})).flatMap(x => x.items).map(x => x.id)).size,
  setupList(game({ed: 'se', n: 3, mods: {tiles2: true, white: true, inns: true, routes: true, shields: true, border: true, vine: true}})).flatMap(x => x.items).length, 'checklist ids are unique');
for (const ed of ['se', 'r19', 'r11']) for (const x of [...setupList(game({ed, n: 3})).flatMap(y => y.items), ...phaseStart(game({ed, n: 3}), 1)]) assert(x.page, `${ed} ${x.id} has a page`);
assert.equal(summary(cfg({ed: 'r19', n: 4, team: true, mods: {shields: true}})), '红盒，4 人团队，盾徽');
console.log('PASS checklists per edition, player count, team, solo, Châteauma');

// Tiles: per-edition differences exist where the rulebooks differ
const t = no => TILES.find(x => x.no === no);
assert.match(t('26').diff.r11, /2 分/); assert.match(t('26').diff.se, /3 分/);
assert.match(t('15').diff.r11, /3 分/); assert.match(t('6').diff.se, /2 个工人/);
assert(TILES.every(x => x.eds.every(e => x.src[e])), 'every tile has a page per edition');
console.log('PASS tile data');

// Phases, scoring, tie-breaks
s = game({ed: 'r19', n: 3});
assert.throws(() => L.reduce(s, {t: 'begin'}, 'guest'), /主持人/);
s = L.reduce(s, {t: 'begin'}, 'host');
assert.throws(() => L.reduce(s, {t: 'next', from: 1}, 'host'), /阶段已经变了/);
for (let k = 0; k < 5; k++) s = L.reduce(s, {t: 'next', from: k}, 'host');
assert.equal(s.stage, 'score');
const sc = o => ({...L.emptyScore(), ...o, confirmed: true});
s = L.reduce(s, {t: 'score', id: 'p0', score: sc({track: [80, null], goods: 2, silver: 3, workers: 5, mon: 8})}, 'guest');
assert.equal(L.total(L.units(s)[0], s.scores.p0), 95);
s = L.reduce(s, {t: 'score', id: 'p1', score: sc({track: [95, null]})}, 'guest');
s = L.reduce(s, {t: 'score', id: 'p2', score: sc({track: [60, null]})}, 'guest');
assert.throws(() => L.reduce(s, {t: 'finish'}, 'host'), /空格数/);
s = L.reduce(s, {t: 'score', id: 'p0', score: {...s.scores.p0, empty: 4}}, 'guest');
s = L.reduce(s, {t: 'score', id: 'p1', score: {...s.scores.p1, empty: 4}}, 'guest');
assert.throws(() => L.reduce(s, {t: 'finish'}, 'host'), /回合顺位/);
s = L.reduce(s, {t: 'score', id: 'p0', score: {...s.scores.p0, order: 1}}, 'guest');
s = L.reduce(s, {t: 'score', id: 'p1', score: {...s.scores.p1, order: 3}}, 'guest');
s = L.reduce(s, {t: 'finish'}, 'host');
assert.deepEqual(L.standings(s).map(r => [r.id, r.place]), [['p1', 1], ['p0', 2], ['p2', 3]]);   // farther behind wins
// More empty spaces win in r19; the SE rulebook prints fewer (TIE_SE).
const tie = (ed, a, b) => { let g = game({ed, n: 2}); g = L.reduce(g, {t: 'direct'}, 'host');
  g = L.reduce(g, {t: 'score', id: 'p0', score: sc({track: [70, null], empty: a})}, 'x'); g = L.reduce(g, {t: 'score', id: 'p1', score: sc({track: [70, null], empty: b})}, 'x');
  return L.standings(L.reduce(g, {t: 'finish'}, 'host')).map(r => r.id); };
assert.deepEqual(tie('r19', 2, 5), ['p1', 'p0']);
assert.deepEqual(tie('r11', 2, 5), ['p1', 'p0']);
assert.deepEqual(tie('se', 2, 5), L.TIE_SE === 'fewer' ? ['p0', 'p1'] : ['p1', 'p0']);
// Châteauma wins ties; team totals add both tracks.
let g = game({ed: 'se', n: 1, bot: true}); g = L.reduce(g, {t: 'direct'}, 'host');
g = L.reduce(g, {t: 'score', id: 'p0', score: sc({track: [100, null]})}, 'x'); g = L.reduce(g, {t: 'score', id: 'bot', score: sc({track: [100, null]})}, 'x');
assert.equal(L.standings(L.reduce(g, {t: 'finish'}, 'host'))[0].id, 'bot');
g = game({ed: 'se', n: 4, team: true}); g = L.reduce(g, {t: 'direct'}, 'host');
g = L.reduce(g, {t: 'score', id: 'tA', score: sc({track: [70, 60], silver: 4, workers: 3})}, 'x');
assert.equal(L.total(L.units(g)[0], g.scores.tA), 135);
assert.throws(() => L.reduce(g, {t: 'score', id: 'tB', score: sc({track: [70, null]})}, 'x'), /分数轨/);
// Solo records success, not a ranking score.
g = game({ed: 'r19', n: 1}); g = L.reduce(g, {t: 'direct'}, 'host');
assert.throws(() => L.reduce(g, {t: 'score', id: 'p0', score: sc({})}, 'x'), /37 格/);
g = L.reduce(g, {t: 'score', id: 'p0', score: sc({filled: true, target: 45})}, 'x');
assert.equal(L.gameRecord(L.reduce(g, {t: 'finish'}, 'host')).mode, 'solo');
// Undo restores the previous state.
g = L.reduce(game({}), {t: 'begin'}, 'host'); g = L.reduce(g, {t: 'next', from: 0}, 'host'); g = L.reduce(g, {t: 'undo'}, 'host');
assert.equal(g.phase, 0);
console.log('PASS phases, totals, tie-breaks (r19/r11 more, SE as printed, order, Châteauma, team), solo, undo');
