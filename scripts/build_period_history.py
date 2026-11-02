#!/usr/bin/env python3
"""Period history store: keeps the daily performance of every month so MTD, LMTD and full-month
comparisons and trends survive the month roll.

Reads the governed feeds (never raw/): penjualan (Sell-In), demand (MOBO), GA by outlet, DSE visits (PJP),
END BALANCE. Upserts the months those feeds hold into data/history/period_history.json and writes the
browser feed website/data/period_history.js (window.PERIOD_HISTORY). Pure stdlib. Run it after the other builders
(daily_update.py does). Contract: docs/assessments/period_review_platform.md.

Rules
- A month group (sellin / demand / ga / pjp) is replaced only when the new cut day is >= the stored cut day,
  so a feed that rolled to the next month, or a partial file, never shrinks an archived month.
- Daily series are stored per MC plus ALL (sum of every row, incl. ids outside the master). Branch / region
  figures are summed by the viewer from the MC series. A day without data is null, never 0.
- Months that only have a total (September demand: the demand feed keeps last month as LMTD / full month totals)
  are stored under `totals` and shown as "n/a" in daily trends.
"""
import calendar
import json
import os
import sys
from datetime import datetime, date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
STORE = "data/history/period_history.json"
OUT_JS = "website/data/period_history.js"
FEEDS = "data/processed"

SELLIN_CATS = {"SP": "Starter Pack", "SPI": "SP Injection", "VCF": "Voucher isi", "VCB": "Voucher blank", "SALMO": "Saldo Mobo"}
DEMAND_CATS = {"RLD": "Reload (RLD)", "VCI": "Voucher Injection (VCI)", "CVM": "CVM", "PKT": "Paket data (PKT)", "SAL": "Saldo Mobo (SAL)", "SPI": "SP Injection (MOBO)"}

METRICS = {}


def metric(mid, label, unit, group, area):
    METRICS[mid] = {"label": label, "unit": unit, "group": group, "area": area}


for c, n in SELLIN_CATS.items():
    if c != "SALMO":
        metric("si.%s.q" % c, "Sell-In %s (pcs)" % n, "pcs", "sellin", "Sell-In MOBII")
    metric("si.%s.v" % c, "Sell-In %s (Rp)" % n, "rp", "sellin", "Sell-In MOBII")
for c, n in DEMAND_CATS.items():
    metric("dm.%s.v" % c, "Demand %s (Rp)" % n, "rp", "demand", "Demand MOBO")
    if c not in ("SAL",):
        metric("dm.%s.q" % c, "Demand %s (qty)" % n, "qty", "demand", "Demand MOBO")
metric("ga.q", "Gross Add outlet tagging (pcs)", "pcs", "ga", "Gross Add")
for k, n in (("planned", "Target kunjungan (planned)"), ("actual", "Kunjungan terlaksana (actual)"), ("productive", "Kunjungan produktif"), ("adhoc", "Kunjungan ad-hoc")):
    metric("pjp.%s" % k, "PJP %s" % n, "visits", "pjp", "PJP visit")


def load(name):
    p = os.path.join(FEEDS, name)
    if not os.path.exists(p):
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def month_key(iso):
    return iso[:7]


def mdays(key):
    y, m = int(key[:4]), int(key[5:7])
    return calendar.monthrange(y, m)[1]


def prev_key(key):
    y, m = int(key[:4]), int(key[5:7])
    return "%04d-%02d" % ((y, m - 1) if m > 1 else (y - 1, 12))


class Month:
    """Accumulator of one month from one run: series[metric][scope] = list(len days) of number|None."""

    def __init__(self, key):
        self.key = key
        self.days = mdays(key)
        self.series = {}
        self.totals = {}
        self.cut = {}
        self.src = {}

    def add(self, mid, scope, day, val):
        if 1 <= day <= self.days:
            row = self.series.setdefault(mid, {}).setdefault(scope, [None] * self.days)
            row[day - 1] = (row[day - 1] or 0) + val

    def fill_zero(self, mids, scopes, upto):
        """A metric/scope that exists in the group but has no row on a day inside the cut is a genuine 0."""
        for mid in mids:
            for sc in scopes:
                row = self.series.setdefault(mid, {}).setdefault(sc, [None] * self.days)
                for d in range(upto):
                    if row[d] is None:
                        row[d] = 0


MONTHS = {}


def M(key):
    if key not in MONTHS:
        MONTHS[key] = Month(key)
    return MONTHS[key]


def scope_of(mc):
    return "MC:" + mc if mc else None


def from_penjualan():
    p = load("penjualan_feed.json")
    if not p:
        return None
    md = p["metadata"]
    cur_key = month_key(md["cut"])
    pk = prev_key(cur_key)
    cur, prev = M(cur_key), M(pk)
    cut = md["cut_day"]
    cur.cut["sellin"] = cut
    prev.cut["sellin"] = min(cut, prev.days)   # the feed carries last month as LMTD only (days 1..cut); the full month is the stored one, never replaced by a shorter LMTD
    cur.src["sellin"] = prev.src["sellin"] = md.get("source", "")
    mcs = set()
    for r in p["mc_daily"]:
        cat = r["cat"]
        if cat not in SELLIN_CATS:
            continue
        sc = scope_of(r["mc"])
        mcs.add(sc)
        for mo, arr in ((cur, r["m"]), (prev, r["l"])):
            for i, qv in enumerate(arr):
                if i >= mo.days:
                    break
                q, v = qv
                if cat != "SALMO":
                    mo.add("si.%s.q" % cat, "ALL", i + 1, q)
                    if sc:
                        mo.add("si.%s.q" % cat, sc, i + 1, q)
                mo.add("si.%s.v" % cat, "ALL", i + 1, v)
                if sc:
                    mo.add("si.%s.v" % cat, sc, i + 1, v)
    mids = [m for m in METRICS if m.startswith("si.")]
    scopes = ["ALL"] + sorted(s for s in mcs if s)
    cur.fill_zero(mids, scopes, cut)
    prev.fill_zero(mids, scopes, prev.cut["sellin"])
    for mo, upto in ((cur, cut), (prev, prev.cut["sellin"])):   # days after the cut are not data yet
        for mid in mids:
            for sc in scopes:
                row = mo.series[mid][sc]
                for d in range(upto, mo.days):
                    row[d] = None
    return cur_key


def from_demand():
    d = load("demand_feed.json")
    if not d:
        return None
    md = d["metadata"]
    cur_key = month_key(md["cut"])
    pk = prev_key(cur_key)
    cur, prev = M(cur_key), M(pk)
    cut = md["cut_day"]
    cur.cut["demand"] = cut
    cur.src["demand"] = md.get("source", "")
    mcs = set()
    for o in d["outlets"]:
        sc = scope_of(o.get("mc"))
        if sc:
            mcs.add(sc)
        for cat, c in (o.get("c") or {}).items():
            if cat not in DEMAND_CATS or len(c) < 5:
                continue
            for day, val, qty in c[4]:
                cur.add("dm.%s.v" % cat, "ALL", day, val)
                if sc:
                    cur.add("dm.%s.v" % cat, sc, day, val)
                if cat != "SAL":
                    cur.add("dm.%s.q" % cat, "ALL", day, qty)
                    if sc:
                        cur.add("dm.%s.q" % cat, sc, day, qty)
        for cat, l in (o.get("l") or {}).items():   # last month: [lmtd_q, lmtd_v, full_q, full_v]
            if cat not in DEMAND_CATS or len(l) < 4:
                continue
            for sc2 in (["ALL", sc] if sc else ["ALL"]):
                t = prev.totals.setdefault("dm.%s.v" % cat, {}).setdefault(sc2, {"fm": 0, "lmtd": 0})
                t["fm"] += l[3]
                t["lmtd"] += l[1]
                if cat != "SAL":
                    t2 = prev.totals.setdefault("dm.%s.q" % cat, {}).setdefault(sc2, {"fm": 0, "lmtd": 0})
                    t2["fm"] += l[2]
                    t2["lmtd"] += l[0]
    mids = [m for m in METRICS if m.startswith("dm.")]
    scopes = ["ALL"] + sorted(mcs)
    cur.fill_zero(mids, scopes, cut)
    for mid in mids:
        for sc in scopes:
            row = cur.series[mid][sc]
            for i in range(cut, cur.days):
                row[i] = None
    prev.cut["demand_totals"] = prev.days
    prev.cut["demand"] = 0   # no daily series for last month in the demand feed
    prev.src["demand"] = md.get("source", "") + " (totals only: LMTD and full month)"
    return cur_key


def from_ga():
    g = load("ga_feed.json")
    if not g:
        return None
    md = g["metadata"]
    cur_key, pk = md["months"]["cur"], md["months"]["prev"]
    cur, prev = M(cur_key), M(pk)
    cut = md["cut_day"]
    cur.cut["ga"] = cut
    prev.cut["ga"] = prev.days
    cur.src["ga"] = md["sources"].get("oct", "")
    prev.src["ga"] = md["sources"].get("sep", "")
    mcs = set()
    for o in g["outlets"]:
        sc = scope_of(o.get("mc"))
        if sc:
            mcs.add(sc)
        for mo, key in ((cur, "o"), (prev, "s")):
            arr = o.get(key) or []
            for i in range(0, len(arr), 2):
                mo.add("ga.q", "ALL", arr[i], arr[i + 1])
                if sc:
                    mo.add("ga.q", sc, arr[i], arr[i + 1])
    scopes = ["ALL"] + sorted(mcs)
    cur.fill_zero(["ga.q"], scopes, cut)
    prev.fill_zero(["ga.q"], scopes, prev.days)
    for mo, upto in ((cur, cut), (prev, prev.days)):
        for sc in scopes:
            row = mo.series["ga.q"][sc]
            for i in range(upto, mo.days):
                row[i] = None
    return cur_key


def from_visits():
    p = "website/data/dse_visits_feed.js"
    if not os.path.exists(p):
        return None
    s = open(p, encoding="utf-8").read()
    j = json.loads(s[s.index("=") + 1:].rstrip().rstrip(";"))
    tl = j.get("daily_timeline") or []
    if not tl:
        return None
    mon = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12}
    byk = {}
    for t in tl:
        dd, mm, yy = t["date"].split("-")
        key = "%s-%02d" % (yy, mon[mm])
        byk.setdefault(key, []).append((int(dd), t))
    for key, rows in byk.items():
        mo = M(key)
        last = 0
        for day, t in rows:
            if not t.get("available", True):
                continue   # a day no PJP export covers stays null (shown n/a), never 0
            last = max(last, day)
            mo.add("pjp.planned", "ALL", day, t.get("planned", 0))
            mo.add("pjp.actual", "ALL", day, t.get("actual", 0))
            mo.add("pjp.productive", "ALL", day, t.get("productive", 0))
            mo.add("pjp.adhoc", "ALL", day, t.get("adhoc", 0))
        mo.cut["pjp"] = last
        mo.src["pjp"] = "website/data/dse_visits_feed.js daily_timeline (T = P + A; days without export = n/a)"
    return sorted(byk)[-1]


def mc_area():
    g = load("ga_feed.json") or {}
    out = {}
    for mc, v in ((g.get("metadata") or {}).get("mc_info") or {}).items():
        out["MC:" + mc] = v.get("br", "")
    return out


def merge(store):
    store.setdefault("months", {})
    changed = []
    for key, mo in sorted(MONTHS.items()):
        dst = store["months"].setdefault(key, {"days": mo.days, "groups": {}, "series": {}, "totals": {}})
        dst["days"] = mo.days
        groups = set(mo.cut) - {"demand_totals"}
        for grp in sorted(groups | ({"demand_totals"} if "demand_totals" in mo.cut else set())):
            newcut = mo.cut[grp]
            old = dst["groups"].get(grp, {}).get("cut", -1)
            if grp == "demand_totals":
                dst["groups"][grp] = {"cut": newcut, "source": mo.src.get("demand", ""), "updated": datetime.now().isoformat(timespec="seconds")}
                for mid, sc in mo.totals.items():
                    dst["totals"][mid] = sc
                continue
            if newcut <= 0 or newcut < old:
                continue   # never shrink an archived month; a group without a daily series (cut 0) is not stored
            dst["groups"][grp] = {"cut": newcut, "source": mo.src.get(grp, ""), "updated": datetime.now().isoformat(timespec="seconds")}
            prefix = {"sellin": "si.", "demand": "dm.", "ga": "ga.", "pjp": "pjp."}[grp]
            for mid in [m for m in METRICS if m.startswith(prefix)]:
                if mid in mo.series:
                    dst["series"][mid] = mo.series[mid]
            changed.append("%s/%s cut %d" % (key, grp, newcut))
    return changed


def endbal_snapshots(store):
    e = load("endbal_feed.json")
    if not e:
        return
    md = e["metadata"]
    snap = md.get("snapshot")
    if not snap:
        return
    tot = md.get("totals") or {}
    row = {"snapshot": snap, "outlets": md.get("outlets"), "sellin_cut": md.get("sellin_cut")}
    for k in ("stock_total", "stock_balance", "end_balance_total"):
        if k in tot:
            row[k] = tot[k]
    store.setdefault("endbal", {})[snap] = row


def main():
    done = {"penjualan": from_penjualan(), "demand": from_demand(), "ga": from_ga(), "visits": from_visits()}
    store = {"months": {}}
    if os.path.exists(STORE):
        store = json.load(open(STORE, encoding="utf-8"))
    changed = merge(store)
    endbal_snapshots(store)
    store["metadata"] = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "contract": "docs/assessments/period_review_platform.md",
        "metrics": METRICS,
        "mc_area": mc_area() or store.get("metadata", {}).get("mc_area", {}),
        "rules": "A month group is replaced only when the new cut day is >= the stored one. null = no data for that day (not zero). Months with only totals (demand last month) carry no daily trend.",
    }
    os.makedirs(os.path.dirname(STORE), exist_ok=True)
    with open(STORE, "w", encoding="utf-8") as f:
        json.dump(store, f, separators=(",", ":"), ensure_ascii=False)
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("// Auto-generated period history (daily performance of every stored month). Contract: docs/assessments/period_review_platform.md\n")
        f.write("var PERIOD_HISTORY = ")
        json.dump(store, f, separators=(",", ":"), ensure_ascii=False)
        f.write(";\nif (typeof window !== 'undefined') window.PERIOD_HISTORY = PERIOD_HISTORY;\nif (typeof module !== 'undefined') module.exports = PERIOD_HISTORY;\n")
    print("period history: months %s | updated %s | %.1f MB" % (", ".join(sorted(store["months"])), "; ".join(changed) or "nothing", os.path.getsize(OUT_JS) / 1e6))


if __name__ == "__main__":
    sys.exit(main())
