/* Stok Outlet · Over / Par / Low stock for SP, Voucher and Saldo, per Outlet, Site, Kecamatan, MC, Area and Region.
   Menu mb_stock. Feed: data/stock_feed.js (scripts/build_stock_feed.py). Contract: docs/assessments/stock_outlet_overstock_map.md.
   app.js hands over its helpers through the `api` argument (window.IJStock.view(api) etc.), so this file never touches app internals. */
(function () {
  'use strict';

  var PRODUCTS = [['sp', 'Starter Pack', 'pcs'], ['vc', 'Voucher', 'Rp'], ['sa', 'Saldo', 'Rp']];
  var DEF_TH = { sp: [7, 30], vc: [7, 30], sa: [3, 14] };          // days of cover: below first = Low, above second = Over
  var ST = { low: ['Low Stock', '#dc2626', '#fecaca', 'bad'], par: ['At Par', '#ca8a04', '#fde68a', 'warn'], over: ['Over Stock', '#16a34a', '#86efac', 'ok'], idle: ['Tidak aktif / tanpa data', '#6b7280', '#e5e7eb', 'none'] };
  var LEVELS = [['area', 'Area'], ['mc', 'MC'], ['kec', 'Kecamatan'], ['site', 'Site'], ['outlet', 'Outlet']];
  var I = null, C = null, cacheKey = '', cache = null;

  function F() { return typeof window !== 'undefined' ? window.STOCK_FEED : null; }
  function init(f) {
    if (I) return;
    I = {}; f.metadata.cols.forEach(function (c, i) { I[c] = i; }); C = f.metadata.cuts;
  }
  function prodSel(state) { var s = String(state.stProd || 'sp,vc,sa').split(',').filter(function (p) { return PRODUCTS.some(function (x) { return x[0] === p; }); }); return s.length ? s : ['sp', 'vc', 'sa']; }
  function thr(state, p) { var t = state.stTh && state.stTh[p]; return t && t.length === 2 ? t : DEF_TH[p]; }

  /* ---- status of one stock position: stock (unit), rate (unit per day) ---- */
  function statusOf(stock, rate, th) {
    if (!(rate > 0)) return stock > 0 ? 'over' : 'idle';
    if (stock <= 0) return 'low';
    var cov = stock / rate;
    return cov < th[0] ? 'low' : (cov > th[1] ? 'over' : 'par');
  }
  /* one outlet row, one product -> {inF, inM, outF, outM, stock, rate, st} or null when the outlet has nothing in that product */
  function calc(r, p, state) {
    var th = thr(state, p), o;
    if (p === 'sa') {
      var st = r[I.eb_st] + (state.stSaOther ? r[I.eb_ot] : 0), av = r[I.eb_av];
      o = { inF: r[I.sa_in_fm], inM: r[I.sa_in_mtd], outF: r[I.sa_out_fm], outM: r[I.sa_out_mtd], stock: st, rate: av, ebAv: av };
      if (!(o.inF || o.inM || o.outF || o.outM || st || r[I.eb_ot] || av)) return null;
      o.st = (st === 0 && av === 0 && !r[I.eb_ot]) ? 'idle' : statusOf(st, av, th);        // no ENDBAL row = no data (idle)
    } else {
      o = { inF: r[I[p + '_in_fm']], inM: r[I[p + '_in_mtd']], outF: r[I[p + '_out_fm']], outM: r[I[p + '_out_mtd']] };
      if (!(o.inF || o.inM || o.outF || o.outM)) return null;
      var days = p === 'sp' ? C.ga : C.demand;
      o.stock = o.inF + o.inM - o.outF - o.outM;
      o.rate = o.outM > 0 ? o.outM / days : o.outF / C.base_days;
      o.st = statusOf(o.stock, o.rate, th);
    }
    return o;
  }
  function combine(sts) {            // worst of the selected products that have activity
    var a = sts.filter(function (s) { return s && s !== 'idle'; });
    if (!a.length) return 'idle';
    return a.indexOf('low') >= 0 ? 'low' : (a.indexOf('par') >= 0 ? 'par' : 'over');
  }

  /* ---- enriched outlet list (scope filter applied) ---- */
  function scoped(state, f) {
    var mi = f.metadata.mc_info || {}, q = String(state.stSearch || '').toLowerCase(), out = [];
    f.outlets.forEach(function (r, ix) {
      var mc = r[I.mc], info = mi[mc] || {};
      if (state.branch && r[I.br] !== state.branch) return;
      if (state.hoa && info.hoa !== state.hoa) return;
      if (state.kec && mc !== state.kec) return;
      if (q && (r[I.n] + ' ' + r[I.k] + ' ' + mc + ' ' + r[I.dse] + ' ' + r[I.site] + ' ' + r[I.kec]).toLowerCase().indexOf(q) === -1) return;
      out.push(ix);
    });
    return out;
  }
  function enrich(state, f) {
    var sel = prodSel(state), key = JSON.stringify([state.stTh, state.stSaOther, sel, state.stSearch, state.branch, state.hoa, state.kec]);
    if (cache && cacheKey === key) return cache;
    var idx = scoped(state, f), rows = [];
    idx.forEach(function (ix) {
      var r = f.outlets[ix], pr = {}, sts = [];
      PRODUCTS.forEach(function (p) { var c = calc(r, p[0], state); pr[p[0]] = c; if (sel.indexOf(p[0]) >= 0) sts.push(c && c.st); });
      var cs = combine(sts);
      if (cs === 'idle' && !sel.some(function (p) { return pr[p]; })) return;       // nothing in the selected products
      rows.push({ r: r, pr: pr, st: cs });
    });
    cache = rows; cacheKey = key; return rows;
  }

  /* ---- aggregate a list of enriched rows ---- */
  function aggregate(rows, state) {
    var A = { n: rows.length, cnt: { low: 0, par: 0, over: 0, idle: 0 }, p: {} };
    PRODUCTS.forEach(function (p) { A.p[p[0]] = { inF: 0, inM: 0, outF: 0, outM: 0, stock: 0, rate: 0, n: 0 }; });
    rows.forEach(function (x) {
      A.cnt[x.st]++;
      PRODUCTS.forEach(function (p) {
        var c = x.pr[p[0]]; if (!c) return; var a = A.p[p[0]];
        a.inF += c.inF; a.inM += c.inM; a.outF += c.outF; a.outM += c.outM; a.n++;
        a.stock += Math.max(c.stock, 0); a.rate += Math.max(c.rate || 0, 0);
      });
    });
    var sts = [];
    prodSel(state).forEach(function (p) { var a = A.p[p]; a.st = a.n ? (a.n && !a.stock && !a.rate ? 'idle' : statusOf(a.stock, a.rate, thr(state, p))) : 'idle'; sts.push(a.st); });
    A.st = combine(sts);
    return A;
  }
  function groupBy(rows, level) {
    var g = {}, order = [];
    rows.forEach(function (x) {
      var r = x.r, key, label, mc = r[I.mc] || '(tanpa MC)', br = r[I.br] || 'OUTSIDE MASTER TERRITORY';
      if (level === 'area') { key = br; label = br; }
      else if (level === 'mc') { key = mc; label = mc; }
      else if (level === 'kec') { key = r[I.kec] || '(tanpa kecamatan)'; label = key; }
      else if (level === 'site') { var s = r[I.site] && r[I.site] !== 'PENDING-NBS' ? r[I.site] : '(tanpa site)'; key = s + '|' + mc; label = s; }
      else { key = r[I.k]; label = r[I.n] || r[I.k]; }
      var G = g[key]; if (!G) { G = g[key] = { key: key, label: label, br: br, mc: mc, kec: r[I.kec] || '', rows: [], lat: 0, lon: 0, ll: 0 }; order.push(key); }
      G.rows.push(x);
      if (r[I.lat] != null && r[I.lon] != null && r[I.lat] < -5.5 && r[I.lat] > -7.5 && r[I.lon] > 106 && r[I.lon] < 108) { G.lat += r[I.lat]; G.lon += r[I.lon]; G.ll++; }
    });
    return order.map(function (k) { return g[k]; });
  }

  /* ---- formatting ---- */
  function val(api, p, v) { return p === 'sp' ? api.fmtCount(v) + ' pcs' : api.pjRp(v); }
  function stTag(api, st) { return api.dkTag(ST[st][3], ST[st][0]); }
  function covTxt(a) { return a && a.rate > 0 ? Math.round(a.stock / a.rate) + ' hr' : '—'; }
  function cellsFor(api, state, A, single) {
    return prodSel(state).map(function (p) {
      var a = A.p[p];
      if (!a || !a.n) return '<td class="num" colspan="6" style="color:var(--ij-label);">·</td>';
      var stock = single ? A.pr[p].stock : a.stock;
      var estimate = p === 'sa' ? '' : ' <span class="note">est.</span>';
      return '<td class="num">' + val(api, p, a.inF) + '</td><td class="num">' + val(api, p, a.inM) + '</td><td class="num">' + val(api, p, a.outF) + '</td><td class="num">' + val(api, p, a.outM) + '</td>' +
        '<td class="num cur"><b>' + val(api, p, stock) + '</b>' + estimate + '<br><span class="note">' + covTxt({ stock: Math.max(stock, 0), rate: a.rate }) + '</span></td><td>' + stTag(api, single ? A.pr[p].st : a.st) + '</td>';
    }).join('');
  }
  function mix(A) {
    var n = A.n || 1;
    function seg(k) { return A.cnt[k] ? '<span title="' + ST[k][0] + ' ' + A.cnt[k] + '" style="display:inline-block; height:10px; width:' + (A.cnt[k] / n * 100).toFixed(1) + '%; background:' + ST[k][1] + ';"></span>' : ''; }
    return '<div style="display:flex; width:110px; background:#f3f4f6;">' + seg('low') + seg('par') + seg('over') + seg('idle') + '</div><span class="note">' + A.cnt.low + ' · ' + A.cnt.par + ' · ' + A.cnt.over + '</span>';
  }
  function head(api, state, first) {
    var sel = prodSel(state);
    var h1 = '<tr>' + api.th(first) + '<th class="num">Outlet</th><th>Status</th>' + sel.map(function (p) { return '<th colspan="6" style="text-align:center; border-left:1px solid var(--ij-hairline);">' + PRODUCTS.filter(function (x) { return x[0] === p; })[0][1] + '</th>'; }).join('') + '</tr>';
    var sub = ['Sell-in Sep', 'Sell-in Okt MTD', 'Sell-out Sep', 'Sell-out Okt MTD', 'Stok · cover', 'Status'];
    var h2 = '<tr><th></th><th></th><th></th>' + sel.map(function () { return sub.map(function (s, i) { return '<th class="num"' + (i === 0 ? ' style="border-left:1px solid var(--ij-hairline);"' : '') + '>' + s + '</th>'; }).join(''); }).join('') + '</tr>';
    return h1 + h2;
  }
  function rowCells(api, state, A, single) { return '<td class="num">' + api.fmtCount(A.n) + '</td><td>' + (single ? stTag(api, A.st) : mix(A)) + '</td>' + cellsFor(api, state, A, single); }

  /* ---- controls ---- */
  function chip(cmd, label, on, extra) { return '<button type="button" class="map-btn' + (on ? ' active' : '') + '" data-st="' + cmd + '"' + (extra || '') + '>' + label + '</button>'; }
  function controls(api, state) {
    var sel = prodSel(state), lv = state.stLevel || 'area', tab = state.stTab || 'ringkasan';
    var th = PRODUCTS.map(function (p) {
      var t = thr(state, p[0]);
      return '<span class="note" style="margin-right:12px;">' + p[1] + ': Low &lt; <input type="number" min="0" step="1" value="' + t[0] + '" data-st-in="th|' + p[0] + '|0" style="width:52px;"> hr · Over &gt; <input type="number" min="1" step="1" value="' + t[1] + '" data-st-in="th|' + p[0] + '|1" style="width:52px;"> hr</span>';
    }).join('');
    return '<div class="sub-nav" role="tablist">' + [['ringkasan', '📊 Ringkasan & Tabel'], ['peta', '🗺️ Peta Over · Par · Low']].map(function (t) { return '<button type="button" role="tab" class="sub-nav-btn' + (tab === t[0] ? ' active' : '') + '" data-st="tab:' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="map-toolbar" style="margin-top:10px;"><div class="map-toolbar-group"><span class="map-label">Produk:</span>' + PRODUCTS.map(function (p) { return chip('prod:' + p[0], p[1], sel.indexOf(p[0]) >= 0); }).join('') + '</div>' +
      '<div class="map-toolbar-group"><span class="map-label">Level:</span>' + LEVELS.map(function (l) { return chip('lvl:' + l[0], l[1], lv === l[0]); }).join('') + '</div>' +
      '<div class="map-toolbar-group"><span class="map-label">Tampilkan:</span>' + [['all', 'Semua']].concat(['low', 'par', 'over', 'idle'].map(function (k) { return [k, ST[k][0]]; })).map(function (x) { return chip('stat:' + x[0], x[1], (state.stStat || 'all') === x[0]); }).join('') + '</div>' +
      '<div class="map-toolbar-group"><input type="text" id="stSearch" data-st-in="search" aria-label="Cari outlet, site, kecamatan, MC atau DSE" placeholder="🔍 Cari outlet, ID, site, kecamatan, MC, DSE… (Enter)" value="' + api.esc(state.stSearch || '') + '" class="map-select" style="min-width:260px;"></div></div>' +
      '<div class="map-toolbar" style="margin-top:6px;"><div class="map-toolbar-group">' + chip('sa:other', (state.stSaOther ? '✔ ' : '') + 'Saldo: tambahkan rekening lain (ENDBAL)', !!state.stSaOther) + '</div><div class="map-toolbar-group">' + th + '<button type="button" class="btn" data-st="th:reset" style="font-size:12px; padding:3px 8px;">Reset ambang</button></div></div>';
  }
  function methodNote(state) {
    return '<p class="note" style="margin-top:8px;"><b>Cara membaca.</b> Periode: Sep = September penuh, Okt MTD = 1 s.d. cut (SP/GA ' + C.ga + ' Okt; Voucher dan Saldo ' + C.supply + ' Okt). ' +
      '<b>SP</b>: sell-in = Starter Pack MOBII + SP Injection (pcs), sell-out = Gross Add RGUGA outlet itu; stok = sell-in − sell-out sejak 1 Sep (estimasi arus, stok awal tidak diketahui). ' +
      '<b>Voucher</b>: sell-in = MOBII voucher isi + blank (Rp), sell-out = Voucher Injection MOBO (Rp); stok = estimasi arus yang sama. ' +
      '<b>Saldo</b>: stok = balance Stock Account ENDBAL ' + (F().metadata.endbal_snapshot || '') + ' (nyata, bukan estimasi), cover = balance ÷ rata-rata transaksi harian; sell-in = transfer SALMO, sell-out = Saldo Mobo (kolom informasi). ' +
      'Cover (hari) = stok ÷ rata-rata sell-out per hari (MTD; bila nol, September ÷ 30). <span style="color:#dc2626;"><b>Low</b></span> = cover di bawah ambang bawah atau stok ≤ 0 saat ada penjualan; ' +
      '<span style="color:#ca8a04;"><b>Par</b></span> = di antara ambang; <span style="color:#16a34a;"><b>Over</b></span> = di atas ambang bawah atas, atau ada stok tanpa penjualan; abu-abu = tidak ada aktivitas atau tidak ada baris ENDBAL. ' +
      'Baris agregat: stok = jumlah stok positif outlet, cover dari total laju penjualan; kolom Outlet menunjukkan sebaran Low · Par · Over. Dengan beberapa produk terpilih, status gabungan = terburuk (Low jika salah satu Low). Ambang dapat diubah di atas.</p>';
  }

  /* ---- table ---- */
  function filterGroups(groups, state) {
    var f = state.stStat || 'all';
    return f === 'all' ? groups : groups.filter(function (G) { return G.A.st === f; });
  }
  function tableHtml(api, state, groups, rows) {
    var lv = state.stLevel || 'area', total = aggregate(rows, state);
    var first = LEVELS.filter(function (l) { return l[0] === lv; })[0][1];
    var totRow = '<tr style="background:var(--ij-ink); color:#fff; font-weight:800;"><td>REGION · ' + api.esc(api.scopeText()) + '</td>' + rowCells(api, state, total, false).replace(/class="note"/g, 'class="note" style="color:#fff;"') + '</tr>';
    var cols = 3 + prodSel(state).length * 6, body;
    if (lv === 'area' || lv === 'mc' || lv === 'kec') {
      body = groups.map(function (G) {
        return '<tr><td class="cur"><b>' + api.esc(G.label) + '</b>' + (lv !== 'area' ? '<br><span class="note">' + api.esc(lv === 'mc' ? G.br : G.mc + ' · ' + G.br) + '</span>' : '') + '</td>' + rowCells(api, state, G.A, false) +
          (lv === 'area' || lv === 'mc' ? '' : '') + '</tr>';
      }).join('');
    } else {
      var mi = F().metadata.mc_info || {};
      body = api.grpBody('stk' + lv, { items: groups, area: function (G) { return G.br; }, mc: function (G) { return G.mc; }, dso: function (m) { return (mi[m] || {}).dso || '—'; },
        hoa: function (a) { for (var k in mi) if (mi[k].br === a) return mi[k].hoa || '—'; return '—'; }, unit: lv === 'site' ? 'site' : 'outlet', span: 1, cols: cols, cap: 100, search: !!state.stSearch,
        val: function (G) { return G.A.cnt.low; },
        sub: function (items) { var rs = []; items.forEach(function (G) { rs = rs.concat(G.rows); }); return rowCells(api, state, aggregate(rs, state), false); },
        row: function (G) {
          var sub = lv === 'outlet' ? '<br><span class="note"><code>' + api.esc(G.rows[0].r[I.k]) + '</code> · ' + api.esc(G.rows[0].r[I.dse] || '—') + ' · ' + api.esc(G.kec || '—') + '</span>' : '<br><span class="note">' + api.esc(G.mc) + ' · ' + api.esc(G.kec || '—') + '</span>';
          return '<tr><td class="cur" style="padding-left:40px;"><b>' + api.esc(G.label) + '</b>' + sub + '</td>' + rowCells(api, state, G.A, lv === 'outlet' ? false : false) + '</tr>';
        } });
    }
    var nGrp = groups.length;
    return api.card('Stok per ' + first + ' · ' + api.fmtCount(nGrp) + ' ' + first.toLowerCase() + ' · ' + api.esc(api.scopeText()),
      ((lv === 'site' || lv === 'outlet') ? '<div class="map-toolbar" style="margin-bottom:8px;">' + api.grpBar('stk' + lv) + '</div>' : '') +
      '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head(api, state, lv === 'site' || lv === 'outlet' ? 'Area › MC › ' + first : first) + '</thead><tbody>' + totRow + body + '</tbody></table></div>');
  }
  function kpis(api, state, rows) {
    var A = aggregate(rows, state);
    return '<div class="kpis" style="margin-top:10px;">' + prodSel(state).map(function (p) {
      var a = A.p[p], name = PRODUCTS.filter(function (x) { return x[0] === p; })[0][1], c = { low: 0, par: 0, over: 0, idle: 0 };
      rows.forEach(function (x) { if (x.pr[p]) c[x.pr[p].st]++; });
      return api.kpi('Stok ' + name + (p === 'sa' ? ' · ENDBAL' : ' · estimasi'), val(api, p, a.stock), 'Low ' + api.fmtCount(c.low) + ' · Par ' + api.fmtCount(c.par) + ' · Over ' + api.fmtCount(c.over) + ' outlet', a.st === 'low' ? 'down' : 'up',
        'sell-in Sep ' + val(api, p, a.inF) + ' · Okt ' + val(api, p, a.inM) + ' · sell-out Sep ' + val(api, p, a.outF) + ' · Okt ' + val(api, p, a.outM) + ' · cover ' + covTxt(a));
    }).join('') + '</div>';
  }

  /* ---- map ---- */
  function hull(pts) {          // monotone chain on [lat, lon]
    var p = pts.slice().sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
    if (p.length < 3) return p;
    function cross(o, a, b) { return (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]); }
    var lo = [], up = [], i;
    for (i = 0; i < p.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p[i]) <= 0) lo.pop(); lo.push(p[i]); }
    for (i = p.length - 1; i >= 0; i--) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop(); up.push(p[i]); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  function popupHtml(api, state, G) {
    var sel = prodSel(state), A = G.A, lv = state.stLevel || 'area';
    var rows = sel.map(function (p) {
      var a = A.p[p], nm = PRODUCTS.filter(function (x) { return x[0] === p; })[0][1];
      if (!a.n) return '<tr><td>' + nm + '</td><td colspan="5">—</td></tr>';
      var stock = lv === 'outlet' ? G.rows[0].pr[p].stock : a.stock, stt = lv === 'outlet' ? G.rows[0].pr[p].st : a.st;
      return '<tr><td><b>' + nm + '</b></td><td>' + val(api, p, a.inF) + '</td><td>' + val(api, p, a.inM) + '</td><td>' + val(api, p, a.outF) + '</td><td>' + val(api, p, a.outM) + '</td><td><b>' + val(api, p, stock) + '</b> · ' + covTxt({ stock: Math.max(stock, 0), rate: a.rate }) + ' ' + '<span style="color:' + ST[stt][1] + ';">●</span> ' + ST[stt][0] + '</td></tr>';
    }).join('');
    return '<div style="min-width:330px; font-size:12px;"><b>' + api.esc(G.label) + '</b><br>' + api.esc(lv === 'area' ? '' : (lv === 'mc' ? G.br : G.mc + ' · ' + G.br)) +
      '<br>' + api.fmtCount(A.n) + ' outlet · <span style="color:' + ST.low[1] + ';">Low ' + A.cnt.low + '</span> · <span style="color:' + ST.par[1] + ';">Par ' + A.cnt.par + '</span> · <span style="color:' + ST.over[1] + ';">Over ' + A.cnt.over + '</span> · Tidak aktif ' + A.cnt.idle +
      '<table style="margin-top:6px; border-collapse:collapse; width:100%;"><tr style="text-align:left; border-bottom:1px solid #ccc;"><th></th><th>In Sep</th><th>In Okt</th><th>Out Sep</th><th>Out Okt</th><th>Stok</th></tr>' + rows + '</table>' +
      (lv !== 'area' || true ? '<div style="margin-top:6px;"><button type="button" class="btn" data-st="focus:' + api.esc(G.mc) + '|' + api.esc(G.br) + '" style="font-size:12px; padding:3px 9px;">Fokus MC ' + api.esc(G.mc) + ' &#8594;</button></div>' : '') + '</div>';
  }
  function mapHtml(api, state, groups) {
    var leg = ['low', 'par', 'over', 'idle'].map(function (k) { return '<span style="margin-right:12px;"><span style="display:inline-block; width:12px; height:12px; background:' + ST[k][2] + '; border:2px solid ' + ST[k][1] + '; vertical-align:-2px;"></span> ' + ST[k][0] + '</span>'; }).join('');
    return api.card('Peta stok · ' + (LEVELS.filter(function (l) { return l[0] === (state.stLevel || 'area'); })[0][1]) + ' · ' + prodSel(state).map(function (p) { return PRODUCTS.filter(function (x) { return x[0] === p; })[0][1]; }).join(' + '),
      '<div id="st-map" style="height:620px; background:#e5e7eb;" data-n="' + groups.length + '"></div><p class="note" style="margin-top:6px;">' + leg + '· Poligon = batas terluar (convex hull) outlet dalam level terpilih; site dengan kurang dari 3 outlet digambar sebagai lingkaran. Klik poligon untuk rincian dan tombol Fokus. Ganti Level, Produk atau Tampilkan di atas; filter Branch / HoA / MC di bar atas.</p>');
  }
  function drawMap(api) {
    if (typeof L === 'undefined' || typeof document === 'undefined') return;
    var el = document.getElementById('st-map'); if (!el) return;
    var state = api.state, f = F(); if (!f) return;
    init(f);
    var groups = view_groups(api, state, f).groups;
    if (window._stMapInstance) { try { window._stMapInstance.remove(); } catch (e) {} window._stMapInstance = null; }
    var map = L.map('st-map', { center: [-6.225, 106.845], zoom: 10, minZoom: 8, maxZoom: 19, preferCanvas: true, zoomAnimation: false });
    window._stMapInstance = map;
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri', maxZoom: 19 }).addTo(map);
    var lv = state.stLevel || 'area', bounds = [], layers = L.layerGroup().addTo(map);
    // draw big polygons first so small ones stay clickable on top
    var items = groups.map(function (G) {
      var pts = []; G.rows.forEach(function (x) { var r = x.r; if (r[I.lat] != null && r[I.lon] != null && r[I.lat] < -5.5 && r[I.lat] > -7.5 && r[I.lon] > 106 && r[I.lon] < 108) pts.push([r[I.lat], r[I.lon]]); });
      var hp = pts;
      if (lv !== 'outlet' && pts.length >= 10) {          // trim stray coordinates: keep the 90% of outlets closest to the median so one bad GPS point does not stretch the polygon
        var ml = pts.map(function (p) { return p[0]; }).sort(function (a, b) { return a - b; })[pts.length >> 1], mo = pts.map(function (p) { return p[1]; }).sort(function (a, b) { return a - b; })[pts.length >> 1];
        var ds = pts.map(function (p) { return Math.hypot(p[0] - ml, p[1] - mo); }), cut = ds.slice().sort(function (a, b) { return a - b; })[Math.floor(pts.length * 0.9) - 1];
        hp = pts.filter(function (p, i) { return ds[i] <= cut; });
      }
      return { G: G, pts: pts, h: lv === 'outlet' ? null : hull(hp) };
    }).filter(function (x) { return x.pts.length; });
    items.sort(function (a, b) { return b.pts.length - a.pts.length; });
    items.forEach(function (it) {
      var G = it.G, c = ST[G.A.st], layer;
      if (lv === 'outlet') {
        layer = L.circleMarker(it.pts[0], { radius: 4, color: c[1], weight: 1, fillColor: c[2], fillOpacity: 0.95 });
      } else if (it.h && it.h.length >= 3 && it.pts.length >= 3) {
        layer = L.polygon(it.h, { color: c[1], weight: lv === 'site' ? 1 : 2, fillColor: c[2], fillOpacity: lv === 'site' ? 0.7 : 0.55 });
      } else {
        var cx = it.pts.reduce(function (s, p) { return s + p[0]; }, 0) / it.pts.length, cy = it.pts.reduce(function (s, p) { return s + p[1]; }, 0) / it.pts.length;
        layer = L.circle([cx, cy], { radius: 150, color: c[1], weight: 1, fillColor: c[2], fillOpacity: 0.8 });
      }
      layer.bindPopup(popupHtml(api, state, G)); layer.bindTooltip(G.label + ' · ' + c[0], { sticky: true }); layer.addTo(layers);
      (it.h && it.h.length ? it.h : it.pts).forEach(function (p) { bounds.push(p); });
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [14, 14] });
    setTimeout(function () { try { map.invalidateSize(); } catch (e) {} }, 200);
  }

  function view_groups(api, state, f) {
    init(f);
    var rows = enrich(state, f), lv = state.stLevel || 'area';
    var groups = groupBy(rows, lv);
    groups.forEach(function (G) { G.A = aggregate(G.rows, state); });
    groups = filterGroups(groups, state);
    groups.sort(function (a, b) { return (b.A.cnt.low / Math.max(b.A.n, 1)) - (a.A.cnt.low / Math.max(a.A.n, 1)) || b.A.cnt.low - a.A.cnt.low; });
    return { rows: rows, groups: groups };
  }

  var IJStock = {
    view: function (api) {
      var f = F(), state = api.state;
      if (!f) return api.card('Stok Outlet', '<p class="note">Feed belum dibangun. Jalankan <code>python3 scripts/build_stock_feed.py</code>.</p>');
      var v = view_groups(api, state, f), tab = state.stTab || 'ringkasan';
      var body = tab === 'peta' ? mapHtml(api, state, v.groups) : kpis(api, state, v.rows) + tableHtml(api, state, v.groups, v.rows);
      return controls(api, state) + body + methodNote(state);
    },
    after: function (api) { if ((api.state.stTab || 'ringkasan') === 'peta') drawMap(api); },
    click: function (cmd, api) {
      var s = api.state, a = cmd.split(':'), k = a[0], v = a.slice(1).join(':');
      if (k === 'tab') s.stTab = v;
      else if (k === 'prod') { var sel = prodSel(s), i = sel.indexOf(v); if (i >= 0) { if (sel.length > 1) sel.splice(i, 1); } else sel.push(v); s.stProd = PRODUCTS.map(function (p) { return p[0]; }).filter(function (p) { return sel.indexOf(p) >= 0; }).join(','); }
      else if (k === 'lvl') s.stLevel = v;
      else if (k === 'stat') s.stStat = v;
      else if (k === 'sa') s.stSaOther = !s.stSaOther;
      else if (k === 'th') s.stTh = null;
      else if (k === 'focus') { var p = v.split('|'); s.kec = p[0]; if (p[1]) s.branch = p[1]; s.hoa = ''; }
      cache = null;
    },
    change: function (el, api) {
      var s = api.state, key = el.getAttribute('data-st-in');
      if (key === 'search') s.stSearch = el.value;
      else if (key.indexOf('th|') === 0) {
        var p = key.split('|'), cur = thr(s, p[1]).slice(), n = parseFloat(el.value);
        if (isFinite(n) && n >= 0) cur[+p[2]] = n; s.stTh = s.stTh || {}; s.stTh[p[1]] = cur;
      }
      cache = null;
    }
  };
  if (typeof window !== 'undefined') window.IJStock = IJStock;
  if (typeof module !== 'undefined') module.exports = IJStock;
})();
