# Target setting · Sell-In SP and OSA per DSE (assessment and contract)

**Date:** 15 Oct 2026 · **Source:** `raw/202610 - INNER JAKARTA - Target DSE Hybrid_FINAL REBALANCING.xlsx` (sheets: DSE Target, REBALANCING INNER JAKARTA, REBALANCING CHECK; three hidden ones). Scope here: the two KPIs Sell-In SP and OSA only.

## Structure used
Sheet **REBALANCING INNER JAKARTA**, header row 5, 272 DSE rows, 36 MCs, 7 branches (areas). No blanks, no duplicate DSE ids; DSE ids (IM3 or 3ID) all match the master (272 of 272).

| Columns | Content |
|---|---|
| 2, 3, 7, 8 | Branch, micro cluster, DSE id IM3, DSE id 3ID |
| 10-13 | Outlets: IM3 only, 3ID only, hybrid, total (13,896 mapped) |
| 15-23 | **Original** target, uniform per DSE inside an MC (before rebalancing) |
| 25-27 | **Rebalanced Sell-In SP** pcs: IM3, 3ID, IOH (IOH = IM3 + 3ID) |
| 29-31 | **Rebalanced OSA** in Rp: IM3, 3ID, IOH |

The rebalanced columns are the targets used. Aggregation: MC, Area and Region are sums of DSE targets; they agree with the area and MC targets in the workbook's check sheet (SP exact; rounding of fractional DSE targets can drift a few pcs).

## Totals (Oct 2026, monthly)
Sell-In SP: IM3 182,199 + 3ID 84,566 = **266,770 pcs**. OSA: IM3 Rp 52.57 B + 3ID Rp 21.07 B = **Rp 73.64 B**. Rebalancing moves target between DSEs and between IM3 and 3ID inside an MC; it does not change the area total.

## What the app does with it
- `scripts/build_target_feed.py` → `website/data/target_feed.js`; menu **Konfigurasi · Target Setting** (Region/Area/MC, per DSE, before vs after rebalancing; prorata MTD or full-month basis).
- `scripts/build_dse_kpi_feed.py` now takes OSA target from this file (271 of 272 roster entries are official; the pseudo-DSE "0" keeps the September proxy) and adds the SP target. Two DSEs named SUSANTO share one roster key, so their targets are summed.
- DSE Productivity: new SP columns Target and Ach.; SP slab basis toggle: official target (90% / 100%, default) or the policy tiers (1,500 / 2,000 pcs).

## Points to confirm
1. **Actual vs target scale.** September full month: SP 176,314 pcs (66% of target), saldo of qualifying outlets about Rp 74 B (target 73.6 B). October MTD to 13 Oct: SP 12,331 pcs against 52,602 last-month-to-date, saldo Rp 3.57 B against 8.59 B. So the ~10% achievement shown at 13/31 of the month comes from the October actuals in DAILY_DATA_MOBII being far below last month, not from the targets. Owner confirmed (15 Oct 2026): this is real, not an export error. MOBII and MOBO were migrated, so early-October data is genuinely low and only reaches the normal level around 10–13 Oct. Achievement, growth and incentive figures for October MTD are therefore structurally depressed.
2. Targets are split IM3 / 3ID but the actuals are not, so achievement is against the IOH target.
3. Whether the SP target includes SP injection (MOBO); our actual counts outlet sell-in only.
4. Slab for SP at 90% / 100% of target mirrors the OSA slabs and is an assumption; the policy slide's 1,500 / 2,000 pcs reading is kept as the alternative.

## Update 19 Oct 2026: target from the new SELL-IN_TAG workbook
`raw/SELL-IN_TAG_RGUGA_OSA_OUTLET_IM3_3ID_202610.xlsb`, sheet **DSE** (cols 3 / 4 DSE id IM3 / 3ID, 7-9 Sell-In SP target IM3 / 3ID / IOH, 10-12 OSA target IM3 / 3ID / IOH) is now the source of the per-DSE targets in `build_target_feed.py` (the older rebalancing workbook still supplies outlets and the original, pre-rebalancing target). All 272 DSE ids match; values equal the earlier rebalanced targets within rounding (sheet total SP 182,202 + 84,567 = 266,769; the feed sums rounded DSE targets, so it can sit 3 pcs lower). IM3, 3ID and IOH are kept separate; achievement stays on the blended IOH target (IM3 + 3ID) for now.

**Update 20 Oct 2026 (owner):** the Sell-In SP target is the target for SP 3GB + SP Injection, SP Zero excluded. This closes point 3 above (the target does include SP injection) and the achievement now uses the same basis (see `dse_kpi_policy.md`).
