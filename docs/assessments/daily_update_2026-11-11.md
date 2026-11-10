# Daily update 11 Nov 2026 (scan 05:55 WIB, re-scan 06:01 WIB)

Re-scan 06:01: `DAILY_DATA_MOBO_202611.xlsb` arrived at 05:58 (D10). Demand and SALMO are now cut D10; the first scan had Demand at D9.

## Files received (raw/)
| Source | Newest file | Status |
|---|---|---|
| MOBII Supply (`DAILY_DATA_MOBII_202611.xlsb`) | 10 Nov 22:54 | new, cut D10 |
| MOBO_SALMO (`..._SALMO_202611.xlsb`) | 10 Nov 22:54 | new, D10, no longer held (Rp 3.31 B of D10 released with MOBO D10) |
| MOBO Demand (`DAILY_DATA_MOBO_202611.xlsb`) | 11 Nov 05:58 | new in the re-scan, cut D10 |
| Visit PJP (`*_visit_dse_202611__10_10.zip`) | 10 Nov 22:50 | new, PJP 01-10 Nov |
| ENDBAL (Stock Balance Daily Report) | 11 Nov 05:37 | new, snapshot 2026-11-10 |
| GA by Outlet / Fav Locs (`rguga_daily_*_inner_202611.csv`) | 10 Nov 10:40 | **unchanged** since the 10 Nov (sore) refresh, cut D9; D10 not delivered yet |

## Result
- Penjualan cut D10: SP outlet MTD Rp 487.9 jt, Voucher fisik Rp 1,628.6 jt, Voucher bonus Rp 477.5 jt, SALMO Rp 7,589.1 jt.
- PJP 01-10 Nov: planned 67,890, executed 63,754 (93.9%), productive 35,154; 1 Nov (Sunday) listed as missing day, not shown as zero.
- ENDBAL snapshot 10 Nov: stock Rp 4.32 B, 27,188 outlets, 11,606 with zero stock, saldo sell-in D10 Rp 650.7 jt (2,030 outlets).
- Demand (MOBO) now cut D10 (SALMO MTD Rp 44.78 B, 10,518 outlets; D9 was Rp 41.47 B; SP Injection MTD Rp 446.6 jt; Reload Rp 10.52 B of which Rp 9.68 B at 47 non-PJP ids, same distributor-account pattern as October). Sell-In, PJP, ENDBAL and Demand are all D10; only GA stays D9, so GA ratios against D10 figures need care.

## GA by Outlet and Fav Locs assessment
- Files identical to the ones used on 10 Nov (sore): GA feed content equal to the committed one (timestamps only), site feed cut 9.
- Fav Locs target kecamatan daily D1-D9: 3,724 / 3,860 / 3,379 / 3,276 / 3,450 / 8,406 / 10,205 / 6,783 / 4,779. D6-D8 spike is the same pattern flagged on 9-10 Nov (owner/Victor confirmation still pending); the D9 point looks incomplete (previous note: Fav Locs D9 0.81x tagging).
- Nothing new to assess until the D10 GA files arrive.

## Audits
audit_scorecard 162/162, audit_ga 3,467/3,467, audit_sp 16/16, audit_consistency 275/275 (re-run after the re-scan; warning: UAR > 100% for 2 DSE after the 3 Nov hierarchy), audit_dse_catalogue 0 failed, audit_entity 0 failed, audit_kro reconciles, period history audit and render_check OK. Vanguard warning unchanged: Flag file 5 Nov vs OutletMapping 29 Oct (accepted by the owner).

## Open items
1. GA D10 (tagging and Fav Locs) not delivered; D6-D8 / D9 anomalies unconfirmed.
2. Bulk SP / SP Injection of 7 Nov (Babelan, Bekasi Tengah, Pasar Minggu, Cipayung) still to confirm with the data owner.
3. Uncommitted portal edits (`portal/build.mjs`, `portal/site/index.html`, `.bak-before-soga`) belong to another session and are not part of this refresh.
