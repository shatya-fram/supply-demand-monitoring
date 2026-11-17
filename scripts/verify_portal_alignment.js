#!/usr/bin/env node
/* Verifies that the Supply & Demand report inside the landing page (portal, encrypted) shows the SAME numbers as the public
   Supply & Demand site. Used as the last gate of scripts/publish_all.sh (owner request 11 Nov 2026).

   What it does
     1. downloads the live portal bundle(s) (content/sd.bin and the October file named in config.json), decrypts them with
        portal/_keys.json (local, never committed) and gunzips them;
     2. downloads every script of the live S&D site (index.html scripts, the 12 period feeds + kro_slim in data/ and in
        archive/2026-10/);
     3. feeds must be equal value by value: any number, structure or text difference fails. The ONLY tolerated difference is
        a name that the public release masks (text containing "disamarkan", e.g. outlets named by an email or a phone number);
        code files (app.js, stock.js ...) must be byte-identical.
   Exit 0 = aligned, 1 = at least one difference, 2 = not comparable (S&D live is not at the committed HEAD, or a download failed).

   node --max-old-space-size=8192 scripts/verify_portal_alignment.js            (publish_all.sh passes the flag itself)
   env: SD_URL, PT_URL, KEYS (default portal/_keys.json), EXPECT_SHA (short HEAD sha the S&D live site must carry) */
'use strict';
const fs = require('fs'), vm = require('vm'), zlib = require('zlib'), crypto = require('crypto'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SD_URL = process.env.SD_URL || 'https://shatya-fram.github.io/supply-demand-monitoring';
const PT_URL = process.env.PT_URL || 'https://shatya-fram.github.io/inner-jakarta-portal';
const KEYS = JSON.parse(fs.readFileSync(process.env.KEYS || path.join(ROOT, 'portal/_keys.json'), 'utf8'));
const FEEDS = ['dse_visits_feed', 'sellin_feed', 'penjualan_feed', 'demand_feed', 'dse_kpi_feed', 'endbal_feed', 'target_feed', 'dse_coverage',
  'ga_feed', 'ga_site_feed', 'kro_feed', 'stock_feed', 'kro_slim'];
const MASK = /disamarkan/;
const log = (...a) => console.log('[align]', ...a);
const bust = () => 't=' + Date.now();

async function get(url, binary) {
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(url + (url.includes('?') ? '&' : '?') + bust()); if (r.ok) return binary ? Buffer.from(await r.arrayBuffer()) : await r.text(); } catch (e) { /* retry */ }
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('download failed: ' + url);
}
function decrypt(buf, keyB64) {
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyB64, 'base64'), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(buf.length - 16));
  return zlib.gunzipSync(Buffer.concat([d.update(buf.subarray(12, buf.length - 16)), d.final()])).toString('utf8');
}
const esc = s => s.split('</script').join('<\\/script');
const unesc = s => s.split('<\\/script').join('</script');
function run(src, per) { const w = { IJ_PER: per || 'nov' }; w.window = w; vm.runInNewContext(src, w, { timeout: 180000 }); return w; }

function cmp(a, b, st, p) {
  if (typeof a === 'number' || typeof b === 'number') { if (a !== b) { st.num++; if (st.ex.length < 3) st.ex.push(`${p}: ${a} vs ${b}`); } return; }
  if (typeof a === 'string' || typeof b === 'string') {
    if (a !== b) { if (typeof a === 'string' && MASK.test(a)) st.masked++; else { st.str++; if (st.ex.length < 3) st.ex.push(`${p}: "${String(a).slice(0, 30)}" vs "${String(b).slice(0, 30)}"`); } }
    return;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') { if (a !== b) st.other++; return; }
  if (Array.isArray(a) !== Array.isArray(b)) { st.other++; return; }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) { st.len++; if (st.ex.length < 3) st.ex.push(`${p}: ${ka.length} vs ${kb.length} keys`); }
  for (const k of ka) { if (!(k in b)) { st.len++; continue; } cmp(a[k], b[k], st, p + '.' + k); st.n++; }
}

/* the portal wraps each feed as <script data-src="..."> if (window.IJ_PER !== 'oct') { ...feed... } </script> (October: one block per feed in the
   October file); the block of a feed starts with the first 90 characters of the live file and ends at the wrapper's closing brace */
function blockOf(portal, liveSrc, per) {
  const i = portal.indexOf(esc(liveSrc).slice(0, 90)); if (i < 0) return null;
  let j;
  if (per === 'oct') { j = portal.indexOf("\nif (window.IJ_PER === 'oct')", i + 10); if (j < 0) j = portal.length; }
  else { j = portal.indexOf('\n}\n</script>', i); const j2 = portal.indexOf('</script>', i); if (j < 0 || j > j2) j = j2; }
  return unesc(portal.slice(i, j)).replace(/\n}\s*$/, '');
}

function compareFile(name, liveSrc, portal, per, isFeed) {
  if (portal.includes(esc(liveSrc))) return { name, per, status: 'identical' };
  if (!isFeed) return { name, per, status: 'DIFFERENT CODE' };
  const blk = blockOf(portal, liveSrc, per); if (!blk) return { name, per, status: 'NOT FOUND IN PORTAL' };
  let lw, pw; try { lw = run(liveSrc, per); pw = run(blk, per); } catch (e) { return { name, per, status: 'EVAL ERROR ' + e.message.slice(0, 60) }; }
  const tot = { n: 0, num: 0, str: 0, masked: 0, len: 0, other: 0, ex: [] };
  for (const k of Object.keys(lw).filter(k => k !== 'window' && k !== 'IJ_PER')) cmp(lw[k], pw[k], tot, k);
  const bad = tot.num + tot.str + tot.len + tot.other;
  return { name, per, status: bad ? 'DIFFERENT VALUES' : 'same values (masked names: ' + tot.masked + ')', num: tot.num, text: tot.str, struct: tot.len + tot.other, example: tot.ex[0] || '' };
}

(async () => {
  const cfg = JSON.parse(await get(PT_URL + '/config.json'));
  const ver = JSON.parse(await get(SD_URL + '/version.json'));
  if (process.env.EXPECT_SHA && !String(ver.commit || '').startsWith(process.env.EXPECT_SHA)) {
    log(`NOT COMPARABLE: S&D live is at ${ver.commit}, expected ${process.env.EXPECT_SHA}. Publish both sites of the same commit (scripts/publish_all.sh without --portal-only).`);
    process.exit(2);
  }
  log(`portal cb=${cfg.cb} | S&D live commit ${ver.commit} (${ver.built_at})`);
  const portalNov = decrypt(await get(PT_URL + '/content/sd.bin', true), KEYS.sd);
  const portalOct = cfg.sdOct ? decrypt(await get(PT_URL + '/' + cfg.sdOct, true), KEYS.sd) : '';
  const index = await get(SD_URL + '/index.html');
  const srcs = [...new Set([...index.matchAll(/src="([^"]+)"/g)].map(m => m[1].split('?')[0]).filter(s => !/^https?:/.test(s) && !s.startsWith('vendor/')))];
  const rows = [];
  for (const s of srcs) { const t = await get(SD_URL + '/' + s); rows.push(compareFile(s, t, portalNov, 'nov', /feed|flags|history/.test(s))); }
  for (const f of FEEDS) { if (srcs.includes('data/' + f + '.js')) continue; rows.push(compareFile('data/' + f + '.js', await get(SD_URL + '/data/' + f + '.js'), portalNov, 'nov', true)); }
  if (portalOct) for (const f of FEEDS) rows.push(compareFile('archive/2026-10/' + f + '.js', await get(SD_URL + '/archive/2026-10/' + f + '.js'), portalOct, 'oct', true));
  const bad = rows.filter(r => !/^(identical|same values)/.test(r.status));
  for (const r of rows) console.log('  ' + (/^(identical|same values)/.test(r.status) ? 'ok  ' : 'FAIL') + ' ' + r.name.padEnd(40) + r.status + (r.example ? '  e.g. ' + r.example : ''));
  if (bad.length) { log(`NOT ALIGNED: ${bad.length} of ${rows.length} files differ`); process.exit(1); }
  log(`ALIGNED: ${rows.length} files, same numbers in the portal and on the S&D site`);
})().catch(e => { console.error('[align] error:', e.message); process.exit(2); });
