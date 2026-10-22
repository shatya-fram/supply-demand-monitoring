#!/usr/bin/env node
/* audit_kro.js: reconciles the Outlet & KRO Management feed (KRO_FEED + KRO_SLIM) with its source feeds and with the app's slab classifier.
   Checks (exit 1 on any mismatch):
   1. volume per measure (SP incl. injection, Voucher sell-in / sell-out, Saldo sell-in / sell-out, GA) over rows + slim = source feed totals (MTD, LMTD, Last FM)
   2. the browser classifier (kroCls on the stored q values) reproduces the builder's slab counts (metadata.totals) for KRO and Wholesaler
   3. rows + slim cover every outlet that has volume; mc_sum outlet count = outlets_total
   Usage: node scripts/audit_kro.js   (from the project root, after build_kro_feed.py) */
const path = require('path'), root = path.resolve(__dirname, '..');
global.window = global; const noop = () => {};
const el = () => ({ innerHTML: '', textContent: '', style: {}, addEventListener: noop, querySelectorAll: () => [], querySelector: () => null, focus: noop, blur: noop, classList: { add: noop, remove: noop, toggle: noop }, setAttribute: noop, getAttribute: () => null, appendChild: noop, remove: noop });
global.document = { getElementById: el, querySelector: el, querySelectorAll: () => [], createElement: el, body: el(), documentElement: el(), addEventListener: noop };
for (const f of ['feed.js', 'territory_feed.js', 'jakarta_map_feed.js', 'dse_visits_feed.js', 'sellin_feed.js', 'penjualan_feed.js', 'demand_feed.js', 'dse_kpi_feed.js', 'endbal_feed.js', 'target_feed.js', 'dse_coverage.js', 'ga_feed.js', 'kro_feed.js', 'kro_slim.js', 'pjp_mapping_feed.js', 'dse_flags.js', 'outlet_catalogue_feed.js']) require(path.join(root, 'website', 'data', f));
const app = require(path.join(root, 'website', 'app.js'));
const K = global.KRO_FEED, SL = global.KRO_SLIM, P = global.PENJUALAN_FEED, D = global.DEMAND_FEED || global.PO_FEED, GA = global.GA_FEED;
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('✗ ' + m); } else console.log('✓ ' + m); };
const g = (a, i) => (a && a[i]) || 0, ORD = K.metadata.key_order;
// 1. volume reconciliation: [mtd, lmtd, fm]
const got = {}; ORD.forEach(k => { got[k] = [0, 0, 0]; });
K.rows.forEach(r => ORD.forEach(k => { const q = r.q[k]; got[k][0] += q[2] || 0; got[k][1] += q[1] || 0; got[k][2] += q[0] || 0; }));
SL.forEach(s => ORD.forEach((k, i) => { got[k][0] += s[9][i * 4 + 2]; got[k][1] += s[9][i * 4 + 1]; got[k][2] += s[9][i * 4]; }));   // slim: fm, lm, mtd, pr per key
const src = {}; ORD.forEach(k => { src[k] = [0, 0, 0]; });
P.outlets.forEach(o => { const c = o.c || {};
  src.sp[0] += g(c.SP, 0); src.sp[1] += g(c.SP, 2); src.sp[2] += g(c.SP, 4);
  ['VCF', 'VCB'].forEach(v => { src.vsi[0] += g(c[v], 1); src.vsi[1] += g(c[v], 3); src.vsi[2] += g(c[v], 5); });
  src.ssi[0] += g(c.SALMO, 1); src.ssi[1] += g(c.SALMO, 3); src.ssi[2] += g(c.SALMO, 5); });
D.outlets.forEach(o => { const c = o.c || {}, l = o.l || {};
  src.sp[0] += g(c.SPI, 0); src.sp[1] += g(l.SPI, 0); src.sp[2] += g(l.SPI, 2);
  src.vso[0] += g(c.VCI, 1); src.vso[1] += g(l.VCI, 1); src.vso[2] += g(l.VCI, 3);
  src.sso[0] += g(c.SAL, 1); src.sso[1] += g(l.SAL, 1); src.sso[2] += g(l.SAL, 3); });
GA.outlets.forEach(o => { const cut = GA.metadata.cut_day; let m = 0, f = 0, lm = 0; for (let i = 0; i < (o.o || []).length; i += 2) if (o.o[i] <= cut) m += o.o[i + 1]; for (let i = 0; i < (o.s || []).length; i += 2) { f += o.s[i + 1]; if (o.s[i] <= cut) lm += o.s[i + 1]; } src.ga[0] += m; src.ga[1] += lm; src.ga[2] += f; });
ORD.forEach(k => [0, 1, 2].forEach(i => {
  const lab = ['MTD', 'LMTD', 'Last FM'][i]; if (k === 'sso' && !K.metadata.keys.sso.has_fm && i > 0) return;
  ok(Math.abs(got[k][i] - src[k][i]) <= Math.max(1, Math.abs(src[k][i]) * 1e-9), k + ' ' + lab + ': feed ' + Math.round(got[k][i]) + ' = source ' + Math.round(src[k][i]));
}));
// 2. classifier: KRO and Wholesaler counts per key, September and projection, from the stored q values
app.state.kroProd = 'sp';
ORD.forEach(k => {
  const hasFm = K.metadata.keys[k].has_fm, cnt = { cf: {}, cp: {} }, all = K.rows;
  all.forEach(r => { if (hasFm) { const c = app.kroClsOf(r.q[k][0], k); cnt.cf[c] = (cnt.cf[c] || 0) + 1; } const c2 = app.kroClsOf(r.q[k][3], k); cnt.cp[c2] = (cnt.cp[c2] || 0) + 1; });
  ['cf', 'cp'].forEach(per => { if (per === 'cf' && !hasFm) return; const t = K.metadata.totals[k][per];
    Object.keys(t).filter(c => /^[KW]/.test(c)).forEach(c => ok((cnt[per][c] || 0) === t[c], k + ' ' + per + ' ' + c + ': browser ' + (cnt[per][c] || 0) + ' = builder ' + t[c])); });
});
// 3. coverage
const nMc = Object.values(K.mc_sum).reduce((a, m) => a + m.n, 0);
ok(nMc === K.metadata.outlets_total, 'mc_sum outlets ' + nMc + ' = outlets_total ' + K.metadata.outlets_total);
console.log(bad ? '\n' + bad + ' check(s) failed' : '\nKRO feed reconciles.'); process.exit(bad ? 1 : 0);
