# Assessment · SMARTBEAT Weekly / Daily PJP files and the Fix vs Ad-hoc question (23 Oct 2026)

Read-only deep dive (CLAUDE.md §2); no code or feed changed. Files: `raw/OneDrive_1_10-22-2026/SMARTBEAT_WEEKLY_PJP.xlsx` (identical copy in `raw/PJP Weekly/`), `SMARTBEAT_DAILY_PJP_20261022.xlsx`, and the MOBI Journey Plan reports of 12–22 Oct (`raw/MOBI VISIT DSE*/`). Compared with the earlier `Weekly_PJP_2026-10-01_ALL_MC.xlsx` (`pjp_weekly_mapping.md`).

## 1. Fields: is there a "PJP Fix / Permanent" or "PJP Ad-hoc" flag?

**No, in neither file.**

| File | Sheet / rows | Columns |
|---|---|---|
| Weekly PJP | `Weekly PJP`, 15,085 rows | Circle, Region, Branch, MC, DSE IM3, DSE 3ID, ID IM3, ID 3ID, Nama Outlet, Frekuensi, Sen, Sel, Rab, Kam, Jum, Sab. Same 16 columns as the 1 Oct file; no type / status / dynamic column |
| Daily PJP 22 Oct | `Daily PJP`, 7,646 rows | no_routes, circle, region, area, mc, brand, dt_id, dse_id, outlet_id, outlet_name, **dynamic** |

* The whole Weekly file **is** the fixed (permanent) template: the same days repeat every week. Being in it is the only "Fix" signal.
* The Daily file has a column `dynamic`, which looks like the ad-hoc flag, but on 22 Oct **all 7,646 rows are `No`**. Every row is a Thursday template outlet (7,646 of 7,827 template (brand, id) pairs; each Thursday row has at least one brand in the file). So the daily route plan is 100% fixed PJP; no dynamic / ad-hoc route is in it yet. Whether `Yes` appears on other days is unknown (one day only).
* The MOBI Journey Plan visit report has no fix / ad-hoc column either (46 columns). The only trace is `BEATPLANID` / `BEATPLANNAME` (section 3).

## 2. Weekly file profile (15,085 rows, vs 14,755 on 1 Oct)

* All JAKARTA RAYA / INNER JAKARTA; branches: South Jakarta Depok 2,872, Karawang 2,658, Kab Bekasi 2,345, Kota Bekasi 2,137, East 1,896, Central North 1,775, West 1,402.
* IDs: 12,318 rows with an IM3 id, 10,451 with a 3ID id, 7,684 with both; 858 blank IM3, 2,275 blank 3ID; no row without any id. Duplicate ids: 7 IM3, 23 3ID; 30 (brand, id) keys on more than one row. 3ID ids are zero-padded.
* DSE: 214 blank DSE IM3, 190 blank DSE 3ID, 184 rows with no DSE at all (the earlier file had 868 outlets without DSE). DSE codes come in several shapes (DSEIN###, 10-digit, CSO-…, 1-…, …ID); 274 distinct IM3 and 282 distinct 3ID codes.
* Days: F8 13,772 · F12 1,016 · F4 286 and **new** mixed values (`F4 / F12`, `F12 / F4`, `F8 / F4`, `F12 / F8`: 11 rows). 93 rows where F ≠ 4 × days. Patterns: Tue+Fri 4,631, Mon+Thu 4,587, Wed+Sat 4,501, then small variants (3 days 983 rows, 4 days 83, 5 days 12, 6 days 2). Thursday has 5,205 outlet rows.
* Against the 1 Oct file: 1,506 (brand, id) keys added, 1,339 removed, 21,233 common; of the common, **5,628 changed day pattern**, 1,344 changed frequency, 54 changed DSE, 58 changed MC. So this is a re-planned template, not a re-export.

## 3. What the transactions say: Fix vs Ad-hoc (12–22 Oct, MOBI Journey Plan)

Observation: a block of stops has **empty `BEATPLANID` and `BEATPLANNAME`**. They have only 2–5 activity rows (Check In, Check Out, Balance Transfer, Sell In) against 15–23 rows for a planned stop, and **every one is executed** (a check-in exists). This is a visit made outside any beat plan, i.e. the ad-hoc visit as it shows in transactions.

| 12–22 Oct (all days with data) | Planned (has beat plan) | Ad-hoc (blank beat plan) |
|---|---:|---:|
| Stops | 76,135 | 9,381 |
| Executed | 61,457 (80.7%) | 9,381 (100%) |
| Productive (SP / VC qty > 0 or saldo > Rp 50K) | 28,792 (46.9% of executed) | 7,559 (**80.6%** of executed) |
| Share of all executed stops | 86.8% | 13.2% (daily 10.9–15.6%; 22 Oct: 887) |

Relation to the weekly template (applied to the schedule date's weekday; the 22 Oct template is used for all days, so earlier days are indicative):

| | Not in template | Template, other day | Template, that day |
|---|---:|---:|---:|
| Ad-hoc visits (9,381) | 29 | **7,933 (84.6%)** | 1,419 |
| Planned executed (61,457; 296 promotor not classed) | 677 | 9,996 | 50,488 |
| Planned not executed (14,678) | 556 | 3,900 | 9,599 (+623 promotor) |

Reading: ad-hoc is mostly a **catch-up visit to an outlet of the template on a day it was not due** (85%); only 0.3% are outlets outside the template. 22 Oct in detail: daily plan 7,646 stops → 7,761 stops in the visit report match it (7,223 executed, 538 not; 26 daily outlets never appear in the report); 889 executed stops are outside the daily plan, 861 of them with blank beat plan (the rest are promotor and self-named plans such as "PJP … Oct").

## 4. Consequence for the current feed (decision needed, nothing changed)

`generate_dse_visits_feed.py` takes the stop key `(brand, date, BEATPLANID, ORG. ID)` and counts every stop as **planned**, including the blank-`BEATPLANID` stops. So 9,381 ad-hoc visits sit in "planned" with a 100% hit rate: planned and executed are both overstated by the ad-hoc part (about 11–12% of planned stops), the target hit rate is inflated, and the productive rate looks better than the planned PJP alone (51.3% blended vs 46.9% for planned stops). A real planned-vs-executed view needs the ad-hoc visits split out (flag `ADHOC_TRANSAKSI`), like promotors and the 860 outlets without DSE already are (CLAUDE.md, PJP visit measures).

## 5. Other findings

* The visit export identity changed: in the 22 Oct report **`ORG. ID` is an internal id for both brands** (e.g. 799005) and the real outlet id is in `SALDOMOBO ORG ID` (IM3 ids like 17654814, 3ID like 00049995). The pre-existing note "IM3 logs put the IM3 outlet id in ORG. ID" no longer holds for this report; the builder tries both columns, but check that IM3 matching still reaches the same share after the format change.
* `SMARTBEAT_DAILY_PJP` has 552 distinct `dse_id` values (login codes of three shapes) and `no_routes` 1–27 per DSE.
* Weekly file is a template: it says nothing about which visits happened. Fix / ad-hoc can only be derived from transactions (section 3), not read from a field.

## 6. Open questions for the data owner

1. Does `dynamic = Yes` ever occur in the Daily file (other days), and what does it mean (route added by the DSE on the day, or auto-added outlet)?
2. Is an empty `BEATPLANID` the system's definition of an ad-hoc visit? (Our evidence: all executed, short activity set, 85% on a non-template day.)
3. Should ad-hoc visits be excluded from planned / hit rate and shown separately (recommended), or kept in the PJP measures?
4. The mixed frequency values (`F4 / F12` …) and 93 rows with F ≠ 4 × days: which one is valid?

## 7. Built (23 Oct 2026): P / A / T in the PJP heatmaps

Owner decision: separate the ad-hoc visits in the PJP heatmap. `generate_dse_visits_feed.py` now flags a stop as ad-hoc when `BEATPLANID` is empty and adds the ad-hoc counts next to the existing planned / executed (which keep the T meaning, so no other feed changes): daily series cells 7–10, `adhoc_*` fields in every stat block and the daily timeline, `regional_summary.adhoc_visits_no_beatplan` (11,411 of 127,665 stops, 1–22 Oct), outlet string `a`. Both heatmaps show P (executed ÷ planned on the beat plan), A (ad-hoc count) and T (total ÷ (plan + ad-hoc)) as overall columns and as a cell view toggle. Not changed: scorecards, DSE KPI (effective call), KRO tracking and outlet coverage still use T (an ad-hoc check-in is a real visit for coverage); to be decided with the owner whether effective call should use P.

Update (23 Oct 2026, owner): Effective Call counts the ad-hoc visits (P + A); the scorecards separate % PJP visit against plan (P) from the ad-hoc total (A) and show T = P + A. MTD 1–22 Oct: P 83,903 / 116,254 = 72.2%; A 11,411; T 95,314 / 127,665 = 74.7%. EC formula unchanged (it was already on the T basis).
