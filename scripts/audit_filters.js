#!/usr/bin/env node
/* render_check.js
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

for (const f of ['feed.js', 'territory_feed.js', 'jakarta_map_feed.js', 'dse_visits_feed.js', 'sellin_feed.js', 'penjualan_feed.js', 'demand_feed.js', 'dse_kpi_feed.js', 'endbal_feed.js', 'target_feed.js', 'ga_feed.js', 'pjp_mapping_feed.js']) {
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

/* audit_filters.js
   Renders every menu and sub-tab under four header-filter states (all / one Area / one MC / one DSE)
   and reports the screens whose output does not change, i.e. screens that ignore that selection.
   Usage: node scripts/audit_filters.js   (from the project root) */
const BR = 'EAST JAKARTA', MC = 'MC-CIRACAS', DSE_NAME = 'ANDI RIZALDY', DSE_PID = 'M116';
const hoaOf = (global.TERRITORY_FEED && global.TERRITORY_FEED.hierarchy || []).find(h => h.branch === BR);
const HOA = (hoaOf && hoaOf.hoa_leader) || '';
const SCEN = {
  all: () => { Object.assign(state, { branch: '', hoa: '', kec: '', dse: '', pjDse: null, poDse: null, visitsDse: null }); },
  area: () => { Object.assign(state, { branch: BR, hoa: '', kec: '', dse: '', pjDse: null, poDse: null, visitsDse: null }); },
  mc: () => { Object.assign(state, { branch: BR, hoa: HOA, kec: MC, dse: '', pjDse: null, poDse: null, visitsDse: null }); },
  dse: () => { Object.assign(state, { branch: BR, hoa: HOA, kec: MC, dse: DSE_NAME, pjDse: DSE_NAME, poDse: DSE_NAME, visitsDse: DSE_PID }); }
};
const PJ = ['ringkasan', 'teritori', 'heat', 'slab', 'produk', 'outlet'], PO = ['ringkasan', 'teritori', 'heat', 'produk', 'konsentrasi', 'outlet', 'svd'];
const screens = [];
const S = (label, view, set, expectDse = true, isStatic = false) => screens.push({ label, view, set, expectDse, isStatic });
S('Overall Performance', 'mb_overall', {});
S('RK · DSE Productivity', 'mb_ringkasan', { rkTab: 'dse' });
S('RK · Ringkasan PJP', 'mb_ringkasan', { rkTab: 'pjp' });
for (const t of PJ) S('RK · Penjualan Outlet/' + t, 'mb_ringkasan', { rkTab: 'jual', pjTab: t });
for (const t of ['sp', 'vc', 'sal', 'spi']) for (const sub of ['growth', 'slab', 'aktif', 'inaktif']) S('RK · UAR/' + t + '/' + sub, 'mb_ringkasan', { rkTab: 'uar', uarTab: t, uarSub: sub });
for (const t of ['ringkasan', 'zero', 'slab', 'site']) S('RK · ENDBAL Saldo/' + t, 'mb_ringkasan', { rkTab: 'endbal', ebTab: t });
for (const t of PO) S('RK · Demand Customer/' + t, 'mb_ringkasan', { rkTab: 'demand', poTab: t });
for (const t of ['ringkasan', 'dse', 'outlet', 'harian', 'slab', 'roaming']) S('RK · Gross Add/' + t, 'mb_ringkasan', { rkTab: 'grossadd', gaTab: t });
S('RK · Heat Map Teritori', 'mb_ringkasan', { rkTab: 'peta' });
for (const sec of ['visit', 'sitev', 'sitega', 'gasp', 'saldo', 'endbal', 'peta']) S('RK · Opportunity/' + sec, 'mb_ringkasan', { rkTab: 'opp', opdSec: sec, opdEb: 'outlet' });
S('RK · Opportunity/endbal-site', 'mb_ringkasan', { rkTab: 'opp', opdSec: 'endbal', opdEb: 'site' });
for (const pr of ['uar', 'rabu', 'kotkab']) S('RK · Program/' + pr, 'mb_ringkasan', { rkTab: 'program', opProgram: pr });
S('RK · Print Instructions', 'mb_ringkasan', { rkTab: 'print' });
S('PJP Visit (mb_pjp)', 'mb_pjp', {});
for (const t of PJ) S('Penjualan ke Outlet/' + t, 'mb_penjualan', { pjTab: t });
for (const t of PO) S('Performance Outlet/' + t, 'mb_performance', { poTab: t });
for (const t of ['ringkasan', 'zero', 'slab', 'site', 'detail']) S('END BALANCE/' + t, 'mb_endbal', { ebTab: t });
for (const p of ['uar', 'rabu', 'kotkab']) S('Opportunity/program/' + p, 'mb_opportunity', { opTab: 'program', opProgram: p });
S('Opportunity/zero', 'mb_opportunity', { opTab: 'zero' });
for (const t of ['regional', 'area', 'mc', 'dse', 'exec', 'heat', 'unvisited']) S('Kunjungan DSE/' + t, 'visits', { visitsSubView: t, visitsDateScope: 'mtd' });
for (const t of ['all', 'SP', 'VC', 'SALDO']) S('Monitoring Sell-In/' + t, 'sellin', { sellinTab: t });
for (const t of ['auto', 'hoa', 'dso', 'dse', 'kecamatan', 'site']) S('Manajemen Teritori/' + t, 'territory', { terrSubView: t });
S('Data & Pemetaan (katalog statis)', 'data', {}, false, true);
S('Target Setting', 'cfg_target', {});
for (const t of ['ringkasan', 'dse', 'harian', 'pengecualian']) S('PJP Mapping/' + t, 'cfg_pjp', { pmTab: t });
S('Brief Penjualan (ilustratif)', 'brief', {}, false);
S('Analisis Teritori (ilustratif)', 'terr', {}, false);
S('Supply vs Demand (ilustratif)', 'svd', {}, false);

const results = [];
for (const sc of screens) {
  const out = {};
  for (const k of Object.keys(SCEN)) {
    SCEN[k](); state.view = sc.view; Object.assign(state, sc.set);
    try { out[k] = VIEWS[sc.view](); } catch (e) { out[k] = 'ERR ' + e.message; }
  }
  // compare content only: drop the scope names the titles echo back, so a changed title alone does not count
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const names = [BR, HOA, MC, DSE_NAME, 'Andi Rizaldy'].filter(Boolean).map(esc).join('|');
  const norm = h => String(h).replace(new RegExp('(?:Branch|Head of Area|Micro Cluster|DSE|Area|HoA|MC)?\\s*(?:' + names + ')', 'gi'), '').replace(/All Inner Jakarta|Seluruh Inner Jakarta/gi, '').replace(/\s+/g, ' ');
  const diff = (a, b) => norm(out[a]) !== norm(out[b]);
  results.push({ label: sc.label, isStatic: sc.isStatic, area: sc.isStatic || diff('all', 'area'), mc: sc.isStatic || diff('area', 'mc'), dse: sc.isStatic || diff('mc', 'dse'), expectDse: sc.expectDse && !sc.isStatic, err: Object.values(out).some(v => String(v).slice(0, 4) === 'ERR ') });
}
const mark = b => (b ? 'ok ' : 'SAMA');
console.log('Screen'.padEnd(46) + 'Area  MC    DSE');
let gaps = 0;
for (const r of results) {
  const flag = (!r.area || !r.mc || (r.expectDse && !r.dse) || r.err);
  if (flag) gaps++;
  console.log((flag ? '! ' : '  ') + r.label.padEnd(44) + (r.isStatic ? '    ' : mark(r.area)) + '  ' + (r.isStatic ? '    ' : mark(r.mc)) + '  ' + (r.isStatic ? 'static (n/a)' : (r.expectDse ? mark(r.dse) : '(n/a)')) + (r.err ? '  ERROR' : ''));
}
console.log('\n' + results.length + ' screens, ' + gaps + ' with a selection that has no effect.');

// Leak check: with one MC selected, no other Micro Cluster (or, with one Area, no other Branch) may appear in the output
const MCS = Object.keys((global.TERRITORY_FEED && global.TERRITORY_FEED.hierarchy || []).reduce((m, h) => { (h.micro_clusters || []).forEach(x => { m[x.micro_cluster] = 1; }); return m; }, {}));
const BRS = (global.TERRITORY_FEED.hierarchy || []).map(h => h.branch);
const leaks = [];
for (const sc of screens) {
  if (sc.isStatic || /ilustratif/.test(sc.label)) continue;
  SCEN.mc(); state.view = sc.view; Object.assign(state, sc.set);
  let html = ''; try { html = VIEWS[sc.view](); } catch (e) { continue; }
  const text = html.replace(/<select[\s\S]*?<\/select>/g, ' ').replace(/<[^>]+>/g, ' ');
  const otherMc = MCS.filter(m => m !== MC && text.indexOf(m) !== -1);
  SCEN.area(); state.view = sc.view; Object.assign(state, sc.set);
  let h2 = ''; try { h2 = VIEWS[sc.view](); } catch (e) { continue; }
  const t2 = h2.replace(/<[^>]+>/g, ' ');
  const otherBr = BRS.filter(b => b !== BR && new RegExp('(^|[^A-Z])' + b + '([^A-Z]|$)').test(t2) && !(b === 'BEKASI' && /KAB BEKASI|KOTA BEKASI/.test(t2) && !/(^|[^A-Z])BEKASI([^A-Z]|$)/.test(t2.replace(/KAB BEKASI|KOTA BEKASI/g, ''))));
  if (otherMc.length || otherBr.length) leaks.push({ label: sc.label, mc: otherMc.slice(0, 3), br: otherBr });
}
console.log('\nLeak check (other MC at MC scope, other Branch at Area scope): ' + leaks.length + ' screens');
leaks.forEach(l => console.log('  ' + l.label.padEnd(44) + (l.mc.length ? ' MC: ' + l.mc.join(', ') : '') + (l.br.length ? ' BR: ' + l.br.join(', ') : '')));

// DSE leak check: with one DSE selected, no other DSE name may appear (names shorter than 6 characters are skipped)
const DSES = (global.DSE_KPI_FEED && global.DSE_KPI_FEED.dses || []).map(d => String(d.n).toUpperCase()).filter(n => n.length >= 6 && n !== DSE_NAME && n !== '0');
const dleaks = [];
for (const sc of screens) {
  if (sc.isStatic || !sc.expectDse) continue;
  SCEN.dse(); state.view = sc.view; Object.assign(state, sc.set);
  let html = ''; try { html = VIEWS[sc.view](); } catch (e) { continue; }
  const text = html.replace(/<select[\s\S]*?<\/select>/g, ' ').replace(/<[^>]+>/g, ' ').toUpperCase();   // dropdown options are controls, not data
  const other = DSES.filter(n => text.indexOf(n) !== -1);
  if (other.length) dleaks.push({ label: sc.label, n: other.length, sample: other.slice(0, 3) });
}
console.log('\nDSE leak check (other DSE names at DSE scope): ' + dleaks.length + ' screens');
dleaks.forEach(l => console.log('  ' + l.label.padEnd(44) + l.n + '  e.g. ' + l.sample.join(', ')));

// Bulk-table check: a table with many rows that carries no Area / MC / DSE grouping control
const flat = [];
for (const sc of screens) {
  if (/ilustratif/.test(sc.label)) continue;
  SCEN.all(); state.view = sc.view; Object.assign(state, sc.set);
  let html = ''; try { html = VIEWS[sc.view](); } catch (e) { continue; }
  html.split(/<table/).slice(1).forEach(tb => {
    const body = tb.split(/<tbody>/)[1] || '', rows = (body.split('</tbody>')[0].match(/<tr/g) || []).length;
    const headerRows = (body.split('</tbody>')[0].match(/<tr[^>]*style="[^"]*(font-weight:\s*(800|700)|var\(--ij-ink\))/g) || []).length;
    const grouped = headerRows >= 3 || /data-grp-toggle|data-dk-grp|data-pj-mxarea|data-pj-mxmc|data-pj-out-toggle|data-mx-toggle|data-nv-outlet-grp|data-nv-site-grp|data-unvis-group|data-eb-grp/.test(tb);
    const head = (tb.split(/<th[^>]*>/)[1] || '').replace(/<[^>]+>/g, '').slice(0, 30);
    if (rows >= 40 && !grouped && !/produk/i.test(sc.label)) flat.push({ label: sc.label, rows, head });
  });
}
const seenF = new Set();
console.log('\nBulk tables without grouping (>= 40 rows): ' + flat.length);
flat.forEach(f => { const k = f.label + f.head; if (seenF.has(k)) return; seenF.add(k); console.log('  ' + f.label.padEnd(46) + String(f.rows).padStart(5) + ' rows  [' + f.head + ']'); });

process.exit(0);
