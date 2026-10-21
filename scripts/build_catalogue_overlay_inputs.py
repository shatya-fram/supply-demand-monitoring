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
    ../outlet_catalogue_ioh.csv + website/data/outlet_catalogue_feed.js   one row per row of sheet OUTLET IOH: Outlet ID IOH, IM3 id / name / type, 3ID id / name / type, status pairing, long, lat
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
    def rim(r):          # IM3 id: column 'IM3 Outlet IDs', else the _v2 column (filled when the first one is 0)
        return r.get(24) if ok(r.get(24)) else r.get(25)
    def r3(r):
        return r.get(35) if ok(r.get(35)) else r.get(36)
    pairs, types = {}, {}
    for r in orows[hi + 1:]:             # rows without a Master Outlet Key (appended in the newer file) carry the right-hand blocks only: they count too
        a, b = rim(r), r3(r)
        if ok(a) and ok(b) and cell(r.get(45)) == 'DUAL BRAND':
            pairs[(nid(a), nid(b))] = [nid(a), nid(b), ncode(r.get(27)), ncode(r.get(38)), cell(r.get(32)), cell(r.get(43)), cell(r.get(46)), cell(r.get(50))]
        for br_, idv, tc in (('IM3', a, 32), ('3ID', b, 43)):
            if ok(idv):
                for t in TOKENS.findall(cell(r.get(tc))):
                    types.setdefault((br_, nid(idv), t.upper()), 'OUTLET IOH 2 Okt')
    write(os.path.join(out_dir, 'pairing_catalogue.csv'), ['id_im3', 'id_3id', 'dse_code_im3', 'dse_code_3id', 'outlet_type_im3', 'outlet_type_3id', 'status', 'note'], sorted(pairs.values()))
    print(f'  OUTLET IOH right block: {len(pairs):,} IM3-3ID pairs')

    # ---- names (OUTLET IOH, then the previous GA / penjualan feeds) and IOH_Outlet flags + location
    names = {}
    for r in orows[hi + 1:]:
        for idv, nc_, b_ in ((rim(r), 26, 'IM3'), (r3(r), 37, '3ID')):
            if ok(idv) and cell(r.get(nc_)) not in ('', '0'):
                names.setdefault((b_, nid(idv)), cell(r.get(nc_)))
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
    loc, ioh_all = {}, {}
    irows = sheets['IOH_Outlet']
    for r in irows[1:]:
        if not r.get(1):
            continue
        brand, oid = cell(r.get(16)), nid(r.get(1))
        if cell(r.get(5)) and cell(r.get(4)):
            ioh_all[(brand, oid)] = (cell(r.get(5)), cell(r.get(4)))        # (lat, long)
        if (brand, oid) in fin_ids:
            loc[(brand, oid)] = [brand, oid, names.get((brand, oid), ''), cell(r.get(2)), cell(r.get(5)), cell(r.get(4)), cell(r.get(7)), cell(r.get(8)), cell(r.get(17)), cell(r.get(15))]
        for col, tag in ((19, 'DTU'), (20, 'AVA'), (22, 'WHOLESALER'), (23, 'PROMOTOR')):
            if cell(r.get(col)):
                src = types.get((brand, oid, tag))
                types[(brand, oid, tag)] = 'IOH_Outlet 19 Okt' + ('; OUTLET IOH 2 Okt' if src else '')
    write(os.path.join(out_dir, 'outlet_locations.csv'), ['brand', 'outlet_id', 'name', 'site_nm', 'lat', 'long', 'kecamatan', 'kabkot', 'ioh_status', 'ioh_dse_code'],
          [loc.get(k) or [k[0], k[1], names.get(k, ''), '', '', '', '', '', '', ''] for k in sorted(fin_ids)])
    # ---- outlet catalogue following the sheet OUTLET IOH row by row (owner, 21 Oct 2026): Outlet ID IOH, IM3 id / name / type, 3ID id / name / type, status pairing, long / lat
    def tp(v):
        v = cell(v)
        return '' if v in ('', '0') else v
    cat_rows, feed_rows = [], []
    for r in orows[hi + 1:]:
        a, b = nid(rim(r)) if ok(rim(r)) else '', nid(r3(r)) if ok(r3(r)) else ''
        if not (a or b):
            continue
        key = cell(r.get(0))
        la = ioh_all.get(('IM3', a)) if a else None
        lb = ioh_all.get(('3ID', b)) if b else None
        ll, src = (la, 'IM3') if la else ((lb, '3ID') if lb else (('', ''), ''))
        status = cell(r.get(1)) if key else cell(r.get(45))
        row = [key, a, tp(r.get(26)), tp(r.get(32)), b, tp(r.get(37)), tp(r.get(43)), status, ll[1], ll[0], src,
               cell(r.get(45)), cell(r.get(46)), cell(r.get(50)) if cell(r.get(50)) != '0' else '', tp(r.get(27)), tp(r.get(38)),
               tp(r.get(30)) or tp(r.get(41)), tp(r.get(28)) or tp(r.get(39)), tp(r.get(29)) or tp(r.get(40))]
        cat_rows.append(row)
    cat_hdr = ['outlet_id_ioh', 'outlet_id_im3', 'outlet_name_im3', 'outlet_type_im3', 'outlet_id_3id', 'outlet_name_3id', 'outlet_type_3id', 'status_pairing', 'long', 'lat', 'lokasi_dari',
               'flag_pairing_baru', 'cek_dse', 'catatan', 'dse_code_im3', 'dse_code_3id', 'micro_cluster', 'kecamatan', 'pt']
    write(os.path.join(CAT, 'outlet_catalogue_ioh.csv'), cat_hdr, cat_rows)
    with open(os.path.join(ROOT, 'website', 'data', 'outlet_catalogue_feed.js'), 'w', encoding='utf-8') as f:
        f.write('/* Outlet catalogue following the sheet OUTLET IOH of %s (scripts/build_catalogue_overlay_inputs.py) */\nwindow.OUTLET_CATALOGUE = ' % os.path.basename(path))
        json.dump({'source': os.path.basename(path), 'sheet': 'OUTLET IOH', 'columns': cat_hdr, 'rows': cat_rows}, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f'  outlet catalogue: {len(cat_rows):,} rows ({sum(1 for x in cat_rows if x[0])} with Outlet ID IOH), {sum(1 for x in cat_rows if x[8])} with long / lat')
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
