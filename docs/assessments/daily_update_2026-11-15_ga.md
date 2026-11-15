# GA refresh 15 Nov 2026 (scan 07:52 WIB)

## Files received (raw/GA*)
| File | Time | Status |
|---|---|---|
| `rguga_daily_outlet_inner_202611.csv` (tagging) | 15 Nov 00:42 | new, D1-D13, 110,187 rows |
| `rguga_daily_favloc_inner_202611.csv` (Fav Locs) | 15 Nov 00:42 | new, D1-D13, 128,512 rows |
| `rguga_favloc_rguga_outlet_Inner_Jakarta_202611.xlsb` | 15 Nov 00:43 | new workbook (not read by a builder) |
| `rguga_daily_outlet_202610.csv` (month before) | missing from `raw/GA*` | **restored**: the folder no longer held it (the builder stopped with "File bulan sebelumnya tidak ada"). A copy of the same file (476,371,797 bytes, 2 Nov 07:50) was taken from the OneDrive KPI folder `SHARE FOLDER INNER JAYA / 05. KPI's MONITORING / 2026 / 10OCTOBER2026 / DATA SUPPORT`. October FM rebuilt = 287,269 GA in 36 IJ micro clusters, equal to the documented figure |

Sell-In, Demand, PJP and ENDBAL: no new file since the 14 Nov refresh (all D13); `daily_update.py` was re-run and changed nothing but timestamps.

## Result (GA D13)
- Tagging (outlet) MTD 110,187 (IM3 69,633 · 3ID 40,554); Fav Locs (site) 128,512 rows, 128,503 inside the 120 Inner Jakarta kecamatan across 5,423 sites. GA now equals the other feeds (D13).
- Daily tagging D1-D13: 5,411 / 5,346 / 4,571 / 4,874 / 5,240 / 10,799 / 12,809 / 8,692 / 9,632 / 11,834 / 7,914 / 12,652 / 10,413. D1-D9 are the values already seen (D7 12,809 vs 12,810 before, -1 pc); D10-D13 are new.
- Daily Fav Locs D1-D13: 6,361 / 6,192 / 5,418 / 5,680 / 5,998 / 11,774 / 15,070 / 10,281 / 11,607 / 13,813 / 9,733 / 15,382 / 11,203. D9 and D10, flagged as too low on 10-14 Nov, are now complete (D9 11,607 = 1.21x tagging, D10 13,813 = 1.17x).
- Fav Locs ÷ tagging per day is 1.17-1.23 on D1-D12; **D13 is 1.08x (11,203 vs 10,413)**, lower than the pattern, so D13 Fav Locs may still be incomplete, as D9 / D10 were before revision.
- D6-D8 and D12 are the high days (booster); they stay counted as performance (owner rule).

## Rebuilt
`build_ga_feed.py`, `build_ga_site_feed.py`, `build_kro_feed.py`, `build_stock_feed.py`, `build_nonpjp_flags.py`, `build_period_history.py` (period history: ga cut 13, demand / sellin / pjp 13).

## Audits
audit_ga 3,467/3,467, audit_kro reconciles, audit_period_history 96/96, audit_consistency 275/275 (warning: UAR > 100% for 2 DSE after the 3 Nov hierarchy), audit_scorecard 162/162, audit_popups 0 missing, audit_dse_catalogue 0 failed, audit_entity 0 failed, render_check OK. audit_sp 15/16 with the same open item as 12-14 Nov (SP Injection de-dup 27.5% > 15% limit; unchanged today).

## Open items
1. Fav Locs D13 (1.08x tagging) may be incomplete: re-check on the next file.
2. Keep `rguga_daily_outlet_<previous month>.csv` in `raw/GA*`: the GA builder needs it every month (tell Victor not to remove it).
3. audit_sp de-dup threshold (owner).
