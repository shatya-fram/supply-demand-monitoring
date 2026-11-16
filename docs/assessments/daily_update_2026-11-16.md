# Daily update 16 Nov 2026, second refresh (scan 14:14 WIB)

## Files received (raw/)
| Source | Newest file | Status |
|---|---|---|
| MOBII Supply, MOBO Demand, MOBO_SALMO (`..._202611.xlsb`) | 16 Nov 07:09 | new, cut D15 |
| Visit PJP | `*_14_14.zip` (IM3 + 3ID) and `3id_visit_dse_202611__15_15.zip`, 16 Nov 07:10 | new, PJP 01-15 Nov. **`im3_visit_dse_202611__15_15.zip` is missing**. 15 Nov is a Sunday: only 15 planned visits (all 3ID), IM3 0, so the figures do not change; the IM3 file may still arrive |
| ENDBAL (Stock Balance Daily Report) | 16 Nov 14:14 | new, snapshot 2026-11-15 |
| GA by Outlet / Fav Locs | 16 Nov 05:47 | unchanged since the 16 Nov GA refresh (D1-D15) |

## Result (Sell-In, Demand, PJP, ENDBAL, GA all D15)
- Penjualan MTD: SP outlet Rp 926.9 jt (D13: 692.8), SALMO Rp 11,729.3 jt (D13: 10,929.3); LMTD 1-15: SP Rp 250.3 jt, SALMO Rp 5,443.3 jt.
- Demand: SALMO Rp 72.15 B (11,420 outlets, day 15; D13: 61.51), SP Injection Rp 455.2 jt, Reload Rp 18.28 B of which Rp 14.70 B at 48 non-PJP ids (distributor-account pattern as before).
- PJP 01-15 Nov: planned 102,098, executed 97,071 (95.1%), productive 54,540. D14 (Sat) 8,899 planned / 8,741 executed; D15 (Sun) 15 planned, shown as a non-working day, not as zero execution. 1 Nov is the other listed missing day.
- ENDBAL snapshot 15 Nov: 27,201 outlets, 210,561 rows, stock Rp 3.74 B (13 Nov snapshot: 4.21 B, -11%, Sunday snapshot), 11,610 outlets with zero stock, saldo sell-in D15 Rp 799.2 jt (2,372 outlets); the "kemarin" cards use the last working day (14 Nov).
- GA is now at the same cut as the other feeds (D15), so ratios between GA and Sell-In / Demand are on the same days again. GA D14 / D15 may still be revised up (Fav Locs ÷ tagging 1.13x and 1.04x on 16 Nov).
- `daily_update.py` skips GA / KRO / Stock when no GA file is new: KRO, Stock, non-PJP flags and period history rebuilt by hand (period history: demand, sellin, pjp, ga all cut 15).

## GA by Outlet and Fav Locs assessment
- Files are the 16 Nov 05:47 versions already published (tagging 131,738 rows, Fav Locs 153,971 rows, 1-15 Nov); feed and site feed cut 15, unchanged by this run. Nothing new to assess; D14 / D15 stay on the watch list.

## Audits
audit_kro reconciles, audit_period_history 96/96, audit_consistency 278/278 (warning: UAR > 100% for 2 DSE after the 3 Nov hierarchy), audit_scorecard 162/162, audit_ga 3,467/3,467, audit_popups 0 missing, audit_dse_catalogue 0 failed, audit_entity 0 failed, render_check OK.
**audit_sp 15/16, the same single item open since 12 Nov**: de-dup of SP Injection = 22,208 pcs of 56,615 (39%, limit 15%; 13,026 on 14 Nov). New on D14: 9,182 pcs of SP HAPPY S PLUS V2 at 8 ids (551781 2,969 · SH241529 2,950 · 12322983 900 · 175492 895 · 437422 880 · 49826 493 · SH022775 76 · 554521 19) recorded twice, in MOBII and MOBO SP_INJECTION, with equal quantity. Per the owner rule (13 Nov) the bulk / booster SP stays in performance: MOBII sell-in is kept and only the MOBO duplicate copy is dropped. The share keeps growing because the booster volume is large, so the 15% alarm is no longer informative; the threshold decision is with the owner.

## Open items
1. audit_sp de-dup threshold (owner): the alarm now trips on every refresh because of the booster.
2. `im3_visit_dse_202611__15_15.zip` missing (Sunday, no effect on the figures); confirm with Thofa.
3. GA D14 / D15 may be revised up in the next file.
