#!/usr/bin/env node
/* audit_scorecard.js
   Recomputes the KPIs of the Overall Performance SA/MC scorecard straight from the feeds (naive loops, no app code) and compares them with
   what the page displays, for the whole region and for a branch, an HoA and an MC. Exit code 1 on any mismatch.
   Usage: node scripts/audit_scorecard.js   (from the project root) */
const path = require('path'), root = path.resolve(__dirname, '..');
global.window = global; const noop = () => {};
const el = () => ({ innerHTML: '', textContent: '', style: {}, addEventListener: noop, querySelectorAll: () => [], querySelector: () => null, focus: noop, classList: { add: noop, remove: noop, toggle: noop }, setAttribute: noop, getAttribute: () => null, appendChild: noop, remove: noop });
global.document = { getElementById: el, querySelector: el, querySelectorAll: () => [], createElement: el, body: el(), documentElement: el(), addEventListener: noop };
for (const f of ['feed.js', 'territory_feed.js', 'jakarta_map_feed.js', 'dse_visits_feed.js', 'sellin_feed.js', 'penjualan_feed.js', 'demand_feed.js', 'dse_kpi_feed.js', 'endbal_feed.js', 'target_feed.js', 'dse_coverage.js', 'ga_feed.js', 'kro_feed.js', 'pjp_mapping_feed.js']) require(path.join(root, 'website', 'data', f));
if (typeof global.dseVisitsFeed === 'undefined') { const src = require('fs').readFileSync(path.join(root, 'website', 'data', 'dse_visits_feed.js'), 'utf8'); const m = src.match(/var dseVisitsFeed = (\{[\s\S]*\});?\s*$/); if (m) global.dseVisitsFeed = JSON.parse(m[1]); }
const app = require(path.join(root, 'website', 'app.js')); const { VIEWS, state } = app;
const V = global.dseVisitsFeed, T = global.TERRITORY_FEED, K = global.DSE_KPI_FEED, P = global.PENJUALAN_FEED, G = global.GA_FEED, E = global.ENDBAL_FEED;
const mi = P.metadata.mc_info, num = s => parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
const nm = x => String(x == null ? '' : x).trim().toUpperCase();
const none = n => { n = nm(n).replace(/\.0$/, ''); return !n || n === '0' || n.indexOf('UNASSIGNED') === 0; };

const rp = t => { const m = String(t).match(/Rp\s*([\d.,]+)\s*(T|M|Jt|Rb)?/); if (!m) return NaN; const u = { T: 1e12, M: 1e9, Jt: 1e6, Rb: 1e3 }[m[2]] || 1; return parseFloat(m[1].replace(/,/g, '')) * u; };
function displayed() {
  state.view = 'mb_overall'; const h = VIEWS.mb_overall(), out = {};
  const re = /<div class="card kpi"[^>]*data-ov="([^"]*)"[^>]*>(.*?)<div class="delta[^"]*">(.*?)<\/div><div class="note">(.*?)<\/div>/g; let x;
  const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
  while ((x = re.exec(h))) out[x[1]] = { value: strip((x[2].match(/<div class="value">(.*?)<\/div>/) || [, ''])[1]), delta: strip(x[3]), note: strip(x[4]) };
  return out;
}
let fails = 0, checks = 0;
function eq(scope, key, label, shown, truth, tol) { checks++; const ok = Math.abs(shown - truth) <= (tol || 0.5); if (!ok) { fails++; console.log('✗ [' + scope + '] ' + key + ' · ' + label + ': tampil ' + shown + ' ≠ hitung ' + truth); } }
function audit(scope) {
  const D = displayed(), inS = (br, mc, hoa) => (!state.branch || br === state.branch) && (!state.kec || mc === state.kec) && (!state.hoa || hoa === state.hoa);
  // ---- PJP (visits feed): every non-promotor operator, scope by branch / MC / HoA
  const ops = V.dses.filter(d => !d.is_promotor && inS(d.branch, d.micro_cluster, d.hoa_leader)), li = (() => { const days = V.metadata.days, miss = V.metadata.missing_days || []; for (let i = days.length - 1; i >= 0; i--) { const [dd, mm, yy] = days[i].split('-'); const dt = new Date(Date.UTC(+yy, ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(mm), +dd)); if (dt.getUTCDay() !== 0 && miss.indexOf(days[i]) < 0) return i; } return days.length - 1; })();
  const pl = ops.reduce((a, d) => a + d.planned_visits, 0), ac = ops.reduce((a, d) => a + d.actual_visits, 0), pr = ops.reduce((a, d) => a + d.productive_visits, 0);
  const dpl = ops.reduce((a, d) => a + d.daily[li][0], 0), dac = ops.reduce((a, d) => a + d.daily[li][1], 0);
  let s = D.pjp_mtd.delta.match(/([\d,]+) \/ ([\d,]+)/); eq(scope, 'pjp_mtd', 'terlaksana', num(s[1]), ac); eq(scope, 'pjp_mtd', 'rencana', num(s[2]), pl);
  s = D.pjp_d1.delta.match(/([\d,]+) \/ ([\d,]+)/); eq(scope, 'pjp_d1', 'terlaksana D-1', num(s[1]), dac); eq(scope, 'pjp_d1', 'rencana D-1', num(s[2]), dpl);
  s = D.ec_mtd.delta.match(/([\d,]+) \/ ([\d,]+)/); eq(scope, 'ec_mtd', 'produktif', num(s[1]), pr);
  const withD = ops.filter(d => d.in_master && d.daily[li][0] > 0), n100 = withD.filter(d => d.daily[li][1] >= d.daily[li][0]).length;
  s = D.dse100.delta.match(/(\d+) \/ (\d+) DSE/); eq(scope, 'dse100', 'DSE 100% D-1', num(s[1]), n100); eq(scope, 'dse100', 'DSE dengan rencana D-1', num(s[2]), withD.length);
  // DSE identity: operators in the master vs logins that are not
  const master = ops.filter(d => d.in_master).length, unm = ops.filter(d => !d.in_master).length; eq(scope, 'pjp_mtd', 'jumlah DSE terpetakan tampil', num((D.pjp_mtd.note.match(/(\d+) DSE terpetakan/) || [, 0])[1]), master); if (unm) eq(scope, 'pjp_mtd', 'login belum terpetakan tampil', num((D.pjp_mtd.note.match(/(\d+) login belum terpetakan/) || [, 0])[1]), unm);
  // ---- KPI feed (OSA / SP target)
  const kd = K.dses.filter(d => inS(d.br, d.mc, d.hoa)), osa = kd.reduce((a, d) => a + d.osa_amt, 0), osaT = kd.reduce((a, d) => a + d.osa_tgt, 0), spT = kd.reduce((a, d) => a + d.sp_tgt, 0);
  const nOsa = kd.filter(d => d.osa_tgt > 0).length; eq(scope, 'osa_fm', 'jumlah DSE', num((D.osa_fm.note.match(/(\d+) DSE/) || [, 0])[1]), nOsa);
  const days = P.metadata.mtd_month_days || 31, cut = P.metadata.cut_day;
  s = D.osa_fm.delta.match(/dari Rp ([\d.]+) M/); if (s) eq(scope, 'osa_fm', 'target FM (M)', num(s[1]), osaT / 1e9, 0.01);
  // ---- sell-in (master + adhoc outlets in scope)
  const mcOf = o => mi[o.mc] || {}, rows = P.outlets.filter(o => inS(mcOf(o).br, o.mc, mcOf(o).hoa));
  const sum = (arr, c, i) => arr.reduce((a, o) => a + ((o.c[c] || [])[i] || 0), 0), cnt = (arr, c, i) => arr.filter(o => ((o.c[c] || [])[i] || 0) > 0).length;
  const M = rows.filter(o => o.tier === 'M'), A = rows.filter(o => o.tier !== 'M');
  s = D.sp_mtd.delta.match(/vs LMTD ([\d,]+)/); eq(scope, 'sp_mtd', 'SP LMTD', num(s[1]), sum(rows, 'SP', 2));
  s = D.sp_mtd.delta.match(/^([\-+\d.]+)%/); if (s && sum(rows, 'SP', 2)) eq(scope, 'sp_mtd', 'growth %', num(s[1]), (sum(rows, 'SP', 0) / sum(rows, 'SP', 2) - 1) * 100, 0.06);
  const masterN = T.outlets.filter(t => inS(t.branch, t.micro_cluster, (mi[t.micro_cluster] || {}).hoa)).length;
  s = D.sp_uar.delta.match(/^([\d.]+)% dari ([\d,]+)/); s = D.sp_uar.delta.match(/^([\d.]+)% dari ([\d,]+) outlet master/); eq(scope, 'sp_uar', 'penyebut outlet master', num(s[2]), masterN); eq(scope, 'sp_uar', '% UAR = outlet master aktif / outlet master', num(s[1]), cnt(M, 'SP', 0) / masterN * 100, 0.06); eq(scope, 'sp_uar', 'nilai kartu = outlet master aktif', num(D.sp_uar.value), cnt(M, 'SP', 0)); eq(scope, 'sp_uar', 'LMTD outlet master', num((D.sp_uar.note.match(/LMTD ([\d,]+)/) || [, 0])[1]), cnt(M, 'SP', 2));
  s = D.sal_uar.delta.match(/^([\d.]+)% dari ([\d,]+)/); eq(scope, 'sal_uar', '% UAR SALMO = outlet master aktif / outlet master', num(s[1]), cnt(M, 'SALMO', 1) / masterN * 100, 0.06);
  // ---- OSA amount, SP target, SALMO, SP D-1 straight from the penjualan rows
  const near = (scope2, key, label, shown, truth, relTol) => { checks++; const tol = Math.max(Math.abs(truth) * (relTol || 0.006), 1); if (!(Math.abs(shown - truth) <= tol)) { fails++; console.log('✗ [' + scope2 + '] ' + key + ' · ' + label + ': tampil ' + shown + ' ≠ hitung ' + truth); } };
  near(scope, 'osa_fm', 'OSA MTD (Rp)', rp(D.osa_fm.value), osa);
  s = D.osa_mtd.delta.match(/prorata (Rp [\d.,]+ \w+) · gap (.*)$/); near(scope, 'osa_mtd', 'target pro-rata', rp(s[1]), osaT * cut / days);
  near(scope, 'sp_ach', 'target FM SP', num((D.sp_ach.note.match(/FM ([\d,]+) pcs/) || [, 0])[1]), spT, 0.001);
  s = D.sp_ach.delta.match(/^([\d.]+)% prorata/); near(scope, 'sp_ach', '% pro-rata', num(s[1]), sum(rows, 'SP', 0) / (spT * cut / days) * 100, 0.004);
  near(scope, 'sp_mtd', 'SP MTD', num(D.sp_mtd.value), sum(rows, 'SP', 0), 0.0001);
  near(scope, 'sal_mtd', 'SALMO MTD (Rp)', rp(D.sal_mtd.value), sum(rows, 'SALMO', 1), 0.006);
  s = D.sal_mtd.delta.match(/vs LMTD (Rp [\d.,]+ \w+)/); near(scope, 'sal_mtd', 'SALMO LMTD (Rp)', rp(s[1]), sum(rows, 'SALMO', 3), 0.006);
  { const dl = P.metadata.days_mtd, nsun = dl.map((d, i) => [d, i]).filter(x => new Date(x[0] + 'T00:00:00Z').getUTCDay() !== 0), w = nsun[nsun.length - 1][0], prev = nsun[nsun.length - 2][0];
    const day = (arr, cat, d, ix) => arr.reduce((a, o) => a + (((o.c[cat] || [])[10] || []).filter(e => e[0] === +d.slice(8)).reduce((p, e) => p + e[ix], 0)), 0);
    near(scope, 'sp_d1', 'SP D-1 pcs', num(D.sp_d1.value), day(rows, 'SP', w, 2), 0.0001); s = D.sp_d1.delta.match(/Δ ([+\-−]?[\d,]+)/); near(scope, 'sp_d1', 'Δ vs hari kerja sebelumnya', num(s[1].replace('−', '-')), day(rows, 'SP', w, 2) - day(rows, 'SP', prev, 2), 0.0001); }
  // ---- GA
  const gl = G.outlets.filter(r => inS(r.br, r.mc, (G.metadata.mc_info[r.mc] || {}).hoa));
  const tot = a => a.reduce((x, r) => x + (r.o ? r.o.filter((v, i) => i % 2).reduce((p, q) => p + q, 0) : 0), 0), gaCut = G.metadata.cut_day;
  const mt = gl.reduce((x, r) => { const a = r.o || []; for (let i = 0; i < a.length; i += 2) if (a[i] <= gaCut) x += a[i + 1]; return x; }, 0), lm = gl.reduce((x, r) => { const a = r.s || []; for (let i = 0; i < a.length; i += 2) if (a[i] <= gaCut) x += a[i + 1]; return x; }, 0);
  s = D.ga_mtd.delta.match(/vs LMTD ([\d,]+)/); eq(scope, 'ga_mtd', 'GA LMTD', num(s[1]), lm);
  { const ssoN = new Set(gl.filter(r => (r.o || []).some((v, i) => i % 2 === 0 && v <= gaCut)).map(r => r.k)).size; s = D.sso_mtd.delta.match(/Δ ([+\-−]?[\d,]+) vs LMTD ([\d,]+)/); const ssoL = new Set(gl.filter(r => (r.s || []).some((v, i) => i % 2 === 0 && v <= gaCut)).map(r => r.k)).size; eq(scope, 'sso_mtd', 'SSO LMTD', num(s[2]), ssoL); eq(scope, 'sso_mtd', 'Δ SSO', num(s[1].replace('−', '-')), ssoN - ssoL); const gm = new Set(G.outlets.filter(r => r.t === 'M' && inS(r.br, r.mc, (G.metadata.mc_info[r.mc] || {}).hoa)).map(r => r.k)).size; s = D.sso_d1.delta.match(/dari ([\d,]+) outlet master/); eq(scope, 'sso_d1', 'penyebut = outlet master', num(s[1]), gm); }
  s = D.ga_mtd.delta.match(/Δ ([+\-−]?[\d,]+)/); eq(scope, 'ga_mtd', 'Δ GA', num(s[1].replace('−', '-')), mt - lm);
  // ---- health: master outlets, PJP coverage only on outlets that have a DSE
  const mrows = T.outlets.filter(t => inS(t.branch, t.micro_cluster, (mi[t.micro_cluster] || {}).hoa)), withDse = mrows.filter(t => !none(t.dse_name)), lv = V.last_visit;
  const keyVis = new Set(Object.keys(lv)), nv = withDse.filter(t => !keyVis.has(t.outlet_key)).length;
  s = D.h_vis.value ? null : null;
  const hv = D.h_vis.delta.match(/belum ([\d,]+)/); eq(scope, 'h_vis', 'belum divisit (hanya outlet ber-DSE)', num(hv[1]), nv); eq(scope, 'h_vis', 'penyebut = outlet ber-DSE', num((D.h_vis.value.split('/')[1]) || 0), withDse.length);
  const sp0 = mrows.filter(t => { const o = P.outlets.find(x => x.tier === 'M' && x.k === t.outlet_key); return !(o && ((o.c.SP || [])[0] || 0) > 0); }).length;
  eq(scope, 'h_sp0', 'outlet tanpa SP MTD', num(D.h_sp0.value || D.h_sp0.delta.split(' ')[0]), sp0);
}
const probes = [['semua', {}], ['branch', { branch: Object.values(mi)[0].br }], ['hoa', { hoa: Object.values(mi)[0].hoa }]];
{ const mc = Object.keys(mi)[0]; probes.push(['mc', { branch: mi[mc].br, kec: mc }]); }
for (const [name, f] of probes) { state.branch = f.branch || ''; state.hoa = f.hoa || ''; state.kec = f.kec || ''; state.dse = ''; try { audit(name); } catch (e) { fails++; console.log('✗ [' + name + '] audit error: ' + e.message); } }
state.branch = ''; state.hoa = ''; state.kec = '';
console.log(fails ? '\n' + fails + ' dari ' + checks + ' pemeriksaan gagal' : 'Semua ' + checks + ' pemeriksaan sesuai');
process.exit(fails ? 1 : 0);
