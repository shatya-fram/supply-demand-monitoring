#!/usr/bin/env python3
"""
build_kro_feed.py  ·  KRO / Wholesaler catalogue and outlet tracking (GA basis and SUPPLY basis)

Joins four governed feeds per physical outlet:
  GA (Daily_RGUGA, tagging)       website/data/ga_feed.js        GA per outlet per day, September + October
  SUPPLY (MOBII sell-in)          website/data/penjualan_feed.js Starter Pack (SP) pcs, voucher, saldo; SP Injection (MOBO) MTD
  DEMAND (MOBO)                   website/data/demand_feed.js    reload / voucher / CVM / paket data, saldo transacted
  PJP VISITS (MOBI journey plan)  website/data/dse_visits_feed.js executed / planned stops per outlet per day

Standard slab ladder (owner, 18 Oct 2026, replaces the first 60 / 100 / 200 proposal), per outlet per month, pcs:
  RETAIL       0 | 1-10 | 11-30
  KRO          31-60 | 61-100
  WHOLESALER   101-200 | 201-500 | 501-1000 | > 1000
The upper bound belongs to the lower slab (same convention as the SG_PCS slabs of Slab Sell-in). Applied to GA pcs (GA basis)
and to Starter Pack sell-in pcs (SUPPLY basis).

Output: data/processed/kro_feed.json, website/data/kro_feed.js (KRO_FEED),
        data/catalogues/kro_outlet_catalogue.csv (governed catalogue, base = last full month).
Contract: docs/assessments/ga_kro_deep_dive.md
Pure stdlib.  Run after build_ga_feed, build_sellin_feed / penjualan, demand and visits:  python3 scripts/build_kro_feed.py
"""
import csv
import json
import os
import re
from collections import defaultdict, Counter
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
DATA = "website/data"
OUT_JSON = "data/processed/kro_feed.json"
OUT_JS = "website/data/kro_feed.js"
OUT_CSV = "data/catalogues/kro_outlet_catalogue.csv"

NEAR = 25                      # watch list: monthly volume above this but not yet a KRO (> 30)
# (code, category, label, rule, lower bound exclusive); ordered high to low
SLABS = [("W4", "W", "Wholesaler > 1000", "> 1000", 1000), ("W3", "W", "Wholesaler 500–1000", "> 500 – 1000", 500), ("W2", "W", "Wholesaler 200–500", "> 200 – 500", 200),
         ("W1", "W", "Wholesaler 100–200", "> 100 – 200", 100), ("K2", "K", "KRO 60–100", "> 60 – 100", 60), ("K1", "K", "KRO 30–60", "> 30 – 60", 30),
         ("R2", "R", "Retail 10–30", "> 10 – 30", 10), ("R1", "R", "Retail 1–10", "1 – 10", 0)]
CLASSES = [{"k": c, "cat": cat, "label": lab, "rule": rule} for c, cat, lab, rule, _ in SLABS] + [{"k": "N", "cat": "N", "label": "Tanpa volume", "rule": "0"}]
RANK = {"N": 0, "R1": 1, "R2": 2, "K1": 3, "K2": 4, "W1": 5, "W2": 6, "W3": 7, "W4": 8}
CAT = {c: cat for c, cat, *_ in SLABS}
CAT["N"] = "N"


def load_js(name):
    s = open(os.path.join(DATA, name), encoding="utf-8").read()
    i = s.index("=") + 1
    obj, _ = json.JSONDecoder().raw_decode(s[i:].lstrip())
    return obj


def cls(v):
    if v is None or v <= 0:
        return "N"
    for code, _cat, _lab, _rule, lo in SLABS:
        if v > lo:
            return code
    return "R1"


def days_arr(a):
    d = [0] * 32
    for i in range(0, len(a or []), 2):
        d[a[i]] += a[i + 1]
    return d


def main():
    GA = load_js("ga_feed.js")
    PJ = load_js("penjualan_feed.js")
    DM = load_js("demand_feed.js")
    VS = load_js("dse_visits_feed.js")
    TR = load_js("territory_feed.js")
    gm, pm, dm, vm = GA["metadata"], PJ["metadata"], DM["metadata"], VS["metadata"]
    ga_cut, sup_cut, dem_cut = gm["cut_day"], pm["cut_day"], dm["cut_day"]
    vis_cut = len(vm["days"])
    mi = gm.get("mc_info", {})

    # ---- master attributes
    tmaster = {o["outlet_key"]: o for o in TR["outlets"]}

    # ---- GA folded to physical outlet
    out = {}
    for r in GA["outlets"]:
        o = out.get(r["k"])
        if not o:
            o = out[r["k"]] = {"k": r["k"], "t": r["t"], "ids": {}, "n": r.get("n") or "", "mc": r.get("mc") or "", "br": r.get("br") or "",
                                "dse": r.get("dse") or "", "sg": r.get("sg") or "", "kec": r.get("kec") or "", "site": r.get("site") or "",
                                "s": [0] * 32, "o": [0] * 32, "bs": {"IM3": [0, 0], "3ID": [0, 0]}}
        if not o["sg"] and r.get("sg"):
            o["sg"] = r["sg"]
        o["ids"][r["b"]] = r["i"]
        s, c = days_arr(r.get("s")), days_arr(r.get("o"))
        for d in range(1, 32):
            o["s"][d] += s[d]
            o["o"][d] += c[d]
        o["bs"][r["b"]][0] += sum(s[1:31])
        o["bs"][r["b"]][1] += sum(c[1:ga_cut + 1])

    # ---- SUPPLY (MOBII) by physical key, then by (brand, id)
    sup, sup_bid = {}, defaultdict(list)
    for o in PJ["outlets"]:
        if o["tier"] == "M":
            sup[o["k"]] = o
        sup_bid[(o["b"], str(o["id"]))].append(o)

    # ---- supply-only outlets: sell-in rows (adhoc, or master without GA row) that no GA outlet claims. Starter Packs delivered to an outlet that never records GA are the
    # most relevant SUPPLY-basis flags, so they join the universe with zero GA (t = "S").
    claimed = set()
    for k, o in out.items():
        if k in sup:
            claimed.add(id(sup[k]))
        for b, i in o["ids"].items():
            for x in sup_bid.get((b, str(i)), []):
                claimed.add(id(x))
    n_sup_only = 0
    for x in PJ["outlets"]:
        if id(x) in claimed:
            continue
        c = x.get("c") or {}
        sp = c.get("SP") or [0] * 6
        if not ((sp[0] or 0) or (sp[2] or 0) or (sp[4] or 0) or ((c.get("SPI") or [0])[0] or 0)):
            continue
        pk = "S:" + str(x["k"])
        if pk in out:
            continue
        out[pk] = {"k": pk, "t": "S", "ids": {x["b"]: str(x["id"])}, "n": x.get("n") or "", "mc": x.get("mc") or "", "br": (mi.get(x.get("mc") or "", {}) or {}).get("br", ""),
                   "dse": x.get("dse") or "", "sg": "", "kec": x.get("kec") or "", "site": x.get("site") or "", "s": [0] * 32, "o": [0] * 32, "bs": {"IM3": [0, 0], "3ID": [0, 0]}, "_pj": x}
        n_sup_only += 1

    def supply_of(k, ids):
        rows = [sup[k]] if k in sup else [x for b, i in ids.items() for x in sup_bid.get((b, str(i)), [])]
        if not rows and k in out and out[k].get("_pj"):
            rows = [out[k]["_pj"]]
        seen, acc = set(), {"sp": [0, 0, 0], "spi": 0, "vc": [0, 0, 0], "sal": [0, 0, 0], "spv": 0, "spd": defaultdict(int)}
        for x in rows:
            if id(x) in seen:
                continue
            seen.add(id(x))
            c = x["c"]
            sp = c.get("SP") or []
            acc["sp"][0] += (sp[0] if len(sp) > 0 else 0) or 0
            acc["sp"][1] += (sp[2] if len(sp) > 2 else 0) or 0
            acc["sp"][2] += (sp[4] if len(sp) > 4 else 0) or 0
            acc["spv"] += (sp[1] if len(sp) > 1 else 0) or 0
            for dd in (sp[10] if len(sp) > 10 and sp[10] else []):   # [[day, value, qty]]
                acc["spd"][dd[0]] += dd[2] or 0
            acc["spi"] += ((c.get("SPI") or [0])[0]) or 0
            for key in ("VCF", "VCB"):
                v = c.get(key) or []
                acc["vc"][0] += (v[0] if len(v) > 0 else 0) or 0
                acc["vc"][1] += (v[2] if len(v) > 2 else 0) or 0
                acc["vc"][2] += (v[4] if len(v) > 4 else 0) or 0
            sa = c.get("SALMO") or []
            acc["sal"][0] += (sa[1] if len(sa) > 1 else 0) or 0
            acc["sal"][1] += (sa[3] if len(sa) > 3 else 0) or 0
            acc["sal"][2] += (sa[5] if len(sa) > 5 else 0) or 0
        return acc if rows else None

    bid = {}       # (brand, id) -> physical key (outlets outside the master are matched this way)
    for k, o in out.items():
        for b, i in o["ids"].items():
            bid[(b, str(i))] = k

    # ---- DEMAND (MOBO)
    dem, dem_bid = {}, defaultdict(list)
    for o in DM["outlets"]:
        if o["tier"] == "M":
            dem[o["k"]] = o
        dem_bid[(o["b"], str(o["id"]))].append(o)

    def demand_of(k, ids):
        rows = [dem[k]] if k in dem else [x for b, i in ids.items() for x in dem_bid.get((b, str(i)), [])]
        if not rows:
            return None
        tot, cat = 0, {"RLD": 0, "PKT": 0, "SAL": 0}
        seen = set()
        for x in rows:
            if id(x) in seen:
                continue
            seen.add(id(x))
            tot += sum(x.get("bv") or [0, 0])
            for cname in cat:
                v = (x.get("c") or {}).get(cname)
                if v:
                    cat[cname] += v[1] or 0
        return {"v": tot, "rld": cat["RLD"], "pkt": cat["PKT"], "sal": cat["SAL"]}

    # ---- VISITS (PJP): per outlet, per operator row. 'x' = check-in completed, 'p' = planned only
    vis = defaultdict(lambda: {"x": 0, "p": 0, "d": ["."] * vis_cut, "by": Counter(), "dse": set()})
    for person in VS["dses"]:
        for ov in person.get("outlets", []):
            b, _, i = ov["id"].partition(":")
            k = ov.get("k") or bid.get((b, i))
            if not k:
                continue
            v = vis[k]
            for di, ch in enumerate(ov["d"][:vis_cut]):
                if ch == "x":
                    v["x"] += 1
                    v["d"][di] = "x"
                    v["by"][person["dse_name"]] += 1
                elif ch == "p":
                    v["p"] += 1
                    if v["d"][di] != "x":
                        v["d"][di] = "p"
            v["dse"].add(person["dse_name"])

    rows, mc_sum, cat_rows = [], {}, []
    allcnt = {"ga_fm": Counter(), "ga_pr": Counter(), "sp_fm": Counter(), "sp_pr": Counter()}
    allga = {"ga_fm": Counter(), "ga_pr": Counter()}
    allsp = {"sp_fm": Counter(), "sp_pr": Counter()}
    anomalies = {a.get("id"): a for a in gm.get("anomalies", []) if a.get("id")}

    for k, o in out.items():
        ga_fm = sum(o["s"][1:31])
        ga_mtd = sum(o["o"][1:ga_cut + 1])
        ga_lm = sum(o["s"][1:ga_cut + 1])
        ga_pr = round(ga_mtd / ga_cut * 31, 1) if ga_cut else 0
        sp = supply_of(k, o["ids"])
        sp_fm = sp["sp"][2] if sp else 0
        sp_mtd = sp["sp"][0] if sp else 0
        sp_lm = sp["sp"][1] if sp else 0
        sp_pr = round(sp_mtd / sup_cut * 31, 1) if sup_cut else 0
        sp_d7 = sum(q for d, q in (sp["spd"].items() if sp else []) if d > sup_cut - 7)
        sp_pr7 = round(sp_d7 / 7 * 31, 1)       # October sell-in is depressed on 1-9 Oct (system migration): the slab uses the last 7 days
        c = {"ga_fm": cls(ga_fm), "ga_pr": cls(ga_pr), "sp_fm": cls(sp_fm), "sp_pr": cls(sp_pr7)}
        for key in allcnt:
            allcnt[key][c[key]] += 1
        allga["ga_fm"][c["ga_fm"]] += ga_fm
        allga["ga_pr"][c["ga_pr"]] += ga_pr
        allsp["sp_fm"][c["sp_fm"]] += sp_fm
        allsp["sp_pr"][c["sp_pr"]] += sp_pr7
        mk = o["mc"] or "(tanpa MC)"
        ms = mc_sum.setdefault(mk, {"br": o["br"], "n": 0, "ga_fm": {}, "ga_pr": {}, "sp_fm": {}, "sp_pr": {}, "gaq_fm": {}, "gaq_pr": {}, "spq_fm": {}, "spq_pr": {}})
        ms["n"] += 1
        for key in ("ga_fm", "ga_pr", "sp_fm", "sp_pr"):
            ms[key][c[key]] = ms[key].get(c[key], 0) + 1
        ms["gaq_fm"][c["ga_fm"]] = ms["gaq_fm"].get(c["ga_fm"], 0) + ga_fm
        ms["gaq_pr"][c["ga_pr"]] = ms["gaq_pr"].get(c["ga_pr"], 0) + ga_pr
        ms["spq_fm"][c["sp_fm"]] = ms["spq_fm"].get(c["sp_fm"], 0) + sp_fm
        ms["spq_pr"][c["sp_pr"]] = ms["spq_pr"].get(c["sp_pr"], 0) + sp_pr7
        top = max(RANK[v] for v in c.values())      # RANK K1 = KRO 30–60 and above
        near = max(ga_fm, ga_pr, sp_fm, sp_pr7) > NEAR
        if top < RANK["K1"] and not near:
            continue
        dm_ = demand_of(k, o["ids"])
        v = vis.get(k)
        m = tmaster.get(k) or {}
        maxday = max(o["o"][1:ga_cut + 1] + o["s"][1:31])
        info = mi.get(o["mc"], {})
        rows.append({
            "k": k, "t": o["t"], "n": o["n"] or m.get("outlet_name", ""), "id": o["ids"], "br": o["br"], "mc": o["mc"], "hoa": info.get("hoa", ""), "dso": info.get("dso", ""),
            "dse": o["dse"], "sg": o["sg"], "kec": m.get("kecamatan") or o["kec"], "desa": m.get("desa", ""), "site": o["site"],
            "lat": m.get("lat"), "lon": m.get("long"),
            "ga": {"fm": ga_fm, "lm": ga_lm, "mtd": ga_mtd, "pr": ga_pr, "im3": [o["bs"]["IM3"][0], o["bs"]["IM3"][1]], "3id": [o["bs"]["3ID"][0], o["bs"]["3ID"][1]],
                   "max": maxday, "day": o["o"][1:ga_cut + 1]},
            "sp": {"fm": sp_fm, "lm": sp_lm, "mtd": sp_mtd, "pr": sp_pr, "d7": sp_d7, "pr7": sp_pr7, "spi": sp["spi"] if sp else 0} if sp else None,
            "vc": sp["vc"] if sp else None, "sal": sp["sal"] if sp else None,
            "dm": dm_,
            "v": {"x": v["x"], "p": v["p"] + v["x"], "d": "".join(v["d"]), "by": [n for n, _ in v["by"].most_common(3)], "dses": len(v["dse"])} if v else {"x": 0, "p": 0, "d": "." * vis_cut, "by": [], "dses": 0},
            "c": c,
        })

    # ---- flags (computed here so the contract is one place; the app only displays them)
    wd_gate = max(1, vis_cut // 7)            # expected minimum visits for a KRO in the month so far: one per full week
    for r in rows:
        c, fl = r["c"], []
        kro = RANK[c["ga_fm"]] >= RANK["K1"] or RANK[c["ga_pr"]] >= RANK["K1"] or RANK[c["sp_fm"]] >= RANK["K1"] or RANK[c["sp_pr"]] >= RANK["K1"]
        ga, sp = r["ga"], r["sp"] or {"fm": 0, "mtd": 0, "pr": 0}
        if kro and r["v"]["x"] == 0:
            fl.append("NO_VISIT")
        elif kro and r["v"]["x"] < wd_gate:
            fl.append("LOW_VISIT")
        if RANK[c["ga_fm"]] >= RANK["K1"] and c["ga_pr"] != "N" and "NRKW".index(CAT[c["ga_pr"]]) < "NRKW".index(CAT[c["ga_fm"]]):
            fl.append("GA_DOWN")                                           # fell a whole category (Wholesaler -> KRO / Retail, KRO -> Retail)
        if RANK[c["ga_fm"]] >= RANK["K1"] and ga["mtd"] == 0:
            fl.append("GA_STOP")
        if sp["fm"] > 30 and ga["fm"] <= 10:
            fl.append("SUPPLY_NO_GA")
        if RANK[c["ga_fm"]] >= RANK["K1"] and r["sp"] is None:
            fl.append("NO_SUPPLY_ROW")        # outlet not in the sell-in feed (outside the master and not adhoc): supply cannot be checked
        elif RANK[c["ga_fm"]] >= RANK["K1"] and sp["fm"] < 0.3 * ga["fm"]:
            fl.append("GA_NO_SUPPLY")
        if r["t"] == "G" or not r["dse"] or str(r["dse"]).upper().startswith("UNASSIGNED"):
            fl.append("NO_DSE")
        if ga["max"] >= 300 or (ga["fm"] > 100 and ga["max"] > 0.5 * max(ga["fm"], ga["mtd"])):
            fl.append("SPIKE")
        if kro and r["dm"] is not None and r["dm"]["v"] == 0:
            fl.append("NO_DEMAND")
        r["fl"] = fl
        r["pri"] = (RANK[c["ga_fm"]] * 3 + RANK[c["sp_fm"]] * 2 + RANK[c["ga_pr"]]) * 10 + 8 * ("NO_VISIT" in fl) + 5 * ("GA_STOP" in fl) + 4 * ("LOW_VISIT" in fl) + 3 * ("GA_DOWN" in fl)

    rows.sort(key=lambda r: (-r["pri"], -r["ga"]["fm"], r["n"]))

    meta = {
        "generated_at": datetime.now().replace(microsecond=0).isoformat(),
        "contract": "docs/assessments/ga_kro_deep_dive.md",
        "thresholds": {"near": NEAR, "retail_max": 30, "kro_min": 30, "wholesaler_min": 100},
        "classes": CLASSES,
        "cuts": {"ga": ga_cut, "supply": sup_cut, "demand": dem_cut, "visits": vis_cut, "ga_month_days": 31, "base_days": 30},
        "visit_days": vm["days"][:vis_cut],
        "counts": {k: dict(v) for k, v in allcnt.items()},
        "volume": {"ga_fm": dict(allga["ga_fm"]), "ga_pr": {k: round(v, 1) for k, v in allga["ga_pr"].items()}, "sp_fm": dict(allsp["sp_fm"]), "sp_pr": {k: round(v, 1) for k, v in allsp["sp_pr"].items()}},
        "outlets_total": len(out), "rows": len(rows), "visit_expected_min": wd_gate,
        "definitions": {
            "GA basis": "GA pcs per outlet per month (RGUGA tagging, IM3 + 3ID folded per physical outlet). Catalogue month = September (30 days); current month = projection MTD / cut days x 31.",
            "SUPPLY basis": "Starter Pack sell-in pcs per outlet per month (MOBII, IM3 + 3ID). SP Injection (MOBO) is shown separately, MTD only, and is not part of the slab.",
            "Visits": "Executed PJP stops (Check In completed) per outlet from all field operators; the MOBI journey-plan export has no DSO login, so DSO visits are shown through the DSE team of the DSO's MC.",
            "Supply run-rate Oct": "October sell-in is structurally low on 1-9 Oct (MOBII migration, CLAUDE.md caveat), so the supply slab for October uses the last 7 cut days x 31 / 7 instead of MTD / cut x 31.",
            "Flags": "NO_VISIT / LOW_VISIT (< 1 visit per full week), GA_DOWN (class below September), GA_STOP (no GA MTD), SUPPLY_NO_GA, GA_NO_SUPPLY (SP sell-in < 30% of GA), NO_DSE, SPIKE (a day >= 300 GA or > 50% of the month), NO_DEMAND",
        },
        "mc_info": mi,
    }
    feed = {"metadata": meta, "mc_sum": mc_sum, "rows": rows}
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(feed, f, ensure_ascii=False, separators=(",", ":"))
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("// Auto-generated KRO / Wholesaler feed. Kontrak: docs/assessments/ga_kro_deep_dive.md\nvar KRO_FEED = ")
        json.dump(feed, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\nif (typeof window !== 'undefined') window.KRO_FEED = KRO_FEED;\n")

    # ---- governed catalogue CSV (base month = last full month, both bases)
    lab = {c["k"]: c["label"] for c in CLASSES}
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["catalogue_month", "outlet_key", "outlet_name", "id_im3", "id_3id", "master", "area", "micro_cluster", "dso", "dse", "source_of_outlet", "kecamatan",
                    "site_nbs", "class_ga_sep", "ga_sep_pcs", "class_supply_sep", "sp_sellin_sep_pcs", "class_ga_oct_proj", "ga_oct_mtd", "ga_oct_proj", "visits_oct_mtd", "flags"])
        for r in rows:
            if RANK[r["c"]["ga_fm"]] < RANK["K1"] and RANK[r["c"]["sp_fm"]] < RANK["K1"]:
                continue
            w.writerow(["2026-09", r["k"], r["n"], r["id"].get("IM3", ""), r["id"].get("3ID", ""), "ya" if r["t"] == "M" else "tidak", r["br"], r["mc"], r["dso"], r["dse"], r["sg"], r["kec"],
                        r["site"], lab[r["c"]["ga_fm"]], r["ga"]["fm"], lab[r["c"]["sp_fm"]], (r["sp"] or {}).get("fm", 0), lab[r["c"]["ga_pr"]], r["ga"]["mtd"], r["ga"]["pr"], r["v"]["x"], "|".join(r["fl"])])
    print("rows", len(rows), "outlets", len(out), "supply-only added", n_sup_only)
    print("GA FM", dict(allcnt["ga_fm"]), {k: v for k, v in allga["ga_fm"].items()})
    print("GA proj", dict(allcnt["ga_pr"]))
    print("SP FM", dict(allcnt["sp_fm"]), {k: v for k, v in allsp["sp_fm"].items()})
    print("SP proj", dict(allcnt["sp_pr"]))
    print("flags", Counter(f for r in rows for f in r["fl"]))
    print("size MB", round(os.path.getsize(OUT_JS) / 1e6, 2))


if __name__ == "__main__":
    main()
