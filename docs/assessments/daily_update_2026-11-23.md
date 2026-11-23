# Daily update 23 Nov 2026

## Arrived in raw/ (weekend catch-up, 23 Nov 00:59 - 01:05)
- MOBO (`DAILY_DATA_MOBO_202611.xlsb`) and SALMO: cut D22 (SAL last day 22, Rp 123.22 B).
- PJP visits 21 Nov (IM3 and 3ID) and 22 Nov (Sunday: 15 KB and 14 KB files, near-zero execution, shown as non-working day, never as zero execution).
- ENDBAL snapshot 22 Nov (from `endbal_20261121.zip` and `endbal_20261122.zip`; the 21 Nov snapshot is superseded): 210,913 rows, 27,206 outlets.
- GA by Outlet and Fav Locs (23 Nov 00:59), D1-D22 in the files; the builders cut both bases at D21 because D22 is partial (tagging 3,799 vs Fav Locs 8,992, 2.37x).
- **MOBII is NOT updated: still `DAILY_DATA_MOBII_202611.xlsb` of 20 Nov 22:31 (D20).** Sell-In (penjualan, DSE KPI SP) therefore stays at cut 20 while Demand and PJP are at D22, GA at D21.

## Results
- Sell-In MTD (D20): SP Rp 1,117.6 jt (LMTD 1-20 Rp 539.1 jt), SALMO Rp 15,571.8 jt (LMTD Rp 9,161.6 jt); unchanged from the 21 Nov refresh.
- Demand (D22): SALMO Rp 123.22 B; the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed as before.
- PJP: planned 153,853, executed 147,607 (95.9%), productive 84,292 (Rp 75K + hybrid rule; Effective Call % on outlets visited). Missing day stays 1 Nov (Sunday).
- GA (D21): tagging D1-D22 file total 208,266; by day D19 10,683, D20 14,613, D21 9,853; Fav Locs / tagging 1.12-1.19x.
- GA chain run by hand (daily_update does not detect the GA files): GA, GA site, KRO, Stock, KPI November, non-PJP flags, period history (cuts: demand 22, GA 21, PJP 22, Sell-In 20).

## Audits
- Pass: consistency 278/278, scorecard 163/163, GA 3,467/3,467, KRO reconciles, KPI November OK, period history 96/96, DSE catalogue, entity, popups 0 missing, render_check OK.
- Fail 1 of 16: audit_sp de-dup 22,263 of 57,967 pcs (limit 15% of MTD SP Injection), the known booster ids; bulk and booster SP stay counted as performance (owner rule 13 Nov). Threshold decision still open.
- Warning: UAR above 100% for 2 DSE (hierarchy of 3 Nov).

## Watch
- **MOBII D21-D22 missing**: Sell-In is two days behind Demand and PJP; cross-feed comparisons (Demand vs Sell-In, Supply vs Demand) mix cuts today. Ask Thofa for the MOBII file.
- GA D22 is partial in the files and held back until the next file.
