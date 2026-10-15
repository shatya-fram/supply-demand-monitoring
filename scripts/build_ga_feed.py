#!/usr/bin/env python3
"""
build_ga_feed.py  ·  Gross Add (GA) / SSO feed per outlet, September + October 2026

Sources (all under raw/GA/, falls back to ./GA/):
  Daily_RGUGA_OUTLET_YYYYMM.xlsb   outlet x day GA quantity (sheets 'IM3 SEP/OCT', '3ID SEP/OCT'); formula cells carry the values
  GA BIOMETRIC*.xlsx               official GA control total per day, region level, per brand (Aug / Sep / Oct)
  #OUTLET ACTIVE GA (KPI)*.xlsx    official "outlets active on GA" per day, region level, per brand

Output: data/processed/ga_feed.json and website/data/ga_feed.js (GA_FEED).
Contract: docs/assessments/ga_rguga_outlet.md

SSO = SIM Selling Outlet: an outlet with >= 1 GA in the period (the "UAR" rows of the RGUGA workbook).
Pure stdlib.  Run from anywhere:  python3 scripts/build_ga_feed.py
"""
import csv
import glob
import json
import os
import re
import struct
import sys
import zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from build_territory_management_catalogues import parse_xlsb_sst, decode_xlsb_rk  # noqa: E402

GA_DIRS = ["raw/GA", "GA"]
TERRITORY = "website/data/territory_feed.js"
HIERARCHY = "data/catalogues/dse_master_hierarchy.csv"
OUT_JSON = "data/processed/ga_feed.json"
OUT_JS = "website/data/ga_feed.js"
OUTSIDE = "OUTSIDE MASTER TERRITORY"
PREV_MONTH, CUR_MONTH = (2026, 9), (2026, 10)
OUTLIER_DAY_QTY = 300      # one outlet selling this many GA in a day is flagged for review


def norm_id(v):
    s = str(v if v is not None else "").strip().upper()
    if s.endswith(".0"):
        s = s[:-2]
    return s


def norm_dse(v):
    s = norm_id(v)
    return "" if s in ("", "0", "NAN", "NONE") else s


def excel_date(serial):
    return date(1899, 12, 30) + timedelta(days=int(serial))


# ---------------------------------------------------------------- xlsb reader (formula cells included)
def sheet_names(z):
    data = z.read("xl/workbook.bin")
    names, pos = [], 0
    while pos < len(data):
        b = data[pos]; rt = b & 0x7F; pos += 1
        if b & 0x80:
            rt |= (data[pos] & 0x7F) << 7; pos += 1
        b = data[pos]; ln = b & 0x7F; pos += 1; sh = 7
        while b & 0x80:
            b = data[pos]; ln |= (b & 0x7F) << sh; pos += 1; sh += 7
        rec = data[pos:pos + ln]; pos += ln
        if rt == 156:
            n1 = struct.unpack("<I", rec[8:12])[0]
            p = 12 + n1 * 2
            n2 = struct.unpack("<I", rec[p:p + 4])[0]
            names.append(rec[p + 4:p + 4 + n2 * 2].decode("utf-16le", errors="ignore"))
    return names


def parse_rows(buf, sst):
    """BrtRowHdr-delimited rows -> list of {col: value}; handles SST, RK, real, formula number / string, bool."""
    pos, n, rows, cur = 0, len(buf), [], None
    U = struct.unpack_from
    while pos < n:
        b = buf[pos]; rt = b & 0x7F; pos += 1
        if b & 0x80:
            rt |= (buf[pos] & 0x7F) << 7; pos += 1
        b = buf[pos]; ln = b & 0x7F; pos += 1; sh = 7
        while b & 0x80:
            b = buf[pos]; ln |= (b & 0x7F) << sh; pos += 1; sh += 7
        rec = buf[pos:pos + ln]; pos += ln
        if rt == 0:
            if cur is not None:
                rows.append(cur)
            cur = {}
        elif cur is None:
            continue
        elif rt == 7:
            i = U("<I", rec, 8)[0]
            cur[U("<I", rec, 0)[0]] = sst[i] if i < len(sst) else None
        elif rt == 2:
            cur[U("<I", rec, 0)[0]] = decode_xlsb_rk(U("<I", rec, 8)[0])
        elif rt in (5, 9):          # BrtCellReal, BrtFmlaNum
            cur[U("<I", rec, 0)[0]] = U("<d", rec, 8)[0]
        elif rt in (6, 8):          # BrtCellSt, BrtFmlaString
            ln2 = U("<I", rec, 8)[0]
            cur[U("<I", rec, 0)[0]] = rec[12:12 + ln2 * 2].decode("utf-16le", "ignore")
        elif rt in (4, 10):
            cur[U("<I", rec, 0)[0]] = bool(rec[8])
    if cur is not None:
        rows.append(cur)
    return rows


def read_sheets(path, wanted):
    out = {}
    with zipfile.ZipFile(path) as z:
        sst = parse_xlsb_sst(z.read("xl/sharedStrings.bin")) if "xl/sharedStrings.bin" in z.namelist() else []
        names = sheet_names(z)
        files = sorted([x for x in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.bin$", x)], key=lambda x: int(re.findall(r"\d+", x)[0]))
        for i, fn in enumerate(files):
            nm = names[i] if i < len(names) else f"sheet{i + 1}"
            if nm.strip().upper() in wanted:
                out[nm.strip().upper()] = parse_rows(z.read(fn), sst)
    return out


# ---------------------------------------------------------------- control files (.xlsx, region level)
def read_control_xlsx(path):
    """-> (brand, label, {month: {day: value}})"""
    import html
    with zipfile.ZipFile(path) as z:
        sx = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
    rows = re.findall(r'<row r="(\d+)">(.*?)</row>', sx, re.S)
    head = html.unescape(" ".join(re.findall(r"<v>(.*?)</v>", rows[0][1], re.S)))
    brand = re.search(r"Brand is (\w+)", head)
    label = re.search(r"(?:^|\n)label is ([^\n<]+)", head)
    data = defaultdict(dict)
    for _rn, r in rows[3:]:
        v = [html.unescape(x) for x in re.findall(r"<v>(.*?)</v>", r, re.S)]
        if len(v) >= 3:
            try:
                data[v[1].strip()][int(float(v[0]))] = float(v[2])
            except ValueError:
                pass
    return (brand.group(1) if brand else "?"), (label.group(1).strip() if label else "?"), data


def find_dir():
    for d in GA_DIRS:
        if os.path.isdir(d):
            return d
    raise SystemExit("Folder GA tidak ditemukan (raw/GA). Taruh Daily_RGUGA_OUTLET_*.xlsb di sana.")


GA_DIR = find_dir()


def pick(pattern):
    rx = re.compile(pattern, re.I)
    hits = [p for p in glob.glob(os.path.join(GA_DIR, "*")) if rx.search(os.path.basename(p)) and not os.path.basename(p).startswith("~$")]
    return sorted(hits, key=os.path.getmtime, reverse=True)


sep_files = pick(r"Daily_RGUGA_OUTLET_202609\.xlsb$")
oct_files = pick(r"Daily_RGUGA_OUTLET_202610\.xlsb$")
if not sep_files or not oct_files:
    raise SystemExit("Perlu Daily_RGUGA_OUTLET_202609.xlsb dan Daily_RGUGA_OUTLET_202610.xlsb di " + GA_DIR)
SEP_SRC, OCT_SRC = sep_files[0], oct_files[0]

# ---------------------------------------------------------------- master + DSE code maps
print("[1/5] Master outlet dan kode DSE...")
with open(TERRITORY, encoding="utf-8") as f:
    for line in f:
        if "var feed = " in line:
            terr = json.loads(line.split("var feed = ", 1)[1].rstrip(";\n "))
            break
mc_info = {}
for h in terr.get("hierarchy", []):
    for m in h.get("micro_clusters", []):
        mc_info[m["micro_cluster"]] = {"br": h["branch"], "hoa": h.get("hoa_leader", "—"), "dso": m.get("dso_leader", "—")}
by_im3, by_3id, master = {}, {}, {}
code2dse = {}
for o in terr["outlets"]:
    k = o["outlet_key"]
    dse = norm_dse(o.get("dse_name")) or "UNASSIGNED"
    master[k] = {"k": k, "n": o.get("outlet_name") or "", "mc": o.get("micro_cluster") or "", "br": o.get("branch") or "", "kec": o.get("kecamatan") or "",
                 "site": o.get("site_nbs") or "", "dse": dse}
    a, b = norm_id(o.get("outlet_id_im3")), norm_id(o.get("outlet_id_3id"))
    if a not in ("", "0"):
        by_im3[a] = k
    if b not in ("", "0"):
        by_3id[b] = k
    if dse != "UNASSIGNED":
        for c in (o.get("dse_code_im3"), o.get("dse_code_3id")):
            c = norm_dse(c)
            if c:
                code2dse.setdefault(c, dse)
if os.path.exists(HIERARCHY):
    with open(HIERARCHY, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            nm = norm_dse(r.get("nama_dse"))
            for c in (r.get("dse_id_im3"), r.get("dse_id_3id")):
                c = norm_dse(c)
                if nm and c:
                    code2dse.setdefault(c, nm)
VISITS = "website/data/dse_visits_feed.js"
if os.path.exists(VISITS):      # login codes of the PJP operators (incl. persons that exist only in the visits feed)
    with open(VISITS, encoding="utf-8") as f:
        for line in f:
            if "var dseVisitsFeed = " in line or line.startswith("var dseVisitsFeed"):
                vf = json.loads(line.split("= ", 1)[1].rstrip(";\n "))
                for d in vf.get("dses", []):
                    nm = norm_dse(d.get("dse_name"))
                    for lg in d.get("logins", []):
                        c = norm_dse(lg.split(":", 1)[-1])
                        if nm and c:
                            code2dse.setdefault(c, nm)
                break
known_dse = {m["dse"] for m in master.values() if m["dse"] != "UNASSIGNED"}
print(f"   {len(master):,} outlet master, {len(by_im3):,} id IM3, {len(by_3id):,} id 3ID, {len(code2dse):,} kode DSE, {len(known_dse):,} nama DSE")

# ---------------------------------------------------------------- RGUGA workbooks
print("[2/5] Membaca", SEP_SRC)
sep = read_sheets(SEP_SRC, {"IM3 SEP", "3ID SEP", "RAW_IM3", "RAW_3ID"})
print("[3/5] Membaca", OCT_SRC)
octo = read_sheets(OCT_SRC, {"IM3 OCT", "3ID OCT", "RAW IM3", "RAW 3ID"})


def header_index(rows, first_labels):
    for i, r in enumerate(rows[:12]):
        if str(r.get(0, "")).strip() in first_labels:
            return i
    raise SystemExit("Header tidak ditemukan; format RGUGA berubah?")


def day_columns(hdr, year_month):
    """{day_of_month: col} from numeric date headers (Excel serials) in the given month."""
    out = {}
    for c, v in hdr.items():
        if isinstance(v, (int, float)) and v > 40000:
            d = excel_date(v)
            if (d.year, d.month) == year_month:
                out[d.day] = c
    return out


def sheet_records(rows, kind):
    """-> (records list, day->col map, summary rows {'UAR PJP':{day:v},...})"""
    if kind == "sep":
        hi = header_index(rows, {"Region Name"})
    else:
        hi = header_index(rows, {"mth"})
    hdr = rows[hi]
    dcol = day_columns(hdr, PREV_MONTH if kind == "sep" else CUR_MONTH)
    summ = {}
    for r in rows[:hi]:
        lab = next((str(v) for c, v in r.items() if isinstance(v, str) and c < min(dcol.values())), None)
        if lab:
            summ[lab.strip().upper()] = {d: r.get(c) for d, c in dcol.items()}
    return rows[hi + 1:], dcol, summ


universe = {"IM3": {"sep": 0, "oct": 0}, "3ID": {"sep": 0, "oct": 0}}
rows_by = {}          # (brand, id) -> record
unknown_mc = defaultdict(int)


def getrec(brand, oid):
    key = (brand, oid)
    r = rows_by.get(key)
    if r is None:
        r = rows_by[key] = {"b": brand, "i": oid, "n": "", "mc": "", "br": "", "kec": "", "site": "", "dsec": "", "sg": "", "hy": 0, "s": {}, "o": {}}
    return r


summaries = {}
cut_day = 0
for brand in ("IM3", "3ID"):
    # ---- September
    recs, dcol, summ = sheet_records(sep[brand + " SEP"], "sep")
    summaries[(brand, "sep")] = summ
    for r in recs:
        oid = norm_id(r.get(7))
        if not oid:
            continue
        universe[brand]["sep"] += 1
        x = getrec(brand, oid)
        x["n"] = x["n"] or str(r.get(8) or "").strip()
        x["mc"] = x["mc"] or str(r.get(5) or "").strip()
        x["kec"] = x["kec"] or str(r.get(10) or "").strip()
        x["dsec"] = x["dsec"] or norm_dse(r.get(11)) or norm_dse(r.get(6))
        fin = str(r.get(14) or "").strip().upper()
        x["sg"] = x["sg"] or (fin if fin in ("PJP", "NON", "KAM") else ("KAM" if str(r.get(13)) == "KAM" else ""))
        if str(r.get(15) or "").strip().upper() == "HYBRID":
            x["hy"] = 1
        for d, c in dcol.items():
            v = r.get(c)
            if isinstance(v, (int, float)) and v > 0:
                x["s"][d] = x["s"].get(d, 0) + int(round(v))
    # ---- October
    recs, dcol, summ = sheet_records(octo[brand + " OCT"], "oct")
    summaries[(brand, "oct")] = summ
    for r in recs:
        oid = norm_id(r.get(1))
        if not oid:
            continue
        universe[brand]["oct"] += 1
        x = getrec(brand, oid)
        x["n"] = str(r.get(2) or "").strip() or x["n"]
        x["mc"] = str(r.get(13) or "").strip() or x["mc"]
        x["kec"] = str(r.get(7) or "").strip() or x["kec"]
        x["kk"] = str(r.get(6) or "").strip() or x.get("kk", "")
        c15, c16 = r.get(15), r.get(16)
        dcode = norm_dse(c16 if str(c15).strip().upper() in ("IM3", "3ID") else c15)   # 3ID sheet has the two header labels swapped
        x["dsec"] = dcode or x["dsec"]
        fin = str(r.get(19) or "").strip().upper()
        x["sg"] = fin if fin in ("PJP", "NON", "KAM") else x["sg"]
        for d, c in dcol.items():
            v = r.get(c)
            if isinstance(v, (int, float)) and v > 0:
                x["o"][d] = x["o"].get(d, 0) + int(round(v))
                cut_day = max(cut_day, d)

# ---------------------------------------------------------------- raw pivots (outlet id x day, the source behind the outlet sheets)
# September raw_* = Inner Jakarta outlets with their micro cluster; October raw * = ALL outlets nationwide (no region filter) plus a (blank) outlet row.
sheet_sep_total = {b: sum(sum(x["s"].values()) for (bb, _i), x in rows_by.items() if bb == b) for b in ("IM3", "3ID")}
sheet_oct_total = {b: sum(sum(x["o"].values()) for (bb, _i), x in rows_by.items() if bb == b) for b in ("IM3", "3ID")}
sep_raw_mc, raw_stats = {}, {}
for brand in ("IM3", "3ID"):
    rows = sep["RAW_" + brand]
    hi = header_index(rows, {"micro_cluster"})
    dc = day_columns(rows[hi], PREV_MONTH)
    n_new, g_new = 0, 0
    for r in rows[hi + 1:]:
        oid = norm_id(r.get(3))
        if not oid:
            continue
        days = {d: int(round(r[c])) for d, c in dc.items() if isinstance(r.get(c), (int, float)) and r[c] > 0}
        mc = str(r.get(0) or "").strip()
        if mc:
            sep_raw_mc[(brand, oid)] = mc
        known = (brand, oid) in rows_by
        x = getrec(brand, oid)
        if not known:
            n_new += 1; g_new += sum(days.values())
            x["mc"] = mc
        x["s"] = days                      # raw pivot replaces the (formula) outlet-sheet value
    raw_stats[brand] = {"sep_raw_outlets_not_in_sheet": n_new, "sep_raw_ga_not_in_sheet": g_new}
oct_other = {b: defaultdict(int) for b in ("IM3", "3ID")}
oct_blank = {b: defaultdict(int) for b in ("IM3", "3ID")}
for brand in ("IM3", "3ID"):
    rows = octo["RAW " + brand]
    hi = header_index(rows, {"ID OUTLET CLEAN"})
    dc = day_columns(rows[hi], CUR_MONTH)
    n_new, g_new, hit = 0, 0, 0
    for r in rows[hi + 1:]:
        oid = norm_id(r.get(0))
        if not oid:
            continue
        days = {d: int(round(r[c])) for d, c in dc.items() if isinstance(r.get(c), (int, float)) and r[c] > 0}
        if oid == "(BLANK)":
            for d, q in days.items():
                oct_blank[brand][d] += q
            continue
        known = (brand, oid) in rows_by
        mk = (by_im3 if brand == "IM3" else by_3id).get(oid)
        if not known and (brand, oid) in sep_raw_mc:      # Inner Jakarta outlet (September raw) missing from the October outlet sheet
            x = getrec(brand, oid); x["mc"] = sep_raw_mc[(brand, oid)]; known = True; n_new += 1; g_new += sum(days.values())
        elif not known and mk:
            x = getrec(brand, oid); x["mc"] = master[mk]["mc"]; known = True; n_new += 1; g_new += sum(days.values())
        if known:
            rows_by[(brand, oid)]["o"] = days
            hit += 1
        else:
            for d, q in days.items():
                oct_other[brand][d] += q
    raw_stats[brand].update({"oct_raw_outlets_added": n_new, "oct_raw_ga_added": g_new, "oct_raw_outlets_in_ij": hit})
cut_day = max([cut_day] + [d for (bb, _i), x in rows_by.items() for d in x["o"]])
print("   raw pivot vs outlet sheet: " + "; ".join(f"{b} Sep sheet {sheet_sep_total[b]:,} -> raw {sum(sum(x['s'].values()) for (bb, _i), x in rows_by.items() if bb == b):,}; Okt sheet {sheet_oct_total[b]:,} -> raw {sum(sum(x['o'].values()) for (bb, _i), x in rows_by.items() if bb == b):,}" for b in ("IM3", "3ID")))
print(f"   baris sheet: " + ", ".join(f"{b} Sep {universe[b]['sep']:,} / Okt {universe[b]['oct']:,}" for b in universe) + f"; hari terakhir Oktober dengan data: {cut_day}")

# ---------------------------------------------------------------- resolve to master and territory
print("[4/5] Memetakan ke master...")
out_rows, stats = [], defaultdict(int)
tot_ga = defaultdict(lambda: {"sep": 0, "oct": 0})
matched_ga = defaultdict(lambda: {"sep": 0, "oct": 0})
dropped = defaultdict(int)
anomalies = []
LOC_CUT = 26                        # the M2S kecamatan file is matched to GA BIOMETRIC up to about 26 Sep (IM3)
kec_tag = defaultdict(lambda: {"s26": 0, "sf": 0, "o": 0, "sso26": 0})
kk_mc = defaultdict(lambda: defaultdict(int))
tag_unmapped = defaultdict(int)
for (brand, oid), x in rows_by.items():
    mk = (by_im3 if brand == "IM3" else by_3id).get(oid)
    qs, qo = sum(x["s"].values()), sum(x["o"].values())
    if x.get("kk"):
        kk_mc[x["kk"]][x["mc"]] += 1
        kt = kec_tag[(x["kk"], brand)]
        q26 = sum(q for d, q in x["s"].items() if d <= LOC_CUT)
        kt["s26"] += q26; kt["sf"] += qs; kt["o"] += qo
        if q26 > 0:
            kt["sso26"] += 1
    else:
        tag_unmapped[brand] += qs
    tot_ga[brand]["sep"] += qs; tot_ga[brand]["oct"] += qo
    for per, arr in (("s", x["s"]), ("o", x["o"])):
        for d, q in arr.items():
            if q >= OUTLIER_DAY_QTY:
                anomalies.append({"brand": brand, "id": oid, "name": x["n"], "month": "Sep" if per == "s" else "Okt", "day": d, "qty": q})
    if mk:
        m = master[mk]
        key, tier, mc, br, kec, site, dse, name = mk, "M", m["mc"], m["br"], m["kec"], m["site"], m["dse"], m["n"] or x["n"]
        matched_ga[brand]["sep"] += qs; matched_ga[brand]["oct"] += qo
    else:
        if qs + qo <= 0:
            dropped[brand] += 1
            continue
        key, tier = f"G:{brand}:{oid}", "G"
        mc = x["mc"]
        br = (mc_info.get(mc) or {}).get("br") or OUTSIDE
        if mc not in mc_info:
            unknown_mc[mc] += qs + qo
        kec, site, name = x["kec"], "", x["n"]
        dse = code2dse.get(x["dsec"], "") or (x["dsec"] if x["dsec"] in known_dse else "UNASSIGNED")
    if tier == "M" and mc not in mc_info:
        br = br or OUTSIDE
    stats[tier] += 1
    row = {"k": key, "i": oid, "b": brand, "t": tier, "n": name, "mc": mc, "br": br, "dse": dse, "sg": x["sg"]}
    if kec:
        row["kec"] = kec
    if site:
        row["site"] = site
    if x["hy"]:
        row["hy"] = 1
    if x["s"]:
        row["s"] = [v for d in sorted(x["s"]) for v in (d, x["s"][d])]
    if x["o"]:
        row["o"] = [v for d in sorted(x["o"]) for v in (d, x["o"][d])]
    out_rows.append(row)
out_rows.sort(key=lambda r: (r["br"], r["mc"], r["dse"], r["k"], r["b"]))
phys = {r["k"] for r in out_rows}
print(f"   {len(out_rows):,} baris brand-outlet, {len(phys):,} outlet fisik; master {stats['M']:,}, di luar master (GA > 0) {stats['G']:,}; dibuang (di luar master, tanpa GA) {dict(dropped)}")
for b in ("IM3", "3ID"):
    for per, lab in (("sep", "Sep"), ("oct", "Okt")):
        t, m = tot_ga[b][per], matched_ga[b][per]
        print(f"   GA {b} {lab}: {t:>8,} pcs, di outlet master {m:>8,} ({m / t:.1%})" if t else f"   GA {b} {lab}: 0")

# ---------------------------------------------------------------- control totals + validation
print("[5/5] Kontrol GA BIOMETRIC dan #OUTLET ACTIVE GA...")
control = {"bio": {}, "active": {}, "files": []}
for p in pick(r"\.xlsx$"):
    try:
        brand, label, data = read_control_xlsx(p)
    except Exception as e:      # noqa: BLE001
        print("   lewati", os.path.basename(p), e)
        continue
    lab = label.upper()
    kind = "bio" if "BIOMETRIC" in lab else ("active" if "OUTLET ACTIVE" in lab else None)
    if not kind or brand not in ("IM3", "3ID"):
        continue
    control[kind][brand] = {mn[:3]: {str(d): v for d, v in days.items()} for mn, days in data.items()}
    control["files"].append(os.path.basename(p))


def summary_days(brand, per, name):
    s = summaries.get((brand, per), {}).get(name)
    return {d: v for d, v in (s or {}).items() if isinstance(v, (int, float))}


# daily totals recomputed from rows vs the workbook's own summary rows (parser validation)
recon = {}
for brand in ("IM3", "3ID"):
    for per, key, ndays in (("sep", "s", 30), ("oct", "o", max(cut_day, 1))):
        mine = defaultdict(int)
        sso = defaultdict(int)
        sso_pjp = defaultdict(int)
        for r in out_rows:
            if r["b"] != brand or key not in r:
                continue
            a = r[key]
            for i in range(0, len(a), 2):
                mine[a[i]] += a[i + 1]; sso[a[i]] += 1
                if r["sg"] == "PJP":
                    sso_pjp[a[i]] += 1
        ws = summary_days(brand, per, "#RGUGA") or summary_days(brand, per, "RGUGA")
        wu = summary_days(brand, per, "UAR ALL OUTLET") or summary_days(brand, per, "UAR ALL")
        # the rows kept in the feed exclude only zero-GA outsiders, so totals must equal the workbook's own summary
        diffq = sum(abs(mine[d] - int(round(ws.get(d, 0)))) for d in range(1, ndays + 1))
        diffu = sum(abs(sso[d] - int(round(wu.get(d, 0)))) for d in range(1, ndays + 1))
        recon[f"{brand}|{per}"] = {"ga_workbook": sum(int(round(ws.get(d, 0))) for d in range(1, ndays + 1)), "ga_feed": sum(mine[d] for d in range(1, ndays + 1)),
                                   "abs_diff_qty": diffq, "abs_diff_sso": diffu}
        print(f"   {brand} {per}: GA feed {sum(mine[d] for d in range(1, ndays + 1)):,} vs ringkasan workbook {sum(int(round(ws.get(d, 0))) for d in range(1, ndays + 1)):,} (selisih harian absolut {diffq}); SSO harian selisih absolut {diffu}")

# ---------------------------------------------------------------- activation LOCATION (kecamatan of the activating site), September only
print("[6/6] Lokasi aktivasi (M2S KECAMATAN, September)...")
location = {"kec": [], "source": None, "tag_cut": LOC_CUT}
m2s_files = pick(r"M2S.*\.xlsb$")
if m2s_files:
    m2s = read_sheets(m2s_files[0], {"IM3-DATA", "3ID-DATA"})
    location["source"] = m2s_files[0]
    loc = defaultdict(dict)
    for sh, brand in (("IM3-DATA", "IM3"), ("3ID-DATA", "3ID")):
        for r in m2s.get(sh, []):
            kk = r.get(1)
            if r.get(0) == brand and isinstance(kk, str) and "|" in kk:
                num = lambda v: int(round(v)) if isinstance(v, (int, float)) else 0
                loc[kk][brand] = {"gl": num(r.get(2)), "gm": num(r.get(3)), "sl": num(r.get(4)), "sm": num(r.get(5))}
    for kk, byb in sorted(loc.items()):
        mcs = kk_mc.get(kk)
        mc = max(mcs, key=mcs.get) if mcs else ""
        row = {"kk": kk, "kec": kk.split("|")[0], "mc": mc, "br": (mc_info.get(mc) or {}).get("br", OUTSIDE)}
        for b in ("IM3", "3ID"):
            t = kec_tag.get((kk, b), {"s26": 0, "sf": 0, "o": 0, "sso26": 0})
            row[b] = dict(byb.get(b, {"gl": 0, "gm": 0, "sl": 0, "sm": 0}), t26=t["s26"], tf=t["sf"], to=t["o"], ts=t["sso26"])
        location["kec"].append(row)
    print(f"   {len(location['kec'])} kecamatan; lokasi IM3 {sum(r['IM3']['gm'] for r in location['kec']):,} vs tagging 1-{LOC_CUT} Sep {sum(r['IM3']['t26'] for r in location['kec']):,}; 3ID {sum(r['3ID']['gm'] for r in location['kec']):,} vs {sum(r['3ID']['t26'] for r in location['kec']):,}")
else:
    print("   file M2S KECAMATAN tidak ditemukan: tampilan lokasi aktivasi hanya level region (GA BIOMETRIC)")
tag = {"oct_outside_ij": {b: {str(d): q for d, q in sorted(oct_other[b].items())} for b in oct_other}, "oct_blank": {b: {str(d): q for d, q in sorted(oct_blank[b].items())} for b in oct_blank},
       "raw_stats": raw_stats, "sheet_totals": {"sep": sheet_sep_total, "oct": sheet_oct_total}, "unmapped_kec_ga_sep": dict(tag_unmapped)}

meta = {
    "generated_at": datetime.now().isoformat(timespec="seconds"), "contract": "docs/assessments/ga_rguga_outlet.md",
    "sources": {"sep": SEP_SRC, "oct": OCT_SRC, "control": control["files"]},
    "months": {"prev": "2026-09", "cur": "2026-10"}, "prev_days": 30, "cur_days": 31, "cut_day": cut_day,
    "definitions": {"GA": "qty_ga per outlet per hari (RGUGA, jumlah MSISDN gross add di outlet)", "SSO": "SIM Selling Outlet: outlet dengan >= 1 GA pada periode (baris UAR di workbook RGUGA)",
                    "segment": "PJP / NON / KAM = FINAL OUTLET di workbook"},
    "row_fields": {"k": "kunci outlet fisik (master: outlet_key; di luar master: G:BRAND:id)", "i": "id outlet pada brand itu", "b": "IM3 | 3ID", "t": "M master | G di luar master",
                   "s": "[hari, qty, ...] September", "o": "[hari, qty, ...] Oktober", "hy": "1 = outlet hybrid (Sep)", "sg": "PJP | NON | KAM"},
    "mc_info": mc_info,
    "universe_rows": universe, "dropped_outside_zero": dict(dropped),
    "ga_total": {b: dict(v) for b, v in tot_ga.items()}, "ga_in_master": {b: dict(v) for b, v in matched_ga.items()},
    "unknown_mc": {k: v for k, v in sorted(unknown_mc.items(), key=lambda kv: -kv[1])[:30]},
    "anomalies": sorted(anomalies, key=lambda a: -a["qty"])[:20], "anomaly_threshold": OUTLIER_DAY_QTY,
    "workbook_check": recon, "tag": tag, "location": location, "control": {"bio": control["bio"], "active": control["active"]},
    "notes": ["Dua sudut GA: TAGGING (outlet sell-in yang mencatat MSISDN, dasar insentif DSE) dan LOKASI AKTIVASI (site / kecamatan tempat GA terjadi, dasar kinerja HoA, Region, DSO). RGUGA per outlet = tagging; GA BIOMETRIC dan M2S KECAMATAN = lokasi.",
              "Sumber angka per outlet adalah pivot raw (raw_im3 / raw_3id September, raw im3 / raw 3id Oktober); sheet outlet RGUGA hanya dipakai untuk atribut. Pivot raw Oktober berisi semua outlet nasional: yang bukan outlet Inner Jakarta dicatat sebagai total harian di metadata.tag.",
              "Kontrol GA BIOMETRIC adalah total region per brand (bukan per outlet); selisih dengan GA per outlet RGUGA ditampilkan di tab Harian.",
              "LMTD GA = September tanggal 1..cut. September penuh tersedia (30 hari).",
              "Outlet di luar master hanya disertakan bila punya GA > 0; outlet master selalu disertakan (tanpa deret harian bila nol)."],
}
feed = {"metadata": meta, "outlets": out_rows}
os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(feed, f, ensure_ascii=False, separators=(",", ":"))
with open(OUT_JS, "w", encoding="utf-8") as f:
    f.write("// Auto-generated Gross Add (SSO) feed dari raw/GA. Kontrak: docs/assessments/ga_rguga_outlet.md\n")
    f.write("var GA_FEED = ")
    json.dump(feed, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\nif (typeof window !== 'undefined') window.GA_FEED = GA_FEED;\n")
print(f"SUCCESS: {OUT_JS} ({os.path.getsize(OUT_JS) / 1024:.0f} KB); {len(out_rows):,} baris, cut {cut_day} Okt")
