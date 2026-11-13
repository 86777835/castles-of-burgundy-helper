// N-minute teach: a script the teacher reads aloud to start a first game, written from the Special Edition rulebook
// (same wording as tools/讲解稿.md, i.e. the Simplified Chinese edition). It names every important element in a sentence and
// leaves the fine rulings to the rules assistant. Terms in {text|id} open a note with a picture cropped from the official
// Special Edition rulebook (img/teach/<icon>.webp); the 「问」 buttons and each note's 「问规则助手」 ask the rules assistant
// (chat.js) straight away. Older editions differ in a few places; those are the last 注意事项, not a separate mode.
const ICON = (id, cls = '') => id ? `<img class="ico ${cls}" src="/img/teach/${id}.webp" alt="">` : '';

// id: name, where you see it on the table, what it means. icon: a picture in img/teach/.
const TERMS = {
  vp: { name: '胜利点', icon: 'vpmarker', where: '主版图外圈的分数轨，每人一个带肖像的计分标记。', what: '就是分数。E 阶段打完，胜利点最多的人赢。' },
  vptile: { name: '100/200 分板块', icon: 'vptile', where: '每人一块圆形板块，一面 100、一面 200。', what: '计分标记绕过 100 分时，把它 100 面朝上放在面前；到 200 再翻面。' },
  phase: { name: '阶段', icon: 'phase', where: '主版图左边 A–E 五个阶段格，开局各放 5 块背面朝上的货物。格子旁的数字是这个阶段铺满区域的奖励分。', what: '游戏分 A–E 五个阶段，每个阶段 5 轮，一共 25 轮。越早铺满区域，奖励越多。' },
  round: { name: '轮次格', icon: 'round', where: '阶段格旁边一列 5 个空格。', what: '阶段开始时把本阶段的 5 块货物翻开放在这里。每轮起始玩家拿走一块，剩几块就还剩几轮。' },
  board: { name: '主版图', icon: 'board', where: '桌子中央。2 人局翻到印着 2 人图标的那一面。', what: '6 个编号补给区围着中央黑色补给区，上方放奖励板块，四周是分数轨。' },
  depot: { name: '补给区', icon: 'depot', where: '主版图上 6 块，各印一个骰子点数。每块有几个彩色六角格，加一个放货物的方格。', what: '六角片和货物都摆在这里。拿六角片时，骰子点数是几就去几号补给区拿。' },
  black: { name: '中央黑色补给区', icon: 'black', where: '主版图正中的黑色六角格。', what: '放黑色背面的六角片。每回合可以花 2 枚银币买 1 块，不用骰子，也不占行动。' },
  duchy: { name: '公国版图', icon: 'duchy', where: '每人一块，37 个六角格，叠在玩家版图上。', what: '你的领地。每格有颜色和一个 1–6 的数字，六角片只能放进同色、同数字的格子。' },
  player: { name: '玩家版图', icon: 'player', where: '每人一块大板子，公国版图放在上面。', what: '四周有放骰子、银币、工人、奖励板块的位置；左下角存货物，右下角是 3 个储存格。' },
  storage: { name: '储存格（钥匙格）', icon: 'storage', where: '玩家版图右下角，3 个印着钥匙的六角格。', what: '拿来的六角片都先放这里，最多 3 块，下一次“放进公国”才从这里拿。满了要先丢一块。' },
  region: { name: '区域', icon: 'duchy', where: '公国版图上相连的同色格子。', what: '把一块区域铺满，立刻按格数得分，再加当前阶段的奖励。' },
  town: { name: '城镇', icon: 'buildings', where: '公国版图上相连的浅褐色格子。', what: '放建筑的地方。同一个城镇里，每种建筑只能有一座。' },
  dice: { name: '骰子', icon: 'dice', where: '每人 2 颗自己颜色的骰子。', what: '每颗做一个行动。点数决定去哪个补给区拿、放进公国哪个数字的格子、卖哪种货物。' },
  white: { name: '白骰', icon: 'dice', where: '一颗白色骰子，在起始玩家手里。', what: '只决定这一轮的货物放到哪个补给区。不能用来行动，也不能用工人改。' },
  start: { name: '起始玩家', icon: 'order', where: '回合顺位轨上最前面的人；同一格叠着时，最上面的人。', what: '每轮第一个行动，并且掷白骰放货物。放船只会让你在顺位轨上前进。' },
  order: { name: '回合顺位', icon: 'order', where: '主版图右边的回合顺位轨，每人一个塔形标记。', what: '越靠前越先行动，同一格里上面的先。放船只时前进一格，叠在那一格最上面。' },
  worker: { name: '工人', icon: 'worker', where: '浅绿色板块，印着 +1 / −1，放在玩家版图左边。', what: '每个让一颗骰子点数加 1 或减 1，1 和 6 可以互改，可以连用好几个。用工人不算行动。终局每 2 个得 1 分。' },
  silver: { name: '银币', icon: 'silver', where: '银色硬币，放在玩家版图左上角。', what: '主要用来买中央黑色补给区的六角片（2 枚一块）。卖货、银矿、银行能拿到。终局每枚 1 分。' },
  goods: { name: '货物', icon: 'goods', where: '方形板块，6 种颜色，每种印一个骰子点数。轮次格上、补给区的方格里、玩家版图左下角。', what: '船只能把它们拿回来，最多存 3 种，同色叠放。用骰子卖货时，点数是几就卖哪种。' },
  bonus: { name: '奖励板块', icon: 'bonus', where: '主版图上方，6 种颜色各 2 块：大的 5/6/7 分，小的 2/3/4 分。', what: '第一个把公国里某种颜色的格子全部铺满的人拿大块，第二个拿小块，之后没有。' },
  regtable: { name: '区域分表', icon: 'regtable', where: '主版图左边，阶段格旁边那列 1–8 的数字。', what: '铺满一块区域按格数得分：1、3、6、10、15、21、28、36 分（1–8 格）。' },
  castle: { name: '城堡', icon: 'castle', where: '暗红色六角片。老版本是深绿色。开局每人一座初始城堡，放在公国正中的 6 号格。', what: '放进公国时，立刻多做一个行动，点数任选。' },
  ship: { name: '船只', icon: 'ship', where: '蓝色六角片。', what: '放进公国时，拿任意一个补给区的全部货物（不用对应点数），然后回合顺位前进一格。' },
  mine: { name: '银矿', icon: 'mine', where: '灰色六角片。', what: '放下没有效果。每个阶段结束，每座银矿给 1 枚银币。' },
  livestock: { name: '牲畜', icon: 'livestock', where: '绿色六角片，印着 2–4 只牛、羊、猪或鸡。', what: '放下时，板块上有几只就得几分；同一牧场里已有的同种牲畜板块，按各自的只数再算一次。' },
  buildings: { name: '建筑', icon: 'buildings', where: '浅褐色六角片，一共 8 种。', what: '放进城镇时立刻发动一次效果。同一城镇每种只能有一座。' },
  monastery: { name: '修道院', icon: 'monastery', where: '黄色六角片，一共 26 种，各印着效果。', what: '大多改变规则（比如工人能改 2 点），少数在终局加分。具体看「板块速查」。' },
  market: { name: '市场', icon: 'market', where: '浅褐色建筑，有几个货摊。', what: '放下时，从 1–6 号补给区拿一块船只或牲畜，放进储存格。' },
  carpenter: { name: '木工坊', icon: 'carpenter', where: '浅褐色建筑，一座木屋。', what: '放下时，从 1–6 号补给区拿一块建筑，放进储存格。' },
  church: { name: '教堂', icon: 'church', where: '浅褐色建筑，金色屋顶的教堂。', what: '放下时，从 1–6 号补给区拿一块银矿、修道院或城堡，放进储存格。' },
  warehouse: { name: '仓库', icon: 'warehouse', where: '浅褐色建筑，挂着吊钩的高楼。', what: '放下时，不用骰子，立刻卖掉一种货物，和卖货行动一样结算。' },
  boarding: { name: '宿舍', icon: 'boarding', where: '浅褐色建筑，绿色屋顶。', what: '放下时，立刻拿 4 个工人。' },
  bank: { name: '银行', icon: 'bank', where: '浅褐色建筑，带两个尖塔。', what: '放下时，立刻拿 2 枚银币。' },
  townhall: { name: '市政厅', icon: 'townhall', where: '浅褐色建筑，红屋顶的大院。', what: '放下时，立刻再从储存格放一块六角片进公国，不看点数，颜色和相邻照常；那块的效果也照常发动。' },
  watchtower: { name: '瞭望塔', icon: 'watchtower', where: '浅褐色建筑，一座圆塔。', what: '放下时，立刻得 4 分。' }
};

// The script: what to read aloud. Every important element gets one sentence; how it is ruled exactly is for the assistant.
const PARTS = [
  { title: '怎么赢', sec: 25, lines: [
    '这局玩《勃艮第城堡》。我先讲一遍主流程，讲完再一条条过注意事项。',
    '我们是 15 世纪勃艮第的公爵，每人经营自己的{公国|duchy}：把六角片放进去，建城堡、开银矿、养牲畜、跑船、盖建筑和修道院。',
    '游戏分 A 到 E 五个{阶段|phase}，每个阶段 5 轮，一共 25 轮。打完{胜利点|vp}最多的人赢。',
    '分数主要来自：铺满公国里的{区域|region}、卖{货物|goods}、放{牲畜|livestock}，还有{奖励板块|bonus}和一些{修道院|monastery}。'
  ], ask: ['区域什么时候计分？', '终局怎么加分？'] },
  { title: '一轮怎么走', sec: 40, lines: [
    '每个阶段开始：清掉{主版图|board}上剩下的六角片，按人数把 6 个{补给区|depot}和{中央黑色补给区|black}重新补满；再把本阶段的 5 块货物翻开，放到{轮次格|round}上。',
    '每一轮，大家同时掷自己的 2 颗{骰子|dice}。{起始玩家|start}另外掷{白骰|white}，把轮次格上的一块货物放到白骰点数的补给区。白骰只管这件事。',
    '然后按{回合顺位|order}轮流，每人用 2 颗骰子做 2 个行动，顺序随意，也可以做同一种。',
    '轮次格上剩几块货物，这个阶段就还剩几轮。'
  ], ask: ['每个阶段开始要清掉哪些东西？', '3 人局每阶段补几块？', '白色骰子有什么用？'] },
  { title: '你的公国', sec: 35, lines: [
    '{公国版图|duchy}有 37 个六角格，每格有颜色和一个 1 到 6 的数字。相连的同色格子是一块{区域|region}。开局每人的{城堡|castle}放在正中间的 6 号格。',
    '{玩家版图|player}右下角有 3 个{储存格|storage}，也叫钥匙格：拿来的六角片都先放这里，满了要先丢一块。',
    '左下角能存 3 种{货物|goods}。另外还有{银币|silver}和{工人|worker}：开局每人 1 枚银币、3 块随机货物，工人按顺位给 1、2、3、4 个。'
  ], ask: ['起始工人每人几个？', '第一局用几号公国版图？', '货物板块怎么分？'] },
  { title: '四种行动', sec: 60, lines: [
    '**拿六角片**：骰子点数是几，就从几号{补给区|depot}拿一块，放进储存格。',
    '**放进公国**：从储存格拿一块，放到公国里数字等于骰子点数、颜色相同、挨着你已放六角片的空格。放下立刻发动它的效果。',
    '**卖货**：骰子点数是几就卖哪种{货物|goods}，整叠卖掉，拿 1 枚{银币|silver}，每块按人数得 2、3、4 分。',
    '**拿 2 个工人**：点数是几都行。',
    '{工人|worker}随时能用，每个让点数加 1 或减 1，1 和 6 可以互改。用工人不算行动。',
    '另外，每回合可以花 2 枚银币，从{中央黑色补给区|black}买 1 块放进储存格，不占行动。'
  ], ask: ['工人能把 6 改成 1 吗？', '放进公国有什么限制？', '卖货得几分？', '中央黑色补给区一回合能买几块？'] },
  { title: '六种六角片', sec: 55, lines: [
    '六角片背面的颜色决定它是哪一种，放进公国时各有效果：',
    '{城堡|castle}（暗红）：立刻多做一个行动，点数任选。',
    '{船只|ship}（蓝）：拿任意一个补给区的全部货物，回合顺位前进一格。',
    '{银矿|mine}（灰）：每个阶段结束给 1 枚银币。',
    '{牲畜|livestock}（绿）：板块上有几只就得几分；同一牧场里已有同种牲畜，那些板块再各算一次。',
    '{建筑|buildings}（浅褐）：8 种，放下立刻有效果，比如{仓库|warehouse}卖货、{宿舍|boarding}拿 4 个工人、{瞭望塔|watchtower}得 4 分。同一{城镇|town}每种只能有一座。',
    '{修道院|monastery}（黄）：26 种，大多改变规则，少数终局加分。碰到了点「板块速查」或问规则助手。'
  ], ask: ['船只能拿哪个补给区的货物？', '同一个城镇能放两座同样的建筑吗？', '牲畜要相邻才能一起计分吗？'] },
  { title: '计分和终局', sec: 40, lines: [
    '铺满一块{区域|region}，立刻得两笔分：按格数查{区域分表|regtable}，1 格 1 分，到 8 格 36 分；再加当前{阶段|phase}的奖励：A 10、B 8、C 6、D 4、E 2 分。越早铺满越值钱。',
    '第一个把公国里某种颜色的格子全部铺满的人，拿这种颜色的大{奖励板块|bonus}，第二个拿小的。',
    '每个阶段结束，每座{银矿|mine}给 1 枚银币。E 阶段打完就终局：剩下的货物每块 1 分，银币每枚 1 分，工人每 2 个 1 分，再算计分类修道院。',
    '{胜利点|vp}最多的人赢。流程就这些，接下来过一遍注意事项。'
  ], ask: ['奖励板块怎么拿？', '平局怎么判？'] }
];

// 注意事项: fine points outside the main flow that are easy to get wrong. Read them one by one after the script.
// Each has a written answer (from tools/faq.json, i.e. the rulebooks); what is not here goes to the rules assistant.
// [title, answer, question for the assistant]
const NOTES = [
  ['工人可以把 6 改成 1', '每个{工人|worker}让点数加 1 或减 1，1 和 6 可以互相改，一次可以用好几个。用工人不算行动，自己回合里随时能用。{白骰|white}不能用，也不能改。', '工人能把 6 改成 1 吗？'],
  ['两颗骰子可以做同一种行动', '可以，顺序也随你。比如一颗拿六角片，另一颗马上把它放进公国；或者两颗都拿六角片。', '两颗骰子可以做同一种行动吗？'],
  ['拿来的六角片一律先进储存格', '从补给区拿的、从中央黑色补给区买的、建筑效果拿到的，都先放进{储存格|storage}，再用一个“放进公国”的行动放下去。储存格只有 3 格，满了要先丢一块（放回盒子）。', '拿来的六角片能直接放进公国吗？'],
  ['放进公国要同时满足三条', '格子的数字等于骰子点数；颜色和六角片相同；挨着至少一块你已放的六角片（第一块挨着初始城堡）。放下后不能再移动。', '放进公国有什么限制？'],
  ['中央黑色补给区每回合只能买 1 块', '付 2 枚{银币|silver}，不用骰子，不占行动，自己回合里任何时候都能买，买到的也先进储存格。{市场|market}、{木工坊|carpenter}、{教堂|church}的效果不能从这里拿。', '中央黑色补给区一回合能买几块？'],
  ['卖货只拿 1 枚银币', '一次卖货不管卖几块，只拿 1 枚银币；分数按块算，2/3/4 人局每块 2/3/4 分。必须把这种货物整叠卖掉，不能留一部分。', '卖货得几分？'],
  ['船只拿哪里的货', '任选一个补给区，不用对应骰子点数，拿走那里的全部货物。最多存 3 种货物，放不下的种类留在原地。然后回合顺位前进一格，叠在那一格最上面；成了起始玩家就拿白骰。', '船只能拿哪个补给区的货物？'],
  ['同一城镇每种建筑只能一座', '{城镇|town}是公国里相连的浅褐色格子。同一城镇里同种建筑最多一座，不同城镇可以重复。有 1 号修道院才能打破这条。', '同一个城镇能放两座同样的建筑吗？'],
  ['牲畜不要求相邻', '只看同一个牧场（相连的绿色格子）：新放的牲畜按只数得分，牧场里已有的同种牲畜板块再各按只数算一次。不同牧场的不算在一起。', '牲畜要相邻才能一起计分吗？'],
  ['区域铺满立刻计分', '不用等阶段结束。分数是{区域分表|regtable}上的格数分，加当前阶段奖励（A 10 到 E 2）。初始城堡所在的格子哪怕自成 1 格区域，也不计分。', '区域什么时候计分？'],
  ['奖励板块要铺满一种颜色的所有格子', '不是完成一块区域就拿：要把公国里这种颜色的所有格子都铺满（比如全部银矿格）。第一个做到的拿大块，2/3/4 人局得 5/6/7 分；第二个拿小块，得 2/3/4 分；之后没有。', '奖励板块怎么拿？'],
  ['起始工人不是一样多', '起始玩家 1 个，按顺位往后依次 2、3、4 个。顺位靠后的人工人多，算是补偿。', '起始工人每人几个？'],
  ['阶段开始清什么、留什么', '主版图上剩下的六角片全部清回盒子，包括中央黑色补给区的（A 阶段不用清）。补给区里的货物不清，留着给后面的船只拿。', '每个阶段开始要清掉哪些东西？'],
  ['3 人局补货', '6 个补给区里标“4”的格子不补，共 18 格；中央黑色补给区补 6 块。6 号补给区那个标“3BD”的城堡格，A、C、E 阶段放城堡，B、D 阶段改放银矿。', '3 人局每阶段补几块？'],
  ['2 人局', '主版图翻到印着 2 人图标的那一面，面上印着的格子全部补满。卖货每块 2 分；奖励板块大的 5 分、小的 2 分。', '主版图用哪一面？'],
  ['分数过 100', '计分标记绕过 100 分时，把{100/200 分板块|vptile}100 面朝上放在面前，标记接着从头走；到 200 翻面。', '分数超过 100 分怎么记？'],
  ['终局加分，储存格不算', '剩下的货物每块 1 分，银币每枚 1 分，工人每 2 个 1 分，公国里的计分类修道院按板块计分。还在储存格里的六角片什么都不算。', '终局怎么加分？'],
  ['平局：典藏版和老版本正好相反', '简中特别典藏版（中英文规则书一致）：公国空格少的获胜，再平看终局回合顺位，靠后的获胜。2019 红盒和 2011 原版是空格多的获胜。按你手里的版本判。', '平局怎么判？'],
  ['用老版本玩的，几块修道院不一样', '6 号：典藏版是每回合一次付 2 个工人拿一块建筑；2019 版是买六角片可以用工人代替银币、从所有补给区买；2011 版是可以从所有 7 个补给区买。15 号在 2011 版每种货物 3 分（后两版 2 分），26 号在 2011 版每块奖励板块 2 分（后两版 3 分）。另外老版本的城堡是深绿色。', '三个版本修道院有什么不一样？']
];

// Icon guide, grouped the way things sit on the table.
const GROUPS = [
  ['主版图', ['board', 'depot', 'black', 'phase', 'round', 'regtable', 'bonus', 'order']],
  ['你面前', ['duchy', 'player', 'storage', 'dice', 'worker', 'silver', 'goods', 'vp', 'vptile']],
  ['六种六角片', ['castle', 'ship', 'mine', 'livestock', 'buildings', 'monastery']],
  ['八种建筑', ['market', 'carpenter', 'church', 'warehouse', 'boarding', 'bank', 'townhall', 'watchtower']]
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const term = (text, id) => `<button type="button" class="term" data-t="${id}">${ICON(TERMS[id].icon)}${esc(text)}</button>`;
const line = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\{([^|}]+)\|(\w+)\}/g, (_, t, id) => term(t, id));
// inside a button the terms show their icon but are not buttons themselves
const label = s => esc(s).replace(/\{([^|}]+)\|(\w+)\}/g, (_, t, id) => `<span class="tlab">${ICON(TERMS[id].icon)}${esc(t)}</span>`);
const askBtn = (text, q) => `<button type="button" class="tq" data-q="${esc(q)}">问 <span>${label(text)}</span></button>`;
const RULEBOOK = 'https://www.ravensburger.org/spielanleitungen/ecm/Spielanleitungen/CoB_Rulebook_285x210mm%20%5B28%20pages%5D.pdf';

document.getElementById('teach').innerHTML = `
  <p class="tlead">讲的人先照着念主流程（四分钟左右），再一条条过注意事项。<b>带下划线的词</b>点一下看图和解释；有疑问点「问」，规则助手马上回答。按简中特别典藏版讲，用 2019 红盒或 2011 原版的，看注意事项最后两条。</p>
  <nav class="tnav">${PARTS.map((p, i) => `<a href="#p${i + 1}"><i>${i + 1}</i>${p.title}</a>`).join('')}<a href="#later">注意事项</a><a href="#icons">图标速查</a></nav>
  ${PARTS.map((p, i) => `<section class="card tpart" id="p${i + 1}">
    <h2 class="h"><span><i>${i + 1}</i>${p.title}</span><small>约 ${p.sec} 秒</small></h2>
    ${p.lines.map(s => `<p class="tline">${line(s)}</p>`).join('')}
    <div class="tasks"><em>桌上常见疑问</em>${p.ask.map(q => askBtn(q, q)).join('')}</div>
  </section>`).join('')}
  <section class="card tpart" id="later">
    <h2 class="h"><span><i>✓</i>注意事项</span><small>${NOTES.length} 条</small></h2>
    <p class="tnote">流程讲完后，一条一条过一遍。都是规则书里写了、但最容易漏掉或吵起来的地方。点开就是答案。</p>
    <div class="tnotes">${NOTES.map(([t, a, q], i) => `<details class="tni"><summary><i>${i + 1}</i>${esc(t)}</summary><p>${line(a)}</p>${askBtn('还有疑问？问规则助手', q)}</details>`).join('')}</div>
    <p class="tnote">注意事项里没有的，点右下角「规则」问 AI，本站资料查不到会联网找。</p>
  </section>
  <a class="button primary big tgo" href="/">讲完了，去建房间</a>
  <h2 class="tih" id="icons">图标速查<small>点图标看解释</small></h2>
  ${GROUPS.map(([g, ids]) => `<div class="card tgrid"><h3>${g}</h3><div>${ids.map(id => `<button type="button" class="tic" data-t="${id}">${ICON(TERMS[id].icon)}<span>${TERMS[id].name}</span></button>`).join('')}</div></div>`).join('')}
  <footer class="tfoot">依据简中特别典藏版规则 · 图片截自特别典藏版官方英文规则书（<a href="${RULEBOOK}" target="_blank" rel="noopener">原文</a>），版权归 Ravensburger 与 Awaken Realms 所有 · 非官方玩家工具</footer>`;

// The note for a term: a sheet from the bottom with the picture, where it is and what it means.
const sheet = document.createElement('div');
sheet.className = 'tsheet hidden';
document.body.appendChild(sheet);
const close = () => sheet.classList.add('hidden');
function show(id) {
  const t = TERMS[id];
  sheet.innerHTML = `<div class="tsbg"></div><div class="tsbox" role="dialog" aria-label="${esc(t.name)}">
    <div class="tshd">${ICON(t.icon, 'big')}<b>${esc(t.name)}</b><button type="button" class="tsx" aria-label="关闭">×</button></div>
    <p><em>在哪儿看到</em>${esc(t.where)}</p><p><em>什么意思</em>${esc(t.what)}</p>
    <button type="button" class="primary wide tsask" data-q="${esc(`「${t.name}」是什么，怎么用？`)}">还不懂？问规则助手</button></div>`;
  sheet.classList.remove('hidden');
}
const ask = q => { close(); window.askRules?.(q); };
document.addEventListener('click', e => {
  const t = e.target.closest('[data-t]');
  if (t) return show(t.dataset.t);
  const q = e.target.closest('[data-q]');
  if (q) return ask(q.dataset.q);
  if (e.target.closest('.tsx,.tsbg')) close();
});
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
