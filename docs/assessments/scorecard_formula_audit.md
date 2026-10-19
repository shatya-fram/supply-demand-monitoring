# Audit · formulas of the Overall Performance KPI scorecard (growth, gap, DSE and outlet counts)

Audited 19 Oct 2026 (data cut: sell-in 18 Oct, PJP 18 Oct, GA 17 Oct, ENDBAL 16 Oct). Every KPI card was recomputed straight from the feeds with naive loops and compared with the page: `node scripts/audit_scorecard.js` (140 checks over four scopes: region, a branch, an HoA, an MC; it also runs at the end of `daily_update.py`).

## Verified correct (no change)
Growth = MTD ÷ LMTD − 1 over the same days (SP −66.3%, SALMO −44.6%, GA +1.4%, SSO −16.7%); gap = actual − target (PJP −29,749, OSA, SP); pro-rata = target × cut ÷ days in month (OSA 18/31, SP 18/31, GA 17/31); required run-rate = shortfall ÷ days left; D-1 = last non-Sunday day of the feed (17 Oct) against the previous working day; PJP totals (94,799 planned, 65,050 executed, 24,915 productive) equal the visits feed; EC = productive ÷ planned.

## Errors found and fixed
| # | Where | Was | Is | Cause |
|---|---|---|---|---|
| 1 | UAR SP / SALMO cards (Overall; Penjualan scorecard and the coverage column per area / MC) | SP 34.4%, SALMO 60.1% of 14,694 master outlets | **34.0%**, **56.9%** | the numerator counted the 72 (SP) and 482 (SALMO) ad-hoc outlets that are not master outlets. `pjAgg` now keeps `omM` / `olM` (master only); the ad-hoc outlets are shown as "+N adhoc". Card colour follows Δ vs LMTD (a negative Δ was shown green). |
| 2 | "Outlet divisit vs total outlet" | 13,754 / 14,694 = 93.6%, belum 940 | **12,889 / 13,834 ber-DSE = 93.2%**, belum 939 | the 860 outlets without a DSE have no PJP and were counted as visited. PJP coverage is now measured on outlets that have a DSE; the other health cards (SP, GA, saldo) keep all master outlets. |
| 3 | DSE counts in the PJP cards | "376 DSE" | **293 DSE terpetakan + 84 login belum terpetakan** (1,094 planned, 75 executed) | operators that are not in the master (numeric ids, CSO codes) were counted as DSE; D-1 100% / EC > 80% shares used the same base (25 / 376 became 20 / 293). Planned and executed totals still include them, as in Ringkasan PJP. |
| 4 | DSE identity across feeds (per-DSE lists behind the cards) | 424 DSE rows, 271 in OSA | **one row per person (272 KPI DSE + 21 mapped operators without outlets + 84 unmapped logins)**; OSA 272 DSE | rows were merged by name: 69 DSEs have a login code as name in the territory / KPI / sell-in / GA feeds but a person name in the PJP feed (split into two rows), and the two DSEs named SUSANTO were merged. Identity is now the person id (`pid` = `person_id`); sell-in and GA rows resolve name + MC to it. |
| 5 | HoA filter on the PJP cards | ignored (region totals shown for any HoA) | filters by the operator's `hoa_leader` | `ovIn` was called without the HoA. |
| 6 | GA master base (% SSO, D-1 SSO) | 14,639 outlets | **14,677** with an id usable in RGUGA | 40 master ids had no row in any RGUGA sheet and were not carried; `build_ga_feed.py` now carries them as zero-GA rows. |
| 7 | Stale text | "Outlet master (14,694 termasuk 860 tanpa DSE)" hard-coded | computed from the scope | |

## Known data limits (not formula errors)
- The territory master has 14,694 rows but 14,685 distinct outlet keys: nine keys appear twice (name "0.0" duplicates, `0_0` unnamed outlets, one outlet in two MCs). Per-outlet counts built from rows are therefore up to 9 higher than counts built from keys (belum divisit 939 vs the visits feed's 937).
- 8 master outlets have neither an IM3 nor a 3ID id, so GA cannot reach them (14,677 of 14,685 keys).
- The 21 operators that are mapped to the master but own no master outlet have 2,362 planned visits and 1,366 executed; they count in PJP totals and in the DSE count, not in OSA / SP targets.
- GA D-1 and the GA MTD use the GA cut (17 Oct); sell-in and PJP use 18 Oct. Each card states its own cut.
