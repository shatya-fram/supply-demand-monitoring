# Period toggle: MTD Nov vs LMTD Okt, or FM Okt vs FM Sep (4 Nov 2026)

Owner request (4 Nov 2026): one switch in the header (top right, next to the cut chip) that makes the **whole report** follow one of two period pairs, with the same template:

| Pair | Link | Feeds | Labels | Targets |
|---|---|---|---|---|
| **A** MTD Nov vs LMTD Okt (default) | none | live feeds, `website/data/` (running month November, cut 2 Nov) | Nov / Okt (month-aware clocks, `month_aware_labels.md`) | October target carried forward (see 2) |
| **B** FM Okt vs FM Sep | `per=oct` | frozen October close, `website/archive/2026-10/` (cut 31 Oct, as the app showed when October was the running month) | Okt / Sep | real October targets |

## 1. How it works

- `website/period_feeds.js` runs before the feeds. It reads `per=` from the link hash and writes the `<script>` tags of 13 feeds: `data/<feed>.js` (A) or `archive/2026-10/<feed>.js` (B). Swapped: dse_visits, sellin, penjualan, demand, dse_kpi, endbal, target, dse_coverage, ga, ga_site, kro (+ `kro_slim`, loaded on demand from `IJ_PERIOD.slim`), pjp_mapping, stock.
- The toggle **reloads the page** (`IJ_SET_PERIOD`) with the same view, tabs and filters in the hash (`per=oct` added or removed). Nothing of `app.js`, `stock.js`, `outlet_profile.js` or `vanguard.js` (memos, `pj._opfIdx`, KRO indexes, Leaflet layers) can survive a switch, so there is no stale cache by construction; back / forward and a hand-edited `per` also reload (`hashchange`).
- Every shareable link of view B carries `per=oct` (`rtBuild`); default A has no key. The header toggle (`perToggleRender`, `#perToggle`) names the pairs from the feeds: in A `MTD <cur> vs LMTD <prev>`; the live month shown in B comes from `period_history.js` (not swapped).
- Month words: the clocks derive Okt / Sep from the feed, so B prints exactly the October wording of the October close, and A the November wording.
- **Not swapped** (current in both): territory master and map, outlet / DSE catalogues, DSE flags, Vanguard 5G (current only), Review Periode `mb_periods` (month-agnostic archive `period_history.js`). Consequence in B: DSE / outlet assignments are today's master, as in the October close of 2 Nov (the master was frozen with FINAL 20 Okt).
- Staging: `python3 scripts/stage_period_archive.py 2026-10` wraps `data/archive/2026-10/*.gz` into `website/archive/2026-10/*.js` with the same globals as the live feeds (`var X = …; window.X = X`, `window.X = …`); `kro_slim.js` is the `slim` key of the archived `kro_feed.json` (identical to `git show 730aa9d:website/data/kro_slim.js`, 17,598 rows), `data/archive/2026-10/kro_outlet_catalogue.csv.gz` was recovered from 730aa9d. `archive_month_close.py` now also freezes that CSV.
- To move the pair on (next month) re-stage the closed month and change `ARCHIVE` / `FEEDS` in `period_feeds.js` (and `ARCHIVE_DIR` in `build_offline_html.py`).

## 2. Target carry-forward (assumption A2 replaced)

The KPI feed of November already carries the October target file (SP 266,765 pcs, OSA Rp 73.6 B, 272 DSE, same DSE / MC / Area split). Instead of zeroing it (previous rule: targets n/a when the target month differs), `moClocks()` now sets `carry = true` when the target month is 1-2 months before the running month: the target clock follows the running month, `targetMatches` is true, and nothing is neutralised. **Target Nov = distribusi Target Okt (carry-forward)** is stated by a banner on Target Setting, DSE Productivity, Partner Performance and the Ringkasan DSE tables (`moTargetBanner`). Pro-rata uses November's 30 days (`MO.days()`): SP pro-rata at cut 2 Nov = 266,765 × 2 / 30 = 17,784 pcs. This holds for every level (Region, Area, MC / DSO, DSE) and KPI that reads the KPI feed (SP, OSA, UAR, effective call, incentives).

The M2S GA target per kecamatan and brand stays the October target against **October GA** (GA builder is not month-aware: GA by outlet, GA site, Fav Locs are still October in view A, as before). Words "Target Okt" inside GA pages stay on the GA clock (`moSeg`).

## 3. Delivery (three channels)

1. **Public site** (`prepare_public_release.py`): `website/archive/2026-10/` is tracked and part of `website/`, so it is published (plain scripts, 14 files, 69.6 MB, largest 14.8 MB, under the 100 MB GitHub limit; served gzip by Pages and only fetched when `per=oct`). `data/archive/` stays excluded. Phone and e-mail masking applies to the staged files like to every other feed.
2. **Offline bundle** (`build_offline_html.py`): the live feeds stay inline plain scripts, skipped when the link says `per=oct`; the October feeds are base64 gzip blobs unpacked by `website/period_inflate.js` (synchronous inflate, about 0.1 s for the largest) before `app.js`. Bundle 92.1 MB (was 79.3 MB); `build.mjs` gzips it: **22.6 MiB** ciphertext for `sd.bin` (limit 25 MiB per file on Pages; the blobs do not compress further). A second lazily decrypted payload was not needed; if the October set ever grows past ~2 MiB more, split it.
3. **Local dev server**: `python3 scripts/dev_server.py 8088 website`, open `#/<view>?per=oct`.

## 4. Checks

`node scripts/render_check.js` renders every view for the live feeds, `PER=oct node scripts/render_check.js` for the October close (helper `scripts/feed_dir.js`, also used by `audit_consistency.js`, `audit_scorecard.js`, `audit_ga.js`, `audit_kro.js`, `audit_filters.js` with `PER=oct`). The last block of render_check compares shown figures: B → SP semua MOBII 235,947 pcs, SALMO sell-in Rp 22.13 B, PJP actual 159,340, GA 323,890, demand Rp 119.63 B, SP target 266,765; A → target total, pro-rata 17,784 and the carry-forward banner, no "target n/a" left. `audit_period_history.py` is unchanged (history archive, month-agnostic). Browser check done on the dev server and on the offline bundle served over http (file:// is not reachable from the in-app browser).

## 5. Limits

- Only the October close is staged; a pair with another month needs the staging step above.
- A reload takes the page back to the top of the view (filters and tabs are kept through the link).
- In B the header chip and cut labels read 31 Oct; Vanguard stays on its own snapshot date in both pairs.
