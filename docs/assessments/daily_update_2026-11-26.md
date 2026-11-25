# Daily update 26 Nov 2026

## Arrived in raw/ (25 Nov 22:43 - 23:10, 26 Nov 06:11)
- MOBII, MOBO (`DAILY_DATA_MOBO_202611.xlsb`) and SALMO of 25 Nov 23:09 (cut D25); PJP visits 25 Nov (IM3 and 3ID); ENDBAL snapshot 25 Nov (from `endbal_20261125.zip`).
- GA by Outlet and Fav Locs (25 Nov 22:43), D1-D24 in the files: both GA feeds cut at D24 (tagging 11,120; Fav Locs 10,282 = 0.92x, so Fav Locs D24 is partial and will be revised up; D23 is now 7,016 / 9,900, was 2,610 / 8,802 yesterday). GA chain run by hand (`daily_update.py` still does not detect the GA files): GA, GA site, KRO, Stock, program target, KPI November, non-PJP flags, period history.
- No new file in `raw/Catalogue/` or `raw/Targets/`.

## Results (Sell-In, Demand, PJP, ENDBAL at D25; GA at D24)
- Sell-In MTD: SP Rp 1,328.6 jt (LMTD 1-25 Rp 2,684.4 jt, includes the bulk 3ID SH254705 Panda Cell of October, master since 24 Nov), SALMO Rp 18,150.1 jt (LMTD Rp 13,580.0 jt).
- Demand SALMO Rp 146.39 B (D25); the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed as before.
- PJP: planned 179,897, executed 172,993 (96.2%), productive 99,438 (Rp 75K + hybrid rule; Effective Call % on outlets visited).
- ENDBAL snapshot 25 Nov: 210,950 rows, 28,928 outlets (28,921 master).
- GA tagging D1-D24 = 231,756 in the file; D22 9,163, D23 7,016, D24 11,120.

## Audits
- Pass: consistency 278/278, scorecard 163/163, GA 3,467/3,467, KRO reconciles, KPI November OK, SP 16/16 (de-dup warning 27.1%: booster ids recorded in MOBII and MOBO, kept once), period history 96/96, DSE catalogue, entity, popups 0 missing, render_check OK.
- Warning: UAR above 100% for 1 DSE (107.1%, hierarchy of 3 Nov).

## Watch
- GA is one day behind Sell-In / Demand / PJP (D24 vs D25); Fav Locs D24 is partial.
- SP MTD vs LMTD still reads low because of the October bulk outlet (see `daily_update_2026-11-25.md`).
