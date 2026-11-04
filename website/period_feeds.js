/* Period toggle bootstrap (owner request 4 Nov 2026; docs/assessments/period_toggle.md).
   Two period pairs for the whole report, chosen with `per=` in the shareable link (#/<view>?per=oct&...):
     nov (default)  MTD running month vs LMTD month before   = the live feeds in data/
     oct            Full Month October vs Full Month September = the frozen October close in archive/2026-10/
   Switching reloads the page: the swapped feeds are written as <script> tags before app.js runs, so no cache, index or
   memo of app.js / stock.js / outlet_profile.js can hold data of the other period.
   Not swapped: territory master, map, catalogues, DSE flags, Vanguard (current only) and Review Periode (period_history.js, month-agnostic).
   In the offline bundle (scripts/build_offline_html.py) the same feeds are inline: live ones as plain scripts, the October ones as gzip blobs. */
(function () {
  var ARCHIVE = { month: '2026-10', cur: 'Okt', prev: 'Sep', dir: 'archive/2026-10/' };
  var FEEDS = ['dse_visits_feed', 'sellin_feed', 'penjualan_feed', 'demand_feed', 'dse_kpi_feed', 'endbal_feed', 'target_feed', 'dse_coverage',
    'ga_feed', 'ga_site_feed', 'kro_feed', 'stock_feed'];
  var hash = (typeof window !== 'undefined' && window.location && window.location.hash) || '';
  var per = /[?&]per=oct(?:&|$)/.test(hash) ? 'oct' : 'nov';
  window.IJ_PER = per;
  window.IJ_PERIOD = { per: per, archive: ARCHIVE, feeds: FEEDS, slim: (per === 'oct' ? ARCHIVE.dir : 'data/') + 'kro_slim.js' };
  window.IJ_SET_PERIOD = function (p) {   /* keeps view, tabs and filters of the current link; only `per` changes */
    var h = (window.location.hash || '#/mb_overall').replace(/([?&])per=[^&]*&?/, '$1').replace(/[?&]$/, '');
    if (p === 'oct') h += (h.indexOf('?') >= 0 ? '&' : '?') + 'per=oct';
    if (window.IJ_SPLIT && window.parent && window.parent !== window) {   /* portal build: the October feeds live in a second encrypted file the portal page fetches; it reloads this frame with them */
      window.parent.postMessage({ type: 'ijp-period', per: p === 'oct' ? 'oct' : 'nov', hash: h }, '*'); return;
    }
    try { window.history.replaceState(null, '', h); } catch (e) { window.location.hash = h; }
    window.location.reload();
  };
  if (window.IJ_BUNDLED) return;   /* offline bundle: the feeds follow as inline scripts */
  var dir = per === 'oct' ? ARCHIVE.dir : 'data/', out = '';
  FEEDS.forEach(function (f) { out += '<script src="' + dir + f + '.js"><\/script>'; });
  document.write(out);
})();
