# Assessment · `raw/Catalogue/CATALAGUE_INNER_JAKARTA_202610.xlsb` vs the catalogues configured in the system

Date: 21 Oct 2026. Analysis only: no builder, feed or schema was changed. This is the data contract proposal for the next catalogue refresh (CLAUDE.md section 2 gate).

## 1. What the file contains (9 sheets)

| Sheet | Rows | Content | Snapshot date |
|---|---|---|---|
| IS Participant | 36 | DSO / DSP per MC, with HoA | undated |
| Territory | 826 kecamatan (West Java + Jakarta region; 121 are Inner Jakarta) | kecamatan → PT / MC / branch / area, **Sep (Before) vs Oct (After)**, partner (MPC / MP3) | Oct "After" |
| DSE | 272 | DSE master: branch, MC, partner, agency, IM3 / 3ID login, DSO, HoA, `#IM3` and `#3ID` outlet counts | undated |
| PT | 7 | counts per branch: dual / single brand, different kecamatan, create ONO IM3, re-open | n/a |
| OUTLET IOH | 13,801 | IM3 ↔ 3ID outlet **pairing** (master outlet key, canonical MC / PT / kecamatan, pairing status, type RETAIL / KRO / WS / DTU / AVA / Kotkab / Promotor) | header says "data 2 Oct", hierarchy 16 Oct |
| FINAL_20261020 (+ `im3`, `3id` sheets, same content split) | 22,426 (IM3 12,197 + 3ID 10,229) | **outlet → DSE mapping in MOB**, area / branch / MC, org status | 20 Oct |
| IOH_Outlet | 35,955 (IM3 17,513 + 3ID 18,442) | all outlets with lat / long, kecamatan, MC, PT, `dse_code`, PJP / NON flag, DTU / AVA / Kotkab / Wholesaler / Promotor flags | month = 19 Oct |

There is **no PJP schedule** (visit days / frequency) in this file. The only schedule source stays `raw/PJP Weekly/Weekly_PJP_2026-10-01_ALL_MC.xlsx` (system: `pjp_outlet_mapping.csv`, 14,752 outlets, frequency F8 / F12 / F4 / F16 and day columns). The new file only carries the `PJP` / `NON` flag per outlet.

System baseline compared: `dse_master_hierarchy.csv` (272), `dso_territory_mapping.csv` (36 MC), `territory_management_master.csv` (14,694 physical outlets; IM3 11,985 ids, 3ID 10,445 ids; 860 without a DSE), `pjp_outlet_mapping.csv`, M2S DEMARKASI (121 kecamatan → MC) inside `ga_feed`.

## 2. Findings by catalogue

### 2.1 DSE ↔ Territory (sheet DSE, IS Participant)
- 272 DSE rows in both, 271 unique names (the two SUSANTO are different people in both). **No DSE moved MC or branch**; names, branch and MC match 1:1.
- **18 DSE have a new IM3 login** (DSEIN101–114, 118, 121, 123, 124; old logins such as `CSO-SELATAN-01`, `CSOBUANAJKB001`). One of them (Irfan Kamaludin, DSEIN124) had no IM3 login in the system. 8 DSE also changed 3ID login. The visit feed already shows these 18 as **temporary person ids T0xx named by the login** (for example T001 `DSEIN101`, 339 planned visits) while the same person also exists under the old login (M247 Nur Ainun, M086 Junita Riana checked). Together the 18 T-records hold about 5,174 planned visits (4.6% of 111,786). Five more T-records (DSEIN100, 115, 116, 120, 122; 672 planned, 0 executed) are **not in the new DSE sheet at all**.
- **HoA changes for KAB BEKASI**: new file has Ali Sabana for 5 MCs (Babelan, Cibarusah, Cibitung, Cikarang Barat, Cikarang Timur; 28 DSE) and Budi Priyambodo for 2 MCs (Pebayuran, Tambun; 13 DSE). The system has Budi Priyambodo for all 41 KAB BEKASI DSE (`gaplok_location_mapping.csv`, `dse_master_hierarchy.csv`).
- Spelling only (no real change but breaks string joins): HoA "BUTET ROSWIDA SIDAURUK" vs "Roswida Sidauruk", "R AGUS SULARTO" vs "Ragus Sularto" (110 DSE rows), DSO "RADEN SYARIEF DURAHMAN" vs "R. SYARIEF DURAHMAN", "LESTARI AMURIH RAHAYU" vs "LESTARI A. R.", "MAULIDIRIZKI" vs "MAULIDRIZKI" (13 rows).
- IS Participant: 36 MC, 29 DSO + 7 DSP (Pebayuran, Tambun, Batujaya, Tegalwaru, Bekasi Tengah, Pondok Gede, Cengkareng are led by a DSP). The system's DSO mapping lists a DSO name for these MCs, so the title DSO / DSP is new information. Branch label for Kota Bekasi is `KOTA BEKASI`; the system and the DSE sheet use `BEKASI`.
- New fields not in the system: agency (PERMATA 153, STAFFINC 119), partner territory code (39) and partner id new (IM3 / 3ID), MPX name.
- `#IM3` / `#3ID` outlet totals in the DSE sheet are 12,189 / 10,449; FINAL maps 12,197 / 10,229 (3ID is 220 lower in FINAL).

### 2.2 Territory (sheet Territory)
- The 121 Inner Jakarta kecamatan are the same 121 as the system target list; **the "After" MC equals the system DEMARKASI MC for 121 / 121**. The system already runs the October structure. Nothing moved in or out of Inner Jakarta.
- Sep → Oct: 58 kecamatan changed MC (for example 6 from MC-CIBITUNG to MC-PEBAYURAN, 6 from MC-RENGASDENGKLOK to MC-BATUJAYA, 8 Jakarta Pusat kecamatan split into Cempaka Putih / Tanah Abang). MC count 24 → 36.
- Branch relabel Sep → Oct: BEKASI → KOTA BEKASI (12 kec), DEPOK + SOUTH JAKARTA → SOUTH JAKARTA DEPOK (21), NORTH + SOUTH KARAWANG → KARAWANG (31). Only the Territory and FINAL sheets use the new names; **OUTLET IOH still uses the old names** (NORTH / SOUTH KARAWANG, SOUTH JAKARTA, DEPOK).
- Partner: only a punctuation change for TRIMINDO JAYA MANDIRI (11 kec), 57 MPC shortcode changes. 3ID side has 117 MP3 and 4 3KIOSK.
- System data quality item: for 12 of 125 kecamatan labels in the outlet master the majority MC differs from the catalogue, mostly name collisions; the largest is label `CIBITUNG | PANDEGLANG` on 76 outlets that sit in MC-CIBITUNG (Bekasi). Worth checking the kecamatan / kabupaten labels in `territory_management_master.csv`.

### 2.3 Outlet ↔ DSE (sheet FINAL_20261020 vs system master)
- FINAL has **22,426 brand-outlet rows, all "DSE mapped"**, and every DSE id in it exists in the new DSE sheet. Two outlets sit outside the region (`BANDA ACEH` MC-BIREUEN, `BOGOR WEST` MC-BOJONG GEDE). 433 are "Outlet not in tbl mobo organization", 5 "Pending at SALDOMOBO".
- Against the system (matched by brand outlet id, 20,903 rows):

| Measure | Result |
|---|---|
| Outlet only in FINAL | IM3 673, 3ID 850 (top: IM3 Pondok Gede 218, 3ID Cipayung 99, 3ID Pondok Gede 98, 3ID Batujaya 86, 3ID East Cikampek 79) |
| Outlet only in the system | IM3 461, 3ID 1,066 = 1,527 ids (top: 3ID Babelan 115, Grogol 104, Pebayuran 103, Tambun 100). **1,155 of them have sell-in transactions and 1,152 have visits** in the system |
| MC differs | 54 of 20,903 |
| DSE differs (normalised codes) | 1,766 rows: 1,508 mapped to a different DSE, 223 were unassigned in the system, 35 same person with a new login. Most affected: MC-Cibitung 250, Matraman 165, Cipayung 127, Sawangan 117, Karawang 110 |
| Branch label differs | 2,405 (label change only: KOTA BEKASI, merged areas) |

- FINAL covers only DSE-mapped outlets, so the 860 system outlets without DSE are by design not in it.

### 2.4 Outlet pairing IM3 ↔ 3ID (sheet OUTLET IOH)
- 13,801 rows (13,287 master keys; pairing DUAL 7,685 / SINGLE 6,116; PAIRING 6,377, NOT PAIRING 652; 445 pairs with a different kecamatan, 155 with different kecamatan, PT and MC; 135 re-open and 60 re-mapping flags; 827 auto-link pairs).
- Pair level (corrected 21 Oct, see `catalogue_202610_detail.md` section 3): the sheet holds two pairing views that disagree on 1,160 rows. Real IM3 ↔ 3ID pairs: system 7,787; left block (2 Oct, status DUAL BRAND) 7,685, of which 7,552 equal the system; right block (newer FLAG / NOTE analysis) 6,863, of which 6,367 equal the system, 496 new and 1,420 no longer paired. An earlier figure of 13,428 common pairs counted single-brand rows and is wrong.
- **Stale snapshot**: dated 2 Oct, old branch names and canonical MC (only 6,429 of 13,801 canonical MC agree with the system, while the per-brand MC columns agree for 11,321 IM3 rows). Not suited as the MC / DSE source; useful for pairing status and outlet **type** (KRO 465 IM3 / 128 3ID, WS and Wholesaler 57, Promotor 72, DTU 41, AVA 67, Kotkab 2,267).

### 2.5 Outlet universe and PJP flag (sheet IOH_Outlet)
- 35,955 brand rows, month 19 Oct. PJP 21,658 (has a `dse_code`), NON 14,297 (no DSE). Flags: Kotkab 4,129, AVA 262, Promotor 197, DTU 125, Wholesaler 48.
- Against the system master: 22,332 ids found (21,421 PJP + 911 NON), **13,623 not in the system** (13,386 NON, 237 PJP). These are the non-PJP outlets outside the master, which the system today only knows through GA and sell-in rows.
- PJP flag vs system PJP schedule ids: common 21,548, new-only 110, system-only 1,023.
- **Disagrees with FINAL**: of 20,730 outlets in both, 1,600 (7.7%) have a different `dse_code`; 928 PJP-flagged outlets are not in FINAL; 1,651 FINAL outlets are flagged NON here. `dse_code` also holds 575 distinct codes, some in name form (for example "Dedy Junaedi").
- Coordinates differ (> 50 m) for 1,125 outlets, kecamatan for 2,309, MC for 147 against the system master.
- `site_nm` is filled for the IM3 rows (17,512 of 17,513) and blank for all 18,442 3ID rows (flag `OUTLET-NBS`). **It is not an NBS site id**: it matches none of the master site ids (0 of 11,545 IM3 outlets compared), so it is not used as site (corrected 21 Oct); the site link still depends on the NBS site files (`raw/Outlet & Mapping/NBS Site to Outlet`, dated 202608).

### 2.6 Sheet PT
Branch summary of pairing counts (dual brand, single brand, different kecamatan, create ONO IM3, re-open). Reference only; the numbers belong to the 2 Oct pairing snapshot.

## 3. What this means for the system

| Area | Current system | Catalogue 202610 | Impact if adopted |
|---|---|---|---|
| MC / kecamatan structure | already October (36 MC, 121 kec) | same | none |
| Branch label | BEKASI | KOTA BEKASI | cosmetic, but any join on the label breaks; decide one label |
| DSE master | 272, old logins for 18 DSE, T-ids in visits | 272, new logins | removes up to 18 duplicate / unnamed T-records (about 5.2 k planned visits); 5 T-records stay unmapped |
| HoA of KAB BEKASI | Budi Priyambodo (all 7 MC) | Ali Sabana (5 MC) + Budi (2 MC) | HoA scorecards and filters change |
| Outlet → DSE | territory master of 12–15 Oct | FINAL 20 Oct | 1,508 outlets change DSE (affects DSE KPI, UAR, OSA, incentive base); 223 unassigned get a DSE |
| Outlet universe | 14,694 physical, 860 without DSE | FINAL 22,426 ids (DSE-mapped only); IOH_Outlet 35,955 incl. NON | 1,527 system ids not in FINAL carry history; 13.6 k NON ids not in the system |
| Pairing | adhoc_outlet file (7,787 pairs) | OUTLET IOH: left block 2 Oct (7,685), right block newer (6,863) | not adoptable as is (stale, two conflicting views) |
| Outlet type | slab ladder from volume | RETAIL / KRO / WS / Wholesaler type per outlet | candidate input for the KRO whitelist, to be compared with the slab class |
| PJP schedule | weekly PJP file | none | no change |

## 4. Decisions needed from the owner before any build change
1. **Source of truth for outlet → DSE**: FINAL_20261020 (MOB mapping, consistent with the DSE sheet counts) or IOH_Outlet (19 Oct, 1,600 conflicts)? Recommendation: FINAL for the DSE, IOH_Outlet for location / PJP flag / type flags.
2. **Outlets in the system but not in FINAL (1,527 ids)**: keep them as historical master with "no DSE", or drop them? They carry sell-in and visits for October.
3. **HoA KAB BEKASI**: confirm Ali Sabana (5 MC) and Budi Priyambodo (2 MC), and confirm that DSP-led MCs report to Budi.
4. **Branch name**: BEKASI or KOTA BEKASI on screen and in the feeds.
5. **The five unmapped temporary logins** (DSEIN100, 115, 116, 120, 122): matching visited outlets to FINAL points to Adnan Al Ap Ghani, Radesta Ficry, Danias Sundah, Rano Hidayat and Kusnadi (see detail doc 2.3); owner to confirm.
6. **OUTLET IOH**: request a refreshed snapshot (current hierarchy, current date) before using it for pairing.
7. **Outlet type (KRO / WS / Wholesaler / Promotor / DTU / AVA)**: use it in the KRO catalogue next to the volume slab, or keep volume only?

## 5. Not verified / limits
- Matching is on brand outlet id (leading zeros stripped) and on DSE login / name; no fuzzy matching on outlet names.
- The 54 MC differences and the 2,405 branch differences between FINAL and the system were counted, not reviewed one by one.
- No PJP day / frequency data exists in this file, so PJP schedule coverage cannot be compared.
