# Daily update 13 Nov 2026 (scan 06:07 WIB, re-scan 06:14 WIB)

## Files received (raw/)
| Source | Newest file | Status |
|---|---|---|
| MOBII Supply, MOBO_SALMO | 12 Nov 23:05 | new, cut D12 |
| MOBO Demand | first scan: `DAILY_DATA_MOBO_202611.xlsb` of 11 Nov 22:51 (D11); **re-scan 06:12: `DAILY_DATA_MOBO_202611 (1).xlsb`** (D12, 5.6 MB) | new in the re-scan. The name carries " (1)" (a duplicate download); the old file is gone. The builder matches `DAILY_DATA_MOBO_<YYYYMM>*`, so it is read as the running month: sheets SP_INJECTION 491, RELOAD 14,496, VOUCHER 10,515, CVM 11,129, RECARGE 65,507, last day 12 |
| Visit PJP (`*_visit_dse_202611__12_12.zip`) | 12 Nov 23:06 | new, PJP 01-12 Nov |
| ENDBAL (Stock Balance Daily Report) | 13 Nov 06:07 | new, snapshot 2026-11-12 |
| GA by Outlet / Fav Locs (`rguga_daily_*_inner_202611.csv`) | 11 Nov 11:30-11:31 | **unchanged**, already loaded on 11 Nov (cut D10); D11 / D12 not delivered |

## Result (Sell-In, Demand, PJP, ENDBAL D12; GA D10)
- Penjualan MTD: SP outlet Rp 574.9 jt, SALMO Rp 9,469.4 jt (LMTD 1-12: SP Rp 87.0 jt, SALMO Rp 2,945.5 jt).
- Demand: SALMO Rp 54.81 B (10,965 outlets, day 12), SP Injection Rp 451.5 jt, Reload Rp 13.15 B of which Rp 11.50 B at 47 non-PJP ids (distributor-account pattern as before).
- PJP 01-12 Nov: planned 84,636, executed 80,050 (94.6%), productive 44,474.
- ENDBAL snapshot 12 Nov: 27,192 outlets, 131,897 rows.
- `daily_update.py` skips GA / KRO / Stock when no GA file is new: KRO, Stock, non-PJP flags and period history were rebuilt by hand after the last refresh (period history: demand 12, sellin 12, pjp 12, ga 10).

## GA by Outlet and Fav Locs assessment
- Both files are the 11 Nov 11:30 versions used on 11 / 12 Nov; GA feed content unchanged, tagging and site cut D10. Nothing new to assess; GA is two days behind the other feeds (D12), so ratios between GA and D12 figures need care.
- Fav Locs target-kecamatan daily D1-D10 unchanged: 3,742 / 3,876 / 3,394 / 3,295 / 3,479 / 8,485 / 10,329 / 7,613 / 7,894 / 4,616 (D6-D9 spike and a low D10 still unconfirmed by the owner / Victor).

## Audits
audit_kro reconciles, audit_period_history 96/96, audit_consistency 275/275 (warning: UAR > 100% for 2 DSE after the 3 Nov hierarchy), audit_scorecard 162/162, audit_ga 3,467/3,467, audit_popups 0 popups missing a period, audit_dse_catalogue 0 failed, audit_entity 0 failed, render_check OK.
**audit_sp 15/16, same single failure as 12 Nov**: de-dup of SP Injection = 8,518 pcs of 42,712 (19.9%, limit 15%). No new de-dup today; the MTD share stays above the limit because of the 4 distributor ids of 11 Nov (3,053 pcs). Rule works as designed; the owner decision on the 15% threshold is still open.

## Not part of this refresh (other session, uncommitted)
Whitelist file `Whitelist_Outlet_Program_Nov_2026.xlsb`: Promotor 213 -> 228 ids (AVA, Tebus Murah, DTU, DSF identical to v1). Files: `data/catalogues/catalogue_202611/whitelist_program_v1.csv`, `data/catalogues/kro_program_outlets.csv`, `scripts/build_whitelist_program.py`, `docs/assessments/whitelist_program_v1_assessment.md`. Because the KRO / program feeds were rebuilt today they already carry Promotor 228, so these files must be committed together with the refresh or the KRO feed would not be reproducible from the repo. Also uncommitted and left out: `portal/*`, `scripts/publish_all.sh`, `docs/operations/publish_runbook.md`, `scripts/verify_portal_alignment.js`, `docs/assessments/portal_alignment_inner_jakarta_vs_sd.md`.

## Open items
1. audit_sp de-dup threshold (owner); bulk SP / SP Injection of 7 Nov still unconfirmed.
2. GA D11 and D12 (tagging and Fav Locs) not delivered; D6-D9 anomalies and the low D10 unconfirmed.
3. Confirm with Thofa that `DAILY_DATA_MOBO_202611 (1).xlsb` is the intended D12 file (it replaced the original name).
