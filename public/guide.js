// Tutorial page: renders guide.md (copied from tools/讲解稿.md) and faq.json, with a keyword search.
import {esc} from './dom.js';
const $ = s => document.querySelector(s);
const r = new URLSearchParams(location.search).get('r');
if (/^[A-Z0-9]{4}$/.test(r || '')) $('.back-nav').href = '/?r=' + r;
// Player nicknames → words used on this site.
const ALIAS = [['知识', '修道院'], ['黑市', '黑色补给区'], ['额外得分片', '奖励板块'], ['银块', '银币'], ['盾牌', '盾徽'], ['客栈', '旅店'], ['动物', '牲畜'], ['矿', '银矿'], ['领地', '公国'], ['机器人', '自动机']];

function lessons(md) {
  const out = [];
  for (const block of md.split(/\n## /).slice(1)) {
    const [head, ...lines] = block.split('\n'), m = head.match(/^(.*?)\s*\{#(\w+)\}$/);
    const items = lines.filter(l => l.startsWith('- ')).map(l => `<li>${esc(l.slice(2))}</li>`).join('');
    const src = lines.find(l => l.startsWith('> '));
    out.push({id: m[2], title: m[1], html: `<section class="card lesson" id="${m[2]}"><h2>${esc(m[1])}</h2><ul>${items}</ul>${src ? `<p class="src">${esc(src.slice(2))}</p>` : ''}</section>`});
  }
  return out;
}
async function load() {
  try {
    const [md, faq] = await Promise.all([fetch('/guide.md').then(x => { if (!x.ok) throw Error(); return x.text(); }), fetch('/faq.json').then(x => { if (!x.ok) throw Error(); return x.json(); })]);
    const ls = lessons(md);
    $('#toc').innerHTML = ls.map(l => `<a href="#${l.id}">${esc(l.title)}</a>`).join('') + '<a href="#faq">常见问题</a>';
    $('#lessons').innerHTML = ls.map(l => l.html).join('');
    $('#faq-list').innerHTML = faq.map(f => `<details class="faq-item" data-k="${esc(f.k)}"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p><p class="src">${esc(f.src)}</p></details>`).join('');
    apply();
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch { $('#lessons').innerHTML = '<p class="empty">教程没读到，请检查网络后刷新。</p>'; }
}
function apply() {
  let q = $('#search').value.trim().toLowerCase();
  for (const [a, b] of ALIAS) if (q.includes(a)) q = q.replace(a, b);
  let n = 0;
  for (const el of document.querySelectorAll('.faq-item')) { const hit = !q || (el.textContent + el.dataset.k).toLowerCase().includes(q); el.hidden = !hit; if (hit) n++; }
  $('#faq-count').textContent = `${n} 条`;
  $('#no-faq').hidden = !!n;
}
$('#search').addEventListener('input', apply);
load();
