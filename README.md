# Supply & Demand Monitoring · Inner Jakarta

Static monitoring app for Indosat Ooredoo Hutchison, Region Inner Jakarta: Sell-In, DSE visits (PJP), demand, gross add,
END BALANCE, UAR and DSE productivity, from the Region down to Area, Micro Cluster, DSO, DSE and outlet.

* **Live site** (GitHub Pages): enable Pages with source "GitHub Actions"; the workflow in `.github/workflows/pages.yml`
  publishes the `website/` folder.
* **Run locally**: `python3 scripts/dev_server.py 8088 website`, then open http://localhost:8088
* **Rebuild the data feeds** from the raw exports (kept local, not in this repository): see `CLAUDE.md` section 4.
* **Check every view**: `node scripts/render_check.js`

## Data in this repository

The feeds under `website/data/` and `data/` are **pre-aggregated working copies** for the preview. Personal contact data
(mobile numbers, e-mail addresses) is masked. The raw exports (`raw/`) are never published. October 2026 figures are
depressed by the MOBII / MOBO system migration (see `CLAUDE.md`). A later version will build the feeds by parsing a
local database instead of the raw exports.
