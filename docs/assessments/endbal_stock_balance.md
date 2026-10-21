# ENDBAL · Stock Balance Daily Report · Assessment (before any build)

**Date:** 15 October 2026 · **Status:** observation only, nothing built, nothing committed
**Files:** `raw/ENDBAL/endbal_20261014__01.csv` (100,000 rows) and `endbal_20261014__02.csv` (27,379 rows). `raw/` is git-ignored, so the files themselves are never committed.

## 1. What the file is

"Stock Balance Daily Report", region Inner Jakarta, **one snapshot: closing balance on 14 Oct 2026** (every row dated 2026-10-14). Comma CSV with a 14-line preamble; the header is the line starting `"Date"`. File 02 repeats the header. 14 columns:

| Column | Content |
|---|---|
| Date, Channel, Region, Area, Sales Area, Cluster, Additional Territory | Location. Area is the system area (West/East); Sales Area is the **September structure** (North Karawang, Depok, South Jakarta ...); Cluster is an MC, **42 values, including MCs that no longer exist** (MC-Depok Barat/Timur, MC-Cikarang, MC-Bekasi Selatan, MC-Jakarta Pusat, MC-Muara Gembong) |
| Organization Type, ID, Name | 126,609 of 127,379 rows are Outlets; also Dealer, Sub outlet, Dealer Branch, SDP, Agent Mobo and others (about 770 rows) |
| Account Type | `Stock Account Normal`, `Commission Transaction Account`, or **blank** |
| Average Transaction Amount | average daily transaction value of that account (filled for about 13% of rows) |
| Current Balance | closing balance in rupiah |
| Inventory Days | = Current Balance ÷ Average Transaction Amount (checked: median ratio 1.05); blank when there is no average |

**Structure.** An organization has several rows: typically one `Stock Account Normal` row plus three blank-labelled rows (38% of organizations), or stock + commission + one blank (30%). 40,637 distinct organizations, 40,295 of them outlets. **The only consistently labelled stock wallet is `Stock Account Normal`, one per outlet**, so it is the headline measure below. The blank rows are unlabelled wallets (Rp 2.2 B on master outlets) and the commission account is earned commission (Rp 0.7 B); both need the data owner to say what they are before they are added to stock.

## 2. Match to our master (14,694 outlets)

| Result | Count |
|---|---|
| Outlet organizations matched to a **master** outlet by ID (IM3 or 3ID, leading zeros stripped) | 22,318 organizations = **14,604 master outlets (99.4%)**, because dual-brand outlets appear twice |
| Matched to an **ad-hoc** outlet (outlets visited but not in the master) | 2,699 |
| **Unmapped** outlets (no DSE or MC in any of our mappings) | 15,278, mostly in old clusters (Karawang 1,158, Depok Barat 909, Cikarang 886, Rengasdengklok 878 ...) |
| Non-outlet organizations (dealers, SDP, agents) | about 340 |

Rolled up to one record per outlet: **17,303 outlets with a stock account**, 14,604 master and 2,699 ad-hoc. Territory uses our master MC, DSE and area, not the file's own (older) cluster.

## 3. What the data says (stock account, 14 Oct, master outlets, n = 14,604)

| Measure | Result |
|---|---|
| Total stock balance | **Rp 3.13 B**; median outlet **Rp 35K**; the top 1% of outlets hold 21% |
| Balance bands | **0: 3,012 (20.6%)** · under Rp 50K: 4,597 (31.5%) · 50–100K: 1,022 (7.0%) · 100–300K: 3,065 (21.0%) · **≥ Rp 300K: 2,908 (19.9%)** |
| Outlets with sales (average transaction > 0) | 7,855 (54%), daily throughput Rp 687M |
| Days of cover (outlets with sales, weighted) | **4.1 days**. Bands: under 1 day 1,647 · 1–3 days 1,173 · 3–7 1,699 · 7–14 1,411 · 14–30 1,055 · over 30 days 870 |
| Cross with October saldo sell-in | 5,572 outlets under Rp 50K had **no saldo bought this month**; 2,037 outlets bought saldo and are already empty (fast turnover) |

The balance bands are the same ones GAPLOK uses in the OSA sheet (under 50K, 50–100K, 100K and up, 300K minimum), so this file gives a **direct availability measure** where the KPI DSE page now uses sell-in as a proxy.

## 4. Insight available at each level

### Per outlet
- Current stock, average daily sales and days of cover; status band (empty, low, healthy, overstock).
- Action flags built from stock plus our other feeds:
  - **Empty with demand** (balance below one day of sales): 1,647 outlets. Replenish first.
  - **Empty and bought saldo in September but not October**: 2,038 outlets. Re-activation list.
  - **Holding ≥ Rp 300K with no saldo bought in October**: 887 outlets. Stock from earlier purchases; do not push more.
  - **Overstock** (over 30 days of cover and ≥ Rp 100K): 829 outlets.
  - **Dormant** (no balance, no sales, no saldo in September or October): 791 outlets. Candidates for clean-up of the PJP.
- Combined with visits: empty outlet that is also unvisited MTD = highest-priority visit.

### Per territory (area, MC)
Share of outlets under Rp 50K and at ≥ Rp 300K, total stock, cover days.

| Area | Outlets | Under 50K | ≥ 300K | Stock | Cover days |
|---|---|---|---|---|---|
| Central North Jakarta | 1,674 | 44.5% | **25.5%** | Rp 472 Jt | 7.5 |
| South Jakarta Depok | 2,594 | 48.8% | 24.4% | Rp 655 Jt | 3.3 |
| West Jakarta | 1,546 | 50.4% | 23.5% | Rp 485 Jt | 8.5 |
| Bekasi | 1,691 | 48.7% | 20.0% | Rp 346 Jt | 6.7 |
| East Jakarta | 1,813 | 58.8% | 19.8% | Rp 360 Jt | 5.8 |
| Karawang | 2,367 | 46.0% | 18.4% | Rp 442 Jt | **1.8** |
| **Kab Bekasi** | 2,919 | **63.0%** | **12.1%** | Rp 372 Jt | 4.8 |

Best MCs by ≥ 300K share: Kebayoran 37%, Pancoran 33%, Pademangan 32%. Weakest: Cibitung 9% (70% empty), Pebayuran 11%, Cibarusah 12%, Tambun 12%. Karawang has the lowest cover, 1.8 days: its outlets sell quickly and run dry.

### Per DSE (271 DSEs with 20 or more outlets)
Share of the DSE's outlets at ≥ Rp 300K ranges from **0% to 52%** (median 20%). Best: Usman 52%, Rizky Fadilah 51%, DSEIN118 50%. Worst: Endra bin Marda 0%, Ismail Marjuki 1%, Eko Wijaya 4%. Highest empty shares: Muhammad Zulfikar 80%, Laraswati Indah 79%, Charles Muarif 79%. This is the measure needed for the **OSA KPI** (outlets with stock available) and complements the sell-in view: a DSE can sell in a lot and still leave outlets empty, or the reverse.

## 5. Data issues to resolve before building

1. **Account meaning.** What the blank accounts (Rp 2.2 B) and the commission account are, and whether "Stock Account Normal" alone is the right OSA stock. This changes the totals by about 70%.
2. **Snapshot only.** One date, so no trend, no stock-out duration and no consumption can be derived. A daily series (even weekly) would turn it into replenishment timing.
3. **Cluster structure.** 15,278 outlets sit in the old 42-cluster structure and are not in our 36-MC master, so they cannot be given a DSE or area. Needs the September-to-October mapping or the full outlet master.
4. **Average Transaction Amount** is filled for only 54% of master outlets; cover days exist only for those.
5. **Duplicate rows.** Same organization and account type appears up to 3 times with different balances (the blank rows). They must be summed deliberately, not de-duplicated.
6. **825 master outlets have DSE "0.0"** in the mapping (860 in the master); they are unassigned and show up as one pseudo-DSE with 94% empty outlets.
7. **Date.** 14 Oct snapshot against sell-in cut 13 Oct and PJP cut 11 Oct.

## 6. Suggested build, if approved

1. `scripts/build_endbal_feed.py`: per outlet stock, other, commission, average, cover days, status band; per-day file naming ready for a daily series.
2. Add to **Ringkasan Performance** a tab "Stok Outlet (ENDBAL)" with the band distribution per area, MC and DSE, and the five action lists; drill to outlets.
3. Use stock ≥ Rp 300K as an **OSA availability** option in the DSE Productivity KPI, next to the current sell-in basis.

Pending the owner's answer on point 1 and the daily file.

## 7. Built: menu "END BALANCE Outlet" (15 Oct 2026)

`scripts/build_endbal_feed.py` → `website/data/endbal_feed.js`; view `mb_endbal` under Morning DSE Briefing. Tabs: Ringkasan (scorecard + summary Region/Area/MC-DSO/DSE following the header filter), Outlet Zero Stock (segments: with demand, bought Sep not Oct, dormant; CSV export), Slab Balance & Inventory Days, Site dengan Outlet Zero (expandable), Detail DSO · DSE (Outlet ID, Name, Stock/Komisi/Lainnya, Total, Average Transaction, Balance terakhir, Inventory Days). Basis toggle: Stock Account only (default) or + unlabelled accounts; commission never counts as stock.
Sell-in saldo kemarin uses DAILY_DATA_MOBII (value only; no transaction count exists, so UAR is the proxy). 15,278 outlets in old clusters are unmapped and excluded. Open owner questions in section 5 still apply.

## 8. Clickable counts and outlet popups (21 October 2026)

**Data check before the change (data contract).** All per outlet, keyed by the master `outlet_key` (`k`):

| Need | Source | Check |
|---|---|---|
| End Balance, average transaction, inventory days | `endbal_feed` (`st`, `ot`, `av`), basis toggle | 18,063 outlets; snapshot **20 Oct 2026** = sell-in cut 20 Oct (lag 0 days; the Data checklist already warns when it lags) |
| Saldo sell-in FM / MTD / LMTD | `endbal_feed` `sf` / `mt` / `sl`, copied from `penjualan_feed` SALMO facts (`[mtd q, mtd v, lmtd q, lmtd v, fm q, fm v]`) | present for every outlet (0 when no sell-in); Rp only, the popup does not show quantity. 1–9 Oct is depressed by the system migration (genuine) |
| Voucher Injection MTD / LMTD | `demand_feed` `c.VCI[1]` / `l.VCI[1]` (MOBO VCI, Rp), matched by `k` for 16,188 of 18,063 outlets; an outlet absent from the demand feed has no demand = Rp 0 | `l` exists for 16,061 outlets (September workbook loaded), so LMTD 0 is a real 0; n/a only when the demand feed itself is not loaded |
| Visit count, last visit | `dse_visits_feed` `dses[].outlets[].d` (count of `x` = completed PJP check-in days, promotors excluded) and `last_visit[k]` | 13,421 of 16,025 master outlets have a last visit; master outlets in no journey plan show 0 / "belum pernah"; ad-hoc outlets (non-PJP) show **n/a** |

**Built.** In every End Balance table each balance-band and inventory-days slab cell shows `count · %` (Ringkasan, Slab, Site, Detail), and every count (outlets, zero stock, bands, UAR, zero with demand, KPI cards, segment cards) opens a popup (`eb|<scope>|<metric>`; scope = all, area, mc, DSE of an MC, site). Popup columns: outlet, ID, MC · Area, DSE, FM / MTD / LMTD saldo sell-in, Voucher Injection MTD / LMTD, End Balance, average transaction, inventory days, visit count, last visit (ISO date, sortable). Rows are sortable; copy as text, image or PNG takes all rows. The zero-stock list, the site detail, the DSE detail and the CSV export gained Jumlah visit MTD and Last visit. No existing figure changed. Check: `node scripts/render_check.js` ("endbal popups": popup rows = cell count).
