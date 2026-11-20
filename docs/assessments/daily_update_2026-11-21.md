# Daily update 21 Nov 2026

## Arrived in raw/
- MOBII, MOBO (`DAILY_DATA_MOBO_202611.xlsb`) and SALMO of 20 Nov 22:31 (cut D20); PJP visits 20 Nov (IM3 and 3ID); ENDBAL snapshot 20 Nov (from `endbal_20261120.zip`).
- GA by Outlet and Fav Locs (20 Nov 22:33), now D1-D19: tagging MTD 180,001, Fav Locs 208,127 rows. `daily_update.py` did not rebuild the GA feeds on its own again (cut stayed 18), so the GA chain was run by hand: GA, GA site, KRO, Stock, KPI November, non-PJP flags, period history (GA cut 19).

## Results (Sell-In, Demand, PJP, ENDBAL at D20; GA at D19)
- Sell-In MTD: SP Rp 1,117.6 jt (LMTD 1-20 Rp 539.1 jt), SALMO Rp 15,571.8 jt (LMTD Rp 9,161.6 jt).
- Demand SALMO Rp 111.95 B (D20); the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed as before.
- PJP: planned 144,978, executed 139,018 (95.9%), productive 78,949 (Rp 75K + hybrid rule; Effective Call % on outlets visited).
- ENDBAL snapshot 20 Nov: 210,806 rows, 27,206 outlets.
- GA by day (tagging / Fav Locs): D17 11,787 / 13,632; D18 18,567 / 17,738 (0.96x, was 0.83x: Fav Locs revised up); D19 10,683 / 11,314 (1.06x, probably still partial). D18 bulk (15 outlet-brand ids with >= 150 GA hold 11,566) stays counted as performance (owner rule 13 Nov).

## Audits
- Pass: consistency 278/278, scorecard 163/163, GA 3,467/3,467, KRO reconciles, KPI November OK, period history 96/96, DSE catalogue, entity, popups 0 missing, render_check OK.
- Fail 1 of 16: audit_sp de-dup 22,263 of 57,967 pcs (limit 15% of MTD SP Injection), the known booster ids; bulk and booster SP stay counted as performance. Threshold decision still open.
- Warning: UAR above 100% for 2 DSE (hierarchy of 3 Nov).

## Watch
- GA is one day behind the other feeds (D19 vs D20). GA D19 Fav Locs probably revised up.
- `daily_update.py` skips the GA, KRO, Stock and KPI November steps when it does not detect new GA files; after a GA delivery check the GA cut in the period history line and run the chain by hand if it is behind.
