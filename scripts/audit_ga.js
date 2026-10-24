#!/usr/bin/env node
/* audit_ga.js
   Recomputes the Gross Add page (both bases: outlet tagging and site / location) straight from website/data/ga_feed.js with naive loops and compares it with
   what the page displays: KPI cards, the per-brand growth table and the Area / MC rows of the territory table.
   Scopes: region, a branch, an MC; brand all / IM3 / 3ID; source of outlet; master only.  Exit code 1 on any mismatch.  Usage: node scripts/audit_ga.js */
const path = require('path'), root = path.resolve(__dirname, '..');
global.window = global; const noop = () => {};
const el = () => ({ innerHTML: '', textContent: '', style: {}, addEventListener: noop, querySelectorAll: () => [], querySelector: () => null, focus: noop, classList: { add: noop, remove: noop, toggle: noop }, setAttribute: noop, getAttribute: () => null, appendChild: noop, remove: noop });
global.document = { getElementById: el, querySelector: el, querySelectorAll: () => [], createElement: el, body: el(), documentElement: el(), addEventListener: noop };
for (const f of ['feed.js', 'territory_feed.js', 'jakarta_map_feed.js', 'dse_visits_feed.js', 'sellin_feed.js', 'penjualan_feed.js', 'demand_feed.js', 'dse_kpi_feed.js', 'endbal_feed.js', 'target_feed.js', 'dse_coverage.js', 'ga_feed.js', 'ga_site_feed.js', 'kro_feed.js', 'pjp_mapping_feed.js', 'dse_flags.js', 'outlet_catalogue_feed.js']) require(path.join(root, 'website', 'data', f));
if (typeof global.dseVisitsFeed === 'undefined') { const src = require('fs').readFileSync(path.join(root, 'website', 'data', 'dse_visits_feed.js'), 'utf8'); const m = src.match(/var dseVisitsFeed = (\{[\s\S]*\});?\s*$/); if (m) global.dseVisitsFeed = JSON.parse(m[1]); }
const app = require(path.join(root, 'website', 'app.js')); const { VIEWS, state } = app;
const G = global.GA_FEED, M = G.metadata, mi = M.mc_info, cut = M.cut_day, days = M.cur_days || 31;
const num = s => parseFloat(String(s).replace(/[^0-9.\-]/g, '')), strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const none = n => { n = String(n == null ? '' : n).trim().toUpperCase().replace(/\.0$/, ''); return !n || n === '0' || n.indexOf('UNASSIGNED') === 0; };
const daysOf = a => { const d = new Array(32).fill(0); for (let i = 0; a && i < a.length; i += 2) d[a[i]] += a[i + 1]; return d; };
const sum = (a, lo, hi) => { let s = 0; for (let i = lo; i <= hi; i++) s += a[i]; return s; };
let fails = 0, checks = 0;
function eq(tag, label, shown, truth, tol) { checks++; if (!(Math.abs(shown - truth) <= (tol == null ? 0.51 : tol))) { fails++; console.log('✗ [' + tag + '] ' + label + ': tampil ' + shown + ' ≠ hitung ' + truth); } }
function cards(html) {
  const out = {}, re = /<div class="card kpi">(.*?)<\/div><\/div>|<div class="card kpi"><h2 class="sect">(.*?)<\/h2><div class="value">(.*?)<\/div><div class="delta[^"]*">(.*?)<\/div><div class="note">(.*?)<\/div>/g; let x;
  const re2 = /<div class="card kpi"[^>]*><h2 class="sect">(.*?)<\/h2><div class="value">(.*?)<\/div><div class="delta[^"]*">(.*?)<\/div><div class="note">(.*?)<\/div>/g;
  while ((x = re2.exec(html))) out[strip(x[1]).toUpperCase()] = { value: strip(x[2]), delta: strip(x[3]), note: strip(x[4]) };
  return out;
}
function table(html, firstHead) {
  const t = html.split('<table').slice(1).find(x => strip((x.match(/<th[^>]*>(.*?)<\/th>/) || [, ''])[1]).toUpperCase().startsWith(firstHead)); if (!t) return null;
  const hx = t.split('</thead>')[0], hrs = hx.match(/<tr[\s\S]*?<\/tr>/g) || [], ths = r => [...r.matchAll(/<th([^>]*)>(.*?)<\/th>/g)].map(m => ({ a: m[1], t: strip(m[2]).replace(/[▲▼]/g, '').trim().toUpperCase() }));
  let head;   // positional leaf header; a two-row (period-grouped) header takes its group columns from row 2
  if (hrs.length === 2) { const r1 = ths(hrs[0]), r2 = ths(hrs[1]); let k = 0; head = []; r1.forEach(c => { const sp = /colspan="(\d+)"/.exec(c.a); if (sp) { for (let i = 0; i < +sp[1]; i++) head.push(r2[k++].t); } else head.push(c.t); }); }
  else head = ths(hx).map(c => c.t);
  const rows = (t.split('<tbody>')[1] || '').split('</tbody>')[0].split(/<tr[ >]/).slice(1).map(r => [...r.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(m => strip(m[1])));
  return { head, rows };
}
const TK = (M.target || {}).kec || [], tby = {}, tpre = {}; TK.forEach(r => { tby[r.kk] = r; (tpre[r.kec] = tpre[r.kec] || []).push(r.kk); });
const tkey = lk => { if (lk == null) return ''; const k = M.loc_keys[lk]; if (tby[k]) return k; if (!k.includes('|') && tpre[k] && tpre[k].length === 1) return tpre[k][0]; return ''; };
/* independent model of one configuration */
function model(basis, brand, sg, onlyM, inScope) {
  const by = {}, info = {};   // info: the source of outlet is read from any brand row; the location of a row is its own sheet's, IOH takes the row with more GA
  G.outlets.forEach(r => { const i = info[r.k] || (info[r.k] = { sg: '', best: null }); if (!i.sg && r.sg) i.sg = r.sg; const w = sum(daysOf(r.s), 1, 31) + sum(daysOf(r.o), 1, 31); if (!i.best || w > i.best.w || (w === i.best.w && r.b === 'IM3')) i.best = { w, r }; });
  G.outlets.forEach(r => {
    if (brand !== 'all' && r.b !== brand) return;
    const loc = brand === 'all' ? info[r.k].best.r : r;
    const o = by[r.k] || (by[r.k] = { k: r.k, t: r.t, sg: info[r.k].sg, br: r.br, mc: r.mc, lm: loc.lm || loc.mc, la: loc.la, dse: r.dse, lk: loc.lk, s: new Array(32).fill(0), o: new Array(32).fill(0) });
    const s = daysOf(r.s), c = daysOf(r.o); for (let i = 1; i <= 31; i++) { o.s[i] += s[i]; o.o[i] += c[i]; }
  });
  const list = Object.values(by).filter(o => (!onlyM || o.t === 'M') && (sg === 'all' || o.sg === sg) && inScope(o));
  const A = { n: 0, q: 0, p: 0, f: 0, u: 0, up: 0, uf: 0, um: 0, qg: 0, ad: 0, adp: 0, adf: 0, nw: 0, lp: 0, qd: 0, ud: 0, kec: {} };
  list.forEach(o => {
    const cur = sum(o.o, 1, cut), prev = sum(o.s, 1, cut), full = sum(o.s, 1, 30), m = o.t === 'M';
    if (m) A.n++; else A.qg += cur; A.q += cur; A.p += prev; A.f += full;
    if (cur > 0) { A.u++; if (m) A.um++; } if (prev > 0) A.up++; if (full > 0) A.uf++; if (cur > 0 && prev <= 0) A.nw++; if (cur <= 0 && prev > 0) A.lp++;
    for (let i = 1; i <= cut; i++) { if (o.o[i] > 0) A.ad++; if (o.s[i] > 0) A.adp++; } for (let i = 1; i <= 30; i++) if (o.s[i] > 0) A.adf++;
    if (!none(o.dse)) { A.qd += cur; if (cur > 0) A.ud++; }
    const key = tkey(o.lk); if (key) { const e = A.kec[key] || (A.kec[key] = { q: 0, p: 0 }); e.q += cur; e.p += prev; }
  });
  return { A, list };
}
const probes = [['region', {}], ['branch', { branch: Object.values(mi)[0].br }]]; { const mc = Object.keys(mi)[0]; probes.push(['mc', { branch: mi[mc].br, kec: mc }]); }
for (const basis of ['outlet', 'site']) for (const brand of ['all', 'IM3', '3ID']) for (const [pn, f] of probes) for (const [sg, onlyM] of [['all', false], ['PJP', false], ['all', true]]) {
  if (basis === 'site') continue;   // the site basis summary is now the activation-site analysis (checked in the section Site location GA below)
  const tag = basis + '/' + brand + '/' + pn + '/' + sg + (onlyM ? '/master' : '');
  state.view = 'mb_grossadd'; state.gaTab = 'ringkasan'; state.gaBasis = basis; state.gaBrand = brand; state.gaSg = sg; state.gaCover = onlyM ? 'master' : 'all'; state.branch = f.branch || ''; state.hoa = ''; state.kec = f.kec || ''; state.dse = '';
  const html = VIEWS.mb_grossadd(), C = cards(html);
  const inScope = o => basis === 'site' ? ((!state.branch || (o.la || (mi[o.lm] || {}).br || o.br) === state.branch) && (!state.kec || o.lm === state.kec)) : ((!state.branch || o.br === state.branch) && (!state.kec || o.mc === state.kec));
  const { A } = model(basis, brand, sg, onlyM, inScope), R = k => C[Object.keys(C).find(x => x.startsWith(k))];
  let c = R('GA MTD (1'); eq(tag, 'GA MTD', num(c.value), A.q); eq(tag, 'GA LMTD', num((c.delta.match(/LMTD ([\d,]+)/) || [, 0])[1]), A.p); if (A.p) eq(tag, 'growth GA %', num(c.delta.match(/^([\-+\d.]+)%/)[1]), (A.q / A.p - 1) * 100, 0.06); eq(tag, 'GA di luar master', num((c.note.match(/PJP outlet ([\d,]+) pcs/) || [, 0])[1]), A.qg);
  c = R('GA LAST FULL MONTH'); eq(tag, 'GA Last FM', num(c.value), A.f);
  c = R('GAP MTD VS LAST FM'); eq(tag, 'Gap MTD vs FM', num(c.value.replace('−', '-')), A.q - A.f); eq(tag, 'Gap LMTD vs FM', num(c.delta.match(/Sep penuh ([\-−+\d,]+)/)[1].replace('−', '-')), A.p - A.f);
  c = R('RUN-RATE HARIAN'); eq(tag, 'run-rate MTD', num(c.value), A.q / cut, 0.51); eq(tag, 'run-rate LMTD', num((c.delta.match(/LMTD ([\d,]+)/) || [, 0])[1]), A.p / cut, 0.51);
  c = R('PROYEKSI AKHIR OKTOBER'); eq(tag, 'proyeksi', num(c.value), A.q / cut * days, 0.6);
  c = R('SSO MTD (SEMUA'); eq(tag, 'SSO MTD', num(c.value), A.u); eq(tag, 'SSO LMTD', num((c.delta.match(/LMTD ([\d,]+)/) || [, 0])[1]), A.up); eq(tag, 'SSO master', num((c.note.match(/PJP ([\d,]+) =/) || [, 0])[1]), A.um); eq(tag, 'outlet master (penyebut)', num((c.note.match(/dari ([\d,]+) outlet/) || [, 0])[1]), A.n);
  c = R('RATA-RATA SSO PER HARI'); eq(tag, 'rata-rata SSO/hari', num(c.value), A.ad / cut, 0.51); eq(tag, 'rata-rata SSO/hari LMTD', num((c.delta.match(/LMTD ([\d,]+)/) || [, 0])[1]), A.adp / cut, 0.51);
  c = R('GA PER SSO ·'); if (A.u) eq(tag, 'GA per SSO', num(c.value), A.q / A.u, 0.06); eq(tag, 'SSO baru', num((c.delta.match(/([\d,]+) baru/) || [, 0])[1]), A.nw); eq(tag, 'SSO hilang', num((c.delta.match(/([\d,]+) hilang/) || [, 0])[1]), A.lp);
  if (basis === 'outlet') { c = R('GA BER-DSE'); eq(tag, 'GA ber-DSE', num(c.value), A.qd); eq(tag, 'SSO ber-DSE', num((c.delta.match(/SSO ber-DSE ([\d,]+)/) || [, 0])[1]), A.ud); }
  { const tin = r => (!state.branch || r.br === state.branch) && (!state.kec || r.mc === state.kec), tv = r => brand === 'all' ? r.IM3 + r['3ID'] : r[brand];
    const rowsT = TK.filter(tin); let T = 0, Q = 0, act = 0, prevAct = 0; const qs = [];
    rowsT.forEach(r => { const e = A.kec[r.kk] || { q: 0, p: 0 }; T += tv(r); Q += e.q; if (e.q > 0) act++; if (e.p > 0) prevAct++; qs.push(e.q); });
    // the per-kecamatan figures use the territory chosen by branch / MC through the target list; the located GA must equal the scope's GA minus outlets without kecamatan only when the scopes coincide (region)
    c = R('GA VS TARGET OKTOBER'); if (c) { eq(tag, 'target Okt', num((c.delta.match(/dari target ([\d,]+)/) || [, 0])[1]), T, 1); eq(tag, 'GA di kecamatan target', num(c.value), Q);
      const pro = T * cut / days; eq(tag, '% pro-rata', num((c.delta.match(/pro-rata (\d+)%/) || [, 0])[1]), pro ? Q / pro * 100 : 0, 0.51); eq(tag, 'target pro-rata', num((c.note.match(/pro-rata ([\d,]+)/) || [, 0])[1]), pro, 0.51); }
    c = R('PROYEKSI VS TARGET'); if (c) { eq(tag, 'proyeksi vs target', num((c.delta.match(/proyeksi ([\d,]+)/) || [, 0])[1]), Q / cut * days, 0.6); eq(tag, 'perlu per hari', num((c.note.match(/perlu ([\d,]+)\//) || [, 0])[1]), Math.max(0, T - Q) / (days - cut), 0.6); }
    c = R('GAP MTD VS LAST FM'); eq(tag, 'perlu/hari menyamai September', num((c.note.match(/= ([\d,]+)\/hari/) || [, 0])[1]), Math.max(0, A.f - A.q) / (days - cut), 0.6);
    if (basis === 'site') { c = R('KECAMATAN / SITE AKTIF'); eq(tag, 'kecamatan aktif', num(c.value.split('/')[0]), act); eq(tag, 'kecamatan total', num(c.value.split('/')[1]), rowsT.length); eq(tag, 'kecamatan aktif LMTD', num((c.delta.match(/LMTD ([\d,]+)/) || [, 0])[1]), prevAct);
      c = R('GA PER KECAMATAN AKTIF'); if (act) eq(tag, 'GA per kecamatan aktif', num(c.value), Q / act, 0.6);
      c = R('KONSENTRASI 10'); qs.sort((x, y) => y - x); if (Q) eq(tag, 'konsentrasi 10 teratas %', num(c.value), qs.slice(0, 10).reduce((x, y) => x + y, 0) / Q * 100, 0.06); } }
  // territory table: every Area / MC row against the model of that Area / MC
  const T = table(html, basis === 'site' ? 'REGION / AREA / MC' : 'REGION / AREA / MC') || table(html, 'KECAMATAN') || table(html, 'DSE');
  if (T && !f.kec) {
    const ig = T.head.indexOf('GA MTD (PCS)'), iu = T.head.indexOf('SSO MTD (SEMUA OUTLET)'), im = T.head.indexOf('OUTLET PJP');
    T.rows.forEach(r => {
      const lab = (r[0] || '').replace(/^[＋－\s]+/, ''), isArea = Object.values(mi).some(m => m.br === lab), isMc = !!mi[lab], isReg = /^REGION INNER JAKARTA/.test(lab); if (!(isArea || isMc || isReg)) return;
      const sc = o => inScope(o) && (isReg || (isArea ? (basis === 'site' ? (o.la || (mi[o.lm] || {}).br || o.br) : o.br) === lab : (basis === 'site' ? o.lm : o.mc) === lab));
      const X = model(basis, brand, sg, onlyM, sc).A; eq(tag + '/' + lab, 'tabel GA MTD', num(r[ig]), X.q); eq(tag + '/' + lab, 'tabel SSO', num(r[iu]), X.u); eq(tag + '/' + lab, 'tabel outlet master', num(r[im]), X.n);
    });
  }
}
// Harian and Slab SSO tabs (region, both bases, each brand): the daily GA adds up to GA MTD, day by day equals the feed, and the slab counts add up to the outlets in scope
for (const basis of ['outlet', 'site']) for (const brand of ['all', 'IM3', '3ID']) {
  const tag = 'tab/' + basis + '/' + brand; state.gaBasis = basis; state.gaBrand = brand; state.gaSg = 'all'; state.gaCover = 'all'; state.branch = ''; state.hoa = ''; state.kec = ''; state.dse = '';
  const { A, list } = model(basis, brand, 'all', false, () => true);
  state.gaTab = 'harian'; let html = VIEWS.mb_grossadd(); let T = table(html, 'TANGGAL');
  if (T) { const ig = T.head.indexOf('GA OKT (PCS)'), iu = T.head.indexOf('SSO OKT (SEMUA)'); let tot = 0;
    for (let d = 1; d <= cut; d++) { const r = T.rows.find(x => x[0] && x[0].startsWith(d + ' Okt')); if (!r) { checks++; fails++; console.log('✗ [' + tag + '] baris tanggal ' + d + ' tidak ada'); continue; } let q = 0, u = 0; list.forEach(o => { q += o.o[d]; if (o.o[d] > 0) u++; }); eq(tag, 'GA harian ' + d + ' Okt', num(r[ig]), q); eq(tag, 'SSO harian ' + d + ' Okt', num(r[iu]), u); tot += q; }
    eq(tag, 'jumlah harian = GA MTD', tot, A.q); }
  state.gaTab = 'slab'; html = VIEWS.mb_grossadd(); const cs = cards(html), sc = Object.keys(cs).find(x => x.startsWith('SSO (')); if (sc) eq(tag, 'slab: SSO (≥ 1 GA)', num(cs[sc].value), A.u);
  const S = table(html, basis === 'site' ? 'REGION / AREA / MC' : 'REGION / AREA / MC'); if (S) { const reg = S.rows.find(x => /^REGION INNER JAKARTA/.test((x[0] || '').replace(/^[＋－\s]+/, ''))); const ni = S.head.indexOf('OUTLET'); if (reg && ni >= 0) eq(tag, 'slab: jumlah outlet region', num(reg[ni]), list.length); }
}
state.gaTab = 'ringkasan';
// per-brand growth table (no territory filter)
state.gaBasis = 'outlet'; state.gaBrand = 'all'; state.gaSg = 'all'; state.gaCover = 'all'; state.branch = ''; state.hoa = ''; state.kec = '';
{ const T = table(VIEWS.mb_grossadd(), 'BRAND'); if (T) { const ig = T.head.indexOf('GA MTD (PCS)'), ip = T.head.indexOf('GA LMTD (PCS)'), iu = T.head.indexOf('SSO MTD (SEMUA OUTLET)'), iw = T.head.indexOf('OUTLET PJP');
  [['IM3', 'IM3'], ['3ID', '3ID'], ['IOH (IM3 + 3ID)', 'all']].forEach(([lab, br]) => { const r = T.rows.find(x => x[0] === lab); if (!r) return; const A = model('outlet', br, 'all', false, () => true).A; eq('brand-tabel/' + lab, 'GA MTD', num(r[ig]), A.q); eq('brand-tabel/' + lab, 'GA LMTD', num(r[ip]), A.p); eq('brand-tabel/' + lab, 'SSO', num(r[iu]), A.u); eq('brand-tabel/' + lab, 'outlet master', num(r[iw]), A.n); }); } }
// Daily GA Trend (mb_gatrend): every card follows the chosen basis, brand, sumber, cakupan, territory and day; the target cards exist only on the site basis
for (const basis of ['outlet', 'site']) for (const brand of ['all', 'IM3', '3ID']) for (const [pn, f] of probes) for (const [sg, onlyM] of [['all', false], ['PJP', false], ['all', true]]) for (const day of [0, 10]) {
  const tag = 'trend/' + basis + '/' + brand + '/' + pn + '/' + sg + (onlyM ? '/master' : '') + '/d' + (day || 'cut');
  Object.assign(state, { view: 'mb_gatrend', gaTab: 'ringkasan', gaBasis: basis, gaBrand: brand, gaSg: sg, gaCover: onlyM ? 'master' : 'all', branch: f.branch || '', hoa: '', kec: f.kec || '', dse: '', gtDay: day });
  const html = VIEWS.mb_gatrend(), C = cards(html), R = k => C[Object.keys(C).find(x => x.startsWith(k))], ne = day || cut;
  const inScope = o => basis === 'site' ? ((!state.branch || (o.la || (mi[o.lm] || {}).br || o.br) === state.branch) && (!state.kec || o.lm === state.kec)) : ((!state.branch || o.br === state.branch) && (!state.kec || o.mc === state.kec));
  const { A, list } = model(basis, brand, sg, onlyM, inScope), tag2 = basis === 'site' ? 'BASIS SITE' : 'BASIS OUTLET';
  let mtd = 0, lmtd = 0, dayQ = 0, w7 = 0; list.forEach(o => { mtd += sum(o.o, 1, ne); lmtd += sum(o.s, 1, ne); dayQ += o.o[ne]; w7 += sum(o.o, Math.max(1, ne - 6), ne); });
  let c = R('MTD D1'); checks++; if (!c || !/BASIS/.test(Object.keys(C).find(x => x.startsWith('MTD D1')))) { fails++; console.log('✗ [' + tag + '] kartu MTD tanpa label basis'); }
  c = R('MTD D1'); if (c) { eq(tag, 'trend MTD', num(c.value), mtd); eq(tag, 'trend LMTD', num((c.delta.match(/LMTD D1–D\d+ ([\d,]+)/) || [, 0])[1]), lmtd); }
  checks++; if (!Object.keys(C).some(x => x.includes(tag2))) { fails++; console.log('✗ [' + tag + '] label basis salah / hilang'); }
  c = R('GA D' + ne + ' ·'); if (c) eq(tag, 'trend GA hari terpilih', num(c.value), dayQ);
  c = R('RUN-RATE HARIAN'); if (c) { eq(tag, 'trend run-rate', num(c.value), mtd / ne, 0.51); eq(tag, 'trend run-rate 7 hari', num((c.note.match(/: ([\d,]+)\/hari vs/) || [, 0])[1]), w7 / Math.min(7, ne), 0.51); }
  c = R('PROYEKSI AKHIR OKTOBER ·'); if (c) eq(tag, 'trend proyeksi', num(c.value), mtd / ne * 31, 0.6);
  const hasT = Object.keys(C).some(x => x.startsWith('TARGET GA OKTOBER'));
  checks++; if (hasT !== (basis === 'site')) { fails++; console.log('✗ [' + tag + '] kartu target ' + (hasT ? 'tampil di basis outlet' : 'hilang di basis site')); }
  checks++; if (basis === 'outlet' && !/Target GA hanya untuk basis site/.test(html)) { fails++; console.log('✗ [' + tag + '] catatan "target hanya basis site" hilang'); }
  if (basis === 'site') {
    const tin = r => (!state.branch || r.br === state.branch) && (!state.kec || r.mc === state.kec), tv = r => brand === 'all' ? r.IM3 + r['3ID'] : r[brand];
    let T = 0, Q = 0; TK.filter(tin).forEach(r => { T += tv(r); }); list.forEach(o => { const k = tkey(o.lk); if (k && tin(tby[k])) Q += sum(o.o, 1, ne); });
    c = R('TARGET GA OKTOBER'); if (c) eq(tag, 'trend target Okt', num(c.value), T, 1);
    c = R('GA D1–D' + ne + ' VS TARGET'); if (c) { const pro = T * ne / days; eq(tag, 'trend GA di kecamatan target', num(c.value), Q); eq(tag, 'trend gap vs pro-rata', num((c.delta.match(/gap vs pro-rata ([\-−+\d,]+)/) || [, '0'])[1].replace('−', '-')), Q - pro, 0.6); eq(tag, 'trend % pro-rata', num((c.delta.match(/(\d+)% dari pro-rata/) || [, 0])[1]), pro ? Q / pro * 100 : 0, 0.51); }
    c = R('PROYEKSI AKHIR OKTOBER VS'); if (c) eq(tag, 'trend proyeksi vs target', num(c.note.match(/run-rate D1–D\d+ ([\d,]+)\/hari/)[1]) * days, Q / ne * days, days * 0.51);
  }
}
// the shared link of the trend page carries basis, brand, sumber, cakupan (and day)
{ for (const k of ['gaBasis', 'gaBrand', 'gaSg', 'gaCover', 'gtDay']) { checks++; if (!new RegExp("mb_gatrend: \\[[^\\]]*'" + k + "'").test(require('fs').readFileSync(path.join(root, 'website', 'app.js'), 'utf8'))) { fails++; console.log('✗ [link] RT_VIEW_TABS mb_gatrend tanpa ' + k); } } }
// Gross Add > Site location GA (basis site, GA_SITE_FEED): cards, area tables and the matrix recomputed from the feed arrays per brand and per MC
{ const SF = global.GA_SITE_FEED, vb = (v, b) => { const a = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < 6; i++) { if (b !== '3ID') a[i] += v[i]; if (b !== 'IM3') a[i] += v[6 + i]; } return a; };
  const T0 = a => a.reduce((x, y) => x + y, 0);
  for (const brand of ['all', 'IM3', '3ID']) for (const mc of ['', SF.mc[0].mc]) {
    const tag = 'site-sec/' + brand + '/' + (mc || 'region'); Object.assign(state, { view: 'mb_grossadd', gaTab: 'ringkasan', gaBasis: 'site', gaSg: 'all', gaCover: 'all', gaBrand: brand, branch: mc ? SF.mc[0].area : '', hoa: '', kec: mc, dse: '', gtSort: 'x' });
    const C2 = cards(VIEWS.mb_grossadd()), R = k => C2[Object.keys(C2).find(x => x.startsWith(k))];
    const rows = SF.mc.filter(r => !mc || r.mc === mc); let A = [0, 0, 0, 0, 0, 0]; rows.forEach(r => vb(r.v, brand).forEach((x, i) => A[i] += x));
    const tot = T0(A), ext = A[3] + A[4] + A[5];
    let tg = [0, 0, 0, 0, 0]; SF.out_mc.forEach(([m, v]) => { if (mc && m !== mc) return; for (let i = 0; i < 5; i++) { if (brand !== '3ID') tg[i] += v[i]; if (brand !== 'IM3') tg[i] += v[5 + i]; } });
    const N1 = R('GA SITE LOCATION · OVERALL'), N2 = R('GA DARI LOKASI YANG SAMA'), N3 = R('GA DARI LOKASI LAIN'), N4 = R('GA FROM NON INNER'), N5 = C2['GA TAGGING IJ DIAKTIVASI DI LUAR IJ'];
    eq(tag, 'kartu overall', num(N1.value), tot); eq(tag, 'kartu lokasi yang sama', num(N2.value), A[0]); eq(tag, 'kartu lokasi lain IJ', num(N3.value), A[1] + A[2]); eq(tag, 'kartu non IJ', num(N4.value), ext);
    eq(tag, 'overall = sama + lain + non IJ', tot, A[0] + A[1] + A[2] + ext);
    { let tgp = [0, 0, 0, 0, 0]; SF.out_mc.forEach(([m, v]) => { if (mc && m !== mc) return; for (let i = 0; i < 5; i++) { if (brand !== '3ID') tgp[i] += v[i]; if (brand !== 'IM3') tgp[i] += v[5 + i]; } }); eq(tag, 'kartu tagging IJ aktivasi luar IJ', num(N5.value), tgp[3]); }
    // popups: top 20 rows add up to at most the card and are sorted by RGU GA; the popup of card 5 sums the outflow rows
    for (const [kk, card] of [[1, tot], [2, A[0]], [3, A[1] + A[2]], [4, ext]]) { const e = app.ovEntry('gl|' + kk); checks++; if (!e || e.rows.length > 20) { fails++; console.log('✗ [' + tag + '] popup gl|' + kk + ' tidak ada / lebih dari 20 baris'); continue; } const q = e.rows.map(r => num(r[5])); eq(tag, 'popup ' + kk + ' urut GA', q.every((x, i) => i === 0 || q[i - 1] >= x) ? 1 : 0, 1); eq(tag, 'popup ' + kk + ' <= kartu', q.reduce((x, y) => x + y, 0) <= card ? 1 : 0, 1); }
    // the duplicate lower scorecard row was removed (owner, 23 Oct 2026): the five clickable cards above carry these numbers
    // kecamatan and site lists add up to the MC total
    let kt = 0, st = 0; SF.kec.forEach(r => { if (!mc || r.mc[0] === mc) kt += T0(vb(r.v, brand)); }); SF.sites.forEach(r => { if (!mc || r.mc === mc) st += T0(vb(r.v, brand)); });
    if (!mc) { eq(tag, 'jumlah kecamatan = GA di IJ', kt, tot); eq(tag, 'jumlah site = GA di IJ', st, tot); }
  }
  // the matrix of the feed sums to the rows of the file, and the IJ column equals the sites
  let mt = 0, ij = 0; Object.entries(SF.matrix).forEach(([k, v]) => { const n = v[0] + v[1]; mt += n; if (k.split('|')[1] === 'IJ') ij += n; });
  eq('site-sec', 'matriks = baris file', mt, SF.metadata.rows); eq('site-sec', 'kolom IJ matriks = GA di site', ij, SF.sites.reduce((s, r) => s + T0(vb(r.v, 'all')), 0));
  Object.assign(state, { gaBasis: 'outlet', gaBrand: 'all', branch: '', kec: '' }); }
// Gross Add redesign (24 Oct 2026): tabs per basis, heatmap, graph, category and tag formats, site-level target
{ const SF = global.GA_SITE_FEED, T0 = a => a.reduce((x, y) => x + y, 0), tabsOf = h => [...h.matchAll(/data-ga-tab="([a-z]+)"/g)].map(x => x[1]);
  const kdTot = (brand, pred) => { let q = 0; Object.entries(SF.kd).forEach(([k, v]) => { if (pred && !pred(k)) return; v.forEach((a, bi) => { if ((brand === 'IM3' && bi === 1) || (brand === '3ID' && bi === 0)) return; q += T0(a); }); }); return q; };
  const skdTot = (brand, pred) => { const o = {}; Object.entries(SF.skd).forEach(([k, d]) => { if (pred && !pred(k)) return; Object.entries(d).forEach(([sg, v]) => v.forEach((a, bi) => { if ((brand === 'IM3' && bi === 1) || (brand === '3ID' && bi === 0)) return; o[sg] = (o[sg] || 0) + T0(a); })); }); return o; };
  const regionRow = (T, col) => { if (!T) return null; const r = T.rows.find(x => /^REGION INNER JAKARTA/.test((x[0] || '').replace(/^[＋－\s]+/, ''))); const i = T.head.indexOf(col); return r && i >= 0 ? num(r[i]) : null; };
  for (const brand of ['all', 'IM3', '3ID']) {
    // outlet basis
    Object.assign(state, { view: 'mb_grossadd', gaBasis: 'outlet', gaBrand: brand, gaSg: 'all', gaCover: 'all', branch: '', hoa: '', kec: '', dse: '', gaTab: 'ringkasan', gaOutFmt: 'list', gaGraf: 'total' });
    const tag = 'design/outlet/' + brand, { A, list } = model('outlet', brand, 'all', false, () => true);
    let h = VIEWS.mb_grossadd(); checks++; if (tabsOf(h).includes('target') || !['sga', 'dse', 'outlet', 'harian', 'graf', 'slab'].every(t => tabsOf(h).includes(t))) { fails++; console.log('✗ [' + tag + '] tab outlet basis salah: ' + tabsOf(h)); }
    state.gaTab = 'harian'; h = VIEWS.mb_grossadd(); let HT = table(h, 'AREA › MC'); eq(tag, 'heatmap MTD region = GA MTD', regionRow(HT, 'GA MTD') || 0, A.q); eq(tag, 'heatmap LMTD region', regionRow(HT, 'LMTD') || 0, A.p);
    checks++; if (HT && HT.head.some(x => /KECAMATAN|TARGET/.test(x))) { fails++; console.log('✗ [' + tag + '] heatmap outlet basis memuat kecamatan / target'); }
    if (HT) { const rr = HT.rows.find(x => /^REGION INNER JAKARTA/.test((x[0] || '').replace(/^[＋－\s]+/, ''))), di = HT.head.indexOf('D1'); let ds = 0; for (let d = 0; d < cut; d++) ds += num(rr[di + d]); eq(tag, 'heatmap jumlah hari = GA MTD', ds, A.q); }
    state.gaTab = 'graf'; h = VIEWS.mb_grossadd(); const GT = table(h, 'TANGGAL'); if (GT) { const tr = GT.rows.find(x => /^TOTAL/.test(x[0])); eq(tag, 'grafik total = GA MTD', num(tr[1]), A.q); eq(tag, 'grafik segmen = total', num(tr[2]) + num(tr[3]) + num(tr[4]), A.q); }
    state.gaTab = 'outlet'; state.gaOutFmt = 'kat'; h = VIEWS.mb_grossadd(); const KT = table(h, 'KATEGORI'); if (KT) { const ig = KT.head.indexOf('GA MTD'), io = KT.head.indexOf('OUTLET'); eq(tag, 'kategori GA = GA MTD', KT.rows.slice(0, 3).reduce((a, r) => a + num(r[ig]), 0), A.q); eq(tag, 'kategori outlet = outlet di cakupan', KT.rows.slice(0, 3).reduce((a, r) => a + num(r[io]), 0), list.length); } else { checks++; fails++; console.log('✗ [' + tag + '] tabel kategori tidak ada'); }
    state.gaOutFmt = 'tag'; h = VIEWS.mb_grossadd(); const TT = table(h, 'JENIS TAG'); if (TT) { const io = TT.head.indexOf('OUTLET'), rd = TT.rows.find(r => r[1] === 'Ber-DSE'), rn = TT.rows.find(r => r[1] === 'Tanpa DSE'); eq(tag, 'tag Ber-DSE + Tanpa DSE = outlet', num(rd[io]) + num(rn[io]), list.length); } else { checks++; fails++; console.log('✗ [' + tag + '] tabel tag tidak ada'); }
    // site basis
    Object.assign(state, { gaBasis: 'site', gaTab: 'ringkasan', gaOutFmt: 'list' }); const tag2 = 'design/site/' + brand; h = VIEWS.mb_grossadd();
    checks++; if (!tabsOf(h).includes('target') || tabsOf(h).includes('dse') || tabsOf(h).includes('outlet')) { fails++; console.log('✗ [' + tag2 + '] tab site basis salah: ' + tabsOf(h)); }
    const TK = (M.target || {}).kec || [], tv = r => brand === 'all' ? r.IM3 + r['3ID'] : r[brand], Tt = TK.reduce((a, r) => a + tv(r), 0), Q = kdTot(brand);
    state.gaTab = 'target'; h = VIEWS.mb_grossadd(); const CT = cards(h), c1 = CT[Object.keys(CT).find(x => x.startsWith('TARGET GA OKTOBER'))], c2 = CT[Object.keys(CT).find(x => x.startsWith('GA MTD (1'))];
    eq(tag2, 'target Okt', num(c1.value), Tt, 1); eq(tag2, 'GA site di kecamatan target', num(c2.value), Q);
    state.gaTab = 'harian'; h = VIEWS.mb_grossadd(); HT = table(h, 'AREA › MC › KECAMATAN'); eq(tag2, 'heatmap site region = GA site', regionRow(HT, 'GA MTD') || 0, Q); eq(tag2, 'heatmap site target', regionRow(HT, 'TARGET OKT') || 0, Tt, 1);
    state.gaTab = 'graf'; h = VIEWS.mb_grossadd(); const G2 = table(h, 'TANGGAL'); if (G2) { const tr = G2.rows.find(x => /^TOTAL/.test(x[0])), sg = skdTot(brand); eq(tag2, 'grafik site total', num(tr[1]), Q); eq(tag2, 'grafik site Retail', num(tr[2]), sg.R || 0); eq(tag2, 'grafik site segmen = total', [2, 3, 4, 5, 6, 7].reduce((a, i) => a + num(tr[i]), 0), Q); }
    state.gaTab = 'sga'; h = VIEWS.mb_grossadd(); const ST = table(h, 'REGION / AREA / MC'); if (ST) { const rr = ST.rows.find(x => /^REGION INNER JAKARTA/.test((x[0] || '').replace(/^[＋－\s]+/, ''))), isite = ST.head.indexOf('SITE'); const nsite = SF.sites.filter(r => { const a = [0, 0]; r.v.forEach((x, i) => { if ((brand === 'IM3' && i >= 6) || (brand === '3ID' && i < 6)) return; a[0] += x; }); return a[0] > 0; }).length; const nz = Object.values(SF.msites).reduce((a, x) => a + x, 0) - SF.sites.filter(r => r.m && (() => { let q = 0; r.v.forEach((x, i) => { if ((brand === 'IM3' && i >= 6) || (brand === '3ID' && i < 6)) return; q += x; }); return q > 0; })()).length; eq(tag2, 'slab site: jumlah site = aktif + master tanpa GA', num(rr[isite]), nsite + Math.max(0, nz)); }
  }
  Object.assign(state, { gaBasis: 'outlet', gaBrand: 'all', gaTab: 'ringkasan', branch: '', kec: '' }); }
// Purwakarta (SUKASARI|PURWAKARTA) is not Inner Jakarta (owner, 24 Oct 2026): not in the target list, not in the site feed, not in the activation kecamatan
{ const SF = global.GA_SITE_FEED; checks += 3;
  if (TK.some(r => /PURWAKARTA/.test(r.kk))) { fails++; console.log('✗ [purwakarta] masih ada di daftar target'); }
  if (Object.keys(SF.kd).some(k => /PURWAKARTA/.test(k))) { fails++; console.log('✗ [purwakarta] masih ada di GA site per kecamatan'); }
  if (SF.kec.some(r => /PURWAKARTA/.test(r.k))) { fails++; console.log('✗ [purwakarta] masih ada di daftar kecamatan site'); } }
// site basis: kecamatan are counted once (no kecamatan-only duplicate of a kecamatan | kabupaten key)
{ const keys = M.loc_keys, full = {}; keys.forEach(k => { if (k.includes('|')) (full[k.split('|')[0]] = full[k.split('|')[0]] || []).push(k); }); const dup = keys.filter(k => !k.includes('|') && full[k] && full[k].length === 1);
  checks++; if (dup.length) { fails++; console.log('✗ [loc_keys] kecamatan tanpa kabupaten sementara ada label lengkapnya (dihitung dua kali sebagai site): ' + dup.join(', ')); } }
console.log(fails ? '\n' + fails + ' dari ' + checks + ' pemeriksaan gagal' : 'Semua ' + checks + ' pemeriksaan sesuai'); process.exit(fails ? 1 : 0);
