# Daily GA Trend (`mb_gatrend`) · audit of the GA basis toggle (22 Oct 2026)

Scope: menu `mb_gatrend`, plus the GA numbers of Gross Add (`mb_grossadd`). Feed `ga_feed.js` (cut 20 Oct 2026), helpers `gaPrep`, `gaScopeList`, `gaAgg`, `gaDaily`, `gaTgt*`. Checked by `node scripts/audit_ga.js` (section "Daily GA Trend").

## 1. What the two bases are

Both bases use the **same RGUGA quantities** (one value per outlet per day). They differ only in the *attribution dimension* used by the territory filters and tables:

| | Outlet sell-in (tagging) | Site / lokasi |
|---|---|---|
| Territory of a row | outlet → master DSE → MC → Area (`o.br`, `o.mc`, `o.hoa`) | kecamatan, micro cluster and area as written in the RGUGA file (`lbr`, `lmc`, `lhoa`, `lkk`) |
| DSE filter | applies | **does not apply** (location has no DSE); the page now says so |
| Target | none | October target per kecamatan and brand (M2S KECAMATAN) |
| Use | DSE incentive | HoA / Region / DSO KPI |

## 2. Reconciliation (brand IOH, sumber Semua, cakupan Semua outlet GA, cut 20 Oct)

| Measure | Outlet basis | Site basis | Reason |
|---|---|---|---|
| GA MTD D1–D20, whole region | 152,825 (IM3 101,256 + 3ID 51,569) | 152,825 | No territory filter: every outlet is in scope on both bases, so the totals are identical by construction. |
| LMTD D1–D20 / run-rate / projection | 148,947 · 7,641/day · 236,879 | same | idem |
| With a branch filter (South Jakarta Depok) | 27,165 | 27,163 | An outlet's tagging area (MC / DSE) and the area written in the RGUGA file can differ; 2 pcs move across the border. |
| GA compared with the target (site only) | n/a | 136,619 | Only GA at outlets whose kecamatan is written in the RGUGA file *and* is one of the 121 target kecamatan. The rest (about 16.2 k pcs MTD: outlets without kecamatan in the file, or outside the target list) stays in the MTD total but is outside the target comparison, as on the Gross Add page. |

So "MTD 152,825" and "GA D1–D20 vs target pro-rata 136,619" are **two different bases of comparison on the same page**; the second card says it counts only GA with a kecamatan, and the gap is not mixed with the first.

## 3. Card / series / table matrix (state before and after this change)

Legend: B basis, Br brand, S sumber outlet (Semua / PJP / NON / KAM), C cakupan, T territory (branch, HoA, MC), D DSE filter. All of them come from `gaScopeList()` → `gtSeries()` → `gaDaily()` except the target block.

| Item | B | Br | S | C | T | D | Note |
|---|---|---|---|---|---|---|---|
| Chart bars Oktober, line September, 7-day averages | ✔ | ✔ | ✔ | ✔ | ✔ | outlet only | same series `ser`; basis only changes who is in scope |
| Cumulative chart, projection lines | ✔ | ✔ | ✔ | ✔ | ✔ | outlet only | target line only on site (new) |
| Day selector D1–D31 (`gtDay`) | ✔ | ✔ | ✔ | ✔ | ✔ | outlet only | all cards read day `ne` |
| GA of the day, MTD, LMTD (same days and workday-aligned), run-rate, 7-day run-rate, projection | ✔ | ✔ | ✔ | ✔ | ✔ | outlet only | verified against a naive recomputation per basis |
| SSO of the day, average SSO per day, GA per SSO-day, best / worst day | ✔ | ✔ | ✔ | ✔ | ✔ | outlet only | idem |
| Target cards (target, GA vs pro-rata, projection vs target, required per day) | site only (**fixed**) | ✔ | ✔ | ✔ | ✔ | n/a | **Before:** shown on both bases (and hidden when a DSE was chosen even on site). **Now:** only on site; the outlet basis shows a "target hanya untuk basis site / lokasi" note with a switch button. |
| Gap vs pro-rata target | site only | ✔ | ✔ | ✔ | ✔ | n/a | **new** gap = actual − target × day / 31 in the card delta |
| Daily table D1–D31 (target columns) | ✔ | ✔ | ✔ | ✔ | ✔ | outlet only | target columns only on site |
| Weekday profile | ✔ | ✔ | ✔ | ✔ | ✔ | outlet only | |
| GA per day per territory (MTD, LMTD, growth, target cells) | ✔ | ✔ | ✔ | ✔ | ✔ | outlet only | rows = Area / MC / DSE (outlet) or kecamatan (site); target cells only on site |

Finding: the numeric cards did already follow the toggle (the toggle changes `gaScopeList`), so no series ignored it. What was wrong: (1) the target block ignored the basis, (2) on site the target block disappeared when a DSE was selected although DSE does not apply, (3) nothing said which basis a number is on, (4) the shared link did not carry basis, brand, sumber, cakupan or the day.

## 4. Changes

- Target cards only when basis = site; explicit note on the outlet basis.
- Every KPI title and chart / table title carries "· basis site" or "· basis outlet"; a line under the filter bar states basis, brand, sumber, cakupan and territory, and that the DSE filter does not apply on site.
- Gap vs pro-rata target in the target card.
- Shared link (`RT_VIEW_TABS`): `mb_gatrend` and `mb_grossadd` carry `gaBasis`, `gaBrand`, `gaSg`, `gaCover`; the trend page also `gtDay`.
- `scripts/audit_ga.js`: new section (216 configurations × basis, brand, sumber, cakupan, territory, day) checking MTD, LMTD, day value, run-rate, 7-day run-rate, projection, basis label, target card absent on outlet and equal to the recomputation on site, gap and % pro-rata, and the link keys.
