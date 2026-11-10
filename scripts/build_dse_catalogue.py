#!/usr/bin/env python3
"""
build_dse_catalogue.py  ·  DSE catalogue (owner, 23 Oct 2026)

The 272 DSE of the MASTER file (data/catalogues/dse_master_hierarchy.csv, from docs/MASTER DSE Hirarki.xlsx) are the DSE catalogue: every one is tagged
role DSE, status AKTIF. NAME and login ids (login IM3, login 3ID) are those of the uploaded governed CATALOGUE (sheet DSE of raw/Catalogue/CATALAGUE_INNER_JAKARTA_<YYYYMM>.xlsb,
read by build_catalogue_overlay_inputs.py into catalogue_<YYYYMM>/dse_logins.csv): the catalogue holds the active login of each DSE (owner, 26 Oct 2026: the master file
still has older logins for 26 DSE, e.g. Sulendra DSEIN108 and Junita Riana DSEIN107). The master file is the fallback when the catalogue has no login for a DSE and gives
DSO / HoA. Every other operator seen in the PJP visit feed (promotor logins PRJAYAIN##, logins not in the master, test logins) is categorised PROMOTOR TOKO.
Reports show the NAME with the login ids below it.

Inputs   data/catalogues/dse_master_hierarchy.csv, data/catalogues/territory_management_master.csv (HoA, outlets per DSE), website/data/dse_visits_feed.js (person ids, operators outside the master)
Outputs  data/catalogues/dse_catalogue.csv   the 272 DSE (no phone numbers, e-mail or NIK)
         data/catalogues/promotor_toko.csv   operators outside the master
         website/data/dse_catalogue_feed.js  window.DSE_CAT
Run after generate_dse_visits_feed.py:  python3 scripts/build_dse_catalogue.py
"""
import csv, glob, json, os
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
    cdirs = sorted(glob.glob(os.path.join(CAT, 'catalogue_*', 'dse_logins.csv')))
    cat_rows = list(csv.DictReader(open(cdirs[-1], encoding='utf-8'))) if cdirs else []
    cat_by = {(up(r['dse_name']), r['mc']): r for r in cat_rows}
    hoa_of_mc = {r['micro_cluster']: r['hoa_leader'] for r in terr if r['hoa_leader']}
    outlets = Counter((up(r['dse_name']), r['micro_cluster']) for r in terr if r['dse_name'] and up(r['dse_name']) not in ('UNASSIGNED', '0', '0.0'))
    pid_of = {(up(d['dse_name']), d['micro_cluster']): d['person_id'] for d in V['dses'] if d['in_master']}
    # the visits feed MC is where the DSE is planned in the PJP exports; a DSE who swapped MC in the Master Hierarchy (10 Nov 2026) keeps the old MC there,
    # so a unique master name is matched to its person id whatever the MC (names shared by two people are never matched this way)
    _by_name = {}
    for d in V['dses']:
        if d['in_master']:
            _by_name.setdefault(up(d['dse_name']), []).append(d['person_id'])
    _name_pid = {n: p[0] for n, p in _by_name.items() if len(p) == 1}
    name_count = Counter(up(r['nama_dse']) for r in master)
    # Master Hierarchy (owner, 10 Nov 2026): the micro cluster of a DSE follows the DSE sheet of the hierarchy (4 DSE swapped MC, e.g. Batujaya <-> Rengasdengklok); DSO per MC from the outlet master
    hdirs = sorted(glob.glob(os.path.join(CAT, 'master_hierarchy_[0-9]*', 'dse_sheet.csv')))
    sheet_mc = {}
    if hdirs:
        for h_ in csv.DictReader(open(hdirs[-1], encoding='utf-8')):
            for lg in (h_['login_im3'], h_['login_3id']):
                if lg:
                    sheet_mc[lg.strip().upper()] = (h_['micro_cluster'], 'BEKASI' if h_['branch'] == 'KOTA BEKASI' else h_['branch'])
        for h_ in csv.DictReader(open(hdirs[-1], encoding='utf-8')):
            sheet_mc.setdefault('N:' + h_['dse_name'].strip().upper(), []).append((h_['micro_cluster'], 'BEKASI' if h_['branch'] == 'KOTA BEKASI' else h_['branch']))
    dso_of_mc = {}
    for r_ in terr:
        if r_['dso_leader'] and r_['micro_cluster']:
            dso_of_mc.setdefault(r_['micro_cluster'], r_['dso_leader'])
    master = [dict(r) for r in master]
    for r in master:
        c0 = cat_by.get((up(r['nama_dse']), r['micro_cluster'])) or {}
        lg = ((c0.get('login_im3') or '').strip() or r['dse_id_im3'].strip()).upper()
        hit = sheet_mc.get(lg) or (sheet_mc.get('N:' + up(r['nama_dse'])) or [None])[0] if len(sheet_mc.get('N:' + up(r['nama_dse']), [])) == 1 or lg in sheet_mc else None
        if hit and hit[0] != r['micro_cluster']:
            r['micro_cluster'], r['branch'] = hit
            r['nama_dso'] = dso_of_mc.get(r['micro_cluster'], r['nama_dso'])
    dse = []
    for r in master:
        key = (up(r['nama_dse']), r['micro_cluster'])
        c = cat_by.get(key) or {}
        im3, id3 = (c.get('login_im3') or '').strip() or r['dse_id_im3'].strip(), (c.get('login_3id') or '').strip() or r['dse_id_3id'].strip()
        dse.append({'pid': pid_of.get(key) or _name_pid.get(key[0], ''), 'n': (c.get('dse_name') or r['nama_dse']).strip(), 'im3': im3, 'id3': id3, 'br': r['branch'], 'mc': r['micro_cluster'],
                    'dso': r['nama_dso'], 'hoa': hoa_of_mc.get(r['micro_cluster'], r['nama_hoa']), 'outlets': outlets.get(key, 0), 'role': 'DSE', 'status': 'AKTIF', 'dup': name_count[up(r['nama_dse'])] > 1,
                    'src': 'catalogue' if c and (c.get('login_im3') or c.get('login_3id')) else 'master', 'old_im3': r['dse_id_im3'].strip(), 'old_3id': r['dse_id_3id'].strip()})
    dse.sort(key=lambda x: (x['br'], x['mc'], x['n']))
    pt = []
    for d in V['dses']:
        if d['in_master']:
            continue
        types = d.get('operator_types') or [d.get('operator_type')]
        pt.append({'pid': d['person_id'], 'n': d['dse_name'], 'logins': d['logins'], 'type': '/'.join(t for t in types if t), 'br': d['branch'], 'mc': d['micro_cluster'],
                   'planned': d['planned_visits'], 'actual': d['actual_visits'], 'kind': 'Promotor PRJAYAIN' if d['is_promotor'] else 'Login di luar master', 'role': 'PROMOTOR TOKO',
                   'prod': d['productive_visits'], 'sp': d['sp_qty'], 'vc': d['vc_qty'], 'saldo': d['saldo_rp'],
                   'tx': bool(d['productive_visits'] > 0 or d['sp_qty'] > 0 or d['vc_qty'] > 0 or d['saldo_rp'] > 0)})      # flag: a PROMOTOR TOKO that really transacted (sell-in during a visit)
    pt.sort(key=lambda x: (x['kind'], x['n']))
    with open(os.path.join(CAT, 'dse_catalogue.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['dse_name', 'role', 'status', 'login_im3', 'login_3id', 'branch', 'micro_cluster', 'dso', 'hoa', 'outlets', 'person_id', 'login_source', 'master_file_login_im3', 'master_file_login_3id'])
        for x in dse:
            w.writerow([x['n'], x['role'], x['status'], x['im3'], x['id3'], x['br'], x['mc'], x['dso'], x['hoa'], x['outlets'], x['pid'], x['src'], x['old_im3'], x['old_3id']])
    with open(os.path.join(CAT, 'promotor_toko.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(['name_or_login', 'role', 'flag', 'kind', 'logins', 'operator_type', 'branch', 'micro_cluster', 'planned_stops', 'executed_stops', 'productive_visits', 'sp_qty', 'vc_qty', 'saldo_rp', 'person_id'])
        for x in pt:
            w.writerow([x['n'], x['role'], 'PROMOTOR TOKO TRANSAKSI' if x['tx'] else 'PROMOTOR TOKO', x['kind'], ' '.join(x['logins']), x['type'], x['br'], x['mc'], x['planned'], x['actual'], x['prod'], x['sp'], x['vc'], x['saldo'], x['pid']])
    feed = {'metadata': {'generated_at': datetime.now().isoformat(timespec='seconds'), 'source': 'DSE set: data/catalogues/dse_master_hierarchy.csv; name and login ids: ' + (os.path.relpath(cdirs[-1], ROOT) if cdirs else 'master file'), 'dse': len(dse), 'login_from_catalogue': sum(1 for x in dse if x['src'] == 'catalogue'), 'login_differs_from_master_file': sum(1 for x in dse if (x['im3'], x['id3']) != (x['old_im3'], x['old_3id'])), 'promotor_toko': len(pt),
                         'promotor_toko_kinds': dict(Counter(x['kind'] for x in pt)), 'promotor_toko_transaksi': sum(1 for x in pt if x['tx']), 'duplicate_names': sorted({x['n'] for x in dse if x['dup']}),
                         'rule': 'the 272 DSE of the master file are DSE (AKTIF); name and login ids as in the uploaded catalogue (sheet DSE); every operator outside the master is PROMOTOR TOKO'},
            'dse': dse, 'pt': pt}
    with open(os.path.join(WEB, 'dse_catalogue_feed.js'), 'w', encoding='utf-8') as f:
        f.write('/* DSE catalogue (scripts/build_dse_catalogue.py): 272 DSE of the master file (role DSE, status AKTIF, master login ids) + PROMOTOR TOKO */\nwindow.DSE_CAT = ')
        json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f"DSE catalogue: {len(dse)} DSE (AKTIF), logins from the catalogue {feed['metadata']['login_from_catalogue']}, differing from the master file {feed['metadata']['login_differs_from_master_file']}, {sum(1 for x in dse if x['pid'])} matched to a person id, {sum(x['outlets'] for x in dse):,} outlets; PROMOTOR TOKO: {len(pt)} {dict(Counter(x['kind'] for x in pt))}, with transactions {sum(1 for x in pt if x['tx'])}; duplicate names {feed['metadata']['duplicate_names']}")


if __name__ == '__main__':
    main()
