// 勃艮第城堡助手 · tile reference, summarised in our own words from the official rulebooks.
// eds: editions that have the tile. diff: wording that differs by edition (key = edition). src: page per edition.
// mod: the expansion the tile belongs to (shown only when that module is wanted in the filter).
export const KINDS = {mon: '修道院', bld: '建筑', ext: '扩展六角片', shield: '盾徽'};
const ALL = ['se', 'r19', 'r11'], NEW = ['se', 'r19'];
const MON = {se: 'p11–12', r19: 'p9–11', r11: 'p10–11'};

export const TILES = [
  // ---------- monasteries 1–26 (base game) ----------
  {kind: 'mon', no: '1', eds: ALL, src: MON, text: '同一城镇里，同种建筑可以放不止一座。'},
  {kind: 'mon', no: '2', eds: ALL, src: MON, text: '每个阶段结束时，公国里每座银矿除了 1 枚银币，再给 1 个工人。'},
  {kind: 'mon', no: '3', eds: ALL, src: MON, text: '每次卖货得 2 枚银币，不是 1 枚。用骰子卖货和放仓库卖货都算。'},
  {kind: 'mon', no: '4', eds: ALL, src: MON, text: '每次卖货另得 1 个工人。用骰子卖货和放仓库卖货都算。'},
  {kind: 'mon', no: '5', eds: ALL, src: MON, text: '放船只时，除了拿一个补给区的全部货物，还可以再拿一个相邻补给区的全部货物。'},
  {kind: 'mon', no: '6', eds: ALL, src: MON, diff: {
    se: '每回合一次：付 2 个工人，从 1–6 号补给区拿一块建筑（浅褐色），放进储存格。',
    r19: '买六角片时可以用工人代替银币（任意搭配），而且可以从所有补给区买，不只中央黑色补给区。仍然每回合只能买一块。',
    r11: '买六角片时可以从所有 7 个补给区买，不只中央黑色补给区。仍然每回合只能买一块。'
  }},
  {kind: 'mon', no: '7', eds: ALL, src: MON, text: '放牲畜计分时，每块参与计分的牲畜板块额外 +1 分（按板块算，不按牲畜只数算）。', diff: {se: '另外，鹅（4 个额外六角片）也算一种牲畜。'}},
  {kind: 'mon', no: '8', eds: ALL, src: MON, text: '用工人改点数时，每个工人可以改 1 或 2 点。'},
  {kind: 'mon', no: '9', eds: ALL, src: MON, text: '把建筑（浅褐色）放进公国时，点数可以免费 ±1。'},
  {kind: 'mon', no: '10', eds: ALL, src: MON, text: '把船只或牲畜（蓝色、绿色）放进公国时，点数可以免费 ±1。'},
  {kind: 'mon', no: '11', eds: ALL, src: MON, text: '把城堡、银矿或修道院放进公国时，点数可以免费 ±1。'},
  {kind: 'mon', no: '12', eds: ALL, src: MON, text: '从主版图拿六角片时，点数可以免费 ±1。'},
  {kind: 'mon', no: '13', eds: ALL, src: MON, text: '做“拿 2 个工人”行动时，另得 1 枚银币。放宿舍拿工人不算。'},
  {kind: 'mon', no: '14', eds: ALL, src: MON, text: '做“拿 2 个工人”行动时，改为拿 4 个。放宿舍拿工人不算。'},
  {kind: 'mon', no: '15', eds: ALL, src: MON, end: true, text: '终局：卖出过的货物，每种颜色得分（没卖的不算）。卖出的货物随时可以翻看。', diff: {se: '每种 2 分。', r19: '每种 2 分。', r11: '每种 3 分。'}},
  {kind: 'mon', no: '16–23', eds: ALL, src: MON, end: true, text: '终局：每块对应一种建筑（板块上印着），公国里每有一座这种建筑得 4 分。规则书的例子：17 号对应瞭望塔，22 号对应银行。'},
  {kind: 'mon', no: '24', eds: ALL, src: MON, end: true, text: '终局：公国里放过几种牲畜，每种得 4 分。', diff: {se: '鹅也算一种。', r19: '鹅也算一种。'}},
  {kind: 'mon', no: '25', eds: ALL, src: MON, end: true, text: '终局：卖出的每块货物得 1 分（没卖的不算）。'},
  {kind: 'mon', no: '26', eds: ALL, src: MON, end: true, text: '终局：拿到的每块奖励板块（大小都算）得分。', diff: {se: '每块 3 分。', r19: '每块 3 分。', r11: '每块 2 分。'}},
  // ---------- 4 new hex tiles (2nd expansion) ----------
  {kind: 'mon', no: '27', mod: 'tiles2', eds: NEW, src: {se: 'p13', r19: 'p11'}, text: '回合顺位轨：你的回合顺位标记和别人叠在同一格时，总是放在最上面。自己移动和别人移过来都一样。'},
  {kind: 'mon', no: '28', mod: 'tiles2', eds: NEW, src: {se: 'p13', r19: 'p11'}, text: '工人：可以向供应区买工人，1 枚银币买 2 个。'},
  {kind: 'ext', no: '吊车', mod: 'tiles2', eds: NEW, src: {se: 'p13', r19: 'p11'}, text: '黑背建筑。放下时可以立刻发动任意一种建筑的效果，不需要公国里有那种建筑。终局时还可以当作任意一种建筑，计入 16–23、29 号修道院（可以和放下时选的不同）。'},
  {kind: 'ext', no: '鹅', mod: 'tiles2', eds: NEW, src: {se: 'p13', r19: 'p11'}, text: '黑背牲畜。放下时得 2 分，再加同一牧场里另一种牲畜的分。之后同一牧场每放一块牲畜，鹅再给 2 分。', diff: {se: '计入 7 号和 24 号修道院时算一种牲畜。', r19: '计入 24 号修道院时算一种牲畜。'}},
  // ---------- white castles (5th expansion) ----------
  {kind: 'ext', no: '白色城堡', mod: 'white', eds: NEW, src: {se: 'p14', r19: 'p12'}, text: '共 9 块（6 块建筑、1 块修道院、2 块黑背）。放进公国时，立刻用白色骰子的点数做一个行动，可以用工人改这个点数（不要真的转白骰）。'},
  {kind: 'mon', no: '29', mod: 'white', eds: NEW, src: {se: 'p12、p14', r19: 'p10、p12'}, end: true, text: '终局：公国里每座白色城堡得 4 分。'},
  // ---------- inns (6th expansion) ----------
  {kind: 'ext', no: '旅店', mod: 'inns', eds: NEW, src: {se: 'p14', r19: 'p12'}, text: '从中央黑色补给区买（2 枚银币）。可以放在任何颜色的空格上（照常要相邻），每个区域最多一块。旅店本身没有效果，只让这个区域多算一格。', diff: {se: '区域最大可到 9 格，9 格区域得 45 分。', r19: '区域最大只能到 8 格。'}},
  // ---------- buildings ----------
  {kind: 'bld', no: '市场', eds: ALL, src: {se: 'p8', r19: 'p6', r11: 'p6'}, text: '从 1–6 号补给区拿一块船只或牲畜，放进储存格（不能从中央黑色补给区拿）。'},
  {kind: 'bld', no: '木工坊', eds: ALL, src: {se: 'p8', r19: 'p6', r11: 'p6'}, text: '从 1–6 号补给区拿一块建筑，放进储存格（不能从中央黑色补给区拿）。'},
  {kind: 'bld', no: '教堂', eds: ALL, src: {se: 'p8', r19: 'p6', r11: 'p6'}, text: '从 1–6 号补给区拿一块银矿、修道院或城堡，放进储存格（不能从中央黑色补给区拿）。'},
  {kind: 'bld', no: '仓库', eds: ALL, src: {se: 'p9', r19: 'p7', r11: 'p7'}, text: '不用骰子，立刻卖掉一种货物（照卖货行动结算）。'},
  {kind: 'bld', no: '宿舍', eds: ALL, src: {se: 'p9', r19: 'p7', r11: 'p7'}, text: '立刻拿 4 个工人。'},
  {kind: 'bld', no: '银行', eds: ALL, src: {se: 'p9', r19: 'p7', r11: 'p7'}, text: '立刻拿 2 枚银币。'},
  {kind: 'bld', no: '市政厅', eds: ALL, src: {se: 'p9', r19: 'p7', r11: 'p7'}, text: '立刻再从储存格放一块任意颜色的六角片进公国，照常触发它的效果。'},
  {kind: 'bld', no: '瞭望塔', eds: ALL, src: {se: 'p9', r19: 'p7', r11: 'p7'}, text: '立刻得 4 分。'},
  // ---------- shields ----------
  ...[
    ['1', 12, '公国里所有牧场当作一整块牧场计算牲畜分。'],
    ['2', 12, '别的玩家每次拿到工人，你也拿 1 个工人。'],
    ['3', 12, '阶段结束付盾徽纳贡时，可以用工人代替银币（任意搭配）。'],
    ['4', 12, '储存格不限数量（不再只有 3 格）。'],
    ['5', 12, '放船只时可以指定一种货物，把 6 个补给区里这种货物全部拿走。'],
    ['6', 12, '拿到后选一位玩家：他公国里的修道院都当作在你的公国里，他之后放的修道院你也享受。终局时你也按他的计分类修道院算分（用你自己的建筑等数量）。'],
    ['7', 8, '新拿到的奖励板块分数翻倍。'],
    ['8', 8, '银矿收入翻倍。'],
    ['9', 8, '卖货时每卖 1 块得 1 枚银币（不是每种 1 枚）。'],
    ['10', 8, '终局时，你的计分类修道院分数翻倍。'],
    ['11', 8, '每次放城堡时，额外行动可以选择拿一块盾徽。'],
    ['12', 8, '卖货时每块货物的得分翻倍。'],
    ['13', 4, '终局时，你每块盾徽的终局分翻倍（包括这块）。'],
    ['14', 4, '每个阶段结束时，所有人做完骰子行动后，你从 1–6 号补给区拿一块六角片，直接放进公国并触发效果。'],
    ['15', 4, '每个阶段结束时，所有人做完骰子行动后，你从中央黑色补给区拿一块六角片，直接放进公国并触发效果。'],
    ['16', 4, '你的回合里，可以把一颗骰子改成任意点数。'],
    ['17', 4, '完成区域时，按大一格的区域计分（例如 3 格按 4 格算）。'],
    ['18', 4, '六角片可以放在公国任意空格，不必挨着已放的六角片。']
  ].map(([no, vp, text]) => ({kind: 'shield', no, mod: 'shields', eds: NEW, vp, src: {se: 'p18', r19: Number(no) < 10 ? 'p15' : 'p16'},
    text: `${text}终局 +${vp} 分。`,
    diff: no === '6' ? {se: '27 号修道院（回合顺位轨）不能借用。'} : no === '7' ? {r19: '规则书写“你的奖励板块分数翻倍”。'} : no === '17' ? {se: '9 格区域得 45 分。', r19: '区域最大只算到 8 格。'} : no === '10' ? {r19: '德文规则书补充：10 号不能和 6 号一起用。'} : undefined}))
];

export const tileText = t => `${KINDS[t.kind]} ${t.no}：${t.text || ''}${t.diff ? ' 版本差异：' + Object.entries(t.diff).map(([e, d]) => `${{se: '典藏版', r19: '2019 版', r11: '2011 版'}[e]}——${d}`).join('；') : ''}（适用：${t.eds.map(e => ({se: '典藏版', r19: '2019 版', r11: '2011 版'})[e]).join('、')}；页码 ${Object.entries(t.src).map(([e, p]) => ({se: '典藏版', r19: '2019 版', r11: '2011 版'})[e] + ' ' + p).join('，')}）`;
