# Retail Supply & Demand Monitoring: Scope, Connection & Requirements

**Project:** Retail Supply & Demand Monitoring (Inner Jakarta)
**Owner:** Shatya Framudia, SVP Head of Region Inner Jakarta
**Date:** 13 October 2026
**Status:** Draft v0.5, Phase 1 scope confirmed as local-first
**Changes in v0.5:** Phase 1 confirmed **local-first** by the owner (13 Oct 2026); Section 2 and Section 4 updated to record the Sell-In pipeline scope and the local data architecture; Section 10 replaced by the step plan in `docs/project-status-and-migration-plan.md`; development moved from Antigravity to Claude Code.
**Changes in v0.4:** frontend and brand requirements added (Section 12); website prototype built from the Brand Guide with illustrative data.
**Changes in v0.3:** Microsoft 365 connector connected; `99_RAW_DATA` folder reached and inventoried (Section 6.0); risks and open questions updated.

> **Purpose of this document:** confirm that scope, data sources, connections and requirements are aligned to the project objectives before development starts. Items marked **[TBC]** are assumptions or open decisions and need confirmation.

---

## 1. Objectives

A web-based repository and analytics application used by the Daily Operational Team to support two daily routines:

1. **Daily Morning Sales Brief**: a consistent view of yesterday's and cumulative performance.
2. **Daily Leaders Territory Analysis**: performance drill-down by territory for regional and area leaders.

Additional capability: compare **Stock In (supply)** against **customer demand** and show **stock available on the market**, at Site, Kecamatan and DSE level.

### Success criteria **[TBC]**

- Morning brief is available before the daily operational meeting without manual consolidation.
- Leaders can drill from Region → Area → DSO → Kecamatan/Site → Outlet → DSE in a few clicks.
- Supply vs demand gaps are visible at Site, Kecamatan and DSE level.
- A single, governed source for mappings (no parallel Excel versions).

---

## 2. Scope

### 2.0 Phase 1 decisions (confirmed 13 Oct 2026)

- **Local-first.** Phase 1 runs from the local project folder: raw exports in `raw/`, governed catalogues in `data/catalogues/`, a static offline website in `website/`. OneDrive / Graph integration (Section 5.2) moves to a later phase.
- **Sell-In pipeline first.** Phase 1 models the upstream flow in this order: (1) distributor fill-in to DSE, (2) DSE visits and beat plans, (3) physical SP/VC and electronic saldo Sell-In, (4) OSA and outlet saldo. Consumer demand (sell-out) comes after.
- **Catalogue is static.** The `CATALOGUE` menu (Territory Management, Jakarta Inner Map, Data & Mappings) holds only outlet, site, people and territory mapping. Transactions live in their own monitoring views.
- **Gate.** No application or schema change without a written data assessment in `docs/assessments/`.

### 2.1 In scope (Phase 1)

- Master data catalogues: Outlet–Territory mapping, Outlet–DSE (sales) mapping, DSO–Territory mapping for Inner Jakarta.
- Daily upload of aggregated/cumulative transaction reports.
- Aggregation across time, outlet, people (DSE), geography (outlet, site, kecamatan, DSO) up to Area and Region.
- Supply (Stock In) vs Demand comparison and market stock availability.
- Daily Morning Sales Brief and Daily Leaders Territory Analysis views.
- Cloud-hosted web application with data stored in the enterprise OneDrive repository.

### 2.2 Out of scope (Phase 1) **[TBC]**

- Regions other than Inner Jakarta.
- Write-back to source transactional systems.
- Forecasting / ML demand prediction.
- Native mobile app.

---

## 3. Users and Roles **[TBC]**

| Role | Needs |
|---|---|
| Region head / leaders | Territory analysis, rankings, exceptions |
| Area / DSO managers | Drill-down by their territory, DSE performance |
| Daily operational team | Upload data, run morning brief, maintain mappings |
| Admin | Manage users, mappings, data quality, access |

Access should be scoped by territory (a DSO manager sees only their DSO) **[TBC]**.

---

## 4. Solution Architecture

**Phase 1 (current, local-first):**

```
raw/ exports (manual drop)  ──►  scripts/*.py (stdlib only)  ──►  data/catalogues, website/data/*.js  ──►  website/ (static, offline)
```

The design below is retained for the later cloud phase.

### 4.1 Later phase (proposed)

```
Daily reports / mapping files
        │ (upload via web UI, or placed in OneDrive folder)
        ▼
Enterprise OneDrive / SharePoint  ◄── system of record for data files
        │ Microsoft Graph API (app registration, scoped permissions)
        ▼
Cloud-hosted web application (API + processing + UI)
        │
        ▼
Daily Morning Brief  |  Leaders Territory Analysis  |  Supply vs Demand
```

**Key design decision [TBC]:** data is stored as files in OneDrive. At the volumes expected (outlet-level daily data), file-based storage may be slow for aggregation and querying. Options:

| Option | Description | Trade-off |
|---|---|---|
| A. Files only | App reads/writes CSV/XLSX/Parquet in OneDrive on demand | Meets "data in OneDrive" literally; slower, harder to query |
| B. **Files as source + app-side cache/DB (recommended)** | OneDrive holds the raw and master files; app loads into a small database/cache for fast aggregation | Keeps OneDrive as system of record; needs sync logic |

---

## 5. Part A: Connecting to the OneDrive Documents Share

There are **two separate connections**, and they should not be confused.

### 5.1 Connection 1: Claude ↔ OneDrive (MCP), for design and development support

Purpose: let Claude read sample files and specifications from the share while the application is being designed and built.

- **Connector:** Microsoft 365 connector (SharePoint / OneDrive / Outlook / Teams), `https://microsoft365.mcp.claude.com/mcp`.
- **Status:** **connected** (12 Oct 2026), signed in as the Head of Region Inner Jakarta account. The `99_RAW_DATA` folder was reachable after the owner shared it with this account; folder listing verified, file-content reads not yet tested.
- **Exposed tools:** SharePoint search, folder-scoped search, read resource (read/search oriented).
- **Limit:** the standard connector does not list file-write tools, so it is for **reading** during development.

Setup steps:

1. Tenant admin confirms third-party OAuth consent is permitted (Entra ID admin consent may be needed).
2. In Claude: Settings → Connectors → Microsoft 365 → Connect; sign in with the corporate account.
3. Approve the delegated permissions; enable the connector in this chat/Project.
4. Verify: search for a known file in the target share and read it back.
5. Record the site, library and folder path in scope.

### 5.2 Connection 2: Application ↔ OneDrive (runtime), for the production app

Purpose: the cloud-hosted web app reads mappings and daily reports from OneDrive and writes processed outputs back.

- **Mechanism:** Microsoft Graph API with an Entra ID **app registration** (not the Claude connector).
- **Permission model [TBC]:** least privilege, ideally restricted to the single site/library or folder (e.g. `Sites.Selected` with folder-level scope) rather than tenant-wide file access.
- **Auth:** client credentials (service identity) for background processing; delegated sign-in (SSO) for end users.
- **Secrets:** stored in the cloud host's secret manager, never in code or repository.
- **Resilience:** handle token expiry, throttling (HTTP 429, retry with backoff), missing/renamed files, and locked files.

### 5.3 Connection acceptance criteria

- [x] Claude connector authenticates and can list the agreed folder (Connection 1), verified 12 Oct 2026
- [ ] Claude connector can read file contents (Master Hierarchy xlsx/csv, transaction files) and large files are handled
- [ ] Folder is moved or shared from a stable, non-personal location (see Section 9, personal OneDrive risk)
- [ ] App registration approved by IT/Security with agreed permission scope (Connection 2)
- [ ] App can read a mapping file and a daily report from the designated folder
- [ ] App can write a processed output to a designated output folder
- [ ] Access limited to the agreed site/library; no tenant-wide access
- [ ] Actions traceable in Microsoft 365 audit logs

---

## 6. Data Requirements

### 6.0 Data source inventory (observed 12 Oct 2026)

Location: `00_REGIONAL_INNER_JAKARTA/99_RAW_DATA` (personal OneDrive of account 87136690). Names and sizes only; contents not yet inspected. Purposes below are **inferred from names [TBC]**.

| Item | Type | Size | Likely purpose **[TBC]** |
|---|---|---|---|
| `Catalogue` | folder | 0 bytes (empty) | Intended home for mapping catalogues; nothing there yet |
| `Master Hierarchy 20261009.xlsx` | file | ~25 MB | Territory / outlet / people hierarchy (candidate source for the three mappings) |
| `master_hierarchy_feed_20261008.csv` | file | ~240 MB | Raw hierarchy feed behind the master hierarchy |
| `MOBO_TRX_DETAILS` | folder | ~204 MB | Transaction details (demand / sales side) |
| `MOBO_BALANCE_TRANSFER` | folder | ~450 MB | Balance transfer records |
| `MOBII_BALANCE_TRANSFER` | folder | ~8 MB | Balance transfer records (MOBII) |
| `MOBII_JOURNEY_PLAN_DETAIL` | folder | ~11 MB | Field visit / journey plan per DSE |
| `MOBII_SELLIN_SP_VC` | folder | ~175 KB | Sell-in of starter packs / vouchers (candidate Stock In source) |

Implications:

- The files are large (hundreds of MB), so the app must load them into a cache/database rather than query OneDrive per request (reinforces Section 4, option B).
- The `Catalogue` folder being empty means the mapping catalogues are not yet maintained as such; deriving them from the Master Hierarchy files is a design decision **[TBC]**.
- The folder naming (`MOBO`, `MOBII`) and the exact meaning of each dataset must be confirmed with the data owner before defining Stock In, Demand and Stock on market.
- File and folder naming includes dates (`20261009`, `20261008`); the loader must detect the latest file and handle replacements.

### 6.1 Master data catalogues (mappings)

| Catalogue | Key fields **[TBC]** | Purpose |
|---|---|---|
| Outlet–Territory | Outlet ID, outlet name, site, kecamatan, DSO, area, region | Places each outlet in the geographic hierarchy |
| Outlet–DSE | Outlet ID, DSE ID, DSE name, effective dates | Assigns outlets to sales people |
| DSO–Territory (Inner Jakarta) | DSO ID/name, territory/kecamatan list, manager | Defines DSO coverage |

Requirements:

- Single authoritative version, with change history (who changed what, when).
- Support effective-dating so past results map to the structure valid at the time **[TBC]**.
- Validation on upload: duplicate outlet IDs, outlets with no territory, outlets with no DSE, orphan DSOs.

### 6.2 Daily transaction reports (upload)

- Uploaded daily; content is **aggregated/cumulative** by time, outlet, DSE and area.
- Need to confirm: file format (CSV/XLSX), column layout, source system, who uploads, cut-off time **[TBC]**.
- Validation: schema check, date check, duplicate upload detection, row-count/total reconciliation, unmatched outlet/DSE IDs flagged (not silently dropped).
- Re-upload/correction must replace the affected day cleanly and keep an audit trail.

### 6.3 Supply and demand data **[TBC: biggest open item]**

| Data | Question to resolve |
|---|---|
| Stock In (supply) | What is the source (distributor sell-in, warehouse issue)? Granularity: Site, DSE, outlet? Frequency? |
| Demand (customer demand) | What proxies demand: sell-out/transactions, activations, orders, stock-outs? |
| Stock on market | Calculation: opening stock + stock in − sales? Or reported stock? Per outlet, DSE or site? |

The calculation definitions must be agreed and documented before build; they drive the core feature.

### 6.4 Aggregation hierarchy

- **Geography:** Outlet → Site → Kecamatan → DSO → Area → Region
- **People:** Outlet → DSE → (supervisor, if applicable) → DSO
- **Time:** Day → Week → Month → cumulative (MTD/QTD/YTD) **[TBC]**

---

## 7. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Maintain the three mapping catalogues (upload, view, edit, validate, version) | Must |
| FR-02 | Upload daily transaction reports with validation and error report | Must |
| FR-03 | Aggregate data by time, outlet, DSE, site, kecamatan, DSO, area, region | Must |
| FR-04 | Daily Morning Sales Brief view (daily and cumulative, vs target if available) | Must |
| FR-05 | Daily Leaders Territory Analysis (drill-down, ranking, top/bottom performers) | Must |
| FR-06 | Supply vs Demand comparison at Site, Kecamatan and DSE level | Must |
| FR-07 | Market stock availability view (stock on hand vs demand, days of cover) | Must |
| FR-08 | Exception flags (stock-out risk, demand above supply, underperforming territory) | Should |
| FR-09 | Filters: date range, territory, DSE, product/category **[TBC]** | Must |
| FR-10 | Export to Excel/PDF/image for sharing in the morning brief | Should |
| FR-11 | Scheduled/automatic morning brief delivery (e.g. Telegram/Slack/email) | Could |
| FR-12 | Role-based access limited by territory | Must |
| FR-13 | Data quality dashboard (missing uploads, unmapped outlets) | Should |
| FR-14 | Audit log of uploads, mapping changes and logins | Should |

---

## 8. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | **Security:** SSO via corporate identity; role/territory-based access; TLS in transit; encryption at rest; secrets in a vault |
| NFR-02 | **Data governance:** data remains in the enterprise OneDrive; any app-side cache holds no data longer than needed and follows IOH policy **[TBC]** |
| NFR-03 | **Performance:** main dashboards load in under ~5 s for a day's data; drill-downs under ~3 s **[TBC]** |
| NFR-04 | **Availability:** reliably available before the morning meeting; defined daily data-ready time **[TBC]** |
| NFR-05 | **Scalability:** handle growth in outlets, DSEs and history without redesign |
| NFR-06 | **Auditability:** all uploads and mapping changes traceable to a user |
| NFR-07 | **Usability:** works on laptop and phone browsers; Bahasa Indonesia and English labels |
| NFR-08 | **Maintainability:** configuration externalized (folder paths, thresholds, hierarchy), automated tests on aggregation logic |
| NFR-09 | **Recoverability:** backup/restore of app data; OneDrive versioning as safety net |

---

## 9. Risks and Constraints

| Risk | Impact | Mitigation |
|---|---|---|
| Tenant blocks third-party connector / app registration | Delay | Raise IT request early; agree permission scope |
| OneDrive as live data store is slow at scale | Performance | Use files as source plus app-side cache/DB (Section 4, option B) |
| Mapping data quality (unmapped outlets, stale DSE assignments) | Wrong aggregates | Validation on upload; data quality dashboard; named data owner |
| Supply/demand definitions not agreed | Core feature misleading | Resolve Section 6.3 before build; sign off formulas |
| Daily upload missed or late | Stale brief | Upload status indicator; alerts for missing data |
| Sensitive commercial data in cloud | Compliance | Confirm data classification and hosting location with IT/Security |
| Single person builds and maintains | Continuity | Documentation, handover, simple stack |
| Raw data sits in one employee's personal OneDrive; access ends if the owner changes role or leaves | Feed breaks, data loss | Move to a team SharePoint site or shared library with named owners and a service identity |
| Very large files (240 MB CSV, 450 MB folder) exceed connector and app read limits | Slow or failed loads | Chunked/streamed reads, incremental daily loads, convert to Parquet in the app cache |

---

## 10. Delivery Plan

Superseded on 13 Oct 2026 by the step plan in `docs/project-status-and-migration-plan.md` (Step 0 baseline, Step 1 finish the open items, Steps 2–4 the Sell-In stages, Step 5 replace synthetic data, Step 6 ingestion hardening, Step 7 cloud phase). The original phase table is kept for reference.

### 10.1 Original phase table (v0.4)

| Phase | Deliverable | Gate |
|---|---|---|
| 0 | **This document signed off** (scope, definitions, connections) | No build before sign-off |
| 1 | Connections: Claude connector, Graph app registration, folder structure | Acceptance criteria 5.3 met |
| 2 | Data model and mappings, upload and validation | Sample data loads cleanly |
| 3 | Aggregation engine and Morning Brief | Numbers reconcile with source reports |
| 4 | Leaders Territory Analysis | Leaders review |
| 5 | Supply vs Demand and market stock | Definitions validated with operations |
| 6 | UAT, security review, go-live, handover | Sign-off |

Durations to be estimated after Phase 0.

---

## 11. Open Questions (to close before build)

1. ~~What is the exact OneDrive/SharePoint site and folder structure?~~ **Answered (partly):** `00_REGIONAL_INNER_JAKARTA/99_RAW_DATA` in the personal OneDrive of account 87136690 (Section 6.0). Still open: who owns it long term, and will it move to a shared site?
2. What are the formats and column layouts of the daily transaction reports? Who produces and uploads them, and by what time?
3. Source and definition of **Stock In**, **Demand** and **Stock on market**, and at what granularity do they exist today?
4. Are targets/budgets available for the morning brief (achievement vs target)?
5. Which products/categories are in scope?
6. Is territory-based access control required (who sees what)?
7. Where will the app be hosted, and is that approved by IT/Security for this data?
8. Can the OneDrive be accessed via Graph app registration, and who approves it?
9. How will mapping changes be handled historically (effective dates)?
10. Delivery channel for the morning brief: web only, or also Telegram/Slack/email?

---

## 12. Frontend and Brand Requirements

The web app follows the **Inner Jakarta Brand & Frontend Guide v2.0** (4 Oct 2026, supersedes UI/UX Guidelines 1.0). The full mapping is in `docs/frontend-design-spec.md`; a working prototype with **illustrative data** is in `website/`.

| ID | Requirement |
|---|---|
| UI-01 | Use the guide's tokens (`tokens.css`): ink `#201E1D`, ground `#F3F2F2`, surface `#FFFFFF`, accent `#EC3013`; Archivo, fallback Arial |
| UI-02 | Flat, ruled, ink-first: 2px ink rules, square corners, no shadows or gradients |
| UI-03 | Red is a signal only: decline, active territory, one primary action per screen. Active UI state inverts to white on ink |
| UI-04 | Page anatomy on every screen: header band, filter bar (Area → Branch → Kab/Kota → Kecamatan, instant), scope line, headline KPIs (four equal cards), primary view, detail on row click |
| UI-05 | Number formatting per guide: `Rp 412.6 B`, `Rp 1.24 T`, signed 1-decimal percentages with a true minus, em dash for no data, one locale per report |
| UI-06 | Movement colours only for growth, decline, flat and status bands, never for UI state; yellow as fill only |
| UI-07 | Tables sorted by revenue contribution; growth and decline in separate tables; selected row has a red 3px left mark and wash |
| UI-08 | Sidebar 224px, content padding 18px 24px, card gap 14px, card padding 12px 14px |
| UI-09 | Keyboard operable, visible 2px red focus outline, works at phone width |
| UI-10 | Offline fallback font and print stylesheet for the morning brief |

Open design points **[TBC]**: whether the app ships in English units or Bahasa Indonesia units (the guide allows one locale per report); thresholds for stock-cover status bands; the real brand-kit files (`tokens.css`, `tokens.json`, `ppt-theme.xml` under `export/brand-kit/`), which were referenced by the guide but not present in the folder.

---

## 13. Sign-off

| Role | Name | Date |
|---|---|---|
| Business owner | Shatya Framudia | |
| Operations (Daily Ops Team lead) | | |
| IT / Security | | |
| Developer | | |
