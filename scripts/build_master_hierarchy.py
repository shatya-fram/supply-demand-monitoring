#!/usr/bin/env python3
"""Master Hierarchy workbook (raw/Catalogue/Update_Master_Hierarchy_<date>.xlsb, owner 10 Nov 2026) -> data/catalogues/master_hierarchy_<YYYYMM>/.

Sheets read: IM3 and 3ID (one row per outlet: branch, sub area, MPC, micro cluster, CSO code = DSE, outlet code / name / category, lat / long, partner territory, kecamatan),
dual_brand (IM3 <-> 3ID pairs with the CSO of both sides), DSE (272 DSE: userid IM3 / 3ID, dual / single counts).
Phone number columns (CSM / CSO mobile numbers) are personal data and are NOT written (owner, 10 Nov 2026).

Outputs (no phone columns):
  outlet_hierarchy.csv   brand, outlet_id, outlet_name, cso_code, branch, sub_area, micro_cluster, mpc_name, mpc_code, partner_territory, kecamatan, category, lat, long, org_group, dual_check, dup_count, primary
  dual_pairs.csv         id_im3, id_3id, cso_im3, cso_3id, check, im3_pairs, id3_pairs   (id3_pairs > 1 = a 3ID id used by several IM3 ids)
  dse_sheet.csv          branch, micro_cluster, partner_territory, login_im3, login_3id, dse_name (from the DSE catalogue by login, else DSE BARU <login>), dual, single_im3, single_3id, total, pct_dual
  report.json            counts
Consumed by scripts/apply_final_dse_mapping.py (overlay_hierarchy).  Run:  python3 scripts/build_master_hierarchy.py
"""
import csv, glob, json, os, re, sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsb_reader import read_sheets  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')
RAW = os.path.join(ROOT, 'raw', 'Catalogue')


def nid(x):
    x = str(x if x is not None else '').strip()
    if x.endswith('.0'):
        x = x[:-2]
    return x.lstrip('0') if x.isdigit() else x


def ncode(x):
    x = str(x if x is not None else '').strip()
    return x[:-2] if x.endswith('.0') else x


def table(rows):
    h = rows[0]
    out = []
    for r in rows[1:]:
        d = {}
        for k in sorted(h):
            nm = str(h[k]).strip()
            if nm in d:
                nm += '_2'
            d[nm] = r.get(k, '')
        out.append(d)
    return out


def find_workbook():
    c = sorted(glob.glob(os.path.join(RAW, 'Update_Master_Hierarchy*.xlsb')), key=os.path.getmtime)
    if not c:
        sys.exit('no raw/Catalogue/Update_Master_Hierarchy*.xlsb found')
    return c[-1]


def coord_ok(la, lo):
    try:
        la, lo = float(la), float(lo)
    except (TypeError, ValueError):
        return False
    return -7.3 < la < -5.8 and 106.3 < lo < 107.9


def main():
    path = find_workbook()
    S = read_sheets(path)
    T = {n: table(r) for n, r in S.items() if r}
    ym = re.search(r'(\d{1,2})_([A-Za-z]+)_(\d{4})', os.path.basename(path))
    months = {'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'mei': '05', 'jun': '06', 'jul': '07', 'aug': '08', 'agu': '08', 'sep': '09', 'oct': '10', 'okt': '10', 'nov': '11', 'dec': '12', 'des': '12'}
    tag = (ym.group(3) + months.get(ym.group(2)[:3].lower(), '00')) if ym else '202611'
    out = os.path.join(CAT, 'master_hierarchy_' + tag)
    os.makedirs(out, exist_ok=True)
    rep = {'workbook': os.path.basename(path)}
    rows = []
    for brand in ('IM3', '3ID'):
        recs = T[brand]
        cnt = Counter(nid(r['Outlet Code']) for r in recs)
        seen = set()
        # for a duplicated code the primary row = the one with a CSO and valid coordinates, else the first
        score = lambda r: (bool(ncode(r['CSO Code'])) * 2 + coord_ok(r['LATITUDE'], r['LONGITUDE']))
        best = {}
        for r in recs:
            k = nid(r['Outlet Code'])
            if k not in best or score(r) > score(best[k]):
                best[k] = r
        for r in recs:
            k = nid(r['Outlet Code'])
            br = str(r['Branch Name']).strip()
            rows.append([brand, k, str(r['Outlet Name']).strip(), ncode(r['CSO Code']), br, str(r['Sub Area Name']).strip(), str(r['Micro Cluster Name']).strip(), str(r['MPC Name']).strip(),
                         str(r['MPC Short Code']).strip(), str(r['Partner Territory Name']).strip(), str(r['Kecamatan Name']).strip(), str(r['Outlet_category']).strip(),
                         r['LATITUDE'] if coord_ok(r['LATITUDE'], r['LONGITUDE']) else '', r['LONGITUDE'] if coord_ok(r['LATITUDE'], r['LONGITUDE']) else '', str(r['Organisation Group']).strip(),
                         ncode(r['CHECK']), cnt[k], 1 if best[k] is r and k not in seen else 0])
            if best[k] is r:
                seen.add(k)
        rep['%s_rows' % brand] = len(recs)
        rep['%s_dup_codes' % brand] = sum(1 for v in cnt.values() if v > 1)
    with open(os.path.join(out, 'outlet_hierarchy.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['brand', 'outlet_id', 'outlet_name', 'cso_code', 'branch', 'sub_area', 'micro_cluster', 'mpc_name', 'mpc_code', 'partner_territory', 'kecamatan', 'category', 'lat', 'long', 'org_group', 'dual_check', 'dup_count', 'primary'])
        w.writerows(rows)
    # dual pairs
    pairs = [(nid(r['Outlet Code']), nid(r['Outlet Code_2']), ncode(r['CSO Code']), ncode(r['cso_code']), ncode(r['CHECK'])) for r in T['dual_brand']]
    c_i, c_t = Counter(p[0] for p in pairs), Counter(p[1] for p in pairs)
    with open(os.path.join(out, 'dual_pairs.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['id_im3', 'id_3id', 'cso_im3', 'cso_3id', 'check', 'im3_pairs', 'id3_pairs'])
        for a, b, ca, cb, ck in pairs:
            w.writerow([a, b, ca, cb, ck, c_i[a], c_t[b]])
    rep['pairs'] = len(pairs)
    rep['pairs_check1'] = sum(1 for p in pairs if p[4] == '1')
    rep['id3_in_several_pairs'] = sum(1 for v in c_t.values() if v > 1)
    # DSE sheet with names
    names = {}
    for p in (os.path.join(CAT, 'dse_catalogue.csv'),):
        if os.path.exists(p):
            for r in csv.DictReader(open(p, encoding='utf-8')):
                for k in ('login_im3', 'login_3id', 'master_file_login_im3', 'master_file_login_3id'):
                    if r.get(k):
                        names[r[k].strip().upper()] = r['dse_name']
    for p in sorted(glob.glob(os.path.join(CAT, 'catalogue_[0-9]*', 'dse_logins.csv'))):
        for r in csv.DictReader(open(p, encoding='utf-8-sig')):
            for k in ('login_im3', 'login_3id'):
                if r.get(k):
                    names.setdefault(ncode(r[k]).upper(), r['dse_name'])
    new_logins, assumed = [], {}
    # persons of the DSE catalogue whose logins are no longer in the DSE sheet ("gone"); a new login in the same micro cluster is assumed to replace the single gone person there
    # (owner question 4 of 10 Nov 2026 is open: the assumption is flagged DSE_BARU_LOGIN and listed in report.json; edit dse_login_replacement.csv to override)
    sheet_logins = set()
    for r in T['DSE']:
        sheet_logins.add(ncode(r['USERID_IM3']).upper()); sheet_logins.add(ncode(r['USERID_3ID']).upper())
    gone = defaultdict(list)
    cat_p = os.path.join(CAT, 'dse_catalogue.csv')
    if os.path.exists(cat_p):
        for r in csv.DictReader(open(cat_p, encoding='utf-8')):
            if r['login_im3'].strip().upper() not in sheet_logins and r['login_3id'].strip().upper() not in sheet_logins:
                gone[r['micro_cluster']].append(r['dse_name'])
    override = {}
    op = os.path.join(out, 'dse_login_replacement.csv')
    if os.path.exists(op):
        for r in csv.DictReader(open(op, encoding='utf-8')):
            override[ncode(r['login']).upper()] = r['dse_name']
    with open(os.path.join(out, 'dse_sheet.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['branch', 'micro_cluster', 'partner_territory', 'login_im3', 'login_3id', 'dse_name', 'dual', 'single_im3', 'single_3id', 'total', 'pct_dual', 'login_baru'])
        for r in T['DSE']:
            li, l3 = ncode(r['USERID_IM3']), ncode(r['USERID_3ID'])
            if l3 in ('0', '0.0'):
                l3 = li + '3ID' if re.match(r'^\d+$', li) else ''     # the sheet leaves the 3ID login blank for new logins: it is the IM3 login + 3ID (the form used on the outlet rows)
            nm = names.get(li.upper()) or names.get(l3.upper())
            if not nm:
                cand = gone.get(r['Micro Cluster Name'], [])
                nm = override.get(li.upper()) or (cand[0] if len(cand) == 1 else 'DSE BARU ' + li)
                new_logins.append(li)
                assumed[li] = nm
            w.writerow([r['Branch Name'], r['Micro Cluster Name'], r['Partner Territory Name'], li, l3, nm, r['DUAL BRAND_2'], r['SINGLE IM3'], r['SINGLE 3ID'], r['TOTAL'], r['% ACH DUAL BRAND'], '1' if li in assumed else ''])
    rep['dse_rows'] = len(T['DSE'])
    rep['dse_new_logins_without_name'] = new_logins
    rep['dse_new_login_assumed_replacement'] = assumed
    rep['outlets_with_cso'] = sum(1 for r in rows if r[3])
    json.dump(rep, open(os.path.join(out, 'report.json'), 'w'), indent=2)
    print(os.path.relpath(out, ROOT), rep)


if __name__ == '__main__':
    main()
