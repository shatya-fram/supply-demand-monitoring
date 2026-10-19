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
import csv, glob, json, os, re, struct, sys, zipfile
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


def find_dse_workbook():
    """Newest SELL-IN_TAG_RGUGA_OSA_OUTLET_*.xlsb (owner, 19 Oct 2026): its sheet 'DSE' carries the target per DSE, IM3 / 3ID / IOH."""
    c = [p for p in glob.glob(os.path.join(ROOT, 'raw', '**', '*SELL-IN_TAG*.xlsb'), recursive=True) if not os.path.basename(p).startswith('~$')]
    return max(c, key=os.path.getmtime) if c else None


def read_dse_sheet(path):
    """Rows of sheet DSE (cols 3 / 4 DSE id IM3 / 3ID, 7-9 Sell-In SP target IM3 / 3ID / IOH, 10-12 OSA target IM3 / 3ID / IOH)."""
    sys.path.insert(0, os.path.join(ROOT, 'scripts'))
    src = open(os.path.join(ROOT, 'scripts', 'build_ga_feed.py'), encoding='utf-8').read()
    ns = {'__file__': os.path.join(ROOT, 'scripts', 'build_ga_feed.py')}
    exec(compile(src[:src.index('# ---------------------------------------------------------------- control files')], 'xlsb_reader', 'exec'), ns)
    rows = ns['read_sheets'](path, {'DSE'}).get('DSE', [])
    out = {}
    for r in rows:
        if not r.get(0) or r.get(0) == 'BRANCH' or r.get(3) is None or not isinstance(r.get(7), float):
            continue
        out[norm(str(int(r[3])) if isinstance(r[3], float) else r[3])] = {
            'id': str(int(r[3])) if isinstance(r[3], float) else str(r[3]).strip(), 'id3': str(int(r[4])) if isinstance(r[4], float) else str(r.get(4) or '').strip(),
            'br': r[0], 'mc': r.get(1, ''), 'sp': [round(r[7]), round(r[8]), round(r[7]) + round(r[8])],
            'osa': [round(r.get(10, 0)), round(r.get(11, 0)), round(r.get(10, 0)) + round(r.get(11, 0))]}
    return out


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

    new_path = find_dse_workbook()
    src_note = os.path.relpath(path, ROOT)
    if new_path:
        new = read_dse_sheet(new_path)
        have = {norm(d['id']) for d in dses}
        changed = 0
        for d in dses:                              # IM3 / 3ID targets from the new file; IOH = IM3 + 3ID (blended)
            n = new.get(norm(d['id']))
            if n:
                if n['sp'] != d['sp'] or n['osa'] != d['osa']:
                    changed += 1
                d['sp'], d['osa'] = n['sp'], n['osa']
        for k, n in new.items():
            if k not in have:                       # DSE only in the new file: no original / outlet data, names from the master
                t = terr.get(k) or terr.get(norm(n['id3']))
                dses.append({'id': n['id'], 'id3': n['id3'], 'n': str((t or {}).get('dse_name') or '').replace('.0', ''), 'br': n['br'], 'mc': n['mc'],
                             'dso': (t or {}).get('dso_leader', ''), 'hoa': (t or {}).get('hoa_leader', ''), 'o': [0, 0, 0, 0], 'out': 0,
                             'sp': n['sp'], 'osa': n['osa'], 'sp0': [0, 0, 0], 'osa0': [0, 0, 0]})
                changed += 1
        src_note = os.path.relpath(new_path, ROOT) + " (sheet DSE; outlets and original target from " + os.path.basename(path) + ")"
        print(f"target source: {os.path.basename(new_path)} sheet DSE | DSEs in sheet {len(new)} | DSEs whose target changed or were added {changed}")

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
            'generated_at': datetime.now().isoformat(timespec='seconds'), 'source': src_note, 'sheet': SHEET_NAME,
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
