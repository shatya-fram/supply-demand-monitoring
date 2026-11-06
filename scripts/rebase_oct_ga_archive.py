#!/usr/bin/env python3
"""Rebases the frozen October GA feed (data/archive/2026-10/ga_feed.json.gz, view B of the period toggle) from the Daily_RGUGA workbook basis
(323,890 GA) to the MSISDN CSV basis (rguga_daily_outlet_202610.csv, outlets of the 36 IJ micro clusters, 287,269 GA), the basis of view A and
Review Periode (owner decision, 6 Nov 2026). Only the October counts (row.o) change; September (row.s) stays on the workbook basis.
The original is kept as ga_feed.workbook.json.gz. Usage: python3 scripts/rebase_oct_ga_archive.py   (then scripts/stage_period_archive.py)"""
import csv, glob, gzip, json, os, shutil, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
ARC = 'data/archive/2026-10/ga_feed.json.gz'; BAK = 'data/archive/2026-10/ga_feed.workbook.json.gz'
if not os.path.exists(BAK):
    shutil.copy(ARC, BAK)
d = json.load(gzip.open(BAK))
mcs = {r['mc'] for r in d['outlets'] if r.get('mc')}
src = glob.glob('raw/GA*/rguga_daily_outlet_202610.csv')[0]
cnt = collections.defaultdict(collections.Counter); info = {}
with open(src, encoding='utf-8') as f:
    for x in csv.DictReader(f):
        if x['outlet_micro_cluster'] in mcs:
            k = (x['ga_brand'], x['outlet_id'].strip().lstrip('0'))
            cnt[k][int(x['ga_dt'][8:])] += 1
            info.setdefault(k, x)
old = sum(sum(r['o'][1::2]) for r in d['outlets'] if r.get('o'))
seen = set(); out = []
for r in d['outlets']:
    k = (r['b'], r['i']); seen.add(k)
    if k in cnt:
        r['o'] = [v for dd in sorted(cnt[k]) for v in (dd, cnt[k][dd])]
    elif r.get('o'):
        r.pop('o')
    if r.get('o') or r.get('s'):
        out.append(r)
added = 0
for k, c in cnt.items():
    if k in seen: continue
    x = info[k]
    out.append({'k': 'G:%s:%s' % k, 'i': k[1], 'b': k[0], 't': 'G', 'n': x['outlet_nm'], 'mc': x['outlet_micro_cluster'], 'br': d['metadata'].get('mc_info', {}).get(x['outlet_micro_cluster'], {}).get('br', x['outlet_sales_area']),
                'kec': x['outlet_kec_kabkot'], 'sg': '', 'o': [v for dd in sorted(c) for v in (dd, c[dd])]}); added += 1
d['outlets'] = out
md = d['metadata']
md['sources']['oct'] = src
md['rebased_oct'] = {'from': 'Daily_RGUGA_OUTLET_202610 workbook', 'to': os.path.basename(src), 'ga_before': old, 'ga_after': sum(sum(r['o'][1::2]) for r in out if r.get('o')), 'outlets_added': added,
                     'note': 'October on the MSISDN CSV basis (36 IJ micro clusters); September stays on the workbook basis'}
with gzip.open(ARC, 'wt', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
print(md['rebased_oct'])
