# Daily update 27 Nov 2026

## Arrived in raw/ (26 Nov 22:47, 27 Nov 05:49)
- MOBII, MOBO (`DAILY_DATA_MOBO_202611.xlsb`) and MOBO_SALMO of 26 Nov 22:47 (cut D26); PJP visits 26 Nov (IM3 and 3ID); ENDBAL snapshot 26 Nov (Stock Balance Daily Report, three CSVs dated 27 Nov 04:58).
- GA by Outlet and Fav Locs: no new file (still 26 Nov 07:13, D1-D25 in the files); both GA feeds stay cut at D24. GA chain run by hand because the sell-in / demand feeds changed (`daily_update.py` still does not detect the GA files): GA, GA site, KRO, Stock, program target, KPI November, non-PJP flags, period history.
- No new file in `raw/Catalogue/` or `raw/Targets/`.

## Results (Sell-In, Demand, PJP, ENDBAL at D26; GA at D24)
- Sell-In MTD (outlet-bound): SP Rp 1,369.0 jt (LMTD 1-26 Rp 2,837.9 jt, includes the bulk 3ID SH254705 Panda Cell of October, master since 24 Nov), Voucher fisik Rp 5,195.1 jt, Voucher bulk Rp 1,376.9 jt, SALMO Rp 18,792.5 jt (LMTD Rp 15,616.7 jt).
- Demand SALMO Rp 155.53 B (D26); the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed as before; 0 unknown ids.
- PJP: planned 188,499, executed 181,325 (96.2%), productive 104,249 (Rp 75K + hybrid rule), ad-hoc 21,971. Missing day 1 Nov stays "n/a" (not zero).
- ENDBAL snapshot 26 Nov: 211,072 rows, 28,928 outlets (28,921 master, 7 non-PJP).
- GA unchanged: tagging D1-D24; Fav Locs D1-D24 (revised in the 26 Nov siang refresh).

## Audits
- Pass: consistency 278/278, scorecard 163/163, GA 3,467/3,467, KRO reconciles, KPI November OK, SP 16/16, period history 96/96, DSE catalogue, entity, popups 0 missing, render_check OK.
- Warnings (not failures): SP Injection de-dup share 27.0% (22,263 of 82,486 pcs; booster ids recorded in MOBII and MOBO, kept once, counted as performance); UAR above 100% for 1 DSE (107.1%, hierarchy of 3 Nov).

## Watch
- GA is two days behind Sell-In / Demand / PJP (D24 vs D26) until the next GA file arrives.
- SP MTD vs LMTD still reads low because of the October bulk outlet (see `daily_update_2026-11-25.md`).
