#!/usr/bin/env python3
"""
build_penjualan_feed.py  ·  Penjualan (Sell-In produk ke outlet) dari DAILY_DATA_MOBII

Sumber : raw/MOBI TRansfer Balance/DAILY_DATA_MOBII_202610.xlsb
Kontrak: docs/assessments/daily_data_mobii_sellin.md
Output : website/data/penjualan_feed.js  (var PENJUALAN_FEED = {...})
         data/processed/penjualan_feed.json

Keputusan pemilik (13 Okt 2026): cut 12 Okt; VC blank dihitung unit dan nilai dengan harga
IM3 Rp 500 / 3ID Rp 300; outlet yang hanya ada di mapping adhoc (bukan master) ikut masuk laporan.

Pure stdlib: pembaca .xlsb memakai parser biner yang sama dengan build_territory_management_catalogues.py.
Jalankan dari root proyek.
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
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from build_territory_management_catalogues import parse_xlsb_sst, parse_xlsb_sheet_rows  # noqa: E402

# MOBII_SRC (set by scripts/daily_update.py) takes precedence over the fixed paths.
SRC_CANDIDATES = ([os.environ["MOBII_SRC"]] if os.environ.get("MOBII_SRC") else []) + [
                  "raw/Data as of 14 Oct /DAILY_DATA_MOBII_202610.xlsb",     # refresh 14 Okt 2026 (data s.d. 13 Okt), kolom DT_xx
                  "raw/MOBI TRansfer Balance/DAILY_DATA_MOBII_202610.xlsb"]   # ekspor 13 Okt (data s.d. 12 Okt), kolom HITS_xx
SRC = next((c for c in SRC_CANDIDATES if os.path.exists(c)), SRC_CANDIDATES[-1])
ADHOC = "raw/Outlet & Mapping/adhoc_outlet_im3_3id_data_gcp.xlsb"
TERRITORY = "website/data/territory_feed.js"
OUT_JS = "website/data/penjualan_feed.js"
OUT_JSON = "data/processed/penjualan_feed.json"

CUT_DAY = None                     # ditentukan otomatis: hari MTD terakhir yang punya data (12 pada ekspor 13 Okt, 13 pada refresh 14 Okt)
MTD_MONTH, LMTD_MONTH = (2026, 10), (2026, 9)
LMTD_FULL_DAYS = 30
BLANK_PRICE = {"IM3": 500, "3ID": 300}
CATS = {"SP": "Starter Pack", "VCF": "Voucher isi", "VCB": "Voucher blank", "SALMO": "Saldo Mobo"}
OUTSIDE = "OUTSIDE MASTER TERRITORY"


def norm_id(v):
    s = str(v if v is not None else "").strip().upper()
    if s.endswith(".0"):
        s = s[:-2]
    return s


def is_blank_voucher(name):
    u = name.upper()
    return "BLANK" in u or u.startswith("V0 ")


# ----------------------------------------------------------------------------------------
def xlsb_sheet_names(z):
    """Nama sheet dari xl/workbook.bin (record BrtBundleSh = 156) dalam urutan sheet1..N."""
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


def read_xlsb(path):
    """-> {sheet name: [row dict {col index: value}]}"""
    out = {}
    with zipfile.ZipFile(path) as z:
        sst = parse_xlsb_sst(z.read("xl/sharedStrings.bin")) if "xl/sharedStrings.bin" in z.namelist() else []
        names = xlsb_sheet_names(z)
        files = sorted([n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.bin$", n)], key=lambda n: int(re.findall(r"\d+", n)[0]))
        for i, fn in enumerate(files):
            nm = names[i] if i < len(names) else f"sheet{i + 1}"
            out[nm] = parse_xlsb_sheet_rows(z.read(fn), sst)
    return out


def read_pipe(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        lines = f.read().split("\n")
    for i, l in enumerate(lines):
        if l.count("|") > 10:
            hdr = [c.strip() for c in l.split("|")]
            return hdr, [l.split("|") for l in lines[i + 1:] if l.count("|") >= len(hdr) - 3]
    return [], []


# ----------------------------------------------------------------------------------------
print("[1/5] Master outlet dan hierarki...")
with open(TERRITORY, encoding="utf-8") as f:
    for line in f:
        if "var feed = " in line:
            terr = json.loads(line.split("var feed = ", 1)[1].rstrip(";\n "))
            break
mc_info = {}
for h in terr.get("hierarchy", []):
    for m in h.get("micro_clusters", []):
        mc_info[m["micro_cluster"]] = {"br": h["branch"], "hoa": h.get("hoa_leader", "—"), "dso": m.get("dso_leader", "—")}
outlets = {}            # key -> dim
by_im3, by_3id = {}, {}
master_count = defaultdict(int)   # (level, key) -> outlet count, for coverage
for o in terr["outlets"]:
    k = o["outlet_key"]
    mc = o.get("micro_cluster") or ""
    outlets[k] = {"k": k, "n": o.get("outlet_name") or "", "tier": "M", "br": o.get("branch") or "", "hoa": o.get("hoa_leader") or "—",
                  "mc": mc, "dso": o.get("dso_leader") or "—", "kec": o.get("kecamatan") or "—", "site": o.get("site_nbs") or "",
                  "dse": norm_id(o.get("dse_name") or "UNASSIGNED"), "id_im3": norm_id(o.get("outlet_id_im3")), "id_3id": norm_id(o.get("outlet_id_3id"))}
    if outlets[k]["id_im3"] not in ("", "0"): by_im3[outlets[k]["id_im3"]] = k
    if outlets[k]["id_3id"] not in ("", "0"): by_3id[outlets[k]["id_3id"]] = k
    master_count[("br", outlets[k]["br"])] += 1
    master_count[("mc", mc)] += 1
    master_count[("dse", outlets[k]["dse"])] += 1
print(f"   {len(outlets):,} outlet master")

print("[2/5] Outlet adhoc (mapping, bukan master)...")
adhoc = {}   # (brand, id) -> dim
for sh, rows in read_xlsb(ADHOC).items():
    if not rows:
        continue
    h = {str(v).strip().lower(): c for c, v in rows[0].items()}
    ci = h.get("id"); cm = h.get("micro_cluster"); ck = h.get("kecamatan_nm"); cs = h.get("sitid nbs", h.get("site id nbs")); cb = h.get("brand")
    for r in rows[1:]:
        oid = norm_id(r.get(ci))
        if not oid:
            continue
        brand = str(r.get(cb) or ("IM3" if "IM3" in sh else "3ID")).strip().upper()
        mc = str(r.get(cm) or "").strip()
        info = mc_info.get(mc, {})
        adhoc[(brand, oid)] = {"mc": mc, "kec": str(r.get(ck) or "—").strip(), "site": str(r.get(cs) or "").strip(),
                               "br": info.get("br", OUTSIDE), "hoa": info.get("hoa", "—"), "dso": info.get("dso", "—")}
print(f"   {len(adhoc):,} id outlet adhoc")

print("[3/5] Nama node dari laporan Physical Distribution dan balance...")
node_name = {}
for path in glob.glob("raw/SP VC Sellin/*.csv") + glob.glob("raw/MOBI TRansfer Balance/*_balance_*.csv"):
    hdr, rows = read_pipe(path)
    c = {h: i for i, h in enumerate(hdr)}
    for r in rows:
        if len(r) < len(hdr) - 3:
            continue
        a = norm_id(r[c["SALDOMOBO_ID"]])
        if a and a not in node_name:
            node_name[a] = (r[c["FROM NODE NAME"]].strip(), r[c["OUTLET TYPE"]].strip(), r[c["ORGANIZATION NAME"]].strip(), r[c["INITIATOR MICRO CLUSTER"]].strip())
        b = norm_id(r[c["DEST_SALDOMOBO_ID"]])
        if b and b not in node_name:
            node_name[b] = (r[c["TO NODE NAME"]].strip(), r[c["DEST_OUTLET TYPE"]].strip(), r[c["DEST_ORGANIZATIONNAME"]].strip(), r[c["DEST MICRO CLUSTER"]].strip())


def node_tier(oid):
    nm = node_name.get(oid)
    if not nm:
        return "UNKNOWN", "", ""
    n, ot = nm[0].upper(), nm[1].upper()
    mc = nm[3] or (re.search(r"PT-([A-Z ]+?)_", n) and "MC-" + re.search(r"PT-([A-Z ]+?)_", n).group(1))
    if n.startswith("CANVASSER") or "CANVASSER" in ot: return "DSE", nm[0], mc or ""
    if n.startswith("MPC"): return "MPC", nm[0], mc or ""
    if "_MP3" in n or "MP3" in ot: return "MP3", nm[0], mc or ""
    if n.startswith("SDP") or "SDP" in ot: return "SDP", nm[0], mc or ""
    if "OUTLET" in ot: return "OUTLET_MOBI", nm[2] or nm[0], mc or ""
    return "OTHER", nm[2] or nm[0], mc or ""


# ----------------------------------------------------------------------------------------
print("[4/5] Membaca DAILY_DATA_MOBII...")
sheets = read_xlsb(SRC)
print("   sumber:", SRC)
print("   sheet:", list(sheets))


def day_cols(hdr):
    """qty/hits per day: HITS_xx (ekspor lama) atau DT_xx (refresh 14 Okt); amount per day: AMOUNT_xx."""
    hits = {d: (hdr.get(f"HITS_{d:02d}") if hdr.get(f"HITS_{d:02d}") is not None else hdr.get(f"DT_{d:02d}")) for d in range(1, 32)}
    amts = {d: hdr.get(f"AMOUNT_{d:02d}") for d in range(1, 32)}
    return hits, amts


if CUT_DAY is None:
    last = 0
    for sname, rows in sheets.items():
        if not sname.startswith("MTD_") or not rows:
            continue
        hdr0 = {str(v).strip(): c for c, v in rows[0].items()}
        h0, a0 = day_cols(hdr0)
        for d in range(31, 0, -1):
            if d <= last:
                break
            if any((float(r.get(h0[d]) or 0) if h0[d] is not None else 0) or (float(r.get(a0[d]) or 0) if a0[d] is not None else 0) for r in rows[1:]):
                last = max(last, d)
                break
    CUT_DAY = last or 12
    print(f"   cut otomatis: hari MTD terakhir dengan data = {CUT_DAY} Okt")


def empty_fact():
    return {"mq": 0.0, "mv": 0.0, "lq": 0.0, "lv": 0.0, "fq": 0.0, "fv": 0.0, "tq": 0, "tlq": 0, "tfq": 0, "md": {}, "ld": {}}   # tq/tlq/tfq = jumlah transfer saldo (baris-hari AMOUNT > 0): MTD, LMTD, Sep penuh. md/ld: day -> [q, v]


outlet_facts = defaultdict(lambda: defaultdict(empty_fact))   # key -> cat -> fact   (brand kept per outlet key)
outlet_brand = {}
alloc_facts = defaultdict(lambda: defaultdict(empty_fact))    # (brand, id) -> cat -> fact
alloc_dim = {}
prod_facts = defaultdict(lambda: {"mq": 0.0, "mv": 0.0, "lq": 0.0, "lv": 0.0, "fq": 0.0, "fv": 0.0, "mo": set(), "lo": set(), "fo": set()})
outlet_prod = defaultdict(lambda: defaultdict(lambda: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]))   # key -> (brand, cat, product) -> [mq, mv, lq, lv, fq, fv]
tier_tot = defaultdict(lambda: [0.0, 0.0, 0, 0])              # (period, brand, cat, tier) -> [q, v, rows, ids]
unit_price = defaultdict(lambda: [0.0, 0.0])
blank_file = defaultdict(lambda: {"qty": 0.0, "file_value": 0.0, "repriced": 0.0})   # (period, brand) -> VC blank as the file values it

DATA_SHEETS = {"LMTD_SP", "LMTD_VC", "LMTD_SALMO", "MTD_SP", "MTD_VC", "MTD_SALMO"}
for sname, rows in sheets.items():
    if sname not in DATA_SHEETS or not rows:
        print(f"   lewati sheet {sname!r} (bukan sheet data)")
        continue
    period, base = sname.split("_", 1)           # LMTD / MTD, SP / VC / SALMO
    hdr = {str(v).strip(): c for c, v in rows[0].items()}
    c_id, c_b, c_p = hdr["id_outlet"], hdr["brand"], hdr["product_name"]
    hits, amts = day_cols(hdr)
    seen_ids = defaultdict(set)
    for r in rows[1:]:
        oid = norm_id(r.get(c_id))
        if not oid:
            continue
        brand = str(r.get(c_b) or "").strip().upper()
        pname = str(r.get(c_p) or "").strip()
        cat = base if base != "VC" else ("VCB" if is_blank_voucher(pname) else "VCF")
        # tier
        if brand == "IM3" and oid in by_im3:
            key, tier = by_im3[oid], "OUTLET"
        elif brand == "3ID" and oid in by_3id:
            key, tier = by_3id[oid], "OUTLET"
        elif (brand, oid) in adhoc:
            key, tier = f"A:{brand}:{oid}", "OUTLET"
            if key not in outlets:
                a = adhoc[(brand, oid)]
                outlets[key] = {"k": key, "n": "", "tier": "A", "br": a["br"], "hoa": a["hoa"], "mc": a["mc"], "dso": a["dso"], "kec": a["kec"],
                                "site": a["site"], "dse": "UNASSIGNED (adhoc)", "id_im3": oid if brand == "IM3" else "", "id_3id": oid if brand == "3ID" else ""}
        else:
            key = f"N:{brand}:{oid}"
            tier, nname, nmc = node_tier(oid)
            alloc_dim.setdefault(key, {"k": key, "id": oid, "b": brand, "tier": tier, "n": nname, "mc": nmc, "br": mc_info.get(nmc, {}).get("br", "")})
        if tier == "OUTLET":
            outlet_brand[key] = brand
        for d in range(1, 32):
            q = r.get(hits[d]) if hits[d] is not None else 0
            v = r.get(amts[d]) if amts[d] is not None else 0
            q = float(q or 0); v = float(v or 0)
            if cat == "VCB":
                in_window = (period == "MTD" and d <= CUT_DAY) or (period == "LMTD" and d <= CUT_DAY)
                if in_window:
                    bf = blank_file[(period, brand)]; bf["qty"] += q; bf["file_value"] += v; bf["repriced"] += q * BLANK_PRICE.get(brand, 0)
                v = q * BLANK_PRICE.get(brand, 0)
            if not q and not v:
                continue
            tgt = outlet_facts[key][cat] if tier == "OUTLET" else alloc_facts[key][cat]
            t_key = (period, brand, cat, tier if tier != "OUTLET" else ("OUTLET_M" if not key.startswith("A:") else "OUTLET_A"))
            if period == "MTD" and d <= CUT_DAY:
                if cat == "SALMO" and v > 0:
                    tgt["tq"] += 1
                tgt["mq"] += q; tgt["mv"] += v
                cell = tgt["md"].setdefault(d, [0.0, 0.0]); cell[0] += (1 if cat == "SALMO" and v > 0 else q); cell[1] += v   # SALMO: qty harian = jumlah transfer
                tier_tot[t_key][0] += q; tier_tot[t_key][1] += v
                if tier == "OUTLET":
                    pf = prod_facts[(brand, cat, pname)]; pf["mq"] += q; pf["mv"] += v; pf["mo"].add(key)
                    unit_price[(brand, cat, pname)][0] += q; unit_price[(brand, cat, pname)][1] += v
                    op = outlet_prod[key][(brand, cat, pname)]; op[0] += q; op[1] += v
            elif period == "LMTD":
                if cat == "SALMO" and v > 0:
                    tgt["tfq"] += 1
                    if d <= CUT_DAY:
                        tgt["tlq"] += 1
                tgt["fq"] += q; tgt["fv"] += v
                if tier == "OUTLET":
                    pf = prod_facts[(brand, cat, pname)]; pf["fq"] += q; pf["fv"] += v; pf["fo"].add(key)
                    op = outlet_prod[key][(brand, cat, pname)]; op[4] += q; op[5] += v
                if d <= CUT_DAY:
                    tgt["lq"] += q; tgt["lv"] += v
                    cell = tgt["ld"].setdefault(d, [0.0, 0.0]); cell[0] += q; cell[1] += v
                    tier_tot[t_key][0] += q; tier_tot[t_key][1] += v
                    if tier == "OUTLET":
                        pf = prod_facts[(brand, cat, pname)]; pf["lq"] += q; pf["lv"] += v; pf["lo"].add(key)
                        op = outlet_prod[key][(brand, cat, pname)]; op[2] += q; op[3] += v
        if period == "MTD" or True:
            tk = (period, brand, cat, tier if tier != "OUTLET" else ("OUTLET_M" if not key.startswith("A:") else "OUTLET_A"))
            tier_tot[tk][2] += 1
            if key not in seen_ids[tk]:
                seen_ids[tk].add(key); tier_tot[tk][3] += 1

# ----------------------------------------------------------------------------------------
print("[5/5] Menyusun feed...")


def pack(fact, with_ld=False):
    """Kompak: [mq, mv, lq, lv, fq, fv, last_mtd_day, last_lmtd_day, days_mtd, days_lmtd, md(, ld)]
    md = [[hari, nilai]] untuk outlet; [[hari, qty, nilai]] untuk node alokasi (with_ld)."""
    md = sorted(fact["md"].items())
    ld = sorted(fact["ld"].items())
    out = [int(fact["mq"]), int(fact["mv"]), int(fact["lq"]), int(fact["lv"]), int(fact["fq"]), int(fact["fv"]),
           md[-1][0] if md else None, ld[-1][0] if ld else None, len(md), len(ld),
           [[d, int(c[0]), int(c[1])] for d, c in md] if with_ld else [[d, int(c[1]), int(c[0])] for d, c in md]]   # outlet: [hari, nilai, qty]
    if with_ld:
        out.append([[d, int(c[0]), int(c[1])] for d, c in ld])
    elif fact["tq"] or fact["tlq"] or fact["tfq"]:
        out.append([fact["tq"], fact["tlq"], fact["tfq"]])      # index 11 (Saldo Mobo saja): [transfer MTD, LMTD, Sep penuh]
    return out


outlet_rows = []
for key, cats in outlet_facts.items():
    if not any(f["mv"] or f["lv"] for f in cats.values()):
        continue          # hanya aktif setelah tanggal cut di September: tidak dipakai perbandingan MTD vs LMTD
    dim = outlets[key]
    row = {k: dim[k] for k in ("k", "n", "tier", "mc", "kec", "site", "dse")}
    if dim["mc"] not in mc_info and dim["br"]:
        row["br"] = dim["br"]
    row["b"] = outlet_brand.get(key, "")
    row["id"] = dim["id_im3"] if row["b"] == "IM3" else dim["id_3id"]
    row["c"] = {cat: pack(f) for cat, f in cats.items()}
    outlet_rows.append(row)

# ---- SP Injection (digital, MOBO) sebagai bagian Sell-In (owner, 15 Okt 2026) ----------------------
# Sumber: data/processed/demand_feed.json (build_demand_feed.py, jalankan sebelum skrip ini). MTD saja: LMTD dan bulan penuh
# belum tersedia (lq/lv/fq/fv = 0, metadata.spi.has_baseline = false). Dipotong sampai CUT_DAY agar sejajar dengan MOBII.
SPI_MTD_DAYS = {}                  # (mc, brand) -> [[qty, value]] per hari, untuk mc_daily
spi_meta = {"has_baseline": False, "source": None, "outlets": 0, "pcs": 0, "value": 0, "note": "SP Injection (MOBO) hanya MTD; LMTD dan bulan penuh akan disiapkan."}
DEMAND_JSON = "data/processed/demand_feed.json"
if os.path.exists(DEMAND_JSON):
    with open(DEMAND_JSON, encoding="utf-8") as fh:
        _dem = json.load(fh)
    by_k = {r["k"]: r for r in outlet_rows}
    spi_meta["source"] = _dem.get("metadata", {}).get("source")
    for o in _dem.get("outlets", []):
        sp = (o.get("c") or {}).get("SPI")
        if not sp:
            continue
        md = [e for e in sp[4] if e[0] <= CUT_DAY]          # demand md = [hari, nilai, qty]
        if not md:
            continue
        mv_ = sum(e[1] for e in md); mq_ = sum(e[2] for e in md)
        packed = [mq_, mv_, 0, 0, 0, 0, max(e[0] for e in md), None, len(md), 0, [[e[0], e[1], e[2]] for e in md]]
        row = by_k.get(o["k"])
        if row is None:
            row = {k: o[k] for k in ("k", "n", "tier", "mc", "kec", "site", "dse")}
            row["b"] = o["b"]; row["id"] = o["id"]; row["c"] = {}
            if o["mc"] not in mc_info and o.get("br"):
                row["br"] = o["br"]
            outlet_rows.append(row); by_k[o["k"]] = row
        row["c"]["SPI"] = packed
        spi_meta["outlets"] += 1; spi_meta["pcs"] += mq_; spi_meta["value"] += mv_
        s_ = SPI_MTD_DAYS.setdefault((o["mc"] or OUTSIDE, row["b"]), [[0, 0] for _ in range(CUT_DAY)])
        for e in md:
            s_[e[0] - 1][0] += e[2]; s_[e[0] - 1][1] += e[1]
else:
    print("   PERINGATAN: demand_feed.json belum ada; SP Injection tidak dimuat (jalankan build_demand_feed.py dulu).")

outlet_rows.sort(key=lambda r: -sum(c[1] for c in r["c"].values()))

alloc_rows = []
for key, cats in alloc_facts.items():
    row = dict(alloc_dim[key])
    row["c"] = {cat: pack(f, with_ld=True) for cat, f in cats.items()}
    alloc_rows.append(row)
alloc_rows.sort(key=lambda r: -sum(c[1] for c in r["c"].values()))

products = []
for (brand, cat, pname), pf in prod_facts.items():
    up = unit_price[(brand, cat, pname)]
    products.append({"b": brand, "cat": cat, "n": pname, "mq": int(pf["mq"]), "mv": int(pf["mv"]), "lq": int(pf["lq"]), "lv": int(pf["lv"]), "fq": int(pf["fq"]), "fv": int(pf["fv"]),
                     "mo": len(pf["mo"]), "lo": len(pf["lo"]), "fo": len(pf["fo"]), "price": round(up[1] / up[0]) if up[0] else None})
products.sort(key=lambda p: -p["mv"])
for i, pr in enumerate(products):
    pr["i"] = i
prod_index = {(pr["b"], pr["cat"], pr["n"]): pr["i"] for pr in products}
for row in outlet_rows:
    pp = outlet_prod.get(row["k"], {})
    row["p"] = {str(prod_index[k]): [int(v[0]), int(v[1]), int(v[2]), int(v[3]), int(v[4]), int(v[5])] for k, v in pp.items() if k in prod_index and (v[0] or v[2] or v[4])}

# Series harian per MC x brand x cat (MTD dan LMTD hari 1..CUT) untuk tren tanpa menghitung dari outlet
mc_daily = defaultdict(lambda: {"m": [[0, 0] for _ in range(CUT_DAY)], "l": [[0, 0] for _ in range(CUT_DAY)]})
for key, cats in outlet_facts.items():
    dim = outlets[key]
    for cat, f in cats.items():
        s = mc_daily[(dim["mc"] or OUTSIDE, outlet_brand.get(key, ""), cat)]
        for d, c in f["md"].items(): s["m"][d - 1][0] += int(c[0]); s["m"][d - 1][1] += int(c[1])
        for d, c in f["ld"].items(): s["l"][d - 1][0] += int(c[0]); s["l"][d - 1][1] += int(c[1])
mc_daily_rows = [{"mc": k[0], "b": k[1], "cat": k[2], "m": v["m"], "l": v["l"]} for k, v in mc_daily.items()]
mc_daily_rows += [{"mc": k[0], "b": k[1], "cat": "SPI", "m": v, "l": [[0, 0] for _ in range(CUT_DAY)]} for k, v in SPI_MTD_DAYS.items()]

tiers_out = [{"period": k[0], "b": k[1], "cat": k[2], "tier": k[3], "q": int(v[0]), "v": int(v[1]), "rows": v[2], "ids": v[3]} for k, v in sorted(tier_tot.items())]

days_mtd = [date(MTD_MONTH[0], MTD_MONTH[1], d).isoformat() for d in range(1, CUT_DAY + 1)]
days_lmtd = [date(LMTD_MONTH[0], LMTD_MONTH[1], d).isoformat() for d in range(1, CUT_DAY + 1)]
feed = {
    "metadata": {
        "generated_at": datetime.now().isoformat(timespec="seconds"), "source": SRC, "contract": "docs/assessments/daily_data_mobii_sellin.md",
        "cut": days_mtd[-1], "cut_day": CUT_DAY, "days_mtd": days_mtd, "days_lmtd": days_lmtd, "lmtd_full_days": LMTD_FULL_DAYS, "mtd_month_days": 31,
        "blank_price": BLANK_PRICE, "categories": dict(CATS, SPI="SP Injection"), "spi": spi_meta,
        "blank_file": {f"{k[0]}|{k[1]}": {kk: int(vv) for kk, vv in v.items()} for k, v in blank_file.items()},
        "sanity_note": "Sheet Sanity_Check di file yang sama menjumlahkan SEMUA baris (outlet + node alokasi + node lain) dengan nilai blank apa adanya; tab Ringkasan memuat rekonsiliasinya.",
        "saldo_transfer": "outlets[].c.SALMO[11] = [jumlah transfer MTD, LMTD, Sep penuh]; satu transfer = satu baris produk-hari dengan AMOUNT > 0 (file MOBII tidak punya kolom hits untuk saldo).", "outlet_product_columns": ["p[product index] = [mq, mv, lq, lv, fq, fv] (fq/fv = September penuh)"],
        "fact_columns": ["mq", "mv", "lq", "lv", "fq", "fv", "last_mtd_day", "last_lmtd_day", "days_mtd", "days_lmtd", "md [[day, value, qty]] (alokasi: [[day, qty, value]])", "ld (alokasi saja)"],
        "rules": ["Sell-In outlet = baris yang id_outlet-nya outlet master atau outlet adhoc; nilai alokasi (DSE/MPC/MP3/SDP) dipisah di 'allocation'.",
                  "VC blank = nama produk mengandung BLANK atau diawali 'V0 '; nilai = unit x harga blank per brand.",
                  "MTD = 1..cut Okt 2026; LMTD = tanggal yang sama di Sep 2026; fq/fv = September penuh.",
                  "SPI (SP Injection, MOBO) ikut Sell-In: mq = pcs, mv = Rupiah, MTD saja (lq/lv/fq/fv = 0 sampai LMTD dan bulan penuh disiapkan); ada toggle di aplikasi."],
        "master_counts": {"br": {k[1]: v for k, v in master_count.items() if k[0] == "br"}, "mc": {k[1]: v for k, v in master_count.items() if k[0] == "mc"},
                          "dse": {k[1]: v for k, v in master_count.items() if k[0] == "dse"}},
        "mc_info": mc_info,
    },
    "tiers": tiers_out, "outlets": outlet_rows, "products": products, "mc_daily": mc_daily_rows, "allocation": alloc_rows,
}

os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(feed, f, ensure_ascii=False)
with open(OUT_JS, "w", encoding="utf-8") as f:
    f.write("// Auto-generated Penjualan (Sell-In outlet) feed dari DAILY_DATA_MOBII. Kontrak: docs/assessments/daily_data_mobii_sellin.md\n")
    f.write("var PENJUALAN_FEED = ")
    json.dump(feed, f, ensure_ascii=False)
    f.write(";\nif (typeof window !== 'undefined') window.PENJUALAN_FEED = PENJUALAN_FEED;\n")


def tot(period, cat, tier_prefix="OUTLET"):
    return sum(t["v"] for t in tiers_out if t["period"] == period and t["cat"] == cat and t["tier"].startswith(tier_prefix))


print(f"SUCCESS: {OUT_JS} ({os.path.getsize(OUT_JS) / 1024:.0f} KB); {len(outlet_rows):,} outlet, {len(alloc_rows)} node alokasi, {len(products)} produk.")
for cat in CATS:
    print(f"   {cat:5s} outlet MTD Rp {tot('MTD', cat) / 1e6:9.1f} jt  LMTD(1-{CUT_DAY}) Rp {tot('LMTD', cat) / 1e6:9.1f} jt  | alokasi MTD Rp {(tot('MTD', cat, 'DSE') + tot('MTD', cat, 'MPC') + tot('MTD', cat, 'MP3') + tot('MTD', cat, 'SDP')) / 1e6:8.1f} jt")
