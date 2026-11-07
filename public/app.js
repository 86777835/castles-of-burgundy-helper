// 勃艮第城堡助手 · room page. The host phone sets up the game and moves through phases A–E;
// every phone can tick checklists and enter scores. State lives in the Room Durable Object.
import {MOD_EDS, MODS, POOLS, PHASES, PHASE_BONUS, AREA_POINTS, mode, boardN, participants, units, turnOrder, total, standings, tieNeeds, emptyScore, configError} from './logic.js';
import {BOOKS, MOD_INFO, POOL_NAMES, setupList, phaseStart, phaseEnd, roundNotes, summary} from './steps.js';
import {morph, esc} from './dom.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const code = params.get('r');
const store = {get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} }};
const actor = store.get('cob-actor') || crypto.randomUUID();
store.set('cob-actor', actor);

let S = null, ws = null, online = false, pending = false, pendingScore = null;
// Screen state that morph() would otherwise wipe: open panels, drafts, choices not yet sent.
const ui = {rooms: [], error: '', busy: false, mine: store.get('cob-unit') || 'p0', scores: {}, players: {}, helper: false, mh: {},
  review: {stars: 5, text: '', sent: false, name: null}, quick: params.has('quick'), roundsOpen: false, prepOpen: true};

const COLORS = ['#8c2335', '#2d5f86', '#b07d22', '#4c7a3d'];
const color = id => id === 'bot' ? '#6b6560' : COLORS[Number(String(id).slice(1))] || COLORS[0];
const dot = id => `<span class="dot" style="--c:${color(id)}"></span>`;
const isHost = () => S?.isHost;
const hostOnly = () => !isHost() || !online || pending ? 'disabled' : '';
const anyone = () => !online || pending ? 'disabled' : '';
const roomQ = code ? '?r=' + code : '';
const tag = x => `<a class="tag" href="${BOOKS[x.book].url}" target="_blank" rel="noopener">${BOOKS[x.book].name} ${esc(x.page)}</a>`;

const STAGE = {setup: '准备中', play: '对局中', score: '计分中', over: '已结算'};

// Segmented control: each button sends act/key/val.
const seg = (act, key, options, value, dis = '') => `<div class="seg" role="group">${options.map(([v, t, sub]) =>
  `<button type="button" data-act="${act}" data-key="${key}" data-val="${esc(v)}" aria-pressed="${String(v) === String(value)}" ${dis}><span>${t}</span>${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>`;

function checklist(items, store, kind, dis) {
  return `<ul class="steps">${items.map(x => {
    const on = !!store[x.id];
    return `<li class="${on ? 'done' : ''}${x.warn ? ' warn' : ''}${x.optional ? ' optional' : ''}" data-k="${kind}-${x.id}"><label><input type="checkbox" data-check="${esc(x.id)}" data-kind="${kind}" ${on ? 'checked' : ''} ${dis}><span class="tick" aria-hidden="true"></span><span class="txt">${x.text}</span></label>${tag(x)}</li>`;
  }).join('')}</ul>`;
}

function notify(t) { $('#notice').textContent = t; clearTimeout(notify.timer); notify.timer = setTimeout(() => { $('#notice').textContent = ''; }, 6500); }
function render() { const t = document.createElement('div'); t.innerHTML = view(); morph($('#app'), t); }
function send(action) {
  if (!online || ws.readyState !== 1) return notify('连接断了，这一步没发出去。恢复连接后再点一次。');
  if (pending) return notify('上一步还在保存，稍等一下');
  pending = true;
  if (action.t === 'score') pendingScore = action;
  ws.send(JSON.stringify({revision: S.revision, action}));
  render();
}
function connect() {
  if (!navigator.onLine || ws && ws.readyState < 2) return;
  if (!/^[A-Z0-9]{4}$/.test(code || '')) { ui.error = '房间码是 4 位字母或数字'; return render(); }
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/room/${code}/ws?actor=${actor}`);
  ws.onopen = () => { online = true; render(); };
  ws.onmessage = e => {
    if (e.data === 'pong') return;
    const m = JSON.parse(e.data);
    pending = false;
    if (m.type !== 'state') { ui.error = m.error; notify(m.error); return render(); }
    S = m.state;
    // Drop the local draft once the server holds the same score.
    if (pendingScore && JSON.stringify(S.scores[pendingScore.id]) === JSON.stringify(normalize(pendingScore.score))) { delete ui.scores[pendingScore.id]; pendingScore = null; }
    if (!S.hasHost) send({t: 'claim'});
    render();
  };
  ws.onclose = () => { online = false; pending = false; render(); setTimeout(connect, 2500); };
  ws.onerror = () => notify('连不上房间，请检查网络');
}
window.addEventListener('offline', () => { ws?.close(); online = false; pending = false; render(); });
window.addEventListener('online', () => { if (code) connect(); });
setInterval(() => { if (ws?.readyState === 1) ws.send('ping'); }, 25000);

// ---------- landing ----------
function landing() {
  const rooms = ui.rooms.map(r => `<a class="room" href="/?r=${r.code}"><b class="rcode">${r.code}</b><span class="rinfo"><span>${esc(r.players.join('、'))}</span><small>${esc(summary(r.config))}</small></span><span class="chip ${r.stage === 'over' ? '' : 'live'}">${r.stage === 'play' ? PHASES[r.phase] + ' 阶段' : STAGE[r.stage] || '对局中'}</span></a>`).join('');
  return `<header class="hero"><a class="back-nav" href="https://boardgame.leisurecat.cloud">‹ 全部游戏</a>
  <img class="cover" src="/img/cover.jpg" width="128" height="162" alt="勃艮第城堡：特别典藏版简体中文版官方封面">
  <h1>勃艮第城堡助手</h1><p class="motto">按人数告诉你怎么摆、每阶段补什么</p></header>
  <main class="landing">
   <section class="card entry">
    <button class="primary big" data-act="create" ${ui.busy ? 'disabled' : ''}>建一个房间</button>
    <p class="note center">建好后把房间码告诉同桌，大家看同一份清单。</p>
    <div class="or"><span>或者输入房间码加入</span></div>
    <form id="join" class="join"><label class="sr-only" for="joinCode">房间码</label><input id="joinCode" placeholder="房间码" maxlength="4" required autocapitalize="characters" autocomplete="off"><button class="dark">加入</button></form>
    <button class="linkish" data-act="quick">已经摆好了？直接去终局计分 ›</button>
   </section>
   <nav class="tiles">
    <a class="tile" href="/guide.html"><span class="hexico" style="--h:var(--castle)">教</span><span><b>新手教程</b><small>流程、计分、易错点</small></span></a>
    <a class="tile" href="/tiles.html"><span class="hexico" style="--h:var(--mon)">查</span><span><b>板块速查</b><small>修道院、建筑、盾徽</small></span></a>
    <a class="tile" href="/guide.html#mistakes"><span class="hexico" style="--h:var(--river)">错</span><span><b>易错规则</b><small>附规则书页码</small></span></a>
    <a class="tile" href="/history.html"><span class="hexico" style="--h:var(--pasture)">录</span><span><b>往期对局</b><small>战绩与存档</small></span></a>
   </nav>
   <section class="rooms"><h2>最近的房间</h2>${rooms || '<p class="empty">还没有房间。</p>'}</section>
   <footer>非官方的线下辅助工具，需要实体游戏。<br>封面与游戏版权归原出版方。</footer>
  </main>`;
}

// ---------- room ----------
function bar() {
  const state = !online ? 'off' : pending ? 'busy' : 'on', label = !online ? '断线，重连中' : pending ? '保存中…' : '已连接';
  return `<header class="bar"><a class="back-nav" href="/">‹ 首页</a><b class="title">勃艮第城堡</b><button type="button" class="code" data-act="share" aria-label="复制邀请链接">${code}<small>邀请</small></button><span class="conn ${state}">${label}</span></header>`;
}
function view() {
  if (!code) return landing();
  if (!S) return `${bar()}<main><p class="empty">${esc(ui.error || '正在进入房间…')}</p></main>`;
  const body = S.stage === 'setup' ? setup() : S.stage === 'play' ? play() : S.stage === 'score' ? score() : result();
  return `${bar()}<div class="subbar"><span>${esc(summary(S.config))}</span><button type="button" class="undo" data-act="undo" ${hostOnly()} ${S.prev ? '' : 'disabled'}>撤销</button></div>
  <main>${isHost() ? '' : '<p class="hint">设置和翻阶段由主持人（建房的手机）来点；清单和分数谁都能填。</p>'}${body}
  <nav class="links"><a href="/guide.html${roomQ}">新手教程</a><a href="/tiles.html${roomQ}&ed=${S.config.ed}">板块速查</a><a href="/guide.html${roomQ}#mistakes">易错规则</a><a href="/history.html${roomQ}">往期对局</a></nav></main>`;
}

// ---------- setup ----------
function setup() {
  const c = S.config, dis = hostOnly(), m = mode(c), ps = participants(S);
  const avail = MODS.filter(k => MOD_EDS[k].includes(c.ed));
  const nOpts = (c.ed === 'r11' ? [] : [[1, '单人']]).concat([[2, '2 人'], [3, '3 人'], [4, '4 人']]);
  const boardOpts = m === 'solo' ? [['b1', '入门面', c.ed === 'se' ? '33 号' : '13A'], ['b2', '进阶面', c.ed === 'se' ? '34 号' : '13B']]
    : c.team ? [['b1', '基础面', c.ed === 'se' ? '31a＋32a' : '12a'], ['b2', '进阶面', c.ed === 'se' ? '31b＋32b' : '12b']]
    : [['b1', '全员 1 号', '首局推荐'], ...(c.ed === 'r11' ? [] : [['b2', '全员 2 号', '']]), ['random', '各自随机', '熟手']];
  const forced = c.mods.border && c.ed === 'r19' && m === 'multi';
  const items = setupList(S), all = items.flatMap(x => x.items), done = all.filter(x => S.checks[x.id]).length;
  return `${ui.quick ? '<p class="hint">选好版本和人数，就能直接去终局计分。</p>' : ''}
  <section class="card"><h2>这局怎么玩</h2>
   <h3>版本</h3>${seg('config', 'ed', [['se', '特别典藏版', '2023，简中版'], ['r19', '2019 新版', '红盒'], ['r11', '2011 原版', '']], c.ed, dis)}
   <p class="note">三个版本的版图、几块修道院和平局规则不一样，选桌上的那一盒。</p>
   <h3>人数</h3>${seg('config', 'n', nOpts, c.n, dis)}
   ${c.n === 4 && c.ed !== 'r11' ? toggle('team', '团队游戏', '2 对 2，A 队和 B 队各用一块团队版图', c.team, dis) : ''}
   ${c.ed === 'se' && c.n <= 3 ? toggle('bot', '加入自动机', c.n === 1 ? '一个人对抗自动机（不加就是官方单人挑战）' : '自动机算一名玩家，版图按多一人摆', c.bot, dis) : ''}
   ${avail.length ? `<h3>扩展 <small>不选就是只玩基础，新人建议先不加</small></h3><div class="chips" role="group">${avail.map(k => {
     const off = k === 'inns' && c.bot;
     return `<button type="button" data-act="mod" data-val="${k}" aria-pressed="${!!c.mods[k]}" ${off ? 'disabled' : dis}><b>${MOD_INFO[k].name}</b><small>${off ? '不能和自动机一起用' : MOD_INFO[k].note}</small></button>`;
   }).join('')}</div>` : ''}
   <h3>${m === 'solo' ? '单人版图' : c.team ? '团队版图' : '公国版图'}</h3>
   ${forced ? '<p class="note">边境哨所要求每人用一块 11 号公国版图（11a–11f）。</p>' : seg('config', 'boards', boardOpts, c.boards, dis)}
   ${!forced && c.boards === 'random' ? randomBoards(c, dis) : ''}</section>
  <section class="card"><h2>${c.team ? '队员' : m === 'solo' ? '玩家' : '座位'}</h2>
   <p class="note">${c.team ? '按 A1、A2、B1、B2 填。同队的尽量坐在一起。' : m === 'solo' ? '' : '按顺时针填。'}</p>
   ${ps.map((p, i) => seat(p, i, c, dis)).join('')}
   ${m === 'multi' && !c.team ? `<h3>起始玩家</h3>${seg('config', 'first', ps.map((p, i) => [i, esc(p.name)]), c.first, dis)}<button type="button" class="small" data-act="randomFirst" ${dis}>随机选一位</button>
   <p class="note">也可以照规则书掷骰（点数最大的先手），再在这里点他的名字。</p>` : ''}</section>
  <section class="card" id="checklist"><button type="button" class="fold" data-act="fold" aria-expanded="${ui.prepOpen}"><h2>开局清单</h2><span class="count">${done} / ${all.length}</span></button>
   ${ui.prepOpen ? `<p class="note">按顺序摆。勾选会同步给全桌；不勾也能开始。</p>${items.map(sec => `<h3>${sec.title}</h3>${checklist(sec.items, S.checks, 'setup', anyone())}`).join('')}` : ''}</section>
  <div class="cta"><button class="primary wide" data-act="begin" ${dis}>摆好了，开始 A 阶段</button>
   <button class="linkish" data-act="direct" ${dis}>不记阶段，直接去终局计分 ›</button></div>`;
}
const toggle = (key, title, note, on, dis) => `<label class="toggle"><input type="checkbox" data-config="${key}" ${on ? 'checked' : ''} ${dis}><span class="tbox" aria-hidden="true"></span><span><b>${title}</b><small>${note}</small></span></label>`;
function seat(p, i, c, dis) {
  const d = ui.players[p.id] || p, label = c.team ? ['A1', 'A2', 'B1', 'B2'][i] : i + 1;
  return `<div class="seat" data-k="seat-${p.id}"><span class="seatno" style="--c:${color(p.id)}">${label}</span>
   <input aria-label="座位${label}的名字" data-player="${p.id}" data-field="name" maxlength="16" value="${esc(d.name)}" ${dis}>
   ${mode(c) === 'multi' && !c.team ? `<input class="boardno" aria-label="座位${label}的公国版图编号" data-player="${p.id}" data-field="board" maxlength="12" placeholder="版图号" value="${esc(d.board)}" ${dis}>` : ''}</div>`;
}
function randomBoards(c, dis) {
  if (c.ed !== 'se') return '<p class="note">把公国版图背面朝上洗匀，每人抽一块，自己选用哪一面。抽到的编号可以填在下面的座位里，存档时会记下来。</p>';
  return `<p class="note">典藏版每种公国版图都有 4 份，可以让手机替你们抽号。抽到的号码那块版图，正反两面都可以选。</p>
   <div class="pools">${Object.keys(POOLS).map(k => `<label class="check"><input type="checkbox" data-config="pool:${k}" ${c.pool.includes(k) ? 'checked' : ''} ${dis}><span>${POOL_NAMES[k]}</span></label>`).join('')}</div>
   <button type="button" class="wide soft" data-act="draw" ${dis}>帮每人抽一个号</button>`;
}

// ---------- play: one screen per phase ----------
function pips(used, all) { return `<span class="pips" aria-label="${used} / ${all}">${Array.from({length: all}, (_, i) => `<i class="${i < used ? 'on' : ''}"></i>`).join('')}</span>`; }
function play() {
  const c = S.config, k = S.phase, P = PHASES[k], nb = boardN(c), start = phaseStart(S, k), end = phaseEnd(S, k);
  const sDone = start.filter(x => S.pchecks['s-' + x.id]).length;
  const hexes = {2: 12, 3: 18, 4: 24}[nb], blacks = {2: 4, 3: 6, 4: 8}[nb], seTwo = c.ed === 'se' && nb === 2;
  const prefixed = (list, p) => list.map(x => ({...x, id: p + x.id}));
  const last = k === 4;
  return `<section class="phase" aria-label="当前阶段">
   <div class="initial" aria-hidden="true">${P}</div>
   <div class="phase-meta"><h2>${P} 阶段</h2><p>第 ${k + 1} 个阶段，共 5 个。每阶段 5 轮。</p>
    <p class="bonus">完成区域另得 <b>${PHASE_BONUS[k]}</b> 分</p></div>
   <ol class="track" aria-label="阶段进度">${PHASES.map((x, i) => `<li class="${i < k ? 'past' : i === k ? 'now' : ''}">${x}</li>`).join('')}</ol></section>
  <section class="card"><div class="card-head"><h2>阶段开始：补货</h2><span class="count">${sDone} / ${start.length}</span></div>
   ${seTwo ? '' : `<div class="fillsum"><div><small>六角格</small>${pips(hexes, 24)}<b>${hexes} / 24</b></div><div><small>中央黑色</small>${pips(blacks, 8)}<b>${blacks} / 8</b></div></div>`}
   ${checklist(prefixed(start, 's-'), S.pchecks, 'phase', anyone())}</section>
  <section class="card"><button type="button" class="fold" data-act="rounds" aria-expanded="${ui.roundsOpen}"><h2>每一轮怎么走</h2><span class="count">${ui.roundsOpen ? '收起' : '展开'}</span></button>
   ${ui.roundsOpen ? `<ul class="notes">${roundNotes(S).map(x => `<li>${x.text}${tag(x)}</li>`).join('')}</ul><p class="note">轮次格上还剩几块货物，本阶段就还剩几轮。</p>` : ''}</section>
  ${quickScores(c, k)}
  <section class="card"><div class="card-head"><h2>${P} 阶段结束</h2></div><p class="note">5 轮都打完后，按顺序做：</p>
   ${checklist(prefixed(end, 'e-'), S.pchecks, 'phase', anyone())}
   <button class="primary wide" data-act="next" ${hostOnly()}>${last ? 'E 阶段结束，去终局计分' : `${P} 阶段结束，开始 ${PHASES[k + 1]} 阶段`}</button></section>`;
}
// The numbers players look up most during a phase (R19 p8, SE p9).
function quickScores(c, k) {
  const m = mode(c), nb = boardN(c), max = c.ed === 'se' && c.mods.inns ? 9 : 8;
  const sizes = Array.from({length: max}, (_, i) => i + 1);
  return `<section class="card"><h2>本局速算</h2>
   <table class="area"><caption>完成一块区域的得分（${PHASES[k]} 阶段）</caption>
    <tr><th scope="row">格数</th>${sizes.map(n => `<td>${n}</td>`).join('')}</tr>
    <tr><th scope="row">得分</th>${sizes.map(n => `<td>${AREA_POINTS[n] + PHASE_BONUS[k]}</td>`).join('')}</tr></table>
   <p class="note">区域分 1、3、6、10…加上本阶段的 ${PHASE_BONUS[k]} 分。初始城堡那一格不算区域分。</p>
   <dl class="facts">
    ${m === 'solo' ? '' : `<div><dt>卖货</dt><dd>每块 <b>${nb}</b> 分，一次只得 1 枚银币</dd></div>
    <div><dt>奖励板块</dt><dd>第一个铺满 <b>${nb + 3}</b> 分，第二个 <b>${nb}</b> 分</dd></div>`}
    <div><dt>黑色补给区</dt><dd>每回合最多买 1 块，2 枚银币</dd></div>
   </dl></section>`;
}

// ---------- score ----------
const normalize = q => ({...emptyScore(), ...q});
function draft(u) { return ui.scores[u.id] || S.scores[u.id] || emptyScore(); }
function num(name, label, value, opts = {}) {
  return `<label class="num"><span>${label}${opts.sub ? `<small>${opts.sub}</small>` : ''}</span><span class="sbox">
   <button type="button" data-act="step" data-name="${name}" data-d="-1" aria-label="${label}减一">−</button>
   <input name="${name}" type="number" inputmode="numeric" min="0" max="${opts.max ?? 400}" step="1" ${opts.req ? 'required' : ''} value="${value ?? ''}" aria-label="${label}">
   <button type="button" data-act="step" data-name="${name}" data-d="1" aria-label="${label}加一">＋</button></span></label>`;
}
function breakdown(u, q) {
  if (u.bot) return `<div class="total"><small>自动机总分</small><strong>${q.track[0] ?? '—'}</strong></div>`;
  const tr = q.track.slice(0, u.members.length);
  if (tr.some(v => v === null)) return '<p class="note center">填好分数轨上的分，这里会算出总分。</p>';
  const parts = [[u.members.length > 1 ? '两人分数轨' : '分数轨', tr.reduce((a, b) => a + b, 0)], ['货物', q.goods], ['银币', q.silver], [`工人 ${q.workers} 个`, Math.floor(q.workers / 2)], ['修道院', q.mon]];
  if (S.config.mods.shields) parts.push(['盾徽', q.shields]);
  if (S.config.mods.vine) parts.push(['葡萄园', q.vines]);
  return `<div class="total"><small>总分</small><strong>${total(u, q)}</strong></div><p class="sum">${parts.filter(([, v], i) => i === 0 || v).map(([t, v]) => `${t} ${v}`).join(' ＋ ')}</p>`;
}
function monHelper() {
  const ed = S.config.ed, h = ui.mh, row = (k, label, mult) => `<label class="mrow"><input type="checkbox" data-mh="${k}" ${h[k] ? 'checked' : ''}><span>${label}</span>${h[k] ? `<input type="number" inputmode="numeric" min="0" max="40" data-mhn="${k}" value="${h[k + 'n'] ?? ''}" aria-label="${label}的数量"><em>× ${mult}</em>` : ''}</label>`;
  const rows = [['m15', '15 号：卖出过几种颜色的货物', ed === 'r11' ? 3 : 2], ['m16', '16–23 号：这些板块对应的建筑，公国里一共几座', 4],
    ...(S.config.mods.white ? [['m29', '29 号：公国里几座白色城堡', 4]] : []), ['m24', '24 号：公国里放过几种牲畜', 4], ['m25', '25 号：一共卖出几块货物', 1], ['m26', '26 号：拿到几块奖励板块', ed === 'r11' ? 2 : 3]];
  const sum = rows.reduce((a, [k, , mult]) => a + (h[k] ? (Number(h[k + 'n']) || 0) * mult : 0), 0);
  return `<div class="helper"><p class="note">只算放进公国的修道院，储存格里的不算。勾上你有的板块，填数量：</p>${rows.map(r => row(...r)).join('')}
   <div class="helper-foot"><span>合计 <b>${sum}</b> 分</span><button type="button" class="small" data-act="useMon" data-v="${sum}">填进修道院分</button></div>
   ${S.config.mods.shields ? '<p class="note">有 10 号盾徽：计分类修道院的分数翻倍，请自己乘 2。</p>' : ''}</div>`;
}
function score() {
  const us = units(S), m = mode(S.config);
  if (!us.some(u => u.id === ui.mine)) ui.mine = us[0].id;
  const u = us.find(x => x.id === ui.mine), q = draft(u), need = tieNeeds(S)[u.id];
  let form;
  if (m === 'solo') form = `<p class="label">这局有没有在 25 轮内铺满公国的 37 格？</p>
    <div class="seg" role="group">${[[true, '铺满了，挑战成功'], [false, '没铺满']].map(([v, t]) => `<button type="button" data-act="filled" data-val="${v}" aria-pressed="${q.filled === v}">${t}</button>`).join('')}</div>
    ${num('target', '起始目标分', q.target, {max: 60, sub: '规则书默认 50，可以调'})}
    <input type="hidden" name="filled" value="${q.filled ?? ''}">`;
  else if (u.bot) form = `${num('track0', '自动机终局总分', q.track[0], {req: true, sub: '按自动机自己的终局规则算好（典藏版 p25）'})}
    <p class="note">自动机终局另加：公国和未完成郡县卡上每块修道院 4 分，每块货物、每枚银币、储备区每块六角片各 1 分，未完成郡县卡上每块六角片 2 分。同分时自动机获胜。</p>`;
  else form = `${u.members.map((p, i) => num('track' + i, u.members.length > 1 ? esc(p.name) + ' 的分数轨' : '分数轨上的分', q.track[i], {req: true, sub: '过了 100 记得加上 100/200 分板块'})).join('')}
    ${num('goods', '没卖的货物', q.goods, {sub: '每块 1 分'})}${num('silver', '银币', q.silver, {sub: '每枚 1 分'})}${num('workers', '工人', q.workers, {sub: '每 2 个 1 分'})}
    ${num('mon', '计分类修道院', q.mon, {sub: '只算公国里的'})}
    <button type="button" class="linkish" data-act="helper" aria-expanded="${ui.helper}">${ui.helper ? '收起修道院算分' : '帮我算修道院分'}</button>${ui.helper ? monHelper() : ''}
    ${S.config.mods.shields ? num('shields', '盾徽终局分', q.shields, {sub: '1–6 号 12 分，7–12 号 8 分，13–18 号 4 分'}) : ''}
    ${S.config.mods.vine ? num('vines', '葡萄园', q.vines, {sub: '每块葡萄藤奖励板块算一片相连葡萄'}) : ''}`;
  const tieFields = m === 'solo' || u.bot ? '' : (need || q.empty !== null ? `<aside class="tiebox"><b>${need ? '有人和你同分' : '平局资料'}</b>
    <p>${S.config.ed === 'se' ? '典藏版：公国里空格<b>少</b>的获胜（中英文规则书都这样写，和 2019 版、原版相反）' : '公国里空格<b>多</b>的获胜'}${S.config.team ? '。' : '；还相同，终局时回合顺位更靠后的获胜。'}</p>
    ${num('empty', '公国版图上的空格数', q.empty, {max: 37})}${!S.config.team && (need === 'order' || q.order !== null) ? num('order', '终局时的回合顺位', q.order, {max: 5, sub: '1 是最前面'}) : ''}</aside>` : '');
  const us2 = us.map(x => ({x, q: S.scores[x.id]}));
  return `<section class="card"><h2>终局计分</h2>
   <p class="label">正在填 <small>也可以替别人填</small></p>
   <div class="seg wrap" role="group">${us.map(x => `<button type="button" data-act="mine" data-id="${x.id}" aria-pressed="${x.id === u.id}">${dot(x.id)}${esc(x.name)}${S.scores[x.id]?.confirmed ? ' ✓' : ''}</button>`).join('')}</div>
   <form id="score-form" data-k="score-${u.id}">${form}${tieFields}
    <label class="field"><span class="label">备注（可不填）</span><input name="note" maxlength="200" value="${esc(q.note)}"></label>
    <div id="preview">${m === 'solo' ? '' : breakdown(u, q)}</div>
    <div class="cta"><button class="primary wide" value="confirm" ${anyone()}>确认${m === 'solo' ? '结果' : '分数'}</button><button class="linkish" value="draft" ${anyone()}>先存着，稍后确认</button></div>
   </form></section>
  ${m === 'solo' ? '' : `<section class="card"><h2>全桌进度</h2>${us2.map(({x, q}) => `<div class="prow">${dot(x.id)}<span class="pname">${esc(x.name)}</span><span class="chip ${q?.confirmed ? 'ok' : ''}">${q?.confirmed ? '已确认' : '待确认'}</span><b>${q && (x.bot ? q.track[0] !== null : q.track.slice(0, x.members.length).every(v => v !== null)) ? total(x, q) : '—'}</b></div>`).join('')}</section>`}
  <div class="cta"><button class="primary wide" data-act="finish" ${hostOnly()}>都确认了，结算</button></div>`;
}

// ---------- result ----------
function result() {
  const c = S.config, m = mode(c), rows = standings(S), ps = participants(S), stars = ui.review.stars;
  const reviewer = ps.some(p => p.id === ui.review.name) ? ui.review.name : ps.some(p => p.id === ui.mine) ? ui.mine : ps[0].id;
  const tied = rows.some((r, i) => i && r.place === rows[i - 1].place);
  const body = m === 'solo'
    ? `<div class="solo-result ${rows[0].q.filled ? 'win' : ''}"><strong>${rows[0].q.filled ? '挑战成功' : '挑战未成功'}</strong><small>${esc(rows[0].name)}，起始目标分 ${rows[0].q.target}</small></div>`
    : rows.map(r => `<div class="rank ${r.place === 1 ? 'first' : ''}"><span class="place">${r.place}</span><div class="who"><b>${dot(r.id)}${esc(r.name)}</b>
      <small>${r.bot ? '自动机' : r.members.length > 1 ? r.members.map(p => esc(p.name)).join('、') : ''}${!r.bot && r.members[0]?.board ? ' 版图 ' + esc(r.members.map(p => p.board).join('、')) : ''}${!r.bot && r.total !== r.q.track.reduce((x, y) => x + (y ?? 0), 0) ? ` 分数轨 ${r.q.track.reduce((x, y) => x + (y ?? 0), 0)}，终局另加 ${r.total - r.q.track.reduce((x, y) => x + (y ?? 0), 0)}` : ''}${r.q.empty !== null ? ' 空格 ' + r.q.empty : ''}${r.q.note ? ' ' + esc(r.q.note) : ''}</small></div>
      <strong class="points">${r.total}</strong></div>`).join('');
  return `<section class="card result" id="shot"><div class="rhead"><img src="/img/cover.jpg" alt=""><div><h2>本局结算</h2><p class="note">${esc(summary(c))}，房间 ${code}</p></div></div>
   ${body}${tied ? '<aside>同分且平局规则也分不出，共享名次。</aside>' : ''}
   <footer>勃艮第城堡助手 burgundy.leisurecat.cloud</footer></section>
  <div class="cta row"><button class="primary" data-act="image">保存长图</button><button data-act="reopen" ${hostOnly()}>修改分数</button><a class="button" href="/history.html${roomQ}">往期对局</a></div>
  <section class="card review"><h2>给勃艮第城堡打个分</h2>
   <p class="label">谁在评价</p>${seg('reviewer', 'reviewer', ps.map(p => [p.id, esc(p.name)]), reviewer)}
   <div class="stars" role="group" aria-label="评分">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-act="star" data-v="${n}" aria-pressed="${n <= stars}" aria-label="${n} 星">★</button>`).join('')}</div>
   <textarea id="review-text" maxlength="500" placeholder="一句话说说这局（可不填）">${esc(ui.review.text)}</textarea>
   <button class="primary wide" data-act="review" ${ui.busy ? 'disabled' : ''}>${ui.review.sent ? '已提交（再提交会覆盖）' : '提交评价'}</button>
   <p class="note">评价会显示在桌游小助手首页，不会出现在长图里。</p></section>`;
}

// ---------- events ----------
function readScore(confirmed = false) {
  const f = $('#score-form'), u = units(S).find(x => x.id === ui.mine), q = {...draft(u), confirmed};
  const n = k => f.elements[k] ? (f.elements[k].value === '' ? null : Number(f.elements[k].value)) : undefined;
  q.track = [n('track0') ?? null, u.members.length > 1 ? n('track1') ?? null : null];
  for (const k of ['goods', 'silver', 'workers', 'mon', 'shields', 'vines']) { const v = n(k); if (v !== undefined) q[k] = v ?? 0; }
  for (const k of ['empty', 'order']) { const v = n(k); if (v !== undefined) q[k] = v; }
  if (f.elements.target) q.target = n('target');
  if (f.elements.filled) q.filled = f.elements.filled.value === '' ? null : f.elements.filled.value === 'true';
  q.note = f.elements.note.value;
  return q;
}
function setConfig(patch) {
  const c = {...structuredClone(S.config), ...patch};
  if (c.ed === 'r11') { c.mods = {}; c.team = false; c.bot = false; if (c.n === 1) c.n = 2; if (c.boards === 'b2') c.boards = 'b1'; }
  for (const k of MODS) if (!MOD_EDS[k].includes(c.ed)) delete c.mods[k];
  if (c.n !== 4 || c.ed === 'r11') c.team = false;
  if (c.ed !== 'se' || c.n > 3) c.bot = false;
  if (c.bot) delete c.mods.inns;
  if (mode(c) !== 'multi' && c.boards === 'random') c.boards = 'b1';
  if (c.first >= c.n) c.first = 0;
  if (!c.pool.length) c.pool = ['base'];
  const e = configError(c);
  if (e) return notify(e);
  send({t: 'config', config: c});
}
const rand = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;

$('#app').addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const a = b.dataset.act;
  try {
    if (a === 'create' || a === 'quick') {
      ui.busy = true; render();
      const r = await fetch('/api/room', {method: 'POST'});
      if (!r.ok) throw Error('建房失败，请再试一次');
      location.href = '/?r=' + (await r.json()).code + (a === 'quick' ? '&quick=1' : '');
    }
    else if (a === 'config') { const v = b.dataset.val, k = b.dataset.key; setConfig({[k]: ['n', 'first'].includes(k) ? Number(v) : v}); }
    else if (a === 'mod') setConfig({mods: {...S.config.mods, [b.dataset.val]: !S.config.mods[b.dataset.val]}});
    else if (a === 'randomFirst') setConfig({first: rand(S.config.n)});
    else if (a === 'draw') {
      const nums = S.config.pool.flatMap(k => { const [lo, hi] = POOLS[k]; return Array.from({length: hi - lo + 1}, (_, i) => String(lo + i)); });
      send({t: 'boards', boards: S.players.map((p, i) => i < S.config.n ? nums[rand(nums.length)] : p.board)});
    }
    else if (a === 'fold') ui.prepOpen = !ui.prepOpen;
    else if (a === 'rounds') ui.roundsOpen = !ui.roundsOpen;
    else if (a === 'next') send({t: 'next', from: S.phase});
    else if (a === 'mine') { ui.mine = b.dataset.id; store.set('cob-unit', ui.mine); }
    else if (a === 'helper') ui.helper = !ui.helper;
    else if (a === 'useMon') { $('#score-form').elements.mon.value = b.dataset.v; ui.scores[ui.mine] = readScore(); ui.helper = false; }
    else if (a === 'filled') { $('#score-form').elements.filled.value = b.dataset.val; ui.scores[ui.mine] = readScore(); }
    else if (a === 'step') {
      const input = $('#score-form').elements[b.dataset.name];
      input.value = Math.min(Number(input.max), Math.max(0, (Number(input.value) || 0) + Number(b.dataset.d)));
      ui.scores[ui.mine] = readScore();
    }
    else if (a === 'reviewer') ui.review.name = b.dataset.val;
    else if (a === 'star') ui.review.stars = Number(b.dataset.v);
    else if (['begin', 'direct', 'undo', 'finish', 'reopen'].includes(a)) { if (a === 'undo' || a === 'reopen') ui.scores = {}; send({t: a}); }
    else if (a === 'share') { await navigator.clipboard.writeText(location.origin + '/?r=' + code); notify('邀请链接已复制，发给同桌就能加入'); }
    else if (a === 'image') {
      const canvas = await html2canvas($('#shot'), {scale: 2, backgroundColor: '#f6f5f1', useCORS: true}), src = canvas.toDataURL('image/png');
      $('#image-dialog').innerHTML = `<div class="overlay" role="dialog" aria-label="结算长图"><div><button id="close-image">关闭</button><p>长按图片保存到手机</p><img alt="本局结算长图" src="${src}"><a class="button primary" download="burgundy_${code}.png" href="${src}">下载长图</a></div></div>`;
      $('#close-image').onclick = () => { $('#image-dialog').innerHTML = ''; };
    }
    else if (a === 'review') {
      const ps = participants(S), id = ps.some(p => p.id === ui.review.name) ? ui.review.name : ps.some(p => p.id === ui.mine) ? ui.mine : ps[0].id, p = S.players.find(p => p.id === id);
      ui.busy = true; render();
      const r = await fetch('https://boardgame.leisurecat.cloud/api/reviews', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({game: 'castles-of-burgundy', name: p.name, room: code, stars: ui.review.stars, text: ui.review.text})});
      if (!r.ok) throw Error('评价没提交上，请再试一次');
      ui.review.sent = true; notify('评价已提交，谢谢');
    }
  } catch (err) { notify(err.message); } finally { ui.busy = false; render(); }
});
$('#app').addEventListener('input', e => {
  const x = e.target;
  if (x.id === 'review-text') ui.review.text = x.value;
  if (x.dataset.player) ui.players[x.dataset.player] = {...(ui.players[x.dataset.player] || S.players.find(p => p.id === x.dataset.player)), [x.dataset.field]: x.value};
  if (x.dataset.mhn) { ui.mh[x.dataset.mhn + 'n'] = x.value; render(); return; }
  if (x.closest('#score-form') && !x.dataset.mh) { ui.scores[ui.mine] = readScore(); $('#preview').innerHTML = mode(S.config) === 'solo' ? '' : breakdown(units(S).find(u => u.id === ui.mine), ui.scores[ui.mine]); }
});
$('#app').addEventListener('change', e => {
  const x = e.target;
  if (x.dataset.config) {
    const [k, sub] = x.dataset.config.split(':');
    if (k === 'mod') setConfig({mods: {...S.config.mods, [sub]: x.checked}});
    else if (k === 'pool') setConfig({pool: x.checked ? [...S.config.pool, sub] : S.config.pool.filter(p => p !== sub)});
    else setConfig({[k]: x.checked});
  }
  if (x.dataset.player) {
    const p = {...S.players.find(p => p.id === x.dataset.player), ...ui.players[x.dataset.player], [x.dataset.field]: x.value};
    send({t: 'player', id: p.id, name: p.name, board: p.board});
    delete ui.players[p.id];
  }
  if (x.dataset.check) send({t: x.dataset.kind === 'setup' ? 'check' : 'pcheck', id: x.dataset.check, value: x.checked});
  if (x.dataset.mh) { ui.mh[x.dataset.mh] = x.checked; render(); }
});
$('#app').addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'join') { const v = $('#joinCode').value.trim().toUpperCase(); if (!/^[A-Z0-9]{4}$/.test(v)) return notify('请输入 4 位房间码'); location.href = '/?r=' + v; }
  if (e.target.id === 'score-form') { const q = readScore(e.submitter?.value === 'confirm'); ui.scores[ui.mine] = q; send({t: 'score', id: ui.mine, score: q}); }
});
async function loadRooms() {
  try { const r = await fetch('/api/rooms'); if (!r.ok) throw Error('房间列表没读到'); ui.rooms = await r.json(); render(); } catch (e) { notify(e.message); }
}
render();
if (code) connect(); else loadRooms();
