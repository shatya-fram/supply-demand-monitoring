# Latest summary · Mapping DSE · MC · HoA and DSE · Outlet (23 Oct 2026)

Basis: territory master after the catalogue 202610 was applied (`data/catalogues/territory_management_master.csv`, generated 23 Oct 06:19; DSE per outlet from sheet FINAL_20261020; HoA, DSO, MC and branch from the master; **KAB BEKASI stays under HoA Budi Priyambodo**, owner decision 21 Oct). Read-only summary, nothing rebuilt. Detail lists: [mapping_summary_23okt/mc_summary.csv](mapping_summary_23okt/mc_summary.csv) (36 MC) and [mapping_summary_23okt/dse_summary.csv](mapping_summary_23okt/dse_summary.csv) (290 DSE-MC rows). Branch `BEKASI` is shown as KOTA BEKASI.

## 1. Headline

| | Count |
|---|---:|
| HoA | 7 |
| Branch (Area) | 7 |
| MC | 36 (one DSO or DSP per MC) |
| DSE | **271 people** in 290 DSE-MC rows (17 DSEs appear in two MCs, mostly temporary logins and swaps) |
| Outlets in the master | **16,130** (14,694 before the catalogue; +1,373 only in FINAL, 3 without any id) |
| Outlets with a DSE (PJP) | 14,962 |
| Outlets without a DSE (no PJP) | **1,168**: KAB BEKASI 678 (Babelan 149, Cibarusah 125, Tambun 112, Pebayuran 103), West Jakarta 191 (Grogol 102), South Jakarta Depok 121, East 61, Central North 55, Karawang 49, Kota Bekasi 13 |
| Outlets per DSE | median 52, p90 72, max 99 (Pondok Gede: Muhammad Rizaldi 99, Adnan S Badrun 98, Sandy Saputra 96); 18 DSE-MC rows under 30 outlets (temporary logins / partial) |

## 2. HoA → MC → DSO → DSE

| HoA | Branch | MC | DSE | Outlets | With DSE |
|---|---|---:|---:|---:|---:|
| Budi Priyambodo | KAB BEKASI | 7 | 43 | 3,021 | 2,343 |
| Roswida Sidauruk | SOUTH JAKARTA DEPOK | 7 | 59 | 2,975 | 2,854 |
| Apri Sugiyanto | KARAWANG | 6 | 44 | 2,659 | 2,610 |
| Ali Sabana | KOTA BEKASI | 4 | 40 | 2,124 | 2,111 |
| Muchlis | EAST JAKARTA | 4 | 39 | 1,943 | 1,882 |
| Ragus Sularto | CENTRAL NORTH JAKARTA | 5 | 39 | 1,828 | 1,773 |
| Antony Hermanto | WEST JAKARTA | 3 | 26 | 1,580 | 1,389 |

No MC has more than one HoA or DSO. The per-MC table (DSO, DSE, outlets, with / without DSE, Hybrid / IM3 only / 3ID only) is in `mc_summary.csv`. Largest MCs: Pondok Gede 832, Cakung 653, Cengkareng 642, Ciracas 580; smallest: Bekasi Utara 302, Sawangan 307, Kramatjati 322, Cibarusah 321.

## 3. DSE → Outlet

* DSE is a person (271), not a login; each person has an IM3 and a 3ID login (`DSE_IM3_3ID_BEDA`: 143 outlets where the two logins differ).
* Outlet by brand type in the master: Hybrid 7,868 · IM3 only 4,791 · 3ID only 3,468 · no id 3 (section 4 of `hybrid_entity_recommendation.md`).
* Flags in the master (outlets): BARU_DARI_FINAL 1,373 · IOH_NON_BERTENTANGAN 1,286 · TIDAK_ADA_DI_FINAL_20OKT 1,167 · PAIR_DIUBAH_CATALOGUE 275 · PAIR_DIPISAH 247 · ID_PERLU_VERIFIKASI 155 · DSE_IM3_3ID_BEDA 143 · PAIR_3ID_GANDA 95.
* 306 outlets of 24 swapped DSE pairs are taken as FINAL gives them; October check-ins still point to the old DSE for 414 of 424 ids, so this may be a coding error in FINAL (open since 21 Oct).
* The weekly PJP template (SMARTBEAT, live since 21 Oct) has its own DSE per outlet; the two agree for all but 46 of 21,233 common outlet ids, but the feed `pjp_mapping_feed` still applies the 15 Oct nearest-location rule on top (`pjp_weekly_template_change_21okt.md`).

## 4. To watch

1. 1,168 outlets without DSE, 58% of them in KAB BEKASI: PJP and target coverage there stay low until the vacancies are filled.
2. DSEIN124 (MC-Kebayoran) has 43 / 46 outlets planned on one day in the new weekly template.
3. The catalogue sheet FINAL is dated 20 Oct; the DSE of 1,167 master outlets is not in it (history kept, flag `TIDAK_ADA_DI_FINAL_20OKT`).
