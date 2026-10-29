/* Vanguard 5G · Briefing Pagi DSE. Menu mb_vanguard. Feed: data/vanguard_feed.js (scripts/build_vanguard_feed.py).
   Contract: docs/assessments/vanguard_5g_site_briefing.md. app.js hands over its helpers through `api`, so this file never touches app internals. */
(function () {
  'use strict';

  var STEPS = ['Speed test 5G', 'Outlet engagement', 'Outlet branding', 'Outlet advocacy', 'Street branding'];
  var TABS = [['brief', '☀️ Briefing Pagi'], ['progres', '📊 Progres Step 1-5'], ['site', '📡 Daftar Site'], ['dq', '🔎 Kualitas Data']];
  var LEVELS = [['area', 'Area'], ['mc', 'MC'], ['dso', 'DSO'], ['dse', 'DSE']];
  var COL = { D: ['#dcfce7', '#166534'], P: ['#fef3c7', '#92400e'], B: ['#f3f4f6', '#6b7280'] };
  var flash = '';

  function F() { return typeof window !== 'undefined' ? window.VANGUARD : null; }
  var WD = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], MN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(i) { var p = String(i).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function dayLabel(i) { var d = parse(i); return WD[d.getDay()] + ', ' + d.getDate() + ' ' + MN[d.getMonth()] + ' ' + d.getFullYear(); }
  function todayDay(f) {   // today when the plan covers it, else the first planned date
    var t = iso(new Date()), m = f.metadata;
    return t >= m.plan_from && t <= m.plan_to && parse(t).getDay() !== 0 ? t : m.plan_from;
  }
  function dayOf(state, f) { return /^\d{4}-\d{2}-\d{2}$/.test(state.vgDay || '') ? state.vgDay : todayDay(f); }
  function stepDay(cur, dir, f) {   // previous / next working date inside the plan range (Sundays skipped)
    var d = parse(cur), m = f.metadata;
    do { d.setDate(d.getDate() + dir); } while (d.getDay() === 0);
    var r = iso(d); return r < m.plan_from ? m.plan_from : (r > m.plan_to ? m.plan_to : r);
  }
  function pct(a, b) { return b ? (100 * a / b).toFixed(1) + '%' : 'n/a'; }
  function chips(s, only) {
    var out = '';
    for (var i = 0; i < 5; i++) {
      if (only && only.indexOf(i) < 0) continue;
      var c = COL[s.charAt(i)];
      out += '<span title="Step ' + (i + 1) + ' ' + STEPS[i] + '" style="display:inline-block;min-width:22px;text-align:center;margin-right:2px;padding:1px 4px;font:700 12px var(--ij-font);background:' + c[0] + ';color:' + c[1] + ';">' + (i + 1) + '</span>';
    }
    return out;
  }
  function mapLink(la, lo, txt) {   // coordinate text + Google Maps link
    if (la == null || lo == null) return '';
    return '<a href="https://www.google.com/maps?q=' + la + ',' + lo + '" target="_blank" rel="noopener" title="Buka di Google Maps">' + (txt || (la + ', ' + lo)) + '</a>';
  }
  function stepChips3(s) {   // outlet row: steps 2, 3, 4
    var out = '';
    for (var i = 0; i < 3; i++) { var c = COL[s.charAt(i)]; out += '<span style="display:inline-block;min-width:20px;text-align:center;margin-right:2px;padding:0 4px;font:700 11px var(--ij-font);background:' + c[0] + ';color:' + c[1] + ';">' + (i + 2) + '</span>'; }
    return out;
  }

  /* ---- scope ---- */
  function scope(state, f) {
    var okD = {}, dses = f.dses;
    dses.forEach(function (d, i) {
      if (state.branch && d.br !== state.branch) return;
      if (state.hoa && d.hoa !== state.hoa) return;
      if (state.kec && d.mc !== state.kec) return;
      okD[i] = 1;
    });
    var sites = [];
    f.sites.forEach(function (s, i) {
      if (s.d >= 0 ? !okD[s.d] : ((state.kec && s.mc !== state.kec) || state.branch || state.hoa)) return;
      sites.push(i);
    });
    return { okD: okD, sites: sites };
  }
  function ctl(api, state, f) {
    var tab = state.vgTab || 'brief';
    var bar = '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group" role="group" aria-label="Tab">' + TABS.map(function (t) {
      return '<button type="button" class="map-btn' + (tab === t[0] ? ' active' : '') + '" data-vg="tab:' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    if (tab === 'brief') {
      var day = dayOf(state, f), mt = f.metadata;
      bar += '<div class="map-toolbar-group" role="group" aria-label="Tanggal"><span class="map-label">Tanggal:</span>' +
        '<button type="button" class="map-btn" data-vg="dstep:-1" title="Hari kerja sebelumnya">‹</button>' +
        '<input type="date" data-vg-in="date" value="' + day + '" min="' + mt.plan_from + '" max="' + mt.plan_to + '" style="padding:5px 8px;border:1px solid var(--ij-ink);font:600 14px var(--ij-font);">' +
        '<button type="button" class="map-btn" data-vg="dstep:1" title="Hari kerja berikutnya">›</button>' +
        '<button type="button" class="map-btn' + (day === todayDay(f) ? ' active' : '') + '" data-vg="today">Hari ini</button>' +
        '<span class="map-label" style="margin-left:6px;"><b>' + api.esc(dayLabel(day)) + '</b></span></div>';
    }
    if (tab === 'progres') {
      var lv = state.vgLevel || 'mc';
      bar += '<div class="map-toolbar-group" role="group" aria-label="Level"><span class="map-label">Level:</span>' + LEVELS.map(function (l) {
        return '<button type="button" class="map-btn' + (lv === l[0] ? ' active' : '') + '" data-vg="lvl:' + l[0] + '" aria-pressed="' + (lv === l[0]) + '">' + l[1] + '</button>';
      }).join('') + '</div>';
    }
    if (tab === 'site') {
      var sp = state.vgStep || 'all';
      bar += '<div class="map-toolbar-group" role="group" aria-label="Step belum"><span class="map-label">Step belum:</span>' + [['all', 'Semua']].concat(STEPS.map(function (x, i) { return ['' + (i + 1), 'Step ' + (i + 1)]; })).concat([['lengkap', 'Lengkap']]).map(function (l) {
        return '<button type="button" class="map-btn' + (sp === l[0] ? ' active' : '') + '" data-vg="step:' + l[0] + '" aria-pressed="' + (sp === l[0]) + '">' + l[1] + '</button>';
      }).join('') + '</div><input type="search" data-vg-in="search" placeholder="Cari site / kecamatan / DSE" value="' + api.esc(state.vgSearch || '') + '" style="padding:5px 8px;border:1px solid var(--ij-ink);font:500 14px var(--ij-font);">';
    }
    return bar + '</div>' + (flash ? '<p class="note" role="status">' + api.esc(flash) + '</p>' : '');
  }
  function sourceNote(api, f) {
    var m = f.metadata;
    return '<p class="note">Sumber: ' + api.esc(m.sources.join(' + ')) + ' · snapshot ' + api.esc(m.snapshot_date) + ' · rencana dihitung ' + api.esc(m.plan_date) + '. PJP mengikuti template mingguan (minggu ' + api.esc(m.pjp_template_week || '—') + '), dianggap sama untuk November (asumsi owner 29 Okt 2026); satu site muncul sekali per bulan kalender; November mulai siklus baru dengan mapping DSE yang sama dan tidak memperhitungkan jadwal Oktober. Status step dari Vanguard; DSE ditentukan dari master aplikasi (bukan DSE ID Vanguard); ' +
      m.sites_per_day + ' site per DSE per hari, terdekat dari rute PJP hari itu (radius ' + m.radius_km + ' km). Kontrak: <code>docs/assessments/vanguard_5g_site_briefing.md</code>.' +
      (m.prev_snapshot ? '' : ' Progres antar file (sync) mulai terlihat setelah file Vanguard berikutnya.') + '</p>';
  }

  /* ---- Briefing ---- */
  function siteBlock(api, f, ent) {
    var s = f.sites[ent[0]], todo = [];
    if (s.s.charAt(0) !== 'D') todo.push('Step 1 Speed test 5G (di site)');
    if (s.s.charAt(4) !== 'D') todo.push('Step 5 Street branding (di site)');
    var ol = ent[3].map(function (x) {
      var o = f.outlets[x[0]], miss = [];
      [2, 3, 4].forEach(function (n, i) { if (o.s.charAt(i) !== 'D') miss.push(n); });
      return '<div style="font-size:13px;line-height:1.3;">' + (x[1] ? '<b title="Outlet ada di PJP hari ini">▸ </b>' : '· ') + api.esc(o.n || o.id) + ' <span style="color:var(--ij-muted)">' + stStepList(miss) + '</span>' + (o.la != null ? ' <span style="font-size:11px;">' + mapLink(o.la, o.lo, '📍 ' + o.la + ', ' + o.lo) + '</span>' : '') + '</div>';
    }).join('');
    return '<div style="min-width:230px;"><b>' + api.esc(s.n) + '</b><div style="font-size:12px;color:var(--ij-muted)">' + api.esc(s.kc) + ' · ' + ent[1].toFixed(1) + ' km dari rute' + (ent[2] ? ' · <b style="color:var(--ij-red-700)">di luar radius</b>' : '') + '</div>' +
      '<div style="font-size:12px;">📍 ' + mapLink(s.la, s.lo) + '</div><div style="margin:3px 0;">' + chips(s.s) + '</div>' +
      (todo.length ? '<div style="font-size:13px;">' + todo.join('<br>') + '</div>' : '') +
      (ol ? '<div style="margin-top:3px;"><span style="font-size:12px;color:var(--ij-muted)">Outlet (▸ = PJP hari ini)</span>' + ol + '</div>' : '<div style="font-size:12px;color:var(--ij-muted)">Step 2-4 selesai atau tidak ada outlet terpetakan</div>') + '</div>';
  }
  function stStepName(n) { return 'S' + n; }
  function stStepList(a) { return a.map(stStepName).join(' '); }
  function briefData(state, f, sc) {
    var day = dayOf(state, f), pl = f.plan[day] || {}, byMc = {};   // day = ISO date
    Object.keys(pl).forEach(function (k) {
      if (!sc.okD[k]) return;
      var d = f.dses[k];
      (byMc[d.mc] = byMc[d.mc] || []).push({ ix: +k, d: d, p: pl[k] });
    });
    Object.keys(byMc).forEach(function (m) { byMc[m].sort(function (a, b) { return a.d.n < b.d.n ? -1 : 1; }); });
    return { day: day, byMc: byMc };
  }
  function brief(api, state, f, sc) {
    var b = briefData(state, f, sc), mcs = Object.keys(b.byMc).sort(), ndse = 0, nsite = 0, nout = 0;
    mcs.forEach(function (m) { b.byMc[m].forEach(function (r) { ndse++; nsite += r.p.s.length; r.p.s.forEach(function (e) { nout += e[3].length; }); }); });
    var kp = '<div class="kpi-row">' + api.kpi('DSE dengan rencana ' + dayLabel(b.day), api.fmtCount(ndse), 'dari ' + Object.keys(sc.okD).length + ' DSE di scope', 'flat', 'DSE yang punya site belum lengkap') +
      api.kpi('Site dikunjungi (rencana)', api.fmtCount(nsite), 'maks ' + f.metadata.sites_per_day + ' per DSE', 'flat', 'site 5G belum lengkap Step 1-5') +
      api.kpi('Outlet target Step 2-4', api.fmtCount(nout), 'sambil PJP', 'flat', 'outlet di site terpilih yang masih ada step belum Done') + '</div>';
    if (!mcs.length) return kp + api.card('Briefing Pagi · ' + dayLabel(b.day), '<p class="note">' + noPlanWhy(f, b.day) + '</p>');
    var html = mcs.map(function (m) {
      var rows = b.byMc[m], mi = (f.metadata.mc_info || {})[m] || {};
      var body = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('DSE') + api.th('PJP hari ini', true) + api.th('Site 1') + api.th('Site 2') + api.th('Site 3') + '</tr></thead><tbody>' + rows.map(function (r) {
        var cells = ''; for (var i = 0; i < f.metadata.sites_per_day; i++) cells += '<td style="vertical-align:top;">' + (r.p.s[i] ? siteBlock(api, f, r.p.s[i]) : '<span style="color:var(--ij-muted)">tidak ada site lagi</span>') + '</td>';
        return '<tr><td style="vertical-align:top;white-space:nowrap;"><b>' + api.esc(r.d.n) + '</b><div class="dse-login">IM3 ' + api.esc(r.d.l3 || '—') + ' · 3ID ' + api.esc(r.d.li || '—') + '</div></td><td class="num" style="vertical-align:top;">' + r.p.pjp + '</td>' + cells + '</tr>';
      }).join('') + '</tbody></table></div>';
      return api.card(api.esc(m) + ' · DSO ' + api.esc(mi.dso || '—') + ' · ' + rows.length + ' DSE <button type="button" class="map-btn" data-vg="wa:' + api.esc(m) + '" style="float:right;font-size:12px;">📋 Salin teks WhatsApp</button>', body);
    }).join('');
    return kp + html;
  }
  function noPlanWhy(f, day) {
    var m = f.metadata;
    if (parse(day).getDay() === 0) return 'Hari Minggu: template PJP tidak punya hari Minggu, jadi tidak ada rencana.';
    if (day < m.plan_from || day > m.plan_to) return 'Rencana tersedia ' + dayLabel(m.plan_from) + ' sampai ' + dayLabel(m.plan_to) + '.';
    return 'Tidak ada DSE dengan rencana pada tanggal ini di scope ini: site belum lengkap DSE bulan ini sudah terjadwal di tanggal sebelumnya (satu site sekali per bulan) atau sudah lengkap.';
  }
  function waText(state, f, mc) {
    var sc = scope(state, f), b = briefData(state, f, sc), rows = b.byMc[mc] || [], mi = (f.metadata.mc_info || {})[mc] || {};
    var t = '*VANGUARD 5G · ' + mc + ' · ' + dayLabel(b.day) + '*\nDSO: ' + (mi.dso || '-') + '\nTarget: ' + f.metadata.sites_per_day + ' site per DSE di sela PJP. Step 1 Speed test 5G · 2 Engagement · 3 Branding · 4 Advocacy · 5 Street branding\n';
    rows.forEach(function (r) {
      t += '\n*' + r.d.n + '* (PJP ' + r.p.pjp + ' outlet)\n';
      r.p.s.forEach(function (e, i) {
        var s = f.sites[e[0]], todo = [];
        s.s.split('').forEach(function (c, k) { if (c !== 'D') todo.push(k + 1); });
        t += (i + 1) + '. ' + s.n + ' (' + s.kc + ', ' + e[1].toFixed(1) + ' km) - Step ' + todo.join(',') + '\n   Lokasi: ' + s.la + ', ' + s.lo + ' https://maps.google.com/?q=' + s.la + ',' + s.lo + '\n';
        var on = e[3].slice(0, 4).map(function (x) { return (f.outlets[x[0]].n || f.outlets[x[0]].id); });
        if (on.length) t += '   Outlet: ' + on.join(', ') + '\n';
      });
    });
    return t;
  }
  function copyText(txt) {
    flash = 'Teks WhatsApp tersalin.';
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt); return; }
      var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) { flash = 'Salin ditolak oleh browser.'; }
  }

  /* ---- Progres ---- */
  function keyOf(f, s, lv) {
    var d = s.d >= 0 ? f.dses[s.d] : null, mi = (f.metadata.mc_info || {})[d ? d.mc : s.mc] || {};
    if (lv === 'area') return [s.ar, s.ar];
    if (lv === 'mc') return [s.mc, s.mc + ' · ' + s.ar];
    if (lv === 'dso') return [(mi.dso || '—') + '|' + s.mc, (mi.dso || '—') + ' · ' + s.mc];
    return [d ? d.n + '|' + d.mc : '— tanpa DSE —', d ? d.n + ' · ' + d.mc : '— tanpa DSE —'];
  }
  function progres(api, state, f, sc) {
    var lv = state.vgLevel || 'mc', g = {}, tot = { n: 0, c: 0, st: [0, 0, 0, 0, 0], gn: 0 }, hasPrev = !!f.metadata.prev_snapshot;
    sc.sites.forEach(function (i) {
      var s = f.sites[i], k = keyOf(f, s, lv), r = g[k[0]] = g[k[0]] || { l: k[1], n: 0, c: 0, st: [0, 0, 0, 0, 0], p: 0, gn: 0 };
      [r, tot].forEach(function (x) {
        x.n++; if (s.s === 'DDDDD') x.c++;
        for (var j = 0; j < 5; j++) if (s.s.charAt(j) === 'D') x.st[j]++;
        x.gn += f.sgain[s.id] || 0;
      });
    });
    var kp = '<div class="kpi-row">' + api.kpi('Site 5G di scope', api.fmtCount(tot.n), 'lengkap ' + api.fmtCount(tot.c) + ' (' + pct(tot.c, tot.n) + ')', 'flat', 'Step 1-5 semua Done') +
      api.kpi('Step terselesaikan', pct(tot.st.reduce(function (a, b) { return a + b; }, 0), tot.n * 5), api.fmtCount(tot.st.reduce(function (a, b) { return a + b; }, 0)) + ' dari ' + api.fmtCount(tot.n * 5), 'flat', 'site x 5 step') +
      api.kpi('Tambahan sejak file sebelumnya', hasPrev ? api.fmtCount(tot.gn) : 'n/a', hasPrev ? 'step baru Done sejak ' + f.metadata.prev_snapshot : 'belum ada file pembanding', 'flat', 'ukuran sync / kepatuhan') + '</div>';
    var rows = Object.keys(g).sort(function (a, b) { return g[a].l < g[b].l ? -1 : 1; });
    var body = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th(LEVELS.filter(function (l) { return l[0] === lv; })[0][1]) + api.th('Site', true) + api.th('Lengkap', true) + api.th('% lengkap', true) +
      [1, 2, 3, 4, 5].map(function (n) { return api.th('Step ' + n + ' Done', true); }).join('') + api.th('Δ step', true) + '</tr></thead><tbody>' +
      rows.map(function (k) {
        var r = g[k];
        return '<tr><td>' + api.esc(r.l) + '</td><td class="num">' + api.fmtCount(r.n) + '</td><td class="num">' + api.fmtCount(r.c) + '</td><td class="num">' + pct(r.c, r.n) + '</td>' +
          r.st.map(function (x) { return '<td class="num">' + pct(x, r.n) + '<div style="font-size:11px;color:var(--ij-muted)">' + api.fmtCount(x) + '</div></td>'; }).join('') + '<td class="num">' + (hasPrev ? api.fmtCount(r.gn) : 'n/a') + '</td></tr>';
      }).join('') + '<tr style="font-weight:800;"><td>Total</td><td class="num">' + api.fmtCount(tot.n) + '</td><td class="num">' + api.fmtCount(tot.c) + '</td><td class="num">' + pct(tot.c, tot.n) + '</td>' +
      tot.st.map(function (x) { return '<td class="num">' + pct(x, tot.n) + '<div style="font-size:11px;font-weight:500;">' + api.fmtCount(x) + '</div></td>'; }).join('') + '<td class="num">' + (hasPrev ? api.fmtCount(tot.gn) : 'n/a') + '</td></tr></tbody></table></div>';
    return kp + api.card('Progres Step 1-5 per ' + LEVELS.filter(function (l) { return l[0] === lv; })[0][1], body);
  }

  /* ---- Daftar site ---- */
  function siteList(api, state, f, sc) {
    var sp = state.vgStep || 'all', q = String(state.vgSearch || '').toLowerCase(), rows = [];
    sc.sites.forEach(function (i) {
      var s = f.sites[i], d = s.d >= 0 ? f.dses[s.d] : null;
      if (sp === 'lengkap' ? s.s !== 'DDDDD' : (sp !== 'all' && s.s.charAt(+sp - 1) === 'D')) return;
      if (q && (s.n + ' ' + s.id + ' ' + s.kc + ' ' + s.mc + ' ' + (d ? d.n : '')).toLowerCase().indexOf(q) < 0) return;
      rows.push([s, d]);
    });
    var cap = 300, body = '<p class="note">' + api.fmtCount(rows.length) + ' site' + (rows.length > cap ? ' (ditampilkan ' + cap + ' pertama; persempit dengan filter atau pencarian)' : '') + '</p>' +
      '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + api.th('Site') + api.th('Kecamatan') + api.th('MC') + api.th('DSE') + api.th('Koordinat (lat, long)') + api.th('Step 1-5') + api.th('Outlet', true) + '</tr></thead><tbody>' +
      rows.slice(0, cap).map(function (r) {
        var s = r[0], d = r[1];
        return '<tr><td><b>' + api.esc(s.n) + '</b><div style="font-size:12px;color:var(--ij-muted)">' + api.esc(s.id) + '</div></td><td>' + api.esc(s.kc) + '</td><td>' + api.esc(s.mc) + '</td><td>' + (d ? api.esc(d.n) : '<span style="color:var(--ij-red-700)">tanpa DSE</span>') + '</td><td style="white-space:nowrap;">' + mapLink(s.la, s.lo) + '</td><td>' + chips(s.s) + '</td><td class="num">' + s.o.length + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return api.card('Daftar site 5G · ' + api.scopeText(), body);
  }

  /* ---- Kualitas data ---- */
  function dq(api, state, f, sc) {
    var m = f.metadata, noDse = [], noOut = 0, basis = {}, load = {}, oOut = 0, oTot = 0;
    sc.sites.forEach(function (i) {
      var s = f.sites[i];
      if (s.d < 0) noDse.push(s); else load[s.d] = (load[s.d] || 0) + (s.s === 'DDDDD' ? 0 : 1);
      if (!s.o.length) noOut++;
      basis[s.b] = (basis[s.b] || 0) + 1;
      s.o.forEach(function (o) { oTot++; if (!f.outlets[o].k) oOut++; });
    });
    var ld = Object.keys(load).map(function (k) { return [f.dses[k], load[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    var kp = '<div class="kpi-row">' + api.kpi('Site tanpa DSE', api.fmtCount(noDse.length), 'perlu ditunjuk DSO', noDse.length ? 'bad' : 'ok', 'tidak ada outlet master dalam 1 km') +
      api.kpi('Site tanpa outlet terpetakan', api.fmtCount(noOut), pct(noOut, sc.sites.length) + ' dari site', 'flat', 'Step 2-4 tidak bisa dikerjakan di site ini') +
      api.kpi('Outlet Vanguard di luar master', api.fmtCount(oOut), pct(oOut, oTot) + ' dari ' + api.fmtCount(oTot) + ' baris', 'flat', 'tidak punya DSE / PJP di aplikasi') + '</div>';
    var b1 = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('Dasar penentuan DSE') + api.th('Site', true) + '</tr></thead><tbody>' +
      Object.keys(basis).sort().map(function (k) { return '<tr><td>' + api.esc(m.basis[k] || k) + '</td><td class="num">' + api.fmtCount(basis[k]) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var b2 = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('DSE (beban site belum lengkap)') + api.th('MC') + api.th('Site belum lengkap', true) + api.th('Hari kerja @' + m.sites_per_day + '/hari', true) + '</tr></thead><tbody>' +
      ld.slice(0, 25).map(function (r) { return '<tr><td>' + api.esc(r[0].n) + '</td><td>' + api.esc(r[0].mc) + '</td><td class="num">' + r[1] + '</td><td class="num">' + Math.ceil(r[1] / m.sites_per_day) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var b3 = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + api.th('Site tanpa DSE') + api.th('Kecamatan') + api.th('MC') + '</tr></thead><tbody>' +
      noDse.slice(0, 40).map(function (s) { return '<tr><td>' + api.esc(s.n) + '</td><td>' + api.esc(s.kc) + '</td><td>' + api.esc(s.mc) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    return kp + api.card('Dasar penentuan DSE per site', b1) + api.card('25 DSE dengan beban site terbanyak (geser lewat <code>data/catalogues/vanguard_site_override.csv</code>)', b2) + api.card('Site tanpa DSE', b3);
  }

  var IJVanguard = {
    view: function (api) {
      var f = F(), state = api.state;
      if (!f) return api.card('Vanguard 5G', '<p class="note">Feed belum dibangun. Jalankan <code>python3 scripts/build_vanguard_feed.py</code>.</p>');
      var sc = scope(state, f), tab = state.vgTab || 'brief';
      var body = tab === 'progres' ? progres(api, state, f, sc) : tab === 'site' ? siteList(api, state, f, sc) : tab === 'dq' ? dq(api, state, f, sc) : brief(api, state, f, sc);
      return ctl(api, state, f) + body + sourceNote(api, f);
    },
    click: function (cmd, api) {
      var s = api.state, a = cmd.split(':'), k = a[0], v = a.slice(1).join(':'), f = F();
      flash = '';
      if (k === 'tab') s.vgTab = v;
      else if (k === 'dstep' && f) s.vgDay = stepDay(dayOf(s, f), +v, f);
      else if (k === 'today' && f) s.vgDay = '';
      else if (k === 'lvl') s.vgLevel = v;
      else if (k === 'step') s.vgStep = v;
      else if (k === 'wa' && f) copyText(waText(s, f, v));
    },
    change: function (el, api) { var k = el.getAttribute('data-vg-in'); if (k === 'search') api.state.vgSearch = el.value; else if (k === 'date' && el.value) api.state.vgDay = el.value; },
    waText: function (state, f, mc) { return waText(state, f, mc); }
  };
  if (typeof window !== 'undefined') window.IJVanguard = IJVanguard;
  if (typeof module !== 'undefined') module.exports = IJVanguard;
})();
