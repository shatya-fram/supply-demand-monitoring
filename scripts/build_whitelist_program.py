#!/usr/bin/env python3
"""Whitelist outlet per program (owner upload 11 Nov 2026): raw/Catalogue/Whitelist_Outlet_Program_v*.xlsb (newest by name).

Sheets AVA 50,150 / PROMOTOR / TEBUS MURAH / TOP PLAYER / DTU / DSF hold BRAND, BRANCH, PARTNER_TERRITORY, ID_OUTLET, OUTLET_NAME, PROGRAM
(AVA also TARGET 50 / 150 pcs per outlet). Only the 7 Inner Jakarta branches are kept (the AVA sheet covers all of Java; branch spelling is
normalised: 'Kab Bekasi' -> KAB BEKASI, BEKASI -> KOTA BEKASI). ALL OUTLET / SUMMARY are used only to check counts.
Writes data/catalogues/catalogue_202611/whitelist_program_v1.csv and REPLACES in data/catalogues/kro_program_outlets.csv the programs
AVA, Promotor, Tebus Murah, Top Player (peserta Nov); keeps DTU as the 331 catalogue-type outlets (the DTUIN### logins are only written to the whitelist csv; owner 11 Nov 2026); DSF stays (the whitelist DSF ids are a subset of the DSF list). TOP PLAYER in the app = these 23 participants only (owner, 11 Nov 2026); the Wholesaler (katalog 202611) list stays as data, no longer a toggle source.
Top Player allocation per partner (picture of 11 Nov 2026, 79,500 pcs) is data/catalogues/catalogue_202611/top_player_allocation_nov.csv.
Phone numbers are not in this workbook; none are read. Called by build_catalogue_nov_programs.py after build_program_participants.py.
"""
import csv, glob, os, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsb_reader import read_sheets, cell  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')
IJ = {'CENTRAL NORTH JAKARTA', 'EAST JAKARTA', 'KAB BEKASI', 'KARAWANG', 'KOTA BEKASI', 'SOUTH JAKARTA DEPOK', 'WEST JAKARTA'}
SHEETS = {'AVA 50,150': 'AVA', 'PROMOTOR': 'Promotor', 'TEBUS MURAH': 'Tebus Murah', 'TOP PLAYER': 'Top Player (peserta Nov)', 'DTU': 'DTU', 'DSF': 'DSF'}
REPLACED = {'AVA', 'Promotor', 'Tebus Murah', 'Top Player (peserta Nov)'}
DTU_NOTE = 'DTU DSE whitelist (login DTUIN###)'


def nid(v):
    v = cell(v)
    return v.lstrip('0') if v.isdigit() else v


def branch(v):
    v = cell(v).upper()
    return 'KOTA BEKASI' if v == 'BEKASI' else v


def main():
    files = sorted(glob.glob(os.path.join(ROOT, 'raw', 'Catalogue', 'Whitelist_Outlet_Program_v*.xlsb')))
    if not files:
        print('  no Whitelist_Outlet_Program_v*.xlsb in raw/Catalogue: whitelist not applied'); return
    sh = read_sheets(files[-1], set(SHEETS))
    out = []
    for sname, prog in SHEETS.items():
        rows = sh.get(sname) or next((v for k, v in sh.items() if k.strip().upper() == sname), None)
        if not rows:
            continue
        h = next(i for i, r in enumerate(rows) if cell(r.get(0)) == 'BRAND')
        for r in rows[h + 1:]:
            i = nid(r.get(3))
            b = branch(r.get(1))
            if not i or b not in IJ:
                continue
            tier = cell(r.get(6)) if sname == 'AVA 50,150' and cell(r.get(6)) in ('50', '100', '150') else ''
            out.append([prog, cell(r.get(0)), i, cell(r.get(4)), b, cell(r.get(2)), tier])
    seen, uniq = set(), []
    for x in out:
        if (x[0], x[1], x[2]) not in seen:
            seen.add((x[0], x[1], x[2])); uniq.append(x)
    d = os.path.join(CAT, 'catalogue_202611'); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'whitelist_program_v1.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['program', 'brand', 'outlet_id', 'outlet_name', 'branch', 'partner_territory', 'ava_tier_pcs']); w.writerows(uniq)
    pc = os.path.join(CAT, 'kro_program_outlets.csv')
    keep = [x for x in csv.DictReader(open(pc, encoding='utf-8')) if x['program'] not in REPLACED and not (x['program'] == 'DTU' and x['note'] == DTU_NOTE)]
    note = 'dari %s (whitelist program, 11 Nov 2026)' % os.path.basename(files[-1])
    add, s2 = [], set()
    for x in uniq:
        if x[0] in ('DSF', 'DTU') or (x[0], x[2]) in s2:   # DSF already listed; DTU logins stay out of the program (owner, 11 Nov 2026: DTU = the 331 outlets of the catalogue type)
            continue
        s2.add((x[0], x[2])); add.append({'program': x[0], 'outlet_id': x[2], 'note': DTU_NOTE if x[0] == 'DTU' else note})
    with open(pc, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['program', 'outlet_id', 'note']); w.writeheader(); w.writerows(keep + add)
    print('  Whitelist program v1:', dict(Counter(x['program'] for x in add)), '| rows', dict(Counter(x[0] for x in uniq)))


if __name__ == '__main__':
    main()
