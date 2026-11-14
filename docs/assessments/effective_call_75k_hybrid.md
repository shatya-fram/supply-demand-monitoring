# Effective Call: minimum saldo Rp 75K and hybrid approach (13 Nov 2026)

Owner decisions: (1) the saldo minimum of an Effective Call is Rp 75,000 (was > Rp 50,000), for SALDO only; SP / Voucher stay effective at pcs > 0; (2) hybrid approach: for a Hybrid outlet (IM3 + 3ID paired) the saldo of both brands is combined, either brand alone or both together can make the outlet effective; for a non-Hybrid outlet every sale counts on its own (IM3 or 3ID standalone); (3) Daily Heatmap shows, for every day, outlets that made an Effective Call versus outlets visited; (4) the rule applies to the Daily Eff Call and the scorecards; (5) the October archive should support the same view.

## Implementation
| Part | Change |
|---|---|
| `scripts/generate_dse_visits_feed.py` | `SALDO_MIN_RP = 75000` with `>=`; per outlet-day entity: effective = SP / Voucher > 0 or saldo >= 75K (Hybrid: IM3 + 3ID saldo summed); stop `pf` (productive) = effective outlet-day and the stop carried Sell-In (Hybrid) or met the rule alone (not Hybrid). New per outlet row fields `e` (Sell-In per visit day) and `hy`. `regional_summary.productive_visits_old_rule` keeps the previous count. |
| `scripts/build_dse_kpi_feed.py` | text only: effective call definition |
| `website/app.js` | Daily Heatmap Eff Call: per outlet and per day (`ecDseMaps`, `ecSum`, `ecDayCell`), outlet cells, visit popup `pv|` (`pvLazy`), columns Outlet-hari divisit / efektif / % EC / Outlet unik efektif ÷ divisit |
| October archive | `data/archive/2026-10/dse_visits_feed.js.gz`: `e` / `hy` added from a rebuild of the October visit files (27,082 of 28,448 outlet rows matched; the rest show no Sell-In); productive counts of the close unchanged |

## Effect (12 Nov data)
Productive stops 44,424 with the new rule against 44,474 with the old one (-50): lowering the saldo bar from > 50K to >= 75K removes some stops, combining IM3 + 3ID for Hybrid outlets adds others (49 Hybrid outlet-days in November are effective only because the two brands are combined). DSE Sukron Mamun: 174 productive of 223 stops, 171 effective of 184 outlet-days.

## Open points
- KPI / incentive effective-call compliance follows the feed, so it moved with the rule (owner asked for Daily Eff Call and scorecards; confirm the incentive should follow).
- Stop-level scorecard counts stops, the Daily Heatmap counts unique outlets per day (a Hybrid visited by both brands is one outlet): same rule, different unit.
- October view B: scorecards keep the rule of the close (> 50K); only the per-outlet Eff Call heatmap uses the new rule.
