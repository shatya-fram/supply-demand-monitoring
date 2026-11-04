#!/usr/bin/env python3
"""Stages a frozen month (data/archive/<YYYY-MM>/*.gz, written by archive_month_close.py) as plain script files in
website/archive/<YYYY-MM>/, the October (or other month) feed set the period toggle (website/period_feeds.js, `per=oct`) swaps in.

Each file has the same global as the live feed in website/data/ (var X = {...}; window.X = X) so app.js runs unchanged on it.
kro_slim.js is split out of kro_feed.json (the archive keeps the Retail records in `slim`).
Usage: python3 scripts/stage_period_archive.py [YYYY-MM]    (default 2026-10). Contract: docs/assessments/period_toggle.md
Pure stdlib."""
import gzip, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
month = sys.argv[1] if len(sys.argv) > 1 else "2026-10"
SRC, DST = os.path.join("data", "archive", month), os.path.join("website", "archive", month)
# archive json -> (global, style): "var" = var X = ...; window.X = X;  "win" = window.X = ...;
JSON_FEEDS = {
    "penjualan_feed": ("PENJUALAN_FEED", "var", "Auto-generated Penjualan (Sell-In outlet) feed dari DAILY_DATA_MOBII. Kontrak: docs/assessments/daily_data_mobii_sellin.md"),
    "demand_feed": ("DEMAND_FEED", "var", "Auto-generated Demand (sell-out) feed dari DAILY_DATA_MOBO. Kontrak: docs/assessments/daily_data_mobo_demand.md"),
    "ga_feed": ("GA_FEED", "var", "Auto-generated Gross Add (SSO) feed dari raw/GA. Kontrak: docs/assessments/ga_rguga_outlet.md"),
    "kro_feed": ("KRO_FEED", "var", "Auto-generated KRO / Wholesaler feed. Kontrak: docs/assessments/kro_product_ladders.md"),
    "dse_kpi_feed": ("DSE_KPI_FEED", "win", "DSE KPI feed, frozen month close"),
    "endbal_feed": ("ENDBAL_FEED", "win", "END BALANCE feed, frozen month close"),
    "target_feed": ("TARGET_FEED", "win", "DSE target setting, frozen month close"),
    "stock_feed": ("STOCK_FEED", "win", "Stock Outlet feed, frozen month close"),
    "sellin_feed": ("SELLIN_FEED", "win", "Sell-In Monitoring feed, frozen month close"),
    "dse_coverage": ("DSE_COVERAGE", "win", "Kecamatan and desa per DSE, frozen month close"),
}
JS_FEEDS = ["dse_visits_feed", "ga_site_feed"]       # archived as ready-made .js

def dump(o): return json.dumps(o, ensure_ascii=False, separators=(",", ":"))

def write(name, text):
    with open(os.path.join(DST, name), "w", encoding="utf-8") as f: f.write(text)

os.makedirs(DST, exist_ok=True)
tot = 0
for key, (g, style, hdr) in JSON_FEEDS.items():
    obj = json.loads(gzip.open(os.path.join(SRC, key + ".json.gz")).read().decode("utf-8"))
    out = {key + ".js": None}
    if key == "kro_feed":
        slim = obj.pop("slim", [])
        write("kro_slim.js", "// Frozen %s: outlets below the KRO slab (Retail), loaded on demand\nvar KRO_SLIM = %s;\nif (typeof window !== 'undefined') window.KRO_SLIM = KRO_SLIM;\n" % (month, dump(slim)))
    if style == "var":
        text = "// %s (frozen %s)\nvar %s = %s;\nif (typeof window !== 'undefined') window.%s = %s;\n" % (hdr, month, g, dump(obj), g, g)
    else:
        text = "/* %s (frozen %s) */\nwindow.%s = %s;\n" % (hdr, month, g, dump(obj))
    write(key + ".js", text)
for key in JS_FEEDS:
    write(key + ".js", gzip.open(os.path.join(SRC, key + ".js.gz")).read().decode("utf-8"))
for fn in sorted(os.listdir(DST)):
    n = os.path.getsize(os.path.join(DST, fn)); tot += n
    print("  %-26s %7.2f MB" % (fn, n / 1e6))
print("staged %s -> %s (%.1f MB plain)" % (month, DST, tot / 1e6))
