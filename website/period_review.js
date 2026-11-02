/* Review Periode: MTD bulan berjalan vs LMTD bulan lalu vs Full Month dua bulan terakhir, dengan tren harian dari arsip bulanan.
   Menu mb_periods. Membaca window.PERIOD_HISTORY (website/data/period_history.js, dibangun scripts/build_period_history.py dari feed yang sudah
   ditata). Tidak menghitung ulang di luar arsip: hari tanpa data = n/a, bukan 0.
   Kontrak: docs/assessments/period_review_platform.md. app.js menyerahkan helper lewat `api` (window.IJPeriods.view(api) / click / change). */
(function () {
  'use strict';

  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var GROUP_NAME = { sellin: 'Sell-In MOBII', demand: 'Demand MOBO', ga: 'Gross Add (outlet tagging)', pjp: 'PJP visit' };
  var GROUP_ORDER = ['sellin', 'demand', 'ga', 'pjp'];

  function H() { return typeof window !== 'undefined' && window.PERIOD_HISTORY ? window.PERIOD_HISTORY : null; }
  function mName(key) { return MON[+key.slice(5, 7) - 1] + ' ' + key.slice(2, 4); }
  function mShort(key) { return MON[+key.slice(5, 7) - 1]; }
  function prevKey(key) { var y = +key.slice(0, 4), m = +key.slice(5, 7); return m > 1 ? y + '-' + (m < 11 ? '0' : '') + (m - 1) : (y - 1) + '-12'; }
  function nDays(key) { return new Date(+key.slice(0, 4), +key.slice(5, 7), 0).getDate(); }
  function relabel(s) { return String(s || '').replace(/^BEKASI$/, 'KOTA BEKASI'); }

  /* ---- metrics and scopes ---- */
  function metricsInStore(h) {
    var ids = Object.keys(h.metadata.metrics).filter(function (m) { return Object.keys(h.months).some(function (k) { return h.months[k].series[m] || h.months[k].totals[m]; }); });
    return ids;
  }
  function groupOf(h, mid) { return h.metadata.metrics[mid].group; }
  function monthsFor(h, mid) { return Object.keys(h.months).filter(function (k) { return h.months[k].series[mid]; }).sort(); }
  function branches(h) {
    var seen = {}, out = [];
    Object.keys(h.metadata.mc_area || {}).forEach(function (k) { var b = h.metadata.mc_area[k]; if (b && !seen[b]) { seen[b] = 1; out.push(b); } });
    return out.sort();
  }
  function scopeKeys(h, scope) {   // series scopes that make up the chosen territory
    if (scope === 'ALL' || scope.indexOf('MC:') === 0) return [scope];
    var a = h.metadata.mc_area || {};
    return Object.keys(a).filter(function (k) { return a[k] === scope.slice(3); });
  }
  function dailyArr(h, key, mid, scope) {   // length = days of month; null = no data that day
    var mo = h.months[key], s = mo && mo.series[mid], n = mo ? mo.days : nDays(key), out = [], i, ks, any, v;
    for (i = 0; i < n; i++) out.push(null);
    if (!s) return out;
    ks = scopeKeys(h, scope).filter(function (k) { return s[k]; });
    for (i = 0; i < n; i++) {
      any = false; v = 0;
      ks.forEach(function (k) { if (s[k][i] != null) { any = true; v += s[k][i]; } });
      out[i] = any ? v : null;
    }
    return out;
  }
  function rangeSum(arr, to) {   // sum of days 1..to; nulls counted separately
    var v = 0, nn = 0, got = 0, i;
    for (i = 0; i < Math.min(to, arr.length); i++) { if (arr[i] == null) nn++; else { v += arr[i]; got++; } }
    return { v: got ? v : null, nulls: nn, days: Math.min(to, arr.length), got: got };
  }
  function fmShare(h, key, mid, scope) {   // full-month figure: daily series when the month is closed, else stored total
    var mo = h.months[key]; if (!mo) return { v: null, note: 'bulan belum diarsipkan' };
    var grp = groupOf(h, mid), cut = mo.groups[grp] ? mo.groups[grp].cut : 0;
    if (mo.series[mid]) {
      var r = rangeSum(dailyArr(h, key, mid, scope), mo.days);
      if (r.v == null) return { v: null, note: 'tidak ada data' };
      return { v: r.v, nulls: r.nulls, partial: cut < mo.days, cut: cut };
    }
    var t = mo.totals[mid] && mo.totals[mid][scope === 'ALL' || scope.indexOf('MC:') === 0 ? scope : '#'];
    if (t && t.fm != null) return { v: t.fm, nulls: 0, totalsOnly: true };
    if (scope.indexOf('BR:') === 0 && mo.totals[mid]) {   // branch from the MC totals
      var s = 0, got = false; scopeKeys(h, scope).forEach(function (k) { var x = mo.totals[mid][k]; if (x && x.fm != null) { s += x.fm; got = true; } });
      if (got) return { v: s, nulls: 0, totalsOnly: true };
    }
    return { v: null, note: 'hanya total, tanpa seri harian' };
  }

  /* ---- period model: MTD (C), LMTD (C-1, same days), FM (C-1), FM (C-2) ---- */
  function periods(h, mid, scope, C) {
    var P = prevKey(C), PP = prevKey(P), mo = h.months[C], grp = groupOf(h, mid), cut = mo.groups[grp] ? mo.groups[grp].cut : mo.days;
    var cArr = dailyArr(h, C, mid, scope), pArr = h.months[P] ? dailyArr(h, P, mid, scope) : null;
    var mtd = rangeSum(cArr, cut), lcut = Math.min(cut, nDays(P));
    var lm = pArr && h.months[P].series[mid] ? rangeSum(pArr, lcut) : { v: null };
    var f1 = fmShare(h, P, mid, scope), f2 = fmShare(h, PP, mid, scope);
    return {
      C: C, P: P, PP: PP, cut: cut, cDays: mo.days, lcut: lcut, closed: cut >= mo.days, cArr: cArr, pArr: pArr,
      pp: h.months[PP] && h.months[PP].series[mid] ? dailyArr(h, PP, mid, scope) : null,
      mtd: mtd, lmtd: lm, fmP: f1, fmPP: f2
    };
  }
  function growth(a, b) { return (a != null && b != null && b > 0) ? (a / b - 1) * 100 : null; }
  function gTag(g) {
    if (g == null) return '<span class="note">n/a</span>';
    var t = g > 999 ? '> +999%' : (g >= 0 ? '+' : '') + g.toFixed(1) + '%';
    return '<span class="' + (g >= 0 ? 'good-tag' : 'alert-tag') + '">' + t + '</span>';
  }

  /* ---- formatting by unit ---- */
  function fmt(api, mid, h, v) {
    if (v == null) return 'n/a';
    return h.metadata.metrics[mid].unit === 'rp' ? api.pjRp(v) : api.fmtCount(v);
  }

  /* ---- chart ---- */
  function chart(api, h, mid, p, mode) {
    var W = 720, Ht = 250, ml = 62, mr = 12, mt = 12, mb = 26, pw = W - ml - mr, ph = Ht - mt - mb, esc = api.esc;
    function cum(a, upto) { var s = 0, out = [], i; for (i = 0; i < a.length; i++) { if (a[i] == null || (upto && i >= upto)) { out.push(null); } else { s += a[i]; out.push(s); } } return out; }
    var series = [
      { name: 'MTD ' + mShort(p.C), arr: p.cArr, st: 'stroke:var(--ij-ink); stroke-width:2.6;', cut: p.cut },
      { name: mName(p.P), arr: p.pArr, st: 'stroke:var(--ij-accent); stroke-width:1.6;', cut: null },
      { name: mName(p.PP), arr: p.pp, st: 'stroke:var(--ij-grey-500); stroke-width:1.4; stroke-dasharray:5 3;', cut: null }
    ].filter(function (s) { return s.arr && s.arr.some(function (x) { return x != null; }); });
    if (!series.length) return '<p class="note">Belum ada seri harian untuk metrik ini.</p>';
    series.forEach(function (s) { s.d = mode === 'cum' ? cum(s.arr) : s.arr; });
    var mx = 1; series.forEach(function (s) { s.d.forEach(function (v) { if (v != null && v > mx) mx = v; }); });
    function X(day) { return ml + (day - 1) / 30 * pw; }
    function Y(v) { return mt + ph - (v / mx) * ph; }
    var out = '', i;
    for (i = 0; i <= 3; i++) {
      var yv = mx * i / 3;
      out += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + Y(yv).toFixed(1) + '" y2="' + Y(yv).toFixed(1) + '" style="stroke:var(--ij-hairline); stroke-width:1;"/>' +
        '<text x="' + (ml - 6) + '" y="' + (Y(yv) + 3).toFixed(1) + '" text-anchor="end" style="font:10px var(--ij-font); fill:var(--ij-muted);">' + esc(fmt(api, mid, h, yv)) + '</text>';
    }
    [1, 5, 10, 15, 20, 25, 30, 31].forEach(function (d) { out += '<text x="' + X(d).toFixed(1) + '" y="' + (Ht - 8) + '" text-anchor="middle" style="font:10px var(--ij-font); fill:var(--ij-muted);">' + d + '</text>'; });
    series.forEach(function (s) {
      var seg = [], pts = [];
      s.d.forEach(function (v, k) {
        if (v == null) { if (pts.length) { seg.push(pts); pts = []; } } else { pts.push(X(k + 1).toFixed(1) + ',' + Y(v).toFixed(1)); }
      });
      if (pts.length) seg.push(pts);
      seg.forEach(function (pt) { out += pt.length > 1 ? '<polyline points="' + pt.join(' ') + '" style="fill:none; ' + s.st + '"/>' : '<circle cx="' + pt[0].split(',')[0] + '" cy="' + pt[0].split(',')[1] + '" r="2.5" style="fill:var(--ij-ink);"/>'; });
    });
    if (!p.closed) out += '<line x1="' + X(p.cut).toFixed(1) + '" x2="' + X(p.cut).toFixed(1) + '" y1="' + mt + '" y2="' + (mt + ph) + '" style="stroke:var(--ij-ink-2); stroke-width:1; stroke-dasharray:2 3;"/>' +
      '<text x="' + (X(p.cut) + 4).toFixed(1) + '" y="' + (mt + 10) + '" style="font:10px var(--ij-font); fill:var(--ij-ink-2);">cut ' + p.cut + '</text>';
    var legend = series.map(function (s) { return '<span style="display:inline-block; margin-right:14px;"><svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" style="' + s.st + '"/></svg> ' + esc(s.name) + '</span>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + Ht + '" width="100%" role="img" aria-label="' + esc(h.metadata.metrics[mid].label + ' ' + (mode === 'cum' ? 'kumulatif' : 'harian')) + '" style="max-width:' + W + 'px; display:block;">' + out + '</svg>' +
      '<p class="note" style="margin:4px 0 0;">' + legend + '· sumbu x = tanggal dalam bulan; garis terputus = hari tanpa data (n/a)</p>';
  }

  function monthBars(api, h, mid, scope, C) {
    var keys = monthsFor(h, mid).concat(Object.keys(h.months).filter(function (k) { return !h.months[k].series[mid] && h.months[k].totals[mid]; })).sort();
    var rows = keys.map(function (k) {
      var f = fmShare(h, k, mid, scope), grp = groupOf(h, mid), cut = h.months[k].groups[grp] ? h.months[k].groups[grp].cut : 0;
      return { k: k, v: f.v, partial: f.partial || (cut > 0 && cut < h.months[k].days), cut: cut, tot: f.totalsOnly };
    });
    var mx = 1; rows.forEach(function (r) { if (r.v > mx) mx = r.v; });
    var W = 720, Ht = 150, ml = 62, bw = Math.min(70, (W - ml - 20) / Math.max(rows.length, 1) - 12), out = '';
    rows.forEach(function (r, i) {
      var x = ml + 14 + i * (bw + 12), h_ = r.v == null ? 0 : (r.v / mx) * (Ht - 40);
      out += '<rect x="' + x + '" y="' + (Ht - 22 - h_).toFixed(1) + '" width="' + bw + '" height="' + h_.toFixed(1) + '" style="fill:' + (r.k === C ? 'var(--ij-ink)' : (r.partial ? 'var(--ij-grey-400)' : 'var(--ij-grey-600)')) + ';"/>' +
        '<text x="' + (x + bw / 2) + '" y="' + (Ht - 8) + '" text-anchor="middle" style="font:10px var(--ij-font); fill:var(--ij-muted);">' + mName(r.k) + '</text>' +
        '<text x="' + (x + bw / 2) + '" y="' + (Ht - 26 - h_).toFixed(1) + '" text-anchor="middle" style="font:10px var(--ij-font); fill:var(--ij-ink);">' + api.esc(fmt(api, mid, h, r.v)) + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + Ht + '" width="100%" role="img" aria-label="Total per bulan" style="max-width:' + W + 'px; display:block;">' + out + '</svg>' +
      '<p class="note" style="margin:2px 0 0;">Abu terang = bulan berjalan / belum penuh (MTD); abu gelap = bulan penuh; hitam = bulan yang dipilih. Bulan yang hanya punya total (tanpa seri harian) tetap tampil sebagai batang.</p>';
  }

  /* ---- sections ---- */
  function controls(api, h, st, mid, scope, C, mode) {
    var esc = api.esc, byArea = {}, ids = metricsInStore(h);
    ids.forEach(function (m) { var a = h.metadata.metrics[m].area; (byArea[a] = byArea[a] || []).push(m); });
    var msel = '<select data-prv-in="metric" aria-label="Metrik">' + Object.keys(byArea).map(function (a) {
      return '<optgroup label="' + esc(a) + '">' + byArea[a].map(function (m) { return '<option value="' + esc(m) + '"' + (m === mid ? ' selected' : '') + '>' + esc(h.metadata.metrics[m].label) + '</option>'; }).join('') + '</optgroup>';
    }).join('') + '</select>';
    var br = branches(h);
    var ssel = '<select data-prv-in="scope" aria-label="Teritori"><option value="ALL"' + (scope === 'ALL' ? ' selected' : '') + '>Region (semua id)</option>' +
      '<optgroup label="Area (jumlah MC)">' + br.map(function (b) { return '<option value="BR:' + esc(b) + '"' + (scope === 'BR:' + b ? ' selected' : '') + '>' + esc(relabel(b)) + '</option>'; }).join('') + '</optgroup>' +
      '<optgroup label="MC">' + Object.keys(h.metadata.mc_area).sort().map(function (k) { return '<option value="' + esc(k) + '"' + (scope === k ? ' selected' : '') + '>' + esc(k.slice(3)) + '</option>'; }).join('') + '</optgroup></select>';
    var ms = monthsFor(h, mid);
    var csel = '<select data-prv-in="month" aria-label="Bulan berjalan">' + ms.slice().reverse().map(function (k) { return '<option value="' + k + '"' + (k === C ? ' selected' : '') + '>' + mName(k) + '</option>'; }).join('') + '</select>';
    return '<div class="map-toolbar" style="margin-top:6px;"><div class="map-toolbar-group"><label class="map-label">Metrik:</label>' + msel + '</div>' +
      '<div class="map-toolbar-group"><label class="map-label">Teritori:</label>' + ssel + '</div>' +
      '<div class="map-toolbar-group"><label class="map-label">Bulan berjalan:</label>' + csel + '</div>' +
      '<div class="map-toolbar-group"><label class="map-label">Tren:</label>' + api.toggleHtml('prv', [['daily', 'Harian'], ['cum', 'Kumulatif']], mode) + '</div></div>';
  }

  function kpiCards(api, h, mid, p) {
    var m = p.mtd, l = p.lmtd, f1 = p.fmP, f2 = p.fmPP, F = function (v) { return fmt(api, mid, h, v); };
    var proj = (m.v != null && !p.closed && p.cut > 0) ? m.v / p.cut * p.cDays : null;
    var perDay = function (v, d) { return (v != null && d > 0) ? F(v / d) + ' / hari' : 'n/a'; };
    var c1 = api.kpi('MTD ' + mShort(p.C) + ' (1–' + p.cut + ')', F(m.v),
      gTag(growth(m.v, l.v)) + ' vs LMTD ' + mShort(p.P) + ' · ' + gTag(growth(m.v, f1.v != null ? f1.v : null)) + ' vs FM ' + mShort(p.P),
      growth(m.v, l.v) == null || growth(m.v, l.v) >= 0 ? 'up' : 'down',
      perDay(m.v, p.cut - m.nulls) + (m.nulls ? ' · ' + m.nulls + ' hari tanpa data' : '') +
      (p.cut !== p.lcut && m.v != null && l.v != null ? ' · per hari vs LMTD ' + gTag(growth(m.v / p.cut, l.v / p.lcut)) + ' (' + p.cut + ' vs ' + p.lcut + ' hari)' : '') + (p.closed ? ' · bulan penuh' : ' · proyeksi akhir bulan ' + F(proj) + ' (× ' + p.cDays + ' hari)'));
    var c2 = api.kpi('LMTD ' + mShort(p.P) + ' (1–' + p.lcut + ')', F(l.v), l.v == null ? 'tidak ada seri harian ' + mName(p.P) : 'pembanding jumlah hari sama',
      'up', l.v == null ? 'Bulan ini hanya punya total, jadi LMTD harian tidak dapat dihitung.' : perDay(l.v, p.lcut - (l.nulls || 0)));
    var c3 = api.kpi('Full Month ' + mShort(p.P), F(f1.v), f1.v == null ? (f1.note || 'n/a') : (f1.partial ? 'belum penuh (cut ' + f1.cut + ')' : nDays(p.P) + ' hari'),
      'up', f1.v == null ? '' : perDay(f1.v, nDays(p.P)) + (f1.totalsOnly ? ' · hanya total' : ''));
    var c4 = api.kpi('Full Month ' + mShort(p.PP), F(f2.v), f2.v == null ? (f2.note || 'n/a') : (f2.partial ? 'belum penuh (cut ' + f2.cut + ')' : nDays(p.PP) + ' hari'),
      'up', f2.v == null ? '' : perDay(f2.v, nDays(p.PP)) + (f2.totalsOnly ? ' · hanya total (tanpa tren harian)' : ''));
    return '<div class="kpis" style="margin-top:6px;">' + c1 + c2 + c3 + c4 + '</div>';
  }

  function compareTable(api, h, mid, p) {
    var F = function (v) { return fmt(api, mid, h, v); }, base = p.mtd.v;
    var rows = [
      ['MTD ' + mName(p.C) + ' (1–' + p.cut + ')', p.mtd.v, p.cut - p.mtd.nulls],
      ['LMTD ' + mName(p.P) + ' (1–' + p.lcut + ')', p.lmtd.v, p.lcut - (p.lmtd.nulls || 0)],
      ['Full Month ' + mName(p.P), p.fmP.v, nDays(p.P)],
      ['Full Month ' + mName(p.PP), p.fmPP.v, nDays(p.PP)]
    ];
    return '<div class="tbl-wrap"><table class="tbl" data-nosort="1"><thead><tr>' + api.th('Periode') + api.th('Total', 1) + api.th('Hari', 1) + api.th('Rata-rata / hari', 1) + api.th('MTD vs periode ini', 1) + api.th('Gap MTD − periode', 1) + '</tr></thead><tbody>' +
      rows.map(function (r, i) {
        var gp = (i && base != null && r[1] != null) ? base - r[1] : null;
        return '<tr><td class="cur"><b>' + api.esc(r[0]) + '</b></td><td class="num">' + F(r[1]) + '</td><td class="num">' + (r[1] == null ? 'n/a' : r[2]) + '</td><td class="num">' + (r[1] != null && r[2] > 0 ? F(r[1] / r[2]) : 'n/a') +
          '</td><td class="num">' + (i ? gTag(growth(base, r[1])) : '—') + '</td><td class="num">' + (i ? (gp == null ? 'n/a' : (gp >= 0 ? '+' : '−') + F(Math.abs(gp))) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function dayTable(api, h, mid, p) {
    var F = function (v) { return fmt(api, mid, h, v); }, n = Math.max(p.cDays, p.pArr ? p.pArr.length : 0), rows = '', d, a, b, c;
    for (d = 1; d <= n; d++) {
      a = p.cArr[d - 1]; b = p.pArr ? p.pArr[d - 1] : null; c = p.pp ? p.pp[d - 1] : null;
      if (a == null && b == null && c == null) continue;
      rows += '<tr><td class="cur">' + d + '</td><td class="num">' + F(a) + '</td><td class="num">' + F(b) + '</td><td class="num">' + gTag(growth(a, b)) + '</td><td class="num">' + F(c) + '</td></tr>';
    }
    return '<details style="margin-top:8px;"><summary class="note" style="cursor:pointer;">Tabel harian (tanggal 1–' + n + ')</summary><div class="tbl-wrap"><table class="tbl" data-nosort="1"><thead><tr>' +
      api.th('Tgl') + api.th(mName(p.C), 1) + api.th(mName(p.P), 1) + api.th('Hari vs ' + mShort(p.P), 1) + api.th(mName(p.PP), 1) + '</tr></thead><tbody>' + rows + '</tbody></table></div></details>';
  }

  function coverage(api, h) {
    var esc = api.esc, keys = Object.keys(h.months).sort();
    var body = keys.map(function (k) {
      var mo = h.months[k];
      return '<tr><td class="cur"><b>' + mName(k) + '</b><br><span class="note">' + mo.days + ' hari</span></td>' + GROUP_ORDER.map(function (g) {
        var x = mo.groups[g], tx = g === 'demand' && mo.groups.demand_totals;
        if (!x && !tx) return '<td class="note">tidak ada</td>';
        if (!x && tx) return '<td><span class="alert-tag">hanya total</span><br><span class="note">LMTD dan Full Month tanpa seri harian</span></td>';
        var full = x.cut >= mo.days;
        return '<td>' + (full ? '<span class="good-tag">penuh</span>' : '<span class="alert-tag">MTD ' + x.cut + '/' + mo.days + '</span>') + '<br><span class="note">' + esc(String(x.updated || '').replace('T', ' ').slice(0, 16)) + '</span></td>';
      }).join('') + '</tr>';
    }).join('');
    var eb = h.endbal ? Object.keys(h.endbal).sort() : [];
    return api.card('Performa yang tersimpan · cakupan arsip bulanan',
      '<div class="tbl-wrap"><table class="tbl" data-nosort="1"><thead><tr>' + api.th('Bulan') + GROUP_ORDER.map(function (g) { return api.th(GROUP_NAME[g]); }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Arsip ada di <code>data/history/period_history.json</code> dan hanya diganti bila cut hari baru ≥ cut tersimpan, jadi bulan yang sudah ditutup tidak menyusut ketika feed berganti bulan. End Balance: ' + (eb.length ? eb.length + ' snapshot (' + eb[0] + (eb.length > 1 ? ' s.d. ' + eb[eb.length - 1] : '') + ') tersimpan sebagai titik; tren harian terbentuk seiring snapshot bertambah.' : 'belum ada snapshot.') + '</p>');
  }

  function notes(api, h, mid, p) {
    var out = [];
    if ([p.C, p.P, p.PP].indexOf('2026-10') >= 0) out.push('Oktober 2026: sell-in dan demand 1–9 Okt sangat rendah karena migrasi MOBII / MOBO, jadi MTD / LMTD yang menyertakan awal Oktober (LMTD Nov dan Okt vs Sep) tertekan secara struktural; ini bukan kesalahan feed.');
    if (p.cDays !== nDays(p.P)) out.push(p.cDays + ' hari (' + mName(p.C) + ') vs ' + nDays(p.P) + ' hari (' + mName(p.P) + '): LMTD berhenti di hari ke-' + p.lcut + ', Full Month dibandingkan lewat rata-rata per hari. Proyeksi akhir bulan memakai ' + p.cDays + ' hari.');
    var grp = groupOf(h, mid);
    if (grp === 'pjp') out.push('PJP: hari tanpa ekspor PJP tampil n/a dan tidak dihitung nol. Feed PJP dimulai 1 Okt 2026, jadi September tidak punya baseline PJP.');
    if (grp === 'demand') out.push('Demand September hanya tersimpan sebagai total (feed MOBO menyimpan bulan lalu sebagai LMTD dan Full Month). Tren harian demand dimulai Oktober.');
    if (grp === 'ga') out.push('GA di sini = Daily_RGUGA (outlet tagging). Basis lokasi aktivasi (site) hanya Oktober dan tidak ada di arsip ini.');
    out.push('Region = semua id termasuk yang di luar master; Area dan MC = id yang terpetakan ke MC, sehingga jumlah MC ≤ Region.');
    return '<ul style="margin:6px 0 0 18px;">' + out.map(function (s) { return '<li class="note">' + api.esc(s) + '</li>'; }).join('') + '</ul>';
  }

  function view(api) {
    var h = H(), st = api.state;
    if (!h) return api.card('Review Periode', '<p class="note">Arsip belum dimuat. Jalankan <code>python3 scripts/build_period_history.py</code>.</p>');
    var ids = metricsInStore(h);
    var mid = ids.indexOf(st.prMetric) >= 0 ? st.prMetric : (ids.indexOf('si.SP.q') >= 0 ? 'si.SP.q' : ids[0]);
    var scope = st.prScope || 'ALL';
    if (scope !== 'ALL' && scope.indexOf('MC:') !== 0 && scope.indexOf('BR:') !== 0) scope = 'ALL';
    var ms = monthsFor(h, mid), C = ms.indexOf(st.prMonth) >= 0 ? st.prMonth : ms[ms.length - 1];
    var mode = st.prView === 'cum' ? 'cum' : 'daily';
    var p = periods(h, mid, scope, C), title = h.metadata.metrics[mid].label;
    var head = api.card('Review Periode · MTD ' + mName(p.C) + ' · LMTD ' + mName(p.P) + ' · Full Month ' + mName(p.P) + ' · Full Month ' + mName(p.PP),
      '<p class="note" style="margin:0;">Empat periode dari arsip performa harian. Bulan berjalan = bulan yang dipilih (default terbaru); LMTD memakai jumlah hari yang sama; tren menumpuk tanggal ke tanggal.</p>' + controls(api, h, st, mid, scope, C, mode));
    var chartCard = api.card(api.esc(title) + ' · tren ' + (mode === 'cum' ? 'kumulatif' : 'harian') + ' · ' + api.esc(scope === 'ALL' ? 'Region' : relabel(scope.replace(/^(MC|BR):/, ''))),
      kpiCards(api, h, mid, p) + '<div style="height:8px;"></div>' + chart(api, h, mid, p, mode) + compareTable(api, h, mid, p) + dayTable(api, h, mid, p) + notes(api, h, mid, p));
    var monthCard = api.card('Tren bulanan · total ' + api.esc(title), monthBars(api, h, mid, scope, p.C));
    return head + chartCard + monthCard + coverage(api, h);
  }

  function click(v, api) {
    var s = api.state;
    if (v === 'daily' || v === 'cum') s.prView = v;
  }
  function change(el, api) {
    var s = api.state, k = el.getAttribute('data-prv-in');
    if (k === 'metric') { s.prMetric = el.value; s.prMonth = ''; }
    else if (k === 'scope') s.prScope = el.value;
    else if (k === 'month') s.prMonth = el.value;
  }

  var IJPeriods = { view: view, click: click, change: change, periods: periods, dailyArr: dailyArr, rangeSum: rangeSum, fmShare: fmShare, metricsInStore: metricsInStore, monthsFor: monthsFor };
  if (typeof window !== 'undefined') window.IJPeriods = IJPeriods;
  if (typeof module !== 'undefined' && module.exports) module.exports = IJPeriods;
})();
