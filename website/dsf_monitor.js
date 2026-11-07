/* Monitoring DSF · tab `prgTab=dsf` of Program & Tipe Outlet (mb_program). Contract: docs/assessments/dsf_outlet_flag.md.
   Roster feed: data/dsf_feed.js (scripts/build_dsf_manpower.py, sheet manpower DSF of DASHBOARD DSF: DMO/DMP, MC, partner, outlet ids).
   Actual = GA pcs at the outlet ids of each DSF, read from the GA feed (window.GA_FEED, outlet tagging) so it follows the daily update and the period toggle.
   Target (owner, 7 Nov 2026): 20 pcs per DSF per working day (Monday-Saturday), 500 pcs per DSF per month (25 working days).
   app.js hands over its helpers through `api` (window.IJDsf.view(api) / click(attr, api)), so this file never touches app internals. */
(function () {
  'use strict';

  var T_DAY = 20, T_MONTH = 500;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function F() { return typeof window !== 'undefined' ? window.DSF_FEED : null; }
  function f0(v) { return Math.round(v).toLocaleString('en-US'); }
  function f1(v) { return (Math.round(v * 10) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function pct(a, b) { return b > 0 ? Math.round(a / b * 100) + '%' : 'n/a'; }

  /* ---- calendar of the running GA month ---- */
  function calendar(G) {
    var md = G.metadata || {}, ym = String((md.months || {}).cur || ''), days = md.cur_days || 30, cut = md.cut_day || 0, y = +ym.slice(0, 4), m = +ym.slice(5, 7), wd = [], d, w = 0, wc = 0, wl = 0;
    for (d = 1; d <= days; d++) { var sun = new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0; wd[d] = !sun; if (!sun) { w++; if (d <= cut) wc++; } }
    wl = w - wc;
    return { ym: ym, days: days, cut: cut, wd: wd, wTotal: w, wCut: wc, wLeft: wl, hasT: ym >= '2026-11', dow: function (d) { return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; } };
  }

  /* ---- actuals per DSF: GA by id, daily ---- */
  function build(api) {
    var R = F(), G = api.gaFeed(); if (!R || !G) return null;
    var cal = calendar(G), byId = {}, people = R.people.map(function (p, i) {
      var o = { i: i, p: p, arr: [], ids: p.ids.map(function (x) { return { id: x[0], b: x[1], arr: [], found: false }; }) };
      for (var d = 0; d <= 31; d++) o.arr.push(0);
      o.ids.forEach(function (x) { for (var d = 0; d <= 31; d++) x.arr.push(0); (byId[x.id] = byId[x.id] || []).push(x); });
      return o;
    });
    G.outlets.forEach(function (r) {
      var hit = byId[r.i]; if (!hit) return;
      var a = api.gaDays(r.o);      /* an outlet row with no GA this month still counts as found in the feed */
      hit.forEach(function (x) { x.found = true; for (var d = 1; d <= 31; d++) x.arr[d] += a[d]; });
    });
    people.forEach(function (o) { o.ids.forEach(function (x) { for (var d = 1; d <= 31; d++) o.arr[d] += x.arr[d]; }); o.found = o.ids.filter(function (x) { return x.found; }).length; });
    return { cal: cal, people: people, meta: R.metadata };
  }
  function sumArr(list) { var a = [], d; for (d = 0; d <= 31; d++) a.push(0); list.forEach(function (o) { for (d = 1; d <= 31; d++) a[d] += o.arr[d]; }); return a; }
  function mtd(arr, cut) { var s = 0, d; for (d = 1; d <= cut; d++) s += arr[d]; return s; }

  /* ---- one table row: label, ket, ids text, list of persons (or [id-row]) ---- */
  function row(c, label, ket, idt, list, style, nDsf) {
    var cal = c.cal, arr = sumArr(list), m = mtd(arr, cal.cut), n = nDsf, tCut = n * T_DAY * cal.wCut, tMon = n * T_MONTH, ink = /ink/.test(style || ''), cells = '', d;
    var crr = cal.wCut ? m / cal.wCut : null, rrr = cal.wLeft ? Math.max(0, tMon - m) / cal.wLeft : null;
    for (d = 1; d <= cal.days; d++) {
      var v = arr[d], bg = '', txt;
      if (!cal.wd[d]) txt = '<span title="Minggu">·</span>';
      else if (d > cal.cut) txt = '·';
      else {
        txt = f0(v);
        if (n && cal.hasT && !ink) { var r = v / (n * T_DAY); bg = ' style="background:' + (r >= 1 ? 'rgba(31,107,58,.28)' : r >= 0.5 ? 'rgba(202,138,4,.22)' : 'rgba(185,28,28,.16)') + ';"'; }
      }
      cells += '<td class="num"' + bg + (ink ? ' style="color:#fff;"' : '') + '>' + txt + '</td>';
    }
    var t = cal.hasT && n;
    var ach = t ? m / tCut : null, achCell = ach == null ? '<td class="num">n/a</td>' : '<td class="num" style="font-weight:700; color:' + (ach >= 1 ? '#166534' : ach >= 0.8 ? '#92400e' : '#991b1b') + ';">' + Math.round(ach * 100) + '%</td>';
    var bgl = ink ? 'var(--ij-ink)' : (/wash/.test(style || '') ? 'var(--ij-wash)' : '#fff');
    return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur" style="position:sticky; left:0; background:' + bgl + ';">' + label + '</td><td>' + ket + '</td><td>' + idt + '</td>' +
      '<td class="num cur"><b>' + f0(m) + '</b></td>' +
      (cal.hasT ? '<td class="num">' + (t ? f0(tCut) : 'n/a') + '</td>' + achCell + '<td class="num">' + (t ? f0(m - tCut) : 'n/a') + '</td><td class="num">' + (t ? f0(tMon) : 'n/a') + '</td><td class="num">' + (t ? pct(m, tMon) : 'n/a') + '</td><td class="num">' + (crr == null ? 'n/a' : f1(crr)) + '</td><td class="num">' + (rrr == null || !t ? 'n/a' : f1(rrr)) + '</td>' : '') +
      cells + '</tr>';
  }

  function open(state, key, dflt) { var o = state.dsfOpen || {}; if (state.dsfAll === 'open') return true; if (state.dsfAll === 'close') return false; return o[key] === undefined ? dflt : o[key]; }
  function tg(key, op) { return '<button type="button" class="btn" data-dsf="t:' + esc(key) + '" aria-expanded="' + op + '" style="padding:2px 8px; font-size:13px; margin-right:6px;">' + (op ? '－' : '＋') + '</button>'; }

  function view(api) {
    var c = build(api);
    if (!c) return api.card('Monitoring DSF', '<p class="note">Feed DSF belum dimuat. Jalankan <code>python3 scripts/build_dsf_manpower.py</code> (butuh <code>raw/Catalogue/DASHBOARD DSF*.xlsx</code>) dan pastikan feed GA tersedia.</p>');
    var st = api.state, cal = c.cal, P = c.people, nAll = P.length, all = sumArr(P), mAll = mtd(all, cal.cut), tCutAll = nAll * T_DAY * cal.wCut, tMonAll = nAll * T_MONTH;
    var perDsf = P.map(function (o) { return { o: o, m: mtd(o.arr, cal.cut) }; }), hit = perDsf.filter(function (x) { return x.m >= T_DAY * cal.wCut; }).length, zero = perDsf.filter(function (x) { return !x.m; }).length;
    var noId = P.filter(function (o) { return !o.ids.length; }), noFeed = P.filter(function (o) { return o.ids.length && !o.found; });
    var idsAll = 0, idsFound = 0; P.forEach(function (o) { o.ids.forEach(function (x) { idsAll++; if (x.found) idsFound++; }); });
    var best = cal.cut ? Math.max.apply(null, all.slice(1, cal.cut + 1)) : 0;

    var kp = '<div class="kpis" style="margin-top:10px;">' +
      api.kpi('GA MTD · semua DSF', f0(mAll), cal.hasT ? pct(mAll, tCutAll) + ' dari target s/d D' + cal.cut : 'target mulai November', cal.hasT && mAll >= tCutAll ? 'up' : 'down', f0(nAll) + ' DSF · ' + f0(idsFound) + ' dari ' + f0(idsAll) + ' ID ketemu di feed GA') +
      (cal.hasT ? api.kpi('Target s/d D' + cal.cut, f0(tCutAll), 'gap ' + f0(mAll - tCutAll), mAll >= tCutAll ? 'up' : 'down', f0(nAll) + ' DSF × ' + T_DAY + ' pcs × ' + cal.wCut + ' hari kerja') : '') +
      (cal.hasT ? api.kpi('Rata-rata GA / DSF / hari kerja', f1(cal.wCut && nAll ? mAll / cal.wCut / nAll : 0), 'target ' + T_DAY + ' pcs', cal.wCut && nAll && mAll / cal.wCut / nAll >= T_DAY ? 'up' : 'down', 'CRR · ' + cal.wCut + ' hari kerja berjalan, ' + cal.wLeft + ' tersisa') : '') +
      (cal.hasT ? api.kpi('DSF capai target s/d D' + cal.cut, f0(hit) + ' / ' + f0(nAll), pct(hit, nAll), hit / nAll >= 0.5 ? 'up' : 'down', f0(zero) + ' DSF belum ada GA sama sekali') : '') +
      (cal.hasT ? api.kpi('Target bulan', f0(tMonAll), pct(mAll, tMonAll) + ' tercapai', 'flat', T_MONTH + ' pcs × ' + nAll + ' DSF · ' + cal.wTotal + ' hari kerja · RRR ' + (cal.wLeft ? f1(Math.max(0, tMonAll - mAll) / cal.wLeft / nAll) : 'n/a') + ' / DSF / hari') : '') + '</div>';

    /* tree: DSF category > Area > DMO/DMP > DSF manpower > outlet id */
    var rows = [], areas = {}, aOrd;
    P.forEach(function (o) { var a = o.p.br || '—'; (areas[a] = areas[a] || {}); (areas[a][o.p.dmo || '—'] = areas[a][o.p.dmo || '—'] || []).push(o); });
    function flat(a) { var l = []; Object.keys(a).forEach(function (k) { l = l.concat(a[k]); }); return l; }
    aOrd = Object.keys(areas).sort(function (x, y) { return mtd(sumArr(flat(areas[y])), cal.cut) - mtd(sumArr(flat(areas[x])), cal.cut); });
    rows.push(row(c, '<b>DSF · kategori (manpower DSF)</b>', aOrd.length + ' area · ' + Object.keys(aOrd.reduce(function (s, a) { Object.keys(areas[a]).forEach(function (k) { s[k] = 1; }); return s; }, {})).length + ' DMO / DMP', '', P, 'background:var(--ij-ink); color:#fff; font-weight:800;', nAll));
    aOrd.forEach(function (a) {
      var AL = flat(areas[a]), ka = 'A:' + a, oa = open(st, ka, true);
      rows.push(row(c, tg(ka, oa) + '<b>' + esc(a) + '</b>', 'Area · ' + AL.length + ' DSF', '', AL, 'background:var(--ij-wash); font-weight:800;', AL.length));
      if (!oa) return;
      Object.keys(areas[a]).sort(function (x, y) { return mtd(sumArr(areas[a][y]), cal.cut) - mtd(sumArr(areas[a][x]), cal.cut); }).forEach(function (dm) {
        var DL = areas[a][dm], kd = 'D:' + a + '|' + dm, od = open(st, kd, false);
        rows.push(row(c, '<span style="padding-left:18px;">' + tg(kd, od) + '<b>' + esc(dm) + '</b></span>', 'DMO / DMP · ' + DL.length + ' DSF', '', DL, 'font-weight:700;', DL.length));
        if (!od) return;
        DL.slice().sort(function (x, y) { return mtd(y.arr, cal.cut) - mtd(x.arr, cal.cut); }).forEach(function (o) {
          var ks = 'S:' + o.i, os = open(st, ks, false), tag = !o.ids.length ? ' <span class="note" style="color:#991b1b;">· ID outlet belum ada</span>' : (!o.found ? ' <span class="note" style="color:#991b1b;">· ID tidak ketemu di feed GA</span>' : '');
          rows.push(row(c, '<span style="padding-left:44px;">' + (o.ids.length ? tg(ks, os) : '<span style="display:inline-block; width:30px;"></span>') + esc(o.p.n) + tag + '</span>',
            esc((o.p.mc || '').replace(/^MC-/, '')) + (o.p.emb ? ' · ' + esc(o.p.emb.toLowerCase()) : '') + (o.p.pt ? '<br><span class="note">' + esc(o.p.pt) + '</span>' : ''),
            o.ids.map(function (x) { return esc(x.id) + ' <span class="note">' + x.b + '</span>'; }).join('<br>') || '—', [o], '', 1));
          if (os) o.ids.forEach(function (x) { rows.push(row(c, '<span style="padding-left:78px;" class="note">ID outlet ' + x.b + '</span>', x.found ? 'ada di feed GA' : '<span style="color:#991b1b;">tidak ketemu di feed GA</span>', esc(x.id), [{ arr: x.arr }], 'color:var(--ij-muted);', 0)); });
        });
      });
    });

    var dh = '', d;
    for (d = 1; d <= cal.days; d++) dh += '<th class="num" title="' + cal.dow(d) + '">D' + d + (cal.wd[d] ? '' : '<br><span class="note">Min</span>') + '</th>';
    var head = '<tr>' + api.th('Kategori › Area › DMO / DMP › DSF') + api.th('MC · partner') + api.th('ID outlet (OUTLET DSF · QR 3ID)') + api.th('GA MTD', 1) +
      (cal.hasT ? api.th('Target s/d D' + cal.cut, 1) + api.th('% target', 1) + api.th('Gap', 1) + api.th('Target bulan', 1) + api.th('% bulan', 1) + api.th('CRR / hari', 1) + api.th('RRR / hari', 1) : '') + dh + '</tr>';
    var tools = '<div class="map-toolbar" style="margin-bottom:8px;"><button type="button" class="btn" data-dsf="all:1">＋ Buka semua</button><button type="button" class="btn" data-dsf="all:0">－ Tutup semua</button><button type="button" class="btn" data-dsf="csv">📥 Unduh (CSV)</button></div>';
    var notes = '<p class="note"><b>Ukuran = GA pcs</b> di ID outlet DSF (kolom OUTLET DSF dan QR CODE 3ID DSF, sheet manpower DSF), basis outlet tagging (Daily_RGUGA) sampai D' + cal.cut + '. ' +
      (cal.hasT ? '<b>Target</b> ' + T_DAY + ' pcs per DSF per hari kerja (Senin–Sabtu; Minggu libur, tampil ·) dan ' + T_MONTH + ' pcs per DSF per bulan (' + cal.wTotal + ' hari kerja). % target = GA MTD ÷ (jumlah DSF × ' + T_DAY + ' × hari kerja berjalan); CRR = GA MTD ÷ hari kerja berjalan; RRR = (target bulan − MTD) ÷ hari kerja tersisa. Warna sel harian: hijau ≥ 100% target hari itu, kuning 50–99%, merah &lt; 50%. ' : 'Target DSF berlaku mulai November; periode ini hanya menampilkan GA. ') +
      'ID outlet DSF hampir semuanya non-PJP (di luar master), jadi tidak masuk insentif DSE dan total MC master. ' +
      (noId.length ? 'Tanpa ID outlet: ' + noId.map(function (o) { return esc(o.p.n); }).join(', ') + '. ' : '') + (noFeed.length ? 'ID belum ketemu di feed GA: ' + noFeed.map(function (o) { return esc(o.p.n); }).join(', ') + '. ' : '') +
      'Target program DSF di Bridge Target (12,500) = 25 DSF × 500; roster ini ' + nAll + ' DSF × 500 = ' + f0(tMonAll) + '. Hari terakhir data dapat terisi sebagian. Sumber roster: ' + esc(c.meta.source) + '.</p>';
    return api.card('Monitoring DSF · GA per DSF manpower · target ' + T_DAY + ' pcs / hari · ' + T_MONTH + ' pcs / bulan', kp + tools + '<div class="tbl-wrap"><table class="tbl wide" data-nosort="1"><thead>' + head + '</thead><tbody>' + rows.join('') + '</tbody></table></div>' + notes);
  }

  function csv(api) {
    var c = build(api); if (!c) return;
    var cal = c.cal, out = [['DSF', 'Area', 'DMO / DMP', 'MC', 'Partner', 'Embarkasi', 'Login IM3', 'Login 3ID', 'ID outlet DSF (IM3)', 'ID outlet 3ID (QR)', 'GA MTD', 'Target s/d D' + cal.cut, '% target', 'Target bulan']];
    var d; for (d = 1; d <= cal.days; d++) out[0].push('D' + d);
    c.people.forEach(function (o) {
      var m = mtd(o.arr, cal.cut), t = cal.hasT ? T_DAY * cal.wCut : '', im = o.ids.filter(function (x) { return x.b === 'IM3'; })[0], i3 = o.ids.filter(function (x) { return x.b === '3ID'; })[0];
      var r = [o.p.n, o.p.br, o.p.dmo, o.p.mc, o.p.pt, o.p.emb, o.p.l1, o.p.l3, im ? im.id : '', i3 ? i3.id : '', m, t, cal.hasT && t ? Math.round(m / t * 100) + '%' : '', cal.hasT ? T_MONTH : ''];
      for (d = 1; d <= cal.days; d++) r.push(!cal.wd[d] || d > cal.cut ? '' : o.arr[d]);
      out.push(r);
    });
    var text = out.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'monitoring_dsf_' + cal.ym + '_D' + cal.cut + '.csv'; a.click();
  }

  function click(attr, api) {
    var st = api.state;
    if (attr === 'csv') { csv(api); return false; }
    if (attr.indexOf('all:') === 0) { st.dsfAll = attr === 'all:1' ? 'open' : 'close'; st.dsfOpen = {}; return true; }
    if (attr.indexOf('t:') === 0) {
      var k = attr.slice(2), cur = open(st, k, k.indexOf('A:') === 0);
      st.dsfAll = ''; st.dsfOpen = st.dsfOpen || {}; st.dsfOpen[k] = !cur; return true;
    }
    return false;
  }

  window.IJDsf = { view: view, click: click };
})();
