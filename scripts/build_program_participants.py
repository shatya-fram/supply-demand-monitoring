#!/usr/bin/env python3
"""Program participant lists of November from three files in raw/Catalogue (owner upload 11 Nov 2026):

  Participants AVA.xlsx     sheets 'AVA 50 3ID' + 'AVA 50 IM3.' -> program AVA; 'Top Player' -> program Top Player (peserta Nov);
                            'Tebus Murah' -> program Tebus Murah (flag PJP / KAM)
  Participants KotKab.xlsx  Sheet1 (one row per outlet, IM3 and 3ID id) -> program Kotkab
  Top Player Nov.xlsb       sheets AVA / DTU / BOOSTER are MSISDN lists (DTU and BOOSTER carry no outlet id, only MDI / area / MC):
                            counted in the assessment, NEVER imported (phone numbers); sheet AVA only gives outlet ids already in the AVA list.

Writes data/catalogues/catalogue_202611/program_participants.csv (program, brand, outlet_id, name, branch, mc, source) and REPLACES the
rows of AVA, Kotkab and Tebus Murah in data/catalogues/kro_program_outlets.csv, and adds 'Top Player (peserta Nov)'.
Wholesaler (katalog 202611) stays as it is (Top Player there = Wholesaler flag of the catalogue; the participants list has 5 outlets).
Called at the end of build_catalogue_nov_programs.py (so the November catalogue never overwrites it); also runnable alone:
python3 scripts/build_program_participants.py
"""
import csv, os, sys, zipfile
import xml.etree.ElementTree as ET
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_dsf_manpower as dx  # noqa: E402  (xlsx sheet reader, stdlib)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')
RAW = os.path.join(ROOT, 'raw', 'Catalogue')
REPLACED = {'AVA', 'Kotkab', 'Tebus Murah', 'Top Player (peserta Nov)'}


def nid(v):
    v = ('' if v is None else str(v)).strip()
    if v.endswith('.0'):
        v = v[:-2]
    return v.lstrip('0') if v.isdigit() else v


def rows(path, sheet):
    out = []
    for r in dx.read_sheet(path, sheet):
        out.append([r.get(i, '') for i in range(max(r) + 1)] if r else [])
    return out[1:]   # drop header


def g(r, i):
    return r[i].strip() if len(r) > i and r[i] else ''


def main():
    pa = os.path.join(RAW, 'Participants AVA.xlsx')
    pk = os.path.join(RAW, 'Participants KotKab.xlsx')
    out = []   # program, brand, id, name, branch, mc, source
    if os.path.exists(pa):
        for r in rows(pa, 'AVA 50 3ID'):
            if nid(g(r, 5)):
                out.append(['AVA', '3ID', nid(g(r, 5)), g(r, 6), g(r, 2), g(r, 3), 'AVA 50 3ID'])
        for r in rows(pa, 'AVA 50 IM3.'):
            if nid(g(r, 5)):
                out.append(['AVA', 'IM3', nid(g(r, 5)), g(r, 6), g(r, 2), g(r, 3), 'AVA 50 IM3'])
        for r in rows(pa, 'Top Player'):
            if nid(g(r, 5)):
                out.append(['Top Player (peserta Nov)', '3ID', nid(g(r, 5)), g(r, 6), g(r, 1), g(r, 2), 'Top Player'])
        for r in rows(pa, 'Tebus Murah'):
            for brand, ci, cn in (('3ID', 3, 4), ('IM3', 5, 6)):
                if nid(g(r, ci)):
                    out.append(['Tebus Murah', brand, nid(g(r, ci)), g(r, cn), g(r, 1), g(r, 2), 'Tebus Murah ' + g(r, 7)])
    else:
        print('  Participants AVA.xlsx not found: AVA / Top Player / Tebus Murah unchanged')
    if os.path.exists(pk):
        for r in rows(pk, 'Sheet1'):
            for brand, ci, cn in (('3ID', 7, 8), ('IM3', 9, 10)):
                if nid(g(r, ci)):
                    out.append(['Kotkab', brand, nid(g(r, ci)), g(r, cn), g(r, 2), g(r, 3), 'KotKab ' + g(r, 4)])
    else:
        print('  Participants KotKab.xlsx not found: Kotkab unchanged')
    seen, uniq = set(), []
    for x in out:
        k = (x[0], x[1], x[2])
        if k not in seen:
            seen.add(k); uniq.append(x)
    d = os.path.join(CAT, 'catalogue_202611'); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'program_participants.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['program', 'brand', 'outlet_id', 'outlet_name', 'branch', 'micro_cluster', 'source']); w.writerows(uniq)
    got = {x[0] for x in uniq}
    pc = os.path.join(CAT, 'kro_program_outlets.csv')
    keep = [x for x in csv.DictReader(open(pc, encoding='utf-8')) if x['program'] not in got]
    note = 'dari Participants AVA / KotKab (raw/Catalogue, 11 Nov 2026)'
    add, s2 = [], set()
    for x in uniq:
        if (x[0], x[2]) not in s2:
            s2.add((x[0], x[2])); add.append({'program': x[0], 'outlet_id': x[2], 'note': note})
    with open(pc, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['program', 'outlet_id', 'note']); w.writeheader(); w.writerows(keep + add)
    print('  Participants lists:', dict(Counter(x['program'] for x in add)), '| rows', dict(Counter(x[0] for x in uniq)))


if __name__ == '__main__':
    main()
