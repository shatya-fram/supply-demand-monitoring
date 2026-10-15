# Local Data Architecture · Supply & Demand Monitoring (Inner Jakarta)

Phase 1 is **local-first** (confirmed 13 Oct 2026): raw exports live in `raw/`, governed
catalogues and feeds are built from them by the scripts in `scripts/`, and the website
reads only the generated `website/data/*.js` files. No cloud dependency.

## Directory layout

```
raw/                                   # Raw exports (local only, ignored by git)
├── Outlet & Mapping/                  # Data_Mapping_Update (14,695 outlets), adhoc_outlet_im3_3id_data_gcp (outlet → site NBS),
│   └── NBS Site to Outlet/            #   IM3 / 3ID outlet-to-NBS CSVs
├── MOBI VISIT DSE/                    # Journey Plan Summary Detail per DSE visit (ZIP of pipe CSV), IM3 and 3ID, 01–11 Oct 2026
├── SP VC Sellin/                       # Physical Sell-In: starter packs and vouchers, distributor → DSE → outlet (pipe CSV)
├── MOBI TRansfer Balance/             # Electronic saldo transfers DSE → outlet (pipe CSV)
└── MOBO TRANSACTION DETAILS/          # Outlet transactions, demand / sell-out proxy (comma CSV), not yet used

docs/MASTER DSE Hirarki.xlsx           # Master hierarchy workbook (DSE, micro cluster, branch, Head of Area)

data/
├── catalogues/                        # Governed static catalogues
│   ├── territory_management_master.csv / .json   # 14,694 outlets → site NBS → DSE → DSO → HoA, GPS, Oct supply flags
│   ├── territory_hierarchy_chain.json            # 7 branches → 36 micro clusters → DSE codes
│   ├── dse_master_hierarchy.csv / .json          # 272 DSEs with MOBO MSISDN, rayon, IM3 / 3ID codes
│   ├── dso_territory_mapping.csv / .json         # 36 micro clusters → DSO leaders and Heads of Area
│   ├── branch_area_summary.csv                   # 7 branches and Heads of Area
│   ├── jakarta_map_feed.json                     # Borders, 4,249 DSO-mapped site centroids, outlet points
│   └── outlet_territory_template.csv             # Template for outlet-level intake
└── processed/
    ├── daily_supply_demand_feed.json  # ILLUSTRATIVE seeded numbers (Morning Brief, Leaders, Supply vs Demand) until Step 5
    └── sellin_feed.json               # JSON mirror of the Sell-In feed

website/data/
├── territory_feed.js / .json          # Catalogue feed for the Territory Management view
├── jakarta_map_feed.js                # Map feed
├── dse_visits_feed.js                 # Visits feed incl. unvisited outlets and sites per window, group totals
├── sellin_feed.js                     # Sell-In facts (outlet-bound MOBI rows), unmapped outlets, products, distributors
└── feed.js / .json                    # ILLUSTRATIVE brief / supply-vs-demand feed
```

## Raw file quirks the parsers handle

- `SP VC Sellin`, `MOBI TRansfer Balance` and the journey plan reports have 8–10 metadata lines before the
  header. Find the header by the `TRANSACTION DATETIME` or `SCHEDULE DATE` token; do not assume a line number.
- Those reports are pipe-delimited. `MOBO TRANSACTION DETAILS` is comma-delimited with quotes and a 31-line preamble.
- `3ID_balance_01_11_oct_2026.csv` has one row with unescaped pipes that shifts the trailing numeric columns.
- Outlet keys: `SALDOMOBO ORG ID` (visits) matches `outlet_id_im3` / `outlet_id_3id` in the master, sometimes with
  leading zeros stripped.

## Hierarchy

Region `INNER JAKARTA` → 7 branches (each with a Head of Area) → 36 micro clusters (each with a DSO leader) →
272 DSEs → 14,694 outlets. Sites: 3,992 physical NBS sites plus one `PENDING-NBS` bucket; 4,249 when counted
per micro cluster (a border site serving two clusters counts in both).

## Build order

```bash
python3 scripts/extract_master_hierarchy.py
python3 scripts/build_territory_management_catalogues.py
python3 scripts/build_jakarta_map_data.py
python3 scripts/generate_dse_visits_feed.py       # run from the project root
python3 scripts/build_sellin_feed.py              # Sell-In feed from raw/SP VC Sellin and raw/MOBI TRansfer Balance
python3 scripts/build_local_dataset.py            # illustrative feed only
node scripts/render_check.js                      # must end with "All views rendered without errors."
```
