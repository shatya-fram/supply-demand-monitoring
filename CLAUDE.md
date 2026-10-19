# Supply & Demand Monitoring (Inner Jakarta) · Project Guide for Claude

Migrated from Antigravity on 13 Oct 2026. The rules below are the same ones that
lived in `GEMINI.md` and `.agents/rules/phase1_sellin_focus.md`; those files are
kept for reference but this file is the source of truth for Claude.

## 1. Phase 1 scope: the Sell-In pipeline, in this order

Build and model the upstream Sell-In flow before consumer activation (Sell-Out):

1. **Distributor fill-in to DSE**: bulk stock and electronic saldo allocation from
   distributors/partners (MPC, MP3) to DSEs/canvassers.
2. **DSE visits and beat plans**: journey plans, scheduled vs visited outlets,
   durations, GPS compliance, store activities (`raw/MOBI VISIT DSE/`).
3. **Physical and electronic Sell-In**: starter packs and vouchers
   (`raw/SP VC Sellin/`) and saldo transfers (`raw/MOBI TRansfer Balance/`).
4. **OSA and saldo monitoring**: outlet stock availability from stock-taking and
   recent replenishment; outlet Mobo saldo across mapped outlets.

The `CATALOGUE` menu group (Territory Management, Jakarta Inner Map, Data &
Mappings) is pure static master data: outlet, site, people and territory mapping.
Transactions belong in their own monitoring views, not in the catalogue.

## 2. Implementation gate: assess the data before changing the app

- Do not change application code or data schemas without first assessing the raw
  data in `raw/`: column alignment, primary keys, volumes. Write the assessment to
  `docs/assessments/` and treat it as the data contract.
- Keep the app runnable offline, with no cloud dependency, during local
  development. Data is local-first for Phase 1 (OneDrive/Graph comes later).

## 3. How the project is laid out

| Path | What it is |
|---|---|
| `raw/` | Raw exports (pipe-delimited reports with 8–10 metadata lines before the header; MOBO transactions are comma CSV with a 31-line preamble; mappings are `.xlsb`) |
| `docs/` | Requirements (`retail-supply-demand-monitoring-requirements.md`), frontend spec, master hierarchy workbook, `assessments/`, status and plan |
| `data/catalogues/` | Governed static catalogues built from `raw/` and `docs/MASTER DSE Hirarki.xlsx` |
| `data/processed/` | Pre-aggregated feeds |
| `scripts/` | Pure-stdlib Python builders (no pandas; the `.venv` is empty on purpose) plus `render_check.js` |
| `website/` | Static app: `index.html`, `app.js`, `styles.css`, `tokens.css`, `data/*.js` feeds (territory, map, visits, sellin, illustrative brief), vendored Leaflet. No build step. |

## 4. How to run

**Daily refresh (one command):** `python3 scripts/daily_update.py` finds the newest MOBII, MOBO and PJP visit files under `raw/` (any sub-folder), rebuilds the demand, penjualan, visits, KPI, ENDBAL (newest snapshot date only; older snapshot files in `raw/ENDBAL` are ignored) and GA feeds in order, then runs the render check. PJP coverage is read from each report's `PERIOD ->` line, not from the file name (a `*_14_14.zip` held 15 Oct). `--check` only lists what it found. MOBO is month-aware: the newest `DAILY_DATA_MOBO_YYYYMM` file is the current month and the previous month's file (for example `_202609`, full close) feeds LMTD and Last FM demand.
Missing-day pattern: a day inside the period that no PJP export covers (12 Oct 2026 today) is flagged by the runner, listed in `dseVisitsFeed.metadata.missing_days`, shown as "n/a / Data not available" in the PJP views, and left out of per-day averages and `business_days`. Never show it as zero execution.

```bash
python3 scripts/extract_master_hierarchy.py              # DSE / DSO / branch catalogues
python3 scripts/build_territory_management_catalogues.py # outlet master + territory feed
python3 scripts/build_jakarta_map_data.py                # map feed
python3 scripts/generate_dse_visits_feed.py              # visits feed (run from project root)
python3 scripts/build_gaplok_reference.py [GAPLOK.xlsb]  # GAPLOK location chain + product groups (run before the Sell-In feed)
python3 scripts/build_sellin_feed.py                     # Sell-In feed (MOBI physical + balance, outlet-bound)
python3 scripts/build_target_feed.py                     # DSE target setting (Sell-In SP + OSA, IM3/3ID/IOH) from raw/*Target DSE*.xlsx; run before build_dse_kpi_feed
python3 scripts/build_dse_kpi_feed.py                    # DSE KPI inputs (KPI DSE Oct 2026: OSA, SP, UAR, effective call); needs penjualan + visits feeds first
python3 scripts/build_dse_coverage.py                    # kecamatan and desa covered per DSE, from outlet lat / long (after the territory feed)
python3 scripts/build_endbal_feed.py                     # END BALANCE feed (raw/ENDBAL stock balance + saldo sell-in); needs penjualan feed first
python3 scripts/build_kro_feed.py                        # KRO / Wholesaler catalogue + tracking (needs GA, penjualan, demand and visits feeds first); also writes data/catalogues/kro_outlet_catalogue.csv
python3 scripts/build_local_dataset.py                   # ILLUSTRATIVE brief/SvD feed (synthetic)
node scripts/render_check.js                             # renders every view under Node, fails on errors
```

Preview: `.claude/launch.json` defines the `website` server (`python3 scripts/dev_server.py 8088 website`, a no-cache static server).

## 5. Conventions

- Follow the Inner Jakarta Brand & Frontend Guide v2.0 (`docs/frontend-design-spec.md`): tokens in `tokens.css`, flat ruled ink-first UI, red only as a signal, English number units.
- Every screen that shows synthetic numbers must say so. Morning Sales Brief, Leaders Territory Analysis and Supply vs Demand are still synthetic until Step 5 of the plan. DSE Visits, Sell-In Monitoring and the Catalogue views are real.
- Sell-In report layout follows the GAPLOK workbook for KPI columns and product groups (SIM/SP, Vouchers, Saldo; summary first, then details). Territory is always the 7 master areas (KARAWANG is one area, no West/East or North/South split) → 36 MCs → CSE. Reference catalogues: `data/catalogues/gaplok_*`.
- Sell-In scope (owner, 13 Oct 2026): outlet-bound flows only (DSE → Outlet, MPX/SDP → Outlet); product category as in the report (Voucher, Starter Pack, E-Voucher); value = QTY × RATE/UNIT for physical, QTY for balance.
- Site counts: 4,249 means DSO-mapped site instances (site × micro cluster); 3,992 physical sites + 1 `PENDING-NBS` bucket = 3,993 physical. Say which one you mean.
- Period in all current feeds: 01–11 Oct 2026 (`DAYS = 11`).
- October 2026 data caveat (owner, 15 Oct 2026): MOBII and MOBO were migrated, so sell-in and demand for roughly 1–9 Oct are genuinely very low (saldo Rp 0–600 Jt per day against about Rp 700 Jt in September) and reach the normal level around 10–13 Oct. MTD vs LMTD growth, target achievement and DSE incentives for October are structurally depressed; this is not a feed bug.
- Brand colours (owner, 15 Oct 2026): IM3 = yellow, 3ID = magenta, IOH (hybrid / paired IM3 + 3ID) = tosca (`.badge-im3`, `.badge-3id`, `.badge-ioh`, dots `.br-dot`).
- PJP visit measures exclude two groups (owner, 15 Oct 2026): promotors (operator type Promotor, logins `PRJAYAIN##`, flagged with the 🎤 Promotor badge) and ad-hoc visits at the 860 master outlets that have no DSE (flagged ADHOC · non-PJP). Both are listed separately in the visits feed (`regional_summary.excluded_from_pjp`) and are not counted as PJP planned / executed / productive visits or outlet coverage.
- Print sheets: SALMO and SP are IM3 + 3ID combined per outlet; small lines under each figure split IM3 and 3ID (`bs` field of the penjualan feed).
- GA has two bases of the same RGUGA quantities (owner, 18 Oct 2026; `docs/assessments/ga_kro_deep_dive.md`): **outlet tagging** (outlet → master DSE → MC → Area; DSE incentive base, with the "GA ber-DSE" card) and **site / location** (the kecamatan, micro cluster and area written in the `Daily_RGUGA_OUTLET` file itself; HoA / Region / DSO KPI; no DSE and no outlet list). **GA BIOMETRIC and #OUTLET ACTIVE GA are not used any more**, and the location basis is not mapped through NBS-outlet. `M2S KECAMATAN` is read only for the October GA target per kecamatan and brand (IM3 `TARGET RGUGA KEC`, 3ID `TARGET OCT`, mapped to MC and Area by its `DEMARKASI` sheet). It is shown in the Gross Add tab Target Kecamatan, in the Gross Add cards and territory tables (Target Okt, % target pro-rata), in Daily GA Trend (target line, cards, table columns) and in the Overall Performance KPI scorecard (GA MTD vs target Oktober). The actual compared with the target is the GA at outlets whose kecamatan is written in the RGUGA file. SSO figures that compare windows use the same number of days (SSO MTD vs SSO LMTD, average SSO per day); SSO of a 30-day month is never compared with a 15-day MTD.
- Standard outlet slab ladder (owner, 18 Oct 2026), per outlet per month, for GA pcs (basis GA) and Starter Pack sell-in pcs (basis SUPPLY): Retail 0 · 1–10 · 10–30; KRO 30–60 · 60–100; Wholesaler 100–200 · 200–500 · 500–1000 · > 1000 (upper bound in the lower slab). Catalogue base = last full month; current month = MTD ÷ cut × 31 (supply: last 7 days × 31 ÷ 7 while the October migration dip lasts). Menus: Daily GA Trend (`mb_gatrend`) and Outlet & KRO Management (`mb_kro`, feed `kro_feed.js`). KRO and Wholesaler visit tracking: success visit = at least one completed PJP check-in this month, never visited = none; DSO logins are not in the MOBI journey-plan export, so DSO visits are shown as the visits of the DSE team of the DSO's MC.
- Gross Add page rules (audit 19 Oct 2026; `docs/assessments/ga_page_audit.md`, checked by `node scripts/audit_ga.js`): the location of an outlet in the site basis is that of its own brand row (IOH view: the row with more GA); per-kecamatan figures use only GA at outlets whose kecamatan is written in the RGUGA file; a kecamatan appears once (a kecamatan-only label is merged into its one full `kecamatan|kabupaten` label).
- Terminology (owner, 19 Oct 2026): on screen, outlet "master" is called **PJP** and "adhoc" / non-master is called **non-PJP** (labels only; code identifiers such as `poAdhoc`, `omM` and the feed fields keep their names). The 860 master outlets without a DSE still sit in the master base but have no PJP.
- Count rules (formula audit, 19 Oct 2026; `docs/assessments/scorecard_formula_audit.md`, checked by `node scripts/audit_scorecard.js`): a "% of master outlets" always has a numerator of master outlets only (ad-hoc outlets are shown as "+N adhoc"); PJP coverage is measured on master outlets that have a DSE (the 860 outlets without a DSE have no PJP); a DSE is a person id (KPI `pid` = visits `person_id`), never a name; operators that are not in the master are counted as "login belum terpetakan", not as DSE, while planned / executed totals include them.
- DSE coverage line (owner, 16 Oct 2026): wherever a table shows a DSE name, a small lowercase line lists the kecamatan and desa that DSE covers (based on the lat / long of the outlets each DSE covers, built by `scripts/build_dse_coverage.py`: the mapping label is kept when it agrees with the location, otherwise the label of the nearest outlets is used; `kec: … · desa: …`, top names by outlet count, full list in the tooltip). Shown the first time a DSE appears in a table, tooltip only on repeats; overlapping desa between DSEs is expected. Implemented by `dseCoverEnhance()` in `app.js`.
