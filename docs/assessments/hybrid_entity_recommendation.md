# Assessment · Catalogue IM3–3ID pairing, latest vs previous, and recommendation for IM3 only / 3ID only / Hybrid as one entity (23 Oct 2026)

Read-only (CLAUDE.md §2); nothing rebuilt. "Previous" = the system master before the catalogue was applied (`territory_management_master_base.json.gz`, 14,694 outlets, pairing from `adhoc_outlet_im3_3id_data_gcp` / master). "Catalogue" = `raw/Catalogue/CATALAGUE_INNER_JAKARTA_202610.xlsb` (uploaded 22 Oct; sheet OUTLET IOH read row by row in `outlet_catalogue_ioh.csv`, 16,614 rows; FINAL_20261020 has 22,426 outlet-brand rows). "Now" = master after the owner's rules were applied (16,130 outlets). Details of the apply rules: `catalogue_202610_detail.md`.

## 1. How much is new

**Outlets by brand type** (an outlet is Hybrid when it carries both an IM3 and a 3ID id):

| | Hybrid | IM3 only | 3ID only | No id | Total |
|---|---:|---:|---:|---:|---:|
| Previous master | 7,788 | 4,198 | 2,705 | 3 | 14,694 |
| Catalogue (rows of OUTLET IOH, by ids) | 7,231 | 5,306 | 4,077 | 0 | 16,614 |
| Catalogue (its own Status Pairing label) | 7,886 DUAL | 8,728 SINGLE | | | 16,614 |
| **Now (master)** | **7,868** | **4,791** | **3,468** | 3 | **16,130** |

**Pairs (IM3 id ↔ 3ID id):** previous 7,787 · catalogue 7,230 · now 7,867.
* Catalogue vs previous: **6,533 the same, 1,254 only in the previous system, 697 new in the catalogue**.
* Applied now vs previous: **7,530 kept, 257 released, 337 new** (rule 21 Oct: system pairing kept; only new pairs supported by FINAL applied: 275; 421 held in `pairing_hold.csv`).

**Ids:** IM3 11,985 → 12,536 in the catalogue (+741 new, −190 gone); 3ID 10,445 → 10,973 (+1,079 new, −551 gone). Now in the master: 12,658 IM3 and 11,295 3ID ids; 76 IM3 and 280 3ID catalogue ids are not in the master yet.

**Movement per id, previous → now:** unchanged 21,985 id-slots (Hybrid 15,295 id-slots, IM3 only 4,072, 3ID only 2,618); **Hybrid → IM3 only 132, Hybrid → 3ID only 113 (pair split); IM3 only → Hybrid 126, 3ID only → Hybrid 74 (pair added)**; 1,523 ids are new (3ID only 723, IM3 only 587, Hybrid 213).

**Quality of the catalogue pairing:**
* Status Pairing contradicts the ids on **1,159 rows**: 907 labelled DUAL BRAND with one id, 252 labelled SINGLE BRAND with two. In the master the same label is wrong on 224 + 206 + 66 rows and blank on 665.
* **3ID id used by several IM3 ids: previous 25, catalogue 201, now 17** (95 outlet rows flagged `PAIR_3ID_GANDA`); an IM3 id never has two 3ID.
* The two brand types of a pair differ (RETAIL vs KRO …) on 1,553 of 7,231 catalogue pairs and 1,316 of 7,868 master Hybrids.
* 2,813 catalogue rows have no Outlet ID IOH, so it cannot be the only key.

## 2. Recommended flagging (one rule, computed from the ids)

1. **Unit = the physical outlet (entity).** Keep the master `outlet_key` as the internal key (stable, already in every feed); add `entity_id` = Outlet ID IOH when it exists, else `outlet_key`, as an attribute.
2. **`brand_flag` is derived, never copied from a label:** Hybrid = entity has an IM3 id and a 3ID id; IM3 only; 3ID only. Keep the catalogue label as `pairing_status_catalogue` and add `flag_status_conflict` (label ≠ derived, the 1,159 rows) for audit.
3. **Optional second layer, activity:** `hybrid_active_both` (transactions this month in both brands) vs `hybrid_one_brand_active`. It tells where a Hybrid is really one-sided without changing the structural flag.
4. **Pairing rules stay as decided:** one 3ID has one primary IM3 (the other IM3 becomes a single); system pairing kept; only FINAL-supported new pairs applied; unresolved pairs held for the data owner. Needs from the owner: the 22 undecided 3ID ids and the 421 held pairs.
5. **DSE of a Hybrid entity:** plan and credit by the IM3 login's DSE when both logins differ (143 outlets today, `DSE_IM3_3ID_BEDA`) and show the 3ID login beside it.
6. **One resolver for every builder:** `entity_of(brand, id)` built from master + catalogue pairs, used by the MOBII, MOBO, GA, visits and ENDBAL builders, so an id that the catalogue pairs but the system had as a separate ad-hoc row lands on the same entity.

## 3. Hybrid as one entity in the three places

| Place | Today | What the data says | Recommendation |
|---|---|---|---|
| **PJP visit** | stop = (brand, date, beat plan, outlet): a Hybrid is two stops per day | master outlets in the plan 14,750; **124,380 planned stops vs 88,440 outlet-days; 35,940 outlet-days (29% of the stops) are planned under both brands**; executed 94,546 stops vs 66,305 outlet-days, 28,241 visited by both brands on the same day. Hit rate 76.0% by stop, **75.0% by entity** (visits feed, 1–22 Oct, promotors excluded, ad-hoc included) | Count at **entity-day**: planned if any brand plans, executed if any brand checks in, productive if any brand is productive; keep brand touchpoint columns (IM3 ✓ / 3ID ✓) and a "dual touch" figure. Add the entity counts beside the stop counts first (as done for ad-hoc), switch KPIs after the owner agrees |
| **Penjualan Outlet** | master tier = one row per physical outlet with IM3 / 3ID split (`bs`); non-master tier = one row per brand id | tier M 15,689 rows; non-master 2,191 rows (3ID 1,731, IM3 442) of which only 60 have their catalogue partner also as a non-master row, 58 have the partner in the master; demand non-master 3,337, 36 mergeable | Already one entity for the master base. Use the shared resolver so the ~120 paired non-master ids merge into their entity; the rest stay single-brand entities. Always show the brand split under the figure (existing rule) |
| **Data Outlet** (Territory Management) | one row per master outlet with both ids | 16,130 rows; catalogue tab keeps the 16,614 pairing rows | Add columns `entity_id`, `brand_flag`, `flag_status_conflict`, filter by brand flag; cards read "N outlets (M Hybrid)" so a Hybrid is counted once |

## 4. Order of work (not started, needs approval)

1. Add `entity_id`, `brand_flag`, `pairing_status_catalogue`, `flag_status_conflict` to the master builder (`apply_final_dse_mapping.py`) and the territory feed.
2. Shared resolver module in `scripts/`, then the builders.
3. Visits feed: entity-day counts next to the stop counts; heatmap and scorecard get an entity view; KPI basis after the owner decides.
4. App: brand badges from `brand_flag` (IM3 yellow, 3ID magenta, IOH tosca), Hybrid counted once on cards and totals.
5. Audit script: IM3 only + 3ID only + Hybrid = entities; no id in two entities; `render_check.js`.

## 5. Decisions needed from the owner

1. Hybrid = structural (both ids) with activity as a second layer, as above? 
2. PJP KPI basis: entity-day (recommended) or stop?
3. The 22 undecided 3ID ids with several IM3 and the 421 held pairs (`pairing_hold.csv`).
4. DSE of a Hybrid when the two logins differ: IM3 login's DSE (recommended)?
5. Whether the 1,159 contradicting Status Pairing rows should be returned to the data owner for correction.

## 6. Built (23 Oct 2026, owner approved: entity-day basis, IM3 login's DSE for Hybrid)

* `apply_final_dse_mapping.py` adds `brand_flag`, `entity_id`, `flag_status_conflict` to the master and territory feed: Hybrid 7,868 · IM3 only 4,791 · 3ID only 3,468 · no id 3; 496 label conflicts; 33 3ID ids on several outlet rows are all flagged `PAIR_3ID_GANDA` (2 more than before, found through outlets added from FINAL).
* `scripts/entity_map.py`: shared resolver (16,153 entities incl. 32 catalogue-only pairs; the Hybrid entity wins when a 3ID id sits on two master rows).
* Visits feed: entity-day fields beside the stop counts. 1–22 Oct: **89,469 entity-days planned vs 127,665 stops; 66,708 executed vs 95,314; hit 74.6% (stops 74.7%)**; P 57,783 of 80,544 (71.7%), ad-hoc only 8,925; 35,940 entity-days planned under both brands, 28,241 visited by both. Regional = areas = MCs = DSEs = days. Hybrid credited to the IM3 login's DSE.
* App: Data Outlet brand panel and filter (`#/territory?terrBrand=HYBRID`), brand badge per outlet, CSV columns Jenis Brand / Entity ID / Konflik Status Pairing; entity line in both PJP scorecards.
* Audit: `python3 scripts/audit_entity.py`; `render_check.js` renders the new filter and the entity line.
* Step 2 (23 Oct, later): `entity_map.merge_key` in the penjualan, demand, GA and ENDBAL builders. Non-master ids that the catalogue pairs now share one row: penjualan 2,191 → 2,161 non-master rows (62 rows into 32 pairs), demand 3,337 → 3,319 (28 pairs), GA 47 rows on merged pairs; ENDBAL reads both ids. The 58 ids whose catalogue partner is a master outlet stay separate (pairing held for the owner). Checked by `audit_entity.py`.
* Step 3: heatmap **Dasar hitung** switch (stop / entity-day) in both PJP heatmaps; entity cells 11..13 in the daily series; outlet rows merged per physical outlet; `render_check.js` checks that the entity cells add up to the regional 89,469.
* Also fixed: `audit_scorecard.js` now expects the P / A / T cards of Overall Performance (the Adhoc and Total cards have their own keys `pjp_mtd_a`, `pjp_mtd_t`).
* Open, not built: activity layer (Hybrid active in one or both brands), duplicate master rows (8 `outlet_key` values appear twice, mostly 3ID-only), and the owner decisions on the 22 3ID ids and 421 held pairs.
