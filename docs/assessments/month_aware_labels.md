# Month-aware labels in the app (3 Nov 2026)

Owner request (via the 3 Nov session): after the month roll the Sell-In, Demand, PJP, KPI and ENDBAL feeds hold MTD November (cut 2 Nov) with LMTD / Full Month October, but the app printed October / September. This note is the contract for how labels, day counts and targets now follow the feeds.

## 1. Three clocks (`moClocks()` in `website/app.js`)

| Clock | Source | Today | Used for |
|---|---|---|---|
| Sell-in | month of `penjualan_feed.metadata.cut` (fallback demand cut) | November | Sell-In, Demand, PJP, ENDBAL, KPI, KRO supply / demand, Stok, Partner, Program, Opportunity |
| GA | `ga_feed.metadata.months.cur` | October | every Gross Add / SSO figure (GA builder is not month-aware yet) |
| Target | month named in `target_feed.metadata.period` | October | "Target Okt" text and the M2S GA target |

Day counts: `MO.days()` = `mtd_month_days` (Nov 30), `MO.prevDays()` = `lmtd_full_days` (Oct 31); GA keeps its own `cur_days` / `prev_days`.

## 2. How the text is rewritten (assumption A1)

The ~840 literals "Okt / Oktober / Sep / September" in `app.js` were written for October. They are not replaced one by one; `moText()` (called from `brRelabelText` / `brRelabelHtml`, popups, copy-as-text, PNG, CSV, header and purpose text) shifts each Indonesian month word by the clock it belongs to: running month = `Okt` slot, month before = `Sep` slot. Which clock:

1. the view: `mb_grossadd`, `mb_gatrend` and the GA product of KRO / Program use the GA clock, `cfg_target` the target clock, `mb_periods` is untouched (its labels already come from the archive);
2. a word right after GA / SSO / RGUGA / Gross Add uses the GA clock, after "Target" the target clock;
3. GA builders embedded in other pages (`gaCards`, `gaRingkasan`, …, the Ringkasan Gross Add tab, the UAR SSO tab) are wrapped by `moGa()` so their whole text keeps the GA month;
4. never shifted: migration notes ("1–9 Okt … migrasi"), KPI policy file name ("KPI DSE Oct 2026"), catalogue / FINAL / IOH_Outlet / M2S dates;
5. a month word followed by U+200B is already derived from a date (data checklist) and is left alone; English month names (`Oct`) come from dates and are not touched.

New code should use `MO.cur()`, `MO.prev()`, `MO.days()` instead of literals. Limitation: a sentence that mixes a sell-in figure and a GA figure in one text node with no GA word beside the month word takes the page clock; such places must use `moGa()`.

## 3. Day constants and projections

`× 31` / `/ 30` in non-GA code now read `mtd_month_days` / `lmtd_full_days` (Run-rate akhir, KRO notes, pace line `FM × cut / base days`). `build_kro_feed.py` projects supply / demand to the running month (30), GA to the GA month (31), and divides the last-7-days run-rate by `min(7, cut)` instead of 7 (a 2-day month was divided by 7, understating the projection 3.5×). `cuts` now carries `month_days`, `base_days` (31), `ga_month_days`, `ga_base_days`. The KRO feed was rebuilt (the committed one was older than the penjualan feed: SP MTD 611 → 1,217 pcs, 3,227 → 3,584 rows).

## 4. Targets (assumption A2)

SP (266,765 pcs) and OSA targets are October targets. When the target month differs from the running month, `moNeutraliseTargets()` zeroes them in the in-memory KPI rows: achievement, pro-rata, slab and incentive read n/a / "—", and a note ("Target n/a") shows on DSE Productivity, Partner Performance, Target Setting. Actuals stay visible; the Target Setting tables keep showing the October targets under the October label. GA vs the M2S kecamatan target is unchanged (GA and target are both October). Incentives need the November target workbook; no fallback to policy tiers.

`build_dse_kpi_feed.py` `metadata.period` now follows the cut month ("MTD November 2026"). Builders should add an explicit `month` to `target_feed.metadata` when the November target arrives (today it is parsed from the `period` text).

## 5. Caveats and early-month notes

- LMTD October 1–9 is the MOBII / MOBO migration period: growth vs LMTD (e.g. +2,150% SP) is not a performance signal. The existing migration notes stay (they name October on purpose). Compare MTD with Full Month October per day (Review Periode does this).
- Cut < 7: projections and "last 7 days" run-rates use the days that exist; 1 Nov is a Sunday (zero). Do not read a 2-day projection as a month forecast.

## 6. What stays October on purpose

GA (Gross Add, Daily GA Trend, SSO in UAR / Overall / Ringkasan / Opportunity, GA product of KRO and Program, GA site feed, M2S kecamatan target), SP / OSA target text, "KPI DSE Oct 2026" policy name, catalogue 202610 and FINAL / IOH_Outlet dates, migration notes, Fav Locs 26 Okt, Vanguard snapshot 29 Okt. They move when the GA builder (file and sheet names) and the target files become month-aware.

## 7. Checks

`node scripts/render_check.js` renders every view, then re-labels all pages as if the sell-in feeds were December (cut 2 Dec) with the app marking every word it keeps on purpose; any unmarked Okt / Sep / Oktober / September fails the run (1,761 pages). `MONTH_DUMP=<file>` writes every month word as printed on the real feeds for review. `audit_scorecard.js` skips target comparisons while targets are n/a. Consistency, scorecard, GA, KRO and SP audits pass.
