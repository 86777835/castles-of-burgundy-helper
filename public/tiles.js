// Tile reference page: filter by edition, kind and number/keyword.
import {TILES, KINDS} from './tiles-data.js';
import {esc} from './dom.js';
const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search), r = params.get('r');
if (/^[A-Z0-9]{4}$/.test(r || '')) $('.back-nav').href = '/?r=' + r;
const BOOK = {se: '典藏版', r19: '2019 版', r11: '2011 版'};
const COLOR = {mon: 'var(--mon)', bld: 'var(--town)', ext: 'var(--black)', shield: 'var(--castle)'};
const f = {ed: ['se', 'r19', 'r11'].includes(params.get('ed')) ? params.get('ed') : 'se', kind: ''};
function render() {
  for (const b of document.querySelectorAll('#ed button')) b.setAttribute('aria-pressed', b.dataset.ed === f.ed);
  for (const b of document.querySelectorAll('#kind button')) b.setAttribute('aria-pressed', b.dataset.kind === f.kind);
  const q = $('#q').value.trim().replace(/号$/, '');
  const rows = TILES.filter(t => t.eds.includes(f.ed) && (!f.kind || t.kind === f.kind)).filter(t => {
    if (!q) return true;
    if (/^\d+$/.test(q)) { const [lo, hi] = t.no.split('–').map(Number); return hi ? Number(q) >= lo && Number(q) <= hi : t.no === q; }
    return (t.no + (t.text || '') + (t.diff?.[f.ed] || '')).includes(q);
  });
  $('#count').textContent = `${BOOK[f.ed]}：${rows.length} 种`;
  $('#list').innerHTML = rows.map(t => {
    const short = /^[\d–]+$/.test(t.no);
    return `<article class="tile-row"><h3><span class="badge ${short && t.no.length <= 2 ? '' : 'wide'}" style="--h:${COLOR[t.kind]}">${esc(short ? t.no : KINDS[t.kind])}</span>${esc(short ? KINDS[t.kind] + ' ' + t.no + ' 号' : t.no)}${t.end ? '<span class="chip">终局计分</span>' : ''}</h3>
     ${t.text ? `<p>${esc(t.text)}</p>` : ''}${t.diff?.[f.ed] ? `<p class="diff"><b>${BOOK[f.ed]}：</b>${esc(t.diff[f.ed])}</p>` : ''}
     <p class="src">${BOOK[f.ed]}规则书 ${esc(t.src[f.ed])}</p></article>`;
  }).join('') || '<p class="empty">没有找到。修道院编号是 1–29，盾徽是 1–18。</p>';
}
$('#ed').onclick = e => { const b = e.target.closest('button'); if (b) { f.ed = b.dataset.ed; render(); } };
$('#kind').onclick = e => { const b = e.target.closest('button'); if (b) { f.kind = b.dataset.kind; render(); } };
$('#q').addEventListener('input', render);
render();
