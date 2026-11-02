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
        chk("sellin %s qty FM %s" % (cat, pk), tot(pk, "si.%s.q" % cat), fq)
    chk("sellin %s Rp %s" % (cat, ck), tot(ck, "si.%s.v" % cat), mv)
    chk("sellin %s Rp FM %s" % (cat, pk), tot(pk, "si.%s.v" % cat), fv)
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
# month roll simulation: a November feed (cut 2 Nov, LMTD = October) must create 2026-11, keep October intact and never shrink it
import copy, importlib.util
spec = importlib.util.spec_from_file_location("bph", "scripts/build_period_history.py"); bph = importlib.util.module_from_spec(spec); spec.loader.exec_module(bph)
fake = json.load(open("data/processed/penjualan_feed.json"))
fake["metadata"]["cut"], fake["metadata"]["cut_day"] = "2026-11-02", 2
for r in fake["mc_daily"]:
    r["l"] = copy.deepcopy(r["m"]); r["m"] = [[a * 1.1, b * 1.1] for a, b in r["m"][:2]] + [[0, 0]] * 29
real_load = bph.load
bph.load = lambda name: fake if name == "penjualan_feed.json" else None
bph.MONTHS.clear(); bph.from_penjualan()
store2 = copy.deepcopy(S); changed = bph.merge(store2)
n += 1
if "2026-11" not in store2["months"] or store2["months"]["2026-11"]["groups"].get("sellin", {}).get("cut") != 2:
    fails.append("roll: 2026-11 sellin cut 2 not created")
n += 1
if store2["months"]["2026-10"]["groups"]["sellin"]["cut"] != 31 or abs(sum(x or 0 for x in store2["months"]["2026-10"]["series"]["si.SP.q"]["ALL"]) - tot("2026-10", "si.SP.q")) > 0.5:
    fails.append("roll: October sell-in changed or shrank")
n += 1
if abs(sum(x or 0 for x in store2["months"]["2026-11"]["series"]["si.SP.q"]["ALL"]) - sum(r["m"][d][0] for r in fake["mc_daily"] if r["cat"] == "SP" for d in range(2))) > 1:
    fails.append("roll: November MTD not as in the feed")
n += 1   # a partial feed must not shrink an archived month
fake["metadata"]["cut"], fake["metadata"]["cut_day"] = "2026-10-20", 20
bph.MONTHS.clear(); bph.from_penjualan(); store3 = copy.deepcopy(S); bph.merge(store3)
if store3["months"]["2026-10"]["groups"]["sellin"]["cut"] != 31:
    fails.append("roll: a cut-20 October feed shrank the archived October")
bph.load = real_load
print("period history audit: %d checks, %d failed" % (n, len(fails)))
for f in fails[:20]:
    print("  FAIL", f)
sys.exit(1 if fails else 0)
