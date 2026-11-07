# DSF outlet flag (Program & Tipe Outlet, program DSF)

Owner request 7 Nov 2026: flag the DSF outlets for the menu Program & Tipe Outlet (category DSF) from the sheet `manpower DSF` of
`raw/Catalogue/DASHBOARD DSF November 2026.xlsx`, using the outlet ids in the columns **OUTLET DSF** and **QR CODE 3ID DSF**.

## 1. What is in the workbook

`DASHBOARD DSF November 2026.xlsx` (new, 7 Nov 11:49) has 12 sheets: BRANCH VIEW HYBRID, SUMMARY DSF, DSF PERFORMANCE, SUMMARY DETAIL MAN POWER,
DASHBOARD AE, **manpower DSF**, four RAW RGUGA sheets (3ID, IM3, 3ID FWA, IM3 FWA), RAW ROAMING and MANUAL CLAIM DSF. Only `manpower DSF` is used here.

`manpower DSF`: 24 DSF persons (all ACTIVE, role DSF IOH HYBRID), key columns REGION, BRANCH, DSF NAME, ID MOBII IM3 / SALESHUB (login DSFIN001..024),
ID MOBII 3ID, **OUTLET DSF** (IM3 / SaleSHub id), MSISDN TRX SIMPEL, **QR CODE 3ID DSF** (3ID id), MICRO CLUSTER, partner ids and territory.

## 2. Ids

| Item | Count |
|---|---|
| DSF persons | 24 (KOTA BEKASI 4, KAB BEKASI 4, KARAWANG 4, CENTRAL NORTH JAKARTA 2, SOUTH JAKARTA DEPOK 4, EAST JAKARTA 4, WEST JAKARTA 2) |
| Outlet ids (OUTLET DSF + QR CODE 3ID DSF, de-duplicated) | **41** |
| Skipped (not an outlet id) | 1: `DSFINNER06` in OUTLET DSF of FIRMANSYAH (a login, DSFIN012); he has no QR code, so he has **no outlet id** |
| Persons with one id only | 5: GIFFARY, ARI SUSANTO (QR only), WIRYANTO, FITRIA RACHMA NINGSIH (OUTLET only), FIRMANSYAH (none) |
| Same id in both columns | 1: SH156488 (ADE LENDRA) |

Id types: `SH…` (SaleSHub / QR style, 3ID and IM3), plain numbers (17368690, 451823, 336190, 12313715, 12328782, 12333231, 12313194).

## 3. Match with the app feeds (build_kro_feed, cut 6 Nov)

- **39 of 41 ids resolve to an outlet row** (GA / sell-in / demand feeds). Unmatched: `12328782` (GIFFARY, East Jakarta) and `SH001631` (DANI RODIANA, 3ID).
- **Only 3 of the 39 are master outlets**; 36 are **non-PJP** ids (`G:` rows), so a DSF is mostly outside the territory master: no master DSE, MC from the file only.
- GA MTD of the DSF ids (1-6 Nov): **232 GA**; largest SH156488 ADE LENDRA 60, SH048910 DINDA 25, SH050116 VEINY 23, SH050762 ANGGI 18 (this one sits in the heatmap row OUTSIDE MASTER TERRITORY).
- The big OUTSIDE MASTER ids asked about earlier (3ID 153825, SH155202, SH167559, SH160773, SH267560) are **not** in the DSF sheet; they stay unexplained.
- The 55 ids of the November catalogue with category DSF (before this change the only DSF list) overlap the sheet on 4 ids (12313715, 12328782, 12333231, 451823) and match **no** outlet row in the feeds.

## 4. What was changed

- New `scripts/build_dsf_manpower.py` (stdlib). Writes `data/catalogues/catalogue_202611/dsf_manpower.csv` (24 rows: person, logins, MC, both ids) and rewrites the DSF rows of
  `data/catalogues/kro_program_outlets.csv`: 41 ids of the sheet + 55 catalogue ids = **96 rows** (note column says which source).
  Switch `KEEP_CATALOGUE_DSF = False` makes the sheet the only source (41 rows).
- `build_catalogue_nov_programs.py` calls it at the end, so a catalogue rebuild does not drop the sheet ids.
- `app.js`: the notes of Program & Tipe Outlet no longer say DSF has no list.
- A new DASHBOARD DSF file in `raw/Catalogue/` is picked up by `python3 scripts/build_dsf_manpower.py` (newest by modified time), then `python3 scripts/build_kro_feed.py` (daily_update does the second step).
- Check: `build_kro_feed.py` reports DSF (39 outlets found, 96 ids); `audit_kro.js` and `render_check.js` pass.

## 5. Open points for the owner

1. **Union or sheet only?** The catalogue's 55 DSF-category ids add nothing visible today; keep them (default) or use only the 41 of the sheet.
2. **Two unmatched ids** (12328782, SH001631) and **FIRMANSYAH without an outlet id**: ask the DSF coordinator for the outlet id / QR code.
3. **DSF is a person, the ids are the QR / SaleSHub codes**: GA and sell-in under these ids are the DSF's own sales; they are non-PJP, so they stay outside DSE incentives and the MC totals of master outlets.
4. The sheet carries no hybrid pairing; an IM3 and a 3ID id of the same DSF are two rows unless the catalogue pairs them.

## 6. DMO / DMP mapping, breakdown and monitoring (7 Nov 2026)

- **Mapping DSF -> DMO / DMP**: column `DMO/DMP` of the sheet (14 names, 11 with DSF in the roster) with branch, micro cluster, partner territory (`PT-...`),
  embarkasi / non embarkasi and KPI product (4G & 5G), written to `data/catalogues/catalogue_202611/dsf_manpower.csv`
  (`dmo_dmp`, `partner_im3`, `partner_3id`, `embarkasi`, `kpi_product`) and to the app feed `website/data/dsf_feed.js` (`window.DSF_FEED`).
  MSISDN and NIK of the DMO / DMP in the sheet are NOT copied.
- **Tab Monitoring DSF** (`#/mb_program?prgTab=dsf`, code `website/dsf_monitor.js`, hooks `viewProgramDsf` / `dsfApi` in `app.js`): collapsible tree
  **DSF category > Area > DMO / DMP > DSF manpower > outlet id** (Area open, DMO / DSF closed; Buka semua / Tutup semua; CSV download).
- **Measure**: GA pcs at the outlet ids of each DSF (GA feed, outlet tagging, so it follows the daily update). **Target (owner)**: 20 pcs per DSF per working day
  (Monday-Saturday, Sunday off) and 500 pcs per DSF per month (25 working days in November). Columns: GA MTD, target to D<cut>, % target, gap, target month, % month,
  CRR per working day, RRR per working day, D1..D30 with colour vs 20 pcs (green >= 100%, yellow 50-99%, red < 50%).
- Target applies from November; the October view (`per=oct`) shows GA only. The Bridge target for DSF is 12,500 = 25 DSF x 500; the roster has 24 DSF (12,000).
- The ids are mostly non-PJP, so the GA is read from the GA feed by id, not through the master DSE.
- Not covered: sell-in SP or other products per DSF (the DSF target is read as GA pcs, as in `program_target_nov.csv`; change here if the owner means another measure).
