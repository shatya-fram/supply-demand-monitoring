# Assessment · Weekly PJP template (permanent outlet → DSE mapping)

Assessed 15 Oct 2026 before the mapping was built (CLAUDE.md §2). Contract for `scripts/build_pjp_mapping_feed.py`, `data/catalogues/pjp_outlet_mapping.csv`, `data/catalogues/pjp_outlet_exceptions.csv` and `website/data/pjp_mapping_feed.js` (`PJP_MAP`). Screen: Konfigurasi › PJP Mapping.

## 1. File
`Weekly_PJP_2026-10-01_ALL_MC.xlsx` (copied to `raw/PJP Weekly/`), one sheet, 14,755 outlet rows, 16 columns: Circle, Region, Branch, MC, DSE IM3, DSE 3ID, ID IM3, ID 3ID, Nama Outlet, Frekuensi (F4/F8/F12/F16), Sen..Sab (0/1). It is the weekly beat-plan template: the same visit days repeat every week; the date in the file name only marks when it was issued.

## 2. Findings
| Check | Result |
|---|---|
| Coverage | 14,645 of 14,685 master outlets covered (99.7%); 40 master outlets not in the file; 107 rows whose ids are not in the master (new outlets) |
| 3ID ids | Zero-padded to 8 digits in 8,006 rows (`00049747` = `49747`); matching without stripping reaches only 12,346 outlets, with stripping 14,645 |
| ID conflicts | 34 rows: the IM3 id and the 3ID id point to two different master outlets; IM3 id wins (same rule as the MOBII / MOBO builders) |
| Duplicates | 3 master outlets appear twice (same 3ID id, one row with IM3 id 0 or a second IM3 id); kept the row with an IM3 id, dropped 3 rows, logged |
| DSE codes | 272 DSE IM3 codes, all known to the master hierarchy; each IM3 code pairs with exactly one 3ID code; only SUSANTO has two codes (two people, key stays the code) |
| DSE vs master | Same DSE as the master outlet mapping in 12,052 of 12,053 comparable rows |
| Tanpa DSE | 868 rows have no DSE in the file and `UNASSIGNED` in the master (KAB BEKASI 562, WEST JAKARTA 213: Pebayuran, Cibarusah, Cibitung, Tambun, Grogol): a real vacancy, kept as TANPA DSE |
| Frequency | F = 4 × days per week holds for all but 2 rows (F8 with 4 days). F8 13,709 · F12 748 · F4 293 · F16 2 |
| Day patterns | Mon+Thu, Tue+Fri, Wed+Sat account for 13,709 outlets; no Sunday visits |
| DSE load | 272 DSE × 6 days: median 17 outlets per day, p90 23, max 35 (DSEIN124), min 5; none above 45 |
| Branch / MC | Branch `KOTA BEKASI` in the file is `BEKASI` in the master (alias); 2 rows have an MC that differs from the master (file MC used) |
| Names | 182 blank outlet names; 172 filled from the master |
| Against the beat plan loaded in MOBI | For 8–13 Oct (1–7 Oct was still filling after the system migration): 83% of the planned visit days are in the template and 74% of the template days are in the plan; the plan operator is the same person as the file's DSE for 11,387 outlets and differs for 2,211 (16%); after the nearest-location rule 11,738 agree and 1,860 differ |

## 3. Rules applied
1. Match order: IM3 id, then 3ID id (after stripping zero padding); IM3 wins on conflict.
2. DSE key = IM3 code (3ID code if IM3 is blank); name = master DSE name for that code.
3. Rows with problems are **kept** (flagged in `flags` and listed in the exceptions file) except exact duplicates of the same master outlet.
4. Outlets not in the master are kept with key `N:<im3>_<3id>` so they can still be printed; they have `m = 0` in the feed.
5. The mapping is permanent until a new Weekly_PJP file is built; nothing is merged across files.

## 4. Use
- Konfigurasi › PJP Mapping: summary and sanity checks, per DSE, daily preview (date → weekday → outlets per DSE for the header territory), exceptions.
- The daily preview is the data for the print instruction: outlets per DSE for the chosen territory and date. The print layout itself is not built yet.
- Refresh: put the new `Weekly_PJP_*_ALL_MC.xlsx` in `raw/PJP Weekly/` and run `python3 scripts/build_pjp_mapping_feed.py`.

## 4b. Owner decisions, 15 Oct 2026
1. **868 outlets without DSE: left as they are** (TANPA DSE per MC).
2. **Outlets whose file DSE differs from the MOBI beat-plan operator (2,211): assigned to the DSE with the nearest outlets.** Rule: outlet coordinates from the master; 3 nearest undisputed outlets of the same MC, distance weighted; at most 3 km; at most 40 outlets per DSE per weekday (file maximum is 35). The rule guesses the DSE of undisputed outlets correctly 88.4% of the time (leave-one-out on 11,068 outlets). Result: 1,054 outlets move to another DSE, 1,093 stay (the nearest DSE is the file DSE), 45 stay (no valid coordinate or nearest outlet beyond 3 km), 19 stay (nearest DSE already at 40 per day). The file DSE and the distance stay in the catalogue (`dse_name_file`, `jarak_km`, `dse_basis`).
3. **107 outlets not in the master, 34 ID conflicts (IM3 id wins), 3 duplicate rows dropped, 40 master outlets without PJP: left as they are.**

Side effect to review before printing: 53 DSEs change by 10 outlets or more and 10 DSEs lose more than half of their outlets (DSEIN101 61 → 1, DSEIN100 57 → 7, DSEIN116 70 → 23, DSEIN122 63 → 21, DSEIN104 60 → 21); the gainers are capped, e.g. PURWANTORO (DSEIN044, MC-CENGKARENG) 73 → 113 outlets and BUDI DARSONO (MC-CIBITUNG) 53 → 113, at the 40-per-day cap on most days. `PJP_DSE_BASIS=file python3 scripts/build_pjp_mapping_feed.py` rebuilds the mapping with the DSE of the file for every outlet.

## 5. Open items for the owner
- 868 outlets have no DSE (see the Pengecualian tab per MC).
- 107 outlets are not in the master outlet list yet; 40 master outlets have no PJP.
- Whether the DSEs that lose most of their outlets under the nearest-location rule (DSEIN101, DSEIN100 and a few more) are really vacated, or whether the Weekly_PJP file should stay authoritative for them.
