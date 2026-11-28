# Daily update 28 Nov 2026

## Arrived in raw/ (28 Nov 00:32, 07:32)
- MOBII, MOBO (`DAILY_DATA_MOBO_202611.xlsb`) and MOBO_SALMO of 28 Nov 00:32 (cut D27); PJP visits 27 Nov (IM3 and 3ID); ENDBAL snapshot 27 Nov (Stock Balance Daily Report, 28 Nov 07:32).
- GA by Outlet and Fav Locs: no new file (still 26 Nov 07:13, D1-D25 in the files); both GA feeds stay cut at D24, now three days behind Sell-In / Demand / PJP. GA chain run by hand (`daily_update.py` still does not detect the GA files): GA, GA site, KRO, Stock, program target, KPI November, non-PJP flags, period history.
- No new file in `raw/Catalogue/` or `raw/Targets/`.

## Results (Sell-In, Demand, PJP, ENDBAL at D27; GA at D24)
- Sell-In MTD (outlet-bound): SP Rp 1,569.9 jt (LMTD 1-27 Rp 2,971.7 jt, includes the bulk 3ID SH254705 Panda Cell of October), Voucher fisik Rp 5,770.3 jt (LMTD Rp 5,113.6 jt), Voucher bulk Rp 1,461.1 jt (LMTD Rp 621.6 jt), SALMO Rp 19,537.9 jt (LMTD Rp 16,787.1 jt).
- Demand: the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed as before; 0 unknown ids.
- PJP: planned 197,225, executed 189,796 (96.2%), productive 109,103 (57.5% of executed), ad-hoc 23,109; 14,755 of 14,829 PJP outlets visited this month. D27: 8,726 planned, 8,471 executed (97.1%), 57.3% productive. 1 Nov stays "n/a".
- ENDBAL snapshot 27 Nov: 211,201 rows, 28,928 outlets (28,921 master, 7 non-PJP).
- GA unchanged: tagging and Fav Locs D1-D24.

## Audits
- Pass: consistency 278/278, scorecard 163/163, GA 3,467/3,467, KRO reconciles, KPI November OK, SP 16/16, period history 96/96, DSE catalogue, entity, popups 0 missing, render_check OK.
- Warnings (not failures): SP Injection de-dup share rose from 27.0% to **35.9%** (35,428 of 98,805 pcs; +13,165 pcs in one day: booster ids recorded in MOBII and MOBO, kept once, counted as performance; fails only above 60%); UAR above 100% for 1 DSE (107.1%, hierarchy of 3 Nov).

## Watch
- GA is three days behind (D24 vs D27) until the next GA file arrives.
- The de-dup share keeps rising; ask the data owner whether a new booster of 27 Nov was loaded in both MOBII and MOBO.
- `dse_kpi_feed` was rebuilt with the OSA saldo change that another session left uncommitted in `build_dse_kpi_feed.py` and `CLAUDE.md` (uncapped Saldo Mobo, owner 27 Nov); it is not part of this refresh.
