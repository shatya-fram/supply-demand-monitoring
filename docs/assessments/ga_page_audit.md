# Audit · Gross Add page (outlet tagging and site / location bases)

Audited 19 Oct 2026 (GA cut 17 Oct). `node scripts/audit_ga.js` recomputes the page from `ga_feed.js` with naive loops and compares: every KPI card, the per-brand table, every Area and MC row of the territory table, the Harian and Slab SSO tabs and the target cards, for both bases, brand all / IM3 / 3ID, source of outlet (all / PJP), master-only and three territory scopes: 4,636 checks (also run by `daily_update.py`).

## Definitions (per card)
| Card | Definition |
|---|---|
| GA MTD (1–17 Okt) | Σ GA pcs of the outlets in scope, days 1..cut; growth = MTD ÷ LMTD − 1, LMTD = September days 1..cut. "GA di luar master" = GA at outlets that are not master outlets (still in the total) |
| GA Last Full Month | Σ September days 1..30; "waktu berjalan" = cut ÷ 31 |
| Gap MTD vs Last FM | MTD − Last FM (negative = still below September); the note gives the shortfall per remaining day (days left = 31 − cut) against the run-rate now |
| Run-rate harian | GA ÷ cut days (calendar days, same for LMTD); last 10 days = days 8..cut |
| Proyeksi akhir Okt | run-rate MTD × 31; compared with September full month |
| SSO MTD (semua outlet) | outlets with ≥ 1 GA in days 1..cut (IM3 + 3ID folded to one physical outlet); the note splits master outlets (÷ master outlets in scope) and outlets outside the master |
| Rata-rata SSO per hari | outlet-days with GA ÷ cut days, the like-for-like measure against LMTD; the 30-day SSO of September is shown only as a reference |
| GA per SSO | GA MTD ÷ SSO MTD; baru = SSO now, none in LMTD; hilang = SSO in LMTD, none now |
| GA ber-DSE (tagging basis) | GA at outlets that have a DSE: the base of the DSE incentive |
| Kecamatan aktif GA (site basis) | target kecamatan (121, M2S KECAMATAN) with GA MTD > 0, over the kecamatan in scope; LMTD likewise |
| GA per kecamatan aktif, konsentrasi 10 teratas (site basis) | GA at outlets whose kecamatan is written in the RGUGA file, ÷ active kecamatan; top-10 kecamatan ÷ that same GA |
| GA vs target Oktober | GA at outlets with a target kecamatan vs the sum of IM3 `TARGET RGUGA KEC` + 3ID `TARGET OCT`; pro-rata = target × cut ÷ 31; projection = run-rate × 31; required = (target − GA) ÷ days left |

## Errors found and fixed
1. **Kecamatan counted twice (site basis).** Three September-only rows (MEDAN SATRIA, TANJUNG PRIOK, BANTARGEBANG) carried the kecamatan without the kabupaten while October carried "KECAMATAN|KABUPATEN": each became a second site (123 sites instead of 121). `build_ga_feed.py` now maps a kecamatan-only label to the one full label of that kecamatan.
2. **GA per kecamatan aktif and concentration used the wrong base.** Both divided by the whole GA MTD (126,365) although 13,167 pcs (10.4%) sit at outlets without a kecamatan: 1,027 pcs → **936 pcs** per active kecamatan, top-10 share 22.4% → **25.0%**. They now use the located GA only.
3. **The site basis showed the location of the wrong brand row.** An outlet's location was taken from whichever brand row came first, so in the IM3 view an outlet could be filed under the micro cluster of its 3ID sheet (MC-Cipayung IM3: 1,358 shown vs 1,401 in the IM3 sheets, up to 3% on an MC). A brand view now uses that brand's own row; the IOH view uses the row with more GA.
4. **Gap card** only showed the shortfall; it now also gives the daily requirement (8,988/hari for 14 days against 7,433/hari now), the same logic as the scorecard.

## Verified correct
GA MTD / LMTD / Last FM, gap, growth, run-rate, projection, SSO (all, master, LMTD, baru, hilang), average SSO per day, GA per SSO, GA ber-DSE, target and pro-rata, brand table (IM3 + 3ID, IOH folds outlets once), every Area and MC row, daily GA and SSO per day, slab totals.

## Data limits
13,167 pcs (10.4%) of October GA is at outlets without a kecamatan in the RGUGA files; 8 master outlets have no usable id. Source: outlets known only from the raw pivots.
