# Data change log

One entry per data refresh: what arrived in `raw/`, what changed in the feeds, what to watch. Newest first. Method details live in `docs/assessments/`; run the refresh with `python3 scripts/daily_update.py`.

## 17 Oct 2026 (11:40 WIB)

| Scope | Source (raw/) | Cut | Change |
|---|---|---|---|
| Supply · MOBII | `Data as of 15 Oct /DAILY_DATA_MOBII_202610.xlsb` (04:35) | 15 → **16 Oct** | Day 16 added (saldo Rp 1.41 B, SP 56.8 Jt, voucher isi 89.3 Jt, blank 25.9 Jt); days 1–15 unchanged. Sell-In MTD Rp 6.51 B → **8.09 B**; MTD vs LMTD −61.4% → −55.5% (October migration low base). September full month moved again: Rp 44.13 B → 44.25 B (IM3 saldo −0.14 B, 3ID saldo +0.21 B). |
| Demand · MOBO | `DAILY_DATA_MOBO_202610.xlsb` (04:35) | 15 → **16 Oct** | Day 16 added, days 1–15 unchanged. Demand (RLD + VCI + CVM + PKT) Rp 60.95 B → **63.70 B**: Paket Data 40.50 → 42.31 B, Reload 10.21 → 10.46 B, Voucher Injection 8.47 → 9.07 B, CVM 1.77 → 1.86 B; SP Injection 0.34 → 0.36 B. **The CVM sheet of this workbook contained 61,391 rows copied from RECARGE (Rp 36.2 B); the builder drops them** (`drop_copied_rows`) so CVM stays at its real Rp 1.86 B. Without the fix total demand would have read about Rp 100 B. |
| Demand SALMO | `DAILY_DATA_MOBO_SALMO_202610.xlsb` (04:34) | 15 → **16 Oct** | Rp 67.79 B → **72.06 B** (11,865 outlets); day 16 Rp 4.27 B; days 1–15 unchanged; 55 unresolved ids = Rp 6.89 B. Still outside total demand. |
| PJP visits | `MOBI VISIT DSE/*_16_16.zip` (content 16 Oct, generated 05:28) | 01–**16 Oct**, no gap | Day 16: 7,987 planned / 6,616 executed (82.8%). Month: planned 78,135 → **86,122**, executed 51,532 → **58,148** (66.0% → 67.5%), productive 18,161 → 21,345 (36.7%), coverage 90.0% → 91.7%, never visited MTD 1,387 → 1,154, sites with 0 visits 254 → 225. Days 1–15 unchanged. |
| GA / SSO | `GA/Daily_RGUGA_OUTLET_202610.xlsb` (04:39) | 13 → **15 Oct** | Days 14–15 added (IM3 5,411 / 5,350; 3ID 3,374 / 2,978). October days 1–13 restated slightly: IM3 +60 pcs in total (largest day +40), 3ID −1. September unchanged (FM 252,195). MTD vs LMTD: IOH −1.5% → **+0.1%** (IM3 −2.0% → −1.1%, 3ID −0.6% → +2.5%); SSO MTD IM3 8,164 / 3ID 7,239. GA is one day behind the other feeds (15 vs 16 Oct). |
| ENDBAL | `ENDBAL/…2026-10-17_06-07-22*.csv` | snapshot **16 Oct** | Stock Rp 3.55 B → 3.63 B, zero-stock outlets 5,091 → 5,141. |

Notes
- `raw/Data as of 15 Oct /endbal_20261016.zip` and `raw/Data as of 15 Oct /endbal_20261016/` are copies of the ENDBAL files; only the newest snapshot date is read, so copies do no harm.
- Daily command: if the demand step fails, the other feeds continue with the previous demand feed.

## 16 Oct 2026 (second refresh, 06:00 WIB)

| Scope | Source (raw/) | Cut | Change |
|---|---|---|---|
| PJP visits | `OneDrive_2_10-16-2026 (1)/*_14_14.zip` (real 14 Oct) and `*_15_15.zip` | 01–15 Oct, no gap | 14 Oct added: 8,345 planned / 6,284 executed. Month: planned 69,790 → **78,135**, executed 45,248 → **51,532** (64.8% → 66.0%), productive 15,411 → 18,161 (35.2%), outlet coverage 87.4% → 90.0%, never visited MTD 1,739 → 1,387, sites with 0 visits 314 → 254. Days 1–13 and 15 unchanged. |
| Demand SALMO (new) | `Data as of 15 Oct /DAILY_DATA_MOBO_SALMO_202610.xlsb` | 1–15 Oct | New category `SAL` (saldo the outlet transacts to customers): Rp 67.79 B attributed to 11,622 outlets, 79% on ad-hoc ids, 50 unresolved ids = Rp 6.62 B. Shown separately, **not in total demand** (Rp 60.98 B) until its overlap with Reload / Voucher / Paket Data is confirmed. `docs/assessments/daily_data_mobo_salmo.md`. |
| MOBO demand | `DAILY_DATA_MOBO_202610 (3).xlsb` | 15 Oct | Same cell values as the 22:24 file in all five sheets: no change. |
| KPI inputs | rebuilt | visits 15 Oct | follows the new PJP days |

Notes
- The file named `*_14_14.zip` first received held 15 Oct; coverage is now read from each report's `PERIOD ->` line and byte-identical copies (a renamed `14_14` → `15_15`) are read once, otherwise IM3 15 Oct would have counted twice.
- `DAILY_DATA_MOBO_SALMO_*` is not the MOBO demand workbook; the daily command's MOBO search excludes it.
- Print sheets show "SALMO Rp x" (demand, October only) under Demand MTD and a "Demand SALMO MTD" column in the population sheet; last-FM / LMTD SALMO there stays the MOBII Sell-In.

## 16 Oct 2026 (first refresh, 05:30 WIB)

| Scope | Source | Cut | Change |
|---|---|---|---|
| Supply · MOBII | `Data as of 15 Oct /DAILY_DATA_MOBII_202610.xlsb` | 13 → **15 Oct** | Days 14–15 added (Rp 1.01 B and 1.07 B), days 1–13 unchanged. Sell-In MTD (SP + voucher + saldo) Rp 4.43 B → 6.51 B; MTD vs LMTD −68.7% → −61.4% (October migration low base). September full month +Rp 0.34 B (+0.8%) vs the previous file: small restatement, not traced per outlet. |
| Demand · MOBO | `DAILY_DATA_MOBO_202610.xlsb` | 14 → **15 Oct** | Day 15 added; days ≤ 14 unchanged. Demand (RLD + VCI + CVM + PKT) Rp 58.25 B → 60.96 B. Day 15 looks partial for Reload (48% of day 14) and SP Injection (47%); Paket Data 96%, Voucher Injection 93%, CVM 90%. |
| PJP visits | `*_14_14.zip` (content 15 Oct) | 01–15 Oct, **14 Oct n/a** | 15 Oct added: 8,282 planned / 6,646 executed. Planned 61,508 → 69,790, executed 62.8% → 64.8%. 14 Oct flagged "data not available", not zero. |
| ENDBAL | `ENDBAL/87136690_Stock Balance Daily Report_2026-10-16_*.csv` | snapshot **15 Oct** | Only the newest snapshot date is read (the 14 and 15 Oct files would have been summed): stock Rp 3.58 B → 3.55 B, zero-stock outlets 4,870 → 5,091 (master 3,013 → 3,011). |
| GA | no new file | 13 Oct | unchanged |

Tooling in the same commit: ENDBAL and GA join the daily command, stale-file warning after 36 h, PJP duplicate and period detection, DSE sum check without promotors.

## 15 Oct 2026 (evening)

| Scope | Source | Change |
|---|---|---|
| GA / SSO | `GA/Daily_RGUGA_OUTLET_202609.xlsb` re-issued 21:02 | September full month IOH 218,257 → **252,195** pcs, LMTD (1–13 Sep) 81,004 → 92,596; October MTD vs LMTD **+12.6% → −1.5%** (IM3 +4.3% → −2.0%, 3ID +34.1% → −0.6%). 3ID outlets absent from the new sheets are kept through `data/catalogues/ga_ij_outlet_registry.csv` (without them 3ID would be −5.5%). `docs/assessments/ga_rguga_outlet.md` §9. |
| Gross Add menu | — | Basis GA bar above the tabs, site NBS basis, scorecard with last full month, gap, run-rate and SSO gap, Overall Inner Jakarta table. |

## Open data items (17 Oct 2026)
1. Reload (~Rp 247 Jt) and SP Injection are low on 15 and 16 Oct against 12–14 Oct (Rp 511–864 Jt); not restated by the later file, so validate at source whether this is real.
2. Ask the MOBO owner why the CVM sheet carried RECARGE rows (the builder now removes exact copies).
3. SALMO overlap with the other MOBO categories, and the 50 unresolved ids (Rp 6.62 B), are unconfirmed; no September SALMO file for LMTD / last full month.
4. September full month in MOBII moves with every file (+0.34 B on 16 Oct, +0.12 B on 17 Oct); the source of the restatement is not explained.
5. GA ends 15 Oct, one day behind MOBII, MOBO and PJP (16 Oct).
