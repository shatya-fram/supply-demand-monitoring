# Partner territory and distributor allocation (data contract)

**Date:** 20 Oct 2026 · **View:** Morning DSE Briefing › Partner & Alokasi Distributor (`mb_partner`, link `#/mb_partner`) · **Request:** owner, 20 Oct 2026 ("Alokasi distributor", "Partner Territory").

## Sources and keys
| Block | Source | Key / fields |
|---|---|---|
| Partner territory | `website/data/territory_feed.json` outlets | `partner_name_im3`, `partner_name_3id` (per brand id of the master outlet), `branch`, `micro_cluster`, `dse_name`. 14,694 master outlets; 14 IM3 partner names, 29 3ID partner names. |
| Partner sell-in | `penjualan_feed` outlets, join `outlet_key` = penjualan `k` (14,381 of 14,381 master rows match) | per brand `bs[brand].SP` (MTD pcs, LMTD pcs) and `bs[brand].SALMO` (MTD, LMTD value). Vouchers are not split per brand in the feed, so they are not shown per partner. |
| Distributor allocation | `penjualan_feed.allocation` (393 receiver nodes that are not outlets) | `tier` (MPC 53, DSE 60, SDP 2, OTHER 7, UNKNOWN 271), `mc`, `br`, `c.SP / VCF / VCB` = [MTD qty, MTD value, LMTD qty, LMTD value, FM qty, FM value, ...]. |

## Rules
- Partner = name on the master outlet for the selected brand id; an outlet without that brand id is not counted for that brand. Brand-pure sell-in only (SP, Saldo Mobo).
- Allocation = SP and vouchers sent to non-outlet nodes (MPC main distributor, SDP, DSE canvasser fill-in, FWA stockist). It is shown next to outlet-bound sell-in per micro cluster: fill-in to DSE minus sell-in to outlets is the stock still with the DSE or not yet booked to an outlet.
- 271 allocation nodes have no name, MC or area (1,613 SP pcs MTD); they only appear in the tier table, not in the per-MC table.
- The distributor company name (ORGANIZATION NAME) is not carried in the penjualan allocation feed; only tier and MC. The older sell-in feed (to 10 Oct) has distributor names; it is not used here.
- October 2026 MTD vs LMTD is depressed by the MOBII / MOBO migration (CLAUDE.md caveat).
- Filters (SA, MC, DSE) apply to both tabs; allocation nodes follow SA / MC (nodes have no DSE).

## Open points
1. "PARTNER TERRITORY" column of the DSE target sheet (e.g. `PT-BEKASI TENGAH`) is a territory id per DSE, not the partner company; it is not used yet.
2. Whether a per-distributor-company view (names from the MOBI report) should replace the tier view.

## Partner Territory Performance (view `mb_partner_perf`, 20 Oct 2026)
Distributor (partner name of the chosen brand id) › Partner Territory (= micro cluster, aggregate of the outlets in the MC) › DSE.
- **Sell-in** per distributor and MC: SP pcs and Saldo Mobo, MTD vs LMTD, brand-pure (`bs[brand]`).
- **DSE productivity** per distributor and MC: the DSE Productivity rules (`dkScore` / `dkAgg`): OSA amount vs target, SP pcs (incl. SP Injection, switch) vs target, effective call, final incentive; targets are blended IM3 + 3ID, basis prorata or full month (same switches as DSE Productivity).
- **DSE → distributor:** the partner with most of the DSE's outlets. Checked: 272 of 272 DSEs have ≥ 90% of their outlets under one partner (IM3 names and 3ID names). A DSE with no outlet carrying the chosen brand id (20 for IM3) stays in the totals on a line "(DSE tanpa outlet IM3)", so the totals equal the DSE Productivity page (SP target 266,769 and OSA target Rp 73.6 B at full month).
- IM3 and 3ID partner names differ (for example `ELKOMINDO MITRA MANDIRI, PT` vs `PT ELKOMINDO MITRA MANDIRI_KAB_BEKASI_EMPAT`); they are shown per brand, not merged into one company. Merging them needs a mapping table from the owner.
