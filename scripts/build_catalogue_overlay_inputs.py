#!/usr/bin/env python3
"""
Read the governed catalogue workbook raw/Catalogue/CATALAGUE_INNER_JAKARTA_<YYYYMM>.xlsb and write the plain CSV inputs that
scripts/apply_final_dse_mapping.py and the visits builder use.  No pandas; raw/ is not needed after this step.

Contract: docs/assessments/catalogue_202610_detail.md (owner decisions of 21 Oct 2026).

Output  data/catalogues/catalogue_<YYYYMM>/
    final_dse_mapping.csv   brand, outlet_id, dse_code, dse_name, mc, branch, org_status      (sheet FINAL_<date>: DSE per outlet in MOB; the DSE source)
    dse_logins.csv          dse_name, branch, mc, login_im3, login_3id, agency, partner_territory   (sheet DSE; names and logins only,
                            HoA / DSO / branch / MC stay those of docs/MASTER DSE Hirarki.xlsx)
    pairing_catalogue.csv   id_im3, id_3id, dse_code_im3, dse_code_3id, outlet_type_im3, outlet_type_3id, status, note   (OUTLET IOH right block, DUAL BRAND rows with both ids)
    outlet_types.csv        brand, outlet_id, type, source      (KRO / Wholesaler / Promotor / DTU / AVA)
    outlet_locations.csv    brand, outlet_id, name, site_nm, lat, long, kecamatan, kabkot, ioh_status, ioh_dse_code   (outlets of FINAL: location from IOH_Outlet 19 Okt,
                            name from OUTLET IOH, else from the previous feeds; used to add the FINAL-only outlets to the master)
        data/catalogues/kro_program_outlets.csv   program, outlet_id, note   (read by build_kro_feed.py, mode Program)
        data/catalogues/catalogue_<YYYYMM>/meta.json
"""
import csv
import glob
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsb_reader import read_sheets, cell  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'raw', 'Catalogue')
CAT = os.path.join(ROOT, 'data', 'catalogues')

TOKENS = re.compile(r'DTU|AVA|Kotkab|Promotor|Wholesaler|WS|KRO', re.I)
PROGRAM = {'KRO': 'KRO (katalog {ym})', 'WS': 'Wholesaler (katalog {ym})', 'WHOLESALER': 'Wholesaler (katalog {ym})',
           'PROMOTOR': 'Promotor', 'DTU': 'DTU', 'AVA': 'AVA'}   # 'Kotkab' is not a program: its meaning is unconfirmed


def nid(v):
    v = cell(v)
    return v.lstrip('0') if v.isdigit() else v


def ncode(v):
    v = cell(v)
    return v[:-2] if v.endswith('.0') else v


def ok(v):
    return cell(v) not in ('', '0')


def find_workbook():
    c = sorted(glob.glob(os.path.join(RAW, 'CATALAGUE_INNER_JAKARTA_*.xlsb')) + glob.glob(os.path.join(RAW, 'CATALOGUE_INNER_JAKARTA_*.xlsb')))
    if not c:
        sys.exit('no raw/Catalogue/CATALAGUE_INNER_JAKARTA_*.xlsb found')
    return c[-1]


def write(path, header, rows):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def main():
    path = find_workbook()
    ym = re.search(r'(\d{6})', os.path.basename(path)).group(1)
    out_dir = os.path.join(CAT, 'catalogue_' + ym)
    print('Reading', os.path.relpath(path, ROOT))
    sheets = read_sheets(path, lambda n: n.strip().upper() in ('DSE', 'OUTLET IOH', 'IOH_OUTLET') or re.match(r'^FINAL_\d{8}$', n.strip(), re.I))
    final_name = next(n for n in sheets if n.upper().startswith('FINAL_'))
    final_date = final_name.split('_', 1)[1]

    # ---- DSE sheet -> dse_logins.csv + code -> name
    code_name = {}
    dse_rows = []
    for r in sheets['DSE'][1:]:
        if not r.get(7):
            continue
        nm, im3, t3 = cell(r.get(10)), ncode(r.get(7)), ncode(r.get(8))
        dse_rows.append([nm, cell(r.get(0)), cell(r.get(1)), im3, t3, cell(r.get(9)), cell(r.get(2))])
        for c in (im3, t3):
            if c:
                code_name[c.upper()] = nm
    write(os.path.join(out_dir, 'dse_logins.csv'), ['dse_name', 'branch', 'mc', 'login_im3', 'login_3id', 'agency', 'partner_territory'], dse_rows)

    # ---- FINAL -> final_dse_mapping.csv
    frows = sheets[final_name]
    hi = next(i for i, r in enumerate(frows) if cell(r.get(0)).lower() == 'brand')
    fin = []
    unknown = Counter()
    for r in frows[hi + 1:]:
        b = cell(r.get(0))
        if b not in ('IM3', '3ID') or not cell(r.get(1)):
            continue
        code = ncode(r.get(9)) or ncode(r.get(8))
        nm = code_name.get(code.upper(), '')
        if not nm:
            unknown[code] += 1
        fin.append([b, nid(r.get(1)), code, nm, cell(r.get(11)), cell(r.get(7)), cell(r.get(3))])
    write(os.path.join(out_dir, 'final_dse_mapping.csv'), ['brand', 'outlet_id', 'dse_code', 'dse_name', 'mc', 'branch', 'org_status'], fin)
    print(f'  FINAL {final_date}: {len(fin):,} brand-outlet rows, {len(unknown)} DSE codes without a name in sheet DSE ({sum(unknown.values())} rows)')

    # ---- OUTLET IOH (pairing: right-hand blocks, newer analysis) and outlet types
    orows = sheets['OUTLET IOH']
    hi = next(i for i, r in enumerate(orows) if cell(r.get(0)) == 'Master Outlet Key')
    pairs, types = {}, {}
    for r in orows[hi + 1:]:
        if not cell(r.get(0)):
            continue
        a, b = r.get(24), r.get(35)
        if ok(a) and ok(b) and cell(r.get(45)) == 'DUAL BRAND':
            pairs[(nid(a), nid(b))] = [nid(a), nid(b), ncode(r.get(27)), ncode(r.get(38)), cell(r.get(32)), cell(r.get(43)), cell(r.get(46)), cell(r.get(50))]
        for idc, tc in ((24, 32), (35, 43)):
            if ok(r.get(idc)):
                for t in TOKENS.findall(cell(r.get(tc))):
                    types.setdefault(('IM3' if idc == 24 else '3ID', nid(r.get(idc)), t.upper()), 'OUTLET IOH 2 Okt')
    write(os.path.join(out_dir, 'pairing_catalogue.csv'), ['id_im3', 'id_3id', 'dse_code_im3', 'dse_code_3id', 'outlet_type_im3', 'outlet_type_3id', 'status', 'note'], sorted(pairs.values()))
    print(f'  OUTLET IOH right block: {len(pairs):,} IM3-3ID pairs')

    # ---- names (OUTLET IOH, then the previous GA / penjualan feeds) and IOH_Outlet flags + location
    names = {}
    for r in orows[hi + 1:]:
        for idc, nc_, b_ in ((24, 26, 'IM3'), (35, 37, '3ID')):
            if ok(r.get(idc)) and cell(r.get(nc_)) not in ('', '0'):
                names.setdefault((b_, nid(r.get(idc))), cell(r.get(nc_)))
    for fn, bk, ik in (('ga_feed.json', 'b', 'i'), ('penjualan_feed.json', 'b', 'id')):
        pth = os.path.join(ROOT, 'data', 'processed', fn)
        if os.path.exists(pth):
            try:
                for o in json.load(open(pth, encoding='utf-8')).get('outlets', []):
                    if o.get('n') and str(o.get('n')) not in ('0', '0.0'):
                        names.setdefault((o.get(bk), nid(o.get(ik))), str(o['n']).strip())
            except ValueError:
                pass
    fin_ids = {(r[0], r[1]) for r in fin}
    loc = {}
    irows = sheets['IOH_Outlet']
    for r in irows[1:]:
        if not r.get(1):
            continue
        brand, oid = cell(r.get(16)), nid(r.get(1))
        if (brand, oid) in fin_ids:
            loc[(brand, oid)] = [brand, oid, names.get((brand, oid), ''), cell(r.get(2)), cell(r.get(5)), cell(r.get(4)), cell(r.get(7)), cell(r.get(8)), cell(r.get(17)), cell(r.get(15))]
        for col, tag in ((19, 'DTU'), (20, 'AVA'), (22, 'WHOLESALER'), (23, 'PROMOTOR')):
            if cell(r.get(col)):
                src = types.get((brand, oid, tag))
                types[(brand, oid, tag)] = 'IOH_Outlet 19 Okt' + ('; OUTLET IOH 2 Okt' if src else '')
    write(os.path.join(out_dir, 'outlet_locations.csv'), ['brand', 'outlet_id', 'name', 'site_nm', 'lat', 'long', 'kecamatan', 'kabkot', 'ioh_status', 'ioh_dse_code'],
          [loc.get(k) or [k[0], k[1], names.get(k, ''), '', '', '', '', '', '', ''] for k in sorted(fin_ids)])
    trows = sorted((b, i, t, s) for (b, i, t), s in types.items())
    write(os.path.join(out_dir, 'outlet_types.csv'), ['brand', 'outlet_id', 'type', 'source'], trows)

    # ---- program membership for Outlet & KRO Management (mode Program)
    prog = defaultdict(set)
    for b, i, t, s in trows:
        p = PROGRAM.get(t)
        if p:
            prog[p.format(ym=ym)].add((i, s))
    prows = sorted((p, i, 'tipe outlet dari %s: %s' % (os.path.basename(path), s)) for p, v in prog.items() for i, s in v)
    write(os.path.join(CAT, 'kro_program_outlets.csv'), ['program', 'outlet_id', 'note'], prows)
    print('  programs:', {p: len(v) for p, v in sorted(prog.items())})

    with open(os.path.join(out_dir, 'meta.json'), 'w') as f:
        json.dump({'workbook': os.path.basename(path), 'final_sheet': final_name, 'final_date': final_date, 'month': ym,
                   'generated_at': datetime.now().isoformat(timespec='seconds'), 'final_rows': len(fin), 'dse_rows': len(dse_rows),
                   'pairs_right_block': len(pairs)}, f, indent=2)
    print('Wrote', os.path.relpath(out_dir, ROOT))


if __name__ == '__main__':
    main()
