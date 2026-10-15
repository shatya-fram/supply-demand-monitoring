#!/usr/bin/env python3
"""
daily_update.py  ·  one command for the daily data refresh

    python3 scripts/daily_update.py            # discover newest raw files, rebuild all three feeds
    python3 scripts/daily_update.py --check    # only list what it found (no rebuild)
    python3 scripts/daily_update.py --no-render

Refreshes, in dependency order:
  1. Supply  · Penjualan ke Outlet    DAILY_DATA_MOBII_*.xlsb  -> build_penjualan_feed.py
  2. Demand  · Transaction ke Pelanggan DAILY_DATA_MOBO_*.xlsb -> build_demand_feed.py
  3. PJP     · DSE visits             *_visit_dse_YYYYMM__DD_DD.zip (all ranges) -> generate_dse_visits_feed.py
  4. DSE KPI inputs (needs 1 + 3)     -> build_dse_kpi_feed.py
  5. Render check of every view       -> node scripts/render_check.js

"Latest" = newest modified time under raw/ (any sub-folder, including OneDrive_* drops).
Files are handed to the builders through MOBII_SRC / MOBO_SRC / VISIT_ZIPS, so a new
download folder needs no code change. Pure stdlib; run from anywhere.
"""
import os
import re
import shutil
import subprocess
import sys
import time
import zipfile
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
RAW = "raw"
VISIT_RE = re.compile(r"^(3id|im3)_visit_dse_(\d{6})__(\d{2})_(\d{2})\.(?:zip|csv)$", re.I)


def find(pattern):
    rx = re.compile(pattern, re.I)
    hits = [os.path.join(dp, f) for dp, _d, fn in os.walk(RAW) for f in fn if rx.match(f)]
    return sorted(hits, key=os.path.getmtime, reverse=True)


def age(path):
    ts = datetime.fromtimestamp(os.path.getmtime(path))
    d = (date.today() - ts.date()).days
    tag = "today" if d == 0 else f"{d} day(s) old"
    return f"{ts:%d %b %Y %H:%M} ({tag})", d


def pick_visits():
    """All visit zips, copies in OneDrive_* folders folded by (name, size)."""
    seen, out = set(), []
    for p in find(VISIT_RE.pattern):
        sig = (os.path.basename(p).lower(), os.path.getsize(p))
        if sig not in seen:
            seen.add(sig)
            out.append(p)
    return sorted(out, key=lambda p: (os.path.basename(p).split("__")[1], os.path.basename(p).lower()))


def visit_coverage(zips):
    """Day numbers covered by the zip names, and the real last schedule date inside each zip."""
    days = set()
    for p in zips:
        m = VISIT_RE.match(os.path.basename(p))
        days.update(range(int(m.group(3)), int(m.group(4)) + 1))
    return days


def run(label, cmd, env=None):
    print(f"\n{'=' * 78}\n▶ {label}\n  $ {' '.join(cmd)}\n{'=' * 78}", flush=True)
    t0 = time.time()
    rc = subprocess.run(cmd, env={**os.environ, **(env or {})}).returncode
    print(f"  ({time.time() - t0:.0f}s, exit {rc})", flush=True)
    return rc


def main():
    check_only = "--check" in sys.argv
    mobii, mobo, visits = find(r"^DAILY_DATA_MOBII_.*\.xlsb$"), find(r"^DAILY_DATA_MOBO_.*\.xlsb$"), pick_visits()
    print(f"Daily update · {datetime.now():%A %d %b %Y %H:%M} · project root {ROOT}\n")
    warn = []

    def show(title, files, extra=""):
        print(f"{title}")
        if not files:
            print("  ✗ NOT FOUND under raw/")
            warn.append(f"{title}: no file found")
            return
        for i, p in enumerate(files):
            a, d = age(p)
            mark = "→" if i == 0 else " "
            print(f"  {mark} {p}  ·  {a}")
        if extra:
            print("  " + extra)

    show("Supply  · Penjualan ke Outlet (DAILY_DATA_MOBII)", mobii[:3])
    show("Demand  · Transaction ke Pelanggan (DAILY_DATA_MOBO)", mobo[:3])
    show("PJP     · DSE visits (journey plan zip/csv, all ranges are merged)", visits)
    for title, files in (("MOBII", mobii), ("MOBO", mobo)):
        if files and age(files[0])[1] > 0:
            warn.append(f"Newest {title} file is not from today: {files[0]}")
    if visits:
        newest_visit = max(os.path.getmtime(p) for p in visits)
        if (date.today() - datetime.fromtimestamp(newest_visit).date()).days > 0:
            warn.append("Newest PJP visit file is not from today")
        cov = visit_coverage(visits)
        gaps = [d for d in range(min(cov), max(cov) + 1) if d not in cov]
        if gaps:
            warn.append("PJP visit export has no file for day(s) " + ", ".join(f"{d:02d}" for d in gaps)
                        + " (those days are marked n/a, not zero)")
    if warn:
        print("\n⚠ Attention:")
        for w in warn:
            print(f"  - {w}")
    if check_only:
        return 0
    if not (mobii and mobo and visits):
        print("\nAborted: a required raw file is missing.")
        return 1

    py = sys.executable
    env = {"MOBII_SRC": mobii[0], "MOBO_SRC": mobo[0], "VISIT_ZIPS": os.pathsep.join(visits)}
    ga_ok = bool(find(r"^Daily_RGUGA_OUTLET_\d{6}\.xlsb$"))
    steps = [
        ("1/5 Demand · demand feed (MOBO)", [py, "scripts/build_demand_feed.py"]),   # first: Sell-In feed merges SP Injection from it
        ("2/5 Supply · penjualan feed (MOBII + SP Injection)", [py, "scripts/build_penjualan_feed.py"]),
        ("3/5 PJP · DSE visits feed", [py, "scripts/generate_dse_visits_feed.py"]),
        ("4/5 DSE KPI inputs", [py, "scripts/build_dse_kpi_feed.py"]),
    ]
    if ga_ok:   # Gross Add / SSO feed (raw/GA); needs no other feed
        steps.append(("GA · Gross Add / SSO feed (RGUGA)", [py, "scripts/build_ga_feed.py"]))
    if "--no-render" not in sys.argv and shutil.which("node"):
        steps.append(("5/5 Render check", ["node", "scripts/render_check.js"]))
    failed = []
    for label, cmd in steps:
        if run(label, cmd, env) != 0:
            failed.append(label)
            if "KPI" not in label and "Render" not in label:   # feeds below depend on this one
                if label.startswith(("1/5", "3/5")):
                    print("  Stopping: later steps depend on this feed.")
                    break

    print(f"\n{'=' * 78}")
    for name, path in (("Penjualan", "website/data/penjualan_feed.js"), ("Demand", "website/data/demand_feed.js"),
                       ("PJP visits", "website/data/dse_visits_feed.js"), ("DSE KPI", "website/data/dse_kpi_feed.js")):
        if os.path.exists(path):
            print(f"  {name:<11} {path}  ·  written {datetime.fromtimestamp(os.path.getmtime(path)):%d %b %H:%M}")
    print("RESULT:", "OK" if not failed else "FAILED -> " + "; ".join(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
