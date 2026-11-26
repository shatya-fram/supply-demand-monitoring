# GA refresh 26 Nov 2026 (siang)

- New GA files (26 Nov 07:13): `rguga_daily_outlet_inner_202611.csv` and `rguga_daily_favloc_inner_202611.csv`, D1-D25 in the files. No other raw file is newer than the morning refresh (MOBII, MOBO, SALMO 25 Nov 23:09; ENDBAL snapshot 25 Nov; no new Catalogue / Targets file), so Sell-In, Demand, PJP and ENDBAL stay at D25.
- GA tagging in the file 237,023 (D1-D25); the feeds are still cut at D24 because D25 is partial (tagging 5,267, Fav Locs 11,430 = 2.17x). **Fav Locs D24 was revised up: 10,282 -> 14,403 (0.92x -> 1.30x of tagging 11,120)**; D23 9,900 -> 9,958; D22 11,552 -> 11,659. Tagging D1-D24 is unchanged.
- Chain run by hand (daily_update does not detect the GA files): GA, GA site, KRO, Stock, program target, KPI November, non-PJP flags, period history (GA cut 24).
- Audits: GA 3,467/3,467, KRO reconciles, KPI November OK, consistency 278/278, scorecard 163/163, period history 96/96, render_check OK.
- Note: `website/app.js` carries uncommitted edits of another session; this refresh commits data and docs only.
