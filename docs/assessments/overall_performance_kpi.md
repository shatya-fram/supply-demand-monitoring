# Assessment · Overall Performance SA/MC (Morning DSE Briefing) · KPI scorecard

Written 17 Oct 2026 with the rebuild of the page (`viewMbOverall()` in `website/app.js`). The page follows the Sales Area and DSO / MC filter; every block uses the same territory.

## 1. Page layout
1. **KPI Scorecard** (`mbOverallKpis()`): PJP and Effective Call · **outlet health** (moved up 17 Oct 2026) · Total OSA Amount · Sell-In SP · SALMO Sell-In · Gross Add and SSO.
2. **PJP Performance and Heatmap**: existing scorecard and calendar heat map; "Detail" drills SA → MC → DSE → outlet.
3. **Sell-In Performance and Heatmap**: existing scorecard and daily value heat map (SA → MC → DSE → outlet).
4. **Top 20 lists** (`mbOverallLists()`): outlets with zero balance, zero SP Sell-In MTD, zero GA; sites with zero GA.

## 1b. KPI boxes (17 Oct 2026, second pass)
- Compact boxes (`.kpis-s`, several per line) with the absolute change next to the percentage: Δ pcs / Rp / outlets vs LMTD or previous day, gap to target, gap to the 50% Effective Call target.
- **Every box is clickable**: a popup lists the shortlist behind the number (DSE with name, login ID, MC, plan, actual, gap; or outlets / MCs) with summary lines, and a **Salin** button that copies the whole list (tab-separated, all rows) for pasting into text. Closes with ✕, ESC or a click outside. Popup data is built per render by `ovAdd()`; DSEs are merged across the visits, KPI, sell-in and GA feeds by DSE name (`ovDseTable()`).
- **Gap and required running rate (popups and box notes):** Gap = MTD − full month (negative = short). The full month is the official FM target for OSA and Sell-In SP, and the September actual for SALMO and GA (no GA target exists). **Req RR/hari = shortfall ÷ days left after the report date** (month days − report day; 15 days left on 16 Oct, 16 for GA at 15 Oct); the list also shows the current RR (MTD ÷ report day) and, for D-1 lists, D-1 against the required rate. Totals are repeated in the summary lines, e.g. OSA: shortfall Rp 66.85 B ÷ 15 days = Rp 4.46 B per day against Rp 424.1 Jt per day now.
- The popup is wide (up to 1,560 px) so the whole table fits one frame without horizontal scrolling. Three actions: **Salin tabel** (tab-separated text, all rows), **Salin gambar** (report image: title, scope, summary lines and the first 60 rows in the order shown, drawn on a canvas, no library; copied to the clipboard as PNG, falls back to a download when the browser refuses clipboard images) and **PNG** (download).
- Columns are sortable (click the header; numbers sort numerically, text alphabetically). Salin copies the rows in the order shown.
- Lists show the first 200 rows; Salin copies up to 300 per list.

## 1c. Heat map toggles (17 Oct 2026)
- **Sell-In heat map › "% vs target harian"** (`pjHeatAch()`): cell = Sell-In of the day ÷ **daily target**; daily target = (FM target − MTD) ÷ days left after the report date, i.e. the required running rate of that row (so 100% = the pace that still has to be held every remaining day). Target = official OSA target (Rp) for "Semua kategori" (SP + voucher + saldo, SP Injection excluded) and official SP target (pcs) for "Starter Pack"; area, MC and DSE rows, **master outlets only** (the official target covers DSE-mapped outlets). Columns: Target FM, MTD (master), Gap vs FM, Target harian (Req RR), RR kini. ✓ = FM target already met; · = no official target (other categories, outlet level). Colours: the 100 / 90 / 80 / 70 standard.
- **PJP heat map › "Eff Call of the day"**: cell = productive visits ÷ planned stops of the day (% of PJP outlets with a sell-in effective call), from the new daily productive column; colour = EC ÷ KPI target 50% on the same standard (EC 50% = 100% = green); columns Rencana / Produktif / % Eff Call. Not available per outlet (✓ / ○ view stays) and not per brand (productive visits are not split by brand).

## 2. Definitions and sources
| KPI | Definition | Source |
|---|---|---|
| D-1 | Last day of the feed that is not a Sunday and not n/a (PJP, MOBII: 16 Oct; GA: 15 Oct, one day behind) | each feed |
| % PJP MTD / D-1 | executed ÷ planned stops, canvassers only (promotors excluded) | `dse_visits_feed` (`dses[]`, `daily`) |
| % DSE with 100% PJP | DSEs with planned > 0 whose executed ≥ planned on D-1; MTD value in the note | same |
| Effective Call | productive ÷ planned visits (KPI DSE policy: productive = SP/VC qty > 0 or saldo > Rp 50 Rb); target 50% | same, new daily column 6 (productive) |
| % DSE with Eff Call > 80% | productive ÷ planned > 80%, MTD; D-1 in the note | same |
| OSA Amount MTD | sell-in value of DSE-mapped outlets whose combined value reaches Rp 300 Rb (policy rule) vs official FM target and vs prorata target | `dse_kpi_feed`, `target_feed` |
| D-1 OSA Amount | D-1 sell-in (SP + voucher + saldo) to master outlets, **without the Rp 300 Rb threshold** (a threshold on one day is not defined), vs daily target = FM target ÷ 31 | `penjualan_feed` |
| Sell-In SP | pcs MTD vs LMTD (1–16 Sep) and September full month; achievement vs official SP target (FM and prorata); UAR = outlets with SP value > 0 MTD and on D-1 | `penjualan_feed`, `target_feed` |
| SALMO | Rp MTD vs LMTD, D-1, UAR MTD and D-1 (Sell-In saldo, MOBII) | `penjualan_feed` |
| Gross Add / SSO | GA MTD vs LMTD (1–15), D-1, SSO MTD vs LMTD, D-1 SSO ÷ master outlets | `raw/GA` only (`ga_feed`) |
| Outlet health | master outlets in scope: visited / never visited MTD, SP MTD = 0, GA MTD = 0, ENDBAL stock ≤ 0 | `opdBase()` |
| Top 20 lists | ranked by what the outlet or site bought in September (last full month): zero balance and zero SP by September order / SP, zero GA by September GA | `opdBase()` |

## 3. Gaps
- **No GA target** exists: the target workbook (`Target DSE Hybrid FINAL REBALANCING`) carries only Sell-In SP and OSA. "GA vs target FM" and "D-1 GA vs daily target" show "—"; the page compares with September full month and the September daily average instead. A GA target file would close this.
- D-1 for GA is 15 Oct while the other feeds are at 16 Oct.
- The outlet-health denominator is the 14,694 master outlets (860 have no DSE); the PJP scorecard uses the 13,826 outlets assigned to a DSE.
- Effective Call and OSA targets are not available per day, so D-1 OSA is compared with the monthly target ÷ 31.

## 4. Feed change
`dse_visits_feed` daily series (`branches`, `micro_clusters`, `dses`) gained a 7th column per day: **productive** visits (`metadata.daily_columns` lists it). Existing consumers read columns 0–5 and are unaffected. Checked: DSE sum on 16 Oct = 3,184 = region timeline; MTD sum = 21,345 = `productive_visits`.
