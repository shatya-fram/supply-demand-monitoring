#!/usr/bin/env python3
"""
build_demand_feed.py  ·  Demand (sell-out) per outlet dari DAILY_DATA_MOBO

Sumber : raw/Data as of 14 Oct /DAILY_DATA_MOBO_202610.xlsb
Kontrak: docs/assessments/daily_data_mobo_demand.md
Output : website/data/demand_feed.js  (var DEMAND_FEED = {...})
         data/processed/demand_feed.json

Nama sheet file 14 Okt 18:12: SP_INJECTION, RELOAD, VOUCHER, CVM, RECARGE (alias di SHEET_ALIASES).
Sheet (satu baris per ID_Outlet x produk, kolom per tanggal HITS_dd / AMOUNT_dd):
  MTD_SP_INJECTION   SP yang di-inject outlet ke konsumen (unit; rupiah terisi sejak file 14 Okt 18:12)
  MTD_RELOAD         isi ulang pulsa; ProductName = nominal reload
  VOUCHER_INJECTION  inject voucher paket data
  MTD_CVM            paket CVM
  MTD_RECARGE        penjualan paket data (diisi sejak file 14 Okt 15:31); kategori PKT 'Paket Data'
Tidak ada kolom brand; brand outlet disimpulkan dari id (id IM3 master, id 3ID master, atau mapping adhoc).
Pure stdlib. Jalankan dari root proyek.
"""

import json
import os
import re
import sys
from collections import defaultdict
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, "scripts"))
from build_territory_management_catalogues import parse_xlsb_sst, parse_xlsb_sheet_rows  # noqa: E402
import struct, zipfile  # noqa: E402

SRC_CANDIDATES = [os.environ["MOBO_SRC"]] if os.environ.get("MOBO_SRC") else ["raw/Data as of 14 Oct /DAILY_DATA_MOBO_202610.xlsb"]   # MOBO_SRC: set by scripts/daily_update.py
ADHOC = "raw/Outlet & Mapping/adhoc_outlet_im3_3id_data_gcp.xlsb"
SALMO_SRC = os.environ.get("MOBO_SALMO_SRC") or next(iter(sorted(
    (os.path.join(dp, f) for dp, _d, fn in os.walk("raw") for f in fn if re.match(r"^DAILY_DATA_MOBO_SALMO_.*\.xlsb$", f, re.I)),
    key=os.path.getmtime, reverse=True)), None)      # newest MOBO_SALMO report (Saldo Mobo demand), optional
TERRITORY = "website/data/territory_feed.js"
PENJUALAN_JSON = "data/processed/penjualan_feed.json"
OUT_JS = "website/data/demand_feed.js"
OUT_JSON = "data/processed/demand_feed.json"
MONTH = (2026, 10)
_PY, _PM = (MONTH[0], MONTH[1] - 1) if MONTH[1] > 1 else (MONTH[0] - 1, 12)
LM_TAG = f"{_PY}{_PM:02d}"
LM_SRC = os.environ.get("MOBO_LM_SRC") or next(iter(sorted(
    (os.path.join(dp, f) for dp, _d, fn in os.walk("raw") for f in fn if re.match(r"^DAILY_DATA_MOBO_" + LM_TAG + r"[^A-Za-z]*\.xlsb$", f, re.I)),
    key=os.path.getmtime, reverse=True)), None)      # newest MOBO workbook of the previous (closed) month, optional
OUTSIDE = "OUTSIDE MASTER TERRITORY"

SHEETS = {   # sheet -> (kode kategori, label, punya nilai rupiah)
    "MTD_SP_INJECTION": ("SPI", "SP Injection", False),
    "MTD_RELOAD": ("RLD", "Reload", True),
    "VOUCHER_INJECTION": ("VCI", "Voucher Injection", True),
    "MTD_CVM": ("CVM", "CVM", True),
    "MTD_RECARGE": ("PKT", "Paket Data", True),   # isi sheet = penjualan paket data (Freedom Internet, Happy 3ID, ...), bukan isi ulang pulsa
}
CATS = {v[0]: v[1] for v in SHEETS.values()}


def norm_id(v):
    s = str(v if v is not None else "").strip().upper()
    if s.endswith(".0"):
        s = s[:-2]
    return s


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


def read_xlsb(path):
    out = {}
    with zipfile.ZipFile(path) as z:
        sst = parse_xlsb_sst(z.read("xl/sharedStrings.bin")) if "xl/sharedStrings.bin" in z.namelist() else []
        names = sheet_names(z)
        files = sorted([n for n in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.bin$", n)], key=lambda n: int(re.findall(r"\d+", n)[0]))
        for i, fn in enumerate(files):
            out[names[i] if i < len(names) else f"sheet{i + 1}"] = parse_xlsb_sheet_rows(z.read(fn), sst)
    return out


def day_cols(hdr, kind):
    """kind 'hits' -> HITS_dd / DT_dd; 'amt' -> AMOUNT_dd. Returns {day: col index}."""
    pats = [r"^(HITS|DT)_(\d{1,2})$"] if kind == "hits" else [r"^AMOUNT_(\d{1,2})$"]
    out = {}
    for c, v in hdr.items():
        for pat in pats:
            m = re.match(pat, str(v).strip(), re.I)
            if m:
                out[int(m.group(m.lastindex))] = c
    return out


src = next((p for p in SRC_CANDIDATES if os.path.exists(p)), None)
if not src:
    raise SystemExit("File DAILY_DATA_MOBO tidak ditemukan: " + ", ".join(SRC_CANDIDATES))

print("[1/4] Master outlet dan outlet adhoc...")
with open(TERRITORY, encoding="utf-8") as f:
    for line in f:
        if "var feed = " in line:
            terr = json.loads(line.split("var feed = ", 1)[1].rstrip(";\n "))
            break
mc_info = {}
for h in terr.get("hierarchy", []):
    for m in h.get("micro_clusters", []):
        mc_info[m["micro_cluster"]] = {"br": h["branch"], "hoa": h.get("hoa_leader", "—"), "dso": m.get("dso_leader", "—")}
master = {}
by_im3, by_3id = {}, {}
master_count = defaultdict(int)
for o in terr["outlets"]:
    k = o["outlet_key"]
    mc = o.get("micro_cluster") or ""
    master[k] = {"k": k, "n": o.get("outlet_name") or "", "tier": "M", "mc": mc, "kec": o.get("kecamatan") or "—", "site": o.get("site_nbs") or "",
                 "dse": norm_id(o.get("dse_name") or "UNASSIGNED"), "br": o.get("branch") or "",
                 "id_im3": norm_id(o.get("outlet_id_im3")), "id_3id": norm_id(o.get("outlet_id_3id"))}
    if master[k]["id_im3"] not in ("", "0"): by_im3[master[k]["id_im3"]] = k
    if master[k]["id_3id"] not in ("", "0"): by_3id[master[k]["id_3id"]] = k
    master_count[("br", master[k]["br"])] += 1
    master_count[("mc", mc)] += 1
    master_count[("dse", master[k]["dse"])] += 1
adhoc = {}
for sh, rows in read_xlsb(ADHOC).items():
    if not rows:
        continue
    h = {str(v).strip().lower(): c for c, v in rows[0].items()}
    ci, cm, ck, cs, cb = h.get("id"), h.get("micro_cluster"), h.get("kecamatan_nm"), h.get("sitid nbs", h.get("site id nbs")), h.get("brand")
    for r in rows[1:]:
        oid = norm_id(r.get(ci))
        if not oid:
            continue
        brand = str(r.get(cb) or ("IM3" if "IM3" in sh else "3ID")).strip().upper()
        mc = str(r.get(cm) or "").strip()
        info = mc_info.get(mc, {})
        adhoc[(brand, oid)] = {"mc": mc, "kec": str(r.get(ck) or "—").strip(), "site": str(r.get(cs) or "").strip(), "br": info.get("br", OUTSIDE)}
pj_adhoc_keys = set()
if os.path.exists(PENJUALAN_JSON):
    with open(PENJUALAN_JSON, encoding="utf-8") as f:
        for o in json.load(f)["outlets"]:
            if o["k"].startswith("A:"):
                pj_adhoc_keys.add(o["k"])
print(f"   {len(master):,} outlet master, {len(adhoc):,} id adhoc, {len(pj_adhoc_keys):,} outlet adhoc di feed Penjualan")

print("[2/4] Membaca", src)
sheets = read_xlsb(src)
print("   sheet:", {k: max(len(v) - 1, 0) for k, v in sheets.items()})

def _sig_rows(rows):
    """{(id_outlet, productname): tuple of all day values} for one MOBO sheet."""
    hdr = {c: str(v).strip().lower() for c, v in rows[0].items()}
    c_id = next(c for c, v in hdr.items() if v == "id_outlet"); c_pn = next(c for c, v in hdr.items() if v == "productname")
    vc = [c for c, v in sorted(hdr.items()) if re.match(r"^(hits|dt|amount)_\d+$", v)]
    return c_id, c_pn, vc


def drop_copied_rows(sheets):
    """17 Oct 2026: the CVM sheet of the new workbook held the real CVM rows PLUS an exact copy of 61,391 RECARGE (Paket Data) rows (Rp 36.2 B),
    which would have inflated total demand by about 60%. Rows of CVM that are identical to a RECARGE row (same outlet, product and every day value) are dropped."""
    cvm_key = "CVM" if "CVM" in sheets else ("MTD_CVM" if "MTD_CVM" in sheets else None)
    rcg_key = next((k for k in ("RECARGE", "RECHARGE", "MTD_RECARGE") if k in sheets), None)
    if not cvm_key or not rcg_key or len(sheets[cvm_key]) < 2 or len(sheets[rcg_key]) < 2:
        return
    ci, cp, cv = _sig_rows(sheets[cvm_key]); ri, rp, rv = _sig_rows(sheets[rcg_key])
    ref = {(str(r.get(ri)), str(r.get(rp))): tuple(round(float(r.get(c) or 0), 2) for c in rv) for r in sheets[rcg_key][1:]}
    keep, dropped, amt = [sheets[cvm_key][0]], 0, 0.0
    hdr = {c: str(v).strip().lower() for c, v in sheets[cvm_key][0].items()}
    acols = [c for c, v in hdr.items() if v.startswith("amount_")]
    day_cols = sorted((int(re.search(r"(\d+)$", v).group(1)), c) for c, v in hdr.items() if re.match(r"^amount_\d+$", v))
    rhdr = {c: str(v).strip().lower() for c, v in sheets[rcg_key][0].items()}
    rday = {int(re.search(r"(\d+)$", v).group(1)): c for c, v in rhdr.items() if re.match(r"^amount_\d+$", v)}
    rref = {(str(r.get(ri)), str(r.get(rp))): r for r in sheets[rcg_key][1:]}
    def same_through(r, ref_row, last_day):    # every day value up to last_day equal to the RECARGE row
        return all(round(float(r.get(c) or 0), 2) == round(float(ref_row.get(rday.get(d)) or 0), 2) for d, c in day_cols if d <= last_day)
    for r in sheets[cvm_key][1:]:
        key = (str(r.get(ci)), str(r.get(cp)))
        sig = ref.get(key)
        copied = sig is not None and sig == tuple(round(float(r.get(c) or 0), 2) for c in cv)
        # 19 Oct 2026: the RECARGE sheet moved on (days 17-18) while the CVM sheet kept an older copy of it: same outlet and product, equal up to day 16, later days differ
        if not copied and key in rref and same_through(r, rref[key], 16):
            copied = True
        if copied:
            dropped += 1; amt += sum(float(r.get(c) or 0) for c in acols)
        else:
            keep.append(r)
    if dropped:
        print(f"   WARNING: CVM sheet held {dropped:,} rows identical to RECARGE rows (Rp {amt / 1e9:.1f} B): removed, {len(keep) - 1:,} CVM rows kept")
        sheets[cvm_key] = keep


drop_copied_rows(sheets)

outlets = {}                 # key -> dim
outlet_brand = {}
brand_val = defaultdict(lambda: {"IM3": 0.0, "3ID": 0.0})   # key -> nilai rupiah per brand id (outlet master bisa punya id IM3 dan 3ID)
facts = defaultdict(lambda: defaultdict(lambda: {"mq": 0.0, "mv": 0.0, "md": {}}))   # key -> cat -> fact
op = defaultdict(lambda: defaultdict(lambda: [0.0, 0.0]))                            # key -> (cat, product) -> [q, v]
prod = defaultdict(lambda: {"mq": 0.0, "mv": 0.0, "mo": set()})
tiers = defaultdict(lambda: {"rows": 0, "ids": set(), "q": 0.0, "v": 0.0})
unknown_ids = defaultdict(float)
last_day = 0


def resolve(oid):
    """-> (key, brand, tier, class) ; brand dari id."""
    if oid in by_im3:
        return by_im3[oid], "IM3", "M", "master_im3"
    if oid in by_3id:
        return by_3id[oid], "3ID", "M", "master_3id"
    cands = [b for b in ("IM3", "3ID") if (b, oid) in adhoc]
    if cands:
        pick = next((b for b in cands if f"A:{b}:{oid}" in pj_adhoc_keys), cands[0])
        key = f"A:{pick}:{oid}"
        if key not in outlets:
            a = adhoc[(pick, oid)]
            outlets[key] = {"k": key, "n": "", "tier": "A", "mc": a["mc"], "kec": a["kec"], "site": a["site"], "dse": "UNASSIGNED (adhoc)", "br": a["br"]}
        return key, pick, "A", "adhoc"
    return None, "", "", "unknown"


SHEET_ALIASES = {   # file 14 Okt 18:12 mengganti nama sheet; terima nama lama dan baru (file September: "SP INJECTION")
    "MTD_SP_INJECTION": ["SP_INJECTION", "SP INJECTION"], "MTD_RELOAD": ["RELOAD"], "VOUCHER_INJECTION": ["VOUCHER"],
    "MTD_CVM": ["CVM"], "MTD_RECARGE": ["RECARGE", "RECHARGE"],
}


def find_sheet(sheets, sname):
    for nm in [sname] + SHEET_ALIASES.get(sname, []):
        if nm in sheets:
            return sheets[nm]
    return None


for sname, (code, label, has_val) in SHEETS.items():
    rows = find_sheet(sheets, sname)
    if not rows or len(rows) < 2:
        print(f"   lewati {sname} (kosong)")
        continue
    hdr = {c: str(v).strip() for c, v in rows[0].items()}
    c_id = next(c for c, v in hdr.items() if v.lower() == "id_outlet")
    c_pn = next(c for c, v in hdr.items() if v.lower() == "productname")
    hits, amts = day_cols(hdr, "hits"), day_cols(hdr, "amt")
    for r in rows[1:]:
        oid = norm_id(r.get(c_id))
        if not oid:
            continue
        pname = r.get(c_pn)
        if code == "RLD":
            try:
                pname = "Reload Rp {:,.0f}".format(float(pname)).replace(",", ".")
            except (TypeError, ValueError):
                pname = str(pname)
        pname = str(pname).strip()
        key, brand, tier, cls = resolve(oid)
        q = v = 0.0
        days = {}
        for d in range(1, 32):
            qq = float(r.get(hits[d]) or 0) if d in hits else 0.0
            vv = float(r.get(amts[d]) or 0) if d in amts else 0.0
            if not qq and not vv:
                continue
            days[d] = (qq, vv)
            q += qq; v += vv
            last_day = max(last_day, d)
        T = tiers[(code, cls)]
        T["rows"] += 1; T["ids"].add(oid); T["q"] += q; T["v"] += v
        if key is None:
            unknown_ids[oid] += v
            continue
        if key in master and key not in outlets:
            outlets[key] = master[key]
        outlet_brand.setdefault(key, brand)
        if has_val and brand in ("IM3", "3ID"):
            brand_val[key][brand] += v
        F = facts[key][code]
        F["mq"] += q; F["mv"] += v
        for d, (qq, vv) in days.items():
            cell = F["md"].setdefault(d, [0.0, 0.0]); cell[0] += qq; cell[1] += vv
        pe = op[key][(code, pname)]; pe[0] += q; pe[1] += v
        P = prod[(code, pname)]; P["mq"] += q; P["mv"] += v; P["mo"].add(key)
# ---- MOBO_SALMO: Saldo Mobo yang ditransaksikan outlet ke pelanggan (Rp per hari, DT_dd); kategori SAL di luar total demand
sal_brand = defaultdict(lambda: [0.0, 0.0])
sal_meta = {"source": None, "last_day": 0, "outlets": 0, "value": 0, "unknown": {"ids": 0, "value": 0}}
sal_unknown = defaultdict(float)
if SALMO_SRC and os.path.exists(SALMO_SRC):
    print("   MOBO_SALMO:", SALMO_SRC)
    srows = next(iter(read_xlsb(SALMO_SRC).values()))
    hdr = {c: str(v).strip() for c, v in srows[0].items()}
    c_id = next(c for c, v in hdr.items() if v.lower() == "id_outlet")
    dcols = {int(m.group(1)): c for c, v in hdr.items() for m in [re.match(r"^DT_(\d{1,2})$", v, re.I)] if m}
    for r in srows[1:]:
        oid = norm_id(r.get(c_id))
        if not oid:
            continue
        key, brand, tier, cls = resolve(oid)
        days = {d: float(r.get(c) or 0) for d, c in dcols.items() if isinstance(r.get(c), (int, float)) and r.get(c)}
        v = sum(days.values())
        T = tiers[("SAL", cls)]
        T["rows"] += 1; T["ids"].add(oid); T["v"] += v
        if not days:
            continue
        sal_meta["last_day"] = max(sal_meta["last_day"], max(days))
        if key is None:
            sal_unknown[oid] += v
            continue
        if key in master and key not in outlets:
            outlets[key] = master[key]
        outlet_brand.setdefault(key, brand)
        if brand in ("IM3", "3ID"):
            sal_brand[key][0 if brand == "IM3" else 1] += v
        F = facts[key]["SAL"]
        F["mv"] += v
        for d, vv in days.items():
            cell = F["md"].setdefault(d, [0.0, 0.0]); cell[1] += vv
    sal_meta.update({"source": SALMO_SRC, "outlets": sum(1 for k in facts if "SAL" in facts[k]),
                     "value": int(sum(F["SAL"]["mv"] for F in facts.values() if "SAL" in F)),
                     "unknown": {"ids": len(sal_unknown), "value": int(sum(sal_unknown.values()))}})
    print(f"   MOBO_SALMO: {sal_meta['outlets']:,} outlet, Rp {sal_meta['value'] / 1e9:.2f} M, hari terakhir {sal_meta['last_day']}; id tidak dikenal {len(sal_unknown)} (Rp {sum(sal_unknown.values()) / 1e6:.1f} jt)")
else:
    print("   MOBO_SALMO tidak ditemukan: kategori SAL dilewati")
print(f"   hari terakhir dengan data: {last_day} Okt; id tidak dikenal: {len(unknown_ids)} (Rp {sum(unknown_ids.values()) / 1e6:.1f} jt)")
CUT_DAY = last_day


# ---- previous month (September closing): LMTD (days <= CUT_DAY) and Last FM (full month) per outlet, category and product
lm = defaultdict(lambda: defaultdict(lambda: [0.0, 0.0, 0.0, 0.0]))                                  # key -> cat -> [lq, lv, fq, fv]
lm_prod = defaultdict(lambda: {"lq": 0.0, "lv": 0.0, "fq": 0.0, "fv": 0.0, "lo": set(), "fo": set()})
lm_daily = {c: [0.0] * 32 for c in CATS}                                                              # region total per day, Rp (SPI: also pcs in lm_dailyq)
lm_dailyq = {c: [0.0] * 32 for c in CATS}
lm_unknown = defaultdict(float)
lm_meta = {"source": None, "month": f"{_PY}-{_PM:02d}", "cut_day": CUT_DAY, "days": 0, "unknown": {"ids": 0, "value": 0}, "totals": {}}
if LM_SRC and os.path.exists(LM_SRC):
    print("   Bulan lalu (Last FM / LMTD):", LM_SRC)
    lsheets = read_xlsb(LM_SRC)
    drop_copied_rows(lsheets)
    lm_ids = set()
    for sname, (code, label, has_val) in SHEETS.items():
        rows = find_sheet(lsheets, sname)
        if not rows or len(rows) < 2:
            print(f"   lewati {sname} bulan lalu (kosong)")
            continue
        hdr = {c: str(v).strip() for c, v in rows[0].items()}
        c_id = next(c for c, v in hdr.items() if v.lower() == "id_outlet")
        c_pn = next(c for c, v in hdr.items() if v.lower() == "productname")
        hits, amts = day_cols(hdr, "hits"), day_cols(hdr, "amt")
        for r in rows[1:]:
            oid = norm_id(r.get(c_id))
            if not oid:
                continue
            pname = r.get(c_pn)
            if code == "RLD":
                try:
                    pname = "Reload Rp {:,.0f}".format(float(pname)).replace(",", ".")
                except (TypeError, ValueError):
                    pname = str(pname)
            pname = str(pname).strip()
            key, brand, tier, cls = resolve(oid)
            lq = lv = fq = fv = 0.0
            for d in range(1, 32):
                qq = float(r.get(hits[d]) or 0) if d in hits else 0.0
                vv = float(r.get(amts[d]) or 0) if d in amts else 0.0
                if not qq and not vv:
                    continue
                lm_daily[code][d] += vv; lm_dailyq[code][d] += qq
                fq += qq; fv += vv
                if d <= CUT_DAY:
                    lq += qq; lv += vv
                lm_meta["days"] = max(lm_meta["days"], d)
            if not (fq or fv):
                continue
            if key is None:
                lm_unknown[oid] += fv
                continue
            if key in master and key not in outlets:
                outlets[key] = master[key]
            outlet_brand.setdefault(key, brand)
            e = lm[key][code]; e[0] += lq; e[1] += lv; e[2] += fq; e[3] += fv
            P = lm_prod[(code, pname)]; P["lq"] += lq; P["lv"] += lv; P["fq"] += fq; P["fv"] += fv
            if lv or lq: P["lo"].add(key)
            P["fo"].add(key)
    lm_meta["source"] = LM_SRC
    lm_meta["unknown"] = {"ids": len(lm_unknown), "value": int(sum(lm_unknown.values()))}
    for code in CATS:
        att_l = sum(c[1] for k in lm for cc, c in lm[k].items() if cc == code)
        att_f = sum(c[3] for k in lm for cc, c in lm[k].items() if cc == code)
        lm_meta["totals"][code] = {"lmtd": int(att_l), "fm": int(att_f), "region_fm": int(sum(lm_daily[code])), "region_lmtd": int(sum(lm_daily[code][1:CUT_DAY + 1])), "outlets": sum(1 for k in lm if code in lm[k])}
    print(f"   Bulan lalu: {len(lm):,} outlet, hari terakhir {lm_meta['days']}; id tidak dikenal {len(lm_unknown)} (Rp {sum(lm_unknown.values()) / 1e9:.2f} M)")
    print("   Last FM per kategori (Rp M, dari baris file / teratribusi ke outlet): " + ", ".join(f"{c} {lm_meta['totals'][c]['region_fm'] / 1e9:.2f}/{lm_meta['totals'][c]['fm'] / 1e9:.2f}" for c in CATS))
else:
    print(f"   MOBO {LM_TAG} tidak ditemukan: LMTD dan Last FM demand dilewati")

print("[3/4] Menyusun feed...")
products = []
for (code, pname) in set(prod) | set(lm_prod):
    P = prod.get((code, pname)) or {"mq": 0.0, "mv": 0.0, "mo": set()}; L = lm_prod.get((code, pname))
    pr = {"cat": code, "n": pname, "mq": int(P["mq"]), "mv": int(P["mv"]), "mo": len(P["mo"]), "price": round(P["mv"] / P["mq"]) if P["mq"] and P["mv"] else None}
    if L:
        pr.update({"lq": int(L["lq"]), "lv": int(L["lv"]), "fq": int(L["fq"]), "fv": int(L["fv"]), "lo": len(L["lo"]), "fo": len(L["fo"])})
    products.append(pr)
products.sort(key=lambda p: (-(p["mv"] or p["mq"]), -(p.get("fv") or 0), p["cat"], p["n"]))
for i, p in enumerate(products):
    p["i"] = i
pidx = {(p["cat"], p["n"]): p["i"] for p in products}

outlet_rows = []
for key in list(facts) + [k for k in lm if k not in facts]:
    cats = facts.get(key, {})
    dim = outlets[key]
    row = {k: dim[k] for k in ("k", "n", "tier", "mc", "kec", "site", "dse")}
    if dim["mc"] not in mc_info and dim.get("br"):
        row["br"] = dim["br"]
    row["b"] = outlet_brand.get(key, "")
    row["id"] = dim.get("id_im3") if row["b"] == "IM3" and dim.get("id_im3") else (dim.get("id_3id") if row["b"] == "3ID" and dim.get("id_3id") else key.split(":")[-1])
    row["bv"] = [int(brand_val[key]["IM3"]), int(brand_val[key]["3ID"])] if key in brand_val else [0, 0]
    row["c"] = {}
    for code, F in cats.items():
        md = sorted(F["md"].items())
        row["c"][code] = [int(F["mq"]), int(F["mv"]), md[-1][0] if md else None, len(md), [[d, int(c[1]), int(c[0])] for d, c in md]]
    if key in lm:
        row["l"] = {code: [int(e[0]), int(e[1]), int(e[2]), int(e[3])] for code, e in lm[key].items()}   # September: [LMTD hits, LMTD Rp, Last FM hits, Last FM Rp]
    if key in sal_brand:
        row["sb"] = [int(sal_brand[key][0]), int(sal_brand[key][1])]          # SALMO Rp per brand id [IM3, 3ID]
    row["p"] = {str(pidx[k]): [int(v[0]), int(v[1])] for k, v in op[key].items() if k in pidx and (v[0] or v[1])}
    outlet_rows.append(row)
outlet_rows.sort(key=lambda r: -sum(c[1] for k, c in r["c"].items() if k != "SAL"))

feed = {
    "metadata": {
        "generated_at": datetime.now().isoformat(timespec="seconds"), "source": src, "contract": "docs/assessments/daily_data_mobo_demand.md",
        "cut": date(MONTH[0], MONTH[1], CUT_DAY).isoformat(), "cut_day": CUT_DAY,
        "days": [date(MONTH[0], MONTH[1], d).isoformat() for d in range(1, CUT_DAY + 1)], "mtd_month_days": 31,
        "categories": {**CATS, "SAL": "Saldo Mobo (SALMO)"}, "salmo": sal_meta, "lm": {**lm_meta, "daily": {c: [int(x) for x in lm_daily[c][1:31]] for c in CATS}, "daily_hits": {c: [int(x) for x in lm_dailyq[c][1:31]] for c in CATS}}, "value_categories": [v[0] for v in SHEETS.values() if v[2]],
        "row_fields": {"bv": "[Rp IM3, Rp 3ID] nilai demand per brand id outlet (outlet master yang punya kedua id tidak lagi dikaitkan ke satu brand saja)"},
        "fact_columns": ["mq (hits)", "mv (Rp)", "last_day", "active_days", "md [[day, value, qty]]"],
        "lm_columns": "outlets[].l[cat] = [LMTD hits, LMTD Rp, Last FM hits, Last FM Rp] (September, LMTD = days 1..cut_day); products[] carry lq, lv, fq, fv, lo, fo",
        "notes": ["MTD saja: tidak ada sheet LMTD di file MOBO, jadi tidak ada growth vs bulan lalu.",
                  "SP Injection berisi unit dan (sejak file 14 Okt 18:12) rupiah; tidak dijumlahkan ke total demand. Reload/Voucher/CVM/Paket Data berisi rupiah.",
                  "MTD_RECARGE (judul kolom RECHARGE) berisi penjualan paket data, bukan isi ulang pulsa; dimuat sebagai kategori PKT Paket Data.",
                  "Brand disimpulkan dari id (tidak ada kolom brand).",
                  "SAL = Saldo Mobo yang ditransaksikan outlet ke pelanggan (DAILY_DATA_MOBO_SALMO, Rp per hari); hanya Oktober, tidak dijumlahkan ke total demand sampai hubungannya dengan Reload / Voucher / Paket Data dikonfirmasi (docs/assessments/daily_data_mobo_salmo.md)."],
        "master_counts": {"br": {k[1]: v for k, v in master_count.items() if k[0] == "br"}, "mc": {k[1]: v for k, v in master_count.items() if k[0] == "mc"}, "dse": {k[1]: v for k, v in master_count.items() if k[0] == "dse"}},
        "mc_info": mc_info,
        "unknown": {"ids": len(unknown_ids), "value": int(sum(unknown_ids.values()))},
    },
    "tiers": [{"cat": k[0], "cls": k[1], "rows": v["rows"], "ids": len(v["ids"]), "q": int(v["q"]), "v": int(v["v"])} for k, v in sorted(tiers.items())],
    "products": products, "outlets": outlet_rows,
}
os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(feed, f, ensure_ascii=False)
with open(OUT_JS, "w", encoding="utf-8") as f:
    f.write("// Auto-generated Demand (sell-out) feed dari DAILY_DATA_MOBO. Kontrak: docs/assessments/daily_data_mobo_demand.md\n")
    f.write("var DEMAND_FEED = ")
    json.dump(feed, f, ensure_ascii=False)
    f.write(";\nif (typeof window !== 'undefined') window.DEMAND_FEED = DEMAND_FEED;\n")

print("[4/4] Ringkasan")
print(f"SUCCESS: {OUT_JS} ({os.path.getsize(OUT_JS) / 1024:.0f} KB); {len(outlet_rows):,} outlet, {len(products)} produk, cut {feed['metadata']['cut']}")
for code, label in CATS.items():
    t = [x for x in feed["tiers"] if x["cat"] == code]
    print(f"   {code} {label:18s} hits {sum(x['q'] for x in t):>9,}  Rp {sum(x['v'] for x in t) / 1e6:9.1f} jt  | " + " ".join(f"{x['cls']}={x['v'] / 1e6:.1f}jt/{x['ids']}id" for x in t))
