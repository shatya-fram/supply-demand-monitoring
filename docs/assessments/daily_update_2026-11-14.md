# Daily update 14 Nov 2026 (scan 13:15 WIB)

## Files received (raw/)
| Source | Newest file | Status |
|---|---|---|
| MOBII Supply, MOBO Demand, MOBO_SALMO (`..._202611.xlsb`) | 14 Nov 06:13 | new, cut D13. `DAILY_DATA_MOBO_202611 (1).xlsb` (13 Nov, D12) still sits next to the new `DAILY_DATA_MOBO_202611.xlsb`; the builder takes the newest file by modification time (verified), so the new one is read |
| Visit PJP (`*_visit_dse_202611__13_13.zip`) | 14 Nov 06:13 | new, PJP 01-13 Nov |
| ENDBAL (Stock Balance Daily Report) | 14 Nov 13:15 (part 2 at 13:15, data date 2026-11-13) | new, snapshot 2026-11-13 |
| GA by Outlet / Fav Locs (`rguga_daily_*_inner_202611.csv`) | 11 Nov 11:30-11:31 | **unchanged**, cut D10; D11-D13 not delivered |

## Result (Sell-In, Demand, PJP, ENDBAL D13; GA D10)
- Penjualan MTD: SP outlet Rp 692.8 jt (D12: 574.9), SALMO Rp 10,929.3 jt (D12: 9,469.4); LMTD 1-13: SP Rp 153.1 jt, SALMO Rp 3,639.4 jt.
- Demand: SALMO Rp 61.51 B (11,174 outlets, day 13; D12: 54.81), SP Injection Rp 453.2 jt, Reload Rp 15.22 B of which Rp 12.47 B at 47 non-PJP ids (distributor-account pattern as before).
- PJP 01-13 Nov: planned 93,184, executed 88,330 (94.8%), productive 49,321 under the new Effective Call rule (old rule 49,372). 1 Nov (Sunday) is the listed missing day, not shown as zero.
- ENDBAL snapshot 13 Nov: 27,197 outlets, stock Rp 4.21 B (12 Nov: 4.35 B), 11,610 outlets with zero stock, saldo sell-in D13 Rp 1,459.8 jt (2,021 outlets).
- **ENDBAL row count jumped 131,897 -> 189,379** (outlets 27,192 -> 27,197). Checked: the extra ~57k rows have a blank account type and balance 0.00 (blank-type rows 70,569 -> 128,021; "Stock Account Normal" rows 38,959 -> 38,979, "Commission" 22,369 -> 22,379). The feed reads balances from Stock Account Normal and Commission rows only, so balances are unaffected; it is a change in the export (zero filler rows), to mention to Thofa.
- `daily_update.py` skips GA / KRO / Stock when no GA file is new: KRO, Stock, non-PJP flags and period history were rebuilt by hand (period history: demand 13, sellin 13, pjp 13, ga 10).

## GA by Outlet and Fav Locs assessment
- Both files are the 11 Nov 11:30 versions already loaded; GA feed unchanged, tagging and site cut D10. GA is now three days behind the other feeds (D13): any GA ratio against D13 figures needs care, and KRO GA / program GA views run to D10.
- Fav Locs target-kecamatan daily D1-D10 unchanged: 3,742 / 3,876 / 3,394 / 3,295 / 3,479 / 8,485 / 10,329 / 7,613 / 7,894 / 4,616. D6-D9 spike and low D10 still unconfirmed by Victor.

## Audits
audit_kro reconciles, audit_period_history 96/96, audit_consistency 275/275 (warning: UAR > 100% for 2 DSE after the 3 Nov hierarchy), audit_scorecard 162/162, audit_ga 3,467/3,467, audit_popups 0 popups missing a period, audit_dse_catalogue 0 failed, audit_entity 0 failed, render_check OK.
**audit_sp 15/16, the same single failure as 12-13 Nov**: de-dup of SP Injection = 13,026 pcs of 47,319 (27.5%, limit 15%; 8,518 on 13 Nov). New on D13: 4,508 pcs at 3 ids (554521 and SH022775 SP HAPPY S PLUS V2: 1,081 and 2,324 pcs; 1-163309552360 SP HAPPY 3GB 30D JABO: 1,103 pcs) recorded twice, in MOBII and MOBO SP_INJECTION, with equal quantity. Per the owner rule (13 Nov) the bulk / booster SP stays in performance: MOBII sell-in is kept and only the MOBO duplicate copy is dropped. The 15% alarm threshold is what trips; the owner decision on that threshold is still open.

## In the working tree but not committed by me (other sessions)
Effective Call Rp 75K + hybrid rule (`scripts/generate_dse_visits_feed.py`, `scripts/build_dse_kpi_feed.py`, `website/app.js`, `website/archive/2026-10/dse_visits_feed.js`, `docs/assessments/effective_call_75k_hybrid.md`, `CLAUDE.md`). Today's visits feed was built with this rule, so the feed and `app.js` must be committed together. Also left out: `portal/*`, `scripts/publish_all.sh`, `docs/operations/publish_runbook.md`, `scripts/verify_portal_alignment.js`, `docs/assessments/portal_alignment_inner_jakarta_vs_sd.md`.

## Open items
1. audit_sp de-dup threshold (owner).
2. GA D11-D13 (tagging and Fav Locs) not delivered; D6-D9 anomalies and the low D10 unconfirmed.
3. ENDBAL export now carries ~57k zero-balance rows with blank account type: confirm with Thofa it is intended.
