#!/usr/bin/env python3
"""
build_dse_catalogue.py  ·  DSE catalogue (owner, 23 Oct 2026)

The 272 DSE of the MASTER file (data/catalogues/dse_master_hierarchy.csv, from docs/MASTER DSE Hirarki.xlsx) are the DSE catalogue: every one is tagged
role DSE, status AKTIF, and carries the login ids in the master file's format (login IM3, login 3ID). Every other operator seen in the PJP visit feed
(promotor logins PRJAYAIN##, logins not in the master, test logins) is categorised PROMOTOR TOKO. Reports show the NAME with the login ids below it.

Inputs   data/catalogues/dse_master_hierarchy.csv, data/catalogues/territory_management_master.csv (HoA, outlets per DSE), website/data/dse_visits_feed.js (person ids, operators outside the master)
Outputs  data/catalogues/dse_catalogue.csv   the 272 DSE (no phone numbers, e-mail or NIK)
         data/catalogues/promotor_toko.csv   operators outside the master
         website/data/dse_catalogue_feed.js  window.DSE_CAT
Run after generate_dse_visits_feed.py:  python3 scripts/build_dse_catalogue.py
"""
import csv, json, os
from collections import Counter, defaultdict
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')
WEB = os.path.join(ROOT, 'website', 'data')
up = lambda s: str(s or '').strip().upper()


def load_visits():
    s = open(os.path.join(WEB, 'dse_visits_feed.js'), encoding='utf-8').read()
    return json.loads(s[s.index('{'):s.rindex('}') + 1])


def main():
    master = list(csv.DictReader(open(os.path.join(CAT, 'dse_master_hierarchy.csv'), encoding='utf-8')))
    terr = list(csv.DictReader(open(os.path.join(CAT, 'territory_management_master.csv'), encoding='utf-8')))
    V = load_visits()
    hoa_of_mc = {r['micro_cluster']: r['hoa_leader'] for r in terr if r['hoa_leader']}
    outlets = Counter((up(r['dse_name']), r['micro_cluster']) for r in terr if r['dse_name'] and up(r['dse_name']) not in ('UNASSIGNED', '0', '0.0'))
    pid_of = {(up(d['dse_name']), d['micro_cluster']): d['person_id'] for d in V['dses'] if d['in_master']}
    name_count = Counter(up(r['nama_dse']) for r in master)
    dse = []
    for r in master:
        key = (up(r['nama_dse']), r['micro_cluster'])
        dse.append({'pid': pid_of.get(key, ''), 'n': r['nama_dse'].strip(), 'im3': r['dse_id_im3'].strip(), 'id3': r['dse_id_3id'].strip(), 'br': r['branch'], 'mc': r['micro_cluster'],
                    'dso': r['nama_dso'], 'hoa': hoa_of_mc.get(r['micro_cluster'], r['nama_hoa']), 'outlets': outlets.get(key, 0), 'role': 'DSE', 'status': 'AKTIF', 'dup': name_count[up(r['nama_dse'])] > 1})
    dse.sort(key=lambda x: (x['br'], x['mc'], x['n']))
    pt = []
    for d in V['dses']:
        if d['in_master']:
            continue
        types = d.get('operator_types') or [d.get('operator_type')]
        pt.append({'pid': d['person_id'], 'n': d['dse_name'], 'logins': d['logins'], 'type': '/'.join(t for t in types if t), 'br': d['branch'], 'mc': d['micro_cluster'],
                   'planned': d['planned_visits'], 'actual': d['actual_visits'], 'kind': 'Promotor PRJAYAIN' if d['is_promotor'] else 'Login di luar master', 'role': 'PROMOTOR TOKO'})
    pt.sort(key=lambda x: (x['kind'], x['n']))
    with open(os.path.join(CAT, 'dse_catalogue.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['dse_name', 'role', 'status', 'login_im3', 'login_3id', 'branch', 'micro_cluster', 'dso', 'hoa', 'outlets', 'person_id'])
        for x in dse:
            w.writerow([x['n'], x['role'], x['status'], x['im3'], x['id3'], x['br'], x['mc'], x['dso'], x['hoa'], x['outlets'], x['pid']])
    with open(os.path.join(CAT, 'promotor_toko.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['name_or_login', 'role', 'kind', 'logins', 'operator_type', 'branch', 'micro_cluster', 'planned_stops', 'executed_stops', 'person_id'])
        for x in pt:
            w.writerow([x['n'], x['role'], x['kind'], ' '.join(x['logins']), x['type'], x['br'], x['mc'], x['planned'], x['actual'], x['pid']])
    feed = {'metadata': {'generated_at': datetime.now().isoformat(timespec='seconds'), 'source': 'data/catalogues/dse_master_hierarchy.csv (MASTER DSE Hirarki)', 'dse': len(dse), 'promotor_toko': len(pt),
                         'promotor_toko_kinds': dict(Counter(x['kind'] for x in pt)), 'duplicate_names': sorted({x['n'] for x in dse if x['dup']}),
                         'rule': 'the DSE of the MASTER file are DSE (AKTIF) with the master login ids; every operator outside the master is PROMOTOR TOKO'},
            'dse': dse, 'pt': pt}
    with open(os.path.join(WEB, 'dse_catalogue_feed.js'), 'w', encoding='utf-8') as f:
        f.write('/* DSE catalogue (scripts/build_dse_catalogue.py): 272 DSE of the master file (role DSE, status AKTIF, master login ids) + PROMOTOR TOKO */\nwindow.DSE_CAT = ')
        json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f"DSE catalogue: {len(dse)} DSE (AKTIF), {sum(1 for x in dse if x['pid'])} matched to a person id, {sum(x['outlets'] for x in dse):,} outlets; PROMOTOR TOKO: {len(pt)} {dict(Counter(x['kind'] for x in pt))}; duplicate names {feed['metadata']['duplicate_names']}")


if __name__ == '__main__':
    main()
