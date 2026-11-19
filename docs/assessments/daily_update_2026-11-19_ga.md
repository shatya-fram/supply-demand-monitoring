# GA refresh 19 Nov 2026 (malam)

- New GA files (19 Nov 13:00): `rguga_daily_outlet_inner_202611.csv` and `rguga_daily_favloc_inner_202611.csv`, now D1-D18. No other raw file is newer than the morning refresh, so Sell-In, Demand, PJP and ENDBAL stay at D18.
- GA tagging MTD 169,326; Fav Locs 193,711 rows. D1-D15 of tagging is unchanged (131,734); D16 and D17 are unchanged in tagging, Fav Locs D17 was revised up (12,180 -> 13,192).
- **D18 bulk**: tagging D18 = 18,567, against about 11,000 on a normal day. 15 outlet-brand ids with >= 150 GA that day hold 11,566 of it (IM3 17798070: 2,646; 3ID 307885: 1,739; 3ID SH053084: 1,407; 3ID 141433: 895; 3ID 463393: 850; IM3 17619012: 788). Per the owner rule of 13 Nov (bulk and booster stay counted as performance) it stays in every total; it is a performance driver, not an anomaly to trim. Without these ids D18 would be 7,001.
- Fav Locs D18 is 15,395 (0.83x tagging, normally 1.15-1.25x), probably still partial or the bulk sells outside the favourite-location logic; expect a revision.
- Chain run by hand: GA, GA site, KRO, Stock, non-PJP flags, period history (GA cut 18).
- Audits: GA 3,467/3,467, KRO reconciles, consistency 278/278, scorecard 162/162, period history 96/96, popups 0 missing, render_check OK. audit_sp still fails 1 of 16 (de-dup 22,263 of 57,297 pcs, 39% > 15%, booster).
