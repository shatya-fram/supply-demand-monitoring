# GA refresh 16 Nov 2026 (scan 13:05 WIB)

## Files received (raw/)
| Source | Newest file | Status |
|---|---|---|
| GA by Outlet `rguga_daily_outlet_inner_202611.csv` (tagging) | 16 Nov 05:47 | new, D1-D15, 131,738 rows |
| GA Fav Locs `rguga_daily_favloc_inner_202611.csv` | 16 Nov 05:47 | new, D1-D15, 153,971 rows |
| `rguga_favloc_rguga_outlet_Inner_Jakarta_202611.xlsb` | 16 Nov 05:47 | new workbook (not read by a builder) |
| `rguga_daily_outlet_202610.csv` (month before) | present | kept in `raw/GA*` (restored on 15 Nov) |
| MOBII, MOBO, MOBO_SALMO, Visit PJP, ENDBAL | 14 Nov 06:13 / 13:15 | **no new file** (Sell-In, Demand, PJP, ENDBAL stay at D13); no D14 or D15 file yet (15 Nov was a Sunday) |

## Result (GA D15; Sell-In, Demand, PJP, ENDBAL D13)
- Tagging (outlet) MTD 131,738 (IM3 78,650 · 3ID 53,088; 15 Nov: 110,187 at D13); Fav Locs 153,971 rows, 153,962 inside the 120 Inner Jakarta kecamatan across 5,446 sites.
- Daily tagging D1-D15: 5,411 / 5,346 / 4,569 / 4,874 / 5,240 / 10,799 / 12,809 / 8,682 / 9,626 / 11,833 / 7,913 / 12,652 / 10,387 / 10,193 / 11,404. D14 and D15 are new; D1-D13 were revised only marginally (D3 -2, D8 -10, D9 -6, D10 -1, D11 -1, D13 -26 pcs).
- Daily Fav Locs D1-D15: 6,367 / 6,206 / 5,439 / 5,694 / 6,007 / 11,796 / 15,099 / 10,359 / 11,676 / 13,931 / 9,797 / 15,554 / 12,651 / 11,543 / 11,852. **D13 was revised up from 11,203 to 12,651**, so the 1.08x that looked incomplete on 15 Nov became 1.22x; D6-D12 also moved by up to +1.4% (D12 15,382 -> 15,554).
- Fav Locs ÷ tagging per day: D1-D13 1.17-1.23x, D14 1.13x, **D15 1.04x**. D14 / D15 are lower than the pattern and probably still incomplete (the same late-fill pattern as D9, D10 and D13), so expect them to be revised up in the next file.
- High days D6-D8, D10, D12 and D15 (booster) stay counted as performance (owner rule).
- GA is two days ahead of the other feeds (D13): comparisons of GA with Sell-In / Demand / PJP of the same MTD should use the D13 cut.

## Rebuilt
`build_ga_feed.py` (cut 15), `build_ga_site_feed.py` (to 15 Nov), `build_kro_feed.py`, `build_stock_feed.py`, `build_nonpjp_flags.py`, `build_period_history.py` (ga cut 15; demand / sellin / pjp 13).

## Audits
audit_ga 3,467/3,467, audit_kro reconciles, audit_period_history 96/96, audit_consistency 275/275 (warning: UAR > 100% for 2 DSE after the 3 Nov hierarchy), audit_scorecard 162/162, audit_popups 0 missing, audit_dse_catalogue 0 failed, audit_entity 0 failed, render_check OK. audit_sp 15/16: same single open item since 12 Nov (SP Injection de-dup 27.5% > 15% limit, no change today as Demand / Sell-In did not move).

## Open items
1. Fav Locs D14 / D15 likely incomplete (1.13x, 1.04x): re-check on the next file.
2. MOBII / MOBO / SALMO / PJP / ENDBAL for D14 and D15 not delivered yet.
3. audit_sp de-dup threshold (owner).
