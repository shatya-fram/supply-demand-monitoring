#!/usr/bin/env python3
"""Program categories per November from raw/Catalogue/CATALOGUE_OUTLET_NOVEMBER*.xlsb (newest by name).

Sheet1 = one row per (brand, id) with FINAL CATEGORY OUTLET OCT and MAPPING GROUP (PJP, NON, AVA, KRO, PROMOTOR, KAM, WS); Sheet2 = dictionary.
Writes data/catalogues/catalogue_202611/program_nov.csv (every row of the file) and replaces the program rows of
data/catalogues/kro_program_outlets.csv that the November file defines (AVA, Promotor, Wholesaler, KAM, AVA TM, DSF, KRO program Nov);
DTU, Tebus Murah, DSF, DSE and the catalogue KRO type keep the October lists. PJP / NON are the base, not programs.
A Hybrid is one entity: the id of either brand resolves to the same outlet, so a program is the union of its two ids.
Called by build_catalogue_overlay_inputs.py after it writes the October lists; also runnable alone:  python3 scripts/build_catalogue_nov_programs.py
"""
import csv, glob, os, re, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsb_reader import read_sheets, cell  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')
NEW = {'AVA': 'AVA', 'PROMOTOR': 'Promotor', 'WS': 'Wholesaler (katalog 202611)', 'KAM': 'KAM', 'KRO': 'KRO (program Nov)'}
REPLACED = set(NEW.values()) | {'Wholesaler (katalog 202610)', 'AVA TM', 'DSF'}


def nid(v):
    v = cell(v)
    return v.lstrip('0') if v.isdigit() else v


def main():
    files = sorted(glob.glob(os.path.join(ROOT, 'raw', 'Catalogue', 'CATALOGUE_OUTLET_*.xlsb')))
    if not files:
        print('  no CATALOGUE_OUTLET_*.xlsb in raw/Catalogue: November programs not built'); return
    path = files[-1]
    rows = read_sheets(path, {'SHEET1'})
    rows = next(iter(rows.values()))
    hdr = {k: cell(v) for k, v in rows[0].items()}
    col = {v: k for k, v in hdr.items()}
    need = ['brand', 'id', 'category', 'DSE_CODE_NOV', 'FINAL CATEGORY OUTLET OCT', 'MAPPING GROUP']
    miss = [n for n in need if n not in col]
    if miss:
        sys.exit('CATALOGUE_OUTLET sheet1 lacks columns: %s' % miss)
    out, prog = [], {}
    for r in rows[1:]:
        g = lambda n: cell(r.get(col[n]))
        b, i = g('brand'), nid(r.get(col['id']))
        if not i:
            continue
        out.append([b, i, g('category'), g('FINAL CATEGORY OUTLET OCT'), g('MAPPING GROUP'), g('DSE_CODE_NOV'), cell(r.get(col.get('micro_cluster'))), cell(r.get(col.get('sales_area')))])
        grp, fin = g('MAPPING GROUP'), g('FINAL CATEGORY OUTLET OCT')
        name = NEW.get(grp)
        if name:
            prog.setdefault(name, set()).add(i)
        if g('category').upper() == 'DSF':   # DSF = system outlet category (owner, 5 Nov 2026), its own program like AVA / PROMOTOR / KAM
            prog.setdefault('DSF', set()).add(i)
        if fin.startswith('AVA TM'):
            prog.setdefault('AVA TM', set()).add(i)
    d = os.path.join(CAT, 'catalogue_202611'); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'program_nov.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['brand', 'outlet_id', 'category', 'final_category', 'mapping_group', 'dse_code_nov', 'micro_cluster', 'sales_area']); w.writerows(out)
    pc = os.path.join(CAT, 'kro_program_outlets.csv')
    keep = [x for x in csv.DictReader(open(pc, encoding='utf-8')) if x['program'] not in REPLACED]
    note = 'dari %s (MAPPING GROUP / FINAL CATEGORY)' % os.path.basename(path)
    add = [{'program': p, 'outlet_id': i, 'note': note} for p, v in sorted(prog.items()) for i in sorted(v)]
    with open(pc, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['program', 'outlet_id', 'note']); w.writeheader(); w.writerows(keep + add)
    print('  November programs (%s): %s' % (os.path.basename(path), {p: len(v) for p, v in sorted(prog.items())}),
          '| groups', dict(Counter(x[4] for x in out)))


if __name__ == '__main__':
    main()
