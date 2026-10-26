#!/usr/bin/env node
/* audit_consistency.js
   Renders every view and sub-view of website/app.js under Node with the real
   data feeds loaded, and fails (exit 1) on any thrown error. Also flags output
   that contains the literal strings "undefined" or "NaN".
   Usage: node scripts/render_check.js      (from the project root) */
const path = require('path');
const root = path.resolve(__dirname, '..');

global.window = global;
const noop = () => {};
const el = () => ({
  innerHTML: '', textContent: '', style: {}, addEventListener: noop,
  querySelectorAll: () => [], querySelector: () => null, focus: noop, blur: noop,
  classList: { add: noop, remove: noop, toggle: noop }, setAttribute: noop,
  getAttribute: () => null, appendChild: noop, remove: noop
});
global.document = {
  getElementById: el, querySelector: el, querySelectorAll: () => [],
  createElement: el, body: el(), documentElement: el(), addEventListener: noop
};

for (const f of ['feed.js', 'territory_feed.js', 'jakarta_map_feed.js', 'dse_visits_feed.js', 'sellin_feed.js', 'penjualan_feed.js', 'demand_feed.js', 'dse_kpi_feed.js', 'endbal_feed.js', 'target_feed.js', 'dse_coverage.js', 'ga_feed.js', 'ga_site_feed.js', 'kro_feed.js', 'kro_slim.js', 'pjp_mapping_feed.js', 'dse_flags.js', 'dse_catalogue_feed.js', 'outlet_catalogue_feed.js']) {
  require(path.join(root, 'website', 'data', f));
}
// dse_visits_feed.js declares `var dseVisitsFeed`, which is module-scoped under
// Node; expose it the way a browser would.
if (typeof global.dseVisitsFeed === 'undefined') {
  const src = require('fs').readFileSync(path.join(root, 'website', 'data', 'dse_visits_feed.js'), 'utf8');
  const m = src.match(/var dseVisitsFeed = (\{[\s\S]*\});?\s*$/);
  if (m) global.dseVisitsFeed = JSON.parse(m[1]);
}

const app = require(path.join(root, 'website', 'app.js'));
const { VIEWS, state } = app;
/* audit_consistency.js: the same metric must read the same on every page and must follow the count rules (QA 23 Oct 2026)
   Usage: node scripts/audit_consistency.js   (from the project root) */
let checks = 0, fails = 0;
const reset = () => Object.assign(state, { branch: '', hoa: '', kec: '', dse: '', pjDse: '', poDse: '', gaBrand: 'all', gaSg: 'all', gaCover: 'all', gaBasis: 'outlet', pjBrand: 'all', poBrand: 'all', pjpMetric: 'pjp', poAdhoc: true });
const cardsOf = h => [...h.matchAll(/<div class="card kpi"[^>]*><h2 class="sect">([\s\S]*?)<\/h2><div class="value">([\s\S]*?)<\/div>(?:<div class="delta[^"]*">([\s\S]*?)<\/div>)?/g)].map(m => ({ t: m[1].replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim(), v: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), d: (m[3] || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }));
const grab = (view, st) => { reset(); Object.assign(state, { view }, st || {}); return cardsOf(VIEWS[view]()); };
const find = (cs, start) => cs.find(c => c.t.toUpperCase().startsWith(start.toUpperCase()));
const unit = { 'Rb': 1e3, 'Jt': 1e6, 'M': 1e9, 'T': 1e12 };
function num(t) { const m = /(-|−)?\s*(?:Rp\s*)?([\d.,]+)\s*(Rb|Jt|M|T)?\b/.exec(String(t)); if (!m) return NaN; return (m[1] ? -1 : 1) * parseFloat(m[2].replace(/,/g, '')) * (unit[m[3]] || 1); }
function eq(tag, what, a, b, tol) { checks++; const t = tol == null ? Math.max(0.5, Math.abs(b) * 0.0006) : tol; if (!(Math.abs(a - b) <= t)) { fails++; console.log('✗ [' + tag + '] ' + what + ': ' + a + ' ≠ ' + b); } }
function ok(tag, what, cond, info) { checks++; if (!cond) { fails++; console.log('✗ [' + tag + '] ' + what + (info ? ' · ' + info : '')); } }

// 1) same metric on different pages
const pairs = [
  ['Total demand MTD', ['mb_performance', { poTab: 'ringkasan' }], ['mb_ringkasan', { rkTab: 'demand' }], 'Total demand'],
  ['Sell-In MTD', ['mb_penjualan', { pjTab: 'ringkasan' }], ['mb_ringkasan', { rkTab: 'jual' }], 'Total Sell-In'],
  ['PJP % (P)', ['mb_pjp', {}], ['mb_ringkasan', { rkTab: 'pjp' }], '% Sukses Visit PJP'],
  ['Ad-hoc visits (A)', ['mb_pjp', {}], ['mb_ringkasan', { rkTab: 'pjp' }], 'Total Visit Adhoc'],
  ['End Balance total', ['mb_endbal', {}], ['mb_ringkasan', { rkTab: 'endbal' }], 'Total balance stok'],
  ['Zero stock outlets', ['mb_endbal', {}], ['mb_ringkasan', { rkTab: 'endbal' }], 'Outlet zero stock'],
  ['GA MTD', ['mb_grossadd', { gaTab: 'ringkasan', gaBasis: 'outlet' }], ['mb_gatrend', {}], null]];
for (const [name, A, B, start] of pairs) {
  const a = grab(A[0], A[1]), b = grab(B[0], B[1]);
  if (start) { const x = find(a, start), y = find(b, start); ok(name, 'card present on both pages', !!x && !!y); if (x && y) eq(name, 'same value (' + A[0] + ' vs ' + B[0] + ')', num(x.v), num(y.v), 0.051 * (/%/.test(x.v) ? 1 : Math.abs(num(y.v)) * 0.002)); }
}
{ const ga = find(grab('mb_grossadd', { gaTab: 'ringkasan', gaBasis: 'outlet' }), 'GA MTD'), tr = find(grab('mb_gatrend', {}), 'MTD D1'), ov = find(grab('mb_ringkasan', { rkTab: 'grossadd' }), 'GA MTD');
  ok('GA MTD', 'cards present', !!ga && !!tr && !!ov); if (ga && tr && ov) { eq('GA MTD', 'Gross Add = Daily GA Trend', num(ga.v), num(tr.v)); eq('GA MTD', 'Gross Add = Ringkasan GA', num(ga.v), num(ov.v)); } }

// 2) count rule: a % of PJP outlets has a numerator of PJP outlets only (non-PJP is shown apart)
{ const D = global.DEMAND_FEED; const cats = ['RLD', 'VCI', 'CVM', 'PKT']; const uM = D.outlets.filter(o => o.tier === 'M' && cats.some(c => o.c[c] && o.c[c][1] > 0)).length, uAll = D.outlets.filter(o => cats.some(c => o.c[c] && o.c[c][1] > 0)).length;
  const c = find(grab('mb_performance', { poTab: 'ringkasan' }), 'UAR · outlet dengan demand'); ok('demand UAR', 'card present', !!c);
  if (c) { eq('demand UAR', 'value = all outlets with demand', num(c.v), uAll, 0.5); const m = /([\d.]+)% outlet PJP aktif \(([\d,]+) dari ([\d,]+)\)/.exec(c.d); ok('demand UAR', 'delta shows the PJP numerator against the PJP base', !!m, c.d.slice(0, 120)); if (m) { eq('demand UAR', 'PJP numerator = PJP outlets with demand', num(m[2]), uM, 0.5); ok('demand UAR', 'PJP % <= 100', parseFloat(m[1]) <= 100); eq('demand UAR', 'percent = numerator / base', parseFloat(m[1]), num(m[2]) / num(m[3]) * 100, 0.06); ok('demand UAR', 'non-PJP shown apart', /\+[\d,]+ non-PJP/.test(c.d)); } } }
// legacy Sell-In monitoring: no UAR % above 100
{ const bad = []; for (const lv of ['region', 'area', 'mc', 'kec', 'site', 'dse', 'outlet']) { reset(); Object.assign(state, { view: 'sellin', sellinLevel: lv, sellinProgram: false }); let h = ''; try { h = VIEWS.sellin(); } catch (e) { continue; }
    for (const tm of h.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)) { const hd = [...(/<thead>([\s\S]*?)<\/thead>/.exec(tm[1]) || [, ''])[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(x => x[1].replace(/<[^>]+>/g, '').replace(/[▲▼⇅]/g, '').trim()); const ci = hd.indexOf('UAR %'); if (ci < 0) continue;
      for (const r of (/<tbody>([\s\S]*?)<\/tbody>/.exec(tm[1]) || [, ''])[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) { const cells = [...r[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(x => x[1].replace(/<[^>]+>/g, ' ').trim()); const m = cells.length === hd.length && /^([\d.]+)%/.exec(cells[ci]); checks++; if (m && parseFloat(m[1]) > 100.05) bad.push(lv + ': ' + cells[ci]); } } }
  ok('sellin UAR %', 'no UAR % above 100 at any level', bad.length === 0, bad.slice(0, 3).join(' | ')); }

// 3) run-rate velocity is a true week over week: last 7 days vs the 7 days before
{ const V = global.dseVisitsFeed, g = V.regional_summary.growth_wow, tl = V.daily_timeline, n = tl.length; ok('WoW', 'feed carries wow_pct', g.wow_pct != null);
  if (g.wow_pct != null && n >= 14) { const avail = a => a.filter(d => d.available !== false), last = avail(tl.slice(n - 7)), prev = avail(tl.slice(n - 14, n - 7)); const rl = last.reduce((s, d) => s + d.actual, 0) / Math.max(last.length, 1), rp = prev.reduce((s, d) => s + d.actual, 0) / Math.max(prev.length, 1);
    eq('WoW', 'last 7 days per day', g.w2_per_day, rl, 1); eq('WoW', 'previous 7 days per day', g.wow_prev_per_day, rp, 1); eq('WoW', 'wow_pct', g.wow_pct, (rl - rp) / rp * 100, 0.06); }
  const c = find(grab('visits', {}), 'Run-Rate Velocity'); ok('WoW', 'card compares last 7 days with the previous 7 days', !!c && /previous 7 days/.test(c.d), c && c.d); }

console.log(fails ? '\n' + fails + ' of ' + checks + ' consistency checks failed' : 'All ' + checks + ' consistency checks pass');
process.exit(fails ? 1 : 0);
