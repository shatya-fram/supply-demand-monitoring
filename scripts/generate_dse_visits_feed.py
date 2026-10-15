#!/usr/bin/env python3
"""
generate_dse_visits_feed.py  ·  PJP (Permanent Journey Plan) execution feed

Aggregates the MOBI "Journey Plan Summary Detail Report" exports in
raw/MOBI VISIT DSE/ against the master catalogue (website/data/territory_feed.js
and data/catalogues/dse_master_hierarchy.csv) and writes
website/data/dse_visits_feed.js for the "DSE Visits & Beat Plans" view.

Data contract: docs/assessments/pjp_journey_plan_report.md

Grain and definitions
  * One PJP stop            = (brand, schedule date, BEATPLANID, ORG. ID).
                              The raw file has one row per activity (15–23 per stop).
  * Planned stops           = distinct PJP stops.
  * Executed stops (actual) = stops with at least one "Check In" / "Completed" row.
  * Productive stops        = executed stops whose "Sell In" row carries SP or VC quantity > 0, or whose
                              "Balance Transfer" row carries saldo > Rp 50,000 (SALDO_MIN_RP). The older
                              status-only rule ("Sell In" or "Balance Transfer" = Completed) is kept as
                              "flow completed" because the app marks those steps Completed on nearly every
                              check-in (97%) regardless of whether anything was sold.
  * Target hit rate         = executed / planned.
  * Branch and MC           = taken from the MASTER catalogue through the raw MICRO CLUSTER
                              (raw BRANCH uses different names: KOTA BEKASI, SOUTH JAKARTA,
                              NORTH/SOUTH KARAWANG). Stops whose MC is not in the master
                              fall back to a branch alias, otherwise they are kept in an
                              explicit "OUTSIDE MASTER TERRITORY" bucket so totals reconcile.
  * DSE view                = per field operator (OPERATOR ID), folded to one person when the
                              IM3 and 3ID logins belong to the same master DSE.
  * Outlet / site inactivity= master outlets only, matched on SALDOMOBO ORG ID / ORG. ID.
Pure stdlib, no pandas. Run from the project root.
"""

import contextlib
import csv
import hashlib
import io
import json
import os
import re
import statistics
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

MASTER_PATH = "website/data/territory_feed.js"
DSE_MASTER_PATH = "data/catalogues/dse_master_hierarchy.csv"
SELLIN_PATH = "data/processed/sellin_feed.json"
OUTPUT_PATH = "website/data/dse_visits_feed.js"
VISIT_ZIP_RE = re.compile(r"^(3id|im3)_visit_dse_(\d{6})__(\d{2})_(\d{2})\.(?:zip|csv)$", re.I)


PERIOD_RE = re.compile(r"PERIOD\s*->\s*(\d{2}-[A-Za-z]{3}-\d{4})\s+(\d{2}-[A-Za-z]{3}-\d{4})")


def content_period(path):
    """(first, last) schedule date named by the report's own 'PERIOD ->' line. The file NAME can be wrong
    (15 Oct 2026: `*__14_14.zip` held 15-Oct), so coverage is taken from the content, not the name."""
    try:
        with contextlib.ExitStack() as st:
            if path.lower().endswith(".csv"):
                fh = st.enter_context(open(path, "rb"))
            else:
                z = st.enter_context(zipfile.ZipFile(path, "r"))
                fh = st.enter_context(z.open(z.namelist()[0]))
            for i, line in enumerate(io.TextIOWrapper(fh, encoding="utf-8", errors="replace")):
                m = PERIOD_RE.search(line)
                if m:
                    return datetime.strptime(m.group(1), "%d-%b-%Y"), datetime.strptime(m.group(2), "%d-%b-%Y")
                if i > 15:
                    break
    except Exception:  # noqa: BLE001
        pass
    return None


def file_md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def discover_visit_zips():
    """Every MOBI journey-plan zip under raw/ named <brand>_visit_dse_YYYYMM__DD_DD.zip.
    The same export is often copied into a OneDrive_* folder; copies are folded by (name, size).
    VISIT_ZIPS (os.pathsep-separated) overrides the discovery."""
    env = os.environ.get("VISIT_ZIPS")
    paths = [p for p in env.split(os.pathsep) if p] if env else []
    if not paths:
        for dp, _dn, fn in os.walk("raw"):
            paths += [os.path.join(dp, f) for f in fn if VISIT_ZIP_RE.match(f)]
    found, seen = [], set()
    for p in sorted(paths):
        m = VISIT_ZIP_RE.match(os.path.basename(p))
        if not m:
            continue
        sig = (m.group(1).lower(), file_md5(p))          # same report copied or renamed (e.g. 14_14 -> 15_15) counts once
        if sig in seen:
            print(f"  NOTE: {os.path.basename(p)} is an exact copy of a file already read; skipped")
            continue
        seen.add(sig)
        y, mo, d1, d2 = int(m.group(2)[:4]), int(m.group(2)[4:]), int(m.group(3)), int(m.group(4))
        per = content_period(p)
        if per:
            if (per[0].year, per[0].month, per[0].day, per[1].day) != (y, mo, d1, d2):
                print(f"  WARNING: {os.path.basename(p)} is named {d1:02d}-{d2:02d} but its PERIOD is {per[0]:%d-%b-%Y} to {per[1]:%d-%b-%Y}; using the content")
            y, mo, d1, d2 = per[0].year, per[0].month, per[0].day, per[1].day
        found.append((m.group(1).upper(), p, y, mo, d1, d2))
    return found


VISIT_ZIPS = discover_visit_zips()
if not VISIT_ZIPS:
    raise SystemExit("No *_visit_dse_*.zip found under raw/")
FILES = [(b, p) for b, p, *_ in VISIT_ZIPS]
_year, _month = VISIT_ZIPS[0][2], VISIT_ZIPS[0][3]
_last_day = max(z[5] for z in VISIT_ZIPS)
_covered = {d for z in VISIT_ZIPS for d in range(z[4], z[5] + 1)}   # day numbers named by the export files
_fmt = lambda d: datetime(_year, _month, d).strftime("%d-%b-%Y")

PERIOD_START, PERIOD_END = _fmt(1), _fmt(_last_day)
DATES_LAST_3D = {_fmt(d) for d in range(max(1, _last_day - 2), _last_day + 1)}
DATES_LAST_7D = {_fmt(d) for d in range(max(1, _last_day - 6), _last_day + 1)}
W1_DAYS = [_fmt(d) for d in range(1, min(4, _last_day) + 1)]
W2_DAYS = sorted(DATES_LAST_7D)
DAYS = [_fmt(d) for d in range(1, _last_day + 1)]   # every calendar day counts
# Days inside the period that no export file covers: shown as "data not available", never as a zero-execution day.
MISSING_DAYS = [_fmt(d) for d in range(1, _last_day + 1) if d not in _covered]
N_BUSINESS_DAYS = sum(1 for d in range(1, _last_day + 1) if d in _covered and datetime(_year, _month, d).weekday() != 6)   # Sundays and days without data excluded

OUTSIDE = "OUTSIDE MASTER TERRITORY"
SALDO_MIN_RP = 50000          # a balance transfer counts as productive only above this amount
# Raw BRANCH names that are the same territory as a master branch (used only when the raw MC is unknown).
BRANCH_ALIAS = {
    "KOTA BEKASI": "BEKASI",
    "SOUTH JAKARTA": "SOUTH JAKARTA DEPOK",
    "NORTH KARAWANG": "KARAWANG",
    "SOUTH KARAWANG": "KARAWANG",
}
PLACEHOLDER_NAME = re.compile(r"^(\d+(\.0)?|0\.0|DSEIN\d+|N/?A|UNASSIGNED|)$", re.I)


def norm_id(v):
    v = str(v or "").strip().upper()
    return v[:-2] if v.endswith(".0") else v


def num(x):
    """MOBI numbers come as '143.000,00' or '52000'."""
    x = str(x or "").strip()
    if not x:
        return 0.0
    if "," in x:
        x = x.replace(".", "").replace(",", ".")
    try:
        return float(x)
    except ValueError:
        return 0.0


def format_dur(sec):
    if not sec or sec <= 0:
        return "0m 00s"
    return f"{int(sec // 60)}m {int(sec % 60):02d}s"


def parse_d(d):
    try:
        return datetime.strptime(d, "%d-%b-%Y")
    except Exception:
        return None


# --------------------------------------------------------------------------------------
print("Step 1: Loading master catalogue...")
with open(MASTER_PATH, "r", encoding="utf-8") as f:
    for line in f:
        if "var feed = " in line:
            feed = json.loads(line.split("var feed = ", 1)[1].rstrip(";\n "))
            break
master_outlets = feed["outlets"]

hoa_map, dso_map, mc_branch = {}, {}, {}
for h in feed.get("hierarchy", []):
    if h.get("branch") and h.get("hoa_leader"):
        hoa_map[h["branch"]] = h["hoa_leader"]
    for m in h.get("micro_clusters", []):
        if m.get("micro_cluster"):
            mc_branch[m["micro_cluster"]] = h.get("branch")
            if m.get("dso_leader"):
                dso_map[m["micro_cluster"]] = m["dso_leader"]

im3_to_key, thrid_to_key, out_meta = {}, {}, {}
site_outlets, branch_outlets, mc_outlets, dse_outlets = defaultdict(set), defaultdict(set), defaultdict(set), defaultdict(set)
code_outlets = defaultdict(set)          # DSE login code (IM3 or 3ID) -> assigned master outlets
code_pairs = {}                          # IM3 code -> 3ID code seen on the same outlet
code_name = {}                           # login code -> dse_name from the territory feed
ADHOC_KEYS = set()                       # master outlets with no DSE: ad-hoc visits, outside the PJP base (owner, 15 Oct 2026)
for o in master_outlets:
    k = o["outlet_key"]
    br = str(o.get("branch") or "").strip()
    mc = str(o.get("micro_cluster") or "").strip()
    site = str(o.get("site_nbs") or "").strip()
    dse = norm_id(o.get("dse_name") or "UNASSIGNED")
    if br and o.get("hoa_leader"):
        hoa_map.setdefault(br, o["hoa_leader"])
    if mc and o.get("dso_leader"):
        dso_map.setdefault(mc, o["dso_leader"])
    if mc and br:
        mc_branch.setdefault(mc, br)
    if dse == "UNASSIGNED":
        ADHOC_KEYS.add(k)
        for _id, _map in ((norm_id(o.get("outlet_id_im3")), im3_to_key), (norm_id(o.get("outlet_id_3id")), thrid_to_key)):
            if _id:
                _map[_id] = k
                _map[_id.lstrip("0")] = k
        continue                          # not in out_meta / sites / branch / MC / DSE bases: not measured as PJP
    out_meta[k] = {
        "outlet_key": k, "name": o.get("outlet_name") or "", "site": site, "branch": br, "mc": mc, "dse": dse,
        "kec": str(o.get("kecamatan") or "").strip() or "—",
        "hoa": str(o.get("hoa_leader") or "").strip() or "—",
        "dso": str(o.get("dso_leader") or "").strip() or "—",
    }
    im3 = norm_id(o.get("outlet_id_im3"))
    thrid = norm_id(o.get("outlet_id_3id"))
    if im3:
        im3_to_key[im3] = k
        im3_to_key[im3.lstrip("0")] = k
    if thrid:
        thrid_to_key[thrid] = k
        thrid_to_key[thrid.lstrip("0")] = k
    if site and site != "PENDING-NBS" and mc:
        site_outlets[f"{site}::{mc}"].add(k)
    if br:
        branch_outlets[br].add(k)
    if mc:
        mc_outlets[mc].add(k)
    dse_outlets[dse].add(k)
    c_im3, c_3id = norm_id(o.get("dse_code_im3")), norm_id(o.get("dse_code_3id"))
    for c in (c_im3, c_3id):
        if c:
            code_outlets[c].add(k)
            if not PLACEHOLDER_NAME.match(str(o.get("dse_name") or "")):
                code_name.setdefault(c, str(o["dse_name"]).strip())
    if c_im3 and c_3id:
        code_pairs.setdefault(c_im3, c_3id)
print(f"  {len(ADHOC_KEYS):,} master outlets without a DSE are treated as ad-hoc (non-PJP) and left out of the PJP base.")
master_branches = set(branch_outlets)
master_mcs = set(mc_outlets)
print(f"Catalogue indexed: {len(out_meta):,} outlets, {len(site_outlets):,} DSO-mapped sites, "
      f"{len(master_branches)} branches, {len(master_mcs)} MCs, {len(code_outlets)} DSE login codes.")

# DSE master hierarchy: login code -> person
persons = {}                 # person_id -> dict
code_person = {}             # login code -> person_id


def add_person(pid, **kw):
    if pid not in persons:
        persons[pid] = {"person_id": pid, "dse_name": "", "dso_leader": "—", "hoa_leader": "—",
                        "branch_master": "", "mc_master": "", "in_master": False, "codes": set()}
    persons[pid].update({k: v for k, v in kw.items() if v})
    return persons[pid]


if os.path.exists(DSE_MASTER_PATH):
    with open(DSE_MASTER_PATH, encoding="utf-8") as f:
        for i, r in enumerate(csv.DictReader(f)):
            pid = f"M{i:03d}"
            add_person(pid, dse_name=r["nama_dse"].strip(), dso_leader=r["nama_dso"].strip(), hoa_leader=r["nama_hoa"].strip(),
                       branch_master=r["branch"].strip(), mc_master=r["micro_cluster"].strip(), in_master=True)
            for c in (norm_id(r["dse_id_im3"]), norm_id(r["dse_id_3id"])):
                if c:
                    code_person[c] = pid
                    persons[pid]["codes"].add(c)
                    if c.endswith("3ID"):
                        code_person.setdefault(c[:-3], pid)       # raw 3ID logins sometimes omit the suffix
# DSEs that the outlet master maps outlets to but the hierarchy catalogue does not list (they carry their login code as
# name, e.g. DSEIN124): add them as master people so their journey plans land on them instead of "not in master".
_by_name = defaultdict(lambda: {"codes": set(), "outlets": []})
for o in master_outlets:
    nm = str(o.get("dse_name") or "").strip()
    if not nm or nm.upper().startswith("UNASSIGNED"):
        continue
    for c in (norm_id(o.get("dse_code_im3")), norm_id(o.get("dse_code_3id"))):
        if c:
            _by_name[nm]["codes"].add(c)
    _by_name[nm]["outlets"].append(o["outlet_key"])
_added = 0
for nm, e in sorted(_by_name.items()):
    if not e["codes"] or any(c in code_person for c in e["codes"]):
        continue
    mode = lambda key: max(set(out_meta[k][key] for k in e["outlets"]), key=[out_meta[k][key] for k in e["outlets"]].count)
    pid = f"T{_added:03d}"
    add_person(pid, dse_name=nm, dso_leader=mode("dso"), hoa_leader=mode("hoa"), branch_master=mode("branch"), mc_master=mode("mc"), in_master=True)
    for c in e["codes"]:
        code_person[c] = pid
        persons[pid]["codes"].add(c)
        if c.endswith("3ID"):
            code_person.setdefault(c[:-3], pid)
    _added += 1
print(f"DSE master: {len(persons)} people ({_added} added from the outlet master), {len(code_person)} login codes.")


def person_for(brand, op):
    """Return the person id for a raw operator login, creating one if the master does not know it."""
    u = norm_id(op)
    cands = [u, u + "3ID"] if brand == "3ID" else [u]
    for c in cands:
        if c in code_person:
            return code_person[c]
    # Pair IM3/3ID logins through outlets that carry both codes
    partner = code_pairs.get(u) or next((a for a, b in code_pairs.items() if b == u), None)
    if partner and partner in code_person:
        pid = code_person[partner]
    else:
        pid = f"O:{brand}:{u or 'BLANK'}"
        add_person(pid, dse_name=code_name.get(u, ""))
    code_person[u] = pid
    persons[pid]["codes"].add(u)
    return pid


# --------------------------------------------------------------------------------------
print("Step 2: Streaming MOBI journey plan logs...")


def is_promo(op, optype):
    """Promotors (operator type Promotor, login PRJAYAIN##) are not measured as DSE PJP productivity."""
    return str(optype).strip().lower().startswith("promotor") or norm_id(op).startswith("PRJAYAIN")


def new_stat():
    return {"planned": 0, "actual": 0, "productive": 0, "prod_phys": 0, "prod_saldo": 0, "flow": 0, "im3": 0, "3id": 0,
            "planned_im3": 0, "planned_3id": 0, "sellin": 0, "balance": 0, "sp_qty": 0, "vc_qty": 0, "saldo_rp": 0.0,
            "durations": [], "deviations": []}


x_stats = {"promo": None, "adhoc": None}      # visits left out of the PJP measures: promotors and ad-hoc visits at unassigned outlets
daily_stats = defaultdict(new_stat)
branch_stats = defaultdict(new_stat)
mc_stats = defaultdict(new_stat)
op_stats = defaultdict(new_stat)             # person_id -> stat
op_brand = defaultdict(lambda: defaultdict(new_stat))   # person_id -> brand -> stat
op_info = {}                                 # person_id -> {types, raw_branch, mc, ...}
op_days_planned = defaultdict(set)
op_days_active = defaultdict(set)
op_outlets_planned = defaultdict(set)        # person -> (brand, org id)
op_outlets_visited = defaultdict(set)
op_master_visited = defaultdict(set)         # person -> master outlet keys visited
x_stats["promo"], x_stats["adhoc"] = new_stat(), new_stat()
adhoc_outlets_visited = set()                # unassigned master outlets with a check-in
adhoc_by_person = defaultdict(lambda: {"planned": 0, "actual": 0})
promo_persons = set()


def stat_sets(s, sched, brand, brand_level=False):
    """Which stat blocks a stop feeds: PJP measures (day, branch, MC) only for normal stops; the person block unless it is an
    ad-hoc stop (a DSE's visit at an unassigned outlet); the excluded-visits block for the two excluded kinds."""
    x = s["x"]
    t = []
    if not x:
        t += [daily_stats[sched], branch_stats[s["br"]], mc_stats[s["mc"]]]
    else:
        t.append(x_stats[x])
    if x != "adhoc":
        t.append(op_stats[s["pid"]])
        if brand_level:
            t.append(op_brand[s["pid"]][brand])
    return t

# Daily series per entity for the calendar heatmap: [planned, executed, planned_im3, exec_im3, planned_3id, exec_3id]
daily_by = {lvl: defaultdict(lambda: defaultdict(lambda: [0, 0, 0, 0, 0, 0])) for lvl in ("br", "mc", "op")}
op_outlet_days = defaultdict(dict)           # person -> (brand, org id) -> {n, mc, k, d: {date: 'p' planned | 'x' executed}}

stops = {}                                   # stop key -> dict(flags)
raw_branch_counter = Counter()
outside_rows = Counter()                     # (raw branch, raw mc) -> planned
outlet_visit_dates = defaultdict(set)
outlet_visit_brands = defaultdict(set)
outlet_checkin_count = Counter()

for brand, zpath in FILES:
    print(f"  Reading {brand} from {zpath}...")
    with contextlib.ExitStack() as stack:
        if zpath.lower().endswith(".csv"):
            fh = stack.enter_context(open(zpath, "rb"))
        else:
            z = stack.enter_context(zipfile.ZipFile(zpath, "r"))
            fh = stack.enter_context(z.open(z.namelist()[0]))
        if True:
            text = io.TextIOWrapper(fh, encoding="utf-8", errors="replace")
            col = None
            for line in text:
                if line.startswith("SCHEDULE DATE"):
                    header = [c.strip() for c in line.rstrip("\n").split("|")]
                    col = {c: i for i, c in enumerate(header)}
                    break
            if col is None:
                raise SystemExit(f"Header not found in {zpath}")
            c_sched, c_br, c_mc, c_bp = col["SCHEDULE DATE"], col["BRANCH"], col["MICRO CLUSTER"], col["BEATPLANID"]
            c_org, c_mobo, c_optype, c_op = col["ORG. ID"], col["SALDOMOBO ORG ID"], col["OPERATOR TYPE"], col["OPERATOR ID"]
            c_act, c_st, c_dev, c_dur = col["ACTIVITY NAME"], col["ACTIVITY STATUS"], col["DEVIATION DISTANCE(IN KM)"], col["VISIT DURATION"]
            c_name = col["ORG NAME"]
            c_sp, c_vc, c_oth = col["TOTAL SALES SP QTY"], col["TOTAL SALES VC  QTY"], col["TOTAL SALES OTHER PRODUCT"]
            need = max(c_sched, c_br, c_mc, c_bp, c_org, c_mobo, c_optype, c_op, c_act, c_st)
            for line in text:
                r = line.rstrip("\n").split("|")
                if len(r) <= need:
                    continue
                sched = r[c_sched].strip()
                if not parse_d(sched):
                    continue
                raw_br, raw_mc = r[c_br].strip(), r[c_mc].strip()
                org, mobo, op = r[c_org].strip(), r[c_mobo].strip(), r[c_op].strip()
                act, st = r[c_act].strip().lower(), r[c_st].strip().lower()
                skey = (brand, sched, r[c_bp].strip(), org)

                if skey not in stops:
                    # Territory normalisation through the master MC
                    if raw_mc in master_mcs:
                        mc, br = raw_mc, mc_branch.get(raw_mc) or BRANCH_ALIAS.get(raw_br, raw_br)
                    else:
                        mc = OUTSIDE
                        br = raw_br if raw_br in master_branches else BRANCH_ALIAS.get(raw_br, OUTSIDE)
                    if br not in master_branches:
                        br = OUTSIDE
                    if mc == OUTSIDE:
                        outside_rows[(raw_br or "(blank)", raw_mc or "(blank)")] += 1
                    pid = person_for(brand, op)
                    info = op_info.setdefault(pid, {"types": Counter(), "mcs": Counter(), "brs": Counter(), "raw_brs": Counter(), "logins": set()})
                    info["types"][r[c_optype].strip() or "Canvasser"] += 1
                    info["mcs"][mc] += 1
                    info["brs"][br] += 1
                    info["raw_brs"][raw_br] += 1
                    info["logins"].add(f"{brand}:{norm_id(op)}")
                    # Master outlet match: 3ID logs carry the 3ID outlet id in ORG. ID, IM3 logs the IM3 id;
                    # SALDOMOBO ORG ID is tried as well because the master keys are MOBO ids for 3ID.
                    if brand == "IM3":
                        k = im3_to_key.get(norm_id(org)) or im3_to_key.get(norm_id(mobo)) or im3_to_key.get(org.lstrip("0"))
                    else:
                        k = thrid_to_key.get(norm_id(mobo)) or thrid_to_key.get(norm_id(org)) or thrid_to_key.get(mobo.lstrip("0"))
                    xk = "promo" if is_promo(op, r[c_optype]) else ("adhoc" if k in ADHOC_KEYS else None)
                    stops[skey] = {"br": br, "mc": mc, "pid": pid, "k": k, "ci": False, "si": False, "bt": False, "sp": 0.0, "vc": 0.0, "saldo": 0.0, "x": xk}
                    raw_branch_counter[raw_br] += 1
                    if xk == "promo":
                        promo_persons.add(pid)
                    pbk = "planned_im3" if brand == "IM3" else "planned_3id"
                    for S in stat_sets(stops[skey], sched, brand, True):
                        S["planned"] += 1
                        S[pbk] += 1
                    if xk == "adhoc":
                        adhoc_by_person[pid]["planned"] += 1
                    else:
                        op_days_planned[pid].add(sched)
                        op_outlets_planned[pid].add((brand, org))
                        bi = 2 if brand == "IM3" else 4
                        for lvl, key in ((("br", br), ("mc", mc)) if not xk else ()) + (("op", pid),):
                            cell = daily_by[lvl][key][sched]
                            cell[0] += 1
                            cell[bi] += 1
                        od = op_outlet_days[pid].setdefault((brand, org), {"n": r[c_name].strip() if len(r) > c_name else "", "mc": mc, "k": k, "d": {}})
                        od["d"].setdefault(sched, "p")

                s = stops[skey]
                if st != "completed":
                    continue
                if act == "check in":
                    if not s["ci"]:
                        s["ci"] = True
                        bk = "im3" if brand == "IM3" else "3id"
                        for S in stat_sets(s, sched, brand, True):
                            S["actual"] += 1
                            S[bk] += 1
                        k = s["k"]
                        if s["x"] == "adhoc":
                            adhoc_by_person[s["pid"]]["actual"] += 1
                            if k:
                                adhoc_outlets_visited.add(k)
                        else:
                            op_days_active[s["pid"]].add(sched)
                            op_outlets_visited[s["pid"]].add((brand, org))
                            bi = 2 if brand == "IM3" else 4
                            for lvl, key in ((("br", s["br"]), ("mc", s["mc"])) if not s["x"] else ()) + (("op", s["pid"]),):
                                cell = daily_by[lvl][key][sched]
                                cell[1] += 1
                                cell[bi + 1] += 1
                            op_outlet_days[s["pid"]][(brand, skey[3])]["d"][sched] = "x"
                            if k and not s["x"]:            # a promotor visit does not count as PJP coverage of the outlet
                                outlet_visit_dates[k].add(sched)
                                outlet_visit_brands[k].add(brand)
                                outlet_checkin_count[k] += 1
                                op_master_visited[s["pid"]].add(k)
                        dev_str = r[c_dev].strip() if len(r) > c_dev else ""
                        dur_str = r[c_dur].strip() if len(r) > c_dur else ""
                        if dev_str:
                            try:
                                dev = float(dev_str.replace(",", ".")) * 1000.0
                                if 0 <= dev <= 100000:
                                    for S in stat_sets(s, sched, brand):
                                        S["deviations"].append(dev)
                            except ValueError:
                                pass
                        if dur_str and ":" in dur_str:
                            try:
                                p = [int(x) for x in dur_str.split(":")]
                                secs = p[0] * 60 + p[1] if len(p) == 2 else p[0] * 3600 + p[1] * 60 + p[2]
                                if 0 < secs < 28800:
                                    for S in stat_sets(s, sched, brand):
                                        S["durations"].append(secs)
                            except ValueError:
                                pass
                elif act == "sell in":
                    s["si"] = True
                    s["sp"] += num(r[c_sp] if len(r) > c_sp else "")
                    s["vc"] += num(r[c_vc] if len(r) > c_vc else "")
                elif act == "balance transfer":
                    s["bt"] = True
                    s["saldo"] += num(r[c_oth] if len(r) > c_oth else "")

# Productivity is decided per stop once all its activity rows are in.
prod_without_ci = 0
for (brand, sched, _bp, _org), s in stops.items():
    phys = s["sp"] > 0 or s["vc"] > 0
    sal = s["saldo"] > SALDO_MIN_RP
    flow = s["si"] or s["bt"]
    if not s["ci"]:
        if phys or sal:
            prod_without_ci += 1
        continue
    for S in stat_sets(s, sched, brand, True):
        if flow: S["flow"] += 1
        if s["si"]: S["sellin"] += 1
        if s["bt"]: S["balance"] += 1
        if phys: S["prod_phys"] += 1
        if sal: S["prod_saldo"] += 1
        if phys or sal: S["productive"] += 1
        S["sp_qty"] += s["sp"]; S["vc_qty"] += s["vc"]; S["saldo_rp"] += s["saldo"]
pjp_stops = {k_: v_ for k_, v_ in stops.items() if not v_["x"]}      # promotor and ad-hoc visits are not PJP measures
total_planned = len(pjp_stops)
total_actual = sum(1 for s in pjp_stops.values() if s["ci"])
total_productive = sum(1 for s in pjp_stops.values() if s["ci"] and (s["sp"] > 0 or s["vc"] > 0 or s["saldo"] > SALDO_MIN_RP))
total_flow = sum(1 for s in pjp_stops.values() if s["ci"] and (s["si"] or s["bt"]))
print(f"  Stops: planned={total_planned:,} executed={total_actual:,} ({total_actual / total_planned * 100:.1f}%), "
      f"productive={total_productive:,} (qty/saldo rule), flow-completed={total_flow:,}, sales-without-check-in={prod_without_ci:,}")
print(f"  Outside master territory: {sum(outside_rows.values()):,} planned stops in {len(outside_rows)} raw branch/MC pairs")

# --------------------------------------------------------------------------------------
print("Step 3: Recency of master outlets and DSO-mapped sites...")
total_master_outlets = len(out_meta)
visited_keys_mtd = set(outlet_visit_dates)
visited_keys_7d = {k for k, d in outlet_visit_dates.items() if d & DATES_LAST_7D}
visited_keys_3d = {k for k, d in outlet_visit_dates.items() if d & DATES_LAST_3D}
sites_with_visit = {"mtd": set(), "7d": set(), "3d": set()}
for s, outs in site_outlets.items():
    if outs & visited_keys_mtd: sites_with_visit["mtd"].add(s)
    if outs & visited_keys_7d: sites_with_visit["7d"].add(s)
    if outs & visited_keys_3d: sites_with_visit["3d"].add(s)
total_sites = len(site_outlets)


def daily_series(lvl, key):
    inner = daily_by[lvl].get(key, {})
    return [list(inner[d]) if d in inner else [0, 0, 0, 0, 0, 0] for d in DAYS]


def hybrid(keys):
    return sum(1 for k in keys if outlet_visit_brands[k] >= {"IM3", "3ID"})


def stat_block(S):
    pl, ac = S["planned"], S["actual"]
    return {
        "planned_visits": pl, "actual_visits": ac, "target_hit_rate": round(ac / pl * 100, 1) if pl else 0.0,
        "planned_im3": S["planned_im3"], "planned_3id": S["planned_3id"], "im3_visits": S["im3"], "3id_visits": S["3id"],
        "productive_visits": S["productive"], "productive_rate": round(S["productive"] / ac * 100, 1) if ac else 0.0,
        "productive_phys": S["prod_phys"], "productive_saldo": S["prod_saldo"],
        "flow_completed": S["flow"], "flow_rate": round(S["flow"] / ac * 100, 1) if ac else 0.0,
        "sellin_visits": S["sellin"], "balance_visits": S["balance"],
        "sp_qty": int(S["sp_qty"]), "vc_qty": int(S["vc_qty"]), "saldo_rp": int(S["saldo_rp"]),
        "avg_duration": format_dur(statistics.mean(S["durations"]) if S["durations"] else 0),
        "avg_duration_sec": round(statistics.mean(S["durations"]), 0) if S["durations"] else 0,
        "median_deviation_m": round(statistics.median(S["deviations"]), 0) if S["deviations"] else 0,
    }


def coverage_block(outs, mc_for_site=None):
    tot = len(outs)
    vis = len(outs & visited_keys_mtd)
    sites = {f"{out_meta[k]['site']}::{mc_for_site or out_meta[k]['mc']}" for k in outs
             if out_meta[k]["site"] and out_meta[k]["site"] != "PENDING-NBS" and (mc_for_site or out_meta[k]["mc"])}
    return {
        "total_outlets": tot, "visited_outlets_mtd": vis, "not_visited_mtd": tot - vis,
        "not_visited_7d": tot - len(outs & visited_keys_7d), "not_visited_3d": tot - len(outs & visited_keys_3d),
        "coverage_rate": round(vis / tot * 100, 1) if tot else 0.0, "hybrid_outlets": hybrid(outs & visited_keys_mtd),
        "total_sites": len(sites), "sites_zero_mtd": len(sites) - len(sites & sites_with_visit["mtd"]),
        "sites_zero_7d": len(sites) - len(sites & sites_with_visit["7d"]), "sites_zero_3d": len(sites) - len(sites & sites_with_visit["3d"]),
    }


# --------------------------------------------------------------------------------------
print("Step 4: Daily timeline, Area (branch) and Micro Cluster views...")
daily_timeline = []
for d in sorted(daily_stats, key=lambda x: parse_d(x)):
    row = {"date": d, "day": parse_d(d).strftime("%a"), "available": True}
    sb = stat_block(daily_stats[d])
    row.update({"planned": sb["planned_visits"], "actual": sb["actual_visits"], "target_hit_rate": sb["target_hit_rate"],
                "planned_im3": sb["planned_im3"], "planned_3id": sb["planned_3id"], "im3": sb["im3_visits"], "3id": sb["3id_visits"],
                "productive": sb["productive_visits"], "productive_rate": sb["productive_rate"], "productive_phys": sb["productive_phys"], "productive_saldo": sb["productive_saldo"], "flow_rate": sb["flow_rate"],
                "avg_duration": sb["avg_duration"], "median_deviation_m": sb["median_deviation_m"]})
    daily_timeline.append(row)
for d in MISSING_DAYS:
    daily_timeline.append({"date": d, "day": parse_d(d).strftime("%a"), "available": False})
daily_timeline.sort(key=lambda r: parse_d(r["date"]))

branch_list = []
for br, outs in sorted(branch_outlets.items(), key=lambda x: len(x[1]), reverse=True):
    row = {"branch": br, "hoa_leader": hoa_map.get(br, "N/A"), "outside": False}
    row.update(coverage_block(outs))
    row.update(stat_block(branch_stats[br]))
    row["daily"] = daily_series("br", br)
    branch_list.append(row)
if branch_stats[OUTSIDE]["planned"]:
    row = {"branch": OUTSIDE, "hoa_leader": "—", "outside": True}
    row.update(coverage_block(set()))
    row.update(stat_block(branch_stats[OUTSIDE]))
    row["daily"] = daily_series("br", OUTSIDE)
    branch_list.append(row)

mc_list = []
for mc, outs in sorted(mc_outlets.items(), key=lambda x: len(x[1]), reverse=True):
    row = {"micro_cluster": mc, "branch": mc_branch.get(mc, "N/A"), "dso_leader": dso_map.get(mc, "N/A"), "outside": False}
    row.update(coverage_block(outs, mc_for_site=mc))
    row.update(stat_block(mc_stats[mc]))
    row["daily"] = daily_series("mc", mc)
    mc_list.append(row)
if mc_stats[OUTSIDE]["planned"]:
    row = {"micro_cluster": OUTSIDE, "branch": OUTSIDE, "dso_leader": "—", "outside": True}
    row.update(coverage_block(set()))
    row.update(stat_block(mc_stats[OUTSIDE]))
    row["daily"] = daily_series("mc", OUTSIDE)
    mc_list.append(row)

# --------------------------------------------------------------------------------------
print("Step 5: DSE (field operator) view...")
dse_list = []
for pid, S in op_stats.items():
    P = persons[pid]
    info = op_info[pid]
    mc = info["mcs"].most_common(1)[0][0]
    br = info["brs"].most_common(1)[0][0]
    if mc == OUTSIDE and P["mc_master"] in master_mcs:
        mc, br = P["mc_master"], mc_branch.get(P["mc_master"], br)
    codes = sorted(c for c in P["codes"] if c)
    assigned = set()
    for c in codes:
        assigned |= code_outlets.get(c, set())
        if c.endswith("3ID"):
            assigned |= code_outlets.get(c[:-3], set())
    name = P["dse_name"] or next((code_name[c] for c in codes if c in code_name), "") or (codes[0] if codes else pid)
    types = [t for t, _ in info["types"].most_common()]
    row = {
        "person_id": pid, "dse_name": name, "in_master": bool(P["in_master"]),
        "is_promotor": pid in promo_persons,        # promotor (PRJAYAIN##): visits are shown but not measured as PJP productivity
        "adhoc_planned": adhoc_by_person[pid]["planned"], "adhoc_actual": adhoc_by_person[pid]["actual"],   # ad-hoc visits at unassigned outlets (not PJP)
        "logins": sorted(info["logins"]), "operator_type": types[0], "operator_types": types,
        "branch": br, "micro_cluster": mc, "raw_branch": info["raw_brs"].most_common(1)[0][0],
        "dso_leader": P["dso_leader"] if P["in_master"] else dso_map.get(mc, "—"),
        "hoa_leader": P["hoa_leader"] if P["in_master"] else hoa_map.get(br, "—"),
        "days_planned": len(op_days_planned[pid]), "days_active": len(op_days_active[pid]),
        "outlets_planned": len(op_outlets_planned[pid]), "outlets_visited": len(op_outlets_visited[pid]),
        "visits_per_active_day": round(S["actual"] / len(op_days_active[pid]), 1) if op_days_active[pid] else 0.0,
        "assigned_outlets": len(assigned), "assigned_visited_mtd": len(assigned & visited_keys_mtd),
        "assigned_not_visited_mtd": len(assigned - visited_keys_mtd),
        "assigned_not_visited_7d": len(assigned - visited_keys_7d), "assigned_not_visited_3d": len(assigned - visited_keys_3d),
        "assigned_coverage_rate": round(len(assigned & visited_keys_mtd) / len(assigned) * 100, 1) if assigned else None,
        "brands": {b: {"planned": bs["planned"], "actual": bs["actual"], "productive": bs["productive"]} for b, bs in op_brand[pid].items()},
    }
    row.update(stat_block(S))
    row["total_checkins"] = row["actual_visits"]
    row["daily"] = daily_series("op", pid)
    row["outlets"] = sorted(
        [{"id": f"{b}:{org}", "b": b, "n": od["n"], "mc": od["mc"], "k": od["k"], "d": "".join(od["d"].get(d, ".") for d in DAYS)}
         for (b, org), od in op_outlet_days[pid].items()],
        key=lambda o: (o["n"].upper(), o["id"]))
    dse_list.append(row)
dse_list.sort(key=lambda r: (-r["planned_visits"], r["dse_name"]))
ops_summary = {
    "total": len(dse_list),
    "in_master": sum(1 for d in dse_list if d["in_master"]),
    "canvassers": sum(1 for d in dse_list if not d["is_promotor"]),
    "promotors": sum(1 for d in dse_list if d["is_promotor"]),
    "hybrid_logins": sum(1 for d in dse_list if len({l.split(":")[0] for l in d["logins"]}) > 1),
    "active": sum(1 for d in dse_list if d["actual_visits"]),
    "zero_execution": sum(1 for d in dse_list if d["planned_visits"] and not d["actual_visits"]),
}
print(f"  Operators: {ops_summary}")

# --------------------------------------------------------------------------------------
print("Step 6: Inactivity lists (outlets and DSO-mapped sites)...")


def last_visit_of(dates):
    ds = [x for x in (parse_d(d) for d in dates) if x]
    return max(ds).strftime("%d-%b-%Y") if ds else None


def window_of(dates):
    if not dates: return "mtd"
    if not (dates & DATES_LAST_7D): return "7d"
    if not (dates & DATES_LAST_3D): return "3d"
    return None


unvisited_outlets = []
for k, o in out_meta.items():
    w = window_of(outlet_visit_dates.get(k, set()))
    if not w:
        continue
    unvisited_outlets.append({"k": k, "n": o["name"], "br": o["branch"], "hoa": o["hoa"], "mc": o["mc"], "dso": o["dso"],
                              "kec": o["kec"], "site": o["site"] or "PENDING-NBS", "dse": o["dse"], "w": w,
                              "last": last_visit_of(outlet_visit_dates.get(k, set()))})
unvisited_outlets.sort(key=lambda r: (r["br"], r["mc"], r["n"]))

unvisited_sites = []
for s_key, s_outs in site_outlets.items():
    all_dates = set()
    for k in s_outs:
        all_dates |= outlet_visit_dates.get(k, set())
    w = window_of(all_dates)
    if not w:
        continue
    site_id, mc = s_key.split("::", 1)
    sample = [out_meta[k] for k in s_outs]
    unvisited_sites.append({"site": site_id, "mc": mc, "br": sample[0]["branch"], "hoa": sample[0]["hoa"], "dso": sample[0]["dso"],
                            "kec": Counter(o["kec"] for o in sample).most_common(1)[0][0],
                            "dse": Counter(o["dse"] for o in sample).most_common(1)[0][0],
                            "outlets": len(s_outs), "w": w, "last": last_visit_of(all_dates)})
unvisited_sites.sort(key=lambda r: (r["br"], r["mc"], r["site"]))

group_totals = {"br": {}, "mc": {}, "kec": {}, "dse": {}}
for dim in group_totals:
    outs_by, sites_by = defaultdict(set), defaultdict(set)
    for k, o in out_meta.items():
        g = o["branch"] if dim == "br" else o[dim]
        outs_by[g].add(k)
        if o["site"] and o["site"] != "PENDING-NBS" and o["mc"]:
            sites_by[g].add(f"{o['site']}::{o['mc']}")
    for g in outs_by:
        group_totals[dim][g] = {"outlets": len(outs_by[g]), "sites": len(sites_by[g])}

# --------------------------------------------------------------------------------------
print("Step 7: Sell-In link (computed from data/processed/sellin_feed.json when present)...")
sellin_link = None
if os.path.exists(SELLIN_PATH):
    with open(SELLIN_PATH, encoding="utf-8") as f:
        sf = json.load(f)
    days = sf["metadata"].get("days") or []
    day_lbl = [datetime.strptime(d, "%Y-%m-%d").strftime("%d-%b-%Y") for d in days]
    phys, bal = defaultdict(set), defaultdict(set)      # outlet_key -> set of dates with supply
    for fct in sf["facts"]:
        di, src, okey = fct[0], fct[2], fct[7]
        if okey not in out_meta or di >= len(day_lbl):
            continue
        (phys if src == "P" else bal)[okey].add(day_lbl[di])

    def link(d):
        outl = set(d)
        vis = {k for k in outl if k in outlet_visit_dates}
        same = {k for k in outl if d[k] & outlet_visit_dates.get(k, set())}
        return {"outlets": len(outl), "visited_mtd": len(vis), "same_day": len(same),
                "pct_visited": round(len(vis) / len(outl) * 100, 1) if outl else 0.0,
                "pct_same_day": round(len(same) / len(outl) * 100, 1) if outl else 0.0}
    sellin_link = {"physical": link(phys), "balance": link(bal), "period": f"{days[0]} to {days[-1]}" if days else "",
                   "note": f"Master outlets only; 'visited' = at least one completed check-in {PERIOD_START} to {PERIOD_END}; 'same day' = check-in on a supply day."}
    print(f"  Sell-In link: {sellin_link}")
else:
    print("  sellin_feed.json not found; card will say so.")

# --------------------------------------------------------------------------------------
all_dur = [x for d in daily_stats.values() for x in d["durations"]]
all_dev = [x for d in daily_stats.values() for x in d["deviations"]]
w1_pl = sum(daily_stats[d]["planned"] for d in W1_DAYS); w1_ac = sum(daily_stats[d]["actual"] for d in W1_DAYS)
w2_pl = sum(daily_stats[d]["planned"] for d in W2_DAYS); w2_ac = sum(daily_stats[d]["actual"] for d in W2_DAYS)
W1_AVAIL = [d for d in W1_DAYS if d not in MISSING_DAYS]; W2_AVAIL = [d for d in W2_DAYS if d not in MISSING_DAYS]
w1_rate, w2_rate = w1_ac / max(len(W1_AVAIL), 1), w2_ac / max(len(W2_AVAIL), 1)

regional_summary = {
    "total_planned_visits": total_planned, "total_actual_visits": total_actual,
    "target_hit_rate": round(total_actual / total_planned * 100, 1) if total_planned else 0.0,
    "planned_im3": sum(d["planned_im3"] for d in daily_stats.values()), "planned_3id": sum(d["planned_3id"] for d in daily_stats.values()),
    "im3_visits": sum(d["im3"] for d in daily_stats.values()), "3id_visits": sum(d["3id"] for d in daily_stats.values()),
    "productive_visits": total_productive, "productive_rate": round(total_productive / total_actual * 100, 1) if total_actual else 0.0,
    "productive_phys": sum(d["prod_phys"] for d in daily_stats.values()), "productive_saldo": sum(d["prod_saldo"] for d in daily_stats.values()),
    "productive_rule": f"Sell In SP or VC qty > 0, or Balance Transfer saldo > Rp {SALDO_MIN_RP:,}", "saldo_min_rp": SALDO_MIN_RP,
    "flow_completed": total_flow, "flow_rate": round(total_flow / total_actual * 100, 1) if total_actual else 0.0,
    "sp_qty": int(sum(d["sp_qty"] for d in daily_stats.values())), "vc_qty": int(sum(d["vc_qty"] for d in daily_stats.values())), "saldo_rp": int(sum(d["saldo_rp"] for d in daily_stats.values())),
    "sellin_visits": sum(d["sellin"] for d in daily_stats.values()), "balance_visits": sum(d["balance"] for d in daily_stats.values()),
    "sales_without_checkin": prod_without_ci,
    "total_master_outlets": total_master_outlets, "visited_outlets_mtd": len(visited_keys_mtd),
    "not_visited_mtd": total_master_outlets - len(visited_keys_mtd), "not_visited_7d": total_master_outlets - len(visited_keys_7d),
    "not_visited_3d": total_master_outlets - len(visited_keys_3d),
    "coverage_rate_mtd": round(len(visited_keys_mtd) / total_master_outlets * 100, 1),
    "im3_only_outlets": sum(1 for k in visited_keys_mtd if outlet_visit_brands[k] == {"IM3"}),
    "3id_only_outlets": sum(1 for k in visited_keys_mtd if outlet_visit_brands[k] == {"3ID"}),
    "hybrid_outlets": hybrid(visited_keys_mtd),
    "avg_duration": format_dur(statistics.mean(all_dur) if all_dur else 0), "avg_duration_sec": round(statistics.mean(all_dur), 0) if all_dur else 0,
    "median_duration": format_dur(statistics.median(all_dur) if all_dur else 0),
    "median_deviation_m": round(statistics.median(all_dev), 0) if all_dev else 0,
    "pct_within_100m": round(sum(1 for d in all_dev if d <= 100) / len(all_dev) * 100, 1) if all_dev else 0,
    "pct_within_250m": round(sum(1 for d in all_dev if d <= 250) / len(all_dev) * 100, 1) if all_dev else 0,
    "total_sites": total_sites, "sites_zero_mtd": total_sites - len(sites_with_visit["mtd"]),
    "sites_zero_7d": total_sites - len(sites_with_visit["7d"]), "sites_zero_3d": total_sites - len(sites_with_visit["3d"]),
    "sites_active_mtd": len(sites_with_visit["mtd"]),
    "outside_territory": {"planned": branch_stats[OUTSIDE]["planned"], "actual": branch_stats[OUTSIDE]["actual"],
                          "raw_pairs": len(outside_rows),
                          "top": [{"branch": b, "mc": m, "planned": n} for (b, m), n in outside_rows.most_common(8)]},
    "raw_branch_names": [{"raw": b, "mapped_to": (b if b in master_branches else BRANCH_ALIAS.get(b, OUTSIDE)), "planned": n}
                         for b, n in raw_branch_counter.most_common()],
    "operators": ops_summary,
    "excluded_from_pjp": {
        "rule": "Promotor visits (PRJAYAIN## logins, operator type Promotor) and ad-hoc visits at master outlets without a DSE are shown separately and are not counted as PJP planned / executed / productive visits or as outlet coverage.",
        "promotor": {"persons": len(promo_persons), "planned": x_stats["promo"]["planned"], "actual": x_stats["promo"]["actual"], "productive": x_stats["promo"]["productive"]},
        "adhoc_unassigned": {"master_outlets": len(ADHOC_KEYS), "outlets_visited": len(adhoc_outlets_visited), "planned": x_stats["adhoc"]["planned"],
                             "actual": x_stats["adhoc"]["actual"], "productive": x_stats["adhoc"]["productive"]},
    },
    "sellin_link": sellin_link,
    "growth_wow": {"w1_actual": w1_ac, "w2_actual": w2_ac, "w1_planned": w1_pl, "w2_planned": w2_pl, "w1_days": len(W1_AVAIL), "w2_days": len(W2_AVAIL),
                   "w1_compliance": round(w1_ac / w1_pl * 100, 1) if w1_pl else 0, "w2_compliance": round(w2_ac / w2_pl * 100, 1) if w2_pl else 0,
                   "w1_per_day": round(w1_rate), "w2_per_day": round(w2_rate),
                   "run_rate_growth_pct": round((w2_rate - w1_rate) / w1_rate * 100, 1) if w1_rate else 0.0,
                   "mom_note": "Baseline month (Oct 2026). MoM populates when Sep 2026 logs are ingested."},
}

feed_data = {
    "metadata": {"generated_at": datetime.now().isoformat(timespec="seconds"), "period_start": PERIOD_START, "period_end": PERIOD_END,
                 "days_count": len(DAYS), "business_days": N_BUSINESS_DAYS, "days": DAYS, "missing_days": MISSING_DAYS,
                 "daily_columns": ["planned", "executed", "planned_im3", "executed_im3", "planned_3id", "executed_3id"], "dates_last_3d": sorted(DATES_LAST_3D), "dates_last_7d": sorted(DATES_LAST_7D),
                 "grain": "PJP stop = (brand, schedule date, BEATPLANID, ORG. ID); executed = Check In Completed; productive = Sell In SP/VC qty > 0 or Balance Transfer saldo > Rp 50,000 (flow_completed = status-only rule)",
                 "contract": "docs/assessments/pjp_journey_plan_report.md"},
    "regional_summary": regional_summary, "daily_timeline": daily_timeline, "branches": branch_list, "micro_clusters": mc_list,
    "dses": dse_list, "unvisited_outlets": unvisited_outlets, "unvisited_sites": unvisited_sites, "group_totals": group_totals,
    # Last completed check-in per master outlet (all visited outlets) so the view can bucket every outlet by days since last visit.
    "last_visit": {k: last_visit_of(d) for k, d in outlet_visit_dates.items()},
}

print(f"Writing {OUTPUT_PATH}...")
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    f.write("// Auto-generated PJP (DSE journey plan) execution feed. Contract: docs/assessments/pjp_journey_plan_report.md\n")
    f.write("var dseVisitsFeed = ")
    json.dump(feed_data, f, ensure_ascii=False)
    f.write(";\n")
print(f"SUCCESS: {OUTPUT_PATH} ({os.path.getsize(OUTPUT_PATH) / 1024:.0f} KB). "
      f"Branch sum planned={sum(b['planned_visits'] for b in branch_list):,} vs regional {total_planned:,}; "
      f"MC sum={sum(m['planned_visits'] for m in mc_list):,}; DSE sum={sum(d['planned_visits'] for d in dse_list if not d['is_promotor']):,} (promotor rows excluded, as in the regional total).")
