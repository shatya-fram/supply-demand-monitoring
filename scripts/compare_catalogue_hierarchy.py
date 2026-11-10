#!/usr/bin/env python3
"""Summaries of three November sources (owner, 10 Nov 2026), written to data/catalogues/master_hierarchy_202611/:
  diff_catalogue_nov.csv          catalogue 5 Nov (CATALOGUE_OUTLET_NOVEMBER, DSE_CODE_NOV + MAPPING GROUP) vs hierarchy 3 Nov (CSO code): outlets whose DSE differs, or PJP / NON label vs CSO
  diff_outlet_wise.csv            sheet OUTLET_WISE of raw/GA*/rguga_favloc_&_rguga_outlet_*.xlsb (6 Nov, MAPPING GROUP) vs catalogue 5 Nov MAPPING GROUP: ids whose program group differs
  compare_report.json             the counts used by docs/assessments/master_hierarchy_3nov_assessment.md
Ids and DSE codes only (no names, no phone numbers).  Run: python3 scripts/compare_catalogue_hierarchy.py"""
import csv, glob, json, os, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsb_reader import read_sheets  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')


def nid(x):
    x = str(x if x is not None else '').strip()
    if x.endswith('.0'):
        x = x[:-2]
    return x.lstrip('0') if x.isdigit() else x


def ncode(x):
    x = str(x if x is not None else '').strip()
    return x[:-2] if x.endswith('.0') else x


def main():
    hd = sorted(glob.glob(os.path.join(CAT, 'master_hierarchy_[0-9]*')))[-1]
    H = {(r['brand'], r['outlet_id']): r for r in csv.DictReader(open(os.path.join(hd, 'outlet_hierarchy.csv'), encoding='utf-8')) if r['primary'] == '1'}
    S = read_sheets(os.path.join(ROOT, 'raw', 'Catalogue', 'CATALOGUE_OUTLET_NOVEMBER.xlsb'))
    rows = S['Sheet1']; h = rows[0]; col = {v: k for k, v in h.items()}
    cat = {}
    for r in rows[1:]:
        cat[(str(r[col['brand']]), nid(r[col['id']]))] = (ncode(r.get(col['DSE_CODE_NOV'], '')), str(r.get(col['MAPPING GROUP'])), str(r.get(col['FINAL CATEGORY OUTLET OCT'])))
    rep, out = Counter(), []
    for k in sorted(set(cat) | set(H)):
        c, hr = cat.get(k), H.get(k)
        if not c or not hr:
            rep['only_catalogue' if c else 'only_hierarchy'] += 1
            continue
        cd, grp, fin = c; hs = hr['cso_code']
        kind = ''
        if cd != hs:
            kind = 'DSE beda' if (cd and hs) else ('katalog kosong, hierarki ada' if hs else 'hierarki kosong, katalog ada')
        elif grp == 'NON' and hs:
            kind = 'label NON tetapi punya CSO'
        elif grp != 'NON' and not hs and grp == 'PJP':
            kind = 'label PJP tetapi tanpa CSO'
        rep['both'] += 1
        if kind:
            rep[kind] += 1; out.append([k[0], k[1], grp, fin, cd, hs, kind])
        else:
            rep['sama'] += 1
    # PJP / NON label vs CSO even where the code is the same
    for k, (cd, grp, fin) in cat.items():
        hr = H.get(k)
        if hr and cd == hr['cso_code']:
            if grp == 'NON' and cd:
                pass
    with open(os.path.join(hd, 'diff_catalogue_nov.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['brand', 'outlet_id', 'mapping_group_katalog', 'final_category_katalog', 'dse_code_katalog', 'cso_hierarki', 'jenis_beda']); w.writerows(out)
    # OUTLET_WISE (GA workbook, newest): columns PJP NON / FINAL OUTLET and one column per program (AVA 50,150, PROMOTOR, TEBUS MURAH KAM, TOP PLAYER, DTU DSE, DSF), dse_nov
    wb = sorted(glob.glob(os.path.join(ROOT, 'raw', 'GA*', 'rguga_favloc_*.xlsb')), key=os.path.getmtime)
    if wb:
        sh = read_sheets(wb[-1], lambda n: n == 'OUTLET_WISE')['OUTLET_WISE']
        hh = next(r for r in sh if r.get(0) == 'mth')
        ci = {}
        for k, v in sorted(hh.items()):
            ci.setdefault(str(v).strip(), k)
        idc, brc = ci['IO OUTLET'], ci['brand']
        prog_cols = {n: ci[n] for n in ('AVA 50, 150', 'PROMOTOR', 'TEBUS MURAH KAM', 'TOP PLAYER', 'DTU DSE', 'DSF') if n in ci}
        ow = {}
        for r in sh:
            if r.get(0) == 'mth' or not r.get(idc):
                continue
            flags = [n for n, c in prog_cols.items() if str(r.get(c, '')).strip() not in ('', '0', '0.0', 'None')]
            ow[(str(r.get(brc)), nid(r[idc]))] = (str(r.get(ci['PJP NON'])), flags, ncode(r.get(ci.get('dse_nov', ci['dse_code']), '')))
        rep['outlet_wise_file'] = os.path.basename(wb[-1]); rep['outlet_wise_rows'] = len(ow)
        rep['outlet_wise_pjp_non'] = dict(Counter(v[0] for v in ow.values()))
        rep['outlet_wise_program_flags'] = dict(Counter(f for v in ow.values() for f in v[1]))
        def cat_label(fin):
            f = fin.strip()
            return 'NON' if (f == 'NON' or f.endswith('- NON')) else ('PJP' if f else '')
        rep['catalogue_5nov_pjp_non'] = dict(Counter(cat_label(v[2]) for v in cat.values()))
        rep['catalogue_5nov_groups'] = dict(Counter(v[1] for v in cat.values()))
        diff = []
        for k in sorted(set(cat) | set(ow)):
            a, b = cat.get(k), ow.get(k)
            if a and b:
                la = cat_label(a[2])
                if la != b[0] and la in ('PJP', 'NON'):
                    diff.append([k[0], k[1], la, b[0], a[1], ','.join(b[1]), a[0], b[2]]); rep['ow_pjp_non_differs'] += 1
                else:
                    rep['ow_pjp_non_same'] += 1
                if a[0] != b[2]:
                    rep['ow_dse_code_differs_catalogue'] += 1
                hr = H.get(k)
                if hr and b[2] != hr['cso_code']:
                    rep['ow_dse_code_differs_hierarchy'] += 1
            else:
                diff.append([k[0], k[1], cat_label(a[2]) if a else '', b[0] if b else '', a[1] if a else '', ','.join(b[1]) if b else '', a[0] if a else '', b[2] if b else '']); rep['ow_only_catalogue' if a else 'ow_only_outlet_wise'] += 1
        with open(os.path.join(hd, 'diff_outlet_wise.csv'), 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f); w.writerow(['brand', 'outlet_id', 'pjp_non_katalog_5nov', 'pjp_non_outlet_wise', 'group_katalog_5nov', 'program_outlet_wise', 'dse_katalog', 'dse_outlet_wise']); w.writerows(diff)
    json.dump(rep, open(os.path.join(hd, 'compare_report.json'), 'w'), indent=2, ensure_ascii=False)
    print(json.dumps(rep, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
