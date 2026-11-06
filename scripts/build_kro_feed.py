#!/usr/bin/env python3
"""
build_kro_feed.py  ·  Outlet & KRO Management feed: KRO / Wholesaler catalogue per product (SP, Voucher, Saldo, GA)

Joins four governed feeds per physical outlet:
  GA (Daily_RGUGA, tagging)       website/data/ga_feed.js        GA per outlet per day, September + October
  SUPPLY (MOBII sell-in)          website/data/penjualan_feed.js Starter Pack (SP) pcs, voucher (VCF + VCB) and saldo (SALMO) value
  DEMAND (MOBO)                   website/data/demand_feed.js    SP Injection, Voucher Injection (VCI), saldo transacted (SAL), reload / CVM / paket data
  PJP VISITS (MOBI journey plan)  website/data/dse_visits_feed.js executed / planned stops per outlet per day

Six measures ("keys"), each with its own ladder, per outlet per month:
  ga   GA pcs                         pcs ladder
  sp   SP sell-in + SP Injection pcs  pcs ladder
  vsi  Voucher sell-in (VCF + VCB) Rp value ladder     vso  Voucher Injection (MOBO) Rp  value ladder
  ssi  Saldo sell-in (SALMO MOBII) Rp value ladder     sso  Saldo Mobo transacted (MOBO) Rp  value ladder (no September file: no Last FM / LMTD)
pcs ladder (owner, 18 Oct 2026):   RETAIL 0 | 1-10 | 11-30   KRO 31-60 | 61-100   WHOLESALER 101-200 | 201-500 | 501-1000 | > 1000
value ladder (owner, 20 Oct 2026): RETAIL 0-5 jt | 5-10 jt   KRO 10-30 | 30-60 | 60-90 jt   WHOLESALER 90-200 | 200-400 | > 400 jt
The upper bound belongs to the lower slab (10 jt exactly = Retail 5-10 jt).
Projection of the running month: GA = MTD / cut x days of the GA month; all other keys = last min(7, cut) cut days x days of the running sell-in month / min(7, cut) (MOBII / MOBO migration dip on 1-9 Oct 2026 shapes the October baseline).

Output: data/processed/kro_feed.json, website/data/kro_feed.js (KRO_FEED),
        data/catalogues/kro_outlet_catalogue.csv (governed catalogue, base = last full month),
        data/catalogues/kro_program_outlets_template.csv (format of the program list read from data/catalogues/kro_program_outlets.csv).
Contract: docs/assessments/kro_product_ladders.md (and ga_kro_deep_dive.md)
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
OUT_SLIM = "website/data/kro_slim.js"
OUT_CSV = "data/catalogues/kro_outlet_catalogue.csv"
PROG_CSV = "data/catalogues/kro_program_outlets.csv"
PROG_TPL = "data/catalogues/kro_program_outlets_template.csv"
PROGRAMS_DEFAULT = ["BOSS", "Tebus Murah", "DSF", "DSE"]     # names offered in the app even before a membership file exists (owner, 4 Nov 2026: Tebus Murah, DSF and DSE use the October list until a new one arrives)

# (code, category, label, lower bound exclusive); ordered high to low
PCS = [("W4", "W", "Wholesaler > 1000", 1000), ("W3", "W", "Wholesaler 500–1000", 500), ("W2", "W", "Wholesaler 200–500", 200),
       ("W1", "W", "Wholesaler 100–200", 100), ("K2", "K", "KRO 60–100", 60), ("K1", "K", "KRO 30–60", 30),
       ("R2", "R", "Retail 10–30", 10), ("R1", "R", "Retail 1–10", 0)]
VAL = [("W3", "W", "Wholesaler > 400 jt", 400e6), ("W2", "W", "Wholesaler 200–400 jt", 200e6), ("W1", "W", "Wholesaler 90–200 jt", 90e6),
       ("K3", "K", "KRO 60–90 jt", 60e6), ("K2", "K", "KRO 30–60 jt", 30e6), ("K1", "K", "KRO 10–30 jt", 10e6),
       ("R2", "R", "Retail 5–10 jt", 5e6), ("R1", "R", "Retail 0–5 jt", 0)]
LADDER = {"pcs": PCS, "val": VAL}
NEAR = {"pcs": 25, "val": 8e6}      # watch list: volume above this but not yet a KRO
# key -> (ladder, has September, label)
KEYS = {"ga": ("pcs", True, "GA (pcs)"), "sp": ("pcs", True, "SP sell-in + injection (pcs)"), "vsi": ("val", True, "Voucher sell-in (Rp)"),
        "vso": ("val", True, "Voucher sell-out · Voucher Injection (Rp)"), "ssi": ("val", True, "Saldo sell-in (Rp)"), "sso": ("val", False, "Saldo sell-out · Saldo Mobo (Rp)")}
RANK = {"N": 0, "R1": 1, "R2": 2, "K1": 3, "K2": 4, "K3": 5, "W1": 6, "W2": 7, "W3": 8, "W4": 9}
CAT = {"N": "N"}
for _l in (PCS, VAL):
    for _c, _cat, *_ in _l:
        CAT[_c] = _cat


def load_js(name):
    s = open(os.path.join(DATA, name), encoding="utf-8").read()
    i = s.index("=") + 1
    obj, _ = json.JSONDecoder().raw_decode(s[i:].lstrip())
    return obj


def cls(v, lad):
    """slab code of a monthly volume on a ladder ('pcs' | 'val'); upper bound belongs to the lower slab."""
    if v is None or v <= 0:
        return "N"
    for code, _cat, _lab, lo in LADDER[lad]:
        if v > lo:
            return code
    return "R1"


def days_arr(a):
    d = [0] * 32
    for i in range(0, len(a or []), 2):
        d[a[i]] += a[i + 1]
    return d


def g(a, i):
    return (a[i] if a and len(a) > i and a[i] else 0) or 0


def main():
    GA = load_js("ga_feed.js")
    PJ = load_js("penjualan_feed.js")
    DM = load_js("demand_feed.js")
    VS = load_js("dse_visits_feed.js")
    TR = load_js("territory_feed.js")
    gm, pm, dm, vm = GA["metadata"], PJ["metadata"], DM["metadata"], VS["metadata"]
    has_sal_lm = bool(((dm.get("lm") or {}).get("salmo") or {}).get("source"))      # demand feed carries l.SAL (September SALMO) since 22 Oct 2026
    KEYS["sso"] = ("val", has_sal_lm, KEYS["sso"][2])
    ga_cut, sup_cut, dem_cut = int(gm["cut_day"]), int(pm["cut_day"]), int(dm["cut_day"])
    vis_cut = len(vm["days"])
    # month lengths follow each feed (3 Nov 2026): sell-in / demand project to the running month, GA to its own month (GA builder is not month-aware yet)
    SUP_DAYS = int(pm.get("mtd_month_days") or 31)
    BASE_DAYS = int(pm.get("lmtd_full_days") or 30)
    GA_DAYS = int(gm.get("cur_days") or 31)
    GA_BASE_DAYS = int(gm.get("prev_days") or 30)
    # GA month vs the running sell-in month (owner, 4 Nov 2026): while the Daily_RGUGA file of the running month is missing the GA data sit on the PREVIOUS month
    # (October while Sell-In / Demand are November). GA then uses October in full as FM and 1..cut of October as LMTD, MTD and projection are n/a (never the October
    # total in the MTD column); every other key keeps FM = previous month, so the class of the previous month is the same month on all four products.
    GA_BEHIND = str((gm.get("months") or {}).get("cur") or "")[:7] != "" and str((gm.get("months") or {}).get("cur") or "")[:7] != str(pm.get("cut") or "")[:7]
    if GA_BEHIND:
        GA_BASE_DAYS = GA_DAYS
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
        if GA_BEHIND:
            o["bs"][r["b"]][0] += sum(c[1:32])
        else:
            o["bs"][r["b"]][0] += sum(s[1:GA_BASE_DAYS + 1])
            o["bs"][r["b"]][1] += sum(c[1:ga_cut + 1])

    # ---- SUPPLY (MOBII) by physical key, then by (brand, id)
    sup, sup_bid = {}, defaultdict(list)
    for o in PJ["outlets"]:
        if o["tier"] == "M":
            sup[o["k"]] = o
        sup_bid[(o["b"], str(o["id"]))].append(o)
    # ---- DEMAND (MOBO)
    dem, dem_bid = {}, defaultdict(list)
    for o in DM["outlets"]:
        if o["tier"] == "M":
            dem[o["k"]] = o
        dem_bid[(o["b"], str(o["id"]))].append(o)

    def sup_rel(c):    # any October / September sell-in or injection worth tracking in the ladders
        sp = c.get("SP") or []
        if g(sp, 0) or g(sp, 2) or g(sp, 4) or g(c.get("SPI"), 0):
            return True
        for key in ("VCF", "VCB"):
            v = c.get(key) or []
            if g(v, 1) or g(v, 3) or g(v, 5):
                return True
        sa = c.get("SALMO") or []
        return bool(g(sa, 1) or g(sa, 3) or g(sa, 5))

    def dem_rel(x):
        c, l = x.get("c") or {}, x.get("l") or {}
        return bool(g(c.get("VCI"), 1) or g(c.get("SAL"), 1) or g(l.get("SAL"), 1) or g(l.get("SAL"), 3) or g(c.get("SPI"), 0) or g(l.get("VCI"), 1) or g(l.get("VCI"), 3) or g(l.get("SPI"), 0) or g(l.get("SPI"), 2))

    # ---- outlets that no GA row claims (adhoc / master without GA) join the universe with zero GA (t = "S") when they carry sell-in, injection or demand volume
    claimed = set()
    for k, o in out.items():
        if k in sup:
            claimed.add(id(sup[k]))
        if k in dem:
            claimed.add(id(dem[k]))
        for b, i in o["ids"].items():
            for x in sup_bid.get((b, str(i)), []):
                claimed.add(id(x))
            for x in dem_bid.get((b, str(i)), []):
                claimed.add(id(x))
    n_sup_only = n_dem_only = 0
    bid = {}       # (brand, id) -> physical key (outlets outside the master are matched this way)
    for k, o in out.items():
        for b, i in o["ids"].items():
            bid[(b, str(i))] = k

    def add_only(x, kind):
        pk = "S:" + str(x["k"])
        if pk in out or (x["b"], str(x["id"])) in bid:
            return 0
        out[pk] = {"k": pk, "t": "S", "ids": {x["b"]: str(x["id"])}, "n": x.get("n") or "", "mc": x.get("mc") or "", "br": (mi.get(x.get("mc") or "", {}) or {}).get("br", ""),
                   "dse": x.get("dse") or "", "sg": "", "kec": x.get("kec") or "", "site": x.get("site") or "", "s": [0] * 32, "o": [0] * 32, "bs": {"IM3": [0, 0], "3ID": [0, 0]}, "_" + kind: x}
        bid[(x["b"], str(x["id"]))] = pk
        return 1
    for x in PJ["outlets"]:
        if id(x) not in claimed and sup_rel(x.get("c") or {}):
            n_sup_only += add_only(x, "pj")
    for x in DM["outlets"]:
        if id(x) not in claimed and dem_rel(x):
            n_dem_only += add_only(x, "dm")

    def supply_of(k, ids):
        # the master row of the key plus every other row that carries one of the outlet's ids (a stale key such as 0_317011 / NA_sh013732 for the same 3ID id is the same outlet; deduplicated by object below)
        rows = ([sup[k]] if k in sup else []) + [x for b, i in ids.items() for x in sup_bid.get((b, str(i)), [])]
        if not rows and k in out and out[k].get("_pj"):
            rows = [out[k]["_pj"]]
        seen, acc = set(), {"sp": [0, 0, 0], "spi": 0, "vc": [0, 0, 0], "sal": [0, 0, 0], "spv": 0, "spd": defaultdict(int),
                            "vcv": [0, 0, 0], "vcd": defaultdict(int), "sald": defaultdict(int), "spval": [0, 0, 0], "salc": [0, 0, 0]}
        for x in rows:
            if id(x) in seen:
                continue
            seen.add(id(x))
            c = x["c"]
            sp = c.get("SP") or []
            acc["sp"][0] += g(sp, 0)
            acc["sp"][1] += g(sp, 2)
            acc["sp"][2] += g(sp, 4)
            acc["spv"] += g(sp, 1)
            acc["spval"][0] += g(sp, 1)
            acc["spval"][1] += g(sp, 3)
            acc["spval"][2] += g(sp, 5)
            for dd in (sp[10] if len(sp) > 10 and sp[10] else []):   # [[day, value, qty]]
                acc["spd"][dd[0]] += dd[2] or 0
            acc["spi"] += g(c.get("SPI"), 0)
            for key in ("VCF", "VCB"):
                v = c.get(key) or []
                acc["vc"][0] += g(v, 0)
                acc["vc"][1] += g(v, 2)
                acc["vc"][2] += g(v, 4)
                acc["vcv"][0] += g(v, 1)
                acc["vcv"][1] += g(v, 3)
                acc["vcv"][2] += g(v, 5)
                for dd in (v[10] if len(v) > 10 and v[10] else []):
                    acc["vcd"][dd[0]] += dd[1] or 0
            sa = c.get("SALMO") or []
            for i3 in range(3):
                acc["salc"][i3] += g(sa[11] if len(sa) > 11 and sa[11] else [], i3)
            acc["sal"][0] += g(sa, 1)
            acc["sal"][1] += g(sa, 3)
            acc["sal"][2] += g(sa, 5)
            for dd in (sa[10] if len(sa) > 10 and sa[10] else []):
                acc["sald"][dd[0]] += dd[1] or 0
        return acc if rows else None

    def demand_of(k, ids):
        rows = ([dem[k]] if k in dem else []) + [x for b, i in ids.items() for x in dem_bid.get((b, str(i)), [])]
        if not rows and k in out and out[k].get("_dm"):
            rows = [out[k]["_dm"]]
        if not rows:
            return None
        tot, cat = 0, {"RLD": 0, "PKT": 0, "SAL": 0}
        a = {"vci": [0, 0, 0], "vcid": defaultdict(int), "sald": defaultdict(int), "spi": [0, 0, 0], "spid": defaultdict(int), "vcn": [0, 0, 0], "spiv": [0, 0, 0], "salf": [0, 0]}
        seen = set()
        for x in rows:
            if id(x) in seen:
                continue
            seen.add(id(x))
            tot += sum(x.get("bv") or [0, 0])
            c, l = x.get("c") or {}, x.get("l") or {}
            for cname in cat:
                v = c.get(cname)
                if v:
                    cat[cname] += v[1] or 0
            v = c.get("VCI") or []
            a["vci"][0] += g(v, 1)
            for dd in (v[4] if len(v) > 4 and v[4] else []):
                a["vcid"][dd[0]] += dd[1] or 0
            a["vci"][1] += g(l.get("VCI"), 1)
            a["vci"][2] += g(l.get("VCI"), 3)
            a["vcn"][0] += g(v, 0)
            a["vcn"][1] += g(l.get("VCI"), 0)
            a["vcn"][2] += g(l.get("VCI"), 2)
            v = c.get("SAL") or []
            a["salf"][0] += g(l.get("SAL"), 1)       # September LMTD Rp (l.SAL = [0, LMTD Rp, 0, Last FM Rp])
            a["salf"][1] += g(l.get("SAL"), 3)
            for dd in (v[4] if len(v) > 4 and v[4] else []):
                a["sald"][dd[0]] += dd[1] or 0
            v = c.get("SPI") or []
            a["spi"][0] += g(v, 0)
            a["spiv"][0] += g(v, 1)
            a["spiv"][1] += g(l.get("SPI"), 1)
            a["spiv"][2] += g(l.get("SPI"), 3)
            for dd in (v[4] if len(v) > 4 and v[4] else []):
                a["spid"][dd[0]] += dd[2] or 0
            a["spi"][1] += g(l.get("SPI"), 0)
            a["spi"][2] += g(l.get("SPI"), 2)
        return {"v": tot, "rld": cat["RLD"], "pkt": cat["PKT"], "sal": cat["SAL"], "_a": a}

    # ---- VISITS (PJP): per outlet, per operator row. 'x' = check-in completed, 'p' = planned only
    for k, o in out.items():
        for b, i in o["ids"].items():
            bid[(b, str(i))] = k
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

    def d7(dd, cut):
        return sum(q for d, q in dd.items() if d > cut - 7)

    def proj7(dd, cut):
        # run-rate of the last 7 cut days (fewer while the month is younger than 7 days) x days of the running month
        return d7(dd, cut) / max(1, min(7, cut)) * SUP_DAYS

    def rnd(key, v):
        if v is None:
            return None
        v = round(v, 1) if KEYS[key][0] == "pcs" else int(round(v))
        return int(v) if v == int(v) else v

    rows, slim, mc_sum = [], [], {}
    DL = {}      # daily vectors per outlet for the Program daily view (program_daily_feed.js)
    tot = {k: {"cf": Counter(), "cp": Counter(), "qf": Counter(), "qp": Counter()} for k in KEYS}
    anomalies = {a.get("id"): a for a in gm.get("anomalies", []) if a.get("id")}
    KEYORDER = list(KEYS)

    for k, o in out.items():
        if GA_BEHIND:
            ga_fm = sum(o["o"][1:32])
            ga_lm = sum(o["o"][1:sup_cut + 1])
            ga_mtd = ga_pr = None
        else:
            ga_fm = sum(o["s"][1:GA_BASE_DAYS + 1])
            ga_mtd = sum(o["o"][1:ga_cut + 1])
            ga_lm = sum(o["s"][1:ga_cut + 1])
            ga_pr = ga_mtd / ga_cut * GA_DAYS if ga_cut else 0
        sp = supply_of(k, o["ids"])
        dmd = demand_of(k, o["ids"])
        da = dmd["_a"] if dmd else {"vci": [0, 0, 0], "vcid": {}, "sald": {}, "spi": [0, 0, 0], "spid": {}, "vcn": [0, 0, 0], "spiv": [0, 0, 0], "salf": [0, 0]}
        sp_mtd, sp_lm, sp_fm = (sp["sp"][0], sp["sp"][1], sp["sp"][2]) if sp else (0, 0, 0)
        sp_pr7 = proj7(sp["spd"], sup_cut) if sp else 0
        sal_mtd = sum(v for _, v in (dmd and dmd["_a"]["sald"].items() or []))
        q = {
            "ga": [ga_fm, ga_lm, ga_mtd, ga_pr],
            "sp": [sp_fm + da["spi"][2], sp_lm + da["spi"][1], sp_mtd + da["spi"][0], (proj7(sp["spd"], sup_cut) if sp else 0) + proj7(da["spid"], dem_cut)],
            "vsi": [sp["vcv"][2], sp["vcv"][1], sp["vcv"][0], proj7(sp["vcd"], sup_cut)] if sp else [0, 0, 0, 0],
            "vso": [da["vci"][2], da["vci"][1], da["vci"][0], proj7(da["vcid"], dem_cut)],
            "ssi": [sp["sal"][2], sp["sal"][1], sp["sal"][0], proj7(sp["sald"], sup_cut)] if sp else [0, 0, 0, 0],
            "sso": [da["salf"][1] if has_sal_lm else None, da["salf"][0] if has_sal_lm else None, sal_mtd, proj7(da["sald"], dem_cut)],
        }
        q = {key: [rnd(key, x) for x in v] for key, v in q.items()}
        _sd = sp["spd"] if sp else {}
        _dl = {"ga": o["o"][1:ga_cut + 1] if not GA_BEHIND else [],
               "sp": [(_sd.get(i, 0) or 0) + (da["spid"].get(i, 0) or 0) for i in range(1, max(sup_cut, dem_cut) + 1)],
               "vsi": [(sp["vcd"].get(i, 0) or 0) if sp else 0 for i in range(1, sup_cut + 1)],
               "vso": [da["vcid"].get(i, 0) or 0 for i in range(1, dem_cut + 1)],
               "ssi": [(sp["sald"].get(i, 0) or 0) if sp else 0 for i in range(1, sup_cut + 1)],
               "sso": [da["sald"].get(i, 0) or 0 for i in range(1, dem_cut + 1)]}
        if any(any(v) for v in _dl.values()) or any(any(x for x in v[:3]) for v in q.values()):
            DL[k] = {"mc": o["mc"], "br": o["br"], "dse": o["dse"], "d": _dl, "q": q}
        # counterpart of each measure for the popups: value (Rp) for the pcs keys, quantity for the Rp keys; [fm, lm, mtd], None = not available (never 0)
        q2 = {
            "ga": [None, None, None],
            "sp": [sp["spval"][2] + da["spiv"][2] if sp else da["spiv"][2], sp["spval"][1] + da["spiv"][1] if sp else da["spiv"][1], sp["spval"][0] + da["spiv"][0] if sp else da["spiv"][0]],
            "vsi": [sp["vc"][2], sp["vc"][1], sp["vc"][0]] if sp else [0, 0, 0],
            "vso": list(da["vcn"][::-1]),
            "ssi": [sp["salc"][2], sp["salc"][1], sp["salc"][0]] if sp else [0, 0, 0],
            "sso": [None, None, None],
        }
        c, qq, near = {}, q, False
        for key, (lad, hasfm, _lab) in KEYS.items():
            c[key + "_fm"] = cls(q[key][0], lad) if hasfm else None
            c[key + "_pr"] = cls(q[key][3], lad) if q[key][3] is not None else "N"
            near = near or max(q[key][0] or 0, q[key][3] or 0) > NEAR[lad]
        for key in KEYS:
            t = tot[key]
            if c[key + "_fm"] is not None:
                t["cf"][c[key + "_fm"]] += 1
                t["qf"][c[key + "_fm"]] += q[key][0]
            if q[key][3] is not None:
                t["cp"][c[key + "_pr"]] += 1
                t["qp"][c[key + "_pr"]] += q[key][3]
        mk = o["mc"] or "(tanpa MC)"
        ms = mc_sum.setdefault(mk, {"br": o["br"], "n": 0, "k": {key: {"cf": {}, "cp": {}, "qf": {}, "qp": {}} for key in KEYS}})
        ms["n"] += 1
        for key in KEYS:
            m = ms["k"][key]
            if c[key + "_fm"] is not None:
                m["cf"][c[key + "_fm"]] = m["cf"].get(c[key + "_fm"], 0) + 1
                m["qf"][c[key + "_fm"]] = m["qf"].get(c[key + "_fm"], 0) + q[key][0]
            if q[key][3] is not None:
                m["cp"][c[key + "_pr"]] = m["cp"].get(c[key + "_pr"], 0) + 1
                m["qp"][c[key + "_pr"]] = m["qp"].get(c[key + "_pr"], 0) + q[key][3]
        top = max(RANK[v] for v in c.values() if v)
        for key, (lad, hasfm, _lab) in KEYS.items():        # an outlet that is KRO+ only on LMTD or MTD must be in rows too (period columns count them)
            for qi in (1, 2):
                if q[key][qi] is not None:
                    top = max(top, RANK[cls(q[key][qi], lad)])      # RANK K1 = KRO 30–60 (pcs) / 10–30 jt (value) and above
        v = vis.get(k)
        m = tmaster.get(k) or {}
        info = mi.get(o["mc"], {})
        vv = {"x": v["x"], "p": v["p"] + v["x"], "d": "".join(v["d"]), "by": [n for n, _ in v["by"].most_common(3)], "dses": len(v["dse"])} if v else {"x": 0, "p": 0, "d": "." * vis_cut, "by": [], "dses": 0}
        if top < RANK["K1"] and not near:
            # slim record: lets the browser find any outlet (whitelist / program) including Retail
            flat = [x for key in KEYORDER for x in (q[key][0], q[key][1], q[key][2], q[key][3])]
            if any(flat):
                ids = o["ids"]
                slim.append([k, o["t"], (o["n"] or m.get("outlet_name", ""))[:40], ids.get("IM3", ""), ids.get("3ID", ""), o["mc"], o["dse"], vv["x"], vv["p"], [0 if x is None else x for x in flat]])
            continue
        maxday = max(o["o"][1:32]) if GA_BEHIND else max(o["o"][1:ga_cut + 1] + o["s"][1:GA_BASE_DAYS + 1])
        rows.append({
            "k": k, "t": o["t"], "n": o["n"] or m.get("outlet_name", ""), "id": o["ids"], "br": o["br"], "mc": o["mc"], "hoa": info.get("hoa", ""), "dso": info.get("dso", ""),
            "dse": o["dse"], "sg": o["sg"], "kec": m.get("kecamatan") or o["kec"], "desa": m.get("desa", ""), "site": o["site"],
            "lat": m.get("lat"), "lon": m.get("long"),
            "ga": {"fm": ga_fm, "lm": ga_lm, "mtd": ga_mtd, "pr": None if ga_pr is None else round(ga_pr, 1), "im3": [o["bs"]["IM3"][0], o["bs"]["IM3"][1]], "3id": [o["bs"]["3ID"][0], o["bs"]["3ID"][1]],
                   "max": maxday, "day": o["o"][1:32] if GA_BEHIND else o["o"][1:ga_cut + 1]},
            "sp": {"fm": sp_fm, "lm": sp_lm, "mtd": sp_mtd, "pr": round(sp_mtd / sup_cut * SUP_DAYS, 1) if sup_cut else 0, "d7": d7(sp["spd"], sup_cut) if sp else 0, "pr7": round(sp_pr7, 1), "spi": da["spi"][0]} if sp else None,
            "vc": sp["vc"] if sp else None, "sal": sp["sal"] if sp else None,
            "dm": {k2: dmd[k2] for k2 in ("v", "rld", "pkt", "sal")} if dmd else None,
            "v": vv,
            "q": q, "q2": q2, "c": c,
        })

    # ---- flags per key (computed here so the contract is one place; the app only displays them)
    wd_gate = max(1, vis_cut // 7)            # expected minimum visits for a KRO in the month so far: one per full week
    for r in rows:
        c, q = r["c"], r["q"]
        r["fl"], r["pri"] = {}, {}
        for key, (lad, hasfm, _lab) in KEYS.items():
            fmc, prc = c[key + "_fm"], c[key + "_pr"]
            rk = max(RANK[fmc] if fmc else 0, RANK[prc])
            kro = rk >= RANK["K1"]
            fl = []
            if kro and r["v"]["x"] == 0:
                fl.append("NO_VISIT")
            elif kro and r["v"]["x"] < wd_gate:
                fl.append("LOW_VISIT")
            if hasfm and RANK[fmc] >= RANK["K1"] and prc != "N" and "NRKW".index(CAT[prc]) < "NRKW".index(CAT[fmc]):
                fl.append("DOWN")                                           # fell a whole category (Wholesaler -> KRO / Retail, KRO -> Retail)
            if hasfm and RANK[fmc] >= RANK["K1"] and q[key][2] is not None and (q[key][2] or 0) == 0:
                fl.append("STOP")
            if key in ("ga", "sp"):
                ga, sp = r["ga"], r["sp"] or {"fm": 0, "mtd": 0, "pr": 0}
                if sp["fm"] > 30 and ga["fm"] <= 10:
                    fl.append("SUPPLY_NO_GA")
                if RANK[c["ga_fm"]] >= RANK["K1"] and r["sp"] is None:
                    fl.append("NO_SUPPLY_ROW")        # outlet not in the sell-in feed (outside the master and not adhoc): supply cannot be checked
                elif RANK[c["ga_fm"]] >= RANK["K1"] and sp["fm"] < 0.3 * ga["fm"]:
                    fl.append("GA_NO_SUPPLY")
            if kro and (r["t"] == "G" or not r["dse"] or str(r["dse"]).upper().startswith("UNASSIGNED")):
                fl.append("NO_DSE")
            if key == "ga" and (r["ga"]["max"] >= 300 or (r["ga"]["fm"] > 100 and r["ga"]["max"] > 0.5 * max(r["ga"]["fm"], r["ga"]["mtd"] or 0))):
                fl.append("SPIKE")
            if kro and key not in ("vso", "sso") and r["dm"] is not None and r["dm"]["v"] == 0:
                fl.append("NO_DEMAND")
            if fl:
                r["fl"][key] = fl
            r["pri"][key] = (RANK[fmc or prc] * 3 + RANK[prc] * 2) * 10 + 8 * ("NO_VISIT" in fl) + 5 * ("STOP" in fl) + 4 * ("LOW_VISIT" in fl) + 3 * ("DOWN" in fl)

    rows.sort(key=lambda r: (-r["pri"]["sp"], -r["ga"]["fm"], r["n"]))
    slim.sort(key=lambda x: x[0])

    # ---- program membership (BOSS, Tebus Murah, ...): data/catalogues/kro_program_outlets.csv = program,outlet_id[,note]; id = IM3 / 3ID id or outlet key
    idmap = {}
    for r in rows:
        idmap[str(r["k"])] = r["k"]
        for b_, i_ in r["id"].items():
            idmap.setdefault(str(i_), r["k"])
    for x in slim:
        idmap[str(x[0])] = x[0]
        for i_ in (x[3], x[4]):
            if i_:
                idmap.setdefault(str(i_), x[0])
    for kk, o in out.items():
        idmap.setdefault(str(kk), kk)
        for i_ in o["ids"].values():
            idmap.setdefault(str(i_), kk)
    programs = {n: {"keys": [], "ids": 0, "unmatched": []} for n in PROGRAMS_DEFAULT}
    if os.path.exists(PROG_CSV):
        with open(PROG_CSV, newline="", encoding="utf-8-sig") as f:
            for rec in csv.DictReader(f):
                name = (rec.get("program") or rec.get("Program") or "").strip()
                oid = (rec.get("outlet_id") or rec.get("id") or rec.get("outlet_key") or "").strip()
                if not name or not oid:
                    continue
                p = programs.setdefault(name, {"keys": [], "ids": 0, "unmatched": []})
                p["ids"] += 1
                kk = idmap.get(oid)
                if kk is None:
                    p["unmatched"].append(oid)
                elif kk not in p["keys"]:
                    p["keys"].append(kk)
    os.makedirs(os.path.dirname(PROG_TPL), exist_ok=True)
    with open(PROG_TPL, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["program", "outlet_id", "note"])
        w.writerow(["BOSS", "<id outlet IM3 atau 3ID, atau outlet key>", "satu baris per outlet per program; salin file ini menjadi kro_program_outlets.csv lalu jalankan build_kro_feed.py (atau unggah langsung di menu)"])

    # ---- Program daily feed: MC totals of every outlet + daily vectors of the program members (non-program = MC total - members)
    members = set()
    for p_ in programs.values():
        members.update(p_["keys"])
    mc_all = {}
    for k_, x_ in DL.items():
        mk_ = "%s|%s" % (x_["br"], x_["mc"] or "(tanpa MC)")
        a_ = mc_all.setdefault(mk_, {"br": x_["br"], "mc": x_["mc"] or "(tanpa MC)", "n": 0, "d": {}, "t": {}})
        a_["n"] += 1
        for key_ in KEYS:
            dv = a_["d"].setdefault(key_, [0] * len(x_["d"][key_])) if len(a_["d"].get(key_, [])) == len(x_["d"][key_]) or key_ not in a_["d"] else a_["d"][key_]
            for i_, v_ in enumerate(x_["d"][key_]):
                dv[i_] += v_
            tt = a_["t"].setdefault(key_, [0, 0, 0])
            for j_ in range(3):
                if x_["q"][key_][j_] is not None:
                    tt[j_] += x_["q"][key_][j_]
    for a_ in mc_all.values():
        a_["d"] = {k2: [int(round(v)) for v in vs] for k2, vs in a_["d"].items()}
    pd_rows = [[k_, [[int(round(v)) for v in DL[k_]["d"][key_]] for key_ in KEYORDER]] for k_ in sorted(members) if k_ in DL]
    pdf = {"metadata": {"generated_at": datetime.now().replace(microsecond=0).isoformat(), "contract": "docs/assessments/program_daily_view.md", "key_order": KEYORDER,
                        "cuts": {"ga": ga_cut, "sp": max(sup_cut, dem_cut), "vsi": sup_cut, "vso": dem_cut, "ssi": sup_cut, "sso": dem_cut}, "ga_behind": GA_BEHIND,
                        "days_cur": SUP_DAYS, "days_prev": BASE_DAYS, "month_cur": str(pm.get("cut") or "")[:7],
                        "note": "rows = daily vectors (day 1..cut per key) of every program member; mc = all outlets per br|mc (daily sums d, [FM, LMTD, MTD] sums t); non-program = mc minus the members"},
           "mc": mc_all, "rows": pd_rows}
    with open(os.path.join(DATA, "program_daily_feed.js"), "w", encoding="utf-8") as f:
        f.write("// Auto-generated by scripts/build_kro_feed.py. Kontrak: docs/assessments/program_daily_view.md\nvar PROGRAM_DAILY = ")
        json.dump(pdf, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\nif (typeof window !== 'undefined') window.PROGRAM_DAILY = PROGRAM_DAILY;\n")
    print("program daily feed: members", len(pd_rows), "mc groups", len(mc_all), "MB", round(os.path.getsize(os.path.join(DATA, "program_daily_feed.js")) / 1e6, 2))

    lad_meta = {name: [{"k": c, "cat": cat, "label": lab, "lo": lo} for c, cat, lab, lo in lad] for name, lad in LADDER.items()}
    meta = {
        "generated_at": datetime.now().replace(microsecond=0).isoformat(),
        "contract": "docs/assessments/kro_product_ladders.md",
        "ladders": lad_meta,
        "keys": {key: {"ladder": lad, "has_fm": hasfm, "has_mtd": not (key == "ga" and GA_BEHIND), "label": lab, "near": NEAR[lad]} for key, (lad, hasfm, lab) in KEYS.items()},
        "slim_columns": ["k", "t", "n", "id_im3", "id_3id", "mc", "dse", "visit_x", "visit_p", "q: per key " + ",".join(KEYORDER) + " x [fm, lm, mtd, pr]"],
        "key_order": KEYORDER,
        "thresholds": {"kro_min": 30, "wholesaler_min": 100, "kro_min_value": 10e6, "wholesaler_min_value": 90e6},
        "cuts": {"ga": ga_cut, "supply": sup_cut, "demand": dem_cut, "visits": vis_cut, "ga_month_days": GA_DAYS, "ga_base_days": GA_BASE_DAYS, "ga_behind": GA_BEHIND, "ga_fm_month": str((gm.get("months") or {}).get("cur") or "") if GA_BEHIND else str((gm.get("months") or {}).get("prev") or ""), "month_days": SUP_DAYS, "base_days": BASE_DAYS},
        "visit_days": vm["days"][:vis_cut],
        "totals": {key: {k2: {c_: (round(v_, 1) if isinstance(v_, float) else v_) for c_, v_ in t[k2].items()} for k2 in t} for key, t in tot.items()},
        "outlets_total": len(out), "rows": len(rows), "slim": len(slim), "visit_expected_min": wd_gate,
        "programs": {n: {"keys": p["keys"], "ids": p["ids"], "unmatched": p["unmatched"][:200], "n_unmatched": len(p["unmatched"])} for n, p in programs.items()},
        "definitions": {
            "GA": "GA pcs per outlet per month (RGUGA tagging, IM3 + 3ID folded per physical outlet). " + ("The GA file of the running month is not here yet: FM = the previous month in full (October), LMTD = 1..cut of that month, MTD and projection are n/a until the new Daily_RGUGA file arrives." if GA_BEHIND else "Catalogue month = previous month (%d days); current month = projection MTD / cut days x %d." % (GA_BASE_DAYS, GA_DAYS)),
            "SP": "Starter Pack sell-in pcs (MOBII, IM3 + 3ID) + SP Injection pcs (MOBO). September injection baseline from the demand feed (l.SPI).",
            "Voucher sell-in": "Value (Rp) of Voucher isi (VCF) + Voucher blank (VCB) sell-in to the outlet (MOBII, outlet-bound only).",
            "Voucher sell-out": "Voucher Injection (VCI, MOBO) value in Rp.",
            "Saldo sell-in": "Saldo Mobo transfer value (SALMO, MOBII) in Rp.",
            "Saldo sell-out": "Saldo Mobo transacted by the outlet (SAL, MOBO SALMO file) in Rp; October only, no Last FM / LMTD.",
            "Projection": "GA = MTD / cut x days of the GA month; every other key = last min(7, cut) cut days / min(7, cut) x days of the running sell-in month (the 1-9 Oct 2026 migration dip depresses the October baseline).",
            "Visits": "Executed PJP stops (Check In completed) per outlet from all field operators; the MOBI journey-plan export has no DSO login, so DSO visits are shown through the DSE team of the DSO's MC.",
            "Flags": "NO_VISIT / LOW_VISIT (< 1 visit per full week), DOWN (class below September by a whole category), STOP (September KRO, nothing MTD), SUPPLY_NO_GA, GA_NO_SUPPLY (SP sell-in < 30% of GA), NO_DSE, SPIKE (GA: a day >= 300 or > 50% of the month), NO_DEMAND",
        },
        "mc_info": mi,
    }
    DERIVED = ("c", "pri", "hoa", "dso", "lat", "lon", "desa")      # re-derived in the browser from q, fl and mc_info (keeps the feed small)
    feed = {"metadata": meta, "mc_sum": mc_sum, "rows": [{k_: v_ for k_, v_ in r.items() if k_ not in DERIVED} for r in rows]}
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(dict(feed, slim=slim), f, ensure_ascii=False, separators=(",", ":"))
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("// Auto-generated KRO / Wholesaler feed. Kontrak: docs/assessments/kro_product_ladders.md\nvar KRO_FEED = ")
        json.dump(feed, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\nif (typeof window !== 'undefined') window.KRO_FEED = KRO_FEED;\n")
    with open(OUT_SLIM, "w", encoding="utf-8") as f:      # every other outlet, loaded on demand by the Whitelist / Program catalogue modes
        f.write("// Auto-generated: outlets below the KRO slab (Retail), loaded on demand. Kolom: metadata.slim_columns di kro_feed.js\nvar KRO_SLIM = ")
        json.dump(slim, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\nif (typeof window !== 'undefined') window.KRO_SLIM = KRO_SLIM;\n")

    # ---- governed catalogue CSV (base month = last full month, all products with a September base)
    lab = {c_: lb for lad in (PCS, VAL) for c_, _cat, lb, _lo in lad}
    lab["N"] = "Tanpa volume"
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["catalogue_month", "outlet_key", "outlet_name", "id_im3", "id_3id", "master", "area", "micro_cluster", "dso", "dse", "source_of_outlet", "kecamatan", "site_nbs"] +
                   [x for key in ("ga", "sp", "vsi", "vso", "ssi") for x in ("class_" + key + "_sep", key + "_sep", key + "_okt_proj")] + ["class_sso_okt_proj", "sso_okt_mtd", "visits_oct_mtd", "flags_sp"])
        for r in rows:
            if all(RANK[r["c"][key + "_fm"]] < RANK["K1"] for key in ("ga", "sp", "vsi", "vso", "ssi")):
                continue
            w.writerow(["2026-09", r["k"], r["n"], r["id"].get("IM3", ""), r["id"].get("3ID", ""), "ya" if r["t"] == "M" else "tidak", r["br"], r["mc"], r["dso"], r["dse"], r["sg"], r["kec"], r["site"]] +
                       [x for key in ("ga", "sp", "vsi", "vso", "ssi") for x in (lab[r["c"][key + "_fm"]], r["q"][key][0], r["q"][key][3])] +
                       [lab[r["c"]["sso_pr"]], r["q"]["sso"][2], r["v"]["x"], "|".join(r["fl"].get("sp", []))])
    print("rows", len(rows), "slim", len(slim), "outlets", len(out), "supply-only added", n_sup_only, "demand-only added", n_dem_only)
    for key in KEYS:
        print(key, "FM", dict(tot[key]["cf"]), "| proj", dict(tot[key]["cp"]))
    print("flags sp", Counter(f for r in rows for f in r["fl"].get("sp", [])))
    print("programs", {n: (len(p["keys"]), p["ids"]) for n, p in programs.items()})
    print("size MB", round(os.path.getsize(OUT_JS) / 1e6, 2), "slim MB", round(os.path.getsize(OUT_SLIM) / 1e6, 2))


if __name__ == "__main__":
    main()
