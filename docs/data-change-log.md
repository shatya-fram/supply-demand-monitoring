# Data change log

One entry per data refresh: what arrived in `raw/`, what changed in the feeds, what to watch. Newest first. Method details live in `docs/assessments/`; run the refresh with `python3 scripts/daily_update.py`.

## 22 Oct 2026 (ids outside the master kept as non-PJP)
| Scope | Source | Change |
|---|---|---|
| MOBO demand, SALMO (Oct and Sep) | `build_demand_feed.py` `resolve()` | Owner decision: ids that are neither a master outlet nor in the adhoc list are **no longer dropped**; they are kept as **non-PJP outlets** (key `A:UNK:<id>`, outside the master territory, row field `um = 1`; master outlets stay PJP). 116 ids (October and September). All categories now reconcile to the file totals: Saldo Mobo October **Rp 100.75 B** (was 90.42 B attributed; Rp 10.33 B sits in 60 non-PJP ids), September LMTD (1–21) **Rp 90.35 B** (was 80.08 B) and full month **Rp 143.39 B** (was 128.97 B; Rp 14.42 B in 58 ids). RLD, VCI, CVM and SP Injection have no material unmapped value; Paket Data Rp 0.03 B. Largest SALMO ids: `D202402224` Rp 1.93 B, `SH254705` Rp 1.16 B, `D320240403` Rp 0.86 B (most ids start with `D` and look like distributor / partner accounts, not retail outlets: to be confirmed by the data owner). `metadata.unmapped` lists the count. KRO feed unchanged (6,804 rows, none of these ids). `render_check`, `audit_scorecard`, `audit_ga`, `audit_kro` pass. |

## 22 Oct 2026 (PJP visits to 21 Oct)
| Scope | Source | Change |
|---|---|---|
| PJP visits | `im3_visit_dse_202610__21_21.zip`, `3id_visit_dse_202610__21_21.zip` (21 Oct 23:42, PERIOD 21 Oct) | Cut 20 → **21 Oct**: 21 days, 18 business days, no missing day; KPI feed visits cut 21. 21 Oct: planned 8,771, executed 8,068 (92%), productive 4,829, SP 17,118 pcs, voucher 114,152, saldo Rp 584 Jt. MTD: coverage of PJP outlets 89.8% → **93.4%** (not visited 1,522 → 992), target hit 71.9% → 73.3%, productive 41.5% → 43.2%. `render_check`, `audit_scorecard`, `audit_ga`, `audit_kro` pass. |

## 22 Oct 2026 (refresh to 21 Oct)
| Scope | Source | Change |
|---|---|---|
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202610.xlsb` (21 Oct 23:08) | Cut 20 → **21 Oct**. MTD Rp B: SP 0.54 → 0.73, voucher isi 1.60 → 2.03, voucher blank 0.26 → 0.30, saldo transfer 9.16 → 10.58, SP Injection 0.62 → 0.67. 21 Oct: saldo Rp 1.42 B, SP Rp 0.19 B. |
| MOBO (Demand) | `DAILY_DATA_MOBO_202610.xlsb` (21 Oct 23:08) | Cut 20 → **21 Oct**. Total demand MTD (RLD + VCI + CVM + PKT) Rp 76.45 → **80.34 B**; 21 Oct Rp 3.89 B. RLD 12.16, VCI 11.75, CVM 2.39, PKT 54.04 B. CVM sheet again carried RECARGE copies (58,229 rows, Rp 36.1 B removed; CVM stays about Rp 0.1 B per day). |
| SALMO | `DAILY_DATA_MOBO_SALMO_202610.xlsb` and, **new**, `DAILY_DATA_MOBO_SALMO_202609.xlsb` | October Saldo Mobo demand Rp 86.33 → **90.42 B** (to 21 Oct). The **September** file is the first one available (23,432 rows, 30 days, Rp 143.39 B; LMTD 1–21 Sep Rp 90.35 B vs October 100.75 B in the file, +11.5%): not wired into the screens yet, awaiting the owner's go-ahead. Both SALMO files had the same file time, so the builder used to pick by file time; it now takes the file of the same month as the MOBO file (`daily_update.py` passes `MOBO_SALMO_SRC`). |
| PJP visits | MOBI VISIT DSE zips | Still to **20 Oct** (no 21 Oct export yet); 20 days in the feed, no missing day. KPI feed: sell-in cut 21, visits cut 20. |
| PJP Weekly | `SMARTBEAT_WEEKLY_PJP.xlsx` (21 Oct 23:08) | New weekly beat plan, same columns as `Weekly_PJP_*_ALL_MC.xlsx`: 15,085 outlet rows (was 14,755; 13,424 keys in common, 1,661 new, 1,331 gone). Builder now reads any `*Weekly_PJP*.xlsx` (newest). Mapping: exceptions 2,805 → 2,306, outlets missing in the master 1,489 → 1,272, F12 744 → 993; 11 rows carry a compound frequency ("F4 / F12", "F8 / F4") and are flagged as exceptions (F0). |
| ENDBAL | `endbal_20261021.zip` (22 Oct 06:11, not extracted) | The zip holds the report of 22 Oct 02:48 = snapshot **21 Oct** (was 20 Oct). `daily_update.py` now extracts new CSVs from `ENDBAL*/*.zip` itself. 128,463 rows, 18,165 outlets (master 16,025, adhoc 2,140). |
| Not consumed | `SMARTBEAT_DAILY_PJP_20261022.xlsx`, `IOH SELL IN (D-2) & OUTLET LATEST TAGGING (D-1) 20 OCT UPDATE 2026.xlsb` | The daily PJP file is the **plan** for 22 Oct (7,646 routes, 552 DSE ids, 4,154 IM3 + 3,492 3ID outlets, all non-dynamic), not executed visits; no builder reads it. The IOH Sell-In / tagging workbook is a single `Sheet1`; it is not the `SELL-IN_TAG_RGUGA_OSA_OUTLET_*` target source. Both listed for the owner to decide. |
| GA | `Daily_RGUGA_OUTLET_202610.xlsb` | Unchanged (21 Oct 16:33), cut 20 Oct. |
| Checks | | `render_check`, `audit_scorecard.js` (152) and `audit_ga.js` (4,672) pass. |

## 21 Oct 2026 (GA to 20 Oct)
| Scope | Source | Change |
|---|---|---|
| GA / SSO | `GA/Daily_RGUGA_OUTLET_202610.xlsb` (21 Oct 16:33) | Cut 18 → **20 Oct**. IOH October GA 135,860 → **152,825** pcs (IM3 90,157 → 101,256; 3ID 45,703 → 51,569). Same window September unchanged (IM3 159,420; 3ID 92,775); no new anomalies (20, all September or earlier). |
| Daily refresh | MOBII / MOBO / SALMO (20 Oct 23:03), ENDBAL (21 Oct 05:14) | Feeds rebuilt in the same run: KRO feed, KPI feed and ENDBAL re-derived; `render_check`, `audit_kro.js` (reconciles) and `audit_ga.js` (4,672 checks) pass. The CVM sheet again carried RECARGE copies (58,802 rows, Rp 36.1 B removed). |

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

## 19 Oct 2026 (refresh to 18 Oct)
| Scope | Source | Change |
|---|---|---|
| MOBII / MOBO / SALMO | files re-saved 18 Oct 22:49 | Cut 16 → **18 Oct**. Total demand MTD Rp 63.70 B → **69.03 B**; LMTD (1–18 Sep) Rp 58.75 B, growth **+17.5%**. Sell-in MTD (Rp B): SP 0.31 → 0.38, voucher isi 0.76 → 0.86, voucher blank 0.17 → 0.20, saldo transfer 6.85 → 7.62. |
| PJP visits | `*_17_17.zip`, `*_18_18.zip` (18 Oct 22:33) | 18 days in the feed, no missing day. |
| GA | `GA/Daily_RGUGA_OUTLET_202610.xlsb` (19 Oct 05:32) | Cut 15 → **17 Oct**. |
| CVM | MOBO sheet CVM | The CVM sheet again held a copy of RECARGE, now stale: equal to RECARGE up to 16 Oct and different on 17–18 Oct, so the exact-copy filter missed 13,718 rows (Rp 19.3 B + 0.7 B). Without the fix CVM read Rp 22.08 B instead of **2.08 B**. `drop_copied_rows` now also drops CVM rows whose outlet + product exist in RECARGE and agree up to day 16. 60,092 rows removed, 15,600 kept. |
| Fix | `website/app.js` | The unterminated string in the Gross Add note (KRO session) is fixed; render check passes. |

## 18 Oct 2026 (September MOBO full close)
| Scope | Source | Change |
|---|---|---|
| Demand LMTD / Last FM | `DAILY_DATA_MOBO_202609.xlsb` (18 Oct 09:44; sheets SP INJECTION, RELOAD, VOUCHER, CVM, RECHARGE; 30 days, no duplicates) | Demand feed carries per outlet and product `l[cat] = [LMTD hits, LMTD Rp, Last FM hits, Last FM Rp]`. Last FM (Rp B): Reload 12.37, Voucher Inj 22.12, CVM 6.22, Paket Data 65.75 → **106.47 B** (SP Injection 1.88 B outside total). LMTD 1–16 Sep 51.44 B vs October MTD 63.70 B (**+23.8%**; early-Oct is depressed by the migration, see CLAUDE.md). 32 unknown ids (Rp 0.04 B) are kept at region level only; 3,590 outlets had September activity only. |
| Demand reports | `website/app.js` | Scorecard, Teritori, Outlet and Product tabs and the KPI boxes show LMTD, growth, Last FM, Gap vs FM and Req RR / hari. SAL (SALMO) shows "tanpa September". |
| Daily update | `scripts/daily_update.py` | MOBO discovery is month-aware: the newest `DAILY_DATA_MOBO_YYYYMM` is the current month, the previous month is passed as `MOBO_LM_SRC`. |

## Open data items (17 Oct 2026)
1. Reload (~Rp 247 Jt) and SP Injection are low on 15 and 16 Oct against 12–14 Oct (Rp 511–864 Jt); not restated by the later file, so validate at source whether this is real.
2. Ask the MOBO owner why the CVM sheet carried RECARGE rows (the builder now removes exact copies).
3. SALMO overlap with the other MOBO categories, and the 50 unresolved ids (Rp 6.62 B), are unconfirmed; no September SALMO file for LMTD / last full month (still open on 18 Oct).
4. September full month in MOBII moves with every file (+0.34 B on 16 Oct, +0.12 B on 17 Oct); the source of the restatement is not explained.
5. GA ends 15 Oct, one day behind MOBII, MOBO and PJP (16 Oct).
