#!/usr/bin/env python3
"""
build_gaplok_reference.py
Builds the GAPLOK report reference used by the Sell-In Monitoring summary:
  data/catalogues/gaplok_location_mapping.json / .csv
    one row per current master micro cluster (36) with the GAPLOK location chain
    Area (INNER JAKARTA WEST / EAST) -> Sales Area (9) -> Micro Cluster -> CSE
  data/catalogues/gaplok_product_groups.json
    GAPLOK product groups and denominations with the MOBI SKU names that map to them, and the UAR thresholds

Sources:
  website/data/territory_feed.json                    current master (36 MCs, 7 branches, DSO leaders)
  raw/SP VC Sellin, raw/MOBI TRansfer Balance         INITIATOR AREA per MC (majority) to assign WEST / EAST
  GAPLOK_IOH - INNER OCT 2026 - 20261012.xlsb         optional; the September CSE names for MCs that still exist
    (pass the path as argv[1]; read with pyxlsb if installed)

The GAPLOK workbook is on the September structure (24 MCs, 9 sales areas). The app uses the 7 master areas
as they are (owner decision 13 Oct 2026: KARAWANG is one area); the September sales area and CSE are kept
in the *_gaplok_sep columns for reference only.
"""
import os, sys, re, csv, json, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(ROOT, 'website', 'data', 'territory_feed.json')
OUT_DIR = os.path.join(ROOT, 'data', 'catalogues')

DEPOK = {'MC-BEJI', 'MC-CIMANGGIS', 'MC-CIPAYUNG', 'MC-SAWANGAN'}
SOUTH_KARAWANG = {'MC-KARAWANG', 'MC-TEGALWARU'}


def sales_area_of(branch, mc):
    # Owner decision 13 Oct 2026: use the 7 master areas as they are (KARAWANG stays one area,
    # SOUTH JAKARTA DEPOK stays one area). The GAPLOK September split is kept only in
    # the *_gaplok_sep columns for reference.
    return branch


def mobi_area_by_mc():
    """Majority INITIATOR AREA per micro cluster from the MOBI exports."""
    votes = collections.defaultdict(collections.Counter)
    pats = [os.path.join(ROOT, 'raw', 'SP VC Sellin', '*.csv'), os.path.join(ROOT, 'raw', 'SP VC Selli', '*.csv'), os.path.join(ROOT, 'raw', 'MOBI TRansfer Balance', '*.csv')]
    for pat in pats:
        for p in glob.glob(pat):
            hdr = None
            with open(p, encoding='utf-8', errors='replace') as f:
                for line in f:
                    if hdr is None:
                        if line.startswith('TRANSACTION DATETIME'):
                            hdr = line.rstrip('\r\n').split('|')
                            ci = {c: i for i, c in enumerate(hdr)}
                        continue
                    r = line.rstrip('\r\n').split('|')
                    if len(r) != len(hdr): continue
                    for mc_col, area_col in (('DEST PARTNER TERRITORY', 'DEST AREA'), ('INITIATOR MICRO CLUSTER', 'INITIATOR AREA')):
                        mc, area = r[ci[mc_col]].strip(), r[ci[area_col]].strip()
                        if mc.startswith('MC-') and area.startswith('INNER JAKARTA'):
                            votes[mc][area] += 1
    return {mc: c.most_common(1)[0][0] for mc, c in votes.items()}


def gaplok_cse(path):
    """CSE name per MC from the GAPLOK workbook (September structure), if available."""
    out = {}
    if not path or not os.path.exists(path):
        return out
    try:
        from pyxlsb import open_workbook
    except ImportError:
        print('pyxlsb not installed; skipping GAPLOK CSE names')
        return out
    norm = lambda v: re.sub(r'\s+', ' ', str(v)).strip() if v not in (None, '') else ''
    with open_workbook(path) as wb:
        for sheet in ('SCORE SUMMARY ALL', '3. SELL IN VOUCHER & INJECTION'):
            with wb.get_sheet(sheet) as sh:
                for r in sh.rows():
                    v = [c.v for c in r]
                    if len(v) > 3 and norm(v[2]).startswith('MC-') and norm(v[3]) and norm(v[2]) not in out:
                        out[norm(v[2])] = {'cse': norm(v[3]), 'sales_area': norm(v[1]), 'area': norm(v[0])}
    return out


PRODUCT_GROUPS = {
    'SP': {
        'label': 'SIM / Starter Pack',
        'uar_rule': 'outlet with >= 1 SP (GAPLOK "# OUTLET MIN 1 SP"); UAR 3 pcs = outlet with >= 3 SP',
        'denominations': [
            {'key': 'SP_ZERO', 'label': 'SP REG / Zero', 'skus': ['SP ZERO 0725 JABO SUK DAN CIANJUR', 'SP ZERO NICE JABO SUK DAN CIANJUR']},
            {'key': 'SP_3GB', 'label': 'SP 3 GB', 'skus': ['SP 3GB ORI 0725 JABO SUK DAN CIANJUR', 'SP ORI 3GB NICE JABO SUK DAN CIANJUR', 'SP ORI 3GB GOLD JABO SUK DAN CIANJUR']},
            {'key': 'SP_FWA', 'label': 'SP FWA / HiFi Air', 'skus': ['SP FWA Nasional', 'SP Zero FWA Nasional', 'SP HiFi Air 15GB selama 12 bln', 'SP HiFi Air 50GB', 'SP HiFi Air 75GB 30hr 5G']},
            {'key': 'SP_3ID_BUNDLE', 'label': 'SP 3ID bundle / kartu kosong', 'skus': ['BUNDLE PACK KPK REGULER REGION JABODETABEK', 'BUNDLE PACK KPK REGULER REGION JABODETABEK-Q100', 'BUNDLING PRODUCT SILVER KARTU PERDANA KOSONG JABODETABEK QTY 30']},
            {'key': 'SP_INJECTION', 'label': 'SP injection (digital)', 'skus': [], 'note': 'Not in the MOBI physical export; comes from MOBO transaction details (Step 5)'},
        ],
    },
    'VC': {
        'label': 'Vouchers',
        'uar_rule': 'outlet with >= 5 pcs of a denomination (GAPLOK "# OUTLET (MIN 5 PCS)"); UAR 10 pcs = outlet with >= 10 pcs in total; amount >= Rp 250K',
        'denominations': [
            {'key': 'VC_BLANK', 'label': 'Voucher blank 3in1 (VBLANK)', 'skus': ['V0 3in1 JABO_SUK_NewREG', 'VOUCHER PHYSICAL BLANK 3IN1 JABODETABEK']},
            {'key': 'VC_2_5GB_5D', 'label': 'VC 2.5 GB / 5D', 'skus': ['FI 2.5GB/5D NEW GEO JAKARTA RAYA']},
            {'key': 'VC_3_5GB_5D', 'label': 'VC 3.5 GB / 5D', 'skus': ['FI 3.5GB/5D NEW GEO JAKARTA RAYA']},
            {'key': 'VC_5GB_2D', 'label': 'VC 5 GB / 2D', 'skus': ['FI 5GB/2D NEW GEO JAKARTA RAYA']},
            {'key': 'VC_5GB_5D', 'label': 'VC 5 GB / 5D', 'skus': ['FI 5GB/5D NEW GEO JAKARTA RAYA', 'FI 5GB/5HR JABODETABEK+SUK_0823']},
            {'key': 'VC_5GB_7D', 'label': 'VC 5 GB / 7D', 'skus': ['FIS 5GB 7HR JAYA VORI']},
            {'key': 'VC_6GB_2D', 'label': 'VC 6 GB / 2D', 'skus': ['6G 6G 6G 2hr JAYA']},
            {'key': 'VC_6GB_5D', 'label': 'VC 6 GB / 5D', 'skus': ['FIS 6GB 5HR JAYA VORI']},
            {'key': 'VC_8GB_5D', 'label': 'VC 8 GB / 5D', 'skus': ['FIS 8GB 5HR JAYA VORI']},
            {'key': 'VC_9GB_2D', 'label': 'VC 9 GB / 2D', 'skus': ['FIS 9GB 2HR JAYA VORI']},
            {'key': 'VC_10GB_5D', 'label': 'VC 10 GB / 5D', 'skus': ['FIS 10GB 5HR JAYA VORI']},
            {'key': 'VC_13GB_7D', 'label': 'VC 13 GB / 7D', 'skus': ['FIS 13GB 7HR JAYA VORI']},
            {'key': 'VC_INJECTION', 'label': 'Voucher injection (digital)', 'skus': [], 'note': 'Not in the MOBI physical export; comes from MOBO transaction details (Step 5)'},
        ],
    },
    'SALDO': {
        'label': 'Saldo (MOBO balance)',
        'uar_rule': 'outlet with >= 1 saldo transfer; buckets < 50K, 50K-100K, >= 100K, >= 300K (GAPLOK OSA DSE productivity min 300K per outlet)',
        'denominations': [
            {'key': 'SALDO', 'label': 'Sellin Saldo MOBO', 'skus': ['E-Voucher']},
        ],
        'buckets': [['LT50K', '< 50K', 0, 50000], ['50_100K', '50K - 100K', 50000, 100000], ['100_300K', '100K - 300K', 100000, 300000], ['GE300K', '>= 300K', 300000, None]],
    },
}


def main():
    master = json.load(open(MASTER, encoding='utf-8'))['outlets']
    mcs = {}
    for o in master:
        mc = o['micro_cluster']
        if mc not in mcs:
            mcs[mc] = {'micro_cluster': mc, 'master_branch': o['branch'], 'hoa_leader': o.get('hoa_leader', ''), 'dso_leader': o.get('dso_leader', ''), 'outlets': 0}
        mcs[mc]['outlets'] += 1
    area_votes = mobi_area_by_mc()
    gap = gaplok_cse(sys.argv[1] if len(sys.argv) > 1 else '')
    rows = []
    for mc, m in sorted(mcs.items()):
        sa = sales_area_of(m['master_branch'], mc)
        g = gap.get(mc, {})
        area = area_votes.get(mc) or g.get('area') or ''
        rows.append({'micro_cluster': mc, 'gaplok_area': area, 'sales_area': sa, 'master_branch': m['master_branch'], 'hoa_leader': m['hoa_leader'],
                     'cse': m['dso_leader'], 'cse_gaplok_sep': g.get('cse', ''), 'sales_area_gaplok_sep': g.get('sales_area', ''), 'master_outlets': m['outlets']})
    # sales areas inherit the area of their MCs (majority)
    sa_area = collections.defaultdict(collections.Counter)
    for r in rows:
        if r['gaplok_area']: sa_area[r['sales_area']][r['gaplok_area']] += 1
    for r in rows:
        if not r['gaplok_area'] and sa_area[r['sales_area']]:
            r['gaplok_area'] = sa_area[r['sales_area']].most_common(1)[0][0]
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, 'gaplok_location_mapping.json'), 'w', encoding='utf-8') as f:
        json.dump(rows, f, indent=1, ensure_ascii=False)
    with open(os.path.join(OUT_DIR, 'gaplok_location_mapping.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    with open(os.path.join(OUT_DIR, 'gaplok_product_groups.json'), 'w', encoding='utf-8') as f:
        json.dump(PRODUCT_GROUPS, f, indent=1, ensure_ascii=False)
    print(f"{len(rows)} MCs -> {len({r['sales_area'] for r in rows})} sales areas -> {sorted({r['gaplok_area'] for r in rows})}")
    for sa in sorted({r['sales_area'] for r in rows}):
        sub = [r for r in rows if r['sales_area'] == sa]
        print(f"  {sa:22s} area={sub[0]['gaplok_area']:19s} MCs={[r['micro_cluster'][3:] for r in sub]}")
    print('GAPLOK Sep CSE names found for', sum(1 for r in rows if r['cse_gaplok_sep']), 'MCs')


if __name__ == '__main__':
    main()
