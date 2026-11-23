# Daily update 24 Nov 2026

## Arrived in raw/ (23 Nov 22:44 - 22:48, 24 Nov 05:49)
- MOBII, MOBO (`DAILY_DATA_MOBO_202611.xlsb`) and SALMO of 23 Nov 22:44 (cut D23). MOBII is back in step with Demand (it was stuck at D20 on 23 Nov), so Sell-In now covers D21-D23 again.
- PJP visits 23 Nov (IM3 and 3ID); ENDBAL snapshot 23 Nov (from `endbal_20261123.zip`): 210,913 rows, 27,208 outlets.
- GA by Outlet (23 Nov 22:48, D1-D22: tagging MTD 213,630). **The Fav Locs file (`rguga_daily_favloc_inner_202611.csv`) was not updated** (same 65,127,202 bytes as 23 Nov 00:59, still D1-D22 of the earlier cut), so Fav Locs D22 is 8,992 against 9,163 tagging (0.98x, partial). GA chain run by hand (daily_update does not detect the GA files): GA, GA site, KRO, Stock, KPI November, non-PJP flags, period history. GA cut 22 in the GA feed, 21 in the period history line (site basis cut).

## Results (Sell-In, Demand, PJP, ENDBAL at D23; GA at D22)
- Sell-In MTD: SP Rp 1,183.5 jt (LMTD 1-23 Rp 1,399.9 jt: the October 21-23 bulk, S PLUS V2 first sold 23 Oct), SALMO Rp 16,532.2 jt (LMTD Rp 12,744.8 jt).
- Demand SALMO Rp 132.24 B (D23); the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed as before.
- PJP: planned 162,840, executed 156,297 (96.0%), productive 89,573 (Rp 75K + hybrid rule; Effective Call % on outlets visited). Missing day stays 1 Nov (Sunday).
- GA by day (tagging / Fav Locs): D20 14,613 / 16,389; D21 9,853 / 11,146; D22 9,163 / 8,992.

## Audits
- Pass: consistency 278/278, scorecard 163/163 (basis PJP of 23 Nov, `pjp_basis_scorecards.md`), GA 3,467/3,467, KRO reconciles, KPI November OK, period history 96/96, DSE catalogue, entity, popups 0 missing, render_check OK.
- Fail 1 of 16: audit_sp de-dup 22,263 of 80,872 pcs (27.5%, limit 15% of MTD SP Injection). The de-dup volume is unchanged; MTD SP Injection rose from 57,967 to 80,872 pcs (+22,905 on 22-23 Nov, new injection volume), so the share falls. Bulk and booster SP stay counted as performance (owner rule 13 Nov). Threshold decision still open.
- Warning: UAR above 100% for 2 DSE (hierarchy of 3 Nov).

## Watch
- Fav Locs (site basis) is one cut behind and partial for D22; ask Victor for the refreshed `rguga_daily_favloc_inner_202611.csv`.
- SP Injection MTD +22,905 pcs in two days: confirm with the owner whether this is another booster run.
