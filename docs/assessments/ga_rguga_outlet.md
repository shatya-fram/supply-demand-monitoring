# Assessment · Gross Add (GA) / SSO per outlet (raw/GA)

> **Updated 15 Oct 2026 (second pass): section 8 supersedes the 3ID figures in sections 4–6.** The outlet sheets lose part of the 3ID outlets in their formula lookup; the raw pivots do not. The feed now takes GA per outlet from the raw pivots.

Assessed 15 Oct 2026, before any app change (CLAUDE.md §2). This is the data contract for `scripts/build_ga_feed.py` and `website/data/ga_feed.js` (`GA_FEED`).

## 1. Files

| File (raw/GA/) | Content | Used for |
|---|---|---|
| `Daily_RGUGA_OUTLET_202609.xlsb` | September outlet × day GA. Sheets `IM3 SEP` (17,404 outlets) and `3ID SEP` (18,188). Other sheets (`raw_im3`, `raw_3id`, `*_wow`) are pivots and weekly charts, not read. | Outlet-level GA, September (30 days) |
| `Daily_RGUGA_OUTLET_202610.xlsb` | October outlet × day GA. Sheets `IM3 OCT` (17,491) and `3ID OCT` (18,353); 13 days filled (1–13 Oct), the other 18 day columns are 0. | Outlet-level GA, October MTD |
| `GA BIOMETRIC.xlsx` (IM3), `GA BIOMETRIC (1).xlsx` (3ID) | Official GA per day, Inner Jakarta, all starter packs, Aug / Sep / Oct. October has days 1–7 only. | Control total (region × brand) |
| `#OUTLET ACTIVE GA (KPI).xlsx` (3ID), `... (1).xlsx` (IM3) | Official "outlets active on GA" per day, Aug / Sep / Oct (Oct days 1–6 only). | Control, shown for reference |
| `M2S KECAMATAN - 202609 .xlsb` | Kecamatan-level GA LMTD/MTD, M2 survival ("M2S") for September. `#SSO` columns are empty in the IOH sheet. | **Not used** (kecamatan grain, September only) |
| `~$Daily_RGUGA_OUTLET_202610.xlsb` | Excel lock file (165 bytes): the workbook was open when copied. | Ignored by the builder |

The GA folder arrived in the project root (`./GA/`, untracked, 70 MB) and was moved to `raw/GA/` (git-ignored like the rest of `raw/`). The two BIOMETRIC and two OUTLET ACTIVE workbooks were not in that folder; they were copied in from `~/Downloads`.

## 2. Layout and a parser trap

- September sheets: header at row 4: Region, Sub Area, Branch, MPC, MPC code, **Micro Cluster**, CSO code, **Outlet Code**, Outlet Name, Partner Territory, Kecamatan, **SEP DSE CONFIRMED**, PJP/NON, KAM, **FINAL OUTLET** (PJP / NON / KAM), HYBRID NON, OUTLET COMMITMENT, TOTAL MTD, then 30 day columns (Excel serial dates). Rows 1–3 above the header hold the workbook's own daily summaries: `UAR PJP`, `UAR ALL OUTLET`, `#RGUGA`.
- October sheets: header at row 4: mth, **id**, site_nm (the outlet name), flag, lon, lat, kec_kabkot, kecamatan_nm, kabkot_nm, circle, region, area, sales_area, **micro_cluster**, partner_name, **dse_code**, brand, PJP NON, KAM, **FINAL OUTLET**, then 31 day columns. In the 3ID sheet the labels of the dse and brand columns are swapped (column 16 holds `3ID`); the builder detects it.
- **All day values, TOTAL MTD and the summary rows are Excel formulas.** The project's generic `.xlsb` reader skips formula records (BrtFmlaNum / BrtFmlaString) and returns empty day columns. `build_ga_feed.py` has its own reader that decodes them. Check: daily GA and daily SSO recomputed from the feed equal the workbook summary rows exactly (0 difference in all four sheets).

## 3. Definitions

- **GA** = `qty_ga`, MSISDNs activated at the outlet that day.
- **SSO (SIM Selling Outlet)** = outlet with ≥ 1 GA in the period. The workbook calls the daily count "UAR ALL OUTLET" / "UAR PJP"; the app uses SSO for GA and keeps UAR for sell-in. Daily SSO from the feed equals the workbook's UAR rows.
- The KPI series `#OUTLET ACTIVE GA` (IM3 Oct 1: 1,472) is **not** the same as SSO ≥ 1 (1,767) nor ≥ 2 (622): it uses a stricter, biometric-validated definition that is not available per outlet. It is stored as a control and not mixed into the outlet tables.

## 4. Keys and territory

| | Rows | Matched to master outlet | GA pcs in master outlets |
|---|---|---|---|
| IM3 Sep | 17,404 | 11,884 (68%) | 124,637 of 152,239 (82%) |
| IM3 Oct | 17,491 | 11,913 (68%) | 39,294 of 60,564 (65%) |
| 3ID Sep | 18,188 | 10,349 (57%) | 30,868 of 42,919 (72%) |
| 3ID Oct | 18,353 | 10,412 (57%) | 16,454 of 21,489 (77%) |

- Key: IM3 `Outlet Code` / `id` against `outlet_id_im3`; 3ID against `outlet_id_3id` (the same rule as the MOBII and MOBO builders). IDs are text (some are `SHxxxxxx`).
- About one third of October GA happens at outlets that are **not in the master outlet list** (3,957 outlets with GA > 0 outside master, 26,305 pcs in October). They keep the micro cluster of the GA sheet; all micro clusters in the sheets exist in the 36-MC master (no unknown MC). The feed carries them as tier `G` (key `G:BRAND:id`) and the app shows them as "di luar master" in outlet lists while still counting them in MC / Area totals.
- Master outlets are always carried (14,613 physical outlets have a row); outside-master outlets only when GA > 0 (9,600 zero-GA outsiders dropped).
- DSE: master outlets use the master DSE (same name the filters use). Outside-master outlets resolve the sheet's DSE code through the master outlet codes, `dse_master_hierarchy.csv` and the PJP login codes: 1,650 of 3,957 resolve, 2,307 stay `UNASSIGNED` (1,665 have no DSE code at all).
- Segment (`FINAL OUTLET`): PJP / NON / KAM; 32 rows blank.

## 5. Reconciliation with GA BIOMETRIC (region level)

| | Outlet-level RGUGA | GA BIOMETRIC | Difference |
|---|---|---|---|
| IM3 September (30 d) | 152,239 | 151,036 | +0.8% |
| IM3 October 1–7 | 30,197 | 29,515 | +2.3% |
| 3ID October 1–7 | 10,199 | 10,686 | −4.6% |
| 3ID September (30 d) | 42,919 | 70,886 | **−39%** |

- IM3 matches the biometric total closely, day by day (largest September gaps: day 1 +509, day 25 +318). **3ID September is under-attributed to outlets** (about 60–70% of the biometric total in most days); in October it is about 95%. Consequence: 3ID October vs September at outlet level (+44% for 1–13) is **not like-for-like**; on biometric totals the 1–7 Oct vs 1–7 Sep change is about −2% (10,686 vs 10,870). The GA view shows the coverage ratio next to every month-on-month figure and does not present the 3ID outlet-level growth as real growth.
- The BIOMETRIC series stops at 7 Oct (OUTLET ACTIVE: 6 Oct), so comparison beyond that is not possible until a longer export is supplied.

## 6. Quality flags

- Outlier days (one outlet, one day ≥ 300 GA): 6 cases, e.g. `reihan cell` (IM3 17772138) 1,697 on 26 Sep, `java phone` 1,276 on 25 Sep, `Warung Sania` 949 + 742 on 25–26 Sep, `Zhidan Cell` 511 on 11 Oct. They distort September daily shape (IM3 26 Sep = 11,701 vs ~5,000 normal) and slab counts for those outlets. The feed keeps them (workbook totals must tie) and lists them in `metadata.anomalies`; the GA view flags them.
- October is a system-migration month (see CLAUDE.md data caveat); GA, unlike MOBII/MOBO, shows no early-October dip (IM3 4,642 on 1 Oct), so the migration affects sell-in and demand but not the GA feed.
- Only September and October 2026 exist at outlet level (August only as region-level BIOMETRIC totals).

## 7. Decisions

1. Outlet-level GA (RGUGA) drives the territory cuts (Area, MC, DSE, outlet, slab); GA BIOMETRIC is the official control total shown on the Daily tab with the variance, and is the basis for region-level growth statements.
2. LMTD = September days 1..cut (cut = 13); September full month is shown as the base for run-rate and slab comparison.
3. Terminology: **SSO** for everything GA; **UAR** stays for sell-in (SP / Voucher / Saldo).
4. UAR Improvement (Opportunity › Program) counts GA per brand MTD (UAR 3 / 5 per brand, UAR 10 / 20 combined), no longer SP sell-in units.
5. SP Injection from MOBO (`demand_feed` category SPI) remains a demand / sell-in channel metric and is no longer used as "gross add".

## 8. Second pass: raw pivots and the two bases of Gross Add (15 Oct 2026)

### 8.1 What the raw sheets are
| Sheet | Content |
|---|---|
| `raw_im3`, `raw_3id` (Sep file) | GA per outlet id per day for the **Inner Jakarta region only** (header filter `region INNER JAKARTA`), with the outlet's micro cluster and area. 13,291 IM3 and 11,322 3ID outlets. |
| `raw im3`, `raw 3id` (Oct file) | GA per `ID OUTLET CLEAN` per day, 1–13 Oct, **no region filter**: 85,241 IM3 and 52,742 3ID outlet ids (nationwide) plus one `(blank)` row (MSISDN with no outlet tag). IM3 total 565,162; 3ID 233,726. |

The October outlet sheets (`IM3 OCT`, `3ID OCT`) are the Inner Jakarta slice of these pivots (IM3 60,564 = 10.7% of the raw total). The September 3ID sheet (`3ID SEP`) captures only 42,919 of the 65,444 GA in `raw_3id` (22,525 lost in the lookup); the October 3ID sheet misses 8,787 GA from 1,682 outlet ids that are Inner Jakarta outlets in the September raw pivot.

### 8.2 Attribution after using the raw pivots (outlet = tagging basis)
| | Outlet sheet | Raw pivot (used) | GA BIOMETRIC |
|---|---|---|---|
| IM3 Sep (30 d) | 152,239 | 152,813 | 151,036 |
| 3ID Sep (30 d) | 42,919 | **65,444** | 70,886 |
| IM3 Oct 1–13 | 60,564 | 60,921 | (1–7: 29,515) |
| 3ID Oct 1–13 | 21,489 | **30,276** | (1–7: 10,686) |

3ID September now agrees with BIOMETRIC within 8% (days 1–7: 11,166 vs 10,870). 3ID October tagging is 14,080 for days 1–7 against BIOMETRIC 10,686 (+32%) while September matched within 3%: more GA is tagged to Inner Jakarta outlets than is activated at Inner Jakarta sites, or RGUGA includes GA that BIOMETRIC (a validated subset) leaves out. Only a pair-level export can settle which.

### 8.3 Two views of GA
| | **Sell-in outlet (tagging)** | **Activating site (location)** |
|---|---|---|
| Question | which outlet recorded the MSISDN | where (site / kecamatan) did the activation happen |
| Used for | DSE incentives (SSO), outlet slabs | performance of HoA, Region, DSO |
| Source | RGUGA raw pivots (this folder) | GA BIOMETRIC (region × day, Inner Jakarta circle) and `M2S KECAMATAN` (kecamatan × brand, September) |
| Grain available | outlet → DSE → MC → Area, Sep and Oct 1–13 | region by day (Aug, Sep, Oct 1–7); kecamatan → MC → Area for September only |
| Not available | location of a GA | DSE, outlet; **October per site / MC / kecamatan** |

`M2S KECAMATAN` (`IM3-Data`, `3ID-Data`: `RGU_GA_TRAD` / `RGUGA_TRADE`, `SSO_ALL` by `kec_kabkot`): IM3 MTD 132,031 equals the cumulative GA BIOMETRIC to about 26 Sep (132,132), so it is the location basis; the cut date is not stated in the file. 3ID MTD 73,404 exceeds the 3ID BIOMETRIC September total (70,886), so the 3ID location figures use a wider definition; treat 3ID kecamatan flows as indicative. The LMTD columns (IM3 197,554, above the August BIOMETRIC total 174,622) do not reconcile and are not used. The 121 kecamatan map one to one to a single MC each (checked against the October outlet sheet), which gives the kecamatan → MC → Area roll-up.

September IM3 by kecamatan: location vs tagging correlation 0.76; e.g. Tanah Abang location 1,175 vs tagging 5,700 (outlets credited with GA activated elsewhere), Kramat Jati 4,208 vs 1,383 (activations credited to outlets elsewhere). Inner Jakarta in total is nearly balanced for IM3 (location 132,031 vs tagging 133,768 for 1–26 Sep), so the roaming is mostly between areas, not in or out of the region.

### 8.4 What cannot be built yet
A matrix "GA at location X coming from outlet Y (Area / MC inside Inner Jakarta, or outside Jakarta)" needs pair-level data. The files contain each side separately, so the app shows net flow per Area, MC and kecamatan (location − tagging) and the region-level October comparison, and does **not** estimate the cross matrix. Required extract: `GA date · brand · kecamatan or site NBS of the activation · tagged outlet id · qty` for September and 1–13 October (outlets outside Inner Jakarta kept with their own id so they can be classed as "outside Jakarta").

### 8.5 GA tagged outside Inner Jakarta
October raw: 486,275 IM3 and 188,794 3ID GA tagged to outlets that are not Inner Jakarta outlets (nationwide), and 17,966 + 14,656 with no outlet tag. Their activation location is unknown; they are shown as context only and are not part of any Inner Jakarta total.

### 8.6 Source of outlet (FINAL OUTLET) — added 15 Oct 2026
`FINAL OUTLET` in the RGUGA outlet sheets classifies each outlet as PJP (on the beat plan), NON (outside it) or KAM (key account); the workbook's own `UAR PJP` / `UAR ALL OUTLET` rows are SSO for PJP outlets and for all outlets. In the feed (`sg`): physical outlets PJP 21,888 rows → master outlets are 94% PJP (13,727 of 14,635), Non-PJP master outlets 830, KAM 6; outlets outside the master are mostly Non-PJP (3,905) or unclassified (3,292). The master DSE mapping therefore only covers PJP outlets, which is why 39% of October GA sits outside the master list: that GA is Non-PJP and has no DSE. 3,332 outlets (9,001 GA in October, 10% of GA) have no label because they appear only in the raw pivots (the 3ID September sheet carries no FINAL OUTLET); they are shown as "Belum terklasifikasi" rather than guessed.
