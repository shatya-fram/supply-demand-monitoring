# Daily update 19 Nov 2026

## Arrived in raw/
- MOBII, MOBO and SALMO of 18 Nov 23:11 (cut D18); PJP visits 18 Nov (IM3 and 3ID); ENDBAL snapshot 18 Nov (from `endbal_20261118.zip`).
- GA by Outlet and Fav Locs: no new file (still D17, 18 Nov 05:50). KRO, Stock, non-PJP flags and period history were rebuilt by hand.

## Results (Sell-In, Demand, PJP, ENDBAL at D18; GA at D17)
- Sell-In MTD: SP Rp 1,020.1 jt (LMTD 1-18 Rp 382.2 jt; 18 Oct was a Sunday), SALMO Rp 14,267.1 jt (LMTD Rp 7,623.2 jt).
- Demand SALMO Rp 97.96 B; the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed as before.
- PJP: planned 127,778, executed 122,226 (95.7%), productive 68,894 (Rp 75K + hybrid rule; Effective Call % now on outlets visited, owner 18 Nov).
- ENDBAL snapshot 18 Nov: 210,733 rows, 27,204 outlets.

## Audits
- Pass: consistency 278/278, scorecard 162/162, GA 3,467/3,467, KRO reconciles, period history 96/96, DSE catalogue, entity, popups 0 missing, render_check OK.
- Fail 1 of 16: audit_sp de-dup 22,263 of 57,297 pcs (39%, limit 15%). De-dup volume did not grow; it is the known booster ids. Bulk and booster SP stay counted as performance (owner rule, 13 Nov). Threshold decision still open.
- Warning: UAR above 100% for 2 DSE (hierarchy of 3 Nov).

## Watch
- GA D17 was partial (Fav Locs 1.03x tagging); GA D18 not yet delivered.
- Vanguard Flag file (5 Nov) newer than OutletMapping (29 Oct): already accepted.
