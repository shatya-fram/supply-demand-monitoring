# Data Assessment and Contract: PJP (Permanent Journey Plan) Execution Report

**Scope**: Phase 1 Sell-In pipeline · Stage 2 (DSE visits and beat plans). This document is the data contract for `scripts/generate_dse_visits_feed.py` and the **DSE Visits & Beat Plans** view. It supersedes the grain, branch and DSE definitions in `data_assessment_dse_visit_history.md`; that document's hourly, duration and GPS profiles remain valid.
**Written**: 13 Oct 2026, after auditing the view against the raw files.
**Sources**:
- `raw/MOBI VISIT DSE/3id_visit_dse_202610__01_11.zip` → `Journey_Plan_Summary_Detail_Report_271556241_0.csv` (276,172 rows)
- `raw/MOBI VISIT DSE/im3_visit_dse_202610__01_11.zip` → `Journey_Plan_Summary_Detail_Report_271557544_0.csv` (541,263 rows)
- Master: `website/data/territory_feed.js` (14,685 outlets, 36 MCs, 7 branches, 4,249 DSO-mapped sites) and `data/catalogues/dse_master_hierarchy.csv` (272 DSEs, 540 login codes)
- Optional: `data/processed/sellin_feed.json` for the visit-to-supply link

---

## 1. What was wrong with the report before this fix

| # | Finding | Effect in the app | Fix |
|---|---|---|---|
| 1 | Raw `BRANCH` uses names the master does not have: **KOTA BEKASI** (4,894 planned stops), **SOUTH JAKARTA** (963), **NORTH KARAWANG** (1,208), **SOUTH KARAWANG** (654). The old generator keyed branch statistics on the raw name and then listed only master branches. | Area view summed to 37,333 planned / 21,669 executed while the regional cards said 45,199 / 26,120. About 17% of planned stops and 4,450 executed visits were silently dropped. BEKASI showed 575 planned instead of 5,469. | Branch and MC now come from the **master catalogue through the raw MICRO CLUSTER**. A raw branch alias is used only when the MC is unknown. Stops in MCs outside the 36-MC master go to an explicit **OUTSIDE MASTER TERRITORY** row (322 planned, 101 executed) so every level sums to the regional total. |
| 2 | The DSE view was built from the **outlet's assigned DSE in the master**, not from the operator who ran the beat plan. It credited a check-in to whoever the master says owns the outlet, and listed 272 master names including the placeholder `0` with 860 outlets. | A DSE's "planned" and "executed" had nothing to do with their own PJP. 723 real MOBI logins (444 people) were invisible; promotors and unmapped logins were missing. | DSE view is now **per field operator** (`OPERATOR ID`), folded to one person when the IM3 and 3ID logins belong to the same master DSE. Assigned-outlet coverage is kept as separate columns from the master mapping. |
| 3 | Planned stop key was `(brand, date, outlet)` and ignored `BEATPLANID`. | Two DSEs planning the same outlet on the same day counted as one stop: 45,199 instead of 46,050. Per-DSE plan counts were impossible. | Grain is **(brand, schedule date, BEATPLANID, ORG. ID)**. |
| 4 | **Brand Touchpoint** buttons (IM3 / 3ID / Hybrid) changed state but nothing read it. | Dead filter. | All tables, the daily timeline and the KPI cards follow the brand filter using per-brand planned and executed counts. |
| 5 | The **Head of Area** filter was applied to the KPI cards but not to the Area, MC and DSE tables. | Picking a HoA changed the cards and left the tables unfiltered. | HoA applied everywhere; "Reset filter" also clears HoA and brand. |
| 6 | Narrative text was hard-coded: "563 visits/day, 29.3%", "+506.1%", and the Sell-In correlation "3,007 / 2,945 / 4,484 / 9,668". | Numbers disagreed with the cards next to them and could never update. | Week ramp is computed from the feed. The Sell-In link is computed from `sellin_feed.json` when present, otherwise the card says the feed is not built. |
| 7 | Label glitches: "Unvisited Outlets (MTD (Day 11))", "No check-in in mtd (day 11)". | Cosmetic. | Relabelled. |

## 2. Raw file structure

- Pipe-delimited, 8 preamble lines, header starts with `SCHEDULE DATE`, 46 columns. Report generated 12 Oct 2026 for period 01–11 Oct 2026, REGIONAL = INNER JAKARTA.
- **One row per activity, not per visit.** A stop carries 15–23 activity rows (`Check In`, `Check Out`, `Sell In`, `Balance Transfer`, `Stock Taking Activity`, five `5Step …` rows, `Promotor Biometric`, …). Rows-per-stop distribution: 19 rows (23,288 stops), 17 (16,294), 21 (3,569), 2–4 (about 2,000, mostly promotor plans).
- `ACTIVITY STATUS` ∈ {Completed, Initiated, Not Performed}. `Check In` and `Check Out` only ever appear as Completed; a stop with no `Check In` row was not executed. `REASON`, `VISITED FROM`, `OPERATOR FULL NAME` are always empty.
- Identity columns: `OPERATOR ID` = `USER NAME` (the MOBI login), `OPERATOR TYPE` ∈ {Canvasser 651 logins, Promotor 67, Canvasser SDP 2, CANVASSER OUTLET 2, blank 1}, `BEATPLANID`, `BEATPLANNAME` (login + date).
- Outlet identity: IM3 logs put the IM3 outlet id in `ORG. ID`; 3ID logs put the Mobo id (the master's 3ID key) in `SALDOMOBO ORG ID`. Both are tried, with and without leading zeros.
- `DEVIATION DISTANCE(IN KM)` and `VISIT DURATION` (`h:mm:ss`) are populated on the `Check In` row.

## 3. Definitions used by the feed and the view

| Term | Definition |
|---|---|
| **PJP stop** (planned) | Distinct `(brand, SCHEDULE DATE, BEATPLANID, ORG. ID)`. |
| **Executed stop** | Stop with at least one `Check In` / `Completed` row. 116 stops have 2 and 55 have 3 check-in rows; counted once. |
| **Target hit rate** | Executed ÷ planned. |
| **Productive stop** | Executed stop whose `Sell In` row carries `TOTAL SALES SP QTY` or `TOTAL SALES VC  QTY` above zero, or whose `Balance Transfer` row carries `TOTAL SALES OTHER PRODUCT` (saldo) above **Rp 50,000** (`SALDO_MIN_RP`). Split into physical and saldo. Decided 13 Oct 2026 after checking the rows: the app marks `Sell In` / `Balance Transfer` as Completed on 97.3% of check-ins whether or not anything was sold, so that status is reported separately as **flow completed**, not as productivity. |
| **Branch / MC** | Master branch and MC of the raw `MICRO CLUSTER`. If the MC is not in the master: branch alias (`KOTA BEKASI→BEKASI`, `SOUTH JAKARTA→SOUTH JAKARTA DEPOK`, `NORTH/SOUTH KARAWANG→KARAWANG`), else `OUTSIDE MASTER TERRITORY`. |
| **Field operator (DSE view row)** | A person. Logins are matched to `dse_master_hierarchy` (`dse_id_im3`, `dse_id_3id`, with or without the `3ID` suffix); unmatched IM3/3ID pairs are folded through outlets that carry both `dse_code_im3` and `dse_code_3id`; anything else is one row per login, flagged "not in master". |
| **Assigned outlets** | Master outlets whose `dse_code_im3` / `dse_code_3id` equals one of the person's logins. |
| **Outlet visited / inactive** | Master outlets only, by executed stops matched on outlet id. Windows: MTD 01–11 Oct, last 7 days 05–11 Oct, last 3 days 09–11 Oct. |
| **DSO-mapped site** | `site_nbs × micro_cluster` (4,249). A site is active in a window if any of its outlets was visited. |
| **Week 1 / Week 2** | 01–04 Oct (4 days) and 05–11 Oct (7 days). 11 Oct is a Sunday with 31 planned stops and no check-ins. |

## 4. Reconciled figures, 01–11 Oct 2026

| Measure | Value |
|---|---|
| Planned stops | **46,050** (IM3 30,321 · 3ID 15,729) |
| Executed stops | **26,189** (56.9%) (IM3 16,868 · 3ID 9,321) |
| Productive stops (qty / saldo > Rp 50K rule) | **6,409** (24.5% of executed): 3,271 physical SP/VC, 3,321 saldo above Rp 50,000, 183 both |
| Flow completed (status-only, former rule) | 25,490 (97.3%) |
| Quantities on executed stops | 3,272 SP · 118,721 VC · Rp 1.47 B saldo (`TOTAL SALES VALUE` Rp 1.63 B) |
| Planned outside the 36 master MCs | 322 planned / 101 executed in 48 raw branch–MC pairs (Sukabumi, Tangerang, Bogor, Bandung, Cirebon …) |
| Field operators with a plan | 444 people from 723 logins (275 folded IM3+3ID pairs); 270 matched to the DSE master; 67 promotors |
| Operators with zero executed stops | 131 (mostly promotor logins and unmapped canvasser logins) |
| Master outlets visited MTD | 10,459 of 14,685 (71.2%); never visited 4,226; no visit 7d 4,441; no visit 3d 8,035 |
| DSO-mapped sites with 0 visited outlets MTD | 720 of 4,249 |
| Avg / median visit duration | 17m 14s / 8m 05s; median GPS deviation 60 m; 95.1% within 250 m |
| Week ramp | W1 564 executed/day at 28.8% of plan → W2 3,419/day at 62.6% (+506.8% run rate) |

Branch table after the fix (planned / executed / hit):

| Branch | Planned | Executed | Hit |
|---|---:|---:|---:|
| SOUTH JAKARTA DEPOK | 8,975 | 6,202 | 69.1% |
| KAB BEKASI | 7,039 | 2,702 | 38.4% |
| KARAWANG | 8,248 | 3,787 | 45.9% |
| CENTRAL NORTH JAKARTA | 6,340 | 3,634 | 57.3% |
| EAST JAKARTA | 5,066 | 3,140 | 62.0% |
| BEKASI | 5,469 | 3,567 | 65.2% |
| WEST JAKARTA | 4,591 | 3,056 | 66.6% |
| OUTSIDE MASTER TERRITORY | 322 | 101 | 31.4% |

Sell-In link (master outlets, from `sellin_feed.json`, 01–10 Oct): 2,683 of 2,692 outlets that received physical SP/VC had a completed check-in MTD (99.7%, 98.7% on the supply day); 3,857 of 4,202 saldo-transfer outlets had a check-in MTD (91.8%, 78.9% same day).

## 5. Regrouping and the daily heatmap (added 13 Oct 2026)

- **Auto grouping follows the filter.** The PJP Execution tab and the Daily Heatmap tab show rows one level below the selected territory: no filter → per Area (branch); Head of Area or Branch selected → per Micro Cluster; Micro Cluster selected → per DSE; a DSE selected (via "Outlets →" or "Detail") → per Outlet. "Group by" can override Auto with Area, MC, DSE or Outlet.
- **Drill = narrow the filter.** "Drill MCs", "Drill DSEs", "Outlets →" and the heatmap "Detail" button set the Branch / MC / DSE filter and leave grouping on Auto, so the next level appears. "Reset filter" clears territory, DSE, brand, window and grouping.
- **Heatmap cell** = executed check-ins ÷ planned stops on that calendar day for that row (`daily` series in the feed: `[planned, executed, planned_im3, executed_im3, planned_3id, executed_3id]` for each of the 11 days, so the brand filter applies per cell). All 11 calendar days are columns, Sundays included; `·` means nothing was planned. Cells under 30% are shown with the red signal wash. The first row is the column total of everything in scope.
- **Outlet level** uses per-DSE outlet-day strings in the feed (`outlets[].d`, 11 characters: `.` not planned, `p` planned not visited, `x` executed). One row per outlet per DSE beat plan (24,708 rows region-wide); the heatmap shows ✓ / ○ per day and the table shows the 11-day pattern, planned and executed days and the last check-in.
- Feed size grew from 2.7 MB to 5.7 MB because of the outlet-day strings; still loads locally without a build step.

## 6. Inactivity: site detail by slab, and locations (added 13 Oct 2026)

- **Slabs** are days since the outlet's last completed check-in, counted from the 11 Oct 2026 cut: **Active ≤2 d** (last check-in 09–11 Oct), **3–6 d** (05–08 Oct), **7–10 d** (01–04 Oct), **Never MTD** (no check-in 01–11 Oct). The 3-day, 7-day and MTD windows used elsewhere in the view are the unions {3–6, 7–10, Never}, {7–10, Never} and {Never}.
- Built in the browser from the territory feed (all 14,685 master outlets with site, MC, DSE, kecamatan and GPS) joined to `last_visit` in the visits feed (one date per visited outlet, 10,459 entries). Sites are the DSO-mapped `site × MC` keys; site GPS comes from the map feed's `site_key` record, with the outlet centroid as fallback.
- **Site detail · slabs** tab: per site the four slab counts (cells shaded by the share of the site's outlets in that slab), % unvisited in the active window, a slab-mix bar, rank by unvisited count / share / never, and a "List" drill to the site's outlets with last check-in, days since, slab and GPS.
- **Locations** tab: Leaflet map (Esri light grey base, same offline constraints as the Jakarta Inner Map) with one marker per site in scope, coloured by share of unvisited outlets (green 0%, amber <34%, orange 34–66%, red ≥67%) and sized by outlet count. Clicking a marker or "📍" lists the site's outlets and plots them coloured by slab; "Plot unvisited outlets" draws every unvisited outlet in scope. The filter bar, search and temporal window apply.

## 7. Productive stop: why the rule changed (13 Oct 2026)

Row profile of the two transactional activities on the 26,189 executed stops:

| Signal | Stops | Share |
|---|---:|---:|
| `Sell In` or `Balance Transfer` status = Completed | 25,490 | 97.3% |
| `Sell In` with SP or VC quantity > 0 | 3,271 | 12.5% |
| `Balance Transfer` with saldo > 0 | 4,198 | 16.0% |
| `Balance Transfer` with saldo > Rp 50,000 | 3,321 | 12.7% |
| Productive under the new rule (either) | 6,409 | 24.5% |

Completed is a workflow status, reached on almost every check-in; only the quantity and value columns on those rows show that supply actually moved. The Rp 50,000 floor on saldo was set by the owner to exclude token top-ups. The view shows the new rate as "Productive" and the old one as "flow completed".

The MTD / 7-day / 3-day switch was removed from the main toolbar on the same date; the three windows are now permanent KPI cards (outlets and sites), and a local "Inactivity window" switch inside the Inactivity tab drives its ranked lists, slab lists, map colours and CSV export.

## 8. Never-visited block under the PJP tabs (added 13 Oct 2026)

When a Branch, Head of Area, Micro Cluster or DSE is selected, the PJP Execution and Daily Heatmap tabs append two ranked lists for the selected territory, grouped by the next level down (Branch/HoA → MC, MC → assigned DSE, DSE → site):

- **Outlets never visited MTD**: master outlets with no completed check-in on any stop in 01–11 Oct (`unvisited_outlets` with `w = mtd`), with group totals from `group_totals` so each group shows "never ÷ total".
- **Dark sites**: DSO-mapped sites (site × MC) where not one mapped outlet was visited MTD (`unvisited_sites` with `w = mtd`), with the number of mapped outlets per site.
- With a DSE selected, both lists are limited to outlets whose master `dse_code_im3` / `dse_code_3id` matches one of the DSE's MOBI logins, and to sites holding at least one such outlet.
- Each group row expands inline to the outlet or site rows. The counts equal the "Unvisited Outlets · MTD" and "Inactive NBS Sites · MTD" KPI cards for the same filter.

## 9. Map Site (added 14 Oct 2026, owner request)

- Replaces the Inactivity "Locations" sub-view and is exposed as `renderPjpSiteMap(feed)` for the Morning DSE Briefing · PJP Visit menu. Mounts automatically whenever `#inactivity-map` is in the DOM.
- **Sites** are canvas-drawn triangles (`L.TriangleMarker`, a `CircleMarker` subclass; size follows outlet count) coloured by status: red = no outlet under the site was checked in 01–11 Oct (never MTD), orange = visited MTD but nothing 05–11 Oct (no visit 7 days), green = at least one outlet visited in the last 7 days. **Outlets** are circles coloured by the days-since-last-visit slab (Active ≤2 d, 3–6 d, 7–10 d, Never).
- Filter chips: flagged sites (never + 7 days, default), never MTD only, 7 days only, all. Outlet circles can be toggled for all sites in scope; the selected site's outlets are always drawn larger. The filter bar and a selected DSE (that DSE's master outlets only) apply.
- Hover shows a tooltip; click opens a popup with site/outlet identity, MC, DSO/DSE, visit status, counts per slab, the coordinates, and two links: open in Google Maps (`maps/search/?api=1&query=lat,lon`) and directions (`maps/dir/?api=1&destination=lat,lon`). Clicking a site also lists its outlets under the map.
- Tables: ranked site list (never MTD, no visit 7 d, visited ≤6 d, status, clickable lat-long, "Lihat di peta" which centres the map) and the selected site's outlets with last check-in, days since, slab and clickable lat-long.
- Base maps (free, no key): OpenStreetMap (default), CARTO Voyager, CARTO Light, Esri Street, Esri Satellite via the layers control; choice kept in `state.inactMapBase`. Tiles need internet; everything else is local.

## 10. Known limits and open items

- 48 of the 3ID canvasser logins and 74 IM3 canvasser logins inside Inner Jakarta branches are **not in `MASTER DSE Hirarki.xlsx`** (patterns `DSEIN1xx`, 10-digit numeric, `CSO-UTARA-xx`, `CSOBKSS-xx`). They appear in the DSE view by login with "(not in master)". The master should be refreshed from the MOBI user list.
- Promotor logins (`PRJAYAIN…`) carry journey plans with 2–4 activity rows and almost never check in. They are shown with type Promotor; a future toggle can exclude them from the hit rate.
- The 3ID outlet key join relies on `SALDOMOBO ORG ID`; 6,626 visited outlets are not in the master (see the earlier assessment) and only affect master-based coverage, not the planned/executed counts.
- Dates are fixed to the 01–11 Oct 2026 cut in the generator; when a new export arrives the windows need to move with `PERIOD_END`.
