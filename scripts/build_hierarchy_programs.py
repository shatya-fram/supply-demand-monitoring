#!/usr/bin/env python3
"""Program flags from the Outlet_category of the Master Hierarchy (owner, 24 Nov 2026; docs/assessments/master_hierarchy_18nov_assessment.md).

Reads data/catalogues/master_hierarchy_202611/outlet_hierarchy.csv (primary rows) and adds rows to data/catalogues/kro_program_outlets.csv (program, outlet_id, note):
  category 'Outlet KRO'  -> program 'KRO (program Nov)'               (union with the November catalogue list)
  category 'DSF'         -> program 'DSF'                               (union with the DSF list: November catalogue, manpower sheet, whitelist)
  category 'Wholesaler'  -> program 'Wholesaler (hierarki 18 Nov)'     (its own source: TOP PLAYER of mb_program stays the 24 participants of the allocation picture, owner 11 Nov 2026)
Rows written by an earlier run (note starts with 'hierarki') are replaced, so the script can be re-run; ids already in the program are not duplicated. Run after build_master_hierarchy.py and
after build_catalogue_nov_programs.py (which rewrites the program lists and calls this script at its end).
"""
import csv, os, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')
MAP = {'Outlet KRO': 'KRO (program Nov)', 'DSF': 'DSF', 'Wholesaler': 'Wholesaler (hierarki 18 Nov)'}


def main():
    hp = os.path.join(CAT, 'master_hierarchy_202611', 'outlet_hierarchy.csv')
    pc = os.path.join(CAT, 'kro_program_outlets.csv')
    if not os.path.exists(hp) or not os.path.exists(pc):
        print('  hierarchy programs: inputs missing, skipped'); return
    with open(pc, encoding='utf-8') as f:
        keep = [r for r in csv.DictReader(f) if not (r.get('note') or '').startswith('hierarki')]
    have = {(r['program'], r['outlet_id']) for r in keep}
    add, cnt = [], Counter()
    for r in csv.DictReader(open(hp, encoding='utf-8')):
        prog = MAP.get(r['category'].strip())
        if not prog or r['primary'] != '1':
            continue
        k = (prog, r['outlet_id'].strip())
        if k in have:
            continue
        have.add(k); cnt[prog] += 1
        add.append({'program': prog, 'outlet_id': k[1], 'note': 'hierarki Master_Hierarchy 18 Nov 2026, Outlet_category %s (%s)' % (r['category'].strip(), r['brand'])})
    with open(pc, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['program', 'outlet_id', 'note']); w.writeheader(); w.writerows(keep + sorted(add, key=lambda x: (x['program'], x['outlet_id'])))
    print('  hierarchy programs: added %s to kro_program_outlets.csv' % dict(cnt))


if __name__ == '__main__':
    main()
