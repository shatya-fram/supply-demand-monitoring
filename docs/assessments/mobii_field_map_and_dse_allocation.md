# MOBII Sell-In Reports · Field Map and Allocation Insight (top-down: commodities to DSE)

**Date:** 13 October 2026
**Files:** `raw/SP VC Sellin/` (Physical Distribution Summary Report, `Sell In`, 4,659 rows) and `raw/MOBI TRansfer Balance/` (same report layout, `Balance Transfer`, 12,760 rows). Both 01–11 Oct 2026, pipe-delimited, 44 columns, header found by the `TRANSACTION DATETIME` token. Every row has exactly 44 fields.
**Reconciled against:** `website/data/territory_feed.json` (14,694 master outlets, 36 micro clusters, 272 DSEs).

---

## 1. Field map (all 44 columns)

Fill = share of rows with a value. "Phys" = physical SP/VC report, "Bal" = balance report.

### 1.1 Transaction

| # | Field | Content | Fill Phys / Bal | Use |
|---|---|---|---|---|
| 0 | TRANSACTION DATETIME | `dd-Mon-yyyy hh:mm:ss` WIB | 100 / 100 | Day, hour, trend |
| 1 | TRANSACTION ID | MOBII transaction id; unique in Bal, repeats in Phys when one order has several product lines | 100 / 100 | De-duplication key together with product |
| 2 | REFERENCE ORDER NUMBER | Blank in Phys; 20-digit order ref in Bal | 0 / 100 | Bal only |
| 3 | DISTRIBUTION TYPE | `Sell In` or `Balance Transfer` | 100 / 100 | Report type |

### 1.2 Sender (who moved the commodity)

| # | Field | Content | Fill | Use |
|---|---|---|---|---|
| 4 | USER ID | MOBII numeric user id of the sender | 100 | Secondary key |
| 5 | USER NAME | Sender login. For DSEs this **is the master DSE code** (`DSEPASMING631`, `26130510043ID`); 476 of 567 field logins match `dse_code_im3` / `dse_code_3id` | 100 | **Primary DSE key** |
| 6 | ORGANIZATION ID | Node id of the sender's parent organisation (the distributor) | 100 | Distributor key |
| 7 | SALDOMOBO_ID | Saldo Mobo id of that parent organisation (`D426102067`, `1-1633…`) | 100 / 99.7 | Distributor key |
| 8 | ORGANIZATION NAME | Distributor company name (`PT. SANNIN BROTHER MEGAH`, `ELKOMINDO MITRA MANDIRI PT`); 46 names in Phys, 134 in Bal (spelling variants) | 100 | Distributor label, needs normalising |
| 9 | OUTLET TYPE | **Duplicate of 8** | 100 | Ignore |
| 10 | FROM NODE | Sender node id | 100 | Sender key |
| 11 | FROM NODE NAME | Role-prefixed node name: `Canvasser_PT-PASAR MINGGU_1390604` (DSE), `MPC - OWNER_PT-JAKARTA PUSAT_968839` (main distributor), `SDP_MC-KARAWANG_728478` (sub-dealer partner), `Dealer Owner…` | 100 | **Sender tier** and the sender's partner territory |
| 12 | INITIATOR CIRCLE | Should be `JAKARTA RAYA`; in most rows repeats FROM NODE NAME | 100 | Unreliable, ignore |
| 13 | INITIATOR REGIONAL | `INNER JAKARTA` (Phys 96%); Bal also `OUTER JAKARTA`, `WEST JAVA` | 100 | Region filter for Bal |
| 14 | INITIATOR AREA | `INNER JAKARTA WEST` / `INNER JAKARTA EAST` (system areas, not our 7 branches) | 100 | Ignore for territory |
| 15 | INITIATOR BRANCH | Mostly equals 14; a real branch name in about 2% of rows | 100 | Ignore, use master |
| 16 | INITIATOR MICRO CLUSTER | Sender's micro cluster (`MC-PASAR MINGGU`); 49 distinct in Phys, 221 in Bal | 100 | Sender MC |
| 17 | INITIATOR PARTNER TERRITORY | Sender's partner territory, same names as 16 (`PT-…` variants for a few) | 100 | Sender MC fallback |
| 18 | INITIATOR KECAMATAN | Mostly blank; numeric ids when filled | 2 / 2 | Ignore |
| 19 | INITIATOR TERRITORYID | Partner territory id `PT1110065` | 26 / 50 | Optional |

### 1.3 Receiver (who received the commodity)

| # | Field | Content | Fill | Use |
|---|---|---|---|---|
| 20 | DEST_ORGANIZATIONID | Receiver node organisation id | 100 | Secondary key |
| 21 | DEST_SALDOMOBO_ID | **Receiving outlet key**: numeric for IM3 (`17780785`), `SH…` for 3ID, `D…`/`SFWA…` for partners. Matches the master `outlet_id_im3` / `outlet_id_3id` for 99.6% of outlet-bound Phys rows (leading zeros stripped) | 100 | **Primary outlet key** |
| 22 | DEST_ORGANIZATIONNAME | Outlet name, or partner / `_MP3` sub-distributor name | 100 | Label |
| 23 | DEST_OUTLET TYPE | `Non Mobo Outlet`, `Mobo Outlet`, or a partner name when the receiver is not an outlet | 100 | **Receiver tier** |
| 24 | TO NODE | Receiver node id | 100 | Key |
| 25 | TO NODE NAME | For outlets a role list (`OUTLET OWNER,OUTLET FRONTLINER,…`); for partners the node name (`MPC - OWNER_PT-TANAH ABANG_1389376`, `FWA Stockist_INDONESIA_…`) | 100 | Receiver tier for partners |
| 26 | DEST REGION | `INNER JAKARTA` 97% in Phys | 100 | Region check |
| 27 | DEST AREA | System area | 100 | Ignore |
| 28 | DEST BRANCH | Blank 97–99% | 2 / 1 | Ignore |
| 29 | DEST MICRO CLUSTER | Blank 97–99% | 2 / 1 | Ignore |
| 30 | DEST PARTNER TERRITORY | **Receiver's micro cluster** (`MC-PASAR MINGGU`). Agrees with the master MC of the matched outlet in 99.7% (Phys) / 99.4% (Bal) of rows | 99.9 / 100 | **Primary DSO / MC key**, also works for unmapped outlets |
| 31 | DEST KECAMATAN | Mostly blank; MC names when filled | 2 / 1 | Ignore |
| 32 | DEST ADDITIONAL TERRITORY | **Receiver's kecamatan name** (`JAGAKARSA`, `CILANDAK`). Agrees with the master kecamatan 90% (Phys) / 86% (Bal); the rest are spelling differences | 94 / 99 | Kecamatan fallback |
| 33 | DEST TERRITORYID | BPS-style code `ID3173060` or partner id | 6 / 2 | Optional |

### 1.4 Product and value

| # | Field | Content | Fill | Use |
|---|---|---|---|---|
| 34 | PRODUCT CATEGORY | Phys: `Voucher` (3,580 rows) or `Starter Pack` (1,079). Bal: `E-Voucher` | 100 | Category |
| 35 | PRODUCT CODE | 27 SKUs in Phys; `10000` in Bal | 100 | SKU key |
| 36 | PRODUCT NAME | SKU name (`V0 3in1 JABO_SUK_NewREG`, `SP ZERO 0725 JABO SUK DAN CIANJUR`, `VOUCHER PHYSICAL BLANK 3IN1 JABODETABEK`) | 100 | SKU label |
| 37 | QTY | Phys: physical units. Bal: **rupiah amount** of saldo | 100 | **Volume** |
| 38 | RATE/UNIT | Phys: unit price (`500`, `10000`, `13250`…). Bal: `1.0` | 100 | Value = QTY × RATE |
| 39 | OPERATOR ID | Phys: repeats USER NAME. Bal: login | 100 | Ignore (Phys) |
| 40 | OPERATOR NAME | Phys: repeats USER NAME. Bal: sometimes the person's real name (`Firmansyah`) | 100 | Name hint (Bal only) |
| 41 | DISCOUNT VALUE | Phys: repeats USER NAME. Bal: `0.0` in 99% of rows | 100 | Ignore |
| 42 | FINAL VALUE | **Phys: corrupted, holds the login in 88% of rows.** Bal: equals QTY where numeric (179 rows are not) | 100 | Never use in Phys; use QTY in Bal |
| 43 | BRAND | `IM3` / `3ID` | 100 | Brand |

Columns 39–42 in the physical report are a source defect (the export repeats the login into the last four numeric columns). Report it to the MOBII owner; the value rule `QTY × RATE/UNIT` is exact for every product because each SKU has a single rate.

---

## 2. Node-to-node flows found in the physical report (01–11 Oct 2026)

Sender and receiver tier come from the FROM NODE NAME prefix and DEST_OUTLET TYPE / TO NODE NAME.

| Tier | Flow | Rows | Units | Value (QTY × rate) | Comment |
|---|---|---|---|---|---|
| **A. Bulk fill-in** | MPC main distributor → MPC sub-distributor (`_MP3`) | 119 | IM3 VC 119,015 · IM3 SP 12,832 · 3ID VC 51,949 · 3ID SP 10,020 | Rp 1.04 B | The commodity entering the territory stock points. Tagged with the receiving MC (DEST PARTNER TERRITORY). |
| **B. Distributor → DSE** | MPC → Canvasser | 31 | 149 | Rp 1.2 M | Almost absent. DSE bag allocation is not captured by this export. |
| **C. DSE Sell-In** | Canvasser → outlet | 4,126 | IM3 VC 92,694 · IM3 SP 2,779 · 3ID VC 23,479 · 3ID SP 359 | Rp 135 M | The field execution. 231 DSE logins, 2,8xx outlets. |
| D. Partner direct | SDP → outlet (2 logins, Karawang) · MPC → outlet | 185 · 38 | 2,204 · 7,520 | Rp 30.7 M · Rp 3.8 M | Sell-In without a DSE. Keep as a separate channel. |
| E. Unidentified sender | numeric node name (17 logins) | 100 | 1,602 | Rp 1.7 M | Operators without a role prefix. |
| F. Out of scope | MPC → FWA stockist (national), → Dealer Owner, → Central Java MCs | 7 | 1,000 | Rp 43 M | Drop. |

Balance report: Canvasser → outlet 12,118 rows (1,146 logins across Jakarta Raya, of which about 6,400 rows are Inner Jakarta), SDP → outlet 307, unidentified 261. **No distributor → DSE saldo rows at all.**

---

## 3. What can be allocated to whom

### 3.1 To each DSE (272 in the master)

| Available now | Key | Quality |
|---|---|---|
| Physical Sell-In to outlets: units, value, SKU mix, outlets reached, per day | USER NAME = master DSE code; fallback receiving outlet's assigned DSE | 84% of field logins are master codes; 95.6% of Phys rows carry a roster login |
| Electronic Sell-In (saldo) to outlets: amount, outlets, per day | same | 51% after the Inner Jakarta cut |
| Strike rate and drop size | join to the visits feed on DSE and outlet | ready, both feeds share the outlet key |
| **Not available:** DSE opening stock, stock received from the distributor, stock in hand | needs tier B rows or a MOBII stock-allocation export | only 31 rows exist |

### 3.2 To each DSO / micro cluster (36)

| Available now | Key |
|---|---|
| Bulk fill-in into the MC (tier A), by brand and category | DEST PARTNER TERRITORY of the `_MP3` receiver |
| DSE Sell-In out of the MC (tier C), by brand, category, SKU, DSE | DEST PARTNER TERRITORY (99.7% consistent with the master) |
| Fill-in minus Sell-In = commodity still sitting in the MC stock point (indicative) | same |
| Saldo injected into the MC's outlets, number of active DSEs | DEST PARTNER TERRITORY, USER NAME |

First read of the 11 days, units: IM3 vouchers 116,860 filled in vs 92,481 sold in by DSEs; IM3 starter packs 12,832 vs 2,769; 3ID vouchers 51,949 vs 23,478; 3ID starter packs 9,332 vs 359. Fill-in rows exist for 21 of 36 MCs; 15 MCs show DSE Sell-In with no fill-in rows in the window (stock from before 1 Oct or filled through a channel the export does not show). Two MCs (Pebayuran, Beji) have fill-in and no DSE Sell-In at all. Starter-pack Sell-In to outlets is very low against fill-in in every MC.

### 3.3 To territory (branch / HoA, kecamatan, site)

| Level | How |
|---|---|
| Branch and Head of Area | master MC → branch mapping (the file's own BRANCH fields are system areas, not usable) |
| Kecamatan | master outlet → kecamatan; DEST ADDITIONAL TERRITORY as fallback for unmapped outlets (90% agreement) |
| Site (NBS) | master outlet → `site_nbs`; no site field in the file |
| Outlet | DEST_SALDOMOBO_ID (99.6% match in Phys, 50.8% in Bal before the Inner Jakarta cut) |

---

## 4. Rules for the Sell-In feed (locked by this assessment)

1. Header by token, 44 fields exactly, trailing `\r` stripped.
2. Sender tier from the FROM NODE NAME prefix: `Canvasser` → DSE, `MPC - OWNER` → distributor, `SDP` → sub-dealer, else `unidentified`.
3. Receiver tier: `DEST_OUTLET TYPE` in (`Mobo Outlet`, `Non Mobo Outlet`) → outlet; `_MP3` in the receiver name or `MPC - OWNER` in TO NODE NAME → sub-distributor; `FWA Stockist`, `Dealer Owner` → out of scope.
4. Value: Phys `QTY × RATE/UNIT`; Bal `QTY`.
5. Territory: outlet → master first; else DEST PARTNER TERRITORY for MC and DEST ADDITIONAL TERRITORY for kecamatan; rows whose MC is not one of the 36 are dropped and counted.
6. DSE: USER NAME matched to master DSE codes; else the outlet's assigned DSE; else keep the login as an "unmapped sender".
7. Distributor label: normalise ORGANIZATION NAME (strip `PT`, `PT.`, double spaces, upper-case).

## 5. Gaps to raise with the data owner

1. **DSE allocation is missing.** Request the MOBII stock movement export with `FROM NODE` = MPC/MP3 and `TO NODE` = Canvasser (physical), and the saldo top-up ledger distributor → DSE wallet (electronic). Without it, "stock in hand per DSE" cannot be computed and Stage 1 stays at MC level.
2. **FINAL VALUE / OPERATOR columns corrupted** in the physical export.
3. **Balance export is Jakarta Raya wide**; ask for an Inner Jakarta filter or keep the master-match rule.
4. **Distributor names** come in several spellings; agree one list (6 distributors cover Inner Jakarta).

---

## 6. SP VC Sellin per file: usable fields and summary (added 13 Oct 2026, later)

| File | Rows | Dates | Outlet-bound rows | Qty (units) | Value (QTY × rate) | UAR | Active DSEs | UAR matched to master | DSE logins = master code |
|---|---|---|---|---|---|---|---|---|---|
| 3ID Physical_Distribution_Summary_Report_271536873_0 | 811 | 03–11 Oct (outlet rows 06–10 Oct) | 742 | 24,202 | Rp 16.2 M | 499 | 74 | 96.8% | 70 / 74 |
| IM3 Physical_Distribution_Summary_Report_271536877_0 | 3,848 | 01–10 Oct | 3,752 | 106,637 | Rp 155.5 M | 2,455 | 159 | 99.9% | 112 / 159 |

Usable fields (both files): 0 datetime, 1 transaction id, 5 user name (DSE code), 6–8 distributor id / Saldo Mobo id / name, 10–11 sender node id and role-prefixed name, 13 regional, 16–17 sender MC, 19 partner territory id (partial), 20–25 receiver ids, name, outlet type, node name, 26 dest region, 30 dest partner territory (= receiver MC), 32 dest additional territory (= receiver kecamatan), 34–38 category, SKU code, SKU name, QTY, RATE/UNIT, 43 brand.
Not usable: 2 (empty), 9 and 12 (duplicates), 14–15 (system areas), 18, 28–29, 31, 33 (blank or junk), 39–42 (repeat the login; FINAL VALUE corrupt).

Summary metrics supported per file, per category, per flow and per day: transactions, quantity, value, UAR (distinct DEST_SALDOMOBO_ID), active DSEs (distinct USER NAME with Canvasser sender), active days. IM3 daily ramp 1 Oct → 10 Oct: 49 → 1,414 transactions, UAR 34 → 1,104. 3ID outlet Sell-In only starts on 6 Oct.
