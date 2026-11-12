#!/usr/bin/env python3
"""
build_target_kpi_feed.py  ·  Target KPI IE per HoA (Area), DSO (MC) and partner (PT), month by month

Inputs, one CSV per month (the governed input, editable): data/catalogues/target_kpi/<YYYYMM>.csv
  columns: month, brand (IOH | IM3 | 3ID), level (region | area | mc | pt), branch, mc, pt, partner_type, partner, name, kpi, value, source
A month CSV is (re)written from its workbook when the workbook is newer than the CSV, so a new month = drop the workbook in raw/Targets/
and add one line to MONTH_SOURCES (or hand-edit / add the CSV).
  2026-11: raw/Targets/*Target KPI IE November 2026*INNER*.xlsb (CHECKED version preferred): sheets Summary (IOH | 3ID | IM3 per Region, Area, MC;
           the Name column is the HoA of an Area and the DSO of an MC), IM3_PT and 3ID_PT (per partner PT).
  2026-10: partial, derived from sources already in the app: SELL IN = Sell-In SP target per area / MC (target_feed, rebalanced DSE targets),
           OSA (Rp) (target_feed), TOTAL RGU GA = M2S KECAMATAN October target per area / MC (ga_feed target.kec). Every other KPI is n/a.
Output: website/data/target_kpi_feed.js (TARGET_KPI_FEED) and data/processed/target_kpi_feed.json.
Contract: docs/assessments/target_kpi_hoa_dso.md.   Pure stdlib.   Run: python3 scripts/build_target_kpi_feed.py
"""
import csv
import datetime
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from xlsb_reader import read_sheets  # noqa: E402

DIR = "data/catalogues/target_kpi"
OUT_JS = "website/data/target_kpi_feed.js"
OUT_JSON = "data/processed/target_kpi_feed.json"
BRANDS = ("IOH", "IM3", "3ID")
# kpi -> (label, unit, group)
KPIS = {
    "SELL IN": ("Sell-In", "pcs", "Sell-In"), "SELL IN KAM": ("Sell-In KAM", "pcs", "Sell-In"),
    "TOTAL RGU GA": ("Total RGU GA", "pcs", "Gross Add"), "RGU GA 5G": ("RGU GA 5G", "pcs", "Gross Add"), "RGU GA NON 5G": ("RGU GA non 5G", "pcs", "Gross Add"),
    "M2S": ("M2S", "pcs", "Gross Add"), "FWA 4G": ("FWA 4G", "pcs", "Gross Add"),
    "Acq Rev": ("Acq Rev", "Rp", "Revenue & Trade"), "Primary": ("Primary", "Rp", "Revenue & Trade"), "Secondary": ("Secondary", "Rp", "Revenue & Trade"),
    "Secondary KAM": ("Secondary KAM", "Rp", "Revenue & Trade"), "Trade Supply": ("Trade Supply", "Rp", "Revenue & Trade"), "Trade Demand": ("Trade Demand", "Rp", "Revenue & Trade"),
    "Tertiary B#": ("Tertiary B#", "Rp", "Revenue & Trade"), "Prepaid": ("Prepaid", "Rp", "Revenue & Trade"),
    "OSA": ("OSA (Rp)", "Rp", "Sell-In"),
}
BRANCH_FIX = {"KOTA BEKASI": "BEKASI"}          # the workbook says KOTA BEKASI, feeds and filters keep BEKASI (displayed as KOTA BEKASI)
MONTH_SOURCES = {"2026-11": "raw/Targets/*Target KPI IE November 2026*INNER*.xlsb"}
MONTH_LABEL = {"2026-10": "Oktober 2026", "2026-11": "November 2026"}


def load_js(path):
    s = open(path, encoding="utf-8").read()
    return json.JSONDecoder().raw_decode(s[s.index("=") + 1:].lstrip())[0]


def fix_branch(b):
    b = str(b or "").strip().upper()
    return BRANCH_FIX.get(b, b)


def excel_date(v):
    try:
        return (datetime.date(1899, 12, 30) + datetime.timedelta(days=int(float(v)))).isoformat()
    except (TypeError, ValueError):
        return None


def pick_workbook(pattern):
    files = glob.glob(pattern)
    files.sort(key=lambda p: (0 if os.path.basename(p).upper().startswith("CHECKED") else 1, -os.path.getmtime(p)))
    return files[0] if files else None


def rows_from_workbook(month, path):
    """Summary + partner sheets -> long rows."""
    sh = read_sheets(path)
    S = sh["Summary"]
    upd = excel_date(S[0].get(2))
    kp = [S[1][c] for c in range(4, 19)]
    blk = {"IOH": 4, "3ID": 19, "IM3": 34}
    src = os.path.basename(path)
    out = []

    def add(level, branch, mc, name, r, extra=None):
        for b, c0 in blk.items():
            for i, k in enumerate(kp):
                v = r.get(c0 + i)
                if v in (None, ""):
                    continue
                out.append({"month": month, "brand": b, "level": level, "branch": branch, "mc": mc, "pt": "", "partner_type": "", "partner": "", "name": name, "kpi": k, "value": float(v), "source": src + " · Summary"})
    add("region", "", "", S[2].get(3) or "", S[2])
    for r in S[8:15]:
        if r.get(2):
            add("area", fix_branch(r[2]), "", str(r.get(3) or "").strip(), r)
    for r in S[17:60]:
        if str(r.get(2) or "").startswith("MC-"):
            add("mc", fix_branch(r[1]), r[2], str(r.get(3) or "").strip(), r)
    for sname, brand, hdr_first in (("IM3_PT", "IM3", 16), ("3ID_PT", "3ID", 16)):
        rows = sh.get(sname)
        if not rows:
            continue
        # header row 16: REGION | BRANCH | MC | PT | (PARTNER TYPE | NAMA PARTNER) or (PARTNER ID | NAMA PARTNER | TIPE PARTNER) | KPIs
        hdr = {c: str(v).strip() for c, v in rows[hdr_first].items() if v not in (None, "")}
        inv, inv2 = {}, {}
        for c in sorted(hdr):
            u = hdr[c].upper()
            if u in inv:
                inv2.setdefault(u, c)      # second block = TARGET - FINAL APPROVED HQ (equal to the rebalancing block; checked)
            else:
                inv[u] = c
        c_br, c_mc, c_pt = inv["BRANCH"], inv["MC"], inv["PT"]
        c_type = inv.get("PARTNER TYPE") or inv.get("TIPE PARTNER")
        c_name = inv["NAMA PARTNER"]
        kcols = {k: inv[k.upper()] for k in KPIS if k.upper() in inv and k != "OSA"}
        for r in rows[hdr_first + 1:]:
            if not str(r.get(c_mc) or "").startswith("MC-"):
                continue
            for k, c in kcols.items():
                v = r.get(c)
                if v in (None, ""):
                    continue
                v2 = r.get(inv2.get(k.upper(), -1))
                if isinstance(v2, (int, float)) and abs(v2 - v) > max(1.0, abs(v) * 1e-6):
                    print(f"   note: {sname} {r.get(c_pt)} {k}: rebalancing {v:,.0f} ≠ approved {v2:,.0f}")
                out.append({"month": month, "brand": brand, "level": "pt", "branch": fix_branch(r.get(c_br)), "mc": r.get(c_mc), "pt": r.get(c_pt), "partner_type": str(r.get(c_type) or "").strip(),
                            "partner": str(r.get(c_name) or "").strip(), "name": "", "kpi": k, "value": float(v), "source": src + " · " + sname})
    return out, upd


def rows_oct():
    """October (partial): Sell-In SP and OSA from the rebalanced DSE targets, GA from the M2S KECAMATAN target."""
    T = load_js("website/data/target_feed.js")
    G = load_js("website/data/ga_feed.js")
    out = []

    def add(level, branch, mc, name, vals, src):
        for brand, kv in vals.items():
            for k, v in kv.items():
                if v is None:
                    continue
                out.append({"month": "2026-10", "brand": brand, "level": level, "branch": branch, "mc": mc, "pt": "", "partner_type": "", "partner": "", "name": name, "kpi": k, "value": float(v), "source": src})
    srcT = "target_feed (Target DSE Hybrid FINAL REBALANCING, Oktober)"
    srcG = "ga_feed target.kec (M2S KECAMATAN, Oktober)"
    # GA per area / mc
    ga_mc, ga_ar = {}, {}
    for r in G["metadata"]["target"]["kec"]:
        for b in ("IM3", "3ID"):
            ga_mc.setdefault((r["br"], r["mc"]), {"IM3": 0.0, "3ID": 0.0})[b] += r.get(b) or 0
            ga_ar.setdefault(r["br"], {"IM3": 0.0, "3ID": 0.0})[b] += r.get(b) or 0
    tot = {"IM3": {"SELL IN": 0, "OSA": 0, "TOTAL RGU GA": 0}, "3ID": {"SELL IN": 0, "OSA": 0, "TOTAL RGU GA": 0}}
    for a in T["areas"]:
        v = {"IM3": {"SELL IN": a["sp"][0], "OSA": a["osa"][0], "TOTAL RGU GA": ga_ar.get(a["br"], {}).get("IM3")}, "3ID": {"SELL IN": a["sp"][1], "OSA": a["osa"][1], "TOTAL RGU GA": ga_ar.get(a["br"], {}).get("3ID")}}
        for b in v:
            for k in tot[b]:
                tot[b][k] += v[b][k] or 0
        v["IOH"] = {k: ((v["IM3"][k] or 0) + (v["3ID"][k] or 0)) for k in tot["IM3"]}
        hoa = next((m["hoa"] for m in T["mcs"] if m["br"] == a["br"]), "")
        add("area", a["br"], "", hoa, v, srcT + "; " + srcG)
    for m in T["mcs"]:
        g = ga_mc.get((m["br"], m["mc"]), {})
        v = {"IM3": {"SELL IN": m["sp"][0], "OSA": m["osa"][0], "TOTAL RGU GA": g.get("IM3")}, "3ID": {"SELL IN": m["sp"][1], "OSA": m["osa"][1], "TOTAL RGU GA": g.get("3ID")}}
        v["IOH"] = {k: ((v["IM3"][k] or 0) + (v["3ID"][k] or 0)) for k in tot["IM3"]}
        add("mc", m["br"], m["mc"], m["dso"], v, srcT + "; " + srcG)
    rv = {b: dict(tot[b]) for b in tot}
    rv["IOH"] = {k: tot["IM3"][k] + tot["3ID"][k] for k in tot["IM3"]}
    add("region", "", "", "", rv, srcT + "; " + srcG)
    return out


def write_csv(month, rows):
    os.makedirs(DIR, exist_ok=True)
    p = os.path.join(DIR, month.replace("-", "") + ".csv")
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["month", "brand", "level", "branch", "mc", "pt", "partner_type", "partner", "name", "kpi", "value", "source"])
        w.writeheader()
        for r in rows:
            r = dict(r)
            r["value"] = repr(round(r["value"], 4)) if abs(r["value"]) < 1e6 else str(int(round(r["value"])))
            w.writerow(r)
    return p


def main():
    meta_months = {}
    for month, pat in MONTH_SOURCES.items():
        wb = pick_workbook(pat)
        p = os.path.join(DIR, month.replace("-", "") + ".csv")
        if wb and (not os.path.exists(p) or os.path.getmtime(wb) > os.path.getmtime(p)):
            rows, upd = rows_from_workbook(month, wb)
            write_csv(month, rows)
            meta_months[month] = {"workbook": os.path.basename(wb), "updated": upd}
            print(f"{month}: {len(rows)} rows from {os.path.basename(wb)} (workbook date {upd}) -> {p}")
        elif os.path.exists(p):
            print(f"{month}: using {p}")
    if not os.path.exists(os.path.join(DIR, "202610.csv")) or os.environ.get("REBUILD_OCT"):
        write_csv("2026-10", rows_oct())
        print("2026-10: partial CSV derived from target_feed + ga_feed")
    # ---- read every month CSV
    data = {}
    for p in sorted(glob.glob(os.path.join(DIR, "*.csv"))):
        for r in csv.DictReader(open(p, encoding="utf-8")):
            m = data.setdefault(r["month"], {"region": {}, "areas": {}, "mcs": {}, "pts": {}, "kpis": set(), "src": set()})
            v = float(r["value"])
            m["kpis"].add(r["kpi"])
            m["src"].add(r["source"].split(" · ")[0])
            lv = r["level"]
            if lv == "region":
                m["region"].setdefault(r["brand"], {})[r["kpi"]] = v
                m["region_name"] = r["name"]
            elif lv == "area":
                a = m["areas"].setdefault(r["branch"], {"br": r["branch"], "hoa_src": r["name"]})
                a.setdefault(r["brand"], {})[r["kpi"]] = v
            elif lv == "mc":
                a = m["mcs"].setdefault(r["mc"], {"br": r["branch"], "mc": r["mc"], "dso_src": r["name"]})
                a.setdefault(r["brand"], {})[r["kpi"]] = v
            elif lv == "pt":
                k = (r["brand"], r["mc"], r["pt"])
                a = m["pts"].setdefault(k, {"brand": r["brand"], "br": r["branch"], "mc": r["mc"], "pt": r["pt"], "type": r["partner_type"], "partner": r["partner"], "vals": {}})
                a["vals"][r["kpi"]] = v
    # ---- master names (HoA / DSO) and checks
    K = load_js("website/data/kro_feed.js")
    mi = K["metadata"]["mc_info"]
    hoa_of = {}
    for mc, x in mi.items():
        hoa_of.setdefault(x["br"], x.get("hoa") or "")
    months, checks, feed_months = [], [], {}
    for month in sorted(data):
        m = data[month]
        for a in m["areas"].values():
            a["hoa"] = hoa_of.get(a["br"]) or a["hoa_src"].title()
        for x in m["mcs"].values():
            x["dso"] = (mi.get(x["mc"]) or {}).get("dso") or x["dso_src"]
        ck = []
        # sums
        addv = [k for k in m["kpis"] if "KAM" not in k]
        for b in BRANDS:
            for k in addv:
                rg = m["region"].get(b, {}).get(k)
                sa = sum(a.get(b, {}).get(k, 0) for a in m["areas"].values())
                sm = sum(x.get(b, {}).get(k, 0) for x in m["mcs"].values())
                if rg is None or not m["areas"]:
                    continue
                if abs(sa - rg) > max(1.0, abs(rg) * 1e-5):
                    ck.append(f"{b} {k}: area sum {sa:,.0f} ≠ region {rg:,.0f}")
                if m["mcs"] and abs(sm - rg) > max(1.0, abs(rg) * 1e-5):
                    ck.append(f"{b} {k}: MC sum {sm:,.0f} ≠ region {rg:,.0f}")
        for x in list(m["mcs"].values()) + list(m["areas"].values()):
            for k in m["kpis"]:
                i, a3, b3 = (x.get("IOH") or {}).get(k), (x.get("IM3") or {}).get(k), (x.get("3ID") or {}).get(k)
                if None not in (i, a3, b3) and abs(i - a3 - b3) > max(1.0, abs(i) * 1e-5):
                    ck.append(f"{x.get('mc') or x.get('br')} {k}: IOH ≠ IM3 + 3ID")
        gaw = [x["mc"] for x in m["mcs"].values() if all(k in (x.get("IOH") or {}) for k in ("TOTAL RGU GA", "RGU GA 5G", "RGU GA NON 5G")) and abs(x["IOH"]["TOTAL RGU GA"] - x["IOH"]["RGU GA 5G"] - x["IOH"]["RGU GA NON 5G"]) > 2]
        if gaw:
            ck.append(f"TOTAL RGU GA ≠ 5G + non 5G at {len(gaw)} of {len(m['mcs'])} MC (the workbook rows do not add up; TOTAL RGU GA is the target used)")
        pts_chk = {}
        for p in m["pts"].values():
            for k, v in p["vals"].items():
                pts_chk[(p["brand"], k)] = pts_chk.get((p["brand"], k), 0) + v
        for (b, k), v in sorted(pts_chk.items()):
            rg = m["region"].get(b, {}).get(k)
            if rg is not None and abs(v - rg) > max(1.0, abs(rg) * 1e-5):
                ck.append(f"{b} {k}: partner sum {v:,.1f} ≠ region {rg:,.1f}")
        for kk in ("KAM",):
            kam = [k for k in m["kpis"] if kk in k]
            for k in kam:
                if m["region"].get("IOH", {}).get(k) is not None and not any(a.get("IOH", {}).get(k) for a in m["areas"].values()):
                    ck.append(f"{k}: region only (Rp / pcs not allocated to Area or MC in the workbook)")
        mm = meta_months.get(month, {})
        months.append({"m": month, "label": MONTH_LABEL.get(month, month), "kpis": [k for k in KPIS if k in m["kpis"]], "source": sorted(m["src"]), "workbook": mm.get("workbook"), "updated": mm.get("updated"),
                       "partial": month == "2026-10", "checks": ck, "areas": len(m["areas"]), "mcs": len(m["mcs"]), "pts": len(m["pts"])})
        feed_months[month] = {"region": m["region"], "areas": sorted(m["areas"].values(), key=lambda a: a["br"]), "mcs": sorted(m["mcs"].values(), key=lambda a: (a["br"], a["mc"])), "pts": sorted(m["pts"].values(), key=lambda a: (a["br"], a["mc"], a["brand"], a["pt"]))}
        checks.append((month, ck))
    feed = {"metadata": {"generated_at": datetime.datetime.now().isoformat(timespec="seconds"), "contract": "docs/assessments/target_kpi_hoa_dso.md", "months": months,
                         "kpi_meta": {k: {"label": v[0], "unit": v[1], "group": v[2]} for k, v in KPIS.items()}, "brands": list(BRANDS), "branch_fix": BRANCH_FIX,
                         "notes": ["HoA = head of an Area (Name of the Area rows), DSO = head of a Micro Cluster (Name of the MC rows); displayed names are those of the app master, the workbook spelling is kept as hoa_src / dso_src.",
                                   "KOTA BEKASI of the workbook = branch BEKASI of the feeds.", "IOH = IM3 + 3ID for every additive KPI; Sell-In KAM and Secondary KAM exist for IOH at Region level only."]},
            "months": feed_months}
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(feed, f, ensure_ascii=False, separators=(",", ":"))
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("// Auto-generated Target KPI IE per HoA / DSO / partner, month by month. Kontrak: docs/assessments/target_kpi_hoa_dso.md\nvar TARGET_KPI_FEED = ")
        json.dump(feed, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\nif (typeof window !== 'undefined') window.TARGET_KPI_FEED = TARGET_KPI_FEED;\n")
    for month, ck in checks:
        print(f"\n== {month}: {len(ck)} check note(s)")
        for c in ck:
            print("   -", c)
    print("\nOK:", OUT_JS, round(os.path.getsize(OUT_JS) / 1e3), "KB")


if __name__ == "__main__":
    main()
