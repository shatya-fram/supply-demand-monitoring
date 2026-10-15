# Assessment · DAILY_DATA_MOBO_SALMO (Saldo Mobo demand, outlet → pelanggan)

Assessed 16 Oct 2026 before the feed changed (CLAUDE.md §2). Data contract for the category `SAL` in `scripts/build_demand_feed.py` (`demand_feed.json` / `DEMAND_FEED`). Companion of `daily_data_mobo_demand.md`.

## 1. File
`raw/Data as of 15 Oct /DAILY_DATA_MOBO_SALMO_202610.xlsb` (535 KB, saved 16 Oct 05:53). One sheet `Sheet1`, 15,451 rows: header row, then 15,450 rows.

| Column | Content |
|---|---|
| `MOBO_SALMO` | constant label |
| `id_outlet` | outlet id, text/number, 4–10 digits; no brand column, no outlet name |
| `DT_01` … `DT_31` | Rupiah per day (not hits). 1–15 Oct filled, 16–31 empty |

It is a different report from `DAILY_DATA_MOBO_202610.xlsb` (five sheets: SP_INJECTION, RELOAD, VOUCHER, CVM, RECARGE with `HITS_dd`/`AMOUNT_dd`). Its name starts with `DAILY_DATA_MOBO_`, so the daily command's MOBO search now excludes `SALMO`.

## 2. Definition (owner, 16 Oct 2026)
**Saldo Mobo that the outlet transacts to customers** (demand side of saldo; MOBII `SALMO` is the supply side, saldo transferred to the outlet). Same domain as Reload / Voucher Injection / CVM / Paket Data in the MOBO workbook.

Not confirmed: whether these Rupiah already include Reload, Voucher Injection or Paket Data sold from saldo. Scale suggests overlap is likely: SALMO 1–15 Oct is Rp 74.4 B against Rp 61.0 B for the four MOBO value categories together (RLD + VCI + CVM + PKT). Therefore SALMO is carried as its own category and **is not added to the total demand** (same rule as SP Injection) until the owner confirms the relation.

## 3. Findings
| Check | Result |
|---|---|
| Rows / unique ids | 15,450 / 15,450 (no duplicates) |
| Negative values | 0 |
| Days with data | 1–15 Oct; per day Rp 0.6–7.3 B, 1,538–4,305 active outlets |
| Day 15 | Rp 3.4 B vs Rp 4.0–4.6 B on 12–14 Oct: probably a partial day, treat as provisional |
| Sunday 11 Oct | Rp 0.6 B, 1,545 outlets (normal Sunday dip) |
| Match to master | 14,087 of 15,450 ids (91%): 8,575 IM3 ids + 5,514 3ID ids (zero-padding stripped), about 2 on both |
| Overlap with the other MOBO sheets | 9,207 ids also appear in `demand_feed` outlets; 6,243 are new outlets (SALMO only) |
| History | October only: no September, no LMTD, no last full month |

## 4. Rules in the feed
1. Key resolution = the same `resolve()` as the other MOBO sheets (IM3 master id, then 3ID master id, then ad-hoc mapping); brand from the id.
2. Category code `SAL`, label "Saldo Mobo (SALMO)". Fact = `[0 hits, Rp MTD, last day, active days, [[day, Rp, 0]]]`; per outlet `sb = [Rp IM3, Rp 3ID]`.
3. `SAL` is excluded from `value_categories`, from `bv` and from every total demand; outlets that only have SALMO get a row but are left out of the demand tables.
4. Ids not resolvable to a master or ad-hoc outlet are counted in `metadata.salmo.unknown` (not attributed).
5. `metadata.salmo` carries source, last day, outlet count, total and unknown. The demand cut (`cut_day`) stays defined by the five-sheet workbook.

## 5. Open items for the owner
- Is SALMO inclusive of Reload / Voucher / Paket Data (overlap), or additional?
- Brand: the file has no brand column; a dual-brand outlet is split by which of its ids appears.
- A September file in the same layout is needed for LMTD and last full month (the print sheets show SALMO demand for October only).

## 6. Result in the feed (builder run 16 Oct 2026, file saved 05:53)
| | |
|---|---|
| Outlets with SALMO in `demand_feed` (`c.SAL`) | 11,622 (3,828 of the 15,450 ids have no value on any day) |
| Value attributed to outlets, 1–15 Oct | **Rp 67.79 B** |
| Ids not resolvable (`metadata.salmo.unknown`) | 50 ids, Rp 6.62 B (9% of the file total of Rp 74.41 B): not attributed to any area |
| By class | ad-hoc ids 1,312 → Rp 53.62 B (79%); master 3ID 5,513 → Rp 6.70 B; master IM3 8,575 → Rp 7.47 B |
| Outlets with SALMO only (no other MOBO category) | 2,161; kept in the feed, left out of the demand tables |
| Total demand (RLD + VCI + CVM + PKT) | unchanged: Rp 60.98 B |

**Concentration warning** (same pattern as `daily_data_mobo_demand.md` §3): four fifths of SALMO sits on ad-hoc ids (outlets outside the master list, no DSE). Master outlets carry Rp 14.2 B only. The 50 unresolved ids (Rp 6.6 B) are probably large distributor / non-Inner-Jakarta ids and should be confirmed before the number is used for targets.

## 7. Where it shows
- Demand Customer › Scorecard: row "Saldo Mobo (SALMO)" (MTD, UAR = outlets with SALMO, daily average, run-rate, last working day vs previous), outside the total.
- Print Instructions: PJP daily sheet shows "SALMO Rp x" under Demand MTD; the population sheet and its CSV have a "Demand SALMO MTD" column.
- Not yet in the territory / DSE / outlet demand tables (category filter), because the relation to the other four categories is open.
