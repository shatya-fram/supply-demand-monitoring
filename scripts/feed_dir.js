/* Where an audit / render check reads a feed from. PER=oct reads the frozen October close (website/archive/2026-10, the feeds the period
   toggle swaps in) and sets window.IJ_PER like period_feeds.js does; default is the live feeds in website/data.
   Contract: docs/assessments/period_toggle.md */
const path = require('path');
const SWAP = new Set(['dse_visits_feed.js', 'sellin_feed.js', 'penjualan_feed.js', 'demand_feed.js', 'dse_kpi_feed.js', 'endbal_feed.js', 'target_feed.js', 'dse_coverage.js', 'ga_feed.js', 'ga_site_feed.js', 'kro_feed.js', 'kro_slim.js', 'stock_feed.js']);
const OCT = process.env.PER === 'oct';
if (OCT) { global.IJ_PER = 'oct'; global.IJ_PERIOD = { per: 'oct', archive: { month: '2026-10', cur: 'Okt', prev: 'Sep' } }; }
module.exports = function feedPath(root, f) { return path.join(root, 'website', OCT && SWAP.has(f) ? 'archive/2026-10' : 'data', f); };
module.exports.oct = OCT;
