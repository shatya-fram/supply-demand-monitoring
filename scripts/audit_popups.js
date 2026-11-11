#!/usr/bin/env node
/* audit_popups.js: every popup (data-ov entry) must carry MTD, LMTD and FM columns for comparison (owner, 11 Nov 2026).
   Renders each view, resolves all data-ov keys and lists popups whose columns lack MTD, LMTD or FM.
   Usage: node scripts/audit_popups.js [--all]   (exit 1 when a popup that must have the three periods does not) */
const path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global;
const noop = () => {};
const el = () => ({ innerHTML: '', textContent: '', style: {}, addEventListener: noop, querySelectorAll: () => [], querySelector: () => null, focus: noop, blur: noop, classList: { add: noop, remove: noop, toggle: noop }, setAttribute: noop, getAttribute: () => null, appendChild: noop, remove: noop });
global.document = { getElementById: el, querySelector: el, querySelectorAll: () => [], createElement: el, body: el(), documentElement: el(), addEventListener: noop };
for (const f of ['period_history.js', 'feed.js', 'territory_feed.js', 'jakarta_map_feed.js', 'dse_visits_feed.js', 'sellin_feed.js', 'penjualan_feed.js', 'demand_feed.js', 'dse_kpi_feed.js', 'endbal_feed.js', 'stock_feed.js', 'target_feed.js', 'dse_coverage.js', 'ga_feed.js', 'ga_site_feed.js', 'kro_feed.js', 'kro_slim.js', 'program_daily_feed.js', 'program_target_feed.js', 'pjp_mapping_feed.js', 'dse_flags.js', 'dse_catalogue_feed.js', 'outlet_catalogue_feed.js', 'vanguard_feed.js', 'dsf_feed.js']) {
  require(require('./feed_dir')(root, f));
}
// dse_visits_feed.js declares `var dseVisitsFeed`, which is module-scoped under
// Node; expose it the way a browser would.
if (typeof global.dseVisitsFeed === 'undefined') {
  const src = require('fs').readFileSync(require('./feed_dir')(root, 'dse_visits_feed.js'), 'utf8');
  const m = src.match(/var dseVisitsFeed = (\{[\s\S]*\});?\s*$/);
  if (m) global.dseVisitsFeed = JSON.parse(m[1]);
}

require(path.join(root, 'website', 'stock.js'));
require(path.join(root, 'website', 'dsf_monitor.js'));
require(path.join(root, 'website', 'vanguard.js'));
require(path.join(root, 'website', 'outlet_profile.js'));
require(path.join(root, 'website', 'period_review.js'));
const app = require(path.join(root, 'website', 'app.js'));
const { VIEWS, state } = app;

const PJP_KEYS = new Set(['pjp_mtd', 'pjp_mtd_a', 'pjp_mtd_t', 'pjp_d1', 'dse100', 'ec_mtd', 'ec_d1', 'ec80', 'h_vis']);
const states = [{}, { pjBrand: 'IM3' }];
const seen = new Map();   // key -> entry info
let rendered = 0;
for (const v of Object.keys(VIEWS)) {
  for (const st of states) {
    Object.assign(state, st);
    let html = '';
    try { state.view = v; html = String(VIEWS[v]() || ''); rendered++; } catch (e) { continue; }
    for (const m of html.matchAll(/data-ov="([^"]+)"/g)) {
      const k = m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      if (seen.has(k)) continue;
      let e = null; try { e = app.ovEntry(k); } catch (x) { e = null; }
      if (!e || !e.cols) { seen.set(k, { v, title: '(unresolved)', miss: ['entry'] }); continue; }
      const cols = e.cols.join(' | ');
      const miss = [];
      if (!/\bMTD\b/.test(cols) && !PJP_KEYS.has(k)) miss.push('MTD');   // PJP / Effective Call lists: the visit feed holds the running month only, so MTD is the list itself and LMTD / FM are n/a columns
      if (!/LMTD/.test(cols)) miss.push('LMTD');
      if (!/\bFM\b|Sep|penuh|Okt penuh/.test(cols)) miss.push('FM');
      seen.set(k, { v, title: e.title, miss, cols });
    }
  }
}
const groups = new Map();
for (const [k, x] of seen) {
  if (!x.miss.length) continue;
  const g = x.v + ' · ' + k.split('|').slice(0, 2).join('|') + ' · ' + x.title;
  if (!groups.has(g)) groups.set(g, { n: 0, miss: x.miss, cols: x.cols });
  groups.get(g).n++;
}
console.log('views rendered ' + rendered + ' · popup keys ' + seen.size + ' · popups missing a period: ' + [...seen.values()].filter(x => x.miss.length).length);
for (const [g, x] of groups) console.log('✗ [' + x.miss.join(',') + '] x' + x.n + '  ' + g.slice(0, 150) + '\n      cols: ' + (x.cols || '').slice(0, 160));
process.exit([...seen.values()].some(x => x.miss.length) ? 1 : 0);
