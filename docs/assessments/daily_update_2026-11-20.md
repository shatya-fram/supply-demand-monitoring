# Daily update 20 Nov 2026

## Arrived in raw/
- MOBII and SALMO of 19 Nov 23:03 (D19); PJP visits 19 Nov (IM3 and 3ID); ENDBAL snapshot 19 Nov (from `endbal_20261119.zip`).
- MOBO `DAILY_DATA_MOBO_202611 (3).xlsb` (20 Nov 06:56, rescan after the first pass) = D19. The first pass ran with MOBO still at D18 (SALMO D19 held back); the rescan rebuilt everything on D19. Demand cut 19, SALMO Rp 104.60 B, SP Injection Rp 470.7 jt, Voucher Injection Rp 8,264.5 jt.
- GA by Outlet and Fav Locs: no new file (still D18, 19 Nov 13:00). KRO, Stock, non-PJP flags and period history were rebuilt by hand.

## Results (Sell-In, Demand, PJP, ENDBAL at D19; GA at D18)
- Sell-In MTD: SP Rp 1,050.2 jt (LMTD 1-19 Rp 440.5 jt), SALMO Rp 14,898.4 jt (LMTD Rp 8,472.0 jt).
- Demand SALMO Rp 104.60 B (D19); the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed as before.
- PJP: planned 136,255, executed 130,494 (95.8%), productive 73,712 (Rp 75K + hybrid rule; Effective Call % on outlets visited).
- ENDBAL snapshot 19 Nov: 210,775 rows, 27,205 outlets.

## Audits
- Pass: consistency 278/278, scorecard 162/162, GA 3,467/3,467, KRO reconciles, period history 96/96, popups 0 missing, render_check OK, KPI November audit OK.
- Fail 1 of 16: audit_sp de-dup 22,263 of 57,577 pcs (39%, limit 15%), unchanged booster ids; bulk stays counted as performance (owner rule 13 Nov). Threshold decision still open.
- **Process finding**: `daily_update.py` builds `kpi_nov_feed.js` (KPI November) only inside the "new GA file" branch. With no new GA file it was skipped, so the feed stayed at GA D17 and `audit_kpi_nov.js` failed (GA 82,693 in ga_feed vs 72,807 in the KPI feed). Fixed by running `build_kpi_nov_feed.py` by hand (now 82,022, audit OK). The by-hand chain without new GA files is: `build_kro_feed.py`, `build_stock_feed.py`, `build_kpi_nov_feed.py`, `build_nonpjp_flags.py`, `build_period_history.py`. The evening GA refresh of 19 Nov did not run it either; the previous commit therefore carried the KPI feed at D17 (menu `mb_kpinov`).

## Watch
- GA is one day behind the other feeds (D18 vs D19).
- GA D18 Fav Locs was partial (0.83x tagging); GA D19 not yet delivered.
