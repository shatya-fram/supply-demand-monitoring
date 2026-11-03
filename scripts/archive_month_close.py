#!/usr/bin/env python3
"""Freezes the feeds of a closed month: gzips data/processed/*.json (+ the PJP visits and GA site feeds) into
data/archive/<YYYY-MM>/ with a MANIFEST.json, so an outlet-level month close stays analysable after the builders roll to the next month.

Usage: python3 scripts/archive_month_close.py [YYYY-MM] [--force]
Default month = the month of the current data/processed/penjualan_feed.json (the month about to be closed).
daily_update.py runs it by itself when the newest MOBII file names a later month than the feeds. Never overwrites without --force.
data/archive/ is kept out of the public release (scripts/prepare_public_release.py); scripts/stage_period_archive.py turns it into website/archive/<month>/ for the period toggle.
kro_slim (Retail records) is part of kro_feed.json (key slim), so the archive holds it."""
import gzip, hashlib, json, os, shutil, sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
args = [a for a in sys.argv[1:] if not a.startswith("--")]
force = "--force" in sys.argv
pj = json.load(open("data/processed/penjualan_feed.json"))["metadata"]
month = args[0] if args else pj["cut"][:7]
dst = os.path.join("data", "archive", month)
if os.path.exists(os.path.join(dst, "MANIFEST.json")) and not force:
    print("archive %s already exists (use --force to replace)" % month); sys.exit(0)
os.makedirs(dst, exist_ok=True)
files = sorted("data/processed/" + f for f in os.listdir("data/processed") if f.endswith(".json")) + [p for p in ("website/data/dse_visits_feed.js", "website/data/ga_site_feed.js", "data/catalogues/kro_outlet_catalogue.csv") if os.path.exists(p)]
man = {"month": month, "archived_at": datetime.now().isoformat(timespec="seconds"), "penjualan_cut": pj["cut"], "files": {}}
for f in files:
    raw = open(f, "rb").read()
    out = os.path.join(dst, os.path.basename(f) + ".gz")
    with gzip.GzipFile(out, "wb", compresslevel=9, mtime=0) as g:
        g.write(raw)
    man["files"][os.path.basename(f)] = {"bytes": len(raw), "gz": os.path.getsize(out), "md5": hashlib.md5(raw).hexdigest()}
json.dump(man, open(os.path.join(dst, "MANIFEST.json"), "w"), indent=1)
print("archived %s: %d files, %.1f MB gz -> %s" % (month, len(files), sum(v["gz"] for v in man["files"].values()) / 1e6, dst))
