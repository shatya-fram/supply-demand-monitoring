/* Profil Outlet: search an outlet by ID (IM3 / 3ID / IOH) or name and show its Sell-In, GA and PJP visit profile.
   Menu mb_outlet. Reads the governed feeds directly (TERRITORY_FEED, PENJUALAN_FEED, GA_FEED, dseVisitsFeed); nothing is recalculated outside them.
   Contract: docs/assessments/outlet_profile.md. app.js hands over its helpers through `api` (window.IJOutletProfile.view(api) / click / input). */
(function () {
  'use strict';

  var IDX = null, GAIDX = null, VIDX = null, TOPK = 25;

  function T() { return typeof window !== 'undefined' && window.TERRITORY_FEED ? window.TERRITORY_FEED : null; }
  function PJ() { return typeof window !== 'undefined' && window.PENJUALAN_FEED ? window.PENJUALAN_FEED : null; }
  function GA() { return typeof window !== 'undefined' && window.GA_FEED ? window.GA_FEED : null; }
  function VF() { return typeof window !== 'undefined' && window.dseVisitsFeed ? window.dseVisitsFeed : null; }
  function up(v) { return String(v == null ? '' : v).trim().toUpperCase(); }
  function idn(v) { var s = up(v); if (s.slice(-2) === '.0') s = s.slice(0, -2); return s === '0' ? '' : s; }

  /* ---- search index: master outlets, then outlets outside the master that appear in the sell-in or GA feeds ---- */
  function build() {
    if (IDX) return IDX;
    var rows = [], seen = {}, t = T(), pj = PJ(), ga = GA();
    ((t && t.outlets) || []).forEach(function (o) {
      seen[o.outlet_key] = 1;
      rows.push({ k: o.outlet_key, name: o.outlet_name || '', im3: idn(o.outlet_id_im3), t3: idn(o.outlet_id_3id), ioh: idn(o.outlet_id_ioh), m: o });
    });
    function add(k, id, b, name, mc) {
      if (seen[k]) { return; }
      seen[k] = 1; rows.push({ k: k, name: name || '', im3: b === 'IM3' ? idn(id) : '', t3: b === '3ID' ? idn(id) : '', ioh: '', m: null, mc: mc || '' });
    }
    ((pj && pj.outlets) || []).forEach(function (o) { add(o.k, o.id, o.b, o.n, o.mc); });
    ((ga && ga.outlets) || []).forEach(function (o) { add(o.k, o.i, o.b, o.n, o.mc); });
    rows.forEach(function (r) { r.nu = up(r.name); r.ids = [r.im3, r.t3, r.ioh, up(r.k)]; });
    IDX = { rows: rows, byKey: {} };
    rows.forEach(function (r) { IDX.byKey[r.k] = r; });
    return IDX;
  }
  function search(q) {
    var I = build(), Q = up(q), out = [];
    if (Q.length < 2) return out;
    I.rows.forEach(function (r) {
      var sc = 0;
      if (r.ids.some(function (x) { return x && x === Q; })) sc = 100;
      else if (r.ids.some(function (x) { return x && x.indexOf(Q) === 0; })) sc = 80;
      else if (r.nu === Q) sc = 90;
      else if (r.nu.indexOf(Q) === 0) sc = 60;
      else if (r.nu.indexOf(Q) >= 0) sc = 40;
      else if (r.ids.some(function (x) { return x && x.indexOf(Q) >= 0; })) sc = 30;
      if (sc) { out.push({ r: r, sc: sc }); }
    });
    out.sort(function (a, b) { return b.sc - a.sc || (a.r.nu < b.r.nu ? -1 : 1); });
    return out;
  }

  /* ---- per-outlet lookups ---- */
  function gaRows(k) {
    if (!GAIDX) { GAIDX = {}; ((GA() || {}).outlets || []).forEach(function (o) { (GAIDX[o.k] = GAIDX[o.k] || []).push(o); }); }
    return GAIDX[k] || [];
  }
  function visitRows(k) {
    if (!VIDX) { VIDX = {}; var v = VF(); ((v && v.dses) || []).forEach(function (d) { (d.outlets || []).forEach(function (o) { (VIDX[o.k] = VIDX[o.k] || []).push({ dse: d.dse_name, role: d.role, o: o }); }); }); }
    return VIDX[k] || [];
  }
  function pjRow(k) {
    var pj = PJ(); if (!pj) return null;
    if (!pj._opfIdx) { pj._opfIdx = {}; (pj.outlets || []).forEach(function (o) { pj._opfIdx[o.k] = o; }); }
    return pj._opfIdx[k] || null;
  }
  function spClass(name, price) {   // same classes as scripts/sp_defs.py
    var n = up(name);
    if (/3\s?GB/.test(n) && n.indexOf('ZERO') < 0) return '3gb';
    if (n.indexOf('S PLUS') >= 0 && n.indexOf('ZERO') < 0) return '3gb';
    if (n.indexOf('ZERO') >= 0 || n.indexOf('KPK') >= 0 || n.indexOf('KOSONG') >= 0 || n.indexOf('FWA') >= 0 || price === 10000) return 'zero';
    return 'other';
  }
  function sumPairs(a, lo, hi) { var s = 0, i; for (i = 0; a && i < a.length; i += 2) if (a[i] >= lo && a[i] <= hi) s += a[i + 1]; return s; }
  function ladder(v) { return v > 100 ? 'Wholesaler' : (v > 30 ? 'KRO' : (v > 0 ? 'Retail' : 'Tanpa GA')); }

  /* ---- small renderers ---- */
  function growth(api, a, b) {
    if (!(b > 0)) return '<span class="note">n/a</span>';
    var g = (a / b - 1) * 100, txt = g > 999 ? '> +999%' : (g >= 0 ? '+' : '') + g.toFixed(1) + '%';
    return '<span class="' + (g >= 0 ? 'good-tag' : 'alert-tag') + '">' + txt + '</span>';
  }
  function bars(api, mtd, lm, cut, title) {   // inline SVG: bars = this month per day, line = last month per day
    var W = 560, H = 90, ml = 4, pw = W - ml * 2, bw = pw / 31, mx = 1, d, out = '';
    for (d = 1; d <= 31; d++) mx = Math.max(mx, mtd[d] || 0, lm[d] || 0);
    function Y(v) { return H - 14 - (v / mx) * (H - 22); }
    for (d = 1; d <= 31; d++) if (d <= cut && mtd[d]) out += '<rect x="' + (ml + (d - 0.8) * bw).toFixed(1) + '" y="' + Y(mtd[d]).toFixed(1) + '" width="' + (bw * 0.6).toFixed(1) + '" height="' + (H - 14 - Y(mtd[d])).toFixed(1) + '" style="fill:var(--ij-ink);"><title>' + d + ': ' + api.fmtCount(mtd[d]) + '</title></rect>';
    var pts = []; for (d = 1; d <= prevDaysN(); d++) pts.push((ml + (d - 0.5) * bw).toFixed(1) + ',' + Y(lm[d] || 0).toFixed(1));
    out += '<polyline points="' + pts.join(' ') + '" style="fill:none; stroke:var(--ij-muted); stroke-width:1.5;"/>';
    [1, 5, 10, 15, 20, 25, 30].forEach(function (x) { out += '<text x="' + (ml + (x - 0.5) * bw).toFixed(1) + '" y="' + (H - 2) + '" text-anchor="middle" style="font:10px var(--ij-font); fill:var(--ij-muted);">' + x + '</text>'; });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + api.esc(title) + '" style="max-width:' + W + 'px; display:block;">' + out + '</svg>';
  }
  function prevDaysN() { return (window.IJMonth && window.IJMonth.prevDays()) || 30; }   /* days of the month before the running month (Okt 31 for a Nov feed) */
  function perDay(pairs, qi) { var a = [], d; for (d = 0; d <= 31; d++) a.push(0); for (var i = 0; pairs && i < pairs.length; i++) { if (qi == null) { a[pairs[i][0]] += pairs[i][1]; } else { a[pairs[i][0]] += pairs[i][qi]; } } return a; }
  function gaDays(rows, key) { var a = [], d, i, r; for (d = 0; d <= 31; d++) a.push(0); rows.forEach(function (x) { r = x[key] || []; for (i = 0; i < r.length; i += 2) a[r[i]] += r[i + 1]; }); return a; }

  /* ---- profile sections ---- */
  function header(api, ent, rec) {
    var m = ent.m, esc = api.esc, name = (m && m.outlet_name) || ent.name || '(tanpa nama)', mc = (m && m.micro_cluster) || (rec.pj && rec.pj.mc) || (rec.ga[0] && rec.ga[0].mc) || '—';
    var bf = (m && m.brand_flag) || (ent.im3 && ent.t3 ? 'HYBRID' : (ent.im3 ? 'IM3_ONLY' : (ent.t3 ? '3ID_ONLY' : '—')));
    var dse = (m && m.dse_name) || (rec.pj && rec.pj.dse) || (rec.ga[0] && rec.ga[0].dse) || '—';
    var fl = (m && m.flags) ? String(m.flags).split('|').filter(Boolean) : [];
    var rows = [
      ['ID IM3', ent.im3 || '—'], ['ID 3ID', ent.t3 || '—'], ['ID IOH', ent.ioh || '—'], ['Jenis', bf.replace('_', ' ')],
      ['DSE', dse], ['DSO', (m && m.dso_leader) || '—'], ['HoA', (m && m.hoa_leader) || '—'], ['Micro cluster', mc],
      ['Branch', (m && m.branch) || (rec.pj && rec.pj.br) || '—'], ['Kecamatan', (m && m.kecamatan) || (rec.pj && rec.pj.kec) || (rec.ga[0] && rec.ga[0].kec) || '—'],
      ['Kabupaten', (m && m.kabupaten) || '—'], ['Site', (m && m.site_nbs) || (rec.pj && rec.pj.site) || (rec.ga[0] && rec.ga[0].site) || '—'],
      ['Tipe IM3 / 3ID', ((m && m.outlet_type_im3) || '—') + ' / ' + ((m && m.outlet_type_3id) || '—')], ['Partner', (m && (m.partner_name_im3 || m.partner_name_3id)) || '—'],
      ['Status', m ? 'PJP (master)' : 'non-PJP (di luar master)'], ['Segmen GA', (rec.ga[0] && rec.ga[0].sg) || '—']
    ];
    var grid = '<div class="tbl-wrap"><table class="tbl" data-nosort="1"><tbody>' + [0, 1, 2, 3].map(function (r) {
      return '<tr>' + [0, 1, 2, 3].map(function (c) { var x = rows[c * 4 + r]; return x ? '<td class="note" style="width:9%;">' + esc(x[0]) + '</td><td class="cur" style="width:16%;"><b>' + esc(x[1]) + '</b></td>' : '<td></td><td></td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
    var chips = fl.length ? '<p class="note" style="margin:6px 0 0;">Flag: ' + fl.map(function (f) { return '<span class="alert-tag">' + esc(f) + '</span>'; }).join(' ') + '</p>' : '';
    return api.card('Profil · ' + esc(name), '<p class="note" style="margin:0 0 6px;">Kunci outlet fisik <code>' + esc(ent.k) + '</code> (satu outlet fisik = satu entitas; hybrid IM3 + 3ID digabung)</p>' + grid + chips);
  }

  function sellIn(api, rec, F) {
    var o = rec.pj, esc = api.esc, fc = api.fmtCount, Rp = api.pjRp;
    if (!o) return api.card('Profil Sell-In · MOBII (outlet-bound)', '<p class="note">Tidak ada Sell-In MOBII untuk outlet ini pada periode feed (Oktober dan September).</p>');
    var c = o.c || {}, cut = F.metadata.cut_day;
    function v(cat, i) { return c[cat] ? c[cat][i] || 0 : 0; }
    var vq = [v('VCF', 0) + v('VCB', 0), v('VCF', 2) + v('VCB', 2), v('VCF', 4) + v('VCB', 4)], vv = [v('VCF', 1) + v('VCB', 1), v('VCF', 3) + v('VCB', 3), v('VCF', 5) + v('VCB', 5)];
    var cls = { '3gb': [0, 0, 0], zero: [0, 0, 0], other: [0, 0, 0] };
    var prods = [];
    Object.keys(o.p || {}).forEach(function (pi) {
      var pr = F.products[+pi], a = o.p[pi]; if (!pr) return;
      if (pr.cat === 'SP') { var k = spClass(pr.n, pr.price); cls[k][0] += a[0]; cls[k][1] += a[2]; cls[k][2] += a[4]; }
      prods.push({ pr: pr, a: a });
    });
    var spi = c.SPI || [0, 0, 0, 0, 0, 0];
    var kpiSp = cls['3gb'][0] + spi[0], kpiSpL = cls['3gb'][1] + spi[2], kpiSpF = cls['3gb'][2] + spi[4];
    var kp = '<div class="kpis" style="margin-top:6px;">' +
      api.kpi('SP semua MOBII (MTD)', fc(v('SP', 0)) + ' pcs', growth(api, v('SP', 0), v('SP', 2)) + ' vs LMTD ' + fc(v('SP', 2)) + ' · FM ' + fc(v('SP', 4)), v('SP', 0) >= v('SP', 2) ? 'up' : 'down', Rp(v('SP', 1)) + ' MTD · Zero, KPK, 3GB, S PLUS dan lainnya') +
      api.kpi('SP Data KPI (3GB + S PLUS + Injection)', fc(kpiSp) + ' pcs', growth(api, kpiSp, kpiSpL) + ' vs LMTD ' + fc(kpiSpL) + ' · FM ' + fc(kpiSpF), kpiSp >= kpiSpL ? 'up' : 'down', 'SP Zero tidak dihitung · Injection MOBO ' + fc(spi[0]) + ' pcs') +
      api.kpi('Voucher (isi + blank)', fc(vq[0]) + ' pcs', growth(api, vv[0], vv[1]) + ' vs LMTD ' + Rp(vv[1]) + ' · FM ' + Rp(vv[2]), vv[0] >= vv[1] ? 'up' : 'down', Rp(vv[0]) + ' MTD') +
      api.kpi('Saldo Mobo (SALMO)', Rp(v('SALMO', 1)), growth(api, v('SALMO', 1), v('SALMO', 3)) + ' vs LMTD ' + Rp(v('SALMO', 3)) + ' · FM ' + Rp(v('SALMO', 5)), v('SALMO', 1) >= v('SALMO', 3) ? 'up' : 'down', (c.SALMO && c.SALMO[11] ? fc(c.SALMO[11][0]) + ' transfer MTD' : 'transfer saldo outlet-bound')) + '</div>';
    function topTable(cats, title, unit) {
      var L = prods.filter(function (x) { return cats.indexOf(x.pr.cat) >= 0 && (x.a[0] || x.a[1] || x.a[2] || x.a[4]); });
      var tot = L.reduce(function (s, x) { return s + (unit === 'rp' ? x.a[1] : x.a[0]); }, 0);
      L.sort(function (a, b) { return (unit === 'rp' ? b.a[1] - a.a[1] : b.a[0] - a.a[0]) || b.a[4] - a.a[4]; });
      if (!L.length) return '<p class="note">' + esc(title) + ': tidak ada transaksi.</p>';
      return '<div class="tbl-wrap"><table class="tbl" data-nosort="1"><thead><tr>' + api.th(title) + api.th('Brand') + api.th('MTD qty', 1) + api.th('MTD Rp', 1) + api.th('LMTD qty', 1) + api.th('FM qty', 1) + api.th('% MTD', 1) + '</tr></thead><tbody>' +
        L.slice(0, 5).map(function (x, i) { var share = tot ? (unit === 'rp' ? x.a[1] : x.a[0]) / tot * 100 : 0; return '<tr><td class="cur">' + (i === 0 ? '🏆 ' : '') + '<b>' + esc(x.pr.n) + '</b>' + (x.pr.cat === 'SP' ? ' <span class="note">' + ({ '3gb': 'SP Data', zero: 'SP Zero', other: 'SP lain' })[spClass(x.pr.n, x.pr.price)] + '</span>' : '') + '</td><td>' + esc(x.pr.b) + '</td><td class="num"><b>' + fc(x.a[0]) + '</b></td><td class="num">' + Rp(x.a[1]) + '</td><td class="num">' + fc(x.a[2]) + '</td><td class="num">' + fc(x.a[4]) + '</td><td class="num">' + share.toFixed(0) + '%</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    var split = '<p class="note" style="margin:8px 0 4px;"><b>SP menurut kelas (pcs MTD / LMTD / FM):</b> SP Data ' + fc(cls['3gb'][0]) + ' / ' + fc(cls['3gb'][1]) + ' / ' + fc(cls['3gb'][2]) + ' · SP Zero ' + fc(cls.zero[0]) + ' / ' + fc(cls.zero[1]) + ' / ' + fc(cls.zero[2]) + ' · SP lain ' + fc(cls.other[0]) + ' / ' + fc(cls.other[1]) + ' / ' + fc(cls.other[2]) + ' · SP Injection (MOBO) ' + fc(spi[0]) + ' / ' + fc(spi[2]) + ' / ' + fc(spi[4]) + '</p>';
    var daily = {}; ['SP', 'VCF', 'VCB', 'SALMO'].forEach(function (cat) { (c[cat] ? c[cat][10] || [] : []).forEach(function (e) { daily[e[0]] = (daily[e[0]] || 0) + (e[1] || 0); }); });
    var dm = [], dl = [], d; for (d = 0; d <= 31; d++) { dm.push(daily[d] || 0); dl.push(0); }
    return api.card('Profil Sell-In · MOBII (outlet-bound) · MTD vs LMTD (1–' + cut + ' September) vs FM (September penuh)',
      kp + split + topTable(['SP'], 'Top produk · Starter Pack', 'qty') + '<div style="height:8px;"></div>' + topTable(['VCF', 'VCB'], 'Top produk · Voucher', 'rp') +
      '<p class="note" style="margin:8px 0 2px;">Sell-In harian (Rp, semua kategori) · bar = Oktober</p>' + bars(api, dm, dl, cut, 'Sell-In harian') +
      '<p class="note">Saldo Mobo tidak punya produk (nilai transfer saja). Qty SP "semua MOBII" mencakup semua jenis; SP Data KPI mengikuti definisi 27 Okt 2026.</p>');
  }

  function gaCard(api, rec, G) {
    var rows = rec.ga, fc = api.fmtCount, M = G.metadata, cut = M.cut_day, esc = api.esc;
    if (!rows.length) return api.card('Profil GA · Daily_RGUGA (outlet tagging)', '<p class="note">Tidak ada GA tagging untuk outlet ini di Oktober maupun September.</p>');
    var mtd = gaDays(rows, 'o'), sep = gaDays(rows, 's'), q = 0, p = 0, f = 0, days = 0, best = 0, bd = 0, d, byB = {};
    for (d = 1; d <= 31; d++) { q += mtd[d]; if (mtd[d] > 0) days++; if (mtd[d] > best) { best = mtd[d]; bd = d; } }
    for (d = 1; d <= prevDaysN(); d++) { f += sep[d]; if (d <= cut) p += sep[d]; }
    rows.forEach(function (r) { var b = byB[r.b] || (byB[r.b] = [0, 0, 0]); b[0] += sumPairs(r.o, 1, 31); b[1] += sumPairs(r.s, 1, cut); b[2] += sumPairs(r.s, 1, prevDaysN()); });
    var kp = '<div class="kpis" style="margin-top:6px;">' +
      api.kpi('GA MTD (D1–D' + cut + ')', fc(q) + ' pcs', growth(api, q, p) + ' vs LMTD ' + fc(p) + ' · FM Sep ' + fc(f), q >= p ? 'up' : 'down', 'gross add (MSISDN) pada outlet tagging ini') +
      api.kpi('GA per brand', 'IM3 ' + fc((byB.IM3 || [0])[0]) + ' · 3ID ' + fc((byB['3ID'] || [0])[0]), 'LMTD IM3 ' + fc((byB.IM3 || [0, 0])[1]) + ' · 3ID ' + fc((byB['3ID'] || [0, 0])[1]), 'up', 'hybrid: kedua brand dijumlahkan di outlet fisik yang sama') +
      api.kpi('Hari aktif GA (SSO)', fc(days) + ' hari', best ? 'hari terbaik D' + bd + ' · ' + fc(best) + ' pcs' : 'belum ada GA', days ? 'up' : 'down', 'SSO = hari dengan ≥ 1 GA · rata-rata ' + (days ? (q / days).toFixed(1) : '0') + ' pcs per hari aktif') +
      api.kpi('Slab GA (standar)', ladder(f), 'berdasar GA September penuh ' + fc(f) + ' pcs', 'up', 'Retail ≤ 30 · KRO 31–100 · Wholesaler > 100 (per bulan)') + '</div>';
    var lm = []; for (d = 0; d <= 31; d++) lm.push(sep[d] || 0);
    return api.card('Profil GA · Daily_RGUGA (outlet tagging) · bar = Oktober, garis = September',
      kp + bars(api, mtd, lm, cut, 'GA harian') +
      '<p class="note"><b>Top produk GA:</b> tidak tersedia. Daily_RGUGA_OUTLET hanya memuat jumlah GA per outlet per hari dan per brand, tanpa produk / paket. Ukuran terdekat yang ada: GA per brand di atas.</p>');
  }

  function visitCard(api, ent, rec, V) {
    var esc = api.esc, fc = api.fmtCount, L = rec.vis, days = (V && V.metadata && V.metadata.days) || [], last = V && V.last_visit ? V.last_visit[ent.k] : null;
    if (!V) return api.card('Profil Visit PJP', '<p class="note">Feed visit belum dimuat.</p>');
    if (!L.length) {
      return api.card('Profil Visit PJP · ' + esc(V.metadata.period_start) + ' s.d. ' + esc(V.metadata.period_end),
        '<p class="note"><span class="alert-tag">Tidak ada rencana maupun kunjungan</span> pada outlet ini di periode feed.' + (last ? ' Kunjungan terakhir tercatat ' + esc(last) + '.' : '') + ' ' + (ent.m ? 'Outlet master' + (ent.m.dse_name ? ' dengan DSE ' + esc(ent.m.dse_name) : ' tanpa DSE (tidak masuk PJP)') + '.' : 'Outlet di luar master (non-PJP).') + '</p>');
    }
    var tp = 0, tx = 0, tm = 0;
    var body = L.map(function (x) {
      var d = x.o.d, p = 0, e = 0, i, cells = '';
      for (i = 0; i < d.length; i++) { var ch = d.charAt(i); if (ch === 'x') e++; if (ch === 'p') p++; }
      tp += p + e; tx += e; tm += p;
      for (i = 0; i < d.length; i++) {
        var ch2 = d.charAt(i), bg = ch2 === 'x' ? '#16a34a' : (ch2 === 'p' ? '#dc2626' : 'var(--ij-wash)'), tt = (days[i] || ('D' + (i + 1))) + ': ' + (ch2 === 'x' ? 'dikunjungi' : (ch2 === 'p' ? 'direncanakan, belum dikunjungi' : 'tidak ada rencana'));
        cells += '<span title="' + esc(tt) + '" style="display:inline-block; width:14px; height:14px; margin:0 1px 1px 0; background:' + bg + '; color:#fff; font:700 9px/14px var(--ij-font); text-align:center;">' + (i + 1) + '</span>';
      }
      return '<tr><td class="cur"><b>' + esc(x.dse) + '</b></td><td>' + esc(x.o.b) + ' <code>' + esc(String(x.o.id).split(':')[1] || x.o.id) + '</code></td><td class="num">' + fc(p + e) + '</td><td class="num"><b>' + fc(e) + '</b></td><td class="num">' + (p + e ? Math.round(e / (p + e) * 100) + '%' : '<span class="note">n/a</span>') + '</td><td>' + cells + '</td></tr>';
    }).join('');
    var kp = '<div class="kpis" style="margin-top:6px;">' +
      api.kpi('Kunjungan MTD', fc(tx) + ' dari ' + fc(tp) + ' rencana', (tp ? Math.round(tx / tp * 100) : 0) + '% terlaksana · ' + fc(tm) + ' rencana belum dikunjungi', tx > 0 ? 'up' : 'down', 'dihitung per login DSE (hybrid = dua baris bila dikunjungi lewat dua brand)') +
      api.kpi('Kunjungan terakhir', last ? esc(last) : 'n/a', last ? 'check-in selesai terakhir di feed' : 'belum ada kunjungan tercatat', last ? 'up' : 'down', 'periode ' + esc(V.metadata.period_start) + ' s.d. ' + esc(V.metadata.period_end)) +
      api.kpi('Pelaksana', fc(L.length) + ' login', L.map(function (x) { return x.dse; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' · '), 'up', ent.m && ent.m.dse_name ? 'DSE master: ' + ent.m.dse_name : 'tanpa DSE master') + '</div>';
    return api.card('Profil Visit PJP · ' + esc(V.metadata.period_start) + ' s.d. ' + esc(V.metadata.period_end),
      kp + '<div class="tbl-wrap"><table class="tbl" data-nosort="1"><thead><tr>' + api.th('DSE') + api.th('ID') + api.th('Rencana', 1) + api.th('Dikunjungi', 1) + api.th('% terlaksana', 1) + api.th('Kalender (hijau = dikunjungi, merah = rencana tidak terlaksana)') + '</tr></thead><tbody>' + body + '</tbody></table></div>');
  }

  function signals(api, ent, rec, F) {
    var out = [], c = (rec.pj && rec.pj.c) || {}, ga = 0;
    rec.ga.forEach(function (r) { ga += sumPairs(r.o, 1, 31); });
    var spq = c.SP ? c.SP[0] : 0, vis = rec.vis.reduce(function (s, x) { return s + (x.o.d.split('x').length - 1); }, 0);
    if (ent.m && ent.m.dse_name && !vis) out.push('Outlet PJP belum dikunjungi bulan ini.');
    if (spq >= 5 && !ga) out.push('Beli ' + api.fmtCount(spq) + ' SP tetapi belum ada GA: dorong konversi ke aktivasi.');
    if (!spq && !ga) out.push('Tidak ada SP maupun GA bulan ini.');
    if (ga && !spq) out.push('Ada GA tetapi tidak ada sell-in SP MOBII bulan ini.');
    if (!out.length) return '';
    return '<div class="card" style="margin-top:10px; border-left:6px solid var(--ij-accent);"><h2 class="sect">Sinyal</h2><ul style="margin:6px 0 0 18px;">' + out.map(function (s) { return '<li>' + api.esc(s) + '</li>'; }).join('') + '</ul></div>';
  }

  /* ---- view ---- */
  function view(api) {
    var st = api.state, q = st.opQ || '', esc = api.esc, I = build();
    var box = '<div class="map-toolbar" style="margin-top:8px;"><div class="map-toolbar-group"><label class="map-label" for="opfSearchInput">Cari outlet:</label>' +
      '<input type="text" id="opfSearchInput" class="search-input" style="min-width:420px;" placeholder="🔍 ID outlet (IM3 / 3ID / IOH) atau nama outlet, min. 2 huruf" value="' + esc(q) + '" autocomplete="off"></div>' +
      (st.opSel ? '<button type="button" class="btn" data-opf="clear">Tutup profil</button>' : '') + '</div>';
    var res = search(q), list = '';
    if (q.length >= 2) {
      list = '<div class="tbl-wrap" style="margin-top:8px;"><table class="tbl" data-nosort="1"><thead><tr>' + api.th('Outlet') + api.th('ID IM3') + api.th('ID 3ID') + api.th('ID IOH') + api.th('MC · DSE') + api.th('') + '</tr></thead><tbody>' +
        res.slice(0, TOPK).map(function (x) { var r = x.r, m = r.m; return '<tr><td class="cur"><b>' + esc(r.name || '(tanpa nama)') + '</b><br><span class="note">' + esc(m ? (m.kecamatan || '') : 'non-PJP') + '</span></td><td>' + esc(r.im3 || '—') + '</td><td>' + esc(r.t3 || '—') + '</td><td>' + esc(r.ioh || '—') + '</td><td>' + esc((m && m.micro_cluster) || r.mc || '—') + '<br><span class="note">' + esc((m && m.dse_name) || '') + '</span></td><td><button type="button" class="btn" data-opf="pick:' + esc(r.k) + '">Lihat profil</button></td></tr>'; }).join('') +
        '</tbody></table></div><p class="note">' + (res.length ? 'Menampilkan ' + Math.min(TOPK, res.length) + ' dari ' + api.fmtCount(res.length) + ' outlet yang cocok.' : 'Tidak ada outlet yang cocok.') + ' Pencarian mencakup ' + api.fmtCount(I.rows.length) + ' outlet (master dan di luar master).</p>';
    }
    var searchCard = api.card('Profil Outlet · cari berdasarkan ID atau nama', box + (st.opSel ? '' : (q.length >= 2 ? list : '<p class="note">Ketik ID outlet (IM3, 3ID atau IOH) atau nama outlet. Profil menampilkan Sell-In (qty dan produk teratas), GA dan kunjungan PJP.</p>')));
    var ent = st.opSel ? I.byKey[st.opSel] : null;
    if (!ent) return searchCard;
    var F = PJ(), G = GA(), V = VF(), rec = { pj: pjRow(ent.k), ga: gaRows(ent.k), vis: visitRows(ent.k) };
    return searchCard + (q.length >= 2 && res.length > 1 ? '<details style="margin-top:8px;"><summary class="note" style="cursor:pointer;">Hasil pencarian lain (' + (res.length - 1) + ')</summary>' + list + '</details>' : '') +
      header(api, ent, rec) + signals(api, ent, rec, F) + (F ? sellIn(api, rec, F) : '') + (G ? gaCard(api, rec, G) : '') + visitCard(api, ent, rec, V);
  }
  function click(v, api) {
    var st = api.state;
    if (v === 'clear') { st.opSel = ''; return; }
    if (v.indexOf('pick:') === 0) { st.opSel = v.slice(5); }
  }
  function input(el, api) {
    api.state.opQ = el.value;
    var I = build(), r = search(el.value);
    if (r.length === 1 && r[0].sc >= 100) { api.state.opSel = r[0].r.k; }   // an exact id opens the profile at once
    else if (api.state.opSel && !I.byKey[api.state.opSel]) { api.state.opSel = ''; }
  }

  var IJOutletProfile = { view: view, click: click, input: input, search: search, build: build };
  if (typeof window !== 'undefined') window.IJOutletProfile = IJOutletProfile;
  if (typeof module !== 'undefined' && module.exports) module.exports = IJOutletProfile;
})();
