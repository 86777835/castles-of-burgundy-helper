// Shared Playwright helpers. Complete games only ever run against a local wrangler dev.
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
export const BASE = process.argv[2] || 'http://localhost:8951/';
export const OUT = process.argv[3] || '/tmp/claude-501/burgundy_shots';
assert(['localhost', '127.0.0.1'].includes(new URL(BASE).hostname), 'Only run complete games locally');
export async function browser() { await mkdir(OUT, {recursive: true}); return chromium.launch({channel: 'chrome'}); }
// A phone context. Reviews to the live hub are always intercepted: no test data goes online.
export async function phone(b) {
  const c = await b.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  await c.route('https://boardgame.leisurecat.cloud/**', r => r.fulfill({json: {ok: true}}));
  return c;
}
export const idle = p => p.waitForFunction(() => !document.querySelector('.conn')?.textContent.includes('保存中'));
export async function act(p, a, extra = '') { await p.locator(`[data-act="${a}"]${extra}`).first().click(); await p.waitForTimeout(150); await idle(p); }
export async function pick(p, key, val) { await p.click(`[data-act="config"][data-key="${key}"][data-val="${val}"]`); await p.waitForSelector(`[data-key="${key}"][data-val="${val}"][aria-pressed="true"]`); }
export async function mod(p, k) { await p.click(`[data-act="mod"][data-val="${k}"]`); await p.waitForSelector(`[data-act="mod"][data-val="${k}"][aria-pressed="true"]`); }
export async function room(p) { await p.goto(BASE); await act(p, 'create'); await p.waitForSelector('[data-act="begin"]:not(:disabled)'); return new URL(p.url()).searchParams.get('r'); }
export async function shot(p, name) { await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({path: `${OUT}/cob_${name}.png`, fullPage: true}); }
export async function choose(p, id) { await p.click(`[data-act="mine"][data-id="${id}"]`); await p.waitForSelector(`#score-form[data-k="score-${id}"]`); }
// Fill a unit's score form and confirm it.
export async function score(p, id, vals) {
  await choose(p, id);
  for (const [k, v] of Object.entries(vals)) await p.fill(`#score-form [name="${k}"]`, String(v));
  await p.click('#score-form [value="confirm"]');
  await p.waitForSelector(`[data-act="mine"][data-id="${id}"]:has-text("✓")`);
  await idle(p);
}
export async function toScore(p) { for (let i = 0; i < 5; i++) { await act(p, 'next'); } await p.waitForSelector('#score-form'); }
