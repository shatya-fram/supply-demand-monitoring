# GA refresh 17 Nov 2026 (siang)

- New GA files (17 Nov 05:57): `rguga_daily_outlet_inner_202611.csv` and `rguga_daily_favloc_inner_202611.csv`, now D1-D16. No other raw file is newer than the morning refresh, so Sell-In, Demand, PJP and ENDBAL stay at D16.
- GA tagging MTD 138,901 (IM3 82,699, 3ID 56,202); Fav Locs 162,960 rows. D1-D15 of tagging is unchanged (131,734), so D14 and D15 were not revised.
- D16 is probably still partial: tagging 7,167, Fav Locs 7,690 (ratio 1.07 against the normal 1.15-1.25); expect an upward revision in the next file.
- Chain run by hand: GA, GA site, KRO, Stock, non-PJP flags, period history (GA cut 16).
- Audits: GA 3,467/3,467, KRO reconciles, consistency 278/278, scorecard 162/162, period history 96/96, popups 0 missing, render_check OK. audit_sp still fails 1 of 16 (de-dup 22,263 of 56,792 pcs, 39% > 15%, booster; bulk stays counted as performance per owner rule of 13 Nov).
