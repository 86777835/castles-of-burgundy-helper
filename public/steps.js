// 勃艮第城堡助手 · checklists for setup, each phase start, each phase end and the round reminder.
// Every item cites the official rulebook of the chosen edition: [book, page]. Wording follows the 简中 Special Edition.
import {boardN, mode, PHASES, PHASE_BONUS, participants, turnOrder} from './logic.js';
import {esc} from './dom.js';

export const BOOKS = {
  se: {name: '典藏版', url: 'https://www.ravensburger.org/spielanleitungen/ecm/Spielanleitungen/CoB_Rulebook_285x210mm%20%5B28%20pages%5D.pdf'},
  r19: {name: '2019 版', url: 'https://product-files.ravensburger.cloud/manuals/664462.pdf'},
  r11: {name: '2011 版', url: 'https://cdn.1j1ju.com/medias/04/f5/f9-the-castles-of-burgundy-rulebook.pdf'}
};
export const ED_NAMES = {se: '特别典藏版', r19: '2019 新版（红盒）', r11: '2011 原版'};
export const ED_SHORT = {se: '典藏版', r19: '红盒', r11: '原版'};
export const MOD_INFO = {
  tiles2: {name: '4 个额外六角片', note: '回合顺位轨、工人、吊车、鹅'},
  white: {name: '白色城堡', note: '放下时用白骰点数行动'},
  inns: {name: '旅店', note: '让区域多算一格'},
  routes: {name: '商路', note: '卖货时沿商路拿奖励'},
  border: {name: '边境哨所', note: '连通哨所得分'},
  shields: {name: '盾徽', note: '掷出对子拿盾徽'},
  vine: {name: '葡萄园', note: '双生六角片'}
};
// One-line description of a room's setup, e.g. 典藏版，3 人，盾徽、旅店
export function summary(c) {
  const m = mode(c), who = m === 'solo' ? '单人' : c.team ? '4 人团队' : c.n + ' 人' + (c.bot ? '＋自动机' : '');
  const mods = Object.keys(MOD_INFO).filter(k => c.mods?.[k]).map(k => MOD_INFO[k].name);
  return `${ED_SHORT[c.ed]}，${who}${mods.length ? '，' + mods.join('、') : ''}`;
}
export const POOL_NAMES = {base: '基础 1–10 号', b11: '第 1 扩展 11–18 号', b19: '冠军赛 19–20 号', b21: '典藏版新版图 21–22 号', b23: '边境哨所 23–30 号'};

// One checklist item. pages: {se: 'p5', r19: 'p2', r11: 'p2'}; only the chosen edition's page is shown.
const item = (id, text, pages, ed, extra = {}) => ({id, text, book: ed, page: pages[ed] ?? pages.all, ...extra});
const castleColor = ed => ed === 'se' ? '暗红色' : '深绿色';

export function setupList(s) {
  const c = s.config, ed = c.ed, nb = boardN(c), m = mode(c), mods = c.mods, list = [];
  const sec = (title, items) => list.push({title, items: items.filter(Boolean)});
  const ps = participants(s), order = turnOrder(s);

  // ---------- main board and supply ----------
  const side = ed === 'r11' ? '主版图只有一面。格子上印的 2、3、4 表示几人局要用的格。'
    : ed === 'se' ? (nb >= 3 ? '主版图用 <b>3–4 人面</b>。' : `主版图翻到 <b>2 人面</b>（印有 2 人标记的一面）。${m === 'solo' ? '单人游戏也用这一面。' : ''}`)
    : (nb === 4 ? '主版图用 <b>4 人面</b>。' : `主版图翻到 <b>2–3 人面</b>。${m === 'solo' ? '单人游戏也用这一面。' : ''}`);
  sec('主版图与公共区', [
    item('board', side + (c.bot ? '自动机算一名玩家。' : ''), {se: m === 'solo' ? 'p15' : 'p4、p22', r19: m === 'solo' ? 'p14' : 'p2、p11', r11: 'p3'}, ed),
    item('supply', '银币、工人和白色骰子放在主版图旁。银币和工人不限量，不够就找东西代替。', {se: 'p2、p5', r19: 'p2、p7', r11: 'p2'}, ed),
    ed === 'se'
      ? item('hex', '164 块六角片按背面颜色分开：<b>绿、米、黄、黑</b>四色分别装进布袋；暗红城堡、蓝色船只、灰色银矿正面朝上堆在一旁。', {se: 'p5'}, ed)
      : item('hex', '164 块六角片按背面颜色分成 7 堆，背面朝上放在主版图旁。', {r19: 'p2', r11: 'p2'}, ed),
    mods.tiles2 && item('tiles2', '「4 个额外六角片」按背面颜色混进对应的堆：2 块黄背（27、28 号修道院），2 块黑背（吊车、鹅）。', {se: 'p13', r19: 'p11'}, ed),
    mods.white && item('whiteTiles', '「白色城堡」9 块按背面颜色混进对应的堆：6 块建筑、1 块修道院（29 号）、2 块黑背。', {se: 'p14', r19: 'p12'}, ed),
    c.bot
      ? item('goods', '先从 42 块货物里<b>挑出每种各 1 块</b>（共 6 块）留给自动机。剩下的背面朝上洗匀，在 A–E 五个阶段格上各放一叠 5 块；再剩下的先放一边，等下每人抽 3 块。', {se: 'p5、p22'}, ed)
      : item('goods', '42 块货物背面朝上洗匀，在 A–E 五个阶段格上各放一叠 5 块。剩下 <b>17 块</b>先放一边，等下每人抽 3 块。', {se: 'p5', r19: 'p2', r11: 'p2'}, ed),
    m === 'solo'
      ? item('bonus', '单人游戏不拿奖励板块：铺满一种颜色时，改为从中央黑色补给区选一块直接放进公国。', {se: 'p16', r19: 'p14'}, ed)
      : item('bonus', `12 块奖励板块按颜色放到 6 个奖励格上，大块叠在小块上面。本局：第一个铺满某种颜色的得 <b>${nb + 3}</b> 分，第二个得 <b>${nb}</b> 分，之后的没有。`, {se: 'p5、p9', r19: 'p2、p8', r11: 'p2、p8'}, ed),
    item('depots', '补给区先空着。A 阶段开始时再补六角片和货物（下一步的阶段清单会列出来）。', {se: 'p6', r19: 'p3', r11: 'p3'}, ed),
    mods.inns && item('inns', '旅店 5 块放在一旁。每阶段开始时放 1 块到中央黑色补给区旁。', {se: 'p14', r19: 'p12'}, ed),
    mods.shields && item('shields', `18 块盾徽背面朝上洗匀，随机放到补给区的货物格上再翻开：${nb === 2 ? '<b>每个补给区 1 块</b>' : nb === 3 ? '<b>1、3、5 号各 1 块，2、4、6 号各 2 块</b>' : '<b>每个补给区 2 块</b>'}。剩下的放回盒子，被拿走的不补。${c.bot ? '和自动机玩时，先把 <b>2 号盾徽</b>拿掉。' : ''}`, {se: 'p17' + (c.bot ? '、p27' : ''), r19: 'p15'}, ed),
    mods.border && ed === 'se' && item('borderBonus', '把边境哨所奖励板块放到主版图上对应的位置。', {se: 'p14'}, ed),
    mods.vine && item('vineShop', `葡萄园补给区（塑料架）放在主版图旁，葡萄园商店放在它下面${nb < 4 ? '，<b>翻到 2–3 人面</b>' : ''}。51 块双生六角片装进布袋。`, {se: 'p19'}, ed),
    mods.vine && nb < 4 && item('vineLimit', `可选：想少一点随机，${nb === 3 ? '3 人局拿掉 1 种葡萄颜色（含这种葡萄的 16 块双生六角片和对应的葡萄藤奖励板块）' : '2 人局拿掉 2 种葡萄颜色（29 块双生六角片和对应的葡萄藤奖励板块）'}。`, {se: 'p19'}, ed, {optional: true})
  ]);

  // ---------- each player / team ----------
  const who = c.team ? '每队' : '每人';
  let board;
  if (m === 'solo') board = ed === 'se' ? '单人公国版图：<b>33 号</b>入门面，<b>34 号</b>进阶面。' : '单人公国版图：<b>13A</b> 入门面，<b>13B</b> 进阶面。';
  else if (c.team) board = ed === 'se' ? `每队一块团队版图，由两半拼成：${c.boards === 'b2' ? '进阶面 <b>31b + 32b</b>' : '<b>31a + 32a</b>（熟手可用背面 31b + 32b）'}。` : `每队一块团队版图，由两半拼成：${c.boards === 'b2' ? '进阶面 <b>12b1 + 12b2</b>' : '<b>12a1 + 12a2</b>（熟手可用背面 12b）'}。`;
  else if (mods.border && ed === 'r19') board = '每人一块 <b>11 号</b>公国版图（11a–11f，边境哨所）。';
  else if (c.boards === 'random') board = ed === 'se' ? '每人随机一块公国版图，自己选用哪一面，放在玩家版图上，再盖上覆盖板。' : '公国版图背面朝上洗匀，每人抽一块，自己选用哪一面。';
  else board = `${who}一块 <b>${c.boards === 'b2' ? 2 : 1} 号</b>公国版图（全员同号）${ed === 'se' ? '，放在玩家版图上，再盖上覆盖板' : ''}。`;
  const boardsNow = ps.filter(p => p.board).map(p => `${esc(p.name)} ${esc(p.board)} 号`).join('，');
  const castle = m === 'solo' ? `初始城堡放在任意一个${castleColor(ed)}城堡格。`
    : c.team ? `初始城堡放在中央 <b>1 号</b>城堡格${c.boards === 'b2' ? '（进阶面每队可选 1 号或 6 号）' : ''}。`
    : c.boards === 'random' ? `初始城堡放在自己选的${castleColor(ed)}城堡格。大家事先说好是同时放，还是按顺位依次放。`
    : `初始城堡（${castleColor(ed)}六角片）放在公国中央的 <b>6 号</b>城堡格。`;
  const workerText = m === 'solo' ? '2 个工人。'
    : c.team ? '工人：<b>A 队 3 个，B 队 5 个</b>；每队 2 枚银币。资源放在团队版图旁，大家都看得见。'
    : '工人按回合顺位给：' + order.filter(n => n !== '自动机').map((n, i) => `${esc(n)} <b>${i + 1}</b> 个`).join('，') + (c.bot ? '。自动机不拿工人' : '') + '。';
  sec(c.team ? '每队' : m === 'solo' ? '你的准备' : '每位玩家', [
    item('duchy', board + (boardsNow ? `<br>本局：${boardsNow}。` : ''), {se: m === 'solo' ? 'p15' : c.team ? 'p15' : 'p5', r19: m === 'solo' ? 'p14' : c.team ? 'p13' : mods.border ? 'p12' : c.boards === 'random' ? 'p16' : 'p2', r11: c.boards === 'random' ? 'p12' : 'p2'}, ed),
    item('castle', castle, {se: m === 'solo' ? 'p15' : c.team ? 'p15' : 'p5', r19: m === 'solo' ? 'p14' : c.team ? 'p13' : c.boards === 'random' ? 'p16' : 'p2', r11: c.boards === 'random' ? 'p12' : 'p2'}, ed),
    item('mygoods', m === 'solo' ? '从剩下的货物里随机抽 3 块，放在版图旁。单人游戏不限货物种类。'
      : c.team ? '每队从剩下的货物里随机抽 3 块，放进团队货物格，同色叠放。没抽到的放回盒子。'
      : `${who}从剩下的货物里随机抽 <b>3 块</b>，正面朝上放进货物格，${ed === 'se' ? '同号' : '同色'}叠放。没抽到的放回盒子，本局不用。`, {se: m === 'solo' ? 'p15' : c.team ? 'p15' : 'p5', r19: m === 'solo' ? 'p14' : c.team ? 'p13' : 'p2', r11: 'p2'}, ed),
    !c.team && item('silver', m === 'solo' ? '1 枚银币。' : '每人 1 枚银币。', {se: m === 'solo' ? 'p15' : 'p5', r19: m === 'solo' ? 'p14' : 'p2', r11: 'p2'}, ed),
    item('workers', workerText, {se: m === 'solo' ? 'p15' : c.team ? 'p15' : 'p5', r19: m === 'solo' ? 'p14' : c.team ? 'p13' : 'p3', r11: 'p3'}, ed, {key: true}),
    m === 'solo'
      ? item('target', '计分标记放在计分轨起点，回合顺位标记放在计分轨 <b>50</b> 当目标分。觉得难就从更低的分开始，觉得容易就更高。', {se: 'p15', r19: 'p14'}, ed)
      : item('order', c.team ? '回合顺位轨：第 1 轮按 <b>A1、B1、A2、B2</b> 叠放，之后按顺位轨。'
        : `回合顺位轨：${esc(order[0])}的标记放在第 1 格最上面，其余依次往下叠：${order.map(esc).join(' → ')}（最后一位在最底下）。${c.bot ? '自动机永远是最后一位。' : ''}`, {se: c.team ? 'p15' : 'p5、p22', r19: c.team ? 'p13' : 'p3', r11: 'p3'}, ed),
    item('kit', `每人拿同色 2 颗骰子；计分标记放在计分轨起点；100/200 分板块放在手边；${ed === 'se' ? '帮助表' : '概览板'}放在版图旁。`, {se: 'p5', r19: 'p2', r11: 'p2'}, ed),
    item('white', m === 'solo' ? '白色骰子也归你。' : `白色骰子交给起始玩家${c.team ? ' A1' : '（' + esc(order[0]) + '）'}。`, {se: m === 'solo' ? 'p15' : 'p5', r19: m === 'solo' ? 'p14' : 'p3', r11: 'p3'}, ed),
    mods.routes && item('routes', `商路：${c.bot ? '你们' : '每人'}随机拿 <b>${{2: 5, 3: 4, 4: 3}[nb]} 张</b>，按抽到的顺序在玩家版图${ed === 'se' ? '下方' : '上方'}排成一行。${ed === 'se' ? '可选：自己决定顺序。' : ''}${c.bot ? '自动机不用商路，改为每次卖货多得 1 分。' : ''}`, {se: 'p14' + (c.bot ? '、p26' : ''), r19: 'p12'}, ed),
    mods.vine && item('vineBoard', `每人一块葡萄园版图；从一套 6 种葡萄藤奖励板块里随机给每人 1 块，其余放回奖励池。${c.bot ? '自动机不用葡萄园版图和葡萄藤奖励板块。' : ''}`, {se: 'p19' + (c.bot ? '、p27' : '')}, ed)
  ]);

  // ---------- Châteauma ----------
  if (c.bot) sec('自动机', [
    item('botBoard', '自动机用自己的公国版图（35 号面朝上），不用玩家版图。先选好难度：入门、普通、困难，以及难度调整的数量。第一次建议普通难度、不加调整。', {se: 'p22、p26'}, ed),
    item('botCards', `${mods.vine ? '郡县卡用 1 号和 10–17 号' : '郡县卡用 1–9 号'}：洗匀后逐张翻，翻到有城堡格的那张，放在「1–4」槽下面；其余洗匀放在最左槽下当牌堆，再翻 1 张放在「5–6」槽下面。`, {se: mods.vine ? 'p22、p27' : 'p22'}, ed),
    item('botStart', '在「1–4」那张郡县卡的城堡格上放 1 块城堡；把预留的 6 块货物按编号放到自动机的货物格；给它 1 枚银币，不给工人。', {se: 'p22'}, ed),
    item('botFirst', '你们之中掷骰定起始玩家，自动机永远最后。', {se: 'p22'}, ed)
  ]);
  return list;
}

// Steps at the start of phase k (0 = A). Clearing and refilling: R19 p3, SE p6, R11 p3; 2/3 players: R19 p11, SE p10, R11 p3.
export function phaseStart(s, k) {
  const c = s.config, ed = c.ed, nb = boardN(c), mods = c.mods, P = PHASES[k], items = [];
  const add = (...a) => items.push(item(...a));
  if (k > 0) add('clear', '把主版图上<b>剩下的六角片全部清走</b>，放回盒子。补给区里的货物<b>不动</b>。' + (ed === 'r11' ? '（原版规则书说剩下的船只、银矿、城堡也可以留着不换，因为同类都一样。）' : ''), {se: 'p6', r19: 'p3', r11: 'p3'}, ed);
  const fill = nb === 4 ? '6 个补给区的六角格<b>全部补满</b>（每格放对应颜色的六角片，翻开）。'
    : ed === 'se' ? (nb === 3 ? '补 6 个补给区的六角格，<b>标「4」的格不补</b>（每格放对应颜色的六角片，翻开）。' : '2 人面：补满 6 个补给区的六角格（每格放对应颜色的六角片，翻开）。')
    : ed === 'r19' ? (nb === 3 ? '2–3 人面：补内圈 12 格，<b>再补标「3」的格</b>（每格放对应颜色的六角片，翻开）。' : '2–3 人面：<b>只补内圈 12 格</b>，标「3」的格不补（每格放对应颜色的六角片，翻开）。')
    : (nb === 3 ? '只补标「2」和「3」的格，共 <b>18 格</b>（每格放对应颜色的六角片，翻开）。' : '只补标「2」的格，共 <b>12 格</b>（每格放对应颜色的六角片，翻开）。');
  add('fill', fill, {se: nb === 4 ? 'p6' : 'p6、p10', r19: nb === 4 ? 'p3' : 'p11', r11: 'p3'}, ed);
  if (nb === 3) {
    const mine = k === 1 || k === 3;
    add('special', `3 人局特例：6 号补给区的${ed === 'se' ? '「3BD」格' : '深绿色城堡格'}，本阶段放<b>${mine ? '银矿（灰色）' : '城堡'}</b>。${mine ? 'B、D 阶段放银矿，A、C、E 阶段放城堡。' : ''}`, {se: 'p6、p10', r19: 'p11', r11: 'p3'}, ed, {warn: mine});
  }
  const black = {2: 4, 3: 6, 4: 8}[nb];
  add('black', (ed === 'se' && nb === 2 ? '中央黑色补给区：2 人面上的黑色格全部用黑背六角片补满，翻开。' : `中央黑色补给区用黑背六角片补满 <b>${black} 格</b>${ed === 'se' && nb === 3 ? '（标「4」的格不补）' : ''}，翻开。`) + (ed === 'r11' ? '英文原版规则书写的“2 到 8 块”是印错，德文原文是 4 到 8 块。' : ''), {se: 'p6', r19: nb === 4 ? 'p3' : 'p11', r11: 'p4'}, ed);
  add('goods', `把 <b>${P} 阶段格</b>上的 5 块货物翻开，放到 5 个轮次格上。`, {se: 'p6', r19: 'p3', r11: 'p4'}, ed);
  if (mods.inns) add('inn', '旅店：放 1 块到中央黑色补给区旁，叠在之前没被买走的旅店上面（旅店不随阶段清走）。', {se: 'p14', r19: 'p12'}, ed);
  if (mods.vine) add('vine', `${k > 0 ? '清空葡萄园补给区和葡萄园商店，再' : ''}从布袋抽双生六角片补上：${nb === 4 ? '葡萄园补给区 <b>6 块</b>，商店 <b>3 块</b>' : nb === 3 ? '葡萄园补给区 <b>3 块</b>，商店 <b>3 块</b>（标「3」的格要补）' : '葡萄园补给区 <b>3 块</b>，商店 <b>1 块</b>'}。`, {se: 'p19'}, ed);
  return items;
}

// Steps at the end of phase k: shield tribute first, then mine income (R19 p9, p15; SE p10, p17).
export function phaseEnd(s, k) {
  const c = s.config, ed = c.ed, mods = c.mods, items = [];
  const add = (...a) => items.push(item(...a));
  if (mods.shields) add('late', '有 14、15 号盾徽的玩家：所有人做完骰子行动后，从 1–6 号补给区（14 号）或中央黑色补给区（15 号）拿一块六角片，直接放进公国。', {se: 'p18'}, ed);
  if (mods.shields) add('tribute', '<b>先付盾徽纳贡</b>：每块盾徽 1 枚银币。付不起或不想付，就移除相应数量的盾徽。（3 号盾徽可以用工人付）', {se: 'p17、p18', r19: 'p15'}, ed);
  add('mines', '每座已经放进公国的银矿得 <b>1 枚银币</b>。（2 号修道院：每座银矿再得 1 个工人' + (mods.shields ? '；8 号盾徽：银矿收入翻倍' : '') + '）', {se: 'p10', r19: 'p9', r11: 'p9'}, ed);
  if (c.bot) add('botMines', '自动机：公国版图和郡县卡上每座正面朝上的银矿得 1 枚银币（储备区里的不算）。', {se: 'p23'}, ed);
  if (k === 4) add('last', '这是最后一个阶段。拿完收入，就进入终局计分。', {se: 'p10', r19: 'p9', r11: 'p9'}, ed);
  return items;
}

// What happens every round (R19 p4, SE p6, R11 p4). Plain reminders, nothing to tick.
export function roundNotes(s) {
  const c = s.config, ed = c.ed, m = mode(c), notes = [
    item('roll', `所有人同时掷自己的 2 颗骰子，起始玩家另外掷白色骰子。`, {se: 'p6', r19: 'p4', r11: 'p4'}, ed),
    item('place', '起始玩家先把轮次格上的下一块货物放到白骰点数对应的补给区。<b>白骰不能用来行动，也不能用工人改。</b>', {se: 'p6', r19: 'p4', r11: 'p4'}, ed),
    item('turn', '然后按回合顺位轨行动：越靠前的越先，同一格从上往下。', {se: 'p6', r19: 'p4', r11: 'p4'}, ed)
  ];
  if (m === 'solo') notes.push(item('soloRemove', `单人：放完货物后，再从白骰对应的补给区移除 1 块六角片（${ed === 'se' ? '从上往下' : '2、3、5、6 号从上往下，1、4 号从左往右'}；空了就顺时针移到下一个补给区）。`, {se: 'p16', r19: 'p14'}, ed));
  if (c.bot) notes.push(item('botDie', '自动机：白骰 1–4 用左边的郡县卡，5–6 用右边的；它的回合只做一个动作：选一块六角片放上郡县卡。', {se: 'p23'}, ed));
  return notes;
}

export const phaseBonus = k => PHASE_BONUS[k];
