# GA daily performance · RGU GA files of 11 Nov 2026 (data to 10 Nov)

Owner request 11 Nov 2026: scan `raw/GA*`, check the latest RGU GA files and assess the updated daily performance. Feeds rebuilt with `daily_update.py` (GA cut 10, was 9);
`audit_ga.js` 3,467 checks pass, `render_check.js` clean.

## 1. Files (raw/GA (for upload by VIctor) /)

| File | Updated | Rows | Days | Use |
|---|---|---|---|---|
| `rguga_daily_outlet_inner_202611.csv` | 11 Nov | 77,209 (all VALID_ID) | D1-D10 | GA outlet tagging (feed `ga_feed.js`) |
| `rguga_daily_favloc_inner_202611.csv` | 11 Nov | 88,772 rows (80,890 VALID_ID) | D1-D10 | site basis, Fav Locs (feed `ga_site_feed.js`) |
| `rguga_favloc_&_rguga_outlet_Inner_Jakarta_202611.xlsb` | 11 Nov | pivots | D1-D10 | workbook of the two files |
| `rguga_daily_outlet_202611.csv` | 6 Nov | 25,446 | D1-D5 | stale; the builder reads the `_inner_` file when it has more rows |

Completeness: every day of both files reaches 23:09-23:58 in `latest_tag_ts`; D10 ends at 23:09 (others 23:33-23:58) but its total (10,318) is not low, and the Fav Locs
valid rows of D10 (10,530) are 98% of the outlet file, in line with D9 (96%). No partial day is held back (`partial_dropped` none).

## 2. Daily GA (outlet tagging, IOH)

| Day | GA | IM3 | 3ID | Bulk ids (>= 150 GA/day) | GA without bulk |
|---|---|---|---|---|---|
| D1 | 5,411 | 3,285 | 2,126 | 1 id · 408 | 5,003 |
| D2 | 5,346 | 3,517 | 1,829 | 0 | 5,346 |
| D3 | 4,571 | 2,998 | 1,573 | 0 | 4,571 |
| D4 | 4,874 | 3,075 | 1,799 | 2 · 442 | 4,432 |
| D5 | 5,240 | 3,096 | 2,144 | 2 · 755 | 4,485 |
| D6 | 10,799 | 7,888 | 2,911 | 6 · 5,943 | 4,856 |
| D7 | 12,810 | 9,148 | 3,662 | 10 · 8,086 | 4,724 |
| D8 | 8,213 | 6,201 | 2,012 | 1 · 924 | 7,289 |
| D9 | 9,627 | 7,038 | 2,589 | 4 · 2,861 | 6,766 |
| D10 | 10,318 | 4,935 | 5,383 | 7 · 5,083 | 5,235 |

- **MTD 1-10 Nov: 77,209 GA** vs **LMTD 1-10 Oct 62,071** = **+24.4%** (October full month 287,269 on the same CSV basis).
- Of the MTD, **24,502 GA (32%) sit in ids with >= 150 GA in one day** (bulk); without them MTD is 52,707, about 5,270 per day, level with D1-D5 (5,088 per day).
- From D6 the total roughly doubles, but the underlying run-rate stays near 5,000-7,000: the lift is mostly bulk at a few ids.

## 3. Where the bulk is

Top outlets of the month (GA 1-10 Nov): `17768382` (PJP, Bekasi) 4,793; IM3 `17452102` (non-PJP, Karawang) 3,005; IM3 `SH155202` 2,877; 3ID `153825` 2,296;
`17138808` 2,177; 3ID `SH241506` 1,977 (all on D10); 3ID `SH255203` 1,441. Top 10 outlets = 28.5% of MTD.

**OUTSIDE MASTER TERRITORY: 21 outlets, 10,283 GA (13% of MTD)**, all non-PJP ids from the file's own location (no master record): `SH155202` 2,877, `SH241506` 1,977,
`SH255203` 1,441, `SH167559` 1,306, `SH267560` 984, `SH260793` 499, `SH241529` 476, `SH160773` 500. All of them are `SH...` ids (SaleSHub / QR style) and each burst lasts
one to three days (for example SH241506 = 1,977 GA on D10 alone). They are not in the DSF manpower list (`dsf_outlet_flag.md`) except SH050762.
Brand shift on D10: IM3 4,935 (7,000+ on D6-D9) and 3ID 5,383 (2,000-3,700 before): the 3ID bulk at SH241506 / SH255203.

## 4. Area (outlet tagging, MTD 1-10 Nov vs LMTD 1-10 Oct)

| Area | MTD | LMTD | Growth |
|---|---|---|---|
| SOUTH JAKARTA DEPOK | 13,778 | 10,842 | +27.1% |
| CENTRAL NORTH JAKARTA | 11,567 | 12,079 | -4.2% |
| KARAWANG | 11,273 | 9,438 | +19.4% |
| OUTSIDE MASTER TERRITORY | 10,283 | 0 | new |
| KOTA BEKASI | 9,688 | 7,246 | +33.7% |
| KAB BEKASI | 9,507 | 8,633 | +10.1% |
| EAST JAKARTA | 6,591 | 6,733 | -2.1% |
| WEST JAKARTA | 4,522 | 7,100 | -36.3% |

West Jakarta is down 36% and Central North and East are flat; Karawang, Kota Bekasi and South Jakarta Depok are up partly because of bulk ids tagged to them
(`17452102` 3,005 in Karawang, `17768382` 4,793 in Kota Bekasi, `153825` / `17138808` in South Jakarta Depok).

## 5. Reading and open points

1. The headline growth (+24.4%) is bulk-driven; without ids >= 150 GA per day MTD is about 52.7k (5.3k per day, flat against D1-D5). Report both.
2. October LMTD also contains bulk (see the Oct anomaly list in `ga_feed` metadata), so the like-for-like growth without bulk needs the same rule on October (not done here).
3. 21 outside-master ids carry 13% of MTD: ask the data owner what the `SH...` ids are (distributor / SaleSHub / event accounts?) and which MC they belong to.
4. `17768382` (PJP, Bekasi) 4,793 GA in 10 days and `17452102` 3,005: validate before DSE incentives are read from them.
5. Targets are still the October targets carried forward (`M2S KECAMATAN`).
