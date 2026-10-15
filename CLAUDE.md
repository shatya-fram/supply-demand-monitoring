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

**Daily refresh (one command):** `python3 scripts/daily_update.py` finds the newest MOBII, MOBO and PJP visit files under `raw/` (any sub-folder), rebuilds the penjualan, demand, visits and KPI feeds in order, then runs the render check. `--check` only lists what it found.
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
python3 scripts/build_endbal_feed.py                     # END BALANCE feed (raw/ENDBAL stock balance + saldo sell-in); needs penjualan feed first
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
