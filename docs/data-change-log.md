# Data change log

One entry per data refresh: what arrived in `raw/`, what changed in the feeds, what to watch. Newest first. Method details live in `docs/assessments/`; run the refresh with `python3 scripts/daily_update.py`.

## 27 Oct 2026 (night) · GA by Outlet, GA per site and Fav Locs to 26 Oct
| Scope | Source | Change |
|---|---|---|
| GA by Outlet | `Daily_RGUGA_OUTLET_202610.xlsb` (27 Oct 11:54) | GA cut 24 → **26 Oct**. GA Okt IM3 124,332 → **144,243**, 3ID 66,334 → **82,669**. KRO feed and catalogue rebuilt on the new cut. |
| GA per site | `rguga_daily_outlet_202610.csv` (27 Oct 11:49) | 1,416,785 → **1,999,094** rows (1-26 Oct); GA at IJ sites 197,774, 5,569 sites, 120 kecamatan. |
| Fav Locs | `Daily_RGUGA_favloc_202610.xlsb` (27 Oct 11:55) | Cross-check only (no builder): IJ IOH 1-26 Oct 189,665 vs site CSV 197,774 (+4.3%, was 0.45% at 20 Oct): ask the uploader. |
| Watch | | Daily GA jumps from 74k (20 Oct) to 134k (26 Oct) circle-wide, IJ 7k to 19.4k; present in the source, no duplicate MSISDN-days. Assessment: `docs/assessments/daily_update_2026-10-27_ga.md`. |
| Checks | | `render_check`, `audit_scorecard` (164), `audit_ga` (3,683), KRO, DSE catalogue, entity pass. |

## 27 Oct 2026 (evening) · QA decisions applied
| Scope | Change |
|---|---|
| Territory master | De-duplicated: 3 id-less `0_0` rows and 7 duplicate rows dropped, 16,130 → 16,120 outlets (14,958 with a DSE = PJP base; "belum divisit" MTD 139, no more 169 / 170 split). Territory, sell-in, target, map and coverage feeds rebuilt. |
| PJP windows | "Not visited last 3 / 7 days" count working days (Sundays skipped): at cut 26 Oct the 3-day window is 23, 24, 26 Oct (not visited 3d 909, 7d 309). |
| End Balance | "Kemarin" cards use the last working day (26 Oct) vs the working day before (24 Oct). |
| Gross Add | GA target cards shown on the site / location basis only. |
| Checks | `render_check`, `audit_scorecard` (164), `audit_ga` (3,683), `audit_consistency` (278), `audit_kro`, `audit_dse_catalogue`, `audit_entity` pass. |

## 27 Oct 2026 (later) · MOBII to 26 Oct
| Scope | Source | Change |
|---|---|---|
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202610.xlsb` (26 Oct 22:49, arrived after the morning refresh) | Cut 25 → **26 Oct**; all feeds except GA (24 Oct) are now on 26 Oct. MTD Rp B: SP 2.27 (26 Oct Rp 153 Jt), voucher isi 4.87 (26 Oct Rp 1.71 B), voucher blank 0.57, saldo transfer 15.61 (26 Oct Rp 2.04 B), SP Injection 0.81. DSE KPI cut 26. |
| Checks | | `render_check`, `audit_scorecard` (164), `audit_ga` (3,845), `audit_consistency` (278) pass. |

## 27 Oct 2026 (PJP, MOBO, SALMO and ENDBAL to 26 Oct; MOBII and GA unchanged)
| Scope | Source | Change |
|---|---|---|
| PJP visits | `*_visit_dse_202610__26_26.zip` (26 Oct 22:37) | Cut 25 → **26 Oct**: 26 days, 22 business days, no missing day. MTD coverage of PJP outlets 98.9% → **99.1%** (not visited 169 → 140), target hit 76.8% → **77.8%**, productive rate 45.7% → 45.6%. |
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202610.xlsb` (still the 25 Oct 22:28 file) | **No new file**: cut stays 25 Oct. Penjualan and DSE KPI sell-in are one day behind PJP and demand. |
| MOBO (Demand) | `DAILY_DATA_MOBO_202610.xlsb` (26 Oct 22:36) | Cut 25 → **26 Oct**. Total demand (RLD+VCI+CVM+PKT) MTD Rp 93.84 → **98.24 B** (26 Oct Rp 4.38 B). |
| SALMO | `DAILY_DATA_MOBO_SALMO_202610.xlsb` (26 Oct 22:36) | Saldo Mobo demand Rp 119.58 → **125.62 B** (26 Oct Rp 6.04 B); file and MOBO both at 26 Oct, nothing held back. |
| ENDBAL | `endbal_20261026.zip` / report of 27 Oct 01:49 | Snapshot 25 → **26 Oct**: 129,292 rows, 18,211 outlets. |
| GA | none | Cut stays **24 Oct** (no new RGUGA file). |
| Checks | | `render_check`, `audit_scorecard` (164), `audit_ga` (3,845), `audit_consistency` (278) pass. |

## 26 Oct 2026 (refresh to 25 Oct; GA to 24 Oct)
| Scope | Source | Change |
|---|---|---|
| PJP visits | `*_visit_dse_202610__23_23 / 24_24 / 25_25.zip` (25 Oct 22:29; a second copy of the same files sits in `MOBI VISIT DSE/OneDrive_1_10-26-2026 (1)/`, dropped by the md5 de-duplication) | Cut 23 → **25 Oct**: 25 days, 21 business days, no missing day. The re-issued 23 Oct file equals the one of 23 Oct (8,214 planned, 7,716 executed). 24 Oct (Sat): planned 9,092, executed 8,262, productive 4,290. **25 Oct (Sun): planned 11, executed 0** (no PJP on Sunday, same as 4, 11 and 18 Oct). MTD coverage of PJP outlets 98.5% → **98.9%** (not visited 229 → 169), target hit 75.8% → 76.8%, productive rate 45.2% → 45.7%. |
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202610.xlsb` (25 Oct 22:28) | Cut 23 → **25 Oct**. MTD Rp B: SP 1.40 → **2.11** (24 Oct Rp 575 Jt), voucher isi 2.91 → 3.16, voucher blank 0.42 → 0.48, saldo transfer 12.74 → 13.58, SP Injection 0.76. 25 Oct (Sunday) is a low day (SP Rp 139 Jt, voucher Rp 3 Jt, saldo about 0), like the earlier Sundays. |
| MOBO (Demand) | `DAILY_DATA_MOBO_202610.xlsb` (25 Oct 22:28) | Cut 23 → **25 Oct**. Total demand MTD Rp 86.41 → **93.84 B** (24 Oct Rp 3.88 B, 25 Oct Rp 3.56 B); LMTD 1–25 Sep Rp 82.33 B, growth **+14.0%** (+14.9% at cut 23); Last FM Rp 106.50 B, gap −12.66 B. RLD 13.69, VCI 13.06, CVM 2.88, PKT 64.22, SP Injection 0.76 B. CVM sheet again carried RECARGE copies (55,774 rows, Rp 32.0 B removed). |
| SALMO | `DAILY_DATA_MOBO_SALMO_202610.xlsb` (25 Oct 22:28) | Saldo Mobo demand Rp 111.77 → **119.58 B**; LMTD 1–25 Sep Rp 110.01 B, growth **+8.7%** (+12.7% at cut 23). File and MOBO both at 25 Oct, nothing held back. |
| ENDBAL | `endbal_20261025.zip` (26 Oct 05:29; report 26 Oct 04:21); the zips of 22 and 24 Oct were extracted again (same CSVs) | Snapshot 23 → **25 Oct**: 129,161 rows, 18,211 outlets (master 16,025, adhoc 2,186). |
| GA | `Daily_RGUGA_OUTLET_202610.xlsb` (26 Oct 05:30) | Cut 21 → **24 Oct**. IOH October GA 160,384 → **190,666** pcs (IM3 105,963 → 124,332; 3ID 54,421 → 66,334); September unchanged. One day behind sell-in. |
| Derived | | DSE KPI cut 25 (visits cut 25); KRO feed rebuilt and reconciles; weekly PJP mapping unchanged (Smartbeat file of 21 Oct). |
| Checks | | `render_check`, `audit_scorecard` (164), `audit_ga` (3,710), `audit_kro`, `audit_dse_catalogue`, `audit_entity` pass. |

## 24 Oct 2026 (refresh to 23 Oct)
| Scope | Source | Change |
|---|---|---|
| PJP visits | `*_visit_dse_202610__23_23.zip` (23 Oct 23:22) | Cut 22 → **23 Oct**: 23 days, 20 business days, no missing day. 23 Oct: planned 8,214, executed 7,716, productive 4,272. MTD coverage of PJP outlets 96.3% → **98.5%** (not visited 552 → 229), target hit 74.7% → 75.8%. |
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202610.xlsb` (23 Oct 23:22) | Cut 22 → **23 Oct**. MTD Rp B: SP 0.89 → **1.40** (23 Oct Rp 511 Jt, the largest SP day of the month), voucher isi 2.52 → 2.91, voucher blank 0.35 → 0.42, saldo transfer 12.03 → 12.74. |
| MOBO (Demand) | `DAILY_DATA_MOBO_202610.xlsb` (re-issued 24 Oct 06:34; the first run of the day still had the 22 Oct file) | Cut 22 → **23 Oct**. Total demand MTD Rp 83.38 → **86.41 B** (23 Oct Rp 3.02 B); LMTD 1–23 Sep Rp 75.20 B, growth **+14.9%** (was +16.1% at cut 22); Last FM Rp 106.50 B, gap −20.09 B. RLD 12.44, VCI 12.50, CVM 2.63, PKT 58.84, SP Injection 0.72 B. CVM sheet again carried RECARGE copies (56,990 rows, Rp 36.0 B removed). |
| SALMO | `DAILY_DATA_MOBO_SALMO_202610.xlsb` (23 Oct 23:22) | Saldo Mobo demand Rp 106.25 → **111.77 B** (23 Oct Rp 5.52 B). While the MOBO file was still on 22 Oct the SALMO file (23 Oct) was ahead; the builder now **holds back SAL days after the MOBO cut** (`metadata.salmo.held_after_cut`, `file_last_day`) so MTD, LMTD and the daily table stay on one window. With the 23 Oct MOBO file nothing is held. |
| ENDBAL | `endbal_20261023.zip` (24 Oct 06:22; report 24 Oct 06:11) | Snapshot 22 → **23 Oct**: 129,107 rows, 18,182 outlets (master 16,025, adhoc 2,157). |
| GA | unchanged | Cut **21 Oct** (refreshed by another session on 23 Oct); two days behind sell-in. |
| Derived | | DSE KPI cut 23 (visits cut 23); KRO feed rebuilt and reconciles; weekly PJP mapping unchanged. |
| Checks | | `render_check`, `audit_scorecard` (164), `audit_ga` (3,707), `audit_kro`, `audit_dse_catalogue`, `audit_entity` pass. |

## 23 Oct 2026 (afternoon) · GA refresh to 21 Oct
| Scope | Source | Change |
|---|---|---|
| GA tagging | `Daily_RGUGA_OUTLET_202610.xlsb` (23 Oct 04:15, 87.0 MB; was 81.1 MB on 21 Oct) | `build_ga_feed.py`: cut 20 → **21 Oct**. GA IM3 105,963 + 3ID 54,421 = **160,384** (1 Oct–21 Oct; 21 Oct alone 7,559); 30,824 brand-outlet rows, 23,017 physical outlets. |
| GA site location | `rguga_daily_outlet_202610.csv` (23 Oct 04:16, 248.3 MB; **the uploader dropped the `Site_` prefix**, same 22 columns; 1,416,785 rows, 1–21 Oct, days 1–20 identical to the 22 Oct file) | `build_ga_site_feed.py` now takes `*rguga_daily_outlet_*.csv` (newest wins). GA in Inner Jakarta sites **140,376** (21 Oct alone 9,203); 5,523 sites, 121 kecamatan. |
| KRO | derived | `build_kro_feed.py` rebuilt on the new GA feed. |
| Not consumed | `GA by Fav Locs/Daily_RGUGA_Kecamatan_202610.xlsb`, `adhoc_rguga_daily_kec_202610.xlsb` | Unchanged since 22 Oct 12:33 / 13:38 (still 1–20 Oct); the official site-location summary is read by analysis only, no builder. |
| Checks | | `render_check`, `audit_ga` (3,914), `audit_kro`, `audit_scorecard` (164) pass. |

## 23 Oct 2026 · catalogue workbook re-saved (no substantive change)
| Scope | Source | Change |
|---|---|---|
| Governed catalogue | `raw/Catalogue/CATALAGUE_INNER_JAKARTA_202610.xlsb` (re-saved 22 Oct 19:28) | `build_catalogue_overlay_inputs.py` and `apply_final_dse_mapping.py` re-run: FINAL_20261020 (22,426 brand-outlet rows), DSE logins, pairing (7,229 pairs), outlet types, programs (AVA 297, DTU 331, KRO 587, Promotor 199, Wholesaler 117) and the outlet catalogue (16,614 rows) are **identical** to the 21 Oct run; every count of `apply_report.json` is unchanged (14,960 outlets with FINAL DSE, 421 pairs held, 306 swaps accepted). Only `outlet_locations.csv` differs: 6 outlet names (capitalisation, and three `Unnamed Outlet` now blank, taken from the current feeds) plus `generated_at`. The territory master and the downstream feeds do not change, so no re-run of the chain was needed. |

## 23 Oct 2026 (refresh to 22 Oct)
| Scope | Source | Change |
|---|---|---|
| PJP visits | `*_visit_dse_202610__22_22.zip` (22 Oct 22:30) | Cut 21 → **22 Oct**: 22 days, 19 business days, no missing day. 22 Oct: planned 8,709, executed 8,068, productive 4,641. MTD coverage of PJP outlets 93.4% → **96.3%** (not visited 992 → 552), target hit 73.3% → 74.7%. |
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202610.xlsb` (22 Oct 22:30) | Cut 21 → **22 Oct**. MTD Rp B: SP 0.73 → 0.89, voucher isi 2.03 → 2.52, voucher blank 0.30 → 0.35, saldo transfer 10.58 → 12.03, SP Injection 0.68 → 0.70. |
| MOBO (Demand) | `DAILY_DATA_MOBO_202610.xlsb` (22 Oct 22:30) | Cut 21 → **22 Oct**. Total demand MTD Rp 80.38 → **83.38 B** (22 Oct Rp 3.01 B); LMTD 1–22 Sep Rp 71.83 B, growth **+16.1%**. RLD 12.28, VCI 12.20, CVM 2.50, PKT 56.40 B. CVM sheet again carried RECARGE copies (57,632 rows, Rp 36.0 B removed). |
| SALMO | `DAILY_DATA_MOBO_SALMO_202610.xlsb` | Saldo Mobo demand Rp 100.75 → **106.25 B** (22 Oct Rp 5.50 B); LMTD 1–22 Sep Rp 94.37 B (+12.6%); September full month 143.39 B. Non-PJP ids included (rule of 22 Oct). |
| ENDBAL | `endbal_20261022.zip` (23 Oct 05:31; report 23 Oct 04:38) | Snapshot 21 → **22 Oct**: 128,951 rows, 18,196 outlets (master 16,025, adhoc 2,171). The same zip was also dropped into `raw/MOBI VISIT DSE/` (identical copy, ignored by the visit discovery). |
| GA | `Daily_RGUGA_OUTLET_202610.xlsb` unchanged (21 Oct 16:33) | GA stays at **20 Oct**, now two days behind the other feeds. `Site_rguga_daily_outlet_202610.csv` (22 Oct 15:57) was consumed by `build_ga_site_feed.py` (Gross Add › Site location GA). |
| KPI / KRO / PJP mapping | derived | DSE KPI cut 22 (visits cut 22); KRO feed rebuilt; weekly PJP mapping unchanged (Smartbeat file of 21 Oct). |
| **Not consumed** | `MOBI TRansfer Balance/inner_tf_balance_202610____22_22.csv` (23 Oct 05:34) | **New layout**: "Transfer Balance Report", comma CSV, header `DateTime, Transaction ID, …, Organization Type, Organization ID, Credit Party ID, Account Type, Amount, …` (8,713 rows, 22 Oct only, 8,599 Completed = Rp 5.50 B; Organization Type Outlet 6,114 / Dealer 2,551 / SDP 48; 3,994 credit-party outlets). `build_sellin_feed.py` reads `MOBI TRansfer Balance/*.csv` but expects the pipe-delimited MOBI report (`TRANSACTION DATETIME` header), so this file is **skipped silently** (Sell-In feed still 1–10 Oct). It carries the Dealer / SDP → outlet saldo flows (Phase 1 item 1, distributor fill-in): owner to decide whether to build a reader; the daily dashboard saldo already comes from MOBII SALMO. |
| Not consumed (listed) | `GA by Fav Locs/Daily_RGUGA_Kecamatan_202610.xlsb`, `adhoc_rguga_daily_kec_202610.xlsb` (22 Oct), `IOH SELL IN … 21 OCT UPDATE 2026.csv` (national, incl. West Java), `MOBO TRANSACTION DETAILS/trx_details_20261022__01..03.csv`, `Catalogue/CATALAGUE_INNER_JAKARTA_202610.xlsb` re-saved 22 Oct 19:28 (catalogue overlay not re-run) | No builder reads them in the daily refresh. |
| Checks | | `render_check`, `audit_scorecard` (152), `audit_ga` (3,902), `audit_kro` pass. |

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
