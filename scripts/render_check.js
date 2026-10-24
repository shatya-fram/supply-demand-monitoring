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
let failures = 0;

// AUDIT=1 node scripts/render_check.js : lists tables that rank several areas or MCs but carry no total row
const AUDIT = process.env.AUDIT === '1', auditSeen = new Set();
function audit(label, html) {
  const names = new Set([...(global.TERRITORY_FEED ? [] : []), 'KARAWANG', 'WEST JAKARTA', 'SOUTH JAKARTA DEPOK', 'EAST JAKARTA', 'CENTRAL NORTH JAKARTA', 'BEKASI', 'KAB BEKASI']);
  const tables = html.split(/<table/).slice(1);
  tables.forEach((t, ti) => {
    const body = (t.split(/<tbody>/)[1] || '').split('</tbody>')[0];
    const rows = body.split(/<tr/).slice(1).map(r => r.replace(/^[^>]*>/, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim());
    const terr = rows.filter(r => { const f = r.replace(/^[＋－#\d\s]+/, ''); return [...names].some(n => f.startsWith(n + ' ') || f === n) || /^MC-[A-Z]/.test(f); }).length;
    if (terr < 2) return;
    const rawRows = body.split(/<tr/).slice(1);
    const total = rawRows.some(x => /^[^>]*background:\s*var\(--(ij-)?ink\)/.test(x) || /<tfoot/.test(t)) || rows.some(r => /^[＋－\s]*(TOTAL|REGION|INNER JAKARTA|ALL INNER|ALL IN SCOPE|SEMUA)/i.test(r) || /\bTOTAL\b/.test(r.slice(0, 40)));
    const pos = (() => { let p = -1; for (let i = 0; i <= ti; i++) p = html.indexOf('<table', p + 1); return p; })();
    const pre = html.slice(0, pos), h2i = pre.lastIndexOf('<h2'), h2 = h2i >= 0 ? pre.slice(h2i).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70) : label;
    const th1 = (t.match(/<th[^>]*>([\s\S]*?)<\/th>/) || [0, ''])[1].replace(/<[^>]+>/g, '').trim().slice(0, 24);
    const key = h2 + ' [' + th1 + ']';
    if (!total && !auditSeen.has(key)) { auditSeen.add(key); console.log('NO-TOTAL  ' + label + '  ·  ' + key + '  (' + terr + ' territory rows)'); }
  });
}
function check(label, fn) {
  try {
    const html = fn();
    if (AUDIT) audit(label, html);
    // period-grouped tables: every plain body row must be as wide as the two-row header (cells moved by pgPost must not be lost or duplicated)
    for (const tm of html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)) {
      const th = /<thead>([\s\S]*?)<\/thead>/.exec(tm[1]), tb = /<tbody>([\s\S]*?)<\/tbody>/.exec(tm[1]); if (!th || !tb || !/border-left:2px solid var\(--ij-ink\)/.test(th[1])) continue;
      const hr = th[1].match(/<tr[\s\S]*?<\/tr>/g) || []; if (hr.length !== 2) continue;
      const width = [...hr[0].matchAll(/<th([^>]*)>/g)].reduce((n, x) => n + (/colspan="(\d+)"/.exec(x[1]) ? +/colspan="(\d+)"/.exec(x[1])[1] : 1), 0);
      let badRows = 0, plain = 0;
      for (const r of tb[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) { const cells = [...r[1].matchAll(/<t[dh]([^>]*)>/g)]; if (cells.some(c => /colspan/.test(c[1]))) continue; plain++; if (cells.length !== width) badRows++; }
      if (plain && badRows) { failures++; console.log('✗ period-group width mismatch in ' + label + ': ' + badRows + ' of ' + plain + ' rows differ from header width ' + width); }
    }
    const bad = /\bundefined\b|\bNaN\b/.test(html);
    console.log((bad ? '⚠ ' : '✓ ') + label.padEnd(32) + String(html.length).padStart(9) + ' chars' + (bad ? '  (contains undefined/NaN)' : ''));
  } catch (e) {
    failures++;
    console.log('✗ ' + label.padEnd(32) + ' ' + String(e && e.message).split('\n')[0]);
  }
}

for (const v of Object.keys(VIEWS)) { state.view = v; check(v, VIEWS[v]); }
for (const s of ['auto', 'chain', 'hoa', 'dso', 'dse', 'kecamatan', 'site']) {
  state.view = 'territory'; state.terrSubView = s; check('territory/' + s, VIEWS.territory);
}
for (const b of ['im3', '3id', 'hybrid']) for (const s of ['regional', 'area', 'mc', 'dse']) {
  state.view = 'visits'; state.visitsSubView = s; state.visitsBrandFilter = b; state.visitsDateScope = 'mtd';
  check('visits/' + s + '/brand=' + b, VIEWS.visits);
}
state.visitsBrandFilter = 'all';
for (const sub of ['exec', 'heat']) for (const lv of ['auto', 'area', 'mc', 'dse', 'outlet']) {
  state.view = 'visits'; state.visitsSubView = sub; state.visitsLevel = lv; state.branch = ''; state.kec = ''; state.visitsDse = null;
  check('visits/' + sub + '/level=' + lv, VIEWS.visits);
}
state.visitsLevel = 'auto';
{ const fm0 = global.dseVisitsFeed.micro_clusters[0], fd0 = global.dseVisitsFeed.dses[0];
  state.branch = fm0.branch; state.visitsSubView = 'heat'; check('visits/heat/auto-branch', VIEWS.visits);
  state.kec = fm0.micro_cluster; check('visits/heat/auto-mc', VIEWS.visits); state.visitsSubView = 'exec'; check('visits/exec/auto-mc', VIEWS.visits);
  state.branch = ''; state.kec = ''; state.visitsDse = fd0.person_id; check('visits/exec/auto-dse', VIEWS.visits); state.visitsSubView = 'heat'; check('visits/heat/auto-dse', VIEWS.visits);
  state.visitsDse = null; }
{ const fm1 = global.dseVisitsFeed.micro_clusters[0], fd1 = global.dseVisitsFeed.dses[0];
  state.branch = fm1.branch; state.visitsSubView = 'exec'; check('visits/exec/never-branch', VIEWS.visits);
  const uo = (global.dseVisitsFeed.unvisited_outlets || []).find(r => r.w === 'mtd' && r.br === fm1.branch);
  if (uo) { state.nvSelOutletGrp = uo.mc; state.nvSelSiteGrp = uo.mc; check('visits/exec/never-branch-open', VIEWS.visits); }
  state.nvSelOutletGrp = null; state.nvSelSiteGrp = null; state.kec = fm1.micro_cluster; state.visitsSubView = 'heat'; check('visits/heat/never-mc', VIEWS.visits);
  state.branch = ''; state.kec = ''; state.visitsDse = fd1.person_id; check('visits/heat/never-dse', VIEWS.visits); state.visitsDse = null; }
state.visitsBrandFilter = 'all';
state.hoa = (global.dseVisitsFeed.branches[0] || {}).hoa_leader || '';
for (const s of ['area', 'mc', 'dse']) { state.view = 'visits'; state.visitsSubView = s; check('visits/' + s + '/hoa', VIEWS.visits); }
state.hoa = '';
for (const s of ['regional', 'area', 'mc', 'dse', 'unvisited']) {
  for (const sc of ['last3d', 'last7d', 'mtd']) {
    state.view = 'visits'; state.visitsSubView = s; state.visitsDateScope = sc;
    check('visits/' + s + '/' + sc, VIEWS.visits);
  }
}
// Inactivity audit: entity x group x window, with and without a selected group and a filter
state.view = 'visits'; state.visitsSubView = 'unvisited';
for (const entity of ['outlet', 'site']) for (const grp of ['br', 'mc', 'kec', 'dse']) for (const sc of ['mtd', 'last7d', 'last3d']) {
  state.unvisEntity = entity; state.unvisGroup = grp; state.visitsDateScope = sc; state.unvisSelected = null;
  check('unvisited/' + entity + '/' + grp + '/' + sc, VIEWS.visits);
  const first = (global.dseVisitsFeed['unvisited_' + entity + 's'] || [])[0];
  if (first) { state.unvisSelected = first[grp]; check('unvisited/' + entity + '/' + grp + '/' + sc + '/selected', VIEWS.visits); }
}
state.unvisSelected = null;
// Filter-driven states: branch, HoA, MC
state.view = 'visits'; state.visitsSubView = 'unvisited';
for (const ent of ['slab', 'map']) for (const sc of ['mtd', 'last7d', 'last3d']) {
  state.unvisEntity = ent; state.visitsDateScope = sc; state.unvisSiteSel = null;
  check('unvisited/' + ent + '/' + sc, VIEWS.visits);
}
for (const srt of ['count', 'share', 'never']) { state.unvisEntity = 'slab'; state.inactSort = srt; check('unvisited/slab/sort=' + srt, VIEWS.visits); }
{ const sites = global.dseVisitsFeed._inactSites || [];
  if (sites.length) { state.unvisSiteSel = sites[0].key; state.unvisEntity = 'slab'; check('unvisited/slab/selected', VIEWS.visits); state.inactShowActive = true; check('unvisited/slab/selected-active', VIEWS.visits);
    state.unvisEntity = 'map'; state.inactMapOutlets = true; state.inactMapAllSites = true; check('unvisited/map/selected', VIEWS.visits); }
  for (const fl of ['flagged', 'mtd', '7d', 'all']) { state.unvisEntity = 'map'; state.inactMapFlag = fl; check('unvisited/map/flag=' + fl, VIEWS.visits); }
  { const fd2 = global.dseVisitsFeed.dses.find(d => d.in_master); if (fd2) { state.visitsDse = fd2.person_id; state.unvisEntity = 'map'; check('unvisited/map/dse', VIEWS.visits); state.visitsDse = null; } }
  state.inactMapFlag = 'flagged';
  state.unvisSiteSel = null; state.inactShowActive = false; state.inactMapOutlets = false; state.inactMapAllSites = false; state.unvisEntity = 'outlet'; }
// Penjualan (DAILY_DATA_MOBII)
state.view = 'mb_penjualan'; state.branch = ''; state.hoa = ''; state.kec = ''; state.pjDse = null;
for (const tab of ['ringkasan', 'teritori', 'heat', 'produk', 'outlet']) for (const b of ['all', 'IM3']) { state.pjTab = tab; state.pjBrand = b; state.pjCat = 'all'; check('penjualan/' + tab + '/brand=' + b, VIEWS.mb_penjualan); }
state.pjBrand = 'all';
for (const com of ['SP', 'VC', 'SALMO']) { state.pjTab = 'slab'; state.pjSlabCom = com; state.pjSlabProd = com === 'SP' ? 'ZERO_ORI3GB' : 'all'; check('penjualan/slab/' + com, VIEWS.mb_penjualan); }
{ state.pjSlabCom = 'SP'; for (const pr of ['ZERO', 'ORI3GB', 'all']) { state.pjSlabProd = pr; check('penjualan/slab/SP/' + pr, VIEWS.mb_penjualan); }
  const vp = global.PENJUALAN_FEED.products.find(p => p.cat === 'VCF'); if (vp) { state.pjSlabCom = 'VC'; state.pjSlabProd = String(vp.i); check('penjualan/slab/VC/product', VIEWS.mb_penjualan); }
  // slab matrix drill-down: open every MC, then resolve clickable cells into popup entries (outlet and DSE lists with MTD, LMTD, Last FM)
  for (const ent of ['outlet', 'dse']) { for (const com of ['SP', 'VC', 'SALMO', 'SPI']) {
    state.pjSlabEntity = ent; state.pjSlabCom = com; state.pjSlabProd = com === 'SP' ? 'ZERO_ORI3GB' : 'all'; state.pjSlabMAll = true; state.pjSlabOpenM = {};
    let html = ''; check('penjualan/slab-drill/' + ent + '/' + com, () => (html = VIEWS.mb_penjualan()));
    const keys = [...new Set([...html.matchAll(/data-ov="(sl\|[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')))];
    const pick = keys.filter((k, i) => i % Math.max(1, Math.floor(keys.length / 12)) === 0).slice(0, 14);
    let n = 0; for (const k of pick) { const e = app.ovEntry(k); if (!e || !e.rows || !e.cols) { failures++; console.log('✗ slab popup ' + k); continue; } const t = app.ovText(e); if (/undefined|NaN/.test(t)) { failures++; console.log('⚠ slab popup text ' + k); } n++; }
    console.log((n === pick.length && keys.length ? '✓ ' : '✗ ') + ('slab popups ' + ent + '/' + com).padEnd(32) + String(n).padStart(9) + ' of ' + keys.length + ' cells resolved'); if (!keys.length) failures++;
    state.pjSlabMAll = null;
  } } state.pjSlabCom = 'SP'; state.pjSlabEntity = 'outlet';
  state.pjSlabEntity = 'dse'; for (const com of ['SP', 'VC', 'SALMO']) { state.pjSlabCom = com; state.pjSlabProd = com === 'SP' ? 'ZERO_ORI3GB' : 'all'; check('penjualan/slab-dse/' + com, VIEWS.mb_penjualan); } state.pjSlabEntity = 'outlet';
  state.branch = global.PENJUALAN_FEED.metadata.mc_info[Object.keys(global.PENJUALAN_FEED.metadata.mc_info)[0]].br; state.pjSlabCom = 'SALMO'; check('penjualan/slab/SALMO/branch', VIEWS.mb_penjualan); state.branch = ''; state.pjSlabCom = 'SP'; state.pjSlabProd = 'ZERO_ORI3GB'; }
for (const cat of ['SP', 'VCF', 'VCB', 'SALMO']) { state.pjCat = cat; state.pjTab = 'heat'; check('penjualan/heat/cat=' + cat, VIEWS.mb_penjualan); state.pjTab = 'outlet'; check('penjualan/outlet/cat=' + cat, VIEWS.mb_penjualan); }
state.pjCat = 'all';
{ const PF = global.PENJUALAN_FEED; const mcs = Object.keys(PF.metadata.mc_info); const mc0 = mcs[0], br0 = PF.metadata.mc_info[mc0].br;
  state.branch = br0; for (const tab of ['teritori', 'heat', 'outlet']) { state.pjTab = tab; check('penjualan/' + tab + '/branch', VIEWS.mb_penjualan); }
  state.kec = mc0; for (const tab of ['ringkasan', 'teritori', 'heat']) { state.pjTab = tab; check('penjualan/' + tab + '/mc', VIEWS.mb_penjualan); }
  const o0 = PF.outlets.find(o => o.mc === mc0 && o.tier === 'M'); if (o0) { state.pjDse = o0.dse; for (const tab of ['ringkasan', 'teritori', 'heat', 'outlet']) { state.pjTab = tab; check('penjualan/' + tab + '/dse', VIEWS.mb_penjualan); } }
  state.pjOnlyNoMtd = true; state.pjTab = 'outlet'; check('penjualan/outlet/nomtd', VIEWS.mb_penjualan);
  state.pjDse = null; state.branch = ''; state.kec = ''; state.pjOnlyNoMtd = false; state.pjTab = 'ringkasan'; }
const fb = global.dseVisitsFeed.branches[0], fm = global.dseVisitsFeed.micro_clusters[0];
for (const f of [{ branch: fb.branch }, { hoa: fb.hoa_leader }, { branch: fm.branch, kec: fm.micro_cluster }]) {
  state.branch = f.branch || ''; state.hoa = f.hoa || ''; state.kec = f.kec || '';
  state.view = 'visits'; state.visitsSubView = 'regional'; check('visits/filtered/' + JSON.stringify(f), VIEWS.visits);
  state.visitsSubView = 'unvisited'; check('unvisited/filtered/' + JSON.stringify(f), VIEWS.visits);
  state.view = 'territory'; state.terrSubView = 'auto'; check('territory/auto/' + JSON.stringify(f), VIEWS.territory);
}
state.branch = ''; state.hoa = ''; state.kec = '';
// Sell-In Monitoring: tabs x territory x day cutoff x progression metric, plus levels, filters and search
state.view = 'sellin';
for (const tab of ['all', 'SALDO', 'SP', 'VC']) for (const loc of ['area', 'mc', 'cse']) {
  state.sellinTab = tab; state.sellinLoc = loc; state.sellinDay = -1; state.sellinProgMetric = 'qty'; state.sellinProgMode = 'cum'; state.sellinLevel = 'area'; state.sellinPage = 1;
  check('sellin/' + tab + '/' + loc, VIEWS.sellin);
}
for (const tab of ['all', 'SP', 'VC', 'SALDO']) for (const pm of ['qty', 'uar', 'amt']) for (const mode of ['cum', 'daily']) {
  state.sellinTab = tab; state.sellinLoc = 'area'; state.sellinProgMetric = pm; state.sellinProgMode = mode; state.sellinDay = 4;
  check('sellin/' + tab + '/prog/' + pm + '/' + mode + '/day4', VIEWS.sellin);
}
state.sellinDay = -1; state.sellinProgMetric = 'qty'; state.sellinProgMode = 'cum';
for (const lv of ['region', 'area', 'mc', 'kec', 'site', 'dse', 'outlet']) { state.sellinTab = 'all'; state.sellinLevel = lv; check('sellin/all/level/' + lv, VIEWS.sellin); }
for (const fl of ['DSE', 'MPX', 'SDP', 'UNK']) { state.sellinTab = 'SP'; state.sellinFlow = fl; state.sellinLevel = 'dse'; check('sellin/SP/flow=' + fl, VIEWS.sellin); }
state.sellinFlow = 'all';
for (const br of ['IM3', '3ID']) { state.sellinTab = 'VC'; state.sellinBrand = br; check('sellin/VC/brand=' + br, VIEWS.sellin); }
state.sellinBrand = 'all';
state.branch = fb.branch; state.sellinTab = 'SALDO'; state.sellinLoc = 'cse'; state.sellinLevel = 'outlet'; state.sellinPage = 3; check('sellin/SALDO/filtered-outlet-page3', VIEWS.sellin);
state.branch = ''; state.sellinSearch = 'cell'; state.sellinTab = 'all'; state.sellinLevel = 'site'; check('sellin/all/search', VIEWS.sellin);
state.sellinSearch = ''; state.sellinPage = 1; state.sellinLevel = 'area';
// Morning DSE Briefing (Bahasa Indonesia)
for (const tb of ['sp', 'vc', 'sal', 'spi']) { state.view = 'mb_uar'; state.uarTab = tb; state.branch = ''; state.hoa = ''; state.kec = ''; check('uar/' + tb, VIEWS.mb_uar); const th0 = {sp: [1, 5], vc: [5, 20], sal: [50000], spi: [3]}[tb]; for (const v of th0) { state.uarThr[tb] = v; check('uar/' + tb + '/thr=' + v, VIEWS.mb_uar); } state.uarThr = { sp: 3, vc: 10, sal: 300000, spi: 1 }; state.branch = fb.branch; check('uar/' + tb + '/branch', VIEWS.mb_uar); state.kec = fm.micro_cluster; state.branch = fm.branch; check('uar/' + tb + '/mc', VIEWS.mb_uar); state.branch = ''; state.kec = ''; }
for (const tb of ['sp', 'vc', 'sal', 'spi']) for (const sb of ['growth', 'slab', 'aktif', 'inaktif']) { state.uarTab = tb; state.uarSub = sb; for (const sg of (sb === 'aktif' ? ['all', 'baru', 'naik', 'turun'] : (sb === 'inaktif' ? ['all', 'lapsed', 'dekat', 'lain', 'dormant'] : ['x']))) { state.uarSeg = { aktif: sg, inaktif: sg }; state.uarPage = 1; check('uar/' + tb + '/' + sb + '/' + sg, VIEWS.mb_uar); } state.branch = fb.branch; check('uar/' + tb + '/' + sb + '/branch', VIEWS.mb_uar); state.kec = fm.micro_cluster; state.branch = fm.branch; check('uar/' + tb + '/' + sb + '/mc', VIEWS.mb_uar); state.branch = ''; state.kec = ''; }
state.uarSub = 'growth'; state.uarSeg = { aktif: 'all', inaktif: 'lapsed' };
for (const tb of ['ringkasan', 'dse', 'outlet', 'harian', 'slab']) { state.view = 'mb_grossadd'; state.gaTab = tb; state.branch = ''; state.hoa = ''; state.kec = ''; check('grossadd/' + tb, VIEWS.mb_grossadd); state.branch = fb.branch; check('grossadd/' + tb + '/branch', VIEWS.mb_grossadd); state.kec = fm.micro_cluster; state.branch = fm.branch; check('grossadd/' + tb + '/mc', VIEWS.mb_grossadd); state.branch = ''; state.kec = ''; }
for (const sg of ['all', 'baru', 'hilang', 'nol']) { state.view = 'mb_grossadd'; state.gaTab = 'outlet'; state.gaSeg = sg; state.gaPage = 1; check('grossadd/outlet/seg=' + sg, VIEWS.mb_grossadd); }
for (const br of ['IM3', '3ID']) for (const tb of ['ringkasan', 'dse', 'harian', 'slab']) { state.view = 'mb_grossadd'; state.gaTab = tb; state.gaBrand = br; check('grossadd/' + tb + '/brand=' + br, VIEWS.mb_grossadd); }
state.gaBrand = 'all'; state.gaBasis = 'site'; for (const tb of ['ringkasan', 'dse', 'outlet', 'harian', 'slab']) { state.gaTab = tb; check('grossadd/site/' + tb, VIEWS.mb_grossadd); state.kec = fm.micro_cluster; state.branch = fm.branch; check('grossadd/site/' + tb + '/mc', VIEWS.mb_grossadd); state.kec = ''; state.branch = ''; }
state.gaBasis = 'outlet'; state.gaBrand = 'all'; state.gaTab = 'ringkasan';
state.gaSg = 'PJP'; state.gaTab = 'ringkasan'; check('grossadd/segmen=PJP', VIEWS.mb_grossadd); state.gaSg = 'all'; state.gaCover = 'master'; check('grossadd/cakupan=master', VIEWS.mb_grossadd); state.gaCover = 'all'; state.gaSearch = 'cell'; state.gaTab = 'dse'; check('grossadd/dse/search', VIEWS.mb_grossadd); state.gaSearch = '';
state.gaSeg = 'all'; state.gaTab = 'ringkasan';
for (const m of ['si', 'sal', 'ga']) for (const tb of ['outlet', 'dse', 'flag']) {
  const v = m === 'ga' ? 'mb_grossadd' : 'mb_penjualan'; state.view = v; state.pjTab = 'sga'; state.gaTab = 'sga'; if (m !== 'ga') state.sgaMetric = m; state.sgaTab = tb; state.branch = ''; state.hoa = ''; state.kec = ''; state.sgaPage = 1; state.sgaSeg = 'all';
  for (const base of ['lm', 'fm']) { state.sgaBase = base; for (const fl of ['outlet', 'dse']) { state.sgaFlag = fl; check('sga/' + m + '/' + tb + '/' + base + '/' + fl, VIEWS[v]); } }
  state.branch = fb.branch; check('sga/' + m + '/' + tb + '/branch', VIEWS[v]); state.kec = fm.micro_cluster; state.branch = fm.branch; check('sga/' + m + '/' + tb + '/mc', VIEWS[v]); state.branch = ''; state.kec = '';
}
for (const sg of ['lost', 'drop', 'big']) { state.view = 'mb_penjualan'; state.sgaMetric = 'si'; state.sgaTab = 'flag'; state.sgaSeg = sg; state.sgaFlag = 'outlet'; check('sga/flag/seg=' + sg, VIEWS.mb_penjualan); }
// Slab SGA popups (every slab number): rows in the popup = the number printed in the cell, FM / LMTD / MTD in Rp and qty with n/a where there is no data
for (const m of ['si', 'sal', 'ga']) for (const tb of ['outlet', 'dse']) {
  const v = m === 'ga' ? 'mb_grossadd' : 'mb_penjualan'; state.view = v; state.branch = ''; state.kec = ''; state.hoa = ''; state.pjTab = 'sga'; state.gaTab = 'sga'; if (m !== 'ga') state.sgaMetric = m; state.sgaTab = tb; state.sgaPage = 1;
  let html = ''; check('sga/popup/' + m + '/' + tb, () => (html = VIEWS[v]()));
  const seen = new Set(); let n = 0;
  for (const x of html.matchAll(/data-ov="(sg\|[^"]+)"[^>]*>(?:<b[^>]*>)?([\d.,]+)(?:<\/b>)?<\/(?:span|td)>/g)) {
    const k = x[1].replace(/&amp;/g, '&'); if (seen.has(k) || seen.size > 60) continue; seen.add(k);
    const e = app.ovEntry(k); if (!e) { failures++; console.log('✗ sg popup missing ' + k); continue; }
    const shown = parseInt(x[2].replace(/[.,]/g, ''), 10), t = app.ovText(e);
    if (/undefined|NaN/.test(t)) { failures++; console.log('✗ sg popup undefined/NaN ' + k); }
    else if (/\|(\d)\|(\d+|N|A|L)$/.test(k) && /<span/.test(x[0]) && e.rows.length !== shown) { failures++; console.log('✗ sg popup rows ' + e.rows.length + ' != cell ' + shown + ' ' + k); } else n++;
  }
  if (!n) { failures++; console.log('✗ no sg popups for ' + m + '/' + tb); }
}
state.sgaTab = 'outlet';
// Matrix Outlet x Produk > Slab Matrix voucher: popups per slab cell
for (const br of ['IM3', '3ID']) for (const bs of ['fm', 'lm', 'mtd', 'pr']) {
  state.view = 'mb_penjualan'; state.pjTab = 'produk'; state.pjProdView = 'matrix'; state.pjMxBrand = br; state.pjMxSlab = bs; state.branch = ''; state.kec = ''; state.hoa = '';
  let html = ''; check('vmslab/popup/' + br + '/' + bs, () => (html = VIEWS.mb_penjualan())); let n = 0;
  for (const x of html.matchAll(/data-ov="(vm\|[^"]+)"[^>]*>\s*(?:<b>)?([\d.,]+)(?:<\/b>)?(?:<br>|<\/td>)/g)) { if (n > 30) break; const e = app.ovEntry(x[1]); if (!e) { failures++; console.log('✗ vm popup missing ' + x[1]); continue; } const t = app.ovText(e);
    if (/undefined|NaN/.test(t)) { failures++; console.log('✗ vm popup undefined/NaN ' + x[1]); } else if (e.rows.length !== parseInt(x[2].replace(/[.,]/g, ''), 10)) { failures++; console.log('✗ vm popup rows ' + e.rows.length + ' != cell ' + x[2] + ' ' + x[1]); } else n++; }
  if (!n) { failures++; console.log('✗ no vm popups ' + br + '/' + bs); }
}
state.pjMxSlab = 'fm';
// Katalog search ignores the class filter: Retail outlet 677871 is found on product GA with the shared-link scope
{ state.view = 'mb_kro'; state.kroProd = 'ga'; state.kroMeas = 'si'; state.kroTab = 'katalog'; state.kroMode = 'slab'; state.kroFlag = 'all'; state.kroPage = 1; state.branch = 'SOUTH JAKARTA DEPOK'; state.kec = 'MC-PANCORAN'; state.kroSearch = '677871'; state.kroClass = 'all';
  let html = ''; check('kro/katalog/search-677871', () => (html = VIEWS.mb_kro()));
  if (!/677871/.test(html.split('Pencarian mengabaikan')[1] || '') || !/Pencarian mengabaikan filter kategori: [1-9]/.test(html)) { failures++; console.log('✗ katalog search 677871 not found on product ga'); }
  state.kroSearch = ''; state.branch = ''; state.kec = ''; }
// Opportunity > UAR slab (uarSlabView): popups per slab cell
for (const tab of ['sp', 'vc', 'sal', 'spi']) {
  state.view = 'mb_uar'; state.uarTab = tab; state.uarSub = 'slab'; state.branch = ''; state.kec = ''; state.hoa = '';
  let html = ''; check('uarslab/popup/' + tab, () => (html = VIEWS.mb_uar())); let n = 0;
  for (const x of html.matchAll(/data-ov="(ur\|[^"]+)"[^>]*>([\d.,]+)<\/span>/g)) { if (n > 40) break; const e = app.ovEntry(x[1]); if (!e) { failures++; console.log('✗ ur popup missing ' + x[1]); continue; } const t = app.ovText(e);
    if (/undefined|NaN/.test(t)) { failures++; console.log('✗ ur popup undefined/NaN ' + x[1]); } else if (e.rows.length !== parseInt(x[2].replace(/[.,]/g, ''), 10)) { failures++; console.log('✗ ur popup rows ' + e.rows.length + ' != cell ' + x[2] + ' ' + x[1]); } else n++; }
  if (!n) console.log('! no ur popups for ' + tab + ' (view may be on another sub-tab)');
}
// Gross Add redesign (24 Oct 2026): every tab of both bases renders, with brand / territory filters, the Outlet formats and the three graph views
{ const mcR = Object.keys(global.GA_FEED.metadata.mc_info)[0], brR = global.GA_FEED.metadata.mc_info[mcR].br;
  for (const bs of ['outlet', 'site']) for (const tb of (bs === 'site' ? ['ringkasan', 'target', 'sga', 'harian', 'graf', 'slab'] : ['ringkasan', 'sga', 'dse', 'outlet', 'harian', 'graf', 'slab'])) for (const br of ['all', 'IM3']) for (const sc of ['region', 'branch', 'mc']) {
    Object.assign(state, { view: 'mb_grossadd', gaBasis: bs, gaTab: tb, gaBrand: br, gaOutFmt: 'list', gaGraf: 'total', branch: sc === 'region' ? '' : brR, kec: sc === 'mc' ? mcR : '', hoa: '', dse: '' });
    check('gadesign/' + bs + '/' + tb + '/' + br + '/' + sc, VIEWS.mb_grossadd);
  }
  for (const f of ['kat', 'tag']) { Object.assign(state, { view: 'mb_grossadd', gaBasis: 'outlet', gaTab: 'outlet', gaOutFmt: f, branch: '', kec: '' }); check('gadesign/outlet-format/' + f, VIEWS.mb_grossadd); }
  for (const gm of ['stack', 'pct']) for (const bs of ['outlet', 'site']) { Object.assign(state, { view: 'mb_grossadd', gaBasis: bs, gaTab: 'graf', gaGraf: gm }); check('gadesign/graf/' + bs + '/' + gm, VIEWS.mb_grossadd); }
  // the outlet basis has no Target Kecamatan tab, the site basis keeps it; the Per DSE / Outlet tabs belong to the outlet basis only
  Object.assign(state, { view: 'mb_grossadd', gaTab: 'ringkasan', gaOutFmt: 'list', gaGraf: 'total', gaBasis: 'outlet' }); let hh = VIEWS.mb_grossadd();
  if (/data-ga-tab="target"/.test(hh)) { failures++; console.log('✗ outlet basis still has the Target Kecamatan tab'); }
  state.gaBasis = 'site'; hh = VIEWS.mb_grossadd(); if (!/data-ga-tab="target"/.test(hh) || /data-ga-tab="(dse|outlet)"/.test(hh)) { failures++; console.log('✗ site basis tabs wrong'); }
  state.gaBasis = 'outlet'; }
// Gross Add > Slab GA (gaSlab): popups per slab cell, tagging and site basis
for (const bs of ['outlet', 'site']) {
  state.view = 'mb_grossadd'; state.gaTab = 'slab'; state.gaBasis = bs; state.branch = ''; state.kec = ''; state.hoa = '';
  let html = ''; check('gaslab/popup/' + bs, () => (html = VIEWS.mb_grossadd())); let n = 0;
  const rx = bs === 'site' ? /data-ov="(ss\|[^"]+)"[^>]*>([\d.,]+)<div/g : /data-ov="(gs\|[^"]+)"[^>]*>(?:<[^>]+>)*([\d.,]+)<\/span>/g;
  for (const x of html.matchAll(rx)) { if (n > 40) break; const e = app.ovEntry(x[1]); if (!e) { failures++; console.log('✗ gs popup missing ' + x[1]); continue; } const t = app.ovText(e);
    if (/undefined|NaN/.test(t)) { failures++; console.log('✗ gs popup undefined/NaN ' + x[1]); } else if (e.rows.length !== parseInt(x[2].replace(/[.,]/g, ''), 10)) { failures++; console.log('✗ gs popup rows ' + e.rows.length + ' != cell ' + x[2] + ' ' + x[1]); } else n++; }
  if (!n) { failures++; console.log('✗ no slab popups for ' + bs); }
}
state.gaBasis = 'outlet'; state.gaTab = 'ringkasan';
state.sgaSeg = 'all'; state.sgaMetric = 'si'; state.gaTab = 'ringkasan'; state.pjTab = 'ringkasan'; state.sgaTab = 'outlet'; state.gaTab = 'ringkasan'; state.pjTab = 'ringkasan'; state.sgaMetric = 'si';

// Daily GA Trend and Outlet & KRO Management (18 Oct 2026)
state.branch = ''; state.hoa = ''; state.kec = ''; state.dse = '';
for (const bs of ['outlet', 'site']) for (const br of ['all', 'IM3', '3ID']) for (const day of [0, 1, 7, 15, 31]) {
  state.view = 'mb_gatrend'; state.gaBasis = bs; state.gaBrand = br; state.gtDay = day; check('gatrend/' + bs + '/' + br + '/D' + day, VIEWS.mb_gatrend);
}
state.gaBasis = 'outlet'; state.gaBrand = 'all'; state.gtDay = 0;
{ const mc0 = Object.keys(global.GA_FEED.metadata.mc_info)[0], br0 = global.GA_FEED.metadata.mc_info[mc0].br;
  state.branch = br0; check('gatrend/branch', VIEWS.mb_gatrend); state.kec = mc0; check('gatrend/mc', VIEWS.mb_gatrend);
  state.gaSg = 'PJP'; check('gatrend/mc/pjp', VIEWS.mb_gatrend); state.gaSg = 'all'; state.gaCover = 'master'; check('gatrend/mc/master', VIEWS.mb_gatrend); state.gaCover = 'all';
  state.view = 'mb_grossadd'; state.gaTab = 'ringkasan'; state.gaBasis = 'site'; check('grossadd/site-cards/mc', VIEWS.mb_grossadd); state.gaBasis = 'outlet'; check('grossadd/outlet-cards/mc', VIEWS.mb_grossadd);
  // Outlet & KRO Management: every product / measure, tab, catalogue mode, summary grouping, plus whitelist, program and popup checks
  const KRO_COMBOS = [['sp', 'si'], ['vc', 'si'], ['vc', 'so'], ['sl', 'si'], ['sl', 'so'], ['ga', 'si']];
  const kroSet = (prod, meas, tab) => { state.view = 'mb_kro'; state.kroProd = prod; state.kroMeas = meas; state.kroTab = tab; state.kroMode = 'slab'; state.kroGroup = ''; state.kroClass = 'all'; state.kroPer = 'pr'; state.kroFlag = 'all'; state.kroSearch = ''; state.kroPage = 1; };
  for (const [pr, me] of KRO_COMBOS) for (const tb of ['ringkasan', 'katalog', 'tracking', 'aksi']) { kroSet(pr, me, tb); check('kro/' + pr + '-' + me + '/' + tb + '/mc', VIEWS.mb_kro); }
  state.branch = ''; state.kec = '';
  for (const [pr, me] of KRO_COMBOS) for (const tb of ['ringkasan', 'katalog', 'tracking', 'aksi']) { kroSet(pr, me, tb); check('kro/' + pr + '-' + me + '/' + tb, VIEWS.mb_kro); }
  for (const [pr, me] of KRO_COMBOS) for (const gr of ['am', 'type', 'perf']) { kroSet(pr, me, 'ringkasan'); state.kroGroup = gr; check('kro/' + pr + '-' + me + '/group=' + gr, VIEWS.mb_kro); }
  for (const [pr, me] of KRO_COMBOS) for (const cl of ['all', 'W', 'K', 'R']) for (const per of ['fm', 'pr']) { kroSet(pr, me, 'katalog'); state.kroClass = cl; state.kroPer = per; check('kro/katalog/' + pr + '-' + me + '/' + cl + '/' + per, VIEWS.mb_kro); }
  for (const key of Object.keys(global.KRO_FEED.rows.reduce((a, r) => { Object.values(r.fl).forEach(l => l.forEach(f => { a[f] = 1; })); return a; }, {}))) { kroSet('sp', 'si', 'katalog'); state.kroFlag = key; check('kro/katalog/flag=' + key, VIEWS.mb_kro); }
  kroSet('sp', 'si', 'katalog'); state.kroSearch = 'cell'; state.kroPage = 3; check('kro/katalog/search-page3', VIEWS.mb_kro);
  // whitelist (ids resolved from rows and from the Retail slim file) and program modes
  { global.KRO_SLIM = global.KRO_SLIM || []; const K = global.KRO_FEED, row = K.rows[10], sl = global.KRO_SLIM[5];
    const text = 'outlet_id,nama\n' + [row.id.IM3 || row.id['3ID'], sl && (sl[3] || sl[4]), 'ID-TIDAK-ADA-1'].filter(Boolean).map(x => x + ',x').join('\n');
    for (const [pr, me] of KRO_COMBOS) { kroSet(pr, me, 'katalog'); state.kroMode = 'wl'; state.kroWlText = text; state.kroWl = app.kroParseIds(text); check('kro/whitelist/' + pr + '-' + me, VIEWS.mb_kro); }
    if (app.kroParseIds(text).length !== 3) { failures++; console.log('✗ whitelist parse: ' + JSON.stringify(app.kroParseIds(text))); }
    state.kroProgUp = app.kroParseProgram('program,outlet_id\nBOSS,' + (row.id.IM3 || row.id['3ID']) + '\nBOSS,' + (sl ? (sl[3] || sl[4]) : '') + '\nTebus Murah,' + row.k + '\nTebus Murah,NOPE');
    for (const [pr, me] of KRO_COMBOS) for (const pg of ['BOSS', 'Tebus Murah']) { kroSet(pr, me, 'katalog'); state.kroMode = 'prog'; state.kroProg = pg; check('kro/program/' + pr + '-' + me + '/' + pg, VIEWS.mb_kro); }
    kroSet('sp', 'si', 'katalog'); state.kroMode = 'prog'; state.kroProgUp = {}; check('kro/program/empty', VIEWS.mb_kro);
    state.kroMode = 'wl'; state.kroWl = []; check('kro/whitelist/empty', VIEWS.mb_kro); state.kroWlText = ''; }
  // clickable counts (popup entries 'kr|...') must resolve and carry no undefined / NaN
  for (const [pr, me] of KRO_COMBOS) for (const gr of ['am', 'type', 'perf']) {
    kroSet(pr, me, 'ringkasan'); state.kroGroup = gr; let html = ''; check('kro/drill/' + pr + '-' + me + '/' + gr, () => (html = VIEWS.mb_kro()));
    const keys = [...new Set([...html.matchAll(/data-ov="(kr\|[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')))]; let n = 0;
    const pickK = keys.filter((k, i) => /^kr\|T\|T\|/.test(k) || i % Math.max(1, Math.floor(keys.length / 40)) === 0);
    for (const k of pickK) { const e = app.ovEntry(k); if (!e || !e.rows || !e.cols) { failures++; console.log('✗ kro popup ' + k); continue; } const t = app.ovText(e); if (/undefined|NaN/.test(t)) { failures++; console.log('✗ kro popup undefined/NaN ' + k); } else n++; }
    if (!keys.length) { failures++; console.log('✗ no kro popup keys for ' + pr + '-' + me + '/' + gr); }
  }
  // popup rows must equal the number printed in the slab table cell (first cell per popup key), with every MC expanded
  for (const [pr, me] of KRO_COMBOS) {
    kroSet(pr, me, 'ringkasan'); state.kroGroup = ''; state.kroOpenA = {}; state.kroOpenM = {}; Object.keys(global.KRO_FEED.mc_sum).forEach(m => { state.kroOpenM[m] = true; });
    let html = ''; check('kro/expanded/' + pr + '-' + me, () => (html = VIEWS.mb_kro()));
    const seen = new Set(); let n = 0, ctr = 0;
    for (const m of html.matchAll(/data-ov="(kr\|[^"]+)"[^>]*>\s*((?:<b[^>]*>)?([\d.,]+)(?:<\/b>)?)(?:\s*→[^<]*)?<\/td>/g)) {
      const k = m[1].replace(/&amp;/g, '&'); if (seen.has(k)) continue; seen.add(k); n++; if (!/^kr\|T\|T\|/.test(k) && n % 12) continue;
      const e = app.ovEntry(k), shown = parseInt(m[3].replace(/[.,]/g, ''), 10);
      if (!e) { failures++; console.log('✗ no popup ' + k); continue; }
      if (/^kr\|T\|T\|(cf|cl|cm|cp)_[A-Z]\d$/.test(k) && !/Rp|%/.test(m[2])) { ctr++; if (e.rows.length !== shown) { failures++; console.log('✗ popup rows ' + e.rows.length + ' != cell ' + shown + ' for ' + k + ' (' + pr + '-' + me + ')'); } }
    }
    if (!ctr) { failures++; console.log('✗ no slab count cells compared for ' + pr + '-' + me); }
  }
  state.kroOpenM = {};
  kroSet('sp', 'si', 'ringkasan'); state.gaBasis = 'outlet'; }
// Territory Management: status panel of the catalogue flags and the flag filter of the outlet table
{ const fl = new Set(); global.TERRITORY_FEED.outlets.forEach(o => String(o.flags || '').split('|').filter(Boolean).forEach(f => fl.add(f)));
  if (!fl.size) { failures++; console.log('✗ no catalogue flag in the territory feed'); }
  state.branch = ''; state.hoa = ''; state.kec = ''; state.dse = '';
  for (const f of fl) for (const sub of ['chain', 'dse']) { state.view = 'territory'; state.terrSubView = sub; state.terrFlag = f; check('territory/flag/' + f + '/' + sub, VIEWS.territory); }
  state.terrSubView = 'auto'; state.terrFlag = ''; state.view = 'territory'; { const h = VIEWS.territory(); if (!/Status data katalog 202610/.test(h)) { failures++; console.log('✗ flag status panel missing'); } } }
// Katalog Outlet IOH (sheet OUTLET IOH): statuses, master filter, search, pages, territory filters; the table must list every sheet row
{ const F = global.OUTLET_CATALOGUE, T = global.TERRITORY_FEED; if (!F || !F.rows.length) { failures++; console.log('✗ no outlet catalogue feed'); }
  state.view = 'territory'; state.terrSubView = 'ioh'; state.branch = ''; state.hoa = ''; state.kec = ''; state.dse = ''; state.terrFlag = ''; state.terrSearch = ''; state.iohStatus = ''; state.iohMaster = ''; state.iohPage = 1;
  { const h = VIEWS.territory(); const m = /Halaman 1 \/ (\d+) · ([\d,]+) baris/.exec(h); if (!m || parseInt(m[2].replace(/,/g, ''), 10) !== F.rows.length) { failures++; console.log('✗ catalogue row count ' + (m && m[2]) + ' != ' + F.rows.length); } }
  for (const st of ['', 'DUAL BRAND', 'SINGLE BRAND']) for (const ms of ['', 'in', 'out']) { state.iohStatus = st; state.iohMaster = ms; state.iohPage = 1; check('ioh/' + (st || 'all') + '/' + (ms || 'all'), VIEWS.territory); }
  state.iohStatus = ''; state.iohMaster = ''; state.iohPage = 3; check('ioh/page3', VIEWS.territory); state.iohPage = 99999; check('ioh/page-last', VIEWS.territory);
  state.iohPage = 1; state.terrSearch = 'cell'; check('ioh/search', VIEWS.territory); state.terrSearch = '';
  const mc0 = T.outlets[0].micro_cluster; state.kec = mc0; check('ioh/mc', VIEWS.territory); state.kec = ''; state.branch = T.outlets[0].branch; check('ioh/branch', VIEWS.territory);
  state.branch = ''; state.terrSubView = 'auto'; state.iohPage = 1; }
// Program & Tipe Outlet: every product / measure, program toggles (union and intersection), filters; clickable counts must resolve and match their cells
{ global.KRO_SLIM = global.KRO_SLIM || []; const KF = global.KRO_FEED, progs = Object.keys(KF.metadata.programs).filter(n => (KF.metadata.programs[n].keys || []).length);
  const pset = (prod, meas, prg, mode) => { state.view = 'mb_program'; state.kroProd = prod; state.kroMeas = meas; state.prg = prg; state.prgMode = mode; state.kroSearch = ''; state.kroPage = 1; state.branch = ''; state.hoa = ''; state.kec = ''; state.dse = ''; };
  if (!progs.length) { failures++; console.log('✗ no program with members in the KRO feed'); }
  const KCOMBOS = [['sp', 'si'], ['vc', 'si'], ['vc', 'so'], ['sl', 'si'], ['sl', 'so'], ['ga', 'si']];
  for (const [pr, me] of KCOMBOS) for (const prg of ['', '-', progs[0] || '', progs.slice(0, 2).join('~')]) for (const mode of ['any', 'all']) { pset(pr, me, prg, mode); check('program/' + pr + '-' + me + '/' + (prg || 'all') + '/' + mode, VIEWS.mb_program); }
  { const mc0 = Object.keys(KF.mc_sum)[0], br0 = KF.mc_sum[mc0].br; pset('sp', 'si', '', 'any'); state.branch = br0; check('program/branch', VIEWS.mb_program); state.kec = mc0; check('program/mc', VIEWS.mb_program); state.kroSearch = 'cell'; check('program/search', VIEWS.mb_program); }
  for (const [pr, me] of KCOMBOS) {
    pset(pr, me, '', 'any'); let html = ''; check('program/drill/' + pr + '-' + me, () => (html = VIEWS.mb_program()));
    const keys = [...new Set([...html.matchAll(/data-ov="(kr\|[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')))];
    if (!keys.length) { failures++; console.log('✗ no program popup keys for ' + pr + '-' + me); continue; }
    const pick = keys.filter((k, i) => /^kr\|pg\|T\|/.test(k) || i % Math.max(1, Math.floor(keys.length / 40)) === 0);
    for (const k of pick) { const e = app.ovEntry(k); if (!e || !e.rows || !e.cols) { failures++; console.log('✗ program popup ' + k); continue; } if (/undefined|NaN/.test(app.ovText(e))) { failures++; console.log('✗ program popup undefined/NaN ' + k); } }
    let ctr = 0; for (const m of html.matchAll(/data-ov="(kr\|pg\|[^"]+\|ALL)"[^>]*>\s*(?:<b[^>]*>)?([\d.,]+)(?:<\/b>)?<\/td>/g)) { const k = m[1].replace(/&amp;/g, '&'), e = app.ovEntry(k), shown = parseInt(m[2].replace(/[.,]/g, ''), 10); if (!e) { failures++; console.log('✗ no popup ' + k); continue; } ctr++; if (e.rows.length !== shown) { failures++; console.log('✗ program popup rows ' + e.rows.length + ' != cell ' + shown + ' for ' + k); } }
    if (!ctr) { failures++; console.log('✗ no program ALL cells compared for ' + pr + '-' + me); }
  }
  state.prg = ''; state.prgMode = 'any'; state.kroProd = 'sp'; state.kroMeas = 'si'; }
// KOTA BEKASI label: only the text of the branch changes; KAB BEKASI, MC-BEKASI TENGAH and kecamatan stay; attributes are untouched
{ const R = app.brRelabelHtml, cases = [['<td>BEKASI</td>', '<td>KOTA BEKASI</td>'], ['<td>KAB BEKASI</td>', '<td>KAB BEKASI</td>'], ['<td>MC-BEKASI TENGAH</td>', '<td>MC-BEKASI TENGAH</td>'],
    ['<td>BEKASI UTARA</td>', '<td>BEKASI UTARA</td>'], ['<option value="BEKASI">BEKASI</option>', '<option value="BEKASI">KOTA BEKASI</option>'], ['<td>Branch BEKASI (Ali Sabana)</td>', '<td>Branch KOTA BEKASI (Ali Sabana)</td>'],
    ['<td>KOTA BEKASI</td>', '<td>KOTA BEKASI</td>'], ['<td title="BEKASI">x</td>', '<td title="BEKASI">x</td>']];
  for (const [a, b] of cases) { if (R(a) !== b) { failures++; console.log('✗ relabel ' + a + ' -> ' + R(a) + ' (expected ' + b + ')'); } }
  state.view = 'mb_overall'; state.branch = ''; state.kec = ''; state.hoa = ''; const h = R(VIEWS.mb_overall()); if (/>BEKASI</.test(h)) { failures++; console.log('✗ a branch BEKASI label is left on Overall Performance'); } }
// GA target per kecamatan (M2S KECAMATAN), rolled up to MC and Area
{ const mc0 = Object.keys(global.GA_FEED.metadata.mc_info)[0], br0 = global.GA_FEED.metadata.mc_info[mc0].br;
  for (const br of ['all', 'IM3', '3ID']) { state.view = 'mb_grossadd'; state.gaTab = 'target'; state.gaBrand = br; state.branch = ''; state.hoa = ''; state.kec = ''; check('grossadd/target/' + br, VIEWS.mb_grossadd);
    state.branch = br0; check('grossadd/target/' + br + '/branch', VIEWS.mb_grossadd); state.kec = mc0; check('grossadd/target/' + br + '/mc', VIEWS.mb_grossadd); }
  state.gaBrand = 'all'; state.gaTab = 'ringkasan'; state.branch = ''; state.kec = ''; }
// GA target in the Overall Performance scorecard and Daily GA Trend (filters on and off)
{ const mc1 = Object.keys(global.GA_FEED.metadata.mc_info)[0], br1 = global.GA_FEED.metadata.mc_info[mc1].br;
  state.view = 'mb_overall'; state.branch = ''; state.kec = ''; check('overall/ga-target/all', VIEWS.mb_overall); state.branch = br1; check('overall/ga-target/branch', VIEWS.mb_overall); state.kec = mc1; check('overall/ga-target/mc', VIEWS.mb_overall);
  state.view = 'mb_gatrend'; state.gaBasis = 'outlet'; state.gtDay = 8; check('gatrend/target/mc/D8', VIEWS.mb_gatrend); state.gaBasis = 'site'; check('gatrend/target/site/mc', VIEWS.mb_gatrend); state.gaBasis = 'outlet'; state.gtDay = 0; state.branch = ''; state.kec = ''; }
  { const mcS = Object.keys(global.GA_FEED.metadata.mc_info)[0], brS = global.GA_FEED.metadata.mc_info[mcS].br; state.view = 'mb_grossadd'; state.gaTab = 'ringkasan'; state.gaBasis = 'site'; for (const br of ['all', 'IM3', '3ID']) { state.gaBrand = br; for (const so of ['x', 'i']) { state.gtSort = so; state.branch = ''; state.kec = ''; check('grossadd/sitegeo/' + br + '/' + so, VIEWS.mb_grossadd); for (const k of [1, 2, 3, 4, 5]) { const e = app.ovEntry('gl|' + k); if (!e || !e.rows || !e.rows.length || !e.cols || e.rows.length > 20) { failures++; console.log('✗ site location popup gl|' + k + ' ' + br); } } state.branch = brS; check('grossadd/sitegeo/' + br + '/' + so + '/branch', VIEWS.mb_grossadd); state.kec = mcS; check('grossadd/sitegeo/' + br + '/' + so + '/mc', VIEWS.mb_grossadd); } } state.gaBasis = 'outlet'; state.gtSort = 'x'; state.gaBrand = 'all'; state.branch = ''; state.kec = ''; }
state.view = 'mb_ringkasan'; state.rkTab = 'demand'; check('ringkasan/demand', VIEWS.mb_ringkasan); for (const tb of ['ringkasan', 'dse', 'outlet', 'harian', 'slab']) { state.rkTab = 'grossadd'; state.gaTab = tb; check('ringkasan/grossadd/' + tb, VIEWS.mb_ringkasan); } state.gaTab = 'ringkasan';
for (const sb of ['growth', 'slab', 'aktif', 'inaktif']) { state.view = 'mb_ringkasan'; state.rkTab = 'uar'; state.uarSub = sb; state.uarTab = 'sp'; check('ringkasan/uar/' + sb, VIEWS.mb_ringkasan); }
state.rkTab = 'dse'; state.uarSub = 'growth'; state.view = 'mb_uar';
for (const src of ['PJP', 'NON', 'KAM', 'NONE']) for (const tb of ['sp', 'spi']) { state.view = 'mb_uar'; state.uarTab = tb; state.uarSrc = src; state.uarSub = 'growth'; check('uar/' + tb + '/src=' + src, VIEWS.mb_uar); state.uarSub = 'slab'; check('uar/' + tb + '/slab/src=' + src, VIEWS.mb_uar); }
state.uarSrc = 'all'; state.uarSub = 'growth'; state.uarTab = 'sp';
for (const vc of ['value', 'zero', 'all']) { state.uarTab = 'vc'; state.uarVc = vc; check('uar/vc/' + vc, VIEWS.mb_uar); }
state.uarCollapsed = { BEKASI: true }; state.uarTab = 'sp'; check('uar/collapsed', VIEWS.mb_uar); state.uarCollapsed = {};
for (const tb of ['ringkasan', 'dse', 'harian', 'pengecualian']) { state.view = 'cfg_pjp'; state.pmTab = tb; state.branch = ''; state.hoa = ''; state.kec = ''; state.dse = ''; check('cfg_pjp/' + tb, VIEWS.cfg_pjp); state.branch = fb.branch; check('cfg_pjp/' + tb + '/branch', VIEWS.cfg_pjp); state.kec = fm.micro_cluster; state.branch = fm.branch; check('cfg_pjp/' + tb + '/mc', VIEWS.cfg_pjp); state.branch = ''; state.kec = ''; }
for (const doc of ['opp', 'pop']) { state.view = 'mb_ringkasan'; state.rkTab = 'print'; state.prDoc = doc; state.kec = ''; check('print/' + doc + '/all', VIEWS.mb_ringkasan); state.kec = Object.keys(global.PENJUALAN_FEED.metadata.mc_info)[0]; check('print/' + doc + '/mc', VIEWS.mb_ringkasan); state.kec = ''; }
for (const dt of ['2026-10-12', '2026-10-15', '2026-10-18', '']) { state.prDoc = 'pjp'; state.prDate = dt; state.kec = Object.keys(global.PENJUALAN_FEED.metadata.mc_info)[0]; check('print/pjp/' + (dt || 'kosong') + '/mc', VIEWS.mb_ringkasan); state.kec = ''; }
state.prMode = 'print'; state.kec = Object.keys(global.PENJUALAN_FEED.metadata.mc_info)[0]; check('print/pjp/print-mode/mc', VIEWS.mb_ringkasan); state.kec = ''; state.prMode = 'preview';
state.prDate = '2026-10-15'; check('print/pjp/all', VIEWS.mb_ringkasan); state.prDoc = 'opp'; state.rkTab = 'dse';
state.pmTab = 'harian'; for (const dt of ['2026-10-12', '2026-10-16', '2026-10-18', '']) { state.pmDate = dt; check('cfg_pjp/harian/' + (dt || 'kosong'), VIEWS.cfg_pjp); } state.pmDate = '2026-10-15'; state.pmTab = 'ringkasan';
for (const tb of ['ringkasan', 'dse', 'rebalancing']) for (const bs of ['prorata', 'full']) { state.view = 'cfg_target'; state.cfTab = tb; state.cfBasis = bs; state.cfPage = 1; check('cfg_target/' + tb + '/' + bs, VIEWS.cfg_target); }
state.cfBasis = 'prorata'; state.cfCollapsed = { BEKASI: true }; state.cfTab = 'ringkasan'; check('cfg_target/collapsed', VIEWS.cfg_target); state.cfCollapsed = {};
state.branch = fb.branch; for (const tb of ['ringkasan', 'dse', 'rebalancing']) { state.cfTab = tb; check('cfg_target/' + tb + '/branch', VIEWS.cfg_target); }
state.kec = fm.micro_cluster; state.branch = fm.branch; for (const tb of ['ringkasan', 'dse']) { state.cfTab = tb; check('cfg_target/' + tb + '/mc', VIEWS.cfg_target); }
state.branch = ''; state.kec = ''; state.cfTab = 'ringkasan';
for (const gb of ['none', 'area', 'mc', 'dso', 'area_mc']) for (const all of ['open', 'close']) { state.view = 'mb_ringkasan'; state.rkTab = 'dse'; state.dkGroupBy = gb; state.dkAll = all; state.dkTog = {}; check('dse-productivity/group=' + gb + '/' + all, VIEWS.mb_ringkasan); }
for (const col of ['name', 'mc', 'osaAmt', 'osaAch', 'sp', 'spAch', 'uar', 'ec', 'comp', 'total', 'final']) for (const dir of ['asc', 'desc']) { state.dkGroupBy = 'area_mc'; state.dkAll = 'open'; state.dkSortCol = col; state.dkSortDir = dir; check('dse-productivity/sort=' + col + '/' + dir, VIEWS.mb_ringkasan); }
state.dkSortCol = 'final'; state.dkSortDir = 'desc';
for (const gb of ['none', 'mc']) { state.dkGroupBy = gb; state.dkFilters = [{ k: 'osaAmt', op: 'ge', a: 1e6 }, { k: 'sp', op: 'bt', a: 10, b: 5000 }, { k: 'ec', op: 'le', a: 0.9 }, { k: 'name', op: 'ct', s: 'a' }]; state.dkSearch = 'mc'; check('dse-productivity/filters/' + gb, VIEWS.mb_ringkasan); }
state.dkFilters = [{ k: 'final', op: 'ge', a: 1e12 }]; check('dse-productivity/filters/empty', VIEWS.mb_ringkasan);
state.dkFilters = []; state.dkSearch = ''; state.dkAll = null; state.dkTog = {}; state.dkGroupBy = 'area_mc';
for (const basis of ['outlet', 'site']) for (const tb of ['ringkasan', 'dse', 'outlet', 'harian', 'slab']) for (const br of ['all', 'IM3', '3ID']) { state.view = 'mb_ringkasan'; state.rkTab = 'grossadd'; state.gaBasis = basis; state.gaTab = tb; state.gaBrand = br; check('ga2/' + basis + '/' + tb + '/' + br, VIEWS.mb_ringkasan); }
{ const mc0 = Object.keys(global.PENJUALAN_FEED.metadata.mc_info)[0]; state.kec = mc0; state.gaBasis = 'site'; state.gaTab = 'ringkasan'; state.gaBrand = 'all'; check('ga2/site/mc', VIEWS.mb_ringkasan); state.gaTab = 'slab'; check('ga2/site/slab/mc', VIEWS.mb_ringkasan); state.kec = ''; state.gaBasis = 'outlet'; state.gaTab = 'ringkasan'; }
{ const mi = global.PENJUALAN_FEED.metadata.mc_info, mc0 = Object.keys(mi)[0], br0 = mi[mc0].br;
  for (const [br, kec] of [['', ''], [br0, ''], [br0, mc0]]) for (const cat of ['all', 'SP', 'VCF']) for (const mode of ['val', 'ach']) for (const met of ['pjp', 'ec']) { state.view = 'mb_overall'; state.branch = br; state.kec = kec; state.pjCat = cat; state.pjHeatMode = mode; state.pjpMetric = met; check('overall/heat/' + (kec || br || 'all') + '/' + cat + '/' + mode + '/' + met, VIEWS.mb_overall); }
  state.view = 'mb_pjp'; state.pjpTab = 'heat'; state.pjpMetric = 'ec'; check('mb_pjp/heat/ec', VIEWS.mb_pjp); state.pjpMetric = 'pjp'; state.pjHeatMode = 'val'; state.pjCat = 'all'; state.branch = ''; state.kec = ''; }
for (const eb of ['ringkasan', 'zero', 'slab', 'site', 'detail']) { state.view = 'mb_ringkasan'; state.rkTab = 'endbal'; state.ebTab = eb; check('mb_ringkasan/endbal/' + eb, VIEWS.mb_ringkasan); }
state.ebTab = 'ringkasan'; state.rkTab = 'dse';
{ const kd = (global.DSE_KPI_FEED && global.DSE_KPI_FEED.dses.find(r => r.n && r.n !== '0')); if (kd) { state.dse = String(kd.n).toUpperCase(); state.branch = kd.br; state.hoa = kd.hoa; state.kec = kd.mc;
  state.pjDse = state.dse; state.poDse = state.dse; state.visitsDse = kd.pid || null;
  state.view = 'mb_ringkasan'; for (const tb of ['dse', 'pjp', 'jual', 'uar', 'endbal', 'demand', 'grossadd', 'peta']) { state.rkTab = tb; check('header-dse/' + tb, VIEWS.mb_ringkasan); }
  state.view = 'mb_endbal'; check('header-dse/endbal-menu', VIEWS.mb_endbal); state.dse = ''; state.pjDse = null; state.poDse = null; state.visitsDse = null; state.branch = ''; state.hoa = ''; state.kec = ''; state.rkTab = 'dse'; } }
state.view = 'mb_ringkasan'; for (const sec of ['visit', 'sitev', 'sitega', 'gasp', 'saldo', 'endbal', 'peta']) for (const sg of ['all', 'both', 'noga', 'nosp']) for (const eb of ['outlet', 'site']) { state.rkTab = 'opp'; state.opdSec = sec; state.opdSeg = sg; state.opdEb = eb; check('rk/opportunity/' + sec + '/' + sg + '/' + eb, VIEWS.mb_ringkasan); }
{ const kd = (global.DSE_KPI_FEED && global.DSE_KPI_FEED.dses.find(r => r.n && r.n !== '0')); state.rkTab = 'print'; check('rk/print/all', VIEWS.mb_ringkasan); if (kd) { state.branch = kd.br; state.kec = kd.mc; check('rk/print/mc', VIEWS.mb_ringkasan); state.dse = String(kd.n).toUpperCase(); check('rk/print/dse', VIEWS.mb_ringkasan); state.rkTab = 'opp'; for (const sec of ['visit', 'endbal']) { state.opdSec = sec; check('rk/opportunity/dse/' + sec, VIEWS.mb_ringkasan); } state.dse = ''; state.branch = ''; state.kec = ''; } }
state.rkTab = 'dse'; state.opdSec = 'visit'; state.opdSeg = 'all'; state.opdEb = 'outlet';
state.view = 'mb_ringkasan'; for (const pr of ['uar', 'rabu', 'kotkab']) { state.rkTab = 'program'; state.opProgram = pr; check('rk/program/' + pr, VIEWS.mb_ringkasan); } state.opProgram = 'uar';
state.rkTab = 'peta'; check('rk/peta-redirect', VIEWS.mb_ringkasan); state.rkTab = 'opp'; state.opdSec = 'peta'; state.opdLayers = { nv: true, nvs: true, sga: true, gasp: true, sal: true, ebn: true, ebl: true, ebs: true, heat: true }; check('rk/opportunity/map-all-layers', VIEWS.mb_ringkasan); state.opdLayers = {}; state.rkTab = 'dse'; state.opdSec = 'visit';
for (const sp of ['target', 'policy']) { state.dkSp = sp; state.view = 'mb_ringkasan'; state.rkTab = 'dse'; check('dse-productivity/sp=' + sp, VIEWS.mb_ringkasan); }
state.dkSp = 'target';
for (const sv of ['on', 'off']) { state.dkSpi = sv; state.view = 'mb_ringkasan'; state.rkTab = 'dse'; check('dse-productivity/spi=' + sv, VIEWS.mb_ringkasan); state.view = 'cfg_target'; check('target-setting/spi=' + sv, VIEWS.cfg_target); state.view = 'mb_overall'; check('overall/spi=' + sv, VIEWS.mb_overall); }
state.dkSpi = 'on';
{ const mcp = Object.keys(global.PENJUALAN_FEED.metadata.mc_info)[0], br0 = global.PENJUALAN_FEED.metadata.mc_info[mcp].br, mc0 = mcp;
for (const tb of ['partner', 'alokasi']) for (const br of ['IM3', '3ID']) { state.view = 'mb_partner'; state.ptTab = tb; state.ptBrand = br; state.branch = ''; state.kec = ''; check('partner/' + tb + '/' + br + '/all', VIEWS.mb_partner); state.branch = br0; check('partner/' + tb + '/' + br + '/branch', VIEWS.mb_partner); state.kec = mc0; check('partner/' + tb + '/' + br + '/mc', VIEWS.mb_partner); state.branch = ''; state.kec = ''; } }
state.ptTab = 'partner'; state.ptBrand = 'IM3';
{ const mcp = Object.keys(global.PENJUALAN_FEED.metadata.mc_info)[0], br0 = global.PENJUALAN_FEED.metadata.mc_info[mcp].br;
for (const br of ['IM3', '3ID']) for (const sv of ['on', 'off']) { state.view = 'mb_partner_perf'; state.ppBrand = br; state.dkSpi = sv; state.branch = ''; state.kec = ''; check('partner-perf/' + br + '/spi=' + sv + '/all', VIEWS.mb_partner_perf); state.branch = br0; check('partner-perf/' + br + '/spi=' + sv + '/branch', VIEWS.mb_partner_perf); state.kec = mcp; check('partner-perf/' + br + '/spi=' + sv + '/mc', VIEWS.mb_partner_perf); state.branch = ''; state.kec = ''; } }
state.ppBrand = 'IM3'; state.dkSpi = 'on';
{ const mcp = Object.keys(global.PENJUALAN_FEED.metadata.mc_info)[0], br0 = global.PENJUALAN_FEED.metadata.mc_info[mcp].br; state.view = 'mb_overall'; state.branch = br0; state.kec = mcp; state.dse = '';
  const h = VIEWS.mb_overall(); for (const k of ['h_zero', 'h_sal0', 'h_zall']) { const e = app.ovEntry(k); if (!e || !e.rows) { console.log('✗ overall popup ' + k + ' missing'); process.exitCode = 1; } else console.log('✓ overall popup ' + k + ' ' + e.rows.length + ' rows'); }
  state.branch = ''; state.kec = ''; }
for (const g of ['dist_mc', 'dist', 'area_mc', 'mc', 'none']) { state.view = 'mb_partner_perf'; state.ppGroup = g; check('partner-perf/group=' + g, VIEWS.mb_partner_perf); }
state.ppGroup = 'dist_mc';
for (const tb of ['ringkasan', 'zero', 'slab', 'site', 'detail']) for (const bs of ['stock', 'all']) { state.view = 'mb_endbal'; state.ebTab = tb; state.ebBasis = bs; state.ebPage = 1; check('endbal/' + tb + '/' + bs, VIEWS.mb_endbal); }
state.ebBasis = 'stock';
for (const sg of ['all', 'demand', 'sep', 'dormant']) { state.ebTab = 'zero'; state.ebSeg = sg; check('endbal/zero/seg=' + sg, VIEWS.mb_endbal); }
state.ebSeg = 'all';
state.branch = fb.branch; for (const tb of ['ringkasan', 'zero', 'slab', 'site', 'detail']) { state.ebTab = tb; check('endbal/' + tb + '/branch', VIEWS.mb_endbal); }
state.kec = fm.micro_cluster; state.branch = fm.branch; for (const tb of ['ringkasan', 'slab', 'detail']) { state.ebTab = tb; check('endbal/' + tb + '/mc', VIEWS.mb_endbal); }
{ const eo = (global.ENDBAL_FEED && global.ENDBAL_FEED.outlets.find(o => o.m === fm.micro_cluster)); if (eo) { state.ebOpen = {}; state.ebOpen[eo.m + '||' + eo.d] = true; state.ebTab = 'detail'; check('endbal/detail/open-dse', VIEWS.mb_endbal); state.ebOpen = {}; } }
state.ebTab = 'site'; { const so = global.ENDBAL_FEED.outlets.find(o => o.s && o.m === fm.micro_cluster); if (so) { state.ebSite = so.s + '::' + so.m; check('endbal/site/open', VIEWS.mb_endbal); state.ebSite = null; } }
state.branch = ''; state.kec = ''; state.ebTab = 'ringkasan'; state.ebPage = 1;
// Entity-day heatmap basis (23 Okt 2026): both heatmaps render at every level in every cell view on the entity basis, and the entity rows add up to the feed
{ const F = global.dseVisitsFeed, EN = F.regional_summary.entity; state.pjpBasis = 'entity'; state.visitsBrandFilter = 'all'; state.branch = ''; state.kec = ''; state.visitsDse = null;
  for (const mt of ['pjp', 'adhoc', 'total']) for (const lv of ['area', 'mc', 'dse', 'outlet']) {
    state.pjpMetric = mt; state.visitsLevel = lv; state.view = 'visits'; state.visitsSubView = 'heat'; let h = ''; check('pjp-heat-entity/visits/' + mt + '/' + lv, () => (h = VIEWS.visits()));
    if (!/Entity-day \(Hybrid = 1\)/.test(h)) { failures++; console.log('✗ entity basis button missing at ' + lv); }
    state.view = 'mb_pjp'; check('pjp-heat-entity/mb_pjp/' + mt + '/' + lv, () => VIEWS.mb_pjp()); }
  const sumA = F.branches.reduce((a, b) => a + b.daily.reduce((x, c) => x + (c[11] || 0), 0), 0), sumE = F.branches.reduce((a, b) => a + b.entity_planned, 0);
  if (sumA !== EN.entity_planned || sumE !== EN.entity_planned) { failures++; console.log('✗ entity daily cells ' + sumA + ' / rows ' + sumE + ' ≠ regional ' + EN.entity_planned); } else console.log('✓ entity heatmap cells'.padEnd(32) + String(sumA).padStart(9) + ' entity-days = regional');
  state.pjpBasis = 'stop'; state.pjpMetric = 'pjp'; state.visitsLevel = 'auto'; }
// DSE catalogue (23 Okt 2026): the DSE table shows master logins under the name and PROMOTOR TOKO for operators outside the master
{ state.view = 'visits'; state.visitsSubView = 'dse'; state.visitsLevel = 'dse'; state.branch = ''; state.kec = ''; state.visitsDse = null; state.visitsBrandFilter = 'all'; state.visitsSearch = 'a'; let h = ''; check('dse-catalogue/visits-dse', () => (h = VIEWS.visits()));
  if (!/class="dse-login"/.test(h) || !/PROMOTOR TOKO/.test(h)) { failures++; console.log('✗ DSE table lacks master logins or PROMOTOR TOKO'); } else console.log('✓ dse catalogue in DSE table'.padEnd(32));
  state.visitsSearch = ''; state.visitsLevel = 'auto'; state.visitsSubView = 'heat'; }
// Entity / brand flag (23 Okt 2026): Data Outlet brand filter and panel, entity-day line in the PJP scorecards
{ for (const bf of ['', 'HYBRID', 'IM3_ONLY', '3ID_ONLY']) { state.view = 'territory'; state.terrSubView = 'outlets'; state.terrBrand = bf; let h = ''; check('territory/brand=' + (bf || 'all'), () => (h = VIEWS.territory())); if (!/Jenis brand outlet/.test(h)) { failures++; console.log('✗ territory brand panel missing'); } }
  state.terrBrand = '';
  const mh = global.TERRITORY_FEED.outlets, cnt = { HYBRID: 0, IM3_ONLY: 0, '3ID_ONLY': 0 }; mh.forEach(o => { if (cnt[o.brand_flag] != null) cnt[o.brand_flag]++; });
  if (!(cnt.HYBRID > 0 && cnt.HYBRID + cnt.IM3_ONLY + cnt['3ID_ONLY'] >= mh.length - 3)) { failures++; console.log('✗ territory feed brand_flag counts ' + JSON.stringify(cnt)); } else console.log('✓ brand flag counts'.padEnd(32) + JSON.stringify(cnt));
  state.view = 'mb_pjp'; state.visitsBrandFilter = 'all'; state.branch = ''; state.kec = ''; state.visitsDse = null; state.pjpTab = 'heat'; state.visitsLevel = 'auto';
  let hv = ''; state.branch = global.TERRITORY_FEED.outlets[0].branch; check('entity-line/visits', () => { state.view = 'visits'; state.visitsSubView = 'heat'; return (hv = VIEWS.visits()); }); state.view = 'mb_pjp'; state.branch = '';
  if (!/Per entity-day/.test(hv)) { failures++; console.log('✗ visits scorecard lacks the entity-day line'); } }
// PJP heatmap P / A / T split (23 Okt 2026): every cell view renders at every level in both heatmaps, and the feed adds up (T = P + ad-hoc: regional ad-hoc = sum of the daily timeline = sum of areas)
{ const F = global.dseVisitsFeed, rs = F.regional_summary.adhoc_visits_no_beatplan, tl = F.daily_timeline.reduce((a, d) => a + (d.adhoc || 0), 0), br = F.branches.reduce((a, b) => a + (b.adhoc_visits || 0), 0);
  if (!(rs > 0) || rs !== tl || rs !== br) { failures++; console.log('✗ pjp adhoc totals regional ' + rs + ' timeline ' + tl + ' areas ' + br); } else console.log('✓ pjp adhoc totals'.padEnd(32) + String(rs).padStart(9) + ' ad-hoc visits = timeline = areas');
  for (const mt of ['pjp', 'adhoc', 'total', 'ec']) for (const lv of ['area', 'mc', 'dse', 'outlet']) {
    state.pjpMetric = mt; state.visitsLevel = lv; state.visitsDse = null; state.branch = ''; state.kec = ''; state.visitsBrandFilter = 'all';
    let h = ''; state.view = 'visits'; state.visitsSubView = 'heat'; check('pjp-heat-split/visits/' + mt + '/' + lv, () => (h = VIEWS.visits()));
    if (!/Adhoc \(A\)/.test(h)) { failures++; console.log('✗ visits heatmap lacks P / A / T columns at ' + lv); }
    state.view = 'mb_pjp'; check('pjp-heat-split/mb_pjp/' + mt + '/' + lv, () => VIEWS.mb_pjp());
  }
  state.pjpMetric = 'pjp'; state.visitsLevel = 'auto'; state.visitsBrandFilter = 'all'; }
// END BALANCE clickable counts (popup keys 'eb|...'): every key resolves, carries the visit / VCI columns and no undefined / NaN, and the popup row count equals the count printed in the cell
{ const fm0 = global.TERRITORY_FEED.outlets[0]; let nCells = 0, nKeys = 0;
  const modes = [['all', '', ''], ['branch', fm0.branch, ''], ['mc', fm0.branch, fm0.micro_cluster]];
  for (const [mn, br, mc] of modes) for (const tb of ['ringkasan', 'zero', 'slab', 'site', 'detail']) {
    state.view = 'mb_endbal'; state.ebTab = tb; state.ebBasis = 'stock'; state.ebSeg = 'all'; state.ebPage = 1; state.branch = br; state.kec = mc; state.ebOpen = {}; state.ebSite = null;
    if (tb === 'detail') { const eo = global.ENDBAL_FEED.outlets.find(o => !mc || o.m === mc); if (eo) state.ebOpen[eo.m + '||' + eo.d] = true; }
    let html = ''; check('endbal-popup/' + mn + '/' + tb, () => (html = VIEWS.mb_endbal()));
    const keys = [...new Set([...html.matchAll(/data-ov="(eb\|[^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&')))];
    if (!keys.length && tb !== 'detail') { failures++; console.log('✗ no endbal popup keys ' + mn + '/' + tb); }
    for (const k of keys) { const e = app.ovEntry(k); nKeys++; if (!e || !e.rows || !/Last visit/.test(e.cols.join('|')) || !/Voucher Injection MTD/.test(e.cols.join('|'))) { failures++; console.log('✗ endbal popup ' + k); continue; } if (/undefined|NaN/.test(app.ovText(e))) { failures++; console.log('✗ endbal popup undefined/NaN ' + k); } if (e.rows.some(r => r.length !== e.cols.length)) { failures++; console.log('✗ endbal popup row width ' + k); } }
    for (const m of html.matchAll(/data-ov="(eb\|[^"]+)"[^>]*>\s*(?:<[^>]+>)*([\d.,]+)/g)) { const k = m[1].replace(/&amp;/g, '&'), e = app.ovEntry(k), shown = parseInt(m[2].replace(/[.,]/g, ''), 10); if (!e) continue; nCells++; if (e.rows.length !== shown) { failures++; console.log('✗ endbal popup rows ' + e.rows.length + ' != cell ' + shown + ' ' + k); } }
  }
  state.branch = ''; state.kec = ''; state.ebTab = 'ringkasan'; state.ebOpen = {};
  console.log((nCells && nKeys ? '✓ ' : '✗ ') + 'endbal popups'.padEnd(32) + String(nKeys).padStart(9) + ' keys resolved, ' + nCells + ' cell counts = popup rows'); if (!nCells || !nKeys) failures++; }
for (const tb of ['dse', 'pjp', 'jual', 'demand', 'peta']) { state.view = 'mb_ringkasan'; state.rkTab = tb; check('mb_ringkasan/tab=' + tb, VIEWS.mb_ringkasan); }
for (const by of ['nilai', 'outlet', 'qty']) for (const cat of ['all', 'SP', 'VCF', 'SALMO']) for (const br of ['all', 'IM3']) { state.view = 'mb_penjualan'; state.pjTab = 'produk'; state.pjProdView = 'top'; state.pjTopBy = by; state.pjCat = cat; state.pjBrand = br; check('penjualan/produk/top/' + by + '/' + cat + '/' + br, VIEWS.mb_penjualan); }
for (const br of ['IM3', '3ID']) { const o0 = global.PENJUALAN_FEED.outlets.find(o => o.b === br && o.p && Object.keys(o.p).length); state.view = 'mb_penjualan'; state.pjTab = 'produk'; state.pjProdView = 'matrix'; state.pjMxBrand = br; state.pjMxPage = 1; state.pjMxSel = null; check('penjualan/produk/matrix/' + br, VIEWS.mb_penjualan); state.pjMxSel = o0 ? o0.k : null; check('penjualan/produk/matrix/' + br + '/selected', VIEWS.mb_penjualan); state.pjMxSel = null; state.pjMxMcAll = true; check('penjualan/produk/matrix/' + br + '/mc-open', VIEWS.mb_penjualan); state.pjMxAreaClosed = { BEKASI: true }; check('penjualan/produk/matrix/' + br + '/area-closed', VIEWS.mb_penjualan); state.pjMxAreaClosed = {}; for (const sb of ['fm', 'lm', 'mtd', 'pr']) { state.pjMxSlab = sb; check('penjualan/produk/matrix/' + br + '/slab-' + sb, VIEWS.mb_penjualan); } state.pjMxSlab = 'fm'; state.pjMxMcAll = null; }
state.pjProdView = 'list'; state.pjTopBy = 'nilai'; state.pjCat = 'all'; state.pjBrand = 'all';
for (const pt of ['ringkasan', 'teritori', 'heat', 'slab', 'produk', 'outlet']) { state.view = 'mb_ringkasan'; state.rkTab = 'jual'; state.pjTab = pt; check('mb_ringkasan/jual/pjTab=' + pt, VIEWS.mb_ringkasan); }
state.pjTab = 'ringkasan';
state.rkTab = 'dse';
for (const b of ['prorata', 'full']) for (const o of ['q', 'all']) for (const e of ['prod', 'exec']) { state.dkBasis = b; state.dkOsa = o; state.dkEc = e; check('dse-productivity/' + b + '/' + o + '/' + e, VIEWS.mb_ringkasan); }
state.dkBasis = 'prorata'; state.dkOsa = 'q'; state.dkEc = 'prod';
for (const so of ['final', 'osa', 'sp', 'comp', 'name']) { state.dkSort = so; check('dse-productivity/sort=' + so, VIEWS.mb_ringkasan); }
state.dkSort = 'final';
state.dkOpen = {}; { const f0 = global.DSE_KPI_FEED && global.DSE_KPI_FEED.dses; if (f0) { f0.forEach(d => { state.dkOpen[d.k] = true; }); } } check('dse-productivity/details-open', VIEWS.mb_ringkasan); state.dkOpen = {};
state.branch = fb.branch; check('dse-productivity/branch(mc rows)', VIEWS.mb_ringkasan); state.kec = fm.micro_cluster; state.branch = fm.branch; check('dse-productivity/mc(dse rows)', VIEWS.mb_ringkasan); state.branch = ''; state.kec = ''; state.dkPage = 2; check('dse-productivity/page2', VIEWS.mb_ringkasan); state.dkPage = 1;
state.view = 'mb_overall'; check('mb_overall', VIEWS.mb_overall); state.branch = fm.branch; check('mb_overall/branch', VIEWS.mb_overall); state.kec = fm.micro_cluster; check('mb_overall/branch+mc', VIEWS.mb_overall); state.branch = ''; state.kec = '';
{ const kd = (global.DSE_KPI_FEED && global.DSE_KPI_FEED.dses.find(r => r.n && r.n !== '0')); if (kd) { state.view = 'mb_overall'; state.branch = kd.br; state.hoa = kd.hoa; state.kec = kd.mc; state.dse = String(kd.n).toUpperCase(); state.pjDse = state.dse; state.poDse = state.dse; state.visitsDse = kd.pid || null; check('mb_overall/dse', VIEWS.mb_overall); state.dse = ''; state.pjDse = null; state.poDse = null; state.visitsDse = null; state.branch = ''; state.hoa = ''; state.kec = ''; } }
for (const v of ['mb_ringkasan', 'mb_pjp', 'mb_penjualan', 'mb_opportunity']) { state.view = v; check(v, VIEWS[v]); }
// Performance Outlet (demand)
state.view = 'mb_performance'; state.branch = ''; state.hoa = ''; state.kec = ''; state.poDse = null; state.poBrand = 'all'; state.poCat = 'all'; state.poAdhoc = true; state.poProdView = 'list'; state.poProdCat = 'all'; state.poTopBy = 'nilai';
for (const tab of ['ringkasan', 'teritori', 'heat', 'produk', 'konsentrasi', 'outlet', 'svd']) for (const ad of [true, false]) { state.poTab = tab; state.poAdhoc = ad; check('performance/' + tab + '/adhoc=' + ad, VIEWS.mb_performance); }
state.poAdhoc = true;
for (const cat of ['SPI', 'RLD', 'VCI', 'CVM', 'PKT']) for (const tab of ['teritori', 'heat', 'outlet']) { state.poTab = tab; state.poCat = cat; check('performance/' + tab + '/cat=' + cat, VIEWS.mb_performance); }
state.poCat = 'all';
for (const view of ['list', 'top']) for (const by of ['nilai', 'outlet']) for (const pc of ['all', 'SPI', 'RLD', 'VCI', 'CVM', 'PKT']) for (const ad of [true, false]) { state.poTab = 'produk'; state.poProdView = view; state.poTopBy = by; state.poProdCat = pc; state.poAdhoc = ad; check('performance/produk/' + view + '/' + by + '/' + pc + '/adhoc=' + ad, VIEWS.mb_performance); }
state.poProdView = 'list'; state.poTopBy = 'nilai'; state.poProdCat = 'all'; state.poAdhoc = true;
{ const DF = global.DEMAND_FEED; const mc0 = Object.keys(DF.metadata.mc_info)[0]; state.branch = DF.metadata.mc_info[mc0].br;
  for (const tab of ['ringkasan', 'teritori', 'heat', 'produk', 'konsentrasi', 'outlet', 'svd']) { state.poTab = tab; check('performance/' + tab + '/branch', VIEWS.mb_performance); }
  state.kec = mc0; for (const tab of ['teritori', 'heat', 'produk', 'konsentrasi', 'svd']) { state.poTab = tab; check('performance/' + tab + '/mc', VIEWS.mb_performance); }
  const o0 = DF.outlets.find(o => o.mc === mc0 && o.tier === 'M'); if (o0) { state.poDse = o0.dse; for (const tab of ['ringkasan', 'heat', 'produk', 'konsentrasi', 'outlet']) { state.poTab = tab; check('performance/' + tab + '/dse', VIEWS.mb_performance); } }
  state.poDse = null; state.branch = ''; state.kec = ''; state.poTab = 'ringkasan'; state.poBrand = 'IM3'; check('performance/brand=IM3', VIEWS.mb_performance); state.poBrand = 'all'; }
// Opportunity: programs and zero improvement
state.view = 'mb_opportunity'; state.branch = ''; state.hoa = ''; state.kec = ''; state.pjDse = null; state.pjBrand = 'all';
for (const p of ['uar', 'rabu', 'kotkab']) { state.opTab = 'program'; state.opProgram = p; check('opportunity/' + p, VIEWS.mb_opportunity); }
state.opProgram = 'rabu'; state.opRabuBasis = 'all'; state.opRabuWeek = 0; check('opportunity/rabu/all-week0', VIEWS.mb_opportunity); state.opRabuBasis = 'fisik'; state.opRabuWeek = null;
for (const c of ['all', 'SP', 'SALMO']) { state.opTab = 'zero'; state.opZeroCat = c; check('opportunity/zero/' + c, VIEWS.mb_opportunity); }
{ const PF = global.PENJUALAN_FEED; const mcs = Object.keys(PF.metadata.mc_info); const mc0 = mcs.find(m => PF.metadata.mc_info[m].br === 'KAB BEKASI') || mcs[0];
  state.branch = PF.metadata.mc_info[mc0].br; for (const p of ['uar', 'rabu', 'kotkab']) { state.opTab = 'program'; state.opProgram = p; check('opportunity/' + p + '/branch', VIEWS.mb_opportunity); }
  state.kec = mc0; state.opTab = 'zero'; check('opportunity/zero/mc', VIEWS.mb_opportunity);
  const o0 = PF.outlets.find(o => o.mc === mc0 && o.tier === 'M'); if (o0) { state.pjDse = o0.dse; state.opTab = 'program'; state.opProgram = 'uar'; check('opportunity/uar/dse', VIEWS.mb_opportunity); }
  state.pjDse = null; state.branch = ''; state.kec = ''; state.opTab = 'program'; state.opProgram = 'uar'; }
for (const mt of ['nosellin', 'novisit', 'lowvisit']) for (const pk of ['auto', 'mc', 'kec', 'dse']) { state.view = 'mb_ringkasan'; state.mbMetric = mt; state.mbPoly = pk; check('mb_ringkasan/' + mt + '/' + pk, VIEWS.mb_ringkasan); }
state.mbMetric = 'nosellin'; state.mbPoly = 'auto';
state.kec = fm.micro_cluster; state.branch = fm.branch; state.view = 'mb_ringkasan'; check('mb_ringkasan/auto-dse-for-mc', VIEWS.mb_ringkasan); state.visitsDse = (global.dseVisitsFeed.dses[0] || {}).person_id || null; state.view = 'mb_pjp'; check('mb_pjp/dse-selected', VIEWS.mb_pjp); state.visitsDse = null; state.kec = ''; state.branch = '';
for (const lv of ['auto', 'area', 'mc', 'dse', 'outlet']) { state.view = 'mb_pjp'; state.visitsLevel = lv; state.pjpDay = null; check('mb_pjp/level=' + lv, VIEWS.mb_pjp); }
for (const dd of [0, 4, 9]) { state.view = 'mb_pjp'; state.visitsLevel = 'auto'; state.pjpDay = dd; check('mb_pjp/day=' + dd, VIEWS.mb_pjp); }
state.pjpDay = 7; state.branch = fb.branch; check('mb_pjp/day=7/filtered', VIEWS.mb_pjp); state.view = 'mb_ringkasan'; check('mb_ringkasan/filtered', VIEWS.mb_ringkasan);
state.branch = ''; state.pjpDay = null; state.visitsLevel = 'auto';
state.view = 'mb_pjp'; state.pjpTab = 'matrix'; state.mxSel = null; check('mb_pjp/tab=matrix', VIEWS.mb_pjp);
for (const m of ['s_mtd', 's_7d', 'o_mtd', 'o_3d', 'f0', 'f2', 'f8', 'f12']) { state.mxSel = { key: 'T', metric: m }; check('mb_pjp/matrix/' + m, VIEWS.mb_pjp); }
state.mxSel = { key: 'A|' + fb.branch, metric: 's_mtd' }; check('mb_pjp/matrix/area', VIEWS.mb_pjp); state.mxCollapsed = { [fb.branch]: true }; check('mb_pjp/matrix/collapsed', VIEWS.mb_pjp); state.mxCollapsed = {};
state.mxSel = { key: 'M|' + fm.micro_cluster, metric: 'o_7d' }; state.branch = fm.branch; state.kec = fm.micro_cluster; check('mb_pjp/matrix/mc-filtered', VIEWS.mb_pjp); state.mxSel = null; check('mb_pjp/matrix/dse-rows', VIEWS.mb_pjp); const dk = Object.keys(global.dseVisitsFeed ? {} : {}); state.kec = ''; check('mb_pjp/matrix/mc-rows', VIEWS.mb_pjp); state.kec = fm.micro_cluster; state.branch = ''; state.kec = ''; state.mxSel = null;
state.view = 'mb_pjp'; state.pjpTab = 'map'; check('mb_pjp/tab=map', VIEWS.mb_pjp); state.kec = fm.micro_cluster; check('mb_pjp/tab=map/mc', VIEWS.mb_pjp); state.kec = ''; state.pjpTab = 'heat';
// Dynamic labels: the header cut labels and the default PJP date must follow the feeds, not fixed text
{
  const meta = (n) => (global[n] && global[n].metadata) || {};
  const keep = [meta('PENJUALAN_FEED').cut, meta('DEMAND_FEED').cut, meta('ENDBAL_FEED').snapshot, meta('GA_FEED').cut_day, global.dseVisitsFeed.metadata.period_end];
  meta('PENJUALAN_FEED').cut = '2026-10-25'; meta('DEMAND_FEED').cut = '2026-10-24'; meta('ENDBAL_FEED').snapshot = '2026-10-23'; meta('GA_FEED').cut_day = 22; global.dseVisitsFeed.metadata.period_end = '26-Oct-2026';
  const C = app.cutByView();
  const checks = [[/25 Oct/, C.mb_penjualan], [/24 Oct/, C.mb_performance], [/23 Oct/, C.mb_endbal], [/22 Oct/, C.mb_grossadd], [/26 Oct/, C.mb_pjp], [/25 Oct.*24 Oct.*26 Oct.*22 Oct/, C.mb_overall]];
  const bad = checks.filter(([rx, txt]) => !rx.test(txt));
  if (app.defaultPjpDate() !== '2026-10-27') bad.push(['defaultPjpDate', app.defaultPjpDate()]);
  console.log(bad.length ? '✗ cut labels do not follow the feeds: ' + JSON.stringify(bad) : '✓ cut labels and default PJP date follow the feeds (simulated cut 25 Oct)');
  if (bad.length) failures++;
  meta('PENJUALAN_FEED').cut = keep[0]; meta('DEMAND_FEED').cut = keep[1]; meta('ENDBAL_FEED').snapshot = keep[2]; meta('GA_FEED').cut_day = keep[3]; global.dseVisitsFeed.metadata.period_end = keep[4];
}
console.log(failures ? `\n${failures} failure(s)` : '\nAll views rendered without errors.');
process.exit(failures ? 1 : 0);
