#!/usr/bin/env python3
"""Stock Outlet feed: per outlet, sell-in and sell-out of SP, Voucher and Saldo for September (full month) and
October (MTD), plus the ENDBAL saldo balance. Contract: docs/assessments/stock_outlet_overstock_map.md

Pure stdlib. Reads the feeds already built by the daily run (run it after build_kro_feed.py and build_endbal_feed.py):
  website/data/kro_feed.js + kro_slim.js   per outlet [fm, lm, mtd, pr] of ga, sp, vsi, vso, ssi, sso
  website/data/endbal_feed.js              saldo stock balance and average daily transaction per outlet
  data/catalogues/territory_management_master.json   site, kecamatan, desa, lat / long
Writes website/data/stock_feed.js and data/processed/stock_feed.json.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
DATA = "website/data"
KEYORDER = ["ga", "sp", "vsi", "vso", "ssi", "sso"]          # order of the slim flat array (4 numbers each: fm, lm, mtd, pr)

# column order of every outlet row in the feed
COLS = ["k", "n", "t", "mc", "br", "dse", "kec", "site", "lat", "lon",
        "sp_in_fm", "sp_in_mtd", "sp_out_fm", "sp_out_mtd",          # SP pcs: sell-in (MOBII SP + SP Injection) / sell-out (GA)
        "vc_in_fm", "vc_in_mtd", "vc_out_fm", "vc_out_mtd",          # Voucher Rp: sell-in (MOBII VC isi + blank) / sell-out (Voucher Injection)
        "sa_in_fm", "sa_in_mtd", "sa_out_fm", "sa_out_mtd",          # Saldo Rp: sell-in (SALMO transfer) / sell-out (Saldo Mobo)
        "eb_st", "eb_ot", "eb_av"]                                    # ENDBAL: stock account, other accounts, average daily transaction


def load_js(name):
    s = open(os.path.join(DATA, name), encoding="utf-8").read()
    i = s.index("=") + 1
    obj, _ = json.JSONDecoder().raw_decode(s[i:].lstrip())
    return obj


def num(x):
    if x is None:
        return 0
    x = float(x)
    return int(x) if x == int(x) else round(x, 1)


def main():
    KR = load_js("kro_feed.js")
    SL = load_js("kro_slim.js")
    EB = load_js("endbal_feed.js")
    km = KR["metadata"]
    terr = {o["outlet_key"]: o for o in json.load(open("data/catalogues/territory_management_master.json", encoding="utf-8"))}
    mc_info = {}
    for r in KR["rows"]:
        if r.get("mc") and r["mc"] not in mc_info and r.get("br"):
            mc_info[r["mc"]] = {"br": r["br"], "hoa": r.get("hoa", ""), "dso": r.get("dso", "")}

    out = {}

    def put(k, name, t, mc, br, dse, kec, site, lat, lon, q):
        # q = dict key -> [fm, lm, mtd, pr]
        def g(key, i):
            v = (q.get(key) or [0, 0, 0, 0])[i]
            return num(v)
        out[k] = [k, (name or "")[:40], t, mc or "", br or "", dse or "", kec or "", site or "", lat, lon,
                  g("sp", 0), g("sp", 2), g("ga", 0), g("ga", 2),
                  g("vsi", 0), g("vsi", 2), g("vso", 0), g("vso", 2),
                  g("ssi", 0), g("ssi", 2), g("sso", 0), g("sso", 2),
                  0, 0, 0]

    for r in KR["rows"]:
        m = terr.get(r["k"]) or {}
        put(r["k"], r.get("n") or m.get("outlet_name"), r["t"], r.get("mc"), r.get("br") or m.get("branch"), r.get("dse"),
            m.get("kecamatan") or r.get("kec"), m.get("site_nbs") or r.get("site"), r.get("lat") if r.get("lat") is not None else m.get("lat"),
            r.get("lon") if r.get("lon") is not None else m.get("long"), r["q"])
    for s in SL:                              # [k, t, n, id_im3, id_3id, mc, dse, vis_x, vis_p, flat(24)]
        k, flat = s[0], s[9]
        q = {key: flat[i * 4:(i + 1) * 4] for i, key in enumerate(KEYORDER)}
        m = terr.get(k) or {}
        mc = s[5] or m.get("micro_cluster")
        put(k, s[2] or m.get("outlet_name"), s[1], mc, (mc_info.get(mc) or {}).get("br") or m.get("branch"), s[6], m.get("kecamatan"), m.get("site_nbs"), m.get("lat"), m.get("long"), q)

    # ENDBAL: saldo stock balance and average daily transaction (Rp)
    n_eb = n_eb_new = 0
    for e in EB["outlets"]:
        k = e["k"]
        row = out.get(k)
        if row is None:
            if not (e.get("st") or e.get("ot")):
                continue
            m = terr.get(k) or {}
            mc = e.get("m") or m.get("micro_cluster")
            put(k, e.get("n"), e.get("t") or "M", mc, e.get("b") or m.get("branch"), e.get("d"), m.get("kecamatan"), e.get("s") or m.get("site_nbs"), m.get("lat"), m.get("long"), {})
            row = out[k]
            n_eb_new += 1
        row[COLS.index("eb_st")] = num(e.get("st"))
        row[COLS.index("eb_ot")] = num(e.get("ot"))
        row[COLS.index("eb_av")] = num(e.get("av"))
        n_eb += 1

    rows = [r for r in out.values() if any(r[10:25])]
    rows.sort(key=lambda r: (r[4], r[3], r[0]))
    tot = lambda i: sum(r[i] for r in rows)
    meta = {
        "generated_at": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "contract": "docs/assessments/stock_outlet_overstock_map.md",
        "cols": COLS,
        "cuts": {"ga": km["cuts"]["ga"], "supply": km["cuts"]["supply"], "demand": km["cuts"]["demand"], "base_days": km["cuts"]["base_days"], "month_days": km["cuts"]["ga_month_days"]},
        "endbal_snapshot": EB["metadata"].get("snapshot"),
        "mc_info": mc_info,
        "rows": len(rows), "endbal_matched": n_eb, "endbal_added": n_eb_new,
        "totals": {c: tot(COLS.index(c)) for c in COLS[10:]},
        "definitions": {
            "sp": "in = MOBII Starter Pack sell-in + SP Injection (pcs); out = Gross Add (RGUGA) pcs of the outlet",
            "vc": "in = MOBII Voucher sell-in, isi + blank (Rp); out = Voucher Injection MOBO (Rp)",
            "sa": "in = MOBII SALMO transfer (Rp); out = Saldo Mobo MOBO (Rp); eb_st = ENDBAL Stock Account Normal balance",
        },
    }
    obj = {"metadata": meta, "outlets": rows}
    os.makedirs("data/processed", exist_ok=True)
    with open("data/processed/stock_feed.json", "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(DATA, "stock_feed.js"), "w", encoding="utf-8") as f:
        f.write("// Auto-generated Stock Outlet feed. Contract: docs/assessments/stock_outlet_overstock_map.md. Columns: metadata.cols\nwindow.STOCK_FEED = ")
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print("stock feed: %d outlets, ENDBAL matched %d (+%d added), size %.1f MB" % (len(rows), n_eb, n_eb_new, os.path.getsize(os.path.join(DATA, "stock_feed.js")) / 1e6))
    for c in COLS[10:]:
        print("  %-10s %s" % (c, "{:,.0f}".format(meta["totals"][c])))


if __name__ == "__main__":
    sys.exit(main())
