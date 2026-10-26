# Stok Outlet · Over / Par / Low · Data assessment and contract

**Date:** 26 Oct 2026 · **Menu:** `mb_stock` ("Stok Outlet · Over / Par / Low", sidebar under END BALANCE Outlet) · **Feed:** `website/data/stock_feed.js` (`scripts/build_stock_feed.py`) · **Code:** `website/stock.js` (view, map) plus small hooks in `app.js` (`stockApi`, `viewStock`).

## 1. Request (owner)

One menu for Outlet, Site, MC and Area level with: sell-in and sell-out of SP, Voucher and Saldo for the last two months (September full month, October MTD) against GA (full month and MTD) so the remaining balance can be seen; remaining stock of VC, SP and Saldo per outlet; saldo aggregated per site, kecamatan, area and region; a choropleth showing which site, MC or area is **Over stock (green)**, **At par (yellow)** or **Low stock (red)** for SP, Voucher and / or Saldo, filterable, with site and polygon information.

## 2. Assessment of the sources (before the build)

| Need | Source in the project | Key | Finding |
|---|---|---|---|
| SP sell-in | MOBII `penjualan_feed` (via `kro_feed` `q.sp`: SP + SP Injection) | outlet key `k` | pcs, Sep full month and Oct MTD per outlet. |
| SP sell-out | RGUGA `ga_feed` (via `kro_feed` `q.ga`) | `k` | GA pcs per outlet; Sep full month, Oct to 24 Oct. |
| Voucher sell-in / sell-out | MOBII VC (isi + blank, Rp) / MOBO Voucher Injection (Rp) (`q.vsi`, `q.vso`) | `k` | Rp only in the feed. |
| Saldo sell-in / sell-out | MOBII SALMO transfer / MOBO Saldo Mobo (`q.ssi`, `q.sso`) | `k` | Rp. September SALMO file present, so Sep is available. |
| Saldo stock | `endbal_feed` Stock Account Normal balance, other accounts, average daily transaction | `k` | **The only real stock measure**; 18,086 outlets matched, 2,217 ENDBAL-only outlets added. |
| Location | `territory_management_master` (site, kecamatan, desa, lat / long), `kro_feed` MC / area | `outlet_key` | Hull of kecamatan exists in the map feed; Site and MC polygons are not in `raw/`, so they are drawn as the convex hull of the outlets of that site / MC / area. |

The union of KRO rows (7,171) and slim rows (16,770) plus ENDBAL-only outlets gives **26,158 outlets** with at least one number. Totals (Rp / pcs): SP in 325,878 (Sep) + 216,908 (Okt); GA 252,195 + 190,666; Voucher in Rp 13.3 B + 3.6 B, Voucher Injection Rp 22.1 B + 13.1 B; Saldo in Rp 28.9 B + 13.6 B, Saldo Mobo Rp 143.4 B + 119.6 B; ENDBAL stock account Rp 3.85 B.

### Findings that shape the design

1. **Only Saldo has a real stock number.** For SP and Voucher no stock-on-hand file exists in `raw/`. Their stock is an **estimate from flows** since 1 Sep: sell-in − sell-out. The opening stock at 1 Sep is unknown, and vouchers or SP lost, expired or sourced elsewhere are not visible. The screen says "est." on those figures.
2. **Saldo flows cannot be netted.** Saldo Mobo sell-out (Rp 143 B in September) is five times the saldo sell-in (Rp 29 B), because outlets also top up through other channels and sell at face value. Net flow would show every outlet as empty, so Saldo stock = ENDBAL balance and cover = balance ÷ average daily transaction (the ENDBAL definition of inventory days). Sell-in and sell-out stay visible as information columns.
3. **Voucher sell-out (Voucher Injection) is larger than voucher sell-in** in total (Rp 35.2 B vs Rp 16.9 B over the two periods). The Voucher estimate is therefore conservative (more Low than reality). To be confirmed by the data owner: whether Voucher Injection volume is supplied outside MOBII voucher sell-in.
4. SP: 9,913 of 22,972 outlets have net flow < 0 (GA above sell-in); these are Low when they sell. SP GA covers to 24 Oct while sell-in covers to 25 Oct (one day, ignored).
5. Hybrid outlets are one row (key `k` of the master); non-master outlets keep their `A:` / `S:` keys and no site.

## 3. Definitions (the data contract)

Per outlet and product `p` (stock in the unit of the product: pcs for SP, Rp for Voucher and Saldo):

- `in_fm` / `in_mtd` = sell-in September full month / October MTD; `out_fm` / `out_mtd` = sell-out, same periods.
- **Stock** SP, Voucher = `in_fm + in_mtd − out_fm − out_mtd` (estimate). **Stock** Saldo = ENDBAL `st` (optionally `+ ot`, other accounts, toggle "Saldo: tambahkan rekening lain").
- **Daily sell-out rate** SP = `out_mtd ÷ GA cut day` (24); Voucher = `out_mtd ÷ demand cut day` (25); if `out_mtd = 0`, `out_fm ÷ 30`. Saldo rate = ENDBAL average daily transaction `av`.
- **Cover (days)** = max(stock, 0) ÷ rate.
- **Status:** rate = 0 and stock > 0 → **Over** (stock without sales); rate = 0 and stock ≤ 0 → grey (no activity or no ENDBAL row); stock ≤ 0 with sales → **Low**; cover < Low threshold → **Low**; cover > Over threshold → **Over**; otherwise **Par**. Default thresholds (editable on the page): SP 7 / 30 days, Voucher 7 / 30 days, Saldo 3 / 14 days (the Saldo pair follows the ENDBAL inventory-days bands; the SP and Voucher defaults are proposals, owner to confirm).
- **Aggregates** (Site, Kecamatan, MC, Area, Region): sell-in / sell-out summed; stock = sum of the positive outlet stocks; rate = sum of outlet rates; status from the aggregate cover with the same thresholds; the mix Low · Par · Over of the outlets inside is shown next to it. With several products selected the combined status is the worst (Low if any selected product is Low).
- Site = site × MC instance (`site|MC`, 4,249 convention), outlets without a site (or `PENDING-NBS`) group as "(tanpa site)". Kecamatan groups by name across MCs.

## 4. Menu

- **Ringkasan & Tabel:** KPI card per selected product (stock, Low / Par / Over outlets, sell-in and sell-out of both months, cover); a table at the chosen level (Area, MC, Kecamatan, Site, Outlet) with, per product, Sell-in Sep, Sell-in Okt MTD, Sell-out Sep, Sell-out Okt MTD, Stok · cover, Status; a REGION total row; Site and Outlet levels are grouped Area › MC with expand / collapse and subtotals (shared helper `grpBody`).
- **Peta Over · Par · Low:** Leaflet choropleth at the chosen level (Area, MC, Kecamatan, Site hull or circle, Outlet point) coloured red / yellow / green / grey; popup with the in / out / stock / cover per product and a "Fokus MC" button that applies the territory filter.
- Controls: Produk (multi-select SP / Voucher / Saldo), Level, Tampilkan (all / Low / Par / Over / inactive), search (Enter), editable thresholds, Saldo basis toggle; the Branch / HoA / MC filter bar applies; shareable link keys `stTab`, `stProd`, `stLevel`, `stStat`.

## 5. Limits

- SP and Voucher stock are flow estimates (finding 1); cover thresholds are proposals.
- October is a migration month (1–9 Oct sell-in and sell-out are structurally low, see CLAUDE.md): September full month dominates the estimate.
- Site and MC polygons are hulls of outlet points, not surveyed boundaries.
- Outlets without ENDBAL rows have unknown Saldo stock (grey), not zero.
