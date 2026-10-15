#!/usr/bin/env python3
"""
build_target_feed.py
Target setting per DSE (Sell-In SP and OSA, IM3 / 3ID / IOH) aggregated to MC, Area and Region.

Input   raw/*Target DSE Hybrid*REBALANCING*.xlsx   sheet "REBALANCING INNER JAKARTA" (header row 5, one row per DSE)
        data/catalogues/dse_master_hierarchy.csv   DSE id (IM3 / 3ID) -> DSE name, DSO, HoA
Output  website/data/target_feed.js  (window.TARGET_FEED)   data/processed/target_feed.json

Columns used (0-based) in the rebalancing sheet:
  3 MICRO CLUSTER, 2 BRANCH, 7 DSE ID IM3, 8 DSE ID 3ID, 10-13 outlets (IM3 only, 3ID only, hybrid, total)
  15-23 ORIGINAL per-DSE target (uniform inside an MC, before rebalancing)
  25-27 REBALANCED Sell-In SP (IM3, 3ID, IOH)   29-31 REBALANCED OSA in Rp (IM3, 3ID, IOH)   <- the targets used
Target period is the month (October 2026); achievement is prorated MTD in the app.
"""
import csv, glob, json, os, re, zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
SHEET_NAME = 'REBALANCING INNER JAKARTA'
HIER = os.path.join(ROOT, 'data', 'catalogues', 'dse_master_hierarchy.csv')
OUT_JS = os.path.join(ROOT, 'website', 'data', 'target_feed.js')
OUT_JSON = os.path.join(ROOT, 'data', 'processed', 'target_feed.json')


def find_file():
    cands = [p for p in glob.glob(os.path.join(ROOT, 'raw', '*Target DSE*.xlsx')) if not os.path.basename(p).startswith('~$')]
    if not cands:
        raise SystemExit('target workbook not found in raw/')
    return max(cands, key=os.path.getmtime)


def col(ref):
    n = 0
    for ch in re.match(r'[A-Z]+', ref).group():
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_sheet(path, name):
    z = zipfile.ZipFile(path)
    ss = [''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])) for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rid = None
    for s in wb.find('m:sheets', NS):
        if s.get('name') == name:
            rid = s.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
    if not rid:
        raise SystemExit('sheet %r not found' % name)
    target = [r.get('Target') for r in rels if r.get('Id') == rid][0].lstrip('/')
    target = target if target.startswith('xl/') else 'xl/' + target
    rows = []
    for ev, el in ET.iterparse(z.open(target)):
        if el.tag.endswith('}row'):
            r = {}
            for c in el.findall('m:c', NS):
                v = c.find('m:v', NS)
                if v is None:
                    continue
                r[col(c.get('r'))] = ss[int(v.text)] if c.get('t') == 's' else v.text
            rows.append((int(el.get('r')), r)); el.clear()
    return rows


def fl(r, i):
    try:
        return float(r.get(i) or 0)
    except ValueError:
        return 0.0


def norm(s):
    return re.sub(r'\s+', ' ', str(s or '').strip().upper())


def blank():
    return {'dses': 0, 'out': 0, 'sp': [0, 0, 0], 'osa': [0, 0, 0], 'sp0': [0, 0, 0], 'osa0': [0, 0, 0]}


def add(a, d):
    a['dses'] += 1; a['out'] += d['out']
    for j in range(3):
        a['sp'][j] += d['sp'][j]; a['osa'][j] += d['osa'][j]; a['sp0'][j] += d['sp0'][j]; a['osa0'][j] += d['osa0'][j]


def main():
    path = find_file()
    rows = read_sheet(path, SHEET_NAME)
    hier = {}
    with open(HIER, encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            for c in (r.get('dse_id_im3'), r.get('dse_id_3id')):
                if c:
                    hier.setdefault(norm(c), r)
    terr = {}                                      # same names as the master outlet feed (the KPI builder keys on these)
    for o in json.load(open(os.path.join(ROOT, 'website', 'data', 'territory_feed.json'), encoding='utf-8'))['outlets']:
        for c in (o.get('dse_code_im3'), o.get('dse_code_3id')):
            if c:
                terr.setdefault(norm(c), o)
    dses, unmatched = [], []
    for n, r in rows:
        if n < 6 or not r.get(0) or not r.get(7):
            continue
        t = terr.get(norm(r.get(7))) or terr.get(norm(r.get(8)))
        h = hier.get(norm(r.get(7))) or hier.get(norm(r.get(8)))
        nm = str((t or {}).get('dse_name') or (h or {}).get('nama_dse') or '').replace('.0', '')
        d = {'id': r[7], 'id3': r.get(8, ''), 'n': nm, 'br': r[2], 'mc': r[3], 'dso': (t or {}).get('dso_leader') or (h or {}).get('nama_dso', ''), 'hoa': (t or {}).get('hoa_leader') or (h or {}).get('nama_hoa', ''),
             'o': [int(fl(r, 10)), int(fl(r, 11)), int(fl(r, 12)), int(fl(r, 13))],
             'sp': [fl(r, 25), fl(r, 26), fl(r, 25) + fl(r, 26)], 'osa': [round(fl(r, 29)), round(fl(r, 30)), round(fl(r, 31))],
             'sp0': [fl(r, 16), fl(r, 17), fl(r, 18)], 'osa0': [round(fl(r, 20)), round(fl(r, 21)), round(fl(r, 22))]}
        d['out'] = d['o'][3]
        d['sp'] = [round(x) for x in d['sp']]; d['sp0'] = [round(x) for x in d['sp0']]
        if not nm:
            unmatched.append(r[7])
        dses.append(d)

    def roll(keyf):
        g = defaultdict(blank)
        for d in dses:
            add(g[keyf(d)], d)
        return g
    mcs, areas, region = roll(lambda d: (d['br'], d['mc'])), roll(lambda d: d['br']), blank()
    for d in dses:
        add(region, d)
    mc_meta = {(d['br'], d['mc']): (d['dso'], d['hoa']) for d in dses}
    feed = {
        'metadata': {
            'generated_at': datetime.now().isoformat(timespec='seconds'), 'source': os.path.relpath(path, ROOT), 'sheet': SHEET_NAME,
            'period': 'Oktober 2026 (target bulanan)', 'dses': len(dses), 'mcs': len(mcs), 'areas': len(areas), 'unmatched_ids': unmatched,
            'rules': {
                'sp': 'Sell-In SP target in pcs per DSE, split IM3 / 3ID; IOH = IM3 + 3ID (rebalanced columns)',
                'osa': 'OSA target in Rp per DSE, split IM3 / 3ID; IOH = IM3 + 3ID',
                'rebalanced': 'FINAL REBALANCING: the per-DSE target after redistribution inside the MC; used for productivity and achievement',
                'original': 'ORIGINAL: uniform per-DSE target before rebalancing (kept for reference, sp0 / osa0)',
                'aggregation': 'MC, Area and Region targets are sums of DSE targets (equal to the MC / Area targets in the workbook check sheet)',
            },
        },
        'region': {'name': 'INNER JAKARTA', **region},
        'areas': [{'br': k, **v} for k, v in sorted(areas.items())],
        'mcs': [{'br': k[0], 'mc': k[1], 'dso': mc_meta[k][0], 'hoa': mc_meta[k][1], **v} for k, v in sorted(mcs.items())],
        'dses': dses,
    }
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* DSE target setting (Sell-In SP, OSA), generated by scripts/build_target_feed.py */\nwindow.TARGET_FEED = ')
        json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f"{os.path.basename(path)} | DSEs {len(dses)} | MCs {len(mcs)} | areas {len(areas)} | unmatched ids {len(unmatched)}")
    print(f"SP target IM3 {region['sp'][0]:,} 3ID {region['sp'][1]:,} IOH {region['sp'][2]:,} | OSA IOH Rp {region['osa'][2]:,}")


if __name__ == '__main__':
    main()
