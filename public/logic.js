// 勃艮第城堡助手 · rules shared by the page and the authoritative Room (src/worker.js).
// Rule sources (page numbers are PDF pages, equal to printed pages):
//   SE  = Special Edition rulebook (EN, 2022), R19 = 2019/2020 edition (EN 238798-A), R11 = 2011 edition (EN 228846).

export const EDS = ['se', 'r19', 'r11'];
// Modules each edition ships with. r11 is the base game only.
export const MOD_EDS = {
  tiles2: ['se', 'r19'], white: ['se', 'r19'], inns: ['se', 'r19'], routes: ['se', 'r19'],
  border: ['se', 'r19'], shields: ['se', 'r19'], vine: ['se']
};
export const MODS = Object.keys(MOD_EDS);
// SE board sets a random draw may use (every SE board comes in 4 copies, SE p2–3).
export const POOLS = {base: [1, 10], b11: [11, 18], b19: [19, 20], b21: [21, 22], b23: [23, 30]};
export const PHASES = ['A', 'B', 'C', 'D', 'E'];
export const PHASE_BONUS = [10, 8, 6, 4, 2];              // R19 p8, SE p9
export const AREA_POINTS = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45];   // area size 1–8 (R19 p8); 9 only in SE (p14, p18)

const int = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

// Mode of play. Solo = the official solo game (R19 p14, SE p15); bot = SE Châteauma (p22–28).
export const mode = c => c.n === 1 && !c.bot ? 'solo' : c.team ? 'team' : 'multi';
// Player count the main board, depots and per-player-count scores use. Châteauma counts as a player (SE p22);
// the solo game uses the 2-player setup (R19 p14, SE p15).
export const boardN = c => mode(c) === 'solo' ? 2 : c.n + (c.bot ? 1 : 0);

export function configError(c) {
  if (!c || !EDS.includes(c.ed) || !int(c.n, 1, 4) || typeof c.team !== 'boolean' || typeof c.bot !== 'boolean') return '版本或人数无效';
  if (c.ed === 'r11' && c.n === 1) return '2011 原版没有官方单人规则';
  if (c.team && (c.n !== 4 || c.ed === 'r11')) return '团队游戏只限 4 人，且只有 2019 版和典藏版有';
  if (c.bot && (c.ed !== 'se' || c.n > 3 || c.team)) return '自动机只在典藏版里有，最多配 3 位玩家';
  if (!c.mods || typeof c.mods !== 'object') return '扩展设置无效';
  for (const k of Object.keys(c.mods)) if (!MODS.includes(k) || typeof c.mods[k] !== 'boolean') return '扩展设置无效';
  for (const k of MODS) if (c.mods[k] && !MOD_EDS[k].includes(c.ed)) return '这个版本没有所选的扩展';
  if (c.bot && c.mods.inns) return '自动机不能和旅店一起用（典藏版 p26）';
  if (!['b1', 'b2', 'random'].includes(c.boards)) return '公国版图选择无效';
  if (c.boards === 'b2' && c.ed === 'r11' && mode(c) === 'multi') return '2011 原版只有 1 号可以全员同用';
  if (c.boards === 'random' && mode(c) !== 'multi') return '单人和团队游戏用专用版图，不随机';
  if (!Array.isArray(c.pool) || !c.pool.length || c.pool.some(k => !POOLS[k])) return '请至少选一组公国版图';
  if (!int(c.first, 0, Math.max(0, c.n - 1))) return '先手无效';
  return '';
}

export const defaultConfig = () => ({ed: 'se', n: 2, team: false, bot: false, mods: {}, boards: 'b1', pool: ['base'], first: 0});
export const emptyScore = () => ({track: [null, null], goods: 0, silver: 0, workers: 0, mon: 0, shields: 0, vines: 0, empty: null, order: null, filled: null, target: 50, note: '', confirmed: false});

export function initialState() {
  return {
    revision: 0, host: null, stage: 'setup', config: defaultConfig(), phase: 0,
    players: Array.from({length: 4}, (_, i) => ({id: 'p' + i, name: '玩家' + (i + 1), board: ''})),
    checks: {}, pchecks: {}, scores: {}, gid: null, prev: null
  };
}

export const participants = s => s.players.slice(0, s.config.n);

// Scoring units: one per player; in the team game one per team (R19 p13); Châteauma is its own unit (SE p25).
// Team seats are entered in the order A1, A2, B1, B2.
export function units(s) {
  const ps = participants(s), c = s.config;
  if (c.team) return [
    {id: 'tA', name: 'A 队', members: [ps[0], ps[1]]},
    {id: 'tB', name: 'B 队', members: [ps[2], ps[3]]}
  ];
  const list = ps.map(p => ({id: p.id, name: p.name, members: [p]}));
  if (c.bot) list.push({id: 'bot', name: '自动机', members: [], bot: true});
  return list;
}

// Turn order of round 1 as a list of player names (Châteauma always last, SE p22; team A1 B1 A2 B2, R19 p13).
export function turnOrder(s) {
  const ps = participants(s), c = s.config;
  if (c.team) return [ps[0], ps[2], ps[1], ps[3]].map(p => p.name);
  const order = ps.map((_, i) => ps[(c.first + i) % ps.length].name);
  if (c.bot) order.push('自动机');
  return order;
}

// Final score of one unit (R19 p9, SE p10): VP track + 1 per unsold goods tile + 1 per silver coin
// + 1 per 2 workers + end-game monastery tiles; plus shields (R19 p15–16) and vineyards (SE p21) when used.
// Châteauma: the track value already includes its own final scoring (SE p25), entered as one number.
export function total(u, q) {
  if (u.bot) return q.track[0] ?? 0;
  const track = q.track.slice(0, u.members.length).reduce((a, b) => a + (b ?? 0), 0);
  return track + q.goods + q.silver + Math.floor(q.workers / 2) + q.mon + q.shields + q.vines;
}

export function scoreError(s, id, q) {
  const u = units(s).find(u => u.id === id);
  if (!u) return '本局没有这个玩家';
  if (!q || typeof q !== 'object') return '分数无效';
  if (mode(s.config) === 'solo') {
    if (typeof q.filled !== 'boolean') return '请选这局有没有铺满 37 格';
    if (!int(q.target, 5, 60)) return '起始目标分请填 5–60';
  } else {
    const need = u.bot ? 1 : u.members.length;
    if (!Array.isArray(q.track) || q.track.length !== 2 || q.track.slice(0, need).some(v => !int(v, 0, 400))) return '请填分数轨上的分（0–400，过了 100 要加上 100/200 分板块）';
    for (const k of ['goods', 'silver', 'workers', 'mon', 'shields', 'vines']) if (!int(q[k], 0, 300)) return '请填 0–300 的整数';
  }
  if (!(q.empty === null || int(q.empty, 0, 37)) || !(q.order === null || int(q.order, 1, 5))) return '空格数请填 0–37，顺位请填 1–5';
  if (typeof q.note !== 'string' || q.note.length > 200 || typeof q.confirmed !== 'boolean') return '备注最多 200 字';
  return '';
}

// Tie rules. R19 p9 / R11 p9 (corrected by the translator, BGG thread 630913): more empty duchy spaces wins,
// then the player farthest behind on the turn order track. Team game: more empty spaces (R19 p13).
// The Special Edition prints the opposite: fewest empty spaces wins, in English (p10) and in the 简中 rulebook (p10).
// See docs/规则核验.md.
export const TIE_SE = 'fewer';
const emptyRule = c => c.ed === 'se' ? TIE_SE : 'more';

export function standings(s) {
  const c = s.config, rule = emptyRule(c);
  const rows = units(s).map(u => ({...u, q: s.scores[u.id] || emptyScore()})).map(u => ({...u, total: total(u, u.q)}));
  const cmp = (a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.bot !== b.bot) return a.bot ? -1 : 1;          // Châteauma wins ties (SE p25)
    if (a.q.empty !== null && b.q.empty !== null && a.q.empty !== b.q.empty) return rule === 'more' ? b.q.empty - a.q.empty : a.q.empty - b.q.empty;
    if (!c.team && a.q.order !== null && b.q.order !== null && a.q.order !== b.q.order) return b.q.order - a.q.order;   // farther behind wins
    return 0;
  };
  rows.sort(cmp);
  rows.forEach((r, i) => { r.place = i && cmp(rows[i - 1], r) === 0 ? rows[i - 1].place : i + 1; });
  return rows;
}

// Which tie-break facts are still missing before the game can be finished.
export function tieNeeds(s) {
  const entered = (u, q) => q && q.track.slice(0, u.members.length).every(v => v !== null);
  const rows = units(s).filter(u => !u.bot && entered(u, s.scores[u.id])).map(u => ({u, q: s.scores[u.id]})), need = {};
  for (const a of rows) for (const b of rows) {
    if (a === b || total(a.u, a.q) !== total(b.u, b.q)) continue;
    if (a.q.empty === null) need[a.u.id] = 'empty';
    else if (!s.config.team && b.q.empty === a.q.empty && a.q.order === null) need[a.u.id] = 'order';
  }
  return need;
}

export function reduce(s, a, actor) {
  if (!a || typeof a.t !== 'string') throw Error('无效操作');
  if (a.t === 'claim') { if (s.host && s.host !== actor) throw Error('已经有主持人了'); return {...s, host: actor, revision: s.revision + 1}; }
  const anyone = ['check', 'pcheck', 'score'];
  if (!anyone.includes(a.t) && s.host !== actor) throw Error('这一步由主持人（建房的手机）来点');
  const n = structuredClone(s);
  n.prev = {...s, prev: null};
  n.revision++;
  switch (a.t) {
    case 'config': {
      if (s.stage !== 'setup') throw Error('开局后不能改设置');
      const e = configError(a.config); if (e) throw Error(e);
      n.config = structuredClone(a.config); n.checks = {};
      break;
    }
    case 'player': {
      if (s.stage !== 'setup') throw Error('开局后不能改玩家');
      const p = n.players.find(p => p.id === a.id);
      if (!p) throw Error('没有这个座位');
      if (typeof a.name !== 'string' || !a.name.trim() || a.name.length > 16 || typeof a.board !== 'string' || a.board.length > 12) throw Error('名字 1–16 个字，公国版图编号最多 12 个字');
      p.name = a.name.trim(); p.board = a.board.trim();
      break;
    }
    case 'boards': {   // random board numbers for every seat, drawn on the host phone
      if (s.stage !== 'setup' || !Array.isArray(a.boards) || a.boards.length !== 4 || a.boards.some(b => typeof b !== 'string' || b.length > 12)) throw Error('公国版图编号无效');
      n.players.forEach((p, i) => { p.board = a.boards[i]; });
      break;
    }
    case 'check':
      if (s.stage !== 'setup' || typeof a.id !== 'string' || a.id.length > 60 || typeof a.value !== 'boolean') throw Error('无效的清单项');
      n.checks[a.id] = a.value;
      break;
    case 'pcheck':
      if (s.stage !== 'play' || typeof a.id !== 'string' || a.id.length > 60 || typeof a.value !== 'boolean') throw Error('无效的清单项');
      n.pchecks[a.id] = a.value;
      break;
    case 'begin': case 'direct': {
      if (s.stage !== 'setup') throw Error('已经开局了');
      const e = configError(s.config); if (e) throw Error(e);
      n.stage = a.t === 'direct' ? 'score' : 'play'; n.phase = 0; n.pchecks = {}; n.scores = {};
      n.gid = Date.now() + '-' + crypto.randomUUID();
      break;
    }
    case 'next':   // phase A–D → next phase; after E → final scoring
      if (s.stage !== 'play' || a.from !== s.phase) throw Error('阶段已经变了，请看一眼再点');
      if (s.phase < 4) { n.phase++; n.pchecks = {}; } else n.stage = 'score';
      break;
    case 'score': {
      if (s.stage !== 'score') throw Error('还没到终局计分');
      const e = scoreError(s, a.id, a.score); if (e) throw Error(e);
      const q = a.score;
      n.scores[a.id] = {track: q.track.map(v => v ?? null), goods: q.goods ?? 0, silver: q.silver ?? 0, workers: q.workers ?? 0, mon: q.mon ?? 0, shields: q.shields ?? 0, vines: q.vines ?? 0,
        empty: q.empty, order: q.order, filled: q.filled ?? null, target: q.target ?? 50, note: q.note, confirmed: q.confirmed};
      break;
    }
    case 'finish': {
      if (s.stage !== 'score') throw Error('还没到终局计分');
      if (units(s).some(u => !s.scores[u.id]?.confirmed)) throw Error('还有人没确认分数');
      const need = tieNeeds(s), first = Object.values(need)[0];
      if (first) throw Error(first === 'empty' ? '有人同分：请同分的玩家补填公国版图上的空格数' : '同分且空格数相同：请补填终局时的回合顺位');
      n.stage = 'over';
      break;
    }
    case 'reopen':
      if (s.stage !== 'over') throw Error('还没结算');
      n.stage = 'score';
      break;
    case 'undo':
      if (!s.prev) throw Error('没有可以撤销的操作');
      return {...s.prev, host: s.host, revision: s.revision + 1, prev: null};
    default: throw Error('未知操作');
  }
  return n;
}

export function gameRecord(s) {
  const rows = standings(s);
  return {
    gid: s.gid, config: s.config, mode: mode(s.config), ended: Date.now(),
    results: rows.map(r => ({id: r.id, name: r.name, place: r.place, total: r.total, bot: !!r.bot,
      members: r.members.map(p => p.name), boards: r.members.map(p => p.board).filter(Boolean).join('、'), score: r.q}))
  };
}
