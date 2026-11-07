// Finished games from the Archive, filtered by edition, player count and name/room/board.
import {esc} from './dom.js';
import {ED_SHORT, summary} from './steps.js';
const $ = s => document.querySelector(s), r = new URLSearchParams(location.search).get('r');
if (/^[A-Z0-9]{4}$/.test(r || '')) $('.back-nav').href = '/?r=' + r;
let seq = 0;
async function load() {
  const my = ++seq;
  try {
    const q = new URLSearchParams();
    for (const k of ['ed', 'n', 'q']) if ($('#' + k).value) q.set(k, $('#' + k).value);
    const res = await fetch('/api/games?' + q);
    if (!res.ok) throw Error('存档没读到，请点“筛选”重试');
    const rows = await res.json();
    if (my !== seq) return;
    // Averages only within the same edition and player count (scores are not comparable across them).
    const groups = new Map();
    for (const g of rows) if (g.mode !== 'solo') {
      const k = `${ED_SHORT[g.config.ed]}，${g.config.team ? '4 人团队' : g.config.n + ' 人'}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(...g.results.filter(x => !x.bot).map(x => x.total));
    }
    $('#stats').innerHTML = [...groups].map(([k, v]) => `<p class="hint">${esc(k)}：平均 ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)} 分，最高 ${Math.max(...v)} 分，${v.length} 人次</p>`).join('');
    $('#records').innerHTML = rows.length ? rows.map(g => `<article class="history-row"><h3>${esc(g.code)}，${new Date(g.ended).toLocaleDateString('zh-CN')}</h3><p class="note">${esc(summary(g.config))}</p>
      ${g.mode === 'solo' ? `<p>${esc(g.results[0].name)}：${g.results[0].score.filled ? '挑战成功' : '挑战未成功'}（起始目标分 ${g.results[0].score.target}）</p>` : g.results.map(x => `<p>${x.place}. ${esc(x.name)} ${x.total} 分${x.boards ? `<small>版图 ${esc(x.boards)}</small>` : ''}</p>`).join('')}
      <a class="button" href="/?r=${esc(g.code)}">打开原房间</a></article>`).join('') : '<p class="empty">还没有对局记录。结算后会自动存到这里。</p>';
  } catch (e) { $('#records').textContent = e.message; }
}
$('#go').onclick = load;
load();
