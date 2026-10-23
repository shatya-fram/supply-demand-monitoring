# Assessment · New SMARTBEAT Weekly PJP vs the previous plan (23 Oct 2026)

Read-only (CLAUDE.md §2); no builder or feed changed. Compares `raw/PJP Weekly/SMARTBEAT_WEEKLY_PJP.xlsx` (uploaded 21–22 Oct, 15,085 rows) with the previous template `Weekly_PJP_2026-10-01_ALL_MC.xlsx` (14,755 rows), and both with the MOBI journey plans / check-ins of 12–22 Oct. Key = (brand, outlet id, zero padding stripped). Field profile: `pjp_weekly_smartbeat_deepdive.md`; earlier mapping contract: `pjp_weekly_mapping.md`.

## 1. Answer

**Yes, the new file is a re-planned template, not a re-export, and it already went live in MOBI on Wed 21 Oct.** Same 16 columns, but 26.5% of the outlets that exist in both files changed visit days, 1,506 outlet ids were added, 1,339 were removed, and the DSE of an outlet almost never changed (46 of 21,233).

## 2. When did it take effect

Share of executed beat-plan stops (promotors excluded) that fall on a day the outlet has in each template:

| Day | Old template | New template |
|---|---:|---:|
| 12–17 Oct, 19–20 Oct | 99.0–100% | 73–80% |
| **21 Oct (Wed)** | 74.4% | **99.8%** |
| **22 Oct (Thu)** | 73.7% | **100.0%** |

MOBI beat plans followed the old template until Tue 20 Oct and the new one from Wed 21 Oct. The switch was made mid-week.

## 3. What changed (common outlets, 21,233 keys)

| Item | Result |
|---|---|
| Visit days changed | **5,628 (26.5%)**; South Jakarta Depok 1,385, Kab Bekasi 854, Central North 848, Kota Bekasi 662, East 651, Karawang 627, West 601. Highest MCs: Pasar Minggu 352, Cengkareng 351, Kelapa Gading 273, Kebayoran 270, Pondok Gede 259 |
| Kind of change | Between the three standard pairs (Mon+Thu, Tue+Fri, Wed+Sat): Wed+Sat→Tue+Fri 796, Mon+Thu→Tue+Fri 762, Tue+Fri→Mon+Thu 761, Tue+Fri→Wed+Sat 750, Mon+Thu→Wed+Sat 370, Wed+Sat→Mon+Thu 364. The rest are extra days added (Wed+Sat→Wed+Fri+Sat 169, Mon+Thu→Mon+Thu+Sat 161) |
| Visits per week | 641 outlets 2→3 days, 348 3→2, 155 2→4, 123 1→2, 119 2→1 |
| Frequency label | 1,344 changed (F8→F12 699, F12→F8 348, F4→F8 123, F8→F4 119); mixed labels (`F4 / F12` …) appear on 11 rows; 93 rows where F ≠ 4 × days |
| DSE code | 46 changed; 10 outlets got a DSE that had none; none lost one |
| MC / branch | 58 / 11 changed |
| Planned stops per weekday (Mon…Sat) | old 8,040 · 7,325 · 7,669 · 7,540 · 7,417 · 7,926; new **8,393** · 7,357 · 7,808 · **7,823** · 7,399 · **8,260**: Monday, Thursday and Saturday carry more (+353, +283, +334) |

## 4. Added and removed outlets

* **Added 1,506** (IM3 +244 net keys, 3ID −77 net overall): Kota Bekasi 433 (MC-Pondok Gede 316), South Jakarta Depok 362, Karawang 334 (Batujaya 87, East Cikampek 81), East 135 (Cipayung 134). All have a DSE.
* **Removed 1,339**, mostly Kab Bekasi 712 and West Jakarta 216. **706 of them had no DSE** (vacancy clean-up: MC-Cibarusah 124, Tambun 109, Pebayuran 101, Grogol 99, Cibitung 59); the other 633 had a DSE (MC-Babelan 157, Cempaka Putih 61, Karawang 47, Beji 44, Cikarang Timur 39): to check with the owner whether they left the PJP on purpose or fell out of the export.
* Rows without any DSE fall from 868 (1 Oct file) to 184.

## 5. Effect of the mid-week switch (week 19–24 Oct, derived)

Assuming Mon–Tue ran on the old plan and Wed–Sat on the new one, planned visits this week against the new weekly frequency:

* 15,605 outlets with unchanged days: exactly as expected (0 difference).
* 5,628 changed outlets: 2,759 as expected, **1,534 one visit short** and 1,317 one visit extra (plus 18 two short).
* By direction: Wed+Sat→Tue+Fri (796) and Wed+Sat→Mon+Thu (364) get **1 visit this week instead of 2** (Tue/Mon had passed on the old plan and Wed was not due); Tue+Fri→Wed+Sat (750) and Mon+Thu→Wed+Sat (370) get **3 visits** (Tue visited on the old plan, then Wed and Sat). Mon+Thu→Tue+Fri and Tue+Fri→Mon+Thu stay at 2.
So the week of 19 Oct is under-covered by about 1,500 stops and over-covered by about 1,300; it levels out from the week of 26 Oct. PJP execution and coverage of that week should be read with this in mind.

## 6. Workload

Outlets per DSE login per day: median 14 (unchanged), p90 19 → 20, maximum **46** (was 35). Two logins exceed 35: **DSEIN124 (IM3) 43 and DSEIN124 3ID 46, both MC-Kebayoran**; none exceeded 35 before. The 1 Oct assessment capped a DSE at 40 per day; this one is above it.

## 7. Open points for the data owner

1. Confirm the new template is the official PJP from 21 Oct (the evidence in section 2 says so) and whether the old Wed+Sat / Tue+Fri swaps were intentional (26.5% of outlets re-sequenced, with a one-week cover gap).
2. The 633 removed outlets that had a DSE (Babelan 157, Cempaka Putih 61 …): out of the PJP on purpose?
3. DSEIN124 at MC-Kebayoran: 43 / 46 outlets on one day (was 35).
4. Mixed frequency labels (`F4 / F12`) and 93 rows with F ≠ 4 × days: which value is valid?
5. `pjp_mapping_feed` (Konfigurasi › PJP Mapping) was already rebuilt from this file on 23 Oct; the owner decision of 15 Oct (nearest-location DSE for 2,211 outlets) is applied on top of it, so DSE per outlet in that screen can differ from the file's DSE.
