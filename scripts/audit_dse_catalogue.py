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
import glob
cdir = sorted(glob.glob(os.path.join(ROOT, 'data/catalogues/catalogue_*/dse_logins.csv')))[-1]
uploaded = list(csv.DictReader(open(cdir, encoding='utf-8')))
check({(r['nama_dse'].strip().upper(), r['micro_cluster']) for r in master} == {(c['dse_name'].strip().upper(), c['micro_cluster']) for c in cat}, 'the 272 DSE (name, MC) are those of the master file')
uk = {(r['dse_name'].strip().upper(), r['mc']): (r['login_im3'].strip(), r['login_3id'].strip()) for r in uploaded}
bad_l = [c['dse_name'] for c in cat if uk.get((c['dse_name'].strip().upper(), c['micro_cluster']), (c['login_im3'], c['login_3id'])) != (c['login_im3'], c['login_3id'])]
check(not bad_l, f"login IM3 / 3ID of every DSE equal the uploaded catalogue ({os.path.basename(os.path.dirname(cdir))}, sheet DSE); {len(bad_l)} differ")
diff = sum(1 for c in cat if (c['login_im3'], c['login_3id']) != (c['master_file_login_im3'], c['master_file_login_3id']))
print(f"  note: {diff} DSE carry a catalogue login that differs from the master file (e.g. Sulendra, Junita Riana)")
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
