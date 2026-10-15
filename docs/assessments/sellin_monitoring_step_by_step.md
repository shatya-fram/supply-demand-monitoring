# Sell-In Monitoring (Step 2) · Step-by-Step Guide

**Date:** 13 October 2026
**Stage covered:** Phase 1, Stage 3: physical Sell-In (starter packs, vouchers) and electronic Sell-In (saldo / e-voucher) into outlets. Stage 1 (distributor to DSE) is touched where the same files show it.
**Inputs profiled today:** `raw/SP VC Sellin/` (2 files, 4,659 rows) and `raw/MOBI TRansfer Balance/` (2 files, 12,760 rows), both 01–11 Oct 2026, both 44 pipe-delimited columns with the same header.

---

## 1. What the two reports contain

| Report | Rows | What one row is | Value field to use |
|---|---|---|---|
| `SP VC Sellin` (Physical Distribution, `DISTRIBUTION TYPE = Sell In`) | 811 (3ID) + 3,848 (IM3) | One product line moved from a node to a node: distributor to sub-distributor, distributor to DSE, or DSE to outlet. `PRODUCT CATEGORY` is `Voucher` or `Starter Pack`. | `QTY × RATE/UNIT`. `FINAL VALUE` holds the operator id in 88% of rows, so it cannot be used. |
| `MOBI TRansfer Balance` (`DISTRIBUTION TYPE = Balance Transfer`) | 2,213 (3ID) + 10,547 (IM3) | One saldo transfer, `PRODUCT CATEGORY = E-Voucher`. `QTY` is the rupiah amount. | `QTY` (equals `FINAL VALUE` where numeric; 179 rows are non-numeric). |

Columns actually used (index in the header):

| Column | Meaning | Used for |
|---|---|---|
| 0 `TRANSACTION DATETIME` | `dd-Mon-yyyy hh:mm:ss` | day, hour |
| 5 `USER NAME` | login of the sender (DSE, SDP or distributor operator) | sender attribution |
| 10/11 `FROM NODE`, `FROM NODE NAME` | sender node id and name, e.g. `Canvasser_PT-PASAR MINGGU_1390603`, `MPC - OWNER_PT-JAKARTA PUSAT_968839`, `SDP_MC-KARAWANG…` | tier of the sender |
| 16 `INITIATOR MICRO CLUSTER` | sender's micro cluster, e.g. `MC-PASAR MINGGU` | fallback territory |
| 21 `DEST_SALDOMOBO_ID` | receiving outlet id (IM3: numeric, 3ID: `SH…`) | join key to the master catalogue |
| 22/23 `DEST_ORGANIZATIONNAME`, `DEST_OUTLET TYPE` | receiver name; `Mobo Outlet`, `Non Mobo Outlet`, or a partner name when the receiver is a distributor / `_MP3` | tier of the receiver |
| 34/36 `PRODUCT CATEGORY`, `PRODUCT NAME` | category and SKU | product split |
| 37/38 `QTY`, `RATE/UNIT` | units and unit price (balance: amount and 1.0) | value |
| 43 `BRAND` | `IM3` / `3ID` | brand split |

Not usable: `DEST BRANCH` and `DEST MICRO CLUSTER` are blank in 97% of rows; `INITIATOR BRANCH` holds the system area (`INNER JAKARTA WEST/EAST`), not the seven operational branches.

## 2. Join quality measured today

| Join | Result | Consequence |
|---|---|---|
| `DEST_SALDOMOBO_ID` to master outlet (`outlet_id_im3` / `outlet_id_3id`, leading zeros stripped) | SP/VC: 4,474 of 4,494 outlet-bound rows (99.6%). Balance: 6,478 of 12,758 (50.8%) | The balance export is not limited to Inner Jakarta (221 initiator micro clusters, including Cianjur, Sukabumi, Outer Jakarta). Keep only rows whose outlet is in the master, or whose initiator MC is one of our 36. |
| Sender login (`USER NAME`) to the master DSE codes (`dse_code_im3` / `dse_code_3id`, e.g. `DSEKEBAY768`, `DSEKEBAY7683ID`) | 476 of the 567 logins seen in the journey plan (84%) are a master DSE code; SP/VC rows carry a roster login in 95.6% of cases, balance rows in 51.4% (same Inner Jakarta cut) | Attribute the sender by **login = master DSE code** first, then by the receiving outlet's assigned DSE. Logins that are not DSE codes are SDPs, distributor operators or numeric MOBI ids. |
| Sender tier from `FROM NODE NAME` prefix | `Canvasser_` = DSE, `MPC - OWNER_` = distributor, `SDP_` = sub-dealer partner, numeric only = unknown | Three clean tiers plus an "other" bucket (about 1% of SP/VC rows, 3% of balance rows). |
| Receiver tier | `DEST_OUTLET TYPE` in (`Mobo Outlet`, `Non Mobo Outlet`) = outlet; `_MP3` in the name = sub-distributor; otherwise partner | SP/VC has 36 MPC to MP3 rows and 128 MPC to partner rows: that is the Stage 1 allocation trail. |

## 3. Pipeline, step by step

Script: `scripts/build_sellin_feed.py` (stdlib only, run from the project root). Output: `website/data/sellin_feed.js` plus `data/processed/sellin_feed.json`.

1. **Find the header by token.** Read each file until the line starting with `TRANSACTION DATETIME`; split by `|`; keep rows with exactly 44 fields; log the rest.
2. **Normalise one record** per row: `brand`, `dt` (parsed), `day` (`dd-Mon-yyyy`), `sender_login`, `sender_tier`, `sender_mc`, `receiver_id`, `receiver_tier`, `category`, `product`, `qty`, `value` (SP/VC: qty × rate; balance: qty), `source` (`physical` / `balance`).
3. **Attach territory from the master** (`website/data/territory_feed.json` outlets): for outlet-bound rows, look up `receiver_id` by brand; copy `outlet_key`, `outlet_name`, `site_nbs`, `dse_name`, `micro_cluster`, `dso_leader`, `branch`, `hoa_leader`, `kecamatan`. Rows that miss the master but whose `sender_mc` is one of the 36 Inner Jakarta MCs keep `micro_cluster` only and are flagged `unmapped_outlet`. Rows outside both are dropped and counted.
4. **Bridge DSE logins**: map `USER NAME` to the master DSE by code (`dse_code_im3` / `dse_code_3id`); for the rest, use the journey-plan `USER NAME` to `OPERATOR FULL NAME` pairs (567 logins) so the sender can still be named.
5. **Aggregate** by day, branch, micro cluster, DSE, site, outlet, brand, category and product: `tx_count`, `qty`, `value`, `outlets_reached`, plus per-DSE `strike rate` (outlets with Sell-In ÷ outlets visited, from the visits feed) and `average drop` (value ÷ outlets reached).
6. **Allocation trail (Stage 1 preview):** rows where the receiver is a partner or `_MP3`; aggregate by distributor, sub-distributor and product.
7. **Emit the feed** with a `metadata` block (period, files, row counts, dropped rows, unmapped rows) and the hierarchies needed by the view.
8. **Add the view** `Sell-In Monitoring` under `MONITORING` with the standard page anatomy: filter bar, scope line, four KPI cards, daily trend, then sub-views Physical (SP/VC), Electronic (saldo), By DSE, By Outlet, Allocation trail. Filters follow Branch / HoA / MC; a brand toggle and a category toggle sit in the toolbar.
9. **Test**: extend `scripts/render_check.js` with the new view and sub-views; reconcile feed totals with the raw sums (SP/VC units 325,750; balance Rp 50.1 B before the Inner Jakarta cut) and record the reconciliation in this file.

## 4. KPI definitions (proposed, to confirm with Operations)

| KPI | Definition |
|---|---|
| Physical Sell-In units | Σ `qty` of outlet-bound SP/VC rows, split Voucher / Starter Pack and IM3 / 3ID |
| Physical Sell-In value | Σ `qty × rate` of the same rows |
| Electronic Sell-In value | Σ `qty` of outlet-bound balance rows (Inner Jakarta cut) |
| Outlets reached | distinct `outlet_key` with at least one Sell-In row in the window |
| Strike rate (per DSE) | outlets with Sell-In ÷ outlets visited (visits feed), same window |
| Average drop | value ÷ outlets reached |
| Coverage | outlets reached ÷ master outlets in scope |

## 5. Open points

1. The balance export needs an Inner Jakarta filter at source, or we keep the master-match rule above (documented drop of 49%).
2. `FINAL VALUE` in SP/VC is corrupted at source; report to the data owner, keep `qty × rate` as the rule.
3. Distributor to DSE saldo injection is still not in any export (Stage 1 electronic side).
4. Confirm whether `SDP_` senders (sub-dealer partners, 185 SP/VC and 307 balance rows) count as DSE Sell-In or as a separate channel.
