#!/usr/bin/env python3
"""
build_pjp_mapping_feed.py  ·  permanent PJP outlet -> DSE mapping from the weekly PJP template

Source : newest raw/**/Weekly_PJP_*_ALL_MC.xlsx (or env PJP_WEEKLY_SRC)
          one row per outlet: DSE IM3 / DSE 3ID code, outlet ids, frequency (F4/F8/F12/F16 visits a month),
          visit days Mon..Sat as 0/1 flags (the weekly beat-plan template).
Output : data/catalogues/pjp_outlet_mapping.csv        governed catalogue (one row per outlet, exceptions flagged)
         data/catalogues/pjp_outlet_exceptions.csv     rows that need an owner decision
         data/processed/pjp_mapping_feed.json and website/data/pjp_mapping_feed.js (PJP_MAP)
Contract: docs/assessments/pjp_weekly_mapping.md
Pure stdlib.  python3 scripts/build_pjp_mapping_feed.py
"""
import csv
import glob
import html
import json
import math
import os
import re
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

TERRITORY = "website/data/territory_feed.js"
HIERARCHY = "data/catalogues/dse_master_hierarchy.csv"
VISITS = "website/data/dse_visits_feed.js"
OUT_CSV = "data/catalogues/pjp_outlet_mapping.csv"
OUT_EXC = "data/catalogues/pjp_outlet_exceptions.csv"
OUT_JSON = "data/processed/pjp_mapping_feed.json"
OUT_JS = "website/data/pjp_mapping_feed.js"
DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
BRANCH_ALIAS = {"KOTA BEKASI": "BEKASI"}          # the PJP file says KOTA BEKASI, the master says BEKASI
EXPECTED_COLS = ["Circle", "Region", "Branch", "MC", "DSE IM3", "DSE 3ID", "ID IM3", "ID 3ID", "Nama Outlet", "Frekuensi"] + DAYS


def norm_id(v):
    s = str(v if v is not None else "").strip().upper()
    if s.endswith(".0"):
        s = s[:-2]
    if s in ("", "0", "NONE", "NAN"):
        return ""
    if s.isdigit():            # 3ID ids come zero-padded to 8 digits in the PJP file ("00049747" = 49747)
        s = s.lstrip("0")
    return s


def norm_dse(v):
    s = str(v if v is not None else "").strip().upper()
    if s.endswith(".0"):
        s = s[:-2]
    return "" if s in ("", "0", "NONE", "NAN") else s


def read_xlsx(path):
    z = zipfile.ZipFile(path)
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        x = z.read("xl/sharedStrings.xml").decode("utf-8")
        ss = [html.unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", si, re.S))) for si in re.findall(r"<si>(.*?)</si>", x, re.S)]
    x = z.read("xl/worksheets/sheet1.xml").decode("utf-8")

    def col(ref):
        n = 0
        for ch in re.match(r"[A-Z]+", ref).group(0):
            n = n * 26 + ord(ch) - 64
        return n - 1
    rows = []
    for rm in re.finditer(r"<row [^>]*?(?:/>|>(.*?)</row>)", x, re.S):
        r = {}
        for cm in re.finditer(r'<c r="([A-Z]+\d+)"([^>]*?)(?:/>|>(.*?)</c>)', rm.group(1) or "", re.S):
            ref, attr, inner = cm.groups()
            if not inner:
                continue
            if 't="inlineStr"' in attr:
                r[col(ref)] = html.unescape("".join(re.findall(r"<t[^>]*>(.*?)</t>", inner, re.S)))
                continue
            v = re.search(r"<v>(.*?)</v>", inner, re.S)
            if not v:
                continue
            val = v.group(1)
            if 't="s"' in attr:
                val = ss[int(val)]
            elif 't="str"' in attr:
                val = html.unescape(val)
            else:
                try:
                    val = float(val)
                except ValueError:
                    pass
            r[col(ref)] = val
        rows.append(r)
    return rows


src = os.environ.get("PJP_WEEKLY_SRC")
if not src:
    hits = [p for p in glob.glob("raw/**/Weekly_PJP_*.xlsx", recursive=True) if not os.path.basename(p).startswith("~$")]
    if not hits:
        raise SystemExit("Weekly_PJP_*.xlsx tidak ditemukan di raw/ (taruh di raw/PJP Weekly/)")
    src = max(hits, key=os.path.getmtime)
m = re.search(r"(\d{4}-\d{2}-\d{2})", os.path.basename(src))
week_of = m.group(1) if m else ""
print("[1/5] Membaca", src)
rows = read_xlsx(src)
hdr = [str(rows[0].get(i, "")).strip() for i in range(len(EXPECTED_COLS))]
if hdr != EXPECTED_COLS:
    raise SystemExit(f"Kolom berubah. Diharapkan {EXPECTED_COLS}, ditemukan {hdr}")
data = rows[1:]
print(f"   {len(data):,} baris outlet")

# ---------------------------------------------------------------- master, DSE codes
print("[2/5] Master outlet dan kode DSE...")
with open(TERRITORY, encoding="utf-8") as f:
    for line in f:
        if "var feed = " in line:
            terr = json.loads(line.split("var feed = ", 1)[1].rstrip(";\n "))
            break
mc_info = {}
for h in terr.get("hierarchy", []):
    for mcl in h.get("micro_clusters", []):
        mc_info[mcl["micro_cluster"]] = {"br": h["branch"], "hoa": h.get("hoa_leader", "—"), "dso": mcl.get("dso_leader", "—")}
master, im3_idx, t3_idx = {}, {}, {}
code_names = defaultdict(Counter)
for o in terr["outlets"]:
    k = o["outlet_key"]
    master[k] = o
    a, b = norm_id(o.get("outlet_id_im3")), norm_id(o.get("outlet_id_3id"))
    if a:
        im3_idx[a] = k
    if b:
        t3_idx[b] = k
    nm = norm_dse(o.get("dse_name"))
    if nm and nm != "UNASSIGNED":
        for c in (o.get("dse_code_im3"), o.get("dse_code_3id")):
            c = norm_dse(c)
            if c:
                code_names[c][nm] += 1
if os.path.exists(HIERARCHY):
    with open(HIERARCHY, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            nm = norm_dse(r.get("nama_dse"))
            for c in (r.get("dse_id_im3"), r.get("dse_id_3id")):
                c = norm_dse(c)
                if nm and c and c not in code_names:
                    code_names[c][nm] += 1
print(f"   {len(master):,} outlet master, {len(code_names):,} kode DSE")

# ---------------------------------------------------------------- resolve rows
print("[3/5] Memetakan baris ke outlet master...")
out, flags_count = [], Counter()
for idx, r in enumerate(data, start=2):
    im3, t3 = norm_id(r.get(6)), norm_id(r.get(7))
    ka, kb = im3_idx.get(im3) if im3 else None, t3_idx.get(t3) if t3 else None
    flags = []
    if ka and kb and ka != kb:
        key = ka; flags.append("id_bentrok")        # IM3 id and 3ID id point to two different master outlets: IM3 wins
    else:
        key = ka or kb
    mask = "".join("1" if r.get(10 + i) == 1.0 else "0" for i in range(6))
    fm = re.match(r"F(\d+)$", str(r.get(9) or "").strip().upper())
    freq = int(fm.group(1)) if fm else 0
    ndays = mask.count("1")
    if freq != ndays * 4:
        flags.append("frekuensi_hari_beda")
    if ndays == 0:
        flags.append("tanpa_hari")
    code_im3, code_3id = norm_dse(r.get(4)), norm_dse(r.get(5))
    code = code_im3 or code_3id
    names = code_names.get(code) if code else None
    dse = names.most_common(1)[0][0] if names else ""
    if not code:
        flags.append("dse_kosong")
    elif not dse:
        flags.append("dse_tak_dikenal")
    br_file = BRANCH_ALIAS.get(str(r.get(2) or "").strip().upper(), str(r.get(2) or "").strip().upper())
    mc = str(r.get(3) or "").strip()
    name = str(r.get(8) or "").strip()
    if key:
        mo = master[key]
        if mc != mo.get("micro_cluster"):
            flags.append("mc_beda_master")
        if not name:
            name = mo.get("outlet_name") or ""; flags.append("nama_dari_master")
        mdse = norm_dse(mo.get("dse_name"))
        if code and dse and mdse and mdse != "UNASSIGNED" and dse != mdse:
            flags.append("dse_beda_master")
    else:
        flags.append("tidak_di_master")
        key = "N:" + (im3 or "-") + "_" + (t3 or "-")
    out.append({"row": idx, "k": key, "mapped": not key.startswith("N:"), "im3": im3, "t3": t3, "n": name, "br": br_file, "mc": mc, "dse": dse,
                "c_im3": code_im3, "c_3id": code_3id, "f": freq, "w": mask, "flags": flags})

# duplicates: several rows on the same master outlet -> keep the one with an IM3 id and the earliest row; drop the rest, log them
by_key = defaultdict(list)
for x in out:
    by_key[x["k"]].append(x)
kept, dropped = [], []
for k, lst in by_key.items():
    if len(lst) == 1 or k.startswith("N:"):
        kept.extend(lst); continue
    lst.sort(key=lambda x: (not x["im3"], x["row"]))
    keep = lst[0]; same = all(y["w"] == keep["w"] and y["dse"] == keep["dse"] for y in lst[1:])
    keep["flags"].append("duplikat_identik" if same else "duplikat_beda")
    kept.append(keep)
    for y in lst[1:]:
        y["flags"].append("duplikat_dibuang"); dropped.append(y)
kept.sort(key=lambda x: x["row"])
for x in kept + dropped:
    for fl in x["flags"]:
        flags_count[fl] += 1
print(f"   {len(kept):,} outlet dipetakan setelah dedup ({len(dropped)} baris duplikat dibuang); tidak di master {sum(1 for x in kept if not x['mapped'])}")


# ---------------------------------------------------------------- disputed DSE -> nearest DSE by location
# Outlets whose DSE in this file differs from the operator of the beat plan loaded in MOBI are re-assigned to the DSE
# whose undisputed outlets are nearest (k = 3, distance weighted, same MC, outlet coordinates from the master).
vf = None
if os.path.exists(VISITS):
    with open(VISITS, encoding="utf-8") as f:
        for line in f:
            if line.startswith("var dseVisitsFeed"):
                vf = json.loads(line.split("= ", 1)[1].rstrip(";\n "))
                break
plan_op = {}
if vf:
    for d in vf["dses"]:
        logins = {norm_dse(lg.split(":", 1)[-1]) for lg in d.get("logins", [])} | {d["dse_name"].upper()}
        for o in d.get("outlets", []):
            plan_op.setdefault(o["k"], logins)


def dcode(x):
    return x["c_im3"] or x["c_3id"]


def xy(key):
    o = master.get(key)
    if not o:
        return None
    try:
        la, lo = float(o.get("lat")), float(o.get("long"))
    except (TypeError, ValueError):
        return None
    return (la, lo) if -7.5 <= la <= -5.5 and 106 <= lo <= 108 else None


def hav(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0]); dp = p2 - p1; dl = math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


K_NEAR, MAX_KM = 3, 3.0
disputed = [x for x in kept if x["mapped"] and dcode(x) and x["k"] in plan_op and not ({x["c_im3"], x["c_3id"], x["dse"]} & plan_op[x["k"]])]
N_DISPUTED = len(disputed)
if os.environ.get("PJP_DSE_BASIS") == "file":      # PJP_DSE_BASIS=file keeps the DSE of the Weekly_PJP file for every outlet
    disputed = []
disp_keys = {x["k"] for x in disputed}
anchors = defaultdict(list)
dse_ident = {}
for x in kept:
    if x["mapped"] and dcode(x):
        dse_ident[dcode(x)] = (x["c_im3"], x["c_3id"], x["dse"])
        if x["k"] not in disp_keys and xy(x["k"]):
            anchors[x["mc"]].append((xy(x["k"]), dcode(x)))


def nearest_dse(p, lst, skip=None, ranked=False):
    ds = sorted((hav(p, q), c) for i, (q, c) in enumerate(lst) if i != skip)[:K_NEAR]
    if not ds:
        return (None, None, []) if ranked else (None, None)
    w = Counter()
    for d, c in ds:
        w[c] += 1 / (d + 0.05)
    if ranked:     # all candidate DSEs among the k nearest anchors, best first, with their closest distance
        dmin = {}
        for d, c in ds:
            dmin.setdefault(c, d)
        return w.most_common(1)[0][0], ds[0][0], [(c, dmin[c]) for c, _ in w.most_common()]
    return w.most_common(1)[0][0], ds[0][0]


loo_ok = loo_n = 0
for mc, lst in anchors.items():
    for i, (p, c) in enumerate(lst):
        pr, _ = nearest_dse(p, lst, i)
        if pr:
            loo_n += 1; loo_ok += pr == c
reassign = Counter()
CAP_DAY = 40       # a DSE never gets more than this many outlets on one weekday (file maximum is 35, median 17)
load = defaultdict(lambda: [0] * 6)
for x in kept:
    if x["mapped"] and dcode(x):
        for i, ch in enumerate(x["w"]):
            if ch == "1":
                load[dcode(x)][i] += 1
plans = []
for x in disputed:
    x["dse0"], x["c0"] = x["dse"], dcode(x)
    p = xy(x["k"])
    pr, dist, cands = nearest_dse(p, anchors.get(x["mc"], []), ranked=True) if p else (None, None, [])
    plans.append((dist if dist is not None else 1e9, x, cands))
plans.sort(key=lambda t: t[0])                 # closest assignments first so they win the free capacity
for dist, x, cands in plans:
    if not cands or dist > MAX_KM:
        x["flags"].append("dse_file_dipertahankan"); reassign["kept_no_location"] += 1; continue
    cur = dcode(x); chosen = None
    for c, dm in cands:
        if dm > MAX_KM:
            continue
        if c == cur:
            chosen = (c, dm); break
        if all(load[c][i] + 1 <= CAP_DAY for i, ch in enumerate(x["w"]) if ch == "1"):
            chosen = (c, dm); break
    if chosen is None:
        x["flags"].append("dse_file_dipertahankan"); reassign["kept_capacity"] += 1; continue
    c, dm = chosen
    x["dist"] = round(dm, 2)
    if c == cur:
        reassign["nearest_same_as_file"] += 1; x["flags"].append("dse_lokasi_sama"); continue
    for i, ch in enumerate(x["w"]):
        if ch == "1":
            load[cur][i] -= 1; load[c][i] += 1
    x["c_im3"], x["c_3id"], x["dse"] = dse_ident[c]
    x["flags"].append("dse_lokasi_diganti"); reassign["reassigned"] += 1
for x in disputed:
    for fl in x["flags"]:
        if fl.startswith("dse_lokasi") or fl == "dse_file_dipertahankan":
            flags_count[fl] += 1
print(f"   DSE beda dengan operator beat plan: {N_DISPUTED:,}; diganti ke DSE terdekat {reassign['reassigned']:,}, tetap (terdekat = DSE file) {reassign['nearest_same_as_file']:,}, tetap (tanpa koordinat / > {MAX_KM:g} km) {reassign['kept_no_location']:,}, tetap (DSE terdekat penuh, > {CAP_DAY} outlet/hari) {reassign['kept_capacity']:,}; akurasi uji aturan {loo_ok / max(1, loo_n):.1%}")

# ---------------------------------------------------------------- checks
print("[4/5] Sanity check...")
dse_load = defaultdict(lambda: [0] * 6)
for x in kept:
    if x["dse"]:
        for i, ch in enumerate(x["w"]):
            if ch == "1":
                dse_load[(x["c_im3"] or x["c_3id"])][i] += 1
loads = sorted(v for l in dse_load.values() for v in l)
dse_codes = {(x["c_im3"] or x["c_3id"]) for x in kept if x["c_im3"] or x["c_3id"]}
mapped_keys = {x["k"] for x in kept if x["mapped"]}
master_missing = [{"k": k, "n": o.get("outlet_name") or "", "mc": o.get("micro_cluster"), "br": o.get("branch"), "dse": norm_dse(o.get("dse_name"))} for k, o in master.items() if k not in mapped_keys]
pairs = defaultdict(set)
for x in kept:
    if x["c_im3"]:
        pairs[x["c_im3"]].add(x["c_3id"])
nm_codes = defaultdict(set)
for c in dse_codes:
    for nm in (code_names.get(c) or {}):
        nm_codes[nm].add(c)

# agreement with the beat plan actually loaded in MOBI (days 1-13 Oct, steady state from 8 Oct)
plan_check = None
if vf:
    days = vf["metadata"]["days"]
    wd = [datetime.strptime(d, "%d-%b-%Y").weekday() for d in days]
    plan = {}
    for d in vf["dses"]:
        for o in d.get("outlets", []):
            plan.setdefault(o["k"], o["d"])
    tp = fp = fn = 0; n_cmp = 0; same_after = diff_after = 0
    for x in kept:
        if not x["mapped"] or x["k"] not in plan:
            continue
        s_ = plan[x["k"]]; n_cmp += 1
        for i, w in enumerate(wd):
            if w > 5 or i < 7:         # steady state only: 8 Oct onwards (index 7)
                continue
            t, a = x["w"][w] == "1", s_[i] != "."
            tp += t and a; fp += t and not a; fn += a and not t
        if dcode(x):
            if {x["c_im3"], x["c_3id"], x["dse"]} & plan_op.get(x["k"], set()):
                same_after += 1
            else:
                diff_after += 1
    plan_check = {"outlets_compared": n_cmp, "window": "8-13 Oct 2026", "plan_days_covered_by_template": round(tp / max(1, tp + fn), 3), "template_days_in_plan": round(tp / max(1, tp + fp), 3),
                  "dse_same_as_plan_operator": same_after, "dse_differs_from_plan_operator": diff_after, "disputed_before": N_DISPUTED, "loo_accuracy": round(loo_ok / max(1, loo_n), 3), "reassign": dict(reassign)}

c = flags_count
checks = [
    {"id": "struktur", "name": "Struktur kolom", "status": "ok", "n": len(data), "note": f"{len(EXPECTED_COLS)} kolom sesuai, {len(data):,} baris outlet, 1 sheet."},
    {"id": "id", "name": "ID outlet ke master", "status": "ok" if c["tidak_di_master"] < 200 else "warn", "n": c["tidak_di_master"],
     "note": f"{len(mapped_keys):,} dari {len(master):,} outlet master terpetakan; {c['tidak_di_master']} baris tidak ada di master (outlet baru / belum dimapping). ID 3ID zero-padded dibersihkan."},
    {"id": "bentrok", "name": "ID IM3 dan ID 3ID menunjuk dua outlet master", "status": "warn" if c["id_bentrok"] else "ok", "n": c["id_bentrok"], "note": "ID IM3 dipakai sebagai acuan (sama dengan builder lain)."},
    {"id": "duplikat", "name": "Outlet ganda", "status": "warn" if dropped else "ok", "n": len(dropped), "note": "Baris ganda pada outlet master yang sama dibuang (disimpan baris dengan ID IM3); dicatat di pengecualian."},
    {"id": "dse_kode", "name": "Kode DSE dikenal master", "status": "ok" if not c["dse_tak_dikenal"] else "warn", "n": c["dse_tak_dikenal"], "note": f"{len(dse_codes)} kode DSE IM3 di file; semua dikenali master hierarki; satu kode IM3 selalu berpasangan dengan satu kode 3ID ({'ya' if all(len(v) == 1 for v in pairs.values()) else 'TIDAK'})."},
    {"id": "dse_nama", "name": "Nama DSE dengan lebih dari satu kode", "status": "info", "n": sum(1 for v in nm_codes.values() if len(v) > 1), "note": "SUSANTO dipakai dua orang; kunci DSE tetap kode, bukan nama."},
    {"id": "dse_kosong", "name": "Outlet tanpa DSE", "status": "warn" if c["dse_kosong"] else "ok", "n": c["dse_kosong"], "note": "Kolom DSE kosong di file dan DSE master juga UNASSIGNED: outlet PJP tanpa DSE (DSE kosong / belum diisi). Tetap dalam mapping sebagai TANPA DSE per MC."},
    {"id": "dse_master", "name": "DSE file vs DSE master pada outlet yang sama", "status": "ok" if c["dse_beda_master"] <= 5 else "warn", "n": c["dse_beda_master"], "note": "Hampir seluruh outlet punya DSE yang sama dengan master teritori."},
    {"id": "frekuensi", "name": "Frekuensi vs jumlah hari kunjungan", "status": "warn" if c["frekuensi_hari_beda"] else "ok", "n": c["frekuensi_hari_beda"], "note": "Aturan: F = 4 × jumlah hari per minggu (F4 1 hari, F8 2, F12 3, F16 4). Baris yang tidak sesuai dipertahankan dengan hari seperti di file."},
    {"id": "hari", "name": "Outlet tanpa hari kunjungan", "status": "ok" if not c["tanpa_hari"] else "warn", "n": c["tanpa_hari"], "note": "Hari kunjungan Senin sampai Sabtu; tidak ada kunjungan hari Minggu."},
    {"id": "beban", "name": "Beban DSE per hari", "status": "ok" if loads and loads[-1] <= 45 else "warn", "n": loads[-1] if loads else 0,
     "note": f"{len(dse_load)} DSE x 6 hari: median {loads[len(loads) // 2] if loads else 0} outlet/hari, p90 {loads[int(len(loads) * .9)] if loads else 0}, maksimum {loads[-1] if loads else 0}, minimum {loads[0] if loads else 0}."},
    {"id": "mc", "name": "MC / Branch vs master", "status": "ok" if c["mc_beda_master"] <= 3 else "warn", "n": c["mc_beda_master"], "note": "Branch KOTA BEKASI di file = BEKASI di master (alias). Yang MC-nya beda dengan master memakai MC di file."},
    {"id": "master_tanpa_pjp", "name": "Outlet master tanpa PJP", "status": "info", "n": len(master_missing), "note": "Outlet ada di master teritori tetapi tidak ada di file PJP mingguan."},
    {"id": "nama", "name": "Nama outlet kosong", "status": "info", "n": c["nama_dari_master"], "note": "Diisi dari master teritori bila ada."},
]
if plan_check:
    checks.append({"id": "plan", "name": "Cocok dengan beat plan yang dimuat di MOBI (8–13 Okt)", "status": "ok" if plan_check["plan_days_covered_by_template"] >= 0.8 else "warn", "n": plan_check["outlets_compared"],
                   "note": f"{plan_check['plan_days_covered_by_template'] * 100:.0f}% hari kunjungan di beat plan ada di template; {plan_check['template_days_in_plan'] * 100:.0f}% hari template ada di beat plan. Awal Oktober beat plan MOBI belum terisi penuh (migrasi), jadi 1–7 Okt tidak dipakai. Setelah penetapan lokasi terdekat, DSE sama dengan operator beat plan untuk {plan_check['dse_same_as_plan_operator']:,} outlet, berbeda untuk {plan_check['dse_differs_from_plan_operator']:,}."})
    checks.append({"id": "dse_lokasi", "name": "DSE berbeda dari operator beat plan → DSE terdekat", "status": "info", "n": plan_check["disputed_before"], "note": f"Aturan pemilik: outlet yang DSE-nya di file beda dengan operator beat plan MOBI ditetapkan ke DSE yang outlet-outletnya terdekat (3 tetangga terdekat, bobot jarak, satu MC, maksimum {MAX_KM:g} km). Batas beban {CAP_DAY} outlet per DSE per hari (maksimum di file 35). Diganti {reassign['reassigned']:,}; tetap {reassign['nearest_same_as_file']:,} (terdekat = DSE file), {reassign['kept_no_location']:,} (tanpa koordinat valid / terlalu jauh) dan {reassign['kept_capacity']:,} (DSE terdekat penuh): DSE file dipertahankan. Uji pada outlet tanpa sengketa: aturan menebak DSE yang benar untuk {plan_check['loo_accuracy'] * 100:.1f}%."})
for ck in checks:
    print(f"   [{ck['status']:4}] {ck['name']}: {ck['n']}")

# ---------------------------------------------------------------- write
print("[5/5] Menulis katalog dan feed...")
dse_list, dse_idx = [], {}
for x in kept:
    code = x["c_im3"] or x["c_3id"]
    if not code or code in dse_idx:
        continue
    dse_idx[code] = len(dse_list)
    dse_list.append({"c": x["c_im3"], "c3": x["c_3id"], "n": x["dse"], "br": x["br"], "mc": x["mc"]})
os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
with open(OUT_CSV, "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    w.writerow(["outlet_key", "outlet_id_im3", "outlet_id_3id", "outlet_name", "branch", "micro_cluster", "dse_name", "dse_code_im3", "dse_code_3id", "frekuensi", "hari"] + DAYS + ["dse_name_file", "dse_basis", "jarak_km", "flags", "source_row"])
    for x in kept:
        w.writerow([x["k"], x["im3"], x["t3"], x["n"], x["br"], x["mc"], x["dse"] or "TANPA DSE", x["c_im3"], x["c_3id"], f"F{x['f']}", "/".join(DAYS[i] for i, ch in enumerate(x["w"]) if ch == "1")] + list(x["w"]) + [x.get("dse0", ""), "lokasi terdekat" if "dse_lokasi_diganti" in x["flags"] else "file Weekly_PJP", x.get("dist", ""), ";".join(x["flags"]), x["row"]])
EXC_FLAGS = {"id_bentrok", "duplikat_beda", "duplikat_dibuang", "frekuensi_hari_beda", "tidak_di_master", "dse_kosong", "dse_beda_master", "mc_beda_master", "tanpa_hari", "dse_tak_dikenal", "dse_lokasi_diganti", "dse_file_dipertahankan"}
exc = [x for x in kept + dropped if EXC_FLAGS & set(x["flags"])]
with open(OUT_EXC, "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    w.writerow(["source_row", "flags", "outlet_key", "outlet_id_im3", "outlet_id_3id", "outlet_name", "branch", "micro_cluster", "dse_name", "dse_name_file", "jarak_km", "frekuensi", "hari"])
    for x in sorted(exc, key=lambda x: x["row"]):
        w.writerow([x["row"], ";".join(x["flags"]), x["k"], x["im3"], x["t3"], x["n"], x["br"], x["mc"], x["dse"], x.get("dse0", ""), x.get("dist", ""), f"F{x['f']}", x["w"]])
feed_rows = [{"k": x["k"], "i": x["im3"], "j": x["t3"], "n": x["n"], "mc": x["mc"], "br": x["br"], "d": dse_idx.get(x["c_im3"] or x["c_3id"], -1), "f": x["f"], "w": x["w"], "m": 1 if x["mapped"] else 0,
              **({"o": dse_idx.get(x["c0"], -1), "z": x.get("dist")} if "dse0" in x else {}),
              **({"x": [fl for fl in x["flags"] if fl in EXC_FLAGS]} if EXC_FLAGS & set(x["flags"]) else {})} for x in kept]
meta = {"generated_at": datetime.now().isoformat(timespec="seconds"), "source": src, "week_of": week_of, "contract": "docs/assessments/pjp_weekly_mapping.md",
        "days": DAYS, "rows_source": len(data), "rows_mapped": len(kept), "rows_dropped": len(dropped), "outlets_master": len(master), "outlets_master_covered": len(mapped_keys),
        "dse_count": len(dse_list), "mc_info": mc_info, "checks": checks, "flag_counts": dict(flags_count), "plan_check": plan_check,
        "master_missing": master_missing, "exceptions": len(exc), "frequency": dict(Counter(f"F{x['f']}" for x in kept)), "patterns": dict(Counter(x["w"] for x in kept).most_common(20)),
        "fields": {"k": "outlet_key master (N:<id> bila belum ada di master)", "i": "ID IM3", "j": "ID 3ID (zero-padding dibersihkan)", "d": "indeks ke dses (-1 = tanpa DSE)", "f": "kunjungan per bulan (F8 = 8)", "w": "Sen..Sab 0/1", "m": "1 = outlet master", "x": "bendera pengecualian", "o": "indeks DSE di file (hanya bila DSE dipindah / ditinjau lewat lokasi terdekat)", "z": "jarak km ke outlet terdekat DSE terpilih"}}
feed = {"metadata": meta, "dses": dse_list, "rows": feed_rows}
os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(feed, f, ensure_ascii=False, separators=(",", ":"))
with open(OUT_JS, "w", encoding="utf-8") as f:
    f.write("// Auto-generated PJP outlet mapping (weekly template). Kontrak: docs/assessments/pjp_weekly_mapping.md\nvar PJP_MAP = ")
    json.dump(feed, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\nif (typeof window !== 'undefined') window.PJP_MAP = PJP_MAP;\n")
print(f"SUCCESS: {OUT_CSV} ({len(kept):,} outlet, {len(dse_list)} DSE), {len(exc)} pengecualian; {OUT_JS} ({os.path.getsize(OUT_JS) / 1024:.0f} KB)")
