# Portal alignment: Menu 01 (Inner Jakarta Performance) vs Menu 02 (Supply & Demand)

Date of check: 11 Nov 2026. Scope: which numbers are shown in both menus of the landing page and whether they agree.
Menu 01 source: `portal/content-src/inner-jakarta.html` (export of the design project "Inner Jakarta Complete App", 6 Nov 2026).
Menu 02 source: the committed feeds in `website/data/` (GA feed built 11 Nov 06:02, cut day 9).

## 1. What overlaps

Only **Gross Add (GA)** is a measure present in both menus with a current date. Menu 01 headline (revenue, pack purchase, VLR, usage) has no S&D equivalent. Supply / sell-in in Menu 01 is old data (section 3).

## 2. GA, 1-3 Nov 2026

Menu 01 feed `data/mtdlmtd-inner.json` (file `Inner MTD-LMTD 2026-11-05.xlsx`, data as of 3 Nov, downloaded 5 Nov), field `ga` (RGU Gross Add, kecamatan level).
S&D: `ga_feed.js` (outlet tagging, `qty_ga` per selling outlet, VALID_ID only) and `ga_site_feed.js` (activation kecamatan, Fav Locs), summed for days 1-3.

| | Menu 01 | S&D site basis (kecamatan) | S&D outlet tagging |
|---|---|---|---|
| IM3 MTD Nov 1-3 | 10,264 | 10,963 (+6.8%) | 9,800 |
| 3ID MTD Nov 1-3 | 6,818 | 6,846 (+0.4%) | 5,528 |
| IM3 LMTD Oct 1-3 | 13,098 | n/a (October site file is Region level only) | 13,098 (identical) |
| 3ID LMTD Oct 1-3 | 5,073 | n/a | 4,337 |

Kecamatan level (site basis vs Menu 01, 119 matched kecamatan; 1 name in Menu 01 has no S&D match):
- 3ID: sum 6,818 vs 6,846; 117 of 119 within 10% or 2 GA; 51 identical.
- IM3: sum 10,262 vs 10,963; 100 of 119 within 10% or 2 GA; 24 identical. Largest gaps: Cengkareng 219 vs 294, Kebayoran Lama 216 vs 286, Tambun Selatan 179 vs 215, Tebet 118 vs 151, Cikarang Pusat 79 vs 110.

Reading:
- Menu 01 counts GA by kecamatan, so the comparable S&D basis is **site / activation location**, not outlet tagging (the two bases differ by design, see CLAUDE.md "GA has two bases").
- 3ID agrees. IM3 is 6.8% higher in S&D. Likely cause (not verified): S&D uses a later file (cut 9 Nov) where days 1-3 include late-arriving rows, while Menu 01 was downloaded on 5 Nov.
- Outlet tagging is lower than the location basis because rows without a valid outlet id are excluded (3ID LMTD: 4,337 vs 5,073).

## 3. Menu 01 feeds that are not current

| Feed (Menu 01) | Cut / source date | Screen |
|---|---|---|
| `supply-im3`, `supply-3id` | cut 29 Aug 2026 | Supply ÷ demand |
| `ga-bridge-gap` | cut 19 Sep (East filler 30 Sep) | GA Recovery Plan |
| `stock-fulfillment` | 18 Sep | Stock fulfillment |
| `daily-inner` (GA and sell-in) | to 27 Sep | Daily GA / sell-in |
| `ga-sept` | September export | GA September |
| `snapshot-inner`, `metrics-inner`, `sitekpi-inner` | 11 Sep | snapshots, KPI |
| `site-perf-*`, `sites-inner` | 31 Aug / 14 Sep | site performance |
| `product-movements` | 18 Sep | Value & Product Movements |
| `mtdlmtd-inner` | 1-3 Nov (Nov MTD vs Oct LMTD) | current |
| `acqrev-fullmonth` | Oct month end (file 1 Nov) | current |
| `topdown-inner`, `yearly-inner` | months to Sep 2026 | history |

Supply and sell-in in Menu 01 therefore cannot be compared with S&D sell-in (current month); the dates do not overlap.

## 4. What is needed to align

1. Re-cut the Menu 01 feeds that still carry Aug-Sep data (supply, GA bridge, stock fulfillment, daily GA and sell-in) in the design project and export again; the portal only shows what the export holds.
2. For GA, show next to Menu 01 which basis it uses (kecamatan = site basis) so it is not read against the outlet-tagging figures of S&D.
3. Re-run this comparison after each Menu 01 export (same window, same brand split).

No file of Menu 01 or Menu 02 was changed by this check.
