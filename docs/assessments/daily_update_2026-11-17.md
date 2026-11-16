# Daily update 17 Nov 2026

## Arrived in raw/
- MOBII and SALMO 16 Nov 22:50 (D16); MOBO `DAILY_DATA_MOBO_202611 (2).xlsb` 17 Nov 06:09 (cut D16).
- PJP visits 16 Nov (IM3 and 3ID), plus the IM3 15 Nov file that was missing yesterday (now present).
- ENDBAL snapshot 16 Nov (named 17 Nov): 210,599 rows, 27,203 outlets.
- GA by Outlet and Fav Locs: no new file (still D15, 16 Nov 05:47). KRO, Stock, non-PJP flags and period history were rebuilt by hand.

## Results (all feeds D16 except GA D15)
- Sell-In (MOBII) MTD: SP Rp 963.1 jt (LMTD Rp 307.1 jt), SALMO Rp 12,522.2 jt (LMTD Rp 6,850.6 jt).
- Demand (MOBO): SALMO Rp 83.36 B; the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed by the builder as before.
- PJP: planned 110,887, executed 105,603 (95.2%), productive 59,372 (Effective Call rule Rp 75K + hybrid).
- ENDBAL stock Rp 4.13 B, 11,611 zero-stock rows, saldo sell-in D16 Rp 792.0 jt.

## Audits
- Pass: consistency 278/278, scorecard 162/162, GA 3,467/3,467, KRO reconciles, period history 96/96, DSE catalogue, entity, popups (0 missing), render_check.
- Fail 1 of 16: audit_sp de-dup 22,263 of 56,792 pcs (39%) over the 15% limit. Cause: the booster SP Injection ids that MOBII and MOBO both record. Per the owner rule of 13 Nov, bulk and booster SP stay counted as performance. The threshold decision is still open.
- Warning: UAR above 100% for 2 DSE (reassigned in the 3 Nov hierarchy).

## Watch
- GA D14 and D15 may be revised upward in the next GA file.
- The Vanguard Flag file (5 Nov) is newer than the OutletMapping file (29 Oct); already accepted.
