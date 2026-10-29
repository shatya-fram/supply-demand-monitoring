#!/usr/bin/env python3
"""Vanguard 5G feed: site status Step 1-5, site -> DSE assignment and the daily 3-site plan.

Contract: docs/assessments/vanguard_5g_site_briefing.md. Pure stdlib.
Inputs  : raw/Vanguard/*Flag*Step1-5*.xlsx, raw/Vanguard/*OutletMapping*Step1-5*.xlsx (newest of each, by the date in the name)
          data/catalogues/territory_management_master.csv, dse_catalogue.csv, website/data/pjp_mapping_feed.js
          data/catalogues/vanguard_site_override.csv (optional: site_id,dse_name,mc)
Outputs : website/data/vanguard_feed.js (window.VANGUARD), data/catalogues/vanguard_site_dse.csv,
          data/processed/vanguard_history.json (one site-status snapshot per file date, last 21 kept: the sync / progress measure)
Rules   : the DSE comes from the app master, never from the Vanguard DSE ID (82% of those names are phone numbers).
          Plan = per DSE per calendar date (build date to end of next month, Sundays skipped), 3 not-yet-complete sites nearest to the centroid of that weekday's PJP outlets, each site once per calendar month (November starts a new cycle with the same site -> DSE mapping).
"""
import csv, collections as C, datetime as dt, glob, json, math, os, re, sys, zipfile
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw", "Vanguard")
SITES_PER_DAY = int(os.environ.get("VG_SITES_PER_DAY", "3"))
RADIUS_KM = float(os.environ.get("VG_RADIUS_KM", "1.5"))
ASSIGN_KM = 1.0
DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
MON = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "Mei": 5, "Jun": 6, "Jul": 7, "Agu": 8, "Sep": 9, "Okt": 10, "Nov": 11, "Des": 12}
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


def col(c):
    n = 0
    for ch in re.match(r"[A-Z]+", c).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_xlsx(path):
    z = zipfile.ZipFile(path)
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            ss.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    out = {}
    for s in wb.find("m:sheets", NS):
        t = rels[s.get("{%s}id" % NS["r"])].lstrip("/")
        t = t if t.startswith("xl/") else "xl/" + t
        rows = []
        for _, el in ET.iterparse(z.open(t)):
            if el.tag.endswith("}row"):
                r = {}
                for c in el.findall("m:c", NS):
                    v = c.find("m:v", NS)
                    ty = c.get("t")
                    if ty == "inlineStr":
                        val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                    elif v is None:
                        continue
                    elif ty == "s":
                        val = ss[int(v.text)]
                    else:
                        val = v.text
                    r[col(c.get("r"))] = val
                rows.append(r)
                el.clear()
        out[s.get("name")] = rows
    return out


def table(path):
    d = read_xlsx(path)
    name = [k for k in d if k != "Ringkasan"][0]
    rows = d[name]
    h = [rows[0].get(i) for i in range(max(rows[0]) + 1)]
    return [{h[i]: r.get(i) for i in range(len(h))} for r in rows[1:]]


def file_date(p):
    m = re.search(r"(\d{1,2})([A-Za-z]{3})(\d{4})", os.path.basename(p))
    if m and m.group(2).title() in MON:
        return dt.date(int(m.group(3)), MON[m.group(2).title()], int(m.group(1)))
    return dt.date.fromtimestamp(os.path.getmtime(p))


def newest(pattern):
    fs = glob.glob(os.path.join(RAW, pattern))
    fs = [f for f in fs if not os.path.basename(f).startswith("~$")]
    return max(fs, key=lambda f: (file_date(f), os.path.getmtime(f))) if fs else None


LAT_OK, LON_OK = (-7.2, -5.5), (105.8, 108.0)   # Inner Jakarta + Karawang


def fix_coord(v, rng):
    """Master coordinates sometimes lost their decimal point (-623004203 = -6.23004203). Repair only when the result falls in the region; else None."""
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    for _ in range(12):
        if rng[0] <= x <= rng[1]:
            return x
        if abs(x) < 1:
            return None
        x /= 10.0
    return None


def km(a, b, c, d):
    return math.hypot((a - c) * 111.0, (b - d) * 111.0 * math.cos(math.radians(6.2)))


def st(v):
    return {"Done": "D", "Proses": "P"}.get(v, "B")


def main():
    fp, op = newest("*Flag*Step1-5*.xlsx"), newest("*OutletMapping*Step1-5*.xlsx")
    if not fp or not op:
        print("Vanguard: no Flag / OutletMapping files in raw/Vanguard, feed not rebuilt.")
        return 0
    fdate, odate = file_date(fp), file_date(op)
    snap = max(fdate, odate)
    print(f"Vanguard: {os.path.basename(fp)} + {os.path.basename(op)} (file date {snap})")
    S = [r for r in table(fp) if r["Flag 5G"] == "5G"]
    O = table(op)

    # ---- master, DSE catalogue, weekly PJP ---------------------------------------------------------
    mst = list(csv.DictReader(open(os.path.join(ROOT, "data/catalogues/territory_management_master.csv"), encoding="utf-8")))
    cat = list(csv.DictReader(open(os.path.join(ROOT, "data/catalogues/dse_catalogue.csv"), encoding="utf-8")))
    pj = open(os.path.join(ROOT, "website/data/pjp_mapping_feed.js"), encoding="utf-8").read()
    pj = json.loads(pj[pj.index("{"):pj.rindex("}") + 1])
    mc_info = pj["metadata"].get("mc_info", {})
    by_im3 = {r["outlet_id_im3"]: r for r in mst if r["outlet_id_im3"]}
    by_3id = {r["outlet_id_3id"]: r for r in mst if r["outlet_id_3id"]}
    mkey = {r["outlet_key"]: r for r in mst}

    catk = {}
    cat_by_name = C.defaultdict(list)
    for r in cat:
        catk[(r["dse_name"].upper().strip(), r["micro_cluster"])] = r
        cat_by_name[r["dse_name"].upper().strip()].append(r)
    dse_list, dse_ix = [], {}

    def dse_of(name, mc):
        """One person = one entry: keyed by name, plus MC only for a name the catalogue holds twice (SUSANTO)."""
        if not name:
            return -1
        n = name.upper().strip()
        one = cat_by_name.get(n, [])
        k = (n, mc) if len(one) > 1 else (n, "")
        if k not in dse_ix:
            dse_ix[k] = len(dse_list)
            dse_list.append({"n": n, "mc": one[0]["micro_cluster"] if len(one) == 1 else mc})
        return dse_ix[k]

    # outlet coordinates and DSE
    pts = []
    grid = C.defaultdict(list)
    for r in mst:
        if r["dse_name"] and r["lat"] and r["long"]:
            la, lo = fix_coord(r["lat"], LAT_OK), fix_coord(r["long"], LON_OK)
            if la is None or lo is None:
                continue
            i = dse_of(r["dse_name"], r["micro_cluster"])
            pts.append((la, lo, i, r["outlet_key"]))
            grid[(int(la * 100), int(lo * 100))].append(len(pts) - 1)

    def near(la, lo, R):
        c = C.Counter()
        gx, gy = int(la * 100), int(lo * 100)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for j in grid.get((gx + dx, gy + dy), ()):
                    a, b, i, _ = pts[j]
                    if km(a, b, la, lo) <= R:
                        c[i] += 1
        return c

    # ---- sites and outlets --------------------------------------------------------------------------
    sites, sx = [], {}
    for r in S:
        sx[r["Site ID"]] = len(sites)
        sites.append({"id": r["Site ID"], "n": r["Site Name"], "ar": r["Area"], "mc": r["Micro Cluster"], "kc": r["Kecamatan"],
                      "la": float(r["Latitude"]), "lo": float(r["Longitude"]),
                      "s": "".join(st(r["Step %d" % i]) for i in range(1, 6)), "d": -1, "b": -1, "o": []})
    outlets, nm = [], 0

    def coord(m):   # outlet latitude / longitude from the master (omitted when the outlet is not in the master)
        la, lo = (fix_coord(m["lat"], LAT_OK), fix_coord(m["long"], LON_OK)) if m else (None, None)
        return {"la": round(la, 5), "lo": round(lo, 5)} if la is not None and lo is not None else {}

    for r in O:
        i = sx.get(r["Site ID"])
        if i is None or not r["Outlet ID"]:
            continue
        m = by_im3.get(r["Outlet ID"]) or by_3id.get(r["Outlet ID"])
        di = dse_of(m["dse_name"], m["micro_cluster"]) if m and m["dse_name"] else -1
        nm += 1 if m else 0
        sites[i]["o"].append(len(outlets))
        outlets.append({"id": r["Outlet ID"], "n": r["Outlet Name"] or "", "s": st(r["Step 2 (outlet)"]) + st(r["Step 3 (outlet)"]) + st(r["Step 4"]),
                        "d": di, "k": m["outlet_key"] if m else "", "mc": m["micro_cluster"] if m else "", "i": i, **coord(m)})

    # ---- site -> DSE (master based) -----------------------------------------------------------------
    tag = C.defaultdict(C.Counter)
    for r in mst:
        if r["dse_name"] and r["site_nbs"] in sx:
            tag[r["site_nbs"]][dse_of(r["dse_name"], r["micro_cluster"])] += 1
    over = {}
    ofp = os.path.join(ROOT, "data/catalogues/vanguard_site_override.csv")
    if os.path.exists(ofp):
        for r in csv.DictReader(open(ofp, encoding="utf-8")):
            over[r["site_id"].strip()] = r
    for i, s in enumerate(sites):
        if s["id"] in over:
            o = over[s["id"]]
            s["d"], s["b"] = dse_of(o["dse_name"], o.get("mc") or s["mc"]), 3
            continue
        c = C.Counter(tag.get(s["id"], {}))
        for oi in s["o"]:
            if outlets[oi]["d"] >= 0:
                c[outlets[oi]["d"]] += 1
        if c:
            s["d"], s["b"] = c.most_common(1)[0][0], (0 if s["id"] in tag else 1)
            continue
        c = near(s["la"], s["lo"], ASSIGN_KM)
        if c:
            s["d"], s["b"] = c.most_common(1)[0][0], 2

    # ---- weekly PJP per DSE (outlet keys per weekday) -----------------------------------------------
    pjd = C.defaultdict(lambda: C.defaultdict(list))
    for row in pj["rows"]:
        dn = pj["dses"][row["d"]]["n"] if row.get("d") is not None and row["d"] < len(pj["dses"]) else ""
        if not dn or not row.get("w"):
            continue
        di = dse_of(dn, row["mc"])
        for wi, ch in enumerate(row["w"][:6]):
            if ch == "1":
                pjd[di][DAYS[wi]].append(row["k"])

    # ---- DSE metadata -------------------------------------------------------------------------------
    for (n, mc), i in dse_ix.items():
        d = dse_list[i]
        mc = d["mc"]
        r = catk.get((n, mc)) or (cat_by_name[n][0] if len(cat_by_name[n]) == 1 else None)
        mi = mc_info.get(mc, {})
        d.update({"br": (r or {}).get("branch") or mi.get("br", ""), "dso": (r or {}).get("dso") or mi.get("dso", ""), "hoa": (r or {}).get("hoa") or mi.get("hoa", ""),
                  "l3": (r or {}).get("login_im3", ""), "li": (r or {}).get("login_3id", ""), "pid": (r or {}).get("person_id", ""), "cat": 1 if r else 0})

    # ---- progress since previous snapshot (the sync measure) ----------------------------------------
    hp = os.path.join(ROOT, "data/processed/vanguard_history.json")
    hist = json.load(open(hp)) if os.path.exists(hp) else {}
    cur = {s["id"]: s["s"] for s in sites}
    prev_day = max([d for d in hist if d < snap.isoformat()], default=None)
    gain = C.defaultdict(lambda: [0, 0])
    sgain = {}
    if prev_day:
        for s in sites:
            old = hist[prev_day].get(s["id"])
            if old and s["d"] >= 0:
                g = sum(1 for a, b in zip(old, s["s"]) if a != "D" and b == "D")
                if g:
                    gain[s["d"]][0] += 1
                    gain[s["d"]][1] += g
                    sgain[s["id"]] = g
    hist[snap.isoformat()] = cur
    for d in sorted(hist)[:-21]:
        del hist[d]
    os.makedirs(os.path.dirname(hp), exist_ok=True)
    json.dump(hist, open(hp, "w"), separators=(",", ":"))

    # ---- plan: per DSE, per calendar date from the build date to the end of next month --------------------
    # The weekly PJP template repeats every week (owner, 29 Oct 2026: November PJP = October PJP), so a date uses the template of its weekday.
    today = dt.date.today()
    first = today + dt.timedelta(days=1) if today.weekday() == 6 else today
    nm_ = dt.date(today.year + (today.month == 12), today.month % 12 + 1, 1)
    last = dt.date(nm_.year + (nm_.month == 12), nm_.month % 12 + 1, 1) - dt.timedelta(days=1)
    if os.environ.get("VG_PLAN_END"):
        last = dt.date.fromisoformat(os.environ["VG_PLAN_END"])
    plan_dates = [first + dt.timedelta(days=n) for n in range((last - first).days + 1) if (first + dt.timedelta(days=n)).weekday() != 6]
    plan_days = [d.isoformat() for d in plan_dates]
    dse_sites = C.defaultdict(list)
    for i, s in enumerate(sites):
        if s["d"] >= 0 and s["s"] != "DDDDD":
            dse_sites[s["d"]].append(i)

    def done_n(i):
        return sites[i]["s"].count("D")

    plan = {d: {} for d in plan_days}
    for di, cand in dse_sites.items():
        used, own_c, cyc = set(), None, None
        for dd in plan_dates:
            if dd.month != cyc:   # a new calendar month starts a new cycle: the site -> DSE mapping stays, earlier scheduling is not counted (owner, 29 Oct 2026)
                cyc, used = dd.month, set()
            day, wk = dd.isoformat(), DAYS[dd.weekday()]
            ks = pjd[di].get(wk, [])
            ps = []
            for k in ks:
                r = mkey.get(k)
                if r:
                    la, lo = fix_coord(r["lat"], LAT_OK), fix_coord(r["long"], LON_OK)
                    if la is not None and lo is not None:
                        ps.append((la, lo))
            if ps:
                cl, co = sum(a for a, _ in ps) / len(ps), sum(b for _, b in ps) / len(ps)
            else:   # no PJP that weekday: centre of the DSE's own outlets
                if own_c is None:
                    own = [(p[0], p[1]) for p in pts if p[2] == di]
                    own_c = (sum(a for a, _ in own) / len(own), sum(b for _, b in own) / len(own)) if own else (None, None)
                cl, co = own_c
            left = [i for i in cand if i not in used]
            if not left:
                continue
            dist = {i: (km(sites[i]["la"], sites[i]["lo"], cl, co) if cl is not None else 0.0) for i in left}
            inr = sorted([i for i in left if dist[i] <= RADIUS_KM], key=lambda i: (done_n(i), dist[i]))
            out = sorted([i for i in left if dist[i] > RADIUS_KM], key=lambda i: dist[i])
            pick = (inr + out)[:SITES_PER_DAY]
            pkeys = set(ks)
            ent = []
            for i in pick:
                used.add(i)
                ol = sorted(sites[i]["o"], key=lambda o: ((0 if outlets[o]["k"] in pkeys else 1), (0 if outlets[o]["d"] == di else 1), outlets[o]["s"].count("D")))
                ol = [o for o in ol if outlets[o]["s"] != "DDD"][:6]
                ent.append([i, round(dist[i], 2), 1 if dist[i] > RADIUS_KM else 0, [[o, 1 if outlets[o]["k"] in pkeys else 0] for o in ol]])
            if ent:
                plan[day][di] = {"pjp": len(ks), "s": ent}

    # ---- feed + audit csv ----------------------------------------------------------------------------
    cnt = C.Counter(s["s"][i] for s in sites for i in range(5))
    meta = {
        "generated_at": dt.datetime.now().replace(microsecond=0).isoformat(), "plan_date": today.isoformat(), "snapshot_date": snap.isoformat(),
        "prev_snapshot": prev_day, "sources": [os.path.basename(fp), os.path.basename(op)], "contract": "docs/assessments/vanguard_5g_site_briefing.md",
        "sites": len(sites), "outlet_rows": len(outlets), "outlets_in_master": nm, "sites_with_dse": sum(1 for s in sites if s["d"] >= 0),
        "sites_without_outlet": sum(1 for s in sites if not s["o"]), "complete": sum(1 for s in sites if s["s"] == "DDDDD"),
        "step_done": [sum(1 for s in sites if s["s"][i] == "D") for i in range(5)], "sites_per_day": SITES_PER_DAY, "radius_km": RADIUS_KM,
        "days": plan_days, "all_days": DAYS, "plan_from": plan_days[0], "plan_to": plan_days[-1], "pjp_template_month": str(pj["metadata"].get("week_of", ""))[:7], "pjp_template_week": pj["metadata"].get("week_of"), "basis": {"0": "tag site_nbs master", "1": "outlet daftar Vanguard", "2": "outlet master <= %.1f km" % ASSIGN_KM, "3": "override DSO", "-1": "tanpa DSE"},
        "mc_info": mc_info,
        "steps": ["Speed test 5G", "Outlet engagement", "Outlet branding", "Outlet advocacy", "Street branding"],
    }
    feed = {"metadata": meta, "dses": dse_list, "sites": sites, "outlets": outlets, "plan": plan,
            "gain": {str(k): v for k, v in gain.items()}, "sgain": sgain}
    fo = os.path.join(ROOT, "website/data/vanguard_feed.js")
    with open(fo, "w", encoding="utf-8") as f:
        f.write("// Auto-generated by scripts/build_vanguard_feed.py. Contract: docs/assessments/vanguard_5g_site_briefing.md\nwindow.VANGUARD = ")
        json.dump(feed, f, separators=(",", ":"), ensure_ascii=False)
        f.write(";\n")
    with open(os.path.join(ROOT, "data/catalogues/vanguard_site_dse.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["site_id", "site_name", "area", "micro_cluster", "kecamatan", "latitude", "longitude", "steps_1_5", "dse_name", "dse_mc", "basis"])
        for s in sites:
            d = dse_list[s["d"]] if s["d"] >= 0 else {"n": "", "mc": ""}
            w.writerow([s["id"], s["n"], s["ar"], s["mc"], s["kc"], s["la"], s["lo"], s["s"], d["n"], d["mc"], meta["basis"][str(s["b"])]])
    bad_c = sum(1 for r in mst if r["lat"] and r["long"] and not (LAT_OK[0] <= float(r["lat"]) <= LAT_OK[1] and LON_OK[0] <= float(r["long"]) <= LON_OK[1]))
    fixed_c = sum(1 for r in mst if r["lat"] and r["long"] and fix_coord(r["lat"], LAT_OK) is not None and fix_coord(r["long"], LON_OK) is not None and not (LAT_OK[0] <= float(r["lat"]) <= LAT_OK[1] and LON_OK[0] <= float(r["long"]) <= LON_OK[1]))
    print(f"  master outlets with a coordinate outside the region: {bad_c} ({fixed_c} repaired by restoring the decimal point, {bad_c - fixed_c} left without coordinates)")
    npl = sum(len(v) for v in plan.values())
    print(f"  sites {len(sites)} · outlet rows {len(outlets)} ({nm} in master) · sites with DSE {meta['sites_with_dse']} · DSE with plan {len({k for v in plan.values() for k in v})} · dates {plan_days[0]}..{plan_days[-1]} · plan rows {npl}")
    print(f"  step done {meta['step_done']} · complete {meta['complete']} · prev snapshot {prev_day or 'none (progress starts with the next file)'} · -> {os.path.relpath(fo, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
