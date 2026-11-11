# Daily update 12 Nov 2026 (scan 05:55 WIB)

## Files received (raw/)
| Source | Newest file | Status |
|---|---|---|
| MOBII Supply, MOBO Demand, MOBO_SALMO (`..._202611.xlsb`) | 11 Nov 22:51 | new, cut D11 |
| Visit PJP (`*_visit_dse_202611__11_11.zip`) | 11 Nov 22:52 | new, PJP 01-11 Nov |
| ENDBAL (Stock Balance Daily Report) | 12 Nov 05:28 | new, snapshot 2026-11-11 |
| GA by Outlet / Fav Locs (`rguga_daily_*_inner_202611.csv`) | 11 Nov 11:30-11:31 | **unchanged**, already loaded on 11 Nov (cut D10); D11 not delivered yet |

## Result (cut D11, GA D10)
- Penjualan MTD: SP outlet Rp 532.3 jt (D10: 487.9), Voucher fisik Rp 1,779.8 jt, Voucher bonus Rp 537.6 jt, SALMO Rp 8,191.7 jt (D10: 7,589.1).
- Demand: SALMO Rp 48.60 B (D10: 44.78), SP Injection Rp 448.9 jt, Reload Rp 11.51 B of which Rp 10.61 B at 47 non-PJP ids (distributor-account pattern as before).
- PJP 01-11 Nov: planned 76,194, executed 71,867 (94.3%), productive 39,794.
- ENDBAL snapshot 11 Nov: stock Rp 4.24 B, 27,190 outlets, 11,602 with zero stock, saldo sell-in D11 Rp 602.5 jt (1,990 outlets).
- `daily_update.py` skips GA / KRO / Stock when no GA file is new, so KRO, Stock, non-PJP flags and period history were rebuilt by hand (`build_kro_feed`, `build_stock_feed`, `build_nonpjp_flags`, `build_period_history`); without that `audit_kro` fails (feed D10 vs source D11).

## GA by Outlet and Fav Locs assessment
- Both files are the 11 Nov 11:30 versions used on 11 Nov; GA feed content equal to the committed one (timestamps only), tagging and site cut D10 (88,772 Fav Locs rows).
- Fav Locs target-kecamatan daily D1-D10: 3,742 / 3,876 / 3,394 / 3,295 / 3,479 / 8,485 / 10,329 / 7,613 / 7,894 / 4,616. D6-D8 spike (and a D9 value revised up from 4,779 to 7,894) as seen on 10-11 Nov; D10 (4,616) is lower than the D6-D9 level and may still be incomplete. Owner / Victor confirmation still pending.
- GA is one day behind Sell-In, Demand, PJP and ENDBAL (D11): ratios between GA and D11 figures need care.

## Audits
audit_dse_catalogue 0 failed, audit_entity 0 failed, audit_consistency 275/275 (warning: UAR > 100% for 2 DSE after the 3 Nov hierarchy), audit_scorecard 162/162, audit_ga 3,467/3,467, audit_kro reconciles, audit_period_history 96/96, audit_popups 0 popups missing a period, render_check OK.
**audit_sp 15/16: one failure.** De-dup of SP Injection = 8,518 pcs of 42,542 (20%, limit 15%). Cause: 4 distributor-style ids (`1-1633...`) with SP HAPPY 3GB 30D JABO on D11 (600, 1, 1,650 and 802 pcs, 3,053 pcs) recorded twice, in MOBII and MOBO SP_INJECTION, with equal quantity; the owner rule (27 Oct) keeps MOBII and drops the MOBO copy. The rule works as designed, the 15% alarm threshold is what tripped (same pattern as 9 Nov). Not changed: the threshold is the owner's guard. Question for the owner: raise the threshold or keep alarming.

## Open items
1. audit_sp de-dup threshold (above); and the bulk SP / SP Injection of 7 Nov (Babelan, Bekasi Tengah, Pasar Minggu, Cipayung) still unconfirmed.
2. GA D11 (tagging and Fav Locs) not delivered; D6-D9 anomalies and the low D10 unconfirmed.
3. Uncommitted work of other sessions is not part of this refresh: `portal/*`, `scripts/publish_all.sh`, `docs/operations/publish_runbook.md`, `website/data/dsf_feed.js`, `docs/assessments/portal_alignment_inner_jakarta_vs_sd.md`.
