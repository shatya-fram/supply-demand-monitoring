#!/usr/bin/env python3
"""Reconciles the period history store with the governed feeds it was built from (run after build_period_history.py)."""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
S = json.load(open("data/history/period_history.json"))
fails, n = [], 0


def chk(name, a, b, tol=0.5):
    global n
    n += 1
    if abs((a or 0) - (b or 0)) > tol:
        fails.append("%s: store %s vs feed %s" % (name, a, b))


def chk_prev(name, a, b, rel=0.002):
    # the previous month's full month (FM) in the live feed follows the CURRENT outlet master, the stored close is frozen: the Master Hierarchy of 3 Nov 2026 (more outlets mapped
    # to Inner Jakarta MCs) moved October sell-in by 0.02-0.1%; larger differences still fail
    global n
    n += 1
    if abs((a or 0) - (b or 0)) > max(0.5, rel * abs(a or 0)):
        fails.append("%s: store %s vs feed %s" % (name, a, b))


def tot(key, mid, sc="ALL", upto=None):
    r = S["months"][key]["series"][mid][sc]
    return sum(x or 0 for x in (r[:upto] if upto else r))


p = json.load(open("data/processed/penjualan_feed.json"))
ck = p["metadata"]["cut"][:7]
for b in (p["products"]):
    pass
for cat in ("SP", "SPI", "VCF", "VCB", "SALMO"):
    mq = sum(x["mq"] for x in p["products"] if x["cat"] == cat); mv = sum(x["mv"] for x in p["products"] if x["cat"] == cat)
    fv = sum(x["fv"] for x in p["products"] if x["cat"] == cat); fq = sum(x["fq"] for x in p["products"] if x["cat"] == cat)
    if cat == "SPI":   # SP Injection sits outside the product table; its totals are in metadata.spi
        sp = p["metadata"]["spi"]; mq, mv, fq, fv = sp["pcs"], sp["value"], sp["fm_pcs"], sp["fm_value"]
    pk = "%04d-%02d" % ((int(ck[:4]), int(ck[5:]) - 1) if int(ck[5:]) > 1 else (int(ck[:4]) - 1, 12))
    if cat != "SALMO":
        chk("sellin %s qty %s" % (cat, ck), tot(ck, "si.%s.q" % cat), mq)
        chk_prev("sellin %s qty FM %s" % (cat, pk), tot(pk, "si.%s.q" % cat), fq)
    chk("sellin %s Rp %s" % (cat, ck), tot(ck, "si.%s.v" % cat), mv)
    chk_prev("sellin %s Rp FM %s" % (cat, pk), tot(pk, "si.%s.v" % cat), fv)
d = json.load(open("data/processed/demand_feed.json"))
for cat in ("RLD", "VCI", "CVM", "PKT", "SAL", "SPI"):
    mv = sum(((o.get("c") or {}).get(cat) or [0, 0])[1] for o in d["outlets"])
    chk("demand %s Rp %s" % (cat, ck), tot(ck, "dm.%s.v" % cat), mv)
    t = S["months"][pk]["totals"].get("dm.%s.v" % cat, {}).get("ALL", {})
    fv = sum(((o.get("l") or {}).get(cat) or [0, 0, 0, 0])[3] for o in d["outlets"])
    chk("demand %s Rp FM %s" % (cat, pk), t.get("fm", 0), fv)
g = json.load(open("data/processed/ga_feed.json"))
for key, fld in ((g["metadata"]["months"]["cur"], "o"), (g["metadata"]["months"]["prev"], "s")):   # the GA feed can sit on an earlier month than Sell-In (GA builder is not month-aware yet)
    chk("ga %s" % key, tot(key, "ga.q"), sum(sum(o.get(fld, [])[1::2]) for o in g["outlets"]))
# the MC series add up to ALL for rows that have an MC; ALL is never smaller
for key, m in S["months"].items():
    for mid, sc in m["series"].items():
        a = sum(x or 0 for x in sc["ALL"]); s = sum(sum(x or 0 for x in v) for k, v in sc.items() if k != "ALL")
        n += 1
        if s > a + 1:
            fails.append("%s %s: MC sum %s above ALL %s" % (key, mid, s, a))
# month roll simulation: a feed one month ahead (cut day 2, LMTD = the running month) must create that month, keep the stored months intact and never shrink them
import copy, importlib.util
spec = importlib.util.spec_from_file_location("bph", "scripts/build_period_history.py"); bph = importlib.util.module_from_spec(spec); spec.loader.exec_module(bph)
fake = json.load(open("data/processed/penjualan_feed.json"))
_y, _m = int(ck[:4]), int(ck[5:])
nk = "%04d-%02d" % ((_y, _m + 1) if _m < 12 else (_y + 1, 1))
fake["metadata"]["cut"], fake["metadata"]["cut_day"] = nk + "-02", 2
for r in fake["mc_daily"]:
    r["l"] = copy.deepcopy(r["m"]); r["m"] = [[a * 1.1, b * 1.1] for a, b in r["m"][:2]] + [[0, 0]] * 29
real_load = bph.load
bph.load = lambda name: fake if name == "penjualan_feed.json" else None
bph.MONTHS.clear(); bph.from_penjualan()
store2 = copy.deepcopy(S); changed = bph.merge(store2)
n += 1
if nk not in store2["months"] or store2["months"][nk]["groups"].get("sellin", {}).get("cut") != 2:
    fails.append("roll: %s sellin cut 2 not created" % nk)
n += 1
if store2["months"][ck]["groups"]["sellin"]["cut"] != S["months"][ck]["groups"]["sellin"]["cut"] or abs(sum(x or 0 for x in store2["months"][ck]["series"]["si.SP.q"]["ALL"]) - tot(ck, "si.SP.q")) > 0.5:
    fails.append("roll: %s sell-in changed or shrank" % ck)
n += 1
if abs(sum(x or 0 for x in store2["months"][nk]["series"]["si.SP.q"]["ALL"]) - sum(r["m"][d][0] for r in fake["mc_daily"] if r["cat"] == "SP" for d in range(2))) > 1:
    fails.append("roll: %s MTD not as in the feed" % nk)
n += 1   # a partial feed (cut 1) must not shrink an archived month
fake["metadata"]["cut"], fake["metadata"]["cut_day"] = ck + "-01", 1
bph.MONTHS.clear(); bph.from_penjualan(); store3 = copy.deepcopy(S); bph.merge(store3)
if store3["months"][ck]["groups"]["sellin"]["cut"] != S["months"][ck]["groups"]["sellin"]["cut"]:
    fails.append("roll: a cut-1 feed shrank the archived %s" % ck)
bph.load = real_load
print("period history audit: %d checks, %d failed" % (n, len(fails)))
for f in fails[:20]:
    print("  FAIL", f)
sys.exit(1 if fails else 0)
