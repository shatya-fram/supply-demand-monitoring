# GA refresh 18 Nov 2026 (siang)

- New GA files (18 Nov 05:50): `rguga_daily_outlet_inner_202611.csv` and `rguga_daily_favloc_inner_202611.csv`, now D1-D17. No other raw file is newer than the morning refresh, so Sell-In, Demand, PJP and ENDBAL stay at D17.
- GA tagging MTD 150,759; Fav Locs 176,796 rows. D1-D15 of tagging is unchanged (131,734); D16 was revised up (tagging 7,167 -> 7,237, Fav Locs 7,690 -> 8,983, ratio 1.24).
- D17 is probably still partial: tagging 11,788, Fav Locs 12,180 (ratio 1.03 against the normal 1.15-1.25); expect an upward Fav Locs revision in the next file.
- Chain run by hand: GA, GA site, KRO, Stock, non-PJP flags, period history (GA cut 17).
- Audits: GA 3,467/3,467, KRO reconciles, consistency 278/278, scorecard 162/162, period history 96/96, popups 0 missing, render_check OK. audit_sp still fails 1 of 16 (de-dup 22,263 of 56,921 pcs, 39% > 15%, booster; bulk stays counted as performance per owner rule of 13 Nov).
- Publishing this refresh also publishes commit `191f445` (Effective Call denominator = outlets visited incl. ad-hoc from 1 Nov), which was committed by another session but not yet published.
