#!/usr/bin/env python3
"""
daily_update.py  ·  one command for the daily data refresh

    python3 scripts/daily_update.py            # discover newest raw files, rebuild all three feeds
    python3 scripts/daily_update.py --check    # only list what it found (no rebuild)
    python3 scripts/daily_update.py --no-render

Refreshes, in dependency order:
  1. Supply  · Penjualan ke Outlet    DAILY_DATA_MOBII_*.xlsb  -> build_penjualan_feed.py
  2. Demand  · Transaction ke Pelanggan DAILY_DATA_MOBO_<bulan berjalan>.xlsb (+ <bulan lalu> for LMTD / Last FM, + DAILY_DATA_MOBO_SALMO_*.xlsb) -> build_demand_feed.py
  3. PJP     · DSE visits             *_visit_dse_YYYYMM__DD_DD.zip (all ranges) -> generate_dse_visits_feed.py
  4. DSE KPI inputs (needs 1 + 3)     -> build_dse_kpi_feed.py
  +  ENDBAL stock balance (needs 2)   -> build_endbal_feed.py   (newest snapshot only)
  +  GA / SSO (raw/GA)                -> build_ga_feed.py, build_ga_site_feed.py (Site_rguga_daily_outlet_*.csv, when present), then build_kro_feed.py (KRO / Wholesaler catalogue)
  5. Render check of every view       -> node scripts/render_check.js

"Latest" = newest modified time under raw/ (any sub-folder, including OneDrive_* drops).
Files are handed to the builders through MOBII_SRC / MOBO_SRC / VISIT_ZIPS, so a new
download folder needs no code change. Pure stdlib; run from anywhere.
"""
import hashlib
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


STALE_HOURS = 36      # files dropped the previous evening are normal for a morning run


def hours_old(path):
    return (time.time() - os.path.getmtime(path)) / 3600


def age(path):
    ts = datetime.fromtimestamp(os.path.getmtime(path))
    d = (date.today() - ts.date()).days
    tag = "today" if d == 0 else f"{d} day(s) old"
    return f"{ts:%d %b %Y %H:%M} ({tag})", d


def file_md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def pick_visits():
    """All visit zips, copies in OneDrive_* folders folded by (name, size)."""
    seen, out = set(), []
    for p in find(VISIT_RE.pattern):
        sig = (VISIT_RE.match(os.path.basename(p)).group(1).lower(), file_md5(p))   # a renamed or copied report counts once
        if sig not in seen:
            seen.add(sig)
            out.append(p)
    return sorted(out, key=lambda p: (os.path.basename(p).split("__")[1], os.path.basename(p).lower()))


PERIOD_RE = re.compile(r"PERIOD\s*->\s*(\d{2}-[A-Za-z]{3}-\d{4})\s+(\d{2}-[A-Za-z]{3}-\d{4})")


def content_period(path):
    """(first, last) date from the report's own 'PERIOD ->' line, or None."""
    try:
        if path.lower().endswith(".zip"):
            z = zipfile.ZipFile(path)
            fh = z.open(z.namelist()[0])
        else:
            fh = open(path, "rb")
        with fh:
            for i, line in enumerate(fh):
                m = PERIOD_RE.search(line.decode("utf-8", "replace"))
                if m:
                    return datetime.strptime(m.group(1), "%d-%b-%Y"), datetime.strptime(m.group(2), "%d-%b-%Y")
                if i > 15:
                    break
    except Exception:  # noqa: BLE001
        pass
    return None


def visit_coverage(zips, warn=None):
    """Day numbers covered, taken from each report's PERIOD line (file names can be wrong); falls back to the name."""
    days = set()
    for p in zips:
        m = VISIT_RE.match(os.path.basename(p))
        per = content_period(p)
        if per:
            days.update(range(per[0].day, per[1].day + 1))
            if warn is not None and (per[0].day, per[1].day) != (int(m.group(3)), int(m.group(4))):
                warn.append(f"{os.path.basename(p)} is named {m.group(3)}-{m.group(4)} but contains {per[0]:%d %b} to {per[1]:%d %b}: the content is used")
        else:
            days.update(range(int(m.group(3)), int(m.group(4)) + 1))
    return days


def run(label, cmd, env=None):
    print(f"\n{'=' * 78}\n▶ {label}\n  $ {' '.join(cmd)}\n{'=' * 78}", flush=True)
    t0 = time.time()
    rc = subprocess.run(cmd, env={**os.environ, **(env or {})}).returncode
    print(f"  ({time.time() - t0:.0f}s, exit {rc})", flush=True)
    return rc


def unpack_endbal_zips():
    """ENDBAL arrives as endbal_<date>.zip (one CSV pair per snapshot). Extract the CSV members that are not in the folder yet, by base name only."""
    import glob, zipfile
    for zp in glob.glob(os.path.join(RAW, "ENDBAL*", "*.zip")):
        folder = os.path.dirname(zp)
        try:
            with zipfile.ZipFile(zp) as z:
                for m in z.namelist():
                    base = os.path.basename(m)
                    if not base.lower().endswith(".csv") or os.path.exists(os.path.join(folder, base)):
                        continue
                    with z.open(m) as src, open(os.path.join(folder, base), "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    print(f"  ENDBAL: extracted {base} from {os.path.basename(zp)}")
        except zipfile.BadZipFile:
            print(f"  ENDBAL: {zp} is not a valid zip, skipped")


def main():
    check_only = "--check" in sys.argv
    unpack_endbal_zips()
    mobii, visits = find(r"^DAILY_DATA_MOBII_.*\.xlsb$"), pick_visits()
    mobo_all = find(r"^DAILY_DATA_MOBO_\d{6}.*\.xlsb$")      # SALMO files do not match (no month right after MOBO_)
    tags = sorted({re.match(r"^DAILY_DATA_MOBO_(\d{6})", os.path.basename(p)).group(1) for p in mobo_all})
    cur_tag = tags[-1] if tags else None                      # the newest month in the file names is the running month, the one before it is the closed month
    lm_tag = None
    if cur_tag:
        y, m = int(cur_tag[:4]), int(cur_tag[4:])
        lm_tag = f"{y - 1}12" if m == 1 else f"{y}{m - 1:02d}"
    mobo = [p for p in mobo_all if os.path.basename(p).startswith("DAILY_DATA_MOBO_" + cur_tag)] if cur_tag else []
    mobo_lm = [p for p in mobo_all if lm_tag and os.path.basename(p).startswith("DAILY_DATA_MOBO_" + lm_tag)]
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
    show("Demand  · Transaction ke Pelanggan (DAILY_DATA_MOBO, bulan berjalan " + str(cur_tag) + ")", mobo[:3])
    show("Demand  · MOBO bulan lalu " + str(lm_tag) + " (LMTD dan Last FM demand)", mobo_lm[:2])
    if not mobo_lm:
        warn.append(f"No MOBO workbook for {lm_tag}: LMTD and Last FM demand are not refreshed")
    salmo_all = find(r"^DAILY_DATA_MOBO_SALMO_\d{6}.*\.xlsb$")
    salmo = [p for p in salmo_all if cur_tag and ("_SALMO_" + cur_tag) in os.path.basename(p)]
    salmo_lm = [p for p in salmo_all if lm_tag and ("_SALMO_" + lm_tag) in os.path.basename(p)]
    show("Demand  · MOBO_SALMO bulan berjalan " + str(cur_tag) + " (Saldo Mobo ke pelanggan; ikut demand feed, di luar total)", salmo[:2])
    show("Demand  · MOBO_SALMO bulan lalu " + str(lm_tag) + " (baseline SAL: LMTD dan Last FM Saldo Mobo)", salmo_lm[:2])
    show("PJP     · Weekly PJP (permanent beat plan; newest file is used)", find(r"^(Weekly_PJP_.*|.*WEEKLY_PJP.*)\.xlsx$")[:3])
    show("PJP     · DSE visits (journey plan zip/csv, all ranges are merged)", visits)
    endbal = find(r"^(endbal_.*|.*Stock Balance Daily Report.*)\.csv$")
    show("ENDBAL  · Stock Balance Daily Report (only the newest snapshot date is used)", endbal[:4])
    for title, files in (("MOBII", mobii), ("MOBO", mobo)):
        if files and hours_old(files[0]) > STALE_HOURS:
            warn.append(f"Newest {title} file is {hours_old(files[0]):.0f} h old (more than {STALE_HOURS} h): {files[0]}")
    if visits:
        newest_visit = max(os.path.getmtime(p) for p in visits)
        if (time.time() - newest_visit) / 3600 > STALE_HOURS:
            warn.append(f"Newest PJP visit file is {(time.time() - newest_visit) / 3600:.0f} h old (more than {STALE_HOURS} h)")
        cov = visit_coverage(visits, warn)
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
    if mobo_lm:
        env["MOBO_LM_SRC"] = mobo_lm[0]
    if salmo:
        env["MOBO_SALMO_SRC"] = salmo[0]
    if salmo_lm:
        env["MOBO_SALMO_LM_SRC"] = salmo_lm[0]
    ga_ok = bool(find(r"^Daily_RGUGA_OUTLET_\d{6}\.xlsb$"))
    steps = [
        ("1/5 Demand · demand feed (MOBO)", [py, "scripts/build_demand_feed.py"]),   # first: Sell-In feed merges SP Injection from it
        ("2/5 Supply · penjualan feed (MOBII + SP Injection)", [py, "scripts/build_penjualan_feed.py"]),
        ("3/5 PJP · DSE visits feed", [py, "scripts/generate_dse_visits_feed.py"]),
        ("PJP · DSE catalogue (272 DSE of the master file, PROMOTOR TOKO)", [py, "scripts/build_dse_catalogue.py"]),
        ("4/5 DSE KPI inputs", [py, "scripts/build_dse_kpi_feed.py"]),
    ]
    steps.append(("ENDBAL · Stock balance feed (latest snapshot)", [py, "scripts/build_endbal_feed.py"]))
    if find(r"^(Weekly_PJP_.*|.*WEEKLY_PJP.*)\.xlsx$"):
        steps.append(("PJP · Weekly mapping (permanent outlet -> DSE)", [py, "scripts/build_pjp_mapping_feed.py"]))   # needs the penjualan feed (saldo sell-in)
    if ga_ok:   # Gross Add / SSO feed (raw/GA); needs no other feed
        steps.append(("GA · Gross Add / SSO feed (RGUGA)", [py, "scripts/build_ga_feed.py"]))
        if find(r"^(Site_)?rguga_daily_outlet_.*\.csv$"):   # MSISDN-level GA with activation site (counts only reach the feed)
            steps.append(("GA · Site aktivasi vs outlet tagging (kemasukan / pengiriman)", [py, "scripts/build_ga_site_feed.py"]))
        steps.append(("KRO · Wholesaler / KRO catalogue (GA + supply + demand + PJP visits)", [py, "scripts/build_kro_feed.py"]))   # joins the four feeds above, so it runs last
        steps.append(("STOCK · Stok Outlet Over / Par / Low (KRO + ENDBAL)", [py, "scripts/build_stock_feed.py"]))
    if "--no-render" not in sys.argv and shutil.which("node"):
        steps.append(("5/5 Render check", ["node", "scripts/render_check.js"]))
        steps.append(("Audit · scorecard formulas vs feeds", ["node", "scripts/audit_scorecard.js"]))
        steps.append(("Audit · Gross Add page vs feed", ["node", "scripts/audit_ga.js"]))
    failed = []
    for label, cmd in steps:
        if run(label, cmd, env) != 0:
            failed.append(label)
            if label.startswith("1/5"):
                print("  Demand feed NOT rebuilt: the previous demand feed stays in place; the other feeds continue.")
            elif "KPI" not in label and "Render" not in label:   # feeds below depend on this one
                if label.startswith(("2/5", "3/5")):
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
