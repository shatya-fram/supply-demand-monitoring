# DSE Productivity · KPI DSE Oct 2026 · Policy, definitions and assumptions

**Date:** 14 October 2026
**Where:** Morning DSE Briefing → Ringkasan Performance → tab **DSE Productivity** (default tab)
**Code:** `scripts/build_dse_kpi_feed.py` (inputs per DSE) and `viewDseProductivity()` / `dkScore()` in `website/app.js` (scoring)
**Source of the policy:** slide "KPI DSE – Oct 2026" (owner, 14 Oct 2026)

---

## 1. The policy as implemented

| Block | Rule |
|---|---|
| **OSA** (donut 40%) | Every DSE is measured against an individual OSA target. At **SLA 90%** of target the DSE earns **0.2%** of the OSA amount, at **SLA 100%** **0.4%**. Maximum **Rp 1 Mn**. |
| **SP Data Sell In** (donut 60%) | Sell-in of SP data to the DSE's outlet mapping. **≥ 1,500 SP** is the 90% slab, **≥ 2,000 SP** the 100% slab. Maximum **Rp 1 Mn**. |
| **Compliance 1 · weight 50%** | Outlets in the DSE's mapping with SP data sell-in **≥ 5 pcs**: target **30 (urban) / 25 (rural)**. |
| **Compliance 2 · weight 50%** | **Effective call** target **50%**, based on fix PJP. Calculated from all outlets in the DSE mapping; ad-hoc visits outside the mapping count as visited outlets. |
| **Compliance score → index** | ≥ 100% → **× 1** · ≥ 90% and < 100% → **× 0.97** · ≥ 80% and < 90% → **× 0.95** · < 80% → **0** |
| **Final incentive** | **(OSA incentive + SP incentive) × compliance index** |

Each compliance component is capped at 100% before weighting. That follows the GAPLOK workbook ("Total EF (cap 100%)" in sheet `6. EFFECTIVE CALL`), so over-achieving one component cannot make up for the other.

## 2. How each input is measured

| Input | Definition | Source |
|---|---|---|
| **OSA amount** | Value (Rp) of **SP + voucher (isi and blank) + saldo Mobo sell-in** to the DSE's mapped outlets whose combined value **reaches Rp 300K** in the period (owner confirmed definition, 15 Oct 2026). Default is all mapped outlets ("Semua outlet", owner, 15 Oct 2026); the toggle "Outlet ≥ Rp 300K" applies the GAPLOK qualifying rule. The SP slab always uses the official individual target (90% / 100%); the 1,500 / 2,000 pcs policy option was removed. | `DAILY_DATA_MOBII` via `penjualan_feed.json`. The Rp 300K rule is GAPLOK's "OSA DSE productivity – min 300K". |
| **OSA target** | Individual target. **Proxy until official targets exist:** the same measure on **September full month** per DSE. | `data/catalogues/dse_kpi_targets.csv` if present, else proxy |
| **SP pcs** | SP pieces sold in (all brands, all SP products) to the DSE's mapped outlets. | `DAILY_DATA_MOBII` SP sheets |
| **UAR ≥ 5 pcs** | Number of mapped outlets with ≥ 5 SP pcs in the period. | same |
| **Effective call** | **Productive visits ÷ planned visits (fix PJP).** A productive visit is an executed visit with SP/VC qty > 0 or saldo > Rp 50K. Toggle "Visit terlaksana" uses executed visits instead. | `dse_visits_feed.js` (cut 11 Oct) |
| **Urban / rural** | Branch rule: **Karawang and Kab Bekasi = rural**, all other areas urban. A `class` column (U/R) in the targets file overrides it per DSE. | `build_dse_kpi_feed.py` |

DSE identity: the master roster (272 DSEs, from the outlet mapping) is the key. All 272 appear in the sell-in feed; 271 are matched to a visits row (220 by name, 52 by DSE login code, 1 duplicate merged). One DSE has no PJP data.

## 3. Basis toggles on the page

| Toggle | Options | Default | Why |
|---|---|---|---|
| **Basis target** | Prorata MTD (13/31) · Target penuh bulan | Prorata | A monthly target compared with 13 days of sales makes every DSE look at zero. Prorata multiplies the OSA target, the SP tiers and the UAR target by days elapsed ÷ days in month. The 50% effective-call target is a ratio and is not prorated. |
| **Amount OSA** | Outlet ≥ Rp 300K · Semua saldo | Outlet ≥ Rp 300K | GAPLOK rule |
| **Effective call** | Visit produktif · Visit terlaksana | Visit produktif | "Effective" is read as a call that produced a sale, consistent with the GAPLOK sheet. |

## 4. Assumptions that need the owner's confirmation

1. **0.2% and 0.4%** are read as percentages **of the OSA amount**, capped at Rp 1 Mn. (The GAPLOK scorecard carries an "ACT AMOUNT" column and an incentive column for OSA, which fits this reading.)
2. **SP slabs** 1,500 and 2,000 are read as stepped tiers: 1,500 pays **90% of Rp 1 Mn**, 2,000 pays the full Rp 1 Mn. The slide does not say what the 1,500 tier pays. The payout factors are in `POLICY.sp.tiers[].payout` in the builder.
3. **Weights 40% / 60%** on the slide are shown as information. They are not applied as rupiah multipliers, because the slide gives each KPI its own Rp 1 Mn maximum. If they should scale the incentive, the OSA maximum becomes Rp 400K and the SP maximum Rp 600K.
4. **Individual OSA targets** are not in any file we hold. The September proxy is a placeholder; supply `dse_kpi_targets.csv` (template: `data/catalogues/dse_kpi_targets_template.csv`, one row per DSE, already filled with the proxy) and rerun the builder.
5. **Effective call** uses planned PJP stops as the denominator ("based on fix PJP"). Ad-hoc visits outside the PJP are not in the visits data, so they cannot be added to the numerator yet.
6. **SP injection** (digital SP from the MOBO file) is part of SP achievement since 19 Oct 2026 (owner): DSE SP pcs = SP sell-in (MOBII) + SP injection (MOBO, MTD, `spi_pcs` in the KPI feed). It counts against the Sell-In SP target and the 90% / 100% slab, and rolls up to DSO, MC, Area and Region; a switch in DSE Productivity ("SP Injection") shows the sell-in-only view. Open point: whether the SP target was set to include injection. The MOBO file ends on 11 Oct while MOBII ends on 13 Oct.
7. **Cuts differ by source:** sell-in 13 Oct, PJP visits 11 Oct. The page header states both.

## 5. What the data says today (14 Oct, default options)

| Measure | Result |
|---|---|
| DSEs in scope | 272 (271 with PJP data) |
| OSA | Rp 3.26 B from qualifying outlets against a prorated target of Rp 10.6 B: **30.8%**. **8 DSEs** reach the 100% slab and **2** the 90% slab; 262 are below 90%. Together they earn **Rp 876K** of OSA incentive, which is the whole incentive pool today. |
| SP pcs | **12,331** across all DSEs. The best DSE has **323 pcs**; the first prorated tier is **629 pcs**, so **no DSE reaches an SP slab**. On the full-month basis (1,500 / 2,000) the gap is wider still. |
| UAR ≥ 5 pcs | 1,665 outlets against a prorated target of about 3,240 |
| Effective call (productive) | about 14% of planned visits against a 50% target |
| Compliance index | **263 DSEs × 0**, 5 × 0.95, 1 × 0.97, 3 × 1 |
| Incentive | **Rp 876K before the index, Rp 0 after.** With effective call read as executed visits (hit rate 58%) the index is × 1 for 37 DSEs and the final incentive is Rp 59K. |
| Full-month basis | No DSE earns any incentive. |

Three reasons the numbers are so low, all visible in the data:

- **SP sell-in only started late.** 93% of the month's SP units reached outlets on 10, 12 and 13 Oct. See the Starter Pack note of 14 Oct.
- **Effective call is the binding constraint.** The compliance index is zero for almost everyone because productive visits are only about a quarter of executed visits.
- **The OSA target is a proxy** equal to last month's actual, so achievement says "pace against September", not "against target".

## 6. Verification

The scoring was recomputed independently in Python for every DSE and all eight option combinations (basis × OSA amount × effective call). Total incentive and final incentive on the page matched in every case (for example prorata, outlet ≥ Rp 300K, productive: total Rp 876,003, final Rp 0; with executed visits: Rp 876,003 and Rp 59,094). The page also renders without errors for every toggle, sort order, and for Area, MC and DSE levels (`scripts/render_check.js`, 21 DSE Productivity states).
