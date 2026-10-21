# Daily close assessment · closing 20 Oct 2026 (refresh run 21 Oct 2026 06:07)

Scope: scan of `raw/` for files new since the 19 Oct feeds, run of `python3 scripts/daily_update.py`, and
checks of every feed against the contracts in this folder. Result: **OK, all feeds at cut 20 Oct except GA (18 Oct).**

## 1. New input found in raw/

| Source | File | Written | Content |
|---|---|---|---|
| MOBII (Sell-In) | `raw/MOBO  MOBII Data as of (Daily Update by Thofa)/DAILY_DATA_MOBII_202610.xlsb` | 20 Oct 23:03 | MTD to **20 Oct** (auto-detected cut day 20) |
| MOBO (Demand) | `DAILY_DATA_MOBO_202610.xlsb`, `DAILY_DATA_MOBO_SALMO_202610.xlsb` | 20 Oct 23:04 | MTD to **20 Oct** |
| MOBO Sep (baseline) | `DAILY_DATA_MOBO_202609.xlsb` | 18 Oct 09:44 | unchanged, still the LMTD / Last FM source |
| PJP visits | `3id_visit_dse_202610__20_20.zip`, `im3_visit_dse_202610__20_20.zip` | 20 Oct 23:04 | journey plan of **20 Oct** (also delivered inside `OneDrive_4_10-21-2026.zip`, identical names, so it is a duplicate bundle) |
| ENDBAL | `87136690_Stock Balance Daily Report_2026-10-21_05-14-33*.csv` | 21 Oct 05:14 | newest snapshot; builder uses only the latest (feed `snapshot = 2026-10-20`, sell-in cut 20) |
| GA (RGUGA) | none new | | GA feed stays at **18 Oct** |

## 2. Checks

- Feed cuts: penjualan 2026-10-20, demand 2026-10-20, DSE visits `period_end` 20-Oct-2026, KPI "sell-in cut 2026-10-20 · visits cut day 20", ENDBAL snapshot 2026-10-20.
- PJP calendar: 17 business days in the period, `missing_days = []` (12 Oct is now covered by `__12_12.csv`). Planned 111,786, executed 79,987 (71.6%), productive 33,113. KPI feed counts 108,000 planned / 78,337 executed because promotors and ad-hoc visits at DSE-less outlets are excluded by rule (owner, 15 Oct).
- Sell-In outlet-bound MTD to 20 Oct (Rp jt): SP 538.8 · Voucher isi 1,596.6 · Voucher blank 262.7 · Saldo 9,159.8 · SP Injection 615.3 (34,442 pcs). 17,650 outlet rows.
- Daily outlet-bound total, last days: 15 Oct 1,070.8 · 16 Oct 1,578.9 · 17 Oct 968.1 · **18 Oct 7.2 (Sunday, expected)** · 19 Oct 1,093.3 · 20 Oct 1,403.2 (Rp jt). No gap or duplicate day.
- Demand MTD by category (Rp jt): Paket Data 51,497 · Reload 12,022 · Voucher Injection 10,642 · CVM 2,293 · SP Injection 615.
- Audits and render: `render_check.js` all views OK; `audit_scorecard.js` 140/140; `audit_ga.js` 4,648/4,648.

## 3. Findings and open items

1. **GA is one refresh behind** (cut 18 Okt) while Sell-In, Demand and PJP are at 20 Okt. No new file in `raw/GA (for upload by VIctor) `. GA views and the KRO GA product are therefore 2 days older than the rest; request the RGUGA file for 19 and 20 Okt.
2. **CVM / RECARGE duplication persists**: `build_demand_feed.py` again removed 58,802 CVM rows identical to RECARGE rows (Rp 36.1 B) and kept 16,890 CVM rows. This is the known export defect; ask the data owner to confirm the CVM sheet is meant to exclude those rows.
3. **SP Injection baseline**: the penjualan feed still has `spi.has_baseline = false` (September SP Injection is available in the demand feed `lm`, the KRO feed already uses it). Growth / Gap in Penjualan keep excluding SP Injection until the baseline is merged into the penjualan feed.
4. **ENDBAL naming**: the newest file is stamped 21 Oct 05:14 but its snapshot date is 20 Oct (closing). Labels use the snapshot date; nothing to fix.
5. October migration caveat stays (1–9 Oct sell-in and demand are structurally low), so MTD vs LMTD growth remains depressed.

## 4. Data contract status

No schema or column change was observed in MOBII, MOBO, MOBO SALMO, PJP or ENDBAL: the builders ran without new warnings other than item 2. Contracts in `daily_data_mobii_sellin.md`, `daily_data_mobo_demand.md`, `pjp_journey_plan_report.md` remain valid.
