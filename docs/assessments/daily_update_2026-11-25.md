# Daily update 25 Nov 2026

## Arrived in raw/ (24 Nov 23:03 - 23:06, 25 Nov 06:08)
- MOBII, MOBO (`DAILY_DATA_MOBO_202611.xlsb`) and SALMO of 24 Nov 23:03 (cut D24); PJP visits 24 Nov (IM3 and 3ID); ENDBAL snapshot 24 Nov (from `endbal_20261124.zip`).
- GA by Outlet and Fav Locs (24 Nov 23:06): D1-D23 in the files; **D23 is partial** (tagging 2,610, Fav Locs 8,802), so both GA feeds are cut at D22 (tagging 9,163 / Fav Locs 11,030 = 1.20x; Fav Locs D22 was revised up from 8,992). GA chain run by hand (`daily_update.py` does not detect the GA files): GA, GA site, KRO, Stock, program target, KPI November, non-PJP flags, period history.
- No new file in `raw/Catalogue/` (newest is still `Master_Hierarchy_20261118.xlsb`, applied 24 Nov).

## Results (Sell-In, Demand, PJP, ENDBAL at D24; GA at D22)
- Sell-In MTD: SP Rp 1,279.9 jt, SALMO Rp 17,279.2 jt (LMTD 1-24 Rp 13,579.5 jt).
- **SP LMTD (Oct 1-24) Rp 2,545.3 jt against Rp 1,399.9 jt (1-23) yesterday**: this is the master change of 24 Nov, not a feed error. The refresh of 24 Nov morning was built before the Master Hierarchy 18 Nov was applied; since then 3ID `SH254705` Panda Cell (52,332 SP pcs, about Rp 0.68 B in October, bulk kept as performance) and 187 more outlets are master outlets (penjualan 15,640 -> 15,828 outlets, 49 -> 73 products). SP MTD Nov vs LMTD Oct therefore reads about -50%; see `master_hierarchy_18nov_assessment.md` §5 and `data/history/basis_adjustments.json`.
- Demand SALMO Rp 138.67 B (D24); the CVM sheet again held 52,034 rows identical to RECARGE (Rp 31.7 B), removed as before.
- PJP: planned 171,235, executed 164,568 (96.1%), productive 94,418 (Rp 75K + hybrid rule; Effective Call % on outlets visited).
- ENDBAL snapshot 24 Nov: 210,932 rows; 28,928 outlets, 28,921 of them master (24 Nov morning ENDBAL had 27,137 master outlets: same master change).
- GA tagging D1-D22 213,620; D20 14,613, D21 9,853, D22 9,163.

## Audits
- Pass: consistency 278/278, scorecard 163/163, GA 3,467/3,467, KRO reconciles, KPI November OK, SP 16/16 (de-dup warning 27.3%: booster ids recorded in MOBII and MOBO, kept once), period history 96/96, DSE catalogue, entity, popups 0 missing, render_check OK.
- Warning: UAR above 100% for 1 DSE (107.1%, hierarchy of 3 Nov).

## Watch
- GA D23 is partial in the files (tagging 2,610); expect it complete in the next file.
- SP LMTD basis: growth tables for SP show the lower MTD vs LMTD because of the bulk Panda Cell October volume; read SP together with SP Data KPI (3GB + injection) if the owner wants the growth without that one outlet.
