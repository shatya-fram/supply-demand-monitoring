/* Inner Jakarta · Supply & Demand Monitoring
   Standard website following Brand & Frontend Guide 2.0.
   ALL FIGURES BELOW ARE ILLUSTRATIVE. Replace buildData() with the OneDrive feed
   once the mapping catalogues and Stock In / Demand definitions are signed off. */
(function () {
  'use strict';

  var DAYS = 11;                      /* days elapsed in the month at data cut */
  /* PJP labels come from dseVisitsFeed.metadata (period_end, dates_last_3d, dates_last_7d); fallback 01-11 Oct 2026 */
  var MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MON_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function pjpMeta() {
    var f = (typeof window !== 'undefined' && window.dseVisitsFeed) ? window.dseVisitsFeed : (typeof dseVisitsFeed !== 'undefined' ? dseVisitsFeed : null);
    return (f && f.metadata) || {};
  }
  function pjpWin() {
    var m = pjpMeta(), t3 = m.dates_last_3d || [], t7 = m.dates_last_7d || [];
    var end = parseDMY(m.period_end) || Date.UTC(2026, 9, 11);
    return { start: parseDMY(m.period_start) || Date.UTC(2026, 9, 1), end: end,
      d7: parseDMY(t7[0]) || end - 6 * 86400000, d3: parseDMY(t3[0]) || end - 2 * 86400000 };
  }
  /* "01–13 Oct" (opts.id = Indonesian month, opts.nopad = "1–13") */
  function pjpRange(a, b, opts) {
    opts = opts || {};
    var A = new Date(a), B = new Date(b), M = opts.id ? MON_ID : MON_EN;
    function dd(d) { return opts.nopad ? String(d.getUTCDate()) : ('0' + d.getUTCDate()).slice(-2); }
    return dd(A) + (A.getUTCMonth() !== B.getUTCMonth() ? ' ' + M[A.getUTCMonth()] : '') + '–' + dd(B) + ' ' + M[B.getUTCMonth()];
  }
  function pjpPeriod(kind, opts) {
    var w = pjpWin();
    if (kind === 'end') { var E = new Date(w.end); return E.getUTCDate() + ' ' + ((opts && opts.id ? MON_ID : MON_EN)[E.getUTCMonth()]); }
    if (kind === 'year') return String(new Date(w.end).getUTCFullYear());
    return pjpRange(kind === 'l3' ? w.d3 : (kind === 'l7' ? w.d7 : w.start), w.end, opts);
  }
  /* Window by days-since-last-visit slab: 0 = 0-2 d, 1 = 3-6 d, 2 = 7-10 d (3 = 11+ d / never = whole period) */
  function pjpSlabRange(slab, opts) {
    var w = pjpWin(), D = 86400000, lo = [0, 3, 7][slab], hi = [2, 6, 10][slab];
    return pjpRange(Math.max(w.start, w.end - hi * D), Math.max(w.start, w.end - lo * D), opts);
  }
  function pjpNoCheckinNote(feed) {
    var z = ((feed && feed.daily_timeline) || []).filter(function (d) { return d.available !== false && !d.actual; }).map(function (d) { return parseInt(d.date, 10) + ' ' + MON_EN[new Date(parseDMY(d.date)).getUTCMonth()]; });
    return z.length ? ' ' + z.join(', ') + (z.length > 1 ? ' have' : ' has') + ' no check-ins.' : '';
  }
  function pjpCut() { return pjpPeriod('end') + ' ' + pjpPeriod('year'); }
  function cutDefault() { return 'Cut ' + pjpCut(); }
  // Each view states the cut of the data it actually shows: Sell-In from DAILY_DATA_MOBII (refresh 14 Oct) runs to 13 Oct, PJP to its feed end, MOBI distribution to 10 Oct.
  function cutByView() {
    var P = pjpPeriod('end') + ' ' + pjpPeriod('year');
    return {
      mb_penjualan: 'Sell-In cut 13 Oct 2026 · PJP ' + pjpPeriod('end'),
      mb_performance: 'Demand and Sell-In cut 13 Oct 2026',
      mb_opportunity: 'Sell-In cut 13 Oct 2026 · PJP ' + pjpPeriod('end'),
      mb_overall: 'Sell-In 13 Oct · PJP ' + P,
      mb_ringkasan: 'PJP ' + pjpPeriod('end') + ' · MOBI distribution 10 Oct 2026',
      mb_endbal: 'ENDBAL 14 Oct · Sell-In saldo 13 Oct 2026',
    cfg_target: 'Target Oktober 2026 · pencapaian cut 13 Oct',
    cfg_pjp: 'Template PJP mingguan · mapping permanen',
    mb_grossadd: 'RGUGA GA cut 13 Oct 2026 · GA BIOMETRIC to 7 Oct',
    mb_uar: 'Sell-In cut 13 Oct · GA (SSO) cut 13 Oct 2026',
      mb_pjp: 'PJP cut ' + P,
      visits: 'PJP cut ' + P,
      sellin: 'MOBI distribution cut 10 Oct 2026'
    };
  }
  function cutLabel() {
    var C = cutByView();
    if (state.view === 'mb_ringkasan') {
      if (state.rkTab === 'peta') return C.mb_ringkasan;
      if (state.rkTab === 'jual') return C.mb_penjualan || C.mb_ringkasan;
      if (state.rkTab === 'uar') return C.mb_uar || C.mb_ringkasan;
      if (state.rkTab === 'demand') return C.mb_performance || C.mb_ringkasan;
      if (state.rkTab === 'grossadd') return C.mb_grossadd || C.mb_ringkasan;
      if (state.rkTab === 'endbal') return C.mb_endbal || C.mb_ringkasan;
      var pf = (typeof window !== 'undefined' && window.PENJUALAN_FEED) ? window.PENJUALAN_FEED.metadata : null;
      return 'Sell-In ' + (pf ? pf.cut_day : 13) + ' Oct · PJP ' + pjpCut();
    }
    return C[state.view] || cutDefault();
  }
  var COVER = { risk: 4, watch: 7, over: 21 };   /* days-of-cover bands [TBC] */
  var PERIODS = {
    mtd:  { k: 1,         cur: 'MTD',        pri: 'LMTD',       note: 'Day ' + DAYS + ' against day ' + DAYS },
    full: { k: 31 / DAYS, cur: 'Full month', pri: 'Last month', note: 'Run-rate projection, illustrative' },
    ytd:  { k: 9.4,       cur: 'YTD',        pri: 'LYTD',       note: 'Illustrative scaling' }
  };
  var LEVELS = [
    { key: 'branch', label: 'Branch' },
    { key: 'hoa', label: 'Head of Area' },
    { key: 'kec', label: 'Micro Cluster' }
  ];
  var FIELDS = [['branch', 'Branch'], ['hoa', 'Head of Area'], ['kec', 'Micro Cluster']];
  var SUM = ['sites', 'rev', 'revL', 'demand', 'demandL', 'sin', 'sinL', 'mkt'];
  var META = {
    brief: ['Inner Jakarta · Morning Sales Brief', 'Performance against last month, supply against demand, in one daily view.'],
    terr:  ['Inner Jakarta · Leaders Territory Analysis', 'Drill from area to kecamatan and DSE. Click a row for detail.'],
    svd:   ['Inner Jakarta · Supply vs Demand', 'Stock In against customer demand, with stock available on the market.'],
    mb_overall: ['Morning DSE Briefing · Overall Performance SA/MC', 'Pilih Sales Area dan DSO / MC: performa PJP Visit dan Penjualan ke Outlet teritori terpilih dalam satu halaman.'],
    mb_uar: ['Morning DSE Briefing · UAR', 'Unique Active Retailer per teritori: sell-in SP, voucher (zero dan value) dan saldo; plus SSO (SIM Selling Outlet) dari gross add RGUGA, dengan growth terhadap periode pembanding.'],
    mb_grossadd: ['Morning DSE Briefing · Gross Add', 'Gross Add dan SSO (SIM Selling Outlet) dari RGUGA per outlet: Oktober vs September, per Area, MC, DSE dan outlet, harian dengan kontrol GA BIOMETRIC, dan slab SSO.'],
    cfg_pjp: ['Konfigurasi · PJP Mapping', 'Mapping permanen outlet per DSE dari template PJP mingguan: frekuensi dan hari kunjungan Senin sampai Sabtu, sanity check, pengecualian, dan pratinjau PJP harian per teritori yang akan dipakai Instruksi Printing.'],
    cfg_target: ['Konfigurasi · Target Setting', 'Target resmi per DSE untuk dua KPI, Sell-In SP dan OSA (IM3, 3ID, IOH), diagregasi ke MC, Area dan Region, dibandingkan dengan pencapaian MTD.'],
    mb_endbal: ['Morning DSE Briefing · END BALANCE Outlet', 'Stok saldo penutupan outlet (ENDBAL) per outlet, site, MC, DSO dan DSE: outlet zero stock, slab balance, inventory days, dan sell-in saldo kemarin.'],
    mb_ringkasan: ['Morning DSE Briefing · Ringkasan Performance', 'DSE Productivity (KPI DSE Oct 2026: OSA, SP Data Sell In, compliance), ringkasan PJP, penjualan, demand, dan heat map teritori.'],
    mb_pjp: ['Morning DSE Briefing · PJP Visit', 'Performa kunjungan PJP saat ini: heatmap harian per Area, MC, DSE, dan outlet. Klik tanggal untuk melihat performa hari itu per DSE dan per outlet.'],
    mb_performance: ['Morning DSE Briefing · Demand Customer', 'Demand (sell-out) outlet dari DAILY_DATA_MOBO: Reload, Voucher Injection, CVM dan Paket Data per teritori, DSE, outlet dan produk, dibandingkan dengan Sell-In (supply) pada hari yang sama. SP Injection ada di Penjualan ke Outlet.'],
    mb_penjualan: ['Morning DSE Briefing · Penjualan ke Outlet', 'Sell-In produk ke outlet dari DAILY_DATA_MOBII: starter pack, voucher, saldo Mobo per teritori, produk dan outlet, MTD vs LMTD.'],
    mb_opportunity: ['Morning DSE Briefing · Opportunity', 'Program (UAR Improvement dari gross add RGUGA, Rabu Mantap dan Kota/Kab Khusus dari sell-in) per profil MC/DSO, DSE dan outlet yang eligible; plus Zero Improvement: outlet nol Sell-In MTD.'],
    sellin: ['Inner Jakarta · Sell-In Monitoring (MOBI)', 'Physical starter packs and vouchers, and electronic saldo, sold in to outlets by DSEs and distributors. Region → Area → MC → Kecamatan → Site → DSE → Outlet, with daily performance.'],
    visits: ['Inner Jakarta · DSE Visits & Beat Plans Tracking', 'Field route execution, daily target hits, visit durations, GPS compliance, unvisited outlets and inactive site tracking across Inner Jakarta.'],
    territory: ['Catalogue · Territory Management (Static Master)', 'Static Catalogue Master: Outlet ➔ Cellular NBS Site ➔ Field DSE Canvasser ➔ DSO Leader ➔ HoA Area Leader.'],
    map:       ['Catalogue · Jakarta Inner Map (Spatial Intelligence)', 'Static Spatial Catalogue: 4,249 DSO-mapped NBS site instances (3,992 physical sites), 14,694 Outlets (lat/long), 185 Kecamatans, 36 MCs, and 7 Area Borders.'],
    data:      ['Catalogue · Master Data & Mappings', 'Static catalogue master files and territory reference datasets.']
  };

  /* ---------- illustrative data ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = rng(20261011);
  var GEO = [
    ['West', 'Central West North', 'Kota Jakarta Pusat', ['Gambir', 'Tanah Abang', 'Senen', 'Kemayoran']],
    ['West', 'Central West North', 'Kota Jakarta Utara', ['Penjaringan', 'Tanjung Priok', 'Koja', 'Cilincing']],
    ['West', 'Central West North', 'Kota Jakarta Barat', ['Cengkareng', 'Kebon Jeruk', 'Grogol Petamburan']],
    ['West', 'South & Depok', 'Kota Jakarta Selatan', ['Tebet', 'Kebayoran Baru', 'Pasar Minggu']],
    ['West', 'South & Depok', 'Kota Depok', ['Beji', 'Cimanggis', 'Sawangan']],
    ['East', 'East Jakarta', 'Kota Jakarta Timur', ['Cakung', 'Duren Sawit', 'Jatinegara', 'Pulogadung']],
    ['East', 'Kota Bekasi', 'Kota Bekasi', ['Bekasi Utara', 'Bekasi Barat', 'Bekasi Selatan']],
    ['East', 'Karawang', 'Kab. Karawang', ['Karawang Barat', 'Telukjambe Timur']]
  ];

  function shares(n) {
    var w = [], s = 0, i, x;
    for (i = 0; i < n; i++) { x = 0.4 + rand(); w.push(x); s += x; }
    return w.map(function (v) { return v / s; });
  }
  function split(p, prefix, n) {
    var wd = shares(n), wi = shares(n), wm = shares(n), ws = shares(n);
    return wd.map(function (_, i) {
      return {
        area: p.area, branch: p.branch, kota: p.kota, kec: p.kec,
        name: prefix + '-' + p.id + '-' + String(i + 1).padStart(2, '0'),
        sites: p.sites * ws[i],
        rev: p.rev * wd[i], revL: p.revL * wd[i],
        demand: p.demand * wd[i], demandL: p.demandL * wd[i],
        sin: p.sin * wi[i], sinL: p.sinL * wi[i], mkt: p.mkt * wm[i]
      };
    });
  }
  function buildData() {
    var out = [];
    GEO.forEach(function (g) {
      g[3].forEach(function (name) {
        var sites = Math.round(18 + rand() * 55);
        var demand = Math.round(sites * (700 + rand() * 900));
        var gR = (rand() - 0.42) * 0.16, gD = (rand() - 0.45) * 0.18, gI = (rand() - 0.45) * 0.18;
        var rev = (6 + rand() * 30) * 1e9;
        var sin = Math.round(demand * (0.8 + rand() * 0.5));
        var cover = 2 + rand() * 24;
        var p = {
          id: String(out.length + 1).padStart(2, '0'),
          area: g[0], branch: g[1], kota: g[2], kec: name, sites: sites,
          rev: rev, revL: rev / (1 + gR),
          demand: demand, demandL: demand / (1 + gD),
          sin: sin, sinL: sin / (1 + gI),
          mkt: demand / DAYS * cover
        };
        p.site = split(p, 'SITE', sites);
        p.dse = split(p, 'DSE', Math.max(3, Math.round(sites / 8)));
        out.push(p);
      });
    });
    return out;
  }
  var KEC = (typeof window !== 'undefined' && window.INNER_JAKARTA_LOCAL_FEED) ? window.INNER_JAKARTA_LOCAL_FEED : buildData();

  /* ---------- number formatting (Brand Guide p.11, English units) ---------- */
  function fmtRp(v) {
    if (v == null || !isFinite(v)) return '—';
    var a = Math.abs(v);
    if (a >= 1e12) return 'Rp ' + (v / 1e12).toFixed(2) + ' T';
    if (a >= 1e9) return 'Rp ' + (v / 1e9).toFixed(1) + ' B';
    if (a >= 1e7) return 'Rp ' + Math.round(v / 1e6).toLocaleString('en-US') + ' M';
    if (a >= 1e6) return 'Rp ' + (v / 1e6).toFixed(1) + ' M';
    if (a >= 1e3) return 'Rp ' + Math.round(v / 1e3).toLocaleString('en-US') + ' K';
    return 'Rp ' + Math.round(v).toLocaleString('en-US');
  }
  function fmtCount(v) {
    if (v == null || !isFinite(v)) return '—';
    if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + ' M';
    return Math.round(v).toLocaleString('en-US');
  }
  function fmtSigned(v) {
    if (v == null || !isFinite(v)) return '—';
    var r = Math.round(v);
    return r === 0 ? '0' : (r > 0 ? '+' : '−') + fmtCount(Math.abs(r));
  }
  function fmtPct(p) {
    if (p == null || !isFinite(p)) return '—';
    var r = Math.round(p * 1000) / 10;
    return r === 0 ? '0.0%' : (r > 0 ? '+' : '−') + Math.abs(r).toFixed(1) + '%';
  }
  function fmtDays(d) { return d == null || !isFinite(d) ? '—' : d.toFixed(1); }
  function gcls(p) {
    if (p == null || !isFinite(p)) return 'flat';
    var r = Math.round(p * 1000) / 10;
    return r === 0 ? 'flat' : r < 0 ? 'down' : r >= 2 ? 'up' : 'up-soft';
  }

  /* ---------- state and aggregation ---------- */
  var state = {
    view: 'mb_ringkasan',
    branch: '',
    hoa: '',
    kec: '',
    site: '',
    dse: '',
    period: 'mtd',
    svd: 'kec',
    sel: null,
    terrSubView: 'auto',
    terrSearch: '',
    terrStatus: 'all',
    terrPage: 1,
    terrPageSize: 50,
    terrGroupPage: 1,
    terrGroupPageSize: 25,
    terrExpandAll: false,
    terrSelectedKey: null,
    // Jakarta Inner Map Spatial Intelligence State (Esri Streets default, NO API key required)
    mapBaseLayer: 'esri_street',
    mapShowBranches: true,
    mapShowMcs: true,
    mapShowKec: false,
    mapShowSites: true,
    mapShowOutlets: true,
    mapOutletFilter: 'all',
    mapSelectedScope: 'all',
    mapSelectedProfile: null,
    mapSearch: '',
    // DSE Visits & Beat Plans Monitoring State
    visitsSubView: 'regional',
    visitsDateScope: 'mtd',
    visitsBrandFilter: 'all',
    visitsSearch: '',
    visitsPage: 1,
    visitsPageSize: 50,
    visitsSelectedDse: null,
    visitsLevel: 'auto',
    visitsDse: null,
    // Inactivity audit (Site view / Outlet view)
    unvisEntity: 'outlet',
    unvisGroup: 'br',
    unvisSelected: null,
    unvisSiteSel: null,
    nvSelOutletGrp: null,
    pjTab: 'ringkasan',
    pjBrand: 'all',
    pjProdView: 'list',       // Produk tab: list | top (Top Produk, September penuh) | matrix (Outlet × Produk voucher)
    pjMxBrand: 'IM3', pjMxSel: null, pjMxPage: 1, pjMxAreaClosed: {}, pjMxMc: {}, pjMxMcAll: null,   // Matrix Outlet × Produk: brand, selected outlet key, page
    pjTopBy: 'nilai',         // Top Produk ranking: nilai | outlet | qty
    pjGroupBy: 'bc',          // product mix grouping: bc = Brand → Kategori, cb = Kategori → Brand, none = flat
    pjCat: 'all',
    pjLevel: 'auto',
    pjDse: null,
    pjPage: 1,
    pjSearch: '',
    pjOnlyNoMtd: false,
    pjSlabCom: 'SP',
    pjSlabEntity: 'outlet',
    opTab: 'program',
    opProgram: 'uar',
    opPage: 1,
    opZeroCat: 'all',
    opRabuBasis: 'fisik',
    opRabuWeek: null,
    poTab: 'ringkasan',
    poBrand: 'all',
    poCat: 'all',
    poLevel: 'auto',
    poDse: null,
    poPage: 1,
    poSearch: '',
    poAdhoc: true,
    poProdCat: 'all',
    poProdView: 'list',       // Produk tab: list | top (Top Produk per kategori)
    poTopBy: 'nilai',         // Top Produk ranking: nilai | outlet
    pjSlabProd: 'ZERO_ORI3GB',
    nvSelSiteGrp: null,
    inactSort: 'count',
    inactShowActive: false,
    inactMapOutlets: false,
    inactMapAllSites: false,
    inactMapFlag: 'flagged',
    inactMapBase: 'OpenStreetMap',
    // Sell-In Monitoring
    sellinSrc: 'all',
    sellinBrand: 'all',
    sellinCat: 'all',
    sellinFlow: 'all',
    // Morning DSE Briefing
    sgaTab: 'outlet',        // Slab Sellin & GA: outlet | dse | flag
    sgaMetric: 'si',         // si = Sell-in SP (pcs) | ga = GA SP (pcs) | sal = Saldo (Rp)
    sgaBase: 'lm',           // flag basis: lm = last month same days (LMTD) | fm = last month full
    sgaThr: { si: 30, ga: 30, sal: 2000000 },
    sgaSeg: 'all',
    sgaFlag: 'outlet',
    sgaPage: 1,
    sgaSearch: '',
    gaTab: 'ringkasan',      // Gross Add / SSO: ringkasan | dse | outlet | harian | slab
    gaBasis: 'outlet',       // outlet (sell-in / tagging) | site (lokasi aktivasi)
    gaBrand: 'all',          // all | IM3 | 3ID
    gaSg: 'all',             // segmen outlet: all | PJP | NON | KAM
    gaCover: 'all',          // all (termasuk outlet di luar master) | master
    gaSeg: 'all',
    gaPage: 1,
    gaSearch: '',
    uarSrc: 'all',           // UAR by source of outlet: all | PJP | NON | KAM | NONE (not classified)
    uarTab: 'sp',            // UAR: sp | vc | sal | spi
    uarVc: 'all',            // voucher: all | value (isi) | zero (blank)
    uarThr: { sp: 3, vc: 10, sal: 300000, spi: 1 },
    uarCollapsed: {},
    uarSub: 'growth',        // growth | slab | aktif | inaktif
    uarSeg: { aktif: 'all', inaktif: 'lapsed' },
    uarPage: 1,
    uarSearch: '',
    pmTab: 'ringkasan',      // PJP Mapping: ringkasan | dse | harian | pengecualian
    pmDate: '2026-10-15',
    pmSearch: '',
    cfTab: 'ringkasan',      // Target Setting: ringkasan | dse | rebalancing
    cfBasis: 'prorata',
    cfPage: 1,
    cfCollapsed: {},
    cfSearch: '',
    dkSp: 'target',          // SP slab basis: official target 90% / 100% (the 1,500 / 2,000 pcs policy option was removed)
    ebTab: 'ringkasan',      // END BALANCE: ringkasan | zero | slab | site | detail
    ebBasis: 'stock',        // stock = Stock Account | all = Stock + rekening lainnya
    ebSeg: 'all',            // zero list segment
    ebPage: 1,
    ebOpen: {},
    ebCollapsed: {},
    ebSite: null,
    ebSearch: '',
    rkTab: 'dse',            // Ringkasan Performance tab: dse | pjp | jual | uar | endbal | demand | grossadd | peta
    dkBasis: 'prorata',      // prorata (target x days/31) | full (monthly target)
    dkOsa: 'all',            // all = value of all mapped outlets (default) | q = only outlets >= Rp 300K
    dkEc: 'prod',            // prod = productive visits | exec = executed visits
    opdSec: 'visit', opdSeg: 'all', opdEb: 'outlet', opdLayers: {}, opdMapBase: '',   // Ringkasan Performance > Opportunity: section, GA/SP segment, ENDBAL view
    dse: '',                 // global DSE filter (header): normalised DSE name, synced to pjDse / poDse / visitsDse
    dkSort: 'final',
    dkGroupBy: 'area_mc',    // DSE scorecard grouping: none | area | mc | dso | area_mc
    dkSortCol: 'final',      // DSE scorecard sort column key
    dkSortDir: 'desc',
    dkTog: {},               // group keys toggled by the user (true = expanded)
    dkAll: null,             // 'open' | 'close' after Buka semua / Tutup semua
    dkFilters: [],           // value filters [{k, op, a, b, s}]
    dkSearch: '',
    dkFErr: '',
    dkPage: 1,
    dkOpen: {},               // DSE keys whose calculation detail row is open
    pjpDay: null,
    pjpOutletPage: 1,
    pjpTab: 'heat',           // heat | map | matrix
    mxSel: null,              // matrix drill: {lv, key, metric}
    mxPage: 1,
    mxCollapsed: {},          // area -> true when its MC rows are hidden
    mbMetric: 'nosellin',
    mbPoly: 'auto',
    sellinLevel: 'area',
    sellinTab: 'all',          // all | SP | VC | SALDO
    sellinLoc: 'area',
    sellinGroup: 'all',        // mirrors sellinTab for the summary helpers
    sellinDay: -1,             // -1 = all days, else day index (as-of cutoff)
    sellinProgMetric: 'qty',   // qty | uar | amt
    sellinProgMode: 'cum',     // cum | daily
    sellinSearch: '',
    sellinPage: 1,
    sellinPageSize: 50
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nm(r) { return r.name || r.kec || r.branch; }
  function rowsF(src) {
    return (src || KEC).filter(function (r) {
      return (!state.branch || r.branch === state.branch) &&
             (!state.hoa || r.hoa === state.hoa) &&
             (!state.kec || r.kec === state.kec);
    });
  }
  function sum(rows) {
    var t = {}; SUM.forEach(function (k) { t[k] = 0; });
    rows.forEach(function (r) { SUM.forEach(function (k) { t[k] += r[k]; }); });
    return t;
  }
  function group(rows, key) {
    var m = {}, order = [];
    rows.forEach(function (r) {
      var k = r[key];
      if (!m[k]) { m[k] = { name: k, rows: [] }; order.push(k); }
      m[k].rows.push(r);
    });
    return order.map(function (k) { return Object.assign(m[k], sum(m[k].rows)); })
      .sort(function (a, b) { return b.rev - a.rev; });
  }
  function growth(a, b) { return b ? a / b - 1 : null; }
  function cover(r) { return r.demand ? r.mkt / (r.demand / DAYS) : null; }
  function band(d) {
    if (d == null) return { k: 'flat', t: 'No data' };
    if (d < COVER.risk) return { k: 'down', t: 'Stock-out risk' };
    if (d < COVER.watch) return { k: 'watch', t: 'Watch' };
    if (d > COVER.over) return { k: 'flat', t: 'Overstock' };
    return { k: 'up', t: 'Healthy' };
  }
  function drill() { return state.kec ? 'kec' : (state.hoa || state.branch ? 'kec' : 'branch'); }
  function labelOf(level) { return LEVELS.filter(function (l) { return l.key === level; })[0].label; }

  /* ---------- components ---------- */
  function card(title, body) { return '<section class="card"><h2 class="sect">' + title + '</h2>' + body + '</section>'; }
  function kpi(label, value, delta, cls, note) {
    return '<div class="card kpi"><h2 class="sect">' + label + '</h2><div class="value">' + value + '</div>' +
      '<div class="delta ' + cls + '">' + delta + '</div><div class="note">' + note + '</div></div>';
  }
  function toggle(attr, items, current) {
    return '<div class="toggle" role="group">' + items.map(function (i) {
      return '<button type="button" data-' + attr + '="' + i[0] + '" aria-pressed="' + (current === i[0]) + '">' + i[1] + '</button>';
    }).join('') + '</div>';
  }
  function th(t, num) { return '<th' + (num ? ' class="num"' : '') + '>' + t + '</th>'; }
  function isSel(level, name) { return state.sel && state.sel.level === level && state.sel.key === name; }
  function rowAttr(level, name) {
    return ' tabindex="0" data-level="' + level + '" data-key="' + esc(name) + '"' + (isSel(level, name) ? ' class="sel" aria-current="true"' : '');
  }
  function statusCell(r) {
    var b = band(cover(r));
    return '<span class="sw sw-' + b.k + '"></span>' + b.t;
  }
  function bars(items, level, max) {
    return '<div class="bars">' + items.map(function (g) {
      return '<button type="button" class="bar-row' + (isSel(level, g.name) ? ' hl' : '') + '" data-level="' + level +
        '" data-key="' + esc(g.name) + '"><span>' + esc(g.name) + '</span><span class="track"><span class="bar" style="width:' +
        Math.max(1, g.rev / max * 100).toFixed(1) + '%"></span></span><span class="val">' + fmtRp(g.rev) + '</span></button>';
    }).join('') + '</div>';
  }

  function detail() {
    if (!state.sel) return card('Detail', '<p class="note">Select a row to see its breakdown here. Detail never opens as a separate page.</p>');
    var level = state.sel.level, key = state.sel.key;
    var base = rowsF().filter(function (r) { return r[level] === key; });
    var kids, label;
    if (level === 'kec') {
      kids = base.reduce(function (a, r) { return a.concat(r.dse || []); }, []).sort(function (a, b) { return b.rev - a.rev; });
      label = 'DSE';
    } else {
      kids = group(base, 'kec');
      label = 'Micro Cluster';
    }
    var body = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th(label) + th('Revenue', 1) + th('Growth %', 1) +
      th('Demand', 1) + th('Stock In', 1) + th('Days cover', 1) + th('Status') + '</tr></thead><tbody>' +
      kids.slice(0, 25).map(function (k) {
        var g = growth(k.rev, k.revL);
        return '<tr><td>' + esc(nm(k)) + '</td><td class="num cur">' + fmtRp(k.rev) + '</td><td class="num ' + gcls(g) + '">' + fmtPct(g) +
          '</td><td class="num">' + fmtCount(k.demand) + '</td><td class="num">' + fmtCount(k.sin) + '</td><td class="num">' +
          fmtDays(cover(k)) + '</td><td>' + statusCell(k) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="note">Showing ' + Math.min(25, kids.length) + ' of ' + kids.length + ' ' + label + ' records in ' + esc(key) + ', largest revenue first.</p>';
    return card('Detail · ' + esc(key), body);
  }

  /* ---------- views ---------- */
  function viewBrief() {
    var rows = rowsF(), t = sum(rows), P = PERIODS[state.period], k = P.k;
    var lvl = drill(), gs = group(rows, lvl), cv = t.demand ? t.mkt / (t.demand / DAYS) : null, b = band(cv);
    var bcls = { down: 'down', watch: '', up: 'up', flat: 'flat' }[b.k];
    var kpis = '<div class="kpis">' +
      kpi('Revenue ' + P.cur, fmtRp(t.rev * k), fmtPct(growth(t.rev, t.revL)) + ' vs ' + P.pri, gcls(growth(t.rev, t.revL)), P.note) +
      kpi('Demand (sell-out) ' + P.cur, fmtCount(t.demand * k), fmtPct(growth(t.demand, t.demandL)) + ' vs ' + P.pri, gcls(growth(t.demand, t.demandL)), 'Unit definition to be confirmed') +
      kpi('Stock In ' + P.cur, fmtCount(t.sin * k), fmtPct(growth(t.sin, t.sinL)) + ' vs ' + P.pri, gcls(growth(t.sin, t.sinL)), 'Supply received in the period') +
      kpi('Stock on market', fmtCount(t.mkt), fmtDays(cv) + ' days of cover · ' + b.t, bcls, 'Healthy band ' + COVER.watch + '–' + COVER.over + ' days [TBC]') + '</div>';
    var toolbar = '<div class="toolbar">' + toggle('period', [['mtd', 'MTD vs LMTD'], ['full', 'Full month'], ['ytd', 'YTD']], state.period) +
      '<button type="button" class="btn primary" data-act="export">Export brief →</button></div>';
    var primary = card('Top-down · revenue ' + P.cur + ' by ' + labelOf(lvl), '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      th(labelOf(lvl)) + th(P.cur, 1) + th(P.pri, 1) + th('Growth %', 1) + th('Demand', 1) + th('Days cover', 1) + '</tr></thead><tbody>' +
      gs.map(function (g) {
        var gr = growth(g.rev, g.revL);
        return '<tr' + rowAttr(lvl, g.name) + '><td>' + esc(g.name) + '</td><td class="num cur">' + fmtRp(g.rev * k) + '</td><td class="num prior">' +
          fmtRp(g.revL * k) + '</td><td class="num ' + gcls(gr) + '">' + fmtPct(gr) + '</td><td class="num">' + fmtCount(g.demand * k) +
          '</td><td class="num">' + fmtDays(cover(g)) + '</td></tr>';
      }).join('') + (gs.length > 1 ? '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td>TOTAL · ' + gs.length + ' ' + esc(labelOf(lvl)) + '</td><td class="num">' + fmtRp(t.rev * k) + '</td><td class="num">' + fmtRp(t.revL * k) + '</td><td class="num">' + fmtPct(growth(t.rev, t.revL)) + '</td><td class="num">' + fmtCount(t.demand * k) + '</td><td class="num">' + fmtDays(cv) + '</td></tr>' : '') + '</tbody></table></div><p class="note">Sorted by revenue contribution. Illustrative values · ' + cutDefault() + '.</p>');
    var movers = rows.map(function (r) { return { r: r, g: growth(r.rev, r.revL) }; }).filter(function (x) { return x.g != null; });
    var n = Math.max(1, Math.min(15, Math.floor(movers.length / 2)));
    function moverTable(title, list) {
      return card(title, '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Micro Cluster') + th('Branch') + th('Growth %', 1) + th(P.cur, 1) +
        '</tr></thead><tbody>' + (list.length ? list.map(function (x) {
          return '<tr><td>' + esc(x.r.kec) + '</td><td>' + esc(x.r.branch) + '</td><td class="num ' + gcls(x.g) + '">' + fmtPct(x.g) +
            '</td><td class="num cur">' + fmtRp(x.r.rev * k) + '</td></tr>';
        }).join('') : '<tr><td colspan="4">—</td></tr>') + '</tbody></table></div>');
    }
    var up = movers.filter(function (x) { return x.g > 0; }).sort(function (a, b2) { return b2.g - a.g; }).slice(0, n);
    var dn = movers.filter(function (x) { return x.g < 0; }).sort(function (a, b2) { return a.g - b2.g; }).slice(0, n);
    return toolbar + kpis + primary + detail() +
      '<div class="split">' + moverTable('Growing · top ' + n + ' micro clusters', up) + moverTable('Declining · top ' + n + ' micro clusters', dn) + '</div>';
  }

  function viewTerr() {
    var rows = rowsF(), t = sum(rows), lvl = drill(), gs = group(rows, lvl), max = gs.length ? gs[0].rev : 1;
    var body = '<div class="split"><div>' + bars(gs.slice(0, 12), lvl, max) +
      '<p class="note">Bars in ink, selected unit in red. Values labelled directly.</p></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th(labelOf(lvl)) + th('Share', 1) + th('Growth %', 1) + th('Sites', 1) + th('Rev / site', 1) +
      '</tr></thead><tbody>' + gs.map(function (g) {
        var gr = growth(g.rev, g.revL);
        return '<tr' + rowAttr(lvl, g.name) + '><td>' + esc(g.name) + '</td><td class="num cur">' + (t.rev ? (g.rev / t.rev * 100).toFixed(1) + '%' : '—') +
          '</td><td class="num ' + gcls(gr) + '">' + fmtPct(gr) + '</td><td class="num">' + fmtCount(g.sites) + '</td><td class="num">' +
          fmtRp(g.sites ? g.rev / g.sites : null) + '</td></tr>';
      }).join('') + (gs.length > 1 ? (function () { var ts = gs.reduce(function (a, g) { return a + (g.sites || 0); }, 0); return '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td>TOTAL · ' + gs.length + '</td><td class="num">100%</td><td class="num">' + fmtPct(growth(t.rev, t.revL)) + '</td><td class="num">' + fmtCount(ts) + '</td><td class="num">' + fmtRp(ts ? t.rev / ts : null) + '</td></tr>'; })() : '') + '</tbody></table></div></div>';
    return card('Territory comparison · revenue MTD by ' + labelOf(lvl), body) + detail();
  }

  function viewSvd() {
    var src = state.svd === 'kec' ? KEC : KEC.reduce(function (a, r) { return a.concat(r[state.svd] || []); }, []);
    var rows = rowsF(src).slice().sort(function (a, b) { return b.demand - a.demand; });
    var t = sum(rows), cv = t.demand ? t.mkt / (t.demand / DAYS) : null, b = band(cv), gap = t.sin - t.demand;
    var lab = { kec: 'Micro Cluster', site: 'Site', dse: 'DSE' }[state.svd];
    var kpis = '<div class="kpis">' +
      kpi('Stock In MTD', fmtCount(t.sin), fmtPct(growth(t.sin, t.sinL)) + ' vs LMTD', gcls(growth(t.sin, t.sinL)), 'Supply received') +
      kpi('Demand MTD', fmtCount(t.demand), fmtPct(growth(t.demand, t.demandL)) + ' vs LMTD', gcls(growth(t.demand, t.demandL)), 'Customer demand (sell-out proxy)') +
      kpi('Supply − Demand', fmtSigned(gap), t.demand ? fmtPct(gap / t.demand) + ' of demand' : '—', 'flat', 'Positive means supply ahead of demand') +
      kpi('Stock on market', fmtCount(t.mkt), fmtDays(cv) + ' days of cover · ' + b.t, { down: 'down', watch: '', up: 'up', flat: 'flat' }[b.k], 'Healthy band ' + COVER.watch + '–' + COVER.over + ' days') + '</div>';
    var top = rows.slice(0, 10), mx = top.reduce(function (m, r) { return Math.max(m, r.sin, r.demand); }, 1);
    var chart = '<div class="bars">' + top.map(function (r) {
      return '<div class="bar-row plain"><span>' + esc(nm(r)) + '</span><span class="track"><span class="bar" style="width:' + Math.max(1, r.sin / mx * 100).toFixed(1) +
        '%"></span><span class="bar alt" style="width:' + Math.max(1, r.demand / mx * 100).toFixed(1) + '%"></span></span><span class="val">' +
        fmtCount(r.sin) + ' / ' + fmtCount(r.demand) + '</span></div>';
    }).join('') + '</div><p class="note">Ink bar = Stock In, grey bar = Demand. Labels show Stock In / Demand. Top 10 by demand.</p>';
    var tbl = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th(lab) + th('Stock In', 1) + th('Demand', 1) + th('Gap', 1) + th('On market', 1) +
      th('Days cover', 1) + th('Status') + '</tr></thead><tbody>' + rows.slice(0, 36).map(function (r) {
        return '<tr><td>' + esc(nm(r)) + '</td><td class="num cur">' + fmtCount(r.sin) + '</td><td class="num cur">' + fmtCount(r.demand) + '</td><td class="num">' +
          fmtSigned(r.sin - r.demand) + '</td><td class="num">' + fmtCount(r.mkt) + '</td><td class="num">' + fmtDays(cover(r)) + '</td><td>' + statusCell(r) + '</td></tr>';
      }).join('') + (rows.length > 1 ? '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td>TOTAL · ' + rows.length + ' ' + lab + '</td><td class="num">' + fmtCount(t.sin) + '</td><td class="num">' + fmtCount(t.demand) + '</td><td class="num">' + fmtSigned(gap) + '</td><td class="num">' + fmtCount(t.mkt) + '</td><td class="num">' + fmtDays(cv) + '</td><td></td></tr>' : '') + '</tbody></table></div><p class="note">Showing ' + Math.min(36, rows.length) + ' of ' + rows.length + ' ' + lab + ' rows sorted by demand. Bands: under ' + COVER.risk + ' days risk, under ' + COVER.watch +
      ' watch, over ' + COVER.over + ' overstock.</p>';
    return '<div class="toolbar">' + toggle('svd', [['kec', 'Micro Cluster'], ['site', 'Site'], ['dse', 'DSE']], state.svd) + '</div>' + kpis +
      card('Stock In vs Demand · ' + lab, chart) + card('Supply and demand by ' + lab, tbl);
  }

  /* ---------- Territory Management Confirmed Master (Pure Static Data) ---------- */
  function filterTerritoryOutlets(all) {
    var q = String(state.terrSearch || '').toLowerCase().trim();
    return all.filter(function (o) {
      if (state.branch && o.branch !== state.branch) return false;
      if (state.kec && o.micro_cluster !== state.kec) return false;
      if (state.hoa && o.hoa_leader !== state.hoa) return false;
      if (state.site && (o.site_nbs !== state.site && o.site_name !== state.site)) return false;
      if (state.dse && (o.dse_code_im3 !== state.dse && o.dse_name !== state.dse)) return false;
      if (q) {
        var match = String(o.outlet_name || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.outlet_id_im3 || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.outlet_id_3id || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.site_nbs || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.site_name || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.dse_name || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.dse_code_im3 || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.dse_code_3id || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.kecamatan || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.kabupaten || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.micro_cluster || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.dso_leader || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.hoa_leader || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.branch || '').toLowerCase().indexOf(q) !== -1 ||
                    String(o.desa || '').toLowerCase().indexOf(q) !== -1;
        if (!match) return false;
      }
      return true;
    });
  }

  function exportTerritoryCsv(filtered) {
    if (typeof window === 'undefined') return;
    var headers = ['Outlet ID IM3', 'Outlet ID 3ID', 'Outlet Name', 'Partner Name', 'Site NBS ID', 'Dist Km to BTS', 'DSE Code IM3', 'DSE Code 3ID', 'DSE Name', 'DSO Leader', 'Micro Cluster', 'HoA Leader', 'Branch', 'Kabupaten', 'Kecamatan', 'Desa', 'Lat', 'Long'];
    var lines = [headers.join(',')];
    filtered.forEach(function (o) {
      var row = [
        '"' + (o.outlet_id_im3 || '') + '"',
        '"' + (o.outlet_id_3id || '') + '"',
        '"' + String(o.outlet_name || '').replace(/"/g, '""') + '"',
        '"' + String(o.partner_name_im3 || '').replace(/"/g, '""') + '"',
        '"' + String(o.site_nbs || o.site_name || '').replace(/"/g, '""') + '"',
        o.dist_km !== null && o.dist_km !== undefined ? o.dist_km : '',
        '"' + (o.dse_code_im3 || '') + '"',
        '"' + (o.dse_code_3id || '') + '"',
        '"' + String(o.dse_name || '').replace(/"/g, '""') + '"',
        '"' + String(o.dso_leader || '').replace(/"/g, '""') + '"',
        '"' + String(o.micro_cluster || '').replace(/"/g, '""') + '"',
        '"' + String(o.hoa_leader || '').replace(/"/g, '""') + '"',
        '"' + String(o.branch || '').replace(/"/g, '""') + '"',
        '"' + String(o.kabupaten || '').replace(/"/g, '""') + '"',
        '"' + String(o.kecamatan || '').replace(/"/g, '""') + '"',
        '"' + String(o.desa || '').replace(/"/g, '""') + '"',
        o.lat || '',
        o.long || ''
      ];
      lines.push(row.join(','));
    });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'catalogue_master_' + (state.branch || 'all') + '_' + (state.kec || 'all') + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function terrOutletRow(o) {
      var isSelected = state.terrSelectedKey === o.outlet_key;
      var siteLabel = o.site_nbs || o.site_name || '—';
      var distLabel = (o.dist_km !== null && o.dist_km !== undefined) ? '<br><small style="color:var(--ij-muted); font-size:14px;">Dist: ' + Number(o.dist_km).toFixed(2) + ' km to BTS</small>' : '';
      var gpsLink = (o.lat && o.long) ? '<a href="https://maps.google.com/?q=' + o.lat + ',' + o.long + '" target="_blank" rel="noopener noreferrer" style="color:var(--ij-accent); font-weight:700; text-decoration:none;">🧭 ' + o.lat.toFixed(4) + ', ' + o.long.toFixed(4) + ' ↗</a>' : '<span style="color:var(--ij-muted);">GPS Pending</span>';
      return '<tr data-terr-outlet="' + esc(o.outlet_key) + '" class="' + (isSelected ? 'sel' : '') + '" style="cursor:pointer;" tabindex="0">' +
        '<td class="cur">' + esc(o.outlet_name) + '<br><small style="color:var(--ij-muted); font-size:14px;">IM3: ' + esc(o.outlet_id_im3) + ' | 3ID: ' + esc(o.outlet_id_3id) + (o.partner_name_im3 ? ' &middot; ' + esc(o.partner_name_im3) : '') + '</small></td>' +
        '<td><code>' + esc(siteLabel) + '</code>' + distLabel + '</td>' +
        '<td><b>' + esc(o.dse_name || o.dse_code_im3 || '—') + '</b><br><small style="color:var(--ij-muted);">' + esc(o.dse_code_im3 || '') + '</small></td>' +
        '<td>' + esc(o.micro_cluster || '—') + '<br><small style="color:var(--ij-muted);">' + esc(o.dso_leader || '') + '</small></td>' +
        '<td>' + esc(o.branch || '—') + '<br><small style="color:var(--ij-muted);">' + esc(o.hoa_leader || '') + '</small></td>' +
        '<td>' + esc(o.kecamatan || '—') + '<br><small style="color:var(--ij-muted);">&gt; ' + esc(o.desa || '—') + '</small></td>' +
        '<td>' + gpsLink + '</td>' +
      '</tr>';
  }
  function terrGrouped(t, list, cap, search) {
    var dsoOf = {}, hoaOf = {};
    list.forEach(function (o) { if (o.micro_cluster && !dsoOf[o.micro_cluster]) dsoOf[o.micro_cluster] = o.dso_leader || '—'; if (o.branch && !hoaOf[o.branch]) hoaOf[o.branch] = o.hoa_leader || '—'; });
    return grpBody(t, { items: list, area: function (o) { return o.branch; }, mc: function (o) { return o.micro_cluster; }, dse: function (o) { return o.dse_name || o.dse_code_im3 || 'UNASSIGNED'; },
      dso: function (m) { return dsoOf[m] || '—'; }, hoa: function (a) { return hoaOf[a] || '—'; }, val: function () { return 1; }, span: 7, cols: 7, sub: function () { return ''; }, row: terrOutletRow, unit: 'outlet', cap: cap, search: !!search });
  }

  function renderSubChain(filtered) {
    var total = filtered.length;
    var pageSize = state.terrPageSize || 50;
    var maxPage = Math.max(1, Math.ceil(total / pageSize));
    var page = Math.min(Math.max(1, state.terrPage || 1), maxPage);
    state.terrPage = page;
    var slice = filtered.slice((page - 1) * pageSize, page * pageSize);

    var filterBar = '<div class="filter-bar" style="border-top:0; padding:10px 0 12px; gap:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">' +
      '<div style="display:flex; align-items:center; gap:8px;">' +
        '<input type="text" id="terrSearchInput" aria-label="Search outlets, sites, DSEs or MCs" class="search-input" placeholder="🔍 Search Outlet name, IM3/3ID ID, Site NBS, DSE, or MC..." value="' + esc(state.terrSearch) + '" style="min-width:320px;">' +
      '</div>' +
      '<div>' +
        '<button type="button" class="btn" data-act="export-terr-csv">📥 Download Static Master CSV (' + total + ')</button>' +
      '</div>' +
    '</div>';

    var tbl = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      th('Area › MC › DSE › Outlet ID &amp; Trade Name') +
      th('Coverage Site (NBS)') +
      th('Field DSE Personnel') +
      th('Micro Cluster (DSO)') +
      th('Branch Area (HoA)') +
      th('Location (Kec &gt; Desa)') +
      th('GPS Navigation') +
    '</tr></thead><tbody>' +
    (filtered.length ? terrGrouped('terrchain', filtered, 150, state.terrSearch) : '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--ij-muted);">No outlets match the search query.</td></tr>') +
    '</tbody></table></div>';

    var pagination = '<div class="page-bar">' +
      '<div>' +
        grpBar('terrchain') +
      '</div>' +
      '<div style="font:600 15px var(--ij-font); color:var(--ij-muted);">' +
        total.toLocaleString('en-US') + ' matching catalogue outlets &middot; grouped Area › MC › DSE &middot; click any row to inspect static hierarchy' +
      '</div>' +
    '</div>';

    return card('Complete Static Master Chain: Outlet &rarr; Site &rarr; DSE &rarr; DSO/MC Leader &rarr; HoA Area Leader', filterBar + tbl + pagination);
  }

  function renderGroupOutletsTable(outletsList, maxShow) {
    var limit = maxShow || 100;
    var displayList = outletsList.slice(0, limit);
    var html = '<div class="tbl-wrap" style="margin-top:8px;"><table class="tbl"><thead><tr>' +
      th('Area › MC › DSE › Outlet ID &amp; Trade Name') +
      th('Coverage Site (NBS)') +
      th('Field DSE Personnel') +
      th('Micro Cluster (DSO)') +
      th('Branch Area (HoA)') +
      th('Location (Kec &gt; Desa)') +
      th('GPS Navigation') +
    '</tr></thead><tbody>' +
    (displayList.length ? terrGrouped('terrgrp', displayList, 150, state.terrSearch) : '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--ij-muted);">No outlets match the search query.</td></tr>') +
    '</tbody></table></div>';

    if (outletsList.length > limit) {
      html += '<p class="note" style="margin-top:6px;">Showing ' + limit + ' of ' + outletsList.length + ' outlets in this group. Use search bar to narrow results.</p>';
    }
    return html;
  }

  function renderGroupControls(totalOutlets, totalGroups, groupTypeName) {
    return '<div class="filter-bar" style="border-top:0; padding:10px 0 12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
      '<div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">' +
        '<input type="text" id="terrSearchInput" aria-label="Search outlets, sites, DSEs or MCs" class="search-input" placeholder="🔍 Search ' + groupTypeName + ', names, codes, sites..." value="' + esc(state.terrSearch) + '" style="min-width:320px;">' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:8px;">' +
        '<button type="button" class="btn" data-act="terr-expand-all" title="Expand all visible group cards">＋ Expand All (' + totalGroups + ')</button>' +
        '<button type="button" class="btn" data-act="terr-collapse-all" title="Collapse all visible group cards">－ Collapse All</button>' +
        grpBar('terrgrp') +
        '<button type="button" class="btn" data-act="export-terr-csv">📥 Download Static Master CSV</button>' +
      '</div>' +
    '</div>';
  }

  function renderGroupPagination(totalGroups, pageSize, page) {
    if (totalGroups <= pageSize) return '';
    var maxPage = Math.max(1, Math.ceil(totalGroups / pageSize));
    return '<div class="page-bar" style="margin-top:12px;">' +
      '<div>' +
        '<button type="button" class="btn" data-terr-grp-page="prev"' + (page <= 1 ? ' disabled' : '') + '>&larr; Previous Groups</button> ' +
        '<button type="button" class="btn" data-terr-grp-page="next"' + (page >= maxPage ? ' disabled' : '') + '>Next Groups &rarr;</button>' +
      '</div>' +
      '<div style="font:600 13px var(--ij-font); color:var(--ij-muted);">' +
        'Showing Groups ' + (((page - 1) * pageSize) + 1) + '–' + Math.min(page * pageSize, totalGroups) + ' of ' + totalGroups.toLocaleString('en-US') + ' total groups' +
      '</div>' +
    '</div>';
  }

  function renderSubHoa(filtered) {
    var map = {};
    filtered.forEach(function (o) {
      var b = o.branch || 'UNASSIGNED';
      if (!map[b]) {
        map[b] = {
          branch: b,
          hoa: o.hoa_leader || '—',
          outlets: [],
          mcs: {},
          sites: {},
          dses: {}
        };
      }
      map[b].outlets.push(o);
      var mc = o.micro_cluster || '—';
      if (!map[b].mcs[mc]) {
        map[b].mcs[mc] = { name: mc, dso: o.dso_leader || '—', count: 0, dses: {}, sites: {} };
      }
      map[b].mcs[mc].count++;
      if (o.dse_code_im3) {
        map[b].mcs[mc].dses[o.dse_code_im3] = true;
        map[b].dses[o.dse_code_im3] = true;
      }
      var s = o.site_nbs || o.site_name;
      if (s && s !== 'PENDING-NBS') {
        var sKey = s + '::' + mc;
        map[b].mcs[mc].sites[sKey] = true;
        map[b].sites[sKey] = true;
      }
    });

    var list = Object.values(map).sort(function (a, b) { return b.outlets.length - a.outlets.length; });
    var isOpen = state.terrExpandAll ? ' open' : '';

    var cardsHtml = list.length ? list.map(function (g) {
      var mcList = Object.values(g.mcs);
      var subCards = '<div class="terr-sub-cards">' + mcList.map(function (mc) {
        return '<div class="terr-sub-card">' +
          '<b>' + esc(mc.name) + '</b>' +
          '<span>DSO: ' + esc(mc.dso) + '</span>' +
          '<div class="val">' + fmtCount(mc.count) + ' outlets &middot; ' + Object.keys(mc.dses).length + ' DSEs &middot; ' + Object.keys(mc.sites).length + ' sites</div>' +
        '</div>';
      }).join('') + '</div>';

      var tblHtml = renderGroupOutletsTable(g.outlets);

      return '<details class="terr-group"' + isOpen + '>' +
        '<summary class="terr-group-summary">' +
          '<div class="terr-group-title-wrap">' +
            '<span class="terr-group-icon">&#9654;</span>' +
            '<div>' +
              '<div class="terr-group-title">👑 ' + esc(g.branch) + ' &middot; HoA: ' + esc(g.hoa) + '</div>' +
              '<div class="terr-group-sub">' + mcList.length + ' Micro Clusters &middot; Branch Operations</div>' +
            '</div>' +
          '</div>' +
          '<div class="terr-group-metrics">' +
            '<span class="chip-metric muted"><b>' + fmtCount(g.outlets.length) + '</b> Mapped Stores</span>' +
            '<span class="chip-metric accent"><b>' + mcList.length + '</b> Micro Clusters</span>' +
            '<span class="chip-metric up"><b>' + Object.keys(g.dses).length + '</b> Field DSEs</span>' +
            '<span class="chip-metric muted"><b>' + Object.keys(g.sites).length + '</b> NBS Sites</span>' +
          '</div>' +
        '</summary>' +
        '<div class="terr-group-body">' +
          '<h4 style="font:800 13px var(--ij-font); text-transform:uppercase; margin:0 0 6px; color:var(--ij-ink);">Governed Micro Clusters (' + mcList.length + ')</h4>' +
          subCards +
          '<h4 style="font:800 13px var(--ij-font); text-transform:uppercase; margin:8px 0 6px; color:var(--ij-ink);">Mapped Retail Outlets in ' + esc(g.branch) + ' (' + g.outlets.length + ')</h4>' +
          tblHtml +
        '</div>' +
      '</details>';
    }).join('') : '<p class="note" style="padding:20px; text-align:center;">No branches match current search query or filter.</p>';

    var controls = renderGroupControls(filtered.length, list.length, 'Branch / Head of Area');
    return card('Static Catalogue per Head of Area (Branch) — Collapsible &amp; Expandable', controls + cardsHtml);
  }

  function renderSubDso(filtered) {
    var map = {};
    filtered.forEach(function (o) {
      var mc = o.micro_cluster || 'UNASSIGNED';
      if (!map[mc]) {
        map[mc] = {
          mc: mc,
          dso: o.dso_leader || '—',
          hoa: o.hoa_leader || '—',
          branch: o.branch || '—',
          outlets: [],
          dses: {},
          sites: {}
        };
      }
      map[mc].outlets.push(o);
      var dse = o.dse_code_im3 || 'UNASSIGNED';
      if (!map[mc].dses[dse]) {
        map[mc].dses[dse] = { code: dse, name: o.dse_name || dse, count: 0, sites: {} };
      }
      map[mc].dses[dse].count++;
      var s = o.site_nbs || o.site_name;
      if (s) {
        map[mc].dses[dse].sites[s] = true;
        map[mc].sites[s] = true;
      }
    });

    var list = Object.values(map).sort(function (a, b) { return b.outlets.length - a.outlets.length; });
    var isOpen = state.terrExpandAll ? ' open' : '';

    var cardsHtml = list.length ? list.map(function (g) {
      var dseList = Object.values(g.dses);
      var subCards = '<div class="terr-sub-cards">' + dseList.map(function (d) {
        return '<div class="terr-sub-card">' +
          '<b>' + esc(d.name) + '</b>' +
          '<span>Code: <code>' + esc(d.code) + '</code></span>' +
          '<div class="val">' + fmtCount(d.count) + ' outlets &middot; ' + Object.keys(d.sites).length + ' sites</div>' +
        '</div>';
      }).join('') + '</div>';

      var tblHtml = renderGroupOutletsTable(g.outlets);

      return '<details class="terr-group"' + isOpen + '>' +
        '<summary class="terr-group-summary">' +
          '<div class="terr-group-title-wrap">' +
            '<span class="terr-group-icon">&#9654;</span>' +
            '<div>' +
              '<div class="terr-group-title">👔 ' + esc(g.mc) + ' &middot; DSO: ' + esc(g.dso) + '</div>' +
              '<div class="terr-group-sub">Branch: ' + esc(g.branch) + ' &middot; HoA: ' + esc(g.hoa) + ' &middot; ' + dseList.length + ' DSEs</div>' +
            '</div>' +
          '</div>' +
          '<div class="terr-group-metrics">' +
            '<span class="chip-metric muted"><b>' + fmtCount(g.outlets.length) + '</b> Mapped Stores</span>' +
            '<span class="chip-metric up"><b>' + dseList.length + '</b> Field DSEs</span>' +
            '<span class="chip-metric muted"><b>' + Object.keys(g.sites).length + '</b> NBS Sites</span>' +
          '</div>' +
        '</summary>' +
        '<div class="terr-group-body">' +
          '<h4 style="font:800 13px var(--ij-font); text-transform:uppercase; margin:0 0 6px; color:var(--ij-ink);">Assigned Field DSE Personnel (' + dseList.length + ')</h4>' +
          subCards +
          '<h4 style="font:800 13px var(--ij-font); text-transform:uppercase; margin:8px 0 6px; color:var(--ij-ink);">Mapped Retail Outlets (' + g.outlets.length + ')</h4>' +
          tblHtml +
        '</div>' +
      '</details>';
    }).join('') : '<p class="note" style="padding:20px; text-align:center;">No Micro Clusters match current search query or filter.</p>';

    var controls = renderGroupControls(filtered.length, list.length, 'Micro Cluster / DSO Leader');
    return card('Static Catalogue per DSO / CSE (Micro Cluster) — Collapsible &amp; Expandable', controls + cardsHtml);
  }

  function renderSubDse(filtered) {
    var map = {};
    filtered.forEach(function (o) {
      var dse = o.dse_code_im3 || 'UNASSIGNED';
      if (!map[dse]) {
        map[dse] = {
          code: dse,
          code_3id: o.dse_code_3id || '—',
          name: o.dse_name || dse,
          dso: o.dso_leader || '—',
          mc: o.micro_cluster || '—',
          branch: o.branch || '—',
          outlets: [],
          sites: {}
        };
      }
      map[dse].outlets.push(o);
      var s = o.site_nbs || o.site_name;
      if (s) map[dse].sites[s] = true;
    });

    var list = Object.values(map).sort(function (a, b) { return b.outlets.length - a.outlets.length; });
    var pageSize = state.terrGroupPageSize || 25;
    var maxPage = Math.max(1, Math.ceil(list.length / pageSize));
    var page = Math.min(Math.max(1, state.terrGroupPage || 1), maxPage);
    state.terrGroupPage = page;
    var slice = list.slice((page - 1) * pageSize, page * pageSize);

    var isOpen = state.terrExpandAll ? ' open' : '';

    var cardsHtml = slice.length ? slice.map(function (g) {
      var tblHtml = renderGroupOutletsTable(g.outlets);

      return '<details class="terr-group"' + isOpen + '>' +
        '<summary class="terr-group-summary">' +
          '<div class="terr-group-title-wrap">' +
            '<span class="terr-group-icon">&#9654;</span>' +
            '<div>' +
              '<div class="terr-group-title">👤 ' + esc(g.name) + ' &middot; <code>' + esc(g.code) + '</code></div>' +
              '<div class="terr-group-sub">DSO: ' + esc(g.dso) + ' (' + esc(g.mc) + ') &middot; ' + esc(g.branch) + (g.code_3id !== '—' ? ' &middot; 3ID: ' + esc(g.code_3id) : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="terr-group-metrics">' +
            '<span class="chip-metric muted"><b>' + fmtCount(g.outlets.length) + '</b> Mapped Stores</span>' +
            '<span class="chip-metric muted"><b>' + Object.keys(g.sites).length + '</b> Coverage Sites</span>' +
          '</div>' +
        '</summary>' +
        '<div class="terr-group-body">' +
          '<h4 style="font:800 13px var(--ij-font); text-transform:uppercase; margin:0 0 6px; color:var(--ij-ink);">Assigned Retail Outlets (' + g.outlets.length + ')</h4>' +
          tblHtml +
        '</div>' +
      '</details>';
    }).join('') : '<p class="note" style="padding:20px; text-align:center;">No DSE personnel match current search query or filter.</p>';

    var controls = renderGroupControls(filtered.length, list.length, 'Field Sales (DSE)');
    var pagination = renderGroupPagination(list.length, pageSize, page);
    return card('Static Catalogue per Field Sales Personnel (DSE) — Collapsible &amp; Expandable', controls + cardsHtml + pagination);
  }

  function renderSubKecamatan(filtered) {
    var map = {};
    filtered.forEach(function (o) {
      var k = o.kecamatan || 'UNMAPPED';
      if (!map[k]) {
        map[k] = {
          kec: k,
          kab: o.kabupaten || '—',
          mc: o.micro_cluster || '—',
          branch: o.branch || '—',
          desas: {},
          outlets: [],
          sites: {}
        };
      }
      map[k].outlets.push(o);
      var d = o.desa || '—';
      map[k].desas[d] = (map[k].desas[d] || 0) + 1;
      var s = o.site_nbs || o.site_name;
      if (s) map[k].sites[s] = true;
    });

    var list = Object.values(map).sort(function (a, b) { return b.outlets.length - a.outlets.length; });
    var pageSize = state.terrGroupPageSize || 25;
    var maxPage = Math.max(1, Math.ceil(list.length / pageSize));
    var page = Math.min(Math.max(1, state.terrGroupPage || 1), maxPage);
    state.terrGroupPage = page;
    var slice = list.slice((page - 1) * pageSize, page * pageSize);

    var isOpen = state.terrExpandAll ? ' open' : '';

    var cardsHtml = slice.length ? slice.map(function (g) {
      var desaList = Object.keys(g.desas).map(function (dName) { return dName + ' (' + g.desas[dName] + ')'; }).slice(0, 15);
      var desaSummary = '<p class="note" style="margin:0 0 10px;"><b>Desas / Kelurahans Covered:</b> ' + esc(desaList.join(', ')) + (Object.keys(g.desas).length > 15 ? ', ... (' + Object.keys(g.desas).length + ' total)' : '') + '</p>';
      var tblHtml = renderGroupOutletsTable(g.outlets);

      return '<details class="terr-group"' + isOpen + '>' +
        '<summary class="terr-group-summary">' +
          '<div class="terr-group-title-wrap">' +
            '<span class="terr-group-icon">&#9654;</span>' +
            '<div>' +
              '<div class="terr-group-title">📍 Kecamatan: ' + esc(g.kec) + '</div>' +
              '<div class="terr-group-sub">Kabupaten: ' + esc(g.kab) + ' &middot; MC: ' + esc(g.mc) + ' &middot; Branch: ' + esc(g.branch) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="terr-group-metrics">' +
            '<span class="chip-metric muted"><b>' + fmtCount(g.outlets.length) + '</b> Mapped Stores</span>' +
            '<span class="chip-metric accent"><b>' + Object.keys(g.desas).length + '</b> Kelurahans</span>' +
            '<span class="chip-metric muted"><b>' + Object.keys(g.sites).length + '</b> NBS Sites</span>' +
          '</div>' +
        '</summary>' +
        '<div class="terr-group-body">' +
          desaSummary +
          '<h4 style="font:800 13px var(--ij-font); text-transform:uppercase; margin:8px 0 6px; color:var(--ij-ink);">Retail Outlets in ' + esc(g.kec) + ' (' + g.outlets.length + ')</h4>' +
          tblHtml +
        '</div>' +
      '</details>';
    }).join('') : '<p class="note" style="padding:20px; text-align:center;">No Kecamatans match current search query or filter.</p>';

    var controls = renderGroupControls(filtered.length, list.length, 'Kecamatan');
    var pagination = renderGroupPagination(list.length, pageSize, page);
    return card('Static Catalogue per Kecamatan (District) — Collapsible &amp; Expandable', controls + cardsHtml + pagination);
  }

  function renderSubSite(filtered) {
    var map = {};
    filtered.forEach(function (o) {
      var s = o.site_nbs || o.site_name || 'PENDING-NBS';
      var mc = o.micro_cluster || '—';
      var k = (s === 'PENDING-NBS') ? 'PENDING-NBS' : (s + '::' + mc);
      if (!map[k]) {
        map[k] = {
          siteKey: k,
          site: s,
          mc: mc,
          dso: o.dso_leader || '—',
          branch: o.branch || '—',
          dist_sum: 0,
          dist_count: 0,
          outlets: []
        };
      }
      map[k].outlets.push(o);
      if (o.dist_km !== null && o.dist_km !== undefined) {
        map[k].dist_sum += Number(o.dist_km);
        map[k].dist_count++;
      }
    });

    var list = Object.values(map).sort(function (a, b) { return b.outlets.length - a.outlets.length; });

    // Outlets-per-site slab summary by Micro Cluster (1, 2, 3, 4–10, >10 outlets under one DSO-mapped site)
    var slabs = ['1', '2', '3', '4–10', '>10'];
    function slabOf(n) { return n === 1 ? '1' : n === 2 ? '2' : n === 3 ? '3' : n <= 10 ? '4–10' : '>10'; }
    function slabZero() { return { '1': 0, '2': 0, '3': 0, '4–10': 0, '>10': 0 }; }
    var slabByMc = {};
    list.forEach(function (g) {
      if (g.siteKey === 'PENDING-NBS') return;
      var row = slabByMc[g.mc] || (slabByMc[g.mc] = { mc: g.mc, branch: g.branch, sites: 0, outlets: 0, c: slabZero() });
      row.sites++; row.outlets += g.outlets.length; row.c[slabOf(g.outlets.length)]++;
    });
    var slabRows = Object.values(slabByMc).sort(function (a, b) { return b.sites - a.sites; });
    var slabTot = { sites: 0, outlets: 0, c: slabZero() };
    slabRows.forEach(function (r) { slabTot.sites += r.sites; slabTot.outlets += r.outlets; slabs.forEach(function (sl) { slabTot.c[sl] += r.c[sl]; }); });
    function slabTr(r, bold) {
      var o = bold ? '<b>' : '', c = bold ? '</b>' : '';
      return '<tr><td class="cur">' + o + esc(r.mc || 'Total') + c + '</td><td>' + esc(r.branch || '') + '</td>' +
        '<td class="num">' + o + fmtCount(r.sites) + c + '</td><td class="num">' + o + fmtCount(r.outlets) + c + '</td>' +
        slabs.map(function (sl) { return '<td class="num">' + o + fmtCount(r.c[sl]) + c + '</td>'; }).join('') +
        '<td class="num">' + o + (r.sites ? (r.outlets / r.sites).toFixed(1) : '—') + c + '</td></tr>';
    }
    var slabHtml = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      th('Micro Cluster') + th('Branch') + th('DSO Sites', 1) + th('Outlets', 1) +
      slabs.map(function (sl) { return th(sl + ' outlet' + (sl === '1' ? '' : 's') + ' / site', 1); }).join('') + th('Avg outlets / site', 1) +
      '</tr></thead><tbody>' + slabRows.map(function (r) { return slabTr(r, false); }).join('') + slabTr(slabTot, true) + '</tbody></table></div>' +
      '<p class="note">Slab = number of mapped outlets under one DSO-mapped site. A site serving two micro clusters counts once in each. Follows the current filter and search.</p>';

    var pageSize = state.terrGroupPageSize || 25;
    var maxPage = Math.max(1, Math.ceil(list.length / pageSize));
    var page = Math.min(Math.max(1, state.terrGroupPage || 1), maxPage);
    state.terrGroupPage = page;
    var slice = list.slice((page - 1) * pageSize, page * pageSize);

    var isOpen = state.terrExpandAll ? ' open' : '';

    var cardsHtml = slice.length ? slice.map(function (g) {
      var avgDist = g.dist_count ? (g.dist_sum / g.dist_count).toFixed(2) + ' km' : '—';
      var tblHtml = renderGroupOutletsTable(g.outlets);

      return '<details class="terr-group"' + isOpen + '>' +
        '<summary class="terr-group-summary">' +
          '<div class="terr-group-title-wrap">' +
            '<span class="terr-group-icon">&#9654;</span>' +
            '<div>' +
              '<div class="terr-group-title">📡 Cellular Site (NBS): <code>' + esc(g.site) + '</code> &middot; DSO: ' + esc(g.dso) + '</div>' +
              '<div class="terr-group-sub">MC: <b>' + esc(g.mc) + '</b> &middot; Branch: ' + esc(g.branch) + ' &middot; Avg Distance to Stores: <b>' + avgDist + '</b></div>' +
            '</div>' +
          '</div>' +
          '<div class="terr-group-metrics">' +
            '<span class="chip-metric muted"><b>' + fmtCount(g.outlets.length) + '</b> Mapped Stores</span>' +
            '<span class="chip-metric accent"><b>' + esc(g.mc) + '</b></span>' +
            '<span class="chip-metric up"><b>' + avgDist + '</b> Avg BTS Dist</span>' +
          '</div>' +
        '</summary>' +
        '<div class="terr-group-body">' +
          '<h4 style="font:800 13px var(--ij-font); text-transform:uppercase; margin:0 0 6px; color:var(--ij-ink);">Retail Stores Mapped to Node B Cell Site <code>' + esc(g.site) + '</code> in ' + esc(g.mc) + ' (' + g.outlets.length + ')</h4>' +
          tblHtml +
        '</div>' +
      '</details>';
    }).join('') : '<p class="note" style="padding:20px; text-align:center;">No Cellular NBS sites match current search query or filter.</p>';

    var controls = renderGroupControls(filtered.length, list.length, 'DSO Cellular Site');
    var pagination = renderGroupPagination(list.length, pageSize, page);
    return card('Outlets per Site · Slab Summary by Micro Cluster (' + fmtCount(slabTot.sites) + ' DSO-mapped sites)', slabHtml) +
      card('Static Catalogue per Cellular Site (NBS Node B) — ' + fmtCount(list.length) + ' DSO Mapped Nodes', controls + cardsHtml + pagination);
  }

  function terrAutoSub() { if (state.kec) return 'site'; if (state.branch || state.hoa) return 'dso'; return 'hoa'; }
  function terrCounts(list) {
    var sites = {}, dses = {}, mcs = {}, brs = {}, physical = {};
    list.forEach(function (o) {
      var sName = o.site_nbs || o.site_name, mc = o.micro_cluster;
      if (sName && sName !== 'PENDING-NBS') { physical[sName] = 1; if (mc) sites[sName + '::' + mc] = 1; }
      if (o.dse_name) dses[o.dse_name] = 1;
      if (mc) mcs[mc] = 1;
      if (o.branch) brs[o.branch] = 1;
    });
    return { outlets: list.length, sites: Object.keys(sites).length, physical: Object.keys(physical).length,
      dses: Object.keys(dses).length, mcs: Object.keys(mcs).length, branches: Object.keys(brs).length };
  }
  function viewTerritory() {
    var terr = (typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED : (typeof TERRITORY_FEED !== 'undefined' ? TERRITORY_FEED : null);
    if (!terr) {
      return card('Territory Feed Not Loaded', '<p class="note">Please ensure <code>website/data/territory_feed.js</code> is generated and loaded.</p>');
    }

    var m = terr.metrics || {};
    var allOutlets = terr.outlets || [];
    var filtered = filterTerritoryOutlets(allOutlets);
    var tc = terrCounts(filtered);
    var effSub = state.terrSubView === 'auto' ? terrAutoSub() : state.terrSubView;

    // 1. Chain Flow Ribbon (Interactive Linkage), counts follow the filter
    var chainRibbon = '<div class="chain-flow">' +
      '<div class="chain-step' + (effSub === 'chain' ? ' active' : '') + '" data-terr-sub="chain" style="cursor:pointer;" title="View flat outlet chain explorer">' +
        '<div class="chain-step-title">1. Outlet</div>' +
        '<div class="chain-step-desc">' + fmtCount(tc.outlets) + ' Retail Outlets (IM3 &amp; 3ID)</div>' +
      '</div>' +
      '<div class="chain-arrow">&#8594;</div>' +
      '<div class="chain-step' + (effSub === 'site' ? ' active' : '') + '" data-terr-sub="site" style="cursor:pointer;" title="Group by Cellular NBS Sites">' +
        '<div class="chain-step-title">2. Site (NBS)</div>' +
        '<div class="chain-step-desc">' + fmtCount(tc.sites) + ' DSO-mapped site instances &middot; ' + fmtCount(tc.physical) + ' physical NBS</div>' +
      '</div>' +
      '<div class="chain-arrow">&#8594;</div>' +
      '<div class="chain-step' + (effSub === 'dse' ? ' active' : '') + '" data-terr-sub="dse" style="cursor:pointer;" title="Group by Field Sales Representatives (DSE)">' +
        '<div class="chain-step-title">3. DSE Personnel</div>' +
        '<div class="chain-step-desc">' + fmtCount(tc.dses) + ' Field Canvassers</div>' +
      '</div>' +
      '<div class="chain-arrow">&#8594;</div>' +
      '<div class="chain-step' + (effSub === 'dso' ? ' active' : '') + '" data-terr-sub="dso" style="cursor:pointer;" title="Group by DSO / Micro Cluster Leaders">' +
        '<div class="chain-step-title">4. DSO / CSE Leader</div>' +
        '<div class="chain-step-desc">' + fmtCount(tc.mcs) + ' Micro-Cluster Supervisors</div>' +
      '</div>' +
      '<div class="chain-arrow">&#8594;</div>' +
      '<div class="chain-step' + (effSub === 'hoa' ? ' active' : '') + '" data-terr-sub="hoa" style="cursor:pointer;" title="Group by Head of Area Leaders">' +
        '<div class="chain-step-title">5. HoA Area Leader</div>' +
        '<div class="chain-step-desc">' + fmtCount(tc.branches) + ' Branch Heads of Area</div>' +
      '</div>' +
    '</div>';

    // 2. Sub-View Navigation
    var autoLabel = { hoa: 'per HoA', dso: 'per DSO / MC', site: 'per Site' }[terrAutoSub()];
    var subNavButtons = [
      ['auto', '⚙️ Auto · follows filter (' + autoLabel + ')'],
      ['hoa', '👑 Per HoA (Head of Area)'],
      ['dso', '👔 Per DSO / CSE (Micro Cluster)'],
      ['dse', '👤 Per DSE (Field Sales)'],
      ['kecamatan', '📍 Per Kecamatan'],
      ['site', '📡 Per Sites (Cellular NBS)'],
      ['chain', '🗺️ Flat Master Chain Table']
    ];
    var subNavHtml = '<div class="toolbar" style="margin-top:10px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">' +
      '<div class="sub-nav">' + subNavButtons.map(function (b) {
        return '<button type="button" data-terr-sub="' + b[0] + '" class="' + (state.terrSubView === b[0] ? 'active' : '') + '">' + b[1] + '</button>';
      }).join('') + '</div>' +
      '<div><button type="button" class="btn" data-act="export-terr-csv">📥 Download Static Master CSV (' + filtered.length + ')</button></div>' +
    '</div>';

    // 3. Static Master Catalogue KPIs
    var scopedNote = (state.branch || state.hoa || state.kec) ? 'Scoped: ' + esc(scopeText()) : 'All Inner Jakarta · ' + fmtCount(m.total_outlets || allOutlets.length) + ' master stores';
    var kpis = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Master Retail Outlets', fmtCount(tc.outlets), '100% Lat/Long Verified', 'up', scopedNote) +
      kpi('Cellular NBS Sites', fmtCount(tc.sites), 'DSO-mapped site instances', 'up', fmtCount(tc.physical) + ' physical NBS sites') +
      kpi('Field DSE Canvassers', fmtCount(tc.dses), 'Active Sales Force', 'up', fmtCount(tc.mcs) + ' micro cluster(s) in scope') +
      kpi('Micro Clusters (MCs)', fmtCount(tc.mcs), 'DSO Supervisors', 'up', fmtCount(tc.branches) + ' branch area(s) in scope') +
    '</div>';

    // 4. Detail Drawer if an outlet is selected
    var drawerHtml = '';
    if (state.terrSelectedKey) {
      var selOutlet = allOutlets.filter(function (o) { return o.outlet_key === state.terrSelectedKey; })[0];
      if (selOutlet) {
        var siteNbsText = selOutlet.site_nbs || selOutlet.site_name || '—';
        var distNbsText = (selOutlet.dist_km !== null && selOutlet.dist_km !== undefined) ? ' &middot; ' + Number(selOutlet.dist_km).toFixed(2) + ' km to BTS' : '';
        var gpsNav = (selOutlet.lat && selOutlet.long) ? '<a href="https://maps.google.com/?q=' + selOutlet.lat + ',' + selOutlet.long + '" target="_blank" rel="noopener noreferrer" class="btn primary" style="display:inline-block; margin-top:6px; text-decoration:none;">🧭 Open in Google Maps ↗</a>' : '';
        drawerHtml = '<div class="detail-drawer">' +
          '<div style="display:flex; justify-content:space-between; align-items:flex-start;">' +
            '<div>' +
              '<h3 style="font:800 17px var(--ij-font); text-transform:uppercase; margin:0 0 4px;">🏪 ' + esc(selOutlet.outlet_name) + '</h3>' +
              '<p class="note" style="margin:0;">IM3 Code: <code>' + esc(selOutlet.outlet_id_im3) + '</code> &middot; 3ID Code: <code>' + esc(selOutlet.outlet_id_3id) + '</code> &middot; Partner: ' + esc(selOutlet.partner_name_im3 || '—') + '</p>' +
            '</div>' +
            '<button type="button" class="btn" data-act="close-terr-drawer">&times; Close</button>' +
          '</div>' +
          '<div class="detail-grid" style="margin-top:12px;">' +
            '<div class="detail-item"><b>Chain Link: Outlet &#8594; NBS Site</b><span><code>' + esc(siteNbsText) + '</code>' + distNbsText + '</span></div>' +
            '<div class="detail-item"><b>Chain Link: Site &#8594; DSE Canvasser</b><span>' + esc(selOutlet.dse_name || selOutlet.dse_code_im3 || 'Unassigned') + ' (<code>' + esc(selOutlet.dse_code_im3 || '—') + '</code>)</span></div>' +
            '<div class="detail-item"><b>Chain Link: DSE &#8594; DSO Leader</b><span>' + esc(selOutlet.dso_leader || '—') + ' (<b>' + esc(selOutlet.micro_cluster || '—') + '</b>)</span></div>' +
            '<div class="detail-item"><b>Chain Link: DSO &#8594; HoA Leader</b><span>' + esc(selOutlet.hoa_leader || '—') + ' (<b>' + esc(selOutlet.branch || '—') + '</b>)</span></div>' +
            '<div class="detail-item"><b>Administrative Location</b><span>' + esc(selOutlet.kabupaten || '—') + ' &gt; ' + esc(selOutlet.kecamatan || '—') + ' &gt; ' + esc(selOutlet.desa || '—') + '</span></div>' +
            '<div class="detail-item"><b>GPS Coordinates</b><span>' + (selOutlet.lat ? selOutlet.lat.toFixed(5) + ', ' + selOutlet.long.toFixed(5) : 'GPS Pending') + '<br>' + gpsNav + '</span></div>' +
          '</div>' +
        '</div>';
      }
    }

    var subContent = '';
    if (effSub === 'hoa') {
      subContent = renderSubHoa(filtered);
    } else if (effSub === 'dso') {
      subContent = renderSubDso(filtered);
    } else if (effSub === 'dse') {
      subContent = renderSubDse(filtered);
    } else if (effSub === 'kecamatan') {
      subContent = renderSubKecamatan(filtered);
    } else if (effSub === 'site') {
      subContent = renderSubSite(filtered);
    } else if (effSub === 'chain') {
      subContent = renderSubChain(filtered);
    } else {
      subContent = renderSubHoa(filtered);
    }

    return chainRibbon + subNavHtml + kpis + drawerHtml + subContent;
  }

  /* ==========================================================================
     JAKARTA INNER MAP - Brand Guide 2.0 Spatial Intelligence
     ========================================================================== */
  function viewMap() {
    var mapFeed = (typeof window !== 'undefined' && window.JAKARTA_MAP_FEED) ? window.JAKARTA_MAP_FEED : (typeof JAKARTA_MAP_FEED !== 'undefined' ? JAKARTA_MAP_FEED : null);
    if (!mapFeed) {
      return card('Jakarta Inner Map Feed Not Loaded', '<p class="note">Please ensure <code>website/data/jakarta_map_feed.js</code> is generated and loaded.</p>');
    }

    var met = mapFeed.metrics || {};
    var branches = mapFeed.branches || [];
    var mcs = mapFeed.micro_clusters || [];
    var sites = mapFeed.sites || [];
    var outlets = mapFeed.outlets || [];

    // Top KPI Summary Cards (Pure Static Master Data)
    var kpisHtml = '<div class="kpis" style="margin-bottom:12px;">' +
      kpi('👑 Branch Area Borders', fmtCount(branches.length), '7 Heads of Area', 'up', 'Jabodetabek Coverage') +
      kpi('👔 Micro Cluster Borders', fmtCount(mcs.length), '36 DSO Supervisors', 'up', 'Boundary Polygons') +
      kpi('📍 Kecamatan Districts', fmtCount(met.total_kecamatans || 185), 'District Polygons', 'up', 'Administrative Boundaries') +
      kpi('📡 Cellular NBS Sites', fmtCount(sites.length), 'DSO Teams Mapped', 'up', 'BTS Across 36 DSO Grids') +
      kpi('🏪 Retail Outlets (GPS)', fmtCount(outlets.length), '100% Verified', 'up', '14,694 Total Stores') +
    '</div>';

    // Top Controls Toolbar with zero-API-key basemaps
    var basemapSelect = '<label class="map-label">Base Map: ' +
      '<select class="map-select" data-act="map-basemap">' +
        '<option value="esri_street"' + (state.mapBaseLayer === 'esri_street' ? ' selected' : '') + '>🗺️ Street &amp; Highway Map (Esri)</option>' +
        '<option value="esri_gray"' + (state.mapBaseLayer === 'esri_gray' ? ' selected' : '') + '>🏙️ Clean Territory Canvas (Esri Gray)</option>' +
        '<option value="esri_topo"' + (state.mapBaseLayer === 'esri_topo' ? ' selected' : '') + '>🏔️ Topographic &amp; Landscape (Esri)</option>' +
        '<option value="osm"' + (state.mapBaseLayer === 'osm' ? ' selected' : '') + '>🌐 OpenStreetMap Standard</option>' +
        '<option value="esri_sat"' + (state.mapBaseLayer === 'esri_sat' ? ' selected' : '') + '>🛰️ Satellite Imagery (Esri)</option>' +
      '</select>' +
    '</label>';

    var layerToggles = '<div class="map-toolbar-group">' +
      '<span class="map-label">Static Layers:</span>' +
      '<label class="map-layer-toggle"><input type="checkbox" data-map-layer="branch"' + (state.mapShowBranches ? ' checked' : '') + '> 👑 Area Borders (' + branches.length + ')</label>' +
      '<label class="map-layer-toggle"><input type="checkbox" data-map-layer="mc"' + (state.mapShowMcs ? ' checked' : '') + '> 👔 MC Borders (' + mcs.length + ')</label>' +
      '<label class="map-layer-toggle"><input type="checkbox" data-map-layer="kec"' + (state.mapShowKec ? ' checked' : '') + '> 📍 Kecamatan (' + (met.total_kecamatans || 185) + ')</label>' +
      '<label class="map-layer-toggle"><input type="checkbox" data-map-layer="site"' + (state.mapShowSites ? ' checked' : '') + '> 📡 NBS Sites (' + sites.length + ')</label>' +
      '<label class="map-layer-toggle"><input type="checkbox" data-map-layer="outlet"' + (state.mapShowOutlets ? ' checked' : '') + '> 🏪 Outlets (' + outlets.length + ')</label>' +
    '</div>';

    // Scope select
    var scopeOptions = '<option value="all">Entire Greater Jakarta (All 7 Branches)</option>' +
      '<optgroup label="👑 Branches (Heads of Area)">' +
      branches.map(function (b) {
        return '<option value="' + esc(b.branch) + '"' + (state.mapSelectedScope === b.branch ? ' selected' : '') + '>Branch: ' + esc(b.branch) + ' (' + esc(b.hoa_leader) + ')</option>';
      }).join('') +
      '</optgroup>' +
      '<optgroup label="👔 Micro Clusters">' +
      mcs.map(function (m) {
        return '<option value="' + esc(m.micro_cluster) + '"' + (state.mapSelectedScope === m.micro_cluster ? ' selected' : '') + '>' + esc(m.micro_cluster) + ' (' + esc(m.dso_leader) + ')</option>';
      }).join('') +
      '</optgroup>';

    var scopeSelect = '<label class="map-label">Scope / Focus: ' +
      '<select class="map-select" data-act="map-scope">' + scopeOptions + '</select>' +
    '</label>';

    var searchBox = '<div style="position:relative; display:inline-block;">' +
      '<input type="text" id="mapSearchInput" aria-label="Search store, site, DSE or MC on the map" placeholder="🔍 Search store, site NBS, DSE, or MC..." value="' + esc(state.mapSearch || '') + '" class="map-select" style="width:260px; padding:5px 8px;">' +
      '<div id="mapSearchResults" style="position:absolute; top:100%; left:0; right:0; background:#fff; border:1px solid #000; z-index:1000; display:none; max-height:220px; overflow-y:auto; box-shadow:0 4px 10px rgba(0,0,0,0.15);"></div>' +
    '</div>';

    var actionsBar = '<div class="map-toolbar-group">' +
      scopeSelect +
      searchBox +
      '<button type="button" class="map-btn map-btn-accent" data-act="map-reset">🎯 Reset View</button>' +
    '</div>';

    var toolbarHtml = '<div class="map-toolbar">' +
      '<div class="map-toolbar-group">' + basemapSelect + '</div>' +
      actionsBar +
    '</div>' +
    '<div class="map-toolbar" style="margin-top:-1px;">' +
      layerToggles +
    '</div>';

    // Map & Drawer Layout
    var hasDrawer = !!state.mapSelectedProfile;
    var drawerHtml = renderMapDrawerHtml();

    var mapLayout = '<div class="map-layout' + (hasDrawer ? ' has-drawer' : '') + '" style="margin-top:10px;">' +
      '<div id="jakarta-map" class="map-container"></div>' +
      (hasDrawer ? drawerHtml : '') +
    '</div>';

    // Legend Bar
    var legendHtml = '<div class="map-legend-bar" style="margin-top:10px;">' +
      '<span class="map-label">Catalogue Legend:</span>' +
      '<span class="map-legend-item"><span class="map-legend-color" style="border:2px dashed #EC3013; background:rgba(236,48,19,0.15);"></span> 👑 Area Border (7 Branches)</span>' +
      '<span class="map-legend-item"><span class="map-legend-color" style="border:2px solid #0284C7; background:rgba(2,132,199,0.2);"></span> 👔 MC Border (36 Micro Clusters)</span>' +
      '<span class="map-legend-item"><span class="map-legend-color" style="border:1px dashed #64748B; background:rgba(100,116,139,0.1);"></span> 📍 Kecamatan Border (185 Districts)</span>' +
      '<span class="map-legend-item"><span class="map-legend-circle" style="background:#38BDF8; width:12px; height:12px;"></span> 📡 Cellular NBS Site (3,993 Towers)</span>' +
      '<span class="map-legend-item"><span class="map-legend-circle" style="background:#0284C7; width:9px; height:9px;"></span> 🏪 Mapped Retail Outlet (14,694 Stores)</span>' +
    '</div>';

    return kpisHtml + toolbarHtml + mapLayout + legendHtml;
  }

  function renderMapDrawerHtml() {
    if (!state.mapSelectedProfile) return '';
    var prof = state.mapSelectedProfile;
    var type = prof.type;
    var d = prof.data;
    var html = '<aside class="map-drawer">';

    if (type === 'outlet') {
      html += '<div class="map-drawer-head">' +
        '<div>' +
          '<div class="map-drawer-title">🏪 ' + esc(d.name) + '</div>' +
          '<div class="map-drawer-sub">Store ID: <code>' + esc(d.key) + '</code></div>' +
        '</div>' +
        '<button type="button" class="map-drawer-close" data-act="close-map-drawer" title="Close">&times;</button>' +
      '</div>';

      html += '<div style="margin-top:4px;"><span class="chip-metric up">🏪 STATIC MASTER STORE</span></div>';

      html += '<div class="map-drawer-kpis" style="margin-top:10px;">' +
        '<div class="map-kpi-card"><span>Coverage NBS Site</span><b><code>' + esc(d.site_nbs || '—') + '</code></b></div>' +
        '<div class="map-kpi-card"><span>BTS Distance</span><b>' + (d.dist_km != null ? Number(d.dist_km).toFixed(2) + ' km' : '—') + '</b></div>' +
        '<div class="map-kpi-card"><span>Field DSE</span><b>' + esc(d.dse_name || 'Unassigned') + '</b></div>' +
        '<div class="map-kpi-card"><span>Micro Cluster</span><b>' + esc(d.micro_cluster || '—') + '</b></div>' +
      '</div>';

      html += '<div class="map-drawer-sect">' +
        '<h4>Territory &amp; Hierarchy Linkage</h4>' +
        '<div class="detail-grid">' +
          '<div class="detail-item"><b>Cellular NBS Site (Tower)</b><span><code>' + esc(d.site_nbs || '—') + '</code> (' + (d.dist_km != null ? Number(d.dist_km).toFixed(2) + ' km to BTS' : '—') + ')</span></div>' +
          '<div class="detail-item"><b>Assigned DSE Canvasser</b><span>' + esc(d.dse_name || 'Unassigned') + ' (<code>' + esc(d.dse_code || '—') + '</code>)</span></div>' +
          '<div class="detail-item"><b>Micro Cluster &amp; DSO Leader</b><span>' + esc(d.micro_cluster || '—') + ' (' + esc(d.dso_leader || '—') + ')</span></div>' +
          '<div class="detail-item"><b>Branch Area &amp; HoA Leader</b><span>' + esc(d.branch || '—') + ' (' + esc(d.hoa_leader || '—') + ')</span></div>' +
          '<div class="detail-item"><b>Administrative Location</b><span>' + esc(d.kecamatan || '—') + ' &gt; ' + esc(d.desa || '—') + '</span></div>' +
        '</div>' +
      '</div>';

      html += '<div class="map-drawer-sect">' +
        '<h4>GPS Location</h4>' +
        '<p class="note" style="margin:0 0 8px;">Latitude: <code>' + d.lat + '</code> &middot; Longitude: <code>' + d.long + '</code></p>' +
        '<a href="https://maps.google.com/?q=' + d.lat + ',' + d.long + '" target="_blank" rel="noopener noreferrer" class="map-btn map-btn-accent" style="display:block; text-align:center; text-decoration:none;">🧭 Open in Google Maps ↗</a>' +
      '</div>';

    } else if (type === 'site') {
      html += '<div class="map-drawer-head">' +
        '<div>' +
          '<div class="map-drawer-title">📡 Site ' + esc(d.site_id) + '</div>' +
          '<div class="map-drawer-sub">Cellular Node B / BTS Centroid</div>' +
        '</div>' +
        '<button type="button" class="map-drawer-close" data-act="close-map-drawer" title="Close">&times;</button>' +
      '</div>';

      html += '<div class="map-drawer-kpis" style="margin-top:10px;">' +
        '<div class="map-kpi-card"><span>Mapped Stores</span><b>' + fmtCount(d.outlets_count) + ' stores</b></div>' +
        '<div class="map-kpi-card"><span>Average Distance</span><b>' + (d.avg_dist_km != null ? d.avg_dist_km.toFixed(2) + ' km' : '—') + '</b></div>' +
        '<div class="map-kpi-card"><span>Micro Cluster</span><b>' + esc(d.micro_cluster || '—') + '</b></div>' +
        '<div class="map-kpi-card"><span>Branch Area</span><b>' + esc(d.branch || '—') + '</b></div>' +
      '</div>';

      html += '<div class="map-drawer-sect">' +
        '<h4>Hierarchy &amp; Territory Profile</h4>' +
        '<div class="detail-grid">' +
          '<div class="detail-item"><b>Micro Cluster</b><span>' + esc(d.micro_cluster || '—') + '</span></div>' +
          '<div class="detail-item"><b>DSO Supervisor</b><span>' + esc(d.dso_leader || '—') + '</span></div>' +
          '<div class="detail-item"><b>Branch Area</b><span>' + esc(d.branch || '—') + '</span></div>' +
          '<div class="detail-item"><b>Head of Area (HoA)</b><span>' + esc(d.hoa_leader || '—') + '</span></div>' +
        '</div>' +
      '</div>';

      html += '<div class="map-drawer-sect">' +
        '<h4>GPS Location</h4>' +
        '<p class="note" style="margin:0 0 8px;">Centroid: <code>' + d.lat + ', ' + d.long + '</code></p>' +
        '<a href="https://maps.google.com/?q=' + d.lat + ',' + d.long + '" target="_blank" rel="noopener noreferrer" class="map-btn map-btn-accent" style="display:block; text-align:center; text-decoration:none;">🧭 Open Site in Google Maps ↗</a>' +
      '</div>';

    } else if (type === 'mc') {
      html += '<div class="map-drawer-head">' +
        '<div>' +
          '<div class="map-drawer-title">👔 ' + esc(d.micro_cluster) + '</div>' +
          '<div class="map-drawer-sub">DSO Leader: <b>' + esc(d.dso_leader) + '</b></div>' +
        '</div>' +
        '<button type="button" class="map-drawer-close" data-act="close-map-drawer" title="Close">&times;</button>' +
      '</div>';

      html += '<div class="map-drawer-kpis" style="margin-top:10px;">' +
        '<div class="map-kpi-card"><span>Total Stores</span><b>' + fmtCount(d.outlets_count) + '</b></div>' +
        '<div class="map-kpi-card"><span>Assigned DSEs</span><b>' + fmtCount(d.dse_count) + ' canvassers</b></div>' +
        '<div class="map-kpi-card"><span>Cellular Sites</span><b>' + fmtCount(d.site_count) + ' towers</b></div>' +
        '<div class="map-kpi-card"><span>Parent Branch</span><b>' + esc(d.branch || '—') + '</b></div>' +
      '</div>';

      html += '<div class="map-drawer-sect">' +
        '<h4>Branch Hierarchy</h4>' +
        '<div class="detail-grid">' +
          '<div class="detail-item"><b>Parent Branch</b><span>' + esc(d.branch || '—') + '</span></div>' +
          '<div class="detail-item"><b>Head of Area (HoA)</b><span>' + esc(d.hoa_leader || '—') + '</span></div>' +
        '</div>' +
      '</div>';

      html += '<div class="map-drawer-sect">' +
        '<button type="button" class="map-btn map-btn-accent" data-terr-drill="1" data-mc="' + esc(d.micro_cluster) + '" data-br="' + esc(d.branch) + '" style="width:100%; text-align:center;">🔍 Explore All Mapped Stores in Table</button>' +
      '</div>';

    } else if (type === 'branch') {
      html += '<div class="map-drawer-head">' +
        '<div>' +
          '<div class="map-drawer-title">👑 ' + esc(d.branch) + '</div>' +
          '<div class="map-drawer-sub">Head of Area (HoA): <b>' + esc(d.hoa_leader) + '</b></div>' +
        '</div>' +
        '<button type="button" class="map-drawer-close" data-act="close-map-drawer" title="Close">&times;</button>' +
      '</div>';

      html += '<div class="map-drawer-kpis" style="margin-top:10px;">' +
        '<div class="map-kpi-card"><span>Total Stores</span><b>' + fmtCount(d.outlets_count) + '</b></div>' +
        '<div class="map-kpi-card"><span>Micro Clusters</span><b>' + fmtCount(d.mc_count) + ' MCs</b></div>' +
        '<div class="map-kpi-card"><span>Field DSEs</span><b>' + fmtCount(d.dse_count) + ' canvassers</b></div>' +
        '<div class="map-kpi-card"><span>Cellular Towers</span><b>' + fmtCount(d.site_count) + ' NBS Sites</b></div>' +
      '</div>';

      html += '<div class="map-drawer-sect">' +
        '<button type="button" class="map-btn map-btn-accent" data-terr-drill="1" data-br="' + esc(d.branch) + '" style="width:100%; text-align:center;">🔍 Explore All Branch Stores in Table</button>' +
      '</div>';

    } else if (type === 'kecamatan') {
      html += '<div class="map-drawer-head">' +
        '<div>' +
          '<div class="map-drawer-title">📍 ' + esc(d.kecamatan) + '</div>' +
          '<div class="map-drawer-sub">' + esc(d.kabupaten) + '</div>' +
        '</div>' +
        '<button type="button" class="map-drawer-close" data-act="close-map-drawer" title="Close">&times;</button>' +
      '</div>';

      html += '<div class="map-drawer-kpis" style="margin-top:10px;">' +
        '<div class="map-kpi-card"><span>Mapped Stores</span><b>' + fmtCount(d.outlets_count) + '</b></div>' +
        '<div class="map-kpi-card"><span>Micro Cluster</span><b>' + esc(d.micro_cluster || '—') + '</b></div>' +
        '<div class="map-kpi-card"><span>Branch Area</span><b>' + esc(d.branch || '—') + '</b></div>' +
      '</div>';

      html += '<div class="map-drawer-sect">' +
        '<h4>Territory Hierarchy</h4>' +
        '<div class="detail-grid">' +
          '<div class="detail-item"><b>Micro Cluster</b><span>' + esc(d.micro_cluster || '—') + '</span></div>' +
          '<div class="detail-item"><b>Branch Area</b><span>' + esc(d.branch || '—') + '</span></div>' +
        '</div>' +
      '</div>';
    }

    html += '</aside>';
    return html;
  }

  function initJakartaMap() {
    if (typeof L === 'undefined') {
      console.warn('Leaflet library not loaded.');
      return;
    }
    var mapFeed = (typeof window !== 'undefined' && window.JAKARTA_MAP_FEED) ? window.JAKARTA_MAP_FEED : null;
    if (!mapFeed) {
      console.warn('JAKARTA_MAP_FEED not available.');
      return;
    }
    var mapEl = document.getElementById('jakarta-map');
    if (!mapEl) return;

    // Clean up existing Leaflet instance if present
    if (window._jakartaMapInstance) {
      try { window._jakartaMapInstance.remove(); } catch (e) {}
      window._jakartaMapInstance = null;
    }

    var map = L.map('jakarta-map', {
      center: [-6.225, 106.845],
      zoom: 11,
      minZoom: 8,
      maxZoom: 18,
      preferCanvas: true
    });
    window._jakartaMapInstance = map;

    // Base Tile Layers (Zero API Key / Zero Token Required - No Watermarks)
    var tileUrls = {
      esri_street: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      esri_gray: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      esri_topo: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      esri_sat: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };
    var tileUrl = tileUrls[state.mapBaseLayer] || tileUrls.esri_street;
    L.tileLayer(tileUrl, {
      attribution: '&copy; Esri &copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // 1. Branch Area Borders
    if (state.mapShowBranches && mapFeed.branches) {
      mapFeed.branches.forEach(function (b) {
        if (!b.hull || b.hull.length < 3) return;
        var poly = L.polygon(b.hull, {
          color: b.color || '#EC3013',
          weight: 3,
          opacity: 0.9,
          fillColor: b.color || '#EC3013',
          fillOpacity: 0.08,
          dashArray: '6, 6'
        }).addTo(map);
        poly.bindTooltip('<b>👑 ' + esc(b.branch) + '</b><br><span style="color:#94a3b8">HoA: ' + esc(b.hoa_leader) + ' &middot; ' + b.outlets_count + ' stores</span>', { sticky: true });
        poly.on('click', function () {
          state.mapSelectedProfile = { type: 'branch', data: b };
          render();
        });
      });
    }

    // 2. Micro Cluster Borders
    if (state.mapShowMcs && mapFeed.micro_clusters) {
      mapFeed.micro_clusters.forEach(function (m) {
        if (!m.hull || m.hull.length < 3) return;
        var poly = L.polygon(m.hull, {
          color: m.color || '#0284C7',
          weight: 2,
          opacity: 0.85,
          fillColor: m.color || '#0284C7',
          fillOpacity: 0.12
        }).addTo(map);
        poly.bindTooltip('<b>👔 ' + esc(m.micro_cluster) + '</b><br><span style="color:#94a3b8">DSO: ' + esc(m.dso_leader) + ' &middot; ' + m.outlets_count + ' stores</span>', { sticky: true });
        poly.on('click', function () {
          state.mapSelectedProfile = { type: 'mc', data: m };
          render();
        });
      });
    }

    // 3. Kecamatan Borders
    if (state.mapShowKec && mapFeed.kecamatans) {
      mapFeed.kecamatans.forEach(function (k) {
        if (!k.hull || k.hull.length < 3) return;
        var poly = L.polygon(k.hull, {
          color: '#64748B',
          weight: 1,
          opacity: 0.6,
          fillColor: '#64748B',
          fillOpacity: 0.05,
          dashArray: '3, 3'
        }).addTo(map);
        poly.bindTooltip('<b>📍 ' + esc(k.kecamatan) + '</b><br><span style="color:#94a3b8">' + esc(k.kabupaten) + ' &middot; ' + k.outlets_count + ' stores</span>', { sticky: true });
        poly.on('click', function () {
          state.mapSelectedProfile = { type: 'kecamatan', data: k };
          render();
        });
      });
    }

    // 4. Cellular NBS Sites
    if (state.mapShowSites && mapFeed.sites) {
      var siteRenderer = L.canvas({ padding: 0.5 });
      var scope = state.mapSelectedScope;
      mapFeed.sites.forEach(function (s) {
        if (scope && scope !== 'all') {
          if (s.branch !== scope && s.micro_cluster !== scope) return;
        }
        var sm = L.circleMarker([s.lat, s.long], {
          renderer: siteRenderer,
          radius: 5,
          color: '#0F172A',
          fillColor: '#38BDF8',
          fillOpacity: 0.95,
          weight: 1.5
        }).addTo(map);
        sm.bindTooltip('<b>📡 Site: ' + esc(s.site_id) + '</b><br><span style="color:#94a3b8">' + s.outlets_count + ' stores &middot; Avg: ' + (s.avg_dist_km != null ? s.avg_dist_km.toFixed(2) : '—') + 'km</span>', { sticky: true });
        sm.on('click', function () {
          state.mapSelectedProfile = { type: 'site', data: s };
          render();
        });
      });
    }

    // 5. Retail Outlets (Pure Static Mapped Stores)
    if (state.mapShowOutlets && mapFeed.outlets) {
      var outletRenderer = L.canvas({ padding: 0.5 });
      var scope = state.mapSelectedScope;

      mapFeed.outlets.forEach(function (row) {
        if (scope !== 'all' && row[10] !== scope && row[8] !== scope) return;

        var cm = L.circleMarker([row[2], row[3]], {
          renderer: outletRenderer,
          radius: 3.5,
          color: '#0F172A',
          weight: 0.8,
          fillColor: '#0284C7',
          fillOpacity: 0.85
        }).addTo(map);

        cm.bindTooltip('<b>🏪 ' + esc(row[1]) + '</b><br><span style="color:#94a3b8">NBS: ' + esc(row[4] || '—') + ' &middot; DSE: ' + esc(row[6]) + ' &middot; ' + esc(row[8]) + '</span>', { sticky: true });
        cm.on('click', function () {
          state.mapSelectedProfile = {
            type: 'outlet',
            data: {
              key: row[0],
              name: row[1],
              lat: row[2],
              long: row[3],
              site_nbs: row[4],
              dist_km: row[5],
              dse_name: row[6],
              dse_code: row[7],
              micro_cluster: row[8],
              dso_leader: row[9],
              branch: row[10],
              hoa_leader: row[11],
              kecamatan: row[12],
              desa: row[13]
            }
          };
          render();
        });
      });
    }

    // Zoom to scope if selected
    if (state.mapSelectedScope && state.mapSelectedScope !== 'all') {
      var brMatch = mapFeed.branches.filter(function (b) { return b.branch === state.mapSelectedScope; })[0];
      if (brMatch && brMatch.centroid) {
        map.setView(brMatch.centroid, 12);
      } else {
        var mcMatch = mapFeed.micro_clusters.filter(function (m) { return m.micro_cluster === state.mapSelectedScope; })[0];
        if (mcMatch && mcMatch.centroid) {
          map.setView(mcMatch.centroid, 13);
        }
      }
    }
  }

  function setupMapSearchInput() {
    var inp = document.getElementById('mapSearchInput');
    var res = document.getElementById('mapSearchResults');
    if (!inp || !res) return;

    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase();
      state.mapSearch = inp.value;
      if (q.length < 2) {
        res.style.display = 'none';
        res.innerHTML = '';
        return;
      }
      var mapFeed = (typeof window !== 'undefined' && window.JAKARTA_MAP_FEED) ? window.JAKARTA_MAP_FEED : null;
      if (!mapFeed) return;

      var matches = [];
      // 1. Check Outlets
      for (var i = 0; i < mapFeed.outlets.length && matches.length < 6; i++) {
        var o = mapFeed.outlets[i];
        if (o[1].toLowerCase().indexOf(q) !== -1 || o[0].toLowerCase().indexOf(q) !== -1 || o[6].toLowerCase().indexOf(q) !== -1) {
          matches.push({ type: 'outlet', title: '🏪 ' + o[1], sub: 'DSE: ' + o[6] + ' · ' + o[8], lat: o[2], lon: o[3], raw: o });
        }
      }
      // 2. Check Sites
      for (var s = 0; s < mapFeed.sites.length && matches.length < 9; s++) {
        var site = mapFeed.sites[s];
        if (site.site_id.toLowerCase().indexOf(q) !== -1) {
          matches.push({ type: 'site', title: '📡 Site ' + site.site_id, sub: site.micro_cluster + ' · ' + site.outlets_count + ' stores', lat: site.lat, lon: site.long, raw: site });
        }
      }
      // 3. Check MCs
      for (var m = 0; m < mapFeed.micro_clusters.length && matches.length < 11; m++) {
        var mc = mapFeed.micro_clusters[m];
        if (mc.micro_cluster.toLowerCase().indexOf(q) !== -1 || mc.dso_leader.toLowerCase().indexOf(q) !== -1) {
          matches.push({ type: 'mc', title: '👔 ' + mc.micro_cluster, sub: 'DSO: ' + mc.dso_leader, lat: mc.centroid[0], lon: mc.centroid[1], raw: mc });
        }
      }

      if (matches.length === 0) {
        res.innerHTML = '<div style="padding:8px 10px; font-size:15.5px; color:#666;">No matches found</div>';
        res.style.display = 'block';
        return;
      }

      res.innerHTML = matches.map(function (item, idx) {
        return '<div data-map-search-idx="' + idx + '" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid #eee; font-size:15.5px;">' +
          '<b>' + esc(item.title) + '</b>' +
          '<span style="display:block; color:#666; font-size:14.5px; margin-top:2px;">' + esc(item.sub) + '</span>' +
        '</div>';
      }).join('');
      res.style.display = 'block';

      res._currentMatches = matches;
    });

    document.addEventListener('click', function (e) {
      if (!inp.contains(e.target) && !res.contains(e.target)) {
        res.style.display = 'none';
      }
    });
  }

  /* ==========================================================================
     DSE VISITS & BEAT PLANS TRACKING - Phase 1 Operational Pipeline
     ========================================================================== */
  /* ---------- inactivity audit (Site view / Outlet view) ---------- */
  var UNVIS_GROUPS = [['br', 'Area (Branch)'], ['mc', 'Micro Cluster'], ['kec', 'Kecamatan'], ['dse', 'DSE Canvasser']];
  function unvisWindows() { return { mtd: 'MTD (' + pjpPeriod('mtd') + ')', last7d: 'Last 7 days (' + pjpPeriod('l7') + ')', last3d: 'Last 3 days (' + pjpPeriod('l3') + ')' }; }
  function fmtDur(sec) {
    if (!sec || sec <= 0) return '0m 00s';
    var mm = Math.floor(sec / 60), ss = Math.round(sec % 60);
    return mm + 'm ' + (ss < 10 ? '0' : '') + ss + 's';
  }
  function pctOf(a, b) { return b ? (a / b * 100).toFixed(1) : '0.0'; }
  function hoaOfBranch(feed) { var mp = {}; (feed.branches || []).forEach(function (b) { mp[b.branch] = b.hoa_leader; }); return mp; }
  function inWindow(r, scope) {
    if (scope === 'mtd') return r.w === 'mtd';
    if (scope === 'last7d') return r.w === 'mtd' || r.w === '7d';
    return true;
  }
  function agingLabel(w) { return w === 'mtd' ? 'Never visited MTD' : (w === '7d' ? 'No visit in last 7 days' : 'No visit in last 3 days'); }
  function agingTag(w) {
    if (w === 'mtd') return '<span class="alert-tag">' + agingLabel(w) + '</span>';
    if (w === '7d') return '<span class="alert-tag" style="background:#fff7ed; color:#9a3412; border-color:#fdba74;">' + agingLabel(w) + '</span>';
    return '<span class="sw sw-watch"></span>' + agingLabel(w);
  }
  // ===== PJP helpers: brand filter, HoA filter, hit rate =====
  function bval(r) {
    // Planned/executed for the active Brand Touchpoint filter. Works for daily rows (planned/actual/im3/3id)
    // and for branch/MC/DSE rows (planned_visits/actual_visits/planned_im3/im3_visits/planned_3id/3id_visits).
    var b = state.visitsBrandFilter || 'all';
    var pl = r.planned_visits != null ? r.planned_visits : (r.planned || 0);
    var ac = r.actual_visits != null ? r.actual_visits : (r.actual || 0);
    var pI = r.planned_im3 || 0, aI = r.im3_visits != null ? r.im3_visits : (r.im3 || 0);
    var p3 = r.planned_3id || 0, a3 = r['3id_visits'] != null ? r['3id_visits'] : (r['3id'] || 0);
    if (b === 'im3') return { planned: pI, actual: aI };
    if (b === '3id') return { planned: p3, actual: a3 };
    return { planned: pl, actual: ac };
  }
  function brandRowOk(r) {
    var b = state.visitsBrandFilter || 'all';
    if (b === 'all') return true;
    var aI = r.im3_visits != null ? r.im3_visits : (r.im3 || 0), a3 = r['3id_visits'] != null ? r['3id_visits'] : (r['3id'] || 0);
    if (b === 'hybrid') return aI > 0 && a3 > 0;
    var v = bval(r);
    return v.planned > 0 || v.actual > 0;
  }
  function hitPct(v) { return v.planned ? Math.round(v.actual / v.planned * 1000) / 10 : 0; }
  function hitBar(rate) {
    return '<div class="progress-bar-cell"><div class="progress-bar-fill' + (rate >= 60 ? ' good' : '') + '" style="width:' + Math.min(100, rate) + '%;"></div><span class="progress-bar-label">' + rate + '%</span></div>';
  }
  function brandLabel() { var b = state.visitsBrandFilter || 'all'; return b === 'im3' ? 'IM3 only' : (b === '3id' ? '3ID only' : (b === 'hybrid' ? 'dual-brand rows' : 'all brands')); }
  function visitsScope(feed) {
    var S = feed.regional_summary;
    var scoped = !!(state.branch || state.hoa || state.kec);
    var brand = state.visitsBrandFilter || 'all';
    var dseRow = visitsDseRow(feed);
    if (dseRow) {
      var dv = bval(dseRow), nA = dseRow.assigned_outlets || 0, nV = dseRow.assigned_visited_mtd || 0;
      return { scoped: true, label: 'DSE ' + dseRow.dse_name + (brand !== 'all' ? ' · ' + brandLabel() : ''), planned: dv.planned, actual: dv.actual, hit: hitPct(dv),
        productive: dseRow.productive_visits || 0, prodRate: brand === 'all' || brand === 'hybrid' ? (dseRow.actual_visits ? dseRow.productive_rate : 0) : null,
        prodPhys: dseRow.productive_phys || 0, prodSaldo: dseRow.productive_saldo || 0, flowRate: brand === 'all' || brand === 'hybrid' ? dseRow.flow_rate : null,
        outlets: nA, visited: nV, nv3: dseRow.assigned_not_visited_3d || 0, nv7: dseRow.assigned_not_visited_7d || 0, nvm: dseRow.assigned_not_visited_mtd || 0,
        sites: 0, sz3: 0, sz7: 0, szm: 0, hybrid: 0, durSec: dseRow.avg_duration_sec || 0, dev: dseRow.median_deviation_m || 0, mcCount: 1 };
    }
    if (!scoped && brand === 'all') {
      return { scoped: false, label: 'All Inner Jakarta', planned: S.total_planned_visits, actual: S.total_actual_visits, hit: S.target_hit_rate,
        productive: S.productive_visits || 0, prodRate: S.productive_rate || 0, prodPhys: S.productive_phys || 0, prodSaldo: S.productive_saldo || 0, flowRate: S.flow_rate,
        outlets: S.total_master_outlets, visited: S.visited_outlets_mtd, nv3: S.not_visited_3d, nv7: S.not_visited_7d, nvm: S.not_visited_mtd,
        sites: S.total_sites, sz3: S.sites_zero_3d, sz7: S.sites_zero_7d, szm: S.sites_zero_mtd, hybrid: S.hybrid_outlets,
        durSec: S.avg_duration_sec, dev: S.median_deviation_m, mcCount: (feed.micro_clusters || []).length };
    }
    var hoaMap = hoaOfBranch(feed);
    var rows = (feed.micro_clusters || []).filter(function (mc) {
      if (state.branch && mc.branch !== state.branch) return false;
      if (state.hoa && hoaMap[mc.branch] !== state.hoa) return false;
      if (state.kec && mc.micro_cluster !== state.kec) return false;
      if (scoped && mc.outside) return false;
      return brandRowOk(mc);
    });
    var o = { scoped: true, label: (scoped ? scopeText() : 'All Inner Jakarta') + (brand !== 'all' ? ' · ' + brandLabel() : ''), planned: 0, actual: 0, productive: 0, prodPhys: 0, prodSaldo: 0, flow: 0, outlets: 0, visited: 0, nv3: 0, nv7: 0, nvm: 0, sites: 0, sz3: 0, sz7: 0, szm: 0, hybrid: 0, durW: 0, devW: 0, mcCount: rows.length };
    rows.forEach(function (mc) {
      var v = bval(mc);
      o.planned += v.planned; o.actual += v.actual;
      if (brand === 'all' || brand === 'hybrid') { o.productive += mc.productive_visits || 0; o.prodPhys += mc.productive_phys || 0; o.prodSaldo += mc.productive_saldo || 0; o.flow += mc.flow_completed || 0; }
      o.outlets += mc.total_outlets; o.visited += mc.visited_outlets_mtd;
      o.nv3 += mc.not_visited_3d; o.nv7 += mc.not_visited_7d; o.nvm += mc.not_visited_mtd;
      o.sites += mc.total_sites; o.sz3 += mc.sites_zero_3d; o.sz7 += mc.sites_zero_7d; o.szm += mc.sites_zero_mtd; o.hybrid += mc.hybrid_outlets;
      o.durW += (mc.avg_duration_sec || 0) * mc.actual_visits; o.devW += (mc.median_deviation_m || 0) * mc.actual_visits;
    });
    o.hit = hitPct(o);
    o.prodRate = (brand === 'all' || brand === 'hybrid') && o.actual ? Math.round(o.productive / o.actual * 1000) / 10 : null;
    var w = rows.reduce(function (a, mc) { return a + mc.actual_visits; }, 0);
    o.flowRate = (brand === 'all' || brand === 'hybrid') && w ? Math.round(o.flow / w * 1000) / 10 : null;
    o.durSec = w ? o.durW / w : 0;
    o.dev = w ? Math.round(o.devW / w) : 0;
    return o;
  }
  function unvisFilterBase(list, feed) {
    var hoaMap = hoaOfBranch(feed);
    var q = (state.visitsSearch || '').toLowerCase();
    return list.filter(function (r) {
      if (state.branch && r.br !== state.branch) return false;
      if (state.hoa && r.hoa !== state.hoa && hoaMap[r.br] !== state.hoa) return false;
      if (state.kec && r.mc !== state.kec) return false;
      if (q) {
        var hay = ((r.n || '') + ' ' + (r.k || '') + ' ' + (r.site || '') + ' ' + r.mc + ' ' + r.br + ' ' + r.kec + ' ' + r.dse).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }
  function unvisCompute(feed) {
    var entity = state.unvisEntity || 'outlet', grp = state.unvisGroup || 'br', scope = state.visitsDateScope || 'mtd';
    var outlets = unvisFilterBase(feed.unvisited_outlets || [], feed);
    var sites = unvisFilterBase(feed.unvisited_sites || [], feed);
    function cnt(list, w) { var n = 0; list.forEach(function (r) { if (inWindow(r, w)) n++; }); return n; }
    var totals = { o3: outlets.length, o7: cnt(outlets, 'last7d'), om: cnt(outlets, 'mtd'), s3: sites.length, s7: cnt(sites, 'last7d'), sm: cnt(sites, 'mtd') };
    var list = entity === 'outlet' ? outlets : sites;
    var groups = {};
    list.forEach(function (r) {
      var gk = r[grp] || '—';
      if (!groups[gk]) groups[gk] = { key: gk, br: r.br, hoa: r.hoa, mc: r.mc, dso: r.dso, n3: 0, n7: 0, nm: 0, items: [] };
      var G = groups[gk];
      G.n3++; if (r.w !== '3d') G.n7++; if (r.w === 'mtd') G.nm++;
      if (inWindow(r, scope)) G.items.push(r);
    });
    var gt = (feed.group_totals || {})[grp] || {};
    var ranked = Object.keys(groups).map(function (k) {
      var G = groups[k], t = gt[k] || {};
      G.base = entity === 'outlet' ? (t.outlets || 0) : (t.sites || 0);
      G.n = scope === 'mtd' ? G.nm : (scope === 'last7d' ? G.n7 : G.n3);
      return G;
    }).filter(function (G) { return G.n > 0; }).sort(function (x, y) { return y.n - x.n || x.key.localeCompare(y.key); });
    var sel = state.unvisSelected && groups[state.unvisSelected] ? groups[state.unvisSelected] : null;
    var inScope = sel ? sel.items : list.filter(function (r) { return inWindow(r, scope); });
    return { entity: entity, grp: grp, scope: scope, totals: totals, ranked: ranked, sel: sel, inScope: inScope };
  }
  function exportUnvisitedCsv(c) {
    if (typeof window === 'undefined') return;
    var isOutlet = c.entity === 'outlet';
    var headers = isOutlet
      ? ['Outlet Key', 'Outlet Name', 'Branch', 'Head of Area', 'Micro Cluster', 'DSO Leader', 'Kecamatan', 'Site NBS', 'Assigned DSE', 'Last Visit', 'Inactivity']
      : ['Site NBS', 'Micro Cluster', 'DSO Leader', 'Branch', 'Head of Area', 'Kecamatan', 'Main DSE', 'Outlets Under Site', 'Last Visit', 'Inactivity'];
    function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var lines = [headers.join(',')];
    c.inScope.forEach(function (r) {
      lines.push((isOutlet
        ? [r.k, r.n, r.br, r.hoa, r.mc, r.dso, r.kec, r.site, r.dse, r.last || 'Never', agingLabel(r.w)]
        : [r.site, r.mc, r.dso, r.br, r.hoa, r.kec, r.dse, r.outlets, r.last || 'Never', agingLabel(r.w)]).map(q).join(','));
    });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'unvisited_' + c.entity + 's_' + c.scope + (c.sel ? '_' + String(c.sel.key).replace(/[^A-Za-z0-9]+/g, '_') : '') + '.csv';
    link.click();
  }

  function renderVisitsRegional(feed, summary) {
    var timeline = feed.daily_timeline || [];
    var gw = summary.growth_wow || {};
    var brand = state.visitsBrandFilter || 'all';

    // 1. Daily PJP execution table (follows the Brand Touchpoint filter)
    var timelineRows = timeline.map(function (d) {
      if (d.available === false) {
        return '<tr style="color:var(--ij-muted);"><td class="cur"><b>' + esc(d.date) + '</b> (' + esc(d.day) + ')</td><td colspan="8"><i>Data not available: no PJP export for this day</i></td></tr>';
      }
      var v = bval(d), rate = hitPct(v);
      return '<tr>' +
        '<td class="cur"><b>' + esc(d.date) + '</b> (' + esc(d.day) + ')</td>' +
        '<td class="num">' + fmtCount(v.planned) + '</td>' +
        '<td class="num cur"><b>' + fmtCount(v.actual) + '</b></td>' +
        '<td>' + hitBar(rate) + '</td>' +
        '<td class="num">' + (d.productive_rate != null ? d.productive_rate + '%' : '—') + '</td>' +
        '<td class="num"><span class="badge-im3">IM3</span> ' + fmtCount(d.im3) + ' / ' + fmtCount(d.planned_im3 || 0) + '</td>' +
        '<td class="num"><span class="badge-3id">3ID</span> ' + fmtCount(d['3id']) + ' / ' + fmtCount(d.planned_3id || 0) + '</td>' +
        '<td class="num">' + esc(d.avg_duration) + '</td>' +
        '<td class="num">' + esc(d.median_deviation_m) + ' m</td>' +
      '</tr>';
    }).join('');
    var ramp = gw.w1_per_day != null
      ? 'Week 1 (' + pjpRange(pjpWin().start, pjpWin().start + ((gw.w1_days || 4) - 1) * 86400000) + '): ' + fmtCount(gw.w1_per_day) + ' executed stops/day at ' + gw.w1_compliance + '% of plan. Week 2 (' + pjpPeriod('l7') + '): ' + fmtCount(gw.w2_per_day) + '/day at ' + gw.w2_compliance + '%, a ' + (gw.run_rate_growth_pct >= 0 ? '+' : '') + gw.run_rate_growth_pct + '% run-rate change.' + pjpNoCheckinNote(feed)
      : '';
    var timelineCard = card('Daily PJP Execution · Planned Stops vs Completed Check-Ins (' + pjpPeriod('mtd') + ' 2026' + (brand !== 'all' ? ' · ' + brandLabel() : '') + ')',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        th('Date & Day') + th('Planned Stops', 1) + th('Executed (Check-In)', 1) + th('Target Hit Rate') + th('Productive %', 1) +
        th('IM3 exec / plan', 1) + th('3ID exec / plan', 1) + th('Avg Duration', 1) + th('Median GPS Dev', 1) +
      '</tr></thead><tbody>' + timelineRows + '</tbody></table></div>' +
      '<p class="note">One planned stop = one outlet on one DSE beat plan on one day. Executed = a completed Check In. Productive = the Sell In row carries SP or VC quantity above zero, or the Balance Transfer row carries saldo above Rp ' + fmtCount(summary.saldo_min_rp || 50000) + ' (' + fmtCount(summary.productive_phys || 0) + ' physical · ' + fmtCount(summary.productive_saldo || 0) + ' saldo · ' + fmtCount(summary.sp_qty || 0) + ' SP · ' + fmtCount(summary.vc_qty || 0) + ' VC · Rp ' + ((summary.saldo_rp || 0) / 1e9).toFixed(2) + ' B saldo). The app marks the Sell In / Balance Transfer steps Completed on ' + (summary.flow_rate || 0) + '% of check-ins regardless of quantity, so that status is reported only as "flow completed". ' + ramp + '</p>'
    );

    // 2. Inactivity funnel (master outlets and DSO-mapped sites)
    var funnelCard = card('Coverage vs Inactivity Aging Funnel',
      '<div class="split" style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">' +
        '<div>' +
          '<h3 style="font:800 14.5px var(--ij-font); text-transform:uppercase; margin-bottom:8px;">🏪 Master Retail Outlets Inactivity</h3>' +
          '<div class="tbl-wrap"><table class="tbl"><tbody>' +
            '<tr><td class="cur">Total Master Outlets</td><td class="num"><b>' + fmtCount(summary.total_master_outlets) + '</b></td><td class="num">100.0%</td><td><span class="sw sw-up"></span> Master Base</td></tr>' +
            '<tr><td class="cur">Visited At Least Once MTD</td><td class="num good-tag"><b>' + fmtCount(summary.visited_outlets_mtd) + '</b></td><td class="num"><b>' + summary.coverage_rate_mtd + '%</b></td><td><span class="good-tag">Active Touched</span></td></tr>' +
            '<tr><td class="cur">No Visit in Last 3 Days (' + pjpPeriod('l3') + ')</td><td class="num"><b>' + fmtCount(summary.not_visited_3d) + '</b></td><td class="num">' + pctOf(summary.not_visited_3d, summary.total_master_outlets) + '%</td><td><span class="alert-tag">Immediate Priority</span></td></tr>' +
            '<tr><td class="cur">No Visit in Last 7 Days (' + pjpPeriod('l7') + ')</td><td class="num"><b>' + fmtCount(summary.not_visited_7d) + '</b></td><td class="num">' + pctOf(summary.not_visited_7d, summary.total_master_outlets) + '%</td><td><span class="alert-tag">Severe Aging</span></td></tr>' +
            '<tr><td class="cur">Never Visited MTD (Day 11)</td><td class="num alert-tag"><b>' + fmtCount(summary.not_visited_mtd) + '</b></td><td class="num"><b>' + pctOf(summary.not_visited_mtd, summary.total_master_outlets) + '%</b></td><td><span class="alert-tag">Zero Touchpoint</span></td></tr>' +
          '</tbody></table></div>' +
        '</div>' +
        '<div>' +
          '<h3 style="font:800 14.5px var(--ij-font); text-transform:uppercase; margin-bottom:8px;">🗼 DSO-Mapped NBS Sites Blindspots</h3>' +
          '<div class="tbl-wrap"><table class="tbl"><tbody>' +
            '<tr><td class="cur">Total DSO-mapped Sites (site × MC)</td><td class="num"><b>' + fmtCount(summary.total_sites) + '</b></td><td class="num">100.0%</td><td><span class="sw sw-up"></span> BTS Grid</td></tr>' +
            '<tr><td class="cur">Sites with &ge;1 Visited Outlet MTD</td><td class="num good-tag"><b>' + fmtCount(summary.sites_active_mtd) + '</b></td><td class="num"><b>' + pctOf(summary.sites_active_mtd, summary.total_sites) + '%</b></td><td><span class="good-tag">Monitored Grid</span></td></tr>' +
            '<tr><td class="cur">Sites with 0 Visited Outlets in Last 3 Days</td><td class="num"><b>' + fmtCount(summary.sites_zero_3d) + '</b></td><td class="num">' + pctOf(summary.sites_zero_3d, summary.total_sites) + '%</td><td><span class="alert-tag">Blindspot Watch</span></td></tr>' +
            '<tr><td class="cur">Sites with 0 Visited Outlets in Last 7 Days</td><td class="num"><b>' + fmtCount(summary.sites_zero_7d) + '</b></td><td class="num">' + pctOf(summary.sites_zero_7d, summary.total_sites) + '%</td><td><span class="alert-tag">Chronic Blindspot</span></td></tr>' +
            '<tr><td class="cur">Sites with 0 Visited Outlets MTD</td><td class="num alert-tag"><b>' + fmtCount(summary.sites_zero_mtd) + '</b></td><td class="num"><b>' + pctOf(summary.sites_zero_mtd, summary.total_sites) + '%</b></td><td><span class="alert-tag">Dark Network Cell</span></td></tr>' +
          '</tbody></table></div>' +
        '</div>' +
      '</div>'
    );

    // 3. Brand touchpoints and the computed Sell-In link
    var L = summary.sellin_link;
    var linkHtml;
    if (L && L.physical) {
      linkHtml =
        '<p style="margin:0 0 6px;"><b>📦 Physical SP &amp; VC Sell-In outlets:</b> <span class="good-tag">' + L.physical.pct_visited + '% visited</span><br>' +
        fmtCount(L.physical.visited_mtd) + ' of ' + fmtCount(L.physical.outlets) + ' master outlets that received physical stock had a completed DSE check-in MTD; ' + L.physical.pct_same_day + '% on the supply day itself.</p>' +
        '<p style="margin:0 0 6px;"><b>💳 Mobo saldo transfer outlets:</b> <span class="badge-hybrid">' + L.balance.pct_visited + '% visited</span><br>' +
        fmtCount(L.balance.visited_mtd) + ' of ' + fmtCount(L.balance.outlets) + ' outlets that received saldo had a check-in MTD; ' + L.balance.pct_same_day + '% on the transfer day. The rest were topped up remotely.</p>' +
        '<p style="margin:0; color:var(--ij-muted); font-size:14px;">Computed from the Sell-In feed (' + esc(L.period) + ') and the journey plan logs. ' + esc(L.note) + '</p>';
    } else {
      linkHtml = '<p class="note" style="margin:0;">Sell-In feed not built yet (run <code>scripts/build_sellin_feed.py</code>), so the visit-to-supply link is not shown.</p>';
    }
    var brandCard = card('Brand Touchpoints &amp; Sell-In Link',
      '<div class="split" style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">' +
        '<div>' +
          '<h3 style="font:800 14.5px var(--ij-font); text-transform:uppercase; margin-bottom:8px;">Brand Touchpoints on Master Outlets</h3>' +
          '<div class="tbl-wrap"><table class="tbl"><tbody>' +
            '<tr><td class="cur"><span class="badge-im3">IM3 Only</span> Visited Stores</td><td class="num"><b>' + fmtCount(summary.im3_only_outlets) + '</b></td><td class="num">' + pctOf(summary.im3_only_outlets, summary.visited_outlets_mtd) + '%</td></tr>' +
            '<tr><td class="cur"><span class="badge-3id">3ID Only</span> Visited Stores</td><td class="num"><b>' + fmtCount(summary['3id_only_outlets']) + '</b></td><td class="num">' + pctOf(summary['3id_only_outlets'], summary.visited_outlets_mtd) + '%</td></tr>' +
            '<tr><td class="cur"><span class="badge-hybrid">Dual-Brand Hybrid</span> Both Visited</td><td class="num good-tag"><b>' + fmtCount(summary.hybrid_outlets) + '</b></td><td class="num"><b>' + pctOf(summary.hybrid_outlets, summary.visited_outlets_mtd) + '%</b></td></tr>' +
            '<tr><td class="cur">Total Unique Visited Stores</td><td class="num cur"><b>' + fmtCount(summary.visited_outlets_mtd) + '</b></td><td class="num">100.0%</td></tr>' +
            '<tr><td class="cur">Planned stops IM3 / 3ID</td><td class="num"><b>' + fmtCount(summary.planned_im3 || 0) + '</b> / <b>' + fmtCount(summary.planned_3id || 0) + '</b></td><td class="num">' + fmtCount(summary.im3_visits) + ' / ' + fmtCount(summary['3id_visits']) + ' executed</td></tr>' +
          '</tbody></table></div>' +
        '</div>' +
        '<div>' +
          '<h3 style="font:800 15.5px var(--ij-font); text-transform:uppercase; margin-bottom:8px;">Phase 1 Sell-In Pipeline Link</h3>' +
          '<div style="background:var(--ij-surface); padding:12px 14px; border:1px solid var(--ij-hairline); font-size:15px; line-height:1.55;">' + linkHtml + '</div>' +
        '</div>' +
      '</div>'
    );

    // 4. Territory reconciliation: how raw MOBI branch names map to the master, and what stays outside
    var OT = summary.outside_territory || {};
    var ops = summary.operators || {};
    var rawRows = (summary.raw_branch_names || []).map(function (r) {
      var changed = r.raw !== r.mapped_to;
      return '<tr' + (r.mapped_to === 'OUTSIDE MASTER TERRITORY' ? ' style="color:var(--ij-muted);"' : '') + '><td class="cur">' + esc(r.raw || '(blank)') + '</td><td>' + (changed ? '<b>' + esc(r.mapped_to) + '</b>' : esc(r.mapped_to)) + '</td><td class="num">' + fmtCount(r.planned) + '</td></tr>';
    }).join('') + ((summary.raw_branch_names || []).length > 1 ? '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td class="cur" style="background:var(--ink); color:#fff;">TOTAL · ' + (summary.raw_branch_names || []).length + ' MOBI branch</td><td></td><td class="num">' + fmtCount((summary.raw_branch_names || []).reduce(function (a, r) { return a + (r.planned || 0); }, 0)) + '</td></tr>' : '');
    var outsideTop = (OT.top || []).map(function (t) { return esc(t.branch) + ' / ' + esc(t.mc) + ' (' + fmtCount(t.planned) + ')'; }).join(', ');
    var reconCard = card('Territory &amp; Operator Reconciliation · why the totals tie out',
      '<div class="split" style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">' +
        '<div>' +
          '<h3 style="font:800 14.5px var(--ij-font); text-transform:uppercase; margin-bottom:8px;">Raw MOBI branch → master branch</h3>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('MOBI BRANCH') + th('Counted under') + th('Planned stops', 1) + '</tr></thead><tbody>' + rawRows + '</tbody></table></div>' +
          '<p class="note">Branch and MC are taken from the master catalogue through the MOBI micro cluster. KOTA BEKASI, SOUTH JAKARTA and NORTH/SOUTH KARAWANG are the same territories as BEKASI, SOUTH JAKARTA DEPOK and KARAWANG.</p>' +
        '</div>' +
        '<div>' +
          '<h3 style="font:800 14.5px var(--ij-font); text-transform:uppercase; margin-bottom:8px;">Outside master territory &amp; field operators</h3>' +
          '<div class="tbl-wrap"><table class="tbl"><tbody>' +
            '<tr><td class="cur">Planned stops outside the 36 master MCs</td><td class="num"><b>' + fmtCount(OT.planned || 0) + '</b></td><td class="num">' + fmtCount(OT.actual || 0) + ' executed</td></tr>' +
            '<tr><td class="cur" colspan="3" style="font-size:14px; color:var(--ij-muted);">' + (outsideTop || '—') + '</td></tr>' +
            '<tr><td class="cur">Field operators with a journey plan</td><td class="num"><b>' + fmtCount(ops.total || 0) + '</b></td><td class="num">' + fmtCount(ops.canvassers || 0) + ' canvassers · ' + fmtCount(ops.promotors || 0) + ' promotors</td></tr>' +
            '<tr><td class="cur">Matched to the DSE master hierarchy</td><td class="num"><b>' + fmtCount(ops.in_master || 0) + '</b></td><td class="num">' + fmtCount(ops.hybrid_logins || 0) + ' with IM3 + 3ID logins folded to one person</td></tr>' +
            '<tr><td class="cur">Operators with zero executed stops</td><td class="num alert-tag"><b>' + fmtCount(ops.zero_execution || 0) + '</b></td><td class="num">' + fmtCount(ops.active || 0) + ' active</td></tr>' +
          '</tbody></table></div>' +
        '</div>' +
      '</div>'
    );

    return timelineCard + funnelCard + brandCard + reconCard;
  }

  // TOTAL row for the Area / MC visit tables: sums the counts of the listed rows and recomputes the rates from them
  function visitsTotalRow(list, lead) {
    var T = { planned: 0, actual: 0, prodW: 0, out: 0, vis: 0, nv: 0, nv7: 0, nv3: 0, sites: 0, sz: 0, sz7: 0, sz3: 0, im3: 0, id3: 0, hy: 0 };
    list.forEach(function (r) {
      var v = bval(r); T.planned += v.planned; T.actual += v.actual; T.prodW += (r.productive_rate || 0) * v.actual;
      T.out += r.total_outlets || 0; T.vis += r.visited_outlets_mtd || 0; T.nv += r.not_visited_mtd || 0; T.nv7 += r.not_visited_7d || 0; T.nv3 += r.not_visited_3d || 0;
      T.sites += r.total_sites || 0; T.sz += r.sites_zero_mtd || 0; T.sz7 += r.sites_zero_7d || 0; T.sz3 += r.sites_zero_3d || 0;
      T.im3 += r.im3_visits || 0; T.id3 += r['3id_visits'] || 0; T.hy += r.hybrid_outlets || 0;
    });
    var c = 'style="background:var(--ink); color:#fff;"';
    return '<tr style="background:var(--ink); color:#fff; font-weight:800;">' + lead + '<td class="num">' + fmtCount(T.planned) + '</td><td class="num">' + fmtCount(T.actual) + '</td><td>' + hitPct(T) + '%</td>' +
      '<td class="num">' + (T.actual ? Math.round(T.prodW / T.actual * 10) / 10 + '%' : '—') + '</td><td class="num">' + fmtCount(T.out) + '</td><td class="num">' + fmtCount(T.vis) + ' (' + (T.out ? Math.round(T.vis / T.out * 1000) / 10 : 0) + '%)</td>' +
      '<td class="num">' + fmtCount(T.nv) + '</td><td class="num">' + fmtCount(T.nv7) + '</td><td class="num">' + fmtCount(T.nv3) + '</td><td class="num">' + fmtCount(T.sites) + '</td><td class="num">' + fmtCount(T.sz) + '</td><td class="num">' + fmtCount(T.sz7) + '</td><td class="num">' + fmtCount(T.sz3) + '</td>' +
      '<td class="num">IM3 ' + fmtCount(T.im3) + '</td><td class="num">3ID ' + fmtCount(T.id3) + '</td><td class="num">' + fmtCount(T.hy) + '</td><td></td><td></td><td></td></tr>';
  }
  function renderVisitsArea(feed) {
    var hoaMap = hoaOfBranch(feed);
    var branches = feed.branches || [];
    var q = (state.visitsSearch || '').toLowerCase();
    var filtered = branches.filter(function (b) {
      if (state.branch && b.branch !== state.branch) return false;
      if (state.hoa && hoaMap[b.branch] !== state.hoa) return false;
      if (q && b.branch.toLowerCase().indexOf(q) === -1 && (b.hoa_leader || '').toLowerCase().indexOf(q) === -1) return false;
      return brandRowOk(b);
    });
    var rows = filtered.map(function (b) {
      var v = bval(b), rate = hitPct(v);
      var muted = b.outside ? ' style="color:var(--ij-muted);"' : '';
      return '<tr' + muted + '>' +
        '<td class="cur"><b>' + esc(b.branch) + '</b></td>' +
        '<td>' + esc(b.hoa_leader) + '</td>' +
        '<td class="num">' + fmtCount(v.planned) + '</td>' +
        '<td class="num cur"><b>' + fmtCount(v.actual) + '</b></td>' +
        '<td>' + hitBar(rate) + '</td>' +
        '<td class="num">' + (b.productive_rate != null ? b.productive_rate + '%' : '—') + '</td>' +
        '<td class="num">' + fmtCount(b.total_outlets) + '</td>' +
        '<td class="num cur"><b>' + fmtCount(b.visited_outlets_mtd) + '</b> (' + b.coverage_rate + '%)</td>' +
        '<td class="num alert-tag">' + fmtCount(b.not_visited_mtd) + '</td>' +
        '<td class="num">' + fmtCount(b.not_visited_7d) + '</td>' +
        '<td class="num">' + fmtCount(b.not_visited_3d) + '</td>' +
        '<td class="num">' + fmtCount(b.total_sites) + '</td>' +
        '<td class="num alert-tag">' + fmtCount(b.sites_zero_mtd) + '</td>' +
        '<td class="num">' + fmtCount(b.sites_zero_7d) + '</td>' +
        '<td class="num">' + fmtCount(b.sites_zero_3d) + '</td>' +
        '<td class="num"><span class="badge-im3">IM3</span> ' + fmtCount(b.im3_visits) + '</td>' +
        '<td class="num"><span class="badge-3id">3ID</span> ' + fmtCount(b['3id_visits']) + '</td>' +
        '<td class="num"><span class="badge-hybrid">' + fmtCount(b.hybrid_outlets) + '</span></td>' +
        '<td class="num">' + esc(b.avg_duration) + '</td>' +
        '<td class="num">' + esc(b.median_deviation_m) + ' m</td>' +
        '<td>' + (b.outside ? '<span class="note">not in master</span>' : '<button type="button" class="btn" data-visits-drill="branch" data-br="' + esc(b.branch) + '" style="font-size:14px; padding:5px 9px;">Drill MCs &#8594;</button>') + '</td>' +
      '</tr>';
    }).join('');
    var nMaster = branches.filter(function (b) { return !b.outside; }).length;
    return card('Area View · ' + nMaster + ' Branches &amp; HoA Leaders · PJP execution',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        th('Branch') + th('HoA Leader') + th('Planned', 1) + th('Executed', 1) + th('Target Hit %') + th('Productive %', 1) +
        th('Total Stores', 1) + th('Visited MTD', 1) + th('Unvisited MTD', 1) + th('Unvis 7D', 1) + th('Unvis 3D', 1) +
        th('Sites', 1) + th('Site 0 MTD', 1) + th('Site 0 7D', 1) + th('Site 0 3D', 1) +
        th('IM3 Exec', 1) + th('3ID Exec', 1) + th('Hybrid Stores', 1) + th('Avg Dur', 1) + th('GPS Dev', 1) + th('Action') +
      '</tr></thead><tbody>' + rows + (filtered.length > 1 ? visitsTotalRow(filtered, '<td class="cur" style="background:var(--ink); color:#fff;">TOTAL · ' + filtered.length + ' area</td><td></td>') : '') + '</tbody></table></div>' +
      '<p class="note">Showing ' + filtered.length + ' rows · ' + brandLabel() + '. Planned and executed stops follow the MOBI micro cluster mapped to the master branch; the OUTSIDE MASTER TERRITORY row holds stops in MCs that are not in the 36-MC master, so the column totals equal the regional figures. Click "Drill MCs" to focus on a branch.</p>'
    );
  }

  function renderVisitsMc(feed) {
    var hoaMap = hoaOfBranch(feed);
    var mcs = feed.micro_clusters || [];
    var q = (state.visitsSearch || '').toLowerCase();
    var filtered = mcs.filter(function (m) {
      if (state.branch && m.branch !== state.branch) return false;
      if (state.hoa && hoaMap[m.branch] !== state.hoa) return false;
      if (state.kec && m.micro_cluster !== state.kec) return false;
      if (q && m.micro_cluster.toLowerCase().indexOf(q) === -1 && m.branch.toLowerCase().indexOf(q) === -1 && (m.dso_leader || '').toLowerCase().indexOf(q) === -1) return false;
      return brandRowOk(m);
    });
    var rows = filtered.map(function (m) {
      var v = bval(m), rate = hitPct(v);
      var muted = m.outside ? ' style="color:var(--ij-muted);"' : '';
      return '<tr' + muted + '>' +
        '<td class="cur"><b>' + esc(m.micro_cluster) + '</b></td>' +
        '<td>' + esc(m.branch) + '</td>' +
        '<td>' + esc(m.dso_leader) + '</td>' +
        '<td class="num">' + fmtCount(v.planned) + '</td>' +
        '<td class="num cur"><b>' + fmtCount(v.actual) + '</b></td>' +
        '<td>' + hitBar(rate) + '</td>' +
        '<td class="num">' + (m.productive_rate != null ? m.productive_rate + '%' : '—') + '</td>' +
        '<td class="num">' + fmtCount(m.total_outlets) + '</td>' +
        '<td class="num cur"><b>' + fmtCount(m.visited_outlets_mtd) + '</b> (' + m.coverage_rate + '%)</td>' +
        '<td class="num alert-tag">' + fmtCount(m.not_visited_mtd) + '</td>' +
        '<td class="num">' + fmtCount(m.not_visited_7d) + '</td>' +
        '<td class="num">' + fmtCount(m.not_visited_3d) + '</td>' +
        '<td class="num">' + fmtCount(m.total_sites) + '</td>' +
        '<td class="num alert-tag">' + fmtCount(m.sites_zero_mtd) + '</td>' +
        '<td class="num">' + fmtCount(m.sites_zero_7d) + '</td>' +
        '<td class="num">' + fmtCount(m.sites_zero_3d) + '</td>' +
        '<td class="num"><span class="badge-im3">IM3</span> ' + fmtCount(m.im3_visits) + '</td>' +
        '<td class="num"><span class="badge-3id">3ID</span> ' + fmtCount(m['3id_visits']) + '</td>' +
        '<td class="num"><span class="badge-hybrid">' + fmtCount(m.hybrid_outlets) + '</span></td>' +
        '<td class="num">' + esc(m.avg_duration) + '</td>' +
        '<td class="num">' + esc(m.median_deviation_m) + ' m</td>' +
        '<td>' + (m.outside ? '<span class="note">not in master</span>' : '<button type="button" class="btn" data-visits-drill="mc" data-br="' + esc(m.branch) + '" data-mc="' + esc(m.micro_cluster) + '" style="font-size:14px; padding:5px 9px;">Drill DSEs &#8594;</button>') + '</td>' +
      '</tr>';
    }).join('');
    var nMaster = mcs.filter(function (m) { return !m.outside; }).length;
    return card('Micro Cluster View · ' + nMaster + ' MCs &amp; DSO Supervisors · PJP execution',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        th('Micro Cluster') + th('Branch') + th('DSO Leader') + th('Planned', 1) + th('Executed', 1) + th('Target Hit %') + th('Productive %', 1) +
        th('Total Stores', 1) + th('Visited MTD', 1) + th('Unvisited MTD', 1) + th('Unvis 7D', 1) + th('Unvis 3D', 1) +
        th('Sites', 1) + th('Site 0 MTD', 1) + th('Site 0 7D', 1) + th('Site 0 3D', 1) +
        th('IM3 Exec', 1) + th('3ID Exec', 1) + th('Hybrid Stores', 1) + th('Avg Dur', 1) + th('GPS Dev', 1) + th('Action') +
      '</tr></thead><tbody>' + rows + (filtered.length > 1 ? visitsTotalRow(filtered, '<td class="cur" style="background:var(--ink); color:#fff;">TOTAL · ' + filtered.length + ' MC</td><td></td><td></td>') : '') + '</tbody></table></div>' +
      '<p class="note">Showing ' + filtered.length + ' rows · ' + brandLabel() + '. Sorted by master outlet count.</p>'
    );
  }

  function renderVisitsDse(feed) {
    var hoaMap = hoaOfBranch(feed);
    var dses = feed.dses || [];
    var q = (state.visitsSearch || '').toLowerCase();
    var brand = state.visitsBrandFilter || 'all';
    var filtered = dses.filter(function (d) {
      if (state.visitsDse && d.person_id !== state.visitsDse) return false;
      if (state.branch && d.branch !== state.branch) return false;
      if (state.hoa && d.hoa_leader !== state.hoa && hoaMap[d.branch] !== state.hoa) return false;
      if (state.kec && d.micro_cluster !== state.kec) return false;
      if (brand === 'hybrid') { var L = {}; (d.logins || []).forEach(function (l) { L[l.split(':')[0]] = 1; }); if (!(L.IM3 && L['3ID'])) return false; }
      else if (!brandRowOk(d)) return false;
      if (q) {
        var hay = (d.dse_name + ' ' + (d.logins || []).join(' ') + ' ' + d.branch + ' ' + d.micro_cluster + ' ' + (d.dso_leader || '') + ' ' + (d.hoa_leader || '') + ' ' + (d.operator_type || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var rowOf = function (d) {
      var v = bval(d), rate = hitPct(v);
      var statusTag;
      if (d.is_promotor) statusTag = promoTag(d) + '<br><span class="note">tidak diukur sebagai PJP</span>';
      else if (!v.actual && v.planned) statusTag = '<span class="alert-tag">No execution</span>';
      else if (rate >= 70) statusTag = '<span class="good-tag">Strong (&ge;70%)</span>';
      else if (rate >= 50) statusTag = '<span class="sw sw-up"></span> Healthy';
      else if (rate >= 25) statusTag = '<span class="sw sw-watch"></span> Needs Focus';
      else statusTag = '<span class="alert-tag">Severe (&lt;25%)</span>';
      var logins = (d.logins || []).map(function (l) { var p = l.split(':'); return '<span class="' + (p[0] === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(p[0]) + '</span> <code>' + esc(p[1]) + '</code>'; }).join(' ');
      var cov = d.assigned_coverage_rate == null ? '—' : d.assigned_coverage_rate + '%';
      var adh = d.adhoc_planned ? ' <span class="badge-adhoc" title="Kunjungan ad-hoc di outlet tanpa DSE, tidak dihitung sebagai PJP">ADHOC ' + fmtCount(d.adhoc_actual) + '/' + fmtCount(d.adhoc_planned) + '</span>' : '';
      return '<tr' + (d.is_promotor ? ' style="background:#faf5ff;"' : '') + '>' +
        '<td class="cur" style="padding-left:40px;">' + (d.is_promotor ? '🎤 ' : '') + '<b>' + esc(d.dse_name) + '</b> ' + iohTag(d.logins) + promoTag(d) + adh + (d.in_master || d.is_promotor ? '' : ' <span class="note" title="Login not found in MASTER DSE Hirarki">(not in master)</span>') + '<br><span style="font-size:13px;">' + logins + '</span></td>' +
        '<td>' + esc(d.operator_type) + '</td>' +
        '<td>' + esc(d.branch) + '</td>' +
        '<td>' + esc(d.micro_cluster) + '</td>' +
        '<td>' + esc(d.dso_leader || '—') + '</td>' +
        '<td class="num">' + fmtCount(v.planned) + '</td>' +
        '<td class="num cur"><b>' + fmtCount(v.actual) + '</b></td>' +
        '<td>' + (d.is_promotor ? '<span class="note">tidak diukur</span>' : hitBar(rate)) + '</td>' +
        '<td class="num">' + (!d.is_promotor && d.productive_rate != null && d.actual_visits ? d.productive_rate + '%' : '—') + '</td>' +
        '<td class="num">' + d.days_active + ' / ' + d.days_planned + '</td>' +
        '<td class="num">' + d.visits_per_active_day + '</td>' +
        '<td class="num">' + fmtCount(d.outlets_visited) + ' / ' + fmtCount(d.outlets_planned) + '</td>' +
        '<td class="num">' + (d.assigned_outlets ? fmtCount(d.assigned_visited_mtd) + ' / ' + fmtCount(d.assigned_outlets) : '—') + '</td>' +
        '<td class="num"><b>' + cov + '</b></td>' +
        '<td class="num alert-tag">' + (d.assigned_outlets ? fmtCount(d.assigned_not_visited_mtd) : '—') + '</td>' +
        '<td class="num"><span class="badge-im3">' + fmtCount(d.im3_visits) + '</span></td>' +
        '<td class="num"><span class="badge-3id">' + fmtCount(d['3id_visits']) + '</span></td>' +
        '<td class="num">' + esc(d.avg_duration) + '</td>' +
        '<td class="num">' + esc(d.median_deviation_m) + ' m</td>' +
        '<td>' + statusTag + '</td>' +
        '<td><button type="button" class="btn" data-visits-detail="dse" data-dse="' + esc(d.person_id) + '" style="font-size:14px; padding:5px 9px;">Outlets &#8594;</button></td>' +
      '</tr>';
    };
    var dsoOfMc = {}, hoaOfArea = {};
    filtered.forEach(function (d) { if (!dsoOfMc[d.micro_cluster]) dsoOfMc[d.micro_cluster] = d.dso_leader || '—'; if (!hoaOfArea[d.branch]) hoaOfArea[d.branch] = d.hoa_leader || hoaMap[d.branch] || '—'; });
    var sub = function (it) {
      var pl = grpSum(it, function (d) { return d.is_promotor ? 0 : bval(d).planned; }), ac = grpSum(it, function (d) { return d.is_promotor ? 0 : bval(d).actual; });
      return '<td colspan="4"></td><td class="num">' + fmtCount(pl) + '</td><td class="num"><b>' + fmtCount(ac) + '</b></td><td>' + hitBar(hitPct({ planned: pl, actual: ac })) + '</td><td colspan="6"></td>' +
        '<td class="num alert-tag">' + fmtCount(grpSum(it, function (d) { return d.assigned_not_visited_mtd; })) + '</td>' +
        '<td class="num">' + fmtCount(grpSum(it, function (d) { return d.im3_visits; })) + '</td><td class="num">' + fmtCount(grpSum(it, function (d) { return d['3id_visits']; })) + '</td><td colspan="4"></td>';
    };
    var rows = grpBody('visdse', { items: filtered, area: function (d) { return d.branch; }, mc: function (d) { return d.micro_cluster; }, dso: function (m) { return dsoOfMc[m] || '—'; }, hoa: function (a) { return hoaOfArea[a] || '—'; },
      val: function (d) { return bval(d).actual || 0; }, span: 1, cols: 21, sub: sub, row: rowOf, unit: 'DSE', cap: 200, search: !!q });
    var paginationHtml = '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; flex-wrap:wrap; gap:8px;">' +
      '<span class="note">' + fmtCount(filtered.length) + ' field operators · ' + brandLabel() + ' · dikelompokkan Area › Micro Cluster</span>' + grpBar('visdse') + '</div>';
    return card('DSE View · PJP execution per field operator (the DSE whose beat plan it is)',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
        th('Area › MC › DSE · MOBI logins') + th('Type') + th('Branch') + th('Micro Cluster') + th('DSO Leader') + th('Planned', 1) + th('Executed', 1) + th('Target Hit %') + th('Productive %', 1) +
        th('Days active / planned', 1) + th('Stops per active day', 1) + th('Outlets visited / planned', 1) +
        th('Assigned master outlets visited', 1) + th('Assigned coverage', 1) + th('Assigned unvisited MTD', 1) +
        th('IM3 Exec', 1) + th('3ID Exec', 1) + th('Avg Dur', 1) + th('GPS Dev', 1) + th('Status') + th('Action') +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' + paginationHtml +
      '<p class="note">Planned and executed stops are credited to the operator login on the beat plan (OPERATOR ID), with IM3 and 3ID logins of the same person folded together via the DSE master hierarchy. "Assigned" columns use the master outlet-to-DSE mapping and are blank for logins the master does not know. Sorted by planned stops.</p>'
    );
  }

  // ===== PJP level resolution: the table and heatmap regroup to the level below the selected territory =====
  var VISIT_LEVELS = [['auto', '⚙️ Auto · follows filter'], ['area', 'Area (Branch)'], ['mc', 'Micro Cluster'], ['dse', 'DSE'], ['outlet', 'Outlet']];
  var VISIT_LEVEL_LABEL = { area: 'per Area (Branch)', mc: 'per Micro Cluster', dse: 'per DSE', outlet: 'per Outlet' };
  function visitsAutoLevel() {
    if (state.visitsDse) return 'outlet';
    if (state.kec) return 'dse';
    if (state.branch || state.hoa) return 'mc';
    return 'area';
  }
  function visitsLevel() { var l = state.visitsLevel || 'auto'; return l === 'auto' ? visitsAutoLevel() : l; }
  function visitsDseRow(feed) {
    if (!state.visitsDse) return null;
    var rows = feed.dses || [];
    for (var i = 0; i < rows.length; i++) if (rows[i].person_id === state.visitsDse) return rows[i];
    return null;
  }
  function dailyIdx() { var b = state.visitsBrandFilter || 'all'; return b === 'im3' ? [2, 3] : (b === '3id' ? [4, 5] : [0, 1]); }
  function visitsDseInScope(feed) {
    var hoaMap = hoaOfBranch(feed);
    var brand = state.visitsBrandFilter || 'all';
    return (feed.dses || []).filter(function (d) {
      if (state.visitsDse) return d.person_id === state.visitsDse;
      if (d.is_promotor) return false;          // promotors are listed in the DSE view but not measured as PJP productivity
      if (state.branch && d.branch !== state.branch) return false;
      if (state.hoa && d.hoa_leader !== state.hoa && hoaMap[d.branch] !== state.hoa) return false;
      if (state.kec && d.micro_cluster !== state.kec) return false;
      if (brand === 'hybrid') { var L = {}; (d.logins || []).forEach(function (l) { L[l.split(':')[0]] = 1; }); return !!(L.IM3 && L['3ID']); }
      return brandRowOk(d);
    });
  }
  // Rows at the resolved level, each with a daily [planned, executed] series for the active brand filter.
  function visitsRowsAt(feed, level) {
    var hoaMap = hoaOfBranch(feed);
    var q = (state.visitsSearch || '').toLowerCase();
    var ix = dailyIdx();
    function series(r) { return (r.daily || []).map(function (c) { return [c[ix[0]] || 0, c[ix[1]] || 0]; }); }
    function okQ(hay) { return !q || hay.toLowerCase().indexOf(q) !== -1; }
    var out = [];
    if (level === 'area') {
      (feed.branches || []).forEach(function (b) {
        if (state.branch && b.branch !== state.branch) return;
        if (state.hoa && hoaMap[b.branch] !== state.hoa) return;
        if (!brandRowOk(b) || !okQ(b.branch + ' ' + (b.hoa_leader || ''))) return;
        var v = bval(b);
        out.push({ key: b.branch, label: b.branch, parent: b.hoa_leader || '—', planned: v.planned, actual: v.actual, prod: b.productive_rate, daily: series(b), outside: !!b.outside,
          drill: b.outside ? null : { lv: 'area', br: b.branch } });
      });
    } else if (level === 'mc') {
      (feed.micro_clusters || []).forEach(function (m) {
        if (state.branch && m.branch !== state.branch) return;
        if (state.hoa && hoaMap[m.branch] !== state.hoa) return;
        if (state.kec && m.micro_cluster !== state.kec) return;
        if (!brandRowOk(m) || !okQ(m.micro_cluster + ' ' + m.branch + ' ' + (m.dso_leader || ''))) return;
        var v = bval(m);
        out.push({ key: m.micro_cluster, label: m.micro_cluster, parent: m.branch + ' · ' + (m.dso_leader || '—'), planned: v.planned, actual: v.actual, prod: m.productive_rate, daily: series(m), outside: !!m.outside,
          drill: m.outside ? null : { lv: 'mc', br: m.branch, mc: m.micro_cluster } });
      });
    } else if (level === 'dse') {
      visitsDseInScope(feed).forEach(function (d) {
        if (!okQ(d.dse_name + ' ' + (d.logins || []).join(' ') + ' ' + d.micro_cluster + ' ' + d.branch + ' ' + (d.dso_leader || ''))) return;
        var v = bval(d);
        out.push({ key: d.person_id, label: d.dse_name + (d.in_master ? '' : ' (not in master)'), parent: d.micro_cluster + ' · ' + d.branch, planned: v.planned, actual: v.actual, prod: d.actual_visits ? d.productive_rate : null, daily: series(d), br: d.branch, mc: d.micro_cluster, dso: d.dso_leader, hoa: d.hoa_leader,
          drill: { lv: 'dse', dse: d.person_id } });
      });
    } else {
      var brand = state.visitsBrandFilter || 'all';
      visitsDseInScope(feed).forEach(function (d) {
        (d.outlets || []).forEach(function (o) {
          if (brand === 'im3' && o.b !== 'IM3') return;
          if (brand === '3id' && o.b !== '3ID') return;
          if (state.kec && o.mc !== state.kec) return;
          if (!okQ(o.n + ' ' + o.id + ' ' + o.mc + ' ' + d.dse_name)) return;
          var daily = [], pl = 0, ac = 0;
          for (var i = 0; i < o.d.length; i++) { var p = o.d[i] !== '.' ? 1 : 0, x = o.d[i] === 'x' ? 1 : 0; pl += p; ac += x; daily.push([p, x]); }
          out.push({ key: d.person_id + '|' + o.id, label: o.n || o.id, sub: o.id, parent: o.mc + ' · ' + d.dse_name, planned: pl, actual: ac, prod: null, daily: daily, master: o.k, br: d.branch, mc: o.mc || d.micro_cluster, dse: d.dse_name, dso: d.dso_leader, hoa: d.hoa_leader, drill: null });
        });
      });
    }
    out.sort(function (a, b) { return b.planned - a.planned || String(a.label).localeCompare(String(b.label)); });
    return out;
  }
  function detailBtn(r, text) {
    if (!r.drill) return '';
    var d = r.drill;
    return '<button type="button" class="btn" data-visits-detail="' + d.lv + '"' + (d.br ? ' data-br="' + esc(d.br) + '"' : '') + (d.mc ? ' data-mc="' + esc(d.mc) + '"' : '') + (d.dse ? ' data-dse="' + esc(d.dse) + '"' : '') + ' style="font-size:14px; padding:5px 9px;">' + text + ' &#8594;</button>';
  }
  function visitsLevelBar(feed) {
    var auto = visitsAutoLevel(), cur = state.visitsLevel || 'auto';
    var dseRow = visitsDseRow(feed);
    return '<div class="map-toolbar" style="margin-top:8px;">' +
      '<div class="map-toolbar-group"><span class="map-label">Group by:</span>' +
        VISIT_LEVELS.map(function (l) {
          var lbl = l[0] === 'auto' ? l[1] + ' (' + VISIT_LEVEL_LABEL[auto] + ')' : l[1];
          return '<button type="button" class="map-btn' + (cur === l[0] ? ' active' : '') + '" data-visits-level="' + l[0] + '">' + lbl + '</button>';
        }).join('') +
      '</div>' +
      (dseRow ? '<div class="map-toolbar-group"><span class="map-label">DSE:</span><span class="good-tag" style="font-weight:800;">' + esc(dseRow.dse_name) + '</span> <button type="button" class="btn" data-act="clear-visits-dse" style="font-size:14px; padding:5px 9px;">&#10005; All DSEs</button></div>' : '') +
    '</div>';
  }

  // ===== Never-visited MTD block under the PJP tabs: outlets and dark sites, grouped by the next territory level =====
  function terrIndex() {
    if (typeof window !== 'undefined' && window._terrIdx) return window._terrIdx;
    var terr = (typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED : (typeof TERRITORY_FEED !== 'undefined' ? TERRITORY_FEED : null);
    var idx = { codesByOutlet: {}, codesBySite: {}, outletsBySite: {} };
    ((terr && terr.outlets) || []).forEach(function (o) {
      var codes = [];
      [o.dse_code_im3, o.dse_code_3id].forEach(function (c) { c = String(c || '').trim().toUpperCase(); if (c.slice(-2) === '.0') c = c.slice(0, -2); if (c) codes.push(c); });
      idx.codesByOutlet[o.outlet_key] = codes;
      var site = String(o.site_nbs || '').trim(), mc = String(o.micro_cluster || '').trim();
      if (site && site !== 'PENDING-NBS' && mc) {
        var sk = site + '::' + mc;
        if (!idx.codesBySite[sk]) { idx.codesBySite[sk] = {}; idx.outletsBySite[sk] = 0; }
        codes.forEach(function (c) { idx.codesBySite[sk][c] = 1; });
        idx.outletsBySite[sk]++;
      }
    });
    if (typeof window !== 'undefined') window._terrIdx = idx;
    return idx;
  }
  function dseCodeSet(dseRow) {
    var set = {};
    (dseRow.logins || []).forEach(function (l) { var c = l.split(':')[1] || ''; set[c] = 1; set[c + '3ID'] = 1; if (c.slice(-3) === '3ID') set[c.slice(0, -3)] = 1; });
    return set;
  }
  function nvGroupOf(level) { return level === 'mc' ? 'mc' : (level === 'dse' ? 'dse' : (level === 'outlet' ? 'site' : 'br')); }
  function renderNeverBlock(feed) {
    var scoped = !!(state.branch || state.hoa || state.kec || state.visitsDse);
    if (!scoped) return '<p class="note" style="margin-top:10px;">Select a Branch, Head of Area, Micro Cluster or DSE to list the outlets never visited MTD and the sites with no visited outlet, grouped by the next territory level.</p>';
    var level = visitsLevel();
    var grp = nvGroupOf(level);
    var grpLabel = { br: 'Area (Branch)', mc: 'Micro Cluster', dse: 'Assigned DSE', site: 'Site NBS' }[grp];
    var idx = terrIndex();
    var dseRow = visitsDseRow(feed), codes = dseRow ? dseCodeSet(dseRow) : null;
    var outlets = unvisFilterBase(feed.unvisited_outlets || [], feed).filter(function (r) {
      if (r.w !== 'mtd') return false;
      if (codes) { var oc = idx.codesByOutlet[r.k] || []; if (!oc.some(function (c) { return codes[c]; })) return false; }
      return true;
    });
    var sites = unvisFilterBase(feed.unvisited_sites || [], feed).filter(function (r) {
      if (r.w !== 'mtd') return false;
      if (codes) { var sc = idx.codesBySite[r.site + '::' + r.mc] || {}; if (!Object.keys(sc).some(function (c) { return codes[c]; })) return false; }
      return true;
    });
    var gt = feed.group_totals || {};
    function groupRows(list, isOutlet) {
      var groups = {};
      list.forEach(function (r) {
        var gk = grp === 'site' ? (r.site + '::' + r.mc) : (r[grp] || '—');
        if (!groups[gk]) groups[gk] = { key: gk, label: grp === 'site' ? r.site : gk, parent: grp === 'mc' ? r.br + ' · ' + r.dso : (grp === 'dse' ? r.mc + ' · ' + r.br : (grp === 'site' ? r.mc + ' · ' + r.dse : r.hoa)), n: 0, items: [] };
        groups[gk].n++; groups[gk].items.push(r);
      });
      return Object.keys(groups).map(function (k) {
        var G = groups[k], t = (gt[grp] || {})[k] || {};
        G.base = grp === 'site' ? (isOutlet ? (idx.outletsBySite[k] || 0) : 1) : (isOutlet ? (t.outlets || 0) : (t.sites || 0));
        return G;
      }).sort(function (a, b) { return b.n - a.n || a.label.localeCompare(b.label); });
    }
    function block(title, list, isOutlet, selKey, selAttr) {
      var groups = groupRows(list, isOutlet);
      var maxN = groups.length ? groups[0].n : 0;
      var rows = groups.map(function (G, i) {
        var open = state[selKey] === G.key;
        var head = '<tr data-' + selAttr + '="' + esc(G.key) + '" class="' + (open ? 'sel' : '') + '" tabindex="0">' +
          '<td class="num">' + (i + 1) + '</td><td class="cur"><b>' + esc(G.label) + '</b></td><td>' + esc(G.parent) + '</td>' +
          '<td class="num">' + fmtCount(G.base) + '</td><td class="num"><span class="alert-tag">' + fmtCount(G.n) + '</span></td>' +
          '<td class="num"><b>' + (G.base ? pctOf(G.n, G.base) : '—') + (G.base ? '%' : '') + '</b></td>' +
          '<td><div class="progress-bar-cell"><div class="progress-bar-fill" style="width:' + (maxN ? Math.round(G.n / maxN * 100) : 0) + '%;"></div><span class="progress-bar-label">' + fmtCount(G.n) + '</span></div></td>' +
          '<td><button type="button" class="btn" data-' + selAttr + '="' + esc(G.key) + '" style="font-size:11.5px; padding:5px 9px;">' + (open ? 'Hide' : 'List') + ' &#8594;</button></td></tr>';
        if (!open) return head;
        var inner = G.items.map(function (r) {
          return isOutlet
            ? '<tr><td></td><td class="cur"><code>' + esc(r.k) + '</code></td><td colspan="2"><b>' + esc(r.n || '—') + '</b> · ' + esc(r.kec) + '</td><td colspan="2">Site <code>' + esc(r.site) + '</code> · ' + esc(r.mc) + '</td><td colspan="2">DSE ' + esc(r.dse) + ' · ' + agingTag(r.w) + '</td></tr>'
            : '<tr><td></td><td class="cur"><code>' + esc(r.site) + '</code></td><td colspan="2">' + esc(r.mc) + ' · ' + esc(r.kec) + '</td><td colspan="2" class="num">' + fmtCount(r.outlets) + ' mapped outlets, none visited</td><td colspan="2">DSO ' + esc(r.dso) + ' · main DSE ' + esc(r.dse) + '</td></tr>';
        }).join('');
        return head + inner;
      }).join('');
      if (groups.length > 1) {
        var NB = 0, NN = 0; groups.forEach(function (G) { NB += G.base || 0; NN += G.n; });
        rows += '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td></td><td class="cur" style="background:var(--ink); color:#fff;">TOTAL · ' + fmtCount(groups.length) + ' ' + esc(grpLabel) + '</td><td></td><td class="num">' + fmtCount(NB) + '</td><td class="num">' + fmtCount(NN) + '</td><td class="num">' + (NB ? pctOf(NN, NB) + '%' : '—') + '</td><td></td><td></td></tr>';
      }
      return card(title + ' · ' + fmtCount(list.length) + (isOutlet ? ' outlets' : ' sites') + ' · grouped by ' + grpLabel + ' · ' + esc(scopeText()) + (dseRow ? ' · DSE ' + esc(dseRow.dse_name) : ''),
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('#', 1) + th(grpLabel) + th(grp === 'mc' ? 'Branch · DSO' : (grp === 'dse' ? 'MC · Branch' : (grp === 'site' ? 'MC · main DSE' : 'Head of Area'))) +
        th(isOutlet ? (grp === 'site' ? 'Outlets under site' : 'Total outlets') : 'Total sites', 1) + th(isOutlet ? 'Never visited' : 'Dark sites', 1) + th('% of total', 1) + th('Rank') + th('List') +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (groups.length ? '' : '<p class="note">Nothing in this scope.</p>'));
    }
    return '<div style="margin-top:14px;"><h3 style="font:800 13px var(--ij-font); text-transform:uppercase; letter-spacing:.06em; margin:0 0 6px;">Never visited MTD (' + pjpPeriod('mtd') + ') · in the selected territory</h3></div>' +
      block('🏪 Outlets never visited MTD', outlets, true, 'nvSelOutletGrp', 'nv-outlet-grp') +
      block('📡 Sites with mapped outlets where not one outlet was visited MTD', sites, false, 'nvSelSiteGrp', 'nv-site-grp') +
      '<p class="note">Outlets and sites come from the master catalogue; "never visited" means no completed check-in on any of the outlet\'s stops in ' + pjpPeriod('mtd') + '. A site is dark when every outlet mapped to it (site × MC) is never visited. With a DSE selected, both lists are limited to outlets and sites assigned to that DSE in the master.</p>';
  }

  function renderVisitsOutlets(feed) {
    var rows = visitsRowsAt(feed, 'outlet');
    var days = (feed.metadata || {}).days || [];
    var page = state.visitsPage || 1, pageSize = state.visitsPageSize || 50;
    var totalPages = Math.ceil(rows.length / pageSize) || 1;
    if (page > totalPages) { page = totalPages; state.visitsPage = page; }
    var start = (page - 1) * pageSize;
    var html = rows.slice(start, start + pageSize).map(function (r) {
      var rate = hitPct(r);
      var last = '—';
      for (var i = r.daily.length - 1; i >= 0; i--) if (r.daily[i][1]) { last = days[i] || ''; break; }
      var pattern = r.daily.map(function (c, i) {
        var bg = c[1] ? '#16a34a' : (c[0] ? '#fee2e2' : 'transparent'), bd = c[0] ? '1px solid ' + (c[1] ? '#16a34a' : '#fca5a5') : '1px solid var(--ij-hairline)';
        return '<span title="' + esc(days[i] || '') + (c[1] ? ' · executed' : (c[0] ? ' · planned, not visited' : '')) + '" style="display:inline-block; width:12px; height:12px; margin-right:2px; background:' + bg + '; border:' + bd + ';"></span>';
      }).join('');
      var parts = r.sub.split(':');
      return '<tr>' +
        '<td class="cur"><span class="' + (parts[0] === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(parts[0]) + '</span> <code>' + esc(parts[1]) + '</code></td>' +
        '<td><b>' + esc(r.label) + '</b></td>' +
        '<td>' + esc(r.parent) + '</td>' +
        '<td>' + (r.master ? '<code>' + esc(r.master) + '</code>' : '<span class="note">not in master</span>') + '</td>' +
        '<td class="num">' + r.planned + '</td>' +
        '<td class="num cur"><b>' + r.actual + '</b></td>' +
        '<td>' + hitBar(rate) + '</td>' +
        '<td style="white-space:nowrap;">' + pattern + '</td>' +
        '<td>' + esc(last) + '</td>' +
      '</tr>';
    }).join('');
    var pag = '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">' +
      '<span class="note">Showing ' + (rows.length ? start + 1 : 0) + '–' + Math.min(start + pageSize, rows.length) + ' of ' + fmtCount(rows.length) + ' outlet stops on beat plans · ' + brandLabel() + '</span>' +
      '<div style="display:flex; gap:6px;">' +
        '<button type="button" class="btn" data-visits-page="prev"' + (page <= 1 ? ' disabled style="opacity:0.5;"' : '') + '>&larr; Previous</button>' +
        '<span style="padding:4px 8px; font:700 15px var(--ij-font);">Page ' + page + ' of ' + totalPages + '</span>' +
        '<button type="button" class="btn" data-visits-page="next"' + (page >= totalPages ? ' disabled style="opacity:0.5;"' : '') + '>Next &rarr;</button>' +
      '</div></div>';
    var dseRow = visitsDseRow(feed);
    return card('Outlet View · planned vs executed stops per outlet' + (dseRow ? ' · ' + esc(dseRow.dse_name) : ''),
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Outlet (MOBI id)') + th('Outlet name') + th('MC · DSE') + th('Master key') + th('Planned days', 1) + th('Executed days', 1) + th('Hit %') + th('' + pjpPeriod('mtd') + ' (green = check-in, red = planned, missed)') + th('Last check-in') + '</tr></thead><tbody>' + html + '</tbody></table></div>' + pag +
      '<p class="note">One row per outlet on a DSE beat plan' + (dseRow ? '' : ' (an outlet appears once per DSE that plans it)') + '. Select a DSE in the DSE view or heatmap to narrow this list.</p>');
  }

  // ===== Visits: band AREA SELECTION dan scorecard sebelum heatmap/tabel =====
  function visitsSelectionBand(feed) {
    var chips = [];
    if (state.branch) chips.push(['Branch', state.branch]);
    if (state.hoa) chips.push(['Head of Area', state.hoa]);
    if (state.kec) chips.push(['Micro Cluster', state.kec]);
    var dseRow = visitsDseRow(feed);
    if (dseRow) chips.push(['DSE', dseRow.dse_name]);
    if (state.visitsBrandFilter && state.visitsBrandFilter !== 'all') chips.push(['Brand', brandLabel()]);
    var body = chips.length
      ? chips.map(function (c) { return '<span style="display:inline-block; margin:0 10px 4px 0;"><span class="map-label">' + esc(c[0]) + ':</span> <b style="font-size:15px;">' + esc(c[1]) + '</b></span>'; }).join('')
      : '<b style="font-size:15px;">All Inner Jakarta</b> <span class="note">· select a Branch, Head of Area, Micro Cluster or DSE to see that territory\'s overall PJP performance before the daily detail</span>';
    return '<div style="margin-top:10px; padding:10px 14px; border:2px solid var(--ij-ink); border-left:8px solid var(--ij-accent); background:var(--ij-surface);">' +
      '<div style="font:800 11px var(--ij-font); letter-spacing:.08em; text-transform:uppercase; color:var(--ij-muted); margin-bottom:4px;">Area selection</div>' + body + '</div>';
  }
  function visitsScorecard(feed) {
    var sc = visitsScope(feed);
    var level = visitsLevel(), rows = visitsRowsAt(feed, level);
    var days = (feed.metadata || {}).days || [], n = days.length || 11;
    var daily = days.map(function () { return [0, 0]; });
    rows.forEach(function (r) { r.daily.forEach(function (c, i) { daily[i][0] += c[0]; daily[i][1] += c[1]; }); });
    var activeDays = daily.filter(function (c) { return c[0] > 0; }).length || 1;
    var bestDay = null, worstDay = null;
    daily.forEach(function (c, i) { if (!c[0]) return; var h = c[1] / c[0]; if (bestDay == null || h > bestDay.h) bestDay = { d: days[i], h: h }; if (worstDay == null || h < worstDay.h) worstDay = { d: days[i], h: h }; });
    var row = '<tr>' +
      '<td class="num cur"><b>' + fmtCount(sc.planned) + '</b></td><td class="num cur"><b>' + fmtCount(sc.actual) + '</b></td>' +
      '<td class="num"><span class="' + (sc.hit >= 60 ? 'good-tag' : 'alert-tag') + '">' + sc.hit + '%</span></td>' +
      '<td class="num">' + fmtCount(Math.round(sc.planned / activeDays)) + '</td><td class="num">' + fmtCount(Math.round(sc.actual / activeDays)) + '</td><td class="num">' + activeDays + ' / ' + n + '</td>' +
      '<td class="num">' + (sc.prodRate == null ? '—' : sc.prodRate + '%') + '</td>' +
      '<td class="num">' + fmtCount(sc.outlets) + '</td><td class="num">' + fmtCount(sc.visited) + ' (' + pctOf(sc.visited, sc.outlets) + '%)</td><td class="num"><span class="alert-tag">' + fmtCount(sc.nvm) + '</span></td>' +
      '<td class="num">' + (sc.sites ? fmtCount(sc.szm) + ' / ' + fmtCount(sc.sites) : '—') + '</td>' +
      '<td>' + (bestDay ? esc(bestDay.d.slice(0, 6)) + ' ' + Math.round(bestDay.h * 100) + '%' : '—') + '</td><td>' + (worstDay ? esc(worstDay.d.slice(0, 6)) + ' ' + Math.round(worstDay.h * 100) + '%' : '—') + '</td></tr>';
    return card('Scorecard · PJP execution · ' + esc(sc.label) + ' · ' + pjpPeriod('mtd') + ' 2026',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Planned stops (target)', 1) + th('Executed', 1) + th('Target hit %', 1) + th('Planned / active day', 1) + th('Executed / active day', 1) + th('Active days', 1) + th('Productive %', 1) + th('Master outlets', 1) + th('Visited MTD', 1) + th('Never visited', 1) + th('Dark sites MTD', 1) + th('Best day') + th('Worst day') + '</tr></thead><tbody>' + row + '</tbody></table></div>' +
      '<p class="note">Overall before the daily detail: executed ÷ planned over the whole period, and the daily averages over days that had any planned stop in this scope. Productive = SP/VC qty > 0 or saldo > Rp 50,000.</p>');
  }
  function visitsScoped() { return !!(state.branch || state.hoa || state.kec || state.visitsDse); }

  function renderVisitsExec(feed) {
    var level = visitsLevel();
    var body = level === 'area' ? renderVisitsArea(feed) : (level === 'mc' ? renderVisitsMc(feed) : (level === 'dse' ? renderVisitsDse(feed) : renderVisitsOutlets(feed)));
    return visitsSelectionBand(feed) + (visitsScoped() ? visitsScorecard(feed) : '') + visitsLevelBar(feed) + body + renderNeverBlock(feed);
  }

  function heatCell(p, x, binary) {
    if (!p) return '<td class="num" style="color:var(--ij-hairline); text-align:center;">·</td>';
    if (binary) {
      return x ? '<td style="background:#16a34a; color:#fff; text-align:center; font-weight:800;">✓</td>' : '<td style="background:#fee2e2; color:#991b1b; text-align:center; font-weight:800;">○</td>';
    }
    var pct = Math.round(x / p * 100);
    var bg, fg = '#111';
    if (pct < 30) { bg = '#fee2e2'; fg = '#991b1b'; }
    else { var a = 0.12 + 0.6 * (pct / 100); bg = 'rgba(22,163,74,' + a.toFixed(2) + ')'; }
    return '<td class="num" title="' + x + ' of ' + p + ' planned" style="background:' + bg + '; color:' + fg + '; text-align:center; font-weight:700;">' + pct + '%<br><span style="font-size:10px; font-weight:500; opacity:.85;">' + x + '/' + p + '</span></td>';
  }
  function renderVisitsHeat(feed) {
    var level = visitsLevel();
    var rows = visitsRowsAt(feed, level);
    var days = (feed.metadata || {}).days || [];
    var binary = level === 'outlet';
    var seen = {}; rows.forEach(function (r) { seen[r.parent] = 1; }); var showParent = Object.keys(seen).length > 1;
    var page = state.visitsPage || 1, pageSize = state.visitsPageSize || 50;
    var paged = level === 'dse' || level === 'outlet';
    var totalPages = paged ? (Math.ceil(rows.length / pageSize) || 1) : 1;
    if (page > totalPages) { page = totalPages; state.visitsPage = page; }
    var start = paged ? (page - 1) * pageSize : 0;
    var slice = paged ? rows.slice(start, start + pageSize) : rows;
    var tot = days.map(function () { return [0, 0]; }), TP = 0, TA = 0;
    rows.forEach(function (r) { r.daily.forEach(function (c, i) { tot[i][0] += c[0]; tot[i][1] += c[1]; }); TP += r.planned; TA += r.actual; });
    var missing = (feed.metadata || {}).missing_days || [];
    function naCell(d) { return '<td class="num" title="Data not available: no PJP export for ' + esc(d) + '" style="text-align:center; color:var(--ij-muted); background:repeating-linear-gradient(45deg, transparent 0 4px, rgba(0,0,0,.06) 4px 8px);">n/a</td>'; }
    var dayHead = days.map(function (d) {
      var dt = new Date(d.replace(/-/g, ' '));
      var wd = isNaN(dt) ? '' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()];
      return '<th class="num" style="text-align:center; min-width:52px;">' + esc(d.slice(0, 2)) + '<br><span style="font-weight:500;">' + wd + '</span>' + (missing.indexOf(d) >= 0 ? '<br><span style="font-weight:700; color:var(--ij-muted);">no data</span>' : '') + '</th>';
    }).join('');
    var entityHead = { area: 'Branch', mc: 'Micro Cluster', dse: 'DSE', outlet: 'Outlet' }[level];
    var parentHead = { area: 'Head of Area', mc: 'Branch · DSO', dse: 'MC · Branch', outlet: 'MC · DSE' }[level];
    function perf(p, a) { return '<td class="num">' + fmtCount(p) + '</td><td class="num cur"><b>' + fmtCount(a) + '</b></td><td class="num"><b>' + hitPct({ planned: p, actual: a }) + '%</b></td>'; }
    var totalRow = '<tr style="background:var(--ij-wash, #f6f4f1); font-weight:800;"><td class="cur">All in scope (' + fmtCount(rows.length) + ' rows)</td>' + (showParent ? '<td></td>' : '') + perf(TP, TA) +
      tot.map(function (c, i) { return missing.indexOf(days[i]) >= 0 ? naCell(days[i]) : heatCell(c[0], c[1], false); }).join('') + '<td></td></tr>';
    function heatRow(r) {
      var muted = r.outside ? ' style="color:var(--ij-muted);"' : '';
      return '<tr' + muted + '><td class="cur"' + (paged ? ' style="padding-left:' + (level === 'outlet' ? 56 : 40) + 'px;"' : '') + '><b>' + esc(r.label) + '</b>' + (r.sub ? '<br><code style="font-size:11px;">' + esc(r.sub) + '</code>' : '') + '</td>' + (showParent && !paged ? '<td>' + esc(r.parent) + '</td>' : '') + perf(r.planned, r.actual) +
        r.daily.map(function (c, i) { return missing.indexOf(days[i]) >= 0 ? naCell(days[i]) : heatCell(c[0], c[1], binary); }).join('') + '<td>' + detailBtn(r, 'Detail') + '</td></tr>';
    }
    var body;
    if (paged) {   // dse / outlet: Area > MC (> DSE for outlets), toggles + subtotals
      var hoaOfA = {}, dsoOfM = {}; rows.forEach(function (r) { if (r.br && r.hoa) hoaOfA[r.br] = r.hoa; if (r.mc && r.dso) dsoOfM[r.mc] = r.dso; });
      body = grpBody('visheat' + level, { items: rows, area: function (r) { return r.br; }, mc: function (r) { return r.mc; }, dse: level === 'outlet' ? function (r) { return r.dse; } : null,
        hoa: function (a) { return hoaOfA[a] || '—'; }, dso: function (m) { return dsoOfM[m] || '—'; }, unit: level === 'dse' ? 'DSE' : 'outlet', val: function (r) { return r.planned; },
        span: 1, cols: 1 + 3 + days.length + 1, cap: 150, search: !!state.visitsSearch,
        sub: function (items) {
          var pl = 0, ac = 0, dd = days.map(function () { return [0, 0]; });
          items.forEach(function (r) { pl += r.planned; ac += r.actual; r.daily.forEach(function (c, i) { dd[i][0] += c[0]; dd[i][1] += c[1]; }); });
          return perf(pl, ac) + dd.map(function (c, i) { return missing.indexOf(days[i]) >= 0 ? naCell(days[i]) : heatCell(c[0], c[1], false); }).join('') + '<td></td>';
        }, row: heatRow });
    } else body = slice.map(heatRow).join('');
    var pag = paged ? '<div style="margin-top:10px;" class="note">' + fmtCount(rows.length) + ' rows · dikelompokkan Area › MC' + (level === 'outlet' ? ' › DSE' : '') + '</div>' : '';
    var legend = binary
      ? '<span style="display:inline-block; width:12px; height:12px; background:#16a34a; vertical-align:middle;"></span> check-in done &nbsp; <span style="display:inline-block; width:12px; height:12px; background:#fee2e2; border:1px solid #fca5a5; vertical-align:middle;"></span> planned, not visited &nbsp; · not on the beat plan that day'
      : 'Cell = executed check-ins ÷ planned stops on that calendar day. <span class="alert-tag">&lt; 30%</span> is flagged; deeper green is a higher hit rate; · means nothing was planned. Every day ' + pjpPeriod('mtd') + ' is shown, including Sundays.' + (missing.length ? ' <b>n/a</b> = no PJP export for that day (' + esc(missing.join(', ')) + '); it is not counted as zero execution.' : '');
    var next = { area: 'its micro clusters', mc: 'its DSEs', dse: 'its outlets' }[level];
    return visitsSelectionBand(feed) + (visitsScoped() ? visitsScorecard(feed) : '') + visitsLevelBar(feed) +
      card('Daily PJP Heatmap · ' + VISIT_LEVEL_LABEL[level] + ' · ' + brandLabel(),
      (paged ? '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('visheat' + level) + '</div>' : '') + '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th(paged ? 'Area › MC › ' + (level === 'outlet' ? 'DSE › ' : '') + entityHead : entityHead) + (showParent && !paged ? th(parentHead) : '') + th('Planned', 1) + th('Executed', 1) + th('Hit %', 1) + dayHead + th('Detail') + '</tr></thead><tbody>' + totalRow + body + '</tbody></table></div>' + pag +
      '<p class="note">Overall columns (planned, executed, hit %) come first, then the calendar days. ' + legend + (next ? ' "Detail" drills a row down to ' + next + '.' : '') + ' The selected territory is shown once in the Area selection band, not repeated per row.</p>') + renderNeverBlock(feed);
  }

  // ===== Inactivity: site detail by days-since-last-visit slabs, and locations map =====
  var SLABS = [
    { key: 'a', label: 'Active · visited ≤2 d', short: 'Active ≤2d', color: '#16a34a', bg: '#dcfce7', fg: '#166534' },
    { key: 'b', label: 'No visit 3–6 d', short: '3–6 d', color: '#f59e0b', bg: '#fef3c7', fg: '#92400e' },
    { key: 'c', label: 'No visit 7–10 d', short: '7–10 d', color: '#f97316', bg: '#ffedd5', fg: '#9a3412' },
    { key: 'd', label: 'Never visited MTD', short: 'Never', color: '#dc2626', bg: '#fee2e2', fg: '#991b1b' }
  ];
  function parseDMY(s) {
    if (!s) return null;
    var m = String(s).match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (!m) return null;
    var mo = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[2].toLowerCase());
    return mo < 0 ? null : Date.UTC(+m[3], mo, +m[1]);
  }
  function slabOf(ds) { if (ds == null) return 3; if (ds <= 2) return 0; if (ds <= 6) return 1; if (ds <= 10) return 2; return 3; }
  function slabTag(sl) { var S = SLABS[sl]; return '<span style="display:inline-block; padding:2px 7px; font:800 13px var(--ij-font); background:' + S.bg + '; color:' + S.fg + '; border:1px solid ' + S.color + ';">' + S.short + '</span>'; }
  function inactWindowSlabs(scope) { return scope === 'mtd' ? [3] : (scope === 'last7d' ? [2, 3] : [1, 2, 3]); }
  function inactCount(S, scope) { return inactWindowSlabs(scope).reduce(function (a, i) { return a + S.slabs[i]; }, 0); }
  function inactSites(feed) {
    if (feed._inactSites) return feed._inactSites;
    var terr = (typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED : (typeof TERRITORY_FEED !== 'undefined' ? TERRITORY_FEED : null);
    var mapFeed = (typeof window !== 'undefined' && window.JAKARTA_MAP_FEED) ? window.JAKARTA_MAP_FEED : (typeof JAKARTA_MAP_FEED !== 'undefined' ? JAKARTA_MAP_FEED : null);
    var end = parseDMY((feed.metadata || {}).period_end) || Date.UTC(2026, 9, 11);
    var last = feed.last_visit || {};
    var coord = {};
    ((mapFeed && mapFeed.sites) || []).forEach(function (s) { if (s.site_key) coord[s.site_key] = s; });
    var sites = {};
    ((terr && terr.outlets) || []).forEach(function (o) {
      var site = String(o.site_nbs || '').trim(), mc = String(o.micro_cluster || '').trim();
      if (!site || site === 'PENDING-NBS' || !mc) return;
      var key = site + '::' + mc;
      var lv = last[o.outlet_key] || null, lt = parseDMY(lv);
      var ds = lt != null ? Math.round((end - lt) / 864e5) : null;
      var sl = slabOf(ds);
      var S = sites[key];
      if (!S) {
        S = sites[key] = { key: key, site: site, mc: mc, br: o.branch || '—', hoa: o.hoa_leader || '—', dso: o.dso_leader || '—', kecC: {}, dseC: {}, n: 0, slabs: [0, 0, 0, 0], outlets: [], latS: 0, lonS: 0, nC: 0 };
      }
      S.n++; S.slabs[sl]++;
      var kec = o.kecamatan || '—', dse = String(o.dse_name || 'UNASSIGNED');
      S.kecC[kec] = (S.kecC[kec] || 0) + 1; S.dseC[dse] = (S.dseC[dse] || 0) + 1;
      if (o.lat && o.long) { S.latS += o.lat; S.lonS += o.long; S.nC++; }
      S.outlets.push({ k: o.outlet_key, n: o.outlet_name || '', dse: dse, kec: kec, last: lv, ds: ds, sl: sl, lat: o.lat, lon: o.long });
    });
    function mode(c) { var best = null, bn = -1; Object.keys(c).forEach(function (k) { if (c[k] > bn) { bn = c[k]; best = k; } }); return best || '—'; }
    var list = Object.keys(sites).map(function (k) {
      var S = sites[k], c = coord[k];
      S.kec = mode(S.kecC); S.dse = mode(S.dseC); delete S.kecC; delete S.dseC;
      S.lat = c ? c.lat : (S.nC ? S.latS / S.nC : null);
      S.lon = c ? c.long : (S.nC ? S.lonS / S.nC : null);
      S.outlets.sort(function (a, b) { return b.sl - a.sl || (b.ds == null ? 99 : b.ds) - (a.ds == null ? 99 : a.ds) || a.n.localeCompare(b.n); });
      return S;
    });
    feed._inactSites = list;
    return list;
  }
  function inactSitesInScope(feed) { return unvisFilterBase(inactSites(feed), feed); }
  function inactSelectedSite(feed) {
    if (!state.unvisSiteSel) return null;
    var all = inactSites(feed);
    for (var i = 0; i < all.length; i++) if (all[i].key === state.unvisSiteSel) return all[i];
    return null;
  }
  function heatBg(S, share) { var a = 0.08 + 0.27 * Math.min(1, share); return 'rgba(' + hexRgb(S.color) + ',' + a.toFixed(2) + ')'; }
  function hexRgb(h) { return parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16); }
  function slabStrip(S, width) {
    width = width || 140;
    return '<div style="display:flex; width:' + width + 'px; height:14px; border:1px solid var(--ij-ink);" title="' + SLABS.map(function (s, i) { return s.short + ' ' + S.slabs[i]; }).join(' · ') + '">' +
      SLABS.map(function (s, i) { var w = S.n ? S.slabs[i] / S.n * 100 : 0; return w ? '<div style="width:' + w + '%; background:' + s.color + ';"></div>' : ''; }).join('') + '</div>';
  }
  function unvisWindowBar() {
    var scope = state.visitsDateScope || 'mtd';
    var UW = unvisWindows(), scopes = [['mtd', UW.mtd], ['last7d', UW.last7d], ['last3d', UW.last3d]];
    return '<div class="map-toolbar" style="margin-top:8px;"><div class="map-toolbar-group"><span class="map-label">Inactivity window:</span>' +
      scopes.map(function (sc) { return '<button type="button" class="map-btn' + (scope === sc[0] ? ' active' : '') + '" data-visits-scope="' + sc[0] + '">' + sc[1] + '</button>'; }).join('') +
      '</div><span class="note">Applies to the ranked lists, slab lists, map colours and CSV export. The KPI cards above show all three windows.</span></div>';
  }
  function unvisEntityNav(entity) {
    function b(id, label) { return '<button type="button" role="tab" class="sub-nav-btn' + (entity === id ? ' active' : '') + '" data-unvis-entity="' + id + '" aria-selected="' + (entity === id) + '">' + label + '</button>'; }
    return b('outlet', '🏪 Outlet view') + b('site', '📡 Site view') + b('slab', '🧭 Site detail · slabs') + b('map', '📍 Map Site');
  }
  function siteOutletList(feed, S, scope) {
    var win = inactWindowSlabs(scope);
    var rows = S.outlets.filter(function (o) { return state.inactShowActive || win.indexOf(o.sl) >= 0; });
    var html = rows.map(function (o) {
      return '<tr><td class="cur"><code>' + esc(o.k) + '</code></td><td><b>' + esc(o.n || '—') + '</b></td><td>' + esc(o.dse) + '</td><td>' + esc(o.kec) + '</td>' +
        '<td>' + esc(o.last || 'Never') + '</td><td class="num">' + (o.ds == null ? '—' : o.ds) + '</td><td>' + slabTag(o.sl) + '</td>' +
        '<td>' + (o.lat && o.lon ? '<code style="font-size:13px;">' + o.lat.toFixed(5) + ', ' + o.lon.toFixed(5) + '</code>' : '<span class="note">no GPS</span>') + '</td></tr>';
    }).join('');
    return card('Outlets under site ' + esc(S.site) + ' · ' + esc(S.mc) + ' · ' + esc(S.br) +
      ' <span class="note" style="font-weight:500;">(' + fmtCount(S.n) + ' outlets · ' + SLABS.map(function (s, i) { return s.short + ' ' + S.slabs[i]; }).join(' · ') + ')</span>',
      '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; align-items:center;">' +
        '<button type="button" class="btn" data-unvis-gomap="' + esc(S.key) + '" style="font-size:14px; padding:5px 9px;">📍 Show on map</button>' +
        '<button type="button" class="btn" data-act="inact-toggle-active" style="font-size:14px; padding:5px 9px;">' + (state.inactShowActive ? 'Hide active outlets' : 'Also show active outlets') + '</button>' +
        '<button type="button" class="btn" data-unvis-site="' + esc(S.key) + '" style="font-size:14px; padding:5px 9px;">Close</button>' +
        '<span class="note">DSO ' + esc(S.dso) + ' · HoA ' + esc(S.hoa) + ' · main DSE ' + esc(S.dse) + (S.lat ? ' · site GPS ' + S.lat.toFixed(5) + ', ' + S.lon.toFixed(5) : '') + '</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Outlet Key') + th('Outlet Name') + th('Assigned DSE') + th('Kecamatan') + th('Last check-in') + th('Days since', 1) + th('Slab') + th('GPS') + '</tr></thead><tbody>' + html + '</tbody></table></div>' +
      (rows.length ? '' : '<p class="note">No outlets in this window for this site.</p>'));
  }
  function renderInactSlabs(feed) {
    var scope = state.visitsDateScope || 'mtd';
    var scopeLabel = unvisWindows()[scope] || 'MTD';
    var all = inactSitesInScope(feed);
    var tot = [0, 0, 0, 0], nOut = 0;
    all.forEach(function (S) { nOut += S.n; for (var i = 0; i < 4; i++) tot[i] += S.slabs[i]; });
    var affected = all.filter(function (S) { return inactCount(S, scope) > 0; });
    var sort = state.inactSort || 'count';
    affected.sort(function (a, b) {
      if (sort === 'share') return inactCount(b, scope) / b.n - inactCount(a, scope) / a.n || inactCount(b, scope) - inactCount(a, scope);
      if (sort === 'never') return b.slabs[3] - a.slabs[3] || inactCount(b, scope) - inactCount(a, scope);
      return inactCount(b, scope) - inactCount(a, scope) || b.slabs[3] - a.slabs[3] || a.site.localeCompare(b.site);
    });
    var strip = '<div class="kpis" style="margin-top:10px; grid-template-columns: repeat(5, 1fr);">' +
      kpi('Sites with unvisited outlets', fmtCount(affected.length), 'of ' + fmtCount(all.length) + ' DSO-mapped sites in filter', 'down', scopeLabel) +
      SLABS.map(function (s, i) {
        return '<div class="kpi" style="border-top:6px solid ' + s.color + ';"><div class="kpi-label">' + s.label + '</div><div class="kpi-value" style="color:' + s.fg + ';">' + fmtCount(tot[i]) + '</div><div class="kpi-delta">' + pctOf(tot[i], nOut) + '% of ' + fmtCount(nOut) + ' outlets</div><div class="kpi-note">' + (i === 0 ? 'Visited ' + pjpPeriod('l3') + '' : (i === 1 ? 'Last check-in ' + pjpSlabRange(1) : (i === 2 ? 'Last check-in ' + pjpSlabRange(2) : 'No check-in ' + pjpPeriod('mtd') + ''))) + '</div></div>';
      }).join('') +
    '</div>';
    var page = state.visitsPage || 1, pageSize = state.visitsPageSize || 50;
    var totalPages = Math.ceil(affected.length / pageSize) || 1;
    if (page > totalPages) { page = totalPages; state.visitsPage = page; }
    var start = (page - 1) * pageSize;
    var sel = inactSelectedSite(feed);
    var rows = affected.slice(start, start + pageSize).map(function (S, i) {
      var c = inactCount(S, scope), share = S.n ? c / S.n : 0;
      var isSel = sel && sel.key === S.key;
      return '<tr data-unvis-site="' + esc(S.key) + '" class="' + (isSel ? 'sel' : '') + '" tabindex="0">' +
        '<td class="num">' + (start + i + 1) + '</td>' +
        '<td class="cur"><code>' + esc(S.site) + '</code></td>' +
        '<td>' + esc(S.mc) + '<br><span class="note">' + esc(S.br) + '</span></td>' +
        '<td>' + esc(S.dso) + '</td>' +
        '<td>' + esc(S.kec) + '</td>' +
        '<td>' + esc(S.dse) + '</td>' +
        '<td class="num"><b>' + fmtCount(S.n) + '</b></td>' +
        SLABS.map(function (s, j) { var sh = S.n ? S.slabs[j] / S.n : 0; return '<td class="num" style="text-align:center; font-weight:700; background:' + (S.slabs[j] ? heatBg(s, sh) : 'transparent') + '; color:' + s.fg + ';">' + (S.slabs[j] || '·') + '</td>'; }).join('') +
        '<td class="num"><b>' + pctOf(c, S.n) + '%</b><br><span class="note">' + c + ' of ' + S.n + '</span></td>' +
        '<td>' + slabStrip(S) + '</td>' +
        '<td style="white-space:nowrap;"><button type="button" class="btn" data-unvis-site="' + esc(S.key) + '" style="font-size:14px; padding:5px 9px;">' + (isSel ? 'Hide' : 'List') + ' &#8594;</button> ' +
          '<button type="button" class="btn" data-unvis-gomap="' + esc(S.key) + '" aria-label="Lihat di peta" title="Lihat di peta" style="font-size:14px; padding:5px 9px;">📍</button></td>' +
      '</tr>';
    }).join('');
    var sortBtns = [['count', 'Unvisited in window'], ['share', '% of site unvisited'], ['never', 'Never visited']].map(function (s) {
      return '<button type="button" class="map-btn' + (sort === s[0] ? ' active' : '') + '" data-inact-sort="' + s[0] + '">' + s[1] + '</button>';
    }).join('');
    var pag = '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">' +
      '<span class="note">Showing ' + (affected.length ? start + 1 : 0) + '–' + Math.min(start + pageSize, affected.length) + ' of ' + fmtCount(affected.length) + ' sites</span>' +
      '<div style="display:flex; gap:6px;">' +
        '<button type="button" class="btn" data-visits-page="prev"' + (page <= 1 ? ' disabled style="opacity:0.5;"' : '') + '>&larr; Previous</button>' +
        '<span style="padding:4px 8px; font:700 15px var(--ij-font);">Page ' + page + ' of ' + totalPages + '</span>' +
        '<button type="button" class="btn" data-visits-page="next"' + (page >= totalPages ? ' disabled style="opacity:0.5;"' : '') + '>Next &rarr;</button>' +
      '</div></div>';
    var legend = SLABS.map(function (s) { return '<span style="display:inline-block; width:12px; height:12px; background:' + s.color + '; vertical-align:middle; margin-right:4px;"></span>' + s.label; }).join(' &nbsp; ');
    return card('Inactivity &amp; Blindspot Audit · Site detail by days since last visit', '<div class="sub-nav" role="tablist" style="gap:8px;">' + unvisEntityNav('slab') + '</div>' + unvisWindowBar() + strip) +
      card('Sites ranked · outlets with no visit · ' + scopeLabel + ' · ' + esc(scopeText()),
        '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group"><span class="map-label">Rank by:</span>' + sortBtns + '</div><div class="map-toolbar-group"><span class="note">' + legend + '</span></div></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('#', 1) + th('Site NBS') + th('MC · Branch') + th('DSO Leader') + th('Kecamatan') + th('Main DSE') + th('Outlets', 1) +
        SLABS.map(function (s) { return '<th class="num" style="text-align:center; border-bottom:3px solid ' + s.color + ';">' + s.short + '</th>'; }).join('') +
        th('% unvisited (' + (scope === 'mtd' ? 'MTD' : (scope === 'last7d' ? '7D' : '3D')) + ')', 1) + th('Slab mix') + th('Detail') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' + pag +
        '<p class="note">Days since last visit are counted from the ' + pjpCut() + ' cut. Slab cells are shaded by the share of the site\'s outlets in that slab; the mix bar shows all four slabs left to right. "List" opens the outlets under the site, 📍 jumps to the Locations map.</p>') +
      (sel ? siteOutletList(feed, sel, scope) : '');
  }
  // ===== MAP SITE: site (segitiga) dan outlet (bulat) dengan status visit, flag belum divisit MTD / 7 hari, tautan Google Maps =====
  function gmapsSearch(lat, lon) { return 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lon; }
  function gmapsDir(lat, lon) { return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon + '&travelmode=driving'; }
  function latlonLink(lat, lon) {
    if (lat == null || lon == null || !lat || !lon) return '<span class="note">tanpa GPS</span>';
    return '<a href="' + gmapsSearch(lat, lon) + '" target="_blank" rel="noopener" title="Buka di Google Maps" style="font-family:ui-monospace, Menlo, monospace; font-size:11px; text-decoration:underline; color:var(--ij-ink);">' + lat.toFixed(5) + ', ' + lon.toFixed(5) + '</a> <a href="' + gmapsDir(lat, lon) + '" target="_blank" rel="noopener" title="Rute di Google Maps" style="text-decoration:none;">🧭</a>';
  }
  // Status site: never = tidak satu pun outlet divisit MTD; stale7 = tidak ada outlet divisit 7 hari terakhir; active
  function siteStatus(S) { var n7 = S.slabs[0] + S.slabs[1]; return S.slabs[3] === S.n ? 'never' : (n7 === 0 ? 'stale7' : 'active'); }
  var SITE_STATUS = { never: { label: 'Belum pernah divisit MTD', color: '#dc2626' }, stale7: { label: 'Tanpa visit 7 hari terakhir', color: '#f97316' }, active: { label: 'Ada visit 7 hari terakhir', color: '#16a34a' } };
  function inactSitesScoped(feed) {
    // Sites in filter; when a DSE is selected, keep only that DSE's outlets (master DSE codes) and recompute the slabs.
    var sites = inactSitesInScope(feed);
    var dseRow = visitsDseRow(feed);
    if (!dseRow) return sites;
    var codes = dseCodeSet(dseRow), idx = terrIndex(), out = [];
    sites.forEach(function (S) {
      var items = S.outlets.filter(function (o) { var oc = idx.codesByOutlet[o.k] || []; return oc.some(function (c) { return codes[c]; }); });
      if (!items.length) return;
      var T = {}; Object.keys(S).forEach(function (k) { T[k] = S[k]; });
      T.outlets = items; T.n = items.length; T.slabs = [0, 0, 0, 0]; items.forEach(function (o) { T.slabs[o.sl]++; });
      out.push(T);
    });
    return out;
  }
  function siteMapFlagOk(S) {
    var f = state.inactMapFlag || 'flagged', st = siteStatus(S);
    if (f === 'all') return true;
    if (f === 'mtd') return st === 'never';
    if (f === '7d') return st === 'stale7';
    return st !== 'active';
  }
  function renderSiteMapTables(feed, sites, sel) {
    var rows = sites.slice().sort(function (a, b) { return b.slabs[3] - a.slabs[3] || (b.slabs[2] + b.slabs[3]) - (a.slabs[2] + a.slabs[3]) || a.site.localeCompare(b.site); });
    var page = state.visitsPage || 1, pageSize = 50, totalPages = Math.ceil(rows.length / pageSize) || 1;
    if (page > totalPages) { page = totalPages; state.visitsPage = page; }
    var start = (page - 1) * pageSize;
    var body = rows.slice(start, start + pageSize).map(function (S, i) {
      var st = siteStatus(S), isSel = sel && sel.key === S.key;
      return '<tr class="' + (isSel ? 'sel' : '') + '"><td class="num">' + (start + i + 1) + '</td><td class="cur"><span style="display:inline-block; width:0; height:0; border-left:7px solid transparent; border-right:7px solid transparent; border-bottom:13px solid ' + SITE_STATUS[st].color + '; vertical-align:middle; margin-right:6px;"></span><code>' + esc(S.site) + '</code></td>' +
        '<td>' + esc(S.mc) + '<br><span class="note">' + esc(S.kec) + ' · DSO ' + esc(S.dso) + '</span></td><td>' + esc(S.dse) + '</td>' +
        '<td class="num">' + fmtCount(S.n) + '</td><td class="num"><span class="alert-tag">' + S.slabs[3] + '</span></td><td class="num">' + (S.slabs[2] + S.slabs[3]) + '</td><td class="num good-tag">' + (S.slabs[0] + S.slabs[1]) + '</td>' +
        '<td><span style="color:' + SITE_STATUS[st].color + '; font-weight:800;">' + SITE_STATUS[st].label + '</span></td>' +
        '<td>' + latlonLink(S.lat, S.lon) + '</td>' +
        '<td style="white-space:nowrap;"><button type="button" class="btn" data-sitemap-focus="' + esc(S.key) + '" style="font-size:11.5px; padding:5px 9px;">' + (isSel ? 'Dipilih' : 'Lihat di peta') + ' &#8594;</button></td></tr>';
    }).join('');
    var pag = '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;"><span class="note">Menampilkan ' + (rows.length ? start + 1 : 0) + '–' + Math.min(start + pageSize, rows.length) + ' dari ' + fmtCount(rows.length) + ' site</span>' +
      '<div style="display:flex; gap:6px;"><button type="button" class="btn" data-visits-page="prev"' + (page <= 1 ? ' disabled style="opacity:0.5;"' : '') + '>&larr; Sebelumnya</button><span style="padding:4px 8px; font:700 12.5px var(--ij-font);">Hal ' + page + ' / ' + totalPages + '</span><button type="button" class="btn" data-visits-page="next"' + (page >= totalPages ? ' disabled style="opacity:0.5;"' : '') + '>Berikutnya &rarr;</button></div></div>';
    var siteTable = card('Daftar site di peta · urut outlet belum pernah divisit MTD',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('#', 1) + th('Site NBS') + th('MC · Kecamatan · DSO') + th('DSE utama') + th('Outlet', 1) + th('Belum divisit MTD', 1) + th('Tanpa visit 7 hari', 1) + th('Divisit ≤6 hari', 1) + th('Status site') + th('Lat, Long (klik → Google Maps)') + th('Peta') + '</tr></thead><tbody>' + body + '</tbody></table></div>' + pag);
    var outletTable = '';
    if (sel) {
      var orows = sel.outlets.map(function (o) {
        return '<tr><td class="cur"><code>' + esc(o.k) + '</code></td><td><b>' + esc(o.n || '—') + '</b></td><td>' + esc(o.dse) + '</td><td>' + esc(o.last || 'Belum pernah') + '</td><td class="num">' + (o.ds == null ? '—' : o.ds) + '</td><td>' + slabTag(o.sl) + '</td><td>' + latlonLink(o.lat, o.lon) + '</td></tr>';
      }).join('');
      outletTable = card('Outlet di site ' + esc(sel.site) + ' · ' + esc(sel.mc) + ' · ' + fmtCount(sel.n) + ' outlet' + (sel.lat ? ' · site ' + sel.lat.toFixed(5) + ', ' + sel.lon.toFixed(5) : ''),
        '<div style="margin-bottom:8px;"><button type="button" class="btn" data-unvis-site="' + esc(sel.key) + '" style="font-size:11.5px; padding:5px 9px;">&#10005; Tutup</button> ' + (sel.lat ? '<a class="btn" style="font-size:11.5px; padding:5px 9px; text-decoration:none;" target="_blank" rel="noopener" href="' + gmapsDir(sel.lat, sel.lon) + '">🧭 Rute ke site di Google Maps</a>' : '') + '</div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Outlet Key') + th('Nama') + th('DSE') + th('Check-in terakhir') + th('Hari sejak', 1) + th('Slab') + th('Lat, Long (klik → Google Maps)') + '</tr></thead><tbody>' + orows + '</tbody></table></div>');
    }
    return siteTable + outletTable;
  }
  function renderInactMap(feed) {
    var sites = inactSitesScoped(feed);
    var shown = sites.filter(siteMapFlagOk);
    var sel = inactSelectedSite(feed);
    var cnt = { never: 0, stale7: 0, active: 0 }, oNever = 0, o7 = 0, oTot = 0;
    sites.forEach(function (S) { cnt[siteStatus(S)]++; oNever += S.slabs[3]; o7 += S.slabs[2] + S.slabs[3]; oTot += S.n; });
    var flags = [['flagged', 'Site bermasalah (MTD + 7 hari)'], ['mtd', 'Hanya belum pernah divisit MTD'], ['7d', 'Hanya tanpa visit 7 hari'], ['all', 'Semua site']];
    var toolbar = '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group"><span class="map-label">Tampilkan:</span>' +
      flags.map(function (f) { return '<button type="button" class="map-btn' + ((state.inactMapFlag || 'flagged') === f[0] ? ' active' : '') + '" data-inact-flag="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      '<div class="map-toolbar-group"><button type="button" class="map-btn' + (state.inactMapOutlets ? ' active' : '') + '" data-act="inact-map-outlets">' + (state.inactMapOutlets ? 'Outlet ditampilkan' : 'Tampilkan outlet (bulat)') + '</button>' +
      (sel ? '<button type="button" class="map-btn" data-unvis-site="' + esc(sel.key) + '">&#10005; Lepas site ' + esc(sel.site) + '</button>' : '') + '</div></div>';
    var legend = '<div class="note" style="margin:6px 0 8px;">' +
      '<span style="display:inline-block; width:0; height:0; border-left:8px solid transparent; border-right:8px solid transparent; border-bottom:15px solid #dc2626; vertical-align:middle;"></span> site belum pernah divisit MTD &nbsp; ' +
      '<span style="display:inline-block; width:0; height:0; border-left:8px solid transparent; border-right:8px solid transparent; border-bottom:15px solid #f97316; vertical-align:middle;"></span> site tanpa visit 7 hari &nbsp; ' +
      '<span style="display:inline-block; width:0; height:0; border-left:8px solid transparent; border-right:8px solid transparent; border-bottom:15px solid #16a34a; vertical-align:middle;"></span> site ada visit ≤6 hari &nbsp; | &nbsp; outlet (bulat): ' +
      SLABS.map(function (s) { return '<span style="display:inline-block; width:11px; height:11px; border-radius:50%; background:' + s.color + '; vertical-align:middle;"></span> ' + s.short; }).join(' &nbsp; ') +
      ' &nbsp; · klik atau arahkan kursor ke marker untuk info dan tautan Google Maps</div>';
    var mapHtml = (typeof window !== 'undefined' && typeof L !== 'undefined')
      ? '<div id="inactivity-map" style="height:660px; border:2px solid var(--ij-ink); background:var(--ij-surface);"></div>'
      : '<div id="inactivity-map" style="height:660px; border:2px solid var(--ij-ink); display:flex; align-items:center; justify-content:center;"><span class="note">Peta memerlukan Leaflet di browser.</span></div>';
    var strip = '<div class="kpis" style="margin-top:10px; grid-template-columns: repeat(4, 1fr);">' +
      kpi('Site dalam lingkup', fmtCount(sites.length), fmtCount(shown.length) + ' ditampilkan di peta', 'up', esc(scopeText()) + (state.visitsDse ? ' · DSE terpilih' : '')) +
      kpi('Site belum pernah divisit MTD', fmtCount(cnt.never), pctOf(cnt.never, sites.length) + '% site · ' + fmtCount(oNever) + ' outlet belum divisit MTD', 'down', 'Tidak satu pun outlet di site itu di-check-in ' + pjpPeriod('mtd',{id:1}) + '') +
      kpi('Site tanpa visit 7 hari terakhir', fmtCount(cnt.stale7), 'di luar yang belum pernah · ' + fmtCount(o7) + ' outlet tanpa visit 7 hari', 'down', 'Tidak ada check-in ' + pjpPeriod('l7',{id:1}) + '') +
      kpi('Site terpilih', sel ? esc(sel.site) : '—', sel ? esc(sel.mc) + ' · ' + sel.slabs[3] + ' dari ' + sel.n + ' outlet belum divisit MTD' : 'klik segitiga atau "Lihat di peta"', sel ? 'down' : 'up', sel && sel.lat ? sel.lat.toFixed(5) + ', ' + sel.lon.toFixed(5) : '') +
    '</div>';
    return card('Map Site · lokasi site dan outlet dengan status visit DSE', '<div class="sub-nav" role="tablist" style="gap:8px;">' + unvisEntityNav('map') + '</div>' + strip) +
      card('Peta site (segitiga) dan outlet (bulat) · ' + esc(scopeText()) + (state.visitsDse ? ' · DSE ' + esc((visitsDseRow(feed) || {}).dse_name || '') : ''), toolbar + legend + mapHtml +
        '<p class="note">Posisi site dari data NBS; posisi outlet dari GPS master. Status site: merah = tidak satu pun outlet divisit ' + pjpPeriod('mtd',{id:1}) + '; oranye = ada visit MTD tetapi tidak ada ' + pjpPeriod('l7',{id:1}) + '; hijau = ada visit 7 hari terakhir. Ukuran segitiga mengikuti jumlah outlet. Peta dasar bisa diganti lewat kontrol di kanan atas (OpenStreetMap, CARTO, Esri).</p>') +
      renderSiteMapTables(feed, shown, sel);
  }
  function renderPjpSiteMap(feed) { return renderInactMap(feed || ((typeof window !== 'undefined' && window.dseVisitsFeed) ? window.dseVisitsFeed : null)); }
  function mapEnsureTriangle() {
    if (L.Canvas.prototype._updateTriangle) return;
    L.Canvas.include({ _updateTriangle: function (layer) {
      if (!this._ctx || !this._drawing || layer._empty()) return;
      var p = layer._point, r = layer._radius, ctx = this._ctx;
      this._layers[layer._leaflet_id] = layer;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 1.15); ctx.lineTo(p.x + r * 1.1, p.y + r * 0.8); ctx.lineTo(p.x - r * 1.1, p.y + r * 0.8); ctx.closePath();
      this._fillStroke(ctx, layer);
    } });
    L.TriangleMarker = L.CircleMarker.extend({ _updatePath: function () { this._renderer._updateTriangle(this); } });
  }
  function initInactivityMap() {
    if (typeof L === 'undefined') return;
    var el = document.getElementById('inactivity-map');
    if (!el) return;
    var feed = (typeof window !== 'undefined' && window.dseVisitsFeed) ? window.dseVisitsFeed : null;
    if (!feed) return;
    if (!L.Canvas.prototype._updateTriangle) {
      L.Canvas.include({ _updateTriangle: function (layer) {
        if (!this._ctx || !this._drawing || layer._empty()) return;
        var p = layer._point, r = layer._radius, ctx = this._ctx;
        this._layers[layer._leaflet_id] = layer;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 1.15); ctx.lineTo(p.x + r * 1.1, p.y + r * 0.8); ctx.lineTo(p.x - r * 1.1, p.y + r * 0.8); ctx.closePath();
        this._fillStroke(ctx, layer);
      } });
      L.TriangleMarker = L.CircleMarker.extend({ _updatePath: function () { this._renderer._updateTriangle(this); } });
    }
    var sites = inactSitesScoped(feed).filter(siteMapFlagOk);
    var sel = inactSelectedSite(feed);
    var prev = window._inactMapInstance ? { c: window._inactMapInstance.getCenter(), z: window._inactMapInstance.getZoom() } : null;
    if (window._inactMapInstance) { try { window._inactMapInstance.remove(); } catch (e) {} window._inactMapInstance = null; }
    var map = L.map('inactivity-map', { center: [-6.225, 106.845], zoom: 11, minZoom: 8, maxZoom: 19, preferCanvas: true, zoomAnimation: false });
    window._inactMapInstance = map;
    var bases = {
      'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }),
      'CARTO Voyager': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 20 }),
      'CARTO Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 20 }),
      'Esri Street': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri', maxZoom: 19 }),
      'Esri Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri', maxZoom: 19 })
    };
    var baseName = state.inactMapBase && bases[state.inactMapBase] ? state.inactMapBase : 'OpenStreetMap';
    bases[baseName].addTo(map);
    L.control.layers(bases, null, { position: 'topright', collapsed: true }).addTo(map);
    map.on('baselayerchange', function (e) { state.inactMapBase = e.name; });
    L.control.scale({ metric: true, imperial: false }).addTo(map);
    var renderer = L.canvas({ padding: 0.5 });
    var win7 = [1, 2, 3];
    function popupSite(S) {
      var st = siteStatus(S);
      return '<div style="font:500 12.5px var(--ij-font); min-width:240px;"><b style="font-size:14px;">📡 Site ' + esc(S.site) + '</b><br>' + esc(S.mc) + ' · ' + esc(S.br) + '<br>' + esc(S.kec) + ' · DSO ' + esc(S.dso) + ' · DSE utama ' + esc(S.dse) + '<br>' +
        '<span style="color:' + SITE_STATUS[st].color + '; font-weight:800;">' + SITE_STATUS[st].label + '</span><br>' +
        fmtCount(S.n) + ' outlet · ' + SLABS.map(function (s, i) { return '<span style="color:' + s.fg + '; font-weight:700;">' + s.short + ' ' + S.slabs[i] + '</span>'; }).join(' · ') + '<br>' +
        (S.lat != null ? '<code>' + S.lat.toFixed(6) + ', ' + S.lon.toFixed(6) + '</code><br><a href="' + gmapsSearch(S.lat, S.lon) + '" target="_blank" rel="noopener">Buka di Google Maps</a> · <a href="' + gmapsDir(S.lat, S.lon) + '" target="_blank" rel="noopener">Rute</a>' : '<span class="note">tanpa GPS</span>') + '</div>';
    }
    function popupOutlet(o, S) {
      var s = SLABS[o.sl];
      return '<div style="font:500 12.5px var(--ij-font); min-width:220px;"><b style="font-size:14px;">🏪 ' + esc(o.n || o.k) + '</b><br><code>' + esc(o.k) + '</code><br>Site ' + esc(S.site) + ' · ' + esc(S.mc) + '<br>DSE ' + esc(o.dse) + ' · ' + esc(o.kec) + '<br>' +
        '<span style="color:' + s.fg + '; font-weight:800;">' + s.label + '</span>' + (o.last ? ' · check-in terakhir ' + esc(o.last) : '') + '<br>' +
        (o.lat && o.lon ? '<code>' + o.lat.toFixed(6) + ', ' + o.lon.toFixed(6) + '</code><br><a href="' + gmapsSearch(o.lat, o.lon) + '" target="_blank" rel="noopener">Buka di Google Maps</a> · <a href="' + gmapsDir(o.lat, o.lon) + '" target="_blank" rel="noopener">Rute</a>' : '<span class="note">tanpa GPS</span>') + '</div>';
    }
    var pts = [];
    sites.forEach(function (S) {
      if (S.lat == null || S.lon == null) return;
      var st = siteStatus(S);
      var m = new L.TriangleMarker([S.lat, S.lon], { renderer: renderer, radius: 7 + Math.min(9, Math.sqrt(S.n) * 1.8), color: '#0F172A', weight: sel && sel.key === S.key ? 3 : 1, fillColor: SITE_STATUS[st].color, fillOpacity: 0.9 }).addTo(map);
      m.bindTooltip('<b>📡 ' + esc(S.site) + '</b> · ' + esc(S.mc) + '<br>' + SITE_STATUS[st].label + ' · ' + S.slabs[3] + ' dari ' + S.n + ' outlet belum divisit MTD<br><span style="color:#64748b;">' + S.lat.toFixed(5) + ', ' + S.lon.toFixed(5) + '</span>', { sticky: true });
      m.bindPopup(popupSite(S), { maxWidth: 320 });
      m.on('click', function () { state.unvisSiteSel = S.key; state._inactFit = false; state._inactKeepView = true; render(); });
      pts.push([S.lat, S.lon]);
    });
    function plotOutlet(o, S, big) {
      if (!o.lat || !o.lon) return;
      var s = SLABS[o.sl];
      var om = L.circleMarker([o.lat, o.lon], { renderer: renderer, radius: big ? 6 : 4, color: '#0F172A', weight: 0.7, fillColor: s.color, fillOpacity: 0.92 }).addTo(map);
      om.bindTooltip('<b>🏪 ' + esc(o.n || o.k) + '</b><br>' + s.label + (o.last ? ' · ' + esc(o.last) : '') + '<br><span style="color:#64748b;">DSE ' + esc(o.dse) + ' · ' + o.lat.toFixed(5) + ', ' + o.lon.toFixed(5) + '</span>', { sticky: true });
      om.bindPopup(popupOutlet(o, S), { maxWidth: 300 });
    }
    if (state.inactMapOutlets) sites.forEach(function (S) { S.outlets.forEach(function (o) { plotOutlet(o, S, false); }); });
    if (sel) {
      var b = [];
      sel.outlets.forEach(function (o) { plotOutlet(o, sel, true); if (o.lat && o.lon) b.push([o.lat, o.lon]); });
      if (sel.lat != null) b.push([sel.lat, sel.lon]);
      if (state._inactFit && b.length) { map.fitBounds(b, { padding: [30, 30], maxZoom: 17, animate: false }); state._inactFit = false; state._inactKeepView = false; return; }
    }
    if (prev && (state._inactKeepView || !state._inactFit)) { map.setView(prev.c, prev.z, { animate: false }); }
    else if (pts.length) map.fitBounds(pts, { padding: [20, 20], animate: false });
    state._inactFit = false; state._inactKeepView = false;
  }

  function renderVisitsUnvisited(feed) {
    if (state.unvisEntity === 'slab') return renderInactSlabs(feed);
    if (state.unvisEntity === 'map') return renderInactMap(feed);
    var c = unvisCompute(feed);
    var isOutlet = c.entity === 'outlet';
    var scopeLabel = unvisWindows()[c.scope] || 'MTD';
    var grpLabel = UNVIS_GROUPS.filter(function (g) { return g[0] === c.grp; })[0][1];
    var T = c.totals;
    var noun = isOutlet ? 'outlets' : 'sites';

    var entityNav = '<div class="sub-nav" role="tablist" style="gap:8px;">' + unvisEntityNav(c.entity) +
      '<span class="map-label" style="margin-left:14px;">Group &amp; rank by:</span>' +
      UNVIS_GROUPS.map(function (g) { return '<button type="button" class="map-btn' + (c.grp === g[0] ? ' active' : '') + '" data-unvis-group="' + g[0] + '">' + g[1] + '</button>'; }).join('') +
    '</div>';

    var strip = '<div class="kpis" style="margin-top:10px; grid-template-columns: repeat(3, 1fr);">' +
      kpi('Outlets · no visit last 3 days', fmtCount(T.o3), pctOf(T.o3, T.o3 + 0) === '0.0' ? '' : 'in current filter', 'down', 'No check-in ' + pjpPeriod('l3') + '') +
      kpi('Outlets · no visit last 7 days', fmtCount(T.o7), 'in current filter', 'down', 'No check-in ' + pjpPeriod('l7') + '') +
      kpi('Outlets · never visited MTD', fmtCount(T.om), 'in current filter', 'down', 'No check-in ' + pjpPeriod('mtd') + '') +
      kpi('Sites · no visit last 3 days', fmtCount(T.s3), 'DSO-mapped sites in filter', 'down', '0 visited outlets ' + pjpPeriod('l3') + '') +
      kpi('Sites · no visit last 7 days', fmtCount(T.s7), 'DSO-mapped sites in filter', 'down', '0 visited outlets ' + pjpPeriod('l7') + '') +
      kpi('Sites · never visited MTD', fmtCount(T.sm), 'DSO-mapped sites in filter', 'down', '0 visited outlets ' + pjpPeriod('mtd') + '') +
    '</div>';

    var maxN = c.ranked.length ? c.ranked[0].n : 0;
    var parentHead = c.grp === 'br' ? th('Head of Area') : (c.grp === 'mc' ? th('Branch · DSO Leader') : th('Micro Cluster · Branch'));
    var rows = c.ranked.map(function (G, i) {
      var parent = c.grp === 'br' ? G.hoa : (c.grp === 'mc' ? G.br + ' · ' + G.dso : G.mc + ' · ' + G.br);
      var isSel = c.sel && c.sel.key === G.key;
      var bar = '<div class="progress-bar-cell"><div class="progress-bar-fill" style="width:' + (maxN ? Math.round(G.n / maxN * 100) : 0) + '%;"></div><span class="progress-bar-label">' + fmtCount(G.n) + '</span></div>';
      return '<tr data-unvis-sel="' + esc(G.key) + '" class="' + (isSel ? 'sel' : '') + '" tabindex="0">' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td class="cur"><b>' + esc(G.key) + '</b></td>' +
        '<td>' + esc(parent) + '</td>' +
        '<td class="num">' + fmtCount(G.base) + '</td>' +
        '<td class="num">' + fmtCount(G.n3) + '</td>' +
        '<td class="num">' + fmtCount(G.n7) + '</td>' +
        '<td class="num"><span class="alert-tag">' + fmtCount(G.nm) + '</span></td>' +
        '<td class="num"><b>' + pctOf(G.n, G.base) + '%</b></td>' +
        '<td>' + bar + '</td>' +
        '<td><button type="button" class="btn" data-unvis-sel="' + esc(G.key) + '" style="font-size:14px; padding:5px 9px;">' + (isSel ? 'Hide list' : 'Show list &#8594;') + '</button></td>' +
      '</tr>';
    }).join('');

    if (c.ranked.length > 1) {
      var UT = { base: 0, n3: 0, n7: 0, nm: 0, n: 0 };
      c.ranked.forEach(function (G) { UT.base += G.base; UT.n3 += G.n3; UT.n7 += G.n7; UT.nm += G.nm; UT.n += G.n; });
      rows += '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td></td><td class="cur" style="background:var(--ink); color:#fff;">TOTAL · ' + fmtCount(c.ranked.length) + ' ' + esc(grpLabel) + '</td><td></td><td class="num">' + fmtCount(UT.base) + '</td><td class="num">' + fmtCount(UT.n3) + '</td><td class="num">' + fmtCount(UT.n7) + '</td><td class="num">' + fmtCount(UT.nm) + '</td><td class="num">' + pctOf(UT.n, UT.base) + '%</td><td></td><td></td></tr>';
    }
    var head = '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">' +
      '<div><b style="font-size:18px;">' + (isOutlet ? '🏪 ' : '📡 ') + fmtCount(c.inScope.length) + (isOutlet ? ' master outlets' : ' DSO-mapped sites') + ' with no visit · ' + scopeLabel + (c.sel ? ' · ' + esc(c.sel.key) : '') + '</b><br>' +
      '<span class="note">Ranked by ' + grpLabel + '. Click a row to list its ' + noun + '. The window follows the Temporal Window toggle; the filter bar and search apply.</span></div>' +
      '<button type="button" class="btn primary" data-act="export-unvisited-csv">📥 Export ' + fmtCount(c.inScope.length) + ' ' + noun + ' CSV</button></div>';

    var listHtml = '';
    if (c.sel) {
      var page = state.visitsPage || 1, pageSize = state.visitsPageSize || 50;
      var totalPages = Math.ceil(c.inScope.length / pageSize) || 1;
      if (page > totalPages) { page = totalPages; state.visitsPage = page; }
      var start = (page - 1) * pageSize;
      var slice = c.inScope.slice(start, start + pageSize);
      var lrows = slice.map(function (r) {
        return isOutlet
          ? '<tr><td class="cur"><code>' + esc(r.k) + '</code></td><td><b>' + esc(r.n) + '</b></td><td>' + esc(r.br) + '</td><td>' + esc(r.mc) + '</td><td>' + esc(r.kec) + '</td><td><code>' + esc(r.site) + '</code></td><td>' + esc(r.dse) + '</td><td>' + esc(r.last || 'Never') + '</td><td>' + agingTag(r.w) + '</td></tr>'
          : '<tr><td class="cur"><code>' + esc(r.site) + '</code></td><td>' + esc(r.mc) + '</td><td>' + esc(r.dso) + '</td><td>' + esc(r.br) + '</td><td>' + esc(r.kec) + '</td><td>' + esc(r.dse) + '</td><td class="num">' + fmtCount(r.outlets) + '</td><td>' + esc(r.last || 'Never') + '</td><td>' + agingTag(r.w) + '</td></tr>';
      }).join('');
      var lhead = isOutlet
        ? th('Outlet Key') + th('Outlet Name') + th('Branch') + th('Micro Cluster') + th('Kecamatan') + th('Site NBS') + th('Assigned DSE') + th('Last Visit') + th('Inactivity')
        : th('Site NBS') + th('Micro Cluster') + th('DSO Leader') + th('Branch') + th('Kecamatan') + th('Main DSE') + th('Outlets', 1) + th('Last Visit') + th('Inactivity');
      var pag = '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">' +
        '<span class="note">Showing ' + (c.inScope.length ? start + 1 : 0) + '–' + Math.min(start + pageSize, c.inScope.length) + ' of ' + fmtCount(c.inScope.length) + ' ' + noun + '</span>' +
        '<div style="display:flex; gap:6px;">' +
          '<button type="button" class="btn" data-visits-page="prev"' + (page <= 1 ? ' disabled style="opacity:0.5;"' : '') + '>&larr; Previous</button>' +
          '<span style="padding:4px 8px; font:700 15px var(--ij-font);">Page ' + page + ' of ' + totalPages + '</span>' +
          '<button type="button" class="btn" data-visits-page="next"' + (page >= totalPages ? ' disabled style="opacity:0.5;"' : '') + '>Next &rarr;</button>' +
        '</div></div>';
      listHtml = card((isOutlet ? 'Unvisited outlets' : 'Inactive sites') + ' · ' + esc(c.sel.key) + ' · ' + scopeLabel,
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + lhead + '</tr></thead><tbody>' + lrows + '</tbody></table></div>' + pag);
    }

    return card('Inactivity &amp; Blindspot Audit · Site view and Outlet view', entityNav + unvisWindowBar() + strip) +
      card((isOutlet ? 'Outlets' : 'Sites') + ' with no visit · ranked by ' + grpLabel + ' · ' + scopeLabel, head +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('#', 1) + th(grpLabel) + parentHead + th(isOutlet ? 'Total Outlets' : 'Total Sites', 1) +
        th('No visit 3D', 1) + th('No visit 7D', 1) + th('Never MTD', 1) + th('% of total (' + (c.scope === 'mtd' ? 'MTD' : (c.scope === 'last7d' ? '7D' : '3D')) + ')', 1) + th('Rank') + th('List') +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (c.ranked.length ? '' : '<p class="note">Nothing in this window for the current filter.</p>')) +
      listHtml;
  }

  function viewVisits() {
    var feed = (typeof window !== 'undefined' && window.dseVisitsFeed) ? window.dseVisitsFeed : (typeof dseVisitsFeed !== 'undefined' ? dseVisitsFeed : null);
    if (!feed) {
      return card('DSE Visits & Beat Plans', '<p class="note">Visit feed data is loading or not available. Please verify that <code>data/dse_visits_feed.js</code> is loaded properly.</p>');
    }

    var summary = feed.regional_summary;
    var scope = state.visitsDateScope || 'mtd';
    var brandFilter = state.visitsBrandFilter || 'all';

    // 1. Navigation Toolbar & Filter Ribbon
    if (['area', 'mc', 'dse'].indexOf(state.visitsSubView) >= 0) { state.visitsLevel = state.visitsSubView; state.visitsSubView = 'exec'; }
    var lvLabel = VISIT_LEVEL_LABEL[visitsLevel()];
    var subTabs = [
      ['regional', '🌐 Regional Overview'],
      ['exec', '📋 PJP Execution · ' + lvLabel],
      ['heat', '🗓️ Daily Heatmap · ' + lvLabel],
      ['unvisited', '⚠️ Inactivity: Site &amp; Outlet View']
    ];

    var navHtml = '<div class="sub-nav" role="tablist">' + subTabs.map(function (tab) {
      var active = (state.visitsSubView || 'regional') === tab[0];
      return '<button type="button" role="tab" class="sub-nav-btn' + (active ? ' active' : '') + '" data-visits-sub="' + tab[0] + '" aria-selected="' + active + '">' + tab[1] + '</button>';
    }).join('') + '</div>';

    var brands = [
      ['all', 'All Brands'],
      ['im3', 'IM3 Only'],
      ['3id', '3ID Only'],
      ['hybrid', 'Dual-Brand Hybrid']
    ];

    var toolbarHtml = '<div class="map-toolbar" style="margin-top:10px;">' +
      '<div class="map-toolbar-group">' +
        '<span class="map-label">Brand Touchpoint:</span>' +
        brands.map(function (b) {
          var active = brandFilter === b[0];
          return '<button type="button" class="map-btn' + (active ? ' active' : '') + '" data-visits-brand="' + b[0] + '">' + b[1] + '</button>';
        }).join('') +
      '</div>' +
      '<div class="map-toolbar-group">' +
        '<input type="text" id="visitsSearchInput" aria-label="Search DSE, MC, branch, site or outlet" placeholder="🔍 Search DSE, MC, Branch, Site, Outlet..." value="' + esc(state.visitsSearch || '') + '" class="map-select" style="min-width:240px;">' +
        (state.visitsSearch || state.branch || state.hoa || state.kec || state.visitsDse || (state.visitsLevel && state.visitsLevel !== 'auto') || brandFilter !== 'all' ? '<button type="button" class="btn" data-act="clear-visits-filter" style="font-size:14.5px; padding:6px 12px;">Reset Filter</button>' : '') +
      '</div>' +
    '</div>';

    // 2. KPI cards: follow the filter bar (Branch / HoA / MC), the temporal window and the brand filter
    var sc = visitsScope(feed);
    var gw = summary.growth_wow || {};
    var prodRule = summary.productive_rule || 'SP/VC qty > 0 or saldo > Rp 50K';
    var kpisHtml = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Target Hit Rate', sc.hit + '%', fmtCount(sc.actual) + ' of ' + fmtCount(sc.planned) + ' planned stops', sc.hit >= 60 ? 'up' : 'down', sc.scoped ? 'Scope: ' + esc(sc.label) : 'W2 ' + gw.w2_compliance + '% vs W1 ' + gw.w1_compliance + '%') +
      kpi('Productive Stops', sc.prodRate == null ? '—' : sc.prodRate + '%', sc.prodRate == null ? 'Not split by brand' : fmtCount(sc.productive) + ' stops · ' + fmtCount(sc.prodPhys) + ' physical SP/VC · ' + fmtCount(sc.prodSaldo) + ' saldo', sc.prodRate != null && sc.prodRate >= 30 ? 'up' : 'down', esc(prodRule) + (sc.flowRate != null ? ' · flow completed ' + sc.flowRate + '%' : '')) +
      kpi('Active Visited Stores', fmtCount(sc.visited), pctOf(sc.visited, sc.outlets) + '% of ' + fmtCount(sc.outlets) + ' master stores', 'up', fmtCount(sc.hybrid) + ' dual-brand hybrid stores') +
      kpi('Run-Rate Velocity', (gw.run_rate_growth_pct >= 0 ? '+' : '') + gw.run_rate_growth_pct + '% WoW', 'W2 ' + fmtCount(gw.w2_per_day || 0) + '/day vs W1 ' + fmtCount(gw.w1_per_day || 0) + '/day', 'up', 'Regional, all brands, baseline month Oct 2026') +
      kpi('Unvisited Outlets · MTD', fmtCount(sc.nvm), pctOf(sc.nvm, sc.outlets) + '% of ' + fmtCount(sc.outlets) + ' stores', 'down', 'No completed check-in ' + pjpPeriod('mtd') + '') +
      kpi('Unvisited Outlets · Last 7 Days', fmtCount(sc.nv7), pctOf(sc.nv7, sc.outlets) + '% of ' + fmtCount(sc.outlets) + ' stores', 'down', 'No completed check-in ' + pjpPeriod('l7') + '') +
      kpi('Unvisited Outlets · Last 3 Days', fmtCount(sc.nv3), pctOf(sc.nv3, sc.outlets) + '% of ' + fmtCount(sc.outlets) + ' stores', 'down', 'No completed check-in ' + pjpPeriod('l3') + '') +
      kpi('Avg Visit Duration', fmtDur(sc.durSec), sc.scoped ? 'Weighted by check-ins in scope' : 'Median: ' + summary.median_duration, 'up', sc.scoped ? sc.mcCount + ' micro cluster(s) in scope' : 'Per completed check-in') +
      kpi('Inactive NBS Sites · MTD', fmtCount(sc.szm), pctOf(sc.szm, sc.sites) + '% of ' + fmtCount(sc.sites) + ' DSO-mapped sites', 'down', '0 visited outlets ' + pjpPeriod('mtd') + '') +
      kpi('Inactive NBS Sites · Last 7 Days', fmtCount(sc.sz7), pctOf(sc.sz7, sc.sites) + '% of ' + fmtCount(sc.sites) + ' DSO-mapped sites', 'down', '0 visited outlets ' + pjpPeriod('l7') + '') +
      kpi('Inactive NBS Sites · Last 3 Days', fmtCount(sc.sz3), pctOf(sc.sz3, sc.sites) + '% of ' + fmtCount(sc.sites) + ' DSO-mapped sites', 'down', '0 visited outlets ' + pjpPeriod('l3') + '') +
      kpi('GPS Proximity', sc.dev + ' m median', sc.scoped ? 'Weighted across MCs in scope' : summary.pct_within_250m + '% within 250 m', 'up', sc.scoped ? esc(sc.label) : summary.pct_within_100m + '% within 100 m') +
    '</div>';

    // 3. Sub-View Dispatch
    var subContent = '';
    var currentSub = state.visitsSubView || 'regional';
    if (currentSub === 'regional') {
      subContent = renderVisitsRegional(feed, summary);
    } else if (currentSub === 'exec') {
      subContent = renderVisitsExec(feed);
    } else if (currentSub === 'heat') {
      subContent = renderVisitsHeat(feed);
    } else if (currentSub === 'unvisited') {
      subContent = renderVisitsUnvisited(feed);
    } else {
      subContent = renderVisitsRegional(feed, summary);
    }

    return navHtml + toolbarHtml + kpisHtml + subContent;
  }


  /* ---------- Sell-In Monitoring (MOBI: DSE -> Outlet, MPX/SDP -> Outlet) ---------- */
  var SELLIN_LEVELS = [['region', 'Region'], ['area', 'Area (Branch)'], ['mc', 'Micro Cluster'], ['kec', 'Kecamatan'], ['site', 'Site (NBS)'], ['dse', 'DSE'], ['outlet', 'Outlet']];
  var SELLIN_FLOWS = { DSE: 'DSE → Outlet', MPX: 'MPX → Outlet', SDP: 'SDP → Outlet', UNK: 'Unidentified → Outlet' };
  function sellinFeed() { return (typeof window !== 'undefined' && window.SELLIN_FEED) ? window.SELLIN_FEED : null; }
  function sellinOutletDim(feed) {
    if (feed._dim) return feed._dim;
    var dim = {};
    var terr = (typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED : (typeof TERRITORY_FEED !== 'undefined' ? TERRITORY_FEED : null);
    ((terr && terr.outlets) || []).forEach(function (o) { dim[o.outlet_key] = o; });
    (feed.extra_outlets || []).forEach(function (o) { dim[o.outlet_key] = o; });
    feed._dim = dim;
    return dim;
  }
  function sellinInScope(o) {
    if (state.branch && o.branch !== state.branch) return false;
    if (state.hoa && o.hoa_leader !== state.hoa) return false;
    if (state.kec && o.micro_cluster !== state.kec) return false;
    if (state.dse && dseNorm(o.dse_name) !== state.dse) return false;
    return true;
  }
  function sellinFacts(feed) {
    var dim = sellinOutletDim(feed);
    var tab = state.sellinTab || 'all', brand = state.sellinBrand || 'all', flow = state.sellinFlow || 'all';
    var dayMax = (state.sellinDay == null || state.sellinDay < 0) ? 1e9 : state.sellinDay;
    var q = (state.sellinSearch || '').toLowerCase();
    var out = [];
    feed.facts.forEach(function (f) {
      var o = dim[f[7]];
      if (!o || !sellinInScope(o)) return;
      if (tab !== 'all' && f[15] !== tab) return;
      if (f[0] > dayMax) return;
      if (brand !== 'all' && f[1] !== brand) return;
      if (flow !== 'all' && f[4] !== flow) return;
      if (q) {
        var hay = (o.outlet_name + ' ' + o.outlet_key + ' ' + (o.site_nbs || '') + ' ' + f[8] + ' ' + o.micro_cluster + ' ' + o.branch + ' ' + (o.kecamatan || '') + ' ' + f[12] + ' ' + f[14]).toLowerCase();
        if (hay.indexOf(q) === -1) return;
      }
      out.push(f);
    });
    return out;
  }
  /* ---------- daily progression per territory ---------- */
  function uarCell(n, pjp) {
    return fmtCount(n) + (pjp ? ' <span style="color:var(--ij-muted); font-size:.85em;">' + pctOf(n, pjp) + '%</span>' : '');
  }
  function sellinThreshold(tab) { return tab === 'SP' ? 1 : tab === 'VC' ? 5 : 0; }
  function sellinProgression(feed, facts, tab) {
    var dim = sellinOutletDim(feed), days = feed.metadata.days, loc = state.sellinLoc || 'area';
    var thr = sellinThreshold(tab);
    var byDay = days.map(function () { return []; });
    facts.forEach(function (f) { if (byDay[f[0]]) byDay[f[0]].push(f); });
    var terr = {};
    function T(k, o) { return terr[k] || (terr[k] = { key: k, o: o, pjp: 0, days: days.map(function () { return { qty: 0, amt: 0, dayUar: 0, cumUar: 0 }; }), run: {} }); }
    var TOT = T('INNER JAKARTA (total)', null);
    Object.keys(dim).forEach(function (k) {
      if (k.indexOf('X:') === 0) return;
      var o = dim[k];
      if (!sellinInScope(o)) return;
      T(sellinLocKey(loc, o, feed), o).pjp++; TOT.pjp++;
    });
    byDay.forEach(function (list, di) {
      var dayOutlets = {};
      list.forEach(function (f) {
        var o = dim[f[7]], k = sellinLocKey(loc, o, feed);
        [T(k, o), TOT].forEach(function (G) {
          var D = G.days[di];
          D.qty += (f[15] === 'SALDO') ? f[6] : f[5];
          D.amt += f[6];
          G.run[f[7]] = (G.run[f[7]] || 0) + ((f[15] === 'SALDO') ? f[6] : f[5]);
          var dk = G.key + '|' + f[7];
          dayOutlets[dk] = (dayOutlets[dk] || 0) + ((f[15] === 'SALDO') ? f[6] : f[5]);
        });
      });
      Object.keys(dayOutlets).forEach(function (dk) {
        var k = dk.split('|')[0];
        if (dayOutlets[dk] > thr || (thr === 0 && dayOutlets[dk] > 0) || (thr > 0 && dayOutlets[dk] >= thr)) terr[k].days[di].dayUar++;
      });
      Object.keys(terr).forEach(function (k) {
        var G = terr[k], n = 0;
        Object.keys(G.run).forEach(function (ok) { if (thr > 0 ? G.run[ok] >= thr : G.run[ok] > 0) n++; });
        G.days[di].cumUar = n;
      });
    });
    var rows = Object.keys(terr).filter(function (k) { return k !== 'INNER JAKARTA (total)' && (terr[k].days.some(function (d) { return d.amt || d.qty; })); }).map(function (k) { return terr[k]; });
    var last = days.length - 1;
    rows.sort(function (x, y) { return y.days[last].amt + y.days.slice(0, last).reduce(function (s, d) { return s + d.amt; }, 0) - (x.days[last].amt + x.days.slice(0, last).reduce(function (s, d) { return s + d.amt; }, 0)); });
    return { rows: rows, total: TOT, days: days };
  }
  function sellinProgressionTable(feed, P, tab) {
    var metric = state.sellinProgMetric || 'qty', mode = state.sellinProgMode || 'cum';
    var dayMax = (state.sellinDay == null || state.sellinDay < 0) ? P.days.length - 1 : state.sellinDay;
    var isRp = (metric === 'amt') || (metric === 'qty' && tab === 'SALDO');
    function cell(G, di) {
      var v;
      if (metric === 'uar') v = mode === 'cum' ? G.days[di].cumUar : G.days[di].dayUar;
      else {
        var key = metric === 'amt' ? 'amt' : 'qty';
        if (mode === 'cum') { v = 0; for (var i = 0; i <= di; i++) v += G.days[i][key]; } else v = G.days[di][key];
      }
      return v;
    }
    function fmt(v, G) { return metric === 'uar' ? uarCell(v, G && G.pjp) : (isRp ? fmtRp(v) : fmtCount(v)); }
    var head = '<tr>' + th('Territory') + (metric === 'uar' ? th('PJP', 1) : '') + P.days.slice(0, dayMax + 1).map(function (d) { return th(d.slice(8) + ' ' + sellinDayLabel(d), 1); }).join('') + th(mode === 'cum' ? 'As of day' : 'Total', 1) + '</tr>';
    function tr(G, bold) {
      var cells = [], last = 0;
      for (var di = 0; di <= dayMax; di++) { var v = cell(G, di); cells.push('<td class="num">' + (v ? fmt(v, G) : '<span style="color:var(--ij-label);">·</span>') + '</td>'); last = mode === 'cum' ? v : last + v; }
      return '<tr' + (bold ? ' class="cur"' : '') + '><td class="cur"><b>' + esc(G.key) + '</b></td>' + (metric === 'uar' ? '<td class="num">' + fmtCount(G.pjp) + '</td>' : '') + cells.join('') + '<td class="num cur"><b>' + fmt(last, G) + '</b></td></tr>';
    }
    var body = P.rows.map(function (G) { return tr(G, false); }).join('') + tr(P.total, true);
    return '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
  }
  function sellinKeyOf(level, f, o) {
    if (level === 'region') return 'INNER JAKARTA';
    if (level === 'area') return o.branch || '—';
    if (level === 'mc') return o.micro_cluster || '—';
    if (level === 'kec') return o.kecamatan || '—';
    if (level === 'site') return o.site_nbs || 'UNMAPPED';
    if (level === 'dse') return f[8] || SELLIN_FLOWS[f[4]] || '—';
    return f[7];
  }
  function sellinAgg(facts, level, dim) {
    var g = {};
    facts.forEach(function (f) {
      var o = dim[f[7]];
      var k = sellinKeyOf(level, f, o);
      var G = g[k] || (g[k] = { key: k, o: o, tx: 0, vc: 0, sp: 0, ev: 0, pval: 0, val: 0, outlets: {}, dses: {}, days: {} });
      G.tx++;
      if (f[3] === 'VC') G.vc += f[5]; else if (f[3] === 'SP') G.sp += f[5]; else G.ev += f[6];
      if (f[2] === 'P') G.pval += f[6];
      G.val += f[6];
      G.outlets[f[7]] = 1;
      if (f[8]) G.dses[f[8]] = 1;
      G.days[f[0]] = 1;
    });
    return Object.keys(g).map(function (k) {
      var G = g[k];
      G.uar = Object.keys(G.outlets).length; G.ndse = Object.keys(G.dses).length; G.ndays = Object.keys(G.days).length;
      return G;
    }).sort(function (a, b) { return b.val - a.val || b.uar - a.uar; });
  }
  function sellinBase(level, dim) {
    var base = { _total: 0 };
    Object.keys(dim).forEach(function (k) {
      if (k.indexOf('X:') === 0) return;
      var o = dim[k];
      if (!sellinInScope(o)) return;
      var key = level === 'region' ? 'INNER JAKARTA' : level === 'area' ? o.branch : level === 'mc' ? o.micro_cluster : level === 'kec' ? (o.kecamatan || '—') : level === 'site' ? (o.site_nbs || 'UNMAPPED') : level === 'dse' ? (o.dse_name || '—') : k;
      base[key] = (base[key] || 0) + 1;
      base._total++;
    });
    return base;
  }
  function sellinDaily(facts, days) {
    var d = days.map(function (dt) { return { date: dt, tx: 0, vc: 0, sp: 0, ev: 0, val: 0, outlets: {}, dses: {} }; });
    facts.forEach(function (f) {
      var D = d[f[0]]; if (!D) return;
      D.tx++; if (f[3] === 'VC') D.vc += f[5]; else if (f[3] === 'SP') D.sp += f[5]; else D.ev += f[6];
      D.val += f[6]; D.outlets[f[7]] = 1; if (f[8]) D.dses[f[8]] = 1;
    });
    d.forEach(function (D) { D.uar = Object.keys(D.outlets).length; D.ndse = Object.keys(D.dses).length; });
    return d;
  }
  function sellinDayLabel(iso) {
    var dt = new Date(iso + 'T00:00:00');
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()];
  }
  function sellinBtnGroup(label, attr, items, current) {
    return '<div class="map-toolbar-group"><span class="map-label">' + label + ':</span>' + items.map(function (i) {
      return '<button type="button" class="map-btn' + (current === i[0] ? ' active' : '') + '" data-' + attr + '="' + i[0] + '">' + i[1] + '</button>';
    }).join('') + '</div>';
  }
  function sellinCompute(feed) {
    var dim = sellinOutletDim(feed);
    var facts = sellinFacts(feed);
    var level = state.sellinLevel || 'area';
    return { dim: dim, facts: facts, level: level, rows: sellinAgg(facts, level, dim), base: sellinBase(level, dim), daily: sellinDaily(facts, feed.metadata.days) };
  }
  function sellinRowParent(level, G) {
    var o = G.o || {};
    if (level === 'region') return '7 branches · 36 micro clusters';
    if (level === 'area') return 'HoA ' + esc(o.hoa_leader || '—');
    if (level === 'mc') return esc(o.branch || '—') + ' · DSO ' + esc(o.dso_leader || '—');
    if (level === 'kec') return esc(o.micro_cluster || '—') + ' · ' + esc(o.branch || '—');
    if (level === 'site') return esc(o.micro_cluster || '—') + ' · ' + esc(o.branch || '—');
    if (level === 'dse') return esc(o.micro_cluster || '—') + ' · ' + esc(o.branch || '—');
    return esc(o.micro_cluster || '—') + ' · site ' + esc(o.site_nbs || '—') + ' · DSE ' + esc(o.dse_name || '—');
  }
  function exportSellinCsv(c) {
    if (typeof window === 'undefined') return;
    var levelLabel = SELLIN_LEVELS.filter(function (l) { return l[0] === c.level; })[0][1];
    function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var lines = [[levelLabel, 'Parent', 'Transactions', 'Voucher units', 'Starter Pack units', 'Saldo Rp', 'Physical value Rp', 'Total value Rp', 'UAR', 'Master outlets', 'UAR %', 'Active DSEs', 'Active days'].map(q).join(',')];
    c.rows.forEach(function (G) {
      var base = c.base[G.key] || 0;
      var name = c.level === 'outlet' ? ((G.o && G.o.outlet_name) || '') + ' [' + G.key + ']' : G.key;
      lines.push([name, sellinRowParent(c.level, G).replace(/<[^>]+>/g, ''), G.tx, G.vc, G.sp, G.ev, G.pval, G.val, G.uar, base, base ? (G.uar / base * 100).toFixed(1) : '', G.ndse, G.ndays].map(q).join(','));
    });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sellin_' + c.level + '_' + (state.sellinSrc || 'all') + '_' + (state.sellinCat || 'all') + '.csv';
    link.click();
  }

  /* ---------- GAPLOK-style summary (location x product group, summary first) ---------- */
  var SELLIN_LOCS = [['area', 'Area (7 branches)'], ['mc', 'Micro Cluster (36)'], ['cse', 'CSE / DSO Leader']];
  var SELLIN_GROUPS = [['all', 'All categories'], ['SP', 'SIM / Starter Pack'], ['VC', 'Vouchers'], ['SALDO', 'Saldo']];
  function sellinLocKey(loc, o, feed) {
    if (loc === 'area') return o.branch || '—';
    if (loc === 'cse') return (o.dso_leader || '—') + ' · ' + (o.micro_cluster || '—');
    return o.micro_cluster || '—';
  }
  function sellinLocParent(loc, o, feed) {
    if (loc === 'area') return 'HoA ' + esc(o.hoa_leader || '—');
    if (loc === 'cse') return esc(o.branch || '');
    return esc(o.branch || '') + ' · CSE ' + esc(o.dso_leader || '—');
  }
  function sellinOutletAgg(feed, facts) {
    // per outlet: group totals and denomination pcs
    var per = {};
    facts.forEach(function (f) {
      var P = per[f[7]] || (per[f[7]] = { SP: { pcs: 0, amt: 0, d: {} }, VC: { pcs: 0, amt: 0, d: {} }, SALDO: { pcs: 0, amt: 0, d: {} } });
      var g = P[f[15]] || (P[f[15]] = { pcs: 0, amt: 0, d: {} });
      g.pcs += f[5]; g.amt += f[6]; g.d[f[16]] = (g.d[f[16]] || 0) + (f[15] === 'SALDO' ? f[6] : f[5]);
    });
    return per;
  }
  function sellinGroupStats(G, outletsAgg, denoms) {
    // G.keys: outlet keys in this location; returns per-group KPI object
    var out = { SP: { active: 0, uar3: 0, pcs: 0, amt: 0, d: {} }, VC: { active: 0, uar10: 0, amt250: 0, pcs: 0, amt: 0, d: {} }, SALDO: { active: 0, ge300: 0, amt: 0, b: { LT50K: 0, '50_100K': 0, '100_300K': 0, GE300K: 0 }, d: {} }, total: 0 };
    Object.keys(G.keys).forEach(function (k) {
      var P = outletsAgg[k]; if (!P) return;
      var sp = P.SP, vc = P.VC, sa = P.SALDO;
      if (sp.pcs > 0) { out.SP.active++; if (sp.pcs >= 3) out.SP.uar3++; out.SP.pcs += sp.pcs; out.SP.amt += sp.amt; Object.keys(sp.d).forEach(function (d) { out.SP.d[d] = (out.SP.d[d] || 0) + sp.d[d]; }); }
      if (vc.pcs > 0) { if (vc.pcs >= 5) out.VC.active++; if (vc.pcs >= 10) out.VC.uar10++; if (vc.amt >= 250000) out.VC.amt250++; out.VC.pcs += vc.pcs; out.VC.amt += vc.amt; Object.keys(vc.d).forEach(function (d) { out.VC.d[d] = (out.VC.d[d] || 0) + vc.d[d]; }); }
      if (sa.amt > 0) { out.SALDO.active++; out.SALDO.amt += sa.amt; if (sa.amt >= 300000) out.SALDO.ge300++; out.SALDO.b[sa.amt < 50000 ? 'LT50K' : sa.amt < 100000 ? '50_100K' : sa.amt < 300000 ? '100_300K' : 'GE300K']++; }
      out.total += sp.amt + vc.amt + sa.amt;
    });
    return out;
  }
  function sellinSummaryRows(feed, facts) {
    var dim = sellinOutletDim(feed);
    var loc = state.sellinLoc || 'area';
    var per = sellinOutletAgg(feed, facts);
    var groups = {};
    Object.keys(dim).forEach(function (k) {
      var o = dim[k];
      if (!sellinInScope(o)) return;
      var key = sellinLocKey(loc, o, feed);
      var G = groups[key] || (groups[key] = { key: key, o: o, pjp: 0, keys: {} });
      if (k.indexOf('X:') !== 0) G.pjp++;
      if (per[k]) G.keys[k] = 1;
    });
    var rows = Object.keys(groups).map(function (k) { var G = groups[k]; G.s = sellinGroupStats(G, per, null); return G; });
    var grp = state.sellinGroup || 'all';
    rows.sort(function (a, b) { return (grp === 'all' ? b.s.total - a.s.total : b.s[grp].amt - a.s[grp].amt) || a.key.localeCompare(b.key); });
    // region total row
    var T = { key: 'INNER JAKARTA (total)', o: null, pjp: 0, keys: {} };
    rows.forEach(function (G) { T.pjp += G.pjp; Object.keys(G.keys).forEach(function (k) { T.keys[k] = 1; }); });
    T.s = sellinGroupStats(T, per, null);
    return { rows: rows, total: T, per: per, loc: loc, grp: grp };
  }
  function sellinSummaryTable(feed, S) {
    var groupsDef = (feed.gaplok && feed.gaplok.product_groups) || {};
    var loc = S.loc, grp = S.grp;
    var locLabel = SELLIN_LOCS.filter(function (l) { return l[0] === loc; })[0][1];
    function pct(a, b) { return b ? pctOf(a, b) + '%' : '—'; }
    var head, body;
    if (grp === 'all') {
      head = '<tr><th rowspan="2">' + locLabel + '</th><th rowspan="2">Parent</th><th rowspan="2" class="num">PJP outlets</th>' +
        '<th colspan="5" style="text-align:center; border-bottom:1px solid var(--ij-hairline);">SIM / Starter Pack</th>' +
        '<th colspan="6" style="text-align:center; border-bottom:1px solid var(--ij-hairline);">Vouchers</th>' +
        '<th colspan="5" style="text-align:center; border-bottom:1px solid var(--ij-hairline);">Saldo (MOBO)</th>' +
        '<th rowspan="2" class="num">Total amount</th></tr>' +
        '<tr>' + th('Outlets ≥1 SP', 1) + th('% PJP', 1) + th('Pcs', 1) + th('Amount', 1) + th('UAR 3 pcs', 1) +
        th('Outlets ≥5 pcs', 1) + th('% PJP', 1) + th('Pcs', 1) + th('Amount', 1) + th('UAR 10 pcs', 1) + th('Outlets ≥250K', 1) +
        th('Outlets', 1) + th('% PJP', 1) + th('Amount', 1) + th('Outlets ≥300K', 1) + th('Avg / outlet', 1) + '</tr>';
      body = function (G, bold) {
        var s = G.s, b = bold ? 'cur' : '';
        return '<tr class="' + b + '"><td class="cur"><b>' + esc(G.key) + '</b></td><td>' + (G.o ? sellinLocParent(loc, G.o, feed) : '') + '</td><td class="num">' + fmtCount(G.pjp) + '</td>' +
          '<td class="num">' + fmtCount(s.SP.active) + '</td><td class="num">' + pct(s.SP.active, G.pjp) + '</td><td class="num">' + fmtCount(s.SP.pcs) + '</td><td class="num">' + fmtRp(s.SP.amt) + '</td><td class="num">' + uarCell(s.SP.uar3, G.pjp) + '</td>' +
          '<td class="num">' + fmtCount(s.VC.active) + '</td><td class="num">' + pct(s.VC.active, G.pjp) + '</td><td class="num">' + fmtCount(s.VC.pcs) + '</td><td class="num">' + fmtRp(s.VC.amt) + '</td><td class="num">' + uarCell(s.VC.uar10, G.pjp) + '</td><td class="num">' + uarCell(s.VC.amt250, G.pjp) + '</td>' +
          '<td class="num">' + fmtCount(s.SALDO.active) + '</td><td class="num">' + pct(s.SALDO.active, G.pjp) + '</td><td class="num">' + fmtRp(s.SALDO.amt) + '</td><td class="num">' + uarCell(s.SALDO.ge300, G.pjp) + '</td><td class="num">' + fmtRp(s.SALDO.active ? s.SALDO.amt / s.SALDO.active : 0) + '</td>' +
          '<td class="num cur"><b>' + fmtRp(s.total) + '</b></td></tr>';
      };
    } else if (grp === 'SALDO') {
      var buckets = (groupsDef.SALDO && groupsDef.SALDO.buckets) || [];
      head = '<tr>' + th(locLabel) + th('Parent') + th('PJP outlets', 1) + th('Outlets with saldo', 1) + th('% PJP', 1) + th('Saldo amount', 1) + th('Avg / outlet', 1) + th('Outlets ≥300K (OSA)', 1) + th('% ≥300K', 1) +
        buckets.map(function (b) { return th(b[1], 1); }).join('') + '</tr>';
      body = function (G, bold) {
        var s = G.s.SALDO;
        return '<tr><td class="cur"><b>' + esc(G.key) + '</b></td><td>' + (G.o ? sellinLocParent(loc, G.o, feed) : '') + '</td><td class="num">' + fmtCount(G.pjp) + '</td><td class="num">' + fmtCount(s.active) + '</td><td class="num">' + pct(s.active, G.pjp) + '</td>' +
          '<td class="num cur"><b>' + fmtRp(s.amt) + '</b></td><td class="num">' + fmtRp(s.active ? s.amt / s.active : 0) + '</td><td class="num">' + fmtCount(s.ge300) + '</td><td class="num">' + pct(s.ge300, G.pjp) + '</td>' +
          buckets.map(function (b) { return '<td class="num">' + uarCell(s.b[b[0]] || 0, G.pjp) + '</td>'; }).join('') + '</tr>';
      };
    } else {
      var denoms = ((groupsDef[grp] || {}).denominations || []).filter(function (d) { return d.skus.length; });
      var minLbl = grp === 'SP' ? 'Outlets ≥1 SP' : 'Outlets ≥5 pcs', uarLbl = grp === 'SP' ? 'UAR 3 pcs' : 'UAR 10 pcs';
      head = '<tr>' + th(locLabel) + th('Parent') + th('PJP outlets', 1) + th(minLbl, 1) + th('% PJP', 1) + th('Pcs', 1) + th('Amount', 1) + th(uarLbl, 1) + (grp === 'VC' ? th('Outlets ≥250K', 1) : '') +
        denoms.map(function (d) { return th(d.label + ' (pcs)', 1); }).join('') + '</tr>';
      body = function (G, bold) {
        var s = G.s[grp];
        return '<tr><td class="cur"><b>' + esc(G.key) + '</b></td><td>' + (G.o ? sellinLocParent(loc, G.o, feed) : '') + '</td><td class="num">' + fmtCount(G.pjp) + '</td><td class="num">' + fmtCount(s.active) + '</td><td class="num">' + pct(s.active, G.pjp) + '</td>' +
          '<td class="num">' + fmtCount(s.pcs) + '</td><td class="num cur"><b>' + fmtRp(s.amt) + '</b></td><td class="num">' + uarCell(grp === 'SP' ? s.uar3 : s.uar10, G.pjp) + '</td>' + (grp === 'VC' ? '<td class="num">' + uarCell(s.amt250, G.pjp) + '</td>' : '') +
          denoms.map(function (d) { return '<td class="num">' + fmtCount(s.d[d.key] || 0) + '</td>'; }).join('') + '</tr>';
      };
    }
    var rows = S.rows.map(function (G) { return body(G, false); }).join('') + body(S.total, true);
    return '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>';
  }
  function sellinDenomTable(feed, S) {
    // denomination breakdown for the current scope (all outlets in S.total)
    var groupsDef = (feed.gaplok && feed.gaplok.product_groups) || {};
    var grp = state.sellinGroup || 'all';
    var keys = grp === 'all' ? ['SP', 'VC', 'SALDO'] : [grp];
    var per = S.per, T = S.total;
    var rows = [];
    keys.forEach(function (g) {
      var def = groupsDef[g] || { denominations: [] };
      def.denominations.forEach(function (d) {
        var active = 0, min = 0, pcs = 0, amt = 0;
        Object.keys(T.keys).forEach(function (k) {
          var P = per[k]; if (!P || !P[g]) return;
          var v = P[g].d[d.key] || 0; if (!v) return;
          active++; pcs += v;
          if (g === 'SP' ? v >= 1 : g === 'VC' ? v >= 5 : v >= 300000) min++;
        });
        if (g === 'SALDO') amt = T.s.SALDO.amt; else {
          // amount per denomination from facts
          amt = 0;
        }
        rows.push({ g: g, label: d.label, note: d.note || '', active: active, min: min, pcs: pcs, amt: amt, nosku: !d.skus.length });
      });
    });
    // amounts per denomination from facts
    var amtByDenom = {};
    sellinFacts(feed).forEach(function (f) { amtByDenom[f[16]] = (amtByDenom[f[16]] || 0) + f[6]; });
    var denomKeyByLabel = {};
    keys.forEach(function (g) { ((groupsDef[g] || {}).denominations || []).forEach(function (d) { denomKeyByLabel[d.label] = d.key; }); });
    var trs = rows.map(function (r) {
      var minLbl = r.g === 'SP' ? '≥1 pc' : r.g === 'VC' ? '≥5 pcs' : '≥300K';
      if (r.nosku) return '<tr><td>' + esc(SELLIN_GROUPS.filter(function (x) { return x[0] === r.g; })[0][1]) + '</td><td class="cur">' + esc(r.label) + '</td><td colspan="6" class="note">' + esc(r.note) + '</td></tr>';
      var a = r.g === 'SALDO' ? r.amt : (amtByDenom[denomKeyByLabel[r.label]] || 0);
      return '<tr><td>' + esc(SELLIN_GROUPS.filter(function (x) { return x[0] === r.g; })[0][1]) + '</td><td class="cur"><b>' + esc(r.label) + '</b></td><td class="num">' + fmtCount(T.pjp) + '</td><td class="num">' + uarCell(r.active, T.pjp) + '</td><td class="num">' + fmtCount(r.min) + ' (' + minLbl + ')</td><td class="num">' + pctOf(r.min, T.pjp) + '%</td><td class="num">' + (r.g === 'SALDO' ? fmtRp(r.pcs) : fmtCount(r.pcs)) + '</td><td class="num cur"><b>' + fmtRp(a) + '</b></td></tr>';
    }).join('');
    return '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('Group') + th('Denomination') + th('PJP outlets', 1) + th('Outlets with any', 1) + th('Outlets at threshold', 1) + th('% PJP', 1) + th('Pcs / saldo', 1) + th('Amount', 1) + '</tr></thead><tbody>' + trs + '</tbody></table></div>';
  }
  function exportSellinSummaryCsv(feed, S) {
    if (typeof window === 'undefined') return;
    function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var lines = [['Location', 'PJP outlets', 'SP outlets >=1', 'SP pcs', 'SP amount', 'SP UAR 3 pcs', 'VC outlets >=5 pcs', 'VC pcs', 'VC amount', 'VC UAR 10 pcs', 'VC outlets >=250K', 'Saldo outlets', 'Saldo amount', 'Saldo outlets >=300K', 'Total amount'].map(q).join(',')];
    S.rows.concat([S.total]).forEach(function (G) {
      var s = G.s;
      lines.push([G.key, G.pjp, s.SP.active, s.SP.pcs, s.SP.amt, s.SP.uar3, s.VC.active, s.VC.pcs, s.VC.amt, s.VC.uar10, s.VC.amt250, s.SALDO.active, s.SALDO.amt, s.SALDO.ge300, s.total].map(q).join(','));
    });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'sellin_gaplok_summary_' + (state.sellinLoc || 'area') + '.csv';
    link.click();
  }

  var SELLIN_TABS = [['all', '📋 Summary (all)'], ['SALDO', '💳 Saldo'], ['SP', '📱 SP / SIM'], ['VC', '🎫 Vouchers']];
  function viewSellin() {
    var feed = sellinFeed();
    if (!feed) return card('Sell-In Monitoring', '<p class="note">Feed not loaded. Run <code>python3 scripts/build_sellin_feed.py</code> and reload.</p>');
    var tab = state.sellinTab || 'all';
    state.sellinGroup = tab;
    var m = feed.metadata, days = m.days;
    var dayMax = (state.sellinDay == null || state.sellinDay < 0) ? days.length - 1 : state.sellinDay;
    var asOf = days[dayMax];
    var c = sellinCompute(feed);
    var S = sellinSummaryRows(feed, c.facts);
    var T = S.total, st = T.s;
    var tabLabel = SELLIN_TABS.filter(function (t) { return t[0] === tab; })[0][1].replace(/^\S+\s/, '');
    var locLabel = SELLIN_LOCS.filter(function (l) { return l[0] === (state.sellinLoc || 'area'); })[0][1];
    var scopeLbl = (state.branch || state.hoa || state.kec) ? esc(scopeText()) : 'All Inner Jakarta';

    // 1. Sub-tabs (drive the product group everywhere) + one filter row
    var tabNav = '<div class="sub-nav" role="tablist">' + SELLIN_TABS.map(function (t) {
      var active = tab === t[0];
      return '<button type="button" role="tab" class="sub-nav-btn' + (active ? ' active' : '') + '" data-sellin-tab="' + t[0] + '" aria-selected="' + active + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    var dayBtns = [['-1', 'All days']].concat(days.map(function (d, i) { return [String(i), d.slice(8)]; }));
    var toolbar = '<div class="map-toolbar" style="margin-top:8px;">' +
      sellinBtnGroup('Territory', 'sellin-loc', SELLIN_LOCS, state.sellinLoc || 'area') +
      sellinBtnGroup('Brand', 'sellin-brand', [['all', 'All'], ['IM3', 'IM3'], ['3ID', '3ID']], state.sellinBrand || 'all') +
      sellinBtnGroup('Flow', 'sellin-flow', [['all', 'All'], ['DSE', 'DSE → Outlet'], ['MPX', 'MPX → Outlet'], ['SDP', 'SDP → Outlet'], ['UNK', 'Unidentified']], state.sellinFlow || 'all') +
    '</div>' +
    '<div class="map-toolbar" style="margin-top:6px;">' +
      sellinBtnGroup('As of day (Oct)', 'sellin-day', dayBtns, String(state.sellinDay == null ? -1 : state.sellinDay)) +
      '<div class="map-toolbar-group">' +
        '<input type="text" id="sellinSearchInput" aria-label="Search outlet, site, DSE, MC, product or distributor" placeholder="🔍 Search outlet, site, DSE, MC, product, distributor..." value="' + esc(state.sellinSearch || '') + '" class="map-select" style="min-width:240px;">' +
        '<button type="button" class="btn" data-act="export-sellin-summary-csv">📥 Export summary CSV</button>' +
      '</div>' +
    '</div>';

    // 2. KPI cards per tab
    var pjp = T.pjp, kp;
    var ndse = {}; c.facts.forEach(function (f) { if (f[8]) ndse[f[8]] = 1; }); ndse = Object.keys(ndse).length;
    var periodNote = scopeLbl + ' · ' + m.period_start + ' to ' + asOf;
    if (tab === 'SP') {
      var topSp = Object.keys(st.SP.d).sort(function (x, y) { return st.SP.d[y] - st.SP.d[x]; })[0];
      kp = kpi('SP Pieces Sold In', fmtCount(st.SP.pcs), 'Starter packs', 'up', periodNote) +
        kpi('SP Amount', fmtRp(st.SP.amt), 'QTY × rate per SKU', 'up', fmtCount(c.facts.length) + ' transactions') +
        kpi('Outlets ≥ 1 SP (UAR)', fmtCount(st.SP.active), pctOf(st.SP.active, pjp) + '% of ' + fmtCount(pjp) + ' PJP outlets', st.SP.active / Math.max(pjp, 1) >= 0.3 ? 'up' : 'down', 'GAPLOK "# outlet min 1 SP"') +
        kpi('UAR 3 pcs', fmtCount(st.SP.uar3), pctOf(st.SP.uar3, pjp) + '% of PJP', 'up', 'Outlets with ≥ 3 starter packs') +
        kpi('Active DSEs', fmtCount(ndse), 'DSEs with ≥ 1 SP sell-in', 'up', 'Login = master DSE code, else outlet DSE') +
        kpi('Avg Pcs per Active Outlet', (st.SP.active ? (st.SP.pcs / st.SP.active).toFixed(1) : '0'), 'Drop size (pcs)', 'up', 'SP pcs ÷ outlets ≥ 1 SP') +
        kpi('Avg Amount per Active DSE', fmtRp(ndse ? st.SP.amt / ndse : 0), 'DSE productivity', 'up', 'SP amount ÷ active DSEs') +
        kpi('Top Denomination', esc(topSp ? topSp.replace(/_/g, ' ') : '—'), topSp ? fmtCount(st.SP.d[topSp]) + ' pcs' : '', 'up', 'By pieces in scope');
    } else if (tab === 'VC') {
      var topVc = Object.keys(st.VC.d).sort(function (x, y) { return st.VC.d[y] - st.VC.d[x]; })[0];
      kp = kpi('Voucher Pieces Sold In', fmtCount(st.VC.pcs), 'Physical vouchers', 'up', periodNote) +
        kpi('Voucher Amount', fmtRp(st.VC.amt), 'QTY × rate per SKU', 'up', fmtCount(c.facts.length) + ' transactions') +
        kpi('Outlets ≥ 5 pcs (UAR)', fmtCount(st.VC.active), pctOf(st.VC.active, pjp) + '% of ' + fmtCount(pjp) + ' PJP outlets', st.VC.active / Math.max(pjp, 1) >= 0.3 ? 'up' : 'down', 'GAPLOK "# outlet min 5 pcs"') +
        kpi('UAR 10 pcs', fmtCount(st.VC.uar10), pctOf(st.VC.uar10, pjp) + '% of PJP', 'up', 'Outlets with ≥ 10 voucher pcs') +
        kpi('Outlets ≥ Rp 250K', fmtCount(st.VC.amt250), pctOf(st.VC.amt250, pjp) + '% of PJP', 'up', 'Voucher amount per outlet') +
        kpi('Active DSEs', fmtCount(ndse), 'DSEs with ≥ 1 voucher sell-in', 'up', 'Login = master DSE code, else outlet DSE') +
        kpi('Avg Pcs per Active Outlet', (st.VC.active ? (st.VC.pcs / st.VC.active).toFixed(1) : '0'), 'Drop size (pcs)', 'up', 'Voucher pcs ÷ outlets ≥ 5 pcs') +
        kpi('Top Denomination', esc(topVc ? topVc.replace(/_/g, ' ') : '—'), topVc ? fmtCount(st.VC.d[topVc]) + ' pcs' : '', 'up', 'By pieces in scope');
    } else if (tab === 'SALDO') {
      kp = kpi('Saldo Transferred', fmtRp(st.SALDO.amt), 'E-Voucher balance to outlets', 'up', periodNote) +
        kpi('Outlets with Saldo (UAR)', fmtCount(st.SALDO.active), pctOf(st.SALDO.active, pjp) + '% of ' + fmtCount(pjp) + ' PJP outlets', st.SALDO.active / Math.max(pjp, 1) >= 0.3 ? 'up' : 'down', 'Outlets with ≥ 1 transfer') +
        kpi('Outlets ≥ Rp 300K (OSA)', fmtCount(st.SALDO.ge300), pctOf(st.SALDO.ge300, pjp) + '% of PJP', 'up', 'GAPLOK OSA DSE productivity threshold') +
        kpi('Avg Saldo per Active Outlet', fmtRp(st.SALDO.active ? st.SALDO.amt / st.SALDO.active : 0), 'Drop size', 'up', 'Saldo ÷ outlets with saldo') +
        kpi('Active DSEs', fmtCount(ndse), 'DSEs with ≥ 1 transfer', 'up', 'Login = master DSE code, else outlet DSE') +
        kpi('Transactions', fmtCount(c.facts.length), 'Balance transfers', 'up', 'MOBI Transfer Balance') +
        kpi('Outlets < Rp 50K', fmtCount(st.SALDO.b.LT50K), pctOf(st.SALDO.b.LT50K, st.SALDO.active) + '% of saldo outlets', 'down', 'Low-value bucket') +
        kpi('Outlets Rp 100K – 300K', fmtCount(st.SALDO.b['100_300K']), pctOf(st.SALDO.b['100_300K'], st.SALDO.active) + '% of saldo outlets', 'up', 'Mid bucket; ≥ 300K shown above');
    } else {
      var uarAll = Object.keys(T.keys).length;
      kp = kpi('Physical Units Sold In', fmtCount(st.SP.pcs + st.VC.pcs), fmtCount(st.VC.pcs) + ' vouchers · ' + fmtCount(st.SP.pcs) + ' starter packs', 'up', periodNote) +
        kpi('Physical Amount', fmtRp(st.SP.amt + st.VC.amt), 'QTY × rate per SKU', 'up', 'Starter packs and vouchers') +
        kpi('Saldo Transferred', fmtRp(st.SALDO.amt), 'E-Voucher balance to outlets', 'up', 'MOBI balance transfer') +
        kpi('Total Sell-In Value', fmtRp(st.total), 'Physical + saldo', 'up', fmtCount(c.facts.length) + ' transactions') +
        kpi('UAR · Unique Active Retailers', fmtCount(uarAll), pctOf(uarAll, pjp) + '% of ' + fmtCount(pjp) + ' PJP outlets', uarAll / Math.max(pjp, 1) >= 0.5 ? 'up' : 'down', 'Outlets with at least one Sell-In') +
        kpi('Active DSEs', fmtCount(ndse), 'DSEs with at least one Sell-In', 'up', 'Login = master DSE code, else outlet DSE') +
        kpi('Avg Value per Active Outlet', fmtRp(uarAll ? st.total / uarAll : 0), 'Drop size', 'up', 'Total value ÷ UAR') +
        kpi('Avg Value per Active DSE', fmtRp(ndse ? st.total / ndse : 0), 'DSE productivity', 'up', 'Total value ÷ active DSEs');
    }
    var kpis = '<div class="kpis" style="margin-top:10px;">' + kp + '</div>';

    // 3. Summary by territory (GAPLOK layout)
    var summary = card('Sell-In Summary · ' + tabLabel + ' by ' + locLabel + ' · ' + m.period_start + ' to ' + asOf,
      sellinSummaryTable(feed, S) +
      '<p class="note">PJP outlets = master outlets in scope. SP active = outlet with ≥ 1 starter pack, UAR 3 pcs = ≥ 3. Voucher active = outlet with ≥ 5 pcs, UAR 10 pcs = ≥ 10, ≥ 250K = voucher amount per outlet. Saldo ≥ 300K = GAPLOK OSA DSE productivity threshold. Month-over-month (AGS vs SEP) appears once September exports are loaded.</p>');

    // 4. Daily progression per territory
    var P = sellinProgression(feed, c.facts, tab);
    var metricItems = [['qty', tab === 'SALDO' ? 'Saldo (Rp)' : 'Quantity (pcs)'], ['uar', 'UAR (outlets at threshold)'], ['amt', 'Amount (Rp)']];
    var progToolbar = '<div class="map-toolbar" style="margin-bottom:8px;">' +
      sellinBtnGroup('Metric', 'sellin-pm', metricItems, state.sellinProgMetric || 'qty') +
      sellinBtnGroup('Mode', 'sellin-pmode', [['cum', 'Cumulative (MTD progression)'], ['daily', 'Daily']], state.sellinProgMode || 'cum') +
    '</div>';
    var prog = card('Daily Progression · ' + tabLabel + ' per ' + locLabel + ' · ' + m.period_start + ' to ' + asOf,
      progToolbar + sellinProgressionTable(feed, P, tab) +
      '<p class="note">UAR cells show the count and its share of the territory\'s PJP outlets. UAR threshold per tab: Summary = any sell-in; Saldo = any transfer; SP = ≥ 1 pc; Vouchers = ≥ 5 pcs. Cumulative UAR counts outlets whose running total up to that day meets the threshold; Daily UAR counts outlets meeting it within the day. Use "As of day" above to cut the whole page at a date.</p>');

    // 5. Denomination breakdown (SP, Vouchers, Summary)
    var denom = tab === 'SALDO' ? '' : card('Denomination Breakdown · ' + tabLabel + ' · ' + scopeLbl, sellinDenomTable(feed, S) +
      '<p class="note">Denominations follow the GAPLOK columns. Injection products are digital and will come from the MOBO transaction details.</p>');

    // 6. Details by level (Region → Outlet), ranked table
    var level = c.level;
    var levelLabel = SELLIN_LEVELS.filter(function (l) { return l[0] === level; })[0][1];
    var levelNav = '<div class="sub-nav" role="tablist" style="margin-bottom:8px;">' + SELLIN_LEVELS.map(function (l, i) {
      var active = level === l[0];
      return '<button type="button" role="tab" class="sub-nav-btn' + (active ? ' active' : '') + '" data-sellin-level="' + l[0] + '" aria-selected="' + active + '">' + (i + 1) + '. ' + l[1] + '</button>';
    }).join('') + '<button type="button" class="btn" data-act="export-sellin-csv" style="margin-left:auto;">📥 Export ' + levelLabel + ' CSV</button></div>';
    var rows = c.rows;
    var page = state.sellinPage || 1, pageSize = state.sellinPageSize || 50;
    var totalPages = Math.ceil(rows.length / pageSize) || 1;
    if (page > totalPages) { page = totalPages; state.sellinPage = page; }
    var start = (page - 1) * pageSize;
    var slice = rows.slice(start, start + pageSize);
    var maxRow = rows.length ? rows[0].val : 1;
    var trs = slice.map(function (G, i) {
      var base = c.base[G.key] || 0;
      var name = level === 'outlet' ? '<b>' + esc((G.o && G.o.outlet_name) || '—') + '</b><br><code>' + esc(G.key) + '</code>' : '<b>' + esc(G.key) + '</b>';
      var drill = '';
      if (level === 'area' && G.o) drill = '<button type="button" class="btn" data-sellin-drill="area" data-br="' + esc(G.key) + '" style="font-size:14px; padding:5px 9px;">MCs &#8594;</button>';
      else if (level === 'mc' && G.o) drill = '<button type="button" class="btn" data-sellin-drill="mc" data-br="' + esc(G.o.branch) + '" data-mc="' + esc(G.key) + '" style="font-size:14px; padding:5px 9px;">Kecamatan &#8594;</button>';
      var bar = '<div class="progress-bar-cell"><div class="progress-bar-fill" style="width:' + (maxRow ? Math.round(G.val / maxRow * 100) : 0) + '%;"></div><span class="progress-bar-label">' + fmtRp(G.val) + '</span></div>';
      return '<tr><td class="num">' + (start + i + 1) + '</td><td class="cur">' + name + '</td><td>' + sellinRowParent(level, G) + '</td>' +
        '<td class="num">' + fmtCount(G.tx) + '</td><td class="num">' + fmtCount(G.vc) + '</td><td class="num">' + fmtCount(G.sp) + '</td>' +
        '<td class="num">' + fmtRp(G.ev) + '</td><td class="num">' + fmtRp(G.pval) + '</td><td class="num cur"><b>' + fmtRp(G.val) + '</b></td><td>' + bar + '</td>' +
        '<td class="num cur"><b>' + fmtCount(G.uar) + '</b></td><td class="num">' + (base ? fmtCount(base) : '—') + '</td><td class="num">' + (base ? pctOf(G.uar, base) + '%' : '—') + '</td>' +
        '<td class="num">' + fmtCount(G.ndse) + '</td><td class="num">' + fmtRp(G.uar ? G.val / G.uar : 0) + '</td><td class="num">' + G.ndays + '/' + days.length + '</td><td>' + drill + '</td></tr>';
    }).join('');
    var TT = { tx: 0, vc: 0, sp: 0, ev: 0, pval: 0, val: 0, uar: 0, base: 0, ndse: 0 };
    rows.forEach(function (G) { TT.tx += G.tx || 0; TT.vc += G.vc || 0; TT.sp += G.sp || 0; TT.ev += G.ev || 0; TT.pval += G.pval || 0; TT.val += G.val || 0; TT.uar += G.uar || 0; TT.base += c.base[G.key] || 0; TT.ndse += G.ndse || 0; });
    if (rows.length > 1) trs += '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td></td><td class="cur" style="background:var(--ink); color:#fff;">TOTAL · ' + fmtCount(rows.length) + ' ' + esc(levelLabel) + '</td><td></td><td class="num">' + fmtCount(TT.tx) + '</td><td class="num">' + fmtCount(TT.vc) + '</td><td class="num">' + fmtCount(TT.sp) + '</td>' +
      '<td class="num">' + fmtRp(TT.ev) + '</td><td class="num">' + fmtRp(TT.pval) + '</td><td class="num">' + fmtRp(TT.val) + '</td><td></td><td class="num">' + fmtCount(TT.uar) + '</td><td class="num">' + (TT.base ? fmtCount(TT.base) : '—') + '</td><td class="num">' + (TT.base ? pctOf(TT.uar, TT.base) + '%' : '—') + '</td><td class="num">' + fmtCount(TT.ndse) + '</td><td class="num">' + fmtRp(TT.uar ? TT.val / TT.uar : 0) + '</td><td></td><td></td></tr>';
    var pag = rows.length > pageSize ? '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">' +
      '<span class="note">Showing ' + (start + 1) + '–' + Math.min(start + pageSize, rows.length) + ' of ' + fmtCount(rows.length) + '</span>' +
      '<div style="display:flex; gap:6px;">' +
        '<button type="button" class="btn" data-sellin-page="prev"' + (page <= 1 ? ' disabled style="opacity:0.5;"' : '') + '>&larr; Previous</button>' +
        '<span style="padding:4px 8px; font:700 15px var(--ij-font);">Page ' + page + ' of ' + totalPages + '</span>' +
        '<button type="button" class="btn" data-sellin-page="next"' + (page >= totalPages ? ' disabled style="opacity:0.5;"' : '') + '>Next &rarr;</button>' +
      '</div></div>' : '<p class="note">' + fmtCount(rows.length) + ' row(s).</p>';
    var details = card('Details by Level · ' + tabLabel + ' · ' + levelLabel + ' ranked by amount', levelNav +
      '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('#', 1) + th(levelLabel) + th('Parent') + th('Tx', 1) + th('Voucher units', 1) + th('SP units', 1) + th('Saldo', 1) + th('Physical value', 1) + th('Total value', 1) + th('Value bar') +
      th('UAR (any)', 1) + th('Master outlets', 1) + th('UAR %', 1) + th('Active DSEs', 1) + th('Avg / outlet', 1) + th('Active days', 1) + th('Drill') +
      '</tr></thead><tbody>' + trs + '</tbody></table></div>' + pag);

    var note = '<p class="note" style="margin-top:8px;">Source: MOBI Physical Distribution Summary (Sell In) and MOBI Transfer Balance, ' + m.period_start + ' to ' + m.period_end + '. ' + fmtCount(m.facts) + ' outlet-bound rows; bulk MPX → MP3 and MPX → DSE excluded by scope; ' + fmtCount(m.dropped['outside Inner Jakarta MCs'] || 0) + ' rows outside Inner Jakarta dropped; ' + fmtCount(m.unmapped_outlets) + ' outlets not in the master catalogue kept with their MC from the file. Territory chain: Area (7 branches, master) → Micro Cluster (36) → CSE / DSO leader; the GAPLOK layout is used for the KPI columns and product groups.</p>';
    return tabNav + toolbar + kpis + summary + prog + denom + details + note;
  }


  /* ================= PENJUALAN · Sell-In produk ke outlet (DAILY_DATA_MOBII) ================= */
  var PJ_CATS_BASE = [['SP', 'Starter Pack'], ['VCF', 'Voucher isi'], ['VCB', 'Voucher blank'], ['SALMO', 'Saldo Mobo']];
  function pjCats() { return pjSpiOn() ? PJ_CATS_BASE.concat([['SPI', 'SP Injection']]) : PJ_CATS_BASE; }
  var PJ_CAT_LABEL = { SP: 'Starter Pack', VCF: 'Voucher isi', VCB: 'Voucher blank', SALMO: 'Saldo Mobo', SPI: 'SP Injection', all: 'Semua kategori' };
  var PJ_TABS = [['ringkasan', '📊 Ringkasan'], ['teritori', '🏢 Per Teritori'], ['heat', '🗓️ Heatmap Harian'], ['slab', '🧮 Matriks Slab'], ['sga', '📶 Slab Sellin & Saldo'], ['produk', '📦 Produk'], ['outlet', '🏪 Outlet']];
  var PJ_LEVELS = [['auto', '⚙️ Otomatis · ikut filter'], ['area', 'Area (Branch)'], ['mc', 'Micro Cluster'], ['dse', 'DSE'], ['outlet', 'Outlet']];
  var PJ_LEVEL_LABEL = { area: 'per Area (Branch)', mc: 'per Micro Cluster', dse: 'per DSE', outlet: 'per Outlet' };
  var PJ_TIER_LABEL = { DSE: 'Node DSE / Canvasser', MPC: 'Distributor (MPC)', MP3: 'Sub-distributor (MP3)', SDP: 'SDP', OTHER: 'Stockist / node lain', OUTLET_MOBI: 'Outlet (hanya di laporan MOBI)', UNKNOWN: 'Tidak dikenal' };
  function pjFeedRaw() { return (typeof window !== 'undefined' && window.PENJUALAN_FEED) ? window.PENJUALAN_FEED : (typeof PENJUALAN_FEED !== 'undefined' ? PENJUALAN_FEED : null); }
  /* SP Injection (MOBO, digital) is part of Sell-In; toggle "Termasuk SP Injection" (default on). Off = feed view without the SPI category. */
  function pjSpiOn() { return state.pjSpi !== false; }
  function pjSpiBase() { var F = pjFeedRaw(); return !!(F && F.metadata && F.metadata.spi && F.metadata.spi.has_baseline); }
  function pjFeed() {
    var F = pjFeedRaw();
    if (!F || pjSpiOn() || !(F.metadata && F.metadata.spi)) return F;
    if (F._noSpi) return F._noSpi;
    var V = {}; Object.keys(F).forEach(function (k) { V[k] = F[k]; });
    V.outlets = F.outlets.map(function (o) {
      if (!o.c.SPI) return o;
      var c = {}; Object.keys(o.c).forEach(function (k) { if (k !== 'SPI') c[k] = o.c[k]; });
      var n = {}; Object.keys(o).forEach(function (k) { n[k] = o[k]; }); n.c = c; return n;
    }).filter(function (o) { return Object.keys(o.c).length > 0; });
    V.mc_daily = (F.mc_daily || []).filter(function (r) { return r.cat !== 'SPI'; });
    F._noSpi = V; return V;
  }
  function pjRp(v) {
    // Satuan Indonesia: T = triliun, M = milyar, Jt = juta, Rb = ribu
    v = v || 0; var a = Math.abs(v);
    if (a >= 1e12) return 'Rp ' + (v / 1e12).toFixed(2) + ' T';
    if (a >= 1e9) return 'Rp ' + (v / 1e9).toFixed(2) + ' M';
    if (a >= 1e6) return 'Rp ' + (v / 1e6).toFixed(1) + ' Jt';
    if (a >= 1e3) return 'Rp ' + Math.round(v / 1e3) + ' Rb';
    return 'Rp ' + Math.round(v);
  }
  function pjGrowthPct(m, l) { return l ? (m / l - 1) * 100 : null; }
  function pjGrowth(m, l) {
    var g = pjGrowthPct(m, l);
    if (g == null) return m ? '<span class="good-tag">baru</span>' : '<span class="note">—</span>';
    return '<span class="' + (g >= 0 ? 'good-tag' : 'alert-tag') + '">' + (g >= 0 ? '+' : '') + g.toFixed(1) + '%</span>';
  }
  function pjDim(o, F) { var mi = (F.metadata.mc_info || {})[o.mc] || {}; return { br: o.br || mi.br || 'OUTSIDE MASTER TERRITORY', hoa: mi.hoa || '—', dso: mi.dso || '—' }; }
  function pjInScope(o, F) {
    var d = pjDim(o, F);
    if (state.branch && d.br !== state.branch) return false;
    if (state.hoa && d.hoa !== state.hoa) return false;
    if (state.kec && o.mc !== state.kec) return false;
    if (state.pjDse && o.dse !== state.pjDse) return false;
    var b = state.pjBrand || 'all';
    if (b !== 'all' && o.b !== b) return false;
    return true;
  }
  function pjOutlets(F) { return (F.outlets || []).filter(function (o) { return pjInScope(o, F); }); }
  function pjEmptyAgg() { return { mv: 0, mq: 0, lv: 0, lq: 0, fv: 0, fq: 0, om: 0, ol: 0, mvx: 0, mqx: 0 }; }
  /* MTD used for growth / gap: SP Injection has no LMTD / Sep baseline yet, so it is left out of like-for-like comparisons */
  function pjMx(a) { return a.mvx != null ? a.mvx : a.mv; }
  function pjAgg(rows) {
    var A = { tot: pjEmptyAgg() };
    pjCats().forEach(function (c) { A[c[0]] = pjEmptyAgg(); });
    rows.forEach(function (o) {
      var anyM = false, anyL = false;
      Object.keys(o.c).forEach(function (cat) {
        var f = o.c[cat], a = A[cat]; if (!a) return;
        a.mq += f[0]; a.mv += f[1]; a.lq += f[2]; a.lv += f[3]; a.fq += f[4]; a.fv += f[5];
        if (f[1] > 0) { a.om++; anyM = true; } if (f[3] > 0) { a.ol++; anyL = true; }
        A.tot.mq += f[0]; A.tot.mv += f[1]; A.tot.lq += f[2]; A.tot.lv += f[3]; A.tot.fq += f[4]; A.tot.fv += f[5];
        if (cat !== 'SPI' || pjSpiBase()) { A.tot.mvx += f[1]; A.tot.mqx += f[0]; }
      });
      if (anyM) A.tot.om++; if (anyL) A.tot.ol++;
    });
    return A;
  }
  function pjCat() { return state.pjCat || 'all'; }
  function pjMasterInScope(F) {
    var mc = F.metadata.master_counts || {}, mi = F.metadata.mc_info || {};
    if (state.kec) return (mc.mc || {})[state.kec] || 0;
    if (state.branch) return (mc.br || {})[state.branch] || 0;
    if (state.hoa) { var s = 0; Object.keys(mc.br || {}).forEach(function (b) { var any = Object.keys(mi).some(function (m) { return mi[m].br === b && mi[m].hoa === state.hoa; }); if (any) s += mc.br[b]; }); return s; }
    var t = 0; Object.keys(mc.br || {}).forEach(function (b) { t += mc.br[b]; }); return t;
  }
  function pjDailyMtd(rows, cat, n) {
    var s = []; for (var i = 0; i < n; i++) s.push(0);
    rows.forEach(function (o) { Object.keys(o.c).forEach(function (c) { if (cat !== 'all' && c !== cat) return; (o.c[c][10] || []).forEach(function (p) { if (p[0] <= n) s[p[0] - 1] += p[1]; }); }); });
    return s;
  }
  function pjDailyMc(F, cat, n) {
    var l = [], m = []; for (var i = 0; i < n; i++) { l.push(0); m.push(0); }
    var b = state.pjBrand || 'all', mi = F.metadata.mc_info || {};
    (F.mc_daily || []).forEach(function (r) {
      var d = mi[r.mc] || {};
      if (state.branch && d.br !== state.branch) return;
      if (state.hoa && d.hoa !== state.hoa) return;
      if (state.kec && r.mc !== state.kec) return;
      if (b !== 'all' && r.b !== b) return;
      if (cat !== 'all' && r.cat !== cat) return;
      r.l.forEach(function (c, i) { if (i < n) l[i] += c[1]; });
      r.m.forEach(function (c, i) { if (i < n) m[i] += c[1]; });
    });
    return { l: l, m: m };
  }
  function pjAutoLevel() { if (state.pjDse) return 'outlet'; if (state.kec) return 'dse'; if (state.branch || state.hoa) return 'mc'; return 'area'; }
  function pjLevel() { return pjAutoLevel(); }   // grouping always follows the territory filter
  function pjRowsAt(F, level) {
    var rows = pjOutlets(F), groups = {}, mc = F.metadata.master_counts || {}, cat = pjCat();
    rows.forEach(function (o) {
      var d = pjDim(o, F), key, label, parent, base;
      if (level === 'area') { key = d.br; label = d.br; parent = d.hoa; base = (mc.br || {})[d.br] || 0; }
      else if (level === 'mc') { key = o.mc || '—'; label = key; parent = d.br + ' · ' + d.dso; base = (mc.mc || {})[o.mc] || 0; }
      else if (level === 'dse') { key = o.dse; label = o.dse; parent = o.mc + ' · ' + d.br; base = (mc.dse || {})[o.dse] || 0; }
      else { key = o.k; label = o.n || o.id; parent = o.mc + ' · ' + o.dse; base = 1; }
      var G = groups[key];
      if (!G) G = groups[key] = { key: key, label: label, parent: parent, base: base, items: [], o: level === 'outlet' ? o : null };
      G.items.push(o);
    });
    var out = Object.keys(groups).map(function (k) {
      var G = groups[k]; G.agg = pjAgg(G.items);
      var a = cat === 'all' ? G.agg.tot : G.agg[cat];
      G.v = a.mv; G.lv = a.lv; G.q = a.mq; return G;
    });
    out.sort(function (a, b) { return b.v - a.v || b.lv - a.lv || String(a.label).localeCompare(String(b.label)); });
    return out;
  }
  function pjDetailBtn(level, G) {
    if (level === 'outlet') return '';
    var attr = level === 'area' ? 'data-br="' + esc(G.key) + '"' : (level === 'mc' ? 'data-mc="' + esc(G.key) + '"' : 'data-dse="' + esc(G.key) + '"');
    return '<button type="button" class="btn" data-pj-detail="' + level + '" ' + attr + ' style="font-size:11.5px; padding:5px 9px;">Detail &#8594;</button>';
  }
  function pjDayHead(F) {
    return (F.metadata.days_mtd || []).map(function (d) {
      var dt = new Date(d + 'T00:00:00'); var wd = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dt.getDay()];
      return '<th class="num" style="text-align:center; min-width:58px;">' + d.slice(8) + '<br><span style="font-weight:500;">' + wd + '</span></th>';
    }).join('');
  }
  function pjHeatCell(v, max) {
    if (!v) return '<td class="num" style="color:var(--ij-hairline); text-align:center;">·</td>';
    var a = 0.1 + 0.6 * Math.min(1, v / (max || 1));
    return '<td class="num" title="' + pjRp(v) + '" style="background:rgba(22,163,74,' + a.toFixed(2) + '); color:#111; text-align:center; font-weight:700; font-size:11.5px;">' + pjRp(v).replace('Rp ', '') + '</td>';
  }
  function pjLevelBar(F) {
    return state.pjDse ? '<div class="map-toolbar" style="margin-top:8px;"><div class="map-toolbar-group"><span class="map-label">DSE:</span><span class="good-tag" style="font-weight:800;">' + esc(state.pjDse) + '</span> <button type="button" class="btn" data-act="clear-pj-dse" style="font-size:11.5px; padding:5px 9px;">&#10005; Semua DSE</button></div></div>' : '';
  }
  function pjCatBar(withAll) {
    var cur = pjCat();
    return '<div class="map-toolbar-group"><span class="map-label">Kategori:</span>' +
      (withAll ? '<button type="button" class="map-btn' + (cur === 'all' ? ' active' : '') + '" data-pj-cat="all">Semua</button>' : '') +
      pjCats().map(function (c) { return '<button type="button" class="map-btn' + (cur === c[0] ? ' active' : '') + '" data-pj-cat="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
  }
  function pjPager(total, pageSize) {
    var page = state.pjPage || 1, totalPages = Math.ceil(total / pageSize) || 1;
    if (page > totalPages) { page = totalPages; state.pjPage = page; }
    var start = (page - 1) * pageSize;
    return { start: start, end: Math.min(start + pageSize, total), html: '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">' +
      '<span class="note">Menampilkan ' + (total ? start + 1 : 0) + '–' + Math.min(start + pageSize, total) + ' dari ' + fmtCount(total) + '</span>' +
      '<div style="display:flex; gap:6px;"><button type="button" class="btn" data-pj-page="prev"' + (page <= 1 ? ' disabled style="opacity:0.5;"' : '') + '>&larr; Sebelumnya</button>' +
      '<span style="padding:4px 8px; font:700 12.5px var(--ij-font);">Hal ' + page + ' / ' + totalPages + '</span>' +
      '<button type="button" class="btn" data-pj-page="next"' + (page >= totalPages ? ' disabled style="opacity:0.5;"' : '') + '>Berikutnya &rarr;</button></div></div>' };
  }

  function pjRekon(F) {
    var T = F.tiers || [], BF = F.metadata.blank_file || {};
    function tot(period, cats, tiers) { var v = 0; T.forEach(function (t) { if (t.period === period && cats.indexOf(t.cat) >= 0 && tiers.indexOf(t.tier) >= 0) v += t.v; }); return v; }
    var OUT = ['OUTLET_M', 'OUTLET_A'], ALLOC = ['DSE', 'MPC', 'MP3', 'SDP'], LAIN = ['OTHER', 'OUTLET_MOBI', 'UNKNOWN'];
    var groups = [['SP', ['SP']], ['VC', ['VCF', 'VCB']], ['SALMO', ['SALMO']]];
    var trs = '';
    groups.forEach(function (g) {
      ['MTD', 'LMTD'].forEach(function (per) {
        var o = tot(per, g[1], OUT), a = tot(per, g[1], ALLOC), l = tot(per, g[1], LAIN), rep = 0;
        if (g[0] === 'VC') ['IM3', '3ID'].forEach(function (b) { var bf = BF[per + '|' + b]; if (bf) rep += bf.repriced - bf.file_value; });
        var file = o + a + l - rep;
        trs += '<tr><td class="cur"><b>' + g[0] + '</b></td><td>' + per + '</td><td class="num"><b>' + pjRp(o) + '</b></td><td class="num">' + pjRp(a) + '</td><td class="num">' + pjRp(l) + '</td><td class="num">' + (rep ? (rep > 0 ? '−' : '+') + pjRp(Math.abs(rep)) : '·') + '</td><td class="num cur"><b>' + pjRp(file) + '</b></td></tr>';
      });
    });
    var blankNote = ['MTD', 'LMTD'].map(function (per) { return ['IM3', '3ID'].map(function (b) { var bf = BF[per + '|' + b]; return bf && bf.qty ? b + ' ' + per + ' Rp ' + Math.round(bf.file_value / bf.qty) + '/unit' : null; }).filter(Boolean).join(', '); }).join('; ');
    return card('Rekonsiliasi dengan sheet Sanity_Check di file yang sama',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Komoditas') + th('Periode') + th('Sell-In ke outlet (menu ini)', 1) + th('Alokasi DSE / MPC / MP3 / SDP', 1) + th('Node lain / tidak dikenal', 1) + th('Koreksi harga blank', 1) + th('= Total file (Sanity_Check)', 1) + '</tr></thead><tbody>' + trs + '</tbody></table></div>' +
      '<p class="note">Sanity_Check menjumlahkan semua baris sheet apa pun penerimanya. Menu ini hanya menghitung baris yang penerimanya outlet; stok yang masuk ke node DSE, distributor MPC, MP3 dan SDP tidak ditampilkan di menu ini, dan node lain (stockist FWA, id tidak dikenal) dipisah agar tidak dianggap penjualan ke outlet. Voucher blank dinilai ulang IM3 Rp ' + fmtCount(F.metadata.blank_price.IM3) + ' / 3ID Rp ' + fmtCount(F.metadata.blank_price['3ID']) + ' per unit; harga blank di file sendiri: ' + esc(blankNote) + '.</p>');
  }
  function pjRingkasan(F, rows, A) {
    var n = F.metadata.cut_day, days = F.metadata.days_mtd, ldays = F.metadata.days_lmtd;
    var mtdByCat = {}, lmByCat = {};
    pjCats().forEach(function (c) { mtdByCat[c[0]] = pjDailyMtd(rows, c[0], n); lmByCat[c[0]] = state.pjDse ? null : pjDailyMc(F, c[0], n).l; });
    var trs = '';
    for (var i = 0; i < n; i++) {
      var tot = 0, totx = 0, ltot = 0, cells = '';
      pjCats().forEach(function (c) { var v = mtdByCat[c[0]][i]; tot += v; if (c[0] !== 'SPI' || pjSpiBase()) totx += v; if (lmByCat[c[0]]) ltot += lmByCat[c[0]][i]; cells += '<td class="num">' + (v ? pjRp(v) : '·') + '</td>'; });
      var dt = new Date(days[i] + 'T00:00:00'), wd = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dt.getDay()];
      trs += '<tr><td class="cur"><b>' + days[i].slice(8) + ' Okt</b> (' + wd + ')</td>' + cells + '<td class="num cur"><b>' + (tot ? pjRp(tot) : '·') + '</b></td>' +
        '<td class="num">' + (lmByCat.SP ? (ltot ? pjRp(ltot) : '·') : '—') + '</td><td class="num">' + (lmByCat.SP ? pjGrowth(totx, ltot) : '—') + '</td></tr>';
    }
    var catRows = pjCats().map(function (c) {
      var a = A[c[0]];
      return '<tr><td class="cur"><b>' + c[1] + '</b></td><td class="num">' + fmtCount(a.mq) + '</td><td class="num cur"><b>' + pjRp(a.mv) + '</b></td><td class="num">' + fmtCount(a.om) + '</td>' +
        '<td class="num">' + fmtCount(a.lq) + '</td><td class="num">' + pjRp(a.lv) + '</td><td class="num">' + fmtCount(a.ol) + '</td><td class="num">' + (c[0] === 'SPI' && !pjSpiBase() ? '<span class="note">n/a (MTD saja)</span>' : pjGrowth(a.mv, a.lv)) + '</td>' +
        '<td class="num">' + (a.mq ? pjRp(a.mv / a.mq) : '—') + '</td><td class="num">' + pjRp(a.mv / n * (F.metadata.mtd_month_days || 31)) + '</td><td class="num">' + pjRp(a.fv) + '</td></tr>';
    }).join('');
    var T = A.tot;
    catRows += '<tr style="font-weight:800; background:var(--ij-wash, #f6f4f1);"><td class="cur">Total</td><td class="num">' + fmtCount(T.mq) + '</td><td class="num">' + pjRp(T.mv) + '</td><td class="num">' + fmtCount(T.om) + '</td><td class="num">' + fmtCount(T.lq) + '</td><td class="num">' + pjRp(T.lv) + '</td><td class="num">' + fmtCount(T.ol) + '</td><td class="num">' + pjGrowth(pjMx(T), T.lv) + '</td><td></td><td class="num">' + pjRp(T.mv / n * 31) + '</td><td class="num">' + pjRp(T.fv) + '</td></tr>';
    return card('MTD vs LMTD per kategori · 1–' + n + ' Okt vs 1–' + n + ' Sep 2026 · ' + esc(scopeText()) + (state.pjDse ? ' · DSE ' + esc(state.pjDse) : ''),
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Kategori') + th('Unit MTD', 1) + th('Nilai MTD', 1) + th('Outlet beli MTD', 1) + th('Unit LMTD', 1) + th('Nilai LMTD', 1) + th('Outlet beli LMTD', 1) + th('Growth nilai', 1) + th('Rp/unit MTD', 1) + th('Run-rate akhir bulan', 1) + th('Sep penuh', 1) + '</tr></thead><tbody>' + catRows + '</tbody></table></div>' +
      '<p class="note">Unit saldo Mobo tidak ada (hanya rupiah). Voucher blank dihitung unit × harga blank (IM3 Rp ' + fmtCount(F.metadata.blank_price.IM3) + ', 3ID Rp ' + fmtCount(F.metadata.blank_price['3ID']) + '). Run-rate = nilai MTD ÷ ' + n + ' hari × 31 hari.</p>') +
      card('Penjualan harian ke outlet · 1–' + n + ' Okt 2026 vs hari yang sama September',
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Tanggal') + pjCats().map(function (c) { return th(c[1], 1); }).join('') + th('Total MTD', 1) + th('LMTD hari sama', 1) + th('vs LMTD', 1) + '</tr></thead><tbody>' + trs + '</tbody></table></div>' +
        '<p class="note">' + (state.pjDse ? 'Perbandingan LMTD harian tidak tersedia pada pilihan DSE (deret September disimpan per Micro Cluster).' : 'Deret September diambil per Micro Cluster dalam lingkup filter.') + ' Hari Minggu (' + days.filter(function (d) { return new Date(d + 'T00:00:00').getDay() === 0; }).map(function (d) { return d.slice(8); }).join(', ') + ' Okt) biasanya tanpa transaksi.</p>') +
      ((state.branch || state.hoa || state.kec || state.pjDse || (state.pjBrand && state.pjBrand !== 'all')) ? '' : pjRekon(F));
  }

  function pjProdukList(F) {
    var b = state.pjBrand || 'all', cat = pjCat(), q = (state.pjSearch || '').toLowerCase();
    var rows = (F.products || []).filter(function (p) { return (b === 'all' || p.b === b) && (cat === 'all' || p.cat === cat) && (!q || (p.n + ' ' + p.b + ' ' + PJ_CAT_LABEL[p.cat]).toLowerCase().indexOf(q) !== -1); });
    var TV = rows.reduce(function (a, p) { return a + p.mv; }, 0);
    var mode = state.pjGroupBy || 'bc';
    if (b !== 'all' && cat !== 'all') mode = 'none';               // one brand and one category: nothing left to group
    else if (b !== 'all' && mode === 'bc') mode = 'cb';             // one brand: group by category only
    else if (cat !== 'all' && mode === 'cb') mode = 'bc';           // one category: group by brand only
    function badge(brand) { return '<span class="' + (brand === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(brand) + '</span>'; }
    function sum(list) { var a = { mq: 0, mv: 0, lq: 0, lv: 0, mo: 0, lo: 0 }; list.forEach(function (p) { a.mq += p.mq; a.mv += p.mv; a.lq += p.lq; a.lv += p.lv; a.mo += p.mo; a.lo += p.lo; }); return a; }
    function prodRow(p, i, indent) {
      return '<tr><td class="num">' + (i + 1) + '</td><td>' + badge(p.b) + '</td><td>' + esc(PJ_CAT_LABEL[p.cat]) + '</td><td class="cur" style="padding-left:' + (10 + indent * 18) + 'px;"><b>' + esc(p.n) + '</b></td>' +
        '<td class="num">' + (p.price != null ? pjRp(p.price) : '—') + '</td><td class="num">' + fmtCount(p.mq) + '</td><td class="num cur"><b>' + pjRp(p.mv) + '</b></td><td class="num">' + pctOf(p.mv, TV) + '%</td><td class="num">' + fmtCount(p.mo) + '</td>' +
        '<td class="num">' + fmtCount(p.lq) + '</td><td class="num">' + pjRp(p.lv) + '</td><td class="num">' + fmtCount(p.lo) + '</td><td class="num">' + pjGrowth(p.mv, p.lv) + '</td></tr>';
    }
    function groupRow(label, list, level) {
      var a = sum(list), bg = level === 1 ? 'var(--ij-ink)' : 'var(--ij-wash)', fg = level === 1 ? '#fff' : 'var(--ij-ink)';
      return '<tr style="background:' + bg + '; color:' + fg + '; font-weight:800;"><td></td><td colspan="3" style="padding-left:' + (10 + (level - 1) * 18) + 'px;">' + label + ' <span style="font-weight:500; opacity:.8;">· ' + list.length + ' produk</span></td>' +
        '<td class="num"></td><td class="num">' + fmtCount(a.mq) + '</td><td class="num"><b>' + pjRp(a.mv) + '</b></td><td class="num">' + pctOf(a.mv, TV) + '%</td><td class="num" title="jumlah outlet per produk, bukan distinct">' + fmtCount(a.mo) + '</td>' +
        '<td class="num">' + fmtCount(a.lq) + '</td><td class="num">' + pjRp(a.lv) + '</td><td class="num">' + fmtCount(a.lo) + '</td><td class="num">' + pjGrowth(a.mv, a.lv) + '</td></tr>';
    }
    var body = '';
    if (mode === 'none') {
      body = rows.map(function (p, i) { return prodRow(p, i, 0); }).join('');
    } else {
      var outerKey = mode === 'bc' ? function (p) { return p.b; } : function (p) { return p.cat; };
      var innerKey = mode === 'bc' ? function (p) { return p.cat; } : function (p) { return p.b; };
      var outerLabel = mode === 'bc' ? function (k) { return badge(k) + ' ' + esc(k); } : function (k) { return esc(PJ_CAT_LABEL[k] || k); };
      var innerLabel = mode === 'bc' ? function (k) { return esc(PJ_CAT_LABEL[k] || k); } : function (k) { return badge(k) + ' ' + esc(k); };
      var outerOrder = mode === 'bc' ? ['IM3', '3ID'] : pjCats().map(function (c) { return c[0]; });
      var innerOrder = mode === 'bc' ? pjCats().map(function (c) { return c[0]; }) : ['IM3', '3ID'];
      var outer = {};
      rows.forEach(function (p) { var k = outerKey(p); (outer[k] || (outer[k] = [])).push(p); });
      var outerKeys = Object.keys(outer).sort(function (x, y) { var ix = outerOrder.indexOf(x), iy = outerOrder.indexOf(y); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); });
      var singleOuter = outerKeys.length === 1 && (b !== 'all' || cat !== 'all');
      outerKeys.forEach(function (ok) {
        var list = outer[ok];
        if (!singleOuter) body += groupRow(outerLabel(ok), list, 1);
        var inner = {};
        list.forEach(function (p) { var k = innerKey(p); (inner[k] || (inner[k] = [])).push(p); });
        Object.keys(inner).sort(function (x, y) { var ix = innerOrder.indexOf(x), iy = innerOrder.indexOf(y); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); }).forEach(function (ik) {
          var sub = inner[ik].slice().sort(function (x, y) { return y.mv - x.mv; });
          body += groupRow(innerLabel(ik), sub, singleOuter ? 1 : 2);
          sub.forEach(function (p, i) { body += prodRow(p, i, singleOuter ? 1 : 2); });
        });
      });
      body += '<tr style="background:var(--ij-wash); font-weight:800;"><td></td><td colspan="3">TOTAL</td><td></td>' + (function () { var a = sum(rows); return '<td class="num">' + fmtCount(a.mq) + '</td><td class="num"><b>' + pjRp(a.mv) + '</b></td><td class="num">100%</td><td class="num">' + fmtCount(a.mo) + '</td><td class="num">' + fmtCount(a.lq) + '</td><td class="num">' + pjRp(a.lv) + '</td><td class="num">' + fmtCount(a.lo) + '</td><td class="num">' + pjGrowth(a.mv, a.lv) + '</td>'; })() + '</tr>';
    }
    var groupBar = '<div class="map-toolbar-group"><span class="map-label">Kelompokkan:</span>' +
      [['bc', 'Brand → Kategori'], ['cb', 'Kategori → Brand'], ['none', 'Tanpa grup']].map(function (g) { return '<button type="button" class="map-btn' + ((state.pjGroupBy || 'bc') === g[0] ? ' active' : '') + '" data-pj-group="' + g[0] + '">' + g[1] + '</button>'; }).join('') + '</div>';
    var modeLabel = mode === 'none' ? 'daftar' : (mode === 'bc' ? 'grup Brand → Kategori' : 'grup Kategori → Brand');
    return card('Mix produk · Sell-In ke outlet se-Inner Jakarta · MTD vs LMTD (' + fmtCount(rows.length) + ' produk · ' + modeLabel + ')',
      '<div class="map-toolbar" style="margin-bottom:8px;">' + pjCatBar(true) + groupBar + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('#', 1) + th('Brand') + th('Kategori') + th('Produk') + th('Rp/unit', 1) + th('Unit MTD', 1) + th('Nilai MTD', 1) + th('% nilai', 1) + th('Outlet MTD', 1) + th('Unit LMTD', 1) + th('Nilai LMTD', 1) + th('Outlet LMTD', 1) + th('Growth', 1) + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Tabel produk dihitung se-region (tidak mengikuti filter teritori); brand dan kategori mengikuti tombol di atas, kotak cari menyaring nama produk. Baris grup (hitam) dan sub-grup (abu) berisi subtotal; produk diurutkan menurut nilai MTD di dalam sub-grupnya. Outlet di baris grup adalah jumlah per produk, bukan outlet unik.</p>');
  }

  function pjProduk(F) {
    var view = state.pjProdView || 'list';
    var bar = '<div class="sub-nav" role="tablist" style="margin-top:10px;">' + [['list', '📋 Daftar Produk'], ['top', '🏆 Top Produk'], ['matrix', '🧮 Matrix Outlet × Produk']].map(function (t) { return '<button type="button" role="tab" class="sub-nav-btn' + (view === t[0] ? ' active' : '') + '" data-pj-prodview="' + t[0] + '" aria-selected="' + (view === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    return bar + (view === 'matrix' ? pjMatrixProduk(F) : (view === 'top' ? pjTopProduk(F) : pjProdukList(F)));
  }

  /* ===== Matrix Outlet × Produk voucher: 7 produk voucher teratas bulan lalu (September penuh) per brand; klik outlet = top produk yang dibeli outlet itu ===== */
  var PJ_MX_N = 7;
  function pjMatrixProduk(F) {
    var brand = state.pjMxBrand || 'IM3', q = (state.pjSearch || '').toLowerCase(), fdays = F.metadata.lmtd_full_days || 30, n = F.metadata.cut_day;
    var cols = (F.products || []).filter(function (p) { return p.b === brand && (p.cat === 'VCF' || p.cat === 'VCB') && p.fv > 0; })
      .sort(function (a, b) { return b.fv - a.fv; }).slice(0, PJ_MX_N);
    var colIdx = cols.map(function (p) { return p.i; });
    var rows = pjOutlets(F).filter(function (o) {
      if (o.b !== brand || !o.p) return false;
      if (q && (o.n + ' ' + o.id + ' ' + o.mc + ' ' + o.dse + ' ' + o.kec + ' ' + o.site).toLowerCase().indexOf(q) === -1) return false;
      var t = 0, any = false;
      colIdx.forEach(function (i) { var x = o.p[i]; if (x && x[4] > 0) t += x[5]; });
      Object.keys(o.p).forEach(function (i) { if (o.p[i][4] > 0) any = true; });
      o._mxv = t; return any;
    }).sort(function (a, b) { return b._mxv - a._mxv; });
    var colMax = colIdx.map(function (i) { var m = 0; rows.forEach(function (o) { var x = o.p[i]; if (x && x[4] > m) m = x[4]; }); return m; });
    function cell(o, ci) {
      var x = o.p[colIdx[ci]], qty = x ? x[4] : 0;
      if (!qty) return '<td class="num" style="color:var(--ij-muted); text-align:center;" title="Tidak dibeli September">·</td>';
      var a = Math.min(1, qty / (colMax[ci] * 0.6 || 1)), dark = a > 0.55;
      return '<td class="num" style="background:rgba(17,17,17,' + (0.08 + a * 0.62).toFixed(2) + '); color:' + (dark ? '#fff' : 'inherit') + ';" title="' + esc(cols[ci].n) + ': ' + fmtCount(qty) + ' unit · ' + pjRp(x[5]) + '"><b>' + fmtCount(qty) + '</b></td>';
    }
    var head = cols.map(function (p) { return '<th class="num" style="min-width:96px; white-space:normal; vertical-align:bottom;">' + esc(p.n) + '<br><span style="font-weight:500;">' + esc(PJ_CAT_LABEL[p.cat]) + '</span></th>'; }).join('');
    // grouping Area -> MC (collapsible); each group header carries the column totals and its top product
    var mi = F.metadata.mc_info || {}, prods = F.products || [], areaClosed = state.pjMxAreaClosed || {}, mcOv = state.pjMxMc || {}, mcAll = state.pjMxMcAll != null ? state.pjMxMcAll : !!state.kec;
    function topOf(list) {
      var agg = {}; list.forEach(function (o) { Object.keys(o.p).forEach(function (i) { var pr = prods[+i], x = o.p[i]; if (!pr || pr.b !== brand || (pr.cat !== 'VCF' && pr.cat !== 'VCB') || !(x[4] > 0)) return; var a = agg[i] || (agg[i] = [0, 0]); a[0] += x[4]; a[1] += x[5]; }); });
      var best = null; Object.keys(agg).forEach(function (i) { if (!best || agg[i][1] > agg[best][1]) best = i; });
      return best == null ? null : { n: prods[+best].n, q: agg[best][0], v: agg[best][1] };
    }
    function topTxt(t) { return t ? '🏆 ' + esc(t.n.length > 38 ? t.n.slice(0, 37) + '…' : t.n) + ' · ' + fmtCount(t.q) + ' unit' : '<span class="note">—</span>'; }
    function sums(list) { var c = colIdx.map(function () { return 0; }), v = 0; list.forEach(function (o) { colIdx.forEach(function (i, ci) { var x = o.p[i]; if (x && x[4] > 0) c[ci] += x[4]; }); v += o._mxv; }); return { c: c, v: v }; }
    function grpRow(label, ket, list, kind) {
      var S = sums(list), bg = kind === 'area' ? 'background:var(--ij-wash); font-weight:800;' : 'background:#fff; font-weight:700;';
      return '<tr style="' + bg + '"><td class="cur"' + (kind === 'area' ? '' : ' style="padding-left:22px;"') + '>' + label + '<br><span class="note">' + ket + ' · ' + fmtCount(list.length) + ' outlet</span></td><td style="font-weight:500; font-size:13px;">' + topTxt(topOf(list)) + '</td>' +
        S.c.map(function (q) { return '<td class="num">' + (q ? fmtCount(q) : '<span style="color:var(--ij-muted);">·</span>') + '</td>'; }).join('') + '<td class="num cur"><b>' + pjRp(S.v) + '</b></td></tr>';
    }
    function outRow(o) {
      var sel = state.pjMxSel === o.k, t = topOf([o]);
      return '<tr data-pj-mx="' + esc(o.k) + '" style="cursor:pointer;' + (sel ? ' outline:2px solid var(--ij-ink); outline-offset:-2px;' : '') + '"><td class="cur" style="padding-left:40px;"><b>' + esc(o.n || o.id) + '</b><br><span class="note"><code>' + esc(o.id) + '</code> · </span>' + dseHtml(o.dse) +
        '<br><span style="font-size:12.5px;">' + topTxt(t) + '</span></td><td>' + esc(o.mc) + '<br><span class="note">' + esc(o.site || '') + '</span></td>' + cols.map(function (p, ci) { return cell(o, ci); }).join('') + '<td class="num cur"><b>' + pjRp(o._mxv) + '</b></td></tr>';
    }
    var byArea = {}; rows.forEach(function (o) { var a = (mi[o.mc] || {}).br || '—'; ((byArea[a] || (byArea[a] = {}))[o.mc] || (byArea[a][o.mc] = [])).push(o); });
    var body = '', cap = 30;
    Object.keys(byArea).sort(function (a, b) { var f = function (x) { return Object.keys(byArea[x]).reduce(function (n, m) { return n + byArea[x][m].length; }, 0); }; return f(b) - f(a); }).forEach(function (a) {
      var aList = []; Object.keys(byArea[a]).forEach(function (m) { aList = aList.concat(byArea[a][m]); });
      var aClosed = !!areaClosed[a];
      body += grpRow('<button type="button" class="btn" data-pj-mxarea="' + esc(a) + '" style="padding:2px 8px; font-size:13px; margin-right:6px;">' + (aClosed ? '＋' : '－') + '</button>' + esc(a), 'Area · ' + Object.keys(byArea[a]).length + ' MC', aList, 'area');
      if (aClosed) return;
      Object.keys(byArea[a]).sort(function (x, y) { return byArea[a][y].length - byArea[a][x].length; }).forEach(function (m) {
        var mOpen = mcOv[m] != null ? !!mcOv[m] : mcAll, list = byArea[a][m];
        body += grpRow('<button type="button" class="btn" data-pj-mxmc="' + esc(m) + '" aria-expanded="' + mOpen + '" style="padding:2px 8px; font-size:13px; margin-right:6px;">' + (mOpen ? '－' : '＋') + '</button>' + esc(m), 'DSO ' + esc((mi[m] || {}).dso || '—'), list, 'mc');
        if (mOpen) body += list.slice(0, cap).map(outRow).join('') + (list.length > cap ? '<tr><td colspan="' + (cols.length + 3) + '" class="note" style="padding-left:40px;">' + cap + ' dari ' + fmtCount(list.length) + ' outlet ditampilkan (nilai 7 produk terbesar dulu); persempit dengan filter atau kotak cari.</td></tr>' : '');
      });
    });
    if (rows.length) { var GS = sums(rows); body += '<tr class="tot-row" style="' + TOT_ST + '"><td class="cur"><b>TOTAL · ' + fmtCount(rows.length) + ' outlet · ' + fmtCount(Object.keys(byArea).length) + ' area</b></td><td style="font-weight:500; font-size:13px;">' + topTxt(topOf(rows)) + '</td>' + GS.c.map(function (q) { return '<td class="num">' + (q ? fmtCount(q) : '·') + '</td>'; }).join('') + '<td class="num"><b>' + pjRp(GS.v) + '</b></td></tr>'; }
    var brandBar = '<div class="map-toolbar-group"><span class="map-label">Brand:</span>' + ['IM3', '3ID'].map(function (b) { return '<button type="button" class="map-btn' + (brand === b ? ' active' : '') + '" data-pj-mxbrand="' + b + '">' + b + '</button>'; }).join('') + '</div>';
    var sel = state.pjMxSel ? rows.filter(function (o) { return o.k === state.pjMxSel; })[0] || (F.outlets || []).filter(function (o) { return o.k === state.pjMxSel; })[0] : null;
    return pjMxDetail(F, sel, cols, fdays, n) +
      card('Matrix Outlet × Produk voucher · ' + esc(brand) + ' · qty September penuh (1–' + fdays + ' Sep 2026)',
        '<div class="map-toolbar" style="margin-bottom:8px;">' + brandBar + '<div class="map-toolbar-group"><span class="map-label">Grup:</span><button type="button" class="map-btn" data-pj-mxall="open">＋ Buka semua MC</button><button type="button" class="map-btn" data-pj-mxall="close">－ Tutup semua MC</button></div></div>' +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area / MC / Outlet') + th('Top produk · MC') + head + th('Nilai 7 produk', 1) + '</tr></thead><tbody>' + (body || '<tr><td colspan="' + (cols.length + 3) + '" class="note">Tidak ada outlet pada filter ini.</td></tr>') + '</tbody></table></div>' +
        '<p class="note">Kolom = ' + cols.length + ' produk voucher (isi + blank) ' + esc(brand) + ' dengan nilai penjualan terbesar di September penuh, se-Inner Jakarta. Sel = unit yang dibeli outlet di September; · = tidak dibeli. Baris diurut menurut nilai 7 produk itu. Baris Area dan MC menjumlahkan outlet di dalamnya; klik ＋ untuk membuka MC. Di bawah nama outlet tampil top produk (voucher bernilai terbesar di September). Klik baris outlet untuk melihat top produk yang dibeli outlet tersebut di September. Mengikuti filter teritori, brand, dan kotak cari di atas; outlet yang baru aktif setelah tanggal ' + n + ' September tidak ada di feed per-outlet.</p>');
  }
  function pjMxDetail(F, o, cols, fdays, n) {
    if (!o) return '';
    var prods = F.products || [], list = [], tot = 0, totM = 0;
    Object.keys(o.p || {}).forEach(function (i) { var x = o.p[i], pr = prods[+i]; if (!pr) return; tot += x[5] || 0; totM += x[1]; if (x[4] > 0) list.push({ pr: pr, q: x[4], v: x[5], mq: x[0], mv: x[1] }); });
    list.sort(function (a, b) { return b.v - a.v; });
    var top = list.slice(0, 10);
    function badge(b) { return '<span class="' + (b === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(b) + '</span>'; }
    var topRows = top.map(function (e, i) {
      return '<tr><td class="num"><b>' + (i + 1) + '</b></td><td>' + esc(PJ_CAT_LABEL[e.pr.cat]) + '</td><td class="cur"><b>' + esc(e.pr.n) + '</b></td><td class="num">' + fmtCount(e.q) + '</td><td class="num cur"><b>' + pjRp(e.v) + '</b></td><td class="num">' + pctOf(e.v, tot) + '%</td><td class="num">' + fmtCount(e.mq) + '</td><td class="num">' + pjRp(e.mv) + '</td></tr>';
    }).join('');
    var vcRows = cols.map(function (p, i) {
      var x = (o.p || {})[p.i], q = x ? x[4] : 0, mq = x ? x[0] : 0;
      return '<tr><td class="num"><b>' + (i + 1) + '</b></td><td>' + esc(PJ_CAT_LABEL[p.cat]) + '</td><td class="cur"><b>' + esc(p.n) + '</b></td><td class="num">' + (q ? fmtCount(q) : '—') + '</td><td class="num">' + (q ? pjRp(x[5]) : '—') + '</td><td class="num">' + (mq ? fmtCount(mq) : '—') + '</td><td>' + (q ? (mq ? '<span class="good-tag">dibeli Sep &amp; Okt</span>' : '<span class="alert-tag">belum beli Okt</span>') : (mq ? '<span class="good-tag">baru beli Okt</span>' : '<span class="alert-tag">belum pernah dibeli</span>')) + '</td></tr>';
    }).join('');
    return card(badge(o.b) + ' ' + esc(o.n || o.id) + ' · top produk September',
      '<div class="kpis" style="grid-template-columns: repeat(4, 1fr);">' +
        kpi('Outlet', esc(o.id), esc(o.mc) + ' · ' + esc(o.dse), 'up', 'site ' + esc(o.site || '—')) +
        kpi('Pembelian September', pjRp(tot), fmtCount(list.length) + ' produk berbeda', 'up', '1–' + fdays + ' Sep 2026') +
        kpi('Oktober MTD', pjRp(totM), 'hari 1–' + n + ' Okt', totM >= tot / fdays * n ? 'up' : 'down', 'vs rata-rata harian September') +
        kpi('Voucher teratas dibeli', fmtCount(cols.filter(function (p) { var x = (o.p || {})[p.i]; return x && x[4] > 0; }).length) + ' / ' + cols.length, 'dari 7 produk voucher teratas ' + esc(o.b), 'up', 'September penuh') +
      '</div>' +
      '<div class="tbl-wrap" style="margin-top:10px;"><table class="tbl"><thead><tr>' + th('#', 1) + th('Kategori') + th('Top produk dibeli outlet · Sep') + th('Qty Sep', 1) + th('Nilai Sep', 1) + th('% nilai', 1) + th('Qty Okt MTD', 1) + th('Nilai Okt MTD', 1) + '</tr></thead><tbody>' + (topRows || '<tr><td colspan="8" class="note">Tidak ada pembelian di September.</td></tr>') + '</tbody></table></div>' +
      '<div class="tbl-wrap" style="margin-top:12px;"><table class="tbl"><thead><tr>' + th('#', 1) + th('Kategori') + th('7 produk voucher teratas ' + esc(o.b)) + th('Qty Sep', 1) + th('Nilai Sep', 1) + th('Qty Okt MTD', 1) + th('Status') + '</tr></thead><tbody>' + vcRows + '</tbody></table></div>' +
      '<p class="note">Top produk = peringkat nilai pembelian outlet ini di September penuh (Sell-In MOBII). Klik baris yang sama sekali lagi untuk menutup.</p>');
  }
  function pjTopProduk(F) {
    var b = state.pjBrand || 'all', cat = pjCat(), q = (state.pjSearch || '').toLowerCase(), by = state.pjTopBy || 'nilai';
    var n = F.metadata.cut_day, mdays = F.metadata.mtd_month_days || 31, fdays = F.metadata.lmtd_full_days || 30;
    var rows = (F.products || []).filter(function (p) { return (b === 'all' || p.b === b) && (cat === 'all' || p.cat === cat) && (!q || (p.n + ' ' + p.b + ' ' + PJ_CAT_LABEL[p.cat]).toLowerCase().indexOf(q) !== -1) && (p.fv > 0 || p.fq > 0); });
    var key = by === 'outlet' ? 'fo' : (by === 'qty' ? 'fq' : 'fv');
    var TV = rows.reduce(function (a, p) { return a + p.fv; }, 0);
    var top = rows.filter(function (p) { return p[key] > 0; }).sort(function (x, y) { return y[key] - x[key] || y.fv - x.fv; }).slice(0, 10);
    var sumTop = top.reduce(function (a, p) { a.fv += p.fv; a.fq += p.fq; a.mv += p.mv; a.fo += p.fo; return a; }, { fv: 0, fq: 0, mv: 0, fo: 0 });
    var rrTop = sumTop.mv / n * mdays;
    var maxShare = top.length ? Math.max.apply(null, top.map(function (p) { return p.fv; })) : 1;
    function badge(brand) { return '<span class="' + (brand === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(brand) + '</span>'; }
    var body = top.map(function (p, i) {
      var rr = p.mv / n * mdays, w = TV ? p.fv / maxShare * 100 : 0;
      return '<tr><td class="num"><b>' + (i + 1) + '</b></td><td>' + badge(p.b) + '</td><td>' + esc(PJ_CAT_LABEL[p.cat]) + '</td><td class="cur"><b>' + esc(p.n) + '</b></td>' +
        '<td class="num">' + (p.fq ? pjRp(p.fv / p.fq) : '—') + '</td><td class="num">' + (p.fq ? fmtCount(p.fq) : '—') + '</td><td class="num cur"><b>' + pjRp(p.fv) + '</b></td>' +
        '<td class="num" style="min-width:110px;">' + pctOf(p.fv, TV) + '%<div style="height:6px; background:var(--ij-hairline, #ddd); margin-top:3px;"><div style="height:6px; width:' + w.toFixed(0) + '%; background:var(--ij-ink);"></div></div></td>' +
        '<td class="num">' + fmtCount(p.fo) + '</td><td class="num">' + (p.fo ? pjRp(p.fv / p.fo) : '—') + '</td>' +
        '<td class="num">' + pjRp(p.mv) + '</td><td class="num">' + pjRp(rr) + '</td><td class="num">' + pjGrowth(rr, p.fv) + '</td></tr>';
    }).join('');
    var tot = top.length ? '<tr style="background:var(--ij-wash, #f6f4f1); font-weight:800;"><td></td><td colspan="3">TOTAL TOP ' + top.length + '</td><td></td><td class="num">' + (sumTop.fq ? fmtCount(sumTop.fq) : '—') + '</td><td class="num">' + pjRp(sumTop.fv) + '</td><td class="num">' + pctOf(sumTop.fv, TV) + '%</td><td class="num" title="jumlah outlet per produk, bukan outlet unik">' + fmtCount(sumTop.fo) + '</td><td></td><td class="num">' + pjRp(sumTop.mv) + '</td><td class="num">' + pjRp(rrTop) + '</td><td class="num">' + pjGrowth(rrTop, sumTop.fv) + '</td></tr>' : '';
    var byBar = '<div class="map-toolbar-group"><span class="map-label">Urut berdasarkan:</span>' + [['nilai', 'Nilai (Rp)'], ['outlet', 'Outlet pembeli'], ['qty', 'Qty (unit)']].map(function (x) { return '<button type="button" class="map-btn' + (by === x[0] ? ' active' : '') + '" data-pj-topby="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var kp = '<div class="kpis" style="margin-top:10px; grid-template-columns: repeat(4, 1fr);">' +
      kpi('Nilai Top ' + top.length + ' · September penuh', pjRp(sumTop.fv), pctOf(sumTop.fv, TV) + '% dari total ' + pjRp(TV), 'up', '1–' + fdays + ' Sep 2026 · urut ' + (by === 'nilai' ? 'nilai' : (by === 'outlet' ? 'outlet pembeli' : 'qty'))) +
      kpi('Produk #1', top.length ? esc(top[0].n.length > 22 ? top[0].n.slice(0, 22) + '…' : top[0].n) : '—', top.length ? pjRp(top[0].fv) + ' · ' + fmtCount(top[0].fo) + ' outlet' : '—', 'up', top.length ? esc(top[0].b) + ' · ' + esc(PJ_CAT_LABEL[top[0].cat]) : '') +
      kpi('Top ' + top.length + ' · Oktober MTD', pjRp(sumTop.mv), 'run-rate ' + pjRp(rrTop), rrTop >= sumTop.fv ? 'up' : 'down', 'hari 1–' + n + ' Okt × ' + mdays + '/' + n) +
      kpi('Run-rate Okt vs September', sumTop.fv ? ((rrTop / sumTop.fv - 1) * 100 >= 0 ? '+' : '') + ((rrTop / sumTop.fv - 1) * 100).toFixed(1) + '%' : '—', pjRp(rrTop) + ' vs ' + pjRp(sumTop.fv), rrTop >= sumTop.fv ? 'up' : 'down', 'hanya untuk Top ' + top.length + ' produk September') +
    '</div>';
    return card('Top 10 produk dibeli outlet · September penuh (1–' + fdays + ' Sep 2026) · se-Inner Jakarta',
      '<div class="map-toolbar" style="margin-bottom:8px;">' + pjCatBar(true) + byBar + '</div>' + kp +
      '<div class="tbl-wrap" style="margin-top:10px;"><table class="tbl"><thead><tr>' + th('#', 1) + th('Brand') + th('Kategori') + th('Produk') + th('Rp/unit Sep', 1) + th('Qty Sep', 1) + th('Nilai Sep', 1) + th('% nilai Sep', 1) + th('Outlet pembeli Sep', 1) + th('Rata-rata / outlet', 1) + th('Okt MTD 1–' + n, 1) + th('Run-rate Okt', 1) + th('vs Sep', 1) + '</tr></thead><tbody>' + (body || '<tr><td colspan="13" class="note">Tidak ada produk pada filter ini.</td></tr>') + tot + '</tbody></table></div>' +
      '<p class="note">Peringkat memakai penjualan SELURUH September (1–' + fdays + ' Sep) Sell-In ke outlet dari DAILY_DATA_MOBII, bukan LMTD. Outlet pembeli = jumlah outlet berbeda yang membeli produk itu di September; baris total menjumlahkan per produk, bukan outlet unik. Saldo Mobo (E-Voucher) tidak punya unit sehingga tidak ikut urutan Qty. Voucher blank dinilai IM3 Rp 500 dan 3ID Rp 300 per unit. Run-rate Okt = nilai MTD ÷ ' + n + ' × ' + mdays + ' hari; "vs Sep" membandingkan run-rate itu dengan September penuh. Tabel se-region (tidak mengikuti filter teritori); brand, kategori dan kotak cari berlaku. Total September di sini mencakup semua outlet yang membeli di September, sehingga sekitar 3% lebih besar daripada "September penuh" di scorecard, yang hanya memuat outlet aktif sebelum tanggal cut.</p>');
  }

  // ===== Penjualan: band AREA SELECTION, scorecard MTD vs LMTD vs Sep penuh, kolom performa di depan =====
  /* ---- hari kerja terakhir (Senin-Sabtu, Minggu dilewati) untuk scorecard ---- */
  var LD_WD = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  function lastWorkDays(dates) {
    var last = null, prev = null;
    for (var d = dates.length; d >= 1; d--) {
      if (new Date(dates[d - 1] + 'T00:00:00').getDay() === 0) continue;
      if (last == null) last = d; else { prev = d; break; }
    }
    var lbl = function (d) { return d ? dates[d - 1].slice(8) + ' Okt (' + LD_WD[new Date(dates[d - 1] + 'T00:00:00').getDay()] + ')' : '—'; };
    return { day: last, prevDay: prev, label: lbl(last), prevLabel: lbl(prev), short: last ? dates[last - 1].slice(8) + ' Okt' : '—', prevShort: prev ? dates[prev - 1].slice(8) + ' Okt' : '—' };
  }
  function pjDayAgg(rows, day) {
    var G = { SP: { v: 0, q: 0, u: 0 }, VC: { v: 0, q: 0, u: 0 }, SALMO: { v: 0, q: 0, u: 0 }, SPI: { v: 0, q: 0, u: 0 }, tot: { v: 0, q: 0, u: 0 } };
    if (!day) return G;
    rows.forEach(function (o) {
      var any = false;
      pjGroups().forEach(function (g) {
        var v = 0, q = 0;
        g[1].forEach(function (c) { var x = o.c[c]; if (!x) return; (x[10] || []).forEach(function (e) { if (e[0] === day) { v += e[1]; q += e[2]; } }); });
        var a = G[g[0]]; a.v += v; a.q += q; if (v > 0) { a.u++; any = true; }
      });
      if (any) G.tot.u++;
    });
    G.tot.v = G.SP.v + G.VC.v + G.SALMO.v + G.SPI.v; G.tot.q = G.SP.q + G.VC.q + G.SPI.q;   /* SALMO q = jumlah transfer, bukan unit: tidak masuk total qty */
    return G;
  }
  function pjLd(F, rows) {
    var W = lastWorkDays(F.metadata.days_mtd || []);
    return { W: W, D: pjDayAgg(rows, W.day), P: pjDayAgg(rows, W.prevDay) };
  }
  function ldDelta(v, p) { var g = pjGrowthPct(v, p); return g == null ? '' : ' · ' + (g >= 0 ? '+' : '') + g.toFixed(1) + '%'; }
  function pjGroups() { var g = [['SP', ['SP'], 'Starter Pack'], ['VC', ['VCF', 'VCB'], 'Voucher (isi + blank)'], ['SALMO', ['SALMO'], 'Saldo Mobo']]; if (pjSpiOn()) g.push(['SPI', ['SPI'], 'SP Injection']); return g; }
  function pjGroupAgg(rows) {
    var G = {};
    pjGroups().forEach(function (g) { G[g[0]] = { mv: 0, mq: 0, lv: 0, lq: 0, fv: 0, fq: 0, um: 0, ul: 0, uf: 0 }; });
    G.tot = { mv: 0, mq: 0, lv: 0, lq: 0, fv: 0, fq: 0, um: 0, ul: 0, uf: 0 };
    rows.forEach(function (o) {
      var anyM = false, anyL = false, anyF = false;
      pjGroups().forEach(function (g) {
        var a = G[g[0]], m = 0, l = 0, f = 0;
        g[1].forEach(function (c) { var x = o.c[c]; if (!x) return; a.mq += x[0]; a.mv += x[1]; a.lq += x[2]; a.lv += x[3]; a.fq += x[4]; a.fv += x[5]; m += x[1]; l += x[3]; f += x[5]; if (x[11]) { a.tq = (a.tq || 0) + x[11][0]; a.tlq = (a.tlq || 0) + x[11][1]; a.tfq = (a.tfq || 0) + x[11][2]; } });
        if (m > 0) { a.um++; anyM = true; } if (l > 0) { a.ul++; anyL = true; } if (f > 0) { a.uf++; anyF = true; }
      });
      if (anyM) G.tot.um++; if (anyL) G.tot.ul++; if (anyF) G.tot.uf++;
    });
    pjGroups().forEach(function (g) { var a = G[g[0]]; ['mv', 'mq', 'lv', 'lq', 'fv', 'fq'].forEach(function (k) { G.tot[k] += a[k]; }); });
    G.tot.mvx = G.tot.mv - (G.SPI && !pjSpiBase() ? G.SPI.mv : 0); G.tot.mqx = G.tot.mq - (G.SPI && !pjSpiBase() ? G.SPI.mq : 0);
    return G;
  }
  function pjSelectionBand(F) {
    var chips = [];
    if (state.branch) chips.push(['Branch', state.branch]);
    if (state.hoa) chips.push(['Head of Area', state.hoa]);
    if (state.kec) chips.push(['Micro Cluster', state.kec]);
    if (state.pjDse) chips.push(['DSE', state.pjDse]);
    if (state.pjBrand && state.pjBrand !== 'all') chips.push(['Brand', state.pjBrand]);
    if (pjCat() !== 'all') chips.push(['Kategori', PJ_CAT_LABEL[pjCat()]]);
    var body = chips.length
      ? chips.map(function (c) { return '<span style="display:inline-block; margin:0 10px 4px 0;"><span class="map-label">' + esc(c[0]) + ':</span> <b style="font-size:15px;">' + esc(c[1]) + '</b></span>'; }).join('')
      : '<b style="font-size:15px;">Seluruh Inner Jakarta</b> <span class="note">· pilih Branch, Head of Area, Micro Cluster atau DSE untuk melihat pencapaian teritori itu</span>';
    return '<div style="margin-top:10px; padding:10px 14px; border:2px solid var(--ij-ink); border-left:8px solid var(--ij-accent); background:var(--ij-surface);">' +
      '<div style="font:800 11px var(--ij-font); letter-spacing:.08em; text-transform:uppercase; color:var(--ij-muted); margin-bottom:4px;">Area selection</div>' + body + '</div>';
  }
  function pjScorecard(F, rows) {
    var G = pjGroupAgg(rows), n = F.metadata.cut_day, mdays = F.metadata.mtd_month_days || 31;
    var fvTot = G.tot.fv || 1, LD = pjLd(F, rows);
    function trow(label, a, isTot, share, dk) {
      var noBase = dk === 'SPI' && !pjSpiBase();
      var st = isTot ? ' style="font-weight:800; background:var(--ij-wash, #f6f4f1);"' : '';
      var qty = label === 'Saldo Mobo' ? '<td class="num" title="Jumlah transfer saldo (baris produk-hari dengan nilai > 0)">' + fmtCount(a.tq || 0) + '<br><span class="note" style="font-size:10px;">transfer</span></td><td class="num">' + fmtCount(a.tlq || 0) + '</td><td class="num">' + pjGrowth(a.tq || 0, a.tlq || 0) + '</td>' :
        '<td class="num">' + fmtCount(a.mq) + '</td><td class="num">' + fmtCount(a.lq) + '</td><td class="num">' + (noBase ? '<span class="note">n/a</span>' : pjGrowth(a.mqx != null ? a.mqx : a.mq, a.lq)) + '</td>';
      return '<tr' + st + '><td class="cur"><b>' + esc(label) + '</b></td>' +
        '<td class="num cur"><b>' + pjRp(a.mv) + '</b></td><td class="num">' + pjRp(a.lv) + '</td><td class="num">' + (noBase ? '<span class="note">n/a</span>' : pjGrowth(a.mvx != null ? a.mvx : a.mv, a.lv)) + '</td>' + qty +
        '<td class="num">' + fmtCount(a.um) + '</td><td class="num">' + fmtCount(a.ul) + '</td><td class="num">' + (noBase ? '<span class="note">n/a</span>' : pjGrowth(a.um, a.ul)) + '</td>' +
        '<td class="num cur" style="border-left:2px solid var(--ij-ink);"><b>' + pjRp(LD.D[dk].v) + '</b></td><td class="num">' + (label === 'Saldo Mobo' ? fmtCount(LD.D[dk].q) + '<br><span class="note" style="font-size:10px;">transfer</span>' : fmtCount(LD.D[dk].q)) + '</td><td class="num">' + pjGrowth(LD.D[dk].v, LD.P[dk].v) + '</td>' +
        '<td class="num" style="border-left:2px solid var(--ij-ink);">' + pjRp(a.fv) + '</td><td class="num">' + (label === 'Saldo Mobo' ? fmtCount(a.tfq || 0) : fmtCount(a.fq)) + '</td><td class="num">' + fmtCount(a.uf) + '</td>' +
        '<td class="num">' + (share == null ? '100%' : share.toFixed(1) + '%') + '</td><td class="num">' + pjRp(a.mv / n * mdays) + '</td></tr>';
    }
    var trs = pjGroups().map(function (g) { return trow(g[2], G[g[0]], false, G[g[0]].fv / fvTot * 100, g[0]); }).join('') + trow('Total', G.tot, true, null, 'tot');
    var bar = '<div style="display:flex; height:16px; border:1px solid var(--ij-ink); margin-top:8px;" title="Sebaran nilai September penuh">' +
      pjGroups().filter(function (g) { return g[0] !== 'SPI'; }).map(function (g, i) { var w = G[g[0]].fv / fvTot * 100; var col = ['#201E1D', '#6B6764', '#16a34a'][i]; return w ? '<div style="width:' + w + '%; background:' + col + ';" title="' + g[2] + ' ' + w.toFixed(1) + '%"></div>' : ''; }).join('') + '</div>' +
      '<div class="note" style="margin-top:4px;">Sebaran September penuh: ' + pjGroups().filter(function (g) { return g[0] !== 'SPI'; }).map(function (g, i) { return '<span style="display:inline-block; width:10px; height:10px; background:' + ['#201E1D', '#6B6764', '#16a34a'][i] + '; vertical-align:middle;"></span> ' + g[2] + ' ' + (G[g[0]].fv / fvTot * 100).toFixed(1) + '%'; }).join(' &nbsp; ') + '</div>';
    return card('Scorecard · MTD 1–' + n + ' Okt vs LMTD 1–' + n + ' Sep · Sep penuh · ' + esc(scopeText()) + (state.pjDse ? ' · DSE ' + esc(state.pjDse) : ''),
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th rowspan="2">Komoditas</th><th colspan="3" style="text-align:center; border-bottom:2px solid var(--ij-ink);">Nilai (Rp)</th><th colspan="3" style="text-align:center; border-bottom:2px solid var(--ij-ink);">Qty (unit)</th><th colspan="3" style="text-align:center; border-bottom:2px solid var(--ij-ink);">UAR (outlet beli)</th><th colspan="3" style="text-align:center; border-bottom:2px solid var(--ij-ink); border-left:2px solid var(--ij-ink);">Hari kerja terakhir · ' + LD.W.label + '</th><th colspan="3" style="text-align:center; border-bottom:2px solid var(--ij-ink); border-left:2px solid var(--ij-ink);">September penuh</th><th rowspan="2" class="num">Sebaran Sep</th><th rowspan="2" class="num">Run-rate Okt</th></tr>' +
      '<tr>' + th('MTD', 1) + th('LMTD', 1) + th('Growth', 1) + th('MTD', 1) + th('LMTD', 1) + th('Growth', 1) + th('MTD', 1) + th('LMTD', 1) + th('Growth', 1) + th('Nilai', 1) + th('Qty', 1) + th('vs ' + LD.W.prevShort, 1) + th('Nilai', 1) + th('Qty', 1) + th('UAR', 1) + '</tr></thead><tbody>' + trs + '</tbody></table></div>' + bar +
      '<p class="note">UAR = unique active retailer, outlet dengan nilai > 0 pada komoditas itu. Growth = MTD ÷ LMTD hari yang sama − 1. Run-rate = nilai MTD ÷ ' + n + ' × ' + mdays + ' hari. Hari kerja terakhir = hari terakhir di file selain Minggu (' + LD.W.label + '); kolom "vs" membandingkan dengan hari kerja sebelumnya (' + LD.W.prevLabel + '). Qty Saldo Mobo = jumlah transfer saldo (baris produk-hari dengan nilai > 0; file MOBII tidak punya hits saldo) dan tidak ikut Total qty.</p>');
  }
  function pjPerfHead(withParent, parentLabel) { return (withParent ? th(parentLabel) : '') + th('Sep penuh', 1) + th('MTD', 1) + th('LMTD', 1) + th('Growth', 1) + th('Gap ke Sep penuh', 1); }
  function pjPerfCells(a) { return '<td class="num">' + pjRp(a.fv) + '</td><td class="num cur"><b>' + pjRp(a.mv) + '</b></td><td class="num">' + pjRp(a.lv) + '</td><td class="num">' + pjGrowth(pjMx(a), a.lv) + '</td><td class="num" style="color:' + (pjMx(a) - a.fv < 0 ? 'var(--ij-red, #c00)' : 'var(--ij-green, #0a7a3b)') + ';">' + (pjMx(a) - a.fv > 0 ? '+' : '') + pjRp(pjMx(a) - a.fv) + '</td>'; }
  function pjAggFor(G) { var cat = pjCat(); return cat === 'all' ? G.agg.tot : G.agg[cat]; }
  function pjParentVaries(groups) { var seen = {}; groups.forEach(function (g) { seen[g.parent] = 1; }); return Object.keys(seen).length > 1; }
  function pjEntityHead(level) { return { area: 'Area (Branch)', mc: 'Micro Cluster', dse: 'DSE', outlet: 'Outlet' }[level]; }
  function pjParentHead(level) { return { area: 'Head of Area', mc: 'Branch · DSO', dse: 'MC · Branch', outlet: 'MC · DSE' }[level]; }
  function pjNameCell(G) {
    return '<td class="cur"><b>' + esc(G.label) + '</b>' + (G.o ? '<br><span style="font-size:11px;"><span class="' + (G.o.b === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(G.o.b) + '</span> <code>' + esc(G.o.id) + '</code>' + (G.o.tier === 'A' ? ' <span class="note">(adhoc)</span>' : '') + '</span>' : '') + '</td>';
  }

  function pjTeritori(F) {
    var level = pjLevel(), groups = pjRowsAt(F, level), cat = pjCat(), showParent = pjParentVaries(groups);
    var tbody = groups.map(function (G, i) {
      var a = pjAggFor(G);
      var cells = pjCats().map(function (c) { var x = G.agg[c[0]]; if (c[0] === 'SPI' && !pjSpiBase()) return '<td class="num">' + (x.mv ? pjRp(x.mv) : '·') + '<br><span class="note" style="font-size:10.5px;">' + (x.mq ? fmtCount(x.mq) + ' pcs' : '') + '</span></td>'; return '<td class="num">' + (x.mv ? pjRp(x.mv) : '·') + '<br><span style="font-size:10.5px;">' + (x.mv || x.lv ? pjGrowth(x.mv, x.lv) : '') + '</span></td>'; }).join('');
      var cov = level === 'outlet' ? '' : '<td class="num">' + fmtCount(G.base) + '</td><td class="num"><b>' + fmtCount(G.agg.tot.om) + '</b> (' + pctOf(G.agg.tot.om, G.base) + '%)</td>';
      return '<tr><td class="num">' + (i + 1) + '</td>' + pjNameCell(G) + (showParent ? '<td>' + esc(G.parent) + '</td>' : '') + pjPerfCells(a) + cov + cells + '<td>' + pjDetailBtn(level, G) + '</td></tr>';
    }).join('');
    if (level !== 'outlet' && groups.length > 1) {
      var pItems = []; groups.forEach(function (G) { pItems = pItems.concat(G.items); });
      var PA = pjAgg(pItems), Pa = cat === 'all' ? PA.tot : PA[cat], PB = groups.reduce(function (s, G) { return s + G.base; }, 0);
      var pCells = pjCats().map(function (c) { var x = PA[c[0]]; if (c[0] === 'SPI' && !pjSpiBase()) return '<td class="num">' + (x.mv ? pjRp(x.mv) : '·') + '<br><span style="font-size:10.5px;">' + (x.mq ? fmtCount(x.mq) + ' pcs' : '') + '</span></td>'; return '<td class="num">' + (x.mv ? pjRp(x.mv) : '·') + '<br><span style="font-size:10.5px;">' + (x.mv || x.lv ? pjGrowth(x.mv, x.lv) : '') + '</span></td>'; }).join('');
      tbody += '<tr class="tot-row" style="' + TOT_ST + '"><td></td><td><b>TOTAL · ' + fmtCount(groups.length) + ' ' + ({ area: 'area', mc: 'MC', dse: 'DSE' }[level] || '') + '</b></td>' + (showParent ? '<td></td>' : '') + pjPerfCells(Pa) + totNum(fmtCount(PB)) + totNum('<b>' + fmtCount(PA.tot.om) + '</b> (' + pctOf(PA.tot.om, PB) + '%)') + pCells + '<td></td></tr>';
    }
    var head = th('#', 1) + th(pjEntityHead(level)) + pjPerfHead(showParent, pjParentHead(level)) + (level === 'outlet' ? '' : th('Outlet master', 1) + th('UAR MTD', 1)) + pjCats().map(function (c) { return th(c[1], 1); }).join('') + th('Detail');
    return pjLevelBar(F) + card('Penjualan per teritori · ' + PJ_LEVEL_LABEL[level] + (cat !== 'all' ? ' · kolom performa: ' + PJ_CAT_LABEL[cat] : ' · kolom performa: semua kategori'),
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + tbody + '</tbody></table></div>' +
      '<p class="note">Sep penuh, MTD, LMTD dan growth mengikuti kategori yang dipilih (tombol Kategori di tab Heatmap atau Outlet). UAR MTD = outlet dengan nilai > 0 pada kategori mana pun 1–' + F.metadata.cut_day + ' Okt, dibandingkan outlet master di teritori. "Detail" turun ke level di bawahnya.</p>');
  }

  function pjHeat(F) {
    var level = pjLevel(), groups = pjRowsAt(F, level), n = F.metadata.cut_day, cat = pjCat(), showParent = pjParentVaries(groups);
    var paged = level === 'dse' || level === 'outlet', pg = paged ? pjPager(groups.length, 50) : { start: 0, end: groups.length, html: '' };
    var slice = groups.slice(pg.start, pg.end);
    var series = slice.map(function (G) { return pjDailyMtd(G.items, cat, n); });
    var tot = []; for (var i = 0; i < n; i++) tot.push(0);
    groups.forEach(function (G) { pjDailyMtd(G.items, cat, n).forEach(function (v, i) { tot[i] += v; }); });
    var max = 0; series.forEach(function (s) { s.forEach(function (v) { if (v > max) max = v; }); });
    var TA = { mv: 0, lv: 0, fv: 0 }; groups.forEach(function (G) { var a = pjAggFor(G); TA.mv += a.mv; TA.lv += a.lv; TA.fv += a.fv; });
    var totalRow = groups.length < 2 ? '' : '<tr style="background:var(--ij-wash, #f6f4f1); font-weight:800;"><td class="cur">Semua dalam lingkup (' + fmtCount(groups.length) + ' baris)</td>' + (showParent ? '<td></td>' : '') + pjPerfCells(TA) +
      tot.map(function (v) { return pjHeatCell(v, Math.max.apply(null, tot) || 1); }).join('') + '<td></td></tr>';
    var body = slice.map(function (G, i) {
      return '<tr>' + pjNameCell(G) + (showParent ? '<td>' + esc(G.parent) + '</td>' : '') + pjPerfCells(pjAggFor(G)) + series[i].map(function (v) { return pjHeatCell(v, max); }).join('') + '<td>' + pjDetailBtn(level, G) + '</td></tr>';
    }).join('');
    return pjLevelBar(F) + card('Heatmap penjualan harian · ' + PJ_LEVEL_LABEL[level] + ' · ' + PJ_CAT_LABEL[cat],
      '<div class="map-toolbar" style="margin-bottom:8px;">' + pjCatBar(true) + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th(pjEntityHead(level)) + pjPerfHead(showParent, pjParentHead(level)) + pjDayHead(F) + th('Detail') + '</tr></thead><tbody>' + totalRow + body + '</tbody></table></div>' + pg.html +
      '<p class="note">Kolom performa (Sep penuh, MTD, LMTD, growth) ada di depan sebelum harian. Sel = nilai Sell-In ke outlet pada tanggal itu; makin hijau makin besar relatif terhadap sel terbesar; · tidak ada transaksi. Teritori yang sudah dipilih tidak diulang per baris.</p>');
  }

  /* expand / collapse state for the Area > MC grouping of long outlet tables: explicit click wins, then "Buka/Tutup semua", then a filter-based default */
  function pjOutOpen(key, kind) {
    var v = state.pjOutOpen && state.pjOutOpen[key]; if (v !== undefined) return v;
    if (state.pjOutAll) return state.pjOutAll === 'open';
    return kind === 'A' ? !!(state.branch || state.hoa || state.kec || state.pjDse || state.pjSearch) : !!(state.kec || state.pjDse || state.pjSearch);
  }
  /* Shared Area > MC grouping for the other long tables (t = table id, cfg below). Default-open only when a territory filter or search is active. */
  function grpOpen(t, key, kind, search) {
    var v = state.grpOpen && state.grpOpen[t + '|' + key]; if (v !== undefined) return v;
    var all = state.grpAll && state.grpAll[t]; if (all) return all === 'open';
    if (kind === 'D') return !!(state.dse || search);
    return kind === 'A' ? !!(state.branch || state.hoa || state.kec || search) : !!(state.kec || search);
  }
  function grpBar(t) {
    return '<div class="map-toolbar-group"><button type="button" class="map-btn" data-act="grp-all" data-t="' + t + '" data-v="open">Buka semua</button><button type="button" class="map-btn" data-act="grp-all" data-t="' + t + '" data-v="close">Tutup semua</button></div>';
  }
  /* cfg: items (rows), area(o) -> name, mc(o) -> name, dso(mcName) -> text, hoa(areaName) -> text, val(o) -> sort value, unit ('outlet'|'DSE'), span (label colspan), cols (total columns),
     sub(items) -> trailing <td> cells, row(o) -> <tr> html, search (bool), cap (rows per MC) */
  function grpBody(t, cfg) {
    var CAP = cfg.cap || 200, areas = {}, unit = cfg.unit || 'outlet';
    cfg.items.forEach(function (o) {
      var an = cfg.area(o) || 'OUTSIDE MASTER TERRITORY', mn = cfg.mc(o) || 'OUTSIDE MASTER TERRITORY';
      var A = areas[an] || (areas[an] = { items: [], mcs: {}, v: 0 }), M = A.mcs[mn] || (A.mcs[mn] = { items: [], v: 0, dses: {} }), v = cfg.val ? cfg.val(o) : 0;
      A.items.push(o); M.items.push(o); A.v += v; M.v += v;
      if (cfg.dse) { var dn = String(cfg.dse(o) || 'UNASSIGNED'), D = M.dses[dn] || (M.dses[dn] = { items: [], v: 0 }); D.items.push(o); D.v += v; }   // optional third level: DSE
    });
    function tog(key, open) { return '<button type="button" class="btn" data-grp-toggle="' + esc(t + '|' + key) + '" aria-expanded="' + open + '" style="font-size:11px; padding:2px 8px; margin-right:8px;">' + (open ? '&#9660;' : '&#9654;') + '</button>'; }
    var body = '';
    Object.keys(areas).sort(function (x, y) { return areas[y].v - areas[x].v; }).forEach(function (an) {
      var A = areas[an], aOpen = grpOpen(t, 'A|' + an, 'A', cfg.search), mKeys = Object.keys(A.mcs);
      body += '<tr style="background:var(--ij-wash, #f6f4f1); font-weight:800;"><td class="cur" colspan="' + cfg.span + '">' + tog('A|' + an, aOpen) + esc(an) + ' <span class="note" style="font-weight:500;">' + (cfg.hoa ? 'HoA ' + esc(cfg.hoa(an)) + ' · ' : '') + mKeys.length + ' MC · ' + fmtCount(A.items.length) + ' ' + unit + '</span></td>' + cfg.sub(A.items) + '</tr>';
      if (!aOpen) return;
      mKeys.sort(function (x, y) { return A.mcs[y].v - A.mcs[x].v; }).forEach(function (mn) {
        var M = A.mcs[mn], mOpen = grpOpen(t, 'M|' + mn, 'M', cfg.search);
        body += '<tr style="background:var(--ij-surface, #fff); font-weight:700; border-top:1px solid var(--ij-hairline);"><td class="cur" colspan="' + cfg.span + '" style="padding-left:20px;">' + tog('M|' + mn, mOpen) + esc(mn) + ' <span class="note" style="font-weight:500;">' + (cfg.dso ? 'DSO ' + esc(cfg.dso(mn)) + ' · ' : '') + fmtCount(M.items.length) + ' ' + unit + '</span></td>' + cfg.sub(M.items) + '</tr>';
        if (!mOpen) return;
        if (cfg.dse) {   // Area > MC > DSE: one header row per DSE with its own subtotal, then the rows
          Object.keys(M.dses).sort(function (x, y) { return M.dses[y].v - M.dses[x].v; }).forEach(function (dn) {
            var D = M.dses[dn], dOpen = grpOpen(t, 'D|' + mn + '|' + dn, 'D', cfg.search);
            body += '<tr style="background:var(--ij-surface, #fff); font-weight:600; border-top:1px solid var(--ij-hairline);"><td class="cur" colspan="' + cfg.span + '" style="padding-left:38px;">' + tog('D|' + mn + '|' + dn, dOpen) + '👤 ' + esc(dn) + ' <span class="note" style="font-weight:500;">' + fmtCount(D.items.length) + ' ' + unit + '</span></td>' + cfg.sub(D.items) + '</tr>';
            if (!dOpen) return;
            D.items.slice(0, CAP).forEach(function (o) { body += cfg.row(o); });
            if (D.items.length > CAP) body += '<tr><td colspan="' + cfg.cols + '" class="note" style="padding-left:56px;">Menampilkan ' + CAP + ' ' + unit + ' teratas dari ' + fmtCount(D.items.length) + ' milik ' + esc(dn) + '; gunakan filter header untuk melihat sisanya.</td></tr>';
          });
          return;
        }
        M.items.slice(0, CAP).forEach(function (o) { body += cfg.row(o); });
        if (M.items.length > CAP) body += '<tr><td colspan="' + cfg.cols + '" class="note" style="padding-left:40px;">Menampilkan ' + CAP + ' ' + unit + ' teratas dari ' + fmtCount(M.items.length) + ' di ' + esc(mn) + '; gunakan kotak cari atau filter untuk melihat sisanya.</td></tr>';
      });
    });
    return body || '<tr><td colspan="' + cfg.cols + '" class="note">Tidak ada data pada filter ini.</td></tr>';
  }
  function grpSum(items, f) { return items.reduce(function (t, x) { return t + (f(x) || 0); }, 0); }
  function grpMi(F, t, items, mcOf, c) {
    var mi = F.metadata.mc_info || {};
    c.items = items; c.mc = mcOf; c.area = function (x) { return (mi[mcOf(x)] || {}).br; }; c.dso = function (m) { return (mi[m] || {}).dso || '—'; };
    c.hoa = function (a) { for (var k in mi) if (mi[k].br === a) return mi[k].hoa || '—'; return '—'; };
    return grpBody(t, c);
  }
  function pjOutletTab(F) {
    var n = F.metadata.cut_day, cat = pjCat(), q = (state.pjSearch || '').toLowerCase();
    var vf = (typeof window !== 'undefined' && window.dseVisitsFeed) ? window.dseVisitsFeed : (typeof dseVisitsFeed !== 'undefined' ? dseVisitsFeed : null);
    var lastVisit = (vf && vf.last_visit) || {};
    var rows = pjOutlets(F).filter(function (o) {
      if (cat !== 'all' && !o.c[cat]) return false;
      var mv = 0, lv = 0, fv = 0; Object.keys(o.c).forEach(function (c) { if (cat === 'all' || c === cat) { mv += o.c[c][1]; lv += o.c[c][3]; fv += o.c[c][5]; } });
      o._mv = mv; o._lv = lv; o._fv = fv;
      if (state.pjOnlyNoMtd && mv > 0) return false;
      if (q && (o.n + ' ' + o.id + ' ' + o.mc + ' ' + o.dse + ' ' + o.kec + ' ' + o.site).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    rows.sort(function (a, b) { return b._mv - a._mv || b._lv - a._lv; });
    /* grouped Area > MC (DSO) with expand / collapse; outlets listed under an open MC (capped per MC) */
    var CAP = 200, areas = {};
    rows.forEach(function (o) {
      var d = pjDim(o, F), an = d.br, mn = o.mc || 'OUTSIDE MASTER TERRITORY';
      var A = areas[an] || (areas[an] = { key: an, hoa: d.hoa, mcs: {}, items: [] });
      var M = A.mcs[mn] || (A.mcs[mn] = { key: mn, dso: d.dso, items: [] });
      A.items.push(o); M.items.push(o);
    });
    function ok(o, c) { return (cat === 'all' || c === cat) ? o.c[c] : null; }
    function groupCells(items) {
      var g = pjAgg(items), a = cat === 'all' ? g.tot : g[cat];
      return pjPerfCells({ fv: a.fv, mv: a.mv, lv: a.lv, mvx: cat === 'all' ? g.tot.mvx : a.mv }) +
        pjCats().map(function (c) { var x = g[c[0]]; return '<td class="num">' + (x.mv ? pjRp(x.mv) : '·') + '</td>'; }).join('');
    }
    function outletRow(o, indent) {
      var last = null; Object.keys(o.c).forEach(function (c) { if ((cat === 'all' || c === cat) && o.c[c][6] != null && (last == null || o.c[c][6] > last)) last = o.c[c][6]; });
      var ds = last != null ? n - last : null;
      var slab = ds == null ? '<span class="alert-tag">Belum beli MTD</span>' : (ds <= 2 ? '<span class="good-tag">' + ds + ' hr</span>' : (ds <= 6 ? '<span style="background:#fef3c7; color:#92400e; padding:2px 7px; font-weight:800; font-size:11px;">' + ds + ' hr</span>' : '<span style="background:#ffedd5; color:#9a3412; padding:2px 7px; font-weight:800; font-size:11px;">' + ds + ' hr</span>'));
      var visited = o.tier === 'M' ? (lastVisit[o.k] ? '<span class="good-tag">' + esc(lastVisit[o.k]) + '</span>' : '<span class="alert-tag">Belum divisit</span>') : '<span class="note">di luar master</span>';
      var flag = o.tier === 'M' ? (o._mv > 0 && !lastVisit[o.k] ? 'Beli tanpa visit' : (!o._mv && lastVisit[o.k] ? 'Divisit, belum beli' : '')) : '';
      return '<tr><td class="cur" style="padding-left:' + indent + 'px;"><b>' + esc(o.n || o.id) + '</b><br><span style="font-size:11px;"><span class="' + (o.b === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(o.b) + '</span> <code>' + esc(o.id) + '</code>' + (o.tier === 'A' ? ' <span class="note">(adhoc)</span>' : '') + '</span></td>' +
        '<td>' + esc(o.dse) + '</td><td>' + esc(o.kec) + '<br><code style="font-size:11px;">' + esc(o.site || '—') + '</code></td>' +
        pjPerfCells({ fv: o._fv, mv: o._mv, lv: o._lv }) +
        pjCats().map(function (c) { var f = o.c[c[0]]; return '<td class="num">' + (f && f[1] ? pjRp(f[1]) : '·') + '</td>'; }).join('') +
        '<td>' + (last != null ? last + ' Okt' : (o._lv ? 'Sep' : '—')) + '</td><td>' + slab + '</td><td>' + visited + (flag ? '<br><span class="note">' + flag + '</span>' : '') + '</td></tr>';
    }
    function tog(key, open) { return '<button type="button" class="btn" data-pj-out-toggle="' + esc(key) + '" aria-expanded="' + open + '" style="font-size:11px; padding:2px 8px; margin-right:8px;">' + (open ? '&#9660;' : '&#9654;') + '</button>'; }
    var aKeys = Object.keys(areas).sort(function (x, y) { return areas[y].items.reduce(function (t, o) { return t + o._mv; }, 0) - areas[x].items.reduce(function (t, o) { return t + o._mv; }, 0); });
    var body = '';
    aKeys.forEach(function (an) {
      var A = areas[an], aOpen = pjOutOpen('A|' + an, 'A'), mKeys = Object.keys(A.mcs);
      body += '<tr style="background:var(--ij-wash, #f6f4f1); font-weight:800;"><td class="cur" colspan="3">' + tog('A|' + an, aOpen) + esc(an) + ' <span class="note" style="font-weight:500;">HoA ' + esc(A.hoa) + ' · ' + mKeys.length + ' MC · ' + fmtCount(A.items.length) + ' outlet</span></td>' + groupCells(A.items) + '<td colspan="3"></td></tr>';
      if (!aOpen) return;
      mKeys.sort(function (x, y) { return A.mcs[y].items.reduce(function (t, o) { return t + o._mv; }, 0) - A.mcs[x].items.reduce(function (t, o) { return t + o._mv; }, 0); }).forEach(function (mn) {
        var M = A.mcs[mn], mOpen = pjOutOpen('M|' + mn, 'M');
        body += '<tr style="background:var(--ij-surface, #fff); font-weight:700; border-top:1px solid var(--ij-hairline);"><td class="cur" colspan="3" style="padding-left:20px;">' + tog('M|' + mn, mOpen) + esc(mn) + ' <span class="note" style="font-weight:500;">DSO ' + esc(M.dso) + ' · ' + fmtCount(M.items.length) + ' outlet</span></td>' + groupCells(M.items) + '<td colspan="3"></td></tr>';
        if (!mOpen) return;
        M.items.slice(0, CAP).forEach(function (o) { body += outletRow(o, 40); });
        if (M.items.length > CAP) body += '<tr><td colspan="30" class="note" style="padding-left:40px;">Menampilkan ' + CAP + ' outlet teratas dari ' + fmtCount(M.items.length) + ' di ' + esc(mn) + ' (urut nilai MTD); gunakan kotak cari atau filter DSE untuk melihat sisanya.</td></tr>';
      });
    });
    var nCols = 3 + 6 + pjCats().length + 3;
    return pjLevelBar(F) + card('Outlet · Sell-In per outlet · ' + PJ_CAT_LABEL[cat] + ' (' + fmtCount(rows.length) + ' outlet)',
      '<div class="map-toolbar" style="margin-bottom:8px;">' + pjCatBar(true) + '<div class="map-toolbar-group"><button type="button" class="map-btn' + (state.pjOnlyNoMtd ? ' active' : '') + '" data-act="pj-only-nomtd">' + (state.pjOnlyNoMtd ? 'Hanya yang belum beli MTD' : 'Tampilkan hanya yang belum beli MTD') + '</button></div>' +
      '<div class="map-toolbar-group"><button type="button" class="map-btn" data-act="pj-out-all" data-v="open">Buka semua</button><button type="button" class="map-btn" data-act="pj-out-all" data-v="close">Tutup semua</button></div></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › Outlet') + th('DSE') + th('Kecamatan · Site') + pjPerfHead(false) + pjCats().map(function (c) { return th(c[1], 1); }).join('') + th('Beli terakhir') + th('Hari sejak') + th('Visit PJP MTD') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka atau menutup. Baris grup menjumlahkan outlet di dalamnya. Urut nilai MTD. "Belum beli MTD" = tidak ada transaksi 1–' + n + ' Okt pada kategori terpilih (nilai LMTD dan Sep penuh menunjukkan apakah outlet itu membeli di September). Visit PJP diambil dari check-in DSE ' + pjpPeriod('mtd',{id:1,nopad:1}) + '; outlet adhoc tidak ada di master sehingga tidak bisa disilangkan.</p>');
  }

  // ===== Matriks slab: jumlah outlet per Area dan MC menurut slab Sell-In MTD (SP pcs, voucher pcs, saldo Rp) =====
  var PJ_SLABS_PCS = [[0, 0, '0 (zero)'], [1, 1, '1'], [2, 3, '2–3'], [4, 5, '4–5'], [6, 10, '6–10'], [11, 20, '11–20'], [21, 50, '21–50'], [51, 100, '51–100'], [101, Infinity, '> 100']];
  var PJ_SLABS_RP = [[0, 0, '0 (zero)'], [1, 150000, '1–150 Rb'], [150001, 300000, '151–300 Rb'], [300001, 500000, '301–500 Rb'], [500001, 1000000, '501 Rb–1 Jt'], [1000001, 2000000, '1–2 Jt'], [2000001, 5000000, '2–5 Jt'], [5000001, 10000000, '5–10 Jt'], [10000001, 20000000, '10–20 Jt'], [20000001, 50000000, '20–50 Jt'], [50000001, Infinity, '> 50 Jt']];
  var PJ_SLAB_COM_BASE = [['SP', 'Starter Pack (pcs)'], ['VC', 'Voucher isi (pcs)'], ['SALMO', 'Saldo Mobo (Rp)']];
  function pjSlabComs() { return pjSpiOn() ? PJ_SLAB_COM_BASE.concat([['SPI', 'SP Injection (pcs)']]) : PJ_SLAB_COM_BASE; }
  var PJ_SLABS_PCS_DSE = [[0, 0, '0 (zero)'], [1, 1, '1'], [2, 10, '2–10'], [11, 20, '11–20'], [21, 30, '21–30'], [31, 50, '31–50'], [51, Infinity, '> 50']];
  function pjDseBase(F) {
    // DSE per MC dari master teritori: setiap dse_name ditempatkan di MC tempat outletnya paling banyak
    if (F._dseBase) return F._dseBase;
    var terr = (typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED : (typeof TERRITORY_FEED !== 'undefined' ? TERRITORY_FEED : null);
    var cnt = {};
    ((terr && terr.outlets) || []).forEach(function (o) {
      var d = String(o.dse_name || 'UNASSIGNED').trim().toUpperCase(); if (d.slice(-2) === '.0') d = d.slice(0, -2);
      if (!d || d === 'UNASSIGNED') return;
      var m = o.micro_cluster || ''; if (!m) return;
      var C = cnt[d] || (cnt[d] = {}); C[m] = (C[m] || 0) + 1;
    });
    var home = {}, byMc = {};
    Object.keys(cnt).forEach(function (d) { var best = null, bn = -1; Object.keys(cnt[d]).forEach(function (m) { if (cnt[d][m] > bn) { bn = cnt[d][m]; best = m; } }); home[d] = best; (byMc[best] = byMc[best] || []).push(d); });
    F._dseBase = { home: home, byMc: byMc };
    return F._dseBase;
  }
  function pjSlabIdx(v, slabs) { for (var i = 0; i < slabs.length; i++) if (v >= slabs[i][0] && v <= slabs[i][1]) return i; return slabs.length - 1; }
  function pjSlabProductOk(F, pi) {
    var pr = F.products[+pi]; if (!pr) return false;
    var com = state.pjSlabCom || 'SP', sel = state.pjSlabProd || 'all', n = pr.n.toUpperCase();
    if (com === 'SP') {
      if (pr.cat !== 'SP') return false;
      if (sel === 'all') return true;
      if (sel === 'ZERO') return n.indexOf('ZERO') >= 0;
      if (sel === 'ORI3GB') return n.indexOf('ORI') >= 0 && n.indexOf('3GB') >= 0;
      if (sel === 'ZERO_ORI3GB') return n.indexOf('ZERO') >= 0 || (n.indexOf('ORI') >= 0 && n.indexOf('3GB') >= 0);
      return String(pr.i) === String(sel);
    }
    if (com === 'VC') {
      if (pr.cat !== 'VCF') return false;
      return sel === 'all' || String(pr.i) === String(sel);
    }
    return false;
  }
  function pjSlabMeasure(F, o) {
    var com = state.pjSlabCom || 'SP';
    if (com === 'SALMO') return o.c.SALMO ? o.c.SALMO[1] : 0;
    if (com === 'SPI') return o.c.SPI ? o.c.SPI[0] : 0;
    var q = 0; Object.keys(o.p || {}).forEach(function (pi) { if (pjSlabProductOk(F, pi)) q += o.p[pi][0]; });
    return q;
  }
  function pjSlabMatrix(F) {
    var com = state.pjSlabCom || 'SP', ent = state.pjSlabEntity || 'outlet';
    var slabs = com === 'SALMO' ? PJ_SLABS_RP : (ent === 'dse' ? PJ_SLABS_PCS_DSE : PJ_SLABS_PCS);
    var mi = F.metadata.mc_info || {}, mc = F.metadata.master_counts || {};
    var rows = pjOutlets(F);
    if (ent === 'dse') return pjSlabMatrixDse(F, slabs, rows, mi);
    var groups = {};   // area -> { mcs: { mc -> counts } }
    function ensure(area, m) {
      var A = groups[area] || (groups[area] = { area: area, hoa: '—', mcs: {}, base: 0 });
      if (!m) return A;
      var M = A.mcs[m] || (A.mcs[m] = { mc: m, dso: (mi[m] || {}).dso || '—', base: (mc.mc || {})[m] || 0, buyersM: 0, buyersA: 0, slabs: slabs.map(function () { return 0; }), tot: 0 });
      return M;
    }
    // every master MC in filter appears even with no buyer
    Object.keys(mi).forEach(function (m) {
      var d = mi[m];
      if (state.branch && d.br !== state.branch) return;
      if (state.hoa && d.hoa !== state.hoa) return;
      if (state.kec && m !== state.kec) return;
      var A = ensure(d.br); A.hoa = d.hoa || '—'; ensure(d.br, m);
    });
    rows.forEach(function (o) {
      var d = pjDim(o, F), m = o.mc || 'OUTSIDE MASTER TERRITORY';
      var v = pjSlabMeasure(F, o);
      if (v <= 0) return;
      var A = ensure(d.br); if (A.hoa === '—') A.hoa = d.hoa; var M = ensure(d.br, m);
      M.slabs[pjSlabIdx(v, slabs)]++; M.tot += v; if (o.tier === 'M') M.buyersM++; else M.buyersA++;
    });
    var areas = Object.keys(groups).map(function (k) {
      var A = groups[k]; A.list = Object.keys(A.mcs).map(function (m) { var M = A.mcs[m]; M.slabs[0] = Math.max(0, M.base - M.buyersM); return M; });
      A.base = A.list.reduce(function (s, M) { return s + M.base; }, 0);
      A.buyers = A.list.reduce(function (s, M) { return s + M.buyersM + M.buyersA; }, 0);
      A.tot = A.list.reduce(function (s, M) { return s + M.tot; }, 0);
      A.slabs = slabs.map(function (_, i) { return A.list.reduce(function (s, M) { return s + M.slabs[i]; }, 0); });
      A.list.sort(function (x, y) { return (y.buyersM + y.buyersA) - (x.buyersM + x.buyersA) || x.mc.localeCompare(y.mc); });
      return A;
    }).sort(function (x, y) { return y.buyers - x.buyers || x.area.localeCompare(y.area); });
    return { slabs: slabs, areas: areas, com: com };
  }
  function pjSlabMatrixDse(F, slabs, rows, mi) {
    var DB = pjDseBase(F), groups = {};
    function ensure(area, m) {
      var A = groups[area] || (groups[area] = { area: area, hoa: '—', mcs: {}, base: 0 });
      if (!m) return A;
      var M = A.mcs[m] || (A.mcs[m] = { mc: m, dso: (mi[m] || {}).dso || '—', base: (DB.byMc[m] || []).length, buyersM: 0, buyersA: 0, slabs: slabs.map(function () { return 0; }), tot: 0, dses: {} });
      return M;
    }
    Object.keys(mi).forEach(function (m) {
      var d = mi[m];
      if (state.branch && d.br !== state.branch) return;
      if (state.hoa && d.hoa !== state.hoa) return;
      if (state.kec && m !== state.kec) return;
      var A = ensure(d.br); A.hoa = d.hoa || '—'; ensure(d.br, m);
    });
    // total per DSE (outlet master saja; outlet adhoc tidak punya DSE)
    var perDse = {};
    rows.forEach(function (o) {
      if (o.tier !== 'M' || !o.dse || o.dse === 'UNASSIGNED') return;
      var v = pjSlabMeasure(F, o); if (v <= 0) return;
      perDse[o.dse] = (perDse[o.dse] || 0) + v;
    });
    Object.keys(perDse).forEach(function (d) {
      var m = DB.home[d]; if (!m) return;
      var info = mi[m] || {}; var area = info.br || 'OUTSIDE MASTER TERRITORY';
      if (state.branch && area !== state.branch) return;
      if (state.hoa && info.hoa !== state.hoa) return;
      if (state.kec && m !== state.kec) return;
      var A = ensure(area); if (A.hoa === '—') A.hoa = info.hoa || '—'; var M = ensure(area, m);
      M.slabs[pjSlabIdx(perDse[d], slabs)]++; M.tot += perDse[d]; M.buyersM++;
    });
    var areas = Object.keys(groups).map(function (k) {
      var A = groups[k]; A.list = Object.keys(A.mcs).map(function (m) { var M = A.mcs[m]; M.slabs[0] = Math.max(0, M.base - M.buyersM); return M; });
      A.base = A.list.reduce(function (s, M) { return s + M.base; }, 0);
      A.buyers = A.list.reduce(function (s, M) { return s + M.buyersM; }, 0);
      A.tot = A.list.reduce(function (s, M) { return s + M.tot; }, 0);
      A.slabs = slabs.map(function (_, i) { return A.list.reduce(function (s, M) { return s + M.slabs[i]; }, 0); });
      A.list.sort(function (x, y) { return y.buyersM - x.buyersM || x.mc.localeCompare(y.mc); });
      return A;
    }).sort(function (x, y) { return y.buyers - x.buyers || x.area.localeCompare(y.area); });
    return { slabs: slabs, areas: areas, com: state.pjSlabCom || 'SP', entity: 'dse' };
  }
  function pjSlabTab(F) {
    if (state.pjSlabCom === 'SPI' && !pjSpiOn()) state.pjSlabCom = 'SP';
    var com = state.pjSlabCom || 'SP', sel = state.pjSlabProd || 'all', b = state.pjBrand || 'all';
    var R = pjSlabMatrix(F), slabs = R.slabs, isRp = com === 'SALMO';
    var ent = state.pjSlabEntity || 'outlet', isDse = ent === 'dse';
    var entBar = '<div class="map-toolbar-group"><span class="map-label">Matriks:</span>' + [['outlet', '🏪 Outlet'], ['dse', '🚶 DSE']].map(function (x) { return '<button type="button" class="map-btn' + (ent === x[0] ? ' active' : '') + '" data-pj-slabent="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var comBar = entBar + '<div class="map-toolbar-group"><span class="map-label">Komoditas:</span>' + pjSlabComs().map(function (c) { return '<button type="button" class="map-btn' + (com === c[0] ? ' active' : '') + '" data-pj-slabcom="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
    var prodBar = '';
    if (com === 'SP') {
      prodBar = '<div class="map-toolbar-group"><span class="map-label">Produk SP:</span>' + [['ZERO_ORI3GB', 'ZERO + ORI 3GB'], ['ZERO', 'SP ZERO'], ['ORI3GB', 'SP ORI 3GB'], ['all', 'Semua SP']].map(function (x) { return '<button type="button" class="map-btn' + (sel === x[0] ? ' active' : '') + '" data-pj-slabprod="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    }
    if (com === 'SP' || com === 'VC') {
      var opts = F.products.filter(function (p) { return p.cat === (com === 'SP' ? 'SP' : 'VCF') && (b === 'all' || p.b === b); }).sort(function (x, y) { return y.mv - x.mv; });
      prodBar += '<div class="map-toolbar-group"><span class="map-label">' + (com === 'SP' ? 'atau produk tertentu:' : 'Kategori produk voucher:') + '</span><select id="pjSlabProdSelect" class="map-select" style="min-width:280px;">' +
        '<option value="' + (com === 'SP' ? 'ZERO_ORI3GB' : 'all') + '"' + ((com === 'SP' ? ['ZERO_ORI3GB', 'ZERO', 'ORI3GB', 'all'].indexOf(sel) >= 0 : sel === 'all') ? ' selected' : '') + '>' + (com === 'SP' ? '— pilihan di atas —' : 'Semua voucher isi (ORI)') + '</option>' +
        opts.map(function (p) { return '<option value="' + p.i + '"' + (String(sel) === String(p.i) ? ' selected' : '') + '>' + esc(p.b + ' · ' + p.n + ' (' + fmtCount(p.mq) + ' pcs MTD)') + '</option>'; }).join('') + '</select></div>';
    }
    var selLabel = com === 'SALMO' ? 'Saldo Mobo' : com === 'SPI' ? 'SP Injection' : (com === 'SP' ? ({ ZERO_ORI3GB: 'SP ZERO + ORI 3GB', ZERO: 'SP ZERO', ORI3GB: 'SP ORI 3GB', all: 'Semua SP' }[sel] || ((F.products[+sel] || {}).n || 'produk')) : (sel === 'all' ? 'Semua voucher isi' : ((F.products[+sel] || {}).n || 'produk')));
    function cells(S, base) {
      return S.map(function (n, i) {
        var share = base ? n / base : 0;
        var bg = !n ? 'transparent' : (i === 0 ? 'rgba(220,38,38,' + (0.08 + 0.5 * Math.min(1, share)).toFixed(2) + ')' : 'rgba(22,163,74,' + (0.08 + 0.7 * Math.min(1, share * 2)).toFixed(2) + ')');
        return '<td class="num" style="text-align:center; background:' + bg + ';"><b>' + (n ? fmtCount(n) : '·') + '</b>' + (n && base ? '<br><span style="font-size:10px; color:var(--ij-muted);">' + pctOf(n, base) + '%</span>' : '') + '</td>';
      }).join('');
    }
    var body = '';
    var G = { base: 0, buyers: 0, tot: 0, slabs: slabs.map(function () { return 0; }) };
    R.areas.forEach(function (A) {
      G.base += A.base; G.buyers += A.buyers; G.tot += A.tot; A.slabs.forEach(function (n, i) { G.slabs[i] += n; });
      if (R.areas.length > 1 || A.list.length > 1) body += '<tr style="background:var(--ij-wash, #f6f4f1); font-weight:800;"><td class="cur">' + esc(A.area) + '<br><span class="note" style="font-weight:500;">HoA ' + esc(A.hoa) + ' · ' + A.list.length + ' MC</span></td><td class="num">' + fmtCount(A.base) + '</td><td class="num">' + fmtCount(A.buyers) + '</td><td class="num">' + pctOf(A.buyers, A.base) + '%</td>' + cells(A.slabs, A.base) + '<td class="num">' + (isRp ? pjRp(A.tot) : fmtCount(A.tot)) + '</td></tr>';
      A.list.forEach(function (M) {
        var buyers = M.buyersM + M.buyersA;
        body += '<tr><td class="cur" style="padding-left:24px;">' + esc(M.mc) + '<br><span class="note">DSO ' + esc(M.dso) + (M.buyersA ? ' · ' + M.buyersA + ' outlet adhoc' : '') + (isDse && M.base ? ' · ' + M.base + ' DSE' : '') + '</span></td><td class="num">' + fmtCount(M.base) + '</td><td class="num"><b>' + fmtCount(buyers) + '</b></td><td class="num">' + pctOf(buyers, M.base) + '%</td>' + cells(M.slabs, M.base) + '<td class="num">' + (isRp ? pjRp(M.tot) : fmtCount(M.tot)) + '</td></tr>';
      });
    });
    if (R.areas.length > 1 || (R.areas[0] && R.areas[0].list.length > 1)) body += '<tr style="background:var(--ij-wash, #f6f4f1); font-weight:800; border-top:2px solid var(--ij-ink);"><td class="cur">TOTAL · ' + esc(scopeText()) + '</td><td class="num">' + fmtCount(G.base) + '</td><td class="num">' + fmtCount(G.buyers) + '</td><td class="num">' + pctOf(G.buyers, G.base) + '%</td>' + cells(G.slabs, G.base) + '<td class="num">' + (isRp ? pjRp(G.tot) : fmtCount(G.tot)) + '</td></tr>';
    var head = th('Area › Micro Cluster') + th(isDse ? 'DSE master' : 'Outlet master', 1) + th(isDse ? 'DSE dengan Sell-In MTD' : 'Outlet beli MTD', 1) + th(isDse ? '% DSE' : '% beli', 1) + slabs.map(function (s) { return '<th class="num" style="text-align:center;">' + esc(s[2]) + (isRp ? '' : ' pcs') + '</th>'; }).join('') + th(isRp ? 'Total saldo MTD' : 'Total pcs MTD', 1);
    var note = isDse
      ? 'Sel = jumlah DSE di Area/MC yang <b>total Sell-In MTD seluruh outlet master binaannya</b> jatuh di slab itu (persen = terhadap DSE master di baris itu; DSE ditempatkan di MC tempat outletnya paling banyak). Slab 0 (zero) = DSE yang outlet binaannya tidak membeli produk terpilih sama sekali. Outlet adhoc tidak punya DSE sehingga tidak ikut. Slab SP dan voucher untuk DSE: 0, 1, 2–10, 11–20, 21–30, 31–50, > 50 pcs; saldo dalam rupiah.'
      : 'Sel = jumlah outlet di Area/MC yang total Sell-In MTD-nya jatuh di slab itu (persen = terhadap outlet master di baris itu). Slab 0 (zero) = outlet master tanpa Sell-In MTD pada produk terpilih. Outlet adhoc (bukan master) yang membeli dihitung di slab ≥ 1 dan ditambahkan ke "Outlet beli". Filter Brand dan bar Branch/HoA/MC berlaku; slab SP dan voucher dalam pcs, saldo dalam rupiah.';
    return card('Matriks slab Sell-In ke outlet · ' + (isDse ? 'jumlah DSE' : 'jumlah outlet') + ' per slab · ' + esc(selLabel) + ' · MTD 1–' + F.metadata.cut_day + ' Okt',
      '<div class="map-toolbar" style="margin-bottom:8px;">' + comBar + prodBar + '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">' + note + '</p>');
  }

  function viewPenjualan() {
    var F = pjFeed();
    if (!F) return card('Penjualan', '<p class="note">Feed penjualan belum dibangun. Jalankan <code>python3 scripts/build_penjualan_feed.py</code>.</p>');
    var M = F.metadata, n = M.cut_day, tab = state.pjTab || 'ringkasan', b = state.pjBrand || 'all';
    if (!PJ_TABS.some(function (t) { return t[0] === tab; })) tab = state.pjTab = 'ringkasan';
    var rows = pjOutlets(F), A = pjAgg(rows), masterN = pjMasterInScope(F);
    var nav = '<div class="sub-nav" role="tablist">' + PJ_TABS.map(function (t) { return '<button type="button" role="tab" class="sub-nav-btn' + (tab === t[0] ? ' active' : '') + '" data-pj-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var tools = '<div class="map-toolbar" style="margin-top:10px;"><div class="map-toolbar-group"><span class="map-label">Brand:</span>' +
      [['all', 'Semua'], ['IM3', 'IM3'], ['3ID', '3ID']].map(function (x) { return '<button type="button" class="map-btn' + (b === x[0] ? ' active' : '') + '" data-pj-brand="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="map-toolbar-group"><span class="map-label">SP Injection:</span><button type="button" class="map-btn' + (pjSpiOn() ? ' active' : '') + '" data-pj-spi="on" aria-pressed="' + pjSpiOn() + '">Termasuk SP Injection</button><button type="button" class="map-btn' + (!pjSpiOn() ? ' active' : '') + '" data-pj-spi="off" aria-pressed="' + !pjSpiOn() + '">Tanpa</button></div>' +
      '<div class="map-toolbar-group"><input type="text" id="pjSearchInput" aria-label="Cari outlet, produk, node, MC atau DSE" placeholder="🔍 Cari outlet, produk, node, MC, DSE..." value="' + esc(state.pjSearch || '') + '" class="map-select" style="min-width:260px;">' +
      ((state.pjSearch || state.branch || state.hoa || state.kec || state.pjDse || b !== 'all' || pjCat() !== 'all' || (state.pjLevel && state.pjLevel !== 'auto')) ? '<button type="button" class="btn" data-act="clear-pj-filter" style="font-size:12px; padding:6px 12px;">Reset filter</button>' : '') + '</div>' +
      '<div class="map-toolbar-group"><span class="note">Sumber DAILY_DATA_MOBII · cut ' + esc(M.cut) + ' · MTD 1–' + n + ' Okt vs LMTD 1–' + n + ' Sep · satuan: M = milyar, Jt = juta, Rb = ribu' + (pjSpiOn() && M.spi ? ' · SP Injection dari DAILY_DATA_MOBO, MTD saja (LMTD dan bulan penuh belum ada): growth dan Gap dihitung tanpa SP Injection' : '') + '</span></div></div>';
    var T = A.tot, LD = pjLd(F, rows), ldTxt = 'Hari kerja terakhir ' + LD.W.short + ': ';
    var kpis = '<div class="kpis" style="margin-top:10px; grid-template-columns: repeat(4, 1fr);">' +
      kpi('Total Sell-In ke outlet · MTD', pjRp(T.mv), 'LMTD ' + pjRp(T.lv) + ' · ' + (pjGrowthPct(pjMx(T), T.lv) == null ? '—' : (pjGrowthPct(pjMx(T), T.lv) >= 0 ? '+' : '') + pjGrowthPct(pjMx(T), T.lv).toFixed(1) + '%'), pjGrowthPct(pjMx(T), T.lv) >= 0 ? 'up' : 'down', 'September penuh ' + pjRp(T.fv) + ' · ' + ldTxt + pjRp(LD.D.tot.v)) +
      kpi('UAR · outlet aktif beli MTD', fmtCount(T.om), pctOf(T.om, masterN) + '% dari ' + fmtCount(masterN) + ' outlet master di lingkup', 'up', 'LMTD ' + fmtCount(T.ol) + ' · ' + fmtCount(rows.filter(function (o) { return o.tier === 'A'; }).length) + ' outlet adhoc ikut dihitung · ' + ldTxt + fmtCount(LD.D.tot.u) + ' outlet beli') +
      kpi('Run-rate akhir Oktober', pjRp(T.mv / n * (M.mtd_month_days || 31)), 'vs September penuh ' + pjRp(T.fv), T.mv / n * 31 >= T.fv ? 'up' : 'down', 'Nilai MTD ÷ ' + n + ' hari × 31 · ' + ldTxt + pjRp(LD.D.tot.v) + ' vs rata-rata ' + pjRp(T.mv / n) + '/hari') +
      kpi('Penjualan hari kerja terakhir · ' + LD.W.label, pjRp(LD.D.tot.v), 'vs ' + LD.W.prevShort + ' ' + pjRp(LD.P.tot.v) + ldDelta(LD.D.tot.v, LD.P.tot.v), LD.D.tot.v >= LD.P.tot.v ? 'up' : 'down', 'SP ' + fmtCount(LD.D.SP.q) + ' pcs · Voucher ' + fmtCount(LD.D.VC.q) + ' pcs · Saldo ' + pjRp(LD.D.SALMO.v)) +
    '</div>';
    var body = tab === 'ringkasan' ? pjRingkasan(F, rows, A) : (tab === 'teritori' ? pjTeritori(F) : (tab === 'heat' ? pjHeat(F) : (tab === 'slab' ? pjSlabTab(F) : (tab === 'sga' ? viewSlabSga('pj') : (tab === 'produk' ? pjProduk(F) : pjOutletTab(F))))));
    return nav + tools + pjSelectionBand(F) + pjScorecard(F, rows) + kpis + body;
  }

  /* ================= OPPORTUNITY · PROGRAM (UAR, Rabu Mantap, Kota/Kab Khusus) & ZERO IMPROVEMENT ================= */
  var OP_TABS = [['program', '🎯 Program'], ['zero', '🚫 Zero Improvement']];
  var OP_PROGRAMS = [['uar', 'UAR Improvement · insentif DSE'], ['rabu', 'Rabu Mantap · cashback outlet'], ['kotkab', 'Kota/Kab Khusus · penetrasi SP']];
  var OP_KOTKAB_BRANCHES = ['BEKASI', 'KAB BEKASI', 'CENTRAL NORTH JAKARTA'];
  var OP_RABU_TIERS = [[100000, 1500], [500000, 7500], [1000000, 20000], [3000000, 68000], [5000000, 126000]];
  var OP_UAR_CAP = 1000000;
  function opPager(total, pageSize) {
    var page = state.opPage || 1, totalPages = Math.ceil(total / pageSize) || 1;
    if (page > totalPages) { page = totalPages; state.opPage = page; }
    var start = (page - 1) * pageSize;
    return { start: start, end: Math.min(start + pageSize, total), html: '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">' +
      '<span class="note">Menampilkan ' + (total ? start + 1 : 0) + '–' + Math.min(start + pageSize, total) + ' dari ' + fmtCount(total) + '</span>' +
      '<div style="display:flex; gap:6px;"><button type="button" class="btn" data-op-page="prev"' + (page <= 1 ? ' disabled style="opacity:0.5;"' : '') + '>&larr; Sebelumnya</button>' +
      '<span style="padding:4px 8px; font:700 12.5px var(--ij-font);">Hal ' + page + ' / ' + totalPages + '</span>' +
      '<button type="button" class="btn" data-op-page="next"' + (page >= totalPages ? ' disabled style="opacity:0.5;"' : '') + '>Berikutnya &rarr;</button></div></div>' };
  }
  function opVisitsFeed() { return (typeof window !== 'undefined' && window.dseVisitsFeed) ? window.dseVisitsFeed : (typeof dseVisitsFeed !== 'undefined' ? dseVisitsFeed : null); }
  // DSE index: master dse name -> { codes, visits row (PJP execution), mc, br }
  function opDseIndex(F) {
    if (F._opDse) return F._opDse;
    var vf = opVisitsFeed(), byCode = {}, byName = {};
    ((vf && vf.dses) || []).forEach(function (d) { byName[String(d.dse_name).toUpperCase()] = d; (d.logins || []).forEach(function (l) { var c = l.split(':')[1] || ''; byCode[c] = d; byCode[c + '3ID'] = d; if (c.slice(-3) === '3ID') byCode[c.slice(0, -3)] = d; }); });
    var idx = terrIndex(), terr = (typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED : (typeof TERRITORY_FEED !== 'undefined' ? TERRITORY_FEED : null);
    var out = {};
    ((terr && terr.outlets) || []).forEach(function (o) {
      var d = String(o.dse_name || 'UNASSIGNED').trim().toUpperCase(); if (d.slice(-2) === '.0') d = d.slice(0, -2);
      var R = out[d] || (out[d] = { name: d, codes: {}, mcs: {}, base: 0, visits: null, dso: o.dso_leader || '—', br: o.branch || '—' });
      R.base++; (idx.codesByOutlet[o.outlet_key] || []).forEach(function (c) { R.codes[c] = 1; }); R.mcs[o.micro_cluster] = (R.mcs[o.micro_cluster] || 0) + 1;
    });
    Object.keys(out).forEach(function (d) {
      var R = out[d]; R.mc = Object.keys(R.mcs).sort(function (a, b) { return R.mcs[b] - R.mcs[a]; })[0] || '—';
      R.visits = byName[d] || null; if (!R.visits) Object.keys(R.codes).some(function (c) { if (byCode[c]) { R.visits = byCode[c]; return true; } return false; });
    });
    F._opDse = out; return out;
  }
  function opSpUnitsByBrand(F, o) {
    var u = { IM3: 0, '3ID': 0 };
    Object.keys(o.p || {}).forEach(function (pi) { var pr = F.products[+pi]; if (pr && pr.cat === 'SP') u[pr.b] = (u[pr.b] || 0) + o.p[pi][0]; });
    return u;
  }
  function opSpUnitsDays(o, d1, d2) { var q = 0; ((o.c.SP || [])[10] || []).forEach(function (e) { if (e[0] >= d1 && e[0] <= d2) q += e[2] || 0; }); return q; }
  function opTierLabel(t) { return ['—', 'UAR 3', 'UAR 5', 'UAR 10', 'UAR 20'][t] || '—'; }
  // ---------- UAR Improvement ----------
  // GA per brand MTD (Daily_RGUGA_OUTLET) of a master outlet; early = GA on days 1-7 (all brands)
  function opGaUnits(o) {
    var G = gaPrep(), x = G && G.by[o.k], u = { IM3: 0, '3ID': 0 }, early = 0;
    if (x) { u.IM3 = gaStat(x, 'IM3').cur; u['3ID'] = gaStat(x, '3ID').cur; early = gaStat(x, 'all').w1; }
    return { u: u, early: early };
  }
  function opUarOutlet(F, o) {
    var gu = opGaUnits(o), u = gu.u, comb = u.IM3 + u['3ID'];
    var inc = 0, tier = 0, detail = [];
    if (comb >= 20) { inc = 200000; tier = 4; detail.push('UAR 20 gabungan'); }
    else if (comb >= 10) { inc = 100000; tier = 3; detail.push('UAR 10 gabungan'); }
    else {
      ['IM3', '3ID'].forEach(function (b) { if (u[b] >= 5) { inc += 35000; tier = Math.max(tier, 2); detail.push('UAR 5 ' + b); } else if (u[b] >= 3) { inc += 15000; tier = Math.max(tier, 1); detail.push('UAR 3 ' + b); } });
    }
    var early = gu.early >= 5; if (early && tier >= 2) inc += 5000;
    var uar3 = u.IM3 >= 3 || u['3ID'] >= 3;
    var next = comb >= 20 ? null : (comb >= 10 ? { label: 'UAR 20', gap: 20 - comb } : (Math.max(u.IM3, u['3ID']) >= 5 ? { label: 'UAR 10', gap: 10 - comb } : (Math.max(u.IM3, u['3ID']) >= 3 ? { label: 'UAR 5', gap: 5 - Math.max(u.IM3, u['3ID']) } : { label: 'UAR 3', gap: 3 - Math.max(u.IM3, u['3ID']) })));
    return { u: u, comb: comb, inc: inc, tier: tier, detail: detail, early: early, uar3: uar3, next: next };
  }
  function opUar(F) {
    var rows = pjOutlets(F).filter(function (o) { return o.tier === 'M'; });
    var D = opDseIndex(F), byDse = {}, perOutlet = [];
    rows.forEach(function (o) { var r = opUarOutlet(F, o); r.o = o; perOutlet.push(r); var R = byDse[o.dse] || (byDse[o.dse] = { name: o.dse, base: (D[o.dse] || {}).base || 0, mc: (D[o.dse] || {}).mc || o.mc, dso: (D[o.dse] || {}).dso || '—', br: (D[o.dse] || {}).br || '—', uar3: 0, t: [0, 0, 0, 0, 0], early: 0, inc: 0, outlets: [] }); if (r.uar3) R.uar3++; R.t[r.tier]++; if (r.early && r.tier >= 2) R.early++; R.inc += r.inc; R.outlets.push(r); });
    var dses = Object.keys(byDse).map(function (k) {
      var R = byDse[k], v = (D[k] || {}).visits || null;
      R.uar3pct = R.base ? R.uar3 / R.base * 100 : 0; R.capped = Math.min(OP_UAR_CAP, R.inc);
      R.hit = v ? v.target_hit_rate : null; R.planned = v ? v.planned_visits : null; R.exec = v ? v.actual_visits : null;
      R.compUar = R.uar3pct >= 50; R.compPjp = v ? v.target_hit_rate >= 100 : false; R.eligible = R.compUar && R.compPjp;
      R.pjpOnTrack = v ? v.target_hit_rate >= 90 : false;
      return R;
    }).sort(function (a, b) { return b.capped - a.capped || b.uar3pct - a.uar3pct; });
    var mcs = {};
    dses.forEach(function (R) { var M = mcs[R.mc] || (mcs[R.mc] = { mc: R.mc, dso: R.dso, br: R.br, dse: 0, elig: 0, base: 0, uar3: 0, t: [0, 0, 0, 0, 0], inc: 0, capped: 0 }); M.dse++; if (R.eligible) M.elig++; M.base += R.base; M.uar3 += R.uar3; R.t.forEach(function (n, i) { M.t[i] += n; }); M.inc += R.inc; M.capped += R.capped; });
    return { perOutlet: perOutlet, dses: dses, mcs: Object.keys(mcs).map(function (k) { return mcs[k]; }).sort(function (a, b) { return b.capped - a.capped; }), base: rows.length };
  }
  function opUarTab(F) {
    var A = opUar(F), n = F.metadata.cut_day, gp = gaPrep(), gcut = gp ? gp.cut : n;
    var T = { base: 0, uar3: 0, t: [0, 0, 0, 0, 0], inc: 0, capped: 0, elig: 0, early: 0 };
    A.dses.forEach(function (R) { T.base += R.base; T.uar3 += R.uar3; R.t.forEach(function (x, i) { T.t[i] += x; }); T.inc += R.inc; T.capped += R.capped; if (R.eligible) T.elig++; T.early += R.early; });
    var near = { u3: 0, u5: 0, u10: 0, u20: 0 };
    A.perOutlet.forEach(function (r) { if (r.next && r.next.gap <= 2) { if (r.next.label === 'UAR 3') near.u3++; else if (r.next.label === 'UAR 5') near.u5++; else if (r.next.label === 'UAR 10') near.u10++; else near.u20++; } });
    var rules = card('Aturan program dan translasinya ke data GA (SSO)',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Aturan (slide)') + th('Translasi ke data GA (Daily_RGUGA_OUTLET)') + '</tr></thead><tbody>' +
      '<tr><td class="cur">UAR 3 per brand → Rp 15.000/outlet; UAR 5 per brand → Rp 35.000/outlet</td><td>UAR n = outlet master dengan <b>n gross add (GA) MTD (1–' + gcut + ' Okt)</b> pada brand itu, dari GA per outlet di Daily_RGUGA_OUTLET (bukan lagi unit SP sell-in).' + (gp ? '' : ' <span class="alert-tag">Feed GA belum dibangun: semua outlet terbaca 0 GA.</span>') + '</td></tr>' +
      '<tr><td class="cur">UAR 10 gabungan → Rp 100.000; UAR 20 gabungan → Rp 200.000</td><td>GA IM3 + 3ID pada outlet yang sama. Tier tertinggi yang dipakai (tidak kumulatif); di bawah 10 GA gabungan, tier per brand dijumlahkan.</td></tr>' +
      '<tr><td class="cur">Maksimum Rp 1.000.000 / DSE</td><td>Insentif per DSE = jumlah insentif outlet binaannya (master), dipotong Rp 1 jt.</td></tr>' +
      '<tr><td class="cur">Compliance: 50% UAR 3; 100% PJP visit 1–14 Okt</td><td>≥ 50% outlet binaan mencapai UAR 3 pada salah satu brand; % sukses PJP dari feed kunjungan (saat ini ' + pjpPeriod('mtd',{id:1,nopad:1}) + '; 100% = terlaksana = rencana). "On track" bila ≥ 90%.</td></tr>' +
      '<tr><td class="cur">UAR 5 dicapai 1–7 Okt → +Rp 5.000/outlet</td><td>GA outlet pada hari 1–7 ≥ 5 (semua brand) dan outlet minimal di tier UAR 5.</td></tr>' +
      '<tr><td class="cur">Outlet AVA tidak eligible</td><td><span class="alert-tag">Belum bisa diterapkan</span> master tidak punya flag AVA; perlu daftar outlet AVA.</td></tr>' +
      '</tbody></table></div>');
    var kpis = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet binaan (master, lingkup)', fmtCount(T.base), fmtCount(T.uar3) + ' outlet UAR 3+ (' + pctOf(T.uar3, T.base) + '%)', 'up', 'UAR 3 pada salah satu brand') +
      kpi('Outlet per tier', fmtCount(T.t[1] + T.t[2] + T.t[3] + T.t[4]), 'UAR3 ' + fmtCount(T.t[1]) + ' · UAR5 ' + fmtCount(T.t[2]) + ' · UAR10 ' + fmtCount(T.t[3]) + ' · UAR20 ' + fmtCount(T.t[4]), 'up', fmtCount(T.t[0]) + ' outlet belum mencapai UAR 3') +
      kpi('Insentif DSE (setelah cap)', pjRp(T.capped), 'sebelum cap ' + pjRp(T.inc) + ' · ' + fmtCount(T.early) + ' outlet bonus awal bulan', 'up', 'Hanya DSE yang comply yang dibayar') +
      kpi('DSE comply (50% UAR3 + PJP 100%)', fmtCount(T.elig) + ' / ' + fmtCount(A.dses.length), fmtCount(A.dses.filter(function (R) { return R.compUar; }).length) + ' lolos UAR 50% · ' + fmtCount(A.dses.filter(function (R) { return R.pjpOnTrack; }).length) + ' PJP ≥ 90%', T.elig ? 'up' : 'down', 'PJP dinilai sampai ' + pjpPeriod('end', {id:1}) + '') +
      kpi('Outlet hampir naik tier (≤ 2 GA lagi)', fmtCount(near.u3 + near.u5 + near.u10 + near.u20), '→UAR3 ' + fmtCount(near.u3) + ' · →UAR5 ' + fmtCount(near.u5) + ' · →UAR10 ' + fmtCount(near.u10) + ' · →UAR20 ' + fmtCount(near.u20), 'up', 'Prioritas kunjungan dan dorongan aktivasi (GA)') +
    '</div>';
    var mcRows = A.mcs.map(function (M) { return '<tr><td class="cur"><b>' + esc(M.mc) + '</b><br><span class="note">' + esc(M.br) + ' · DSO ' + esc(M.dso) + '</span></td><td class="num">' + M.dse + '</td><td class="num">' + M.elig + '</td><td class="num">' + fmtCount(M.base) + '</td><td class="num"><b>' + fmtCount(M.uar3) + '</b> (' + pctOf(M.uar3, M.base) + '%)</td><td class="num">' + M.t[1] + '</td><td class="num">' + M.t[2] + '</td><td class="num">' + M.t[3] + '</td><td class="num">' + M.t[4] + '</td><td class="num">' + pjRp(M.inc) + '</td><td class="num cur"><b>' + pjRp(M.capped) + '</b></td><td>' + '<button type="button" class="btn" data-pj-detail="mc" data-mc="' + esc(M.mc) + '" style="font-size:11.5px; padding:5px 9px;">Fokus MC &#8594;</button></td></tr>'; }).join('');
    if (A.mcs.length > 1) { var uT = A.mcs.reduce(function (a, M) { a.dse += M.dse; a.elig += M.elig; a.base += M.base; a.uar3 += M.uar3; a.t = a.t.map(function (x, i) { return x + M.t[i]; }); a.inc += M.inc; a.capped += M.capped; return a; }, { dse: 0, elig: 0, base: 0, uar3: 0, t: [0, 0, 0, 0, 0], inc: 0, capped: 0 });
      mcRows += '<tr class="tot-row" style="' + TOT_ST + '"><td><b>TOTAL · ' + fmtCount(A.mcs.length) + ' MC</b></td>' + totNum(fmtCount(uT.dse)) + totNum(fmtCount(uT.elig)) + totNum(fmtCount(uT.base)) + totNum('<b>' + fmtCount(uT.uar3) + '</b> (' + pctOf(uT.uar3, uT.base) + '%)') + totNum(uT.t[1]) + totNum(uT.t[2]) + totNum(uT.t[3]) + totNum(uT.t[4]) + totNum(pjRp(uT.inc)) + totNum('<b>' + pjRp(uT.capped) + '</b>') + '<td></td></tr>'; }
    var mcCard = card('Profil Micro Cluster / DSO · UAR Improvement', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('MC · DSO') + th('DSE', 1) + th('DSE comply', 1) + th('Outlet binaan', 1) + th('UAR 3+', 1) + th('T. UAR3', 1) + th('T. UAR5', 1) + th('T. UAR10', 1) + th('T. UAR20', 1) + th('Insentif', 1) + th('Setelah cap', 1) + th('') + '</tr></thead><tbody>' + mcRows + '</tbody></table></div>');
    function dseRowsFn(R) {
      var pjp = R.hit == null ? '<span class="note">tidak ada PJP</span>' : '<span class="' + (R.compPjp ? 'good-tag' : (R.pjpOnTrack ? '' : 'alert-tag')) + '">' + R.hit + '%</span> <span class="note">' + fmtCount(R.exec) + '/' + fmtCount(R.planned) + '</span>';
      return '<tr><td class="cur"><b>' + esc(R.name) + '</b><br><span class="note">' + esc(R.mc) + ' · ' + esc(R.dso) + '</span></td><td class="num">' + fmtCount(R.base) + '</td><td class="num"><b>' + R.uar3 + '</b> <span class="' + (R.compUar ? 'good-tag' : 'alert-tag') + '">' + R.uar3pct.toFixed(0) + '%</span></td><td class="num">' + R.t[1] + '</td><td class="num">' + R.t[2] + '</td><td class="num">' + R.t[3] + '</td><td class="num">' + R.t[4] + '</td><td class="num">' + R.early + '</td><td>' + pjp + '</td><td class="num">' + pjRp(R.inc) + '</td><td class="num cur"><b>' + pjRp(R.capped) + '</b></td><td>' + (R.eligible ? '<span class="good-tag">Comply</span>' : (R.compUar ? '<span style="background:#fef3c7; color:#92400e; padding:2px 7px; font-weight:800; font-size:11px;">PJP belum 100%</span>' : '<span class="alert-tag">UAR3 < 50%</span>')) + '</td><td><button type="button" class="btn" data-pj-detail="dse" data-dse="' + esc(R.name) + '" style="font-size:11.5px; padding:5px 9px;">Outlet &#8594;</button></td></tr>';
    }
    function dseRowsSub(x) { return '<td class="num">' + fmtCount(grpSum(x, function (R) { return R.base; })) + '</td><td class="num">' + fmtCount(grpSum(x, function (R) { return R.uar3; })) + '</td>' + [1, 2, 3, 4].map(function (k) { return '<td class="num">' + grpSum(x, function (R) { return R.t[k]; }) + '</td>'; }).join('') + '<td class="num">' + grpSum(x, function (R) { return R.early; }) + '</td><td></td><td class="num">' + pjRp(grpSum(x, function (R) { return R.inc; })) + '</td><td class="num cur"><b>' + pjRp(grpSum(x, function (R) { return R.capped; })) + '</b></td><td colspan="2"></td>'; }
    var dseRows = grpMi(F, 'opuar-dse', A.dses, function (R) { return R.mc; }, { row: dseRowsFn, sub: dseRowsSub, span: 1, cols: 13, val: function (R) { return R.capped; }, unit: 'DSE', search: false });
    var dseCard = card('Profil DSE · insentif dan compliance (' + fmtCount(A.dses.length) + ' DSE)', '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('opuar-dse') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › DSE') + th('Outlet binaan', 1) + th('UAR 3+ (≥50%)', 1) + th('UAR3', 1) + th('UAR5', 1) + th('UAR10', 1) + th('UAR20', 1) + th('Bonus 1–7', 1) + th('PJP ' + pjpPeriod('mtd',{id:1,nopad:1}) + '') + th('Insentif', 1) + th('Setelah cap', 1) + th('Status') + th('') + '</tr></thead><tbody>' + dseRows + '</tbody></table></div>' + '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka, baris grup menjumlahkan isinya.</p>');
    var outs = A.perOutlet.slice().sort(function (a, b) { return b.inc - a.inc || b.comb - a.comb; });
    function oRowsFn(r) { var o = r.o; return '<tr><td class="cur"><b>' + esc(o.n || o.id) + '</b><br><span class="note"><code>' + esc(o.k) + '</code></span></td><td>' + esc(o.mc) + '<br><span class="note">' + esc(o.dse) + '</span></td><td class="num">' + r.u.IM3 + '</td><td class="num">' + r.u['3ID'] + '</td><td class="num"><b>' + r.comb + '</b></td><td>' + (r.tier ? '<span class="good-tag">' + opTierLabel(r.tier) + '</span>' : '<span class="alert-tag">—</span>') + (r.early && r.tier >= 2 ? ' <span class="note">+5 rb</span>' : '') + '</td><td class="num">' + (r.inc ? pjRp(r.inc) : '·') + '</td><td>' + (r.next ? esc(r.next.label) + ' · kurang ' + r.next.gap + ' GA' : 'tier maksimal') + '</td></tr>'; }
    function oRowsSub(x) { return '<td class="num">' + grpSum(x, function (r) { return r.u.IM3; }) + '</td><td class="num">' + grpSum(x, function (r) { return r.u['3ID']; }) + '</td><td class="num"><b>' + grpSum(x, function (r) { return r.comb; }) + '</b></td><td></td><td class="num">' + pjRp(grpSum(x, function (r) { return r.inc; })) + '</td><td></td>'; }
    var oRows = grpMi(F, 'opuar-out', outs, function (r) { return r.o.mc; }, { row: oRowsFn, sub: oRowsSub, span: 2, cols: 8, val: function (r) { return r.inc; }, unit: 'outlet', search: false });
    var outCard = card('Profil outlet · GA MTD per brand, tier dan jarak ke tier berikut', '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('opuar-out') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › Outlet') + th('MC · DSE') + th('GA IM3', 1) + th('GA 3ID', 1) + th('Gabungan', 1) + th('Tier') + th('Insentif', 1) + th('Tier berikut') + '</tr></thead><tbody>' + oRows + '</tbody></table></div>' + '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka, baris grup menjumlahkan isinya.</p>');
    return rules + kpis + mcCard + dseCard + outCard;
  }
  // ---------- Rabu Mantap ----------
  function opRabuWindows(F) {
    var days = F.metadata.days_mtd || [], w = [], cur = null;
    days.forEach(function (d, i) { var dow = new Date(d + 'T00:00:00').getDay(); if (dow === 3 || (dow >= 4 && dow <= 5 && cur && cur.open)) { if (dow === 3 || !cur) { cur = { days: [], label: '', open: true }; w.push(cur); } cur.days.push(i + 1); if (dow === 5) cur.open = false; } else if (dow === 4 || dow === 5) { if (!cur || !cur.open) { cur = { days: [], label: '', open: dow === 4, partial: true }; w.push(cur); } cur.days.push(i + 1); if (dow === 5) cur.open = false; } });
    w.forEach(function (x) { var a = x.days[0], b = x.days[x.days.length - 1]; x.label = (x.partial ? 'Kam–Jum ' : 'Rab–Jum ') + a + '–' + b + ' Okt' + (x.partial ? ' (parsial, Rabu 30 Sep di luar data)' : ''); x.key = a + '-' + b; });
    return w;
  }
  function opRabuAmount(o, days, basis) {
    var cats = basis === 'all' ? ['SP', 'VCB', 'SALMO'] : ['SP', 'VCB'], v = 0;
    cats.forEach(function (c) { ((o.c[c] || [])[10] || []).forEach(function (e) { if (days.indexOf(e[0]) >= 0) v += e[1]; }); });
    return v;
  }
  function opRabuTier(v) { var t = -1; OP_RABU_TIERS.forEach(function (x, i) { if (v >= x[0]) t = i; }); return t; }
  function opRabuTab(F) {
    var wins = opRabuWindows(F), wi = Math.min(state.opRabuWeek == null ? wins.length - 1 : state.opRabuWeek, wins.length - 1), W = wins[wi] || { days: [], label: '—' };
    var basis = state.opRabuBasis || 'fisik';
    var rows = pjOutlets(F);
    var per = rows.map(function (o) { var v = opRabuAmount(o, W.days, basis), t = opRabuTier(v); var next = t < OP_RABU_TIERS.length - 1 ? OP_RABU_TIERS[t + 1][0] - v : null; return { o: o, v: v, t: t, cb: t >= 0 ? OP_RABU_TIERS[t][1] : 0, next: next }; });
    var tierCount = OP_RABU_TIERS.map(function () { return 0; }), cbTot = 0, active = 0, near = 0;
    per.forEach(function (r) { if (r.t >= 0) { tierCount[r.t]++; cbTot += r.cb; } if (r.v > 0) active++; if (r.v > 0 && r.next != null && r.next <= 50000) near++; });
    var rules = card('Aturan program dan translasinya',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Aturan (slide)') + th('Translasi') + '</tr></thead><tbody>' +
      '<tr><td class="cur">Periode Rabu–Jumat (contoh 7–9 Okt 2026)</td><td>Jendela: ' + wins.map(function (x) { return esc(x.label); }).join('; ') + '. Pilih jendela di bawah.</td></tr>' +
      '<tr><td class="cur">Transaksi akumulasi 100 Rb / 500 Rb / 1 Jt / 3 Jt / 5 Jt → total cashback Rp 1.500 / 7.500 / 20.000 / 68.000 / 126.000</td><td>Akumulasi nilai Sell-In outlet pada hari-hari jendela; cashback = total tier tertinggi yang tercapai (bertingkat).</td></tr>' +
      '<tr><td class="cur">Transaksi yang dihitung: inject fisik, kecuali voucher ori</td><td>Default: <b>Starter Pack + voucher blank</b> (fisik). Opsi "termasuk saldo Mobo" bila inject saldo ikut dihitung. Voucher isi (ORI) selalu dikecualikan.</td></tr>' +
      '<tr><td class="cur">Berlaku Jabodetabek, Banten, Jabar; tidak untuk peserta program BOSS; cashback D+1 ke saldo Mobo</td><td>Semua outlet Inner Jakarta memenuhi wilayah. <span class="alert-tag">Daftar peserta BOSS tidak ada</span>; belum dikecualikan. Slide berlogo IM3: pakai tombol Brand bila hanya IM3.</td></tr>' +
      '</tbody></table></div>');
    var ctrl = '<div class="map-toolbar" style="margin-top:10px;"><div class="map-toolbar-group"><span class="map-label">Jendela:</span>' + wins.map(function (x, i) { return '<button type="button" class="map-btn' + (i === wi ? ' active' : '') + '" data-op-week="' + i + '">' + esc(x.label.split(' (')[0]) + '</button>'; }).join('') + '</div>' +
      '<div class="map-toolbar-group"><span class="map-label">Dasar:</span><button type="button" class="map-btn' + (basis === 'fisik' ? ' active' : '') + '" data-op-basis="fisik">SP + voucher blank (fisik)</button><button type="button" class="map-btn' + (basis === 'all' ? ' active' : '') + '" data-op-basis="all">Termasuk saldo Mobo</button></div></div>';
    var kpis = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet bertransaksi di jendela', fmtCount(active), 'dari ' + fmtCount(rows.length) + ' outlet dalam lingkup', 'up', esc(W.label)) +
      kpi('Outlet dapat cashback (≥ 100 Rb)', fmtCount(tierCount.reduce(function (a, b) { return a + b; }, 0)), OP_RABU_TIERS.map(function (x, i) { return pjRp(x[0]).replace('Rp ', '') + ': ' + tierCount[i]; }).join(' · '), 'up', 'tier tertinggi per outlet') +
      kpi('Beban cashback jendela ini', pjRp(cbTot), 'rata-rata ' + (tierCount.reduce(function (a, b) { return a + b; }, 0) ? pjRp(cbTot / tierCount.reduce(function (a, b) { return a + b; }, 0)) : '—') + ' per outlet penerima', 'up', 'dibayar D+1 sebagai saldo Mobo') +
      kpi('Hampir naik tier (≤ Rp 50 Rb lagi)', fmtCount(near), 'outlet yang bisa didorong di hari Jumat', 'up', 'lihat kolom "kurang" di tabel outlet') +
    '</div>';
    var byMc = {}, byDse = {};
    per.forEach(function (r) { var o = r.o; var M = byMc[o.mc] || (byMc[o.mc] = { mc: o.mc, dso: ((F.metadata.mc_info || {})[o.mc] || {}).dso || '—', n: 0, act: 0, t: OP_RABU_TIERS.map(function () { return 0; }), cb: 0, v: 0 }); M.n++; if (r.v > 0) M.act++; if (r.t >= 0) { M.t[r.t]++; M.cb += r.cb; } M.v += r.v;
      if (o.tier === 'M') { var Dd = byDse[o.dse] || (byDse[o.dse] = { name: o.dse, mc: o.mc, n: 0, act: 0, t: OP_RABU_TIERS.map(function () { return 0; }), cb: 0, v: 0 }); Dd.n++; if (r.v > 0) Dd.act++; if (r.t >= 0) { Dd.t[r.t]++; Dd.cb += r.cb; } Dd.v += r.v; } });
    function tierCells(t) { return t.map(function (x) { return '<td class="num">' + (x || '·') + '</td>'; }).join(''); }
    var tierHead = OP_RABU_TIERS.map(function (x) { return th('≥ ' + pjRp(x[0]).replace('Rp ', ''), 1); }).join('');
    var mcRows = Object.keys(byMc).map(function (k) { return byMc[k]; }).sort(function (a, b) { return b.cb - a.cb || b.v - a.v; }).map(function (M) { return '<tr><td class="cur"><b>' + esc(M.mc) + '</b><br><span class="note">DSO ' + esc(M.dso) + '</span></td><td class="num">' + fmtCount(M.n) + '</td><td class="num">' + fmtCount(M.act) + '</td><td class="num">' + pjRp(M.v) + '</td>' + tierCells(M.t) + '<td class="num cur"><b>' + pjRp(M.cb) + '</b></td><td><button type="button" class="btn" data-pj-detail="mc" data-mc="' + esc(M.mc) + '" style="font-size:11.5px; padding:5px 9px;">Fokus MC &#8594;</button></td></tr>'; }).join('');
    var rbList = Object.keys(byMc).map(function (k) { return byMc[k]; });
    if (rbList.length > 1) { var rT = rbList.reduce(function (a, M) { a.n += M.n; a.act += M.act; a.v += M.v; a.cb += M.cb; a.t = a.t.map(function (x, i) { return x + M.t[i]; }); return a; }, { n: 0, act: 0, v: 0, cb: 0, t: OP_RABU_TIERS.map(function () { return 0; }) });
      mcRows += '<tr class="tot-row" style="' + TOT_ST + '"><td><b>TOTAL · ' + fmtCount(rbList.length) + ' MC</b></td>' + totNum(fmtCount(rT.n)) + totNum(fmtCount(rT.act)) + totNum(pjRp(rT.v)) + rT.t.map(function (x) { return totNum(x || '·'); }).join('') + totNum('<b>' + pjRp(rT.cb) + '</b>') + '<td></td></tr>'; }
    var mcCard = card('Profil Micro Cluster / DSO · ' + esc(W.label), '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('MC · DSO') + th('Outlet', 1) + th('Bertransaksi', 1) + th('Akumulasi', 1) + tierHead + th('Cashback', 1) + th('') + '</tr></thead><tbody>' + mcRows + '</tbody></table></div>');
    var dl = Object.keys(byDse).map(function (k) { return byDse[k]; }).sort(function (a, b) { return b.cb - a.cb || b.v - a.v; });
    function dseRowsFn(Dd) { return '<tr><td class="cur"><b>' + esc(Dd.name) + '</b><br><span class="note">' + esc(Dd.mc) + '</span></td><td class="num">' + fmtCount(Dd.n) + '</td><td class="num">' + fmtCount(Dd.act) + '</td><td class="num">' + pjRp(Dd.v) + '</td>' + tierCells(Dd.t) + '<td class="num cur"><b>' + pjRp(Dd.cb) + '</b></td><td><button type="button" class="btn" data-pj-detail="dse" data-dse="' + esc(Dd.name) + '" style="font-size:11.5px; padding:5px 9px;">Outlet &#8594;</button></td></tr>'; }
    function dseRowsSub(x) { return '<td class="num">' + fmtCount(grpSum(x, function (Dd) { return Dd.n; })) + '</td><td class="num">' + fmtCount(grpSum(x, function (Dd) { return Dd.act; })) + '</td><td class="num">' + pjRp(grpSum(x, function (Dd) { return Dd.v; })) + '</td>' + OP_RABU_TIERS.map(function (q, i) { var c = grpSum(x, function (Dd) { return Dd.t[i]; }); return '<td class="num">' + (c || '·') + '</td>'; }).join('') + '<td class="num cur"><b>' + pjRp(grpSum(x, function (Dd) { return Dd.cb; })) + '</b></td><td></td>'; }
    var dseRows = grpMi(F, 'oprabu-dse', dl, function (Dd) { return Dd.mc; }, { row: dseRowsFn, sub: dseRowsSub, span: 1, cols: 4 + OP_RABU_TIERS.length + 2, val: function (Dd) { return Dd.cb; }, unit: 'DSE', search: false });
    var dseCard = card('Profil DSE · outlet binaan yang mendapat cashback', '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('oprabu-dse') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › DSE') + th('Outlet binaan aktif', 1) + th('Bertransaksi', 1) + th('Akumulasi', 1) + tierHead + th('Cashback', 1) + th('') + '</tr></thead><tbody>' + dseRows + '</tbody></table></div>' + '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka, baris grup menjumlahkan isinya.</p>');
    var ol = per.filter(function (r) { return r.v > 0; }).sort(function (a, b) { return b.v - a.v; });
    function oRowsFn(r) { var o = r.o; return '<tr><td class="cur"><b>' + esc(o.n || o.id) + '</b><br><span class="note"><span class="' + (o.b === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(o.b) + '</span> <code>' + esc(o.id) + '</code></span></td><td>' + esc(o.mc) + '<br><span class="note">' + esc(o.dse) + '</span></td><td class="num cur"><b>' + pjRp(r.v) + '</b></td><td>' + (r.t >= 0 ? '<span class="good-tag">≥ ' + pjRp(OP_RABU_TIERS[r.t][0]).replace('Rp ', '') + '</span>' : '<span class="alert-tag">&lt; 100 Rb</span>') + '</td><td class="num">' + (r.cb ? pjRp(r.cb) : '·') + '</td><td>' + (r.next != null ? 'kurang ' + pjRp(r.next) + ' ke tier berikut' : 'tier maksimal') + '</td></tr>'; }
    function oRowsSub(x) { return '<td class="num cur"><b>' + pjRp(grpSum(x, function (r) { return r.v; })) + '</b></td><td></td><td class="num">' + pjRp(grpSum(x, function (r) { return r.cb; })) + '</td><td></td>'; }
    var oRows = grpMi(F, 'oprabu-out', ol, function (r) { return r.o.mc; }, { row: oRowsFn, sub: oRowsSub, span: 2, cols: 6, val: function (r) { return r.v; }, unit: 'outlet', search: false });
    var outCard = card('Profil outlet · akumulasi di jendela, tier dan jarak ke tier berikut (' + fmtCount(ol.length) + ' outlet bertransaksi)', '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('oprabu-out') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › Outlet') + th('MC · DSE') + th('Akumulasi', 1) + th('Tier') + th('Cashback', 1) + th('Jarak') + '</tr></thead><tbody>' + oRows + '</tbody></table></div>' + '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka, baris grup menjumlahkan isinya.</p>');
    return rules + ctrl + kpis + mcCard + dseCard + outCard;
  }
  // ---------- Kota/Kab Khusus ----------
  function opKotkabTab(F) {
    var mi = F.metadata.mc_info || {}, mc = F.metadata.master_counts || {}, n = F.metadata.cut_day;
    var rows = pjOutlets(F).filter(function (o) { return OP_KOTKAB_BRANCHES.indexOf(pjDim(o, F).br) >= 0; });
    var byMc = {};
    Object.keys(mi).forEach(function (m) { var d = mi[m]; if (OP_KOTKAB_BRANCHES.indexOf(d.br) < 0) return; if (state.branch && d.br !== state.branch) return; if (state.hoa && d.hoa !== state.hoa) return; if (state.kec && m !== state.kec) return; byMc[m] = { mc: m, br: d.br, dso: d.dso || '—', base: (mc.mc || {})[m] || 0, ach: 0, near: 0, buyers: 0, units: 0 }; });
    var byDse = {}, perOutlet = [];
    rows.forEach(function (o) { var u = opSpUnitsByBrand(F, o), comb = u.IM3 + u['3ID']; var M = byMc[o.mc]; if (!M) return; if (comb > 0) M.buyers++; if (comb >= 5) M.ach++; else if (comb >= 1) M.near++; M.units += comb; perOutlet.push({ o: o, u: u, comb: comb });
      if (o.tier === 'M') { var Dd = byDse[o.dse] || (byDse[o.dse] = { name: o.dse, mc: o.mc, base: (mc.dse || {})[o.dse] || 0, ach: 0, near: 0, units: 0 }); if (comb >= 5) Dd.ach++; else if (comb >= 1) Dd.near++; Dd.units += comb; } });
    var list = Object.keys(byMc).map(function (k) { var M = byMc[k]; M.pct = M.base ? M.ach / M.base * 100 : 0; M.target = Math.ceil(0.6 * M.base); M.gap = Math.max(0, M.target - M.ach); M.komisi = M.ach * 90000; return M; }).sort(function (a, b) { return b.pct - a.pct; });
    var T = { base: 0, ach: 0, near: 0, gap: 0, komisi: 0, buyers: 0 }; list.forEach(function (M) { T.base += M.base; T.ach += M.ach; T.near += M.near; T.gap += M.gap; T.komisi += M.komisi; T.buyers += M.buyers; });
    var rules = card('Aturan program dan translasinya',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Aturan (slide)') + th('Translasi') + '</tr></thead><tbody>' +
      '<tr><td class="cur">Khusus Kota Bekasi, Kab. Bekasi, Central North Jakarta</td><td>Branch master BEKASI (= Kota Bekasi), KAB BEKASI, CENTRAL NORTH JAKARTA; MC di dalamnya.</td></tr>' +
      '<tr><td class="cur">Sell-in min 5 (tgl 1–17), variant blended/kombinasi</td><td>Outlet dengan ≥ 5 unit SP (IM3 + 3ID) MTD; data sampai ' + n + ' Okt, sisa 5 hari sampai 17 Okt.</td></tr>' +
      '<tr><td class="cur">Stock out 15 → komisi 90.000 (capai maks tgl 20) / 75.000 (1 bulan), via partner</td><td><span class="alert-tag">Stock-out (sell-out) tidak ada di data</span>; komisi di sini = <b>potensi maksimum</b> 90.000 × outlet yang sudah memenuhi syarat sell-in.</td></tr>' +
      '<tr><td class="cur">Target 60% outlet under kot/kab</td><td>Target per MC = 60% × outlet master; gap = outlet yang masih harus mencapai 5 unit.</td></tr>' +
      '</tbody></table></div>');
    var kpis = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet master di 3 kot/kab', fmtCount(T.base), fmtCount(T.buyers) + ' sudah beli SP MTD', 'up', OP_KOTKAB_BRANCHES.join(' · ')) +
      kpi('Outlet ≥ 5 SP (syarat sell-in)', fmtCount(T.ach), pctOf(T.ach, T.base) + '% dari master · target 60%', T.ach / (T.base || 1) >= 0.6 ? 'up' : 'down', 'kombinasi IM3 + 3ID, 1–' + n + ' Okt') +
      kpi('Gap ke target 60%', fmtCount(T.gap), 'outlet lagi · ' + fmtCount(T.near) + ' outlet sudah 1–4 unit (terdekat)', 'down', 'dorong outlet 1–4 unit dulu') +
      kpi('Potensi komisi (90 Rb × outlet lolos sell-in)', pjRp(T.komisi), 'syarat stock-out 15 belum terukur', 'up', 'komisi via partner, reimburse ke principal') +
    '</div>';
    var mcRows = list.map(function (M) { return '<tr><td class="cur"><b>' + esc(M.mc) + '</b><br><span class="note">' + esc(M.br) + ' · DSO ' + esc(M.dso) + '</span></td><td class="num">' + fmtCount(M.base) + '</td><td class="num">' + fmtCount(M.buyers) + '</td><td class="num"><b>' + fmtCount(M.ach) + '</b></td><td class="num"><span class="' + (M.pct >= 60 ? 'good-tag' : 'alert-tag') + '">' + M.pct.toFixed(1) + '%</span></td><td class="num">' + fmtCount(M.target) + '</td><td class="num">' + fmtCount(M.gap) + '</td><td class="num">' + fmtCount(M.near) + '</td><td class="num">' + fmtCount(M.units) + '</td><td class="num">' + pjRp(M.komisi) + '</td><td><button type="button" class="btn" data-pj-detail="mc" data-mc="' + esc(M.mc) + '" style="font-size:11.5px; padding:5px 9px;">Fokus MC &#8594;</button></td></tr>'; }).join('');
    if (list.length > 1) { var kT = list.reduce(function (a, M) { a.base += M.base; a.buyers += M.buyers; a.ach += M.ach; a.target += M.target; a.gap += M.gap; a.near += M.near; a.units += M.units; a.komisi += M.komisi; return a; }, { base: 0, buyers: 0, ach: 0, target: 0, gap: 0, near: 0, units: 0, komisi: 0 }), kPct = kT.base ? kT.ach / kT.base * 100 : 0;
      mcRows += '<tr class="tot-row" style="' + TOT_ST + '"><td><b>TOTAL · ' + fmtCount(list.length) + ' MC</b></td>' + totNum(fmtCount(kT.base)) + totNum(fmtCount(kT.buyers)) + totNum('<b>' + fmtCount(kT.ach) + '</b>') + totNum(kPct.toFixed(1) + '%') + totNum(fmtCount(kT.target)) + totNum(fmtCount(kT.gap)) + totNum(fmtCount(kT.near)) + totNum(fmtCount(kT.units)) + totNum(pjRp(kT.komisi)) + '<td></td></tr>'; }
    var mcCard = card('Profil Micro Cluster / DSO · penetrasi ≥ 5 SP vs target 60%', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('MC · DSO') + th('Outlet master', 1) + th('Beli SP', 1) + th('≥ 5 SP', 1) + th('% (target 60%)', 1) + th('Target outlet', 1) + th('Gap', 1) + th('1–4 unit', 1) + th('Unit SP', 1) + th('Potensi komisi', 1) + th('') + '</tr></thead><tbody>' + mcRows + '</tbody></table></div>');
    var dl = Object.keys(byDse).map(function (k) { return byDse[k]; }).map(function (Dd) { Dd.pct = Dd.base ? Dd.ach / Dd.base * 100 : 0; return Dd; }).sort(function (a, b) { return b.ach - a.ach || b.near - a.near; });
    function dseRowsFn(Dd) { return '<tr><td class="cur"><b>' + esc(Dd.name) + '</b><br><span class="note">' + esc(Dd.mc) + '</span></td><td class="num">' + fmtCount(Dd.base) + '</td><td class="num"><b>' + fmtCount(Dd.ach) + '</b></td><td class="num"><span class="' + (Dd.pct >= 60 ? 'good-tag' : 'alert-tag') + '">' + Dd.pct.toFixed(0) + '%</span></td><td class="num">' + fmtCount(Dd.near) + '</td><td class="num">' + fmtCount(Dd.units) + '</td><td class="num">' + pjRp(Dd.ach * 90000) + '</td><td><button type="button" class="btn" data-pj-detail="dse" data-dse="' + esc(Dd.name) + '" style="font-size:11.5px; padding:5px 9px;">Outlet &#8594;</button></td></tr>'; }
    function dseRowsSub(x) { return (function () { var b = grpSum(x, function (Dd) { return Dd.base; }), a = grpSum(x, function (Dd) { return Dd.ach; }); return '<td class="num">' + fmtCount(b) + '</td><td class="num"><b>' + fmtCount(a) + '</b></td><td class="num">' + (b ? (a / b * 100).toFixed(0) : 0) + '%</td><td class="num">' + fmtCount(grpSum(x, function (Dd) { return Dd.near; })) + '</td><td class="num">' + fmtCount(grpSum(x, function (Dd) { return Dd.units; })) + '</td><td class="num">' + pjRp(a * 90000) + '</td><td></td>'; })(); }
    var dseRows = grpMi(F, 'op5sp-dse', dl, function (Dd) { return Dd.mc; }, { row: dseRowsFn, sub: dseRowsSub, span: 1, cols: 8, val: function (Dd) { return Dd.ach; }, unit: 'DSE', search: false });
    var dseCard = card('Profil DSE · outlet binaan yang sudah ≥ 5 SP', '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('op5sp-dse') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › DSE') + th('Outlet binaan', 1) + th('≥ 5 SP', 1) + th('%', 1) + th('1–4 unit', 1) + th('Unit SP', 1) + th('Potensi komisi', 1) + th('') + '</tr></thead><tbody>' + dseRows + '</tbody></table></div>' + '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka, baris grup menjumlahkan isinya.</p>');
    var ol = perOutlet.filter(function (r) { return r.comb > 0; }).sort(function (a, b) { return (b.comb >= 5) - (a.comb >= 5) || b.comb - a.comb; });
    function oRowsFn(r) { var o = r.o; return '<tr><td class="cur"><b>' + esc(o.n || o.id) + '</b><br><span class="note"><code>' + esc(o.k) + '</code></span></td><td>' + esc(o.mc) + '<br><span class="note">' + esc(o.dse) + '</span></td><td class="num">' + r.u.IM3 + '</td><td class="num">' + r.u['3ID'] + '</td><td class="num"><b>' + r.comb + '</b></td><td>' + (r.comb >= 5 ? '<span class="good-tag">Lolos sell-in</span>' : '<span class="alert-tag">kurang ' + (5 - r.comb) + ' unit</span>') + '</td></tr>'; }
    function oRowsSub(x) { return '<td class="num">' + grpSum(x, function (r) { return r.u.IM3; }) + '</td><td class="num">' + grpSum(x, function (r) { return r.u['3ID']; }) + '</td><td class="num"><b>' + grpSum(x, function (r) { return r.comb; }) + '</b></td><td></td>'; }
    var oRows = grpMi(F, 'op5sp-out', ol, function (r) { return r.o.mc; }, { row: oRowsFn, sub: oRowsSub, span: 2, cols: 6, val: function (r) { return r.comb; }, unit: 'outlet', search: false });
    var outCard = card('Profil outlet · unit SP gabungan dan jarak ke 5 unit (' + fmtCount(ol.length) + ' outlet beli SP)', '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('op5sp-out') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › Outlet') + th('MC · DSE') + th('SP IM3', 1) + th('SP 3ID', 1) + th('Gabungan', 1) + th('Status') + '</tr></thead><tbody>' + oRows + '</tbody></table></div>' + '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka, baris grup menjumlahkan isinya.</p>');
    return rules + kpis + mcCard + dseCard + outCard;
  }
  // ---------- Zero Improvement ----------
  function opZeroTab(F) {
    var cat = state.opZeroCat || 'all', n = F.metadata.cut_day, mi = F.metadata.mc_info || {}, mc = F.metadata.master_counts || {};
    var vf = opVisitsFeed(), lastVisit = (vf && vf.last_visit) || {};
    var rows = pjOutlets(F).filter(function (o) { return o.tier === 'M'; });
    function val(o, k) { var s = 0; Object.keys(o.c).forEach(function (c) { if (cat === 'all' || c === cat) s += o.c[c][k]; }); return s; }
    var seg = { lapsed: [], dormant: [] }, inFeed = {};
    rows.forEach(function (o) { inFeed[o.mc] = (inFeed[o.mc] || 0) + 1; var m = val(o, 1); if (m > 0) return; var f = val(o, 5); (f > 0 ? seg.lapsed : seg.dormant).push({ o: o, sep: f, lsep: val(o, 3), visited: !!lastVisit[o.k], lastVisit: lastVisit[o.k] || null }); });
    // master outlets with no transaction at all in Sep or Oct are not in the feed: count them per MC
    var noTx = {}; Object.keys(mi).forEach(function (m) { var d = mi[m]; if (state.branch && d.br !== state.branch) return; if (state.hoa && d.hoa !== state.hoa) return; if (state.kec && m !== state.kec) return; noTx[m] = Math.max(0, ((mc.mc || {})[m] || 0) - (inFeed[m] || 0)); });
    var all = seg.lapsed.concat(seg.dormant);
    var T = { lapsed: seg.lapsed.length, dormant: seg.dormant.length, notx: Object.keys(noTx).reduce(function (a, k) { return a + noTx[k]; }, 0), visitedZero: all.filter(function (r) { return r.visited; }).length, sepValue: seg.lapsed.reduce(function (a, r) { return a + r.sep; }, 0) };
    var catBar = '<div class="map-toolbar" style="margin-top:10px;"><div class="map-toolbar-group"><span class="map-label">Kategori:</span>' + [['all', 'Semua'], ['SP', 'Starter Pack'], ['VCF', 'Voucher isi'], ['VCB', 'Voucher blank'], ['SALMO', 'Saldo Mobo']].map(function (c) { return '<button type="button" class="map-btn' + (cat === c[0] ? ' active' : '') + '" data-op-cat="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div></div>';
    var kpis = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Lapsed · beli di Sep, nol di Okt', fmtCount(T.lapsed), 'nilai September penuh ' + pjRp(T.sepValue), 'down', 'peluang pulih tercepat') +
      kpi('Dormant · nol Sep dan Okt (ada transaksi kategori lain)', fmtCount(T.dormant), 'outlet master dengan transaksi di kategori lain saja', 'down', PJ_CAT_LABEL[cat]) +
      kpi('Tanpa transaksi apa pun Sep–Okt', fmtCount(T.notx), 'outlet master yang tidak muncul di DAILY_DATA_MOBII', 'down', 'kandidat verifikasi outlet aktif / mapping') +
      kpi('Nol tapi sudah divisit MTD', fmtCount(T.visitedZero), pctOf(T.visitedZero, all.length) + '% dari lapsed + dormant', 'down', 'kunjungan tanpa order: cek stok dan harga') +
    '</div>';
    var byMc = {}; Object.keys(noTx).forEach(function (m) { byMc[m] = { mc: m, br: (mi[m] || {}).br, dso: (mi[m] || {}).dso || '—', base: (mc.mc || {})[m] || 0, lapsed: 0, dormant: 0, notx: noTx[m], visited: 0, sep: 0 }; });
    var byDse = {};
    all.forEach(function (r) { var o = r.o; var M = byMc[o.mc] || (byMc[o.mc] = { mc: o.mc, br: pjDim(o, F).br, dso: '—', base: 0, lapsed: 0, dormant: 0, notx: 0, visited: 0, sep: 0 }); if (r.sep > 0) { M.lapsed++; M.sep += r.sep; } else M.dormant++; if (r.visited) M.visited++;
      var Dd = byDse[o.dse] || (byDse[o.dse] = { name: o.dse, mc: o.mc, base: (mc.dse || {})[o.dse] || 0, lapsed: 0, dormant: 0, visited: 0, sep: 0 }); if (r.sep > 0) { Dd.lapsed++; Dd.sep += r.sep; } else Dd.dormant++; if (r.visited) Dd.visited++; });
    var mcRows = Object.keys(byMc).map(function (k) { return byMc[k]; }).sort(function (a, b) { return (b.lapsed + b.dormant + b.notx) - (a.lapsed + a.dormant + a.notx); }).map(function (M) { var z = M.lapsed + M.dormant + M.notx; return '<tr><td class="cur"><b>' + esc(M.mc) + '</b><br><span class="note">' + esc(M.br) + ' · DSO ' + esc(M.dso) + '</span></td><td class="num">' + fmtCount(M.base) + '</td><td class="num"><b>' + fmtCount(z) + '</b> (' + pctOf(z, M.base) + '%)</td><td class="num"><span class="alert-tag">' + fmtCount(M.lapsed) + '</span></td><td class="num">' + pjRp(M.sep) + '</td><td class="num">' + fmtCount(M.dormant) + '</td><td class="num">' + fmtCount(M.notx) + '</td><td class="num">' + fmtCount(M.visited) + '</td><td><button type="button" class="btn" data-pj-detail="mc" data-mc="' + esc(M.mc) + '" style="font-size:11.5px; padding:5px 9px;">Fokus MC &#8594;</button></td></tr>'; }).join('');
    var zList = Object.keys(byMc).map(function (k) { return byMc[k]; });
    if (zList.length > 1) { var zT = zList.reduce(function (a, M) { a.base += M.base; a.lapsed += M.lapsed; a.dormant += M.dormant; a.notx += M.notx; a.visited += M.visited; a.sep += M.sep; return a; }, { base: 0, lapsed: 0, dormant: 0, notx: 0, visited: 0, sep: 0 }), zz = zT.lapsed + zT.dormant + zT.notx;
      mcRows += '<tr class="tot-row" style="' + TOT_ST + '"><td><b>TOTAL · ' + fmtCount(zList.length) + ' MC</b></td>' + totNum(fmtCount(zT.base)) + totNum('<b>' + fmtCount(zz) + '</b> (' + pctOf(zz, zT.base) + '%)') + totNum(fmtCount(zT.lapsed)) + totNum(pjRp(zT.sep)) + totNum(fmtCount(zT.dormant)) + totNum(fmtCount(zT.notx)) + totNum(fmtCount(zT.visited)) + '<td></td></tr>'; }
    var mcCard = card('Profil Micro Cluster / DSO · outlet nol Sell-In MTD · ' + PJ_CAT_LABEL[cat], '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('MC · DSO') + th('Outlet master', 1) + th('Nol MTD (total)', 1) + th('Lapsed', 1) + th('Nilai Sep lapsed', 1) + th('Dormant', 1) + th('Tanpa transaksi', 1) + th('Nol & divisit', 1) + th('') + '</tr></thead><tbody>' + mcRows + '</tbody></table></div>' +
      '<p class="note">Nol MTD = tidak ada nilai 1–' + n + ' Okt pada kategori terpilih. Lapsed = ada nilai di September; dormant = nol di September dan Oktober tetapi outlet punya transaksi kategori lain; tanpa transaksi = outlet master yang sama sekali tidak ada di file (Sep maupun Okt).</p>');
    var dl = Object.keys(byDse).map(function (k) { return byDse[k]; }).sort(function (a, b) { return b.lapsed - a.lapsed || b.dormant - a.dormant; });
    function dseRowsFn(Dd) { return '<tr><td class="cur"><b>' + esc(Dd.name) + '</b><br><span class="note">' + esc(Dd.mc) + '</span></td><td class="num">' + fmtCount(Dd.base) + '</td><td class="num"><span class="alert-tag">' + fmtCount(Dd.lapsed) + '</span></td><td class="num">' + pjRp(Dd.sep) + '</td><td class="num">' + fmtCount(Dd.dormant) + '</td><td class="num">' + fmtCount(Dd.visited) + '</td><td><button type="button" class="btn" data-pj-detail="dse" data-dse="' + esc(Dd.name) + '" style="font-size:11.5px; padding:5px 9px;">Outlet &#8594;</button></td></tr>'; }
    function dseRowsSub(x) { return '<td class="num">' + fmtCount(grpSum(x, function (Dd) { return Dd.base; })) + '</td><td class="num">' + fmtCount(grpSum(x, function (Dd) { return Dd.lapsed; })) + '</td><td class="num">' + pjRp(grpSum(x, function (Dd) { return Dd.sep; })) + '</td><td class="num">' + fmtCount(grpSum(x, function (Dd) { return Dd.dormant; })) + '</td><td class="num">' + fmtCount(grpSum(x, function (Dd) { return Dd.visited; })) + '</td><td></td>'; }
    var dseRows = grpMi(F, 'opzero-dse', dl, function (Dd) { return Dd.mc; }, { row: dseRowsFn, sub: dseRowsSub, span: 1, cols: 7, val: function (Dd) { return Dd.lapsed; }, unit: 'DSE', search: false });
    var dseCard = card('Profil DSE · outlet binaan yang nol MTD', '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('opzero-dse') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › DSE') + th('Outlet binaan', 1) + th('Lapsed', 1) + th('Nilai Sep lapsed', 1) + th('Dormant', 1) + th('Nol & divisit', 1) + th('') + '</tr></thead><tbody>' + dseRows + '</tbody></table></div>' + '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka, baris grup menjumlahkan isinya.</p>');
    var ol = all.sort(function (a, b) { return b.sep - a.sep; });
    function oRowsFn(r) { var o = r.o; return '<tr><td class="cur"><b>' + esc(o.n || o.id) + '</b><br><span class="note"><code>' + esc(o.k) + '</code></span></td><td>' + esc(o.mc) + '<br><span class="note">' + esc(o.dse) + '</span></td><td>' + (r.sep > 0 ? '<span class="alert-tag">Lapsed</span>' : '<span class="note">Dormant</span>') + '</td><td class="num">' + pjRp(r.sep) + '</td><td class="num">' + pjRp(r.lsep) + '</td><td>' + (r.lastVisit ? '<span class="good-tag">' + esc(r.lastVisit) + '</span>' : '<span class="alert-tag">Belum divisit</span>') + '</td></tr>'; }
    function oRowsSub(x) { return '<td></td><td class="num">' + pjRp(grpSum(x, function (r) { return r.sep; })) + '</td><td class="num">' + pjRp(grpSum(x, function (r) { return r.lsep; })) + '</td><td></td>'; }
    var oRows = grpMi(F, 'opzero-out', ol, function (r) { return r.o.mc; }, { row: oRowsFn, sub: oRowsSub, span: 2, cols: 6, val: function (r) { return r.sep; }, unit: 'outlet', search: false });
    var outCard = card('Daftar outlet · urut nilai September (peluang pulih terbesar dulu)', '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('opzero-out') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › Outlet') + th('MC · DSE') + th('Segmen') + th('Sep penuh', 1) + th('LMTD 1–' + n + ' Sep', 1) + th('Visit PJP MTD') + '</tr></thead><tbody>' + oRows + '</tbody></table></div>' + '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka, baris grup menjumlahkan isinya.</p>');
    return catBar + kpis + mcCard + dseCard + outCard;
  }
  function viewOpportunity(embed) {
    var F = pjFeed();
    if (!F) return card('Opportunity', '<p class="note">Feed penjualan belum dibangun. Jalankan <code>python3 scripts/build_penjualan_feed.py</code>.</p>');
    var tab = embed ? 'program' : (state.opTab || 'program'), prog = state.opProgram || 'uar', b = state.pjBrand || 'all';
    var nav = embed ? '' : '<div class="sub-nav" role="tablist">' + OP_TABS.map(function (t) { return '<button type="button" role="tab" class="sub-nav-btn' + (tab === t[0] ? ' active' : '') + '" data-op-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var tools = '<div class="map-toolbar" style="margin-top:10px;"><div class="map-toolbar-group"><span class="map-label">Brand:</span>' + [['all', 'Semua'], ['IM3', 'IM3'], ['3ID', '3ID']].map(function (x) { return '<button type="button" class="map-btn' + (b === x[0] ? ' active' : '') + '" data-pj-brand="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (tab === 'program' ? '<div class="map-toolbar-group"><span class="map-label">Program:</span>' + OP_PROGRAMS.map(function (p) { return '<button type="button" class="map-btn' + (prog === p[0] ? ' active' : '') + '" data-op-program="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' : '') +
      '<div class="map-toolbar-group">' + ((state.branch || state.hoa || state.kec || state.pjDse || b !== 'all') ? '<button type="button" class="btn" data-act="clear-pj-filter" style="font-size:12px; padding:6px 12px;">Reset filter</button>' : '') + (state.pjDse ? ' <span class="good-tag">DSE ' + esc(state.pjDse) + '</span> <button type="button" class="btn" data-act="clear-pj-dse" style="font-size:11.5px; padding:5px 9px;">&#10005;</button>' : '') + '<span class="note" style="margin-left:8px;">Sumber DAILY_DATA_MOBII cut ' + esc(F.metadata.cut) + ' · PJP ' + pjpPeriod('mtd',{id:1,nopad:1}) + ' · satuan M = milyar, Jt = juta, Rb = ribu</span></div></div>';
    var body = tab === 'zero' ? opZeroTab(F) : (prog === 'rabu' ? opRabuTab(F) : (prog === 'kotkab' ? opKotkabTab(F) : opUarTab(F)));
    return nav + tools + pjSelectionBand(F) + body;
  }

  /* ================= PERFORMANCE OUTLET · demand (sell-out) dari DAILY_DATA_MOBO ================= */
  var PO_TABS = [['ringkasan', '📊 Ringkasan'], ['teritori', '🏢 Per Teritori'], ['heat', '🗓️ Heatmap Harian'], ['produk', '📦 Produk'], ['konsentrasi', '🏆 Konsentrasi'], ['outlet', '🏪 Outlet'], ['svd', '⚖️ Supply vs Demand']];
  var PO_CATS = [['RLD', 'Reload'], ['VCI', 'Voucher Injection'], ['CVM', 'CVM'], ['PKT', 'Paket Data']];
  var PO_VALUE_CATS = ['RLD', 'VCI', 'CVM', 'PKT'];
  var PO_CAT_LABEL = { SPI: 'SP Injection (pcs)', RLD: 'Reload', VCI: 'Voucher Injection', CVM: 'CVM', PKT: 'Paket Data', all: 'Total demand (Rp)' };
  var PO_LEVELS = [['auto', '⚙️ Otomatis · ikut filter'], ['area', 'Area (Branch)'], ['mc', 'Micro Cluster'], ['dse', 'DSE'], ['outlet', 'Outlet']];
  var PO_LEVEL_LABEL = { area: 'per Area (Branch)', mc: 'per Micro Cluster', dse: 'per DSE', outlet: 'per Outlet' };
  var PO_CLASS_LABEL = { master_im3: 'Outlet master IM3', master_3id: 'Outlet master 3ID', adhoc: 'Outlet adhoc (bukan master)', unknown: 'Id tidak dikenal' };
  function poFeed() { return (typeof window !== 'undefined' && window.DEMAND_FEED) ? window.DEMAND_FEED : (typeof DEMAND_FEED !== 'undefined' ? DEMAND_FEED : null); }
  function poDim(o, F) { var mi = F.metadata.mc_info[o.mc] || {}; return { br: o.br || mi.br || 'OUTSIDE MASTER TERRITORY', hoa: mi.hoa || '—', dso: mi.dso || '—' }; }
  function poInScope(o, F) {
    var d = poDim(o, F);
    if (state.branch && d.br !== state.branch) return false;
    if (state.hoa && d.hoa !== state.hoa) return false;
    if (state.kec && o.mc !== state.kec) return false;
    if (state.poDse && o.dse !== state.poDse) return false;
    var b = state.poBrand || 'all'; if (b !== 'all' && o.b !== b) return false;
    if (state.poAdhoc === false && o.tier === 'A') return false;
    return true;
  }
  /* SAL (Saldo Mobo, MOBO_SALMO) is a separate category outside the total demand: outlets that only have SALMO stay out of the demand tables */
  function poHasDemand(o) { return !!(o.c.RLD || o.c.VCI || o.c.CVM || o.c.PKT || o.c.SPI); }
  function poOutlets(F) { return (F.outlets || []).filter(function (o) { return poInScope(o, F) && poHasDemand(o); }); }
  function poSalOutlets(F) { return (F.outlets || []).filter(function (o) { return o.c.SAL && poInScope(o, F); }); }
  function poVal(o, cat) {
    if (cat === 'all') return PO_VALUE_CATS.reduce(function (s, c) { return s + (o.c[c] ? o.c[c][1] : 0); }, 0);
    var x = o.c[cat]; if (!x) return 0; return cat === 'SPI' ? x[0] : x[1];
  }
  function poDaily(o, cat, n) {
    var s = []; for (var i = 0; i < n; i++) s.push(0);
    var cats = cat === 'all' ? PO_VALUE_CATS : [cat];
    cats.forEach(function (c) { if (!o.c[c]) return; o.c[c][4].forEach(function (e) { if (e[0] <= n) s[e[0] - 1] += (c === 'SPI' ? e[2] : e[1]); }); });
    return s;
  }
  function poAgg(rows) {
    var A = { tot: { v: 0, u: 0 }, SPI: { q: 0, u: 0, v: 0 }, RLD: { v: 0, q: 0, u: 0 }, VCI: { v: 0, q: 0, u: 0 }, CVM: { v: 0, q: 0, u: 0 }, PKT: { v: 0, q: 0, u: 0 } };
    rows.forEach(function (o) {
      var any = false;
      PO_CATS.forEach(function (c) { var x = o.c[c[0]]; if (!x) return; var a = A[c[0]]; a.q += x[0]; if (c[0] !== 'SPI') { a.v += x[1]; A.tot.v += x[1]; } else a.v += x[1]; if ((c[0] === 'SPI' ? x[0] : x[1]) > 0) { a.u++; any = true; } });
      var anyV = PO_VALUE_CATS.some(function (c) { return o.c[c] && o.c[c][1] > 0; }); if (anyV) A.tot.u++;
    });
    return A;
  }
  // ---- supply (Sell-In ke outlet) untuk perbandingan, dipotong ke hari yang sama dengan demand ----
  function poSupplyMap(F) {
    if (F._sup) return F._sup;
    var S = pjFeed(), map = {}, cut = F.metadata.cut_day;
    if (S) S.outlets.forEach(function (o) {
      var r = { saldo: 0, sp: 0, vcf: 0, vcb: 0, val: 0 };
      Object.keys(o.c).forEach(function (cat) { (o.c[cat][10] || []).forEach(function (e) { if (e[0] > cut) return; r.val += e[1]; if (cat === 'SALMO') r.saldo += e[1]; else if (cat === 'SP') r.sp += e[2]; else if (cat === 'VCF') r.vcf += e[2]; else if (cat === 'VCB') r.vcb += e[2]; }); });
      if (r.val > 0) map[o.k] = r;
    });
    F._sup = map; return map;
  }
  function poSup(F, o) { return poSupplyMap(F)[o.k] || null; }
  function poSupplyDaily(F, rows) {
    var S = pjFeed(), n = F.metadata.cut_day, d = []; for (var i = 0; i < n; i++) d.push(0);
    if (!S) return d;
    var keys = {}; rows.forEach(function (o) { keys[o.k] = 1; });
    S.outlets.forEach(function (o) { if (!keys[o.k] || !o.c.SALMO) return; (o.c.SALMO[10] || []).forEach(function (e) { if (e[0] <= n) d[e[0] - 1] += e[1]; }); });
    return d;
  }
  function poPager(total, size) {
    var page = state.poPage || 1, tp = Math.ceil(total / size) || 1; if (page > tp) { page = tp; state.poPage = page; }
    var start = (page - 1) * size;
    return { start: start, end: Math.min(start + size, total), html: '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;"><span class="note">Menampilkan ' + (total ? start + 1 : 0) + '–' + Math.min(start + size, total) + ' dari ' + fmtCount(total) + '</span><div style="display:flex; gap:6px;"><button type="button" class="btn" data-po-page="prev"' + (page <= 1 ? ' disabled style="opacity:0.5;"' : '') + '>&larr; Sebelumnya</button><span style="padding:4px 8px; font:700 12.5px var(--ij-font);">Hal ' + page + ' / ' + tp + '</span><button type="button" class="btn" data-po-page="next"' + (page >= tp ? ' disabled style="opacity:0.5;"' : '') + '>Berikutnya &rarr;</button></div></div>' };
  }
  function poAutoLevel() { if (state.poDse) return 'outlet'; if (state.kec) return 'dse'; if (state.branch || state.hoa) return 'mc'; return 'area'; }
  function poLevel() { return poAutoLevel(); }   // grouping always follows the territory filter
  function poCat() { return state.poCat || 'all'; }
  function poFmt(cat, v) { return cat === 'SPI' ? fmtCount(v) + ' pcs' : pjRp(v); }
  function poMasterBase(F) {
    var mc = F.metadata.master_counts || {}, mi = F.metadata.mc_info || {};
    if (state.kec) return (mc.mc || {})[state.kec] || 0;
    if (state.branch) return (mc.br || {})[state.branch] || 0;
    if (state.hoa) { var s = 0; Object.keys(mc.br || {}).forEach(function (b) { if (Object.keys(mi).some(function (m) { return mi[m].br === b && mi[m].hoa === state.hoa; })) s += mc.br[b]; }); return s; }
    var t = 0; Object.keys(mc.br || {}).forEach(function (b) { t += mc.br[b]; }); return t;
  }
  function poRowsAt(F, level) {
    var rows = poOutlets(F), groups = {}, mc = F.metadata.master_counts || {};
    rows.forEach(function (o) {
      var d = poDim(o, F), key, label, parent, base;
      if (level === 'area') { key = d.br; label = d.br; parent = d.hoa; base = (mc.br || {})[d.br] || 0; }
      else if (level === 'mc') { key = o.mc || '—'; label = key; parent = d.br + ' · ' + d.dso; base = (mc.mc || {})[o.mc] || 0; }
      else if (level === 'dse') { key = o.dse; label = o.dse; parent = o.mc + ' · ' + d.br; base = (mc.dse || {})[o.dse] || 0; }
      else { key = o.k; label = o.n || o.id; parent = o.mc + ' · ' + o.dse; base = 1; }
      var G = groups[key] || (groups[key] = { key: key, label: label, parent: parent, base: base, items: [], o: level === 'outlet' ? o : null }); G.items.push(o);
    });
    var cat = poCat();
    var out = Object.keys(groups).map(function (k) { var G = groups[k]; G.agg = poAgg(G.items); G.v = G.items.reduce(function (s, o) { return s + poVal(o, cat); }, 0); G.sup = 0; G.items.forEach(function (o) { var s = poSup(F, o); if (s) G.sup += s.saldo; }); return G; });
    out.sort(function (a, b) { return b.v - a.v || String(a.label).localeCompare(String(b.label)); });
    return out;
  }
  function poDetailBtn(level, G) {
    if (level === 'outlet') return '';
    var attr = level === 'area' ? 'data-br="' + esc(G.key) + '"' : (level === 'mc' ? 'data-mc="' + esc(G.key) + '"' : 'data-dse="' + esc(G.key) + '"');
    return '<button type="button" class="btn" data-po-detail="' + level + '" ' + attr + ' style="font-size:11.5px; padding:5px 9px;">Detail &#8594;</button>';
  }
  function poSelectionBand(F) {
    var chips = [];
    if (state.branch) chips.push(['Branch', state.branch]); if (state.hoa) chips.push(['Head of Area', state.hoa]); if (state.kec) chips.push(['Micro Cluster', state.kec]); if (state.poDse) chips.push(['DSE', state.poDse]);
    if (state.poBrand && state.poBrand !== 'all') chips.push(['Brand', state.poBrand]); if (poCat() !== 'all') chips.push(['Komoditas', PO_CAT_LABEL[poCat()]]); if (state.poAdhoc === false) chips.push(['Outlet', 'tanpa adhoc']);
    var body = chips.length ? chips.map(function (c) { return '<span style="display:inline-block; margin:0 10px 4px 0;"><span class="map-label">' + esc(c[0]) + ':</span> <b style="font-size:15px;">' + esc(c[1]) + '</b></span>'; }).join('') : '<b style="font-size:15px;">Seluruh Inner Jakarta</b> <span class="note">· pilih Branch, Head of Area, Micro Cluster atau DSE untuk melihat performa outlet di teritori itu</span>';
    return '<div style="margin-top:10px; padding:10px 14px; border:2px solid var(--ij-ink); border-left:8px solid var(--ij-accent); background:var(--ij-surface);"><div style="font:800 11px var(--ij-font); letter-spacing:.08em; text-transform:uppercase; color:var(--ij-muted); margin-bottom:4px;">Area selection</div>' + body + '</div>';
  }
  function poLevelBar() {
    return state.poDse ? '<div class="map-toolbar" style="margin-top:8px;"><div class="map-toolbar-group"><span class="map-label">DSE:</span><span class="good-tag" style="font-weight:800;">' + esc(state.poDse) + '</span> <button type="button" class="btn" data-act="clear-po-dse" style="font-size:11.5px; padding:5px 9px;">&#10005; Semua DSE</button></div></div>' : '';
  }
  function poCatBar(withAll) {
    var cur = poCat();
    return '<div class="map-toolbar-group"><span class="map-label">Komoditas:</span>' + (withAll ? '<button type="button" class="map-btn' + (cur === 'all' ? ' active' : '') + '" data-po-cat="all">Total demand</button>' : '') + PO_CATS.map(function (c) { return '<button type="button" class="map-btn' + (cur === c[0] ? ' active' : '') + '" data-po-cat="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
  }
  function poNameCell(G) { return '<td class="cur"><b>' + esc(G.label) + '</b>' + (G.o ? '<br><span style="font-size:11px;"><span class="' + (G.o.b === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(G.o.b) + '</span> <code>' + esc(G.o.id) + '</code>' + (G.o.tier === 'A' ? ' <span class="note">(adhoc)</span>' : '') + '</span>' : '') + '</td>'; }
  function poParentVaries(groups) { var s = {}; groups.forEach(function (g) { s[g.parent] = 1; }); return Object.keys(s).length > 1; }
  function poEntityHead(l) { return { area: 'Area (Branch)', mc: 'Micro Cluster', dse: 'DSE', outlet: 'Outlet' }[l]; }
  function poParentHead(l) { return { area: 'Head of Area', mc: 'Branch · DSO', dse: 'MC · Branch', outlet: 'MC · DSE' }[l]; }
  function poDayAgg(rows, day) {
    var G = { tot: { v: 0, q: 0 } }; PO_CATS.forEach(function (c) { G[c[0]] = { v: 0, q: 0 }; });
    if (!day) return G;
    rows.forEach(function (o) { PO_CATS.forEach(function (c) { var x = o.c[c[0]]; if (!x) return; (x[4] || []).forEach(function (e) { if (e[0] === day) { G[c[0]].v += e[1]; G[c[0]].q += e[2]; if (c[0] !== 'SPI') { G.tot.v += e[1]; G.tot.q += e[2]; } } }); }); });
    return G;
  }
  function poLd(F, rows) { var W = lastWorkDays(F.metadata.days || []); return { W: W, D: poDayAgg(rows, W.day), P: poDayAgg(rows, W.prevDay) }; }
  function poRatio(dem, sup) { return sup > 0 ? (dem / sup) : null; }
  function poRatioCell(r) { if (r == null) return '<span class="note">tanpa supply</span>'; var c = r > 1.5 ? 'alert-tag' : (r >= 0.5 ? 'good-tag' : ''); return '<span class="' + c + '">' + r.toFixed(2) + '×</span>'; }
  function poHeatCell(v, max, isQty) {
    if (!v) return '<td class="num" style="color:var(--ij-hairline); text-align:center;">·</td>';
    var a = 0.1 + 0.6 * Math.min(1, v / (max || 1));
    return '<td class="num" title="' + (isQty ? fmtCount(v) + ' pcs' : pjRp(v)) + '" style="background:rgba(22,163,74,' + a.toFixed(2) + '); color:#111; text-align:center; font-weight:700; font-size:11.5px;">' + (isQty ? fmtCount(v) : pjRp(v).replace('Rp ', '')) + '</td>';
  }

  // Gross Add (RGUGA) for the same scope as the demand view: territory, DSE, brand and adhoc switch
  function poGaScope() {
    var G = gaPrep(); if (!G) return null;
    var b = state.poBrand || 'all', pd = state.poDse ? dseNorm(state.poDse) : '';
    var list = G.list.filter(function (o) {
      if (b !== 'all' && !o.ids[b]) return false;
      if (state.poAdhoc === false && o.t !== 'M') return false;
      return (!state.branch || o.br === state.branch) && (!state.hoa || o.hoa === state.hoa) && (!state.kec || o.mc === state.kec) && (!pd || dseNorm(o.dse) === pd);
    });
    return { list: list, brand: b, A: gaAgg(list, b), G: G };
  }
  function poRingkasan(F, rows, A) {
    var n = F.metadata.cut_day, days = F.metadata.days, mdays = F.metadata.mtd_month_days;
    var LD = poLd(F, rows);
    var ldCells = function (k) { return '<td class="num cur" style="border-left:2px solid var(--ij-ink);"><b>' + (LD.D[k].v ? pjRp(LD.D[k].v) : (LD.D[k].q ? fmtCount(LD.D[k].q) + ' pcs' : '·')) + '</b>' + (k === 'SPI' && LD.D[k].v && LD.D[k].q ? '<br><span class="note">' + fmtCount(LD.D[k].q) + ' pcs</span>' : '') + '</td><td class="num">' + pjGrowth(LD.D[k].v || LD.D[k].q, LD.P[k].v || LD.P[k].q) + '</td>'; };
    var dseRow = function (label, a, isVal, share, code) { return '<tr><td class="cur"><b>' + label + '</b></td><td class="num cur"><b>' + (isVal ? pjRp(a.v) : '—') + '</b></td><td class="num">' + fmtCount(a.q) + '</td><td class="num">' + fmtCount(a.u) + '</td><td class="num">' + (share == null ? '·' : share.toFixed(1) + '%') + '</td><td class="num">' + (isVal ? pjRp(a.v / n) : fmtCount(Math.round(a.q / n)) + ' pcs') + '</td><td class="num">' + (isVal ? pjRp(a.v / n * mdays) : fmtCount(Math.round(a.q / n * mdays)) + ' pcs') + '</td><td class="num">' + (a.u ? (isVal ? pjRp(a.v / a.u) : (a.q / a.u).toFixed(1) + ' pcs') : '—') + '</td>' + ldCells(code) + '</tr>'; };
    var trs = PO_CATS.map(function (c) { var a = A[c[0]]; return dseRow(c[0] === 'SPI' ? 'SP Injection <span class="note">(di luar total demand)</span>' : c[1], { v: a.v || 0, q: a.q, u: a.u }, c[0] !== 'SPI' || a.v > 0, c[0] !== 'SPI' && A.tot.v ? a.v / A.tot.v * 100 : null, c[0]); }).join('') +
      '<tr style="font-weight:800; background:var(--ij-wash, #f6f4f1);"><td class="cur">Total demand (Reload + Voucher + CVM + Paket Data)</td><td class="num">' + pjRp(A.tot.v) + '</td><td class="num">' + fmtCount(A.RLD.q + A.VCI.q + A.CVM.q + A.PKT.q) + '</td><td class="num">' + fmtCount(A.tot.u) + '</td><td class="num">100%</td><td class="num">' + pjRp(A.tot.v / n) + '</td><td class="num">' + pjRp(A.tot.v / n * mdays) + '</td><td class="num">' + (A.tot.u ? pjRp(A.tot.v / A.tot.u) : '—') + '</td>' + ldCells('tot') + '</tr>';
    var SL = poSalOutlets(F);
    if (SL.length) {
      var sTot = 0, sU = 0, sD = 0, sP = 0;
      SL.forEach(function (o) { var x = o.c.SAL; sTot += x[1]; if (x[1] > 0) sU++; (x[4] || []).forEach(function (e) { if (LD.W.day && e[0] === LD.W.day) sD += e[1]; if (LD.W.prevDay && e[0] === LD.W.prevDay) sP += e[1]; }); });
      trs += '<tr style="border-top:2px solid var(--ij-ink);"><td class="cur"><b>Saldo Mobo (SALMO)</b> <span class="note">(saldo ditransaksikan outlet ke pelanggan, di luar total demand · hanya Oktober)</span></td><td class="num cur"><b>' + pjRp(sTot) + '</b></td><td class="num">—</td><td class="num">' + fmtCount(sU) + '</td><td class="num">·</td><td class="num">' + pjRp(sTot / n) + '</td><td class="num">' + pjRp(sTot / n * mdays) + '</td><td class="num">' + (sU ? pjRp(sTot / sU) : '—') + '</td>' +
        '<td class="num cur" style="border-left:2px solid var(--ij-ink);"><b>' + (sD ? pjRp(sD) : '·') + '</b></td><td class="num">' + (sD && sP ? pjGrowth(sD, sP) : '·') + '</td></tr>';
    }
    var GS = poGaScope();
    if (GS) {
      var gD = gaDaily(GS.list, GS.brand), gc = GS.G.cut, gl = null, gp = null, dd0;
      for (dd0 = gc; dd0 >= 1; dd0--) { if (new Date(Date.UTC(2026, 9, dd0)).getUTCDay() === 0) continue; if (gl == null) gl = dd0; else { gp = dd0; break; } }
      var ga = GS.A;
      trs += '<tr style="border-top:2px solid var(--ij-ink);"><td class="cur"><b>Gross Add (RGUGA)</b> <span class="note">(pcs, di luar total demand · SSO = outlet dengan ≥ 1 GA)</span></td><td class="num">—</td><td class="num">' + fmtCount(ga.q) + '</td><td class="num">' + fmtCount(ga.u) + '</td><td class="num">·</td><td class="num">' + fmtCount(Math.round(ga.q / gc)) + ' pcs</td><td class="num">' + fmtCount(Math.round(ga.q / gc * 31)) + ' pcs</td><td class="num">' + (ga.u ? (ga.q / ga.u).toFixed(1) + ' pcs' : '·') + '</td>' +
        '<td class="num cur" style="border-left:2px solid var(--ij-ink);"><b>' + (gl ? fmtCount(gD.O[gl].q) + ' pcs' : '·') + '</b><br><span class="note">' + (gl ? gl + ' Okt · SSO ' + fmtCount(gD.O[gl].u) : '') + '</span></td><td class="num">' + (gl && gp ? pjGrowth(gD.O[gl].q, gD.O[gp].q) : '·') + '</td></tr>';
    }
    var sc = card('Scorecard demand · MTD 1–' + n + ' Okt 2026 · ' + esc(scopeText()) + (state.poDse ? ' · DSE ' + esc(state.poDse) : ''),
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Komoditas') + th('Nilai MTD', 1) + th('Hits (unit)', 1) + th('UAR (outlet aktif)', 1) + th('% nilai', 1) + th('Rata-rata / hari', 1) + th('Run-rate Okt', 1) + th('Rata-rata / UAR', 1) + th('Hari kerja terakhir · ' + LD.W.label, 1) + th('vs ' + LD.W.prevShort, 1) + '</tr></thead><tbody>' + trs + '</tbody></table></div>' +
      '<p class="note">Baris Gross Add dari Daily_RGUGA_OUTLET (cut ' + (GS ? GS.G.cut : '—') + ' Okt, MTD vs LMTD September ada di menu Gross Add); UAR pada baris itu = SSO. Sumber DAILY_DATA_MOBO (sell-out outlet ke konsumen). Hanya MTD: file tidak punya sheet bulan lalu, sehingga tidak ada growth. Baris Saldo Mobo (SALMO) dari DAILY_DATA_MOBO_SALMO: saldo yang ditransaksikan outlet ke pelanggan; belum dikonfirmasi apakah sudah mencakup Reload / Voucher / Paket Data, sehingga tidak dijumlahkan ke total dan hari terakhirnya masih parsial. UAR = outlet dengan nilai > 0. SP Injection sudah dipindahkan ke Penjualan ke Outlet (Sell-In) dan tidak ditampilkan di sini. Paket Data = sheet MTD_RECARGE (penjualan paket data Freedom Internet, Happy 3ID dan sejenisnya), bukan isi ulang pulsa. Run-rate = rata-rata harian × ' + mdays + ' hari. Hari kerja terakhir = hari terakhir di file selain Minggu (' + LD.W.label + '), dibandingkan dengan hari kerja sebelumnya (' + LD.W.prevLabel + ').</p>');
    var sd = poSupplyDaily(F, rows), dd = days.map(function () { return 0; });
    rows.forEach(function (o) { poDaily(o, 'all', n).forEach(function (v, i) { dd[i] += v; }); });
    var catD = {}; PO_VALUE_CATS.forEach(function (c) { catD[c] = days.map(function () { return 0; }); rows.forEach(function (o) { poDaily(o, c, n).forEach(function (v, i) { catD[c][i] += v; }); }); });
    var drows = days.map(function (d, i) {
      var wd = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(d + 'T00:00:00').getDay()];
      return '<tr><td class="cur"><b>' + d.slice(8) + ' Okt</b> (' + wd + ')</td>' + PO_VALUE_CATS.map(function (c) { return '<td class="num">' + (catD[c][i] ? pjRp(catD[c][i]) : '·') + '</td>'; }).join('') + '<td class="num cur"><b>' + (dd[i] ? pjRp(dd[i]) : '·') + '</b></td><td class="num">' + (sd[i] ? pjRp(sd[i]) : '·') + '</td><td class="num">' + (sd[i] && dd[i] ? poRatioCell(dd[i] / sd[i]) : '—') + '</td></tr>';
    }).join('');
    var daily = card('Demand harian vs saldo Mobo yang masuk (Sell-In) · 1–' + n + ' Okt',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Tanggal') + th('Reload', 1) + th('Voucher Inj', 1) + th('CVM', 1) + th('Paket Data', 1) + th('Total demand', 1) + th('Saldo Sell-In masuk', 1) + th('Demand ÷ Saldo', 1) + '</tr></thead><tbody>' + drows + '</tbody></table></div>' +
      '<p class="note">Saldo Sell-In = saldo Mobo yang masuk ke outlet pada hari itu (DAILY_DATA_MOBII, hari yang sama). Rasio di atas 1× berarti outlet menjual lebih banyak (Reload + Voucher + CVM + Paket Data) daripada saldo yang diisi hari itu. Karena demand dicatat pada harga jual dan sebagian outlet memakai kanal isi saldo lain, rasio ini indikatif, bukan sell-through murni.</p>');
    // reconciliation per sheet and class + outliers
    var T = F.tiers || [];
    var scoped = !!(state.branch || state.hoa || state.kec || state.poDse || (state.poBrand && state.poBrand !== 'all') || state.poAdhoc === false);
    var clsOf = function (o) { return o.tier === 'A' ? 'adhoc' : (o.b === '3ID' ? 'master_3id' : 'master_im3'); };
    var rrows = PO_CATS.map(function (c) {
      var cell = function (k) {
        if (!scoped) { var x = T.filter(function (y) { return y.cat === c[0] && y.cls === k; })[0]; return x ? (c[0] === 'SPI' ? fmtCount(x.q) + ' pcs' : pjRp(x.v)) + '<br><span class="note">' + fmtCount(x.ids) + ' id</span>' : '·'; }
        if (k === 'unknown') return '·';   // ids that map to no outlet cannot be placed in a territory
        var v = 0, n = 0; rows.forEach(function (o) { var x = o.c[c[0]]; if (!x || clsOf(o) !== k) return; var val = c[0] === 'SPI' ? x[0] : x[1]; if (val > 0) { v += val; n++; } });
        return n ? (c[0] === 'SPI' ? fmtCount(v) + ' pcs' : pjRp(v)) + '<br><span class="note">' + fmtCount(n) + ' outlet</span>' : '·';
      };
      return '<tr><td class="cur"><b>' + c[1] + '</b></td>' + ['master_im3', 'master_3id', 'adhoc', 'unknown'].map(function (k) { return '<td class="num">' + cell(k) + '</td>'; }).join('') + '</tr>';
    }).join('');
    var top = rows.slice().map(function (o) { return { o: o, v: poVal(o, 'all') }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 8);
    var totAll = rows.reduce(function (s, o) { return s + poVal(o, 'all'); }, 0);
    var orows = top.map(function (r, i) { return '<tr><td class="num">' + (i + 1) + '</td><td class="cur"><b>' + esc(r.o.n || r.o.id) + '</b><br><span class="note"><code>' + esc(r.o.k) + '</code></span></td><td>' + (r.o.tier === 'A' ? '<span class="alert-tag">adhoc</span>' : '<span class="good-tag">master</span>') + '</td><td>' + esc(r.o.mc) + '</td><td class="num cur"><b>' + pjRp(r.v) + '</b></td><td class="num">' + pctOf(r.v, totAll) + '%</td></tr>'; }).join('');
    var rec = card('Rekonsiliasi per sheet dan kelas outlet, dan outlet terbesar',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Sheet') + th('Master IM3', 1) + th('Master 3ID', 1) + th('Adhoc', 1) + th('Tidak dikenal', 1) + '</tr></thead><tbody>' + rrows + '</tbody></table></div>' +
      '<h3 style="font:800 13px var(--ij-font); text-transform:uppercase; margin:14px 0 6px;">8 outlet dengan demand terbesar (' + (scoped ? 'lingkup terpilih' : 'seluruh region') + ')</h3><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('#', 1) + th('Outlet') + th('Kelas') + th('MC') + th('Demand MTD', 1) + th(scoped ? '% lingkup' : '% region', 1) + '</tr></thead><tbody>' + orows + '</tbody></table></div>' +
      (scoped ? '<p class="note">Rekonsiliasi dihitung dari outlet dalam lingkup terpilih (jumlah outlet, bukan id; kelas master IM3 atau 3ID menurut brand utama outlet). Id yang tidak terpetakan ke outlet hanya tampil pada tampilan seluruh region.</p>' : '') + '<p class="note">Sebagian besar nilai Reload, Voucher Injection dan Paket Data ada di segelintir id adhoc (kemungkinan node grosir atau distributor, bukan outlet ritel). Tombol "Outlet adhoc" di atas menyaringnya agar profil outlet ritel tidak terdistorsi.</p>');
    var adhocV = rows.reduce(function (t, o) { return t + (o.tier === 'A' ? poVal(o, 'all') : 0); }, 0), allV = A.tot.v;
    var warn = (state.poAdhoc !== false && allV > 0 && adhocV / allV > 0.5)
      ? '<div style="margin-top:10px; padding:10px 14px; border:2px solid #991b1b; background:#fee2e2; color:#7f1d1d; font:600 14.5px var(--ij-font);"><b>Perhatian:</b> ' + pctOf(adhocV, allV) + '% dari total demand ini (' + pjRp(adhocV) + ') berasal dari id adhoc, dan satu id saja memegang ' + pjRp(top.length ? top[0].v : 0) + '. Id tersebut kemungkinan node grosir atau distributor, bukan outlet ritel. Untuk profil outlet ritel dan rasio Demand ÷ Saldo yang wajar, pilih <b>Tanpa adhoc</b> di atas.</div>' : '';
    return warn + sc + daily + rec;
  }

  function poTeritori(F) {
    var level = poLevel(), groups = poRowsAt(F, level), cat = poCat(), showParent = poParentVaries(groups), isQ = cat === 'SPI';
    var body = groups.map(function (G, i) {
      var a = G.agg, cells = '<td class="num">' + (a.RLD.v ? pjRp(a.RLD.v) : '·') + '</td><td class="num">' + (a.VCI.v ? pjRp(a.VCI.v) : '·') + '</td><td class="num">' + (a.CVM.v ? pjRp(a.CVM.v) : '·') + '</td><td class="num">' + (a.PKT.v ? pjRp(a.PKT.v) : '·') + '</td><td class="num">' + (a.SPI.q ? fmtCount(a.SPI.q) : '·') + '</td>';
      var cov = level === 'outlet' ? '' : '<td class="num">' + fmtCount(G.base) + '</td><td class="num"><b>' + fmtCount(a.tot.u) + '</b> (' + pctOf(a.tot.u, G.base) + '%)</td>';
      return '<tr><td class="num">' + (i + 1) + '</td>' + poNameCell(G) + (showParent ? '<td>' + esc(G.parent) + '</td>' : '') + cov + '<td class="num cur"><b>' + poFmt(cat, G.v) + '</b></td>' + cells + '<td class="num">' + (G.sup ? pjRp(G.sup) : '·') + '</td><td class="num">' + (level === 'outlet' || cat === 'SPI' ? '—' : poRatioCell(poRatio(a.tot.v, G.sup))) + '</td><td>' + poDetailBtn(level, G) + '</td></tr>';
    }).join('');
    if (level !== 'outlet' && groups.length > 1) {
      var tItems = []; groups.forEach(function (G) { tItems = tItems.concat(G.items); });
      var TA = poAgg(tItems), TB = groups.reduce(function (s, G) { return s + G.base; }, 0), TSup = groups.reduce(function (s, G) { return s + G.sup; }, 0), TVal = tItems.reduce(function (s, o) { return s + poVal(o, cat); }, 0);
      body += '<tr class="tot-row" style="' + TOT_ST + '"><td></td><td><b>TOTAL · ' + fmtCount(groups.length) + ' ' + ({ area: 'area', mc: 'MC', dse: 'DSE' }[level] || '') + '</b></td>' + (showParent ? '<td></td>' : '') +
        totNum(fmtCount(TB)) + totNum('<b>' + fmtCount(TA.tot.u) + '</b> (' + pctOf(TA.tot.u, TB) + '%)') + totNum('<b>' + poFmt(cat, TVal) + '</b>') +
        totNum(TA.RLD.v ? pjRp(TA.RLD.v) : '·') + totNum(TA.VCI.v ? pjRp(TA.VCI.v) : '·') + totNum(TA.CVM.v ? pjRp(TA.CVM.v) : '·') + totNum(TA.PKT.v ? pjRp(TA.PKT.v) : '·') + totNum(TA.SPI.q ? fmtCount(TA.SPI.q) : '·') +
        totNum(TSup ? pjRp(TSup) : '·') + totNum(cat === 'SPI' ? '—' : poRatioCell(poRatio(TA.tot.v, TSup))) + '<td></td></tr>';
    }
    var head = th('#', 1) + th(poEntityHead(level)) + (showParent ? th(poParentHead(level)) : '') + (level === 'outlet' ? '' : th('Outlet master', 1) + th('UAR demand', 1)) + th(isQ ? 'SP Injection (pcs)' : 'Demand MTD', 1) + th('Reload', 1) + th('Voucher Inj', 1) + th('CVM', 1) + th('Paket Data', 1) + th('SP Inj (pcs)', 1) + th('Saldo Sell-In', 1) + th('Demand ÷ Saldo', 1) + th('Detail');
    return poLevelBar() + card('Performance demand ' + PO_LEVEL_LABEL[level] + ' · ' + PO_CAT_LABEL[cat], '<div class="map-toolbar" style="margin-bottom:8px;">' + poCatBar(true) + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">UAR demand = outlet dengan Reload + Voucher + CVM + Paket Data > 0 MTD, terhadap outlet master di teritori. Saldo Sell-In = saldo Mobo yang masuk 1–' + F.metadata.cut_day + ' Okt (hari yang sama dengan demand). Demand ÷ Saldo > 1× = outlet menjual lebih banyak daripada saldo yang diisi. "Detail" turun ke level di bawahnya.</p>');
  }

  function poHeat(F) {
    var level = poLevel(), groups = poRowsAt(F, level), n = F.metadata.cut_day, cat = poCat(), isQ = cat === 'SPI', showParent = poParentVaries(groups);
    var paged = level === 'dse' || level === 'outlet', pg = paged ? poPager(groups.length, 50) : { start: 0, end: groups.length, html: '' };
    var slice = groups.slice(pg.start, pg.end), series = slice.map(function (G) { var s = []; for (var i = 0; i < n; i++) s.push(0); G.items.forEach(function (o) { poDaily(o, cat, n).forEach(function (v, i) { s[i] += v; }); }); return s; });
    var tot = []; for (var i = 0; i < n; i++) tot.push(0); groups.forEach(function (G) { G.items.forEach(function (o) { poDaily(o, cat, n).forEach(function (v, i) { tot[i] += v; }); }); });
    var max = 0; series.forEach(function (s) { s.forEach(function (v) { if (v > max) max = v; }); });
    var TV = groups.reduce(function (a, G) { return a + G.v; }, 0), TU = 0; groups.forEach(function (G) { TU += G.items.filter(function (o) { return poVal(o, cat) > 0; }).length; });
    var dayHead = F.metadata.days.map(function (d) { var wd = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(d + 'T00:00:00').getDay()]; return '<th class="num" style="text-align:center; min-width:58px;">' + d.slice(8) + '<br><span style="font-weight:500;">' + wd + '</span></th>'; }).join('');
    var perf = function (G, v, u) { return '<td class="num cur"><b>' + poFmt(cat, v) + '</b></td><td class="num">' + fmtCount(u) + '</td><td class="num">' + poFmt(cat, u ? v / u : 0) + '</td>'; };
    var totalRow = groups.length < 2 ? '' : '<tr style="background:var(--ij-wash, #f6f4f1); font-weight:800;"><td class="cur">Semua dalam lingkup (' + fmtCount(groups.length) + ' baris)</td>' + (showParent ? '<td></td>' : '') + perf(null, TV, TU) + tot.map(function (v) { return poHeatCell(v, Math.max.apply(null, tot) || 1, isQ); }).join('') + '<td></td></tr>';
    var body = slice.map(function (G, i) { var u = G.items.filter(function (o) { return poVal(o, cat) > 0; }).length; return '<tr>' + poNameCell(G) + (showParent ? '<td>' + esc(G.parent) + '</td>' : '') + perf(G, G.v, u) + series[i].map(function (v) { return poHeatCell(v, max, isQ); }).join('') + '<td>' + poDetailBtn(level, G) + '</td></tr>'; }).join('');
    return poLevelBar() + card('Heatmap demand harian · ' + PO_LEVEL_LABEL[level] + ' · ' + PO_CAT_LABEL[cat], '<div class="map-toolbar" style="margin-bottom:8px;">' + poCatBar(true) + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th(poEntityHead(level)) + (showParent ? th(poParentHead(level)) : '') + th('Total MTD', 1) + th('Outlet aktif', 1) + th('Rata-rata / outlet', 1) + dayHead + th('Detail') + '</tr></thead><tbody>' + totalRow + body + '</tbody></table></div>' + pg.html +
      '<p class="note">Kolom performa (total MTD, outlet aktif, rata-rata per outlet) ada di depan sebelum harian. Sel = ' + (isQ ? 'unit SP yang di-inject' : 'nilai demand') + ' pada tanggal itu; makin hijau makin besar relatif terhadap sel terbesar. Cut data MOBO ' + F.metadata.cut_day + ' Okt.</p>');
  }

  function poProdukList(F) {
    var cat = state.poProdCat || 'all', q = (state.poSearch || '').toLowerCase();
    var rows = (F.products || []).filter(function (p) { return (cat === 'all' || p.cat === cat) && (!q || p.n.toLowerCase().indexOf(q) !== -1); });
    var TV = rows.reduce(function (a, p) { return a + (p.cat === 'SPI' ? 0 : p.mv); }, 0), TQ = rows.reduce(function (a, p) { return a + p.mq; }, 0);
    var bar = '<div class="map-toolbar-group"><span class="map-label">Komoditas:</span><button type="button" class="map-btn' + (cat === 'all' ? ' active' : '') + '" data-po-prodcat="all">Semua</button>' + PO_CATS.map(function (c) { return '<button type="button" class="map-btn' + (cat === c[0] ? ' active' : '') + '" data-po-prodcat="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>';
    var body = rows.slice(0, 250).map(function (p, i) { return '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(PO_CAT_LABEL[p.cat].replace(' (pcs)', '')) + '</td><td class="cur"><b>' + esc(p.n) + '</b></td><td class="num">' + (p.price != null ? pjRp(p.price) : '—') + '</td><td class="num">' + fmtCount(p.mq) + '</td><td class="num cur"><b>' + (p.cat === 'SPI' && !p.mv ? '—' : pjRp(p.mv)) + '</b></td><td class="num">' + (p.cat === 'SPI' ? '·' : pctOf(p.mv, TV) + '%') + '</td><td class="num">' + fmtCount(p.mo) + '</td></tr>'; }).join('');
    return card('Mix produk demand · se-region · MTD (' + fmtCount(rows.length) + ' produk' + (rows.length > 250 ? ', 250 teratas' : '') + ')', '<div class="map-toolbar" style="margin-bottom:8px;">' + bar + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('#', 1) + th('Komoditas') + th('Produk / nominal') + th('Rp/hit', 1) + th('Hits', 1) + th('Nilai MTD', 1) + th('% nilai', 1) + th('Outlet', 1) + '</tr></thead><tbody>' + body + '</tbody></table></div><p class="note">Tabel produk se-region (tidak mengikuti filter teritori). Reload memakai nominal isi ulang sebagai nama produk. Kotak cari menyaring nama produk.</p>');
  }

  function poProduk(F) {
    var view = state.poProdView || 'list';
    var bar = '<div class="sub-nav" role="tablist" style="margin-top:10px;">' + [['list', '📋 Daftar Produk'], ['top', '🏆 Top Produk per Kategori']].map(function (t) { return '<button type="button" role="tab" class="sub-nav-btn' + (view === t[0] ? ' active' : '') + '" data-po-prodview="' + t[0] + '" aria-selected="' + (view === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    return bar + (view === 'top' ? poTopProduk(F) : poProdukList(F));
  }
  function poTopProduk(F) {
    var n = F.metadata.cut_day, cat = state.poProdCat || 'all', by = state.poTopBy || 'nilai', q = (state.poSearch || '').toLowerCase();
    var rows = poOutlets(F), agg = {};
    rows.forEach(function (o) { Object.keys(o.p || {}).forEach(function (i) { var x = o.p[i], a = agg[i] || (agg[i] = { q: 0, v: 0, o: 0 }); a.q += x[0]; a.v += x[1]; if (x[0] || x[1]) a.o++; }); });
    var cats = cat === 'all' ? PO_CATS : PO_CATS.filter(function (c) { return c[0] === cat; });
    var bar = '<div class="map-toolbar-group"><span class="map-label">Kategori:</span><button type="button" class="map-btn' + (cat === 'all' ? ' active' : '') + '" data-po-prodcat="all">Semua kategori</button>' + PO_CATS.map(function (c) { return '<button type="button" class="map-btn' + (cat === c[0] ? ' active' : '') + '" data-po-prodcat="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<div class="map-toolbar-group"><span class="map-label">Urut berdasarkan:</span>' + [['nilai', 'Nilai / unit'], ['outlet', 'Outlet pembeli']].map(function (x) { return '<button type="button" class="map-btn' + (by === x[0] ? ' active' : '') + '" data-po-topby="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var blocks = cats.map(function (c) {
      var code = c[0], isQ = code === 'SPI';
      var all = (F.products || []).filter(function (p) { return p.cat === code && agg[p.i]; }).map(function (p) { var a = agg[p.i]; return { p: p, q: a.q, v: a.v, o: a.o }; });
      var tot = all.reduce(function (s, r) { return { q: s.q + r.q, v: s.v + r.v }; }, { q: 0, v: 0 });
      var metric = function (r) { return by === 'outlet' ? r.o : (isQ ? r.q : r.v); };
      var base = isQ ? tot.q : tot.v;
      var list = all.filter(function (r) { return !q || r.p.n.toLowerCase().indexOf(q) !== -1; }).sort(function (x, y) { return metric(y) - metric(x) || y.v - x.v; }).slice(0, 10);
      var cum = 0, maxV = list.length ? Math.max.apply(null, list.map(function (r) { return isQ ? r.q : r.v; })) : 1;
      var body = list.map(function (r, i) {
        var m = isQ ? r.q : r.v; cum += m;
        return '<tr><td class="num"><b>' + (i + 1) + '</b></td><td class="cur"><b>' + esc(r.p.n) + '</b></td><td class="num">' + fmtCount(r.q) + '</td><td class="num cur"><b>' + (r.v ? pjRp(r.v) : '—') + '</b></td>' +
          '<td class="num" style="min-width:110px;">' + pctOf(m, base) + '%<div style="height:6px; background:var(--ij-hairline, #ddd); margin-top:3px;"><div style="height:6px; width:' + (maxV ? (m / maxV * 100).toFixed(0) : 0) + '%; background:var(--ij-ink);"></div></div></td>' +
          '<td class="num">' + pctOf(cum, base) + '%</td><td class="num">' + fmtCount(r.o) + '</td><td class="num">' + (r.q && r.v ? pjRp(r.v / r.q) : '—') + '</td><td class="num">' + (r.o && r.v ? pjRp(r.v / r.o) : (r.o ? fmtCount(Math.round(r.q / r.o)) + ' pcs' : '—')) + '</td></tr>';
      }).join('');
      var topSum = list.reduce(function (s, r) { return { q: s.q + r.q, v: s.v + r.v }; }, { q: 0, v: 0 });
      var foot = list.length ? '<tr style="background:var(--ij-wash, #f6f4f1); font-weight:800;"><td></td><td>TOTAL TOP ' + list.length + ' dari ' + fmtCount(all.length) + ' produk</td><td class="num">' + fmtCount(topSum.q) + '</td><td class="num">' + (topSum.v ? pjRp(topSum.v) : '—') + '</td><td class="num">' + pctOf(isQ ? topSum.q : topSum.v, base) + '%</td><td></td><td></td><td></td><td></td></tr>' : '';
      return card('Top 10 · ' + c[1] + ' · MTD 1–' + n + ' Okt · ' + (isQ ? fmtCount(tot.q) + ' pcs' : pjRp(tot.v)) + ' dari ' + fmtCount(all.length) + ' produk',
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('#', 1) + th('Produk' + (code === 'RLD' ? ' / nominal' : '')) + th('Hits (unit)', 1) + th('Nilai MTD', 1) + th(isQ ? '% unit kategori' : '% nilai kategori', 1) + th('Kumulatif', 1) + th('Outlet pembeli', 1) + th('Rp / hit', 1) + th(isQ ? 'Unit / outlet' : 'Rp / outlet', 1) + '</tr></thead><tbody>' + (body || '<tr><td colspan="9" class="note">Tidak ada produk pada filter ini.</td></tr>') + foot + '</tbody></table></div>');
    }).join('');
    return poLevelBar() + '<div class="map-toolbar" style="margin-top:10px;">' + bar + '</div>' + blocks +
      '<p class="note" style="margin-top:8px;">Top 10 produk per kategori demand, dihitung dari outlet dalam lingkup filter (Branch, Head of Area, MC, DSE, Brand, Outlet adhoc ikut atau tanpa adhoc). Produk diurutkan menurut nilai rupiah. Urut "Outlet pembeli" memakai jumlah outlet berbeda yang menjual produk itu. Reload memakai nominal isi ulang sebagai nama produk. Hanya MTD 1–' + n + ' Okt: file MOBO tidak punya bulan lalu. Kotak cari menyaring nama produk.</p>';
  }
  function poOutletTab(F) {
    var n = F.metadata.cut_day, cat = poCat(), q = (state.poSearch || '').toLowerCase(), isQ = cat === 'SPI';
    var rows = poOutlets(F).filter(function (o) { if (poVal(o, cat) <= 0) return false; if (q && (o.n + ' ' + o.id + ' ' + o.mc + ' ' + o.dse + ' ' + o.kec + ' ' + o.site).toLowerCase().indexOf(q) === -1) return false; return true; });
    rows.sort(function (a, b) { return poVal(b, cat) - poVal(a, cat); });
    var parents = {}; rows.forEach(function (o) { parents[o.mc + '|' + o.dse] = 1; }); var showParent = Object.keys(parents).length > 1;
    var mi = F.metadata.mc_info || {}, span = showParent ? 3 : 2;
    function poRow(o) {
      var last = null; PO_CATS.forEach(function (c) { if (o.c[c[0]] && o.c[c[0]][2] != null && (last == null || o.c[c[0]][2] > last)) last = o.c[c[0]][2]; });
      var s = poSup(F, o), dem = poVal(o, 'all');
      var flag = o.tier === 'A' ? '<span class="alert-tag">adhoc</span>' : (s ? (dem > 0 && s.saldo > 0 && dem / s.saldo > 1.5 ? '<span class="alert-tag">jual ≫ isi saldo</span>' : '<span class="good-tag">ada supply</span>') : '<span style="background:#fef3c7; color:#92400e; padding:2px 7px; font-weight:800; font-size:11px;">tanpa supply MTD</span>');
      return '<tr><td class="cur"><b>' + esc(o.n || o.id) + '</b><br><span style="font-size:11px;"><span class="' + (o.b === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(o.b) + '</span> <code>' + esc(o.id) + '</code></span></td>' + (showParent ? '<td>' + esc(o.mc) + '<br><span class="note">' + esc(o.dse) + '</span></td>' : '') + '<td>' + esc(o.kec) + '<br><code style="font-size:11px;">' + esc(o.site || '—') + '</code></td><td class="num cur"><b>' + poFmt(cat, poVal(o, cat)) + '</b></td>' +
        PO_CATS.map(function (c) { var x = o.c[c[0]]; return '<td class="num">' + (x && (c[0] === 'SPI' ? x[0] : x[1]) ? (c[0] === 'SPI' ? fmtCount(x[0]) : pjRp(x[1])) : '·') + '</td>'; }).join('') + '<td class="num">' + (s && s.saldo ? pjRp(s.saldo) : '·') + '</td><td class="num">' + (s ? fmtCount(s.sp) : '·') + '</td><td>' + (last != null ? last + ' Okt' : '—') + '</td><td>' + flag + '</td></tr>';
    }
    function poSub(items) {
      var tv = 0, sal = 0, sp = 0, per = {}; PO_CATS.forEach(function (c) { per[c[0]] = 0; });
      items.forEach(function (o) { tv += poVal(o, cat); var s = poSup(F, o); if (s) { sal += s.saldo || 0; sp += s.sp || 0; } PO_CATS.forEach(function (c) { var x = o.c[c[0]]; if (x) per[c[0]] += c[0] === 'SPI' ? x[0] : x[1]; }); });
      return '<td class="num cur"><b>' + poFmt(cat, tv) + '</b></td>' + PO_CATS.map(function (c) { return '<td class="num">' + (per[c[0]] ? (c[0] === 'SPI' ? fmtCount(per[c[0]]) : pjRp(per[c[0]])) : '·') + '</td>'; }).join('') + '<td class="num">' + (sal ? pjRp(sal) : '·') + '</td><td class="num">' + fmtCount(sp) + '</td><td colspan="2"></td>';
    }
    var body = grpBody('po', { items: rows, area: function (o) { return poDim(o, F).br; }, mc: function (o) { return o.mc; }, dso: function (m) { return (mi[m] || {}).dso || '—'; }, hoa: function (a) { for (var k in mi) if (mi[k].br === a) return mi[k].hoa || '—'; return '—'; },
      val: function (o) { return poVal(o, cat); }, span: span, cols: span + 1 + PO_CATS.length + 4, sub: poSub, row: poRow, search: !!(q || state.poDse) });
    return poLevelBar() + card('Outlet · demand per outlet · ' + PO_CAT_LABEL[cat] + ' (' + fmtCount(rows.length) + ' outlet)', '<div class="map-toolbar" style="margin-bottom:8px;">' + poCatBar(true) + grpBar('po') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › Outlet') + (showParent ? th('MC · DSE') : '') + th('Kecamatan · Site') + th(isQ ? 'SP Inj (pcs)' : 'Demand MTD', 1) + PO_CATS.map(function (c) { return th(c[1], 1); }).join('') + th('Saldo Sell-In', 1) + th('SP Sell-In (pcs)', 1) + th('Demand terakhir') + th('Status supply') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka. Baris grup menjumlahkan outlet di dalamnya. Urut demand MTD. "Jual ≫ isi saldo" = demand (Reload + Voucher + CVM + Paket Data) lebih dari 1,5× saldo Mobo yang masuk 1–' + n + ' Okt; "tanpa supply MTD" = ada demand tetapi tidak ada Sell-In sama sekali. Kotak cari menyaring nama, id, MC, DSE, kecamatan atau site.</p>');
  }

  /* ---- tab: Konsentrasi (Pareto dan kelas outlet) ---- */
  function poKonsentrasi(F) {
    var list = poOutlets(F).map(function (o) { return { o: o, v: poVal(o, 'all') }; }).filter(function (x) { return x.v > 0; });
    list.sort(function (a, b) { return b.v - a.v; });
    var N = list.length, tot = list.reduce(function (s, x) { return s + x.v; }, 0);
    if (!N) return card('Konsentrasi demand', '<p class="note">Tidak ada outlet dengan demand pada filter ini.</p>');
    var cum = []; list.reduce(function (s, x, i) { cum[i] = s + x.v; return cum[i]; }, 0);
    var topK = function (k) { return cum[Math.min(k, N) - 1] || 0; };
    var kFor = function (share) { for (var i = 0; i < N; i++) if (cum[i] >= tot * share) return i + 1; return N; };
    var kp = '<div class="kpis" style="margin-top:10px; grid-template-columns: repeat(4, 1fr);">' +
      kpi('Outlet terbesar', pctOf(list[0].v, tot) + '%', esc(list[0].o.n || list[0].o.id) + ' · ' + pjRp(list[0].v), list[0].v / tot > 0.1 ? 'down' : 'up', 'dari total demand ' + pjRp(tot)) +
      kpi('10 outlet teratas', pctOf(topK(10), tot) + '%', pjRp(topK(10)), topK(10) / tot > 0.3 ? 'down' : 'up', 'dari ' + fmtCount(N) + ' outlet dengan demand') +
      kpi('100 outlet teratas', pctOf(topK(100), tot) + '%', pjRp(topK(100)), 'up', pctOf(100, N) + '% dari outlet') +
      kpi('Outlet untuk 50% / 80% demand', fmtCount(kFor(0.5)) + ' / ' + fmtCount(kFor(0.8)), pctOf(kFor(0.5), N) + '% / ' + pctOf(kFor(0.8), N) + '% dari outlet', 'up', 'makin kecil, makin terkonsentrasi') +
    '</div>';
    var bands = [1, 5, 10, 20, 50, 100].map(function (pc) {
      var k = Math.max(1, Math.ceil(N * pc / 100)), v = topK(k);
      return '<tr><td class="cur"><b>' + (pc === 100 ? 'Semua outlet' : 'Top ' + pc + '%') + '</b></td><td class="num">' + fmtCount(k) + '</td><td class="num">' + pjRp(v) + '</td><td class="num cur"><b>' + pctOf(v, tot) + '%</b></td><td class="num">' + pjRp(list[k - 1].v) + '</td><td class="num">' + pjRp(v / k) + '</td></tr>';
    }).join('');
    var pareto = card('Kurva Pareto · berapa persen outlet yang menghasilkan demand', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Kelompok') + th('Outlet', 1) + th('Demand', 1) + th('% total demand', 1) + th('Nilai outlet terkecil di kelompok', 1) + th('Rata-rata / outlet', 1) + '</tr></thead><tbody>' + bands + '</tbody></table></div>' +
      '<p class="note">Urutan berdasarkan total demand MTD (Reload + Voucher + CVM + Paket Data) seluruh outlet dalam lingkup filter. Gunakan tombol Outlet adhoc untuk melihat konsentrasi outlet ritel saja.</p>');
    var classes = [['master', 'Master (id IM3 dan/atau 3ID)', function (o) { return o.tier === 'M'; }], ['adhoc', 'Adhoc (bukan master)', function (o) { return o.tier === 'A'; }]];
    var crows = classes.map(function (cl) {
      var its = list.filter(function (x) { return cl[2](x.o); }), v = its.reduce(function (s, x) { return s + x.v; }, 0), per = {};
      PO_VALUE_CATS.forEach(function (c) { per[c] = its.reduce(function (s, x) { return s + (x.o.c[c] ? x.o.c[c][1] : 0); }, 0); });
      return '<tr><td class="cur"><b>' + cl[1] + '</b></td><td class="num">' + fmtCount(its.length) + '</td>' + PO_VALUE_CATS.map(function (c) { return '<td class="num">' + (per[c] ? pjRp(per[c]) : '·') + '</td>'; }).join('') + '<td class="num cur"><b>' + pjRp(v) + '</b></td><td class="num">' + pctOf(v, tot) + '%</td><td class="num">' + (its.length ? pjRp(v / its.length) : '·') + '</td><td class="num">' + (its.length ? pjRp(its[0].v) : '·') + '</td></tr>';
    }).join('');
    var cls = card('Kelas outlet · master vs adhoc', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Kelas') + th('Outlet dengan demand', 1) + PO_VALUE_CATS.map(function (c) { return th(PO_CAT_LABEL[c], 1); }).join('') + th('Total demand', 1) + th('% total', 1) + th('Rata-rata / outlet', 1) + th('Terbesar', 1) + '</tr></thead><tbody>' + crows + '</tbody></table></div>' +
      '<p class="note">Id adhoc tidak ada di master outlet dan umumnya node grosir, distributor atau penjual online bervolume besar. Nilai rata-rata per outlet adhoc yang jauh di atas master adalah tanda node non-ritel. Split IM3 dan 3ID ada di tab Bauran & Penetrasi.</p>');
    var cumShare = 0, tr = list.slice(0, 25).map(function (x, i) {
      cumShare = cum[i] / tot * 100;
      var parts = PO_VALUE_CATS.filter(function (c) { return x.o.c[c] && x.o.c[c][1] > 0; }).map(function (c) { return PO_CAT_LABEL[c] + ' ' + pjRp(x.o.c[c][1]); }).join(' · ');
      return '<tr><td class="num">' + (i + 1) + '</td><td class="cur"><b>' + esc(x.o.n || x.o.id) + '</b><br><span style="font-size:11px;"><span class="' + (x.o.b === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(x.o.b) + '</span> <code>' + esc(x.o.id) + '</code></span></td><td>' + (x.o.tier === 'A' ? '<span class="alert-tag">adhoc</span>' : '<span class="good-tag">master</span>') + '</td><td>' + esc(x.o.mc || '—') + '</td><td class="num cur"><b>' + pjRp(x.v) + '</b></td><td class="num">' + pctOf(x.v, tot) + '%</td><td class="num">' + cumShare.toFixed(1) + '%</td><td style="font-size:12px;">' + parts + '</td></tr>';
    }).join('');
    var top25 = card('25 outlet dengan demand terbesar', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('#', 1) + th('Outlet') + th('Kelas') + th('MC') + th('Demand MTD', 1) + th('% total', 1) + th('Kumulatif', 1) + th('Bauran') + '</tr></thead><tbody>' + tr + '</tbody></table></div>');
    return kp + pareto + cls + top25;
  }

  function poSvd(F) {
    var S = pjFeed(); if (!S) return card('Supply vs Demand', '<p class="note">Feed Penjualan belum tersedia.</p>');
    var terr = (typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED : (typeof TERRITORY_FEED !== 'undefined' ? TERRITORY_FEED : null);
    var dem = {}; F.outlets.forEach(function (o) { var v = poVal(o, 'all'); if (v > 0) dem[o.k] = o; });
    var sup = poSupplyMap(F), mi = F.metadata.mc_info || {}, b = state.poBrand || 'all', adhocOn = state.poAdhoc !== false;
    var segDefs = [['both', 'Demand + Supply', 'good-tag'], ['demandOnly', 'Demand tanpa Supply MTD', 'alert-tag'], ['supplyOnly', 'Supply tanpa Demand MTD', ''], ['none', 'Tanpa keduanya', '']];
    var byMc = {}, tot = { both: 0, demandOnly: 0, supplyOnly: 0, none: 0 }, listDemandOnly = [], listSupplyOnly = [];
    function bump(mc, seg, o) { var M = byMc[mc] || (byMc[mc] = { mc: mc, dso: (mi[mc] || {}).dso || '—', br: (mi[mc] || {}).br || '—', both: 0, demandOnly: 0, supplyOnly: 0, none: 0, dem: 0, sal: 0, supSaldoOnly: 0 }); M[seg]++; tot[seg]++; return M; }
    var seen = {};
    ((terr && terr.outlets) || []).forEach(function (t) {
      var d = mi[t.micro_cluster] || {}; if (state.branch && d.br !== state.branch) return; if (state.hoa && d.hoa !== state.hoa) return; if (state.kec && t.micro_cluster !== state.kec) return; if (state.poDse && dseNorm(t.dse_name) !== dseNorm(state.poDse)) return;
      var o = dem[t.outlet_key], s = sup[t.outlet_key]; seen[t.outlet_key] = 1;
      if (b !== 'all' && o && o.b !== b) return;
      var seg = o && s ? 'both' : (o ? 'demandOnly' : (s ? 'supplyOnly' : 'none'));
      var M = bump(t.micro_cluster, seg, t); if (o) M.dem += poVal(o, 'all'); if (s) M.sal += s.saldo;
      if (seg === 'demandOnly') listDemandOnly.push({ t: t, o: o }); if (seg === 'supplyOnly') listSupplyOnly.push({ t: t, s: s });
    });
    if (adhocOn) { Object.keys(dem).forEach(function (k) { var o = dem[k]; if (o.tier !== 'A') return; if (!poInScope(o, F)) return; var s = sup[k]; var seg = s ? 'both' : 'demandOnly'; var M = bump(o.mc || 'OUTSIDE MASTER TERRITORY', seg, o); M.dem += poVal(o, 'all'); if (s) M.sal += s.saldo; if (seg === 'demandOnly') listDemandOnly.push({ t: { outlet_key: k, outlet_name: o.n, micro_cluster: o.mc, dse_name: o.dse, kecamatan: o.kec }, o: o }); }); }
    var T = tot.both + tot.demandOnly + tot.supplyOnly + tot.none;
    var kpis = '<div class="kpis" style="margin-top:10px;">' + segDefs.map(function (s) { return kpi(s[1], fmtCount(tot[s[0]]), pctOf(tot[s[0]], T) + '% dari ' + fmtCount(T) + ' outlet', s[0] === 'demandOnly' ? 'down' : 'up', s[0] === 'both' ? 'sell-out dan sell-in 1–' + F.metadata.cut_day + ' Okt' : (s[0] === 'demandOnly' ? 'menjual dari stok lama atau sumber lain' : (s[0] === 'supplyOnly' ? 'stok masuk, belum terjual' : 'tidak aktif di kedua sisi'))); }).join('') + '</div>';
    var rows = Object.keys(byMc).map(function (k) { return byMc[k]; }).sort(function (a, c) { return c.demandOnly - a.demandOnly || c.supplyOnly - a.supplyOnly; });
    var mcRows = rows.map(function (M) { var base = M.both + M.demandOnly + M.supplyOnly + M.none; return '<tr><td class="cur"><b>' + esc(M.mc) + '</b><br><span class="note">' + esc(M.br) + ' · DSO ' + esc(M.dso) + '</span></td><td class="num">' + fmtCount(base) + '</td><td class="num">' + fmtCount(M.both) + '</td><td class="num"><span class="alert-tag">' + fmtCount(M.demandOnly) + '</span></td><td class="num">' + fmtCount(M.supplyOnly) + '</td><td class="num">' + fmtCount(M.none) + '</td><td class="num">' + pjRp(M.dem) + '</td><td class="num">' + pjRp(M.sal) + '</td><td class="num">' + poRatioCell(poRatio(M.dem, M.sal)) + '</td><td><button type="button" class="btn" data-po-detail="mc" data-mc="' + esc(M.mc) + '" style="font-size:11.5px; padding:5px 9px;">Fokus MC &#8594;</button></td></tr>'; }).join('');
    if (rows.length > 1) {
      var sT = rows.reduce(function (a, M) { a.base += M.both + M.demandOnly + M.supplyOnly + M.none; a.both += M.both; a.d += M.demandOnly; a.s += M.supplyOnly; a.n += M.none; a.dem += M.dem; a.sal += M.sal; return a; }, { base: 0, both: 0, d: 0, s: 0, n: 0, dem: 0, sal: 0 });
      mcRows += '<tr class="tot-row" style="' + TOT_ST + '"><td><b>TOTAL · ' + fmtCount(rows.length) + ' MC</b></td>' + totNum(fmtCount(sT.base)) + totNum(fmtCount(sT.both)) + totNum('<b>' + fmtCount(sT.d) + '</b>') + totNum(fmtCount(sT.s)) + totNum(fmtCount(sT.n)) + totNum(pjRp(sT.dem)) + totNum(pjRp(sT.sal)) + totNum(poRatioCell(poRatio(sT.dem, sT.sal))) + '<td></td></tr>';
    }
    var mcCard = card('Supply vs Demand per Micro Cluster · segmen outlet', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('MC · DSO') + th('Outlet', 1) + th('Demand + Supply', 1) + th('Demand tanpa Supply', 1) + th('Supply tanpa Demand', 1) + th('Tanpa keduanya', 1) + th('Demand Rp', 1) + th('Saldo Sell-In', 1) + th('Demand ÷ Saldo', 1) + th('') + '</tr></thead><tbody>' + mcRows + '</tbody></table></div><p class="note">Supply = Sell-In apa pun (SP, voucher, saldo) ke outlet 1–' + F.metadata.cut_day + ' Okt (DAILY_DATA_MOBII, dipotong ke hari yang sama dengan demand, saat ini keduanya sampai ' + F.metadata.cut_day + ' Okt). Demand = Reload, Voucher, CVM, Paket Data atau SP Injection > 0. Segmen dihitung per outlet master ditambah outlet adhoc yang punya demand.</p>');
    listDemandOnly.sort(function (a, c) { return poVal(c.o, 'all') - poVal(a.o, 'all'); });
    function dRow(r) { return '<tr><td class="cur"><b>' + esc(r.t.outlet_name || r.o.n || r.o.id) + '</b><br><span class="note"><code>' + esc(r.t.outlet_key) + '</code></span></td><td>' + esc(r.t.micro_cluster) + '<br><span class="note">' + esc(r.t.dse_name || r.o.dse) + '</span></td><td class="num cur"><b>' + pjRp(poVal(r.o, 'all')) + '</b></td><td class="num">' + fmtCount(r.o.c.SPI ? r.o.c.SPI[0] : 0) + '</td><td>' + (r.o.tier === 'A' ? '<span class="alert-tag">adhoc</span>' : '<span class="good-tag">master</span>') + '</td></tr>'; }
    function dSub(items) { var dv = 0, sp = 0; items.forEach(function (r) { dv += poVal(r.o, 'all'); sp += r.o.c.SPI ? r.o.c.SPI[0] : 0; }); return '<td class="num cur"><b>' + pjRp(dv) + '</b></td><td class="num">' + fmtCount(sp) + '</td><td></td>'; }
    var dBody = grpBody('posvd', { items: listDemandOnly, area: function (r) { return (mi[r.t.micro_cluster] || {}).br || r.o.br; }, mc: function (r) { return r.t.micro_cluster; }, dso: function (m) { return (mi[m] || {}).dso || '—'; }, hoa: function (a) { for (var k in mi) if (mi[k].br === a) return mi[k].hoa || '—'; return '—'; },
      val: function (r) { return poVal(r.o, 'all'); }, span: 2, cols: 5, sub: dSub, row: dRow, search: false });
    var dCard = card('Peluang supply · outlet yang menjual tanpa Sell-In MTD (' + fmtCount(listDemandOnly.length) + ' outlet, demand terbesar dulu)', '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('posvd') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › Outlet') + th('MC · DSE') + th('Demand MTD', 1) + th('SP Inj (pcs)', 1) + th('Kelas') + '</tr></thead><tbody>' + dBody + '</tbody></table></div><p class="note">Dikelompokkan Area › Micro Cluster (DSO). Outlet ini sudah punya konsumen (sell-out) tetapi tidak menerima SP, voucher atau saldo dari kanal Sell-In; prioritas kunjungan DSE untuk menjamin ketersediaan.</p>');
    return kpis + mcCard + dCard;
  }

  function viewPerformance() {
    var F = poFeed();
    if (!F) return card('Demand Customer', '<p class="note">Feed demand belum dibangun. Jalankan <code>python3 scripts/build_demand_feed.py</code>.</p>');
    var M = F.metadata, n = M.cut_day, tab = state.poTab || 'ringkasan', b = state.poBrand || 'all', rows = poOutlets(F), A = poAgg(rows), base = poMasterBase(F);
    var nav = '<div class="sub-nav" role="tablist">' + PO_TABS.map(function (t) { return '<button type="button" role="tab" class="sub-nav-btn' + (tab === t[0] ? ' active' : '') + '" data-po-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var tools = '<div class="map-toolbar" style="margin-top:10px;"><div class="map-toolbar-group"><span class="map-label">Brand:</span>' + [['all', 'Semua'], ['IM3', 'IM3'], ['3ID', '3ID']].map(function (x) { return '<button type="button" class="map-btn' + (b === x[0] ? ' active' : '') + '" data-po-brand="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="map-toolbar-group"><span class="map-label">Outlet adhoc:</span><button type="button" class="map-btn' + (state.poAdhoc !== false ? ' active' : '') + '" data-po-adhoc="1">Ikut</button><button type="button" class="map-btn' + (state.poAdhoc === false ? ' active' : '') + '" data-po-adhoc="0">Tanpa adhoc</button></div>' +
      '<div class="map-toolbar-group"><input type="text" id="poSearchInput" aria-label="Cari outlet, produk, MC atau DSE" placeholder="🔍 Cari outlet, produk, MC, DSE..." value="' + esc(state.poSearch || '') + '" class="map-select" style="min-width:260px;">' + ((state.poSearch || state.branch || state.hoa || state.kec || state.poDse || b !== 'all' || poCat() !== 'all' || state.poAdhoc === false || (state.poLevel && state.poLevel !== 'auto')) ? '<button type="button" class="btn" data-act="clear-po-filter" style="font-size:12px; padding:6px 12px;">Reset filter</button>' : '') + '</div>' +
      '<div class="map-toolbar-group"><span class="note">Sumber DAILY_DATA_MOBO · cut ' + esc(M.cut) + ' · MTD saja · satuan: M = milyar, Jt = juta, Rb = ribu</span></div></div>';
    var LDK = poLd(F, rows), ldT = ' · hari kerja terakhir ' + LDK.W.short + ': ';
    var sdays = poSupplyDaily(F, rows), supTot = sdays.reduce(function (a, v) { return a + v; }, 0);
    var kpis = '<div class="kpis" style="margin-top:10px; grid-template-columns: repeat(5, 1fr);">' +
      kpi('Total demand · MTD', pjRp(A.tot.v), 'Paket Data ' + pjRp(A.PKT.v) + ' · Reload ' + pjRp(A.RLD.v) + ' · Voucher ' + pjRp(A.VCI.v) + ' · CVM ' + pjRp(A.CVM.v), 'up', 'Hits ' + fmtCount(A.RLD.q + A.VCI.q + A.CVM.q + A.PKT.q) + ' · 1–' + n + ' Okt' + ldT + pjRp(LDK.D.tot.v) + ldDelta(LDK.D.tot.v, LDK.P.tot.v) + ' vs ' + LDK.W.prevShort) +
      kpi('UAR · outlet dengan demand', fmtCount(A.tot.u), pctOf(A.tot.u, base) + '% dari ' + fmtCount(base) + ' outlet master di lingkup', 'up', 'Reload, Voucher Injection, CVM dan Paket Data · SP Injection sekarang di menu Penjualan ke Outlet (Sell-In)') +
      kpi('Run-rate akhir Oktober', pjRp(A.tot.v / n * M.mtd_month_days), 'rata-rata ' + pjRp(A.tot.v / n) + ' per hari', 'up', 'Nilai MTD ÷ ' + n + ' × ' + M.mtd_month_days + ldT + pjRp(LDK.D.tot.v) + ' vs rata-rata ' + pjRp(A.tot.v / n) + '/hari') +
      (function () { var GS = poGaScope(); if (!GS) return ''; var a = GS.A, g = gaGrow(a.q, a.p); return kpi('SSO · gross add MTD', fmtCount(a.u) + ' · ' + fmtCount(a.q) + ' pcs', (g == null ? '—' : (g >= 0 ? '+' : '') + g.toFixed(1) + '%') + ' GA vs LMTD Sep', g != null && g >= 0 ? 'up' : 'down', 'SSO = outlet dengan ≥ 1 gross add · 1–' + GS.G.cut + ' Okt · detail di menu Gross Add'); })() +
      kpi('Demand ÷ saldo Sell-In masuk', supTot ? (A.tot.v / supTot).toFixed(2) + '×' : '—', 'saldo masuk 1–' + n + ' Okt ' + pjRp(supTot), supTot && A.tot.v / supTot > 1 ? 'down' : 'up', '> 1× = jual lebih banyak daripada isi saldo') +
    '</div>';
    if (!PO_TABS.some(function (t) { return t[0] === tab; })) tab = state.poTab = 'ringkasan';
    var body = tab === 'ringkasan' ? poRingkasan(F, rows, A) : (tab === 'teritori' ? poTeritori(F) : (tab === 'heat' ? poHeat(F) : (tab === 'produk' ? poProduk(F) : (tab === 'konsentrasi' ? poKonsentrasi(F) : (tab === 'outlet' ? poOutletTab(F) : poSvd(F))))));
    return nav + tools + poSelectionBand(F) + kpis + body;
  }

  /* ================= MORNING DSE BRIEFING (Bahasa Indonesia) ================= */
  var HARI_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  function mbVisitsFeed() { return (typeof window !== 'undefined' && window.dseVisitsFeed) ? window.dseVisitsFeed : (typeof dseVisitsFeed !== 'undefined' ? dseVisitsFeed : null); }
  function mbPct(a, b) { return b ? (a / b * 100).toFixed(1) + '%' : '—'; }
  function mbSellinAll(sf) {
    // Sell-In facts for all product groups and all days under the current territory filter only
    var keep = { tab: state.sellinTab, day: state.sellinDay, brand: state.sellinBrand, flow: state.sellinFlow, q: state.sellinSearch };
    state.sellinTab = 'all'; state.sellinDay = -1; state.sellinBrand = 'all'; state.sellinFlow = 'all'; state.sellinSearch = '';
    var facts = sellinFacts(sf);
    state.sellinTab = keep.tab; state.sellinDay = keep.day; state.sellinBrand = keep.brand; state.sellinFlow = keep.flow; state.sellinSearch = keep.q;
    return facts;
  }
  function mbPager(attr, page, totalPages, label) {
    return '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;"><span class="note">' + label + '</span><div style="display:flex; gap:6px;">' +
      '<button type="button" class="btn" data-' + attr + '="prev"' + (page <= 1 ? ' disabled style="opacity:0.5;"' : '') + '>&larr; Sebelumnya</button>' +
      '<span style="padding:4px 8px; font:700 15px var(--ij-font);">Hal. ' + page + ' / ' + totalPages + '</span>' +
      '<button type="button" class="btn" data-' + attr + '="next"' + (page >= totalPages ? ' disabled style="opacity:0.5;"' : '') + '>Berikutnya &rarr;</button></div></div>';
  }

  /* ---- 1. Ringkasan PJP ---- */
  function mbPjpSection(vf) {
    var sc = visitsScope(vf);
    var cards = '<div class="kpis">' +
      kpi('% Sukses Visit', sc.hit + '%', fmtCount(sc.actual) + ' dari ' + fmtCount(sc.planned) + ' rencana kunjungan', sc.hit >= 60 ? 'up' : 'down', 'Check-in terlaksana ÷ PJP terjadwal · ' + pjpPeriod('mtd',{id:1}) + ' 2026') +
      kpi('% Outlet Belum Divisit · MTD', mbPct(sc.nvm, sc.outlets), fmtCount(sc.nvm) + ' dari ' + fmtCount(sc.outlets) + ' outlet master', 'down', 'Tanpa check-in ' + pjpPeriod('mtd',{id:1}) + '') +
      kpi('% Outlet Belum Divisit · 7 Hari', mbPct(sc.nv7, sc.outlets), fmtCount(sc.nv7) + ' outlet', 'down', 'Tanpa check-in ' + pjpPeriod('l7',{id:1}) + '') +
      kpi('% Site dengan Outlet Belum Divisit · MTD', mbPct(sc.szm, sc.sites), fmtCount(sc.szm) + ' dari ' + fmtCount(sc.sites) + ' site DSO', 'down', '0 outlet divisit di bawah site tersebut') +
    '</div>';
    var dseSel = visitsDseRow(vf), level = dseSel ? 'dse' : ((state.branch || state.hoa) ? 'mc' : 'area');
    var rows = visitsRowsAt(vf, level);
    var byKey = {};
    if (level === 'dse') (vf.dses || []).forEach(function (d) { byKey[d.person_id] = { total_outlets: d.assigned_outlets, not_visited_mtd: d.assigned_not_visited_mtd, not_visited_7d: d.assigned_not_visited_7d, sites_zero_mtd: 0, total_sites: 0 }; });
    else (level === 'area' ? (vf.branches || []) : (vf.micro_clusters || [])).forEach(function (r) { byKey[level === 'area' ? r.branch : r.micro_cluster] = r; });
    var trs = rows.map(function (r) {
      var b = byKey[r.key] || {};
      return '<tr><td class="cur"><b>' + esc(r.label) + '</b></td><td>' + esc(r.parent) + '</td><td class="num">' + fmtCount(r.planned) + '</td><td class="num cur"><b>' + fmtCount(r.actual) + '</b></td><td>' + hitBar(hitPct(r)) + '</td>' +
        '<td class="num">' + fmtCount(b.total_outlets || 0) + '</td><td class="num">' + mbPct(b.not_visited_mtd || 0, b.total_outlets || 0) + '</td><td class="num">' + mbPct(b.not_visited_7d || 0, b.total_outlets || 0) + '</td><td class="num">' + mbPct(b.sites_zero_mtd || 0, b.total_sites || 0) + '</td>' +
        '<td>' + detailBtn(r, 'Detail') + '</td></tr>';
    }).join('');
    if (rows.length > 1) {
      var RT = { pl: 0, ac: 0, out: 0, nv: 0, nv7: 0, sz: 0, st: 0 };
      rows.forEach(function (r) { var b = byKey[r.key] || {}; RT.pl += r.planned; RT.ac += r.actual; RT.out += b.total_outlets || 0; RT.nv += b.not_visited_mtd || 0; RT.nv7 += b.not_visited_7d || 0; RT.sz += b.sites_zero_mtd || 0; RT.st += b.total_sites || 0; });
      trs += '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td class="cur" style="background:var(--ink); color:#fff;">TOTAL · ' + rows.length + (level === 'area' ? ' area' : ' MC') + '</td><td></td><td class="num">' + fmtCount(RT.pl) + '</td><td class="num">' + fmtCount(RT.ac) + '</td><td>' + hitPct({ planned: RT.pl, actual: RT.ac }) + '%</td><td class="num">' + fmtCount(RT.out) + '</td><td class="num">' + mbPct(RT.nv, RT.out) + '</td><td class="num">' + mbPct(RT.nv7, RT.out) + '</td><td class="num">' + mbPct(RT.sz, RT.st) + '</td><td></td></tr>';
    }
    return card('Ringkasan PJP · ' + esc(scopeText()) + (dseSel ? ' · DSE ' + esc(dseSel.dse_name) : ''), cards +
      '<div class="tbl-wrap" style="margin-top:10px;"><table class="tbl wide"><thead><tr>' + th(level === 'area' ? 'Area' : (level === 'dse' ? 'DSE' : 'Micro Cluster')) + th(level === 'area' ? 'Head of Area' : (level === 'dse' ? 'MC · Area' : 'Area · DSO')) + th('Rencana', 1) + th('Terlaksana', 1) + th('% Sukses') + th('Outlet master', 1) + th('% Belum divisit MTD', 1) + th('% Belum divisit 7 hr', 1) + th('% Site tanpa visit MTD', 1) + th('Detail') + '</tr></thead><tbody>' + trs + '</tbody></table></div>' +
      '<p class="note">Sumber: MOBI Journey Plan Summary Detail ' + pjpPeriod('mtd',{id:1}) + ' 2026. "Detail" memperkecil cakupan ke tingkat di bawahnya dan membuka menu PJP Visit.</p>');
  }

  /* ---- 4. Heat map teritori ---- */
  var MB_METRICS = [['nosellin', 'Outlet tanpa sell-in (MTD)'], ['novisit', 'Outlet belum divisit (MTD)'], ['lowvisit', 'Visit < 25% (hit rate PJP)']];
  var MB_POLYS = [['auto', '⚙️ Otomatis'], ['mc', 'Micro Cluster'], ['kec', 'Kecamatan'], ['dse', 'DSE']];
  function mbPolyKind() { if (state.dse) return 'dse'; var k = state.mbPoly || 'auto'; if (k !== 'auto') return k; return state.kec ? 'dse' : 'mc'; }
  function mbHull(pts) {
    pts = pts.filter(function (q) { return isFinite(q[0]) && isFinite(q[1]); }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    if (pts.length < 3) return pts;
    function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lower = [], upper = [], i;
    for (i = 0; i < pts.length; i++) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop(); lower.push(pts[i]); }
    for (i = pts.length - 1; i >= 0; i--) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop(); upper.push(pts[i]); }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }
  function mbDseIndex(vf) {
    // master DSE name (upper) -> {name, codes, branch, mc, dso, hit, person_id}; code -> name
    var terr = ((typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED.outlets : []) || [];
    var byName = {}, codeToName = {};
    terr.forEach(function (o) {
      if (!o.dse_name) return;
      var k = String(o.dse_name).toUpperCase();
      var e = byName[k] || (byName[k] = { name: o.dse_name, branch: o.branch, mc: o.micro_cluster, dso: o.dso_leader || '', hoa: o.hoa_leader || '', hit: null, person_id: null, pts: [] });
      [o.dse_code_im3, o.dse_code_3id].forEach(function (c) { if (c) codeToName[String(c).toUpperCase()] = k; });
    });
    (vf.dses || []).forEach(function (d) { var k = String(d.dse_name || '').toUpperCase(); if (byName[k]) { byName[k].hit = d.target_hit_rate; byName[k].person_id = d.person_id; } });
    return { byName: byName, codeToName: codeToName };
  }
  function mbDsePolys(vf) {
    // one polygon per DSE: convex hull of its master outlets in scope
    var terr = ((typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED.outlets : []) || [];
    var idx = mbDseIndex(vf), groups = {};
    terr.forEach(function (o) {
      if (!o.dse_name || !sellinInScope(o)) return;
      if (state.dse && String(o.dse_name).trim().toUpperCase() !== state.dse) return;   // header DSE: only that DSE's polygon
      var la = Number(o.lat), lo = Number(o.long);
      if (!(la >= -7.5 && la <= -5.5 && lo >= 106 && lo <= 108)) return;   // drop unnormalised / out-of-area coordinates
      var k = String(o.dse_name).toUpperCase();
      (groups[k] || (groups[k] = [])).push([la, lo]);
    });
    return Object.keys(groups).filter(function (k) { return groups[k].length; }).map(function (k) {
      var e = idx.byName[k] || { name: k, branch: '', mc: '', dso: '' };
      var hull = mbHull(groups[k]);
      var c = groups[k].reduce(function (a, q) { return [a[0] + q[0], a[1] + q[1]]; }, [0, 0]);
      return { dse: k, dse_name: e.name, branch: e.branch, micro_cluster: e.mc, dso_leader: e.dso, person_id: e.person_id, hull: hull, centroid: [c[0] / groups[k].length, c[1] / groups[k].length], n: groups[k].length };
    });
  }
  function mbPolyStats(vf, sf) {
    var terr = ((typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED.outlets : []) || [];
    var tot = { mc: {}, kec: {}, dse: {} }, nosell = { mc: {}, kec: {}, dse: {} }, novisit = { mc: {}, kec: {}, dse: {} }, sold = {};
    var idx = mbDseIndex(vf);
    if (sf) mbSellinAll(sf).forEach(function (f) { sold[f[7]] = 1; });
    terr.forEach(function (o) {
      if (!sellinInScope(o)) return;
      var mc = o.micro_cluster || '—', kc = o.kecamatan || '—', ds = String(o.dse_name || '—').toUpperCase();
      tot.mc[mc] = (tot.mc[mc] || 0) + 1; tot.kec[kc] = (tot.kec[kc] || 0) + 1; tot.dse[ds] = (tot.dse[ds] || 0) + 1;
      if (!sold[o.outlet_key]) { nosell.mc[mc] = (nosell.mc[mc] || 0) + 1; nosell.kec[kc] = (nosell.kec[kc] || 0) + 1; nosell.dse[ds] = (nosell.dse[ds] || 0) + 1; }
    });
    (vf.unvisited_outlets || []).forEach(function (u) {
      if (u.w !== 'mtd') return;
      if (state.branch && u.br !== state.branch) return;
      if (state.hoa && u.hoa !== state.hoa) return;
      if (state.kec && u.mc !== state.kec) return;
      var ds = String(u.dse || '—').toUpperCase(); ds = idx.codeToName[ds] || ds;
      novisit.mc[u.mc] = (novisit.mc[u.mc] || 0) + 1; novisit.kec[u.kec] = (novisit.kec[u.kec] || 0) + 1; novisit.dse[ds] = (novisit.dse[ds] || 0) + 1;
    });
    var hit = {}; (vf.micro_clusters || []).forEach(function (mm) { hit[mm.micro_cluster] = mm.target_hit_rate; });
    Object.keys(idx.byName).forEach(function (k) { if (idx.byName[k].hit != null) hit[k] = idx.byName[k].hit; });
    return { tot: tot, nosell: nosell, novisit: novisit, hit: hit, dseIdx: idx };
  }
  function mbPolyValue(P, kind, key, metric) {
    var t = P.tot[kind][key] || 0;
    if (metric === 'lowvisit') return (kind === 'mc' || kind === 'dse') ? (P.hit[key] == null ? null : P.hit[key]) : null;
    var n = metric === 'nosellin' ? (P.nosell[kind][key] || 0) : (P.novisit[kind][key] || 0);
    return t ? n / t * 100 : null;
  }
  function mbColor(v, metric) {
    if (v == null) return '#d1d5db';
    if (metric === 'lowvisit') { if (v < 25) return '#b91c1c'; if (v < 40) return '#f97316'; if (v < 60) return '#facc15'; if (v < 75) return '#84cc16'; return '#16a34a'; }
    var c = '#16a34a';
    [[20, '#84cc16'], [40, '#facc15'], [60, '#f97316'], [80, '#dc2626']].forEach(function (st) { if (v >= st[0]) c = st[1]; });
    return c;
  }
  function mbHeatToolbar() {
    var metric = state.mbMetric || 'nosellin';
    var polyItems = MB_POLYS.map(function (x) { return x[0] === 'auto' ? ['auto', x[1] + ' · ' + ({ mc: 'MC', kec: 'Kecamatan', dse: 'DSE' }[state.kec ? 'dse' : 'mc'])] : x; });
    return '<div class="map-toolbar" style="margin-bottom:8px;">' + sellinBtnGroup('Metrik heat map', 'mb-metric', MB_METRICS, metric) + sellinBtnGroup('Poligon', 'mb-poly', polyItems, state.mbPoly || 'auto') + '</div>';
  }
  function mbMapSection(vf, sf, noMap) {
    var metric = state.mbMetric || 'nosellin', kind = mbPolyKind();
    var P = mbPolyStats(vf, sf);
    var mf = (typeof window !== 'undefined' && window.JAKARTA_MAP_FEED) ? window.JAKARTA_MAP_FEED : null;
    var polys = kind === 'dse' ? mbDsePolys(vf) : (mf ? (kind === 'mc' ? mf.micro_clusters : mf.kecamatans) : []);
    var rows = polys.map(function (pp) {
      var key = kind === 'mc' ? pp.micro_cluster : (kind === 'kec' ? pp.kecamatan : pp.dse), t = P.tot[kind][key] || 0;
      if (!t) return null;
      var label = kind === 'dse' ? pp.dse_name : key;
      var parent = kind === 'mc' ? pp.branch + ' · DSO ' + (pp.dso_leader || '—') : (kind === 'kec' ? (pp.micro_cluster || '—') + ' · ' + pp.branch : (pp.micro_cluster || '—') + ' · ' + (pp.branch || '—'));
      var detail = kind === 'mc' ? detailBtn({ drill: { lv: 'mc', br: pp.branch, mc: key } }, 'PJP')
        : kind === 'kec' ? detailBtn({ drill: { lv: 'mc', br: pp.branch, mc: pp.micro_cluster } }, 'PJP MC')
        : (pp.person_id ? detailBtn({ drill: { lv: 'dse', dse: pp.person_id, br: pp.branch, mc: pp.micro_cluster } }, 'PJP') : '');
      return { key: key, label: label, parent: parent, tot: t, nosell: P.nosell[kind][key] || 0, novisit: P.novisit[kind][key] || 0, hit: (kind === 'mc' || kind === 'dse') ? P.hit[key] : null, v: mbPolyValue(P, kind, key, metric), detail: detail };
    }).filter(Boolean);
    rows.sort(function (a, b) { var av = a.v == null ? -1 : a.v, bv = b.v == null ? -1 : b.v; return metric === 'lowvisit' ? (av - bv) : (bv - av); });
    var toolbar = noMap ? '' : mbHeatToolbar();
    var legend = metric === 'lowvisit'
      ? 'Merah tua = hit rate &lt; 25% (flag) · oranye &lt; 40% · kuning &lt; 60% · hijau tinggi · abu-abu = kecamatan tidak punya hit rate PJP (gunakan poligon Micro Cluster).'
      : 'Hijau &lt; 20% · hijau muda 20–40% · kuning 40–60% · oranye 60–80% · merah ≥ 80% outlet bermasalah di poligon itu.';
    var trs = rows.slice(0, 40).map(function (r, i) {
      return '<tr><td class="num">' + (i + 1) + '</td><td class="cur"><b>' + esc(r.label) + '</b></td><td>' + esc(r.parent) + '</td><td class="num">' + fmtCount(r.tot) + '</td><td class="num">' + uarCell(r.nosell, r.tot) + '</td><td class="num">' + uarCell(r.novisit, r.tot) + '</td><td class="num">' + (r.hit == null ? '—' : r.hit + '%') + '</td>' +
        '<td><span style="display:inline-block; width:14px; height:14px; background:' + mbColor(r.v, metric) + '; vertical-align:middle; border:1px solid var(--ij-ink);"></span> ' + (r.v == null ? '—' : r.v.toFixed(1) + '%') + '</td><td>' + r.detail + '</td></tr>';
    }).join('');
    if (rows.length > 1) {
      var hS = rows.reduce(function (a, r) { a.tot += r.tot; a.ns += r.nosell; a.nv += r.novisit; return a; }, { tot: 0, ns: 0, nv: 0 }), hScope = visitsScope(vf);
      var hv = metric === 'nosellin' ? (hS.tot ? hS.ns / hS.tot * 100 : null) : (metric === 'novisit' ? (hS.tot ? hS.nv / hS.tot * 100 : null) : (hScope && hScope.hit != null ? +hScope.hit : null));
      trs += '<tr class="tot-row" style="' + TOT_ST + '"><td></td><td><b>TOTAL · ' + fmtCount(rows.length) + ' ' + (kind === 'mc' ? 'MC' : (kind === 'kec' ? 'kecamatan' : 'DSE')) + '</b></td><td></td>' + totNum(fmtCount(hS.tot)) + totNum(uarCell(hS.ns, hS.tot)) + totNum(uarCell(hS.nv, hS.tot)) + totNum(hScope && hScope.hit != null ? hScope.hit + '%' : '—') + '<td>' + (hv == null ? '—' : hv.toFixed(1) + '%') + '</td><td></td></tr>';
    }
    var mapEl = noMap ? '' : mf ? '<div id="mb-map" style="height:520px; border:2px solid var(--ij-ink);"></div>' : '<p class="note">Feed peta belum dimuat.</p>';
    return card((noMap ? 'Peringkat heat map · ' : 'Heat Map Teritori · ') + MB_METRICS.filter(function (mm) { return mm[0] === metric; })[0][1] + ' · ' + esc(scopeText()),
      toolbar + mapEl + (noMap ? '' : '<p class="note" style="margin-top:6px;">' + legend + ' Klik poligon untuk rincian dan tombol "PJP →" di dalamnya untuk turun ke heatmap PJP tingkat berikutnya. Otomatis: MC saat belum ada MC terpilih, DSE (hull outlet tiap DSE) saat satu MC dipilih di filter.</p>') +
      '<div class="tbl-wrap" style="margin-top:10px;"><table class="tbl wide"><thead><tr>' + th('#', 1) + th(kind === 'mc' ? 'Micro Cluster' : (kind === 'kec' ? 'Kecamatan' : 'DSE')) + th(kind === 'mc' ? 'Area · DSO' : 'MC · Area') + th('Outlet master', 1) + th('Tanpa sell-in', 1) + th('Belum divisit MTD', 1) + th('Hit rate PJP', 1) + th('Nilai metrik') + th('Detail') + '</tr></thead><tbody>' + trs + '</tbody></table></div>' +
      (rows.length > 40 ? '<p class="note">40 teratas dari ' + rows.length + ' poligon; baris TOTAL menjumlahkan seluruh ' + rows.length + ' poligon.</p>' : ''));
  }
  // heat map polygons (Micro Cluster, Kecamatan or DSE hull) coloured by the chosen metric; shared by the old map and the Opportunity map
  function mbAddPolys(map, vf, sf, bounds, opacity) {
    var metric = state.mbMetric || 'nosellin', kind = mbPolyKind(), P = mbPolyStats(vf, sf);
    var mf = window.JAKARTA_MAP_FEED, polys = kind === 'dse' ? mbDsePolys(vf) : (kind === 'mc' ? mf.micro_clusters : mf.kecamatans);
    polys.forEach(function (pp) {
      var key = kind === 'mc' ? pp.micro_cluster : (kind === 'kec' ? pp.kecamatan : pp.dse), t = P.tot[kind][key] || 0;
      if (!t) return;
      var v = mbPolyValue(P, kind, key, metric), label = kind === 'dse' ? pp.dse_name : key;
      var detail = kind === 'mc' ? detailBtn({ drill: { lv: 'mc', br: pp.branch, mc: key } }, 'PJP')
        : kind === 'kec' ? detailBtn({ drill: { lv: 'mc', br: pp.branch, mc: pp.micro_cluster } }, 'PJP MC')
        : (pp.person_id ? detailBtn({ drill: { lv: 'dse', dse: pp.person_id, br: pp.branch, mc: pp.micro_cluster } }, 'PJP') : '');
      var popup = '<b>' + esc(label) + '</b><br>' + esc(kind === 'mc' ? pp.branch + ' · DSO ' + (pp.dso_leader || '—') : (pp.micro_cluster || '—') + ' · ' + (pp.branch || '—')) +
        '<br>Outlet master: ' + fmtCount(t) + '<br>Tanpa sell-in: ' + fmtCount(P.nosell[kind][key] || 0) + ' (' + mbPct(P.nosell[kind][key] || 0, t) + ')' +
        '<br>Belum divisit MTD: ' + fmtCount(P.novisit[kind][key] || 0) + ' (' + mbPct(P.novisit[kind][key] || 0, t) + ')' +
        ((kind === 'mc' || kind === 'dse') && P.hit[key] != null ? '<br>Hit rate PJP: ' + P.hit[key] + '%' : '') + (detail ? '<br><div style="margin-top:6px;">' + detail + '</div>' : '');
      var layer;
      if (pp.hull && pp.hull.length >= 3) {
        layer = L.polygon(pp.hull, { color: '#201E1D', weight: 1, fillColor: mbColor(v, metric), fillOpacity: opacity }).addTo(map);
        pp.hull.forEach(function (pt) { bounds.push(pt); });
      } else if (pp.centroid) {
        layer = L.circleMarker(pp.centroid, { radius: 9, color: '#201E1D', weight: 1, fillColor: mbColor(v, metric), fillOpacity: 0.85 }).addTo(map);
        bounds.push(pp.centroid);
      } else return;
      layer.bindPopup(popup);
      layer.bindTooltip(label + (v == null ? '' : ' · ' + v.toFixed(0) + '%'), { sticky: true });
    });
  }
  function initBriefMap() {
    if (typeof L === 'undefined' || typeof document === 'undefined') return;
    var el = document.getElementById('mb-map'); if (!el) return;
    var mf = window.JAKARTA_MAP_FEED, vf = mbVisitsFeed(), sf = sellinFeed();
    if (!mf || !vf) return;
    if (window._mbMapInstance) { try { window._mbMapInstance.remove(); } catch (e) {} window._mbMapInstance = null; }
    var map = L.map('mb-map', { center: [-6.225, 106.845], zoom: 10, minZoom: 8, maxZoom: 18, preferCanvas: true });
    window._mbMapInstance = map;
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri', maxZoom: 19 }).addTo(map);
    var bounds = [];
    mbAddPolys(map, vf, sf, bounds, 0.65);
    if (bounds.length) map.fitBounds(bounds, { padding: [10, 10] });
  }



  /* ================= UAR (Unique Active Retailer) · growth per territori ================= */
  var UAR_TABS = [['sp', '📱 UAR Sell-In SP'], ['vc', '🎫 UAR Voucher Sell-In (Zero & Value)'], ['sal', '💳 UAR Saldo'], ['spi', '📶 SSO Gross Add (RGUGA)']];
  var UAR_THR = { sp: [1, 3, 5], vc: [5, 10, 20], sal: [50000, 300000], spi: [1, 3, 5] };
  function uarThrLabel(tab, v) { return tab === 'sal' ? '≥ Rp ' + fmtCount(v / 1000) + 'K' : '≥ ' + v + (tab === 'spi' ? ' GA' : ' pcs'); }
  // tab 'spi' (SSO Gross Add): GA per outlet from the RGUGA feed, keyed by master outlet key (see gaPrep)
  function uarSpiMap() { var G = gaPrep(); return G ? G.by : null; }
  // source of outlet (FINAL OUTLET of the RGUGA workbook): PJP | NON | KAM, '' = not classified
  function uarSrcOf(o) { var G = gaPrep(), x = G && G.by[o.k]; return x ? (x.sg || '') : ''; }
  var UAR_SRC = [['PJP', 'PJP'], ['NON', 'Non-PJP'], ['KAM', 'KAM'], ['', 'Belum terklasifikasi']];
  function uarOutlets(P, noSrc) {
    var mi = P.metadata.mc_info || {}, src = noSrc ? 'all' : (state.uarSrc || 'all');
    return P.outlets.filter(function (o) {
      if (o.tier === 'A') return false;
      if (src !== 'all' && uarSrcOf(o) !== (src === 'NONE' ? '' : src)) return false;
      var i = mi[o.mc] || {};
      return (!state.branch || i.br === state.branch) && (!state.hoa || i.hoa === state.hoa) && (!state.kec || o.mc === state.kec) && (!state.dse || dseNorm(o.dse) === state.dse);
    });
  }
  // [cur qty, prev qty, cur value, prev value] of one outlet for the active tab
  function uarMetric(o, tab, spi) {
    var c = o.c || {}, cats = tab === 'sp' ? ['SP'] : (tab === 'sal' ? ['SALMO'] : (state.uarVc === 'value' ? ['VCF'] : (state.uarVc === 'zero' ? ['VCB'] : ['VCF', 'VCB']))), r = [0, 0, 0, 0];
    if (tab === 'spi') {
      var x = spi && spi[o.k]; if (!x) return r;
      var gs = gaStat(x, gaBrand()); r[0] = gs.cur; r[1] = gs.prev;   // GA MTD (1..cut Okt) vs LMTD (1..cut Sep)
      return r;
    }
    cats.forEach(function (k) { var a = c[k]; if (!a) return; r[0] += tab === 'sal' ? a[1] : a[0]; r[1] += tab === 'sal' ? a[3] : a[2]; r[2] += a[1]; r[3] += a[3]; });
    return r;
  }
  function uarAgg(list, tab, thr, spi) {
    var A = { n: list.length, u: 0, up: 0, q: 0, qp: 0, v: 0, vp: 0 };
    list.forEach(function (o) {
      var m = uarMetric(o, tab, spi);
      if (m[0] >= thr) A.u++; if (m[1] >= thr) A.up++;
      A.q += m[0]; A.qp += m[1]; A.v += m[2]; A.vp += m[3];
    });
    return A;
  }
  function uarGrow(a, b) { return b > 0 ? (a / b - 1) * 100 : null; }
  function uarGTag(g) { return g == null ? dkTag('none', 'baru') : dkTag(g >= 0 ? 'ok' : 'bad', (g >= 0 ? '+' : '') + g.toFixed(1) + '%'); }
  function uarVol(tab, v) { return tab === 'sal' ? pjRp(v) : fmtCount(v); }
  function uarRow(label, ket, a, tab, style) {
    var gU = uarGrow(a.u, a.up), gQ = uarGrow(a.q, a.qp), gV = uarGrow(a.v, a.vp), bg = style && /ink/.test(style) ? 'var(--ij-ink)' : (style && /wash/.test(style) ? 'var(--ij-wash)' : '#fff');
    return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur" style="' + DK_STICKY + ' background:' + bg + ';">' + label + '</td><td>' + ket + '</td><td class="num">' + fmtCount(a.n) + '</td>' +
      '<td class="num cur"><b>' + fmtCount(a.u) + '</b></td><td class="num">' + pctOf(a.u, a.n) + '%</td><td class="num">' + fmtCount(a.up) + '</td><td class="num">' + (a.u - a.up >= 0 ? '+' : '') + fmtCount(a.u - a.up) + '</td><td class="num">' + uarGTag(gU) + '</td>' +
      '<td class="num">' + uarVol(tab, a.q) + '</td><td class="num">' + uarVol(tab, a.qp) + '</td><td class="num">' + uarGTag(gQ) + '</td>' +
      (tab === 'sal' ? '' : '<td class="num">' + pjRp(a.v) + '</td><td class="num">' + pjRp(a.vp) + '</td><td class="num">' + uarGTag(gV) + '</td>') + '</tr>';
  }
  function uarGrowth() {
    var P = pjFeed(); if (!P) return card('UAR', '<p class="note">Feed penjualan belum dibangun.</p>');
    var tab = state.uarTab || 'sp', thrs = state.uarThr || {}, thr = thrs[tab] || UAR_THR[tab][0], spi = tab === 'spi' ? uarSpiMap() : null;
    var list = uarOutlets(P), M = P.metadata, mi = M.mc_info || {}, term = tab === 'spi' ? 'SSO' : 'UAR', gcut = tab === 'spi' && gaPrep() ? gaPrep().cut : M.cut_day;
    var cur = 'MTD 1–' + gcut + ' Okt', prev = 'LMTD 1–' + gcut + ' Sep';
    var T = uarAgg(list, tab, thr, spi), gU = uarGrow(T.u, T.up), gQ = uarGrow(T.q, T.qp), unit = tab === 'sal' ? 'Rp' : 'pcs';
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi(term + ' ' + cur, fmtCount(T.u), pctOf(T.u, T.n) + '% dari ' + fmtCount(T.n) + ' outlet master', gU != null && gU >= 0 ? 'up' : 'down', 'outlet dengan ' + uarThrLabel(tab, thr) + ' pada periode') +
      kpi(term + ' ' + prev, fmtCount(T.up), pctOf(T.up, T.n) + '% dari outlet master', 'up', 'periode pembanding') +
      kpi('Growth ' + term, gU == null ? '—' : (gU >= 0 ? '+' : '') + gU.toFixed(1) + '%', (T.u - T.up >= 0 ? '+' : '') + fmtCount(T.u - T.up) + ' outlet', gU != null && gU >= 0 ? 'up' : 'down', cur + ' vs ' + prev) +
      kpi((tab === 'sal' ? 'Saldo' : 'Volume') + ' ' + cur, tab === 'sal' ? pjRp(T.q) : fmtCount(T.q) + ' pcs', (gQ == null ? '—' : (gQ >= 0 ? '+' : '') + gQ.toFixed(1) + '%') + ' vs ' + prev, gQ != null && gQ >= 0 ? 'up' : 'down', 'jumlah semua outlet master') +
      kpi('Rata-rata per ' + term, T.u ? (tab === 'sal' ? pjRp(T.q / T.u) : (T.q / T.u).toFixed(1) + ' pcs') : '—', T.up ? (tab === 'sal' ? pjRp(T.qp / T.up) : (T.qp / T.up).toFixed(1) + ' pcs') + ' di ' + prev : '—', 'up', 'volume ÷ ' + term) + '</div>';
    // by source of outlet (PJP / Non-PJP / KAM), computed on the territory scope without the source filter
    var listAll = uarOutlets(P, true), srcRows = UAR_SRC.map(function (x) { var l = listAll.filter(function (o) { return uarSrcOf(o) === x[0]; }); return l.length ? [x[1], x[0], uarAgg(l, tab, thr, spi)] : null; }).filter(Boolean), srcTot = uarAgg(listAll, tab, thr, spi);
    function srcTr(label, a, bold, k) {
      var gU2 = uarGrow(a.u, a.up), gQ2 = uarGrow(a.q, a.qp), on = (state.uarSrc || 'all') === (k === '' ? 'NONE' : k);
      return '<tr' + (bold ? ' style="background:var(--ij-wash); font-weight:800;"' : '') + '><td class="cur">' + (bold ? '' : '<button type="button" class="btn" data-uar-src="' + (k === '' ? 'NONE' : k) + '" style="padding:2px 8px; font-size:12px; margin-right:6px;" title="Filter semua tab UAR ke sumber ini">' + (on ? '✓' : '▸') + '</button>') + '<b>' + label + '</b></td><td class="num">' + fmtCount(a.n) + '</td><td class="num">' + pctOf(a.n, srcTot.n) + '%</td>' +
        '<td class="num cur"><b>' + fmtCount(a.u) + '</b></td><td class="num">' + pctOf(a.u, a.n) + '%</td><td class="num">' + fmtCount(a.up) + '</td><td class="num">' + (a.u - a.up >= 0 ? '+' : '') + fmtCount(a.u - a.up) + '</td><td class="num">' + uarGTag(gU2) + '</td>' +
        '<td class="num">' + uarVol(tab, a.q) + '</td><td class="num">' + uarVol(tab, a.qp) + '</td><td class="num">' + uarGTag(gQ2) + '</td></tr>';
    }
    var srcCard = card(term + ' per sumber outlet · ' + esc(scopeText()), '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Sumber outlet') + th('Outlet master', 1) + th('% outlet', 1) + th(term + ' ' + cur, 1) + th('% ' + term, 1) + th(term + ' ' + prev, 1) + th('Δ ' + term, 1) + th('Growth ' + term, 1) + th((tab === 'sal' ? 'Saldo ' : 'Volume ') + cur, 1) + th((tab === 'sal' ? 'Saldo ' : 'Volume ') + prev, 1) + th('Growth', 1) + '</tr></thead><tbody>' + srcRows.map(function (r) { return srcTr(r[0], r[2], false, r[1]); }).join('') + srcTr('TOTAL (semua sumber)', srcTot, true) + '</tbody></table></div>' +
      '<p class="note">Sumber outlet = FINAL OUTLET di workbook RGUGA (PJP, Non-PJP, KAM). Tombol ▸ memfilter seluruh tab UAR ke sumber itu; pilihan juga ada di bar "Sumber outlet". Outlet master tanpa baris RGUGA tercatat "Belum terklasifikasi". ' + (tab === 'spi' ? 'Baris PJP = "UAR PJP", total = "UAR ALL OUTLET" pada workbook, tetapi hanya outlet master.' : '') + '</p>');
    // territory rows
    var mode = state.kec ? 'dse' : ((state.branch || state.hoa) ? 'mc' : 'area'), col = state.uarCollapsed || {}, rows = [];
    function by(f) { var g = {}; list.forEach(function (o) { var k = f(o); (g[k] || (g[k] = [])).push(o); }); return g; }
    function agg(l) { return uarAgg(l, tab, thr, spi); }
    function dseName(o) { return uarDse(o); }
    var sortG = function (x, y) { return (uarGrow(y[1].u, y[1].up) == null ? 1e9 : uarGrow(y[1].u, y[1].up)) - (uarGrow(x[1].u, x[1].up) == null ? 1e9 : uarGrow(x[1].u, x[1].up)); };
    var gMc = {};
    if (mode === 'area') {
      var byA = by(function (o) { return (mi[o.mc] || {}).br || '—'; });
      rows.push(uarRow('<b>REGION INNER JAKARTA</b>', Object.keys(byA).length + ' area', T, tab, 'background:var(--ink); color:#fff; font-weight:800;'));
      Object.keys(byA).map(function (a) { return [a, agg(byA[a])]; }).sort(sortG).forEach(function (pr) {
        var closed = !!col[pr[0]], byM = by.call(null, function () { return ''; }) && null, mm = {};
        byA[pr[0]].forEach(function (o) { (mm[o.mc] || (mm[o.mc] = [])).push(o); });
        rows.push(uarRow('<button type="button" class="btn" data-uar-toggle="' + esc(pr[0]) + '" style="padding:2px 8px; font-size:13px; margin-right:6px;">' + (closed ? '＋' : '－') + '</button><b>' + esc(pr[0]) + '</b>', 'Area · ' + Object.keys(mm).length + ' MC', pr[1], tab, 'background:var(--ij-wash); font-weight:800;'));
        Object.keys(mm).forEach(function (m) { gMc[m] = agg(mm[m]); });
        if (!closed) Object.keys(mm).map(function (m) { return [m, gMc[m]]; }).sort(sortG).forEach(function (q) { rows.push(uarRow('<span style="padding-left:18px;">' + esc(q[0]) + '</span>', 'DSO ' + esc((mi[q[0]] || {}).dso || '—'), q[1], tab, '')); });
      });
    } else if (mode === 'mc') {
      var mm2 = by(function (o) { return o.mc; });
      rows.push(uarRow('<b>' + esc(state.branch || state.hoa) + '</b>', 'total area', T, tab, 'background:var(--ink); color:#fff; font-weight:800;'));
      Object.keys(mm2).map(function (m) { gMc[m] = agg(mm2[m]); return [m, gMc[m]]; }).sort(sortG).forEach(function (q) { rows.push(uarRow('<b>' + esc(q[0]) + '</b>', 'DSO ' + esc((mi[q[0]] || {}).dso || '—'), q[1], tab, '')); });
    } else {
      var dd = by(dseName);
      rows.push(uarRow('<b>' + esc(state.kec) + '</b>', 'DSO ' + esc((mi[state.kec] || {}).dso || '—'), T, tab, 'background:var(--ink); color:#fff; font-weight:800;'));
      Object.keys(dd).map(function (k) { return [k, agg(dd[k])]; }).sort(sortG).forEach(function (q) { rows.push(uarRow('<b>' + esc(q[0]) + '</b>', 'DSE', q[1], tab, '')); });
    }
    var head = '<tr>' + th(mode === 'dse' ? 'DSE' : 'Region / Area / MC') + th('DSO / ket.') + th('Outlet master', 1) + th(term + ' ' + cur, 1) + th('% outlet', 1) + th(term + ' ' + prev, 1) + th('Δ ' + term, 1) + th('Growth ' + term, 1) + th((tab === 'sal' ? 'Saldo ' : 'Volume ') + cur, 1) + th((tab === 'sal' ? 'Saldo ' : 'Volume ') + prev, 1) + th('Growth', 1) + (tab === 'sal' ? '' : th('Nilai ' + cur, 1) + th('Nilai ' + prev, 1) + th('Growth nilai', 1)) + '</tr>';
    var tools = mode === 'area' ? '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group"><span class="map-label">Grup Area:</span><button type="button" class="map-btn" data-uar-expand="all">＋ Expand semua</button><button type="button" class="map-btn" data-uar-expand="none">－ Collapse semua</button></div><div class="map-toolbar-group"><span class="note">Urut: growth UAR tertinggi di atas.</span></div></div>' : '';
    // best and worst MC by UAR growth
    var mcl = Object.keys(gMc).map(function (m) { return [m, gMc[m], uarGrow(gMc[m].u, gMc[m].up)]; }).filter(function (x) { return x[2] != null && x[1].up >= 20; }).sort(function (a, b) { return b[2] - a[2]; });
    var mover = mcl.length >= 6 ? '<p class="note" style="margin-top:8px;"><b>MC dengan growth ' + term + ' tertinggi:</b> ' + mcl.slice(0, 3).map(function (x) { return esc(x[0]) + ' (' + (x[2] >= 0 ? '+' : '') + x[2].toFixed(0) + '%)'; }).join(', ') + '. <b>Terendah:</b> ' + mcl.slice(-3).reverse().map(function (x) { return esc(x[0]) + ' (' + (x[2] >= 0 ? '+' : '') + x[2].toFixed(0) + '%)'; }).join(', ') + '. (MC dengan ' + term + ' periode pembanding minimal 20 outlet.)</p>' : '';
    var note = tab === 'spi' ? 'SSO = outlet master dengan ≥ ' + thr + ' gross add pada periode (SIM Selling Outlet). Data GA per outlet dari Daily_RGUGA_OUTLET (Okt 1–' + gcut + ' vs Sep 1–' + gcut + '), brand ' + (gaBrand() === 'all' ? 'IOH (IM3 + 3ID)' : gaBrand()) + '. GA di outlet yang tidak ada di master teritori tidak ikut tabel ini; lihat menu Gross Add untuk total lengkap dan kontrol GA BIOMETRIC.' :
      (tab === 'vc' ? 'Voucher VALUE = voucher isi (bernilai); voucher ZERO = voucher blank / V0 (nilai nol sebelum diaktifkan). Pilih salah satu atau gabungan. ' : '') + 'UAR = outlet master dengan ' + (tab === 'sal' ? 'nilai saldo' : 'unit') + ' ' + uarThrLabel(tab, thr) + ' pada periode; LMTD = tanggal yang sama bulan September. Outlet ad-hoc tidak ikut. Sumber: DAILY_DATA_MOBII (cut ' + esc(M.cut) + ').';
    return cards + srcCard + card('Ringkasan growth ' + term + ' per teritori · ' + esc(scopeText()), tools + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head + '</thead><tbody>' + rows.join('') + '</tbody></table></div>' + mover + '<p class="note">' + note + '</p>');
  }
  function uarNav(tab, thr) {
    var nav = '<div class="sub-nav" role="tablist">' + UAR_TABS.map(function (x) { var a = tab === x[0]; return '<button type="button" role="tab" class="sub-nav-btn' + (a ? ' active' : '') + '" data-uar-tab="' + x[0] + '" aria-selected="' + a + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var bar = '<div class="map-toolbar" style="margin-top:8px;">' + sellinBtnGroup('Definisi ' + (tab === 'spi' ? 'SSO' : 'UAR'), 'uar-thr', UAR_THR[tab].map(function (v) { return [String(v), uarThrLabel(tab, v)]; }), String(thr)) +
      sellinBtnGroup('Sumber outlet', 'uar-src', [['all', 'Semua'], ['PJP', 'PJP'], ['NON', 'Non-PJP'], ['KAM', 'KAM'], ['NONE', 'Belum terklasifikasi']], state.uarSrc || 'all') + (tab === 'spi' ? sellinBtnGroup('Brand', 'ga-brand', [['all', 'IOH (IM3 + 3ID)'], ['IM3', 'IM3'], ['3ID', '3ID']], gaBrand()) : '') + (tab === 'vc' ? sellinBtnGroup('Voucher', 'uar-vc', [['all', 'Zero + Value'], ['value', 'VALUE (isi)'], ['zero', 'ZERO (blank / V0)']], state.uarVc || 'all') : '') + '</div>';
    return nav + bar;
  }


  var UAR_SLABS = {
    sp: [[0, 0, '0 pcs'], [1, 2, '1–2'], [3, 4, '3–4'], [5, 9, '5–9'], [10, 1e12, '≥ 10']],
    vc: [[0, 0, '0 pcs'], [1, 4, '1–4'], [5, 9, '5–9'], [10, 19, '10–19'], [20, 1e12, '≥ 20']],
    sal: [[0, 0, 'Rp 0'], [1, 49999, '< 50K'], [50000, 299999, '50–300K'], [300000, 999999, '300K–1 Jt'], [1e6, 1e15, '≥ 1 Jt']],
    spi: [[0, 0, '0 GA'], [1, 2, '1–2'], [3, 4, '3–4'], [5, 9, '5–9'], [10, 1e12, '≥ 10']] };
  var UAR_SLAB_KIND = ['none', 'bad', 'warn', 'ok', 'top'];
  function uarCtx() {
    var P = pjFeed(); if (!P) return null;
    var tab = state.uarTab || 'sp', thr = (state.uarThr || {})[tab] || UAR_THR[tab][0], spi = tab === 'spi' ? uarSpiMap() : null;
    var Gp = tab === 'spi' ? gaPrep() : null;
    return { P: P, tab: tab, thr: thr, spi: spi, mi: P.metadata.mc_info || {}, list: uarOutlets(P), M: P.metadata, G: Gp, term: tab === 'spi' ? 'SSO' : 'UAR',
      cur: 'bulan ini (MTD)', prev: 'bulan lalu (LMTD)' };
  }
  function uarDse(o) { var n = String(o.dse == null ? '' : o.dse).replace(/\.0$/, ''); return n === '0' || !n || n.toUpperCase().indexOf('UNASSIGNED') === 0 ? 'ADHOC (non-PJP)' : n; }
  // outlets without a DSE are ad-hoc visits outside the PJP for now (owner, 15 Oct 2026)
  function dseIsNone(n) { n = String(n == null ? '' : n).replace(/\.0$/, '').trim().toUpperCase(); return !n || n === '0' || n.indexOf('UNASSIGNED') === 0 || n === 'ADHOC (NON-PJP)' || n === 'TANPA DSE'; }
  function dseHtml(n) { return dseIsNone(n) ? '<span class="badge-adhoc" title="Outlet tanpa DSE: kunjungan dicatat sebagai ADHOC (non-PJP) untuk sementara">ADHOC · non-PJP</span>' : esc(n); }
  function promoTag(d) { return d && d.is_promotor ? '<span class="badge-promotor" title="Promotor (PRJAYAIN##): kunjungan ditampilkan tetapi tidak diukur sebagai produktivitas PJP VISIT">🎤 Promotor</span>' : ''; }
  function iohTag(logins) { var L = {}; (logins || []).forEach(function (l) { L[String(l).split(':')[0]] = 1; }); return L.IM3 && L['3ID'] ? '<span class="badge-ioh" title="IOH: login IM3 + 3ID dalam satu orang (hybrid / paired)">IOH</span> ' : ''; }
  function uarCats(tab) { return tab === 'sp' || tab === 'spi' ? ['SP'] : (tab === 'sal' ? ['SALMO'] : (state.uarVc === 'value' ? ['VCF'] : (state.uarVc === 'zero' ? ['VCB'] : ['VCF', 'VCB']))); }
  function uarSlabIdx(tab, v) { var S = UAR_SLABS[tab]; for (var i = S.length - 1; i >= 0; i--) { if (v >= S[i][0]) return i; } return 0; }
  function uarTerrRows(C, rowFn) {
    var list = C.list, mi = C.mi, col = state.uarCollapsed || {}, rows = [], mode = state.kec ? 'dse' : ((state.branch || state.hoa) ? 'mc' : 'area');
    function by(l, f) { var g = {}; l.forEach(function (o) { var k = f(o); (g[k] || (g[k] = [])).push(o); }); return g; }
    function bySize(g) { return Object.keys(g).sort(function (a, b) { return g[b].length - g[a].length; }); }
    var INK = 'background:var(--ink); color:#fff; font-weight:800;', WASH = 'background:var(--ij-wash); font-weight:800;';
    if (mode === 'area') {
      var A = by(list, function (o) { return (mi[o.mc] || {}).br || '—'; });
      rows.push(rowFn('<b>REGION INNER JAKARTA</b>', Object.keys(A).length + ' area', list, INK));
      bySize(A).forEach(function (a) {
        var closed = !!col[a], M = by(A[a], function (o) { return o.mc; });
        rows.push(rowFn('<button type="button" class="btn" data-uar-toggle="' + esc(a) + '" style="padding:2px 8px; font-size:13px; margin-right:6px;">' + (closed ? '＋' : '－') + '</button><b>' + esc(a) + '</b>', 'Area · ' + Object.keys(M).length + ' MC', A[a], WASH));
        if (!closed) bySize(M).forEach(function (m) { rows.push(rowFn('<span style="padding-left:18px;">' + esc(m) + '</span>', 'DSO ' + esc((mi[m] || {}).dso || '—'), M[m], '')); });
      });
    } else if (mode === 'mc') {
      var M2 = by(list, function (o) { return o.mc; });
      rows.push(rowFn('<b>' + esc(state.branch || state.hoa) + '</b>', 'total area', list, INK));
      bySize(M2).forEach(function (m) { rows.push(rowFn('<b>' + esc(m) + '</b>', 'DSO ' + esc((mi[m] || {}).dso || '—'), M2[m], '')); });
    } else {
      var Dd = by(list, uarDse);
      rows.push(rowFn('<b>' + esc(state.kec) + '</b>', 'DSO ' + esc((mi[state.kec] || {}).dso || '—'), list, INK));
      bySize(Dd).forEach(function (d) { rows.push(rowFn('<b>' + esc(d) + '</b>', 'DSE', Dd[d], '')); });
    }
    return { rows: rows, mode: mode };
  }
  function uarAreaTools(mode) {
    return mode === 'area' ? '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group"><span class="map-label">Grup Area:</span><button type="button" class="map-btn" data-uar-expand="all">＋ Expand semua</button><button type="button" class="map-btn" data-uar-expand="none">－ Collapse semua</button></div></div>' : '';
  }

  /* ---- Opportunity 1: slab UAR bulan ini vs bulan lalu ---- */
  function uarSlabView(C) {
    var S = UAR_SLABS[C.tab], ncol = S.length;
    function counts(l) {
      var c = new Array(ncol).fill(0), p = new Array(ncol).fill(0);
      l.forEach(function (o) { var m = uarMetric(o, C.tab, C.spi); c[uarSlabIdx(C.tab, m[0])]++; p[uarSlabIdx(C.tab, m[1])]++; });
      return { c: c, p: p, n: l.length };
    }
    function rowFn(label, ket, l, style) {
      var x = counts(l), bg = /ink/.test(style) ? 'var(--ij-ink)' : (/wash/.test(style) ? 'var(--ij-wash)' : '#fff');
      var cells = S.map(function (sl, i) {
        var d = x.c[i] - x.p[i], good = i >= 3 ? d > 0 : (i === 0 ? d < 0 : null), clr = /ink/.test(style) ? '#fff' : (d === 0 || good == null ? 'var(--ij-muted)' : (good ? '#166534' : '#991b1b'));
        return '<td class="num" style="' + (i === 0 ? DK_BL : '') + '"><b>' + fmtCount(x.c[i]) + '</b><div style="font-size:12px;">' + pctOf(x.c[i], x.n) + '%</div></td><td class="num" style="color:' + (/ink/.test(style) ? '#fff' : 'var(--ij-muted)') + ';">' + fmtCount(x.p[i]) + '<div style="font-size:12px; color:' + clr + ';">' + (d === 0 ? '·' : (d > 0 ? '▲ ' : '▼ ') + fmtCount(Math.abs(d))) + '</div></td>';
      }).join('');
      return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur" style="' + DK_STICKY + ' background:' + bg + ';">' + label + '</td><td>' + ket + '</td><td class="num">' + fmtCount(x.n) + '</td>' + cells + '</tr>';
    }
    var T = uarTerrRows(C, rowFn);
    var h1 = '<tr>' + dkStickyTh('Region / Area / MC', 2) + '<th rowspan="2" style="vertical-align:bottom;">DSO / ket.</th><th rowspan="2" class="num" style="vertical-align:bottom;">Outlet master</th>' + S.map(function (sl, i) { var c = DK_COL[UAR_SLAB_KIND[i]]; return '<th colspan="2" style="text-align:center; background:' + c[0] + '; color:' + c[1] + ';' + DK_BL + '">' + sl[2] + '</th>'; }).join('') + '</tr>';
    var h2 = '<tr>' + S.map(function (sl, i) { return '<th class="num" style="' + (DK_BL) + '">' + 'MTD' + '</th><th class="num">' + 'LMTD' + '</th>'; }).join('') + '</tr>';
    var all = counts(C.list), good = all.c[3] + all.c[4], goodP = all.p[3] + all.p[4];
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet slab atas (' + S[3][2] + ' dan ' + S[4][2] + ')', fmtCount(good), (good - goodP >= 0 ? '+' : '') + fmtCount(good - goodP) + ' vs ' + C.prev, good >= goodP ? 'up' : 'down', fmtCount(goodP) + ' di ' + C.prev) +
      kpi((C.tab === 'spi' ? 'Outlet tanpa GA (' : 'Outlet tanpa pembelian (') + S[0][2] + ')', fmtCount(all.c[0]), (all.c[0] - all.p[0] >= 0 ? '+' : '') + fmtCount(all.c[0] - all.p[0]) + ' vs ' + C.prev, all.c[0] <= all.p[0] ? 'up' : 'down', pctOf(all.c[0], all.n) + '% dari outlet master') +
      kpi('Outlet di bawah definisi ' + C.term, fmtCount(all.n - (function () { var u = 0; C.list.forEach(function (o) { if (uarMetric(o, C.tab, C.spi)[0] >= C.thr) u++; }); return u; })()), 'definisi ' + C.term + ' ' + uarThrLabel(C.tab, C.thr), 'down', 'peluang dinaikkan ke ' + C.term) + '</div>';
    return cards + card('Slab ' + C.term + ' · ' + C.cur + ' vs ' + C.prev + ' · ' + esc(scopeText()), uarAreaTools(T.mode) + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + h1 + h2 + '</thead><tbody>' + T.rows.join('') + '</tbody></table></div>' +
      '<p class="note">Tiap slab: jumlah outlet MTD (tebal, dengan % outlet) dan LMTD, yaitu tanggal yang sama di bulan lalu (abu-abu, dengan selisih)' + (C.tab === 'spi' ? '; GA per outlet dari RGUGA, MTD = 1–' + C.G.cut + ' Okt dan LMTD = 1–' + C.G.cut + ' Sep' : '') + '. Hijau = bergerak ke slab lebih baik; merah = memburuk. Slab menurut ' + (C.tab === 'sal' ? 'nilai saldo' : 'unit') + ' per outlet pada periode.</p>');
  }

  /* ---- outlet lists (aktif / inaktif) and product proposal ---- */
  var _uarTop = {};
  function uarTopByMc(C) {
    var cats = C.tab === 'spi' ? ['SP'] : uarCats(C.tab), key = cats.join('');
    if (_uarTop[key] && _uarTop[key].src === C.P) return _uarTop[key].m;
    var prods = C.P.products, m = {};
    C.P.outlets.forEach(function (o) {
      if (o.tier === 'A' || !o.p) return;
      Object.keys(o.p).forEach(function (pi) {
        var pr = prods[+pi]; if (!pr || cats.indexOf(pr.cat) < 0) return;
        var x = o.p[pi]; if (!(x[0] > 0 || x[2] > 0)) return;
        var k = o.mc + '|' + pr.b, e = m[k] || (m[k] = {}); e[pi] = (e[pi] || 0) + 1;
      });
    });
    var out = {};
    Object.keys(m).forEach(function (k) { out[k] = Object.keys(m[k]).sort(function (a, b) { return m[k][b] - m[k][a]; }).slice(0, 4).map(function (pi) { return [+pi, m[k][pi]]; }); });
    _uarTop[key] = { src: C.P, m: out }; return out;
  }
  function uarShort(n) { n = String(n || ''); return n.length > 34 ? n.slice(0, 33) + '…' : n; }
  function uarOwnTop(C, o) {
    var cats = C.tab === 'spi' ? ['SP'] : uarCats(C.tab), best = null;
    Object.keys(o.p || {}).forEach(function (pi) { var pr = C.P.products[+pi]; if (!pr || cats.indexOf(pr.cat) < 0) return; var x = o.p[pi], q = Math.max(x[2], x[0]); if (q > 0 && (!best || q > best[1])) best = [+pi, q]; });
    return best;
  }
  function uarPropose(C, o, seg, m) {
    var tab = C.tab;
    if (tab === 'sal') {
      if (seg === 'lapsed') return 'Tebus ulang saldo ±' + pjRp(m[1]) + ' (setara ' + C.prev + ')';
      if (seg === 'dekat') return 'Naikkan ke ' + uarThrLabel(tab, C.thr) + ' (kurang ' + pjRp(Math.max(0, C.thr - m[0])) + ')';
      return 'Tawarkan saldo Mobo, mulai ' + uarThrLabel(tab, C.thr);
    }
    var top = uarTopByMc(C)[o.mc + '|' + o.b] || [], own = uarOwnTop(C, o), pn = function (pi) { return uarShort((C.P.products[pi] || {}).n); };
    var alt = top.filter(function (t) { return !own || t[0] !== own[0]; }).slice(0, 2).map(function (t) { return pn(t[0]) + ' (' + t[1] + ' outlet MC)'; });
    if (seg === 'lapsed') return (own ? 'Ulang ' + pn(own[0]) + ' (' + fmtCount(own[1]) + ' pcs ' + 'LMTD' + ')' : 'Aktifkan kembali') + (alt.length ? '; alternatif ' + alt[0] : '');
    if (seg === 'dekat') return 'Tambah ' + fmtCount(Math.max(1, C.thr - m[0])) + ' pcs untuk masuk UAR' + (own ? ': ' + pn(own[0]) : (alt[0] ? ': ' + alt[0] : ''));
    return alt.length ? 'Tawarkan ' + alt.join('; ') : 'Tawarkan produk terlaris di MC';
  }
  function uarLastDay(o, C) {
    var d = 0; if (C.tab === 'spi') { var x = C.spi && C.spi[o.k]; return x ? (gaStat(x, gaBrand()).last || null) : null; }
    uarCats(C.tab).forEach(function (k) { var a = (o.c || {})[k]; if (a && a[6] && a[6] > d) d = a[6]; }); return d || null;
  }
  function uarAnyOther(o) { var c = o.c || {}, k; for (k in c) { if (c[k] && c[k][1] > 0) return true; } return false; }
  function uarList(C, sub) {
    var rows = [], q = (state.uarSearch || '').toLowerCase(), seg = (state.uarSeg || {})[sub] || (sub === 'aktif' ? 'all' : 'lapsed');
    var tot = { aktif: { all: 0, baru: 0, naik: 0, turun: 0, stabil: 0 }, inaktif: { lapsed: 0, dekat: 0, lain: 0, dormant: 0 } }, vol = 0, lost = 0;
    C.list.forEach(function (o) {
      var m = uarMetric(o, C.tab, C.spi), act = m[0] >= C.thr, prev = m[1] >= C.thr, s;
      if (sub === 'aktif') {
        if (!act) return;
        s = !prev ? 'baru' : (m[0] > m[1] ? 'naik' : (m[0] < m[1] ? 'turun' : 'stabil')); tot.aktif.all++; tot.aktif[s]++; vol += m[0];
      } else {
        if (act) return;
        s = prev ? 'lapsed' : (m[0] > 0 ? 'dekat' : (uarAnyOther(o) ? 'lain' : 'dormant')); tot.inaktif[s]++; if (s === 'lapsed') lost += m[1];
      }
      var okSeg = sub === 'aktif' ? (seg === 'all' || seg === s) : (seg === 'all' || seg === s);
      if (!okSeg) return;
      if (q && (String(o.n || '') + ' ' + o.id + ' ' + (o.site || '') + ' ' + o.mc + ' ' + uarDse(o)).toLowerCase().indexOf(q) === -1) return;
      rows.push({ o: o, m: m, s: s });
    });
    rows.sort(sub === 'aktif' ? function (a, b) { return b.m[0] - a.m[0]; } : function (a, b) { return (b.m[1] - a.m[1]) || (b.m[2] - a.m[2]) || (b.m[0] - a.m[0]); });
    return { rows: rows, tot: tot, seg: seg, vol: vol, lost: lost };
  }
  var UAR_SEG_LABEL = { baru: ['ok', 'Baru aktif'], naik: ['top', 'Naik'], turun: ['warn', 'Turun'], stabil: ['none', 'Stabil'], lapsed: ['bad', 'Lapsed'], dekat: ['warn', 'Hampir UAR'], lain: ['none', 'Aktif kategori lain'], dormant: ['bad', 'Dormant'] };
  function uarListView(C, sub) {
    var L = uarList(C, sub);
    var isAct = sub === 'aktif', T = L.tot[sub], unitSal = C.tab === 'sal';
    var segs = isAct ? [['all', 'Semua aktif (' + fmtCount(T.all) + ')'], ['baru', 'Baru aktif (' + fmtCount(T.baru) + ')'], ['naik', 'Naik (' + fmtCount(T.naik) + ')'], ['turun', 'Turun (' + fmtCount(T.turun) + ')']] :
      [['all', 'Semua inaktif (' + fmtCount(T.lapsed + T.dekat + T.lain + T.dormant) + ')'], ['lapsed', 'Lapsed (' + fmtCount(T.lapsed) + ')'], ['dekat', 'Hampir ' + C.term + ' (' + fmtCount(T.dekat) + ')'], ['lain', 'Aktif kategori lain (' + fmtCount(T.lain) + ')'], ['dormant', 'Dormant (' + fmtCount(T.dormant) + ')']];
    var cards = isAct ? '<div class="kpis" style="margin-top:10px;">' +
        kpi('Outlet aktif (' + C.term + ')', fmtCount(T.all), pctOf(T.all, C.list.length) + '% dari ' + fmtCount(C.list.length) + ' outlet master', 'up', 'definisi ' + uarThrLabel(C.tab, C.thr)) +
        kpi('Baru aktif', fmtCount(T.baru), 'tidak aktif di ' + C.prev, 'up', 'outlet yang berhasil diaktifkan') +
        kpi('Naik dibanding ' + C.prev, fmtCount(T.naik), 'volume lebih tinggi', 'up', 'aktif di kedua periode') +
        kpi('Turun dibanding ' + C.prev, fmtCount(T.turun), 'masih aktif tetapi volume lebih rendah', T.turun > T.naik ? 'down' : 'up', 'risiko menjadi lapsed') + '</div>' :
      '<div class="kpis" style="margin-top:10px;">' +
        kpi('Lapsed (aktif ' + C.prev + ', tidak ' + C.cur + ')', fmtCount(T.lapsed), 'follow-up prioritas', 'down', unitSal ? 'nilai periode lalu ' + pjRp(L.lost) : 'volume periode lalu ' + fmtCount(L.lost) + ' pcs') +
        kpi('Hampir ' + C.term, fmtCount(T.dekat), (C.tab === 'spi' ? 'sudah GA tetapi di bawah ' : 'sudah beli tetapi di bawah ') + uarThrLabel(C.tab, C.thr), 'down', 'cukup tambah sedikit untuk masuk ' + C.term) +
        kpi('Aktif di kategori lain', fmtCount(T.lain), 'ada sell-in lain, belum kategori ini', 'down', 'peluang cross-sell') +
        kpi('Dormant', fmtCount(T.dormant), 'tanpa pembelian sama sekali', 'down', 'kandidat bersih-bersih PJP') + '</div>';
    var head = '<tr>' + dkStickyTh('Area › MC › Outlet', 1) + th('Site') + th('MC') + th('DSE') + th('Status') + th((unitSal ? 'Saldo ' : 'Volume ') + C.prev, 1) + th((unitSal ? 'Saldo ' : 'Volume ') + C.cur, 1) + th('Terakhir beli') + (isAct ? '' : th('Usulan produk untuk didorong')) + '</tr>';
    function uRow(r) {
      var o = r.o, st = UAR_SEG_LABEL[r.s], ld = uarLastDay(o, C);
      return '<tr>' + dkStickyTd('<b>' + esc(o.n || '(tanpa nama)') + '</b><br><code style="font-size:12px;">' + esc(o.id) + ' · ' + esc(o.b) + '</code>') + '<td><code>' + esc(o.site || '—') + '</code></td><td>' + esc(o.mc) + '</td><td>' + dseHtml(uarDse(o)) + '</td><td>' + dkTag(st[0], st[1]) + '</td>' +
        '<td class="num">' + uarVol(C.tab, r.m[1]) + '</td><td class="num"><b>' + uarVol(C.tab, r.m[0]) + '</b></td><td>' + (ld ? 'tgl ' + ld + ' Okt' : '<span class="note">—</span>') + '</td>' + (isAct ? '' : '<td style="min-width:260px;">' + esc(uarPropose(C, o, r.s, r.m)) + '</td>') + '</tr>';
    }
    function uSub(items) { var p = 0, c = 0; items.forEach(function (r) { p += r.m[1]; c += r.m[0]; }); return '<td class="num">' + uarVol(C.tab, p) + '</td><td class="num"><b>' + uarVol(C.tab, c) + '</b></td><td' + (isAct ? '' : ' colspan="2"') + '></td>'; }
    var body = grpBody('uar' + sub, { items: L.rows, area: function (r) { return r.o.br || (C.mi[r.o.mc] || {}).br; }, mc: function (r) { return r.o.mc; }, dso: function (m) { return (C.mi[m] || {}).dso || '—'; }, hoa: function (a) { for (var k in C.mi) if (C.mi[k].br === a) return C.mi[k].hoa || '—'; return '—'; },
      val: function (r) { return r.m[0]; }, span: 5, cols: isAct ? 8 : 9, sub: uSub, row: uRow, search: !!state.uarSearch });
    var bar = '<div class="map-toolbar" style="margin:10px 0 8px;">' + sellinBtnGroup('Segmen', 'uar-seg', segs, L.seg) + '<div class="map-toolbar-group"><input type="text" id="uarSearchInput" aria-label="Cari outlet, site, MC atau DSE" placeholder="🔍 Cari outlet, ID, site, DSE, MC..." value="' + esc(state.uarSearch || '') + '" class="map-select" style="min-width:260px;"><button type="button" class="btn" data-act="uar-export">📥 Export CSV</button></div>' + grpBar('uar' + sub) + '</div>';
    var note = isAct ? 'Diurutkan dari volume terbesar. Status membandingkan volume ' + C.cur + ' dengan ' + C.prev + '.' :
      'Lapsed diurutkan dari volume periode lalu terbesar: outlet yang paling berharga untuk dikejar. Usulan produk: untuk lapsed, produk yang paling banyak dibeli outlet itu sendiri ditambah alternatif terlaris di MC; untuk outlet lain, produk terlaris di MC (jumlah outlet pembeli) yang belum dipakai outlet.' + (C.tab === 'spi' ? ' Usulan SP memakai produk SP sell-in karena data SP injection (MOBO) tidak memuat produk.' : '');
    return cards + card((isAct ? 'Outlet aktif' : 'Outlet inaktif, perlu follow-up dan usulan produk') + ' · ' + esc(scopeText()), bar + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">' + fmtCount(L.rows.length) + ' outlet, dikelompokkan Area › Micro Cluster (DSO); klik panah untuk membuka.</p><p class="note">' + note + '</p>');
  }
  function uarExportCsv() {
    var C = uarCtx(); if (!C || typeof window === 'undefined') return;
    var sub = state.uarSub === 'aktif' ? 'aktif' : 'inaktif', L = uarList(C, sub);
    function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var lines = [['Area', 'MC', 'DSO', 'DSE', 'Site', 'Outlet ID', 'Brand', 'Outlet Name', 'Status', 'Periode lalu', 'Periode ini', 'Terakhir beli', 'Usulan produk'].map(q).join(',')];
    L.rows.forEach(function (r) { var o = r.o, i = C.mi[o.mc] || {}; lines.push([i.br, o.mc, i.dso, uarDse(o), o.site, o.id, o.b, o.n, UAR_SEG_LABEL[r.s][1], r.m[1], r.m[0], uarLastDay(o, C) || '', sub === 'inaktif' ? uarPropose(C, o, r.s, r.m) : ''].map(q).join(',')); });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'uar_' + C.tab + '_' + sub + '.csv'; a.click();
  }
  function viewUar() {
    var C = uarCtx(); if (!C) return card('UAR', '<p class="note">Feed penjualan belum dibangun.</p>');
    if (C.tab === 'spi' && !C.spi) return uarNav(C.tab, C.thr) + card('SSO Gross Add', '<p class="note">Feed GA belum dibangun. Taruh Daily_RGUGA_OUTLET_*.xlsb di <code>raw/GA/</code> dan jalankan <code>python3 scripts/build_ga_feed.py</code>.</p>');
    var sub = state.uarSub || 'growth';
    var subs = [['growth', '📈 Ringkasan Growth'], ['slab', '📶 Slab ' + (state.uarTab === 'spi' ? 'SSO' : 'UAR')], ['aktif', '✅ Outlet Aktif'], ['inaktif', '⚠️ Outlet Inaktif & Usulan Produk']];
    var subNav = '<div class="map-toolbar" style="margin-top:8px;"><div class="map-toolbar-group"><span class="map-label">Isi:</span>' + subs.map(function (x, i) { return (i === 1 ? '<span class="map-label" style="margin-left:10px;">Opportunity →</span>' : '') + '<button type="button" class="map-btn' + (sub === x[0] ? ' active' : '') + '" data-uar-sub="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>';
    var body = sub === 'slab' ? uarSlabView(C) : (sub === 'aktif' ? uarListView(C, 'aktif') : (sub === 'inaktif' ? uarListView(C, 'inaktif') : uarGrowth()));
    return uarNav(C.tab, C.thr) + subNav + body;
  }

  /* ================= GROSS ADD · SSO (SIM Selling Outlet) · RGUGA per outlet, Oktober vs September, kontrol GA BIOMETRIC ================= */
  var GA_TABS = [['ringkasan', '📊 Ringkasan per Teritori'], ['sga', '📶 Slab GA'], ['dse', '👤 Per DSE'], ['outlet', '🏪 Outlet'], ['harian', '🗓️ Harian'], ['slab', '📶 Slab SSO'], ['roaming', '🔀 Distribusi & Roaming']];
  var GA_SLABS = [[0, 0, '0 GA'], [1, 2, '1–2'], [3, 4, '3–4'], [5, 9, '5–9'], [10, 1e12, '≥ 10']];
  function gaFeed() { return (typeof window !== 'undefined' && window.GA_FEED) ? window.GA_FEED : null; }
  function gaDays(a) { var d = [], i; for (i = 0; i < 32; i++) d.push(0); for (i = 0; a && i < a.length; i += 2) d[a[i]] += a[i + 1]; return d; }
  var _gaPrep = null;
  // physical outlets (IM3 and 3ID rows folded by outlet key) with daily arrays per brand and month
  function gaPrep() {
    var F = gaFeed(); if (!F) return null;
    if (_gaPrep && _gaPrep.src === F) return _gaPrep;
    var mi = F.metadata.mc_info || {}, by = {}, list = [];
    F.outlets.forEach(function (r) {
      var o = by[r.k];
      if (!o) { var m = mi[r.mc] || {}; o = by[r.k] = { k: r.k, n: r.n, mc: r.mc, br: r.br, hoa: m.hoa || '—', dse: r.dse || 'UNASSIGNED', site: r.site || '', kec: r.kec || '', t: r.t, sg: r.sg || '', hy: 0, ids: {}, id: r.i, d: {}, _c: {} }; list.push(o); }
      if (!o.sg && r.sg) o.sg = r.sg;
      if (r.hy) o.hy = 1;
      o.ids[r.b] = r.i; if (r.b === 'IM3') o.id = r.i;
      o.d[r.b] = { s: gaDays(r.s), o: gaDays(r.o) };
    });
    _gaPrep = { src: F, list: list, by: by, cut: F.metadata.cut_day, mi: mi, ctl: (F.metadata.control || {}) };
    return _gaPrep;
  }
  function gaBrand() { return state.gaBrand || 'all'; }
  function gaArr(o, brand, per) {   // daily GA of one outlet; per 's' = September, 'o' = Oktober; index = day of month
    var key = brand + per, c = o._c[key]; if (c) return c;
    var out = [], i; for (i = 0; i < 32; i++) out.push(0);
    ['IM3', '3ID'].forEach(function (b) { if ((brand === 'all' || brand === b) && o.d[b]) { var a = o.d[b][per]; for (i = 1; i <= 31; i++) out[i] += a[i]; } });
    return (o._c[key] = out);
  }
  function gaSum(a, lo, hi) { var s = 0, i; for (i = lo; i <= hi; i++) s += a[i]; return s; }
  function gaStat(o, brand) {
    var key = brand + '|st', c = o._c[key]; if (c) return c;
    var cut = gaPrep().cut, so = gaArr(o, brand, 's'), oo = gaArr(o, brand, 'o'), st = { cur: gaSum(oo, 1, cut), prev: gaSum(so, 1, cut), full: gaSum(so, 1, 30), w1: gaSum(oo, 1, 7), w2: gaSum(oo, 8, cut), ad: 0, adp: 0, last: 0 }, i;
    for (i = 1; i <= cut; i++) { if (oo[i] > 0) { st.ad++; st.last = i; } if (so[i] > 0) st.adp++; }
    return (o._c[key] = st);
  }
  function gaScopeList(ignoreSg) {
    var G = gaPrep(); if (!G) return [];
    var brand = gaBrand(), sg = ignoreSg ? 'all' : (state.gaSg || 'all'), onlyM = state.gaCover === 'master';
    return G.list.filter(function (o) {
      if (brand !== 'all' && !o.ids[brand]) return false;
      if (onlyM && o.t !== 'M') return false;
      if (sg !== 'all' && o.sg !== sg) return false;
      return (!state.branch || o.br === state.branch) && (!state.hoa || o.hoa === state.hoa) && (!state.kec || o.mc === state.kec) && (!state.dse || dseNorm(o.dse) === state.dse);
    });
  }
  function gaScoped() { return !!(state.branch || state.hoa || state.kec || state.dse || (state.gaSg && state.gaSg !== 'all') || state.gaCover === 'master'); }
  function gaAgg(list, brand) {
    var A = { n: 0, ng: 0, q: 0, p: 0, f: 0, w1: 0, w2: 0, u: 0, up: 0, um: 0, upm: 0, uf: 0, qg: 0, ad: 0, adp: 0, nw: 0, lp: 0, npj: 0, upj: 0, upjp: 0 };
    list.forEach(function (o) {
      var s = gaStat(o, brand), m = o.t === 'M';
      if (m) A.n++; else A.ng++;
      if (o.sg === 'PJP') { A.npj++; if (s.cur > 0) A.upj++; if (s.prev > 0) A.upjp++; }
      A.q += s.cur; A.p += s.prev; A.f += s.full; A.w1 += s.w1; A.w2 += s.w2; A.ad += s.ad; A.adp += s.adp;
      if (!m) A.qg += s.cur;
      if (s.cur > 0) { A.u++; if (m) A.um++; }
      if (s.prev > 0) { A.up++; if (m) A.upm++; }
      if (s.full > 0) A.uf++;
      if (s.cur > 0 && s.prev <= 0) A.nw++;
      if (s.cur <= 0 && s.prev > 0) A.lp++;
    });
    return A;
  }
  function gaGrow(a, b) { return b > 0 ? (a / b - 1) * 100 : null; }
  function gaSlabIdx(v) { var i; for (i = GA_SLABS.length - 1; i >= 0; i--) { if (v >= GA_SLABS[i][0]) return i; } return 0; }
  // control totals (GA BIOMETRIC, region level) for a brand selection; month 'Sep' | 'Oct'; returns {day: value}
  function gaCtl(kind, mon, brand) {
    var G = gaPrep(), c = (G && G.ctl && G.ctl[kind]) || {}, out = {}, has = false;
    ['IM3', '3ID'].forEach(function (b) { if ((brand === 'all' || brand === b) && c[b] && c[b][mon]) { has = true; Object.keys(c[b][mon]).forEach(function (d) { out[d] = (out[d] || 0) + c[b][mon][d]; }); } });
    return has ? out : null;
  }
  // outlet-level GA ÷ GA BIOMETRIC over the days both exist (region level only)
  function gaCover(brand, mon) {
    var G = gaPrep(), ctl = gaCtl('bio', mon, brand); if (!ctl) return null;
    var per = mon === 'Oct' ? 'o' : 's', days = Object.keys(ctl).map(Number).filter(function (d) { return mon === 'Oct' ? d <= G.cut : true; }), q = 0, c = 0;
    G.list.forEach(function (o) { if (brand !== 'all' && !o.ids[brand]) return; var a = gaArr(o, brand, per); days.forEach(function (d) { q += a[d]; }); });
    days.forEach(function (d) { c += ctl[d]; });
    return c ? { q: q, c: c, r: q / c, days: days.length } : null;
  }
  function gaBar(tab) {
    var site = gaBasis() === 'site';
    return '<div class="map-toolbar" style="margin-top:8px;">' + sellinBtnGroup('Basis GA', 'ga-basis', [['outlet', '🏪 Outlet sell-in (tagging) · insentif DSE'], ['site', '📍 Site NBS (lokasi) · kinerja HoA / DSO']], gaBasis()) + '</div><div class="map-toolbar" style="margin-top:8px;">' + sellinBtnGroup('Brand', 'ga-brand', [['all', 'IOH (IM3 + 3ID)'], ['IM3', 'IM3'], ['3ID', '3ID']], gaBrand()) +
      sellinBtnGroup('Sumber outlet', 'ga-sg', [['all', 'Semua'], ['PJP', 'PJP'], ['NON', 'NON'], ['KAM', 'KAM']], state.gaSg || 'all') +
      sellinBtnGroup('Cakupan', 'ga-cover', [['all', 'Semua outlet GA'], ['master', 'Hanya outlet master']], state.gaCover || 'all') + '</div>';
  }
  function gaTabNav() {
    return gaBar(state.gaTab || 'ringkasan') + '<div class="sub-nav" role="tablist" style="margin-top:10px;">' + GA_TABS.map(function (x) { var a = (state.gaTab || 'ringkasan') === x[0]; return '<button type="button" role="tab" class="sub-nav-btn' + (a ? ' active' : '') + '" data-ga-tab="' + x[0] + '" aria-selected="' + a + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function gaSg(n) { return (n >= 0 ? '+' : '−') + fmtCount(Math.abs(n)); }
  function gaGapTd(n, cls) { return '<td class="num ' + (cls || '') + '"><b style="color:' + (n >= 0 ? '#166534' : '#991b1b') + ';">' + gaSg(n) + '</b></td>'; }
  /* run-rate harian: MTD, LMTD (sama jumlah hari), Last FM (30 hari) dan proyeksi akhir Okt (31 hari) */
  function gaRate(a) { var cut = gaPrep().cut; return { m: a.q / cut, l: a.p / cut, f: a.f / 30, proj: a.q / cut * 31, w: cut > 7 ? a.w2 / (cut - 7) : a.q / cut }; }
  function gaCards(A, brand, extra) {
    var G = gaPrep(), cut = G.cut, g = gaGrow(A.q, A.p), gs = gaGrow(A.u, A.up), per = A.u ? A.q / A.u : 0, perp = A.up ? A.p / A.up : 0, R = gaRate(A);
    var gr = R.l ? (R.m / R.l - 1) * 100 : null, projG = A.f ? (R.proj / A.f - 1) * 100 : null, pct = function (v) { return v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; };
    return '<div class="kpis" style="margin-top:10px;">' +
      kpi('GA MTD (1–' + cut + ' Okt)', fmtCount(A.q) + ' pcs', pct(g) + ' vs LMTD ' + fmtCount(A.p) + ' pcs (1–' + cut + ' Sep)', g != null && g >= 0 ? 'up' : 'down', 'GA di luar master outlet ' + fmtCount(A.qg) + ' pcs (' + pctOf(A.qg, A.q) + '%) tetap ikut total') +
      kpi('GA Last Full Month (Sep 1–30)', fmtCount(A.f) + ' pcs', 'MTD = ' + pctOf(A.q, A.f) + '% dari Sep penuh · waktu berjalan ' + (cut / 31 * 100).toFixed(1) + '% (hari ' + cut + '/31)', A.q / (A.f || 1) >= cut / 31 ? 'up' : 'down', 'September penuh dari Daily_RGUGA per outlet') +
      kpi('Gap MTD vs Last FM', gaSg(A.q - A.f) + ' pcs', 'LMTD vs Sep penuh ' + gaSg(A.p - A.f) + ' pcs', A.q >= A.f ? 'up' : 'down', 'GA yang masih harus dikejar untuk menyamai September: ' + fmtCount(Math.max(0, A.f - A.q)) + ' pcs') +
      kpi('Run-rate harian MTD vs LMTD', fmtCount(Math.round(R.m)) + ' pcs/hari', pct(gr) + ' vs LMTD ' + fmtCount(Math.round(R.l)) + '/hari', gr != null && gr >= 0 ? 'up' : 'down', 'Sep penuh ' + fmtCount(Math.round(R.f)) + '/hari · hari ke-8–' + cut + ': ' + fmtCount(Math.round(R.w)) + '/hari') + '</div>' +
      '<div class="kpis" style="margin-top:10px;">' +
      kpi('Proyeksi akhir Oktober', fmtCount(Math.round(R.proj)) + ' pcs', pct(projG) + ' vs Sep penuh ' + fmtCount(A.f), R.proj >= A.f ? 'up' : 'down', 'run-rate MTD × 31 hari · gap ' + gaSg(Math.round(R.proj - A.f)) + ' pcs') +
      kpi('SSO MTD', fmtCount(A.u), pct(gs) + ' vs LMTD ' + fmtCount(A.up), gs != null && gs >= 0 ? 'up' : 'down', pctOf(A.um, A.n) + '% dari ' + fmtCount(A.n) + ' outlet master · SSO = outlet dengan ≥ 1 GA') +
      kpi('SSO Last Full Month (Sep)', fmtCount(A.uf), 'gap MTD vs Sep penuh ' + gaSg(A.u - A.uf) + ' outlet', A.u >= A.uf ? 'up' : 'down', 'SSO MTD = ' + pctOf(A.u, A.uf) + '% dari SSO September penuh') +
      kpi('GA per SSO · SSO baru / hilang', per ? per.toFixed(1) + ' pcs' : '—', (perp ? perp.toFixed(1) + ' pcs di LMTD · ' : '') + fmtCount(A.nw) + ' baru / ' + fmtCount(A.lp) + ' hilang', per >= perp ? 'up' : 'down', 'baru: GA Okt tanpa GA di LMTD; hilang: kebalikannya') + (extra || '') + '</div>';
  }
  function gaHeadCells() {
    return th('Outlet master', 1) + th('GA MTD (pcs)', 1) + th('GA LMTD (pcs)', 1) + th('Growth GA', 1) + th('GA Last FM (Sep)', 1) + th('Gap MTD vs FM', 1) + th('Run-rate / hari MTD', 1) + th('Run-rate / hari LMTD', 1) + th('Δ run-rate', 1) + th('Proyeksi Okt', 1) +
      th('SSO MTD (semua outlet)', 1) + th('% SSO', 1) + th('SSO LMTD', 1) + th('Growth SSO', 1) + th('SSO Last FM', 1) + th('Gap SSO vs FM', 1) + th('SSO PJP', 1) + th('% SSO PJP', 1) + th('GA / SSO', 1) + th('SSO baru', 1) + th('SSO hilang', 1) + th('GA di luar master', 1);
  }
  var GA_NCOLS = 22;
  function gaCells(a) {
    var g = gaGrow(a.q, a.p), gs = gaGrow(a.u, a.up), R = gaRate(a), gr = R.l ? (R.m / R.l - 1) * 100 : null;
    return '<td class="num">' + fmtCount(a.n) + '</td><td class="num cur"><b>' + fmtCount(a.q) + '</b></td><td class="num">' + fmtCount(a.p) + '</td><td class="num">' + uarGTag(g) + '</td><td class="num">' + fmtCount(a.f) + '</td>' + gaGapTd(a.q - a.f) +
      '<td class="num cur"><b>' + fmtCount(Math.round(R.m)) + '</b></td><td class="num">' + fmtCount(Math.round(R.l)) + '</td><td class="num">' + uarGTag(gr) + '</td><td class="num">' + fmtCount(Math.round(R.proj)) + '</td>' +
      '<td class="num cur"><b>' + fmtCount(a.u) + '</b></td><td class="num">' + (a.n ? pctOf(a.um, a.n) + '%' : '·') + '</td><td class="num">' + fmtCount(a.up) + '</td><td class="num">' + uarGTag(gs) + '</td><td class="num">' + fmtCount(a.uf) + '</td>' + gaGapTd(a.u - a.uf) +
      '<td class="num">' + fmtCount(a.upj) + '</td><td class="num">' + (a.npj ? pctOf(a.upj, a.npj) + '%' : '·') + '</td>' +
      '<td class="num">' + (a.u ? (a.q / a.u).toFixed(1) : '—') + '</td><td class="num">' + fmtCount(a.nw) + '</td><td class="num">' + fmtCount(a.lp) + '</td><td class="num">' + (a.qg ? fmtCount(a.qg) : '·') + '</td>';
  }
  /* Overall Inner Jakarta (tanpa filter teritori): IM3, 3ID dan IOH, dipakai di bawah scorecard kedua basis */
  function gaOverall() {
    var G = gaPrep(), rows = [['IM3', 'IM3'], ['3ID', '3ID'], ['all', 'IOH (IM3 + 3ID)']].map(function (b) {
      var l = G.list.filter(function (o) { return b[0] === 'all' || o.ids[b[0]]; }), a = gaAgg(l, b[0]), bold = b[0] === 'all';
      return '<tr' + (bold ? ' style="background:var(--ij-wash); font-weight:800;"' : '') + '><td class="cur"><b>' + b[1] + '</b></td>' + gaCells(a) + '</tr>';
    }).join('');
    return card('Overall Growth Inner Jakarta · GA dan SSO per brand (semua outlet, tanpa filter teritori)', '<div class="tbl-wrap"><table class="tbl wide" data-nosort="1"><thead><tr>' + th('Brand') + gaHeadCells() + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="note">MTD = 1–' + G.cut + ' Okt, LMTD = 1–' + G.cut + ' Sep, Last FM = September penuh (30 hari). Gap = MTD − Last FM (negatif = masih di bawah September; hijau = sudah melewati). Run-rate harian = GA ÷ ' + G.cut + ' hari; proyeksi Okt = run-rate MTD × 31. SSO = outlet dengan ≥ 1 GA; Gap SSO = SSO MTD − SSO September penuh. Sumber: Daily_RGUGA_OUTLET per outlet (September terbit ulang 15 Okt 2026).</p>');
  }
  var GA_SRC = [['PJP', 'PJP'], ['NON', 'Non-PJP'], ['KAM', 'KAM (key account)'], ['', 'Belum terklasifikasi']];
  // GA and SSO by source of outlet (FINAL OUTLET in RGUGA): PJP = outlets on the beat plan, NON = outlets outside it, KAM = key accounts
  function gaSourceCard(brand) {
    var all = gaScopeList(true), G = gaPrep(), tot = gaAgg(all, brand);
    var rows = GA_SRC.map(function (x) { var l = all.filter(function (o) { return (o.sg || '') === x[0]; }); return { k: x[0], label: x[1], a: gaAgg(l, brand), l: l }; }).filter(function (r) { return r.l.length; });
    function tr(label, a, bold, k) {
      var g = gaGrow(a.q, a.p), gs = gaGrow(a.u, a.up), sel = state.gaSg === k && k !== 'all' && !bold;
      return '<tr' + (bold ? ' style="background:var(--ij-wash); font-weight:800;"' : '') + '><td class="cur">' + (bold ? '' : '<button type="button" class="btn" data-ga-sg="' + (k || 'all') + '" style="padding:2px 8px; font-size:12px; margin-right:6px;" title="Filter tabel ke sumber ini">' + (sel ? '✓' : '▸') + '</button>') + '<b>' + label + '</b></td>' +
        '<td class="num">' + fmtCount(a.n + a.ng) + '</td><td class="num">' + (a.n + a.ng ? pctOf(a.n + a.ng, tot.n + tot.ng) + '%' : '·') + '</td><td class="num cur"><b>' + fmtCount(a.q) + '</b></td><td class="num">' + pctOf(a.q, tot.q) + '%</td><td class="num">' + fmtCount(a.p) + '</td><td class="num">' + uarGTag(g) + '</td>' +
        '<td class="num cur"><b>' + fmtCount(a.u) + '</b></td><td class="num">' + (a.n + a.ng ? pctOf(a.u, a.n + a.ng) + '%' : '·') + '</td><td class="num">' + fmtCount(a.up) + '</td><td class="num">' + uarGTag(gs) + '</td><td class="num">' + (a.u ? (a.q / a.u).toFixed(1) : '—') + '</td><td class="num">' + fmtCount(a.n) + '</td></tr>';
    }
    var body = rows.map(function (r) { return tr(r.label, r.a, false, r.k); }).join('') + tr('TOTAL', tot, true);
    return card('GA dan SSO per sumber outlet · ' + esc(scopeText()),
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Sumber outlet') + th('Outlet', 1) + th('% outlet', 1) + th('GA MTD', 1) + th('% GA', 1) + th('GA LMTD', 1) + th('Growth', 1) + th('SSO MTD', 1) + th('% SSO', 1) + th('SSO LMTD', 1) + th('Growth SSO', 1) + th('GA / SSO', 1) + th('Outlet master', 1) + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Sumber outlet = kolom FINAL OUTLET di RGUGA (Oktober; September bila Oktober kosong): <b>PJP</b> = outlet di beat plan, <b>Non-PJP</b> = di luar beat plan, <b>KAM</b> = key account. Hampir seluruh outlet master teritori adalah PJP; outlet Non-PJP sebagian besar di luar master, sehingga tidak punya DSE. "SSO PJP" dan "SSO semua outlet" pada tabel teritori sama dengan baris UAR PJP dan UAR ALL OUTLET di workbook. "Belum terklasifikasi" = outlet yang hanya muncul di pivot raw atau tidak punya label FINAL OUTLET.</p>');
  }
  function gaRingkasan(list, brand) {
    var G = gaPrep(), A = gaAgg(list, brand), C = { list: list, mi: G.mi };
    function rowFn(label, ket, l, style) {
      var a = gaAgg(l, brand), bg = /ink/.test(style) ? 'var(--ij-ink)' : (/wash/.test(style) ? 'var(--ij-wash)' : '#fff');
      return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur" style="' + DK_STICKY + ' background:' + bg + ';">' + label + '</td><td>' + ket + '</td>' + gaCells(a) + '</tr>';
    }
    var T = uarTerrRows(C, rowFn);
    var head = '<tr>' + th(T.mode === 'dse' ? 'DSE' : 'Region / Area / MC') + th('DSO / ket.') + gaHeadCells() + '</tr>';
    var an = G.ctl && G.ctl.bio ? '' : '';
    return gaCards(A, brand) + gaOverall() + gaSourceCard(brand) + card('SSO dan gross add per teritori · ' + esc(scopeText()), uarAreaTools(T.mode) + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head + '</thead><tbody>' + T.rows.join('') + '</tbody></table></div>' +
      '<p class="note">SSO (SIM Selling Outlet) = outlet dengan ≥ 1 gross add pada periode; % SSO = SSO outlet master ÷ outlet master. MTD = 1–' + G.cut + ' Okt, LMTD = 1–' + G.cut + ' Sep (September penuh 30 hari). Sumber: Daily_RGUGA_OUTLET (GA per outlet per hari); Last FM = September penuh; Gap = MTD − Last FM. ' +
      'Outlet yang tidak ada di master teritori tetap dihitung di MC / Area asal workbook (kolom "GA di luar master"). Brand IOH menjumlahkan GA IM3 + 3ID; SSO IOH menghitung outlet fisik satu kali.</p>');
  }
  function gaDse(list, brand) {
    var q = (state.gaSearch || '').toLowerCase(), g = {}, G = gaPrep();
    list.forEach(function (o) { var k = o.mc + '||' + o.dse, x = g[k] || (g[k] = { mc: o.mc, br: o.br, dse: o.dse, list: [] }); x.list.push(o); });
    var items = Object.keys(g).map(function (k) { var x = g[k]; x.a = gaAgg(x.list, brand); return x; }).filter(function (x) { return !q || (x.dse + ' ' + x.mc + ' ' + x.br).toLowerCase().indexOf(q) !== -1; });
    var dsoOf = {}, hoaOf = {}; Object.keys(G.mi).forEach(function (m) { dsoOf[m] = G.mi[m].dso; if (!hoaOf[G.mi[m].br]) hoaOf[G.mi[m].br] = G.mi[m].hoa; });
    var row = function (x) { return '<tr><td class="cur" style="padding-left:40px;"><b>' + esc(uarDse({ dse: x.dse })) + '</b></td>' + gaCells(x.a) + '</tr>'; };
    var sub = function (it) { return gaCells(gaAgg([].concat.apply([], it.map(function (x) { return x.list; })), brand)); };
    var body = grpBody('gadse', { items: items, area: function (x) { return x.br; }, mc: function (x) { return x.mc; }, dso: function (m) { return dsoOf[m] || '—'; }, hoa: function (a) { return hoaOf[a] || '—'; }, val: function (x) { return x.a.q; }, span: 1, cols: GA_NCOLS + 1, sub: sub, row: row, unit: 'DSE', cap: 200, search: !!q });
    var bar = '<div class="map-toolbar" style="margin:10px 0 8px;"><div class="map-toolbar-group"><input type="text" id="gaSearchInput" aria-label="Cari DSE atau MC" placeholder="🔍 Cari DSE, MC..." value="' + esc(state.gaSearch || '') + '" class="map-select" style="min-width:240px;"></div>' + grpBar('gadse') + '</div>';
    return gaCards(gaAgg(list, brand), brand) + card('SSO dan gross add per DSE · ' + esc(scopeText()) + ' (' + fmtCount(items.length) + ' DSE)', bar + '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('Area › MC › DSE') + gaHeadCells() + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); DSE = DSE master outlet (outlet di luar master memakai kode DSE di RGUGA bila dikenali, selain itu "UNASSIGNED"). Satu DSE bisa muncul di lebih dari satu MC bila outlet binaannya tersebar.</p>');
  }
  var GA_SEGS = [['all', 'SSO MTD'], ['baru', 'SSO baru'], ['hilang', 'SSO hilang'], ['nol', 'Belum pernah SSO (Sep–Okt)']];
  function gaStatus(s) { return s.cur > 0 ? (s.prev > 0 ? 'sso' : 'baru') : (s.prev > 0 ? 'hilang' : 'nol'); }
  function gaListOut(list, brand) {
    var q = (state.gaSearch || '').toLowerCase(), seg = state.gaSeg || 'all', rows = [], cnt = { all: 0, baru: 0, hilang: 0, nol: 0 };
    list.forEach(function (o) {
      var s = gaStat(o, brand), st = gaStatus(s);
      if (s.cur > 0) cnt.all++; if (st === 'baru') cnt.baru++; else if (st === 'hilang') cnt.hilang++; else if (st === 'nol') cnt.nol++;
      var ok = seg === 'all' ? s.cur > 0 : seg === st; if (!ok) return;
      if (q && (String(o.n || '') + ' ' + o.id + ' ' + (o.site || '') + ' ' + o.mc + ' ' + o.dse).toLowerCase().indexOf(q) === -1) return;
      rows.push({ o: o, s: s, st: st });
    });
    rows.sort(function (a, b) { return b.s.cur - a.s.cur || b.s.prev - a.s.prev; });
    return { rows: rows, cnt: cnt, seg: seg };
  }
  function gaOutlet(list, brand) {
    var G = gaPrep(), L = gaListOut(list, brand), segs = GA_SEGS.map(function (x) { return [x[0], x[1] + ' (' + fmtCount(L.cnt[x[0]]) + ')']; });
    var tags = { sso: ['ok', 'SSO'], baru: ['top', 'SSO baru'], hilang: ['bad', 'SSO hilang'], nol: ['none', 'Belum SSO'] };
    var row = function (r) {
      var o = r.o, s = r.s, t = tags[r.st], g = gaGrow(s.cur, s.prev), sl = gaSlabIdx(s.cur);
      return '<tr><td class="cur" style="padding-left:56px;"><b>' + esc(o.n || '(tanpa nama)') + '</b>' + (o.t === 'G' ? ' <span class="note">(di luar master)</span>' : '') + '<br><code style="font-size:12px;">' + esc(o.id) + ' · ' + Object.keys(o.ids).sort().join(' + ') + '</code></td><td><code>' + esc(o.site || '—') + '</code></td>' +
        '<td>' + esc(o.sg || '—') + '</td><td>' + dkTag(t[0], t[1]) + '</td><td class="num">' + fmtCount(s.full) + '</td><td class="num">' + fmtCount(s.prev) + '</td><td class="num cur"><b>' + fmtCount(s.cur) + '</b></td><td class="num">' + uarGTag(g) + '</td><td class="num">' + s.ad + '</td><td>' + dkTag(UAR_SLAB_KIND[sl], GA_SLABS[sl][2]) + '</td><td>' + (s.last ? 'tgl ' + s.last + ' Okt' : '<span class="note">—</span>') + '</td></tr>';
    };
    var sub = function (it) { var f = grpSum(it, function (r) { return r.s.full; }), p = grpSum(it, function (r) { return r.s.prev; }), c = grpSum(it, function (r) { return r.s.cur; }); return '<td></td><td></td><td class="num">' + fmtCount(f) + '</td><td class="num">' + fmtCount(p) + '</td><td class="num cur"><b>' + fmtCount(c) + '</b></td><td class="num">' + uarGTag(gaGrow(c, p)) + '</td><td></td><td></td><td></td>'; };
    var dsoOf = {}, hoaOf = {}; Object.keys(G.mi).forEach(function (m) { dsoOf[m] = G.mi[m].dso; if (!hoaOf[G.mi[m].br]) hoaOf[G.mi[m].br] = G.mi[m].hoa; });
    var body = grpBody('gaoutlet', { items: L.rows, area: function (r) { return r.o.br; }, mc: function (r) { return r.o.mc; }, dse: function (r) { return uarDse(r.o); }, dso: function (m) { return dsoOf[m] || '—'; }, hoa: function (a) { return hoaOf[a] || '—'; }, val: function (r) { return r.s.cur || r.s.prev; }, span: 2, cols: 11, sub: sub, row: row, unit: 'outlet', cap: 150, search: !!state.gaSearch });
    var bar = '<div class="map-toolbar" style="margin:10px 0 8px;">' + sellinBtnGroup('Segmen', 'ga-seg', segs, L.seg) + '<div class="map-toolbar-group"><input type="text" id="gaSearchInput" aria-label="Cari outlet, site, MC atau DSE" placeholder="🔍 Cari outlet, ID, site, DSE, MC..." value="' + esc(state.gaSearch || '') + '" class="map-select" style="min-width:260px;"><button type="button" class="btn" data-act="ga-export">📥 Export CSV</button></div>' + grpBar('gaoutlet') + '</div>';
    return gaCards(gaAgg(list, brand), brand) + card('Outlet SSO · ' + esc(scopeText()), bar + '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('Area › MC › DSE › Outlet') + th('Site') + th('Sumber outlet') + th('Status') + th('GA Sep penuh', 1) + th('GA LMTD', 1) + th('GA MTD', 1) + th('Growth', 1) + th('Hari aktif', 1) + th('Slab SSO') + th('GA terakhir') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Dikelompokkan Area › Micro Cluster (DSO) › DSE; klik panah untuk membuka. SSO baru = GA Okt 1–' + G.cut + ' tetapi tanpa GA di LMTD; SSO hilang = punya GA di LMTD, belum ada di Okt. Hari aktif = jumlah hari Okt dengan ≥ 1 GA. Slab dari GA MTD (0 · 1–2 · 3–4 · 5–9 · ≥ 10). Maksimal 150 baris per DSE.</p>');
  }
  function gaExportCsv() {
    var list = gaScopeList(), brand = gaBrand(), G = gaPrep(); if (!G || typeof window === 'undefined') return;
    var L = gaListOut(list, brand), mi = G.mi;
    function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var lines = [['Area', 'MC', 'DSO', 'DSE', 'Site', 'Outlet ID', 'Brand', 'Outlet Name', 'Master', 'Segmen', 'Status', 'GA Sep penuh', 'GA LMTD', 'GA MTD', 'Hari aktif', 'Terakhir'].map(q).join(',')];
    L.rows.forEach(function (r) { var o = r.o, i = mi[o.mc] || {}; lines.push([o.br, o.mc, i.dso, o.dse, o.site, o.id, Object.keys(o.ids).sort().join('+'), o.n, o.t === 'M' ? 'ya' : 'tidak', o.sg, r.st, r.s.full, r.s.prev, r.s.cur, r.s.ad, r.s.last || ''].map(q).join(',')); });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'sso_gross_add_outlet.csv'; a.click();
  }
  function gaDaily(list, brand) {
    var O = [], S = [], d;
    for (d = 0; d <= 31; d++) { O.push({ q: 0, u: 0, up: 0 }); S.push({ q: 0, u: 0, up: 0 }); }
    list.forEach(function (o) { var so = gaArr(o, brand, 's'), oo = gaArr(o, brand, 'o'), i; for (i = 1; i <= 31; i++) { if (oo[i] > 0) { O[i].q += oo[i]; O[i].u++; if (o.sg === 'PJP') O[i].up++; } if (so[i] > 0) { S[i].q += so[i]; S[i].u++; if (o.sg === 'PJP') S[i].up++; } } });
    return { O: O, S: S };
  }
  function gaHarian(list, brand) {
    var G = gaPrep(), cut = G.cut, D = gaDaily(list, brand), A = gaAgg(list, brand), region = !gaScoped();
    var bioO = gaCtl('bio', 'Oct', brand), bioS = gaCtl('bio', 'Sep', brand), actO = gaCtl('active', 'Oct', brand), actS = gaCtl('active', 'Sep', brand);
    var TG = G.src.metadata.tag || {};
    function tagDay(kind, d) { var q = 0; ['IM3', '3ID'].forEach(function (b) { if (brand === 'all' || brand === b) q += (((TG[kind] || {})[b]) || {})[d] || 0; }); return q; }
    var wd = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], maxQ = 1, i;
    for (i = 1; i <= cut; i++) maxQ = Math.max(maxQ, D.O[i].q, D.S[i].q);
    function varCell(q, c) { if (c == null || !region) return '<td class="num"><span class="note">—</span></td><td class="num"><span class="note">—</span></td>'; var v = (q / c - 1) * 100; return '<td class="num">' + fmtCount(c) + '</td><td class="num">' + dkTag(Math.abs(v) <= 5 ? 'ok' : (Math.abs(v) <= 15 ? 'warn' : 'bad'), (v >= 0 ? '+' : '') + v.toFixed(1) + '%') + '</td>'; }
    var rowsO = '', TT = { q: 0, p: 0 }, d1;
    for (d1 = 1; d1 <= cut; d1++) {
      var o = D.O[d1], s = D.S[d1], dow = wd[new Date(Date.UTC(2026, 9, d1)).getUTCDay()], ch = s.q > 0 ? (o.q / s.q - 1) * 100 : null; TT.q += o.q; TT.p += s.q;
      var bar = '<div class="progress-bar-cell"><div class="progress-bar-fill" style="width:' + Math.round(o.q / maxQ * 100) + '%;"></div><span class="progress-bar-label">' + fmtCount(o.q) + '</span></div>';
      rowsO += '<tr><td class="cur"><b>' + d1 + ' Okt</b> <span class="note">' + dow + '</span></td><td class="num cur"><b>' + fmtCount(o.q) + '</b></td><td>' + bar + '</td><td class="num">' + fmtCount(s.q) + '</td><td class="num">' + uarGTag(ch) + '</td>' +
        '<td class="num cur"><b>' + fmtCount(o.u) + '</b></td><td class="num">' + fmtCount(s.u) + '</td><td class="num">' + fmtCount(o.up) + '</td><td class="num">' + fmtCount(s.up) + '</td><td class="num">' + (o.u ? (o.q / o.u).toFixed(1) : '—') + '</td>' + varCell(o.q, bioO ? bioO[d1] : null) + '<td class="num">' + (region && actO && actO[d1] != null ? fmtCount(actO[d1]) : '<span class="note">—</span>') + '</td>' +
        '<td class="num">' + (region ? fmtCount(tagDay('oct_outside_ij', d1)) : '<span class="note">—</span>') + '</td><td class="num">' + (region ? fmtCount(tagDay('oct_blank', d1)) : '<span class="note">—</span>') + '</td></tr>';
    }
    var totO = '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td class="cur" style="background:var(--ink); color:#fff;">TOTAL 1–' + cut + '</td><td class="num">' + fmtCount(TT.q) + '</td><td></td><td class="num">' + fmtCount(TT.p) + '</td><td class="num">' + (TT.p ? ((TT.q / TT.p - 1) * 100).toFixed(1) + '%' : '—') + '</td><td class="num">' + fmtCount(A.u) + ' SSO</td><td class="num">' + fmtCount(A.up) + ' SSO</td><td colspan="2"></td><td class="num">' + (A.u ? (A.q / A.u).toFixed(1) : '—') + '</td><td colspan="5"></td></tr>';
    var headO = '<tr>' + th('Tanggal') + th('GA tagging Okt (pcs)', 1) + th('Bar') + th('GA Sep (tgl sama)', 1) + th('Δ vs Sep', 1) + th('SSO Okt (semua)', 1) + th('SSO Sep (semua)', 1) + th('SSO PJP Okt', 1) + th('SSO PJP Sep', 1) + th('GA / SSO', 1) + th('GA lokasi · BIOMETRIC Okt', 1) + th('Selisih tagging vs lokasi', 1) + th('#Outlet active GA (KPI)', 1) + th('GA dicatat outlet luar IJ (nasional)', 1) + th('GA tanpa tag outlet', 1) + '</tr>';
    var rowsS = '', sumS = { q: 0, c: 0 }, med = D.S.slice(1, 31).map(function (x) { return x.q; }).sort(function (a, b) { return a - b; })[15] || 1, d2;
    for (d2 = 1; d2 <= 30; d2++) {
      var s2 = D.S[d2], dow2 = wd[new Date(Date.UTC(2026, 8, d2)).getUTCDay()], spike = s2.q > 1.8 * med; sumS.q += s2.q; sumS.c += bioS ? (bioS[d2] || 0) : 0;
      rowsS += '<tr><td class="cur"><b>' + d2 + ' Sep</b> <span class="note">' + dow2 + '</span></td><td class="num cur"><b>' + fmtCount(s2.q) + '</b>' + (spike ? ' ' + dkTag('warn', 'lonjakan') : '') + '</td><td class="num">' + fmtCount(s2.u) + '</td><td class="num">' + (s2.u ? (s2.q / s2.u).toFixed(1) : '—') + '</td>' + varCell(s2.q, bioS ? bioS[d2] : null) + '<td class="num">' + (region && actS && actS[d2] != null ? fmtCount(actS[d2]) : '<span class="note">—</span>') + '</td></tr>';
    }
    var totS = '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td class="cur" style="background:var(--ink); color:#fff;">TOTAL September</td><td class="num">' + fmtCount(sumS.q) + '</td><td class="num">' + fmtCount(A.uf) + ' SSO</td><td></td><td class="num">' + (region && bioS ? fmtCount(sumS.c) : '—') + '</td><td class="num">' + (region && bioS && sumS.c ? ((sumS.q / sumS.c - 1) * 100).toFixed(1) + '%' : '—') + '</td><td></td></tr>';
    var anom = ((G.src.metadata || {}).anomalies || []).filter(function (a) { return brand === 'all' || a.brand === brand; }).slice(0, 5);
    var anomTxt = anom.length ? '<p class="note"><b>Lonjakan satu outlet satu hari (≥ ' + G.src.metadata.anomaly_threshold + ' GA):</b> ' + anom.map(function (a) { return esc(a.name || a.id) + ' (' + a.brand + ', ' + a.day + ' ' + a.month + ': ' + fmtCount(a.qty) + ')'; }).join('; ') + '. Perlu dicek, ikut dihitung agar total sama dengan workbook.</p>' : '';
    return gaCards(A, brand) +
      card('Harian Oktober vs September · ' + esc(scopeText()), '<div class="tbl-wrap"><table class="tbl wide"><thead>' + headO + '</thead><tbody>' + rowsO + totO + '</tbody></table></div>' +
        '<p class="note">SSO harian = outlet dengan ≥ 1 GA pada hari itu (baris "UAR" di workbook RGUGA). GA BIOMETRIC adalah total resmi level region per brand (hanya tersedia sampai 7 Okt) dan hanya dibandingkan saat tidak ada filter teritori, segmen atau cakupan. Selisih hijau ≤ 5%, kuning ≤ 15%. "#Outlet active GA (KPI)" memakai definisi biometric yang lebih ketat daripada SSO ≥ 1, jadi angkanya lebih kecil. Sumber: ' + esc(G.src.metadata.sources.oct.split('/').pop()) + '.</p>' + anomTxt) +
      card('September penuh (30 hari) · referensi', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Tanggal') + th('GA Sep (pcs)', 1) + th('SSO Sep', 1) + th('GA / SSO', 1) + th('GA BIOMETRIC Sep', 1) + th('Selisih outlet vs BIOMETRIC', 1) + th('#Outlet active GA (KPI)', 1) + '</tr></thead><tbody>' + rowsS + totS + '</tbody></table></div>' +
        '<p class="note">Selisih besar di September (terutama 3ID) berarti GA BIOMETRIC mencatat lebih banyak GA daripada yang bisa dipetakan ke outlet di RGUGA; karena itu pertumbuhan 3ID Okt vs Sep level outlet bukan growth riil.</p>');
  }
  function gaSlab(list, brand, siteMode) {
    var G = gaPrep(), S = GA_SLABS, ncol = S.length, C = { list: siteMode ? gaSiteItems(list) : list, mi: G.mi };
    function counts(l) { var c = [], p = [], i; for (i = 0; i < ncol; i++) { c.push(0); p.push(0); } l.forEach(function (o) { var s = gaStat(o, brand); c[gaSlabIdx(s.cur)]++; p[gaSlabIdx(s.prev)]++; }); return { c: c, p: p, n: l.length }; }
    function rowFn(label, ket, l, style) {
      var x = counts(siteMode ? gaFlat(l) : l), ink = /ink/.test(style), bg = ink ? 'var(--ij-ink)' : (/wash/.test(style) ? 'var(--ij-wash)' : '#fff');
      var cells = S.map(function (sl, i) {
        var d = x.c[i] - x.p[i], good = i >= 3 ? d > 0 : (i === 0 ? d < 0 : null), clr = ink ? '#fff' : (d === 0 || good == null ? 'var(--ij-muted)' : (good ? '#166534' : '#991b1b'));
        return '<td class="num" style="' + (i === 0 ? DK_BL : '') + '"><b>' + fmtCount(x.c[i]) + '</b><div style="font-size:12px;">' + pctOf(x.c[i], x.n) + '%</div></td><td class="num" style="color:' + (ink ? '#fff' : 'var(--ij-muted)') + ';">' + fmtCount(x.p[i]) + '<div style="font-size:12px; color:' + clr + ';">' + (d === 0 ? '·' : (d > 0 ? '▲ ' : '▼ ') + fmtCount(Math.abs(d))) + '</div></td>';
      }).join('');
      return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur" style="' + DK_STICKY + ' background:' + bg + ';">' + label + '</td><td>' + ket + '</td><td class="num">' + fmtCount(x.n) + '</td>' + cells + '</tr>';
    }
    var T = uarTerrRows(C, rowFn), all = counts(list), good = all.c[3] + all.c[4], goodP = all.p[3] + all.p[4];
    var h1 = '<tr>' + dkStickyTh(siteMode ? 'Region / Area / MC / Site NBS' : 'Region / Area / MC', 2) + '<th rowspan="2" style="vertical-align:bottom;">DSO / ket.</th><th rowspan="2" class="num" style="vertical-align:bottom;">Outlet</th>' + S.map(function (sl, i) { var c = DK_COL[UAR_SLAB_KIND[i]]; return '<th colspan="2" style="text-align:center; background:' + c[0] + '; color:' + c[1] + ';' + DK_BL + '">' + sl[2] + '</th>'; }).join('') + '</tr>';
    var h2 = '<tr>' + S.map(function () { return '<th class="num" style="' + DK_BL + '">MTD</th><th class="num">LMTD</th>'; }).join('') + '</tr>';
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet slab atas (' + S[3][2] + ' dan ' + S[4][2] + ' GA)', fmtCount(good), (good - goodP >= 0 ? '+' : '') + fmtCount(good - goodP) + ' vs LMTD', good >= goodP ? 'up' : 'down', fmtCount(goodP) + ' di LMTD') +
      kpi('Outlet tanpa GA (' + S[0][2] + ')', fmtCount(all.c[0]), (all.c[0] - all.p[0] >= 0 ? '+' : '') + fmtCount(all.c[0] - all.p[0]) + ' vs LMTD', all.c[0] <= all.p[0] ? 'up' : 'down', pctOf(all.c[0], all.n) + '% dari outlet di cakupan') +
      kpi('SSO (≥ 1 GA)', fmtCount(all.n - all.c[0]), (all.p[0] - all.c[0] >= 0 ? '+' : '−') + fmtCount(Math.abs(all.p[0] - all.c[0])) + ' vs LMTD', all.c[0] <= all.p[0] ? 'up' : 'down', fmtCount(all.n - all.p[0]) + ' di LMTD') + '</div>';
    return cards + card('Slab SSO · MTD 1–' + G.cut + ' Okt vs LMTD 1–' + G.cut + ' Sep · ' + esc(scopeText()), uarAreaTools(T.mode) + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + h1 + h2 + '</thead><tbody>' + T.rows.join('') + '</tbody></table></div>' +
      '<p class="note">Tiap slab: jumlah outlet dengan GA per outlet pada MTD (tebal, dengan % outlet) dan LMTD (abu-abu, dengan selisih). Hijau = bergerak ke slab lebih baik, merah = memburuk. Slab: 0 · 1–2 · 3–4 · 5–9 · ≥ 10 GA, selaras dengan tier UAR 3 / 5 / 10 di program UAR Improvement.' + (siteMode ? ' Basis site: baris = site NBS, isi = jumlah outlet di site itu per slab; Slab 0 = outlet di site tanpa GA.' : '') + '</p>');
  }
  /* ---- two bases: SELL-IN OUTLET (tagging: which outlet recorded the MSISDN, basis of DSE incentives) and ACTIVATING SITE (location where the GA happened, basis of HoA / Region / DSO) ---- */
  function gaBasis() { return state.gaBasis || 'outlet'; }
  function gaLocRows() {
    var G = gaPrep(), L = G && G.src.metadata.location; if (!L || !L.kec || !L.kec.length) return null;
    return L.kec.filter(function (r) { var m = G.mi[r.mc] || {}; return (!state.branch || r.br === state.branch) && (!state.hoa || m.hoa === state.hoa) && (!state.kec || r.mc === state.kec); });
  }
  function gaLocV(r, brand, f) { var s = 0; ['IM3', '3ID'].forEach(function (b) { if ((brand === 'all' || brand === b) && r[b]) s += r[b][f] || 0; }); return s; }
  function gaTagMc(brand) {   // September tagging per MC from every outlet row (no territory filter): {mc: {t26, tf, u26}}
    var G = gaPrep(), key = '_tagmc|' + brand; if (G[key]) return G[key];
    var out = {}, cutL = G.src.metadata.location ? G.src.metadata.location.tag_cut : 26;
    G.list.forEach(function (o) {
      if (brand !== 'all' && !o.ids[brand]) return;
      var a = gaArr(o, brand, 's'), e = out[o.mc] || (out[o.mc] = { t26: 0, tf: 0, u26: 0 }), q = gaSum(a, 1, cutL);
      e.t26 += q; e.tf += gaSum(a, 1, 30); if (q > 0) e.u26++;
    });
    G[key] = out; return out;
  }
  function gaFlow(loc, tag) {
    var r = tag > 0 ? loc / tag : null;
    if (r == null) return dkTag('none', '—');
    return r > 1.15 ? dkTag('ok', 'Masuk · lokasi > outlet') : (r < 0.85 ? dkTag('warn', 'Keluar · outlet > lokasi') : dkTag('none', 'Seimbang'));
  }
  function gaNetCell(loc, tag) { var n = loc - tag; return '<td class="num cur"><b>' + (n >= 0 ? '+' : '−') + fmtCount(Math.abs(n)) + '</b></td><td class="num">' + (tag > 0 ? (loc / tag * 100).toFixed(0) + '%' : '—') + '</td><td>' + gaFlow(loc, tag) + '</td>'; }
  function gaRegionFlow(brand) {   // region level, from the GA BIOMETRIC control (location) against tagging at Inner Jakarta outlets
    var G = gaPrep(), out = {}, bo = gaCtl('bio', 'Oct', brand), bs = gaCtl('bio', 'Sep', brand), tagO = [], tagS = [], i, M = G.src.metadata;
    for (i = 0; i < 32; i++) { tagO.push(0); tagS.push(0); }
    G.list.forEach(function (o) { if (brand !== 'all' && !o.ids[brand]) return; var oo = gaArr(o, brand, 'o'), so = gaArr(o, brand, 's'); for (i = 1; i <= 31; i++) { tagO[i] += oo[i]; tagS[i] += so[i]; } });
    var octDays = bo ? Object.keys(bo).map(Number).filter(function (d) { return d <= G.cut; }) : [];
    out.oct = { days: octDays.length, loc: octDays.reduce(function (a, d) { return a + bo[d]; }, 0), tag: octDays.reduce(function (a, d) { return a + tagO[d]; }, 0) };
    out.sep = bs ? { loc: Object.keys(bs).reduce(function (a, d) { return a + bs[d]; }, 0), tag: gaSum(tagS, 1, 30) } : null;
    var outside = 0, blank = 0, T = M.tag || {};
    ['IM3', '3ID'].forEach(function (b) { if (brand === 'all' || brand === b) { Object.keys((T.oct_outside_ij || {})[b] || {}).forEach(function (d) { outside += T.oct_outside_ij[b][d]; }); Object.keys((T.oct_blank || {})[b] || {}).forEach(function (d) { blank += T.oct_blank[b][d]; }); } });
    out.outside = outside; out.blank = blank; out.tagOct13 = gaSum(tagO, 1, G.cut);
    return out;
  }
  function gaSiteNote(tab) {
    return '<div class="card" style="margin-top:10px; border-left:6px solid var(--ij-accent);"><h2 class="sect">Tab ini memakai basis Outlet sell-in</h2><p class="note">Basis <b>Lokasi aktivasi (site)</b> mengukur kinerja HoA, Region dan DSO dari tempat GA terjadi; lokasi tidak punya DSE maupun outlet, sehingga ' + (tab === 'slab' ? 'slab SSO' : (tab === 'dse' ? 'tabel per DSE' : 'daftar outlet')) + ' dan insentif DSE dihitung dari <b>tagging outlet</b>. <button type="button" class="btn" data-ga-basis="outlet">Pindah ke basis Outlet sell-in</button></p></div>';
  }
  function gaSiteM2S(list, brand) {
    var G = gaPrep(), rows = gaLocRows(), M = G.src.metadata, L = M.location || {};
    if (!rows) return card('GA per lokasi aktivasi', '<p class="note">Lokasi aktivasi per kecamatan belum tersedia: taruh <code>M2S KECAMATAN - YYYYMM.xlsb</code> di <code>raw/GA/</code> dan jalankan <code>python3 scripts/build_ga_feed.py</code>. Untuk Oktober, per-site belum ada di file apa pun; yang tersedia hanya total region (GA BIOMETRIC).</p>');
    var tagMc = gaTagMc(brand), items = rows.map(function (r) { return { mc: r.mc, dse: r.kec, r: r }; }), kecMode = !!state.kec, cutL = L.tag_cut || 26;
    function agg(l, perKec) {
      var loc = 0, sso = 0, tag = 0, tf = 0, seen = {};
      l.forEach(function (it) { loc += gaLocV(it.r, brand, 'gm'); sso += gaLocV(it.r, brand, 'sm'); if (perKec) { tag += gaLocV(it.r, brand, 't26'); tf += gaLocV(it.r, brand, 'tf'); } else if (!seen[it.mc]) { seen[it.mc] = 1; var t = tagMc[it.mc] || { t26: 0, tf: 0 }; tag += t.t26; tf += t.tf; } });
      return { loc: loc, sso: sso, tag: tag, tf: tf };
    }
    function rowFn(label, ket, l, style) {
      var a = agg(l, kecMode && !/ink/.test(style)), bg = /ink/.test(style) ? 'var(--ij-ink)' : (/wash/.test(style) ? 'var(--ij-wash)' : '#fff');
      return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur" style="' + DK_STICKY + ' background:' + bg + ';">' + label + '</td><td>' + ket + '</td><td class="num cur"><b>' + fmtCount(a.loc) + '</b></td><td class="num">' + fmtCount(a.sso) + '</td><td class="num">' + fmtCount(a.tag) + '</td>' + gaNetCell(a.loc, a.tag) + '<td class="num">' + fmtCount(a.tf) + '</td></tr>';
    }
    var T = uarTerrRows({ list: items, mi: G.mi }, rowFn), tot = agg(items, false), rf = gaRegionFlow(brand), unscoped = !(state.branch || state.hoa || state.kec);
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('GA di lokasi aktivasi · September', fmtCount(tot.loc) + ' pcs', 'SSO lokasi ' + fmtCount(tot.sso) + ' · MTD file M2S (setara GA BIOMETRIC ± 1–26 Sep untuk IM3)', 'up', 'basis lokasi: GA yang terjadi di site / kecamatan teritori ini, siapa pun outletnya') +
      kpi('GA tagging outlet · 1–' + cutL + ' Sep', fmtCount(tot.tag) + ' pcs', 'outlet di teritori ini mencatat GA yang sama jendelanya', 'up', 'basis tagging (dasar insentif DSE)') +
      kpi('Selisih lokasi − tagging', (tot.loc - tot.tag >= 0 ? '+' : '−') + fmtCount(Math.abs(tot.loc - tot.tag)) + ' pcs', tot.tag ? (tot.loc / tot.tag * 100).toFixed(0) + '% lokasi ÷ tagging' : '—', tot.loc >= tot.tag ? 'up' : 'down', brand === '3ID' || brand === 'all' ? '3ID: file lokasi memakai definisi RGUGA_TRADE yang lebih besar dari GA BIOMETRIC; selisih 3ID belum tentu aliran riil' : 'positif = GA aktif di sini tetapi dikreditkan ke outlet lain') +
'' + '</div>';
    var head = '<tr>' + th(T.mode === 'dse' ? 'Kecamatan' : 'Region / Area / MC') + th('DSO / ket.') + th('GA lokasi Sep (MTD)', 1) + th('SSO lokasi', 1) + th('GA tagging 1–' + cutL + ' Sep', 1) + th('Selisih', 1) + th('Lokasi ÷ tagging', 1) + th('Arah') + th('GA tagging Sep penuh', 1) + '</tr>';
    var dseNote = state.dse ? '<p class="note"><b>Filter DSE tidak berlaku di basis lokasi</b> (lokasi aktivasi tidak punya DSE); tabel memakai teritori Branch / HoA / MC saja.</p>' : '';
    return cards + card('GA per lokasi aktivasi (site) · ' + esc(scopeText()), dseNote + uarAreaTools(T.mode) + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head + '</thead><tbody>' + T.rows.join('') + '</tbody></table></div>' +
      '<p class="note">Lokasi = kecamatan site tempat GA terjadi (file M2S KECAMATAN, September saja, jumlah GA trad / SSO per kecamatan), dipetakan ke MC dan Area lewat MC dominan outlet di kecamatan itu (121 kecamatan, masing-masing hanya di satu MC). Tagging = GA yang dicatat outlet di MC itu (RGUGA). "Masuk" = GA aktif di lokasi ini lebih banyak daripada yang dicatat outlet lokasi ini (sebagian dikreditkan ke outlet lain); "Keluar" = kebalikannya. Level kecamatan: tagging hanya untuk outlet yang punya kecamatan di workbook (sebagian outlet 3ID September tidak punya). ' +
      (unscoped ? 'Total Inner Jakarta September: GA BIOMETRIC ' + (rf.sep ? fmtCount(rf.sep.loc) : '—') + ' vs tagging outlet IJ ' + (rf.sep ? fmtCount(rf.sep.tag) : '—') + '.' : '') + '</p>');
  }
  /* ---- basis Site NBS: GA outlet digulung per site (site NBS tempat outlet berada) → MC → Area; dasar kinerja HoA / DSO ---- */
  function gaSiteItems(list) {
    var g = {}, out = [];
    list.forEach(function (o) {
      var site = o.t === 'M' && o.site && o.site !== 'PENDING-NBS' ? o.site : (o.t === 'M' ? 'PENDING-NBS' : '(di luar master)'), k = o.mc + '||' + site, x = g[k];
      if (!x) { x = g[k] = { mc: o.mc, br: o.br, dse: site, site: site, list: [] }; out.push(x); }
      x.list.push(o);
    });
    return out;
  }
  function gaFlat(items) { var r = []; items.forEach(function (x) { r = r.concat(x.list); }); return r; }
  function gaSiteView(list, brand) {
    var G = gaPrep(), items = gaSiteItems(list), A = gaAgg(list, brand), C = { list: items, mi: G.mi };
    function siteStat(l) { var act = 0, tot = 0; l.forEach(function (x) { if (x.site === '(di luar master)' || x.site === 'PENDING-NBS') return; tot++; if (gaAgg(x.list, brand).q > 0) act++; }); return { act: act, tot: tot }; }
    function rowFn(label, ket, l, style) {
      var a = gaAgg(gaFlat(l), brand), ss = siteStat(l), ink = /ink/.test(style), bg = ink ? 'var(--ij-ink)' : (/wash/.test(style) ? 'var(--ij-wash)' : '#fff');
      return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur" style="' + DK_STICKY + ' background:' + bg + ';">' + label + '</td><td>' + ket + '</td><td class="num">' + (ss.tot ? fmtCount(ss.act) + ' / ' + fmtCount(ss.tot) : '·') + '</td><td class="num">' + (ss.tot ? fmtCount(ss.tot - ss.act) : '·') + '</td>' + gaCells(a) + '</tr>';
    }
    var T = uarTerrRows(C, rowFn), all = siteStat(items), prevAct = 0;
    items.forEach(function (x) { if (x.site !== '(di luar master)' && x.site !== 'PENDING-NBS' && gaAgg(x.list, brand).p > 0) prevAct++; });
    var cards = gaCards(A, brand, kpi('Site NBS aktif GA (MTD)', fmtCount(all.act) + ' / ' + fmtCount(all.tot), fmtCount(all.tot - all.act) + ' site tanpa GA MTD · LMTD ' + fmtCount(prevAct) + ' site aktif', all.act >= prevAct ? 'up' : 'down', 'site = site NBS tempat outlet berada (' + (all.tot ? pctOf(all.act, all.tot) : '0') + '% aktif)'));
    var head = '<tr>' + th(T.mode === 'dse' ? 'Site NBS' : 'Region / Area / MC') + th('DSO / ket.') + th('Site aktif / total', 1) + th('Site tanpa GA', 1) + gaHeadCells() + '</tr>';
    return cards + gaOverall() + card('GA dan SSO per site NBS · ' + esc(scopeText()), uarAreaTools(T.mode) + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head + '</thead><tbody>' + T.rows.join('') + '</tbody></table></div>' +
      '<p class="note">Basis site: GA outlet (Daily_RGUGA) dijumlahkan per site NBS tempat outlet berada, lalu naik ke MC, Area, DSO dan HoA. Ini GA yang dicatat outlet di site tersebut, bukan lokasi aktivasi sebenarnya; lokasi aktivasi hanya ada untuk September (file M2S per kecamatan, tab Distribusi &amp; Roaming), Oktober per site belum ada di file mana pun. Outlet di luar master tidak punya site NBS: dikelompokkan "(di luar master)" per MC dan tetap ikut total MC dan Area. Pilih satu MC di header untuk melihat daftar site; Gap = MTD − Last FM.</p>') +
      '<h3 style="font:800 14px var(--ij-font); text-transform:uppercase; margin:22px 0 0;">Referensi · lokasi aktivasi sebenarnya (M2S per kecamatan, September saja)</h3>' + gaSiteM2S(list, brand);
  }
  function gaRoaming(list, brand) {
    var G = gaPrep(), rows = gaLocRows(), M = G.src.metadata, rf = gaRegionFlow(brand), cutL = (M.location || {}).tag_cut || 26, tagMc = gaTagMc(brand), mi = G.mi;
    var net = function (a, b) { return (a - b >= 0 ? '+' : '−') + fmtCount(Math.abs(a - b)); };
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Oktober 1–' + (rf.oct.days || '—') + ' · lokasi vs tagging IJ', rf.oct.days ? fmtCount(rf.oct.loc) + ' vs ' + fmtCount(rf.oct.tag) : '—', rf.oct.days ? 'selisih ' + net(rf.oct.loc, rf.oct.tag) + ' pcs (' + (rf.oct.tag ? (rf.oct.loc / rf.oct.tag * 100).toFixed(1) : '—') + '%)' : '', 'up', 'GA BIOMETRIC (lokasi, Inner Jakarta) vs GA yang dicatat outlet Inner Jakarta; hanya sampai 7 Okt') +
      kpi('September · lokasi vs tagging IJ', rf.sep ? fmtCount(rf.sep.loc) + ' vs ' + fmtCount(rf.sep.tag) : '—', rf.sep ? 'selisih ' + net(rf.sep.loc, rf.sep.tag) + ' pcs (' + (rf.sep.tag ? (rf.sep.loc / rf.sep.tag * 100).toFixed(1) : '—') + '%)' : '', 'up', 'bulan penuh; tagging dari pivot raw September (outlet Inner Jakarta)') +
      kpi('GA dicatat outlet di luar Inner Jakarta', fmtCount(rf.outside), 'Okt 1–' + G.cut + ' · ' + (rf.tagOct13 ? (rf.outside / rf.tagOct13).toFixed(1) : '—') + '× GA outlet IJ', 'down', 'pivot raw Oktober berisi seluruh outlet nasional; lokasi aktivasinya tidak diketahui, tidak otomatis GA di Inner Jakarta') +
      kpi('GA tanpa tag outlet', fmtCount(rf.blank), 'Okt 1–' + G.cut + ' · baris (blank) di raw', 'down', 'MSISDN tanpa outlet; tidak bisa dikaitkan ke DSE maupun site') + '</div>';
    var body = '';
    if (rows) {
      var byMc = {}, byA = {};
      rows.forEach(function (r) { var m = byMc[r.mc] || (byMc[r.mc] = { mc: r.mc, br: r.br, loc: 0 }); m.loc += gaLocV(r, brand, 'gm'); });
      Object.keys(byMc).forEach(function (k) { var m = byMc[k], t = tagMc[k] || { t26: 0 }; m.tag = t.t26; m.net = m.loc - m.tag; var a = byA[m.br] || (byA[m.br] = { br: m.br, loc: 0, tag: 0 }); a.loc += m.loc; a.tag += m.tag; });
      var areaRows = Object.keys(byA).sort(function (x, y) { return byA[y].loc - byA[x].loc; }).map(function (k) { var a = byA[k]; return '<tr><td class="cur"><b>' + esc(k) + '</b></td><td class="num">' + fmtCount(a.loc) + '</td><td class="num">' + fmtCount(a.tag) + '</td>' + gaNetCell(a.loc, a.tag) + '</tr>'; }).join('');
      var mcl = Object.keys(byMc).map(function (k) { return byMc[k]; }), inb = mcl.slice().sort(function (a, b) { return b.net - a.net; }).slice(0, 8), outb = mcl.slice().sort(function (a, b) { return a.net - b.net; }).slice(0, 8);
      var mcT = function (arr) { return '<table class="tbl" data-nosort="1"><thead><tr>' + th('MC · Area') + th('GA lokasi', 1) + th('GA tagging', 1) + th('Selisih', 1) + '</tr></thead><tbody>' + arr.map(function (m) { return '<tr><td class="cur"><b>' + esc(m.mc) + '</b><br><span class="note">' + esc(m.br) + ' · DSO ' + esc((mi[m.mc] || {}).dso || '—') + '</span></td><td class="num">' + fmtCount(m.loc) + '</td><td class="num">' + fmtCount(m.tag) + '</td><td class="num cur"><b>' + (m.net >= 0 ? '+' : '−') + fmtCount(Math.abs(m.net)) + '</b></td></tr>'; }).join('') + '</tbody></table>'; };
      var kk = rows.filter(function (r) { return gaLocV(r, brand, 't26') > 0 || brand === 'IM3'; }).map(function (r) { var l = gaLocV(r, brand, 'gm'), t = gaLocV(r, brand, 't26'); return { r: r, l: l, t: t, n: l - t }; });
      var kT = function (arr) { return '<table class="tbl" data-nosort="1"><thead><tr>' + th('Kecamatan · MC') + th('GA lokasi', 1) + th('GA tagging', 1) + th('Selisih', 1) + '</tr></thead><tbody>' + arr.map(function (x) { return '<tr><td class="cur"><b>' + esc(x.r.kec) + '</b><br><span class="note">' + esc(x.r.mc) + '</span></td><td class="num">' + fmtCount(x.l) + '</td><td class="num">' + fmtCount(x.t) + '</td><td class="num cur"><b>' + (x.n >= 0 ? '+' : '−') + fmtCount(Math.abs(x.n)) + '</b></td></tr>'; }).join('') + '</tbody></table>'; };
      body += card('Aliran GA bersih per Area · September (lokasi aktivasi vs tagging outlet 1–' + cutL + ' Sep) · ' + esc(scopeText()),
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area') + th('GA lokasi', 1) + th('GA tagging', 1) + th('Selisih', 1) + th('Lokasi ÷ tagging', 1) + th('Arah') + '</tr></thead><tbody>' + areaRows + '</tbody></table></div>' +
        '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:18px; margin-top:14px;"><div><div class="map-label">MC dengan GA "masuk" terbesar (lokasi > tagging)</div><div class="tbl-wrap">' + mcT(inb) + '</div></div><div><div class="map-label">MC dengan GA "keluar" terbesar (tagging > lokasi)</div><div class="tbl-wrap">' + mcT(outb) + '</div></div></div>' +
        '<div style="display:grid; grid-template-columns: 1fr 1fr; gap:18px; margin-top:14px;"><div><div class="map-label">Kecamatan "masuk" terbesar</div><div class="tbl-wrap">' + kT(kk.slice().sort(function (a, b) { return b.n - a.n; }).slice(0, 10)) + '</div></div><div><div class="map-label">Kecamatan "keluar" terbesar</div><div class="tbl-wrap">' + kT(kk.slice().sort(function (a, b) { return a.n - b.n; }).slice(0, 10)) + '</div></div></div>' +
        '<p class="note">Ini selisih bersih per teritori, bukan matriks asal-tujuan: angka lokasi dan tagging berasal dari dua file berbeda yang tidak saling memuat pasangan (lokasi × outlet). Selisih per kecamatan IM3 dapat dipercaya; untuk 3ID tagging per kecamatan hanya mencakup outlet yang punya kecamatan di workbook, dan total lokasi 3ID memakai definisi RGUGA_TRADE yang lebih besar dari GA BIOMETRIC, jadi baca MC / Area lebih dulu.</p>');
    } else body += card('Aliran GA per teritori', '<p class="note">Lokasi aktivasi per kecamatan belum tersedia (file M2S KECAMATAN).</p>');
    return cards + (state.dse ? '<p class="note">Filter DSE tidak berlaku di tab ini (lokasi aktivasi dan total region tidak punya DSE); tabel memakai teritori Branch / HoA / MC.</p>' : '') + body;
  }
  function viewGrossAdd() {
    var G = gaPrep(); if (!G) return card('Gross Add', '<p class="note">Feed GA belum dibangun. Taruh Daily_RGUGA_OUTLET_*.xlsb di <code>raw/GA/</code> lalu jalankan <code>python3 scripts/build_ga_feed.py</code>.</p>');
    var tab = state.gaTab || 'ringkasan', list = gaScopeList(), brand = gaBrand();
    var body;
    if (tab === 'sga') body = viewSlabSga('ga');
    else if (tab === 'roaming') body = gaRoaming(list, brand);
    else if (gaBasis() === 'site' && tab === 'ringkasan') body = gaSiteView(list, brand);
    else body = tab === 'dse' ? gaDse(list, brand) : (tab === 'outlet' ? gaOutlet(list, brand) : (tab === 'harian' ? gaHarian(list, brand) : (tab === 'slab' ? gaSlab(list, brand, gaBasis() === 'site') : gaRingkasan(list, brand))));
    return gaTabNav() + body;
  }


  /* ================= SLAB SELL-IN / GA SP / SALDO · bulan lalu (FM dan LMTD) vs bulan ini (MTD), flag gap ================= */
  var SG_PCS = [[101, Infinity, '> 100'], [61, 100, '60–100'], [31, 60, '30–60'], [11, 30, '10–30'], [1, 10, '1–10']];   // [from, to, label]; the upper bound belongs to the lower slab
  var SG_RP = PJ_SLABS_RP.slice(1).reverse();                                                                              // the existing Rupiah slabs, highest first
  var SG_LABEL = { si: 'Sell-in SP (pcs)', ga: 'GA SP (pcs)', sal: 'Saldo Mobo (Rp)' };
  function sgSlabs(m) { return m === 'sal' ? SG_RP : SG_PCS; }
  function sgIdx(S, x) { if (!(x > 0)) return S.length; for (var i = 0; i < S.length; i++) if (x >= S[i][0]) return i; return S.length - 1; }   // S.length = no volume
  function sgFmt(m, v) { return m === 'sal' ? pjRp(v) : fmtCount(Math.round(v)); }
  function sgVal(o, m, G) {
    var c = o.c || {};
    if (m === 'si') { var a = c.SP || []; return [a[0] || 0, a[2] || 0, a[4] || 0]; }
    if (m === 'sal') { var b = c.SALMO || []; return [b[1] || 0, b[3] || 0, b[5] || 0]; }
    var g = G && G.by[o.k], st = g ? gaStat(g, 'all') : null; return st ? [st.cur, st.prev, st.full] : [0, 0, 0];
  }
  var _sgMode = 'pj';   // 'pj' = Penjualan ke Outlet (Sell-in SP and Saldo); 'ga' = Gross Add (GA SP only)
  function sgCtx() {
    var P = pjFeed(); if (!P) return null;
    var m = _sgMode === 'ga' ? 'ga' : (state.sgaMetric === 'sal' ? 'sal' : 'si'), G = m === 'ga' ? gaPrep() : null;
    if (m === 'ga' && !G) return { P: P, m: m, missing: true };
    var mi = P.metadata.mc_info || {}, list = pjOutlets(P).filter(function (o) { return o.tier === 'M'; });
    var S = sgSlabs(m);
    list.forEach(function (o) { o._sg = sgVal(o, m, G); o._sl = [sgIdx(S, o._sg[0]), sgIdx(S, o._sg[1]), sgIdx(S, o._sg[2])]; });
    return { P: P, m: m, G: G, S: S, list: list, mi: mi, cut: P.metadata.cut_day, gcut: G ? G.cut : null };
  }
  function sgCount(list, S) {   // counts[period][slab] and totals; periods: 0 = MTD (this month), 1 = LMTD, 2 = FM
    var cnt = [0, 1, 2].map(function () { return S.map(function () { return 0; }); }), sum = [0, 0, 0], act = [0, 0, 0], none = [0, 0, 0];
    list.forEach(function (o) { for (var p = 0; p < 3; p++) { sum[p] += o._sg[p]; if (o._sl[p] < S.length) { cnt[p][o._sl[p]]++; act[p]++; } else none[p]++; } });
    return { cnt: cnt, sum: sum, act: act, none: none, n: list.length };
  }
  function sgNav(C) {
    var tabs = [['outlet', '🏪 Slab Outlet'], ['dse', '👤 Slab DSE'], ['flag', '🚩 Flag Gap Outlet & DSE']];
    var thrOpts = C.m === 'sal' ? [500000, 1000000, 2000000, 5000000] : [10, 30, 60], thr = (state.sgaThr || {})[C.m] || thrOpts[1];
    var tabNav = '<div class="sub-nav" role="tablist">' + tabs.map(function (x) { var a = (state.sgaTab || 'outlet') === x[0]; return '<button type="button" role="tab" class="sub-nav-btn' + (a ? ' active' : '') + '" data-sga-tab="' + x[0] + '" aria-selected="' + a + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var bar = '<div class="map-toolbar" style="margin-top:8px;">' + (_sgMode === 'ga' ? '<div class="map-toolbar-group"><span class="map-label">Metrik:</span><span class="chip">GA SP (pcs) · Daily_RGUGA_OUTLET</span></div>' : sellinBtnGroup('Metrik', 'sga-metric', [['si', 'Sell-in SP (pcs)'], ['sal', 'Saldo (Rp)']], C.m)) +
      ((state.sgaTab || 'outlet') === 'flag' ? sellinBtnGroup('Gap terhadap', 'sga-base', [['lm', 'Bulan lalu LMTD'], ['fm', 'Bulan lalu penuh (FM)']], state.sgaBase || 'lm') +
        sellinBtnGroup('Gap besar ≥', 'sga-thr', thrOpts.map(function (v) { return [String(v), C.m === 'sal' ? pjRp(v) : v + ' pcs']; }), String(thr)) : '') + '</div>';
    return tabNav + bar;
  }
  function sgCell(c, k, S) {   // big = this month (MTD), small = LMTD / FM
    var a = c.cnt[0][k], b = c.cnt[1][k], f = c.cnt[2][k];
    if (!a && !b && !f) return '<td class="num" style="color:var(--ij-muted);">·</td>';
    var clr = a > b ? '#166534' : (a < b ? '#991b1b' : 'inherit');
    return '<td class="num"><b style="color:' + clr + ';">' + fmtCount(a) + '</b><div class="note" style="font-size:11.5px;">' + fmtCount(b) + ' / ' + fmtCount(f) + '</div></td>';
  }
  function sgHeadSlabs(S) { return S.map(function (x) { return '<th class="num">' + x[2] + '</th>'; }).join(''); }
  var SG_NOTE = 'Besar = bulan ini (MTD), kecil = bulan lalu LMTD / bulan lalu penuh (FM). Hijau = lebih banyak outlet di slab itu dibanding LMTD. Batas atas slab masuk ke slab yang lebih rendah. Hanya outlet master di lingkup filter; migrasi sistem MOBII / MOBO membuat awal Oktober (1–9 Okt) rendah, jadi MTD terlihat lebih kecil dari semestinya.';

  function sgOutletView(C) {
    var T = sgCount(C.list, C.S), S = C.S, rows = '';
    var cur = ['MTD ' + 'Okt', 'LMTD Sep', 'FM Sep'];
    S.forEach(function (x, k) {
      var a = T.cnt[0][k], b = T.cnt[1][k], f = T.cnt[2][k];
      function pcs(p) { var t = 0; C.list.forEach(function (o) { if (o._sl[p] === k) t += o._sg[p]; }); return t; }
      rows += '<tr><td class="cur"><b>' + x[2] + '</b></td><td class="num"><b>' + fmtCount(a) + '</b></td><td class="num">' + sgFmt(C.m, pcs(0)) + '</td><td class="num">' + fmtCount(b) + '</td><td class="num">' + sgFmt(C.m, pcs(1)) + '</td><td class="num">' + fmtCount(f) + '</td><td class="num">' + sgFmt(C.m, pcs(2)) + '</td>' +
        '<td class="num">' + uarGTag(b ? (a / b - 1) * 100 : (a ? null : 0)) + ' <span class="note">' + (a - b >= 0 ? '+' : '') + fmtCount(a - b) + '</span></td><td class="num">' + uarGTag(f ? (a / f - 1) * 100 : (a ? null : 0)) + ' <span class="note">' + (a - f >= 0 ? '+' : '') + fmtCount(a - f) + '</span></td></tr>';
    });
    rows += '<tr><td class="cur">Tanpa volume (0)</td><td class="num">' + fmtCount(T.none[0]) + '</td><td class="num">·</td><td class="num">' + fmtCount(T.none[1]) + '</td><td class="num">·</td><td class="num">' + fmtCount(T.none[2]) + '</td><td class="num">·</td><td></td><td></td></tr>';
    rows += '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td class="cur" style="background:var(--ink); color:#fff;">TOTAL · ' + fmtCount(T.n) + ' outlet</td><td class="num">' + fmtCount(T.act[0]) + ' aktif</td><td class="num">' + sgFmt(C.m, T.sum[0]) + '</td><td class="num">' + fmtCount(T.act[1]) + ' aktif</td><td class="num">' + sgFmt(C.m, T.sum[1]) + '</td><td class="num">' + fmtCount(T.act[2]) + ' aktif</td><td class="num">' + sgFmt(C.m, T.sum[2]) + '</td><td class="num">' + (T.sum[1] ? ((T.sum[0] / T.sum[1] - 1) * 100).toFixed(1) + '%' : '—') + '</td><td class="num">' + (T.sum[2] ? ((T.sum[0] / T.sum[2] - 1) * 100).toFixed(1) + '%' : '—') + '</td></tr>';
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet aktif MTD (' + SG_LABEL[C.m] + ')', fmtCount(T.act[0]), 'LMTD ' + fmtCount(T.act[1]) + ' · FM ' + fmtCount(T.act[2]), T.act[0] >= T.act[1] ? 'up' : 'down', pctOf(T.act[0], T.n) + '% dari ' + fmtCount(T.n) + ' outlet master') +
      kpi('Volume MTD', sgFmt(C.m, T.sum[0]), 'LMTD ' + sgFmt(C.m, T.sum[1]) + ' · FM ' + sgFmt(C.m, T.sum[2]), T.sum[0] >= T.sum[1] ? 'up' : 'down', 'MTD Okt 1–' + (C.m === 'ga' && C.gcut ? C.gcut : C.cut) + ' vs Sep 1–' + (C.m === 'ga' && C.gcut ? C.gcut : C.cut)) +
      kpi('Slab teratas (' + S[0][2] + ')', fmtCount(T.cnt[0][0]), 'LMTD ' + fmtCount(T.cnt[1][0]) + ' · FM ' + fmtCount(T.cnt[2][0]), T.cnt[0][0] >= T.cnt[1][0] ? 'up' : 'down', 'outlet dengan volume tertinggi') + '</div>';
    var main = card('Slab ' + SG_LABEL[C.m] + ' · jumlah outlet per slab · ' + esc(scopeText()),
      '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('Slab') + th('Outlet MTD', 1) + th('Volume MTD', 1) + th('Outlet LMTD', 1) + th('Volume LMTD', 1) + th('Outlet FM', 1) + th('Volume FM', 1) + th('MTD vs LMTD', 1) + th('MTD vs FM', 1) + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="note">LMTD = 1–' + (C.m === 'ga' && C.gcut ? C.gcut : C.cut) + ' September (hari yang sama); FM = September penuh. Kolom Volume = jumlah ' + SG_LABEL[C.m] + ' dari outlet di slab itu.</p>');
    function rowFn(label, ket, l, style) {
      var c = sgCount(l, S), bg = /ink/.test(style) ? 'var(--ij-ink)' : (/wash/.test(style) ? 'var(--ij-wash)' : '#fff');
      return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur" style="' + DK_STICKY + ' background:' + bg + ';">' + label + '</td><td>' + ket + '</td><td class="num">' + fmtCount(c.n) + '</td>' +
        '<td class="num"><b>' + fmtCount(c.act[0]) + '</b><div class="note" style="font-size:11.5px;">' + fmtCount(c.act[1]) + ' / ' + fmtCount(c.act[2]) + '</div></td>' + S.map(function (x, k) { return sgCell(c, k, S); }).join('') +
        '<td class="num"><b>' + sgFmt(C.m, c.sum[0]) + '</b><div class="note" style="font-size:11.5px;">' + sgFmt(C.m, c.sum[1]) + ' / ' + sgFmt(C.m, c.sum[2]) + '</div></td></tr>';
    }
    var TR = uarTerrRows({ list: C.list, mi: C.mi }, rowFn);
    var terr = card('Slab per teritori · ' + esc(scopeText()), uarAreaTools(TR.mode) + '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th(TR.mode === 'dse' ? 'DSE' : 'Region / Area / MC') + th('DSO / ket.') + th('Outlet master', 1) + th('Outlet aktif', 1) + sgHeadSlabs(S) + th('Volume', 1) + '</tr></thead><tbody>' + TR.rows.join('') + '</tbody></table></div><p class="note">' + SG_NOTE + '</p>');
    return cards + main + terr;
  }

  function sgDseGroups(C) {
    var g = {};
    C.list.forEach(function (o) { var d = uarDse(o), k = o.mc + '||' + d, x = g[k] || (g[k] = { key: k, dse: d, mc: o.mc, br: (C.mi[o.mc] || {}).br || '—', list: [] }); x.list.push(o); });
    return Object.keys(g).map(function (k) { var x = g[k]; x.c = sgCount(x.list, C.S); x.gap = x.c.sum[1] - x.c.sum[0]; return x; });
  }
  function sgDseView(C) {
    var q = (state.sgaSearch || '').toLowerCase(), S = C.S, ps = 50;
    var G = sgDseGroups(C).filter(function (x) { return !q || (x.dse + ' ' + x.mc + ' ' + x.br).toLowerCase().indexOf(q) !== -1; }).sort(function (a, b) { return b.gap - a.gap; });
    var tp = Math.ceil(G.length / ps) || 1, page = Math.min(state.sgaPage || 1, tp); state.sgaPage = page;
    var body = G.slice((page - 1) * ps, page * ps).map(function (x) {
      var c = x.c, gcls = x.gap > 0 ? '#991b1b' : '#166534';
      return '<tr><td class="cur" style="' + DK_STICKY + ' background:#fff;"><b>' + dseHtml(x.dse) + '</b></td><td>' + esc(x.mc) + '<div class="note">' + esc(x.br) + '</div></td><td class="num">' + fmtCount(c.n) + '</td>' +
        '<td class="num"><b>' + fmtCount(c.act[0]) + '</b><div class="note" style="font-size:11.5px;">' + fmtCount(c.act[1]) + ' / ' + fmtCount(c.act[2]) + '</div></td>' + S.map(function (y, k) { return sgCell(c, k, S); }).join('') +
        '<td class="num"><b>' + sgFmt(C.m, c.sum[0]) + '</b><div class="note" style="font-size:11.5px;">' + sgFmt(C.m, c.sum[1]) + ' / ' + sgFmt(C.m, c.sum[2]) + '</div></td><td class="num" style="color:' + gcls + ';"><b>' + (x.gap > 0 ? '−' : '+') + sgFmt(C.m, Math.abs(x.gap)) + '</b></td></tr>';
    }).join('');
    var T = sgCount(C.list, S);
    var tot = '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td class="cur" style="background:var(--ink); color:#fff;">TOTAL · ' + fmtCount(G.length) + ' DSE</td><td></td><td class="num">' + fmtCount(T.n) + '</td><td class="num">' + fmtCount(T.act[0]) + '</td>' + S.map(function (y, k) { return '<td class="num">' + fmtCount(T.cnt[0][k]) + '</td>'; }).join('') + '<td class="num">' + sgFmt(C.m, T.sum[0]) + '</td><td class="num">' + (T.sum[1] > T.sum[0] ? '−' : '+') + sgFmt(C.m, Math.abs(T.sum[1] - T.sum[0])) + '</td></tr>';
    return card('Slab per DSE · ' + SG_LABEL[C.m] + ' · ' + esc(scopeText()),
      '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group"><input type="text" id="sgaSearchInput" aria-label="Cari DSE atau MC" placeholder="🔍 Cari DSE, MC, area..." value="' + esc(state.sgaSearch || '') + '" class="map-select" style="min-width:240px;"><span class="note">Diurutkan dari gap terbesar terhadap LMTD.</span></div></div>' +
      '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('DSE') + th('MC') + th('Outlet', 1) + th('Outlet aktif', 1) + sgHeadSlabs(S) + th('Volume', 1) + th('Gap vs LMTD', 1) + '</tr></thead><tbody>' + body + tot + '</tbody></table></div>' +
      (tp > 1 ? mbPager('sga-page', page, tp, 'DSE ' + ((page - 1) * ps + 1) + '–' + Math.min(page * ps, G.length) + ' dari ' + fmtCount(G.length)) : '') + '<p class="note">Isi tiap kolom slab = jumlah outlet DSE itu di slab tersebut. ' + SG_NOTE + '</p>');
  }

  /* ---- flag gap: outlets and DSEs whose volume fell far below last month, with likely reasons ---- */
  var _sgReason = null;
  function sgReasons() {
    if (_sgReason) return _sgReason;
    var R = { nv: {}, zs: {}, hasEb: false, dem: {}, hasDem: false }, vf = (typeof mbVisitsFeed === 'function') ? mbVisitsFeed() : null;
    if (vf && vf.unvisited_outlets) vf.unvisited_outlets.forEach(function (u) { if (u.w === 'mtd') R.nv[u.k] = 1; });
    var eb = ebFeed(); if (eb) { R.hasEb = true; eb.outlets.forEach(function (o) { if ((o.st || 0) <= 0) R.zs[o.k] = 1; else R.zs[o.k] = 0; }); }
    var D = poFeed(); if (D) { R.hasDem = true; D.outlets.forEach(function (o) { var v = 0; Object.keys(o.c || {}).forEach(function (c) { if (c !== 'SPI') v += o.c[c][1] || 0; }); if (v > 0) R.dem[o.k] = 1; }); }
    return (_sgReason = R);
  }
  function sgFlagRows(C) {
    var base = state.sgaBase === 'fm' ? 2 : 1, thr = (state.sgaThr || {})[C.m] || (C.m === 'sal' ? 2000000 : 30), R = sgReasons(), S = C.S, out = [];
    C.list.forEach(function (o) {
      var cur = o._sg[0], bv = o._sg[base], gap = bv - cur, lost = bv > 0 && cur <= 0, drop = o._sl[0] - o._sl[base] >= 2 && bv > 0, big = gap >= thr;
      if (!(lost || drop || big)) return;
      var why = [];
      if (R.nv[o.k]) why.push(['bad', 'Belum divisit MTD']);
      if (R.hasEb && R.zs[o.k] === 1) why.push(['bad', 'Stok saldo 0']);
      if (R.hasDem && !R.dem[o.k]) why.push(['warn', 'Tanpa demand MTD']);
      if (dseIsNone(o.dse)) why.push(['warn', 'ADHOC (tanpa DSE)']);
      if (C.m !== 'si' && !(o.c && o.c.SP && o.c.SP[0] > 0)) why.push(['warn', 'Tanpa sell-in SP MTD']);
      if (C.m === 'si' && C.G === null) { /* GA cross-check needs the GA feed */ }
      out.push({ o: o, cur: cur, base: bv, gap: gap, lost: lost, drop: drop, big: big, why: why, sl: o._sl });
    });
    return out;
  }
  function sgFlagView(C) {
    var rows = sgFlagRows(C), q = (state.sgaSearch || '').toLowerCase(), seg = state.sgaSeg || 'all', view = state.sgaFlag || 'outlet', S = C.S, bl = state.sgaBase === 'fm' ? 'FM' : 'LMTD';
    var n = { all: rows.length, lost: rows.filter(function (r) { return r.lost; }).length, drop: rows.filter(function (r) { return r.drop; }).length, big: rows.filter(function (r) { return r.big; }).length };
    var f = rows.filter(function (r) { return (seg === 'all' || (seg === 'lost' && r.lost) || (seg === 'drop' && r.drop) || (seg === 'big' && r.big)) && (!q || ((r.o.n || '') + ' ' + r.o.id + ' ' + (r.o.site || '') + ' ' + r.o.mc + ' ' + uarDse(r.o)).toLowerCase().indexOf(q) !== -1); });
    var totGap = rows.reduce(function (a, r) { return a + Math.max(0, r.gap); }, 0);
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet ber-flag', fmtCount(n.all), pctOf(n.all, C.list.length) + '% dari ' + fmtCount(C.list.length) + ' outlet', 'down', 'gap ' + bl + ' besar, hilang, atau turun ≥ 2 slab') +
      kpi('Hilang (' + bl + ' ada, MTD 0)', fmtCount(n.lost), 'prioritas pertama', 'down', 'outlet yang berhenti') +
      kpi('Turun ≥ 2 slab', fmtCount(n.drop), 'dibanding ' + bl, 'down', 'penurunan tajam') +
      kpi('Total gap outlet ber-flag', sgFmt(C.m, totGap), SG_LABEL[C.m] + ' terhadap ' + bl, 'down', 'jumlah penurunan dari outlet ber-flag') + '</div>';
    var segBar = sellinBtnGroup('Segmen', 'sga-seg', [['all', 'Semua (' + fmtCount(n.all) + ')'], ['lost', 'Hilang (' + fmtCount(n.lost) + ')'], ['drop', 'Turun ≥ 2 slab (' + fmtCount(n.drop) + ')'], ['big', 'Gap besar (' + fmtCount(n.big) + ')']], seg) + sellinBtnGroup('Tampilan', 'sga-flag', [['outlet', '🏪 Daftar outlet'], ['dse', '👤 Daftar DSE']], view);
    var search = '<div class="map-toolbar-group"><input type="text" id="sgaSearchInput" aria-label="Cari outlet, DSE, site atau MC" placeholder="🔍 Cari outlet, ID, site, DSE, MC..." value="' + esc(state.sgaSearch || '') + '" class="map-select" style="min-width:240px;"><button type="button" class="btn" data-act="sga-export">📥 Export CSV</button></div>';
    var tools = '<div class="map-toolbar" style="margin:10px 0 8px;">' + segBar + search + '</div>';
    var ps = 50, body, head, pager = '';
    var chip = function (w) { return w.map(function (x) { return dkTag(x[0], x[1]); }).join(' ') || '<span class="note">tidak ada penyebab terdeteksi</span>'; };
    var lvl = function (i) { return i >= S.length ? 'tanpa volume' : S[i][2]; };
    if (view === 'dse') {
      var g = {}; f.forEach(function (r) { var d = uarDse(r.o), k = r.o.mc + '||' + d, x = g[k] || (g[k] = { dse: d, mc: r.o.mc, n: 0, gap: 0, lost: 0, nv: 0, zs: 0, dem: 0, ad: 0 }); x.n++; x.gap += Math.max(0, r.gap); if (r.lost) x.lost++; r.why.forEach(function (w) { if (w[1] === 'Belum divisit MTD') x.nv++; else if (w[1] === 'Stok saldo 0') x.zs++; else if (w[1] === 'Tanpa demand MTD') x.dem++; }); });
      var tot = {}; sgDseGroups(C).forEach(function (x) { tot[x.mc + '||' + x.dse] = x.list.length; });
      var L = Object.keys(g).map(function (k) { var x = g[k]; x.all = tot[k] || x.n; return x; }).sort(function (a, b) { return b.gap - a.gap; });
      var tp = Math.ceil(L.length / ps) || 1, page = Math.min(state.sgaPage || 1, tp); state.sgaPage = page;
      head = '<tr>' + th('DSE') + th('MC') + th('Outlet ber-flag', 1) + th('% dari outlet DSE', 1) + th('Hilang', 1) + th('Total gap', 1) + th('Belum divisit MTD', 1) + th('Stok saldo 0', 1) + th('Tanpa demand', 1) + '</tr>';
      body = L.slice((page - 1) * ps, page * ps).map(function (x) { return '<tr><td class="cur"><b>' + dseHtml(x.dse) + '</b></td><td>' + esc(x.mc) + '</td><td class="num"><b>' + fmtCount(x.n) + '</b></td><td class="num">' + pctOf(x.n, x.all) + '%</td><td class="num">' + fmtCount(x.lost) + '</td><td class="num"><b>' + sgFmt(C.m, x.gap) + '</b></td><td class="num">' + pctOf(x.nv, x.n) + '%</td><td class="num">' + pctOf(x.zs, x.n) + '%</td><td class="num">' + pctOf(x.dem, x.n) + '%</td></tr>'; }).join('');
      if (L.length > 1) {
        var Z = { n: 0, all: 0, lost: 0, gap: 0, nv: 0, zs: 0, dem: 0 }; L.forEach(function (x) { Z.n += x.n; Z.all += x.all; Z.lost += x.lost; Z.gap += x.gap; Z.nv += x.nv; Z.zs += x.zs; Z.dem += x.dem; });
        body += '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td class="cur" style="background:var(--ink); color:#fff;">TOTAL · ' + fmtCount(L.length) + ' DSE</td><td></td><td class="num">' + fmtCount(Z.n) + '</td><td class="num">' + pctOf(Z.n, Z.all) + '%</td><td class="num">' + fmtCount(Z.lost) + '</td><td class="num">' + sgFmt(C.m, Z.gap) + '</td><td class="num">' + pctOf(Z.nv, Z.n) + '%</td><td class="num">' + pctOf(Z.zs, Z.n) + '%</td><td class="num">' + pctOf(Z.dem, Z.n) + '%</td></tr>';
      }
      if (tp > 1) pager = mbPager('sga-page', page, tp, 'DSE ' + ((page - 1) * ps + 1) + '–' + Math.min(page * ps, L.length) + ' dari ' + fmtCount(L.length));
    } else {
      f.sort(function (a, b) { return b.gap - a.gap; });
      var tp2 = Math.ceil(f.length / ps) || 1, page2 = Math.min(state.sgaPage || 1, tp2); state.sgaPage = page2;
      head = '<tr>' + dkStickyTh('Outlet', 1) + th('MC') + th('DSE') + th('Slab FM') + th('Slab LMTD') + th('Slab MTD') + th('FM', 1) + th('LMTD', 1) + th('MTD', 1) + th('Gap vs ' + bl, 1) + th('Kemungkinan penyebab (cek)') + '</tr>';
      body = f.slice((page2 - 1) * ps, page2 * ps).map(function (r) {
        var o = r.o;
        return '<tr>' + dkStickyTd('<b>' + esc(o.n || '(tanpa nama)') + '</b><br><code style="font-size:12px;">' + esc(o.id) + ' · ' + esc(o.b) + '</code><br><code style="font-size:12px;">' + esc(o.site || '—') + '</code>') + '<td>' + esc(o.mc) + '</td><td>' + dseHtml(uarDse(o)) + '</td>' +
          '<td>' + lvl(r.sl[2]) + '</td><td>' + lvl(r.sl[1]) + '</td><td><b>' + lvl(r.sl[0]) + '</b></td><td class="num">' + sgFmt(C.m, o._sg[2]) + '</td><td class="num">' + sgFmt(C.m, o._sg[1]) + '</td><td class="num"><b>' + sgFmt(C.m, o._sg[0]) + '</b></td><td class="num" style="color:#991b1b;"><b>−' + sgFmt(C.m, Math.max(0, r.gap)) + '</b></td><td style="min-width:240px;">' + chip(r.why) + '</td></tr>';
      }).join('');
      if (tp2 > 1) pager = mbPager('sga-page', page2, tp2, 'Outlet ' + ((page2 - 1) * ps + 1) + '–' + Math.min(page2 * ps, f.length) + ' dari ' + fmtCount(f.length));
    }
    return cards + card('Flag gap · ' + SG_LABEL[C.m] + ' · ' + esc(scopeText()), tools + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head + '</thead><tbody>' + (body || '<tr><td colspan="11" class="note">Tidak ada outlet ber-flag pada filter ini.</td></tr>') + '</tbody></table></div>' + pager +
      '<p class="note">Outlet di-flag bila: gap terhadap ' + bl + ' ≥ ambang, atau volume ' + bl + ' ada tetapi MTD 0, atau turun ≥ 2 slab. Kolom penyebab memeriksa: belum divisit MTD (PJP), stok saldo ENDBAL 0, tanpa demand MTD (MOBO), outlet tanpa DSE (ADHOC)' + (C.m !== 'si' ? ', dan tanpa sell-in SP MTD' : '') + '. Daftar DSE menunjukkan porsi outlet ber-flag tiap DSE dan persentase tiap penyebab untuk melihat pola. ' + SG_NOTE + '</p>');
  }
  function sgExportCsv() {
    var C = sgCtx(); if (!C || C.missing || typeof window === 'undefined') return;
    var rows = sgFlagRows(C), bl = state.sgaBase === 'fm' ? 'FM' : 'LMTD';
    function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var lines = [['Area', 'MC', 'DSO', 'DSE', 'Site', 'Outlet ID', 'Brand', 'Outlet Name', 'Metrik', 'FM', 'LMTD', 'MTD', 'Gap vs ' + bl, 'Hilang', 'Turun >= 2 slab', 'Penyebab'].map(q).join(',')];
    rows.sort(function (a, b) { return b.gap - a.gap; }).forEach(function (r) { var o = r.o, i = C.mi[o.mc] || {}; lines.push([i.br, o.mc, i.dso, uarDse(o), o.site, o.id, o.b, o.n, SG_LABEL[C.m], o._sg[2], o._sg[1], o._sg[0], r.gap, r.lost ? 'ya' : '', r.drop ? 'ya' : '', r.why.map(function (w) { return w[1]; }).join('; ')].map(q).join(',')); });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'flag_gap_' + C.m + '_' + (state.sgaBase || 'lm') + '.csv'; a.click();
  }
  function viewSlabSga(mode) {
    _sgMode = mode === 'ga' ? 'ga' : 'pj';
    var C = sgCtx(); if (!C) return card('Slab Sellin, Saldo & GA', '<p class="note">Feed penjualan belum dibangun.</p>');
    if (C.missing) return sgNav({ m: C.m }) + card('Slab GA', '<p class="note">Feed GA belum dibangun. Taruh Daily_RGUGA_OUTLET_*.xlsb di <code>raw/GA/</code> lalu jalankan <code>python3 scripts/build_ga_feed.py</code>.</p>');
    var tab = state.sgaTab || 'outlet';
    return sgNav(C) + (tab === 'dse' ? sgDseView(C) : (tab === 'flag' ? sgFlagView(C) : sgOutletView(C)));
  }

  /* ================= KONFIGURASI · TARGET SETTING (Sell-In SP + OSA) ================= */
  function cfFeed() { return (typeof window !== 'undefined' && window.TARGET_FEED) ? window.TARGET_FEED : null; }
  function cfIn(o) { return (!state.branch || o.br === state.branch) && (!state.hoa || o.hoa === state.hoa) && (!state.kec || o.mc === state.kec) && (!state.dse || dseNorm(o.n) === state.dse); }
  function cfF(K) { return state.cfBasis === 'full' ? 1 : K.metadata.cut_day / K.metadata.month_days; }
  function cfEmpty() { return { dses: 0, out: 0, sp: [0, 0, 0], osa: [0, 0, 0], sp0: [0, 0, 0], osa0: [0, 0, 0], spA: 0, osaA: 0 }; }
  function cfAdd(a, d) { a.dses++; a.out += d.out; for (var j = 0; j < 3; j++) { a.sp[j] += d.sp[j]; a.osa[j] += d.osa[j]; a.sp0[j] += d.sp0[j]; a.osa0[j] += d.osa0[j]; } }
  function cfGroup(T, K, keyf) {
    // targets per DSE row (T.dses), actuals from the KPI feed grouped the same way (KPI rows are keyed by DSE name)
    var g = {}, kmap = {};
    K.dses.forEach(function (r) { kmap[r.n.toUpperCase() + '|' + r.mc] = r; });   // name + MC: two DSEs can share a name (SUSANTO)
    var seen = {};
    T.dses.filter(cfIn).forEach(function (d) {
      var k = keyf(d), a = g[k] || (g[k] = cfEmpty()); cfAdd(a, d);
      var r = kmap[String(d.n).toUpperCase() + '|' + d.mc];
      if (r && !seen[r.k]) { seen[r.k] = 1; a.spA += r.sp_pcs; a.osaA += r.osa_amt; }
    });
    return g;
  }
  function cfAch(act, tgt, f) { return tgt > 0 ? act / (tgt * f) : null; }
  function cfTabNav() {
    var t = [['ringkasan', '📊 Ringkasan Region · Area · MC'], ['dse', '👤 Target per DSE'], ['rebalancing', '⚖️ Sebelum vs Sesudah Rebalancing']];
    return '<div class="sub-nav" role="tablist">' + t.map(function (x) { var a = (state.cfTab || 'ringkasan') === x[0]; return '<button type="button" role="tab" class="sub-nav-btn' + (a ? ' active' : '') + '" data-cf-tab="' + x[0] + '" aria-selected="' + a + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function cfRow(label, ket, a, f, style, dseMode) {
    var spAch = cfAch(a.spA, a.sp[2], f), osaAch = cfAch(a.osaA, a.osa[2], f);
    return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur" style="' + DK_STICKY + ' background:' + (style && /ink/.test(style) ? 'var(--ij-ink)' : (style && /wash/.test(style) ? 'var(--ij-wash)' : '#fff')) + ';">' + label + '</td><td>' + ket + '</td><td class="num">' + fmtCount(a.out) + '</td>' +
      '<td class="num">' + fmtCount(a.sp[0]) + '</td><td class="num">' + fmtCount(a.sp[1]) + '</td><td class="num cur"><b>' + fmtCount(a.sp[2]) + '</b></td><td class="num">' + (a.spA == null ? '—' : fmtCount(a.spA)) + '</td><td class="num">' + (spAch == null || a.spA == null ? '—' : dkPctTag(spAch, 1, 0.9)) + '</td>' +
      '<td class="num">' + pjRp(a.osa[0]) + '</td><td class="num">' + pjRp(a.osa[1]) + '</td><td class="num cur"><b>' + pjRp(a.osa[2]) + '</b></td><td class="num">' + (a.osaA == null ? '—' : pjRp(a.osaA)) + '</td><td class="num">' + (osaAch == null || a.osaA == null ? '—' : dkPctTag(osaAch, 1, 0.9)) + '</td></tr>';
  }
  function cfHead(first) {
    return '<tr>' + dkStickyTh(first, 2) + '<th rowspan="2" style="vertical-align:bottom;">Keterangan</th><th rowspan="2" class="num" style="vertical-align:bottom;">Outlet mapped</th>' +
      dkBandTh('sp', 'Sell-In SP (pcs)', 'target bulanan · IOH = IM3 + 3ID', 5) + dkBandTh('osa', 'OSA (Rp)', 'target bulanan · IOH = IM3 + 3ID', 5) + '</tr>' +
      '<tr>' + dkSubTh('sp', 'IM3', true, true) + dkSubTh('sp', '3ID', false, true) + dkSubTh('sp', 'IOH', false, true) + dkSubTh('sp', 'Aktual MTD', false, true) + dkSubTh('sp', 'Ach.', false, true) +
      dkSubTh('osa', 'IM3', true, true) + dkSubTh('osa', '3ID', false, true) + dkSubTh('osa', 'IOH', false, true) + dkSubTh('osa', 'Aktual MTD', false, true) + dkSubTh('osa', 'Ach.', false, true) + '</tr>';
  }
  function cfRingkasan(T, K) {
    var f = cfF(K), M = K.metadata, mc = cfGroup(T, K, function (d) { return d.br + '||' + d.mc; }), ar = cfGroup(T, K, function (d) { return d.br; }), tot = cfEmpty();
    Object.keys(ar).forEach(function (k) { var a = ar[k]; tot.dses += a.dses; tot.out += a.out; tot.spA += a.spA; tot.osaA += a.osaA; for (var j = 0; j < 3; j++) { tot.sp[j] += a.sp[j]; tot.osa[j] += a.osa[j]; } });
    var spAch = cfAch(tot.spA, tot.sp[2], f), osaAch = cfAch(tot.osaA, tot.osa[2], f), ft = f < 1 ? ' (target × ' + M.cut_day + '/' + M.month_days + ')' : '';
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('DSE bertarget', fmtCount(tot.dses), fmtCount(Object.keys(mc).length) + ' MC · ' + fmtCount(Object.keys(ar).length) + ' area', 'up', 'Target DSE Hybrid FINAL REBALANCING') +
      kpi('Target Sell-In SP (IOH)', fmtCount(tot.sp[2]) + ' pcs', 'IM3 ' + fmtCount(tot.sp[0]) + ' · 3ID ' + fmtCount(tot.sp[1]), 'up', 'bulan Oktober 2026') +
      kpi('Aktual SP MTD', fmtCount(tot.spA) + ' pcs', spAch == null ? '—' : (spAch * 100).toFixed(1) + '% dari target' + ft, spAch != null && spAch >= 0.9 ? 'up' : 'down', 'SP gabungan DSE yang punya target (aktual belum dipisah IM3 / 3ID)') +
      kpi('Target OSA (IOH)', pjRp(tot.osa[2]), 'IM3 ' + pjRp(tot.osa[0]) + ' · 3ID ' + pjRp(tot.osa[1]), 'up', 'amount outlet produktif') +
      kpi('Aktual OSA MTD', pjRp(tot.osaA), osaAch == null ? '—' : (osaAch * 100).toFixed(1) + '% dari target' + ft, osaAch != null && osaAch >= 0.9 ? 'up' : 'down', 'nilai SP + saldo + voucher outlet ≥ Rp 300K (aturan GAPLOK)') + '</div>';
    var col = state.cfCollapsed || {}, rows = [];
    var byA = {}; Object.keys(mc).forEach(function (k) { var p = k.split('||'); (byA[p[0]] || (byA[p[0]] = [])).push(p[1]); });
    rows.push(cfRow('<b>REGION INNER JAKARTA</b>', fmtCount(tot.dses) + ' DSE', tot, f, 'background:var(--ink); color:#fff; font-weight:800;'));
    Object.keys(byA).sort().forEach(function (a) {
      var closed = !!col[a];
      rows.push(cfRow('<button type="button" class="btn" data-cf-toggle="' + esc(a) + '" style="padding:2px 8px; font-size:13px; margin-right:6px;">' + (closed ? '＋' : '－') + '</button><b>' + esc(a) + '</b>', 'Area · ' + byA[a].length + ' MC · ' + ar[a].dses + ' DSE', ar[a], f, 'background:var(--ij-wash); font-weight:800;'));
      if (!closed) byA[a].sort().forEach(function (m) {
        var d0 = T.mcs.filter(function (x) { return x.br === a && x.mc === m; })[0] || {};
        rows.push(cfRow('<span style="padding-left:18px;">' + esc(m) + '</span>', 'DSO ' + esc(d0.dso || '—') + ' · ' + mc[a + '||' + m].dses + ' DSE', mc[a + '||' + m], f, ''));
      });
    });
    var tools = '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group"><span class="map-label">Grup Area:</span><button type="button" class="map-btn" data-cf-expand="all">＋ Expand semua</button><button type="button" class="map-btn" data-cf-expand="none">－ Collapse semua</button></div></div>';
    return cards + card('Target Sell-In SP dan OSA · Region → Area → MC · ' + esc(scopeText()), tools + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + cfHead('Region / Area / MC') + '</thead><tbody>' + rows.join('') + '</tbody></table></div>' +
      '<p class="note">Target = jumlah target DSE hasil FINAL REBALANCING (sama dengan target MC dan Area di sheet check). Ach. = aktual MTD ÷ target IOH' + (f < 1 ? ' prorata ' + M.cut_day + '/' + M.month_days : ' penuh bulan') + '. Aktual SP dan OSA dari DAILY_DATA_MOBII (cut ' + esc(M.cut) + ') tidak dipisah IM3 / 3ID, jadi pencapaian dihitung terhadap target IOH. Kolom IOH = IM3 + 3ID.</p>');
  }
  function cfDse(T, K) {
    var f = cfF(K), q = (state.cfSearch || '').toLowerCase(), cnt = {}, kmap = {};
    T.dses.forEach(function (d) { cnt[d.n] = (cnt[d.n] || 0) + 1; });
    K.dses.forEach(function (r) { kmap[r.n.toUpperCase() + '|' + r.mc] = r; });
    var list = T.dses.filter(function (d) { return cfIn(d) && (!q || (d.n + ' ' + d.id + ' ' + d.mc + ' ' + d.dso).toLowerCase().indexOf(q) !== -1); });
    list.sort(function (a, b) { return a.br.localeCompare(b.br) || a.mc.localeCompare(b.mc) || a.n.localeCompare(b.n); });
    var ps = 50, tp = Math.ceil(list.length / ps) || 1, page = Math.min(state.cfPage || 1, tp); state.cfPage = page;
    var body = '', last = null;
    list.slice((page - 1) * ps, page * ps).forEach(function (d) {
      if (d.mc !== last) { last = d.mc; body += '<tr style="background:var(--ij-ink); color:#fff; font-weight:800;"><td colspan="14">' + esc(d.br) + ' · ' + esc(d.mc) + ' · DSO ' + esc(d.dso || '—') + '</td></tr>'; }
      var r = kmap[String(d.n).toUpperCase() + '|' + d.mc], a = cfEmpty(); cfAdd(a, d); a.spA = r ? r.sp_pcs : null; a.osaA = r ? r.osa_amt : null;
      body += cfRow('<b>' + esc(d.n) + '</b><div class="note"><code>' + esc(d.id) + '</code></div>', 'DSE', a, f, '');
    });
    return card('Target per DSE · ' + esc(scopeText()) + ' · ' + fmtCount(list.length) + ' DSE',
      '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group"><input type="text" id="cfSearchInput" aria-label="Cari DSE, ID, MC atau DSO" placeholder="🔍 Cari DSE, ID, MC, DSO..." value="' + esc(state.cfSearch || '') + '" class="map-select" style="min-width:260px;"></div></div>' +
      '<div class="tbl-wrap"><table class="tbl wide"><thead>' + cfHead('DSE') + '</thead><tbody>' + body + '</tbody></table></div>' +
      (tp > 1 ? mbPager('cf-page', page, tp, 'Menampilkan ' + ((page - 1) * ps + 1) + '–' + Math.min(page * ps, list.length) + ' dari ' + fmtCount(list.length) + ' DSE') : '<p class="note">' + fmtCount(list.length) + ' DSE.</p>') +
      '<p class="note">Outlet mapped = outlet dalam pairing DSE di workbook target. Dua DSE ber-nama sama (SUSANTO) tidak bisa dipisah di data aktual, jadi aktualnya ditampilkan kosong di baris DSE dan tetap dihitung di total MC dan Area.</p>');
  }
  function cfRebal(T, K) {
    var mc = cfGroup(T, K, function (d) { return d.br + '||' + d.mc; }), rows = '', tspR = 0, tsp0 = 0, tosR = 0, tos0 = 0;
    function d(x, y) { var dl = x - y; return dl === 0 ? '<span class="note">0</span>' : '<span style="color:' + (dl > 0 ? '#166534' : '#991b1b') + ';">' + (dl > 0 ? '+' : '') + fmtCount(Math.round(dl)) + '</span>'; }
    Object.keys(mc).sort().forEach(function (k) {
      var a = mc[k], p = k.split('||'), sp0 = a.sp0[0] + a.sp0[1], os0 = a.osa0[0] + a.osa0[1];
      var ds = T.dses.filter(function (x) { return x.br === p[0] && x.mc === p[1]; }), mn = Math.min.apply(null, ds.map(function (x) { return x.sp[2]; })), mx = Math.max.apply(null, ds.map(function (x) { return x.sp[2]; }));
      tspR += a.sp[2]; tsp0 += sp0; tosR += a.osa[2]; tos0 += os0;
      rows += '<tr><td class="cur" style="' + DK_STICKY + ' background:#fff;"><b>' + esc(p[1]) + '</b><div class="note">' + esc(p[0]) + '</div></td><td class="num">' + a.dses + '</td><td class="num">' + fmtCount(sp0) + '</td><td class="num"><b>' + fmtCount(a.sp[2]) + '</b></td><td class="num">' + d(a.sp[2], sp0) + '</td><td class="num">' + fmtCount(mn) + ' – ' + fmtCount(mx) + '</td><td class="num">' + pjRp(os0) + '</td><td class="num"><b>' + pjRp(a.osa[2]) + '</b></td><td class="num">' + d(a.osa[2], os0) + '</td></tr>';
    });
    rows += '<tr style="background:var(--ink); color:#fff; font-weight:800;"><td>REGION</td><td class="num">' + fmtCount(T.dses.length) + '</td><td class="num">' + fmtCount(tsp0) + '</td><td class="num">' + fmtCount(tspR) + '</td><td class="num">' + fmtCount(Math.round(tspR - tsp0)) + '</td><td></td><td class="num">' + pjRp(tos0) + '</td><td class="num">' + pjRp(tosR) + '</td><td class="num">' + pjRp(Math.round(tosR - tos0)) + '</td></tr>';
    return card('Sebelum vs sesudah rebalancing · target MC · ' + esc(scopeText()),
      '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('MC') + th('DSE', 1) + th('SP awal', 1) + th('SP rebalancing', 1) + th('Δ SP', 1) + th('SP per DSE (min – maks)', 1) + th('OSA awal', 1) + th('OSA rebalancing', 1) + th('Δ OSA', 1) + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="note">Awal = target seragam per DSE di sheet utama (IM3 + 3ID, sebelum redistribusi). Rebalancing memindahkan target antar DSE dan antara IM3 dan 3ID tanpa mengubah total Area; selisih kecil di tabel berasal dari pembulatan per DSE. Rentang min–maks menunjukkan sebaran target SP antar DSE dalam satu MC.</p>');
  }
  function viewTargetSetting() {
    var T = cfFeed(), K = dkFeed();
    if (!T || !K) return card('Target Setting', '<p class="note">Feed target belum dibangun. Jalankan <code>python3 scripts/build_target_feed.py</code> lalu <code>python3 scripts/build_dse_kpi_feed.py</code>.</p>');
    var tab = state.cfTab || 'ringkasan', body = tab === 'dse' ? cfDse(T, K) : (tab === 'rebalancing' ? cfRebal(T, K) : cfRingkasan(T, K));
    var bar = '<div class="map-toolbar" style="margin-top:8px;">' + sellinBtnGroup('Basis pencapaian', 'cf-basis', [['prorata', 'Prorata MTD (' + K.metadata.cut_day + '/' + K.metadata.month_days + ')'], ['full', 'Target penuh bulan']], state.cfBasis || 'prorata') +
      '<div class="map-toolbar-group"><span class="note">Dua KPI: Sell-In SP (pcs) dan OSA (Rp). Sumber: ' + esc(T.metadata.source.split('/').pop()) + ' · sheet ' + esc(T.metadata.sheet) + '.</span></div></div>';
    return cfTabNav() + bar + body;
  }

  /* ================= KONFIGURASI · PJP MAPPING (weekly template, permanent outlet -> DSE) ================= */
  var PM_DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var PM_TABS = [['ringkasan', '📊 Ringkasan & Sanity Check'], ['dse', '👤 Per DSE'], ['harian', '🖨️ PJP Harian (pratinjau cetak)'], ['pengecualian', '⚠️ Pengecualian']];
  var PM_FLAG = { tidak_di_master: ['bad', 'ID tidak ada di master outlet'], id_bentrok: ['warn', 'ID IM3 dan 3ID menunjuk dua outlet'], dse_kosong: ['bad', 'Tanpa DSE'], dse_beda_master: ['warn', 'DSE beda dengan master'], mc_beda_master: ['warn', 'MC beda dengan master'],
    frekuensi_hari_beda: ['warn', 'Frekuensi ≠ 4 × hari'], duplikat_beda: ['warn', 'Ganda, hari / DSE beda'], duplikat_dibuang: ['none', 'Baris ganda dibuang'], tanpa_hari: ['bad', 'Tanpa hari kunjungan'], dse_tak_dikenal: ['bad', 'Kode DSE tidak dikenal'], dse_lokasi_diganti: ['ok', 'DSE dipindah ke yang terdekat'], dse_file_dipertahankan: ['warn', 'DSE file dipertahankan (tanpa koordinat / terlalu jauh / DSE terdekat penuh)'] };
  function pmFeed() { return (typeof window !== 'undefined' && window.PJP_MAP) ? window.PJP_MAP : null; }
  var _pmPrep = null;
  function pmPrep() {
    var F = pmFeed(); if (!F) return null;
    if (_pmPrep && _pmPrep.src === F) return _pmPrep;
    var mi = F.metadata.mc_info || {};
    var rows = F.rows.map(function (r) {
      var d = r.d >= 0 ? F.dses[r.d] : null, m = mi[r.mc] || {};
      return { r: r, k: r.k, n: r.n, mc: r.mc, br: (m.br || r.br), hoa: m.hoa || '—', dso: m.dso || '—', dse: d ? d.n : 'TANPA DSE', dseN: d ? dseNorm(d.n) : '', code: d ? (d.c || d.c3) : '', dse0: r.o != null && r.o >= 0 ? F.dses[r.o].n : '', code0: r.o != null && r.o >= 0 ? (F.dses[r.o].c || F.dses[r.o].c3) : (d ? (d.c || d.c3) : ''), z: r.z, f: r.f, w: r.w, x: r.x || [], mapped: r.m === 1, i: r.i, j: r.j };
    });
    _pmPrep = { src: F, rows: rows, mi: mi };
    return _pmPrep;
  }
  function pmIn(o) { return (!state.branch || o.br === state.branch) && (!state.hoa || o.hoa === state.hoa) && (!state.kec || o.mc === state.kec) && (!state.dse || o.dseN === state.dse); }
  function pmDow(iso) { var p = String(iso || '').split('-'); if (p.length !== 3) return -1; var d = new Date(+p[0], +p[1] - 1, +p[2]).getDay(); return (d + 6) % 7; }   // 0 = Sen ... 5 = Sab, 6 = Min
  function pmAgg(list) {
    var A = { n: 0, mapped: 0, f: 0, dse: {}, nodse: 0, day: [0, 0, 0, 0, 0, 0], fm: {}, exc: 0 };
    list.forEach(function (o) {
      A.n++; if (o.mapped) A.mapped++; A.f += o.f; if (o.code) A.dse[o.code] = 1; else A.nodse++;
      for (var i = 0; i < 6; i++) if (o.w.charAt(i) === '1') A.day[i]++;
      A.fm['F' + o.f] = (A.fm['F' + o.f] || 0) + 1; if (o.x.length) A.exc++;
    });
    A.nd = Object.keys(A.dse).length;
    return A;
  }
  function pmTabNav() {
    return '<div class="sub-nav" role="tablist">' + PM_TABS.map(function (x) { var a = (state.pmTab || 'ringkasan') === x[0]; return '<button type="button" role="tab" class="sub-nav-btn' + (a ? ' active' : '') + '" data-pm-tab="' + x[0] + '" aria-selected="' + a + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function pmCards(A, M) {
    var avg = A.nd ? A.n / A.nd : 0, peak = Math.max.apply(null, A.day);
    return '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet dalam PJP', fmtCount(A.n), pctOf(A.mapped, A.n) + '% outlet master · ' + fmtCount(A.n - A.mapped) + ' belum ada di master', 'up', 'template ' + esc(M.week_of) + ' · ' + fmtCount(M.outlets_master_covered) + ' dari ' + fmtCount(M.outlets_master) + ' outlet master terpetakan (seluruh region)') +
      kpi('DSE', fmtCount(A.nd), 'rata-rata ' + avg.toFixed(1) + ' outlet per DSE', 'up', 'kode DSE IM3 sebagai kunci') +
      kpi('Kunjungan per minggu', fmtCount(A.day.reduce(function (a, b) { return a + b; }, 0)), 'puncak ' + fmtCount(peak) + ' outlet pada hari terpadat', 'up', 'Senin sampai Sabtu, tanpa Minggu') +
      kpi('Frekuensi', Object.keys(A.fm).sort().map(function (k) { return k + ' ' + fmtCount(A.fm[k]); }).join(' · '), 'F8 = dua hari per minggu (8 kunjungan per bulan)', 'up', 'F = 4 × jumlah hari per minggu') +
      kpi('Outlet tanpa DSE', fmtCount(A.nodse), pctOf(A.nodse, A.n) + '% dari outlet PJP', A.nodse ? 'down' : 'up', 'DSE kosong di file dan di master teritori') +
      kpi('Pengecualian', fmtCount(A.exc), 'outlet dengan bendera (tab Pengecualian)', A.exc ? 'down' : 'up', 'tidak dibuang kecuali baris ganda') + '</div>';
  }
  function pmChecksCard(M) {
    var tag = { ok: ['ok', 'OK'], warn: ['warn', 'Perlu dicek'], info: ['none', 'Info'] };
    return card('Sanity check mapping · ' + esc(M.source.split('/').pop()), '<div class="tbl-wrap"><table class="tbl" data-nosort="1"><thead><tr>' + th('Pemeriksaan') + th('Hasil') + th('Jumlah', 1) + th('Catatan') + '</tr></thead><tbody>' +
      M.checks.map(function (c) { var t = tag[c.status] || tag.info; return '<tr><td class="cur"><b>' + esc(c.name) + '</b></td><td>' + dkTag(t[0], t[1]) + '</td><td class="num">' + fmtCount(c.n) + '</td><td>' + esc(c.note) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="note">Pemeriksaan dihitung saat feed dibangun (seluruh file, tanpa filter header). Mapping ini permanen: berlaku sampai file Weekly_PJP baru dibangun ulang dengan <code>python3 scripts/build_pjp_mapping_feed.py</code>. Katalog: <code>data/catalogues/pjp_outlet_mapping.csv</code>; pengecualian: <code>pjp_outlet_exceptions.csv</code>. Kontrak: <code>docs/assessments/pjp_weekly_mapping.md</code>.</p>');
  }
  function pmGroupMc(list) {
    var g = {}; list.forEach(function (o) { (g[o.mc] || (g[o.mc] = { mc: o.mc, br: o.br, dso: o.dso, hoa: o.hoa, list: [] })).list.push(o); });
    return Object.keys(g).map(function (k) { var x = g[k]; x.a = pmAgg(x.list); return x; });
  }
  function pmDayCells(a) { return a.day.map(function (v) { return '<td class="num">' + (v ? fmtCount(v) : '·') + '</td>'; }).join(''); }
  function pmRingkasan(P, list) {
    var M = P.src.metadata, A = pmAgg(list), items = pmGroupMc(list), dsoOf = {}, hoaOf = {};
    items.forEach(function (x) { dsoOf[x.mc] = x.dso; hoaOf[x.br] = x.hoa; });
    var row = function (x) { var a = x.a; return '<tr><td class="cur" style="padding-left:40px;"><b>' + esc(x.mc) + '</b></td><td class="num cur"><b>' + fmtCount(a.n) + '</b></td><td class="num">' + fmtCount(a.nd) + '</td><td class="num">' + (a.nd ? (a.n / a.nd).toFixed(1) : '—') + '</td><td class="num">' + (a.nodse ? '<span class="alert-tag">' + fmtCount(a.nodse) + '</span>' : '·') + '</td>' + pmDayCells(a) + '<td class="num">' + (a.exc ? fmtCount(a.exc) : '·') + '</td></tr>'; };
    var sub = function (it) { var a = pmAgg([].concat.apply([], it.map(function (x) { return x.list; }))); return '<td class="num cur"><b>' + fmtCount(a.n) + '</b></td><td class="num">' + fmtCount(a.nd) + '</td><td class="num">' + (a.nd ? (a.n / a.nd).toFixed(1) : '—') + '</td><td class="num">' + fmtCount(a.nodse) + '</td>' + pmDayCells(a) + '<td class="num">' + fmtCount(a.exc) + '</td>'; };
    var body = grpBody('pmarea', { items: items, area: function (x) { return x.br; }, mc: function (x) { return x.mc; }, dso: function (m) { return dsoOf[m] || '—'; }, hoa: function (a) { return hoaOf[a] || '—'; }, val: function (x) { return x.a.n; }, span: 1, cols: 12, sub: sub, row: row, unit: 'MC', cap: 60, search: false });
    return pmCards(A, M) + pmChecksCard(M) + card('Cakupan PJP per Area dan MC · ' + esc(scopeText()),
      '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('pmarea') + '</div><div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('Area › MC') + th('Outlet PJP', 1) + th('DSE', 1) + th('Outlet / DSE', 1) + th('Tanpa DSE', 1) + PM_DAYS.map(function (d) { return th(d, 1); }).join('') + th('Pengecualian', 1) + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Kolom hari = jumlah outlet yang dijadwalkan pada hari itu setiap minggu. Pola hari baku: Senin + Kamis, Selasa + Jumat, Rabu + Sabtu (F8); F12 tiga hari, F4 satu hari.</p>');
  }
  function pmDse(P, list) {
    var q = (state.pmSearch || '').toLowerCase(), g = {};
    list.forEach(function (o) { var k = o.mc + '||' + (o.code || 'TANPA'); (g[k] || (g[k] = { mc: o.mc, br: o.br, dso: o.dso, hoa: o.hoa, dse: o.dse, code: o.code, list: [] })).list.push(o); });
    var bef = {}; list.forEach(function (o) { var k = o.mc + '||' + (o.code0 || 'TANPA'); bef[k] = (bef[k] || 0) + 1; });
    var items = Object.keys(g).map(function (k) { var x = g[k]; x.a = pmAgg(x.list); x.bef = bef[k] || 0; return x; }).filter(function (x) { return !q || (x.dse + ' ' + x.code + ' ' + x.mc).toLowerCase().indexOf(q) !== -1; });
    var dsoOf = {}, hoaOf = {}; items.forEach(function (x) { dsoOf[x.mc] = x.dso; hoaOf[x.br] = x.hoa; });
    var row = function (x) { var a = x.a, mx = Math.max.apply(null, a.day), dl = a.n - x.bef; return '<tr><td class="cur" style="padding-left:40px;"><b>' + esc(x.dse) + '</b>' + (x.code ? '<br><code style="font-size:12px;">' + esc(x.code) + '</code>' : '') + '</td><td class="num cur"><b>' + fmtCount(a.n) + '</b></td><td class="num">' + fmtCount(x.bef) + '</td><td class="num">' + (dl === 0 ? '·' : (x.bef && a.n < 0.5 * x.bef ? dkTag('bad', '−' + Math.abs(dl)) : dkTag(dl > 0 ? 'ok' : 'warn', (dl > 0 ? '+' : '−') + Math.abs(dl)))) + '</td>' + pmDayCells(a) + '<td class="num">' + mx + '</td><td>' + Object.keys(a.fm).sort().map(function (k) { return k + '×' + a.fm[k]; }).join(' ') + '</td><td class="num">' + fmtCount(a.f) + '</td><td class="num">' + (a.exc ? fmtCount(a.exc) : '·') + '</td></tr>'; };
    var sub = function (it) { var a = pmAgg([].concat.apply([], it.map(function (x) { return x.list; }))); return '<td class="num cur"><b>' + fmtCount(a.n) + '</b></td><td class="num">' + fmtCount(it.reduce(function (t, x) { return t + x.bef; }, 0)) + '</td><td></td>' + pmDayCells(a) + '<td class="num">' + Math.max.apply(null, a.day) + '</td><td></td><td class="num">' + fmtCount(a.f) + '</td><td class="num">' + fmtCount(a.exc) + '</td>'; };
    var body = grpBody('pmdse', { items: items, area: function (x) { return x.br; }, mc: function (x) { return x.mc; }, dso: function (m) { return dsoOf[m] || '—'; }, hoa: function (a) { return hoaOf[a] || '—'; }, val: function (x) { return x.a.n; }, span: 1, cols: 14, sub: sub, row: row, unit: 'DSE', cap: 200, search: !!q });
    var bar = '<div class="map-toolbar" style="margin:10px 0 8px;"><div class="map-toolbar-group"><input type="text" id="pmSearchInput" aria-label="Cari DSE atau MC" placeholder="🔍 Cari DSE, kode, MC..." value="' + esc(state.pmSearch || '') + '" class="map-select" style="min-width:240px;"></div>' + grpBar('pmdse') + '</div>';
    return pmCards(pmAgg(list), P.src.metadata) + card('Mapping outlet per DSE · ' + esc(scopeText()) + ' (' + fmtCount(items.length) + ' DSE)', bar + '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('Area › MC › DSE') + th('Outlet final', 1) + th('Outlet di file', 1) + th('Selisih', 1) + PM_DAYS.map(function (d) { return th(d, 1); }).join('') + th('Hari terpadat', 1) + th('Frekuensi') + th('Kunjungan / bulan', 1) + th('Pengecualian', 1) + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Satu baris = satu DSE di satu MC (DSE yang melayani dua MC muncul dua kali). "Outlet di file" = jumlah di Weekly_PJP asli; selisih muncul karena outlet yang DSE-nya beda dengan operator beat plan MOBI dipindah ke DSE terdekat (merah = kehilangan lebih dari separuh outlet). Kolom hari = outlet yang dikunjungi DSE itu pada hari tersebut. "TANPA DSE" = outlet PJP yang belum punya DSE.</p>');
  }
  function pmHarian(P, list) {
    var M = P.src.metadata, iso = state.pmDate || '2026-10-15', dow = pmDow(iso), nm = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'][dow] || '—';
    var picker = '<div class="map-toolbar" style="margin-top:10px;"><div class="map-toolbar-group"><span class="map-label">Tanggal PJP:</span><input type="date" id="pmDateInput" value="' + esc(iso) + '" class="map-select" aria-label="Tanggal PJP"></div><div class="map-toolbar-group"><span class="note">' + nm + ' · teritori mengikuti filter Branch / HoA / MC / DSE di atas</span></div></div>';
    if (dow < 0) return picker + card('PJP harian', '<p class="note">Pilih tanggal.</p>');
    if (dow > 5) return picker + card('PJP harian · ' + nm, '<p class="note">Hari Minggu tidak ada jadwal PJP dalam template (Senin sampai Sabtu).</p>');
    var day = list.filter(function (o) { return o.w.charAt(dow) === '1'; }), A = pmAgg(day), g = {};
    day.forEach(function (o) { var k = o.mc + '||' + (o.code || 'TANPA'); (g[k] || (g[k] = { mc: o.mc, br: o.br, dso: o.dso, hoa: o.hoa, dse: o.dse, code: o.code, list: [] })).list.push(o); });
    var perDse = Object.keys(g).map(function (k) { return g[k].list.length; }).sort(function (a, b) { return a - b; });
    var cards = '<div class="kpis" style="margin-top:10px;">' + kpi('Outlet dijadwalkan', fmtCount(A.n), nm + ' ' + esc(iso), 'up', 'dari template PJP mingguan') + kpi('DSE aktif', fmtCount(A.nd), 'median ' + (perDse.length ? perDse[Math.floor(perDse.length / 2)] : 0) + ' outlet per DSE', 'up', 'maksimum ' + (perDse.length ? perDse[perDse.length - 1] : 0)) + kpi('Outlet tanpa DSE hari ini', fmtCount(A.nodse), 'tidak bisa dicetak per DSE', A.nodse ? 'down' : 'up', 'perlu DSE dulu') + '</div>';
    var dsoOf = {}, hoaOf = {}; day.forEach(function (o) { dsoOf[o.mc] = o.dso; hoaOf[o.br] = o.hoa; });
    var row = function (o) { return '<tr><td class="cur" style="padding-left:56px;"><b>' + esc(o.n || '(tanpa nama)') + '</b><br><code style="font-size:12px;">' + esc(o.i || '—') + (o.j ? ' · ' + esc(o.j) : '') + '</code></td><td>F' + o.f + '</td><td>' + PM_DAYS.filter(function (d, i) { return o.w.charAt(i) === '1'; }).join(' / ') + '</td><td>' + (o.mapped ? '' : dkTag('bad', 'belum di master')) + '</td></tr>'; };
    var sub = function (it) { return '<td></td><td></td><td></td>'; };
    var body = grpBody('pmday', { items: day, area: function (o) { return o.br; }, mc: function (o) { return o.mc; }, dse: function (o) { return o.dse; }, dso: function (m) { return dsoOf[m] || '—'; }, hoa: function (a) { return hoaOf[a] || '—'; }, val: function () { return 1; }, span: 1, cols: 4, sub: sub, row: row, unit: 'outlet', cap: 80, search: false });
    return picker + cards + card('PJP outlet · ' + nm + ' ' + esc(iso) + ' · ' + esc(scopeText()), '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('pmday') + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area › MC › DSE › Outlet') + th('Frekuensi') + th('Hari kunjungan') + th('Status') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Pratinjau isi lembar PJP harian: outlet per DSE untuk hari dan teritori terpilih. Data yang sama akan dipakai menu Instruksi Printing (cetak PJP outlet per DSE). Template mingguan berulang tiap minggu; tanggal hanya menentukan hari dalam seminggu.</p>');
  }
  function pmExc(P, list) {
    var M = P.src.metadata, rows = list.filter(function (o) { return o.x.length; }), by = {};
    rows.forEach(function (o) { o.x.forEach(function (f) { (by[f] || (by[f] = [])).push(o); }); });
    var summ = Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length; }).map(function (f) { var t = PM_FLAG[f] || ['none', f]; return '<tr><td>' + dkTag(t[0], t[1]) + '</td><td class="num">' + fmtCount(by[f].length) + '</td></tr>'; }).join('');
    var sec = Object.keys(by).filter(function (f) { return f !== 'dse_kosong'; }).sort(function (a, b) { return by[b].length - by[a].length; }).map(function (f) {
      var t = PM_FLAG[f] || ['none', f], l = by[f].slice(0, 30);
      return card(t[1] + ' (' + fmtCount(by[f].length) + ')', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Outlet') + th('MC') + th('DSE (final)') + th('DSE di file · jarak') + th('ID IM3 · 3ID') + th('Frekuensi') + '</tr></thead><tbody>' + l.map(function (o) { return '<tr><td class="cur"><b>' + esc(o.n || '(tanpa nama)') + '</b></td><td>' + esc(o.mc) + '</td><td>' + esc(o.dse) + '</td><td>' + (o.dse0 && o.dse0 !== o.dse ? esc(o.dse0) : '<span class="note">sama</span>') + (o.z != null ? ' <span class="note">· ' + o.z + ' km</span>' : '') + '</td><td><code>' + esc(o.i || '—') + ' · ' + esc(o.j || '—') + '</code></td><td>F' + o.f + ' ' + o.w + '</td></tr>'; }).join('') + '</tbody></table></div>' + (by[f].length > 30 ? '<p class="note">30 dari ' + fmtCount(by[f].length) + ' baris; daftar lengkap di <code>data/catalogues/pjp_outlet_exceptions.csv</code>.</p>' : ''));
    }).join('');
    var nod = by.dse_kosong || [], g = {};
    nod.forEach(function (o) { var k = o.br + '||' + o.mc; (g[k] || (g[k] = { br: o.br, mc: o.mc, n: 0 })).n++; });
    var nodTbl = Object.keys(g).map(function (k) { return g[k]; }).sort(function (a, b) { return b.n - a.n; }).map(function (x) { return '<tr><td class="cur">' + esc(x.br) + '</td><td>' + esc(x.mc) + '</td><td class="num"><b>' + fmtCount(x.n) + '</b></td></tr>'; }).join('');
    var mm = (M.master_missing || []).filter(function (o) { return (!state.branch || o.br === state.branch) && (!state.kec || o.mc === state.kec); });
    return '<div class="kpis" style="margin-top:10px; grid-template-columns: 1fr 2fr;">' + card('Bendera pengecualian · ' + esc(scopeText()), '<div class="tbl-wrap"><table class="tbl" data-nosort="1"><thead><tr>' + th('Jenis') + th('Outlet', 1) + '</tr></thead><tbody>' + (summ || '<tr><td colspan="2" class="note">Tidak ada pengecualian pada filter ini.</td></tr>') + '</tbody></table></div>') +
      card('Outlet PJP tanpa DSE per MC (' + fmtCount(nod.length) + ')', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Area') + th('MC') + th('Outlet', 1) + '</tr></thead><tbody>' + (nodTbl || '<tr><td colspan="3" class="note">Tidak ada.</td></tr>') + '</tbody></table></div><p class="note">DSE kosong di file PJP dan UNASSIGNED di master teritori: perlu DSE atau penugasan ulang sebelum lembar PJP bisa dicetak per DSE.</p>') + '</div>' + sec +
      card('Outlet master tanpa PJP (' + fmtCount(mm.length) + ')', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Outlet') + th('Area') + th('MC') + th('DSE master') + '</tr></thead><tbody>' + mm.slice(0, 30).map(function (o) { return '<tr><td class="cur"><b>' + esc(o.n || o.k) + '</b><br><code style="font-size:12px;">' + esc(o.k) + '</code></td><td>' + esc(o.br) + '</td><td>' + esc(o.mc) + '</td><td>' + esc(o.dse || '—') + '</td></tr>'; }).join('') + '</tbody></table></div><p class="note">' + (mm.length > 30 ? '30 dari ' + fmtCount(mm.length) + ' outlet. ' : '') + 'Ada di master teritori tetapi tidak di file Weekly PJP. Tidak ikut mapping sampai ditambahkan di file berikutnya.</p>');
  }
  function viewPjpMapping() {
    var P = pmPrep(); if (!P) return card('PJP Mapping', '<p class="note">Feed mapping belum dibangun. Taruh <code>Weekly_PJP_*_ALL_MC.xlsx</code> di <code>raw/PJP Weekly/</code> lalu jalankan <code>python3 scripts/build_pjp_mapping_feed.py</code>.</p>');
    var tab = state.pmTab || 'ringkasan', list = P.rows.filter(pmIn);
    var body = tab === 'dse' ? pmDse(P, list) : (tab === 'harian' ? pmHarian(P, list) : (tab === 'pengecualian' ? pmExc(P, list) : pmRingkasan(P, list)));
    return pmTabNav() + body;
  }

  /* ================= END BALANCE OUTLET (ENDBAL) ================= */
  var EB_BANDS = [['zero', 'Zero', 'bad'], ['lt50', '< 50K', 'warn'], ['b50', '50–100K', 'warn'], ['b100', '100–300K', 'ok'], ['b300', '≥ 300K', 'top']];
  var EB_COVER = [['c0', '< 1 hari', 'bad'], ['c1', '1–3', 'warn'], ['c3', '3–7', 'ok'], ['c7', '7–14', 'top'], ['c14', '14–30', 'ok'], ['c30', '> 30 (overstock)', 'warn'], ['cn', 'tanpa penjualan', 'none']];
  var EB_TABS = [['ringkasan', '📊 Ringkasan'], ['zero', '⛔ Outlet Zero Stock'], ['slab', '📶 Slab Balance & Inventory Days'], ['site', '📡 Site dengan Outlet Zero'], ['detail', '📋 Detail DSO · DSE']];
  function ebFeed() { return (typeof window !== 'undefined' && window.ENDBAL_FEED) ? window.ENDBAL_FEED : null; }
  function ebScope(list) { return list.filter(function (o) { return (!state.branch || o.b === state.branch) && (!state.hoa || o.h === state.hoa) && (!state.kec || o.m === state.kec) && (!state.dse || dseNorm(o.d) === state.dse); }); }
  function ebBal(o) { return (state.ebBasis === 'all') ? o.st + o.ot : o.st; }
  function ebBand(b) { return b <= 0 ? 'zero' : b < 50000 ? 'lt50' : b < 100000 ? 'b50' : b < 300000 ? 'b100' : 'b300'; }
  function ebCoverBand(o) { if (!(o.av > 0)) return 'cn'; var c = ebBal(o) / o.av; return c < 1 ? 'c0' : c < 3 ? 'c1' : c < 7 ? 'c3' : c < 14 ? 'c7' : c < 30 ? 'c14' : 'c30'; }
  function ebAreas(list) { var a = {}; list.forEach(function (o) { a[o.b] = 1; }); return Object.keys(a).sort(); }
  function ebAgg(list) {
    var A = { n: list.length, bands: { zero: 0, lt50: 0, b50: 0, b100: 0, b300: 0 }, cover: { c0: 0, c1: 0, c3: 0, c7: 0, c14: 0, c30: 0, cn: 0 }, bal: 0, other: 0, comm: 0, av: 0, balAv: 0, y: 0, p: 0, mt: 0, uarY: 0, uarP: 0, sf: 0, zeroDemand: 0, ids: {} };
    list.forEach(function (o) {
      var b = ebBal(o); A.bands[ebBand(b)]++; A.cover[ebCoverBand(o)]++;
      A.bal += b; A.other += o.ot; A.comm += o.cm; A.av += o.av; if (o.av > 0) A.balAv += b;
      A.y += o.y; A.p += o.p; A.mt += o.mt; A.sf += o.sf; if (o.y > 0) A.uarY++; if (o.p > 0) A.uarP++;
      if (b <= 0 && o.av > 0) A.zeroDemand++;
    });
    A.cov = A.av > 0 ? A.balAv / A.av : null;
    return A;
  }
  function ebGroupDse(list) {
    var g = {};
    list.forEach(function (o) { var k = o.m + '||' + o.d; (g[k] || (g[k] = { key: k, mc: o.m, dso: o.o, br: o.b, dse: o.d, list: [] })).list.push(o); });
    return Object.keys(g).map(function (k) { var x = g[k]; x.a = ebAgg(x.list); return x; }).sort(function (x, y) { return y.a.bands.zero / Math.max(y.a.n, 1) - x.a.bands.zero / Math.max(x.a.n, 1); });
  }
  function ebPct(n, d) { return d ? (n / d * 100).toFixed(1) + '%' : '—'; }
  function ebZeroTag(n, d) {
    var pc = d ? n / d : 0, c = pc >= 0.4 ? 'bad' : (pc >= 0.2 ? 'warn' : 'ok');
    return dkTag(c, fmtCount(n) + ' · ' + (pc * 100).toFixed(0) + '%');
  }
  function ebDay(feed, off) { var d = feed.metadata.sellin_cut_day - off; return d + ' Okt'; }
  function ebBasisBar() {
    return '<div class="map-toolbar" style="margin-top:8px;">' + sellinBtnGroup('Basis balance', 'eb-basis', [['stock', 'Stock Account (utama)'], ['all', 'Stock + rekening lainnya']], state.ebBasis || 'stock') +
      '<div class="map-toolbar-group"><span class="note">Rekening komisi tidak pernah dihitung sebagai stok. Zero stock = balance ≤ 0 pada basis terpilih.</span></div></div>';
  }
  function ebTabNav(embed) {
    return '<div class="sub-nav" role="tablist">' + EB_TABS.filter(function (t) { return !embed || t[0] !== 'detail'; }).map(function (t) { var a = (state.ebTab || 'ringkasan') === t[0]; return '<button type="button" role="tab" class="sub-nav-btn' + (a ? ' active' : '') + '" data-eb-tab="' + t[0] + '" aria-selected="' + a + '">' + t[1] + '</button>'; }).join('') + '</div>';
  }
  function ebMode() { return state.kec ? 'dse' : ((state.branch || state.hoa) ? 'mc' : 'area'); }
  function ebSellRow(feed, A) {
    var g = A.p > 0 ? (A.y / A.p - 1) * 100 : null;
    return { g: g };
  }

  /* ---- Ringkasan: scorecard + summary per Region / Area / MC (DSO) / DSE ---- */
  function ebRingkasan(feed, list) {
    var A = ebAgg(list), M = feed.metadata, scope = esc(scopeText());
    var g = A.p > 0 ? (A.y / A.p - 1) * 100 : null;
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Sell-in saldo kemarin (' + M.sellin_cut_day + ' Okt)', pjRp(A.y), (g == null ? '—' : (g >= 0 ? '+' : '') + g.toFixed(1) + '%') + ' vs ' + ebDay(feed, 1) + ' (' + pjRp(A.p) + ')', g != null && g >= 0 ? 'up' : 'down', 'Nilai saldo ke outlet, DAILY_DATA_MOBII') +
      kpi('Outlet beli saldo kemarin (UAR)', fmtCount(A.uarY), pctOf(A.uarY, A.n) + '% dari ' + fmtCount(A.n) + ' outlet · ' + ebDay(feed, 1) + ': ' + fmtCount(A.uarP), A.uarY >= A.uarP ? 'up' : 'down', 'Jumlah transaksi per outlet tidak ada di data harian; UAR dipakai sebagai pengganti') +
      kpi('Rata-rata sell-in per outlet pembeli', pjRp(A.uarY ? A.y / A.uarY : 0), 'MTD ' + pjRp(A.mt) + ' · September penuh ' + pjRp(A.sf), 'up', 'Nilai kemarin ÷ UAR kemarin') +
      kpi('Total balance stok ' + M.snapshot.slice(8) + ' Okt', pjRp(A.bal), 'rata-rata Rp ' + fmtCount(Math.round(A.n ? A.bal / A.n / 1000 : 0)) + ' rb / outlet', 'up', (state.ebBasis === 'all' ? 'Stock + rekening lainnya' : 'Stock Account Normal') + ' · komisi Rp ' + fmtCount(Math.round(A.comm / 1e6)) + ' Jt terpisah') +
      kpi('Outlet zero stock', fmtCount(A.bands.zero), ebPct(A.bands.zero, A.n) + ' dari outlet', A.bands.zero / Math.max(A.n, 1) >= 0.3 ? 'down' : 'up', fmtCount(A.zeroDemand) + ' di antaranya punya permintaan harian') +
      kpi('Outlet balance ≥ Rp 300K', fmtCount(A.bands.b300), ebPct(A.bands.b300, A.n) + ' dari outlet', A.bands.b300 / Math.max(A.n, 1) >= 0.25 ? 'up' : 'down', 'ambang OSA GAPLOK') +
      kpi('Inventory days (tertimbang)', A.cov == null ? '—' : A.cov.toFixed(1) + ' hari', fmtCount(A.cover.c0) + ' outlet < 1 hari · ' + fmtCount(A.cover.c30) + ' outlet > 30 hari', A.cov != null && A.cov >= 3 ? 'up' : 'down', 'Hanya outlet dengan rata-rata transaksi > 0 (' + fmtCount(A.n - A.cover.cn) + ' outlet)') +
      kpi('Outlet < Rp 50K (zero + rendah)', fmtCount(A.bands.zero + A.bands.lt50), ebPct(A.bands.zero + A.bands.lt50, A.n) + ' dari outlet', (A.bands.zero + A.bands.lt50) / Math.max(A.n, 1) >= 0.5 ? 'down' : 'up', 'target replenishment utama') +
    '</div>';
    // summary table: Region total, Area (+MC with DSO), or MCs, or DSEs
    var mode = ebMode(), col = state.ebCollapsed || {}, rows = [];
    function key(x) { return x; }
    function groupBy(l, f) { var g = {}; l.forEach(function (o) { var k = f(o); (g[k] || (g[k] = [])).push(o); }); return g; }
    function rowHtml(label, parent, a, style, first) {
      return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur" style="' + DK_STICKY + ' background:' + (style && /ink/.test(style) ? 'var(--ij-ink)' : (style && /wash/.test(style) ? 'var(--ij-wash)' : '#fff')) + ';">' + label + '</td><td>' + parent + '</td><td class="num">' + fmtCount(a.n) + '</td>' +
        '<td class="num">' + ebZeroTag(a.bands.zero, a.n) + '</td><td class="num">' + ebPct(a.bands.lt50, a.n) + '</td><td class="num">' + ebPct(a.bands.b50, a.n) + '</td><td class="num">' + ebPct(a.bands.b100, a.n) + '</td><td class="num"><b>' + ebPct(a.bands.b300, a.n) + '</b></td>' +
        '<td class="num">' + pjRp(a.bal) + '</td><td class="num">' + pjRp(a.av) + '</td><td class="num">' + (a.cov == null ? '—' : a.cov.toFixed(1)) + '</td>' +
        '<td class="num cur">' + pjRp(a.y) + '</td><td class="num">' + fmtCount(a.uarY) + '</td><td class="num">' + pjRp(a.mt) + '</td></tr>';
    }
    var tot = ebAgg(list);
    if (mode === 'area') {
      var byA = groupBy(list, function (o) { return o.b; });
      rows.push(rowHtml('<b>REGION INNER JAKARTA</b>', fmtCount(Object.keys(byA).length) + ' area', tot, 'background:var(--ink); color:#fff; font-weight:800;'));
      Object.keys(byA).map(function (a) { return [a, ebAgg(byA[a])]; }).sort(function (x, y) { return y[1].bands.zero / Math.max(y[1].n, 1) - x[1].bands.zero / Math.max(x[1].n, 1); }).forEach(function (pair) {
        var closed = !!col[pair[0]], byM = groupBy(byA[pair[0]], function (o) { return o.m; });
        rows.push(rowHtml('<button type="button" class="btn" data-eb-toggle="' + esc(pair[0]) + '" style="padding:2px 8px; font-size:13px; margin-right:6px;">' + (closed ? '＋' : '－') + '</button><b>' + esc(pair[0]) + '</b>', 'Area · ' + Object.keys(byM).length + ' MC', pair[1], 'background:var(--ij-wash); font-weight:800;'));
        if (!closed) Object.keys(byM).map(function (m) { return [m, ebAgg(byM[m]), byM[m][0].o]; }).sort(function (x, y) { return y[1].bands.zero / Math.max(y[1].n, 1) - x[1].bands.zero / Math.max(x[1].n, 1); }).forEach(function (mm) { rows.push(rowHtml('<span style="padding-left:18px;">' + esc(mm[0]) + '</span>', 'DSO ' + esc(mm[2] || '—'), mm[1], '')); });
      });
    } else if (mode === 'mc') {
      var byM2 = groupBy(list, function (o) { return o.m; });
      rows.push(rowHtml('<b>' + esc(state.branch || state.hoa) + '</b>', 'total area', tot, 'background:var(--ink); color:#fff; font-weight:800;'));
      Object.keys(byM2).map(function (m) { return [m, ebAgg(byM2[m]), byM2[m][0].o]; }).sort(function (x, y) { return y[1].bands.zero / Math.max(y[1].n, 1) - x[1].bands.zero / Math.max(x[1].n, 1); }).forEach(function (mm) { rows.push(rowHtml('<b>' + esc(mm[0]) + '</b>', 'DSO ' + esc(mm[2] || '—'), mm[1], '')); });
    } else {
      var byD = ebGroupDse(list);
      rows.push(rowHtml('<b>' + esc(state.kec) + '</b>', 'DSO ' + esc((list[0] || {}).o || '—'), tot, 'background:var(--ink); color:#fff; font-weight:800;'));
      byD.forEach(function (g) { rows.push(rowHtml('<b>' + esc(g.dse) + '</b>', 'DSE', g.a, '')); });
    }
    var tools = '<div class="map-toolbar" style="margin-bottom:8px;">' + (mode === 'area' ? '<div class="map-toolbar-group"><span class="map-label">Grup Area:</span><button type="button" class="map-btn" data-eb-expand="all">＋ Expand semua</button><button type="button" class="map-btn" data-eb-expand="none">－ Collapse semua</button></div>' : '<div class="map-toolbar-group"><span class="chip">' + (mode === 'mc' ? 'per MC / DSO · ikut filter' : 'per DSE · ikut filter') + '</span></div>') +
      '<div class="map-toolbar-group"><span class="note">Urut: persentase outlet zero stock tertinggi. Zero: merah ≥ 40% · kuning ≥ 20% · hijau di bawahnya.</span></div></div>';
    var tbl = card('Summary per ' + (mode === 'area' ? 'Region · Area · MC (DSO)' : (mode === 'mc' ? 'MC (DSO)' : 'DSE')) + ' · ' + scope,
      tools + '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th((mode === 'dse' ? 'DSE' : 'Region / Area / MC')) + th('DSO / ket.') + th('Outlet', 1) + th('Zero stock', 1) + th('&lt; 50K', 1) + th('50–100K', 1) + th('100–300K', 1) + th('≥ 300K', 1) + th('Total balance', 1) + th('Avg transaksi / hari', 1) + th('Inventory days', 1) + th('Sell-in saldo ' + M.sellin_cut_day + ' Okt', 1) + th('UAR', 1) + th('Sell-in MTD', 1) + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
      '<p class="note">DSO = pemimpin MC (satu DSO per MC), jadi baris MC sekaligus baris DSO. Persentase slab terhadap outlet pada baris itu. Sell-in saldo dari DAILY_DATA_MOBII (cut ' + esc(M.sellin_cut) + '), balance dari ENDBAL ' + esc(M.snapshot) + '.</p>');
    var cov = '<p class="note" style="margin-top:8px;">Cakupan: ' + fmtCount(M.master_outlets) + ' dari 14,694 outlet master dan ' + fmtCount(M.adhoc_outlets) + ' outlet ad-hoc punya data ENDBAL. ' + fmtCount(M.classification['tidak terpetakan'] || 0) + ' outlet di file (cluster lama, a.l. Karawang, Depok Barat, Cikarang) belum terpetakan ke DSE atau MC dan belum ikut dihitung; total balance-nya Rp ' + fmtCount(Math.round((M.unmapped_stock_balance || 0) / 1e6)) + ' Jt.</p>';
    return cards + tbl + cov;
  }

  /* ---- Zero stock outlet list ---- */
  function ebFlags(o) {
    var b = ebBal(o), f = [];
    if (b <= 0 && o.av > 0) f.push(['bad', 'Kosong, ada permintaan']);
    if (b < 50000 && o.sf >= 300000 && o.mt <= 0) f.push(['warn', 'Beli Sep, tidak Okt']);
    if (b <= 0 && !(o.av > 0) && o.mt <= 0 && o.sf <= 0) f.push(['none', 'Tidur']);
    if (b <= 0 && o.mt > 0 && !(o.av > 0)) f.push(['ok', 'Baru beli Okt, belum laku']);
    return f;
  }
  function ebSeg(o, seg) {
    var b = ebBal(o);
    if (seg === 'demand') return b <= 0 && o.av > 0;
    if (seg === 'sep') return b <= 0 && o.sf >= 300000 && o.mt <= 0;
    if (seg === 'dormant') return b <= 0 && !(o.av > 0) && o.mt <= 0 && o.sf <= 0;
    return b <= 0;
  }
  function ebPager(total, ps) {
    var page = state.ebPage || 1, tp = Math.ceil(total / ps) || 1; if (page > tp) { page = tp; state.ebPage = page; }
    return { start: (page - 1) * ps, end: Math.min(page * ps, total), html: tp > 1 ? mbPager('eb-page', page, tp, 'Menampilkan ' + (total ? (page - 1) * ps + 1 : 0) + '–' + Math.min(page * ps, total) + ' dari ' + fmtCount(total)) : '<p class="note">' + fmtCount(total) + ' baris.</p>' };
  }
  function ebFlagCell(o) { return ebFlags(o).map(function (f) { return dkTag(f[0], f[1]); }).join(' ') || '<span class="note">—</span>'; }
  function ebZero(feed, list) {
    var seg = state.ebSeg || 'all', q = (state.ebSearch || '').toLowerCase();
    var base = list.filter(function (o) { return ebBal(o) <= 0; });
    var n = { all: base.length, demand: list.filter(function (o) { return ebSeg(o, 'demand'); }).length, sep: list.filter(function (o) { return ebSeg(o, 'sep'); }).length, dormant: list.filter(function (o) { return ebSeg(o, 'dormant'); }).length };
    var rows = list.filter(function (o) { return ebSeg(o, seg) && (!q || (o.n + ' ' + o.i.join(' ') + ' ' + o.s + ' ' + o.d + ' ' + o.m).toLowerCase().indexOf(q) !== -1); });
    rows.sort(function (a, b) { return (b.av - a.av) || (b.sf - a.sf); });
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet zero stock', fmtCount(n.all), ebPct(n.all, list.length) + ' dari ' + fmtCount(list.length) + ' outlet', n.all / Math.max(list.length, 1) >= 0.3 ? 'down' : 'up', 'balance ≤ 0 pada basis terpilih') +
      kpi('Kosong dengan permintaan', fmtCount(n.demand), 'rata-rata transaksi harian > 0', 'down', 'prioritas replenishment') +
      kpi('Beli September, tidak Oktober', fmtCount(n.sep), 'zero dan sell-in saldo September ≥ Rp 300K', 'down', 'daftar reaktivasi') +
      kpi('Outlet tidur', fmtCount(n.dormant), 'tanpa balance, penjualan, atau sell-in Sep/Okt', 'down', 'kandidat bersih-bersih PJP') + '</div>';
    var seg_ = '<div class="map-toolbar" style="margin:10px 0 8px;">' + sellinBtnGroup('Segmen', 'eb-seg', [['all', 'Semua zero (' + fmtCount(n.all) + ')'], ['demand', 'Dengan permintaan (' + fmtCount(n.demand) + ')'], ['sep', 'Beli Sep, tidak Okt (' + fmtCount(n.sep) + ')'], ['dormant', 'Tidur (' + fmtCount(n.dormant) + ')']], seg) +
      '<div class="map-toolbar-group"><input type="text" id="ebSearchInput" aria-label="Cari outlet, site, DSE atau MC" placeholder="🔍 Cari outlet, ID, site, DSE, MC..." value="' + esc(state.ebSearch || '') + '" class="map-select" style="min-width:260px;"><button type="button" class="btn" data-act="eb-export">📥 Export CSV</button></div>' + grpBar('ebzero') + '</div>';
    function zRow(o) {
      return '<tr>' + dkStickyTd('<b>' + esc(o.n) + '</b><br><code style="font-size:12px;">' + esc(o.i.join(' / ')) + '</code>') + '<td><code>' + esc(o.s || '—') + '</code></td><td>' + esc(o.m) + '</td><td>' + esc(o.d) + '</td>' +
        '<td class="num">' + pjRp(ebBal(o)) + '</td><td class="num">' + pjRp(o.av) + '</td><td class="num">' + pjRp(o.y) + '</td><td class="num">' + pjRp(o.mt) + '</td><td class="num">' + pjRp(o.sf) + '</td><td>' + ebFlagCell(o) + '</td></tr>';
    }
    function zSub(items) { var t = { b: 0, av: 0, y: 0, mt: 0, sf: 0 }; items.forEach(function (o) { t.b += ebBal(o); t.av += o.av; t.y += o.y; t.mt += o.mt; t.sf += o.sf; }); return '<td class="num">' + pjRp(t.b) + '</td><td class="num">' + pjRp(t.av) + '</td><td class="num">' + pjRp(t.y) + '</td><td class="num">' + pjRp(t.mt) + '</td><td class="num">' + pjRp(t.sf) + '</td><td></td>'; }
    var hoaOf = {}; list.forEach(function (o) { if (!hoaOf[o.b]) hoaOf[o.b] = o.h; }); var dsoOf = {}; list.forEach(function (o) { if (!dsoOf[o.m]) dsoOf[o.m] = o.o; });
    var trs = grpBody('ebzero', { items: rows, area: function (o) { return o.b; }, mc: function (o) { return o.m; }, dso: function (m) { return dsoOf[m] || '—'; }, hoa: function (a) { return hoaOf[a] || '—'; },
      val: function (o) { return o.av; }, span: 4, cols: 10, sub: zSub, row: zRow, search: !!q });
    return cards + card('Outlet zero stock · ' + esc(scopeText()), seg_ + '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + dkStickyTh('Area › MC › Outlet', 1) + th('Site') + th('MC') + th('DSE') + th('Balance', 1) + th('Avg transaksi / hari', 1) + th('Sell-in kemarin', 1) + th('Sell-in MTD', 1) + th('Sell-in Sep', 1) + th('Status') + '</tr></thead><tbody>' + trs + '</tbody></table></div>' +
      '<p class="note">Dikelompokkan Area › Micro Cluster (DSO); baris grup menjumlahkan outlet di dalamnya. Diurutkan dari rata-rata transaksi harian tertinggi: outlet yang paling cepat kehilangan penjualan karena kosong tampil paling atas.</p>');
  }

  /* ---- Slab balance and inventory days ---- */
  function ebSlab(feed, list) {
    var mode = ebMode(), A = ebAgg(list), g = {}, groups;
    if (mode === 'dse') groups = ebGroupDse(list).map(function (x) { return { label: x.dse, parent: 'DSE', a: x.a }; });
    else { list.forEach(function (o) { var k = mode === 'area' ? o.b : o.m; (g[k] || (g[k] = [])).push(o); }); groups = Object.keys(g).map(function (k) { return { label: k, parent: mode === 'area' ? 'Area' : 'DSO ' + (g[k][0].o || '—'), a: ebAgg(g[k]) }; }).sort(function (x, y) { return y.a.bands.zero / Math.max(y.a.n, 1) - x.a.bands.zero / Math.max(x.a.n, 1); }); }
    function cell(n, d, kind) {
      if (!n) return '<td class="num" style="color:var(--ij-label);">·</td>';
      var pc = d ? n / d : 0, c = DK_COL[kind];
      return '<td class="num" style="background:' + c[0] + '; color:' + c[1] + ';"><b>' + fmtCount(n) + '</b><br><span style="font-size:12px; font-weight:700;">' + (pc * 100).toFixed(1) + '%</span></td>';
    }
    function table(title, cols, key, rowsF) {
      var head = '<tr>' + th(mode === 'area' ? 'Area' : (mode === 'mc' ? 'MC (DSO)' : 'DSE')) + th('Outlet', 1) + cols.map(function (c) { var cc = DK_COL[c[2]]; return '<th class="num" style="background:' + cc[0] + '; color:' + cc[1] + ';">' + c[1] + '</th>'; }).join('') + '</tr>';
      var body = groups.map(function (x) { return '<tr><td class="cur" style="' + DK_STICKY + ' background:#fff;"><b>' + esc(x.label) + '</b><div class="note">' + esc(x.parent) + '</div></td><td class="num">' + fmtCount(x.a.n) + '</td>' + cols.map(function (c) { return cell(x.a[key][c[0]], x.a.n, c[2]); }).join('') + '</tr>'; }).join('');
      var totRow = '<tr style="background:var(--ij-ink); color:#fff; font-weight:800;"><td>TOTAL</td><td class="num">' + fmtCount(A.n) + '</td>' + cols.map(function (c) { return '<td class="num">' + fmtCount(A[key][c[0]]) + '<br>' + ebPct(A[key][c[0]], A.n) + '</td>'; }).join('') + '</tr>';
      return card(title + ' · ' + esc(scopeText()), '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head + '</thead><tbody>' + body + totRow + '</tbody></table></div>');
    }
    var cover = table('Inventory days (balance ÷ rata-rata transaksi harian)', EB_COVER, 'cover');
    return table('Slab balance outlet', EB_BANDS, 'bands') + cover +
      '<p class="note" style="margin-top:8px;">Slab sama dengan kolom GAPLOK OSA (di bawah 50K, 50–100K, 100K ke atas, ambang 300K). Inventory days dihitung dari balance basis terpilih dibagi rata-rata transaksi harian Stock Account; outlet tanpa penjualan masuk "tanpa penjualan". Kuning/merah menandai kondisi yang perlu tindakan: balance rendah, cover di bawah 1 hari, atau lebih dari 30 hari.</p>';
  }

  /* ---- Site with zero outlets ---- */
  function ebSites(feed, list) {
    var q = (state.ebSearch || '').toLowerCase(), g = {};
    list.forEach(function (o) { if (!o.s) return; var k = o.s + '::' + o.m; (g[k] || (g[k] = { key: k, site: o.s, mc: o.m, dso: o.o, br: o.b, list: [] })).list.push(o); });
    var sites = Object.keys(g).map(function (k) { var x = g[k]; x.n = x.list.length; x.zero = x.list.filter(function (o) { return ebBal(o) <= 0; }).length; x.dem = x.list.filter(function (o) { return ebBal(o) <= 0 && o.av > 0; }).length; x.a = ebAgg(x.list); var dc = {}; x.list.forEach(function (o) { dc[o.d] = (dc[o.d] || 0) + 1; }); x.dse = Object.keys(dc).sort(function (a, b) { return dc[b] - dc[a]; })[0] || 'UNASSIGNED'; return x; });
    var withZero = sites.filter(function (x) { return x.zero > 0; }), allZero = sites.filter(function (x) { return x.zero === x.n; });
    var rows = withZero.filter(function (x) { return !q || (x.site + ' ' + x.mc + ' ' + x.dso).toLowerCase().indexOf(q) !== -1; }).sort(function (a, b) { return (b.zero / b.n - a.zero / a.n) || (b.zero - a.zero); });
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Site dalam lingkup', fmtCount(sites.length), 'site DSO (site × MC) dengan outlet ber-ENDBAL', 'up', esc(scopeText())) +
      kpi('Site dengan ≥ 1 outlet zero', fmtCount(withZero.length), ebPct(withZero.length, sites.length) + ' dari site', withZero.length / Math.max(sites.length, 1) >= 0.7 ? 'down' : 'up', 'minimal satu outlet balance ≤ 0') +
      kpi('Site seluruh outlet zero', fmtCount(allZero.length), ebPct(allZero.length, sites.length) + ' dari site', allZero.length ? 'down' : 'up', 'tidak ada satu pun outlet yang punya stok') +
      kpi('Outlet zero di site bermasalah', fmtCount(withZero.reduce(function (a, x) { return a + x.zero; }, 0)), 'dari ' + fmtCount(withZero.reduce(function (a, x) { return a + x.n; }, 0)) + ' outlet di site tersebut', 'down', 'untuk rute replenishment') + '</div>';
    var dsoOf = {}, hoaOf = {}; list.forEach(function (o) { dsoOf[o.m] = o.o; hoaOf[o.b] = o.h; });
    var row = function (x) {
      var open = state.ebSite === x.key;
      var main = '<tr><td class="cur" style="padding-left:56px;"><code>' + esc(x.site) + '</code></td><td class="num">' + fmtCount(x.n) + '</td><td class="num">' + ebZeroTag(x.zero, x.n) + '</td><td class="num">' + fmtCount(x.dem) + '</td><td class="num">' + ebPct(x.a.bands.b300, x.n) + '</td><td class="num">' + pjRp(x.a.bal) + '</td><td class="num">' + pjRp(x.a.y) + '</td><td>' + (x.zero === x.n ? dkTag('bad', 'Seluruh outlet zero') : dkTag('warn', 'Sebagian zero')) + '</td><td><button type="button" class="btn" data-eb-site="' + (open ? '' : esc(x.key)) + '" style="font-size:13px; padding:4px 9px;">' + (open ? '▾ Tutup' : '▸ Outlet') + '</button></td></tr>';
      if (!open) return main;
      var sub = x.list.slice().sort(function (a, b) { return ebBal(a) - ebBal(b); }).map(function (o) { return '<tr><td><b>' + esc(o.n) + '</b> <code style="font-size:12px;">' + esc(o.i.join(' / ')) + '</code></td><td>' + esc(o.d) + '</td><td class="num">' + pjRp(ebBal(o)) + '</td><td class="num">' + pjRp(o.av) + '</td><td class="num">' + (o.av > 0 ? (ebBal(o) / o.av).toFixed(1) : '—') + '</td><td class="num">' + pjRp(o.y) + '</td><td>' + ebFlagCell(o) + '</td></tr>'; }).join('');
      return main + '<tr><td colspan="9" style="background:var(--ij-ground); padding:8px 12px;"><div class="tbl-wrap"><table class="tbl" data-nosort="1"><thead><tr>' + th('Outlet') + th('DSE') + th('Balance', 1) + th('Avg transaksi', 1) + th('Inventory days', 1) + th('Sell-in kemarin', 1) + th('Status') + '</tr></thead><tbody>' + sub + '</tbody></table></div></td></tr>';
    };
    var sub = function (it) { var n = grpSum(it, function (x) { return x.n; }), z = grpSum(it, function (x) { return x.zero; }); return '<td class="num">' + fmtCount(n) + '</td><td class="num">' + ebZeroTag(z, n) + '</td><td class="num">' + fmtCount(grpSum(it, function (x) { return x.dem; })) + '</td><td class="num">' + ebPct(grpSum(it, function (x) { return x.a.bands.b300; }), n) + '</td><td class="num">' + pjRp(grpSum(it, function (x) { return x.a.bal; })) + '</td><td class="num">' + pjRp(grpSum(it, function (x) { return x.a.y; })) + '</td><td></td><td></td>'; };
    var trs = grpBody('ebsite', { items: rows, area: function (x) { return x.br; }, mc: function (x) { return x.mc; }, dse: function (x) { return x.dse; }, dso: function (m) { return dsoOf[m] || '—'; }, hoa: function (a) { return hoaOf[a] || '—'; }, val: function (x) { return x.zero; }, span: 1, cols: 9, sub: sub, row: row, unit: 'site', cap: 150, search: !!q });
    return cards + card('Site dengan outlet balance zero · ' + esc(scopeText()),
      '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group"><input type="text" id="ebSearchInput" aria-label="Cari site, MC atau DSO" placeholder="🔍 Cari site, MC, DSO..." value="' + esc(state.ebSearch || '') + '" class="map-select" style="min-width:260px;"></div>' + grpBar('ebsite') + '</div>' +
      '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('Area › MC › DSE › Site NBS') + th('Outlet', 1) + th('Zero stock', 1) + th('Zero dengan permintaan', 1) + th('% ≥ 300K', 1) + th('Total balance', 1) + th('Sell-in kemarin', 1) + th('Status') + th('Outlet') + '</tr></thead><tbody>' + trs + '</tbody></table></div>' +
      '<p class="note">Dikelompokkan Area › Micro Cluster (DSO) › DSE utama site (DSE dengan outlet terbanyak di site itu). Urut jumlah outlet zero. Site = site DSO (site × MC). Outlet tanpa site (PENDING-NBS) tidak ikut.</p>');
  }

  /* ---- Detail per DSO and DSE ---- */
  function ebDetailRow(o) {
    var b = ebBal(o), tot = o.st + o.ot + o.cm;
    return '<tr><td><code>' + esc(o.i.join(' / ')) + '</code></td><td><b>' + esc(o.n) + '</b></td><td class="num">' + pjRp(o.st) + '</td><td class="num">' + pjRp(o.cm) + '</td><td class="num">' + pjRp(o.ot) + '</td><td class="num">' + pjRp(tot) + '</td><td class="num">' + pjRp(o.av) + '</td><td class="num cur"><b>' + pjRp(b) + '</b></td><td class="num">' + (o.av > 0 ? (b / o.av).toFixed(1) : '—') + '</td><td>' + dkTag(b <= 0 ? 'bad' : (b < 50000 ? 'warn' : (b >= 300000 ? 'top' : 'ok')), EB_BANDS.filter(function (x) { return x[0] === ebBand(b); })[0][1]) + '</td></tr>';
  }
  function ebDetail(feed, list) {
    var q = (state.ebSearch || '').toLowerCase();
    var groups = ebGroupDse(list).filter(function (g) { return !q || (g.dse + ' ' + g.mc + ' ' + g.dso).toLowerCase().indexOf(q) !== -1; });
    var pg = ebPager(groups.length, 25), open = state.ebOpen || {};
    var detHead = '<tr>' + th('Outlet ID') + th('Outlet Name') + th('Stock Account', 1) + th('Komisi', 1) + th('Rekening lainnya', 1) + th('Total semua rekening', 1) + th('Average transaksi', 1) + th('Balance terakhir', 1) + th('Inventory days', 1) + th('Slab') + '</tr>';
    var body = '', lastMc = null;
    groups.slice(pg.start, pg.end).forEach(function (g) {
      if (g.mc !== lastMc) { lastMc = g.mc; body += '<tr style="background:var(--ij-ink); color:#fff; font-weight:800;"><td colspan="10">DSO ' + esc(g.dso || '—') + ' · ' + esc(g.mc) + ' · ' + esc(g.br) + '</td></tr>'; }
      var isOpen = !!open[g.key], a = g.a;
      body += '<tr style="background:var(--ij-wash); font-weight:700;"><td colspan="2"><button type="button" class="btn" data-eb-open="' + esc(g.key) + '" aria-expanded="' + isOpen + '" style="padding:2px 8px; font-size:13px; margin-right:6px;">' + (isOpen ? '－' : '＋') + '</button>DSE ' + esc(g.dse) + ' · ' + fmtCount(a.n) + ' outlet</td><td class="num">' + pjRp(a.bal) + '</td><td class="num">' + pjRp(a.comm) + '</td><td class="num">' + pjRp(a.other) + '</td><td class="num">' + pjRp(a.bal + a.other + a.comm) + '</td><td class="num">' + pjRp(a.av) + '</td><td class="num">' + pjRp(a.bal) + '</td><td class="num">' + (a.cov == null ? '—' : a.cov.toFixed(1)) + '</td><td>' + ebZeroTag(a.bands.zero, a.n) + ' zero</td></tr>';
      if (isOpen) {
        var outs = g.list.slice().sort(function (x, y) { return ebBal(x) - ebBal(y); });
        body += outs.slice(0, 300).map(ebDetailRow).join('') + (outs.length > 300 ? '<tr><td colspan="10" class="note">300 dari ' + fmtCount(outs.length) + ' outlet ditampilkan (terendah dulu); gunakan Export CSV untuk semua.</td></tr>' : '');
      }
    });
    var tools = '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group"><button type="button" class="map-btn" data-eb-expand="dse">＋ Buka semua DSE (halaman ini ' + fmtCount(pg.end - pg.start) + ')</button><button type="button" class="map-btn" data-eb-expand="none">－ Tutup semua</button></div>' +
      '<div class="map-toolbar-group"><input type="text" id="ebSearchInput" aria-label="Cari DSE, MC atau DSO" placeholder="🔍 Cari DSE, MC, DSO..." value="' + esc(state.ebSearch || '') + '" class="map-select" style="min-width:240px;"><button type="button" class="btn" data-act="eb-export">📥 Export CSV (semua outlet)</button></div></div>';
    return card('Detail per DSO dan DSE · ' + esc(scopeText()) + ' · ' + fmtCount(groups.length) + ' grup DSE',
      tools + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + detHead + '</thead><tbody>' + body + '</tbody></table></div>' + pg.html +
      '<p class="note">Setiap DSO (MC) memuat DSE-nya; klik ＋ untuk melihat outlet. Saldo per Account Type: Stock Account Normal, Commission Transaction Account, dan rekening tanpa label. "Total" menjumlah semua rekening; "Balance terakhir" adalah balance basis terpilih yang dipakai untuk slab dan inventory days. Grup diurut dari persentase zero tertinggi.</p>');
  }

  function ebExportCsv(feed) {
    if (typeof window === 'undefined') return;
    function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var list = ebScope(feed.outlets), lines = [['Area', 'MC', 'DSO', 'DSE', 'Site', 'Outlet ID', 'Outlet Name', 'Stock Account', 'Komisi', 'Rekening lainnya', 'Total semua rekening', 'Average transaksi harian', 'Balance terakhir (basis)', 'Inventory days', 'Sell-in saldo kemarin', 'Sell-in saldo MTD', 'Sell-in saldo Sep penuh', 'Status'].map(q).join(',')];
    list.forEach(function (o) { var b = ebBal(o); lines.push([o.b, o.m, o.o, o.d, o.s, o.i.join(' / '), o.n, o.st, o.cm, o.ot, o.st + o.cm + o.ot, o.av, b, o.av > 0 ? (b / o.av).toFixed(1) : '', o.y, o.mt, o.sf, ebFlags(o).map(function (f) { return f[1]; }).join('; ')].map(q).join(',')); });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = 'end_balance_outlet_' + feed.metadata.snapshot + '.csv'; link.click();
  }

  function viewEndBalance(embed) {
    var feed = ebFeed();
    if (!feed) return card('END BALANCE Outlet', '<p class="note">Feed belum dibangun. Jalankan <code>python3 scripts/build_endbal_feed.py</code>.</p>');
    var list = ebScope(feed.outlets), tab = state.ebTab || 'ringkasan';
    if (embed && tab === 'detail') tab = state.ebTab = 'ringkasan';
    var body = tab === 'zero' ? ebZero(feed, list) : (tab === 'slab' ? ebSlab(feed, list) : (tab === 'site' ? ebSites(feed, list) : (tab === 'detail' ? ebDetail(feed, list) : ebRingkasan(feed, list))));
    return ebTabNav(embed) + ebBasisBar() + body;
  }

  /* ================= DSE PRODUCTIVITY · KPI DSE Oct 2026 ================= */
  var DK_COL = { bad: ['#fee2e2', '#991b1b'], warn: ['#fef3c7', '#92400e'], ok: ['#dcfce7', '#166534'], top: ['#86efac', '#14532d'], none: ['#f3f4f6', '#4b5563'] };
  function dkFeed() { return (typeof window !== 'undefined' && window.DSE_KPI_FEED) ? window.DSE_KPI_FEED : null; }
  function dkOpt() { return { basis: state.dkBasis || 'prorata', osa: state.dkOsa || 'all', ec: state.dkEc || 'prod', sp: 'target' }; }
  function dkTag(kind, text) { var c = DK_COL[kind]; return '<span style="display:inline-block; padding:2px 7px; font:700 13px var(--ij-font); background:' + c[0] + '; color:' + c[1] + '; border:1px solid ' + c[1] + '33; white-space:nowrap;">' + text + '</span>'; }
  function dkScore(r, F, opt) {
    var P = F.policy, M = F.metadata, f = opt.basis === 'full' ? 1 : M.cut_day / M.month_days, o = { f: f };
    var amt = opt.osa === 'all' ? r.osa_all : r.osa_amt, tgtFull = (opt.osa === 'all' && r.osa_tgt_src !== 'official') ? r.osa_tgt_all : r.osa_tgt;
    o.osaAmt = amt; o.osaTgt = tgtFull * f; o.osaAch = o.osaTgt > 0 ? amt / o.osaTgt : null;
    var slab = -1, rate = 0;
    if (o.osaAch != null) P.osa.slabs.forEach(function (sl, i) { if (o.osaAch >= sl.sla - 1e-9) { slab = i; rate = sl.rate; } });
    o.osaSlab = slab; o.osaRate = rate; o.osaInc = Math.min(P.osa.max_rp, rate * amt);
    var T = P.sp.tiers; o.spT = [T[0].pcs * f, T[1].pcs * f]; o.sp = r.sp_pcs; o.spOfficial = false;
    if (opt.sp !== 'policy' && r.sp_tgt > 0) { o.spOfficial = true; o.spTgt = r.sp_tgt * f; o.spT = [0.9 * o.spTgt, o.spTgt]; }
    o.spAch = o.spOfficial && o.spTgt > 0 ? r.sp_pcs / o.spTgt : null;
    o.spSlab = r.sp_pcs >= o.spT[1] - 1e-9 ? 1 : (r.sp_pcs >= o.spT[0] - 1e-9 ? 0 : -1);
    o.spInc = o.spSlab < 0 ? 0 : P.sp.max_rp * T[o.spSlab].payout;
    var U = P.compliance.uar, E = P.compliance.ec, cap = P.compliance.cap;
    o.uarTgt = (r.cls === 'R' ? U.target_rural : U.target_urban) * f; o.uar = r.sp_uar5;
    o.uarAch = o.uarTgt > 0 ? Math.min(cap, r.sp_uar5 / o.uarTgt) : 0;
    o.ecNum = opt.ec === 'exec' ? r.actual : r.prod; o.ecDen = r.planned;
    o.ec = r.planned > 0 ? o.ecNum / r.planned : null;
    o.ecAch = o.ec == null ? 0 : Math.min(cap, o.ec / E.target);
    o.comp = U.weight * o.uarAch + E.weight * o.ecAch;
    o.idx = 0;
    for (var i = 0; i < P.compliance.index.length; i++) { if (o.comp >= P.compliance.index[i].min - 1e-9) { o.idx = P.compliance.index[i].x; break; } }
    o.total = o.osaInc + o.spInc; o.final = o.total * o.idx;
    return o;
  }
  function dkInScope(r) { return (!state.branch || r.br === state.branch) && (!state.hoa || r.hoa === state.hoa) && (!state.kec || r.mc === state.kec) && (!state.dse || dseNorm(r.n) === state.dse); }
  function dkSlabOsaTag(o) { return o.osaSlab < 0 ? (o.osaAch == null ? dkTag('none', 'tanpa target') : dkTag('bad', '&lt; 90%')) : (o.osaSlab === 0 ? dkTag('ok', '90% · 0.2%') : dkTag('top', '100% · 0.4%')); }
  function dkSlabSpTag(o) { return o.spOfficial ? (o.spSlab < 0 ? dkTag('bad', '&lt; 90%') : (o.spSlab === 0 ? dkTag('ok', '90% · ≥' + fmtCount(Math.round(o.spT[0]))) : dkTag('top', '100% · ≥' + fmtCount(Math.round(o.spT[1]))))) : o.spSlab < 0 ? dkTag('bad', '&lt; ' + fmtCount(Math.round(o.spT[0]))) : (o.spSlab === 0 ? dkTag('ok', '90% · ≥' + fmtCount(Math.round(o.spT[0]))) : dkTag('top', '100% · ≥' + fmtCount(Math.round(o.spT[1])))); }
  function dkIdxTag(idx) { return idx >= 1 ? dkTag('top', '× 1') : (idx > 0 ? dkTag('warn', '× ' + idx) : dkTag('bad', '× 0')); }
  function dkPctTag(v, hi, mid) { return v == null ? dkTag('none', '—') : dkTag(v >= hi ? 'top' : (v >= mid ? 'ok' : (v >= mid * 0.6 ? 'warn' : 'bad')), (v * 100).toFixed(1) + '%'); }
  function dkStack(parts) {
    var tot = parts.reduce(function (a, x) { return a + x[1]; }, 0) || 1;
    return '<div style="display:flex; height:22px; border:1px solid var(--ij-ink); margin:4px 0;">' + parts.map(function (x) { return x[1] ? '<div title="' + esc(x[0]) + ': ' + x[1] + '" style="flex:' + x[1] + '; background:' + DK_COL[x[2]][0] + '; color:' + DK_COL[x[2]][1] + '; font:700 12px/20px var(--ij-font); text-align:center; overflow:hidden;">' + x[1] + '</div>' : ''; }).join('') + '</div>' +
      '<div style="font:500 12px var(--ij-font); color:var(--ij-muted);">' + parts.map(function (x) { return '<span style="margin-right:10px;"><span style="display:inline-block; width:10px; height:10px; background:' + DK_COL[x[2]][0] + '; border:1px solid ' + DK_COL[x[2]][1] + '; vertical-align:middle;"></span> ' + x[0] + '</span>'; }).join('') + '</div>';
  }
  var DK_BAND = { osa: ['#e3eefb', '#16365c'], sp: ['#fdeedb', '#6b3a00'], cmp: ['#e2f3e2', '#17441a'], inc: ['#efe3f7', '#42175e'] };
  var DK_BL = ' border-left:2px solid var(--ij-ink);';
  var DK_STICKY = ' position:sticky; left:0; z-index:2;';
  function dkMini(parts) {
    return '<div title="' + esc(parts.map(function (x) { return x[0] + ': ' + x[1]; }).join(' · ')) + '" style="display:flex; min-width:118px; height:22px; border:1px solid var(--ij-ink);">' +
      parts.map(function (x) { return x[1] ? '<div style="flex:' + x[1] + '; min-width:20px; background:' + DK_COL[x[2]][0] + '; color:' + DK_COL[x[2]][1] + '; font:700 12px/20px var(--ij-font); text-align:center;">' + x[1] + '</div>' : ''; }).join('') + '</div>';
  }
  function dkBandTh(key, title, sub, cols) {
    var c = DK_BAND[key];
    return '<th colspan="' + cols + '" style="text-align:center; background:' + c[0] + '; color:' + c[1] + ';' + DK_BL + ' border-bottom:1px solid ' + c[1] + '; padding:6px 8px;">' + title + '<div style="font:500 12px var(--ij-font); text-transform:none; letter-spacing:0;">' + sub + '</div></th>';
  }
  function dkSubTh(key, label, first, num) {
    var c = DK_BAND[key];
    return '<th' + (num ? ' class="num"' : '') + ' style="background:' + c[0] + '; color:' + c[1] + ';' + (first ? DK_BL : '') + '">' + label + '</th>';
  }
  function dkTd(html, first, cls, style) { return '<td' + (cls ? ' class="' + cls + '"' : '') + ' style="' + (first ? DK_BL : '') + (style || '') + '">' + html + '</td>'; }
  function dkStickyTd(html, bg) { return '<td class="cur" style="' + DK_STICKY + ' background:' + (bg || '#fff') + ';">' + html + '</td>'; }
  function dkStickyTh(label, rowspan) { return '<th rowspan="' + rowspan + '" style="' + DK_STICKY + ' z-index:3; background:var(--ij-surface); vertical-align:bottom;">' + label + '</th>'; }
  function dkDetail(r, o, F, cols) {
    var P = F.policy, M = F.metadata, f = o.f, T = P.sp.tiers;
    function box(title, key, rows) {
      var c = DK_BAND[key];
      return '<div style="border:2px solid ' + c[1] + '; background:#fff;"><div style="background:' + c[0] + '; color:' + c[1] + '; font:800 13px var(--ij-font); text-transform:uppercase; letter-spacing:.05em; padding:6px 10px;">' + title + '</div><div style="padding:8px 10px; font:500 14px/1.5 var(--ij-font);">' + rows.join('<br>') + '</div></div>';
    }
    var osaRows = [
      'Amount OSA: <b>' + pjRp(o.osaAmt) + '</b> (' + fmtCount(r.osa_out) + ' dari ' + fmtCount(r.assigned) + ' outlet mapping ≥ Rp 300K)',
      'Target: <b>' + pjRp(o.osaTgt) + '</b>' + (f < 1 ? ' = ' + pjRp(o.osaTgt / f) + ' × ' + M.cut_day + '/' + M.month_days : '') + (r.osa_tgt_src === 'proxy' ? ' <span class="note">(proxy September)</span>' : ''),
      'Pencapaian: <b>' + (o.osaAch == null ? '—' : (o.osaAch * 100).toFixed(1) + '%') + '</b> → slab ' + dkSlabOsaTag(o),
      'Insentif: ' + (o.osaSlab < 0 ? '<b>Rp 0</b> (di bawah SLA 90%)' : (o.osaRate * 100).toFixed(1) + '% × ' + pjRp(o.osaAmt) + ' = ' + (o.osaRate * o.osaAmt > P.osa.max_rp ? pjRp(o.osaRate * o.osaAmt) + ' → dibatasi <b>' + pjRp(P.osa.max_rp) + '</b>' : '<b>' + pjRp(o.osaInc) + '</b>'))
    ];
    var spRows = [
      'SP terjual: <b>' + fmtCount(o.sp) + ' pcs</b> di ' + fmtCount(r.sp_out) + ' outlet',
      'Tier 1 (90%): ≥ <b>' + fmtCount(Math.round(o.spT[0])) + '</b> pcs → ' + pjRp(P.sp.max_rp * T[0].payout),
      'Tier 2 (100%): ≥ <b>' + fmtCount(Math.round(o.spT[1])) + '</b> pcs → ' + pjRp(P.sp.max_rp * T[1].payout),
      'Slab: ' + dkSlabSpTag(o) + ' → insentif <b>' + pjRp(o.spInc) + '</b>' + (o.spSlab < 0 ? ' <span class="note">(kurang ' + fmtCount(Math.max(0, Math.round(o.spT[0] - o.sp))) + ' pcs ke tier 1)</span>' : '')
    ];
    var cmpRows = [
      'UAR ≥ 5 pcs: <b>' + fmtCount(o.uar) + '</b> outlet · target <b>' + (Math.round(o.uarTgt * 10) / 10) + '</b> (' + (r.cls === 'R' ? P.compliance.uar.target_rural + ' rural' : P.compliance.uar.target_urban + ' urban') + (f < 1 ? ' × ' + M.cut_day + '/' + M.month_days : '') + ') → skor ' + dkPctTag(o.uarAch, 1, 0.9),
      'Effective call: <b>' + fmtCount(o.ecNum) + '</b> ' + (state.dkEc === 'exec' ? 'visit terlaksana' : 'visit produktif') + ' ÷ <b>' + fmtCount(o.ecDen) + '</b> rencana' + (r.vis ? ' = ' + (o.ec == null ? '—' : (o.ec * 100).toFixed(1) + '%') : ' <span class="note">(tanpa data PJP)</span>') + ' · target 50% → skor ' + dkPctTag(o.ecAch, 1, 0.9),
      'Skor compliance = ' + (P.compliance.uar.weight * 100) + '% × ' + (o.uarAch * 100).toFixed(0) + '% + ' + (P.compliance.ec.weight * 100) + '% × ' + (o.ecAch * 100).toFixed(0) + '% = <b>' + (o.comp * 100).toFixed(1) + '%</b> → index ' + dkIdxTag(o.idx)
    ];
    var incRows = [
      'Insentif OSA: ' + pjRp(o.osaInc),
      '+ Insentif SP: ' + pjRp(o.spInc),
      '= Total: <b>' + pjRp(o.total) + '</b>',
      '× Index ' + o.idx + ' = <b style="font-size:17px;">' + pjRp(o.final) + '</b>',
      o.total > 0 && o.idx < 1 ? '<span class="note">index memotong ' + pjRp(o.total - o.final) + '</span>' : ''
    ];
    return '<tr><td colspan="' + cols + '" style="background:var(--ij-ground); padding:10px 12px;"><div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap:12px;">' +
      box('OSA · bobot 40%', 'osa', osaRows) + box('SP Data Sell In · bobot 60%', 'sp', spRows) + box('Compliance', 'cmp', cmpRows) + box('Insentif', 'inc', incRows) + '</div></td></tr>';
  }
  function dkAgg(list, F, opt) {
    var A = { n: list.length, withVis: 0, amt: 0, tgt: 0, osaInc: 0, osaSl: [0, 0, 0, 0], sp: 0, spTgt: 0, spOf: 0, spInc: 0, spSl: [0, 0, 0], uar: 0, uarTgt: 0, ecNum: 0, ecDen: 0, comp: 0, idx: { '1': 0, '0.97': 0, '0.95': 0, '0': 0 }, total: 0, final: 0, rows: [] };
    list.forEach(function (r) {
      var o = dkScore(r, F, opt); A.rows.push({ r: r, o: o });
      A.amt += o.osaAmt; A.tgt += o.osaTgt; A.osaInc += o.osaInc; A.osaSl[o.osaAch == null ? 3 : o.osaSlab + 1]++;
      A.sp += o.sp; A.spInc += o.spInc; A.spSl[o.spSlab + 1]++; if (o.spOfficial) { A.spTgt += o.spTgt; A.spOf += o.sp; }
      A.uar += o.uar; A.uarTgt += o.uarTgt;
      if (r.vis) { A.withVis++; A.ecNum += o.ecNum; A.ecDen += o.ecDen; }
      A.comp += o.comp; A.idx[String(o.idx)]++; A.total += o.total; A.final += o.final;
    });
    A.osaAch = A.tgt > 0 ? A.amt / A.tgt : null; A.spOfAch = A.spTgt > 0 ? A.spOf / A.spTgt : null; A.ec = A.ecDen > 0 ? A.ecNum / A.ecDen : null; A.compAvg = A.n ? A.comp / A.n : 0;
    return A;
  }
  /* ---- DSE scorecard: grouping (Area / MC / DSO) with collapse-expand, per-column sort, value filters, CSV download ---- */
  var DK_COLS = [
    { k: 'name', label: 'DSE', t: 'text', row: function (x) { return x.r.n; }, grp: function (g) { return g.label; } },
    { k: 'mc', label: 'MC', t: 'text', row: function (x) { return x.r.mc; }, grp: function (g) { return g.mcLabel || ''; } },
    { k: 'osaAmt', band: 'osa', label: 'Amount', t: 'rp', first: true, row: function (x) { return x.o.osaAmt; }, grp: function (g) { return g.a.amt; } },
    { k: 'osaTgt', band: 'osa', label: 'Target', t: 'rp', row: function (x) { return x.o.osaTgt; }, grp: function (g) { return g.a.tgt; } },
    { k: 'osaAch', band: 'osa', label: 'Ach. · slab', t: 'pct', row: function (x) { return x.o.osaAch; }, grp: function (g) { return g.a.osaAch; } },
    { k: 'osaInc', band: 'osa', label: 'Insentif', t: 'rp', row: function (x) { return x.o.osaInc; }, grp: function (g) { return g.a.osaInc; } },
    { k: 'sp', band: 'sp', label: 'Pcs', t: 'num', first: true, row: function (x) { return x.o.sp; }, grp: function (g) { return g.a.sp; } },
    { k: 'spTgt', band: 'sp', label: 'Target', t: 'num', row: function (x) { return x.o.spOfficial ? x.o.spTgt : null; }, grp: function (g) { return g.a.spTgt > 0 ? g.a.spTgt : null; } },
    { k: 'spAch', band: 'sp', label: 'Ach. · slab', t: 'pct', row: function (x) { return x.o.spAch; }, grp: function (g) { return g.a.spTgt > 0 ? g.a.spOfAch : null; } },
    { k: 'spInc', band: 'sp', label: 'Insentif', t: 'rp', row: function (x) { return x.o.spInc; }, grp: function (g) { return g.a.spInc; } },
    { k: 'uar', band: 'cmp', label: 'UAR ≥5 pcs / target', t: 'num', first: true, row: function (x) { return x.o.uar; }, grp: function (g) { return g.a.uar; } },
    { k: 'ec', band: 'cmp', label: 'Effective call', t: 'pct', row: function (x) { return x.o.ec; }, grp: function (g) { return g.a.ec; } },
    { k: 'comp', band: 'cmp', label: 'Skor · index', t: 'pct', row: function (x) { return x.o.comp; }, grp: function (g) { return g.a.compAvg; } },
    { k: 'total', band: 'inc', label: 'Total', t: 'rp', first: true, row: function (x) { return x.o.total; }, grp: function (g) { return g.a.total; } },
    { k: 'final', band: 'inc', label: 'Final', t: 'rp', row: function (x) { return x.o.final; }, grp: function (g) { return g.a.final; } }
  ];
  var DK_GROUPS = [['none', 'Tanpa grup'], ['area', 'Area'], ['mc', 'Teritori (MC)'], ['dso', 'DSO'], ['area_mc', 'Area → MC']];
  var DK_OPS = [['ge', '≥ minimal'], ['le', '≤ maksimal'], ['eq', '= sama dengan'], ['bt', 'antara'], ['ct', 'mengandung teks']];
  function dkCol(k) { for (var i = 0; i < DK_COLS.length; i++) if (DK_COLS[i].k === k) return DK_COLS[i]; return DK_COLS[0]; }
  function dkParseNum(txt, type) {
    // accepts 40jt, 1,5 M, 500rb, 80%, 1.234.567, 12,5. Units: rb/ribu/k = 1e3, jt/juta = 1e6, m/milyar/miliar = 1e9 (M = milyar). Percent columns take a percent number.
    var s = String(txt == null ? '' : txt).trim().toLowerCase().replace(/\s+/g, '').replace(/^rp/, '');
    if (!s) return null;
    var m = s.match(/^([0-9.,]+)(rb|ribu|k|jt|juta|m|milyar|miliar|b)?%?$/);
    if (!m) return null;
    var n = m[1];
    if (n.indexOf('.') >= 0 && n.indexOf(',') >= 0) n = n.replace(/\./g, '').replace(',', '.');
    else if (n.indexOf(',') >= 0) n = n.replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(n)) n = n.replace(/\./g, '');
    var v = parseFloat(n); if (isNaN(v)) return null;
    var mult = { rb: 1e3, ribu: 1e3, k: 1e3, jt: 1e6, juta: 1e6, m: 1e9, milyar: 1e9, miliar: 1e9, b: 1e9 }[m[2]] || 1;
    v *= mult;
    return type === 'pct' ? v / 100 : v;
  }
  function dkFilterText(f) {
    var c = dkCol(f.k), fmt = function (v) { return c.t === 'pct' ? (v * 100).toFixed(1).replace(/\.0$/, '') + '%' : (c.t === 'rp' ? pjRp(v) : fmtCount(v)); };
    if (f.op === 'ct') return c.label + ' mengandung "' + f.s + '"';
    return (c.band ? { osa: 'OSA ', sp: 'SP ', cmp: '', inc: 'Insentif ' }[c.band] : '') + c.label + ' ' + ({ ge: '≥ ', le: '≤ ', eq: '= ' }[f.op] || '') + (f.op === 'bt' ? 'antara ' + fmt(f.a) + ' dan ' + fmt(f.b) : fmt(f.a));
  }
  function dkPass(x, filters, q) {
    if (q) { var hay = (x.r.n + ' ' + x.r.mc + ' ' + (x.r.dso || '') + ' ' + x.r.br).toLowerCase(); if (hay.indexOf(q) === -1) return false; }
    for (var i = 0; i < filters.length; i++) {
      var f = filters[i], c = dkCol(f.k), v = c.row(x);
      if (f.op === 'ct') { if (String(v == null ? '' : v).toLowerCase().indexOf(String(f.s).toLowerCase()) === -1) return false; continue; }
      if (v == null || typeof v !== 'number') return false;
      var tol = c.t === 'pct' ? 0.0005 : 0.5;
      if (f.op === 'ge' && v < f.a - 1e-9) return false;
      if (f.op === 'le' && v > f.a + 1e-9) return false;
      if (f.op === 'eq' && Math.abs(v - f.a) > tol) return false;
      if (f.op === 'bt' && (v < Math.min(f.a, f.b) - 1e-9 || v > Math.max(f.a, f.b) + 1e-9)) return false;
    }
    return true;
  }
  function dkCmp(accessor, dir, isText) {
    var sgn = dir === 'asc' ? 1 : -1;
    return function (x, y) {
      var a = accessor(x), b = accessor(y);
      if (a == null && b == null) return 0; if (a == null) return 1; if (b == null) return -1;   // nulls always last
      if (isText) return sgn * String(a).toUpperCase().localeCompare(String(b).toUpperCase());
      return sgn * (a - b);
    };
  }
  // Builds everything the scorecard needs (also used by the CSV export): filtered, sorted, grouped
  function dkModel(F, opt, list) {
    var gb = state.dkGroupBy || 'area_mc', col = dkCol(state.dkSortCol || 'final'), dir = state.dkSortDir || 'desc', isText = col.t === 'text';
    var q = (state.dkSearch || '').toLowerCase(), filters = state.dkFilters || [];
    var all = list.map(function (r) { return { r: r, o: dkScore(r, F, opt) }; });
    var rows = all.filter(function (x) { return dkPass(x, filters, q); });
    var cmpRow = dkCmp(col.row, dir, isText);
    rows.sort(function (x, y) { return cmpRow(x, y) || (y.o.final - x.o.final) || String(x.r.n).localeCompare(String(y.r.n)); });
    var M = { gb: gb, all: all, rows: rows, total: all.length, col: col, dir: dir, groups: null };
    if (gb === 'none') return M;
    var mk = function (key, label, items, extra) {
      var g = { key: key, label: label, items: items, a: dkAgg(items.map(function (x) { return x.r; }), F, opt) };
      Object.keys(extra || {}).forEach(function (k) { g[k] = extra[k]; });
      return g;
    };
    var by = function (items, fn) { var m = {}, ord = []; items.forEach(function (x) { var k = fn(x); if (!m[k]) { m[k] = []; ord.push(k); } m[k].push(x); }); return ord.map(function (k) { return [k, m[k]]; }); };
    var cmpGrp = dkCmp(col.grp, dir, isText), sortG = function (gs) { gs.sort(function (x, y) { return cmpGrp(x, y) || (y.a.final - x.a.final) || String(x.label).localeCompare(String(y.label)); }); return gs; };
    var mcGroup = function (items, parentKey, br) {
      return sortG(by(items, function (x) { return x.r.mc; }).map(function (e) { var d = e[1][0].r.dso || '—'; return mk(parentKey + 'M|' + e[0], e[0], e[1], { level: 'mc', dso: d, br: br || e[1][0].r.br, mcLabel: e[0], sub: 'DSO ' + d }); }));
    };
    if (gb === 'area') M.groups = sortG(by(rows, function (x) { return x.r.br; }).map(function (e) { return mk('A|' + e[0], e[0], e[1], { level: 'area', br: e[0], sub: 'HoA ' + (e[1][0].r.hoa || '—') }); }));
    else if (gb === 'mc') M.groups = mcGroup(rows, '', null);
    else if (gb === 'dso') M.groups = sortG(by(rows, function (x) { return x.r.dso || '—'; }).map(function (e) { var mcs = {}; e[1].forEach(function (x) { mcs[x.r.mc] = 1; }); return mk('D|' + e[0], e[0], e[1], { level: 'dso', dso: e[0], br: e[1][0].r.br, mcLabel: Object.keys(mcs).join(', '), sub: Object.keys(mcs).join(', ') }); }));
    else M.groups = sortG(by(rows, function (x) { return x.r.br; }).map(function (e) { var g = mk('A|' + e[0], e[0], e[1], { level: 'area', br: e[0], sub: 'HoA ' + (e[1][0].r.hoa || '—') }); g.children = mcGroup(e[1], 'A|' + e[0] + '|', e[0]); return g; }));
    return M;
  }
  function dkExpanded(key, depth, gb) {
    var tg = state.dkTog || {};
    if (Object.prototype.hasOwnProperty.call(tg, key)) return !!tg[key];
    if (state.dkAll) return state.dkAll === 'open';
    return gb === 'area_mc' && depth === 0;
  }
  function dkCsv(rows) {
    return rows.map(function (r) { return r.map(function (v) { var s = v == null ? '' : String(v); return /[",\r\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','); }).join('\r\n');
  }
  function dkDownload(kind) {
    var F = dkFeed(); if (!F) return;
    var opt = dkOpt(), M = dkModel(F, opt, F.dses.filter(dkInScope));
    var rp = function (v) { return v == null ? '' : Math.round(v); }, pc = function (v) { return v == null ? '' : Math.round(v * 10000) / 100; };
    var slabO = function (s) { return s < 0 ? '<90%' : (s === 0 ? '90%' : '100%'); };
    var out = [];
    if (kind === 'grp' && M.groups) {
      out.push(['Level', 'Grup', 'Area', 'DSO / MC', 'Jumlah DSE', 'OSA Amount', 'OSA Target', 'OSA Ach (%)', 'OSA Insentif', 'SP Pcs', 'SP Target', 'SP Ach (%)', 'SP Insentif', 'UAR >=5 pcs', 'UAR Target', 'Effective call (%)', 'Skor compliance rata-rata (%)', 'Insentif Total', 'Insentif Final']);
      var walk = function (gs, lv) { gs.forEach(function (g) { var a = g.a; out.push([lv, g.label, g.br || '', g.sub || '', a.n, rp(a.amt), rp(a.tgt), pc(a.osaAch), rp(a.osaInc), rp(a.sp), a.spTgt > 0 ? rp(a.spTgt) : '', a.spTgt > 0 ? pc(a.spOfAch) : '', rp(a.spInc), a.uar, rp(a.uarTgt), pc(a.ec), pc(a.compAvg), rp(a.total), rp(a.final)]); if (g.children) walk(g.children, 'MC'); }); };
      walk(M.groups, M.gb === 'mc' ? 'MC' : (M.gb === 'dso' ? 'DSO' : 'Area'));
    } else {
      out.push(['Area', 'Head of Area', 'Micro Cluster', 'DSO', 'DSE', 'Kelas', 'OSA Amount', 'OSA Target', 'OSA Ach (%)', 'OSA Slab', 'OSA Insentif', 'SP Pcs', 'SP Target', 'SP Ach (%)', 'SP Slab', 'SP Insentif', 'UAR >=5 pcs', 'UAR Target', 'Effective call (%)', 'Skor compliance (%)', 'Index', 'Insentif Total', 'Insentif Final']);
      var flat = M.groups ? [] : M.rows;
      if (M.groups) { var addG = function (gs) { gs.forEach(function (g) { if (g.children) addG(g.children); else flat = flat.concat(g.items); }); }; addG(M.groups); }
      flat.forEach(function (x) { var r = x.r, o = x.o; out.push([r.br, r.hoa || '', r.mc, r.dso || '', r.n, r.cls === 'R' ? 'Rural' : 'Urban', rp(o.osaAmt), rp(o.osaTgt), pc(o.osaAch), o.osaAch == null ? 'tanpa target' : slabO(o.osaSlab), rp(o.osaInc), rp(o.sp), o.spOfficial ? rp(o.spTgt) : '', pc(o.spAch), slabO(o.spSlab), rp(o.spInc), o.uar, Math.round(o.uarTgt * 10) / 10, pc(o.ec), pc(o.comp), o.idx, rp(o.total), rp(o.final)]); });
    }
    var blob = new Blob(['﻿sep=,\r\n' + dkCsv(out)], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'), d = new Date(), stamp = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    a.href = URL.createObjectURL(blob); a.download = 'dse_scorecard_' + (kind === 'grp' ? 'grup' : 'dse') + '_' + (state.kec || state.branch || 'inner_jakarta').replace(/[^A-Za-z0-9]+/g, '_') + '_' + stamp + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function dkSortBtns(c) {
    var cur = state.dkSortCol || 'final', dir = state.dkSortDir || 'desc', mk = function (d, ch, lab) { return '<button type="button" class="dk-sb' + (cur === c.k && dir === d ? ' on' : '') + '" data-dk-sortcol="' + c.k + '" data-dir="' + d + '" aria-label="Urutkan ' + esc(c.label) + ' ' + lab + '" aria-pressed="' + (cur === c.k && dir === d) + '">' + ch + '</button>'; };
    return '<span class="dk-sbw">' + mk('asc', '▲', 'naik (kecil ke besar)') + mk('desc', '▼', 'turun (besar ke kecil)') + '</span>';
  }
  function dkSortTh(c, rowspan) {
    var cur = state.dkSortCol || 'final', dir = state.dkSortDir || 'desc', sorted = cur === c.k ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
    if (!c.band) return '<th rowspan="' + rowspan + '" aria-sort="' + sorted + '" style="' + (c.k === 'name' ? DK_STICKY + ' z-index:3; background:var(--ij-surface);' : '') + ' vertical-align:bottom;">' + c.label + dkSortBtns(c) + '</th>';
    var b = DK_BAND[c.band];
    var isNum = c.t !== 'text';
    return '<th' + (isNum ? ' class="num"' : '') + ' aria-sort="' + sorted + '" style="background:' + b[0] + '; color:' + b[1] + ';' + (c.first ? DK_BL : '') + '">' + c.label + dkSortBtns(c) + '</th>';
  }
  function dkGroupRow(g, depth, gb, showMc, expanded, tot) {
    var a = g.a, bg = tot ? 'var(--ij-ink)' : (depth === 0 ? '#e9e5e0' : '#f4f2ef'), ind = depth * 18;
    var mini = function (arr) { return '<div style="margin-top:3px;">' + dkMini(arr) + '</div>'; };
    var osaMini = mini([['&lt; 90%', a.osaSl[0], 'bad'], ['90%', a.osaSl[1], 'ok'], ['100%', a.osaSl[2], 'top']]);
    var spMini = mini(state.dkSp === 'policy' ? [['di bawah tier 1', a.spSl[0], 'bad'], ['tier 1', a.spSl[1], 'ok'], ['tier 2', a.spSl[2], 'top']] : [['&lt; 90%', a.spSl[0], 'bad'], ['90%', a.spSl[1], 'ok'], ['100%', a.spSl[2], 'top']]);
    var idxMini = mini([['× 0', a.idx['0'], 'bad'], ['× 0.95', a.idx['0.95'], 'warn'], ['× 0.97', a.idx['0.97'], 'ok'], ['× 1', a.idx['1'], 'top']]);
    var name = '<button type="button" class="btn" data-dk-grp="' + esc(g.key) + '" data-depth="' + depth + '" aria-expanded="' + expanded + '" aria-label="' + (expanded ? 'Tutup' : 'Buka') + ' grup ' + esc(g.label) + '" style="font-size:13px; padding:2px 8px; margin-right:6px;">' + (expanded ? '▾' : '▸') + '</button><b>' + esc(g.label) + '</b> <span class="note">' + fmtCount(a.n) + ' DSE' + (g.sub ? ' · ' + esc(g.sub) : '') + '</span>';
    if (tot) name = '<b>TOTAL</b> <span style="font-weight:500;">' + fmtCount(a.n) + ' DSE' + (g.sub ? ' · ' + esc(g.sub) : '') + '</span>';
    return '<tr' + (tot ? ' class="tot-row" style="' + TOT_ST + '"' : ' style="background:' + bg + '; font-weight:600;"') + '>' + dkStickyTd('<span style="margin-left:' + (tot ? 0 : ind) + 'px;' + (tot ? ' color:#fff;' : '') + '">' + name + '</span>', bg) + (showMc ? '<td></td>' : '') +
      dkTd(pjRp(a.amt), true, 'num') + dkTd(a.tgt > 0 ? pjRp(a.tgt) : '—', false, 'num') + dkTd((a.osaAch == null ? '—' : dkPctTag(a.osaAch, 1, 0.9)) + osaMini, false, 'num') + dkTd(pjRp(a.osaInc), false, 'num') +
      dkTd('<b>' + fmtCount(a.sp) + '</b>', true, 'num') + dkTd(a.spTgt > 0 ? fmtCount(Math.round(a.spTgt)) : '—', false, 'num') + dkTd((a.spTgt > 0 ? dkPctTag(a.spOfAch, 1, 0.9) : '') + spMini, false, 'num') + dkTd(pjRp(a.spInc), false, 'num') +
      dkTd(fmtCount(a.uar) + ' / ' + fmtCount(Math.round(a.uarTgt)), true, 'num') + dkTd(a.ec == null ? '—' : dkPctTag(a.ec, 0.5, 0.4), false, 'num') + dkTd('<b>' + (a.compAvg * 100).toFixed(0) + '%</b>' + idxMini, false, 'num') +
      dkTd(pjRp(a.total), true, 'num') + dkTd('<b>' + pjRp(a.final) + '</b>', false, 'num') + '<td></td></tr>';
  }
  function dkScorecard(F, opt, P, f, list, scope, proxy) {
    var M = dkModel(F, opt, list), gb = M.gb, open = state.dkOpen || {}, showMc, dCols;
    var parents = {}; M.rows.forEach(function (x) { parents[x.r.mc] = 1; });
    showMc = (gb === 'none' || gb === 'area') && Object.keys(parents).length > 1;
    dCols = 1 + (showMc ? 1 : 0) + 4 + 4 + 3 + 2 + 1;
    var dseRow = function (x, depth) {
      var r = x.r, o = x.o, isOpen = !!open[r.k], pjp = r.pid ? detailBtn({ drill: { lv: 'dse', dse: r.pid, br: r.br, mc: r.mc } }, 'PJP') : '';
      var nm = '<span style="margin-left:' + (depth * 18 + (depth ? 26 : 0)) + 'px;"><b>' + esc(r.n) + '</b>' + (r.cls === 'R' ? ' <span class="note">rural</span>' : '') + '</span>';
      var main = '<tr>' + dkStickyTd(nm) + (showMc ? '<td>' + esc(r.mc) + '</td>' : '') +
        dkTd(pjRp(o.osaAmt), true, 'num') + dkTd(pjRp(o.osaTgt) + (r.osa_tgt_src === 'proxy' ? '<span title="target proxy = September aktual" style="color:var(--ij-muted);"> *</span>' : ''), false, 'num') +
        dkTd(dkPctTag(o.osaAch, 1, 0.9) + '<div style="margin-top:3px;">' + dkSlabOsaTag(o) + '</div>', false, 'num') + dkTd(pjRp(o.osaInc), false, 'num') +
        dkTd('<b>' + fmtCount(o.sp) + '</b>', true, 'num') + dkTd(o.spOfficial ? fmtCount(Math.round(o.spTgt)) : '<span class="note">—</span>', false, 'num') + dkTd((o.spAch == null ? '' : dkPctTag(o.spAch, 1, 0.9) + '<div style="margin-top:3px;">') + dkSlabSpTag(o) + (o.spAch == null ? '' : '</div>'), false, '') + dkTd(pjRp(o.spInc), false, 'num') +
        dkTd(fmtCount(o.uar) + ' / ' + (Math.round(o.uarTgt * 10) / 10) + '<div style="margin-top:3px;">' + dkPctTag(o.uarAch, 1, 0.9) + '</div>', true, 'num') +
        dkTd((r.vis ? (o.ec == null ? '—' : (o.ec * 100).toFixed(1) + '%') : '<span class="note">tanpa data</span>') + '<div style="margin-top:3px;">' + dkPctTag(o.ecAch, 1, 0.9) + '</div>', false, 'num') +
        dkTd('<b>' + (o.comp * 100).toFixed(0) + '%</b><div style="margin-top:3px;">' + dkIdxTag(o.idx) + '</div>', false, 'num') +
        dkTd(pjRp(o.total), true, 'num') + dkTd('<b>' + pjRp(o.final) + '</b>', false, 'num') +
        '<td style="white-space:nowrap;"><button type="button" class="btn" data-dk-open="' + esc(r.k) + '" aria-expanded="' + isOpen + '" style="font-size:13px; padding:4px 9px;">' + (isOpen ? '▾ Tutup' : '▸ Rincian') + '</button> ' + pjp + '</td></tr>';
      return main + (isOpen ? dkDetail(r, o, F, dCols) : '');
    };
    var body = '', pagerHtml = '';
    if (gb === 'none') {
      var page = state.dkPage || 1, ps = 50, tp = Math.ceil(M.rows.length / ps) || 1;
      if (page > tp) { page = tp; state.dkPage = page; }
      var st = (page - 1) * ps;
      body = M.rows.slice(st, st + ps).map(function (x) { return dseRow(x, 0); }).join('');
      pagerHtml = tp > 1 ? mbPager('dk-page', page, tp, 'Menampilkan ' + (M.rows.length ? st + 1 : 0) + '–' + Math.min(st + ps, M.rows.length) + ' dari ' + fmtCount(M.rows.length) + ' DSE') : '<p class="note">' + fmtCount(M.rows.length) + ' DSE.</p>';
    } else {
      var emit = function (gs, depth) {
        gs.forEach(function (g) {
          var ex = dkExpanded(g.key, depth, gb);
          body += dkGroupRow(g, depth, gb, showMc, ex);
          if (!ex) return;
          if (g.children) emit(g.children, depth + 1); else g.items.forEach(function (x) { body += dseRow(x, depth + 1); });
        });
      };
      emit(M.groups, 0);
      pagerHtml = '<p class="note">' + fmtCount(M.rows.length) + ' DSE dalam ' + fmtCount(M.groups.reduce(function (s, g) { return s + (g.children ? g.children.length : 1); }, 0)) + ' ' + (gb === 'area' ? 'area' : (gb === 'dso' ? 'DSO' : 'Micro Cluster')) + '. Klik ▸ / ▾ untuk membuka atau menutup grup; baris grup berisi subtotal dan sebaran slab dari DSE yang lolos filter.</p>';
    }
    if (M.rows.length > 1) {
      var allA = dkAgg(M.rows.map(function (x) { return x.r; }), F, opt);
      body += dkGroupRow({ a: allA, label: 'TOTAL', key: 'TOTAL', sub: (M.rows.length === M.total ? '' : 'terfilter dari ' + fmtCount(M.total)) }, 0, gb, showMc, true, true);
    }
    // header with sortable columns
    var band = function (key, title, sub, cols) { return dkBandTh(key, title, sub, cols); };
    var cols = {}; DK_COLS.forEach(function (c) { cols[c.k] = c; });
    var dHead = '<tr>' + dkSortTh(cols.name, 2) + (showMc ? dkSortTh(cols.mc, 2) : '') +
      band('osa', 'OSA', 'bobot 40% · 0.2% / 0.4% dari amount · maks Rp 1 Jt', 4) + band('sp', 'SP Data Sell In', 'bobot 60% · ' + (opt.sp === 'policy' ? 'tier ' + fmtCount(Math.round(P.sp.tiers[0].pcs * f)) + ' / ' + fmtCount(Math.round(P.sp.tiers[1].pcs * f)) + ' pcs' : 'slab 90% / 100% dari target resmi'), 4) +
      band('cmp', 'Compliance', 'UAR 50% + effective call 50%', 3) + band('inc', 'Insentif', 'total × index', 2) + '<th rowspan="2" style="vertical-align:bottom;">Rincian</th></tr>' +
      '<tr>' + ['osaAmt', 'osaTgt', 'osaAch', 'osaInc', 'sp', 'spTgt', 'spAch', 'spInc', 'uar', 'ec', 'comp', 'total', 'final'].map(function (k) { return dkSortTh(cols[k], 1); }).join('') + '</tr>';
    // toolbar: grouping, expand/collapse, download, search, value filters
    var fl = state.dkFilters || [];
    var colOpts = DK_COLS.map(function (c) { return '<option value="' + c.k + '">' + (c.band ? { osa: 'OSA · ', sp: 'SP · ', cmp: 'Compliance · ', inc: 'Insentif · ' }[c.band] : '') + c.label + '</option>'; }).join('');
    var opOpts = DK_OPS.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');
    var chips = fl.map(function (x, i) { return '<span class="chip" style="margin-right:6px;">' + esc(dkFilterText(x)) + ' <button type="button" class="dk-chipx" data-dk-fdel="' + i + '" aria-label="Hapus filter ' + esc(dkFilterText(x)) + '">✕</button></span>'; }).join('');
    var bar = '<div class="map-toolbar" style="margin-bottom:8px;">' + sellinBtnGroup('Kelompokkan', 'dk-groupby', DK_GROUPS, gb) +
      (gb !== 'none' ? '<div class="map-toolbar-group"><button type="button" class="btn" data-dk-all="open" style="font-size:13px; padding:5px 10px;">⊞ Buka semua</button><button type="button" class="btn" data-dk-all="close" style="font-size:13px; padding:5px 10px;">⊟ Tutup semua</button></div>' : '') +
      '<div class="map-toolbar-group"><button type="button" class="btn" data-dk-dl="dse" style="font-size:13px; padding:5px 10px;">⬇ Download CSV (DSE)</button>' + (gb !== 'none' ? '<button type="button" class="btn" data-dk-dl="grp" style="font-size:13px; padding:5px 10px;">⬇ Download CSV (grup)</button>' : '') + '</div></div>' +
      '<div class="map-toolbar" style="margin-bottom:8px;"><div class="map-toolbar-group"><input type="text" id="dkSearchInput" class="map-select" aria-label="Cari DSE, MC atau DSO" placeholder="🔍 Cari DSE, MC, DSO..." value="' + esc(state.dkSearch || '') + '" style="min-width:220px;"></div>' +
      '<div class="map-toolbar-group"><span class="map-label">Filter nilai:</span><select id="dkFcol" class="map-select" aria-label="Kolom filter">' + colOpts + '</select><select id="dkFop" class="map-select" aria-label="Operator filter">' + opOpts + '</select>' +
      '<input type="text" id="dkFv1" class="map-select" aria-label="Nilai filter" placeholder="nilai, mis. 40jt · 500rb · 80% · 1500" style="min-width:210px;"><input type="text" id="dkFv2" class="map-select" aria-label="Nilai sampai (untuk antara)" placeholder="sampai (untuk antara)" style="min-width:150px;">' +
      '<button type="button" class="btn" data-dk-fadd="1" style="font-size:13px; padding:5px 10px;">+ Tambah filter</button></div>' +
      ((fl.length || state.dkSearch) ? '<div class="map-toolbar-group"><button type="button" class="btn" data-dk-fclear="1" style="font-size:13px; padding:5px 10px;">✕ Hapus semua filter</button></div>' : '') + '</div>' +
      (state.dkFErr ? '<p class="note" style="color:#991b1b; font-weight:700; margin:0 0 6px;" role="alert">' + esc(state.dkFErr) + '</p>' : '') +
      (chips ? '<div style="margin-bottom:8px;">' + chips + '</div>' : '');
    var cnt = M.rows.length === M.total ? fmtCount(M.rows.length) + ' DSE' : fmtCount(M.rows.length) + ' dari ' + fmtCount(M.total) + ' DSE (terfilter)';
    return card('Scorecard per DSE · ' + scope + ' · ' + cnt,
      bar + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + dHead + '</thead><tbody>' + (body || '<tr><td colspan="' + dCols + '" class="note">Tidak ada DSE yang lolos filter.</td></tr>') + '</tbody></table></div>' + pagerHtml +
      '<p class="note">Setiap kolom punya tombol ▲ (kecil ke besar) dan ▼ (besar ke kecil); urutan berlaku untuk DSE dan, bila dikelompokkan, juga untuk urutan grup menurut subtotalnya. Filter nilai menerima angka biasa, satuan rb / jt / M (M = milyar), dan persen untuk kolom Ach., Effective call dan Skor (mis. ≥ 40jt, antara 80% dan 100%). Download CSV memuat seluruh DSE yang lolos filter dengan urutan yang sedang tampil. Klik "▸ Rincian" untuk melihat perhitungan satu DSE langkah demi langkah. Skor UAR dan effective call dibatasi 100%.</p>' +
      (proxy ? '<p class="note">* Target OSA individual belum tersedia: dipakai proxy = nilai OSA bulan September penuh per DSE (' + fmtCount(proxy) + ' DSE). Isi <code>data/catalogues/dse_kpi_targets.csv</code> (template: dse_kpi_targets_template.csv) lalu jalankan <code>python3 scripts/build_dse_kpi_feed.py</code> untuk memakai target resmi.</p>' : ''));
  }
  function viewDseProductivity() {
    var F = dkFeed();
    if (!F) return card('DSE Productivity', '<p class="note">Feed KPI DSE belum dibangun. Jalankan <code>python3 scripts/build_dse_kpi_feed.py</code>.</p>');
    var opt = dkOpt(), P = F.policy, M = F.metadata, f = opt.basis === 'full' ? 1 : M.cut_day / M.month_days;
    var list = F.dses.filter(dkInScope), A = dkAgg(list, F, opt);
    var proxy = list.filter(function (r) { return r.osa_tgt_src === 'proxy'; }).length;
    var scope = esc(scopeText());
    // toolbar
    var tool = '<div class="map-toolbar" style="margin-top:8px;">' +
      sellinBtnGroup('Basis target', 'dk-basis', [['prorata', 'Prorata MTD (' + M.cut_day + '/' + M.month_days + ')'], ['full', 'Target penuh bulan']], opt.basis) +
      sellinBtnGroup('Amount OSA', 'dk-osa', [['all', 'Semua outlet'], ['q', 'Outlet ≥ Rp 300K']], opt.osa) +
      sellinBtnGroup('Effective call', 'dk-ec', [['prod', 'Visit produktif'], ['exec', 'Visit terlaksana']], opt.ec) + '</div>';
    // cards
    var cards = '<div class="kpis" style="margin-top:10px;">' +
      kpi('DSE dalam cakupan', fmtCount(A.n), fmtCount(A.withVis) + ' punya data PJP', 'up', scope) +
      kpi('OSA · pencapaian vs target', A.osaAch == null ? '—' : (A.osaAch * 100).toFixed(1) + '%', pjRp(A.amt) + ' dari target ' + pjRp(A.tgt), A.osaAch != null && A.osaAch >= 0.9 ? 'up' : 'down', fmtCount(A.osaSl[2]) + ' DSE 100% · ' + fmtCount(A.osaSl[1]) + ' DSE 90% · ' + fmtCount(A.osaSl[0]) + ' di bawah 90%') +
      kpi('SP Data Sell In', fmtCount(A.sp) + ' pcs', 'rata-rata ' + (A.n ? Math.round(A.sp / A.n) : 0) + ' pcs / DSE · tier ' + fmtCount(Math.round(P.sp.tiers[0].pcs * f)) + ' / ' + fmtCount(Math.round(P.sp.tiers[1].pcs * f)), A.spSl[1] + A.spSl[2] > 0 ? 'up' : 'down', fmtCount(A.spSl[2]) + ' DSE 100% · ' + fmtCount(A.spSl[1]) + ' DSE 90% · ' + fmtCount(A.spSl[0]) + ' di bawah tier 1') +
      kpi('Compliance index', (A.compAvg * 100).toFixed(1) + '% skor rata-rata', fmtCount(A.idx['1']) + ' DSE × 1 · ' + fmtCount(A.idx['0.97'] + A.idx['0.95']) + ' DSE × 0.97/0.95 · ' + fmtCount(A.idx['0']) + ' DSE × 0', A.idx['1'] > 0 ? 'up' : 'down', 'UAR ≥ 5 pcs ' + fmtCount(A.uar) + ' outlet · effective call ' + (A.ec == null ? '—' : (A.ec * 100).toFixed(1) + '%')) +
      kpi('Insentif total (sebelum index)', pjRp(A.total), 'OSA ' + pjRp(A.osaInc) + ' · SP ' + pjRp(A.spInc), 'up', 'maksimum Rp 1 Jt per KPI per DSE') +
      kpi('Insentif final', pjRp(A.final), 'total × compliance index', A.final > 0 ? 'up' : 'down', A.total > 0 ? 'index memotong ' + pjRp(A.total - A.final) + ' (' + ((1 - A.final / A.total) * 100).toFixed(0) + '%)' : 'belum ada DSE yang mencapai slab') +
    '</div>';
    // distribution
    var dist = '<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:16px;">' +
      '<div><b>OSA · slab pencapaian target</b>' + dkStack([['&lt; 90%', A.osaSl[0], 'bad'], ['90% (0.2%)', A.osaSl[1], 'ok'], ['100% (0.4%)', A.osaSl[2], 'top'], ['tanpa target', A.osaSl[3], 'none']]) + '</div>' +
      '<div><b>SP Data Sell In · slab pcs</b>' + dkStack([['&lt; ' + fmtCount(Math.round(P.sp.tiers[0].pcs * f)), A.spSl[0], 'bad'], ['≥ ' + fmtCount(Math.round(P.sp.tiers[0].pcs * f)) + ' (90%)', A.spSl[1], 'ok'], ['≥ ' + fmtCount(Math.round(P.sp.tiers[1].pcs * f)) + ' (100%)', A.spSl[2], 'top']]) + '</div>' +
      '<div><b>Compliance index</b>' + dkStack([['× 0 (&lt; 80%)', A.idx['0'], 'bad'], ['× 0.95', A.idx['0.95'], 'warn'], ['× 0.97', A.idx['0.97'], 'ok'], ['× 1 (≥ 100%)', A.idx['1'], 'top']]) + '</div></div>';
    // group table (follows the filter): area -> MC -> DSE, columns grouped by parameter
    var mode = state.kec ? 'dse' : ((state.branch || state.hoa) ? 'mc' : 'area'), groupHtml = '';
    var legend = '<p class="note" style="margin-bottom:6px;">Bar = jumlah DSE per slab: ' + [['bad', 'di bawah slab / × 0'], ['warn', '× 0.95'], ['ok', 'slab 90% / × 0.97'], ['top', 'slab 100% / × 1']].map(function (x) { return '<span style="display:inline-block; width:11px; height:11px; background:' + DK_COL[x[0]][0] + '; border:1px solid ' + DK_COL[x[0]][1] + '; vertical-align:middle;"></span> ' + x[1]; }).join(' &nbsp; ') + '</p>';
    if (mode !== 'dse') {
      var groups = {};
      list.forEach(function (r) { var k = mode === 'area' ? r.br : r.mc; (groups[k] || (groups[k] = [])).push(r); });
      var gl = Object.keys(groups).map(function (k) { var g = dkAgg(groups[k], F, opt); g.key = k; g.br = groups[k][0].br; g.dso = groups[k][0].dso; g.hoa = groups[k][0].hoa; return g; });
      gl.sort(function (x, y) { return y.final - x.final || y.total - x.total || y.n - x.n; });
      var hasDso = mode === 'mc', gCols = 1 + (hasDso ? 1 : 0) + 1 + 5 + 4 + 3 + 2 + 1;
      function gRow(g, tot) {
        var bg = tot ? 'background:var(--ij-ink); color:#fff; font-weight:800;' : '';
        var name = tot ? (mode === 'area' ? 'INNER JAKARTA' : esc(state.branch || state.hoa)) : '<b>' + esc(g.key) + '</b>';
        var drill = tot ? '' : (mode === 'area' ? '<button type="button" class="btn" data-dk-drill="' + esc(g.key) + '" data-dk-lv="area" style="font-size:13px; padding:4px 9px;">MC →</button>' : '<button type="button" class="btn" data-dk-drill="' + esc(g.key) + '" data-dk-lv="mc" data-br="' + esc(g.br) + '" style="font-size:13px; padding:4px 9px;">DSE →</button>');
        var pctT = function (v, hi, mid) { return tot ? (v == null ? '—' : (v * 100).toFixed(1) + '%') : dkPctTag(v, hi, mid); };
        return '<tr style="' + bg + '">' + (tot ? '<td class="cur" style="' + DK_STICKY + ' background:var(--ij-ink); color:#fff;">' + name + '</td>' : dkStickyTd(name)) + (hasDso ? '<td>' + (tot ? '' : esc(g.dso || '—')) + '</td>' : '') + '<td class="num">' + fmtCount(g.n) + '</td>' +
          dkTd(pjRp(g.amt), true, 'num') + dkTd(g.tgt > 0 ? pjRp(g.tgt) : '—', false, 'num') + dkTd(pctT(g.osaAch, 1, 0.9), false, 'num') + dkTd(dkMini([['&lt; 90%', g.osaSl[0], 'bad'], ['90%', g.osaSl[1], 'ok'], ['100%', g.osaSl[2], 'top']]), false, '') + dkTd(pjRp(g.osaInc), false, 'num') +
          dkTd(fmtCount(g.sp), true, 'num') + dkTd(g.spTgt > 0 ? fmtCount(Math.round(g.spTgt)) : '—', false, 'num') + dkTd(g.spTgt > 0 ? pctT(g.spOfAch, 1, 0.9) : '—', false, 'num') + dkTd(dkMini(opt.sp === 'policy' ? [['di bawah tier 1', g.spSl[0], 'bad'], ['tier 1', g.spSl[1], 'ok'], ['tier 2', g.spSl[2], 'top']] : [['&lt; 90%', g.spSl[0], 'bad'], ['90%', g.spSl[1], 'ok'], ['100%', g.spSl[2], 'top']]), false, '') + dkTd(pjRp(g.spInc), false, 'num') +
          dkTd(fmtCount(g.uar) + ' / ' + fmtCount(Math.round(g.uarTgt)), true, 'num') + dkTd(pctT(g.ec, 0.5, 0.4), false, 'num') + dkTd(dkMini([['× 0', g.idx['0'], 'bad'], ['× 0.95', g.idx['0.95'], 'warn'], ['× 0.97', g.idx['0.97'], 'ok'], ['× 1', g.idx['1'], 'top']]), false, '') +
          dkTd(pjRp(g.total), true, 'num') + dkTd('<b>' + pjRp(g.final) + '</b>', false, 'num') + '<td>' + drill + '</td></tr>';
      }
      A.key = 'T';
      var gHead = '<tr>' + dkStickyTh(mode === 'area' ? 'Area' : 'Micro Cluster', 2) + (hasDso ? '<th rowspan="2" style="vertical-align:bottom;">DSO</th>' : '') + '<th rowspan="2" class="num" style="vertical-align:bottom;">DSE</th>' +
        dkBandTh('osa', 'OSA', 'bobot 40% · 0.2% / 0.4% · maks Rp 1 Jt', 5) + dkBandTh('sp', 'SP Data Sell In', 'bobot 60% · ' + (opt.sp === 'policy' ? 'tier ' + fmtCount(Math.round(P.sp.tiers[0].pcs * f)) + ' / ' + fmtCount(Math.round(P.sp.tiers[1].pcs * f)) + ' pcs' : 'slab 90% / 100% dari target resmi'), 5) +
        dkBandTh('cmp', 'Compliance', 'UAR 50% + effective call 50% → index', 3) + dkBandTh('inc', 'Insentif', 'total × index', 2) + '<th rowspan="2" style="vertical-align:bottom;">Detail</th></tr>' +
        '<tr>' + dkSubTh('osa', 'Amount', true, true) + dkSubTh('osa', 'Target', false, true) + dkSubTh('osa', 'Ach.', false, true) + dkSubTh('osa', 'Sebaran DSE', false) + dkSubTh('osa', 'Insentif', false, true) +
        dkSubTh('sp', 'Pcs', true, true) + dkSubTh('sp', 'Target', false, true) + dkSubTh('sp', 'Ach.', false, true) + dkSubTh('sp', 'Sebaran DSE', false) + dkSubTh('sp', 'Insentif', false, true) +
        dkSubTh('cmp', 'UAR ≥5 / target', true, true) + dkSubTh('cmp', 'Eff. call', false, true) + dkSubTh('cmp', 'Sebaran index', false) +
        dkSubTh('inc', 'Total', true, true) + dkSubTh('inc', 'Final', false, true) + '</tr>';
      groupHtml = card('Performance ' + (mode === 'area' ? 'per Area' : 'per Micro Cluster') + ' · ' + scope,
        legend + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + gHead + '</thead><tbody>' + gl.map(function (g) { return gRow(g, false); }).join('') + gRow(A, true) + '</tbody></table></div>');
    }
    // DSE scorecard: grouping (Area / MC / DSO) with collapse-expand, sortable columns, value filters, CSV download
    var dseTable = dkScorecard(F, opt, P, f, list, scope, proxy);
    // policy + assumptions
    var pol = '<details class="terr-group" style="margin-top:10px;"><summary class="terr-group-summary"><div class="terr-group-title-wrap"><span class="terr-group-icon">&#9654;</span><div><div class="terr-group-title">Kebijakan KPI DSE Oct 2026 dan asumsi perhitungan</div><div class="terr-group-sub">slab, compliance index, dan hal yang perlu dikonfirmasi</div></div></div></summary><div class="terr-group-body">' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('KPI') + th('Bobot slide', 1) + th('SLA 90%') + th('SLA 100%') + th('Insentif maksimum', 1) + '</tr></thead><tbody>' +
      '<tr><td class="cur">OSA (target individual)</td><td class="num">40%</td><td>0.2% × amount OSA</td><td>0.4% × amount OSA</td><td class="num">Rp 1 Jt</td></tr>' +
      '<tr><td class="cur">SP Data Sell In (target individual)</td><td class="num">60%</td><td>90% target SP · 90% × Rp 1 Jt</td><td>100% target SP · Rp 1 Jt</td><td class="num">Rp 1 Jt</td></tr></tbody></table></div>' +
      '<div class="tbl-wrap" style="margin-top:8px;"><table class="tbl"><thead><tr>' + th('Compliance') + th('Bobot', 1) + th('Target') + '</tr></thead><tbody>' +
      '<tr><td class="cur">Outlet mapping sell in SP data ≥ 5 pcs (UAR)</td><td class="num">50%</td><td>30 outlet (urban) · 25 outlet (rural)</td></tr>' +
      '<tr><td class="cur">Effective call berbasis fix PJP</td><td class="num">50%</td><td>50% dari fix PJP</td></tr></tbody></table></div>' +
      '<p class="note" style="margin-top:8px;"><b>Skor compliance</b> ≥ 100% → index × 1 · ≥ 90% sampai &lt; 100% → × 0.97 · ≥ 80% sampai &lt; 90% → × 0.95 · &lt; 80% → 0. <b>Insentif final = (insentif OSA + insentif SP) × compliance index.</b> Tiap komponen compliance dibatasi 100% (seperti kolom "Total EF cap 100%" di GAPLOK).</p>' +
      '<p class="note"><b>Asumsi yang perlu dikonfirmasi:</b> (1) 0.2% dan 0.4% dibaca sebagai persentase dari amount OSA, dibatasi Rp 1 Jt; amount OSA = nilai uang sell-in SP + saldo Mobo + voucher (isi dan blank) ke semua outlet mapping DSE (default); pilihan "Outlet ≥ Rp 300K" hanya menghitung outlet yang totalnya ≥ Rp 300K (aturan GAPLOK). (2) Slab SP memakai target Sell-In SP resmi per DSE: 90% target membayar 90% dari Rp 1 Jt, 100% target membayar penuh (DSE tanpa target resmi tidak mendapat insentif SP). (3) Bobot 40% / 60% pada slide ditampilkan sebagai informasi, bukan pengali rupiah; tiap KPI maksimal Rp 1 Jt sesuai arahan. (4) Target OSA individual dari file target resmi (rebalancing); proxy September aktual hanya untuk DSE tanpa target. (5) Kelas urban atau rural per DSE memakai aturan Area: Karawang dan Kab Bekasi = rural, lainnya urban (dapat ditimpa lewat file target). (6) Effective call = visit produktif (ada sell-in SP/VC atau saldo &gt; Rp 50 rb) ÷ visit terjadwal (fix PJP), dari data PJP s.d. ' + pjpPeriod('end', {id:1}) + '; visit ad-hoc di luar PJP belum ada di data. (7) SP injection digital (MOBO) belum ikut dihitung; cut sell-in ' + M.cut_day + ' Okt, PJP ' + M.visits_cut_day + ' Okt. (8) Basis prorata mengalikan target bulanan dengan ' + M.cut_day + '/' + M.month_days + ' (OSA, tier SP, UAR); target effective call 50% tidak diprorata.</p></div></details>';
    return tool + cards + card('Distribusi slab · ' + scope, dist) + groupHtml + dseTable + pol;
  }

  /* ================= RINGKASAN PERFORMANCE · OPPORTUNITY dan PRINT INSTRUCTIONS ================= */
  var OPD_SECS = [['visit', '1 · Outlet belum divisit'], ['sitev', '2 · Site belum divisit'], ['sitega', '3 · Site tanpa GA'], ['gasp', '4 · Outlet tanpa GA / SP Sell-In'], ['saldo', '5 · Tanpa Saldo Sell-In + demand'], ['endbal', '6 · ENDBAL rendah / nol'], ['peta', '🗺️ Peta lokasi']];
  var OPD_LOW = 100000;   // ENDBAL below Rp 100K counts as low; zero or below (or no stock account) counts as none
  var _opdCache = null;
  // One record per master outlet: territory, last month order (September full), this month order, GA (SP Injection), demand signals
  function opdBase() {
    var P = pjFeed(), T = (typeof window !== 'undefined') ? window.TERRITORY_FEED : null, V = mbVisitsFeed(); if (!P || !T || !V) return null;
    var D = poFeed(), E = ebFeed(), spi = uarSpiMap();
    if (_opdCache && _opdCache.P === P && _opdCache.D === D && _opdCache.V === V && _opdCache.E === E && _opdCache.GA === gaFeed()) return _opdCache;
    var pj = {}; P.outlets.forEach(function (o) { if (o.tier === 'M') pj[o.k] = o; });
    var dem = {}; if (D) D.outlets.forEach(function (o) { dem[o.k] = poVal(o, 'all'); });
    var eb = {}; if (E) E.outlets.forEach(function (o) { if (o.t === 'M') eb[o.k] = o; });
    var mi = P.metadata.mc_info || {}, rows = [], byK = {};
    T.outlets.forEach(function (t) {
      var k = t.outlet_key, o = pj[k], c = (o && o.c) || {}, sp = c.SP || [0, 0, 0, 0, 0, 0], vf = c.VCF || [0, 0, 0, 0, 0, 0], vb = c.VCB || [0, 0, 0, 0, 0, 0], sa = c.SALMO || [0, 0, 0, 0, 0, 0], e = eb[k];
      var ga = 0, gaP = 0, gaF = 0; if (spi) { var x = spi[k]; if (x) { var gs = gaStat(x, 'all'); ga = gs.cur; gaP = gs.prev; gaF = gs.full; } }
      var m = mi[t.micro_cluster] || {};
      var r = { k: k, n: t.outlet_name || k, id: (t.outlet_id_im3 && String(t.outlet_id_im3) !== '0' ? t.outlet_id_im3 : '') || (t.outlet_id_3id && String(t.outlet_id_3id) !== '0' ? t.outlet_id_3id : '') || '', mc: t.micro_cluster, br: t.branch, hoa: m.hoa || t.hoa_leader || '', dso: t.dso_leader || m.dso || '', dse: String(t.dse_name || '').replace(/\.0$/, ''), dseN: dseNorm(t.dse_name), site: t.site_nbs || '', kec: t.kecamatan || '',
        sepSP: sp[5] || 0, sepSPq: sp[4] || 0, sepVC: (vf[5] || 0) + (vb[5] || 0), sepSAL: sa[5] || 0, mtdSP: sp[0] || 0, mtdSPv: sp[1] || 0, mtdSAL: sa[1] || 0, mtdT: (sp[1] || 0) + (vf[1] || 0) + (vb[1] || 0) + (sa[1] || 0),
        lat: t.lat, lon: t.long, ga: ga, gaP: gaP, gaF: gaF, dem: dem[k] || 0, av: e ? e.av || 0 : 0, st: e ? e.st || 0 : 0, ot: e ? e.ot || 0 : 0, sepSALq: sa[4] || 0, hasEb: !!e };
      r.sepT = r.sepSP + r.sepVC + r.sepSAL;
      rows.push(r); byK[k] = r;
    });
    var nv = {}; (V.unvisited_outlets || []).forEach(function (u) { if (u.w === 'mtd') nv[u.k] = u; });
    var sites = {}; rows.forEach(function (r) {
      if (!r.site || r.site === 'PENDING-NBS') return;
      var key = r.site + '::' + r.mc, s = sites[key] || (sites[key] = { key: key, site: r.site, mc: r.mc, br: r.br, hoa: r.hoa, dso: r.dso, kec: r.kec, dses: {}, n: 0, ga: 0, gaF: 0, sepT: 0, sepSP: 0, mtdSP: 0, dem: 0, mtdT: 0 });
      s.n++; s.ga += r.ga; s.gaF += r.gaF; s.sepT += r.sepT; s.sepSP += r.sepSP; s.mtdSP += r.mtdSP; s.dem += r.dem; s.mtdT += r.mtdT; s.dses[r.dse] = (s.dses[r.dse] || 0) + 1;
    });
    var siteList = Object.keys(sites).map(function (k) { var s = sites[k]; s.dse = Object.keys(s.dses).sort(function (a, b) { return s.dses[b] - s.dses[a]; })[0] || ''; s.dseN = dseNorm(s.dse); return s; });
    var nvSites = {}; (V.unvisited_sites || []).forEach(function (u) { if (u.w === 'mtd') nvSites[u.site + '::' + u.mc] = u; });
    _opdCache = { P: P, D: D, V: V, E: E, GA: gaFeed(), rows: rows, byK: byK, nv: nv, sites: siteList, nvSites: nvSites, hasGa: !!spi, gaCut: spi ? gaPrep().cut : 0, hasEb: !!E, visDay: ((V.metadata || {}).days || []).length || 13, cutDay: (D && D.metadata.cut_day) || P.metadata.cut_day, sepDays: P.metadata.lmtd_full_days || 30 };
    return _opdCache;
  }
  function opdBal(r) { return r.hasEb ? (state.ebBasis === 'all' ? r.st + r.ot : r.st) : null; }   // null = outlet has no stock account in ENDBAL
  function opdEbKind(r) { var b = opdBal(r); return b == null || b <= 0 ? 'none' : (b < OPD_LOW ? 'low' : 'ok'); }
  function opdIn(r) { return (!state.branch || r.br === state.branch) && (!state.hoa || r.hoa === state.hoa) && (!state.kec || r.mc === state.kec) && (!state.dse || r.dseN === state.dse); }
  function opdTag(kind, txt) { return dkTag(kind, txt); }
  function opdOutletCell(r) { return '<td class="cur"><b>' + esc(r.n) + '</b><br><span class="note"><code>' + esc(r.id) + '</code></span></td><td>' + esc(r.mc) + '<br><span class="note">' + esc(r.dse) + '</span></td><td>' + esc(r.site || '—') + '<br><span class="note">' + esc(r.kec) + '</span></td>'; }
  function opdSecNav() { return '<div class="map-toolbar" style="margin-top:8px;"><div class="map-toolbar-group"><span class="map-label">Opportunity:</span>' + OPD_SECS.map(function (s) { return '<button type="button" class="map-btn' + ((state.opdSec || 'visit') === s[0] ? ' active' : '') + '" data-opd-sec="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div></div>'; }
  function opdNote() { return '<p class="note">Demand bulan lalu tidak ada di file MOBO (hanya bulan berjalan). Kolom demand memakai dua sinyal yang tersedia: <b>Demand Okt MTD</b> (MOBO: Reload + Voucher Injection + CVM + Paket Data) dan <b>Rata-rata transaksi / hari</b> (stock account di file ENDBAL). Order bulan lalu = Sell-In September penuh (SP, voucher, saldo) dari DAILY_DATA_MOBII. Hanya outlet master; outlet adhoc tidak punya DSE, site, atau jadwal kunjungan.</p>'; }
  function opdTable(head, body, pg, extra) { return '<div class="tbl-wrap" style="margin-top:10px;"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + (body || '<tr><td colspan="12" class="note">Tidak ada data pada filter ini.</td></tr>') + '</tbody></table></div>' + (pg ? pg.html : '') + (extra || ''); }

  // grouped Area > MC > DSE list (grpBody with the DSE level); items are outlet records or site records
  function opdGrouped(t, B, items, o) {
    var mi = B.P.metadata.mc_info || {};
    return grpBody(t, { items: items, area: function (x) { return x.br; }, mc: function (x) { return x.mc; }, dse: function (x) { return x.dse; }, dso: function (m) { return (mi[m] || {}).dso || '—'; },
      hoa: function (a) { for (var k in mi) if (mi[k].br === a) return mi[k].hoa || '—'; return '—'; }, val: o.val, span: o.span, cols: o.cols, sub: o.sub, row: o.row, unit: o.unit || 'outlet', cap: 150, search: false });
  }
  function opdShell(head, body, note) { return '<div class="tbl-wrap" style="margin-top:6px;"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' + (note || ''); }
  function opdBar(t, extra) { return '<div class="map-toolbar" style="margin-top:8px;">' + (extra || '') + grpBar(t) + '</div>'; }
  function opdOutletTds(r) { return '<td class="cur" style="padding-left:56px;"><b>' + esc(r.n) + '</b><br><span class="note"><code>' + esc(r.id) + '</code></span></td><td>' + esc(r.site || '—') + '<br><span class="note">' + esc(r.kec) + '</span></td>'; }
  var OPD_GRP_NOTE = '<p class="note">Dikelompokkan Area › Micro Cluster (DSO) › DSE; klik panah untuk membuka. Baris grup menjumlahkan isinya. Maksimal 150 baris per DSE ditampilkan; persempit dengan filter header bila perlu.</p>';

  function opdVisit(B) {
    var list = Object.keys(B.nv).map(function (k) { return B.byK[k]; }).filter(function (r) { return r && opdIn(r); });
    var scope = B.rows.filter(opdIn), n = list.length;
    list.forEach(function (r) { r.prio = r.sepT > 0 && (r.dem > 0 || r.av > 0) ? 'A' : (r.sepT > 0 ? 'B' : 'C'); });
    list.sort(function (a, b) { return (a.prio < b.prio ? -1 : (a.prio > b.prio ? 1 : 0)) || b.sepT - a.sepT || b.dem - a.dem; });
    var cnt = { A: 0, B: 0, C: 0 }, val = { A: 0, B: 0 }; list.forEach(function (r) { cnt[r.prio]++; if (r.prio !== 'C') val[r.prio] += r.sepT; });
    var kp = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet belum pernah divisit MTD', fmtCount(n), pctOf(n, scope.length) + '% dari ' + fmtCount(scope.length) + ' outlet master di lingkup', n ? 'down' : 'up', 'tanpa check-in 1–' + B.visDay + ' Okt (cut PJP)') +
      kpi('Prioritas A · order Sep + ada demand', fmtCount(cnt.A), 'order Sep ' + pjRp(val.A), cnt.A ? 'down' : 'up', 'ada order bulan lalu dan sinyal demand (MTD atau rata-rata harian)') +
      kpi('Prioritas B · order Sep saja', fmtCount(cnt.B), 'order Sep ' + pjRp(val.B), cnt.B ? 'down' : 'up', 'beli bulan lalu, belum terlihat demand') +
      kpi('Prioritas C · tanpa order Sep', fmtCount(cnt.C), 'perlu verifikasi outlet aktif', 'up', 'tidak ada Sell-In September') + '</div>';
    var row = function (r) { return '<tr>' + opdOutletTds(r) + '<td class="num cur"><b>' + pjRp(r.sepT) + '</b><br><span class="note">SP ' + pjRp(r.sepSP) + ' · Vc ' + pjRp(r.sepVC) + ' · Sal ' + pjRp(r.sepSAL) + '</span></td><td class="num">' + (r.dem ? pjRp(r.dem) : '·') + '</td><td class="num">' + (B.hasEb ? (r.av ? pjRp(r.av) : '·') : '—') + '</td><td class="num">' + (r.mtdT ? pjRp(r.mtdT) : '·') + '</td><td>' + opdTag(r.prio === 'A' ? 'bad' : (r.prio === 'B' ? 'warn' : 'none'), 'Prioritas ' + r.prio) + '</td></tr>'; };
    var sub = function (it) { var c = { A: 0, B: 0, C: 0 }; it.forEach(function (r) { c[r.prio]++; }); return '<td class="num cur"><b>' + pjRp(grpSum(it, function (r) { return r.sepT; })) + '</b></td><td class="num">' + pjRp(grpSum(it, function (r) { return r.dem; })) + '</td><td class="num">' + (B.hasEb ? pjRp(grpSum(it, function (r) { return r.av; })) : '—') + '</td><td class="num">' + pjRp(grpSum(it, function (r) { return r.mtdT; })) + '</td><td>A ' + c.A + ' · B ' + c.B + ' · C ' + c.C + '</td>'; };
    var body = opdGrouped('opdvisit', B, list, { val: function (r) { return r.sepT; }, span: 2, cols: 7, sub: sub, row: row });
    return kp + opdBar('opdvisit') + card('Outlet belum pernah divisit MTD · prioritas lalu order September terbesar (' + fmtCount(n) + ' outlet)', opdShell(th('Area › MC › DSE › Outlet') + th('Site · Kecamatan') + th('Order bulan lalu (Sep penuh)', 1) + th('Demand Okt MTD', 1) + th('Rata-rata transaksi / hari', 1) + th('Sell-In Okt MTD', 1) + th('Prioritas'), body, OPD_GRP_NOTE + opdNote()));
  }
  function opdSiteV(B) {
    var list = B.sites.filter(function (s) { return B.nvSites[s.key] && opdIn(s); }), all = B.sites.filter(opdIn);
    list.sort(function (a, b) { return b.sepT - a.sepT || b.n - a.n; });
    var o = list.reduce(function (t, s) { return t + s.n; }, 0), sep = list.reduce(function (t, s) { return t + s.sepT; }, 0);
    var kp = '<div class="kpis" style="margin-top:10px; grid-template-columns: repeat(3, 1fr);">' +
      kpi('Site belum pernah divisit MTD', fmtCount(list.length), pctOf(list.length, all.length) + '% dari ' + fmtCount(all.length) + ' site di lingkup', list.length ? 'down' : 'up', 'tidak satu pun outlet di site yang divisit') +
      kpi('Outlet master di site itu', fmtCount(o), 'belum tersentuh PJP', 'down', 'mapping site-outlet NBS') + kpi('Order bulan lalu di site itu', pjRp(sep), 'Sell-In September penuh', 'up', 'prioritas site dengan order terbesar') + '</div>';
    var row = function (s) { return '<tr><td class="cur" style="padding-left:56px;"><b>' + esc(s.site) + '</b></td><td>' + esc(s.kec) + '</td><td class="num">' + fmtCount(s.n) + '</td><td class="num cur"><b>' + pjRp(s.sepT) + '</b></td><td class="num">' + (s.dem ? pjRp(s.dem) : '·') + '</td><td class="num">' + (s.mtdT ? pjRp(s.mtdT) : '·') + '</td><td class="num">' + (s.ga ? fmtCount(s.ga) : '·') + '</td></tr>'; };
    var sub = function (it) { return '<td class="num">' + fmtCount(grpSum(it, function (s) { return s.n; })) + '</td><td class="num cur"><b>' + pjRp(grpSum(it, function (s) { return s.sepT; })) + '</b></td><td class="num">' + pjRp(grpSum(it, function (s) { return s.dem; })) + '</td><td class="num">' + pjRp(grpSum(it, function (s) { return s.mtdT; })) + '</td><td class="num">' + fmtCount(grpSum(it, function (s) { return s.ga; })) + '</td>'; };
    var body = opdGrouped('opdsitev', B, list, { val: function (s) { return s.sepT; }, span: 2, cols: 7, sub: sub, row: row, unit: 'site' });
    return kp + opdBar('opdsitev') + card('Site belum pernah divisit MTD (' + fmtCount(list.length) + ' site, order bulan lalu terbesar dulu)', opdShell(th('Area › MC › DSE › Site NBS') + th('Kecamatan') + th('Outlet master', 1) + th('Order bulan lalu', 1) + th('Demand Okt MTD', 1) + th('Sell-In Okt MTD', 1) + th('GA MTD (pcs)', 1), body, OPD_GRP_NOTE + opdNote()));
  }
  function opdSiteGa(B) {
    if (!B.hasGa) return card('Site tanpa GA', '<p class="note">Feed GA (raw/GA) belum dibangun, sehingga Gross Add per outlet belum bisa dihitung. Jalankan <code>python3 scripts/build_ga_feed.py</code>.</p>');
    var all = B.sites.filter(opdIn), list = all.filter(function (s) { return s.ga <= 0; });
    list.sort(function (a, b) { return b.gaF - a.gaF || b.sepSP - a.sepSP || b.sepT - a.sepT || b.n - a.n; });
    var o = list.reduce(function (t, s) { return t + s.n; }, 0), withSp = list.filter(function (s) { return s.mtdSP > 0; }).length;
    var kp = '<div class="kpis" style="margin-top:10px; grid-template-columns: repeat(3, 1fr);">' +
      kpi('Site tanpa satu pun GA MTD', fmtCount(list.length), pctOf(list.length, all.length) + '% dari ' + fmtCount(all.length) + ' site', list.length ? 'down' : 'up', 'tidak ada gross add (SSO) di semua outlet site') +
      kpi('Outlet master di site itu', fmtCount(o), 'belum ada aktivasi SP ke konsumen', 'down', 'GA = RGUGA 1–' + B.gaCut + ' Okt') +
      kpi('Site yang sudah menerima SP Sell-In', fmtCount(withSp), 'stok SP masuk tetapi belum ter-GA', withSp ? 'down' : 'up', 'cek stok tertahan dan kunjungan') + '</div>';
    var row = function (s) { return '<tr><td class="cur" style="padding-left:56px;"><b>' + esc(s.site) + '</b></td><td class="num">' + fmtCount(s.n) + '</td><td class="num">' + (s.gaF ? fmtCount(s.gaF) : '·') + '</td><td class="num">' + (s.sepSP ? pjRp(s.sepSP) : '·') + '</td><td class="num">' + (s.mtdSP ? pjRp(s.mtdSP) : '·') + '</td><td class="num">' + (s.dem ? pjRp(s.dem) : '·') + '</td><td>' + (B.nvSites[s.key] ? opdTag('bad', 'belum divisit') : opdTag('ok', 'sudah divisit')) + '</td></tr>'; };
    var sub = function (it) { return '<td class="num">' + fmtCount(grpSum(it, function (s) { return s.n; })) + '</td><td class="num">' + fmtCount(grpSum(it, function (s) { return s.gaF; })) + '</td><td class="num">' + pjRp(grpSum(it, function (s) { return s.sepSP; })) + '</td><td class="num">' + pjRp(grpSum(it, function (s) { return s.mtdSP; })) + '</td><td class="num">' + pjRp(grpSum(it, function (s) { return s.dem; })) + '</td><td>' + fmtCount(it.filter(function (s) { return B.nvSites[s.key]; }).length) + ' belum divisit</td>'; };
    var body = opdGrouped('opdsitega', B, list, { val: function (s) { return s.gaF || s.sepSP; }, span: 1, cols: 7, sub: sub, row: row, unit: 'site' });
    return kp + opdBar('opdsitega') + card('Site tanpa Gross Add / SSO (' + fmtCount(list.length) + ' site, GA September terbesar dulu)', opdShell(th('Area › MC › DSE › Site NBS') + th('Outlet master', 1) + th('GA Sep penuh (pcs)', 1) + th('SP Sell-In Sep (Rp)', 1) + th('SP Sell-In Okt MTD (Rp)', 1) + th('Demand Okt MTD', 1) + th('Status kunjungan'), body, OPD_GRP_NOTE + '<p class="note">Site = site NBS di mapping site-outlet (site PENDING-NBS tidak dihitung). Site tanpa GA = jumlah gross add (RGUGA) seluruh outlet master di site itu 0 pada 1–' + B.gaCut + ' Okt; kolom GA Sep menunjukkan site yang pernah punya GA di September. Urutan memakai GA September penuh agar site yang pernah aktif lebih dulu.</p>'));
  }
  function opdGaSp(B) {
    if (!B.hasGa) return card('Outlet tanpa GA / SP Sell-In', '<p class="note">Feed GA (raw/GA) belum dibangun, sehingga Gross Add per outlet belum bisa dihitung. Jalankan <code>python3 scripts/build_ga_feed.py</code>.</p>');
    var scope = B.rows.filter(opdIn), seg = state.opdSeg || 'all';
    scope.forEach(function (r) { r.seg = r.ga <= 0 && r.mtdSP <= 0 ? 'both' : (r.ga <= 0 ? 'noga' : (r.mtdSP <= 0 ? 'nosp' : 'ok')); });
    var cnt = { both: 0, noga: 0, nosp: 0, ok: 0 }; scope.forEach(function (r) { cnt[r.seg]++; });
    var segs = [['all', 'Semua yang bermasalah', cnt.both + cnt.noga + cnt.nosp], ['both', 'Tanpa GA dan tanpa SP Sell-In', cnt.both], ['noga', 'Ada SP Sell-In, tanpa GA', cnt.noga], ['nosp', 'Ada GA, tanpa SP Sell-In', cnt.nosp]];
    var list = scope.filter(function (r) { return seg === 'all' ? r.seg !== 'ok' : r.seg === seg; });
    list.sort(function (a, b) { return b.sepSPq - a.sepSPq || b.sepSP - a.sepSP || b.dem - a.dem; });
    var kp = '<div class="kpis" style="margin-top:10px;">' + segs.slice(1).map(function (s) { return kpi(s[1], fmtCount(s[2]), pctOf(s[2], scope.length) + '% dari ' + fmtCount(scope.length) + ' outlet master', s[0] === 'both' ? 'down' : 'up', s[0] === 'both' ? 'prioritas aktivasi' : (s[0] === 'noga' ? 'SP masuk, belum terjual ke konsumen' : 'menjual SP tanpa isi ulang')); }).join('') +
      kpi('Outlet sehat (GA dan SP Sell-In)', fmtCount(cnt.ok), pctOf(cnt.ok, scope.length) + '%', 'up', 'tidak masuk daftar') + '</div>';
    var segBar = '<div class="map-toolbar-group"><span class="map-label">Segmen:</span>' + segs.map(function (s) { return '<button type="button" class="map-btn' + (seg === s[0] ? ' active' : '') + '" data-opd-seg="' + s[0] + '">' + s[1] + ' (' + fmtCount(s[2]) + ')</button>'; }).join('') + '</div>';
    var lab = { both: ['bad', 'tanpa GA · tanpa SP'], noga: ['warn', 'SP tertahan'], nosp: ['warn', 'GA tanpa SP'] };
    var row = function (r) { return '<tr>' + opdOutletTds(r) + '<td class="num">' + (r.mtdSP ? fmtCount(r.mtdSP) : '·') + '</td><td class="num">' + (r.sepSPq ? fmtCount(r.sepSPq) : '·') + '</td><td class="num">' + (r.gaF ? fmtCount(r.gaF) : '·') + '</td><td class="num">' + (r.ga ? fmtCount(r.ga) : '·') + '</td><td class="num">' + (r.dem ? pjRp(r.dem) : '·') + '</td><td>' + opdTag(lab[r.seg][0], lab[r.seg][1]) + '</td></tr>'; };
    var sub = function (it) { return '<td class="num">' + fmtCount(grpSum(it, function (r) { return r.mtdSP; })) + '</td><td class="num">' + fmtCount(grpSum(it, function (r) { return r.sepSPq; })) + '</td><td class="num">' + fmtCount(grpSum(it, function (r) { return r.gaF; })) + '</td><td class="num">' + fmtCount(grpSum(it, function (r) { return r.ga; })) + '</td><td class="num">' + pjRp(grpSum(it, function (r) { return r.dem; })) + '</td><td></td>'; };
    var body = opdGrouped('opdgasp', B, list, { val: function (r) { return r.sepSPq; }, span: 2, cols: 8, sub: sub, row: row });
    return kp + opdBar('opdgasp', segBar) + card('Outlet tanpa GA dan / atau tanpa SP Sell-In (' + fmtCount(list.length) + ' outlet, SP Sell-In September terbesar dulu)', opdShell(th('Area › MC › DSE › Outlet') + th('Site · Kecamatan') + th('SP Sell-In Okt MTD (pcs)', 1) + th('SP Sell-In Sep (pcs)', 1) + th('GA Sep penuh (pcs)', 1) + th('GA MTD 1–' + B.gaCut + ' Okt (pcs)', 1) + th('Demand Okt MTD', 1) + th('Segmen'), body, OPD_GRP_NOTE + '<p class="note">GA (Gross Add) = aktivasi SIM per outlet dari Daily_RGUGA_OUTLET (SSO = outlet dengan ≥ 1 GA). SP Sell-In = Starter Pack yang masuk ke outlet dari MOBII. Segmen "SP tertahan" berarti stok SP sudah masuk tetapi belum ada yang diaktivasi.</p>'));
  }
  function opdSaldo(B) {
    var scope = B.rows.filter(opdIn), list = scope.filter(function (r) { return r.mtdSAL <= 0 && (r.dem > 0 || r.av > 0); });
    list.forEach(function (r) { r.bal = opdBal(r); r.zero = r.bal != null && r.bal <= 0; });
    list.sort(function (a, b) { return b.sepSAL - a.sepSAL || b.dem - a.dem || b.av - a.av; });
    var z = list.filter(function (r) { return r.zero; }).length, hadSep = list.filter(function (r) { return r.sepSAL > 0; }), sepv = hadSep.reduce(function (t, r) { return t + r.sepSAL; }, 0);
    var kp = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet tanpa Saldo Sell-In MTD, ada demand', fmtCount(list.length), pctOf(list.length, scope.length) + '% dari ' + fmtCount(scope.length) + ' outlet master', list.length ? 'down' : 'up', 'demand Okt MTD > 0 atau rata-rata transaksi ENDBAL > 0') +
      kpi('Beli saldo bulan lalu', fmtCount(hadSep.length), 'saldo Sep ' + pjRp(sepv), hadSep.length ? 'down' : 'up', 'berhenti isi saldo bulan ini') +
      kpi('Zero stock saat ini', B.hasEb ? fmtCount(z) : '—', 'saldo stock account ≤ 0 (ENDBAL)', z ? 'down' : 'up', 'tidak bisa menjual sampai diisi') +
      kpi('Demand Okt MTD outlet ini', pjRp(list.reduce(function (t, r) { return t + r.dem; }, 0)), 'penjualan tanpa isi saldo', 'up', 'peluang Sell-In saldo') + '</div>';
    var row = function (r) { return '<tr>' + opdOutletTds(r) + '<td class="num cur"><b>' + (r.sepSAL ? pjRp(r.sepSAL) : '·') + '</b></td><td class="num">' + (r.dem ? pjRp(r.dem) : '·') + '</td><td class="num">' + (B.hasEb ? (r.av ? pjRp(r.av) : '·') : '—') + '</td><td class="num">' + (r.bal == null ? '—' : pjRp(r.bal)) + '</td><td>' + (r.zero ? opdTag('bad', 'zero stock') : (r.bal == null ? opdTag('none', 'tanpa ENDBAL') : opdTag('ok', 'ada stok'))) + '</td></tr>'; };
    var sub = function (it) { return '<td class="num cur"><b>' + pjRp(grpSum(it, function (r) { return r.sepSAL; })) + '</b></td><td class="num">' + pjRp(grpSum(it, function (r) { return r.dem; })) + '</td><td class="num">' + (B.hasEb ? pjRp(grpSum(it, function (r) { return r.av; })) : '—') + '</td><td class="num">' + pjRp(grpSum(it, function (r) { return r.bal || 0; })) + '</td><td>' + fmtCount(it.filter(function (r) { return r.zero; }).length) + ' zero stock</td>'; };
    var body = opdGrouped('opdsaldo', B, list, { val: function (r) { return r.sepSAL; }, span: 2, cols: 7, sub: sub, row: row });
    return kp + opdBar('opdsaldo') + card('Outlet tanpa Saldo Sell-In MTD dengan demand (' + fmtCount(list.length) + ' outlet, saldo September terbesar dulu)', opdShell(th('Area › MC › DSE › Outlet') + th('Site · Kecamatan') + th('Saldo Sell-In Sep (Rp)', 1) + th('Demand Okt MTD', 1) + th('Rata-rata transaksi / hari', 1) + th('Saldo stok kini', 1) + th('Status'), body, OPD_GRP_NOTE + opdNote()));
  }
  function opdEndbal(B) {
    if (!B.hasEb) return card('ENDBAL rendah / nol', '<p class="note">Feed ENDBAL belum dibangun. Jalankan <code>python3 scripts/build_endbal_feed.py</code>.</p>');
    var scope = B.rows.filter(opdIn), view = state.opdEb || 'outlet', basisTxt = state.ebBasis === 'all' ? 'stock account + rekening lainnya' : 'stock account (utama)';
    var cnt = { none: 0, low: 0, ok: 0 }; scope.forEach(function (r) { r.eb = opdEbKind(r); cnt[r.eb]++; });
    var key = {}; scope.forEach(function (r) { if (!r.site || r.site === 'PENDING-NBS') return; var k = r.site + '::' + r.mc, s = key[k] || (key[k] = { site: r.site, mc: r.mc, br: r.br, dse: r.dse, kec: r.kec, n: 0, none: 0, low: 0, dem: 0, sepSAL: 0, mtdSAL: 0, bal: 0 }); s.n++; if (r.eb === 'none') s.none++; if (r.eb === 'low') s.low++; s.dem += r.dem; s.sepSAL += r.sepSAL; s.mtdSAL += r.mtdSAL; s.bal += opdBal(r) || 0; });
    var sites = Object.keys(key).map(function (k) { var s = key[k]; s.bad = s.none + s.low; s.share = s.bad / s.n; return s; }), hot = sites.filter(function (s) { return s.share > 0.5; });
    hot.sort(function (a, b) { return b.bad - a.bad || b.share - a.share; });
    var hotOut = hot.reduce(function (t, s) { return t + s.bad; }, 0);
    var kp = '<div class="kpis" style="margin-top:10px;">' +
      kpi('Outlet tanpa ENDBAL (nol / tanpa rekening)', fmtCount(cnt.none), pctOf(cnt.none, scope.length) + '% dari ' + fmtCount(scope.length) + ' outlet master', cnt.none ? 'down' : 'up', 'saldo ' + basisTxt + ' ≤ 0') +
      kpi('Outlet ENDBAL rendah (< Rp ' + fmtCount(OPD_LOW / 1000) + ' Rb)', fmtCount(cnt.low), pctOf(cnt.low, scope.length) + '% dari outlet master', cnt.low ? 'down' : 'up', 'stok tipis, mudah habis') +
      kpi('Site dengan > 50% outlet rendah / nol', fmtCount(hot.length), pctOf(hot.length, sites.length) + '% dari ' + fmtCount(sites.length) + ' site', hot.length ? 'down' : 'up', 'prioritas isi saldo per site') +
      kpi('Outlet rendah / nol di site itu', fmtCount(hotOut), 'dari ' + fmtCount(hot.reduce(function (t, s) { return t + s.n; }, 0)) + ' outlet di site tersebut', 'down', 'kerjakan satu site sekaligus') + '</div>';
    var viewBar = '<div class="map-toolbar-group"><span class="map-label">Tampilan:</span>' + [['outlet', 'Outlet ENDBAL rendah / nol'], ['site', 'Site > 50% outlet rendah / nol']].map(function (x) { return '<button type="button" class="map-btn' + (view === x[0] ? ' active' : '') + '" data-opd-eb="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var ttl, head, body, tkey = view === 'site' ? 'opdebsite' : 'opdeboutlet';
    if (view === 'site') {
      ttl = 'Site dengan lebih dari 50% outlet ENDBAL rendah / nol (' + fmtCount(hot.length) + ' site)';
      head = th('Area › MC › DSE › Site NBS') + th('Kecamatan') + th('Outlet', 1) + th('Nol', 1) + th('Rendah', 1) + th('% rendah / nol', 1) + th('Total stok', 1) + th('Saldo Sell-In Sep', 1) + th('Demand Okt MTD', 1);
      var row = function (s) { return '<tr><td class="cur" style="padding-left:56px;"><b>' + esc(s.site) + '</b></td><td>' + esc(s.kec) + '</td><td class="num">' + fmtCount(s.n) + '</td><td class="num">' + fmtCount(s.none) + '</td><td class="num">' + fmtCount(s.low) + '</td><td class="num cur"><b>' + (s.share * 100).toFixed(0) + '%</b></td><td class="num">' + pjRp(s.bal) + '</td><td class="num">' + (s.sepSAL ? pjRp(s.sepSAL) : '·') + '</td><td class="num">' + (s.dem ? pjRp(s.dem) : '·') + '</td></tr>'; };
      var sub = function (it) { var n = grpSum(it, function (s) { return s.n; }), b = grpSum(it, function (s) { return s.bad; }); return '<td class="num">' + fmtCount(n) + '</td><td class="num">' + fmtCount(grpSum(it, function (s) { return s.none; })) + '</td><td class="num">' + fmtCount(grpSum(it, function (s) { return s.low; })) + '</td><td class="num cur"><b>' + (n ? (b / n * 100).toFixed(0) : 0) + '%</b></td><td class="num">' + pjRp(grpSum(it, function (s) { return s.bal; })) + '</td><td class="num">' + pjRp(grpSum(it, function (s) { return s.sepSAL; })) + '</td><td class="num">' + pjRp(grpSum(it, function (s) { return s.dem; })) + '</td>'; };
      body = opdGrouped(tkey, B, hot, { val: function (s) { return s.bad; }, span: 2, cols: 9, sub: sub, row: row, unit: 'site' });
    } else {
      var list = scope.filter(function (r) { return r.eb !== 'ok'; });
      list.sort(function (a, b) { return (b.dem + b.av) - (a.dem + a.av) || b.sepSAL - a.sepSAL; });
      ttl = 'Outlet ENDBAL rendah / nol (' + fmtCount(list.length) + ' outlet, demand terbesar dulu)';
      head = th('Area › MC › DSE › Outlet') + th('Site · Kecamatan') + th('Stok kini', 1) + th('Rata-rata transaksi / hari', 1) + th('Cakupan (hari)', 1) + th('Saldo Sell-In Okt MTD', 1) + th('Saldo Sell-In Sep', 1) + th('Demand Okt MTD', 1) + th('Status');
      var row2 = function (r) { var b = opdBal(r); return '<tr>' + opdOutletTds(r) + '<td class="num cur"><b>' + (b == null ? '—' : pjRp(b)) + '</b></td><td class="num">' + (r.av ? pjRp(r.av) : '·') + '</td><td class="num">' + (b != null && b > 0 && r.av > 0 ? (b / r.av).toFixed(1) : '·') + '</td><td class="num">' + (r.mtdSAL ? pjRp(r.mtdSAL) : '·') + '</td><td class="num">' + (r.sepSAL ? pjRp(r.sepSAL) : '·') + '</td><td class="num">' + (r.dem ? pjRp(r.dem) : '·') + '</td><td>' + (r.eb === 'none' ? opdTag('bad', b == null ? 'tanpa rekening' : 'nol') : opdTag('warn', 'rendah')) + '</td></tr>'; };
      var sub2 = function (it) { return '<td class="num cur"><b>' + pjRp(grpSum(it, function (r) { return opdBal(r) || 0; })) + '</b></td><td class="num">' + pjRp(grpSum(it, function (r) { return r.av; })) + '</td><td></td><td class="num">' + pjRp(grpSum(it, function (r) { return r.mtdSAL; })) + '</td><td class="num">' + pjRp(grpSum(it, function (r) { return r.sepSAL; })) + '</td><td class="num">' + pjRp(grpSum(it, function (r) { return r.dem; })) + '</td><td>' + fmtCount(it.filter(function (r) { return r.eb === 'none'; }).length) + ' nol</td>'; };
      body = opdGrouped(tkey, B, list, { val: function (r) { return r.dem + r.av; }, span: 2, cols: 9, sub: sub2, row: row2 });
    }
    return kp + opdBar(tkey, viewBar) + card(ttl, opdShell(head, body, OPD_GRP_NOTE + '<p class="note">ENDBAL = stok saldo penutupan outlet (' + basisTxt + ', snapshot 14 Okt; basis bisa diganti di menu END BALANCE). Nol = saldo ≤ 0 atau outlet tidak punya rekening di file; rendah = di bawah Rp ' + fmtCount(OPD_LOW / 1000) + ' Rb. Site dihitung dari mapping site-outlet NBS; site dengan lebih dari 50% outletnya rendah atau nol ditampilkan. Cakupan = stok ÷ rata-rata transaksi harian.</p>'));
  }
  /* ---- Opportunity map: heat map polygons + outlet (circle) and site (triangle) markers, one colour per problem ---- */
  var OPD_LAYERS = [
    ['nv', '🏪', 'Outlet belum divisit MTD', 'circle', '#DC2626'], ['gasp', '🏪', 'Outlet tanpa GA & tanpa SP Sell-In', 'circle', '#2563EB'], ['sal', '🏪', 'Outlet tanpa saldo Sell-In + demand', 'circle', '#16A34A'],
    ['ebn', '🏪', 'Outlet ENDBAL nol', 'circle', '#111827'], ['ebl', '🏪', 'Outlet ENDBAL rendah', 'circle', '#9CA3AF'],
    ['nvs', '📡', 'Site belum divisit MTD', 'tri', '#EA580C'], ['sga', '📡', 'Site tanpa GA', 'tri', '#7C3AED'], ['ebs', '📡', 'Site > 50% outlet ENDBAL rendah / nol', 'tri', '#92400E']];
  function opdLayerOn(k) { var m = state.opdLayers || {}; return m[k] !== undefined ? !!m[k] : (k === 'nv' || k === 'nvs' || k === 'heat'); }
  function opdValidXY(la, lo) { la = Number(la); lo = Number(lo); return la >= -7.5 && la <= -5.5 && lo >= 106 && lo <= 108 ? [la, lo] : null; }
  // outlets and sites that belong to each problem layer, inside the header scope
  function opdMapLayers(B) {
    var sig = [state.branch, state.hoa, state.kec, state.dse, state.ebBasis].join('|');
    if (B._ml && B._ml.sig === sig) return B._ml;
    if (!B.siteXY) {
      var mf = (typeof window !== 'undefined') ? window.JAKARTA_MAP_FEED : null; B.siteXY = {};
      if (mf && mf.sites) mf.sites.forEach(function (s) { var xy = opdValidXY(s.lat, s.long); if (xy) B.siteXY[s.site_key] = xy; });
    }
    var scope = B.rows.filter(opdIn), ML = { sig: sig, scope: scope.length, nv: [], gasp: [], sal: [], ebn: [], ebl: [], nvs: [], sga: [], ebs: [] };
    var seenK = {};
    scope.forEach(function (r) {
      if (seenK[r.k]) return; seenK[r.k] = 1;   // the master carries a few outlet keys twice: one marker per outlet
      if (B.nv[r.k]) ML.nv.push(r);
      if (B.hasGa && r.ga <= 0 && r.mtdSP <= 0) ML.gasp.push(r);
      if (r.mtdSAL <= 0 && (r.dem > 0 || r.av > 0)) ML.sal.push(r);
      var k = opdEbKind(r); if (k === 'none') ML.ebn.push(r); else if (k === 'low') ML.ebl.push(r);
    });
    var by = {}; scope.forEach(function (r) { if (!r.site || r.site === 'PENDING-NBS') return; var key = r.site + '::' + r.mc, e = by[key] || (by[key] = { n: 0, bad: 0 }); e.n++; if (opdEbKind(r) !== 'ok') e.bad++; });
    B.sites.filter(opdIn).forEach(function (s) {
      var e = by[s.key]; s.ebBad = e ? e.bad : 0; s.ebN = e ? e.n : 0;
      if (B.nvSites[s.key]) ML.nvs.push(s);
      if (B.hasGa && s.ga <= 0) ML.sga.push(s);
      if (e && e.n && e.bad / e.n > 0.5) ML.ebs.push(s);
    });
    B._ml = ML; return ML;
  }
  function opdHeatToolbar() { return mbHeatToolbar(); }
  function opdMapSection(B) {
    var ML = opdMapLayers(B), vf = mbVisitsFeed(), sf = sellinFeed();
    var mapEl = '<div id="opd-map" style="height:640px; border:2px solid var(--ij-ink);" role="img" aria-label="Peta lokasi outlet dan site yang bermasalah"></div>';
    return card('Peta lokasi problem dan opportunity · ' + esc(scopeText()) + (state.dse ? ' · DSE ' + esc((dseGet(state.dse) || {}).label || state.dse) : ''),
      (vf ? mbHeatToolbar() : '') + mapEl + '<p class="note" style="margin-top:6px;" id="opd-note"></p>') +
      (vf ? mbMapSection(vf, sf, true) : '');
  }
  function opdOutletFlags(B, r) {
    var f = []; if (B.nv[r.k]) f.push('Belum pernah divisit MTD');
    if (B.hasGa && r.ga <= 0 && r.mtdSP <= 0) f.push('Tanpa GA dan tanpa SP Sell-In'); else if (B.hasGa && r.ga <= 0) f.push('SP Sell-In ada, tanpa GA');
    if (r.mtdSAL <= 0 && (r.dem > 0 || r.av > 0)) f.push('Tanpa saldo Sell-In MTD, ada demand');
    var k = opdEbKind(r), b = opdBal(r); if (k === 'none') f.push('ENDBAL nol' + (b == null ? ' (tanpa rekening)' : '')); else if (k === 'low') f.push('ENDBAL rendah (' + pjRp(b) + ')');
    return f;
  }
  function initOpdMap() {
    if (typeof L === 'undefined' || typeof document === 'undefined') return;
    var el = document.getElementById('opd-map'); if (!el) return;
    var B = opdBase(); if (!B) return;
    var ML = opdMapLayers(B), vf = mbVisitsFeed(), sf = sellinFeed();
    mapEnsureTriangle();
    var prev = window._opdMapInstance ? { c: window._opdMapInstance.getCenter(), z: window._opdMapInstance.getZoom() } : null;
    if (window._opdMapInstance) { try { window._opdMapInstance.remove(); } catch (e) {} window._opdMapInstance = null; }
    var map = L.map('opd-map', { center: [-6.225, 106.845], zoom: 10, minZoom: 8, maxZoom: 19, preferCanvas: true, zoomAnimation: false });
    window._opdMapInstance = map;
    var bases = {
      'Peta terang (Esri)': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri', maxZoom: 19 }),
      'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }),
      'CARTO Voyager': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 20 }),
      'Esri Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri', maxZoom: 19 })
    };
    var baseName = state.opdMapBase && bases[state.opdMapBase] ? state.opdMapBase : 'Peta terang (Esri)';
    bases[baseName].addTo(map);
    L.control.layers(bases, null, { position: 'topright', collapsed: true }).addTo(map);
    map.on('baselayerchange', function (e) { state.opdMapBase = e.name; });
    L.control.scale({ metric: true, imperial: false }).addTo(map);
    var renderer = L.canvas({ padding: 0.5 }), def = {}; OPD_LAYERS.forEach(function (l) { def[l[0]] = l; });
    var links = function (xy) { return '<code>' + xy[0].toFixed(6) + ', ' + xy[1].toFixed(6) + '</code><br><a href="' + gmapsSearch(xy[0], xy[1]) + '" target="_blank" rel="noopener">Buka di Google Maps</a> · <a href="' + gmapsDir(xy[0], xy[1]) + '" target="_blank" rel="noopener">Rute</a>'; };
    var chips = function (fl) { return fl.map(function (x) { return '<span style="display:inline-block; margin:2px 3px 0 0; padding:1px 6px; background:#fee2e2; color:#7f1d1d; font-weight:700;">' + esc(x) + '</span>'; }).join(''); };
    var outletPopup = function (r, xy) { return '<div style="font:500 12.5px var(--ij-font); min-width:240px;"><b style="font-size:14px;">🏪 ' + esc(r.n) + '</b><br><code>' + esc(r.id) + '</code> · site ' + esc(r.site || '—') + '<br>' + esc(r.mc) + ' · DSE ' + esc(r.dse) + '<br>' + chips(opdOutletFlags(B, r)) + '<br>Order Sep ' + pjRp(r.sepT) + ' · Sell-In Okt ' + pjRp(r.mtdT) + '<br>Demand Okt MTD ' + pjRp(r.dem) + ' · GA ' + fmtCount(r.ga) + ' pcs<br>' + links(xy) + '</div>'; };
    var sitePopup = function (s, xy) { var fl = []; if (B.nvSites[s.key]) fl.push('Belum pernah divisit MTD'); if (B.hasGa && s.ga <= 0) fl.push('Tanpa GA'); if (s.ebN && s.ebBad / s.ebN > 0.5) fl.push(fmtCount(s.ebBad) + ' dari ' + fmtCount(s.ebN) + ' outlet ENDBAL rendah / nol'); return '<div style="font:500 12.5px var(--ij-font); min-width:240px;"><b style="font-size:14px;">📡 Site ' + esc(s.site) + '</b><br>' + esc(s.mc) + ' · DSE ' + esc(s.dse) + '<br>' + fmtCount(s.n) + ' outlet master<br>' + chips(fl) + '<br>Order Sep ' + pjRp(s.sepT) + ' · Demand Okt MTD ' + pjRp(s.dem) + '<br>' + links(xy) + '</div>'; };
    // layer groups are built the first time they are switched on, so the map opens fast even with 15k candidate points
    var G = {}, ORDER = ['heat', 'ebs', 'sga', 'nvs', 'ebl', 'ebn', 'sal', 'gasp', 'nv'], shown = {}, bounds = [];
    var build = function (key) {
      var g = L.layerGroup(), pts = [];
      if (key === 'heat') { if (vf) mbAddPolys(g, vf, sf, bounds, 0.32); return { g: g, pts: [] }; }
      var l = def[key];
      ML[key].forEach(function (x) {
        var xy, m;
        if (l[3] === 'tri') {
          xy = B.siteXY[x.key]; if (!xy) return;
          m = new L.TriangleMarker(xy, { renderer: renderer, radius: 7 + Math.min(8, Math.sqrt(x.n) * 1.6), color: '#0F172A', weight: 1, fillColor: l[4], fillOpacity: 0.9 });
          m.bindTooltip(function () { return '<b>📡 ' + esc(x.site) + '</b> · ' + esc(l[2]) + '<br>' + fmtCount(x.n) + ' outlet · ' + esc(x.mc); }, { sticky: true });
          m.bindPopup(function () { return sitePopup(x, xy); }, { maxWidth: 320 });
        } else {
          xy = opdValidXY(x.lat, x.lon); if (!xy) return;
          m = L.circleMarker(xy, { renderer: renderer, radius: key === 'nv' ? 5 : 4, color: '#FFFFFF', weight: 0.8, fillColor: l[4], fillOpacity: 0.92 });
          m.bindTooltip(function () { return '<b>🏪 ' + esc(x.n) + '</b> · ' + esc(l[2]) + '<br>' + esc(x.mc) + ' · ' + esc(x.dse); }, { sticky: true });
          m.bindPopup(function () { return outletPopup(x, xy); }, { maxWidth: 320 });
        }
        m.addTo(g); pts.push(xy);
      });
      return { g: g, pts: pts };
    };
    var count = function () { var n = 0; ORDER.forEach(function (k) { if (shown[k] && k !== 'heat') n += G[k].pts.length; }); var note = document.getElementById('opd-note'); if (note) note.textContent = 'Lingkaran = outlet, segitiga = site (ukuran mengikuti jumlah outlet). Menampilkan ' + fmtCount(n) + ' titik dari lapisan yang aktif. Satu outlet bisa masuk beberapa lapisan: klik titik untuk melihat semua masalahnya, nilai order, demand, dan tautan Google Maps. Hidup-matikan lapisan di legenda pada peta; persempit ke satu MC atau DSE bila terlalu padat.'; };
    var redraw = function () { ORDER.forEach(function (k) { if (G[k] && map.hasLayer(G[k].g)) map.removeLayer(G[k].g); }); ORDER.forEach(function (k) { if (shown[k]) { if (!G[k]) G[k] = build(k); map.addLayer(G[k].g); } }); count(); };
    ORDER.forEach(function (k) { shown[k] = opdLayerOn(k); });
    redraw();
    // legend = layer switch: shape and colour of every icon, the count behind it, and the heat colour ramp
    var Legend = L.Control.extend({ options: { position: 'bottomleft' }, onAdd: function () {
      var div = L.DomUtil.create('div', 'opd-legend');
      var row = function (l) { var sym = l[3] === 'tri' ? '<span class="opd-tri" style="border-bottom-color:' + l[4] + ';"></span>' : '<span class="opd-dot" style="background:' + l[4] + ';"></span>'; return '<label><input type="checkbox" data-k="' + l[0] + '"' + (shown[l[0]] ? ' checked' : '') + '> ' + sym + ' <span>' + esc(l[2]) + '</span> <b>' + fmtCount(ML[l[0]].length) + '</b></label>'; };
      var metric = state.mbMetric || 'nosellin', ramp = metric === 'lowvisit' ? [70, 50, 30, 20, 10] : [10, 30, 50, 70, 90];
      div.innerHTML = '<button type="button" class="opd-lg-t" aria-expanded="true" aria-label="Lipat atau buka legenda">Legenda · lapisan <span>▾</span></button><div class="opd-lg-body"><div class="opd-lg-s">Outlet (lingkaran)</div>' + OPD_LAYERS.filter(function (l) { return l[3] === 'circle'; }).map(row).join('') +
        '<div class="opd-lg-s">Site (segitiga, ukuran = jumlah outlet)</div>' + OPD_LAYERS.filter(function (l) { return l[3] === 'tri'; }).map(row).join('') +
        '<div class="opd-lg-s">Latar</div><label><input type="checkbox" data-k="heat"' + (shown.heat ? ' checked' : '') + '> Heat map poligon</label><div class="opd-ramp">' + ramp.map(function (v) { return '<span style="background:' + mbColor(v, metric) + ';"></span>'; }).join('') + '</div><div class="opd-lg-n">' + (metric === 'lowvisit' ? 'hit rate PJP tinggi → rendah (&lt; 25% = masalah)' : '% outlet bermasalah rendah → tinggi (≥ 80% = masalah)') + ' · metrik dipilih di atas peta</div></div>';
      L.DomEvent.disableClickPropagation(div); L.DomEvent.disableScrollPropagation(div);
      div.querySelector('.opd-lg-t').addEventListener('click', function () { var c = div.classList.toggle('opd-collapsed'); this.setAttribute('aria-expanded', String(!c)); this.lastChild.textContent = c ? '▸' : '▾'; });
      div.addEventListener('change', function (e) { var k = e.target.getAttribute('data-k'); if (!k) return; shown[k] = e.target.checked; state.opdLayers = state.opdLayers || {}; state.opdLayers[k] = e.target.checked; redraw(); });
      return div;
    } });
    new Legend().addTo(map);
    var pts = []; ORDER.forEach(function (k) { if (shown[k] && G[k] && k !== 'heat') pts = pts.concat(G[k].pts); });
    var all = pts.length ? pts : bounds;
    if (prev && state._opdKeep) map.setView(prev.c, prev.z, { animate: false });
    else if (all.length) map.fitBounds(all, { padding: [20, 20], animate: false });
    state._opdKeep = false;
  }
  function viewOpportunityRk() {
    var B = opdBase();
    if (!B) return card('Opportunity', '<p class="note">Feed penjualan, kunjungan atau teritori belum dimuat.</p>');
    var sec = state.opdSec || 'visit';
    return opdSecNav() + (sec === 'sitev' ? opdSiteV(B) : (sec === 'sitega' ? opdSiteGa(B) : (sec === 'gasp' ? opdGaSp(B) : (sec === 'saldo' ? opdSaldo(B) : (sec === 'endbal' ? opdEndbal(B) : (sec === 'peta' ? opdMapSection(B) : opdVisit(B)))))));
  }

  /* ---- PRINT INSTRUCTIONS: one printable page per DSE with that DSE's opportunities ---- */
  var PS_N = 12, PS_MAX = 60;
  function psSheet(d, B, K, F, opt) {
    var mine = B.rows.filter(function (r) { return r.dseN === d.name; });
    var kr = K && K.dses.filter(function (r) { return dseNorm(r.n) === d.name && (!d.mc || r.mc === d.mc); })[0], sc = kr ? dkScore(kr, K, opt) : null;
    var nvL = mine.filter(function (r) { return B.nv[r.k]; }); nvL.forEach(function (r) { r.prio = r.sepT > 0 && (r.dem > 0 || r.av > 0) ? 'A' : (r.sepT > 0 ? 'B' : 'C'); });
    nvL.sort(function (a, b) { return (a.prio < b.prio ? -1 : (a.prio > b.prio ? 1 : 0)) || b.sepT - a.sepT; });
    var siteMine = B.sites.filter(function (s) { return s.dseN === d.name; });
    var siteV = siteMine.filter(function (s) { return B.nvSites[s.key]; }).sort(function (a, b) { return b.sepT - a.sepT; });
    var siteG = B.hasGa ? siteMine.filter(function (s) { return s.ga <= 0; }).sort(function (a, b) { return b.sepSP - a.sepSP; }) : [];
    var gasp = B.hasGa ? mine.filter(function (r) { return r.ga <= 0 && r.mtdSP <= 0 && r.sepSPq > 0; }).sort(function (a, b) { return b.sepSPq - a.sepSPq; }) : [];
    var sal = mine.filter(function (r) { return r.mtdSAL <= 0 && (r.dem > 0 || r.av > 0); }).sort(function (a, b) { return b.sepSAL - a.sepSAL || b.dem - a.dem; });
    var box = '<span style="display:inline-block; width:14px; height:14px; border:1.5px solid #111; vertical-align:middle;"></span>';
    var tbl = function (title, count, headCols, rows) { return '<h3 style="font:800 14px var(--ij-font); text-transform:uppercase; margin:14px 0 4px;">' + title + ' <span style="font-weight:500; text-transform:none;">· ' + fmtCount(count) + ' di cakupan, ' + Math.min(count, PS_N) + ' teratas</span></h3><table class="tbl" data-nosort="1" style="font-size:12.5px;"><thead><tr><th style="width:28px;"></th>' + headCols.map(function (h) { return '<th' + (h[1] ? ' class="num"' : '') + '>' + h[0] + '</th>'; }).join('') + '<th>Catatan</th></tr></thead><tbody>' + (rows.length ? rows.slice(0, PS_N).map(function (cells) { return '<tr><td>' + box + '</td>' + cells.map(function (c) { return '<td' + (c[1] ? ' class="num"' : '') + '>' + c[0] + '</td>'; }).join('') + '<td style="min-width:110px;"></td></tr>'; }).join('') : '<tr><td colspan="' + (headCols.length + 2) + '" class="note">Tidak ada.</td></tr>') + '</tbody></table>'; };
    var o = function (r) { return ['<b>' + esc(r.n) + '</b><br><span class="note">' + esc(r.id) + ' · ' + esc(r.site || '—') + '</span>']; };
    var head = '<div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #111; padding-bottom:6px;"><div><div style="font:800 11px var(--ij-font); letter-spacing:.1em; text-transform:uppercase;">Instruksi kunjungan DSE · Inner Jakarta</div><div style="font:800 22px var(--ij-font);">' + esc(d.label) + ' <span style="font-weight:600; font-size:15px;">' + esc(d.code) + '</span></div><div class="note">' + esc(d.mc) + ' · ' + esc(d.br) + ' · DSO ' + esc((mine[0] || {}).dso || '—') + ' · HoA ' + esc(d.hoa) + '</div></div><div style="text-align:right;" class="note">Data s.d. ' + B.cutDay + ' Okt 2026<br>Dicetak ' + new Date().toLocaleDateString('id-ID') + '</div></div>';
    var strip = '<div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-top:8px; font-size:13px;"><div><span class="note">Outlet binaan</span><br><b>' + fmtCount(mine.length) + '</b></div><div><span class="note">Belum divisit MTD</span><br><b>' + fmtCount(nvL.length) + '</b> (' + pctOf(nvL.length, mine.length) + '%)</div>' +
      '<div><span class="note">SP Sell-In MTD</span><br><b>' + (sc ? fmtCount(sc.sp) + ' pcs' : '—') + '</b>' + (sc && sc.spAch != null ? ' · ' + (sc.spAch * 100).toFixed(0) + '% target' : '') + '</div><div><span class="note">OSA MTD</span><br><b>' + (sc ? pjRp(sc.osaAmt) : '—') + '</b>' + (sc && sc.osaAch != null ? ' · ' + (sc.osaAch * 100).toFixed(0) + '% target' : '') + '</div></div>';
    var s1 = tbl('A · Kunjungi: outlet belum pernah divisit MTD', nvL.length, [['Outlet'], ['Order Sep', 1], ['Demand MTD', 1], ['Prio']], nvL.map(function (r) { return [o(r)[0] ? o(r) : o(r), [pjRp(r.sepT), 1], [r.dem ? pjRp(r.dem) : '·', 1], [r.prio]]; }));
    var s2 = tbl('B · Site belum pernah divisit MTD', siteV.length, [['Site'], ['Outlet', 1], ['Order Sep', 1]], siteV.map(function (s) { return [['<b>' + esc(s.site) + '</b><br><span class="note">' + esc(s.kec) + '</span>'], [fmtCount(s.n), 1], [pjRp(s.sepT), 1]]; }));
    var s3 = tbl('C · Aktivasi SP: site tanpa GA dan outlet tanpa GA / SP Sell-In', siteG.length + gasp.length, [['Site / outlet'], ['SP Sep (pcs)', 1], ['Catatan data']], siteG.slice(0, 5).map(function (s) { return [['<b>Site ' + esc(s.site) + '</b><br><span class="note">' + fmtCount(s.n) + ' outlet, tanpa satu pun GA</span>'], [s.sepSP ? pjRp(s.sepSP) : '·', 1], ['site']]; }).concat(gasp.slice(0, 7).map(function (r) { return [o(r), [fmtCount(r.sepSPq), 1], ['tanpa GA, tanpa SP']]; })));
    var s4 = tbl('D · Isi saldo: tanpa Saldo Sell-In MTD tetapi ada demand', sal.length, [['Outlet'], ['Saldo Sep', 1], ['Demand MTD', 1], ['Stok', 1]], sal.map(function (r) { return [o(r), [r.sepSAL ? pjRp(r.sepSAL) : '·', 1], [r.dem ? pjRp(r.dem) : '·', 1], [opdBal(r) == null ? '—' : pjRp(opdBal(r)), 1]]; }));
    var ebL = mine.filter(function (r) { return opdEbKind(r) !== 'ok'; }).sort(function (a, b) { return (b.dem + b.av) - (a.dem + a.av) || b.sepSAL - a.sepSAL; });
    var ebS = siteMine.map(function (s) { var rs = mine.filter(function (r) { return r.site === s.site && r.mc === s.mc; }), bad = rs.filter(function (r) { return opdEbKind(r) !== 'ok'; }).length; return { s: s, n: rs.length, bad: bad }; }).filter(function (x) { return x.n && x.bad / x.n > 0.5; }).sort(function (a, b) { return b.bad - a.bad; });
    var s5 = tbl('E · ENDBAL nol / rendah (&lt; Rp 100 Rb) dan site dengan &gt; 50% outlet rendah', ebL.length + ebS.length, [['Outlet / site'], ['Stok kini', 1], ['Demand MTD', 1], ['Status']], ebS.slice(0, 4).map(function (x) { return [['<b>Site ' + esc(x.s.site) + '</b><br><span class="note">' + fmtCount(x.bad) + ' dari ' + fmtCount(x.n) + ' outlet rendah / nol</span>'], ['·', 1], ['·', 1], ['site']]; }).concat(ebL.slice(0, 8).map(function (r) { return [o(r), [opdBal(r) == null ? '—' : pjRp(opdBal(r)), 1], [r.dem ? pjRp(r.dem) : '·', 1], [opdEbKind(r) === 'none' ? 'nol' : 'rendah']]; })));
    var foot = '<div style="margin-top:16px; display:grid; grid-template-columns: 1fr 1fr; gap:20px; font-size:12px;"><div style="border-top:1.5px solid #111; padding-top:4px;">Tanda tangan DSE</div><div style="border-top:1.5px solid #111; padding-top:4px;">Disetujui DSO</div></div>';
    return '<section class="ps-page" style="background:#fff; border:2px solid var(--ij-ink); padding:16px 18px; margin-top:12px;">' + head + strip + s1 + s2 + s3 + s4 + s5 + foot + '</section>';
  }
  function viewPrintOpp() {
    var B = opdBase(), K = dkFeed(); if (!B) return card('Print Instructions', '<p class="note">Feed penjualan, kunjungan atau teritori belum dimuat.</p>');
    var scope = dseDir().filter(dseInHeaderScope).filter(function (d) { return !state.dse || d.name === state.dse; });
    var withOut = scope.filter(function (d) { return B.rows.some(function (r) { return r.dseN === d.name; }); });
    var intro = '<div class="no-print">' + card('Print Instructions · lembar instruksi kunjungan per DSE',
      '<p class="note">Satu halaman per DSE berisi: outlet belum divisit, site belum divisit, aktivasi SP (site tanpa GA, outlet tanpa GA / SP Sell-In), dan outlet yang perlu isi saldo. Pilih Branch, Micro Cluster atau satu DSE di header, lalu cetak. Lembar memakai ' + PS_N + ' baris teratas per bagian; daftar lengkap ada di tab Opportunity.</p>' +
      '<div class="map-toolbar"><div class="map-toolbar-group"><button type="button" class="btn" data-act="print-ps" style="padding:8px 16px; font-weight:800;">🖨️ Cetak ' + fmtCount(Math.min(withOut.length, PS_MAX)) + ' lembar</button><span class="note">' + fmtCount(withOut.length) + ' DSE di lingkup' + (withOut.length > PS_MAX ? ' · dibatasi ' + PS_MAX + ' lembar, persempit ke satu MC atau satu DSE' : '') + '</span></div></div>') + '</div>';
    if (!withOut.length) return intro + card('Tidak ada DSE', '<p class="note">Tidak ada DSE dengan outlet binaan pada filter ini.</p>');
    var opt = dkOpt(), F = null;
    return intro + withOut.slice(0, PS_MAX).map(function (d) { return psSheet(d, B, K, F, opt); }).join('');
  }
  /* ---- PRINT INSTRUCTIONS: dokumen 2 dan 3 (populasi outlet; PJP harian fokus) ---- */
  var PR_POP_MAX = 2500, PR_PJP_MAX = 60;
  var PR_DOCS = [['opp', '🎯 Instruksi Opportunity per DSE'], ['pop', '📋 All Population Outlet'], ['pjp', '🗓️ Focus Daily · PJP']];
  /* join per master outlet: Sell-In September penuh / LMTD / MTD (SALMO, SP), demand MTD, GA. Gap = Last FM − MTD (positif = masih kurang dari bulan lalu). */
  function prEnrich(B) {
    if (B._pr) return B;
    var pj = {}; B.P.outlets.forEach(function (o) { if (o.tier === 'M') pj[o.k] = o; });
    var dd = {}; if (B.D) B.D.outlets.forEach(function (o) { var d = 0; Object.keys(o.c || {}).forEach(function (c) { if (c !== 'SPI' && o.c[c][3] > d) d = o.c[c][3]; }); dd[o.k] = d; });
    var ds = {}; if (B.D) B.D.outlets.forEach(function (o) { if (o.c && o.c.SAL) ds[o.k] = o.c.SAL[1]; });
    B.rows.forEach(function (r) {
      var c = (pj[r.k] || {}).c || {}, sp = c.SP || [], sa = c.SALMO || [];
      r.demSal = ds[r.k] || 0;
      r.fmSAL = r.sepSAL; r.lmSAL = sa[3] || 0; r.mtSAL = sa[1] || 0;
      r.fmSP = r.sepSPq; r.lmSP = sp[2] || 0; r.mtSP = sp[0] || 0;
      r.demD = dd[r.k] || 0;
      r.bs = (pj[r.k] || {}).bs || {};          // per brand (IM3 / 3ID): {SALMO|SP: [mq, mv, lq, lv, fq, fv]}
      r.gapSAL = r.fmSAL - r.mtSAL; r.gapSP = r.fmSP - r.mtSP;
    });
    B._pr = true; return B;
  }
  /* Saldo and SP in the print sheets are IM3 + 3ID combined for the outlet (hybrid outlets sum both ids).
     The small lines under each figure split it by brand: IM3 yellow dot, 3ID magenta dot; the tosca dot (IOH) marks an outlet that has both. */
  var PR_BI = { SAL: ['SALMO', { fm: 5, lm: 3, mt: 1 }, true], SP: ['SP', { fm: 4, lm: 2, mt: 0 }, false] };
  function prBrTd(r, cat, w) {
    var d = PR_BI[cat], money = d[2], tot = r[w + cat], bs = r.bs || {}, im = ((bs.IM3 || {})[d[0]] || [])[d[1][w]] || 0, id = ((bs['3ID'] || {})[d[0]] || [])[d[1][w]] || 0;
    var f = function (v) { return money ? prMoney(v) : prNum(v); }, both = im > 0 && id > 0;
    var line = function (cls, lbl, v) { return v > 0 ? '<div style="font-size:9.5px; line-height:1.25; font-weight:600;"><i class="br-dot ' + cls + '"></i>' + lbl + ' ' + (money ? pjRp(v) : fmtCount(v)) + '</div>' : ''; };
    return '<td class="num">' + (both ? '<i class="br-dot ioh" title="IOH: IM3 + 3ID"></i>' : '') + f(tot) + line('im3', 'IM3', im) + line('id3', '3ID', id) + '</td>';
  }
  function prGap(v, money) { if (v > 0) return '<b>' + (money ? pjRp(v) : fmtCount(v)) + '</b>'; return '<span class="note">✓ ' + (v < 0 ? '+' + (money ? pjRp(-v) : fmtCount(-v)) : '0') + '</span>'; }
  function prMoney(v) { return v ? pjRp(v) : '·'; }
  function prNum(v) { return v ? fmtCount(v) : '·'; }
  function prDocBar(doc, extra) {
    return '<div class="no-print">' + card('Print Instructions · pilih dokumen',
      '<div class="map-toolbar"><div class="map-toolbar-group"><span class="map-label">Dokumen:</span>' + PR_DOCS.map(function (d) { return '<button type="button" class="map-btn' + (doc === d[0] ? ' active' : '') + '" data-pr-doc="' + d[0] + '">' + d[1] + '</button>'; }).join('') + '</div></div>' + (extra || '')) + '</div>';
  }
  function prHead(title, sub, B, noLmtd) {
    return '<div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #111; padding-bottom:6px;"><div><div style="font:800 11px var(--ij-font); letter-spacing:.1em; text-transform:uppercase;">Inner Jakarta · Supply &amp; Demand Monitoring</div><div style="font:800 21px var(--ij-font);">' + title + '</div><div style="font-size:12.5px;">' + sub + '</div></div>' +
      '<div style="text-align:right; font-size:12px;">Sell-In cut ' + B.cutDay + ' Okt 2026 · Last FM = September penuh (1–' + B.sepDays + ' Sep)<br>' + (noLmtd ? '' : 'LMTD = 1–' + B.cutDay + ' Sep · ') + 'MTD = 1–' + B.cutDay + ' Okt</div></div>';
  }
  var PR_NOTE = '<p class="note" style="margin-top:6px;">SALMO dan SP = IM3 + 3ID digabung per outlet (outlet hybrid menjumlahkan kedua ID); baris kecil di bawah angka memisahkan IM3 (titik kuning) dan 3ID (titik magenta), titik tosca = IOH (outlet punya kedua brand). Gap = Last FM − MTD: yang masih harus dikejar untuk menyamai September penuh; ✓ = sudah melewati bulan lalu. Trade Demand = nilai transaksi outlet ke pelanggan (MOBO: Reload + Voucher Injection + CVM + Paket Data) sampai cut Okt; file MOBO tidak memuat bulan lalu, jadi demand bulan lalu belum tersedia. SALMO = Saldo Mobo transfer ke outlet (Rp); SP = Starter Pack Sell-In (pcs).</p>';

  function prPopulation(B) {
    prEnrich(B);
    var all = B.rows.filter(opdIn).sort(function (a, b) { return (a.br < b.br ? -1 : a.br > b.br ? 1 : 0) || (a.mc < b.mc ? -1 : a.mc > b.mc ? 1 : 0) || (a.dse < b.dse ? -1 : a.dse > b.dse ? 1 : 0) || (a.n < b.n ? -1 : 1); });
    var list = all.slice(0, PR_POP_MAX), tot = { fmS: 0, lmS: 0, mtS: 0, dem: 0, demSal: 0, fmP: 0, lmP: 0, mtP: 0 };
    var body = '', mc = null, sub = null;
    function flush() { if (!sub) return; body += '<tr style="background:#eee; font-weight:800;"><td colspan="5">Subtotal ' + esc(sub.mc) + ' · ' + fmtCount(sub.n) + ' outlet</td><td class="num">' + pjRp(sub.fmS) + '</td><td class="num">' + pjRp(sub.lmS) + '</td><td class="num">' + pjRp(sub.mtS) + '</td><td class="num">' + prGap(sub.fmS - sub.mtS, true) + '</td><td class="num">' + pjRp(sub.dem) + '</td><td class="num">' + pjRp(sub.demSal) + '</td><td class="num">' + fmtCount(sub.fmP) + '</td><td class="num">' + fmtCount(sub.lmP) + '</td><td class="num">' + fmtCount(sub.mtP) + '</td><td class="num">' + prGap(sub.fmP - sub.mtP) + '</td></tr>'; }
    list.forEach(function (r) {
      if (r.mc !== mc) { flush(); mc = r.mc; sub = { mc: r.mc, n: 0, fmS: 0, lmS: 0, mtS: 0, dem: 0, demSal: 0, fmP: 0, lmP: 0, mtP: 0 }; body += '<tr style="background:#111; color:#fff; font-weight:800;"><td colspan="15">' + esc(r.br) + ' › ' + esc(r.mc) + ' · DSO ' + esc(r.dso || '—') + '</td></tr>'; }
      sub.n++; sub.fmS += r.fmSAL; sub.lmS += r.lmSAL; sub.mtS += r.mtSAL; sub.dem += r.dem; sub.demSal += r.demSal; sub.fmP += r.fmSP; sub.lmP += r.lmSP; sub.mtP += r.mtSP;
      tot.fmS += r.fmSAL; tot.lmS += r.lmSAL; tot.mtS += r.mtSAL; tot.dem += r.dem; tot.demSal += r.demSal; tot.fmP += r.fmSP; tot.lmP += r.lmSP; tot.mtP += r.mtSP;
      body += '<tr><td class="cur"><b>' + esc(r.n) + '</b></td><td><code>' + esc(r.id) + '</code></td><td class="num">' + (r.lat ? Number(r.lat).toFixed(5) : '—') + '</td><td class="num">' + (r.lon ? Number(r.lon).toFixed(5) : '—') + '</td><td>' + esc(r.dse) + '</td>' +
        prBrTd(r, 'SAL', 'fm') + prBrTd(r, 'SAL', 'lm') + prBrTd(r, 'SAL', 'mt') + '<td class="num">' + (r.fmSAL || r.mtSAL ? prGap(r.gapSAL, true) : '·') + '</td><td class="num">' + prMoney(r.dem) + '</td>' +
        prBrTd(r, 'SP', 'fm') + prBrTd(r, 'SP', 'lm') + prBrTd(r, 'SP', 'mt') + '<td class="num">' + (r.fmSP || r.mtSP ? prGap(r.gapSP) : '·') + '</td></tr>';
    });
    flush();
    var foot = '<tr style="background:#111; color:#fff; font-weight:800;"><td colspan="5">TOTAL ' + fmtCount(list.length) + ' outlet</td><td class="num">' + pjRp(tot.fmS) + '</td><td class="num">' + pjRp(tot.lmS) + '</td><td class="num">' + pjRp(tot.mtS) + '</td><td class="num">' + pjRp(Math.max(0, tot.fmS - tot.mtS)) + '</td><td class="num">' + pjRp(tot.dem) + '</td><td class="num">' + pjRp(tot.demSal) + '</td><td class="num">' + fmtCount(tot.fmP) + '</td><td class="num">' + fmtCount(tot.lmP) + '</td><td class="num">' + fmtCount(tot.mtP) + '</td><td class="num">' + fmtCount(Math.max(0, tot.fmP - tot.mtP)) + '</td></tr>';
    var bar = '<div class="map-toolbar"><div class="map-toolbar-group"><button type="button" class="btn" data-act="print-ps" style="padding:8px 16px; font-weight:800;">🖨️ Cetak populasi outlet</button><button type="button" class="btn" data-act="pr-csv" style="padding:8px 16px;">⬇️ Unduh CSV (' + fmtCount(all.length) + ' outlet)</button>' +
      '<span class="note">' + fmtCount(all.length) + ' outlet master di lingkup (' + esc(scopeText()) + ')' + (all.length > PR_POP_MAX ? ' · lembar cetak dibatasi ' + fmtCount(PR_POP_MAX) + ' baris, persempit ke Area / MC; CSV memuat semuanya' : '') + '</span></div></div>';
    var sheet = '<style>@page { size: A4 landscape; margin: 8mm; } .ps-page td.num { white-space: nowrap; } .ps-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }</style><section class="ps-page" style="background:#fff; border:2px solid var(--ij-ink); padding:14px 16px; margin-top:12px;">' + prHead('All Population Outlet', esc(scopeText()) + ' · ' + fmtCount(all.length) + ' outlet master', B) +
      '<table class="tbl" data-nosort="1" style="font-size:11px; margin-top:8px;"><thead><tr><th rowspan="2">Outlet</th><th rowspan="2">Outlet ID</th><th class="num" rowspan="2">Lat</th><th class="num" rowspan="2">Long</th><th rowspan="2">DSE</th><th class="num" colspan="4" style="text-align:center;">SALMO</th><th class="num" rowspan="2">Trade Demand<br>MTD</th><th class="num" rowspan="2">Demand SALMO<br>MTD</th><th class="num" colspan="4" style="text-align:center;">SP Sell-In (pcs)</th></tr>' +
      '<tr><th class="num">Last FM</th><th class="num">LMTD</th><th class="num">MTD</th><th class="num">Gap to FM</th><th class="num">Last FM</th><th class="num">LMTD</th><th class="num">MTD</th><th class="num">Gap to FM</th></tr></thead><tbody>' + (body || '<tr><td colspan="15" class="note">Tidak ada outlet pada filter ini.</td></tr>') + foot + '</tbody></table>' + PR_NOTE + '</section>';
    return bar + sheet;
  }
  function prCsv(B) {
    prEnrich(B);
    function q(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var lines = [['Area', 'MC', 'DSO', 'DSE', 'Site', 'Outlet ID', 'Outlet Name', 'Lat', 'Long', 'SALMO Last FM', 'SALMO LMTD', 'SALMO MTD', 'SALMO Gap to FM', 'Trade Demand MTD', 'Demand SALMO MTD', 'SP Last FM', 'SP LMTD', 'SP MTD', 'SP Gap to FM', 'SALMO Last FM IM3', 'SALMO LMTD IM3', 'SALMO MTD IM3', 'SALMO Last FM 3ID', 'SALMO LMTD 3ID', 'SALMO MTD 3ID', 'SP Last FM IM3', 'SP LMTD IM3', 'SP MTD IM3', 'SP Last FM 3ID', 'SP LMTD 3ID', 'SP MTD 3ID'].map(q).join(',')];
    var bv = function (r, br, cat, w) { var d = PR_BI[cat]; return (((r.bs || {})[br] || {})[d[0]] || [])[d[1][w]] || 0; };
    B.rows.filter(opdIn).forEach(function (r) { lines.push([r.br, r.mc, r.dso, r.dse, r.site, r.id, r.n, r.lat, r.lon, r.fmSAL, r.lmSAL, r.mtSAL, r.gapSAL, r.dem, r.demSal, r.fmSP, r.lmSP, r.mtSP, r.gapSP,
      bv(r, 'IM3', 'SAL', 'fm'), bv(r, 'IM3', 'SAL', 'lm'), bv(r, 'IM3', 'SAL', 'mt'), bv(r, '3ID', 'SAL', 'fm'), bv(r, '3ID', 'SAL', 'lm'), bv(r, '3ID', 'SAL', 'mt'),
      bv(r, 'IM3', 'SP', 'fm'), bv(r, 'IM3', 'SP', 'lm'), bv(r, 'IM3', 'SP', 'mt'), bv(r, '3ID', 'SP', 'fm'), bv(r, '3ID', 'SP', 'lm'), bv(r, '3ID', 'SP', 'mt')].map(q).join(',')); });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'all_population_outlet_' + (state.kec || state.branch || 'inner_jakarta').replace(/[^A-Za-z0-9]+/g, '_') + '.csv'; a.click();
  }
  var PR_DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], PR_DAYN = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  /* ---- flags dan skor prioritas per outlet (dipakai lembar Focus Daily · PJP) ---- */
  var PR_FLAG_DEF = { NV: ['NEVER VISITED MTD', 2, 1], GA: ['ZERO GA', 2, 1], ZS: ['ZERO SELLIN', 4, 1], SP: ['NO SP SELLIN', 3, 1], ZB: ['ZERO BALANCE', 3, 1], LS: ['LOW STOCK', 1, 0], NA: ['NO ENDBAL ACCT', 1, 0] };
  function prFlags(r, B) {
    var f = [];
    if (!r) return { f: f, score: 0, tier: '' };
    if (B.nv[r.k]) f.push('NV');
    if (B.hasGa && r.ga <= 0) f.push('GA');
    if (r.mtdT <= 0) f.push('ZS'); else if (r.mtSP <= 0) f.push('SP');
    if (B.hasEb) { if (!r.hasEb) f.push('NA'); else { var b = opdBal(r); if (b != null && b <= 0) f.push('ZB'); else if (b != null && b < OPD_LOW) f.push('LS'); } }
    var sc = f.reduce(function (a, k) { return a + PR_FLAG_DEF[k][1]; }, 0);
    return { f: f, score: sc, tier: sc >= 5 ? 'H' : (sc >= 3 ? 'M' : 'L') };
  }
  function prChips(fl) {
    return fl.f.map(function (k) { var d = PR_FLAG_DEF[k]; return '<span style="display:inline-block; margin:1px 2px 1px 0; padding:0 4px; font:800 9.5px var(--ij-font); border:1.5px solid #111; white-space:nowrap; ' + (d[2] ? 'background:#111; color:#fff;' : '') + '">' + d[0] + '</span>'; }).join('');
  }
  /* top 5 voucher per outlet: Sell-In Sep penuh (MOBII, Voucher isi) dan Voucher Injection Okt MTD (MOBO) */
  function prTopVc(r, B) {
    if (r._tv) return r._tv;
    var o = (B._pjByK || (B._pjByK = (function () { var m = {}; B.P.outlets.forEach(function (x) { if (x.tier === 'M') m[x.k] = x; }); return m; })()))[r.k], si = [], mo = [];
    if (o && o.p) Object.keys(o.p).forEach(function (i) { var pr = B.P.products[+i], x = o.p[i]; if (pr && pr.cat === 'VCF' && x[4] > 0) si.push([pr.n, x[4]]); });
    var d = B.D && (B._dmByK || (B._dmByK = (function () { var m = {}; B.D.outlets.forEach(function (x) { m[x.k] = x; }); return m; })()))[r.k];
    if (d && d.p) Object.keys(d.p).forEach(function (i) { var pr = B.D.products[+i], x = d.p[i]; if (pr && pr.cat === 'VCI' && x[0] > 0) mo.push([pr.n, x[0]]); });
    var top = function (a) { return a.sort(function (p, q) { return q[1] - p[1]; }).slice(0, 5); };
    return (r._tv = { si: top(si), mo: top(mo) });
  }
  function prVcCell(r, B) {
    var t = prTopVc(r, B), line = function (lbl, a) { return '<div style="font-size:9.5px; line-height:1.25;"><b>' + lbl + '</b> ' + (a.length ? a.map(function (x) { return esc(x[0].replace(/ JAYA VORI| JAYA VOU| NEW GEO JAKARTA RAYA/gi, '').slice(0, 24)) + ' <b>' + fmtCount(x[1]) + '</b>'; }).join(' · ') : '<span class="note">tidak ada</span>') + '</div>'; };
    return '<td style="min-width:190px; max-width:240px; white-space:normal;">' + line('SI Sep', t.si) + line('INJ Okt', t.mo) + '</td>';
  }
  function prPjpSheet(g, B, iso, dow) {
    var pv = state.prMode !== 'print';
    var wk = [0, 0, 0, 0, 0, 0], fm = {};
    g.all.forEach(function (o) { for (var i = 0; i < 6; i++) if (o.w.charAt(i) === '1') wk[i]++; fm['F' + o.f] = (fm['F' + o.f] || 0) + 1; });
    var perm = '<table class="tbl" data-nosort="1" style="font-size:12px; width:auto; margin-top:6px;"><thead><tr><th>PJP permanen (template mingguan)</th>' + PR_DAYS.map(function (d, i) { return '<th class="num"' + (i === dow ? ' style="background:#111; color:#fff;"' : '') + '>' + d + '</th>'; }).join('') + '<th class="num">Outlet</th><th>Frekuensi</th></tr></thead><tbody><tr><td>Outlet dijadwalkan per hari</td>' +
      wk.map(function (v, i) { return '<td class="num"' + (i === dow ? ' style="background:#eee; font-weight:800;"' : '') + '>' + fmtCount(v) + '</td>'; }).join('') + '<td class="num"><b>' + fmtCount(g.all.length) + '</b></td><td>' + Object.keys(fm).sort().map(function (k) { return k + ' ' + fmtCount(fm[k]); }).join(' · ') + '</td></tr></tbody></table>';
    var byVal = function (a, b) { return (b.r.fmSAL + b.r.fmSP * 1000) - (a.r.fmSAL + a.r.fmSP * 1000); };
    var rows = g.day.map(function (o) { var r = B.byK[o.k]; return { o: o, r: r, fl: prFlags(r, B) }; }).sort(function (a, b) { return (b.r ? b.r.fmSAL + b.r.fmSP * 1000 : -1) - (a.r ? a.r.fmSAL + a.r.fmSP * 1000 : -1); });
    var ranked = rows.filter(function (x) { return x.r && x.fl.score >= 3; }).sort(function (a, b) { return b.fl.score - a.fl.score || byVal(a, b); });
    ranked.forEach(function (x, i) { x.rank = i + 1; });
    var nH = ranked.filter(function (x) { return x.fl.tier === 'H'; }).length;

    /* ---- tabel utama ---- */
    var t = { fmS: 0, lmS: 0, mtS: 0, fmP: 0, lmP: 0, mtP: 0, dem: 0, gaL: 0, gaM: 0 };
    var nData = pv ? 11 : 8;       // kolom data antara PJP dan Top 5 voucher
    var body = rows.map(function (x, i) {
      var o = x.o, r = x.r, days = PR_DAYS.filter(function (d, k) { return o.w.charAt(k) === '1'; }).join('·');
      if (r) { t.fmS += r.fmSAL; t.lmS += r.lmSAL; t.mtS += r.mtSAL; t.fmP += r.fmSP; t.lmP += r.lmSP; t.mtP += r.mtSP; t.dem += r.dem; t.gaL += r.gaP || 0; t.gaM += r.ga || 0; }
      var head = '<td class="num">' + (i + 1) + (x.rank ? '<br><b style="font-size:10px;">' + x.fl.tier + x.rank + '</b>' : '') + '</td><td class="cur"><b>' + esc(o.n || '(tanpa nama)') + '</b></td><td>' + (o.i && o.j ? '<i class="br-dot ioh" title="IOH: IM3 + 3ID"></i>' : '') + (o.i ? '<i class="br-dot im3"></i>' : '') + '<code>' + esc(o.i || '—') + '</code>' + (o.j ? '<br><i class="br-dot id3"></i><code>' + esc(o.j) + '</code>' : '') + '</td><td>F' + o.f + '<br><span class="note">' + days + '</span></td>';
      var tail = '<td style="min-width:110px; white-space:normal;">' + prChips(x.fl) + '</td><td style="width:22px;"><span style="display:inline-block; width:14px; height:14px; border:1.5px solid #111;"></span></td><td style="min-width:60px;"></td></tr>';
      if (!r) return '<tr>' + head + '<td colspan="' + (nData + 1) + '" class="note">Outlet belum ada di master: data Sell-In / demand tidak tersedia</td>' + tail;
      return '<tr>' + head + prBrTd(r, 'SAL', 'fm') + prBrTd(r, 'SP', 'fm') + '<td class="num">' + prMoney(r.dem) + (r.demD ? '<br><span class="note">' + r.demD + ' hr aktif</span>' : '') + (r.demSal ? '<br><span class="note">SALMO ' + pjRp(r.demSal) + '</span>' : '') + '</td>' +
        (pv ? prBrTd(r, 'SAL', 'lm') : '') + prBrTd(r, 'SAL', 'mt') + '<td class="num">' + (r.fmSAL || r.mtSAL ? prGap(r.gapSAL, true) : '·') + '</td>' +
        (pv ? prBrTd(r, 'SP', 'lm') : '') + prBrTd(r, 'SP', 'mt') + '<td class="num">' + (r.fmSP || r.mtSP ? prGap(r.gapSP) : '·') + '</td>' +
        (pv ? '<td class="num">' + prNum(r.gaP) + '</td>' : '') + '<td class="num">' + prNum(r.ga) + '</td>' + prVcCell(r, B) + tail;
    }).join('');
    var foot = '<tr style="background:#eee; font-weight:800;"><td></td><td colspan="3">TOTAL ' + fmtCount(rows.length) + ' outlet</td><td class="num">' + pjRp(t.fmS) + '</td><td class="num">' + fmtCount(t.fmP) + '</td><td class="num">' + pjRp(t.dem) + '</td>' +
      (pv ? '<td class="num">' + pjRp(t.lmS) + '</td>' : '') + '<td class="num">' + pjRp(t.mtS) + '</td><td class="num">' + prGap(t.fmS - t.mtS, true) + '</td>' + (pv ? '<td class="num">' + fmtCount(t.lmP) + '</td>' : '') + '<td class="num">' + fmtCount(t.mtP) + '</td><td class="num">' + prGap(t.fmP - t.mtP) + '</td>' +
      (pv ? '<td class="num">' + fmtCount(t.gaL) + '</td>' : '') + '<td class="num">' + fmtCount(t.gaM) + '</td><td colspan="4"></td></tr>';
    var th2 = function (s) { return '<th class="num">' + s + '</th>'; };
    var main = '<table class="tbl" data-nosort="1" style="font-size:' + (pv ? '11' : '11.5') + 'px; margin-top:8px;"><thead><tr><th rowspan="2">#</th><th rowspan="2">Outlet</th><th rowspan="2">Outlet ID<br>IM3 · 3ID</th><th rowspan="2">PJP</th><th class="num" colspan="3" style="text-align:center;">Last FM (September)</th><th class="num" colspan="' + (pv ? 3 : 2) + '" style="text-align:center;">SALMO</th><th class="num" colspan="' + (pv ? 3 : 2) + '" style="text-align:center;">SP Sell-In (pcs)</th><th class="num" colspan="' + (pv ? 2 : 1) + '" style="text-align:center;">GA (pcs)</th><th rowspan="2">Top 5 voucher<br><span style="font-weight:500;">SI Sep = Sell-In MOBII · INJ Okt = Voucher Injection MOBO</span></th><th rowspan="2">Flags</th><th rowspan="2">✓</th><th rowspan="2">Catatan</th></tr>' +
      '<tr>' + th2('SALMO') + th2('SP') + th2('Demand MTD') + (pv ? th2('LMTD') : '') + th2('MTD') + th2('Gap FM') + (pv ? th2('LMTD') : '') + th2('MTD') + th2('Gap FM') + (pv ? th2('LMTD') : '') + th2('MTD') + '</tr></thead><tbody>' +
      (body || '<tr><td colspan="' + (nData + 8) + '" class="note">Tidak ada outlet dijadwalkan.</td></tr>') + foot + '</tbody></table>';

    /* ---- bagian bawah: prioritas dan daftar per DSE ---- */
    var all = g.all.map(function (o) { var r = B.byK[o.k]; return { o: o, r: r, fl: prFlags(r, B) }; }).filter(function (x) { return x.r; });
    function nm(x) { return esc(x.o.n || x.o.i || '—') + ' <span class="note">(' + PR_DAYS.filter(function (d, k) { return x.o.w.charAt(k) === '1'; }).join('·') + ')</span>'; }
    function listBox(title, items, hint) {
      var cap = 14;
      return '<div style="border:1.5px solid #111; padding:6px 8px; break-inside:avoid;"><div style="font:800 11.5px var(--ij-font); text-transform:uppercase;">' + title + ' · ' + fmtCount(items.length) + ' <span style="font-weight:500; text-transform:none;">dari ' + fmtCount(all.length) + ' outlet PJP</span></div>' +
        (items.length ? '<ol style="margin:4px 0 0 18px; padding:0; font-size:11px; columns:2; column-gap:14px;">' + items.slice(0, cap).map(function (x) { return '<li style="break-inside:avoid;">' + nm(x) + '</li>'; }).join('') + '</ol>' + (items.length > cap ? '<div class="note" style="font-size:10.5px;">+ ' + fmtCount(items.length - cap) + ' outlet lain (lihat tab Opportunity atau unduh CSV)</div>' : '') : '<div class="note" style="font-size:11px;">Tidak ada. ' + (hint || '') + '</div>') + '</div>';
    }
    var lNoSell = all.filter(function (x) { return x.fl.f.indexOf('ZS') >= 0 || x.fl.f.indexOf('SP') >= 0; }).sort(function (a, b) { return (b.fl.f.indexOf('ZS') >= 0) - (a.fl.f.indexOf('ZS') >= 0) || byVal(a, b); });
    var lNoGa = B.hasGa ? all.filter(function (x) { return x.fl.f.indexOf('GA') >= 0; }).sort(byVal) : [];
    var lZb = all.filter(function (x) { return x.fl.f.indexOf('ZB') >= 0; }).sort(byVal);
    var prio = '<table class="tbl" data-nosort="1" style="font-size:11px; margin-top:12px; break-inside:avoid;"><thead><tr><th colspan="6" style="background:#111; color:#fff;">PRIORITAS HARI INI · outlet PJP ' + PR_DAYN[dow] + ' dengan skor flag ≥ 3 (' + fmtCount(nH) + ' High · skor ≥ 5), diurutkan skor lalu pembelian September</th></tr><tr><th class="num">Rank</th><th>Outlet</th><th>ID</th><th class="num">Skor</th><th>Flags</th><th class="num">Order Sep</th></tr></thead><tbody>' +
      (ranked.length ? ranked.slice(0, 10).map(function (x) { return '<tr><td class="num"><b>' + x.fl.tier + x.rank + '</b></td><td class="cur"><b>' + esc(x.o.n || '—') + '</b></td><td><code>' + esc(x.o.i || x.o.j || '—') + '</code></td><td class="num"><b>' + x.fl.score + '</b></td><td>' + prChips(x.fl) + '</td><td class="num">' + pjRp(x.r.fmSAL) + ' · ' + fmtCount(x.r.fmSP) + ' SP</td></tr>'; }).join('') : '<tr><td colspan="6" class="note">Tidak ada outlet berskor ≥ 3 hari ini.</td></tr>') + '</tbody></table>' +
      '<div class="note" style="font-size:10.5px;">Skor: ZERO SELLIN 4 (tanpa Sell-In apa pun MTD, termasuk SP) · NO SP SELLIN 3 · ZERO BALANCE 3 · NEVER VISITED MTD 2 · ZERO GA 2 · LOW STOCK (&lt; Rp 100 Rb) 1 · NO ENDBAL ACCT 1. High ≥ 5 (H), Medium 3–4 (M). Chip hitam = flag utama.</div>';
    var lists = '<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-top:8px;">' + listBox('Outlet tanpa Sell-In MTD', lNoSell, 'Semua outlet PJP sudah ada Sell-In.') + listBox('Outlet ZERO GA', lNoGa, B.hasGa ? 'Semua outlet PJP sudah ada GA.' : 'Feed GA belum dimuat.') + listBox('Outlet ZERO BALANCE', lZb, 'Tidak ada saldo nol.') + '</div>';
    return '<section class="ps-page" style="background:#fff; border:2px solid var(--ij-ink); padding:14px 16px; margin-top:12px;">' +
      prHead('PJP Harian · ' + esc(g.dse) + (g.code ? ' <span style="font-weight:600; font-size:14px;">' + esc(g.code) + '</span>' : ''), PR_DAYN[dow] + ' ' + esc(iso) + ' · ' + esc(g.mc) + ' · DSO ' + esc(g.dso) + ' · ' + fmtCount(rows.length) + ' outlet hari ini' + (function () { var cm = dseCoverMap(), h = cm && cm[String(g.dse || '').replace(/\.0$/, '').trim().toUpperCase()]; return h ? '<br><span style="text-transform:none; font-weight:400; font-size:11px;">' + esc(h.line) + '</span>' : ''; })(), B, !pv) + perm + main + prio + lists +
      '<div style="margin-top:12px; display:grid; grid-template-columns: 1fr 1fr; gap:20px; font-size:12px;"><div style="border-top:1.5px solid #111; padding-top:4px;">Tanda tangan DSE</div><div style="border-top:1.5px solid #111; padding-top:4px;">Disetujui DSO</div></div></section>';
  }
  function prPjp(B) {
    prEnrich(B);
    var P = pmPrep();
    if (!P) return card('Focus Daily · PJP', '<p class="note">Feed PJP Mapping belum dibangun. Taruh <code>Weekly_PJP_*_ALL_MC.xlsx</code> di <code>raw/PJP Weekly/</code> lalu jalankan <code>python3 scripts/build_pjp_mapping_feed.py</code>.</p>');
    var iso = state.prDate || state.pmDate || '2026-10-15', dow = pmDow(iso);
    var picker = '<div class="map-toolbar" style="margin-top:10px;"><div class="map-toolbar-group"><span class="map-label">Mode:</span>' + [['preview', '👁️ PREVIEW (lengkap + LMTD)'], ['print', '🖨️ PRINT (MTD + Gap vs Last FM)']].map(function (m) { return '<button type="button" class="map-btn' + ((state.prMode || 'preview') === m[0] ? ' active' : '') + '" data-pr-mode="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div><div class="map-toolbar-group"><span class="map-label">Tanggal PJP:</span><input type="date" id="prDateInput" value="' + esc(iso) + '" class="map-select" aria-label="Tanggal PJP"></div><span class="note">Teritori / DSE mengikuti filter Branch · HoA · MC · DSE di header (' + esc(scopeText()) + ')</span></div>';
    if (dow < 0 || dow > 5) return picker + card('Focus Daily · PJP', '<p class="note">' + (dow === 6 ? 'Hari Minggu tidak ada jadwal PJP dalam template (Senin sampai Sabtu).' : 'Pilih tanggal.') + '</p>');
    var list = P.rows.filter(pmIn), g = {};
    list.forEach(function (o) { var k = o.mc + '||' + (o.code || 'TANPA'); var x = g[k] || (g[k] = { mc: o.mc, br: o.br, dso: o.dso, dse: o.dse, code: o.code, all: [], day: [] }); x.all.push(o); if (o.w.charAt(dow) === '1') x.day.push(o); });
    var sheets = Object.keys(g).map(function (k) { return g[k]; }).filter(function (x) { return x.day.length; }).sort(function (a, b) { return (a.br < b.br ? -1 : a.br > b.br ? 1 : 0) || (a.mc < b.mc ? -1 : a.mc > b.mc ? 1 : 0) || (a.dse < b.dse ? -1 : 1); });
    var nOut = sheets.reduce(function (t, x) { return t + x.day.length; }, 0);
    var bar = '<div class="map-toolbar"><div class="map-toolbar-group"><button type="button" class="btn" data-act="print-ps" style="padding:8px 16px; font-weight:800;">🖨️ Cetak ' + fmtCount(Math.min(sheets.length, PR_PJP_MAX)) + ' lembar PJP</button><span class="note">' + fmtCount(sheets.length) + ' DSE · ' + fmtCount(nOut) + ' outlet dijadwalkan ' + PR_DAYN[dow] + ' ' + esc(iso) + (sheets.length > PR_PJP_MAX ? ' · dibatasi ' + PR_PJP_MAX + ' lembar, persempit ke satu MC atau satu DSE' : '') + '</span></div></div>';
    var note = '<p class="note no-print">Satu lembar per DSE: ringkasan PJP permanen (template mingguan, berulang tiap minggu) lalu daftar outlet untuk tanggal terpilih beserta SALMO dan SP bulan lalu, demand, LMTD, MTD, GA dan gap terhadap Last FM. Urutan outlet: pembelian September terbesar dulu. Template ini belum dicocokkan dengan beat plan MOBI (lihat docs/assessments/pjp_weekly_mapping.md).</p>';
    return '<div class="no-print">' + card('Focus Daily · Print PJP harian per DSE', picker + bar + note) + '</div><style>@page { size: A4 landscape; margin: 8mm; } .ps-page td.num { white-space: nowrap; } .ps-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }</style>' +
      (sheets.length ? sheets.slice(0, PR_PJP_MAX).map(function (x) { return prPjpSheet(x, B, iso, dow); }).join('') : card('Tidak ada PJP', '<p class="note">Tidak ada outlet dijadwalkan pada hari dan teritori ini.</p>'));
  }
  function viewPrintInstructions() {
    var B = opdBase(); if (!B) return card('Print Instructions', '<p class="note">Feed penjualan, kunjungan atau teritori belum dimuat.</p>');
    var doc = state.prDoc || 'opp';
    if (doc === 'pop') return prDocBar(doc) + prPopulation(B);
    if (doc === 'pjp') return prDocBar(doc) + prPjp(B);
    return prDocBar(doc) + viewPrintOpp();
  }
  var RK_GREEN = ['dse', 'pjp', 'jual', 'uar', 'endbal', 'grossadd', 'print'];   // tabs shown with a green box (owner, 15 Oct 2026)
  var RK_TABS = [['dse', '👷 DSE Productivity'], ['pjp', '🚶 Ringkasan PJP'], ['jual', '📦 Penjualan Outlet'], ['uar', '👥 UAR'], ['endbal', '🏦 ENDBAL Saldo'], ['demand', '🛒 Demand Customer'], ['opp', '🎯 Opportunity'], ['program', '🏅 Program'], ['grossadd', '🆕 Gross Add'], ['print', '🖨️ Print Instructions']];
  function viewMbRingkasan() {
    var vf = mbVisitsFeed(), sf = sellinFeed();
    var tab = state.rkTab || 'dse';
    if (tab === 'peta') { tab = state.rkTab = 'opp'; state.opdSec = 'peta'; }   // the Heat Map Teritori now lives inside Opportunity
    var nav = '<div class="sub-nav" role="tablist">' + RK_TABS.map(function (t) {
      return '<button type="button" role="tab" class="sub-nav-btn' + (RK_GREEN.indexOf(t[0]) >= 0 ? ' rk-green' : '') + (tab === t[0] ? ' active' : '') + '" data-rk-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    if (tab === 'dse') return nav + viewDseProductivity();
    if (tab === 'uar') return nav + viewUar();
    if (tab === 'opp') return nav + viewOpportunityRk();
    if (tab === 'program') return nav + viewOpportunity(true);   // UAR Improvement, Rabu Mantap and Kota/Kab Khusus, same content as the Opportunity menu
    if (tab === 'print') return nav + viewPrintInstructions();
    if (tab === 'endbal') return nav + viewEndBalance(true);   // mirrors the END BALANCE Outlet menu (without the DSO/DSE detail tab)
    if (tab === 'jual') return nav + viewPenjualan();   // same content and sub-tabs as the Penjualan ke Outlet menu
    if (!vf) return nav + card('Ringkasan Performance', '<p class="note">Feed kunjungan belum dimuat (jalankan <code>python3 scripts/generate_dse_visits_feed.py</code>).</p>');
    if (tab === 'pjp') return nav + mbPjpSection(vf);
    if (tab === 'grossadd') return nav + viewGrossAdd();
    if (tab === 'demand') return nav + viewPerformance();   // Penjualan ke Pelanggan: the same content and sub-tabs as the Demand Customer menu
    return nav + mbMapSection(vf, sf);
  }

  /* ---- PJP Visit: heatmap harian yang bisa diklik per hari ---- */
  var MB_LEVELS = [['auto', '⚙️ Otomatis (ikut filter)'], ['area', 'Area'], ['mc', 'Micro Cluster'], ['dse', 'DSE'], ['outlet', 'Outlet']];
  function mbLevelBar() {
    state.visitsLevel = 'auto';
    var auto = visitsAutoLevel();
    var lbl = { area: 'per Area', mc: 'per Micro Cluster', dse: 'per DSE', outlet: 'per Outlet' };
    return '<div class="map-toolbar" style="margin-top:8px;">' +
      '<div class="map-toolbar-group"><span class="map-label">Tingkat:</span><span class="chip">' + lbl[auto] + ' · ikut filter</span></div>' +
      '<div class="map-toolbar-group"><span class="map-label">Brand:</span>' + [['all', 'Semua'], ['im3', 'IM3'], ['3id', '3ID'], ['hybrid', 'Dual-brand']].map(function (b) { return '<button type="button" class="map-btn' + ((state.visitsBrandFilter || 'all') === b[0] ? ' active' : '') + '" data-visits-brand="' + b[0] + '">' + b[1] + '</button>'; }).join('') + '</div>' +
      ((state.visitsDse || state.branch || state.hoa || state.kec || (state.visitsBrandFilter || 'all') !== 'all') ? '<div class="map-toolbar-group"><button type="button" class="btn" data-act="clear-visits-filter">Reset filter</button></div>' : '') +
    '</div>' + mbDseSelect();
  }
  function mbDseSelect() {
    var vf = mbVisitsFeed(); if (!vf) return '';
    var keep = state.visitsDse; state.visitsDse = null;          // list every DSE in the territory scope, not only the selected one
    var list = visitsDseInScope(vf).slice().sort(function (a, b) { return String(a.dse_name).localeCompare(String(b.dse_name)); });
    state.visitsDse = keep;
    var sel = visitsDseRow(vf);
    return '<div class="map-toolbar" style="margin-top:6px;"><div class="map-toolbar-group"><span class="map-label">DSE:</span>' +
      '<select class="map-select" data-act="mb-dse" aria-label="Pilih DSE dalam cakupan" style="min-width:320px;"><option value="">— Semua DSE dalam cakupan (' + list.length + ') —</option>' +
      list.map(function (d) { return '<option value="' + esc(d.person_id) + '"' + (keep === d.person_id ? ' selected' : '') + '>' + esc(d.dse_name) + ' · ' + esc(d.micro_cluster || '—') + (d.in_master ? '' : ' (bukan master)') + '</option>'; }).join('') + '</select>' +
      (sel ? '<span class="chip" style="margin-left:8px;">DSE: ' + esc(sel.dse_name) + ' · ' + esc(sel.micro_cluster || '—') + ' · hit ' + (sel.target_hit_rate != null ? sel.target_hit_rate + '%' : '—') + '</span><button type="button" class="btn" data-act="mb-dse-clear" style="margin-left:6px;">✕ Lepas DSE</button>' : '') +
      '</div></div>';
  }
  function mbScopeLabel(vf) { var d = visitsDseRow(vf); return esc(scopeText()) + (d ? ' · DSE ' + esc(d.dse_name) : ''); }
  function mbSelectionBand(vf) {
    if (!(state.branch || state.hoa || state.kec || state.visitsDse)) return '';
    var d = visitsDseRow(vf);
    var parts = [];
    if (state.branch) parts.push('<b>Area</b> ' + esc(state.branch));
    if (state.hoa) parts.push('<b>HoA</b> ' + esc(state.hoa));
    if (state.kec) parts.push('<b>MC</b> ' + esc(state.kec));
    if (d) parts.push('<b>DSE</b> ' + esc(d.dse_name) + (d.in_master ? '' : ' (bukan master)'));
    return '<div class="scope" style="padding:10px 14px; margin-top:8px; border:2px solid var(--ij-accent); background:var(--ij-wash); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
      '<span>AREA TERPILIH · ' + parts.join(' · ') + '</span><button type="button" class="btn" data-act="clear-visits-filter" style="font-size:13px; padding:4px 10px;">✕ Reset</button></div>';
  }
  function mbScorecard(vf) {
    var sc = visitsScope(vf), rows = visitsRowsAt(vf, visitsLevel());
    var days = (vf.metadata || {}).days || [], n = days.length || 11;
    var daily = days.map(function () { return [0, 0]; });
    rows.forEach(function (r) { r.daily.forEach(function (c, i) { daily[i][0] += c[0]; daily[i][1] += c[1]; }); });
    var activeDays = daily.filter(function (c) { return c[0] > 0; }).length || 1, best = null, worst = null;
    daily.forEach(function (c, i) { if (!c[0]) return; var h = c[1] / c[0]; if (!best || h > best.h) best = { d: days[i], h: h }; if (!worst || h < worst.h) worst = { d: days[i], h: h }; });
    var row = '<tr>' +
      '<td class="num cur"><b>' + fmtCount(sc.planned) + '</b></td><td class="num cur"><b>' + fmtCount(sc.actual) + '</b></td>' +
      '<td class="num"><span class="' + (sc.hit >= 60 ? 'good-tag' : 'alert-tag') + '">' + sc.hit + '%</span></td>' +
      '<td class="num">' + fmtCount(Math.round(sc.planned / activeDays)) + '</td><td class="num">' + fmtCount(Math.round(sc.actual / activeDays)) + '</td><td class="num">' + activeDays + ' / ' + n + '</td>' +
      '<td class="num">' + (sc.prodRate == null ? '—' : sc.prodRate + '%') + '</td>' +
      '<td class="num">' + fmtCount(sc.outlets) + '</td><td class="num">' + fmtCount(sc.visited) + ' (' + pctOf(sc.visited, sc.outlets) + '%)</td><td class="num"><span class="alert-tag">' + fmtCount(sc.nvm) + ' (' + pctOf(sc.nvm, sc.outlets) + '%)</span></td>' +
      '<td class="num">' + (sc.sites ? fmtCount(sc.szm) + ' / ' + fmtCount(sc.sites) : '—') + '</td>' +
      '<td>' + (best ? esc(best.d.slice(0, 6)) + ' · ' + Math.round(best.h * 100) + '%' : '—') + '</td><td>' + (worst ? esc(worst.d.slice(0, 6)) + ' · ' + Math.round(worst.h * 100) + '%' : '—') + '</td></tr>';
    return card('Scorecard PJP · ' + esc(sc.label) + ' · ' + pjpPeriod('mtd',{id:1}) + ' 2026',
      '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th('Rencana (target)', 1) + th('Terlaksana', 1) + th('% Sukses', 1) + th('Rencana / hari aktif', 1) + th('Terlaksana / hari aktif', 1) + th('Hari aktif', 1) + th('% Produktif', 1) + th('Outlet master', 1) + th('Divisit MTD', 1) + th('Belum pernah divisit', 1) + th('Site gelap MTD', 1) + th('Hari terbaik') + th('Hari terburuk') + '</tr></thead><tbody>' + row + '</tbody></table></div>' +
      '<p class="note">Rata-rata harian dihitung atas hari yang punya rencana kunjungan dalam cakupan ini. Produktif = SP/VC qty &gt; 0 atau saldo &gt; Rp 50 rb. Site gelap = site DSO tanpa satu pun outlet divisit.</p>');
  }
  function mbDayAttr(cell, i) { return cell.replace('<td', '<td data-pjp-day="' + i + '" title="Klik: performa hari ini"'); }
  function mbHeat(vf) {
    var level = visitsLevel(), rows = visitsRowsAt(vf, level), days = (vf.metadata || {}).days || [], binary = level === 'outlet';
    var page = state.visitsPage || 1, pageSize = 50, paged = level === 'dse' || level === 'outlet';
    var totalPages = paged ? (Math.ceil(rows.length / pageSize) || 1) : 1;
    if (page > totalPages) { page = totalPages; state.visitsPage = page; }
    var start = paged ? (page - 1) * pageSize : 0, slice = paged ? rows.slice(start, start + pageSize) : rows;
    var sel = state.pjpDay;
    var tot = days.map(function () { return [0, 0]; }), TP = 0, TA = 0;
    rows.forEach(function (r) { r.daily.forEach(function (c, i) { tot[i][0] += c[0]; tot[i][1] += c[1]; }); TP += r.planned; TA += r.actual; });
    var seenParent = {}; rows.forEach(function (r) { seenParent[r.parent] = 1; });
    var showParent = Object.keys(seenParent).length > 1;
    function overall(pl, ac, bold) { var o = bold ? '<b>' : '', c = bold ? '</b>' : ''; return '<td class="num">' + o + fmtCount(pl) + c + '</td><td class="num cur">' + o + fmtCount(ac) + c + '</td><td class="num">' + o + hitPct({ planned: pl, actual: ac }) + '%' + c + '</td>'; }
    var head = days.map(function (d, i) {
      var dt = new Date(d.replace(/-/g, ' ')), wd = isNaN(dt) ? '' : HARI_ID[dt.getDay()];
      return '<th class="num" data-pjp-day="' + i + '" title="Klik untuk lihat performa hari ini" style="text-align:center; min-width:56px; cursor:pointer;' + (sel === i ? ' background:var(--ij-ink); color:#fff;' : '') + '">' + esc(d.slice(0, 2)) + '<br><span style="font-weight:500;">' + wd + '</span></th>';
    }).join('');
    var totalRow = '<tr style="background:var(--ij-wash); font-weight:800;"><td class="cur">Semua dalam cakupan (' + fmtCount(rows.length) + ' baris)</td>' + (showParent ? '<td>' + esc(scopeText()) + '</td>' : '') +
      overall(TP, TA, true) +
      tot.map(function (c, i) { return mbDayAttr(heatCell(c[0], c[1], false), i); }).join('') + '<td></td></tr>';
    function heatRow(r) {
      return '<tr' + (r.outside ? ' style="color:var(--ij-muted);"' : '') + '><td class="cur"><b>' + esc(r.label) + '</b>' + (r.sub ? '<br><code style="font-size:13px;">' + esc(r.sub) + '</code>' : '') + '</td>' + (showParent ? '<td>' + esc(r.parent) + '</td>' : '') +
        overall(r.planned, r.actual, false) +
        r.daily.map(function (c, i) { return mbDayAttr(heatCell(c[0], c[1], binary), i); }).join('') +
        '<td>' + detailBtn(r, 'Detail') + '</td></tr>';
    }
    var grouped = level === 'dse' || level === 'outlet', body;
    if (grouped) {
      var hoaOfA = {}, dsoOfM = {}; rows.forEach(function (r) { if (r.br && r.hoa) hoaOfA[r.br] = r.hoa; if (r.mc && r.dso) dsoOfM[r.mc] = r.dso; });
      body = grpBody('pjpheat', { items: rows, area: function (r) { return r.br; }, mc: function (r) { return r.mc; }, hoa: function (a) { return hoaOfA[a] || '—'; }, dso: function (m) { return dsoOfM[m] || '—'; },
        unit: level === 'dse' ? 'DSE' : 'outlet', val: function (r) { return r.planned; }, span: 1 + (showParent ? 1 : 0), cols: 1 + (showParent ? 1 : 0) + 3 + days.length + 1, cap: 100, search: !!state.visitsSearch,
        sub: function (items) {
          var pl = 0, ac = 0, dd = days.map(function () { return [0, 0]; });
          items.forEach(function (r) { pl += r.planned; ac += r.actual; r.daily.forEach(function (c, i) { dd[i][0] += c[0]; dd[i][1] += c[1]; }); });
          return overall(pl, ac, true) + dd.map(function (c, i) { return mbDayAttr(heatCell(c[0], c[1], false), i); }).join('') + '<td></td>';
        }, row: heatRow });
    } else body = slice.map(heatRow).join('');
    var entity = { area: 'Area', mc: 'Micro Cluster', dse: 'DSE', outlet: 'Outlet' }[level], parent = { area: 'Head of Area', mc: 'Area · DSO', dse: 'MC · Area', outlet: 'MC · DSE' }[level];
    var pag = grouped ? '<p class="note">' + fmtCount(rows.length) + ' baris, dikelompokkan Area › Micro Cluster; klik panah untuk membuka.</p>' : paged ? mbPager('visits-page', page, totalPages, 'Menampilkan ' + (rows.length ? start + 1 : 0) + '–' + Math.min(start + pageSize, rows.length) + ' dari ' + fmtCount(rows.length) + ' baris') : '';
    var legend = binary ? '✓ = check-in terlaksana · ○ = direncanakan, tidak dikunjungi · · = tidak ada di PJP hari itu.' : 'Sel = check-in terlaksana ÷ rencana kunjungan pada hari itu; &lt; 30% ditandai merah, hijau makin pekat = hit rate makin tinggi; · = tidak ada rencana.';
    return card('Heatmap PJP Harian · per ' + entity + ' · ' + mbScopeLabel(vf),
      (grouped ? '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('pjpheat') + '</div>' : '') + '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + th(grouped ? 'Area › MC › ' + entity : entity) + (showParent ? th(parent) : '') + th('Rencana', 1) + th('Terlaksana', 1) + th('% Sukses', 1) + head + th('Detail') + '</tr></thead><tbody>' + totalRow + body + '</tbody></table></div>' + pag +
      '<p class="note">' + legend + ' Klik tanggal (kolom) atau sel mana pun untuk membuka performa hari itu per DSE dan per outlet. "Detail" memperkecil cakupan ke tingkat di bawahnya.</p>');
  }
  function mbDayDetail(vf) {
    var di = state.pjpDay;
    if (di == null || di < 0) return '';
    var days = (vf.metadata || {}).days || [], d = days[di] || '', ix = dailyIdx();
    var list = visitsDseInScope(vf).map(function (x) { var c = (x.daily || [])[di] || [0, 0, 0, 0, 0, 0]; return { d: x, p: c[ix[0]] || 0, a: c[ix[1]] || 0 }; })
      .filter(function (r) { return r.p || r.a; }).sort(function (a, b) { return (b.a - a.a) || (b.p - a.p); });
    var TP = 0, TA = 0; list.forEach(function (r) { TP += r.p; TA += r.a; });
    var dseRows = list.map(function (r, i) {
      return '<tr><td class="num">' + (i + 1) + '</td><td class="cur"><b>' + esc(r.d.dse_name) + '</b>' + (r.d.in_master ? '' : ' <span class="note">(bukan master)</span>') + '</td><td>' + esc((r.d.micro_cluster || '—') + ' · ' + (r.d.branch || '—')) + '</td><td class="num">' + r.p + '</td><td class="num cur"><b>' + r.a + '</b></td><td>' + hitBar(hitPct({ planned: r.p, actual: r.a })) + '</td><td>' + detailBtn({ drill: { lv: 'dse', dse: r.d.person_id } }, 'Outlet') + '</td></tr>';
    }).join('');
    var brand = state.visitsBrandFilter || 'all', outs = [];
    visitsDseInScope(vf).forEach(function (x) {
      (x.outlets || []).forEach(function (o) {
        var ch = (o.d || '')[di];
        if (!ch || ch === '.') return;
        if (brand === 'im3' && o.b !== 'IM3') return;
        if (brand === '3id' && o.b !== '3ID') return;
        outs.push({ o: o, dse: x.dse_name, st: ch, br: x.branch });
      });
    });
    outs.sort(function (a, b) { return ((a.st === 'x' ? 0 : 1) - (b.st === 'x' ? 0 : 1)) || String(a.o.n).localeCompare(String(b.o.n)); });
    var done = 0; outs.forEach(function (r) { if (r.st === 'x') done++; });
    function pjpORow(r) {
      return '<tr><td class="cur"><span class="' + (r.o.b === 'IM3' ? 'badge-im3' : 'badge-3id') + '">' + esc(r.o.b) + '</span> <code>' + esc(String(r.o.id).split(':')[1] || r.o.id) + '</code></td><td><b>' + esc(r.o.n) + '</b></td><td>' + esc(r.o.mc || '—') + '</td><td>' + esc(r.dse) + '</td><td>' + (r.st === 'x' ? '<span class="good-tag">Dikunjungi</span>' : '<span class="alert-tag">Direncanakan, tidak dikunjungi</span>') + '</td></tr>';
    }
    var hoaByArea = {}, dsoByMc = {}; visitsDseInScope(vf).forEach(function (x) { if (x.branch && x.hoa_leader) hoaByArea[x.branch] = x.hoa_leader; if (x.micro_cluster && x.dso_leader) dsoByMc[x.micro_cluster] = x.dso_leader; });
    var oRows = grpBody('pjpday', { items: outs, area: function (r) { return r.br; }, mc: function (r) { return r.o.mc; }, hoa: function (a) { return hoaByArea[a] || '—'; }, dso: function (m) { return dsoByMc[m] || '—'; },
      val: function (r) { return r.st === 'x' ? 1 : 0; }, span: 4, cols: 5, search: false,
      sub: function (items) { var d = items.filter(function (r) { return r.st === 'x'; }).length; return '<td><span class="good-tag">' + fmtCount(d) + '</span> / ' + fmtCount(items.length) + ' dikunjungi</td>'; }, row: pjpORow });
    var closeBtn = ' <button type="button" class="btn" data-pjp-day="-1" style="margin-left:10px; font-size:13px; padding:4px 10px;">✕ Tutup</button>';
    return card('Performa Hari ' + esc(d) + ' · per DSE · ' + mbScopeLabel(vf) + closeBtn,
      '<div class="kpis" style="margin-bottom:10px;">' +
        kpi('Rencana Kunjungan', fmtCount(TP), 'hari ' + esc(d), 'up', 'PJP terjadwal pada hari itu') +
        kpi('Terlaksana', fmtCount(TA), hitPct({ planned: TP, actual: TA }) + '% sukses', TA / Math.max(TP, 1) >= 0.6 ? 'up' : 'down', 'Check-in selesai') +
        kpi('DSE Aktif', fmtCount(list.filter(function (r) { return r.a; }).length), 'dari ' + fmtCount(list.length) + ' DSE dengan rencana', 'up', 'Minimal 1 check-in') +
        kpi('Outlet Dikunjungi', fmtCount(done), 'dari ' + fmtCount(outs.length) + ' outlet direncanakan', 'up', 'Satu baris per outlet per DSE') +
      '</div>' +
      '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('#', 1) + th('DSE') + th('MC · Area') + th('Rencana', 1) + th('Terlaksana', 1) + th('% Sukses') + th('Detail') + '</tr></thead><tbody>' + dseRows + '</tbody></table></div>' +
      (list.length ? '' : '<p class="note">Tidak ada rencana kunjungan pada hari ini dalam cakupan.</p>')) +
      card('Performa Hari ' + esc(d) + ' · per Outlet',
        '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar('pjpday') + '</div><div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('Area › MC › Outlet (MOBI id)') + th('Nama outlet') + th('MC') + th('DSE') + th('Status') + '</tr></thead><tbody>' + oRows + '</tbody></table></div>' +
        '<p class="note">' + fmtCount(outs.length) + ' outlet, dikelompokkan Area › Micro Cluster; klik panah untuk membuka.</p>');
  }

  /* ---- Matriks Site & Outlet: inaktivitas per Area / MC, angka bisa diklik ---- */
  var MX_COLS = [
    ['s_mtd', 'Site ≥1 outlet belum divisit MTD', 'site'], ['s_7d', 'Site ≥1 outlet tanpa visit 7 hr', 'site'], ['s_3d', 'Site ≥1 outlet tanpa visit 3 hr', 'site'],
    ['o_mtd', 'Outlet belum pernah divisit MTD', 'outlet'], ['o_7d', 'Outlet tanpa visit 7 hr', 'outlet'], ['o_3d', 'Outlet tanpa visit 3 hr', 'outlet'],
    ['f0', 'F0 · tidak ada visit', 'outlet'], ['f2', 'F2 · 2×/bulan', 'outlet'], ['f4', 'F4 · 4×/bulan (1×/minggu)', 'outlet'], ['f8', 'F8 · 8×/bulan (2×/minggu)', 'outlet'], ['f12', 'F12 · 12×/bulan (3×/minggu)', 'outlet']
  ];
  var MX_F = [2, 4, 8, 12];
  function mxProrata(vf) {
    // expected visits so far for each frequency model = F × (days elapsed MTD ÷ days in month)
    var days = (vf.metadata || {}).days || [], n = days.length || 11;
    var last = days[days.length - 1] || '', m = last.match(/^\d{1,2}-([A-Za-z]{3})-(\d{4})$/);
    var dim = 31;
    if (m) { var mo = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[1].toLowerCase()); if (mo >= 0) dim = new Date(+m[2], mo + 1, 0).getDate(); }
    var out = { n: n, dim: dim, exp: {}, thr: {} };
    MX_F.forEach(function (F) { out.exp[F] = F * n / dim; out.thr[F] = Math.max(1, Math.ceil(F * n / dim)); });
    return out;
  }
  function mxBand(c, P) { if (c <= 0) return 'f0'; var b = 'f0'; MX_F.forEach(function (F) { if (c >= P.thr[F]) b = 'f' + F; }); return b === 'f0' ? 'f2' : b; }
  var MX_BAND_STYLE = { f0: ['#fee2e2', '#991b1b'], f2: ['#ffedd5', '#9a3412'], f4: ['#fef9c3', '#854d0e'], f8: ['#dcfce7', '#166534'], f12: ['#86efac', '#14532d'] };
  function mxPctStyle(n, base) { var pc = base ? n / base * 100 : 0; return pc >= 50 ? ['#fee2e2', '#991b1b'] : (pc >= 25 ? ['#fef3c7', '#92400e'] : ['#dcfce7', '#166534']); }
  var MX_LABEL = {};
  MX_COLS.forEach(function (c) { MX_LABEL[c[0]] = c[1]; });
  function mxMode() { return state.kec ? 'dse' : ((state.branch || state.hoa) ? 'mc' : 'area'); }
  function mxCompute(vf) {
    var terr = ((typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED.outlets : []) || [];
    var days = (vf.metadata || {}).days || [], n = days.length;
    var i7 = Math.max(0, n - 7), i3 = Math.max(0, n - 3), PR = mxProrata(vf);
    var vis = {};
    (vf.dses || []).forEach(function (d) {
      (d.outlets || []).forEach(function (o) {
        if (!o.k) return;
        var str = o.d || '';
        for (var i = 0; i < str.length; i++) if (str[i] === 'x') (vis[o.k] || (vis[o.k] = {}))[i] = 1;
      });
    });
    var outlets = [], bySite = {};
    terr.forEach(function (o) {
      if (!sellinInScope(o)) return;
      var v = vis[o.outlet_key] || {}, idx = Object.keys(v).map(Number);
      var c = idx.length, c7 = idx.filter(function (i) { return i >= i7; }).length, c3 = idx.filter(function (i) { return i >= i3; }).length;
      var last = idx.length ? days[Math.max.apply(null, idx)] : null;
      var siteKey = (o.site_nbs && o.site_nbs !== 'PENDING-NBS') ? o.site_nbs + '::' + o.micro_cluster : null;
      var r = { o: o, br: o.branch, mc: o.micro_cluster, dse: String(o.dse_name || '—').toUpperCase(), dseName: o.dse_name || '—', site: o.site_nbs || '—', siteKey: siteKey, c: c, c7: c7, c3: c3, last: last,
        band: mxBand(c, PR), f: { o_mtd: c === 0, o_7d: c7 === 0, o_3d: c3 === 0 } };
      r.f[r.band] = true;
      outlets.push(r);
      if (siteKey) {
        var S = bySite[siteKey] || (bySite[siteKey] = { key: siteKey, site: o.site_nbs, br: o.branch, mc: o.micro_cluster, dses: {}, n: 0, u_mtd: 0, u_7d: 0, u_3d: 0, last: null, outlets: [] });
        S.n++; S.outlets.push(r); S.dses[r.dse] = 1;
        if (c === 0) S.u_mtd++; if (c7 === 0) S.u_7d++; if (c3 === 0) S.u_3d++;
        if (last && (!S.last || days.indexOf(last) > days.indexOf(S.last))) S.last = last;
      }
    });
    var sites = Object.keys(bySite).map(function (k) { var S = bySite[k]; S.f = { s_mtd: S.u_mtd > 0, s_7d: S.u_7d > 0, s_3d: S.u_3d > 0 }; S.dark = S.u_mtd === S.n; return S; });
    var groups = {};
    function G(key, lv, br, mc, dse) { return groups[key] || (groups[key] = { key: key, lv: lv, br: br, mc: mc, dse: dse || '', nO: 0, nS: 0, c: {} }); }
    function keysOf(r) { return [G('A|' + r.br, 'area', r.br, ''), G('M|' + r.mc, 'mc', r.br, r.mc), G('D|' + r.dse, 'dse', r.br, r.mc, r.dseName)]; }
    outlets.forEach(function (r) { keysOf(r).forEach(function (g) { g.nO++; Object.keys(r.f).forEach(function (k) { if (r.f[k]) g.c[k] = (g.c[k] || 0) + 1; }); }); });
    sites.forEach(function (S) {
      var gs = [G('A|' + S.br, 'area', S.br, ''), G('M|' + S.mc, 'mc', S.br, S.mc)];
      Object.keys(S.dses).forEach(function (d) { var first = S.outlets.filter(function (r) { return r.dse === d; })[0]; gs.push(G('D|' + d, 'dse', S.br, S.mc, first ? first.dseName : d)); });
      gs.forEach(function (g) { g.nS++; Object.keys(S.f).forEach(function (k) { if (S.f[k]) g.c[k] = (g.c[k] || 0) + 1; }); });
    });
    var list = function (lv) { return Object.keys(groups).filter(function (k) { return groups[k].lv === lv; }).map(function (k) { return groups[k]; }).sort(function (x, y) { return (y.c.o_mtd || 0) - (x.c.o_mtd || 0); }); };
    var areas = list('area'); areas.forEach(function (a) { a.mcs = list('mc').filter(function (m) { return m.br === a.br; }); });
    var T = { key: 'T', lv: 'total', br: '', mc: '', nO: outlets.length, nS: sites.length, c: {} };
    outlets.forEach(function (r) { Object.keys(r.f).forEach(function (k) { if (r.f[k]) T.c[k] = (T.c[k] || 0) + 1; }); });
    sites.forEach(function (S) { Object.keys(S.f).forEach(function (k) { if (S.f[k]) T.c[k] = (T.c[k] || 0) + 1; }); });
    return { outlets: outlets, sites: sites, groups: groups, areas: areas, mcs: list('mc'), dses: list('dse'), total: T, days: days, pr: PR, mode: mxMode() };
  }
  function mxCell(g, metric, base) {
    var n = g.c[metric] || 0;
    var st = metric.charAt(0) === 'f' ? MX_BAND_STYLE[metric] : mxPctStyle(n, base);
    if (!n) return '<td class="num" style="color:var(--ij-label); background:' + (metric === 'f0' ? '#dcfce7' : 'transparent') + ';">·</td>';
    var sel = state.mxSel && state.mxSel.key === g.key && state.mxSel.metric === metric;
    return '<td class="num" style="background:' + st[0] + '; color:' + st[1] + ';"><button type="button" class="btn' + (sel ? ' primary' : '') + '" data-mx-sel="' + esc(g.key) + '" data-mx-metric="' + metric + '" style="padding:3px 8px; font-size:14px;' + (sel ? '' : ' background:rgba(255,255,255,.7); color:inherit; border-color:currentColor;') + '">' + fmtCount(n) + '</button><br><span style="font-size:12px; font-weight:700;">' + pctOf(n, base) + '%</span></td>';
  }
  function mxRow(g, label, parent, style, showParent) {
    return '<tr' + (style ? ' style="' + style + '"' : '') + '><td class="cur">' + label + '</td>' + (showParent ? '<td>' + parent + '</td>' : '') + '<td class="num">' + fmtCount(g.nS) + '</td><td class="num">' + fmtCount(g.nO) + '</td>' +
      MX_COLS.map(function (c) { return mxCell(g, c[0], c[2] === 'site' ? g.nS : g.nO); }).join('') + '</tr>';
  }
  function mxDetail(vf, C) {
    var sel = state.mxSel; if (!sel) return '';
    var metric = sel.metric, isSite = MX_COLS.filter(function (c) { return c[0] === metric; })[0][2] === 'site';
    var g = sel.key === 'T' ? C.total : C.groups[sel.key];
    if (!g) return '';
    var where = g.lv === 'total' ? esc(scopeText()) : (g.lv === 'area' ? 'Area ' + esc(g.br) : (g.lv === 'mc' ? 'MC ' + esc(g.mc) : 'DSE ' + esc(g.dse) + ' (' + esc(g.mc) + ')'));
    function inG(x) {
      if (g.lv === 'total') return true;
      if (g.lv === 'area') return x.br === g.br;
      if (g.lv === 'mc') return x.mc === g.mc;
      var dk = sel.key.slice(2);
      return isSite ? !!x.dses[dk] : x.dse === dk;
    }
    var list = (isSite ? C.sites : C.outlets).filter(function (x) { return inG(x) && x.f[metric]; });
    list.sort(function (a, b) { return isSite ? (b.u_mtd - a.u_mtd) || (b.n - a.n) : ((a.o.site_nbs || '').localeCompare(b.o.site_nbs || '')) || String(a.o.outlet_name).localeCompare(String(b.o.outlet_name)); });
    var hoaMx = {}, dsoMx = {}; (vf.dses || []).forEach(function (x) { if (x.branch && x.hoa_leader) hoaMx[x.branch] = x.hoa_leader; if (x.micro_cluster && x.dso_leader) dsoMx[x.micro_cluster] = x.dso_leader; });
    function stTag(r) { return r.c === 0 ? '<span class="alert-tag">Belum pernah divisit MTD</span>' : (r.c7 === 0 ? '<span class="alert-tag" style="background:#fff7ed; color:#9a3412; border-color:#fdba74;">≥7 hari tanpa visit</span>' : (r.c3 === 0 ? '<span class="sw sw-watch"></span>≥3 hari tanpa visit' : '<span class="good-tag">Aktif</span>')); }
    var head, rows;
    if (isSite) {
      head = th('Area › MC › Site NBS') + th('MC') + th('Outlet di site', 1) + th('Belum pernah MTD', 1) + th('≥7 hari', 1) + th('≥3 hari', 1) + th('Visit terakhir di site') + th('Status') + th('Outlet');
      rows = grpBody('mxsite', { items: list, area: function (S) { return S.br; }, mc: function (S) { return S.mc; }, hoa: function (a) { return hoaMx[a] || '—'; }, dso: function (m) { return dsoMx[m] || '—'; }, unit: 'site', val: function () { return 1; }, span: 2, cols: 9, search: false,
        sub: function (items) { var n = grpSum(items, function (S) { return S.n; }); return '<td class="num">' + fmtCount(n) + '</td><td class="num">' + uarCell(grpSum(items, function (S) { return S.u_mtd; }), n) + '</td><td class="num">' + uarCell(grpSum(items, function (S) { return S.u_7d; }), n) + '</td><td class="num">' + uarCell(grpSum(items, function (S) { return S.u_3d; }), n) + '</td><td colspan="3"></td>'; },
        row: function (S) {
          return '<tr><td class="cur"><code>' + esc(S.site) + '</code></td><td>' + esc(S.mc) + '</td><td class="num">' + fmtCount(S.n) + '</td><td class="num">' + uarCell(S.u_mtd, S.n) + '</td><td class="num">' + uarCell(S.u_7d, S.n) + '</td><td class="num">' + uarCell(S.u_3d, S.n) + '</td><td>' + esc(S.last || 'Belum pernah') + '</td>' +
            '<td>' + (S.dark ? '<span class="alert-tag">Site gelap · 0 outlet divisit</span>' : '<span class="sw sw-watch"></span>Sebagian outlet belum divisit') + '</td>' +
            '<td><button type="button" class="btn" data-mx-site="' + esc(S.key) + '" style="font-size:13px; padding:4px 9px;">Outlet &#8594;</button></td></tr>';
        } });
    } else {
      head = th('Area › MC › Outlet') + th('Nama') + th('Site NBS') + th('MC') + th('DSE') + th('Hari divisit MTD', 1) + th('7 hr', 1) + th('3 hr', 1) + th('Visit terakhir') + th('Status');
      rows = grpBody('mxout', { items: list, area: function (r) { return r.br; }, mc: function (r) { return r.mc; }, hoa: function (a) { return hoaMx[a] || '—'; }, dso: function (m) { return dsoMx[m] || '—'; }, unit: 'outlet', val: function () { return 1; }, span: 5, cols: 10, search: false,
        sub: function (items) { return '<td class="num"><b>' + fmtCount(grpSum(items, function (r) { return r.c; })) + '</b></td><td class="num">' + fmtCount(grpSum(items, function (r) { return r.c7; })) + '</td><td class="num">' + fmtCount(grpSum(items, function (r) { return r.c3; })) + '</td><td colspan="2"></td>'; },
        row: function (r) {
          return '<tr><td class="cur"><code>' + esc(r.o.outlet_key) + '</code></td><td><b>' + esc(r.o.outlet_name) + '</b></td><td><code>' + esc(r.site) + '</code></td><td>' + esc(r.mc) + '</td><td>' + esc(r.dseName) + '</td><td class="num"><b>' + r.c + '</b></td><td class="num">' + r.c7 + '</td><td class="num">' + r.c3 + '</td><td>' + esc(r.last || 'Belum pernah') + '</td><td>' + stTag(r) + '</td></tr>';
        } });
    }
    var siteOutlets = '';
    if (state.mxSite) {
      var S2 = C.sites.filter(function (x) { return x.key === state.mxSite; })[0];
      if (S2) {
        var so = S2.outlets.slice().sort(function (a, b) { return a.c - b.c; });
        siteOutlets = card('Outlet di site ' + esc(S2.site) + ' · ' + esc(S2.mc) + ' <button type="button" class="btn" data-mx-site="" style="margin-left:10px; font-size:13px; padding:4px 10px;">✕ Tutup</button>',
          '<div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + th('Outlet') + th('Nama') + th('DSE') + th('Hari divisit MTD', 1) + th('7 hr', 1) + th('3 hr', 1) + th('Visit terakhir') + th('Status') + '</tr></thead><tbody>' +
          so.map(function (r) { return '<tr><td class="cur"><code>' + esc(r.o.outlet_key) + '</code></td><td><b>' + esc(r.o.outlet_name) + '</b></td><td>' + esc(r.dseName) + '</td><td class="num"><b>' + r.c + '</b></td><td class="num">' + r.c7 + '</td><td class="num">' + r.c3 + '</td><td>' + esc(r.last || 'Belum pernah') + '</td><td>' + stTag(r) + '</td></tr>'; }).join('') + '</tbody></table></div>');
      }
    }
    return card((isSite ? 'Daftar site · ' : 'Daftar outlet · ') + esc(MX_LABEL[metric]) + ' · ' + where + ' <button type="button" class="btn" data-mx-sel="" data-mx-metric="" style="margin-left:10px; font-size:13px; padding:4px 10px;">✕ Tutup</button>',
      '<div class="map-toolbar" style="margin-bottom:8px;">' + grpBar(isSite ? 'mxsite' : 'mxout') + '</div><div class="tbl-wrap"><table class="tbl wide"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="note">' + fmtCount(list.length) + (isSite ? ' site' : ' outlet') + ', dikelompokkan Area › Micro Cluster; klik panah untuk membuka.</p>') + siteOutlets;
  }
  function mbMatrix(vf) {
    var C = mxCompute(vf), mode = C.mode, col = state.mxCollapsed || {};
    // rows follow the filter: no filter = Area with MC detail; Area/HoA = its MCs; MC = its DSEs. The selected territory is named once, in the heading.
    var rows = [], entity, parentLabel = '', showParent = false, totalRow = null;
    if (mode === 'area') {
      entity = 'Area / MC';
      C.areas.forEach(function (a) {
        var closed = !!col[a.br];
        rows.push([a, '<button type="button" class="btn" data-mx-toggle="' + esc(a.br) + '" style="padding:2px 8px; font-size:13px; margin-right:6px;">' + (closed ? '＋' : '－') + '</button><b>' + esc(a.br) + '</b>', 'Area · ' + a.mcs.length + ' MC', 'background:var(--ij-wash); font-weight:800;']);
        if (!closed) a.mcs.forEach(function (m) { rows.push([m, '<span style="padding-left:18px;">' + esc(m.mc) + '</span>', '']); });
      });
      if (C.areas.length > 1) totalRow = [C.total, '<b>INNER JAKARTA (total)</b>', ''];
      showParent = true; parentLabel = 'Keterangan';
    } else if (mode === 'mc') {
      entity = 'Micro Cluster';
      C.mcs.forEach(function (m) { rows.push([m, '<b>' + esc(m.mc) + '</b>', '']); });
      if (C.mcs.length > 1) totalRow = [C.total, '<b>' + esc(state.branch || state.hoa) + ' (total)</b>', ''];
    } else {
      entity = 'DSE';
      C.dses.forEach(function (d) { rows.push([d, '<b>' + esc(d.dse) + '</b>', '']); });
      if (C.dses.length > 1) totalRow = [C.total, '<b>' + esc(state.kec) + ' (total)</b>', ''];
    }
    var head = '<tr><th rowspan="2">' + entity + '</th>' + (showParent ? '<th rowspan="2">' + parentLabel + '</th>' : '') + '<th rowspan="2" class="num">Site</th><th rowspan="2" class="num">Outlet master</th>' +
      '<th colspan="3" style="text-align:center; border-bottom:1px solid var(--ij-hairline);">Site dengan ≥1 outlet belum divisit</th>' +
      '<th colspan="3" style="text-align:center; border-bottom:1px solid var(--ij-hairline);">Outlet belum divisit</th>' +
      '<th colspan="5" style="text-align:center; border-bottom:1px solid var(--ij-hairline);">Frekuensi visit outlet (prorata MTD ' + C.pr.n + ' / ' + C.pr.dim + ' hari)</th></tr>' +
      '<tr>' + ['Belum pernah MTD', '≥7 hari tanpa visit', '≥3 hari tanpa visit', 'Belum pernah MTD', '≥7 hari tanpa visit', '≥3 hari tanpa visit'].map(function (l, i) {
        var tip = i % 3 === 0 ? 'tidak ada check-in ' + pjpPeriod('mtd',{id:1}) + ' (himpunan terkecil)' : (i % 3 === 1 ? 'tidak ada check-in ' + pjpPeriod('l7',{id:1}) + '; mencakup yang belum pernah MTD' : 'tidak ada check-in ' + pjpPeriod('l3',{id:1}) + '; mencakup 7 hari dan MTD (himpunan terbesar)');
        return '<th class="num" title="' + tip + '">' + l + '</th>';
      }).join('') +
      '<th class="num" title="tidak ada check-in">F0</th>' + MX_F.map(function (F) { return '<th class="num" title="target ' + F + '×/bulan → prorata ' + C.pr.exp[F].toFixed(2) + ', tercapai bila ≥ ' + C.pr.thr[F] + ' hari check-in">F' + F + '<br><span style="font-weight:500;">≥' + C.pr.thr[F] + '</span></th>'; }).join('') + '</tr>';
    var body = rows.map(function (r) { return mxRow(r[0], r[1], r[2], r[3] || '', showParent); }).join('') +
      (totalRow ? mxRow(totalRow[0], totalRow[1], totalRow[2], 'background:var(--ij-ink); color:#fff; font-weight:800;', showParent) : '');
    var allClosed = mode === 'area' && C.areas.length && C.areas.every(function (a) { return col[a.br]; });
    var toolbar = '<div class="map-toolbar" style="margin-bottom:8px;">' +
      (mode === 'area' ? '<div class="map-toolbar-group"><span class="map-label">Grup Area:</span>' +
        '<button type="button" class="map-btn' + (!allClosed ? ' active' : '') + '" data-mx-expand="all">＋ Expand semua</button>' +
        '<button type="button" class="map-btn' + (allClosed ? ' active' : '') + '" data-mx-expand="none">－ Collapse semua</button></div>' : '<div class="map-toolbar-group"><span class="chip">' + (mode === 'mc' ? 'per Micro Cluster · ikut filter' : 'per DSE · ikut filter') + '</span></div>') +
      '<div class="map-toolbar-group"><span class="map-label">Legenda:</span>' +
      ['f0', 'f2', 'f4', 'f8', 'f12'].map(function (k) { return '<span style="display:inline-block; padding:2px 8px; background:' + MX_BAND_STYLE[k][0] + '; color:' + MX_BAND_STYLE[k][1] + '; font-weight:700; border:1px solid var(--ij-hairline);">' + k.toUpperCase() + '</span>'; }).join('') +
      '<span class="note" style="margin-left:8px;">sel belum divisit: hijau &lt; 25% · kuning 25–50% · merah ≥ 50% · jendela bersarang: ≥3 hari ⊇ ≥7 hari ⊇ belum pernah MTD</span></div></div>';
    return mxDetail(vf, C) + card('Matriks Site & Outlet · ' + (mode === 'area' ? 'per Area dan MC' : (mode === 'mc' ? 'per MC' : 'per DSE')) + ' · ' + esc(scopeText()),
      toolbar + '<div class="tbl-wrap"><table class="tbl wide"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<p class="note">Tingkat baris mengikuti filter: tanpa filter = Area (abu, bisa dibuka/tutup) dengan MC di bawahnya; Area terpilih = MC-nya; MC terpilih = DSE-nya. Frekuensi: F0 = tidak ada check-in MTD (merah); F2/F4/F8/F12 = outlet yang jumlah hari check-in MTD-nya sudah mencapai run-rate prorata target 2, 4, 8, atau 12 visit per bulan (' + C.pr.n + ' dari ' + C.pr.dim + ' hari berjalan → ambang ≥' + C.pr.thr[2] + ', ≥' + C.pr.thr[4] + ', ≥' + C.pr.thr[8] + ', ≥' + C.pr.thr[12] + ' hari); tiap outlet dihitung pada band tertinggi yang dicapainya. Site = site DSO (site × MC); "≥1 outlet belum divisit" = site yang punya minimal satu outlet master tanpa check-in pada jendela itu; pada tingkat DSE, site dihitung untuk setiap DSE yang punya outlet di site itu. Hari check-in MTD = jumlah hari (' + pjpPeriod('mtd',{id:1}) + ') outlet itu di-check-in oleh DSE mana pun; outlet master yang tidak ada di PJP dihitung 0. Klik angka untuk membuka daftar site atau outlet; dari daftar site, "Outlet →" membuka outlet di site tersebut.</p>');
  }
  function mbPjpCards(vf) {
    var sc = visitsScope(vf);
    return '<div class="kpis" style="margin-top:8px;">' +
      kpi('% Sukses Visit', sc.hit + '%', fmtCount(sc.actual) + ' dari ' + fmtCount(sc.planned) + ' rencana', sc.hit >= 60 ? 'up' : 'down', 'Check-in terlaksana ÷ PJP terjadwal · ' + pjpPeriod('mtd',{id:1}) + '') +
      kpi('Kunjungan Produktif', sc.prodRate == null ? '—' : sc.prodRate + '%', sc.prodRate == null ? 'Tidak dipisah per brand' : fmtCount(sc.productive) + ' kunjungan dengan sell-in', sc.prodRate != null && sc.prodRate >= 30 ? 'up' : 'down', 'SP/VC qty > 0 atau saldo > Rp 50 rb') +
      kpi('Outlet Belum Divisit · MTD', fmtCount(sc.nvm), mbPct(sc.nvm, sc.outlets) + ' dari ' + fmtCount(sc.outlets) + ' outlet', 'down', 'Tanpa check-in ' + pjpPeriod('mtd',{id:1}) + '') +
      kpi('Site Tanpa Visit · MTD', fmtCount(sc.szm), mbPct(sc.szm, sc.sites) + ' dari ' + fmtCount(sc.sites) + ' site DSO', 'down', '0 outlet divisit') +
    '</div>';
  }
  function viewMbPjp() {
    var vf = mbVisitsFeed();
    if (!vf) return card('PJP Visit', '<p class="note">Feed kunjungan belum dimuat.</p>');
    var cards = mbPjpCards(vf);
    var tab = state.pjpTab || 'heat';
    var tabNav = '<div class="sub-nav" role="tablist" style="margin-top:8px;">' + [['heat', '🗓️ Heatmap PJP Harian'], ['matrix', '📊 Matriks Site & Outlet'], ['map', '🗺️ Map Site']].map(function (t) {
      return '<button type="button" role="tab" class="sub-nav-btn' + (tab === t[0] ? ' active' : '') + '" data-pjp-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>';
    }).join('') + '</div>';
    if (tab === 'map') return mbSelectionBand(vf) + cards + tabNav + mbLevelBar() + renderPjpSiteMap(vf);
    if (tab === 'matrix') return mbSelectionBand(vf) + cards + tabNav + mbMatrix(vf);
    return mbSelectionBand(vf) + cards + tabNav + mbLevelBar() + mbScorecard(vf) + mbDayDetail(vf) + mbHeat(vf);
  }

  /* ---- OVERALL PERFORMANCE SA/MC: satu halaman PJP Visit + Penjualan ke Outlet untuk teritori terpilih ---- */
  function mbMainFilter() {
    var branches = KEC.map(function (r) { return r.branch; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
    var mcs = KEC.filter(function (r) { return !state.branch || r.branch === state.branch; }).map(function (r) { return r.kec; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
    function sel(f, label, vals, cur, allLbl) {
      return '<label class="field" style="min-width:300px;">' + label + '<select data-f="' + f + '" style="font-size:16px; padding:9px 12px;"><option value="">' + allLbl + '</option>' +
        vals.map(function (v) { return '<option' + (cur === v ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select></label>';
    }
    return '<div class="card" style="border:2px solid var(--ij-accent); background:var(--ij-wash);"><h2 class="sect">Filter utama · pilih teritori</h2>' +
      '<div style="display:flex; gap:18px; flex-wrap:wrap; align-items:flex-end;">' +
      sel('branch', 'Sales Area (SA)', branches, state.branch, '— Semua SA (Inner Jakarta) —') +
      sel('kec', 'DSO / Micro Cluster', mcs, state.kec, state.branch ? '— Semua MC di ' + esc(state.branch) + ' —' : '— Pilih SA dulu, atau semua MC —') +
      '<div style="display:flex; gap:8px;"><button type="button" class="btn" data-act="up"' + ((state.kec || state.hoa || state.branch) ? '' : ' disabled aria-disabled="true"') + '>◀ Kembali' + (state.kec ? ' ke SA' : (state.branch ? ' ke semua SA' : '')) + '</button><button type="button" class="btn" data-act="clear">Reset</button></div>' +
      '<span class="note" style="flex:1 1 100%;">Semua blok di bawah mengikuti teritori terpilih. Pilih MC untuk melihat per DSE dan per outlet.</span></div></div>';
  }
  function mbSectionTitle(no, text) {
    return '<div class="scope" style="margin-top:16px; padding:10px 14px; background:var(--ij-ink); color:#fff; font:800 15px var(--ij-font); letter-spacing:.06em; text-transform:uppercase;">' + no + ' · ' + text + ' · ' + esc(scopeText()) + '</div>';
  }
  function mbPjKpis(F, rows, A) {
    var M = F.metadata, n = M.cut_day, T = A.tot, masterN = pjMasterInScope(F);
    var g = pjGrowthPct(pjMx(T), T.lv), LD = pjLd(F, rows), ldTxt = 'Hari kerja terakhir ' + LD.W.short + ': ';
    return '<div class="kpis" style="margin-top:10px;">' +
      kpi('Total Sell-In ke outlet · MTD', pjRp(T.mv), 'LMTD ' + pjRp(T.lv) + ' · ' + (g == null ? '—' : (g >= 0 ? '+' : '') + g.toFixed(1) + '%'), g >= 0 ? 'up' : 'down', 'September penuh ' + pjRp(T.fv) + ' · ' + ldTxt + pjRp(LD.D.tot.v)) +
      kpi('UAR · outlet aktif beli MTD', fmtCount(T.om), pctOf(T.om, masterN) + '% dari ' + fmtCount(masterN) + ' outlet master di lingkup', 'up', 'LMTD ' + fmtCount(T.ol) + ' · ' + ldTxt + fmtCount(LD.D.tot.u) + ' outlet beli') +
      kpi('Run-rate akhir Oktober', pjRp(T.mv / n * (M.mtd_month_days || 31)), 'vs September penuh ' + pjRp(T.fv), T.mv / n * (M.mtd_month_days || 31) >= T.fv ? 'up' : 'down', 'Nilai MTD ÷ ' + n + ' hari × ' + (M.mtd_month_days || 31) + ' · ' + ldTxt + pjRp(LD.D.tot.v) + ' vs rata-rata ' + pjRp(T.mv / n) + '/hari') +
      kpi('Penjualan hari kerja terakhir · ' + LD.W.label, pjRp(LD.D.tot.v), 'vs ' + LD.W.prevShort + ' ' + pjRp(LD.P.tot.v) + ldDelta(LD.D.tot.v, LD.P.tot.v), LD.D.tot.v >= LD.P.tot.v ? 'up' : 'down', 'SP ' + fmtCount(LD.D.SP.q) + ' pcs · Voucher ' + fmtCount(LD.D.VC.q) + ' pcs · Saldo ' + pjRp(LD.D.SALMO.v) + ' · ' + fmtCount(rows.length) + ' outlet bertransaksi MTD') +
    '</div>';
  }
  function viewMbOverall() {
    var vf = mbVisitsFeed(), F = pjFeed();
    var html = mbMainFilter();
    // 1. PJP Visit
    html += mbSectionTitle('1', 'PJP Visit Performance');
    if (!vf) html += card('PJP Visit', '<p class="note">Feed kunjungan belum dimuat.</p>');
    else {
      var keepLv = state.visitsLevel; state.visitsLevel = 'auto';
      html += mbSelectionBand(vf) + mbPjpCards(vf) + mbScorecard(vf) + mbHeat(vf);
      state.visitsLevel = keepLv;
    }
    // 2. Penjualan ke Outlet
    html += mbSectionTitle('2', 'Penjualan ke Outlet Performance');
    if (!F) html += card('Penjualan ke Outlet', '<p class="note">Feed penjualan belum dibangun. Jalankan <code>python3 scripts/build_penjualan_feed.py</code>.</p>');
    else {
      var rows = pjOutlets(F), A = pjAgg(rows);
      var keepPj = state.pjLevel; state.pjLevel = 'auto';
      html += pjSelectionBand(F) + pjScorecard(F, rows) + mbPjKpis(F, rows, A) + pjHeat(F);
      if (state.kec) { state.pjLevel = 'outlet'; html += pjHeat(F); }
      state.pjLevel = keepPj;
    }
    return html;
  }
  function viewMbPenjualan() {
    return viewPenjualan();
  }
  function viewMbOpportunity() {
    return viewOpportunity();
  }

  function viewData() {
    var catalogues = [
      ['Territory Management Master (outlet chain)', 'data/catalogues/territory_management_master.csv · .json', '14,694 outlets → site NBS → DSE → DSO → HoA, with GPS and Oct supply flags', 'Active & Governed', 'up'],
      ['Territory Hierarchy Chain', 'data/catalogues/territory_hierarchy_chain.json', '7 branches → 36 micro clusters → DSE codes with outlet counts', 'Active & Governed', 'up'],
      ['DSE Master Hierarchy', 'data/catalogues/dse_master_hierarchy.csv · .json', '272 DSEs with MOBO MSISDN, rayon, IM3 / 3ID codes', 'Active & Governed', 'up'],
      ['DSO Territory Mapping', 'data/catalogues/dso_territory_mapping.csv · .json', '36 micro clusters mapped to DSO leaders and Heads of Area', 'Active & Governed', 'up'],
      ['Branch Area Summary', 'data/catalogues/branch_area_summary.csv', '7 branches and Heads of Area', 'Active & Governed', 'up'],
      ['Jakarta Map Feed', 'data/catalogues/jakarta_map_feed.json', '7 area, 36 MC and 185 kecamatan borders, 4,249 DSO-mapped site centroids, 14,694 outlets', 'Active & Governed', 'up'],
      ['DSE Visits Feed', 'website/data/dse_visits_feed.js', 'Planned vs actual visits, durations, GPS deviation, unvisited outlets and sites, ' + pjpPeriod('mtd') + ' 2026', 'Active & Loaded', 'up'],
      ['Daily Supply & Demand Feed', 'data/processed/daily_supply_demand_feed.json', 'ILLUSTRATIVE seeded numbers behind Morning Brief, Leaders Analysis and Supply vs Demand', 'Synthetic until Step 5', 'watch']
    ];
    var rawFolders = [
      ['raw/Outlet & Mapping/', 'XLSB + CSV', 'Data_Mapping_Update (14,695 outlets), adhoc_outlet_im3_3id_data_gcp (outlet → site NBS), NBS Site to Outlet CSVs'],
      ['raw/MOBI VISIT DSE/', 'ZIP of pipe CSV', 'Journey Plan Summary Detail per DSE visit, IM3 and 3ID, ' + pjpPeriod('mtd') + ' 2026 (817k rows)'],
      ['raw/SP VC Sellin/', 'Pipe CSV', 'Physical Sell-In of starter packs and vouchers, distributor → DSE → outlet (4,659 rows)'],
      ['raw/MOBI TRansfer Balance/', 'Pipe CSV', 'Electronic saldo transfers DSE → outlet (12,760 rows)'],
      ['raw/MOBO TRANSACTION DETAILS/', 'Comma CSV', 'Outlet transactions, demand / sell-out proxy (221k rows), not yet used'],
      ['docs/MASTER DSE Hirarki.xlsx', 'XLSX', 'Master hierarchy workbook: DSE, micro cluster, branch, Head of Area']
    ];
    return card('Governed Local Catalogues and Feeds (Inner Jakarta)', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      th('Catalogue') + th('Local Path') + th('Coverage') + th('Status') + '</tr></thead><tbody>' + catalogues.map(function (c) {
        return '<tr><td class="cur">' + esc(c[0]) + '</td><td><code>' + esc(c[1]) + '</code></td><td>' + esc(c[2]) + '</td><td><span class="sw sw-' + c[4] + '"></span>' + esc(c[3]) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="note">Built by the scripts in <code>scripts/</code>; see CLAUDE.md for the run order. Data cut: ' + pjpCut() + '.</p>') +
      card('Local Raw Data Sources (local-first, Phase 1)', '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
      th('Source / Folder Path') + th('Type') + th('Purpose') + '</tr></thead><tbody>' + rawFolders.map(function (r) {
        return '<tr><td class="cur"><code>' + esc(r[0]) + '</code></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="note">Drop new exports into these folders and rerun the build scripts. Raw files stay local and are not versioned in git.</p>');
  }
  var VIEWS = { brief: viewBrief, terr: viewTerr, svd: viewSvd, visits: viewVisits, sellin: viewSellin, mb_ringkasan: viewMbRingkasan, mb_endbal: viewEndBalance, mb_grossadd: viewGrossAdd, mb_uar: viewUar, cfg_target: viewTargetSetting, cfg_pjp: viewPjpMapping, mb_overall: viewMbOverall, mb_pjp: viewMbPjp, mb_penjualan: viewMbPenjualan, mb_performance: viewPerformance, mb_opportunity: viewMbOpportunity, territory: viewTerritory, map: viewMap, data: viewData };

  /* ---------- shell: filters, header, events ---------- */
  function $(s) { return typeof document !== 'undefined' && document.querySelector ? document.querySelector(s) : null; }
  /* ================= Global DSE filter (header): MC -> DSE with code, plus search by DSE name or code ================= */
  var DSE_DIR = null;
  function dseNorm(v) { return String(v == null ? '' : v).trim().toUpperCase(); }
  function dseDir() {
    if (DSE_DIR) return DSE_DIR;
    var map = {}, T = (typeof window !== 'undefined') ? window.TERRITORY_FEED : null, K = (typeof window !== 'undefined') ? window.DSE_KPI_FEED : null, V = mbVisitsFeed();
    var mcRow = {}; KEC.forEach(function (r) { if (!mcRow[r.kec]) mcRow[r.kec] = r; });
    function get(nm, raw) { if (!nm || nm === '0' || nm === 'UNASSIGNED' || nm.indexOf('UNASSIGNED') === 0) return null; return map[nm] || (map[nm] = { name: nm, label: raw || nm, codes: [], pid: '', mcs: {} }); }
    function addCode(d, c) { c = dseNorm(c); if (c && c !== '0' && d.codes.indexOf(c) < 0) d.codes.push(c); }
    if (T && T.outlets) T.outlets.forEach(function (o) {
      var d = get(dseNorm(o.dse_name), String(o.dse_name || '').trim()); if (!d) return;
      addCode(d, o.dse_code_im3); addCode(d, o.dse_code_3id);
      if (o.micro_cluster) d.mcs[o.micro_cluster] = (d.mcs[o.micro_cluster] || 0) + 1;
    });
    if (K && K.dses) K.dses.forEach(function (r) { var d = get(dseNorm(r.n)); if (!d) return; if (r.pid) d.pid = r.pid; if (r.mc && !Object.keys(d.mcs).length) d.mcs[r.mc] = 1; });
    if (V && V.dses) V.dses.forEach(function (r) { var d = get(dseNorm(r.dse_name)); if (!d || !r.in_master) return; if (!d.pid) d.pid = r.person_id; });
    DSE_DIR = Object.keys(map).map(function (k) {
      var d = map[k], best = null; Object.keys(d.mcs).forEach(function (m) { if (best == null || d.mcs[m] > d.mcs[best]) best = m; });
      var row = best ? mcRow[best] : null;
      d.mc = best || ''; d.br = row ? row.branch : ''; d.hoa = row ? row.hoa : '';
      d.code = d.codes[0] || d.pid || '';
      d.text = d.label + (d.code ? ' · ' + d.code : '');
      d.hay = (d.name + ' ' + d.codes.join(' ') + ' ' + d.pid).toUpperCase();
      return d;
    }).filter(function (d) { return d.mc; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    return DSE_DIR;
  }
  function dseGet(name) { var n = dseNorm(name), L = dseDir(); for (var i = 0; i < L.length; i++) if (L[i].name === n) return L[i]; return null; }
  function dseByPid(pid) { var L = dseDir(); for (var i = 0; i < L.length; i++) if (L[i].pid === pid) return L[i]; return null; }
  function dseInHeaderScope(d) { return (!state.branch || d.br === state.branch) && (!state.hoa || d.hoa === state.hoa) && (!state.kec || d.mc === state.kec); }
  function dseClear() { state.dse = ''; state.pjDse = null; state.poDse = null; state.visitsDse = null; }
  function dseSelect(name) {
    var d = dseGet(name); if (!d) return false;
    state.branch = d.br; state.hoa = d.hoa; state.kec = d.mc; state.dse = d.name;
    state.pjDse = d.name; state.poDse = d.name; state.visitsDse = d.pid || null;   // the menu you are on must see the DSE at once
    state.sel = null; state.terrPage = 1; state.terrGroupPage = 1; state.visitsPage = 1; state.unvisSelected = null; state.sellinPage = 1;
    state.pjPage = 1; state.poPage = 1; state.dkPage = 1; state.ebPage = 1; state.pjpOutletPage = 1; state.visitsLevel = 'auto';
    return true;
  }
  // keeps the header DSE and the per-menu DSE states (Penjualan, Performance, PJP) pointing at the same person
  function dseSync() {
    var key = { mb_penjualan: 'pjDse', mb_performance: 'poDse', mb_pjp: 'visitsDse', visits: 'visitsDse' }[state.view];
    if (state.view === 'mb_ringkasan') key = state.rkTab === 'jual' ? 'pjDse' : (state.rkTab === 'pjp' ? 'visitsDse' : (state.rkTab === 'demand' ? 'poDse' : null));
    var d0 = state.dse ? dseGet(state.dse) : null; if (key === 'visitsDse' && d0 && !d0.pid) key = null;   // a DSE without PJP data cannot be followed through the visits menu
    if (state.dse && key) {   // the menu's own DSE control was cleared or changed: follow it
      var cur = key === 'visitsDse' ? (state.visitsDse ? (dseByPid(state.visitsDse) || {}).name : null) : state[key];
      if (!cur) state.dse = ''; else if (dseNorm(cur) !== state.dse) { state.dse = dseNorm(cur); }
    }
    if (!state.dse) {   // a DSE drilled into inside a menu shows up in the header too
      var nm = state.pjDse || state.poDse || (state.visitsDse ? (dseByPid(state.visitsDse) || {}).name : null);
      if (nm && dseGet(nm)) state.dse = dseNorm(nm);
    }
    if (state.dse) {
      var d = dseGet(state.dse);
      if (!d || !dseInHeaderScope(d)) { dseClear(); return; }
      state.pjDse = d.name; state.poDse = d.name; state.visitsDse = d.pid || null;
    }
  }
  function dseHeaderHtml() {
    var L = dseDir(), inScope = L.filter(dseInHeaderScope);
    var sel = '<label class="field">DSE · kode<select data-dse-sel="1" aria-label="Pilih DSE (nama dan kode) di dalam MC / area terpilih"><option value="">All DSE (' + fmtCount(inScope.length) + ')</option>' + inScope.map(function (d) { return '<option value="' + esc(d.name) + '"' + (state.dse === d.name ? ' selected' : '') + '>' + esc(d.text) + '</option>'; }).join('') + '</select></label>';
    var dl = '<datalist id="dseList">' + L.map(function (d) { return '<option value="' + esc(d.text) + '" label="' + esc((d.mc + ' · ' + d.br + (d.codes.length > 1 ? ' · ' + d.codes.slice(1).join(' · ') : '') + (d.pid ? ' · ' + d.pid : '')).slice(0, 120)) + '"></option>'; }).join('') + '</datalist>';
    var cur = state.dse ? (dseGet(state.dse) || {}).text || '' : '';
    var search = '<label class="field">Cari DSE (nama / kode)<input type="search" id="dseSearch" list="dseList" autocomplete="off" placeholder="mis. Rizky atau DSEKEBAY768" value="' + esc(cur) + '" aria-label="Cari DSE berdasarkan nama atau kode; Enter memilih hasil pertama"></label>' + dl;
    return sel + search;
  }
  function dseSearchPick(q) {
    q = dseNorm(q); if (!q) return null;
    var L = dseDir(), i;
    for (i = 0; i < L.length; i++) if (dseNorm(L[i].text) === q) return L[i];
    var hits = L.filter(function (d) { return d.hay.indexOf(q) !== -1; });
    var pref = hits.filter(function (d) { return d.name.indexOf(q) === 0 || d.codes.some(function (c) { return c.indexOf(q) === 0; }) || d.pid === q; });
    return (pref.length ? pref : hits)[0] || null;
  }
  function renderFilters() {
    var fEl = $('#filters');
    if (!fEl) return;
    // Overall Performance SA/MC carries its own main filter; hide the header bar there so there is one filter only
    if (fEl.style) fEl.style.display = state.view === 'mb_overall' ? 'none' : '';
    var html = FIELDS.map(function (f, i) {
      var up = FIELDS.slice(0, i);
      var pool = KEC.filter(function (r) { return up.every(function (u) { return !state[u[0]] || r[u[0]] === state[u[0]]; }); });
      var vals = pool.map(function (r) { return r[f[0]]; }).filter(function (v, j, a) { return a.indexOf(v) === j; });
      return '<label class="field">' + f[1] + '<select data-f="' + f[0] + '"><option value="">All</option>' + vals.map(function (v) {
        return '<option' + (state[f[0]] === v ? ' selected' : '') + '>' + esc(v) + '</option>';
      }).join('') + '</select></label>';
    }).join('');
    html += dseHeaderHtml();
    var upTo = (state.pjDse || state.poDse || state.visitsDse) ? 'Micro Cluster' : state.kec ? 'Head of Area / Branch' : (state.hoa ? 'Branch' : (state.branch ? 'semua Branch' : ''));
    var back = '<button type="button" class="btn" data-act="up"' + (upTo ? '' : ' disabled aria-disabled="true"') + ' title="Naik satu tingkat">◀ Kembali' + (upTo ? ' ke ' + upTo : '') + '</button> ';
    fEl.innerHTML = html + back + '<button type="button" class="btn" data-act="clear">Clear filter</button>';
  }
  function scopeText() {
    var p = FIELDS.filter(function (f) { return state[f[0]]; }).map(function (f) { return f[1] + ' ' + state[f[0]]; });
    return p.length ? p.join(' · ') : 'All Inner Jakarta';
  }
  function cleanupStaleMaps() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    ['_jakartaMapInstance', '_inactMapInstance', '_mbMapInstance', '_opdMapInstance'].forEach(function (k) {
      var m = window[k];
      if (!m) return;
      var c = null; try { c = m.getContainer(); } catch (e) {}
      if (!c || !document.body.contains(c)) { try { m.stop(); m._animatingZoom = false; } catch (e) {} try { m.remove(); } catch (e) {} window[k] = null; }
    });
  }
  var TOT_ST = 'background:var(--ij-ink); color:#fff; font-weight:800;';
  function totNum(v) { return '<td class="num">' + v + '</td>'; }
  /* ================= DSE coverage line: kecamatan and desa covered by each DSE, shown under the DSE name in every table (lowercase) ================= */
  var _dseCov = null;
  function dseCoverMap() {
    // Coverage is built offline from the lat / long of each DSE's outlets (scripts/build_dse_coverage.py -> window.DSE_COVERAGE)
    var C = (typeof window !== 'undefined' && window.DSE_COVERAGE) ? window.DSE_COVERAGE : null;
    if (!C) return null;
    if (_dseCov && _dseCov.src === C) return _dseCov.map;
    var map = {};
    Object.keys(C.dses || {}).forEach(function (n) {
      var e = C.dses[n], K = e.k.map(function (x) { return x[0]; }), D = e.d.map(function (x) { return x[0]; });
      var kk = K.slice(0, 4), dd = D.slice(0, 6);
      map[n] = { line: 'kec: ' + (kk.join(', ') || '-') + (K.length > 4 ? ' +' + (K.length - 4) : '') + ' · desa: ' + (dd.join(', ') || '-') + (D.length > 6 ? ' +' + (D.length - 6) : ''),
        title: 'berdasarkan lat/long ' + e.nc + ' dari ' + e.n + ' outlet yang dia cover | kecamatan: ' + K.join(', ') + ' | desa: ' + D.join(', ') };
    });
    _dseCov = { src: C, map: map };
    return map;
  }
  function dseCoverEnhance(root) {
    if (!root || !root.querySelectorAll) return;
    var map = dseCoverMap(); if (!map) return;
    // The line is shown the first time a DSE appears in a table; later rows of the same table only carry it as a tooltip (keeps outlet lists readable).
    [].forEach.call(root.querySelectorAll('table'), function (tb) {
      var seen = {};
      [].forEach.call(tb.querySelectorAll('td'), function (td) {
        if (td.querySelector('.dse-cov')) return;
        var b = td.querySelector('b'), n = '', hit = null;
        if (b) { n = (b.textContent || '').replace(/\.0$/, '').trim().toUpperCase(); hit = map[n]; }
        else if (!td.children.length && td.colSpan <= 2) { n = (td.textContent || '').replace(/\.0$/, '').trim().toUpperCase(); hit = map[n]; }
        if (!hit && !b && td.colSpan <= 2) {          // cell such as "NAME rural" or "NAME · 12 outlet"
          var m = (td.textContent || '').trim().toUpperCase().match(/^([A-Z0-9][A-Z0-9 .'\-]*?)(?:\s*[·(]|\s+RURAL\b|$)/);
          if (m) { n = m[1].trim(); hit = map[n]; }
        }
        if (!hit) return;
        if (seen[n]) { td.title = hit.title; return; }
        seen[n] = 1;
        var d = document.createElement('div');
        d.className = 'dse-cov'; d.textContent = hit.line; d.title = hit.title;
        td.appendChild(d);
      });
    });
  }
  /* ================= Sortable tables: every table gets ▲ / ▼ on its column headers (sorts the rows in the DOM) ================= */
  var TSORT = {};   // table key -> { col, dir }; survives re-renders so a sort stays when filters or tabs change
  var TS_SKIP = '[data-mx-expand], [data-mx-toggle], [data-nv-outlet-grp], [data-nv-site-grp], [data-unvis-group]';
  var TS_EMPTY = /^(—|–|-|·|\.|n\/a|tanpa unit|tanpa target|tanpa data|tanpa supply)?$/i;
  function tsNum(txt) {
    var s = String(txt == null ? '' : txt).replace(/ /g, ' ').trim();
    if (TS_EMPTY.test(s)) return null;
    s = s.replace(/^Rp\s*/i, '').replace(/^\+/, '');
    var m = s.match(/^([−-])?\s*(\d[\d,]*(?:\.\d+)?)(?:\s*(M|Jt|Rb|K)\b)?/);
    if (!m) return null;
    var v = parseFloat(m[2].replace(/,/g, '')); if (isNaN(v)) return null;
    return (m[1] ? -1 : 1) * v * ({ M: 1e9, Jt: 1e6, Rb: 1e3, K: 1e3 }[m[3]] || 1);
  }
  function tsSpan(tr) { var n = 0; for (var i = 0; i < tr.cells.length; i++) n += tr.cells[i].colSpan || 1; return n; }
  function tsCellAt(tr, col) {   // the single-column cell sitting at grid column col (cells that span several columns have no value of their own)
    var p = 0;
    for (var i = 0; i < tr.cells.length; i++) { var c = tr.cells[i], s = c.colSpan || 1; if (col >= p && col < p + s) return s === 1 ? c : null; p += s; }
    return null;
  }
  function tsIsTotal(tr) {   // a total row names itself in one of its first three cells (the first can be an empty rank cell)
    if (/background:\s*var\(--ink\)/.test((tr.getAttribute('style') || '').toLowerCase())) return true;   // ink-filled total rows (Region / branch total at the top of a summary)
    for (var i = 0; i < Math.min(3, tr.cells.length); i++) if (/^[▶▼▾▸\s]*(total|semua |seluruh|region|inner jakarta|all inner|grand)/i.test((tr.cells[i].textContent || '').trim())) return true;
    return false;
  }
  function tsRowKind(tr, ncols) {
    var st = (tr.getAttribute('style') || '').toLowerCase(), cells = tr.cells;
    if (!cells.length) return { k: 'fixed' };
    var span = tsSpan(tr), ink = /background:\s*var\(--ij-ink\)/.test(st), w = /font-weight:\s*(700|800|900)/.test(st);
    if (cells.length === 1 && span >= Math.max(2, ncols - 2) && !ink && !w) return { k: 'child' };   // detail row that belongs to the row above
    if (span !== ncols || tsIsTotal(tr)) return { k: 'fixed' };                                      // totals and odd rows stay where they are
    if (ink) return { k: 'header', level: 0 };                                                        // group header rows move together with their children
    if (w) return { k: 'header', level: /font-weight:\s*700/.test(st) ? 2 : 1 };
    if (/font-weight:\s*600/.test(st) && cells[0].colSpan > 1) return { k: 'header', level: 3 };   // DSE header rows (Area > MC > DSE)
    return { k: 'data' };
  }
  function tsTree(info) {
    var root = { rows: [], level: -1, kids: [] }, stack = [root], last = null;
    [].slice.call(info.tbody.rows).forEach(function (tr) {
      var k = tsRowKind(tr, info.ncols);
      if (k.k === 'child') { if (last && !last.fixed) { last.rows.push(tr); return; } k = { k: 'fixed' }; }
      if (k.k === 'fixed') { stack = [root]; last = { rows: [tr], fixed: true, oi: tr.__oi }; root.kids.push(last); return; }
      if (k.k === 'header') {
        while (stack[stack.length - 1].level >= k.level) stack.pop();
        last = { rows: [tr], level: k.level, kids: [], oi: tr.__oi }; stack[stack.length - 1].kids.push(last); stack.push(last); return;
      }
      last = { rows: [tr], leaf: true, oi: tr.__oi }; stack[stack.length - 1].kids.push(last);
    });
    return root;
  }
  function tsNodes(node, out) { node.kids.forEach(function (n) { if (!n.fixed) out.push(n); if (n.kids) tsNodes(n, out); }); return out; }
  function tsColumn(root, col) {   // reads the column once: numeric or text, and whether it holds any value at all
    var ne = 0, num = 0;
    tsNodes(root, []).forEach(function (n) {
      var c = tsCellAt(n.rows[0], col), txt = c ? (c.textContent || '').trim() : '', v = c ? tsNum(txt) : null;
      n.v = { n: v, t: txt.toLowerCase(), e: !c || TS_EMPTY.test(txt) };
      if (!n.v.e) { ne++; if (v != null) num++; }
    });
    return { numeric: ne > 0 && num >= ne * 0.6, any: ne > 0 };
  }
  function tsSortKids(node, C, dir) {
    var out = [], run = [], sgn = dir === 'asc' ? 1 : -1;
    var flush = function () {
      if (run.length) {
        run.sort(function (a, b) {
          if (dir) {
            var x = a.v, y = b.v, xe = C.numeric ? x.n == null : x.e, ye = C.numeric ? y.n == null : y.e;
            if (xe !== ye) return xe ? 1 : -1;                         // empty values always last
            if (!xe) { var d = C.numeric ? x.n - y.n : x.t.localeCompare(y.t, 'id', { numeric: true }); if (d) return sgn * d; }
          }
          return a.oi - b.oi;
        });
        out = out.concat(run); run = [];
      }
    };
    node.kids.forEach(function (n) { if (n.fixed) { flush(); out.push(n); } else run.push(n); });
    flush(); node.kids = out;
    out.forEach(function (n) { if (n.kids) tsSortKids(n, C, dir); });
  }
  function tsFlatten(node, out) { node.kids.forEach(function (n) { n.rows.forEach(function (tr) { out.push(tr); }); if (n.kids) tsFlatten(n, out); }); return out; }
  function tsApply(info, col, dir) {
    var root = tsTree(info), C = dir ? tsColumn(root, col) : null;
    tsSortKids(root, C, dir);
    tsFlatten(root, []).forEach(function (tr) { info.tbody.appendChild(tr); });
    info.leaf.forEach(function (l) {
      var on = dir && l.c0 === col;
      l.th.setAttribute('aria-sort', on ? (dir === 'asc' ? 'ascending' : 'descending') : 'none');
      [].forEach.call(l.th.querySelectorAll('.ts-sbw .dk-sb'), function (b) { var is = on && b.getAttribute('data-tsort') === dir; b.classList.toggle('on', is); b.setAttribute('aria-pressed', is ? 'true' : 'false'); });
    });
  }
  function tsPaged(card) {
    if (!card) return false;
    var bs = card.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) { var at = bs[i].attributes; for (var j = 0; j < at.length; j++) if (/page$/.test(at[j].name) && /^(prev|next)$/.test(at[j].value)) return true; }
    return false;
  }
  function tsEnhanceTable(tb, keyBase, seen) {
    if (tb.hasAttribute('data-nosort') || tb.querySelector('.dk-sb') || tb.querySelector(TS_SKIP)) return;
    var thead = tb.tHead, tbody = tb.tBodies[0];
    if (!thead || !tbody || !thead.rows.length || tbody.rows.length < 2) return;
    var hr = [].slice.call(thead.rows), grid = [], cells = [];
    hr.forEach(function (tr, r) {
      grid[r] = grid[r] || []; var c = 0;
      [].forEach.call(tr.cells, function (cell) {
        while (grid[r][c]) c++;
        var rs = cell.rowSpan || 1, cs = cell.colSpan || 1;
        for (var i = 0; i < rs; i++) { grid[r + i] = grid[r + i] || []; for (var j = 0; j < cs; j++) grid[r + i][c + j] = cell; }
        cells.push({ th: cell, c0: c, cs: cs, r: r, rs: rs }); c += cs;
      });
    });
    var ncols = grid[hr.length - 1].length;
    if (ncols < 2) return;
    var leaf = cells.filter(function (x) { return x.cs === 1 && x.r + x.rs === hr.length && (x.th.textContent || '').trim(); });
    if (!leaf.length) return;
    [].forEach.call(tbody.rows, function (tr, i) { tr.__oi = i; });
    var info = { tbody: tbody, ncols: ncols, leaf: [], key: '' };
    var root = tsTree(info);
    if (tsNodes(root, []).length < 2) return;
    var sig = leaf.map(function (x) { return (x.th.textContent || '').trim().slice(0, 18); }).join('|');
    seen[sig] = (seen[sig] || 0) + 1; info.key = keyBase + '|' + sig + '|' + seen[sig];
    var skipLabels = /^(detail|rincian|aksi|peta|lihat|map|pjp|#)$/i, any = false;
    leaf.forEach(function (x) {
      var label = (x.th.textContent || '').trim();
      if (skipLabels.test(label) || !tsColumn(root, x.c0).any) return;
      x.th.insertAdjacentHTML('beforeend', '<span class="dk-sbw ts-sbw"><button type="button" class="dk-sb" data-tsort="asc" aria-pressed="false" aria-label="Urutkan ' + esc(label) + ' naik (kecil ke besar)">▲</button><button type="button" class="dk-sb" data-tsort="desc" aria-pressed="false" aria-label="Urutkan ' + esc(label) + ' turun (besar ke kecil)">▼</button></span>');
      x.th.setAttribute('data-tcol', x.c0); info.leaf.push(x); any = true;
    });
    if (!any) return;
    tb.__ts = info;
    var cur = TSORT[info.key]; if (cur) tsApply(info, cur.col, cur.dir);
    var host = tb.closest('.tbl-wrap') || tb;
    if (tsPaged(tb.closest('.card')) && !(host.nextElementSibling && host.nextElementSibling.classList.contains('ts-hint'))) {
      var hint = document.createElement('p'); hint.className = 'note ts-hint'; hint.textContent = '▲▼ mengurutkan baris yang tampil di halaman ini; gunakan halaman lain atau filter untuk melihat sisanya.';
      host.parentNode.insertBefore(hint, host.nextSibling);
    }
  }
  function tsEnhance(root) {
    if (!root || !root.querySelectorAll) return;
    var seen = {}, base = state.view;
    [].forEach.call(root.querySelectorAll('table'), function (tb) { try { tsEnhanceTable(tb, base, seen); } catch (err) { /* a table that cannot be enhanced stays as it was */ } });
  }
  function tsHandle(btn) {
    var tb = btn.closest('table'), th = btn.closest('th'); if (!tb || !tb.__ts || !th) return;
    var info = tb.__ts, col = parseInt(th.getAttribute('data-tcol'), 10), dir = btn.getAttribute('data-tsort'), cur = TSORT[info.key];
    if (cur && cur.col === col && cur.dir === dir) { delete TSORT[info.key]; tsApply(info, col, null); }   // pressing the active arrow again restores the original order
    else { TSORT[info.key] = { col: col, dir: dir }; tsApply(info, col, dir); }
  }
  function render() {
    cleanupStaleMaps();
    dseSync();
    renderFilters();
    var t = $('#title'), p = $('#purpose'), c = $('#cut'), s = $('#scope'), v = $('#view');
    if (t) t.textContent = META[state.view][0];
    if (p) p.textContent = META[state.view][1];
    if (c) { c.textContent = cutLabel() + ' · Governed Local Feed'; c.title = 'PJP visits and balance exports end ' + pjpCut() + '; DAILY_DATA_MOBII Sell-In (refresh 14 Oct) ends 13 Oct 2026; MOBI physical distribution ends 10 Oct 2026. Feeds rebuilt from the latest raw files on 14 Oct 2026.'; }
    if (s) s.textContent = scopeText() + (state.dse ? ' · DSE ' + ((dseGet(state.dse) || {}).label || state.dse) : '');
    if (v) { v.innerHTML = VIEWS[state.view](); tsEnhance(v); dseCoverEnhance(v); }
    cleanupStaleMaps();   // the replaced HTML may have detached a live Leaflet map
    if (typeof document !== 'undefined' && document.querySelectorAll) {
      Array.prototype.forEach.call(document.querySelectorAll('.nav button'), function (b) {
        if (b.getAttribute('data-view') === state.view) {
          b.setAttribute('aria-current', 'page');
          b.classList.add('active');
        } else {
          b.removeAttribute('aria-current');
          b.classList.remove('active');
        }
      });
    }
    if (state.view === 'map' || (state.view === 'territory' && state.terrSubView === 'map')) {
      setTimeout(function () {
        initJakartaMap();
        setupMapSearchInput();
      }, 60);
    }
    if (state.view === 'mb_ringkasan') { setTimeout(initBriefMap, 60); setTimeout(initOpdMap, 60); }
    if (typeof document !== 'undefined' && document.getElementById('inactivity-map')) {
      setTimeout(initInactivityMap, 60);
    }
  }
  function onClick(e) {
    var t = e.target.closest('button, [data-view], [data-period], [data-svd], [data-key], [data-act], [data-terr-sub], [data-terr-page], [data-terr-grp-page], [data-terr-outlet], [data-terr-drill], [data-map-layer], [data-map-status], [data-map-search-idx], [data-visits-sub], [data-visits-scope], [data-visits-brand], [data-visits-page], [data-visits-drill], [data-visits-level], [data-visits-detail], [data-unvis-entity], [data-unvis-group], [data-unvis-sel], tr[data-unvis-sel], [data-unvis-site], tr[data-unvis-site], [data-unvis-gomap], [data-inact-sort], [data-nv-outlet-grp], tr[data-nv-outlet-grp], [data-nv-site-grp], tr[data-nv-site-grp], [data-inact-flag], [data-sitemap-focus], [data-pj-tab], [data-pj-brand], [data-pj-cat], [data-pj-level], [data-pj-detail], [data-pj-page], [data-pj-slabcom], [data-pj-slabprod], [data-pj-slabent], [data-po-tab], [data-po-brand], [data-po-cat], [data-po-level], [data-po-detail], [data-po-page], [data-po-adhoc], [data-po-slabcom], [data-po-slabent], [data-po-prodcat], [data-op-tab], [data-op-program], [data-op-page], [data-op-cat], [data-op-basis], [data-op-week], [data-sellin-src], [data-sellin-brand], [data-sellin-cat], [data-sellin-flow], [data-sellin-level], [data-sellin-page], [data-sellin-drill], [data-sellin-sub], [data-sellin-loc], [data-sellin-group], [data-sellin-tab], [data-sellin-day], [data-sellin-pm], [data-sellin-pmode], [data-pjp-day], [data-pjp-opage], [data-mb-metric], [data-mb-poly], td[data-pjp-day], th[data-pjp-day], [data-rk-tab], [data-ga-tab], [data-ga-seg], [data-ga-page], [data-sga-tab], [data-sga-metric], [data-sga-base], [data-sga-thr], [data-sga-seg], [data-sga-flag], [data-sga-page], [data-pj-mxarea], [data-pj-mxmc], [data-pj-mxall], [data-uar-sub], [data-uar-seg], [data-uar-page], [data-uar-tab], [data-uar-vc], [data-uar-thr], [data-uar-toggle], [data-uar-expand], [data-cf-tab], [data-cf-basis], [data-cf-toggle], [data-cf-expand], [data-cf-page], [data-dk-sp], [data-eb-tab], [data-eb-basis], [data-eb-seg], [data-eb-page], [data-eb-open], [data-eb-toggle], [data-eb-expand], [data-eb-site], [data-eb-export], [data-dk-basis], [data-dk-osa], [data-dk-ec], [data-dk-sort], [data-dk-page], [data-dk-drill], [data-dk-open], [data-pj-group], [data-pjp-tab], [data-mx-sel], [data-mx-page], [data-mx-site], [data-mx-toggle], [data-mx-expand], [data-pj-mx], tr[data-pj-mx], [data-pj-mxbrand], [data-pj-mxpage], tr[data-key], tr[data-terr-outlet]');
    if (!t) return;
    if (t.hasAttribute('data-tsort')) { tsHandle(t); return; }
    if (t.disabled || t.getAttribute('aria-disabled') === 'true') return;   // temporarily disabled menu items
    if (t.hasAttribute('data-view')) { state.view = t.getAttribute('data-view'); state.sel = null; }
    else if (t.hasAttribute('data-period')) { state.period = t.getAttribute('data-period'); }
    else if (t.hasAttribute('data-svd')) { state.svd = t.getAttribute('data-svd'); }
    else if (t.hasAttribute('data-terr-sub')) {
      state.terrSubView = t.getAttribute('data-terr-sub');
      state.terrPage = 1;
      state.terrGroupPage = 1;
    }
    else if (t.hasAttribute('data-map-layer')) {
      if (t.tagName === 'INPUT') return;
      var ml = t.getAttribute('data-map-layer');
      if (ml === 'branch') state.mapShowBranches = !state.mapShowBranches;
      else if (ml === 'mc') state.mapShowMcs = !state.mapShowMcs;
      else if (ml === 'kec') state.mapShowKec = !state.mapShowKec;
      else if (ml === 'site') state.mapShowSites = !state.mapShowSites;
      else if (ml === 'outlet') state.mapShowOutlets = !state.mapShowOutlets;
      render();
      return;
    }
    else if (t.hasAttribute('data-map-status')) {
      state.mapOutletFilter = t.getAttribute('data-map-status');
      render();
      return;
    }
    else if (t.getAttribute('data-act') === 'close-map-drawer') {
      state.mapSelectedProfile = null;
      render();
      return;
    }
    else if (t.getAttribute('data-act') === 'map-reset') {
      state.mapSelectedScope = 'all';
      state.mapOutletFilter = 'all';
      state.mapSearch = '';
      state.mapSelectedProfile = null;
      if (window._jakartaMapInstance) {
        window._jakartaMapInstance.setView([-6.225, 106.845], 11);
      }
      render();
      return;
    }
    else if (t.hasAttribute('data-map-search-idx')) {
      var sidx = parseInt(t.getAttribute('data-map-search-idx'), 10);
      var resEl = document.getElementById('mapSearchResults');
      if (resEl && resEl._currentMatches && resEl._currentMatches[sidx]) {
        var mItem = resEl._currentMatches[sidx];
        resEl.style.display = 'none';
        if (window._jakartaMapInstance) {
          window._jakartaMapInstance.flyTo([mItem.lat, mItem.lon], 15);
        }
        if (mItem.type === 'outlet') {
          var r = mItem.raw;
          state.mapSelectedProfile = {
            type: 'outlet',
            data: {
              key: r[0], name: r[1], lat: r[2], long: r[3],
              site_nbs: r[4], dist_km: r[5], dse_name: r[6], dse_code: r[7],
              micro_cluster: r[8], dso_leader: r[9], branch: r[10], hoa_leader: r[11],
              kecamatan: r[12], desa: r[13]
            }
          };
        } else if (mItem.type === 'site') {
          state.mapSelectedProfile = { type: 'site', data: mItem.raw };
        } else if (mItem.type === 'mc') {
          state.mapSelectedProfile = { type: 'mc', data: mItem.raw };
        }
        render();
        return;
      }
    }
    else if (t.hasAttribute('data-terr-page')) {
      var dir = t.getAttribute('data-terr-page');
      if (dir === 'prev' && state.terrPage > 1) state.terrPage--;
      else if (dir === 'next') state.terrPage++;
    }
    else if (t.hasAttribute('data-terr-grp-page')) {
      var gdir = t.getAttribute('data-terr-grp-page');
      if (gdir === 'prev' && state.terrGroupPage > 1) state.terrGroupPage--;
      else if (gdir === 'next') state.terrGroupPage++;
    }
    else if (t.hasAttribute('data-terr-outlet')) {
      var k = t.getAttribute('data-terr-outlet');
      state.terrSelectedKey = (state.terrSelectedKey === k) ? null : k;
    }
    else if (t.getAttribute('data-act') === 'terr-expand-all') {
      state.terrExpandAll = true;
      if (typeof document !== 'undefined') {
        var elList = document.querySelectorAll('details.terr-group');
        for (var i = 0; i < elList.length; i++) elList[i].open = true;
      }
      return;
    }
    else if (t.getAttribute('data-act') === 'terr-collapse-all') {
      state.terrExpandAll = false;
      if (typeof document !== 'undefined') {
        var elList2 = document.querySelectorAll('details.terr-group');
        for (var j = 0; j < elList2.length; j++) elList2[j].open = false;
      }
      return;
    }
    else if (t.hasAttribute('data-terr-drill')) {
      var br = t.getAttribute('data-br'), mc = t.getAttribute('data-mc');
      if (br) state.branch = br;
      if (mc) state.kec = mc;
      state.view = 'territory';
      state.terrSubView = 'chain';
      state.terrPage = 1;
      state.terrGroupPage = 1;
    }
    else if (t.getAttribute('data-act') === 'close-terr-drawer') {
      state.terrSelectedKey = null;
    }
    else if (t.getAttribute('data-act') === 'export-terr-csv') {
      var terr = (typeof window !== 'undefined' && window.TERRITORY_FEED) ? window.TERRITORY_FEED : null;
      if (terr && terr.outlets) {
        var filteredList = filterTerritoryOutlets(terr.outlets);
        exportTerritoryCsv(filteredList);
      }
      return;
    }
    else if (t.getAttribute('data-act') === 'mb-dse-clear') { state.visitsDse = null; state.visitsLevel = 'auto'; state.visitsPage = 1; }
    else if (t.hasAttribute('data-pj-group')) { state.pjGroupBy = t.getAttribute('data-pj-group'); }
    else if (t.hasAttribute('data-pj-prodview')) { state.pjProdView = t.getAttribute('data-pj-prodview'); }
    else if (t.hasAttribute('data-pj-topby')) { state.pjTopBy = t.getAttribute('data-pj-topby'); }
    else if (t.hasAttribute('data-ga-tab')) { state.gaTab = t.getAttribute('data-ga-tab'); state.gaPage = 1; }
    else if (t.hasAttribute('data-ga-seg')) { state.gaSeg = t.getAttribute('data-ga-seg'); state.gaPage = 1; }
    else if (t.hasAttribute('data-ga-basis')) { state.gaBasis = t.getAttribute('data-ga-basis'); state.gaPage = 1; }
    else if (t.hasAttribute('data-ga-brand')) { state.gaBrand = t.getAttribute('data-ga-brand'); state.gaPage = 1; }
    else if (t.hasAttribute('data-ga-sg')) { state.gaSg = t.getAttribute('data-ga-sg'); state.gaPage = 1; }
    else if (t.hasAttribute('data-ga-cover')) { state.gaCover = t.getAttribute('data-ga-cover'); state.gaPage = 1; }
    else if (t.hasAttribute('data-ga-page')) { var gad = t.getAttribute('data-ga-page'); if (gad === 'prev' && state.gaPage > 1) state.gaPage--; else if (gad === 'next') state.gaPage++; }
    else if (t.getAttribute('data-act') === 'ga-export') { gaExportCsv(); return; }
    else if (t.hasAttribute('data-sga-tab')) { state.sgaTab = t.getAttribute('data-sga-tab'); state.sgaPage = 1; }
    else if (t.hasAttribute('data-sga-metric')) { state.sgaMetric = t.getAttribute('data-sga-metric'); state.sgaPage = 1; state.sgaSeg = 'all'; }
    else if (t.hasAttribute('data-sga-base')) { state.sgaBase = t.getAttribute('data-sga-base'); state.sgaPage = 1; }
    else if (t.hasAttribute('data-sga-thr')) { state.sgaThr = state.sgaThr || {}; state.sgaThr[state.sgaMetric || 'si'] = parseInt(t.getAttribute('data-sga-thr'), 10); state.sgaPage = 1; }
    else if (t.hasAttribute('data-sga-seg')) { state.sgaSeg = t.getAttribute('data-sga-seg'); state.sgaPage = 1; }
    else if (t.hasAttribute('data-sga-flag')) { state.sgaFlag = t.getAttribute('data-sga-flag'); state.sgaPage = 1; }
    else if (t.hasAttribute('data-sga-page')) { var sgd = t.getAttribute('data-sga-page'); if (sgd === 'prev' && state.sgaPage > 1) state.sgaPage--; else if (sgd === 'next') state.sgaPage++; }
    else if (t.getAttribute('data-act') === 'sga-export') { sgExportCsv(); return; }
    else if (t.hasAttribute('data-pj-mxarea')) { var mxa = t.getAttribute('data-pj-mxarea'); state.pjMxAreaClosed = state.pjMxAreaClosed || {}; state.pjMxAreaClosed[mxa] = !state.pjMxAreaClosed[mxa]; }
    else if (t.hasAttribute('data-pj-mxmc')) { var mxm = t.getAttribute('data-pj-mxmc'), mxo = state.pjMxMc || (state.pjMxMc = {}), mxcur = mxo[mxm] != null ? !!mxo[mxm] : (state.pjMxMcAll != null ? state.pjMxMcAll : !!state.kec); mxo[mxm] = !mxcur; }
    else if (t.hasAttribute('data-pj-mxall')) { state.pjMxMcAll = t.getAttribute('data-pj-mxall') === 'open'; state.pjMxMc = {}; }
    else if (t.hasAttribute('data-pj-mx')) { var mxk = t.getAttribute('data-pj-mx'); state.pjMxSel = (state.pjMxSel === mxk) ? null : mxk; }
    else if (t.hasAttribute('data-pj-mxbrand')) { state.pjMxBrand = t.getAttribute('data-pj-mxbrand'); state.pjMxSel = null; state.pjMxPage = 1; }
    else if (t.hasAttribute('data-pj-mxpage')) { var mxd = t.getAttribute('data-pj-mxpage'); if (mxd === 'prev' && (state.pjMxPage || 1) > 1) state.pjMxPage--; else if (mxd === 'next') state.pjMxPage = (state.pjMxPage || 1) + 1; }
    else if (t.hasAttribute('data-pjp-tab')) { state.pjpTab = t.getAttribute('data-pjp-tab'); }
    else if (t.hasAttribute('data-mx-sel')) {
      var mk = t.getAttribute('data-mx-sel'), mm = t.getAttribute('data-mx-metric');
      state.mxSel = (mk && mm) ? { key: mk, metric: mm } : null; state.mxPage = 1; state.mxSite = null;
    }
    else if (t.hasAttribute('data-mx-page')) { var md = t.getAttribute('data-mx-page'); if (md === 'prev' && state.mxPage > 1) state.mxPage--; else if (md === 'next') state.mxPage++; }
    else if (t.hasAttribute('data-mx-site')) { state.mxSite = t.getAttribute('data-mx-site') || null; }
    else if (t.hasAttribute('data-mx-toggle')) { var ta = t.getAttribute('data-mx-toggle'); state.mxCollapsed = state.mxCollapsed || {}; state.mxCollapsed[ta] = !state.mxCollapsed[ta]; }
    else if (t.hasAttribute('data-mx-expand')) {
      var mode = t.getAttribute('data-mx-expand'); state.mxCollapsed = {};
      if (mode === 'none') { var vfx = mbVisitsFeed(); if (vfx) mxCompute(vfx).areas.forEach(function (a) { state.mxCollapsed[a.br] = true; }); }
    }
    else if (t.hasAttribute('data-uar-tab')) { state.uarTab = t.getAttribute('data-uar-tab'); state.uarPage = 1; }
    else if (t.hasAttribute('data-uar-sub')) { state.uarSub = t.getAttribute('data-uar-sub'); state.uarPage = 1; }
    else if (t.hasAttribute('data-uar-seg')) { state.uarSeg = state.uarSeg || {}; state.uarSeg[state.uarSub] = t.getAttribute('data-uar-seg'); state.uarPage = 1; }
    else if (t.hasAttribute('data-uar-page')) { var upd = t.getAttribute('data-uar-page'); if (upd === 'prev' && state.uarPage > 1) state.uarPage--; else if (upd === 'next') state.uarPage++; }
    else if (t.getAttribute('data-act') === 'uar-export') { uarExportCsv(); return; }
    else if (t.hasAttribute('data-uar-vc')) { state.uarVc = t.getAttribute('data-uar-vc'); state.uarPage = 1; }
    else if (t.hasAttribute('data-uar-src')) { state.uarSrc = t.getAttribute('data-uar-src'); state.uarPage = 1; }
    else if (t.hasAttribute('data-uar-thr')) { state.uarThr = state.uarThr || {}; state.uarThr[state.uarTab || 'sp'] = parseInt(t.getAttribute('data-uar-thr'), 10); state.uarPage = 1; }
    else if (t.hasAttribute('data-uar-toggle')) { var ut = t.getAttribute('data-uar-toggle'); state.uarCollapsed = state.uarCollapsed || {}; state.uarCollapsed[ut] = !state.uarCollapsed[ut]; }
    else if (t.hasAttribute('data-uar-expand')) { state.uarCollapsed = {}; if (t.getAttribute('data-uar-expand') === 'none') { var uf = pjFeed(); if (uf) Object.keys(uf.metadata.mc_info || {}).forEach(function (m) { state.uarCollapsed[uf.metadata.mc_info[m].br] = true; }); } }
    else if (t.hasAttribute('data-pm-tab')) { state.pmTab = t.getAttribute('data-pm-tab'); }
    else if (t.hasAttribute('data-cf-tab')) { state.cfTab = t.getAttribute('data-cf-tab'); state.cfPage = 1; }
    else if (t.hasAttribute('data-cf-basis')) { state.cfBasis = t.getAttribute('data-cf-basis'); }
    else if (t.hasAttribute('data-cf-toggle')) { var cft = t.getAttribute('data-cf-toggle'); state.cfCollapsed = state.cfCollapsed || {}; state.cfCollapsed[cft] = !state.cfCollapsed[cft]; }
    else if (t.hasAttribute('data-cf-expand')) { state.cfCollapsed = {}; if (t.getAttribute('data-cf-expand') === 'none' && window.TARGET_FEED) window.TARGET_FEED.areas.forEach(function (a) { state.cfCollapsed[a.br] = true; }); }
    else if (t.hasAttribute('data-cf-page')) { var cfd = t.getAttribute('data-cf-page'); if (cfd === 'prev' && state.cfPage > 1) state.cfPage--; else if (cfd === 'next') state.cfPage++; }
    else if (t.hasAttribute('data-dk-sp')) { state.dkSp = t.getAttribute('data-dk-sp'); state.dkPage = 1; }
    else if (t.hasAttribute('data-eb-tab')) { state.ebTab = t.getAttribute('data-eb-tab'); state.ebPage = 1; state.ebSite = null; }
    else if (t.hasAttribute('data-eb-basis')) { state.ebBasis = t.getAttribute('data-eb-basis'); state.ebPage = 1; }
    else if (t.hasAttribute('data-eb-seg')) { state.ebSeg = t.getAttribute('data-eb-seg'); state.ebPage = 1; }
    else if (t.hasAttribute('data-eb-page')) { var ebd = t.getAttribute('data-eb-page'); if (ebd === 'prev' && state.ebPage > 1) state.ebPage--; else if (ebd === 'next') state.ebPage++; }
    else if (t.hasAttribute('data-eb-open')) { var ebo = t.getAttribute('data-eb-open'); state.ebOpen = state.ebOpen || {}; state.ebOpen[ebo] = !state.ebOpen[ebo]; }
    else if (t.hasAttribute('data-eb-toggle')) { var ebt = t.getAttribute('data-eb-toggle'); state.ebCollapsed = state.ebCollapsed || {}; state.ebCollapsed[ebt] = !state.ebCollapsed[ebt]; }
    else if (t.hasAttribute('data-eb-expand')) { var ebx = t.getAttribute('data-eb-expand'); state.ebCollapsed = {}; state.ebOpen = {}; if (ebx === 'none') { var ebf = ebFeed(); if (ebf) ebAreas(ebScope(ebf.outlets)).forEach(function (a) { state.ebCollapsed[a] = true; }); } else if (ebx === 'dse') { var ebf2 = ebFeed(); if (ebf2) ebGroupDse(ebScope(ebf2.outlets)).forEach(function (g) { state.ebOpen[g.key] = true; }); } }
    else if (t.hasAttribute('data-eb-site')) { state.ebSite = t.getAttribute('data-eb-site') || null; state.ebPage = 1; }
    else if (t.getAttribute('data-act') === 'eb-export') { var ebf3 = ebFeed(); if (ebf3) ebExportCsv(ebf3); return; }
    else if (t.hasAttribute('data-rk-tab')) { state.rkTab = t.getAttribute('data-rk-tab'); state.dkPage = 1; state.poPage = 1; }
    else if (t.hasAttribute('data-opd-sec')) { state.opdSec = t.getAttribute('data-opd-sec'); state.poPage = 1; }
    else if (t.hasAttribute('data-opd-seg')) { state.opdSeg = t.getAttribute('data-opd-seg'); state.poPage = 1; }
    else if (t.hasAttribute('data-opd-layer')) { var ol = t.getAttribute('data-opd-layer'); state.opdLayers = state.opdLayers || {}; state.opdLayers[ol] = !opdLayerOn(ol); state._opdKeep = true; }
    else if (t.hasAttribute('data-opd-eb')) { state.opdEb = t.getAttribute('data-opd-eb'); state.poPage = 1; }
    else if (t.getAttribute('data-act') === 'print-ps') { window.print(); return; }
    else if (t.getAttribute('data-act') === 'pr-csv') { var prB = opdBase(); if (prB) prCsv(prB); return; }
    else if (t.hasAttribute('data-pr-doc')) { state.prDoc = t.getAttribute('data-pr-doc'); }
    else if (t.hasAttribute('data-pr-mode')) { state.prMode = t.getAttribute('data-pr-mode'); }
    else if (t.hasAttribute('data-dk-basis')) { state.dkBasis = t.getAttribute('data-dk-basis'); state.dkPage = 1; }
    else if (t.hasAttribute('data-dk-osa')) { state.dkOsa = t.getAttribute('data-dk-osa'); state.dkPage = 1; }
    else if (t.hasAttribute('data-dk-ec')) { state.dkEc = t.getAttribute('data-dk-ec'); state.dkPage = 1; }
    else if (t.hasAttribute('data-dk-sort')) { state.dkSort = t.getAttribute('data-dk-sort'); state.dkPage = 1; }
    else if (t.hasAttribute('data-dk-sortcol')) { state.dkSortCol = t.getAttribute('data-dk-sortcol'); state.dkSortDir = t.getAttribute('data-dir') === 'asc' ? 'asc' : 'desc'; state.dkPage = 1; }
    else if (t.hasAttribute('data-dk-groupby')) { state.dkGroupBy = t.getAttribute('data-dk-groupby'); state.dkTog = {}; state.dkAll = null; state.dkPage = 1; }
    else if (t.hasAttribute('data-dk-grp')) { var dgk = t.getAttribute('data-dk-grp'), dgd = parseInt(t.getAttribute('data-depth'), 10) || 0; state.dkTog = state.dkTog || {}; state.dkTog[dgk] = !dkExpanded(dgk, dgd, state.dkGroupBy || 'area_mc'); }
    else if (t.hasAttribute('data-dk-all')) { state.dkAll = t.getAttribute('data-dk-all'); state.dkTog = {}; }
    else if (t.hasAttribute('data-dk-dl')) { dkDownload(t.getAttribute('data-dk-dl')); return; }
    else if (t.hasAttribute('data-dk-fadd')) {
      var fk = (document.getElementById('dkFcol') || {}).value, fo = (document.getElementById('dkFop') || {}).value, f1 = (document.getElementById('dkFv1') || {}).value || '', f2 = (document.getElementById('dkFv2') || {}).value || '', fc = dkCol(fk);
      state.dkFErr = '';
      if (fo === 'ct') { if (!f1.trim()) state.dkFErr = 'Isi teks yang dicari.'; else (state.dkFilters = state.dkFilters || []).push({ k: fk, op: 'ct', s: f1.trim() }); }
      else if (fc.t === 'text') state.dkFErr = 'Kolom ' + fc.label + ' berisi teks: pilih operator "mengandung teks".';
      else {
        var fa = dkParseNum(f1, fc.t), fb = fo === 'bt' ? dkParseNum(f2, fc.t) : null;
        if (fa == null) state.dkFErr = 'Nilai tidak dikenali. Contoh: 40jt, 500rb, 1,5M, 80%, 1500.';
        else if (fo === 'bt' && fb == null) state.dkFErr = 'Untuk "antara" isi kedua nilai (dari dan sampai).';
        else (state.dkFilters = state.dkFilters || []).push({ k: fk, op: fo, a: fa, b: fb });
      }
      state.dkPage = 1;
    }
    else if (t.hasAttribute('data-dk-fdel')) { (state.dkFilters || []).splice(parseInt(t.getAttribute('data-dk-fdel'), 10), 1); state.dkFErr = ''; state.dkPage = 1; }
    else if (t.hasAttribute('data-dk-fclear')) { state.dkFilters = []; state.dkSearch = ''; state.dkFErr = ''; state.dkPage = 1; }
    else if (t.hasAttribute('data-dk-page')) { var dkd = t.getAttribute('data-dk-page'); if (dkd === 'prev' && state.dkPage > 1) state.dkPage--; else if (dkd === 'next') state.dkPage++; }
    else if (t.hasAttribute('data-dk-open')) { var dko = t.getAttribute('data-dk-open'); state.dkOpen = state.dkOpen || {}; state.dkOpen[dko] = !state.dkOpen[dko]; }
    else if (t.hasAttribute('data-dk-drill')) {
      var dkk = t.getAttribute('data-dk-drill');
      if (t.getAttribute('data-dk-lv') === 'area') state.branch = dkk; else { if (t.getAttribute('data-br')) state.branch = t.getAttribute('data-br'); state.kec = dkk; }
      state.dkPage = 1;
    }
    else if (t.hasAttribute('data-pjp-day')) { var pd = parseInt(t.getAttribute('data-pjp-day'), 10); state.pjpDay = pd < 0 ? null : pd; state.pjpOutletPage = 1; }
    else if (t.hasAttribute('data-pjp-opage')) { var pod = t.getAttribute('data-pjp-opage'); if (pod === 'prev' && state.pjpOutletPage > 1) state.pjpOutletPage--; else if (pod === 'next') state.pjpOutletPage++; }
    else if (t.hasAttribute('data-mb-metric')) { state.mbMetric = t.getAttribute('data-mb-metric'); }
    else if (t.hasAttribute('data-mb-poly')) { state.mbPoly = t.getAttribute('data-mb-poly'); }
    else if (t.hasAttribute('data-sellin-tab')) { state.sellinTab = t.getAttribute('data-sellin-tab'); state.sellinGroup = state.sellinTab; state.sellinPage = 1; }
    else if (t.hasAttribute('data-sellin-day')) { state.sellinDay = parseInt(t.getAttribute('data-sellin-day'), 10); state.sellinPage = 1; }
    else if (t.hasAttribute('data-sellin-pm')) { state.sellinProgMetric = t.getAttribute('data-sellin-pm'); }
    else if (t.hasAttribute('data-sellin-pmode')) { state.sellinProgMode = t.getAttribute('data-sellin-pmode'); }
    else if (t.hasAttribute('data-sellin-sub')) { state.sellinSub = t.getAttribute('data-sellin-sub'); state.sellinPage = 1; }
    else if (t.hasAttribute('data-sellin-loc')) { state.sellinLoc = t.getAttribute('data-sellin-loc'); }
    else if (t.hasAttribute('data-sellin-group')) {
      state.sellinGroup = t.getAttribute('data-sellin-group');
      state.sellinCat = state.sellinGroup === 'SP' ? 'SP' : state.sellinGroup === 'VC' ? 'VC' : state.sellinGroup === 'SALDO' ? 'EV' : 'all';
      state.sellinPage = 1;
    }
    else if (t.getAttribute('data-act') === 'export-sellin-summary-csv') {
      var gfeed = sellinFeed();
      if (gfeed) exportSellinSummaryCsv(gfeed, sellinSummaryRows(gfeed, sellinFacts(gfeed)));
      return;
    }
    else if (t.hasAttribute('data-sellin-src')) { state.sellinSrc = t.getAttribute('data-sellin-src'); state.sellinPage = 1; }
    else if (t.hasAttribute('data-sellin-brand')) { state.sellinBrand = t.getAttribute('data-sellin-brand'); state.sellinPage = 1; }
    else if (t.hasAttribute('data-sellin-cat')) { state.sellinCat = t.getAttribute('data-sellin-cat'); state.sellinPage = 1; }
    else if (t.hasAttribute('data-sellin-flow')) { state.sellinFlow = t.getAttribute('data-sellin-flow'); state.sellinPage = 1; }
    else if (t.hasAttribute('data-sellin-level')) { state.sellinLevel = t.getAttribute('data-sellin-level'); state.sellinPage = 1; }
    else if (t.hasAttribute('data-sellin-page')) {
      var sdir = t.getAttribute('data-sellin-page');
      if (sdir === 'prev' && state.sellinPage > 1) state.sellinPage--;
      else if (sdir === 'next') state.sellinPage++;
    }
    else if (t.hasAttribute('data-sellin-drill')) {
      var sl = t.getAttribute('data-sellin-drill');
      if (t.getAttribute('data-br')) state.branch = t.getAttribute('data-br');
      if (t.getAttribute('data-mc')) state.kec = t.getAttribute('data-mc');
      state.sellinLevel = sl === 'area' ? 'mc' : 'kec';
      state.sellinSub = 'details';
      state.sellinPage = 1;
    }
    else if (t.getAttribute('data-act') === 'export-sellin-csv') {
      var sfeed = sellinFeed();
      if (sfeed) exportSellinCsv(sellinCompute(sfeed));
      return;
    }
    else if (t.hasAttribute('data-unvis-entity')) {
      state.unvisEntity = t.getAttribute('data-unvis-entity');
      state.unvisSelected = null;
      state.visitsPage = 1;
    }
    else if (t.hasAttribute('data-unvis-group')) {
      state.unvisGroup = t.getAttribute('data-unvis-group');
      state.unvisSelected = null;
      state.visitsPage = 1;
    }
    else if (t.hasAttribute('data-unvis-sel')) {
      var uk = t.getAttribute('data-unvis-sel');
      state.unvisSelected = state.unvisSelected === uk ? null : uk;
      state.visitsPage = 1;
    }
    else if (t.hasAttribute('data-visits-sub')) {
      state.visitsSubView = t.getAttribute('data-visits-sub');
      state.visitsPage = 1;
    }
    else if (t.hasAttribute('data-visits-scope')) {
      state.visitsDateScope = t.getAttribute('data-visits-scope');
      state.visitsPage = 1;
    }
    else if (t.hasAttribute('data-visits-brand')) {
      state.visitsBrandFilter = t.getAttribute('data-visits-brand');
      state.visitsPage = 1;
    }
    else if (t.hasAttribute('data-visits-page')) {
      var vdir = t.getAttribute('data-visits-page');
      if (vdir === 'prev' && state.visitsPage > 1) state.visitsPage--;
      else if (vdir === 'next') state.visitsPage++;
    }
    else if (t.hasAttribute('data-visits-drill') || t.hasAttribute('data-visits-detail')) {
      // Drill: narrow the territory filter; Auto grouping then regroups to the level below.
      var vbr = t.getAttribute('data-br'), vmc = t.getAttribute('data-mc'), vdse = t.getAttribute('data-dse');
      if (vbr) state.branch = vbr;
      if (vmc) state.kec = vmc;
      if (vdse) state.visitsDse = vdse;
      state.visitsLevel = 'auto';
      if (['exec', 'heat'].indexOf(state.visitsSubView) < 0) state.visitsSubView = 'exec';
      state.visitsPage = 1;
      if (state.view === 'mb_ringkasan') state.view = 'mb_pjp';
    }
    else if (t.hasAttribute('data-pj-tab')) { state.pjTab = t.getAttribute('data-pj-tab'); state.pjPage = 1; }
    else if (t.hasAttribute('data-pj-slabcom')) { state.pjSlabCom = t.getAttribute('data-pj-slabcom'); state.pjSlabProd = state.pjSlabCom === 'SP' ? 'ZERO_ORI3GB' : 'all'; }
    else if (t.hasAttribute('data-pj-slabprod')) { state.pjSlabProd = t.getAttribute('data-pj-slabprod'); }
    else if (t.hasAttribute('data-pj-slabent')) { state.pjSlabEntity = t.getAttribute('data-pj-slabent'); }
    else if (t.hasAttribute('data-op-tab')) { state.opTab = t.getAttribute('data-op-tab'); state.opPage = 1; }
    else if (t.hasAttribute('data-op-program')) { state.opProgram = t.getAttribute('data-op-program'); state.opPage = 1; }
    else if (t.hasAttribute('data-op-cat')) { state.opZeroCat = t.getAttribute('data-op-cat'); state.opPage = 1; }
    else if (t.hasAttribute('data-op-basis')) { state.opRabuBasis = t.getAttribute('data-op-basis'); state.opPage = 1; }
    else if (t.hasAttribute('data-op-week')) { state.opRabuWeek = +t.getAttribute('data-op-week'); state.opPage = 1; }
    else if (t.hasAttribute('data-po-tab')) { state.poTab = t.getAttribute('data-po-tab'); state.poPage = 1; }
    else if (t.hasAttribute('data-po-brand')) { state.poBrand = t.getAttribute('data-po-brand'); state.poPage = 1; }
    else if (t.hasAttribute('data-po-cat')) { state.poCat = t.getAttribute('data-po-cat'); state.poPage = 1; }
    else if (t.hasAttribute('data-po-level')) { state.poLevel = t.getAttribute('data-po-level'); state.poPage = 1; }
    else if (t.hasAttribute('data-po-adhoc')) { state.poAdhoc = t.getAttribute('data-po-adhoc') === '1'; state.poPage = 1; }
    else if (t.hasAttribute('data-po-prodcat')) { state.poProdCat = t.getAttribute('data-po-prodcat'); }
    else if (t.hasAttribute('data-po-prodview')) { state.poProdView = t.getAttribute('data-po-prodview'); }
    else if (t.hasAttribute('data-po-topby')) { state.poTopBy = t.getAttribute('data-po-topby'); }
    else if (t.hasAttribute('data-po-detail')) {
      var qbr = t.getAttribute('data-br'), qmc = t.getAttribute('data-mc'), qdse = t.getAttribute('data-dse');
      if (qbr) state.branch = qbr;
      if (qmc) { state.kec = qmc; var qf = poFeed(); var qmi = qf && qf.metadata.mc_info[qmc]; if (qmi && qmi.br) state.branch = qmi.br; }
      if (qdse) state.poDse = qdse;
      state.poLevel = 'auto'; state.poPage = 1;
    }
    else if (t.hasAttribute('data-po-page')) { var qdir = t.getAttribute('data-po-page'); if (qdir === 'prev' && state.poPage > 1) state.poPage--; else if (qdir === 'next') state.poPage++; }
    else if (t.getAttribute('data-act') === 'clear-po-dse') { state.poDse = null; state.poPage = 1; }
    else if (t.getAttribute('data-act') === 'clear-po-filter') { state.poSearch = ''; state.branch = ''; state.hoa = ''; state.kec = ''; state.poDse = null; state.poBrand = 'all'; state.poCat = 'all'; state.poLevel = 'auto'; state.poAdhoc = true; state.poPage = 1; }
    else if (t.hasAttribute('data-op-page')) { var odir = t.getAttribute('data-op-page'); if (odir === 'prev' && state.opPage > 1) state.opPage--; else if (odir === 'next') state.opPage++; }
    else if (t.hasAttribute('data-pj-spi')) { state.pjSpi = t.getAttribute('data-pj-spi') !== 'off'; state.pjPage = 1; }
    else if (t.hasAttribute('data-pj-brand')) { state.pjBrand = t.getAttribute('data-pj-brand'); state.pjPage = 1; }
    else if (t.hasAttribute('data-pj-cat')) { state.pjCat = t.getAttribute('data-pj-cat'); state.pjPage = 1; }
    else if (t.hasAttribute('data-pj-level')) { state.pjLevel = t.getAttribute('data-pj-level'); state.pjPage = 1; }
    else if (t.hasAttribute('data-pj-detail')) {
      var pbr = t.getAttribute('data-br'), pmc = t.getAttribute('data-mc'), pdse = t.getAttribute('data-dse');
      if (pbr) state.branch = pbr;
      if (pmc) { state.kec = pmc; var pf = pjFeed(); var pmi = pf && pf.metadata.mc_info[pmc]; if (pmi && pmi.br) state.branch = pmi.br; }
      if (pdse) state.pjDse = pdse;
      state.pjLevel = 'auto'; state.pjPage = 1; state.opPage = 1;
    }
    else if (t.hasAttribute('data-pj-page')) {
      var pdir = t.getAttribute('data-pj-page');
      if (pdir === 'prev' && state.pjPage > 1) state.pjPage--; else if (pdir === 'next') state.pjPage++;
    }
    else if (t.getAttribute('data-act') === 'clear-pj-dse') { state.pjDse = null; state.pjPage = 1; }
    else if (t.hasAttribute('data-pj-out-toggle')) { var ok_ = t.getAttribute('data-pj-out-toggle'); state.pjOutOpen = state.pjOutOpen || {}; state.pjOutOpen[ok_] = !pjOutOpen(ok_, ok_.charAt(0)); }
    else if (t.hasAttribute('data-grp-toggle')) { var gk_ = t.getAttribute('data-grp-toggle'); state.grpOpen = state.grpOpen || {}; state.grpOpen[gk_] = t.getAttribute('aria-expanded') !== 'true'; }
    else if (t.getAttribute('data-act') === 'grp-all') { var gt_ = t.getAttribute('data-t'); state.grpAll = state.grpAll || {}; state.grpAll[gt_] = t.getAttribute('data-v'); Object.keys(state.grpOpen || {}).forEach(function (k) { if (k.indexOf(gt_ + '|') === 0) delete state.grpOpen[k]; }); }
    else if (t.getAttribute('data-act') === 'pj-out-all') { state.pjOutAll = t.getAttribute('data-v'); state.pjOutOpen = {}; }
    else if (t.getAttribute('data-act') === 'pj-only-nomtd') { state.pjOnlyNoMtd = !state.pjOnlyNoMtd; state.pjPage = 1; }
    else if (t.getAttribute('data-act') === 'clear-pj-filter') {
      state.pjSearch = ''; state.branch = ''; state.hoa = ''; state.kec = ''; state.pjDse = null; state.pjBrand = 'all'; state.pjCat = 'all'; state.pjLevel = 'auto'; state.pjPage = 1; state.pjOnlyNoMtd = false;
    }
    else if (t.hasAttribute('data-nv-outlet-grp')) {
      var ng = t.getAttribute('data-nv-outlet-grp');
      state.nvSelOutletGrp = state.nvSelOutletGrp === ng ? null : ng;
    }
    else if (t.hasAttribute('data-nv-site-grp')) {
      var ns = t.getAttribute('data-nv-site-grp');
      state.nvSelSiteGrp = state.nvSelSiteGrp === ns ? null : ns;
    }
    else if (t.hasAttribute('data-unvis-gomap')) {
      state.unvisSiteSel = t.getAttribute('data-unvis-gomap');
      state.unvisEntity = 'map';
      state._inactFit = true;
      state.visitsPage = 1;
    }
    else if (t.hasAttribute('data-unvis-site')) {
      var sk = t.getAttribute('data-unvis-site');
      state.unvisSiteSel = state.unvisSiteSel === sk ? null : sk;
      state._inactFit = !!state.unvisSiteSel;
    }
    else if (t.hasAttribute('data-inact-sort')) {
      state.inactSort = t.getAttribute('data-inact-sort');
      state.visitsPage = 1;
    }
    else if (t.getAttribute('data-act') === 'inact-toggle-active') { state.inactShowActive = !state.inactShowActive; }
    else if (t.getAttribute('data-act') === 'inact-map-outlets') { state.inactMapOutlets = !state.inactMapOutlets; state._inactKeepView = true; }
    else if (t.hasAttribute('data-inact-flag')) { state.inactMapFlag = t.getAttribute('data-inact-flag'); state.visitsPage = 1; state._inactKeepView = true; }
    else if (t.hasAttribute('data-sitemap-focus')) { state.unvisSiteSel = t.getAttribute('data-sitemap-focus'); state.unvisEntity = 'map'; state._inactFit = true; }
    else if (t.getAttribute('data-act') === 'inact-map-allsites') { state.inactMapAllSites = !state.inactMapAllSites; }
    else if (t.hasAttribute('data-visits-level')) {
      state.visitsLevel = t.getAttribute('data-visits-level');
      state.visitsPage = 1;
    }
    else if (t.getAttribute('data-act') === 'clear-visits-dse') {
      state.visitsDse = null;
      state.visitsPage = 1;
    }
    else if (t.getAttribute('data-act') === 'clear-visits-filter') {
      state.visitsSearch = '';
      state.branch = '';
      state.hoa = '';
      state.kec = '';
      state.visitsDateScope = 'mtd';
      state.visitsBrandFilter = 'all';
      state.visitsLevel = 'auto';
      state.visitsDse = null;
      state.visitsPage = 1;
      state.unvisSelected = null;
      state.unvisSiteSel = null;
    }
    else if (t.getAttribute('data-act') === 'export-unvisited-csv') {
      var vfeed = (typeof window !== 'undefined' && window.dseVisitsFeed) ? window.dseVisitsFeed : (typeof dseVisitsFeed !== 'undefined' ? dseVisitsFeed : null);
      if (vfeed) exportUnvisitedCsv(unvisCompute(vfeed));
      return;
    }
    else if (t.hasAttribute('data-key')) {
      var lv = t.getAttribute('data-level'), key = t.getAttribute('data-key');
      state.sel = isSel(lv, key) ? null : { level: lv, key: key };
    } else if (t.getAttribute('data-act') === 'up') {
      if (state.dse) dseClear(); else if (state.pjDse) state.pjDse = null; else if (state.poDse) state.poDse = null; else if (state.visitsDse) state.visitsDse = null;
      else if (state.kec) state.kec = ''; else if (state.hoa) state.hoa = ''; else state.branch = '';
      state.sel = null; state.dkPage = 1; state.ebPage = 1; state.cfPage = 1; state.terrPage = 1; state.terrGroupPage = 1; state.visitsPage = 1; state.pjPage = 1; state.poPage = 1;
    } else if (t.getAttribute('data-act') === 'clear') {
      FIELDS.forEach(function (f) { state[f[0]] = ''; });
      dseClear();
      state.sel = null;
      state.terrSearch = '';
      state.terrStatus = 'all';
      state.terrPage = 1;
      state.terrGroupPage = 1;
      state.visitsSearch = '';
      state.visitsPage = 1;
      state.unvisSelected = null;
      state.sellinSearch = '';
      state.sellinPage = 1;
    }
    else if (t.getAttribute('data-act') === 'export') { window.print(); return; }
    else { return; }
    render();
  }
  function onChange(e) {
    if (e.target && e.target.id === 'prDateInput') { state.prDate = e.target.value; render(); return; }
    if (e.target && e.target.id === 'pmDateInput') { state.pmDate = e.target.value; render(); return; }
    if (e.target && e.target.id === 'pjSlabProdSelect') {
      state.pjSlabProd = e.target.value;
      render();
      return;
    }
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-act') === 'terr-status') {
      state.terrStatus = e.target.value;
      state.terrPage = 1;
      state.terrGroupPage = 1;
      render();
      return;
    }
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-act') === 'map-basemap') {
      state.mapBaseLayer = e.target.value;
      render();
      return;
    }
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-act') === 'map-scope') {
      state.mapSelectedScope = e.target.value;
      render();
      return;
    }
    if (e.target && e.target.getAttribute && e.target.hasAttribute('data-map-layer')) {
      var ml = e.target.getAttribute('data-map-layer');
      if (ml === 'branch') state.mapShowBranches = e.target.checked;
      else if (ml === 'mc') state.mapShowMcs = e.target.checked;
      else if (ml === 'kec') state.mapShowKec = e.target.checked;
      else if (ml === 'site') state.mapShowSites = e.target.checked;
      else if (ml === 'outlet') state.mapShowOutlets = e.target.checked;
      render();
      return;
    }
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-act') === 'mb-dse') {
      state.visitsDse = e.target.value || null;
      state.visitsLevel = 'auto';
      state.visitsPage = 1;
      state.pjpOutletPage = 1;
      render();
      return;
    }
    if (e.target && e.target.getAttribute && e.target.getAttribute('data-dse-sel')) {
      if (e.target.value) dseSelect(e.target.value); else dseClear();
      render();
      return;
    }
    var f = e.target.getAttribute && e.target.getAttribute('data-f');
    if (!f) return;
    var idx = FIELDS.map(function (x) { return x[0]; }).indexOf(f);
    state[f] = e.target.value;
    FIELDS.slice(idx + 1).forEach(function (x) { state[x[0]] = ''; });
    if (state.dse) { var dsd = dseGet(state.dse); if (!dsd || !dseInHeaderScope(dsd)) dseClear(); }
    state.sel = null;
    state.terrPage = 1;
    state.terrGroupPage = 1;
    state.visitsPage = 1;
    state.unvisSelected = null;
    state.sellinPage = 1;
    render();
    var again = document.querySelector('select[data-f="' + f + '"]');
    if (again) again.focus();
  }
  function onInput(e) {
    if (e.target && e.target.id === 'dseSearch') {   // picking a suggestion fires input with the exact option text
      var ex = dseNorm(e.target.value), L = dseDir(), hit = null;
      for (var di = 0; di < L.length; di++) if (dseNorm(L[di].text) === ex) { hit = L[di]; break; }
      if (hit) { dseSelect(hit.name); render(); }
      return;
    }
    if (e.target && e.target.id === 'terrSearchInput') {
      state.terrSearch = e.target.value;
      state.terrPage = 1;
      state.terrGroupPage = 1;
      render();
      var input = document.getElementById('terrSearchInput');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
    if (e.target && e.target.id === 'pmSearchInput') {
      state.pmSearch = e.target.value; render();
      var pmi = document.getElementById('pmSearchInput'); if (pmi) { pmi.focus(); pmi.setSelectionRange(pmi.value.length, pmi.value.length); }
      return;
    }
    if (e.target && e.target.id === 'gaSearchInput') {
      state.gaSearch = e.target.value; state.gaPage = 1; render();
      var gai = document.getElementById('gaSearchInput'); if (gai) { gai.focus(); gai.setSelectionRange(gai.value.length, gai.value.length); }
    }
    if (e.target && e.target.id === 'sgaSearchInput') {
      state.sgaSearch = e.target.value; state.sgaPage = 1; render();
      var sgi = document.getElementById('sgaSearchInput'); if (sgi) { sgi.focus(); sgi.setSelectionRange(sgi.value.length, sgi.value.length); }
    }
    if (e.target && e.target.id === 'uarSearchInput') {
      state.uarSearch = e.target.value; state.uarPage = 1; render();
      var uai = document.getElementById('uarSearchInput'); if (uai) { uai.focus(); uai.setSelectionRange(uai.value.length, uai.value.length); }
    }
    if (e.target && e.target.id === 'cfSearchInput') {
      state.cfSearch = e.target.value; state.cfPage = 1; render();
      var cfi = document.getElementById('cfSearchInput'); if (cfi) { cfi.focus(); cfi.setSelectionRange(cfi.value.length, cfi.value.length); }
    }
    if (e.target && e.target.id === 'ebSearchInput') {
      state.ebSearch = e.target.value; state.ebPage = 1; render();
      var ebi = document.getElementById('ebSearchInput'); if (ebi) { ebi.focus(); ebi.setSelectionRange(ebi.value.length, ebi.value.length); }
    }
    if (e.target && e.target.id === 'sellinSearchInput') {
      state.sellinSearch = e.target.value;
      state.sellinPage = 1;
      render();
      var sInput = document.getElementById('sellinSearchInput');
      if (sInput) { sInput.focus(); sInput.setSelectionRange(sInput.value.length, sInput.value.length); }
    }
    if (e.target && e.target.id === 'dkSearchInput') {
      state.dkSearch = e.target.value;
      state.dkPage = 1;
      render();
      var dInput = document.getElementById('dkSearchInput');
      if (dInput) { dInput.focus(); dInput.setSelectionRange(dInput.value.length, dInput.value.length); }
    }
    if (e.target && e.target.id === 'poSearchInput') {
      state.poSearch = e.target.value;
      state.poPage = 1;
      render();
      var qInput = document.getElementById('poSearchInput');
      if (qInput) { qInput.focus(); qInput.setSelectionRange(qInput.value.length, qInput.value.length); }
    }
    if (e.target && e.target.id === 'pjSearchInput') {
      state.pjSearch = e.target.value;
      state.pjPage = 1;
      render();
      var pInput = document.getElementById('pjSearchInput');
      if (pInput) { pInput.focus(); pInput.setSelectionRange(pInput.value.length, pInput.value.length); }
    }
    if (e.target && e.target.id === 'visitsSearchInput') {
      state.visitsSearch = e.target.value;
      state.visitsPage = 1;
      render();
      var vInput = document.getElementById('visitsSearchInput');
      if (vInput) {
        vInput.focus();
        vInput.setSelectionRange(vInput.value.length, vInput.value.length);
      }
    }
  }
  function onKey(e) {
    if (e.target && e.target.id === 'dseSearch') {
      if (e.key === 'Enter') { var pk = dseSearchPick(e.target.value); if (pk) { dseSelect(pk.name); render(); } e.preventDefault(); }
      else if (e.key === 'Escape' && state.dse) { dseClear(); render(); }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr[tabindex], tr[data-key], tr[data-unvis-sel]')) { e.preventDefault(); onClick(e); }
  }
  function init() {
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', onKey);
    render();
  }

  if (typeof document !== 'undefined' && document.addEventListener && typeof module === 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }
  if (typeof module !== 'undefined') {
    module.exports = {
      state: state,
      VIEWS: VIEWS,
      KEC: KEC,
      filterTerritoryOutlets: filterTerritoryOutlets,
      onClick: onClick,
      onChange: onChange,
      onInput: onInput,
      render: render,
      fmtRp: fmtRp,
      fmtCount: fmtCount,
      fmtPct: fmtPct
    };
  }
})();
