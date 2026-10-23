#!/usr/bin/env python3
"""audit_dse_catalogue.py · the DSE catalogue rule (owner, 23 Oct 2026): the 272 DSE of the master file are DSE (AKTIF) with the master login ids, every other operator is PROMOTOR TOKO.
Run from the project root after build_dse_catalogue.py: python3 scripts/audit_dse_catalogue.py   (exit 1 on a failure)"""
import csv, json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bad = 0


def check(ok, msg):
    global bad
    print(('✓ ' if ok else '✗ ') + msg)
    bad += 0 if ok else 1


master = list(csv.DictReader(open(os.path.join(ROOT, 'data/catalogues/dse_master_hierarchy.csv'), encoding='utf-8')))
cat = list(csv.DictReader(open(os.path.join(ROOT, 'data/catalogues/dse_catalogue.csv'), encoding='utf-8')))
check(len(cat) == len(master) == 272, f"catalogue holds the {len(master)} DSE of the master file ({len(cat)} rows)")
check(all(c['role'] == 'DSE' and c['status'] == 'AKTIF' for c in cat), 'every catalogue row is role DSE, status AKTIF')
mk = {(r['nama_dse'].strip(), r['micro_cluster'], r['dse_id_im3'].strip(), r['dse_id_3id'].strip()) for r in master}
ck = {(c['dse_name'], c['micro_cluster'], c['login_im3'], c['login_3id']) for c in cat}
check(mk == ck, 'name, MC and both login ids equal the master file exactly (master login format)')
check(all(c['person_id'] for c in cat), 'every DSE is matched to a person id of the visits feed')
s = open(os.path.join(ROOT, 'website/data/dse_visits_feed.js'), encoding='utf-8').read()
V = json.loads(s[s.index('{'):s.rindex('}') + 1])
pids = {c['person_id'] for c in cat}
inm = {d['person_id'] for d in V['dses'] if d['in_master']}
check(inm == pids, f"visits feed in_master persons = catalogue ({len(inm)})")
check(all(d['role'] == ('DSE' if d['in_master'] else 'PROMOTOR TOKO') for d in V['dses']), 'visits feed role: DSE in the master, PROMOTOR TOKO otherwise')
pt = list(csv.DictReader(open(os.path.join(ROOT, 'data/catalogues/promotor_toko.csv'), encoding='utf-8')))
check(len(pt) + len(cat) == len(V['dses']), f"DSE {len(cat)} + PROMOTOR TOKO {len(pt)} = all {len(V['dses'])} operators of the visits feed")
sys.exit(1 if bad else 0)
