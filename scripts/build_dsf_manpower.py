#!/usr/bin/env python3
"""DSF outlet flag (Program & Tipe Outlet, program DSF) from raw/Catalogue/DASHBOARD DSF*.xlsx, sheet `manpower DSF` (owner request, 7 Nov 2026).

One row per DSF person; the outlet ids of a DSF are the columns OUTLET DSF (IM3 / SaleSHub id) and QR CODE 3ID DSF (3ID id).
Writes data/catalogues/catalogue_202611/dsf_manpower.csv (person, login, branch, micro cluster, ids, status) and rewrites the DSF rows of
data/catalogues/kro_program_outlets.csv = ids of the manpower sheet + ids of the November catalogue with category DSF
(catalogue_202611/program_nov.csv, kept as before; set KEEP_CATALOGUE_DSF = False to use the manpower sheet only).
Also writes website/data/dsf_feed.js (window.DSF_FEED: roster with DMO/DMP, MC, partner, ids; target 20 pcs per DSF per day, 500 per month) read by the
DSF monitoring tab of Program & Tipe Outlet (website/dsf_monitor.js).
A value that is not an outlet id (a login such as DSFINNER06, empty, 0) is skipped and reported.
Called by build_catalogue_nov_programs.py after the November lists; also runnable alone:  python3 scripts/build_dsf_manpower.py
Pure stdlib. Assessment: docs/assessments/dsf_outlet_flag.md"""
import csv, datetime, glob, json, os, re, sys, zipfile
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')
KEEP_CATALOGUE_DSF = True
SRC_NOTE = 'DASHBOARD DSF (sheet manpower DSF: OUTLET DSF / QR CODE 3ID DSF)'
CAT_NOTE = 'CATALOGUE_OUTLET_NOVEMBER category DSF'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}


def col(c):
    n = 0
    for ch in re.match(r'[A-Z]+', c).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_sheet(path, name):
    z = zipfile.ZipFile(path)
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            ss.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    for s in wb.find('m:sheets', NS):
        if s.get('name').strip().lower() != name.lower():
            continue
        t = rels[s.get('{%s}id' % NS['r'])].lstrip('/')
        t = t if t.startswith('xl/') else 'xl/' + t
        rows = []
        for _, el in ET.iterparse(z.open(t)):
            if el.tag.endswith('}row'):
                r = {}
                for c in el.findall('m:c', NS):
                    v = c.find('m:v', NS); ty = c.get('t')
                    if ty == 'inlineStr':
                        val = ''.join(x.text or '' for x in c.iter('{%s}t' % NS['m']))
                    elif v is None:
                        continue
                    else:
                        val = ss[int(v.text)] if ty == 's' else v.text
                    r[col(c.get('r'))] = (val or '').strip()
                rows.append(r); el.clear()
        return rows
    raise SystemExit('sheet %s not found in %s' % (name, path))


def nid(v):
    v = (v or '').strip().upper()
    if v in ('', '0', 'NONE', 'NAN', '-'):
        return ''
    return v.lstrip('0') if v.isdigit() else v


def is_outlet_id(v):
    return bool(v) and not v.startswith('DSF')      # DSFINNER06 / DSFIN0xx are logins, not outlets


def main():
    files = sorted(glob.glob(os.path.join(ROOT, 'raw', 'Catalogue', 'DASHBOARD DSF*.xlsx')), key=os.path.getmtime)
    if not files:
        print('  no DASHBOARD DSF*.xlsx in raw/Catalogue: DSF manpower not built'); return
    path = files[-1]
    rows = read_sheet(path, 'manpower DSF')
    hdr = {k: v.strip().upper() for k, v in rows[0].items()}
    ix = {v: k for k, v in hdr.items()}
    need = ['DSF NAME', 'ID MOBII IM3 / SALESHUB', 'ID MOBII 3ID', 'OUTLET DSF', 'QR CODE 3ID DSF']
    miss = [n for n in need if n not in ix]
    if miss:
        sys.exit('manpower DSF lacks columns: %s' % miss)
    g = lambda r, n: (r.get(ix[n]) or '').strip() if n in ix else ''
    people, ids, skipped, feed = [], {}, [], []
    for r in rows[1:]:
        if not g(r, 'DSF NAME'):
            continue
        got = []
        for c in ('OUTLET DSF', 'QR CODE 3ID DSF'):
            raw = g(r, c); v = nid(raw)
            if not v:
                continue
            if not is_outlet_id(v):
                skipped.append((g(r, 'DSF NAME'), c, raw)); continue
            if v not in got:
                got.append(v)
            ids.setdefault(v, g(r, 'DSF NAME'))
        people.append([g(r, 'REGION'), g(r, 'BRANCH'), g(r, 'DSF NAME'), g(r, 'ID MOBII IM3 / SALESHUB'), g(r, 'ID MOBII 3ID'), g(r, 'MICRO CLUSTER'), g(r, 'STATUS'), g(r, 'ROLE'),
                       nid(g(r, 'OUTLET DSF')), nid(g(r, 'QR CODE 3ID DSF')), '|'.join(got),
                       g(r, 'DMO/DMP'), g(r, 'PARTNER_TERRITORY_IM3'), g(r, 'PARTNER_TERRITORY_3ID'), g(r, 'BRANCH NOTE'), g(r, 'MAPPING KPI PRODUCT')])
        pid = []
        for c, b in (('OUTLET DSF', 'IM3'), ('QR CODE 3ID DSF', '3ID')):
            v = nid(g(r, c))
            if v and is_outlet_id(v) and v not in [x[0] for x in pid]:
                pid.append([v, b])
        feed.append({'n': g(r, 'DSF NAME'), 'region': g(r, 'REGION'), 'br': g(r, 'BRANCH'), 'dmo': g(r, 'DMO/DMP'), 'mc': g(r, 'MICRO CLUSTER'),
                     'pt': g(r, 'PARTNER_TERRITORY_IM3') or g(r, 'PARTNER_TERRITORY_3ID'), 'emb': g(r, 'BRANCH NOTE'), 'kpi': g(r, 'MAPPING KPI PRODUCT'),
                     'st': g(r, 'STATUS'), 'l1': g(r, 'ID MOBII IM3 / SALESHUB'), 'l3': g(r, 'ID MOBII 3ID'), 'ids': pid})
    d = os.path.join(CAT, 'catalogue_202611'); os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'dsf_manpower.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['region', 'branch', 'dsf_name', 'login_im3', 'login_3id', 'micro_cluster', 'status', 'role', 'outlet_dsf', 'qr_code_3id_dsf', 'outlet_ids', 'dmo_dmp', 'partner_im3', 'partner_3id', 'embarkasi', 'kpi_product'])
        w.writerows(people)
    out_js = os.path.join(ROOT, 'website', 'data', 'dsf_feed.js')
    meta = {'generated_at': datetime.datetime.now().isoformat(timespec='seconds'), 'source': os.path.basename(path) + ' · sheet manpower DSF',
            'target': {'daily': 20, 'monthly': 500, 'unit': 'GA pcs', 'note': '20 pcs per DSF per hari kerja (Senin-Sabtu, Minggu libur), 500 pcs per DSF per bulan (25 hari kerja)'},
            'n_dsf': len(feed), 'n_ids': len(ids), 'skipped': skipped}
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write('/* Auto-generated by scripts/build_dsf_manpower.py: DSF roster (DMO/DMP, MC, partner, outlet ids). Contract: docs/assessments/dsf_outlet_flag.md */\n')
        f.write('var DSF_FEED = ' + json.dumps({'metadata': meta, 'people': feed}, ensure_ascii=False, separators=(',', ':')) + ';\nwindow.DSF_FEED = DSF_FEED;\n')
    cat_ids = set()
    pn = os.path.join(d, 'program_nov.csv')
    if KEEP_CATALOGUE_DSF and os.path.exists(pn):
        for x in csv.DictReader(open(pn, encoding='utf-8')):
            if (x.get('category') or '').upper() == 'DSF' and x.get('outlet_id'):
                cat_ids.add(x['outlet_id'])
    pc = os.path.join(CAT, 'kro_program_outlets.csv')
    keep = [x for x in csv.DictReader(open(pc, encoding='utf-8')) if x['program'] != 'DSF']
    new = [{'program': 'DSF', 'outlet_id': i, 'note': SRC_NOTE + ' · ' + ids[i]} for i in sorted(ids)]
    new += [{'program': 'DSF', 'outlet_id': i, 'note': CAT_NOTE} for i in sorted(cat_ids - set(ids))]
    with open(pc, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['program', 'outlet_id', 'note']); w.writeheader(); w.writerows(keep + new)
    print('  DSF manpower: %s -> %d DSF, %d outlet ids (+%d from the November catalogue, %d overlap); skipped %s' % (
        os.path.basename(path), len(people), len(ids), len(cat_ids - set(ids)), len(cat_ids & set(ids)), skipped or 'none'))


if __name__ == '__main__':
    main()
