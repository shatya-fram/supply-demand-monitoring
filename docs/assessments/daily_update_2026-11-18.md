# Daily update 18 Nov 2026

## Arrived in raw/
- MOBII, MOBO (`DAILY_DATA_MOBO_202611.xlsb`) and SALMO of 17 Nov 23:47 (cut D17). The older `(2)` copy of 17 Nov 06:09 is superseded.
- PJP visits 17 Nov (IM3 and 3ID); ENDBAL snapshot 17 Nov (from `endbal_20261117.zip`).
- GA by Outlet and Fav Locs: no new file (still D16, 17 Nov 05:57). KRO, Stock, non-PJP flags and period history were rebuilt by hand.

## Results (Sell-In, Demand, PJP, ENDBAL at D17; GA at D16)
- Sell-In MTD: SP Rp 996.0 jt (LMTD 1-17 Rp 382.2 jt), SALMO Rp 13,642.2 jt (LMTD Rp 7,622.7 jt).
- Demand SALMO Rp 92.81 B; the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed as before.
- PJP: planned 119,339, executed 113,931 (95.5%), productive 64,112 (Rp 75K + hybrid rule). Missing day stays 1 Nov (Sunday).
- ENDBAL snapshot 17 Nov: 210,624 rows, 27,204 outlets.

## Audits
- Pass: consistency 278/278, scorecard 162/162, GA 3,467/3,467, KRO reconciles, period history 96/96, DSE catalogue, entity, popups 0 missing, render_check OK.
- Fail 1 of 16: audit_sp de-dup 22,263 of 56,921 pcs (39%, limit 15%). The de-dup volume did not grow today; it is the booster ids already known. Bulk and booster SP stay counted as performance (owner rule, 13 Nov). The threshold decision is still open.
- Warning: UAR above 100% for 2 DSE (hierarchy of 3 Nov).

## Watch
- GA D16 was partial (Fav Locs 1.07x tagging); GA D17 not yet delivered.
- Vanguard Flag file (5 Nov) newer than OutletMapping (29 Oct): already accepted.
