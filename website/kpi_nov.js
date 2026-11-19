/* KPI & Insentif November 2026 · menu mb_kpinov. Feed: data/kpi_nov_feed.js (scripts/build_kpi_nov_feed.py).
   Contract and assumptions: docs/assessments/kpi_playbook_nov_2026_assessment.md. app.js hands over its helpers through `api`.
   Scoring lives here (pure functions, also used by scripts/audit_kpi_nov.js). */
(function () {
  'use strict';

  var TABS = [['dse', '👤 KPI DSE'], ['booster', '🚀 Booster'], ['partner', '🤝 KPI HoA · DSO · Partner'], ['policy', '📘 Kebijakan & Aksi']];
  var LEVELS = [['hoa', 'HoA (Area)'], ['dso', 'DSO (MC)'], ['dsp', 'DSP (PT partner)']];

  function KF() { return typeof window !== 'undefined' ? window.KPI_NOV_FEED : null; }
  function DF() { return typeof window !== 'undefined' ? window.DSE_KPI_FEED : null; }
  function TF() { return typeof window !== 'undefined' ? window.TARGET_KPI_FEED : null; }
  function pc(v, d) { return v == null || !isFinite(v) ? 'n/a' : (v * 100).toFixed(d == null ? 1 : d) + '%'; }
  function ratio(a, b) { return b > 0 ? a / b : null; }

  /* ---- scoring (policy block of the feed) ---- */
  function slabRate(slabs, ach) {
    var rate = 0, ix = -1;
    if (ach == null) return { rate: 0, ix: -1 };
    for (var i = 0; i < slabs.length; i++) if (ach >= slabs[i].sla - 1e-9) { rate = slabs[i].rate; ix = i; }
    return { rate: rate, ix: ix };
  }
  function indexOf(list, v) { for (var i = 0; i < list.length; i++) if (v >= list[i].min - 1e-9) return list[i].x; return 0; }
  function factors(kf, opt) {
    var M = kf.metadata;
    return opt.basis === 'full' ? { s: 1, g: 1 } : { s: M.cut_day_sellin / M.month_days, g: M.cut_day_ga / M.month_days };
  }
  /* r = row of DSE_KPI_FEED, n = KPI_NOV_FEED.dses[pid]; opt = {basis, osa, spi} */
  function scoreDse(r, n, P, f, opt) {
    var D = P.dse, o = { f: f };
    var amt = opt.osa === 'all' ? r.osa_all : r.osa_amt, tgt = (opt.osa === 'all' && r.osa_tgt_src !== 'official') ? r.osa_tgt_all : r.osa_tgt;
    o.osaAmt = amt; o.osaTgt = (tgt || 0) * f.s; o.osaAch = ratio(amt, o.osaTgt);
    var s1 = slabRate(D.osa.slabs, o.osaAch); o.osaRate = s1.rate; o.osaSlab = s1.ix; o.osaInc = Math.min(D.osa.max_rp, s1.rate * amt);
    o.sp = (r.sp3_pcs || 0) + (opt.spi === false ? 0 : (r.spi_pcs || 0));
    o.spTgt = (r.sp_tgt || 0) * f.s; o.spAch = ratio(o.sp, o.spTgt);
    var s2 = slabRate(D.sp.slabs, o.spAch); o.spRate = s2.rate; o.spSlab = s2.ix; o.spInc = Math.min(D.sp.max_rp, s2.rate * o.sp);
    var g = n && n.ga ? n.ga[0] + n.ga[1] : 0;
    o.ga = g; o.gaTgt = n && n.ga_t ? n.ga_t[2] * f.g : 0; o.gaAch = n && n.ga_t && n.ga ? ratio(g, o.gaTgt) : null;
    var s3 = slabRate(D.ga.slabs, o.gaAch); o.gaRate = s3.rate; o.gaSlab = s3.ix; o.gaInc = Math.min(D.ga.max_rp, s3.rate * g);
    o.gaDbl = o.gaAch != null && o.gaAch >= D.ga.double_at - 1e-9 ? Math.min(D.ga.double_max_rp, o.gaInc) : 0;
    var C = D.compliance;
    o.sp5Std = (r.cls === 'R' ? C.sp5.standard_rural : C.sp5.standard_urban) * f.s; o.sp5 = r.sp_uar5 || 0;
    o.sp5Ach = o.sp5Std > 0 ? Math.min(C.cap, o.sp5 / o.sp5Std) : 0;
    o.mapN = n ? n.map_n : null; o.visU = n ? n.vis_u : null;
    /* owner 20 Nov 2026: Effective Call keeps the 18 Nov 2026 rule = productive visits ÷ outlets visited (executed PJP + ad-hoc) */
    o.ecNum = r.prod || 0; o.ecDen = r.actual || 0; o.ec = o.ecDen > 0 ? o.ecNum / o.ecDen : null;
    o.ecAch = o.ec == null ? null : Math.min(C.cap, o.ec / C.ec.standard);
    o.comp = o.ecAch == null ? null : C.sp5.weight * o.sp5Ach + C.ec.weight * o.ecAch;
    o.idx = o.comp == null ? null : indexOf(C.index, o.comp);
    o.total = o.osaInc + o.spInc + o.gaInc + o.gaDbl;
    o.final = o.idx == null ? null : o.total * o.idx;
    o.boost = boosterGa(n, P);
    return o;
  }
  function boosterGa(n, P) {
    var B = P.booster.ga_achiever, hy = n && n.hy, T = hy ? B.hybrid : B.single, o = { hy: !!hy };
    if (!n || n.map_n == null) { o.ok = null; o.raw = null; o.paid = null; o.held = null; return o; }
    o.nPjp = n.map_n; o.elig = n.gelig; o.share = ratio(n.gelig, n.map_n);
    o.eligGa = T.elig_ga; o.slab = n.gslab;
    o.raw = 0; for (var i = 0; i < T.tiers.length; i++) o.raw += (n.gslab[i] || 0) * T.tiers[i].rate;
    o.minOk = n.map_n >= B.min_pjp_outlets; o.ok = o.minOk && o.share >= B.min_share - 1e-9;
    o.paid = o.ok ? Math.min(B.max_rp, o.raw) : 0; o.held = o.ok ? 0 : o.raw;
    return o;
  }
  function rechargeCalc(P, act) {   /* act = [{m0, m1}] customers per outlet; used by the audit (use cases 1-3 of the slide) */
    var R = P.booster.recharge, m0 = 0, m1 = 0, active = 0;
    function rate(c, k) { for (var i = R.tiers.length - 1; i >= 0; i--) if (c >= R.tiers[i].from) return R.tiers[i][k]; return 0; }
    act.forEach(function (a) { if (a.m0 >= 5 || a.m1 >= 5) active++; m0 += rate(a.m0, 'm0'); m1 += rate(a.m1, 'm1'); });
    return { active: active, m0: m0, m1: m1, paid: active >= R.min_active_hybrid ? Math.min(R.max_rp, m0 + m1) : 0 };
  }
  function gaAchieverCalc(P, outletGa, hybrid) {   /* outletGa = GA per PJP outlet (all PJP outlets of the DSE) */
    var B = P.booster.ga_achiever, T = hybrid ? B.hybrid : B.single, slab = [0, 0, 0], elig = 0, raw = 0;
    outletGa.forEach(function (q) { if (q >= T.elig_ga) elig++; for (var i = 0; i < T.tiers.length; i++) if (q >= T.tiers[i].from && (T.tiers[i].to == null || q <= T.tiers[i].to)) { slab[i]++; raw += T.tiers[i].rate; } });
    var ok = outletGa.length >= B.min_pjp_outlets && elig / outletGa.length >= B.min_share - 1e-9;
    return { slab: slab, elig: elig, raw: raw, ok: ok, paid: ok ? Math.min(B.max_rp, raw) : 0 };
  }

  /* ---- scorecard HoA / DSO / DSP ---- */
  function scoreRows(P, level, a) {   /* a = {ga, gaT, cmp, fwaT}; returns components and partial score */
    var rows = P.scorecard.rows, kmax = level === 'dsp' ? 'dsp_max' : 'hoa_max', sc = { comps: {}, w: 0, score: 0 };
    rows.forEach(function (r) {
      if (r.hoa == null) return;
      var ach = r.k === 'ga' ? a.gaAch : (r.k === 'cmp' ? a.cmpAch : null), c = { w: r.hoa, max: r[kmax], ach: ach };
      c.pts = ach == null ? null : r.hoa * Math.min(ach, r[kmax]);
      sc.comps[r.k] = c;
      if (c.pts != null) { sc.w += r.hoa; sc.score += c.pts; }
    });
    return sc;
  }

  /* ---- data joins ---- */
  function joined() {
    var kf = KF(), df = DF(); if (!kf || !df) return null;
    return df.dses.map(function (r) { return { r: r, n: kf.dses[r.pid] || null }; });
  }
  function inScope(state, r) { return (!state.branch || r.br === state.branch) && (!state.hoa || r.hoa === state.hoa) && (!state.kec || r.mc === state.kec); }
  function optOf(state) { return { basis: state.knPro === 'full' ? 'full' : 'prorata', osa: state.dkOsa || 'all', spi: state.dkSpi !== 'off' }; }

  /* ---- views ---- */
  function nav(api, state) {
    var tab = state.knTab || 'dse';
    return '<div class="map-toolbar" style="margin-top:8px;"><div class="map-toolbar-group" role="tablist">' + TABS.map(function (t) {
      return '<button type="button" class="map-btn' + (tab === t[0] ? ' active' : '') + '" data-kn="tab:' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div></div>';
  }
  function basisBar(api, state) {
    return '<div class="map-toolbar" style="margin-top:8px;">' + api.sellinBtnGroup('Basis target', 'kn-pro', [['prorata', 'Pro-rata hari berjalan'], ['full', 'Target bulan penuh']], state.knPro === 'full' ? 'full' : 'prorata') + '</div>';
  }
  function banner(api, kf) {
    var M = kf.metadata;
    return '<p class="note" style="margin:8px 0 0;"><b>Kebijakan November 2026</b> (slide pemilik, 19 Nov 2026) · sell-in dan PJP s.d. D' + M.cut_day_sellin + ' · GA (outlet tagging) s.d. D' + M.cut_day_ga + ' dari ' + M.month_days + ' hari · ' + api.esc(api.scopeText()) + '. Aktual GA FWA, Secondary, BOSS, recharge pelanggan dan revenue prepaid region belum ada datanya dan tampil <b>n/a</b>. Asumsi: <code>docs/assessments/kpi_playbook_nov_2026_assessment.md</code>.</p>';
  }
  function tag(api, kind, text) { return api.dkTag(kind, text); }
  function achTag(api, v, hi, mid) { return v == null ? tag(api, 'none', 'n/a') : tag(api, v >= hi ? 'top' : (v >= mid ? 'ok' : (v >= mid - 0.2 ? 'warn' : 'bad')), pc(v, 0)); }
  function gapText(api, o) {   /* data-derived action: distance to the next slab of every KPI */
    var out = [];
    function next(label, ach, slabs, tgt, cur, unit, fmt) {
      if (ach == null || tgt <= 0) return;
      for (var i = 0; i < slabs.length; i++) if (ach < slabs[i].sla - 1e-9) { var need = Math.ceil(slabs[i].sla * tgt - cur); out.push(label + ' kurang ' + fmt(Math.max(need, 0)) + unit + ' ke ' + Math.round(slabs[i].sla * 100) + '%'); return; }
    }
    return { next: next, out: out };
  }
  function actions(api, o, P) {
    var g = gapText(api, o), f0 = function (v) { return api.fmtCount(v); }, rp = function (v) { return api.pjRp(v); };
    g.next('OSA', o.osaAch, P.dse.osa.slabs, o.osaTgt, o.osaAmt, '', rp);
    g.next('SP', o.spAch, P.dse.sp.slabs, o.spTgt, o.sp, ' pcs', f0);
    g.next('GA', o.gaAch, P.dse.ga.slabs, o.gaTgt, o.ga, ' GA', f0);
    if (o.idx != null && o.idx < 1) g.out.push('indeks ' + o.idx + ' memotong ' + rp(o.total - o.final));
    return g.out.length ? g.out.join(' · ') : '<span class="note">semua slab tercapai</span>';
  }

  function aggDse(list, P, f, opt) {
    var A = { n: 0, osa: 0, sp: 0, ga: 0, dbl: 0, total: 0, final: 0, idx0: 0, boost: 0, held: 0, na: 0, ga100: 0, gaAch: 0, gaTgt: 0, ecU: 0, mapN: 0 };
    list.forEach(function (x) {
      var o = x.o; A.n++; A.osa += o.osaInc; A.sp += o.spInc; A.ga += o.gaInc; A.dbl += o.gaDbl; A.total += o.total;
      if (o.final == null) A.na++; else { A.final += o.final; if (o.final === 0) A.idx0++; }
      if (o.boost.paid != null) { A.boost += o.boost.paid; A.held += o.boost.held; }
      if (o.gaAch != null && o.gaAch >= 1) A.ga100++;
      A.gaAch += o.ga; A.gaTgt += o.gaTgt; A.ecU += o.ecNum; A.mapN += o.ecDen;
    });
    return A;
  }

  function viewDse(api, state, kf, df) {
    var P = kf.policy, opt = optOf(state), f = factors(kf, opt);
    var list = joined().filter(function (x) { return inScope(state, x.r) && (!state.dse || api.dseNorm(x.r.n) === state.dse); }).map(function (x) { x.o = scoreDse(x.r, x.n, P, f, opt); return x; });
    var A = aggDse(list, P, f, opt);
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      api.kpi('DSE dalam lingkup', api.fmtCount(A.n), A.na ? api.fmtCount(A.na) + ' DSE tanpa kunjungan (kepatuhan n/a)' : 'semua punya data kepatuhan', 'up', 'Maks Rp 3,25 Jt per DSE (KPI) + Rp 500 Rb booster') +
      api.kpi('Insentif KPI sebelum indeks', api.pjRp(A.total), 'OSA ' + api.pjRp(A.osa) + ' · SP ' + api.pjRp(A.sp) + ' · GA ' + api.pjRp(A.ga) + ' + double ' + api.pjRp(A.dbl), 'up', 'tarif × aktual MTD, dibatasi maks per KPI') +
      api.kpi('Insentif KPI final', api.pjRp(A.final), A.total > 0 ? 'indeks kepatuhan memotong ' + api.pjRp(A.total - A.final) : 'belum ada insentif', A.final > 0 ? 'up' : 'down', 'total × indeks kepatuhan; ' + api.fmtCount(A.idx0) + ' DSE indeks 0') +
      api.kpi('GA aktual vs target', pc(ratio(A.gaAch, A.gaTgt)), api.fmtCount(A.gaAch) + ' GA dari target ' + api.fmtCount(Math.round(A.gaTgt)) + (opt.basis === 'full' ? ' (bulan penuh)' : ' (pro-rata)'), ratio(A.gaAch, A.gaTgt) >= 1 ? 'up' : 'down', api.fmtCount(A.ga100) + ' DSE ≥ 100% (dapat double)') +
      api.kpi('Effective call', pc(ratio(A.ecU, A.mapN)), api.fmtCount(A.ecU) + ' kunjungan produktif dari ' + api.fmtCount(A.mapN) + ' outlet dikunjungi (PJP + ad-hoc)', ratio(A.ecU, A.mapN) >= 0.7 ? 'up' : 'down', 'aturan 18 Nov 2026, standar 70%') + '</div>';
    list.sort(function (a, b) { return ((b.o.final == null ? -1 : b.o.final) - (a.o.final == null ? -1 : a.o.final)); });
    var bd = function (t, sub, cols, c) { return '<th colspan="' + cols + '" style="text-align:center; background:' + c[0] + '; color:' + c[1] + '; border-left:2px solid var(--ij-ink); padding:6px 8px;">' + t + '<div style="font:500 12px var(--ij-font); text-transform:none; letter-spacing:0;">' + sub + '</div></th>'; };
    var COL = { osa: ['#e3eefb', '#16365c'], sp: ['#fdeedb', '#6b3a00'], ga: ['#e6f5ee', '#14452e'], cmp: ['#e2f3e2', '#17441a'], inc: ['#efe3f7', '#42175e'] };
    var head = '<thead><tr><th rowspan="2">DSE</th><th rowspan="2">MC · DSO</th>' +
      bd('OSA', '30% · 0,2% / 0,4% · maks Rp 750 Rb', 4, COL.osa) + bd('SP Data Sell In', '35% · Rp 500 / 1.000 per pcs · maks Rp 500 Rb', 4, COL.sp) +
      bd('RGU-GA Trade KPI', '35% · Rp 1.000 / 2.000 per GA · double ≥ 100% · maks Rp 1 Jt + 1 Jt', 5, COL.ga) + bd('Kepatuhan', 'SP ≥ 5 pcs 50% + EC 70% 50%', 5, COL.cmp) +
      bd('Insentif', 'total × indeks', 3, COL.inc) + '<th rowspan="2">Aksi (jarak ke slab)</th></tr><tr>' +
      ['Aktual', 'Target', 'Ach.', 'Insentif'].map(function (t, i) { return '<th class="num"' + (i === 0 ? ' style="border-left:2px solid var(--ij-ink);"' : '') + '>' + t + '</th>'; }).join('') +
      ['Pcs', 'Target', 'Ach.', 'Insentif'].map(function (t, i) { return '<th class="num"' + (i === 0 ? ' style="border-left:2px solid var(--ij-ink);"' : '') + '>' + t + '</th>'; }).join('') +
      ['GA', 'Target', 'Ach.', 'Insentif', 'Double'].map(function (t, i) { return '<th class="num"' + (i === 0 ? ' style="border-left:2px solid var(--ij-ink);"' : '') + '>' + t + '</th>'; }).join('') +
      ['Outlet SP ≥ 5', 'Effective call', 'Skor', 'Indeks'].map(function (t, i) { return '<th class="num"' + (i === 0 ? ' style="border-left:2px solid var(--ij-ink);"' : '') + '>' + t + '</th>'; }).join('') + '<th class="num">Ach. EC</th>' +
      ['Total', 'Final'].map(function (t, i) { return '<th class="num"' + (i === 0 ? ' style="border-left:2px solid var(--ij-ink);"' : '') + '>' + t + '</th>'; }).join('') + '<th class="num">+ Booster GA</th></tr></thead>';
    var bl = ' style="border-left:2px solid var(--ij-ink);"';
    var body = list.map(function (x) {
      var o = x.o, r = x.r;
      return '<tr><td class="cur"><b>' + api.esc(r.n) + '</b></td><td>' + api.esc(r.mc) + '<br><span class="note">' + api.esc(r.dso) + '</span></td>' +
        '<td class="num"' + bl + '>' + api.pjRp(o.osaAmt) + '</td><td class="num">' + api.pjRp(o.osaTgt) + '</td><td class="num">' + achTag(api, o.osaAch, 1, 0.9) + '</td><td class="num">' + api.pjRp(o.osaInc) + '</td>' +
        '<td class="num"' + bl + '>' + api.fmtCount(o.sp) + '</td><td class="num">' + api.fmtCount(Math.round(o.spTgt)) + '</td><td class="num">' + achTag(api, o.spAch, 1, 0.9) + '</td><td class="num">' + api.pjRp(o.spInc) + '</td>' +
        '<td class="num"' + bl + '>' + api.fmtCount(o.ga) + '</td><td class="num">' + api.fmtCount(Math.round(o.gaTgt)) + '</td><td class="num">' + achTag(api, o.gaAch, 1, 0.8) + '</td><td class="num">' + api.pjRp(o.gaInc) + '</td><td class="num">' + api.pjRp(o.gaDbl) + '</td>' +
        '<td class="num"' + bl + '>' + api.fmtCount(o.sp5) + ' / ' + api.fmtCount(Math.round(o.sp5Std)) + '</td><td class="num">' + (o.ecDen ? api.fmtCount(o.ecNum) + ' / ' + api.fmtCount(o.ecDen) + ' · ' + pc(o.ec, 0) : 'n/a') + '</td><td class="num">' + pc(o.comp, 0) + '</td><td class="num">' + (o.idx == null ? tag(api, 'none', 'n/a') : api.dkIdxTag(o.idx)) + '</td><td class="num">' + pc(o.ecAch, 0) + '</td>' +
        '<td class="num"' + bl + '>' + api.pjRp(o.total) + '</td><td class="num"><b>' + (o.final == null ? 'n/a' : api.pjRp(o.final)) + '</b></td><td class="num">' + (o.boost.paid == null ? 'n/a' : api.pjRp(o.boost.paid)) + '</td>' +
        '<td style="min-width:240px;">' + actions(api, o, P) + '</td></tr>';
    }).join('');
    return cards + api.card('Insentif KPI DSE November 2026 · ' + api.esc(api.scopeText()) + ' · ' + api.fmtCount(list.length) + ' DSE',
      basisBar(api, state) + '<div class="tbl-wrap"><table class="tbl wide" id="knDseTbl">' + head + '<tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Aktual MTD (OSA dan SP s.d. D' + kf.metadata.cut_day_sellin + ', GA s.d. D' + kf.metadata.cut_day_ga + ') dibandingkan dengan target ' + (opt.basis === 'full' ? 'bulan penuh' : 'pro-rata') + '. Insentif = tarif slab × aktual, dibatasi maks per KPI; double GA = insentif GA lagi bila GA ≥ 100%. <b>Final = total × indeks kepatuhan</b>; booster GA Achiever dibayar terpisah (tanpa indeks). SP = SP 3GB + S PLUS V2 + SP Injection (SP0 tidak dihitung). Effective Call = kunjungan produktif ÷ outlet dikunjungi (PJP + ad-hoc), aturan 18 Nov 2026 (keputusan pemilik 20 Nov 2026); produktif = SP / voucher pcs &gt; 0 atau saldo ≥ Rp 75.000, Hybrid digabung.</p>');
  }

  function viewBooster(api, state, kf, df) {
    var P = kf.policy, B = P.booster, opt = optOf(state), f = factors(kf, opt);
    var list = joined().filter(function (x) { return inScope(state, x.r) && (!state.dse || api.dseNorm(x.r.n) === state.dse); }).map(function (x) { x.b = boosterGa(x.n, P); return x; });
    var ok = list.filter(function (x) { return x.b.ok; }), raw = 0, paid = 0, held = 0, na = 0;
    list.forEach(function (x) { if (x.b.paid == null) na++; else { raw += x.b.raw; paid += x.b.paid; held += x.b.held; } });
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      api.kpi('DSE lolos syarat masuk', api.fmtCount(ok.length) + ' / ' + api.fmtCount(list.length), '≥ 60% outlet PJP dengan GA ≥ 3 (hybrid) atau ≥ 2 (single)', ok.length ? 'up' : 'down', 'hanya DSE dengan ≥ 10 outlet PJP; ' + api.fmtCount(na) + ' DSE n/a') +
      api.kpi('GA Achiever dibayar (MTD)', api.pjRp(paid), 'maks Rp 300 Rb per DSE · ' + B.window, 'up', 'setelah batas, dari hitung per slab ' + api.pjRp(raw)) +
      api.kpi('Insentif tertahan', api.pjRp(held), 'hitungan slab DSE yang belum lolos syarat masuk', held > 0 ? 'down' : 'up', 'di bawah syarat = Rp 0') +
      api.kpi('Subs 1st Recharge', 'n/a', 'data recharge pelanggan GA (M0 / M1) belum ada', 'down', 'aturan ada di tab Kebijakan') + '</div>';
    list.sort(function (a, b) { return (b.b.paid || 0) - (a.b.paid || 0) || (b.b.raw || 0) - (a.b.raw || 0); });
    var body = list.map(function (x) {
      var b = x.b, hy = b.hy ? 'Hybrid' : 'Single', T = b.hy ? B.ga_achiever.hybrid : B.ga_achiever.single;
      if (b.paid == null) return '<tr><td class="cur"><b>' + api.esc(x.r.n) + '</b></td><td>' + api.esc(x.r.mc) + '</td><td>' + hy + '</td><td class="num" colspan="9">n/a (nama DSE ganda atau data outlet tidak ada)</td></tr>';
      return '<tr><td class="cur"><b>' + api.esc(x.r.n) + '</b></td><td>' + api.esc(x.r.mc) + '</td><td>' + hy + '</td><td class="num">' + api.fmtCount(b.nPjp) + '</td><td class="num">' + api.fmtCount(b.elig) + ' · ' + pc(b.share, 0) + '</td><td>' + (b.ok ? tag(api, 'top', 'lolos') : tag(api, b.minOk ? 'bad' : 'none', b.minOk ? '&lt; 60%' : '&lt; 10 outlet')) + '</td>' +
        b.slab.map(function (c) { return '<td class="num">' + api.fmtCount(c) + '</td>'; }).join('') + '<td class="num">' + api.pjRp(b.raw) + '</td><td class="num">' + api.pjRp(b.held) + '</td><td class="num"><b>' + api.pjRp(b.paid) + '</b></td></tr>';
    }).join('');
    var T0 = B.ga_achiever.hybrid.tiers, T1 = B.ga_achiever.single.tiers;
    var tl = function (T) { return T.map(function (t) { return t.from + (t.to == null ? '+' : '-' + t.to); }).join(' / '); };
    return cards + api.card('Booster GA Achiever · ' + api.esc(api.scopeText()),
      '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + api.th('DSE') + api.th('MC') + api.th('Tipe') + api.th('Outlet PJP', 1) + api.th('Outlet GA ≥ syarat', 1) + api.th('Syarat 60%') +
      api.th('Slab 1 (outlet)', 1) + api.th('Slab 2 (outlet)', 1) + api.th('Slab 3 (outlet)', 1) + api.th('Hitung slab', 1) + api.th('Tertahan', 1) + api.th('Dibayar', 1) + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Slab per outlet (GA IM3 + 3ID digabung per outlet fisik, GA s.d. D' + kf.metadata.cut_day_ga + '): Hybrid ' + tl(T0) + ' GA (Rp 5.000 / 10.000 / 20.000, syarat ≥ 3 GA) · Single ' + tl(T1) + ' GA (syarat ≥ 2 GA). Syarat masuk: ≥ 60% outlet PJP memenuhi syarat, DSE dengan ≥ 10 outlet PJP. Maks Rp 300.000 per DSE, Rp 20.000 per outlet. Booster dihitung sampai 30 November; angka ini progres MTD. Hybrid = DSE dengan target IM3 dan 3ID.</p>');
  }

  function achRows(api, rows, level, P, withOpt) { return ''; }

  function partnerData(state, kf, level, opt, f) {
    var TK = TF(), tm = TK && TK.months && TK.months['2026-11'], basis = state.knBasis === 'tag' ? 'tag' : 'site';
    if (!tm) return null;
    var dj = joined().filter(function (x) { return inScope(state, x.r); });
    function cmpOf(rows) {
      var sp5 = 0, sp5s = 0, ec = 0, ed = 0, mp = 0, vis = 0;
      rows.forEach(function (x) { var cls = x.r.cls === 'R' ? 25 : 30; sp5 += x.r.sp_uar5 || 0; sp5s += cls * f.s; ec += x.r.prod || 0; ed += x.r.actual || 0; if (x.n && x.n.map_n) { mp += x.n.map_n; vis += x.n.vis_u || 0; } });
      var a = sp5s > 0 ? sp5 / sp5s : null, b = ed > 0 ? (ec / ed) / 0.70 : null;
      return { ach: a != null && b != null ? 0.5 * a + 0.5 * b : null, sp5: sp5, sp5s: sp5s, ec: ed ? ec / ed : null, ecU: ec, mp: mp, vis: mp ? vis / mp : null };
    }
    var mcs = kf.mcs.filter(function (m) { return (!state.branch || m.area === state.branch) && (!state.hoa || m.hoa === state.hoa) && (!state.kec || m.mc === state.kec); });
    function gaOf(m, brand) { var v = basis === 'site' ? m.site : m.tag; if (!v) return null; return brand === 'IM3' ? v[0] : (brand === '3ID' ? v[1] : v[0] + v[1]); }
    var out = [];
    function mk(key, label, sub, mcList, tgtGa, tgtFwa, brand) {
      var ga = 0, na = false; mcList.forEach(function (m) { var g = gaOf(m, brand); if (g == null) na = true; else ga += g; });
      var rows = dj.filter(function (x) { return mcList.some(function (m) { return m.mc === x.r.mc; }); }), c = cmpOf(rows);
      var gaT = (tgtGa || 0) * f.g, o = { key: key, label: label, sub: sub, ga: na && !ga ? null : ga, gaT: tgtGa || 0, gaTp: gaT, gaAch: na && !ga ? null : ratio(ga, gaT), fwaT: tgtFwa, cmp: c, cmpAch: c.ach };
      o.sc = scoreRows(kf.policy, level, o); o.idx = c.vis == null ? null : indexOf(kf.policy.scorecard.compliance_index, c.vis);
      o.final = o.idx == null ? null : o.sc.score * o.idx;
      out.push(o);
    }
    var key = 'TOTAL RGU GA', fk = 'FWA 4G';
    if (level === 'hoa') {
      tm.areas.forEach(function (a) { if (state.branch && a.br !== state.branch) return; var ml = mcs.filter(function (m) { return m.area === a.br; }); if (!ml.length) return; mk(a.br, a.br, 'HoA ' + (ml[0].hoa || a.hoa_src), ml, a.IOH[key], a.IOH[fk], 'IOH'); });
    } else if (level === 'dso') {
      tm.mcs.forEach(function (t) { var ml = mcs.filter(function (m) { return m.mc === t.mc; }); if (!ml.length) return; mk(t.mc, t.mc, 'DSO ' + (ml[0].dso || t.dso_src) + ' · ' + t.br, ml, t.IOH[key], t.IOH[fk], 'IOH'); });
    } else {
      tm.pts.forEach(function (p) { var ml = mcs.filter(function (m) { return m.mc === p.mc; }); if (!ml.length) return; mk(p.brand + '|' + p.pt, p.pt + ' · ' + p.brand, p.type + ' · ' + (p.partner || '') + ' · ' + p.br, ml, p.vals[key], p.vals[fk], p.brand); });
    }
    return { rows: out, basis: basis };
  }
  function viewPartner(api, state, kf, df) {
    var level = state.knLevel || 'hoa', opt = optOf(state), f = factors(kf, opt), P = kf.policy, S = P.scorecard;
    var D = partnerData(state, kf, level, opt, f);
    if (!D) return api.card('KPI HoA · DSO · Partner', '<p class="note">Target KPI IE November belum ada (<code>target_kpi_feed.js</code>).</p>');
    var rowsDef = S.rows.filter(function (r) { return r.hoa != null; }), kmax = level === 'dsp' ? 'dsp_max' : 'hoa_max';
    var toolbar = '<div class="map-toolbar" style="margin-top:8px;">' + api.sellinBtnGroup('Level', 'kn-level', LEVELS, level) + api.sellinBtnGroup('Basis GA', 'kn-basis', [['site', '📍 Site / lokasi (KPI HoA · DSO)'], ['tag', '🏪 Outlet tagging']], D.basis) + '</div>' + basisBar(api, state);
    var head = '<thead><tr><th rowspan="2">' + (level === 'hoa' ? 'Area' : (level === 'dso' ? 'MC · DSO' : 'PT partner · brand')) + '</th>' +
      '<th colspan="4" style="text-align:center; border-left:2px solid var(--ij-ink);">RGU-GA Trade KPI · bobot 50% · maks ' + pc(rowsDef[0][kmax], 0) + '</th>' +
      '<th colspan="1" style="text-align:center; border-left:2px solid var(--ij-ink);">RGU-GA FWA · 15% · maks ' + pc(rowsDef[1][kmax], 0) + '</th>' +
      '<th colspan="5" style="text-align:center; border-left:2px solid var(--ij-ink);">Produktivitas DSE Compliance · 35% · maks ' + pc(rowsDef[2][kmax], 0) + '</th>' +
      '<th colspan="4" style="text-align:center; border-left:2px solid var(--ij-ink);">Skor</th></tr><tr>' +
      '<th class="num" style="border-left:2px solid var(--ij-ink);">GA aktual</th><th class="num">Target</th><th class="num">Ach.</th><th class="num">Skor</th>' +
      '<th class="num" style="border-left:2px solid var(--ij-ink);">Aktual</th>' +
      '<th class="num" style="border-left:2px solid var(--ij-ink);">Outlet SP ≥ 5</th><th class="num">EC unik</th><th class="num">Ach.</th><th class="num">Skor</th><th class="num">Visit outlet unik</th>' +
      '<th class="num" style="border-left:2px solid var(--ij-ink);">Skor parsial</th><th class="num">Bobot tersedia</th><th class="num">Indeks compliance</th><th class="num">Skor × indeks</th></tr></thead>';
    var tot = { ga: 0, gaT: 0 };
    var body = D.rows.map(function (o) {
      var c = o.sc.comps, bl = ' style="border-left:2px solid var(--ij-ink);"';
      return '<tr><td class="cur"><b>' + api.esc(o.label) + '</b><br><span class="note">' + api.esc(o.sub) + '</span></td>' +
        '<td class="num"' + bl + '>' + (o.ga == null ? 'n/a' : api.fmtCount(o.ga)) + '</td><td class="num">' + api.fmtCount(Math.round(o.gaTp)) + '</td><td class="num">' + achTag(api, o.gaAch, 1, 0.8) + '</td><td class="num">' + (c.ga.pts == null ? 'n/a' : pc(c.ga.pts, 1)) + '</td>' +
        '<td class="num"' + bl + ' title="Target FWA 4G ' + api.fmtCount(Math.round(o.fwaT || 0)) + ' · aktual GA FWA belum ada di raw/">n/a <span class="note">(target ' + api.fmtCount(Math.round(o.fwaT || 0)) + ')</span></td>' +
        '<td class="num"' + bl + '>' + api.fmtCount(o.cmp.sp5) + ' / ' + api.fmtCount(Math.round(o.cmp.sp5s)) + '</td><td class="num">' + pc(o.cmp.ec, 0) + '</td><td class="num">' + achTag(api, o.cmpAch, 1, 0.8) + '</td><td class="num">' + (c.cmp.pts == null ? 'n/a' : pc(c.cmp.pts, 1)) + '</td><td class="num">' + pc(o.cmp.vis, 1) + '</td>' +
        '<td class="num"' + bl + '>' + pc(o.sc.score, 1) + '</td><td class="num">' + pc(o.sc.w, 0) + '</td><td class="num">' + (o.idx == null ? 'n/a' : '× ' + o.idx) + '</td><td class="num"><b>' + (o.final == null ? 'n/a' : pc(o.final, 1)) + '</b></td></tr>';
    }).join('');
    var gaS = 0, gaTS = 0, scS = 0; D.rows.forEach(function (o) { if (o.ga != null) { gaS += o.ga; gaTS += o.gaTp; } scS += o.final || 0; });
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      api.kpi('Baris dalam lingkup', api.fmtCount(D.rows.length), LEVELS.filter(function (l) { return l[0] === level; })[0][1], 'up', api.esc(api.scopeText())) +
      api.kpi('GA vs target ' + (opt.basis === 'full' ? 'bulan' : 'pro-rata'), pc(ratio(gaS, gaTS)), api.fmtCount(gaS) + ' GA dari ' + api.fmtCount(Math.round(gaTS)), ratio(gaS, gaTS) >= 1 ? 'up' : 'down', D.basis === 'site' ? 'basis site / lokasi (kecamatan tertulis di file RGUGA)' : 'basis outlet tagging') +
      api.kpi('Revenue prepaid region', 'n/a', 'faktor terakhir skor akhir IS (maks 100%) tidak dapat dihitung', 'down', 'hanya target Prepaid yang ada (Target KPI IE)') + '</div>';
    return cards + api.card('KPI ' + LEVELS.filter(function (l) { return l[0] === level; })[0][1] + ' · November 2026', toolbar + '<div class="tbl-wrap"><table class="tbl wide">' + head + '<tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Skor komponen = bobot × min(pencapaian, skor maks); skor parsial hanya atas bobot yang punya data (GA Trade 50% + Compliance 35%; FWA 15% menunggu aktual). Skor akhir IS = total skor × indeks compliance (kunjungan outlet unik ÷ outlet mapping: ≥ 95% × 1, 85% sampai &lt; 95% × 0,99, &lt; 85% × 0,98, 0% × 0) × pencapaian revenue prepaid region (n/a, belum dikalikan). Komponen compliance = rata-rata outlet SP ≥ 5 pcs ÷ standar (30 urban, 25 rural) dan EC ÷ 70%. Target GA dan FWA dari Target KPI IE November (HoA = Area, DSO = MC, DSP = PT partner per brand); aktual GA DSP = GA brand itu di MC-nya. KAM (Secondary, BOSS) menunggu data.</p>');
  }

  function viewPolicy(api, state, kf) {
    var P = kf.policy, D = P.dse, B = P.booster, S = P.scorecard;
    var t1 = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('KPI DSE') + api.th('Bobot', 1) + api.th('Slab') + api.th('Insentif') + api.th('Maks', 1) + '</tr></thead><tbody>' +
      '<tr><td>OSA</td><td class="num">30%</td><td>90% → 0,2% · 100% → 0,4%</td><td>tarif × amount OSA</td><td class="num">Rp 750.000</td></tr>' +
      '<tr><td>SP Data Sell In</td><td class="num">35%</td><td>90% → Rp 500 · 100% → Rp 1.000</td><td>tarif × pcs</td><td class="num">Rp 500.000</td></tr>' +
      '<tr><td>RGU-GA Trade KPI <span class="note">(baru, outlet wise)</span></td><td class="num">35%</td><td>80% → Rp 1.000 · 100% → Rp 2.000</td><td>tarif × GA</td><td class="num">Rp 1.000.000</td></tr>' +
      '<tr><td>Tambahan insentif GA (double)</td><td class="num">–</td><td>hanya bila GA 100%</td><td>sama dengan insentif GA</td><td class="num">Rp 1.000.000</td></tr>' +
      '<tr><td><b>Total KPI</b></td><td></td><td></td><td></td><td class="num"><b>Rp 3.250.000</b></td></tr></tbody></table></div>';
    var t2 = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('Kepatuhan') + api.th('Standar') + api.th('Bobot', 1) + '</tr></thead><tbody>' +
      '<tr><td>Outlet mapping sell-in SP Data ≥ 5 pcs</td><td>30 (urban) · 25 (rural)</td><td class="num">50%</td></tr><tr><td>Effective call (aturan 18 Nov 2026)</td><td>70%: kunjungan produktif ÷ outlet dikunjungi</td><td class="num">50%</td></tr></tbody></table></div>' +
      '<p class="note">Indeks kepatuhan: ≥ 100% × 1 · ≥ 90% sampai &lt; 100% × 0,97 · ≥ 80% sampai &lt; 90% × 0,95 · &lt; 80% → 0. Insentif akhir = total insentif × indeks. EC memakai aturan 18 Nov 2026 (produktif ÷ outlet dikunjungi, PJP + ad-hoc), transaksi minimum Rp 75.000.</p>';
    var t3 = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('Booster 1-30 Nov') + api.th('Maks DSE', 1) + api.th('Syarat') + api.th('Tarif') + '</tr></thead><tbody>' +
      '<tr><td>GA Achiever</td><td class="num">Rp 300.000</td><td>Hybrid: ≥ 60% outlet PJP dengan ≥ 3 GA; single: ≥ 2 GA; DSE ≥ 10 outlet PJP</td><td>Hybrid 6-10 / 11-20 / ≥ 21 GA: Rp 5.000 / 10.000 / 20.000; single 4-7 / 8-14 / ≥ 15; maks Rp 20.000 per outlet</td></tr>' +
      '<tr><td>Subs 1st Recharge <span class="note">(data n/a)</span></td><td class="num">Rp 200.000</td><td>Hybrid ≥ 6 outlet aktif, single ≥ 3 (≥ 5 pelanggan recharge ≥ Rp 10.000 di M0 atau M1)</td><td>5-9 / 10-19 / ≥ 20 pelanggan: M0 Rp 5.000 / 10.000 / 20.000, M1 Rp 7.500 / 15.000 / 25.000; maks Rp 45.000 per outlet</td></tr>' +
      '<tr><td><b>KPI + booster</b></td><td class="num"><b>Rp 3.750.000</b></td><td colspan="2"></td></tr></tbody></table></div>';
    var t4 = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('KPI') + api.th('HoA · DSO · DSP', 1) + api.th('Skor maks HoA & DSO', 1) + api.th('Skor maks DSP', 1) + api.th('KAM', 1) + api.th('Skor maks KAM', 1) + '</tr></thead><tbody>' +
      S.rows.map(function (r) { return '<tr><td>' + api.esc(r.label) + '</td><td class="num">' + (r.hoa == null ? '–' : pc(r.hoa, 0)) + '</td><td class="num">' + (r.hoa_max == null ? '–' : pc(r.hoa_max, 0)) + '</td><td class="num">' + (r.dsp_max == null ? '–' : pc(r.dsp_max, 0)) + '</td><td class="num">' + (r.kam == null ? '–' : pc(r.kam, 0)) + '</td><td class="num">' + (r.kam_max == null ? '–' : pc(r.kam_max, 0)) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="note">Compliance kunjungan outlet unik: ≥ 95% × 1 · 85% sampai &lt; 95% × 0,99 · &lt; 85% × 0,98 · 0% × 0. Skor akhir IS = total skor × indeks compliance × pencapaian revenue prepaid region (maks 100%).</p>';
    var pb = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('KPI') + api.th('Pemicu (data)') + api.th('Aksi yang disarankan') + api.th('Penanggung jawab') + '</tr></thead><tbody>' +
      '<tr><td>OSA</td><td>Ach. &lt; 90% atau 90-99%</td><td>Dorong amount sell-in ke outlet mapping (SP + voucher + saldo); lihat "kurang … ke 100%" di tab KPI DSE</td><td>DSE · DSO</td></tr>' +
      '<tr><td>SP Data</td><td>Ach. &lt; 90%</td><td>Isi pcs SP 3GB / S PLUS V2 di outlet dengan stok SP rendah; hitung SP Injection</td><td>DSE · DSO</td></tr>' +
      '<tr><td>RGU-GA Trade</td><td>Ach. &lt; 80% atau 80-99% (double hanya di 100%)</td><td>Tambah outlet yang menjual GA (spreading), prioritaskan outlet GA 1-2 dan outlet ≥ 3 GA di bawah slab berikut</td><td>DSE · DSO</td></tr>' +
      '<tr><td>Kepatuhan</td><td>Indeks &lt; 1 (skor &lt; 100%)</td><td>Cek outlet SP ≥ 5 pcs terhadap standar dan EC terhadap 70%; pastikan kunjungan menghasilkan transaksi</td><td>DSE · DSO</td></tr>' +
      '<tr><td>GA Achiever</td><td>Tertahan (syarat 60% belum terpenuhi)</td><td>Sebar GA ke lebih banyak outlet PJP (≥ 3 GA hybrid / ≥ 2 single) sebelum menambah volume di outlet besar</td><td>DSE · DSO</td></tr>' +
      '<tr><td>HoA · DSO · DSP</td><td>GA Trade &lt; target pro-rata, visit outlet unik &lt; 95%</td><td>Fokus MC dengan skor parsial terendah di tab KPI HoA · DSO · Partner</td><td>HoA · DSO · DSP</td></tr></tbody></table></div>' +
      '<p class="note">Aksi di atas diturunkan dari data dan slide; teks playbook resmi (aksi, pemicu, penanggung jawab) belum diberikan pemilik dan akan menggantikan tabel ini.</p>';
    return api.card('KPI DSE (maks Rp 3,25 Jt)', t1 + t2) + api.card('Booster DSE (maks Rp 500 Rb) dan total', t3) + api.card('KPI HoA · DSO · DSP dan KAM', t4) + api.card('Playbook (turunan data, menunggu teks pemilik)', pb);
  }

  /* Full Month October (per=oct): the October policy and playbook (owner, 20 Nov 2026); scoring stays in DSE Productivity on the frozen October feed */
  function octView(api, df) {
    var P = df.policy, C = P.compliance, bnd = function (v) { return pc(v, 0); };
    var t1 = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('KPI DSE Oktober') + api.th('Bobot slide', 1) + api.th('SLA 90%') + api.th('SLA 100%') + api.th('Maks', 1) + '</tr></thead><tbody>' +
      '<tr><td>OSA</td><td class="num">' + bnd(P.osa.weight) + '</td><td>' + (P.osa.slabs[0].rate * 100).toFixed(1) + '% × amount OSA</td><td>' + (P.osa.slabs[1].rate * 100).toFixed(1) + '% × amount OSA</td><td class="num">' + api.pjRp(P.osa.max_rp) + '</td></tr>' +
      '<tr><td>SP Data Sell In</td><td class="num">' + bnd(P.sp.weight) + '</td><td>' + api.fmtCount(P.sp.tiers[0].pcs) + ' pcs · ' + bnd(P.sp.tiers[0].payout) + ' dari maks</td><td>' + api.fmtCount(P.sp.tiers[1].pcs) + ' pcs · penuh</td><td class="num">' + api.pjRp(P.sp.max_rp) + '</td></tr></tbody></table></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('Kepatuhan') + api.th('Standar') + api.th('Bobot', 1) + '</tr></thead><tbody>' +
      '<tr><td>Outlet mapping sell-in SP ≥ ' + C.uar.min_pcs + ' pcs</td><td>' + C.uar.target_urban + ' (urban) · ' + C.uar.target_rural + ' (rural)</td><td class="num">' + bnd(C.uar.weight) + '</td></tr><tr><td>Effective call (PJP tetap)</td><td>' + bnd(C.ec.target) + '</td><td class="num">' + bnd(C.ec.weight) + '</td></tr></tbody></table></div>' +
      '<p class="note">Indeks: ≥ 100% × 1 · ≥ 90% × 0,97 · ≥ 80% × 0,95 · &lt; 80% → 0. Insentif final = (OSA + SP) × indeks. Periode ini tidak punya RGU-GA Trade, double GA maupun booster (baru dari November). Penutupan Oktober memakai penyebut effective call lama (rencana + ad-hoc).</p>';
    var pb = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('KPI') + api.th('Pemicu (data)') + api.th('Aksi yang disarankan') + api.th('Penanggung jawab') + '</tr></thead><tbody>' +
      '<tr><td>OSA</td><td>Ach. &lt; 90% atau 90-99%</td><td>Dorong amount sell-in (SP + voucher + saldo) ke outlet mapping</td><td>DSE · DSO</td></tr>' +
      '<tr><td>SP Data</td><td>Pcs &lt; tier 90% / 100%</td><td>Isi SP 3GB di outlet mapping dan hitung SP Injection; SP0 tidak dihitung</td><td>DSE · DSO</td></tr>' +
      '<tr><td>Kepatuhan</td><td>Indeks &lt; 1</td><td>Tambah outlet dengan SP ≥ 5 pcs dan jaga effective call</td><td>DSE · DSO</td></tr></tbody></table></div><p class="note">Playbook Oktober = kebijakan Oktober di atas; teks playbook resmi belum diberikan, tabel ini turunan data.</p>';
    return '<div class="card" style="margin-top:10px; border-left:6px solid var(--ij-accent);"><p class="note" style="margin:0;"><b>Full Month Oktober memakai kebijakan Oktober.</b> Perhitungan insentif per DSE ada di <a href="#/mb_ringkasan">DSE Productivity</a> pada periode ini (feed penutupan Oktober). Kebijakan November: pindah ke periode MTD Nov.</p></div>' + api.card('Kebijakan dan playbook KPI DSE · Oktober 2026', t1 + pb);
  }

  var IJKpiNov = {
    view: function (api) {
      var kf = KF(), df = DF(), state = api.state;
      if (!kf || !df) return api.card('KPI & Insentif November', '<p class="note">Feed belum dibangun. Jalankan <code>python3 scripts/build_kpi_nov_feed.py</code>.</p>');
      if (typeof window !== 'undefined' && window.IJ_PER === 'oct') return octView(api, df);
      var tab = state.knTab || 'dse';
      var body = tab === 'booster' ? viewBooster(api, state, kf, df) : (tab === 'partner' ? viewPartner(api, state, kf, df) : (tab === 'policy' ? viewPolicy(api, state, kf) : viewDse(api, state, kf, df)));
      return nav(api, state) + banner(api, kf) + body;
    },
    click: function (cmd, api) {
      var s = api.state, a = cmd.split(':'), k = a[0], v = a.slice(1).join(':');
      if (k === 'tab') s.knTab = v;
    },
    scoreDse: scoreDse, boosterGa: boosterGa, gaAchieverCalc: gaAchieverCalc, rechargeCalc: rechargeCalc, indexOf: indexOf, slabRate: slabRate, factors: factors, scoreRows: scoreRows
  };
  if (typeof window !== 'undefined') window.IJKpiNov = IJKpiNov;
  if (typeof module !== 'undefined') module.exports = IJKpiNov;
})();
