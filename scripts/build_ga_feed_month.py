#!/usr/bin/env python3
"""
build_ga_feed_month.py  ·  GA (RGUGA, outlet tagging) feed for the RUNNING month from the MSISDN files (month roll, owner request 5 Nov 2026)

After the month roll the uploader sends the running month as MSISDN files, not as the Daily_RGUGA_OUTLET workbook:
  raw/GA*/rguga_daily_outlet_inner_<YYYYMM>.csv   running month: one row per GA MSISDN, selling outlet = ga_pairing_id (brand id), outlets of Inner Jakarta
  raw/GA*/rguga_daily_outlet_<YYYYMM-1>.csv       month before, same kind of file (national; outlets of the 36 Inner Jakarta micro clusters are kept)
Output = the same GA_FEED schema as build_ga_feed.py with months.cur = running month, months.prev = month before (row.o = running month, row.s = month before),
so the whole app (Gross Add, Daily GA Trend, KRO, Opportunity, Profil Outlet) reads it unchanged.

Basis note: the month before is rebuilt from the MSISDN file (same basis as the running month and as the team's own NOV vs OCT series, within 1% per day);
the October close of build_ga_feed.py (Daily_RGUGA workbook, frozen in archive/2026-10, view B) is about 11% higher because its non-master outlets
carry more GA (docs/assessments/ga_nov_scan_assessment.md section 2).
Attributes (segment PJP / NON / KAM, hybrid, location keys, M2S target) are carried from the archived feed of the month before; the master supplies DSE / MC / site.
Pure stdlib. Run from anywhere: python3 scripts/build_ga_feed_month.py   (build_ga_feed.py calls it itself when only the MSISDN files exist for the running month)
"""
import calendar, csv, glob, gzip, json, os, re, sys
from collections import defaultdict
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import entity_map  # noqa: E402

OUT_JSON = 'data/processed/ga_feed.json'
OUT_JS = 'website/data/ga_feed.js'
OUTSIDE = 'OUTSIDE MASTER TERRITORY'
OUTLIER = 300


def nid(v):
    s = str(v if v is not None else '').strip().upper()
    if s.endswith('.0'):
        s = s[:-2]
    return s.lstrip('0')      # 3ID ids of the MSISDN files carry leading zeros ('00103425'), the master and the workbook feed do not


def find_dir():
    for d in sorted(glob.glob('raw/GA*')):
        if os.path.isdir(d):
            return d
    raise SystemExit('Folder raw/GA tidak ditemukan')


GA_DIR = find_dir()
cands = sorted(glob.glob(os.path.join(GA_DIR, 'rguga_daily_outlet_inner_??????.csv')))
if not cands:
    raise SystemExit('rguga_daily_outlet_inner_<YYYYMM>.csv tidak ditemukan di ' + GA_DIR)
CUR_SRC = cands[-1]
CUR_YM = re.search(r'_(\d{6})\.csv$', CUR_SRC).group(1)
cy, cm = int(CUR_YM[:4]), int(CUR_YM[4:])
py, pm = (cy, cm - 1) if cm > 1 else (cy - 1, 12)
PREV_YM = '%04d%02d' % (py, pm)
PREV_SRC = os.path.join(GA_DIR, 'rguga_daily_outlet_%s.csv' % PREV_YM)
if not os.path.exists(PREV_SRC):
    raise SystemExit('File bulan sebelumnya tidak ada: ' + PREV_SRC)
TEMPLATE = 'data/archive/%04d-%02d/ga_feed.json.gz' % (py, pm)
if not os.path.exists(TEMPLATE):
    raise SystemExit('Feed GA bulan sebelumnya belum diarsipkan: ' + TEMPLATE + ' (jalankan scripts/archive_month_close.py)')
PREV_DAYS, CUR_DAYS = calendar.monthrange(py, pm)[1], calendar.monthrange(cy, cm)[1]
print('[1/5] bulan berjalan %s (%s), bulan sebelumnya %s (%s), template %s' % (CUR_YM, os.path.basename(CUR_SRC), PREV_YM, os.path.basename(PREV_SRC), TEMPLATE))

# ---------------------------------------------------------------- template, master
tpl = json.load(gzip.open(TEMPLATE, 'rt', encoding='utf-8'))
TM = tpl['metadata']
mc_info = TM['mc_info']
loc_labels = TM.get('loc_keys') or []
T = {}
for r in tpl['outlets']:
    T[(r['k'], r['b'])] = r
terr = json.load(open('website/data/territory_feed.json', encoding='utf-8'))['outlets']
master, by_id = {}, {}
for o in terr:
    k = o['outlet_key']
    dse = (o.get('dse_name') or '').strip() or 'UNASSIGNED'
    master[k] = {'n': o.get('outlet_name') or '', 'mc': o.get('micro_cluster') or '', 'br': o.get('branch') or '', 'kec': o.get('kecamatan') or '', 'site': o.get('site_nbs') or '',
                 'dse': dse, 'hy': 1 if o.get('brand_flag') == 'HYBRID' else 0, 'ids': {'IM3': nid(o.get('outlet_id_im3')), '3ID': nid(o.get('outlet_id_3id'))}}
    for b in ('IM3', '3ID'):
        i = master[k]['ids'][b]
        if i and i != '0':
            cur = by_id.get((b, i))
            if cur is None or master[k]['hy']:
                by_id[(b, i)] = k


def key_of(brand, oid):
    k = by_id.get((brand, oid))
    return k or entity_map.merge_key(brand, oid, 'G:%s:%s' % (brand, oid))


REC = {}      # (k, brand) -> record


def rec(k, brand, oid):
    r = REC.get((k, brand))
    if r is None:
        r = REC[(k, brand)] = {'i': oid, 'n': '', 'mc': '', 'kk': '', 'kec': '', 'dse': '', 's': defaultdict(int), 'o': defaultdict(int), 'area': ''}
    return r


# ---------------------------------------------------------------- month before (prev -> row.s)
print('[2/5] bulan sebelumnya', PREV_SRC)
prev_other = {b: defaultdict(int) for b in ('IM3', '3ID')}
prev_blank = {b: defaultdict(int) for b in ('IM3', '3ID')}
n_prev = 0
with open(PREV_SRC, encoding='utf-8') as f:
    for r in csv.DictReader(f):
        b, d = r['ga_brand'], int(r['ga_dt'][8:])
        oid = nid(r['outlet_id'])
        if not oid:
            prev_blank[b][d] += 1
            continue
        if r['outlet_micro_cluster'] not in mc_info:
            prev_other[b][d] += 1
            continue
        k = key_of(b, oid)
        x = rec(k, b, oid)
        x['s'][d] += 1
        n_prev += 1
        x['n'] = x['n'] or r['outlet_nm']
        x['mc'] = x['mc'] or r['outlet_micro_cluster']
        x['kk'] = x['kk'] or r['outlet_kec_kabkot']
        x['kec'] = x['kec'] or r['outlet_kecamatan']
        x['dse'] = x['dse'] or r['dse_code']
print('   %d GA di outlet 36 MC IJ' % n_prev)

# ---------------------------------------------------------------- running month (cur -> row.o)
print('[3/5] bulan berjalan', CUR_SRC)
cut_day = 0
n_cur = 0
unpaired = 0
with open(CUR_SRC, encoding='utf-8') as f:
    for r in csv.DictReader(f):
        b, d = r['brand'], int(r['ga_dt'][8:])
        oid = nid(r['ga_pairing_id'])
        if not oid or r['ga_pairing_status'] != 'VALID_ID':
            unpaired += 1
            continue
        k = key_of(b, oid)
        x = rec(k, b, oid)
        x['o'][d] += 1
        n_cur += 1
        cut_day = max(cut_day, d)
        x['kk'] = x['kk'] or r['ga_pairing_kec_kabkot']
        x['area'] = x['area'] or r['ga_pairing_branch']
print('   %d GA berpasangan, %d tanpa pasangan outlet, hari terakhir %d' % (n_cur, unpaired, cut_day))

# every master outlet is carried (no GA = no daily series)
for k, m in master.items():
    for b in ('IM3', '3ID'):
        i = m['ids'][b]
        if i and i != '0' and by_id.get((b, i)) == k and (k, b) not in REC:
            rec(k, b, i)

# ---------------------------------------------------------------- rows
print('[4/5] baris outlet')
loc_index = {l: i for i, l in enumerate(loc_labels)}
rows, stats = [], defaultdict(int)
tot = {b: {'sep': 0, 'oct': 0} for b in ('IM3', '3ID')}
matched = {b: {'sep': 0, 'oct': 0} for b in ('IM3', '3ID')}
anomalies = []
for (k, b), x in REC.items():
    qs, qo = sum(x['s'].values()), sum(x['o'].values())
    t0 = T.get((k, b)) or next((T[(k, bb)] for bb in ('IM3', '3ID') if (k, bb) in T), None)
    m = master.get(k)
    if m:
        tier, name, mc, br, kec, site, dse = 'M', m['n'] or x['n'], m['mc'], m['br'], m['kec'], m['site'], m['dse']
        matched[b]['sep'] += qs; matched[b]['oct'] += qo
    else:
        if qs + qo <= 0:
            continue
        tier = 'G'
        name = x['n'] or (t0 or {}).get('n', '')
        mc = x['mc'] or (t0 or {}).get('mc', '')
        br = (mc_info.get(mc) or {}).get('br') or (t0 or {}).get('br') or OUTSIDE
        kec, site = x['kec'] or (t0 or {}).get('kec', ''), (t0 or {}).get('site', '')
        dse = (t0 or {}).get('dse') or 'UNASSIGNED'
    tot[b]['sep'] += qs; tot[b]['oct'] += qo
    for per, arr in (('s', x['s']), ('o', x['o'])):
        for d, q in arr.items():
            if q >= OUTLIER:
                anomalies.append({'brand': b, 'id': x['i'], 'name': name, 'month': 'prev' if per == 's' else 'cur', 'day': d, 'qty': q})
    sg = (t0 or {}).get('sg') or ('PJP' if m and dse != 'UNASSIGNED' else 'NON')
    row = {'k': k, 'i': x['i'], 'b': b, 't': tier, 'n': name, 'mc': mc, 'br': br, 'dse': dse, 'sg': sg}
    lkey = x['kk'] or (loc_labels[t0['lk']] if t0 and t0.get('lk') is not None and t0['lk'] < len(loc_labels) else '')
    if t0 and t0.get('lm'):
        row['lm'] = t0['lm']
    if t0 and t0.get('la'):
        row['la'] = t0['la']
    if lkey:
        if lkey not in loc_index:
            loc_index[lkey] = len(loc_index)
        row['lk'] = loc_index[lkey]
    if kec:
        row['kec'] = kec
    if site:
        row['site'] = site
    if (m and m['hy']) or (t0 and t0.get('hy')):
        row['hy'] = 1
    if x['s']:
        row['s'] = [v for d in sorted(x['s']) for v in (d, x['s'][d])]
    if x['o']:
        row['o'] = [v for d in sorted(x['o']) for v in (d, x['o'][d])]
    stats[tier] += 1
    rows.append(row)
# one physical outlet = one territory: the IM3 and 3ID rows of a key carry the attributes of its heaviest row (a catalogue pair outside the master can have two micro clusters in the files)
_by = defaultdict(list)
for r in rows:
    _by[r['k']].append(r)
for k_, rs in _by.items():
    if len(rs) > 1:
        top = max(rs, key=lambda r: sum(r.get('s', [])[1::2]) + sum(r.get('o', [])[1::2]))
        for r in rs:
            for f_ in ('n', 'mc', 'br', 'dse', 'sg', 'kec', 'site', 'lm', 'la'):
                if f_ in top:
                    r[f_] = top[f_]
                elif f_ in r and f_ not in ('n', 'mc', 'br', 'dse', 'sg'):
                    del r[f_]
rows.sort(key=lambda r: (r['br'], r['mc'], r['dse'], r['k'], r['b']))
print('   %d baris, %d outlet fisik; master %d, di luar master %d' % (len(rows), len({r['k'] for r in rows}), stats['M'], stats['G']))
for b in ('IM3', '3ID'):
    print('   GA %s: bulan sebelumnya %d, berjalan %d' % (b, tot[b]['sep'], tot[b]['oct']))

# ---------------------------------------------------------------- metadata
print('[5/5] metadata dan tulis')
loc_keys = [l for l, _ in sorted(loc_index.items(), key=lambda kv: kv[1])]
meta = {
    'generated_at': datetime.now().isoformat(timespec='seconds'), 'contract': 'docs/assessments/ga_rguga_outlet.md',
    'sources': {'sep': PREV_SRC, 'oct': CUR_SRC, 'note': 'keys sep / oct = month before / running month (compatibility); builder scripts/build_ga_feed_month.py'},
    'months': {'prev': '%04d-%02d' % (py, pm), 'cur': '%04d-%02d' % (cy, cm)}, 'prev_days': PREV_DAYS, 'cur_days': CUR_DAYS, 'cut_day': cut_day,
    'definitions': TM.get('definitions'), 'row_fields': dict(TM.get('row_fields') or {}, s='[hari, qty, ...] bulan sebelumnya', o='[hari, qty, ...] bulan berjalan'),
    'mc_info': mc_info, 'universe_rows': {b: {'sep': sum(1 for (k, bb), x in REC.items() if bb == b and x['s']), 'oct': sum(1 for (k, bb), x in REC.items() if bb == b and x['o'])} for b in ('IM3', '3ID')},
    'dropped_outside_zero': {}, 'ga_total': tot, 'ga_in_master': matched, 'unknown_mc': {},
    'anomalies': sorted(anomalies, key=lambda a: -a['qty'])[:20], 'anomaly_threshold': OUTLIER, 'workbook_check': {},
    'tag': {'sep_outside_ij': {b: {str(d): q for d, q in sorted(prev_other[b].items())} for b in prev_other}, 'sep_blank': {b: {str(d): q for d, q in sorted(prev_blank[b].items())} for b in prev_blank},
            'oct_outside_ij': {}, 'oct_blank': {}, 'note': 'file bulan berjalan hanya memuat outlet Inner Jakarta: GA di tagging luar IJ dan tanpa ID tidak tersedia'},
    'loc_keys': loc_keys, 'target': TM.get('target'),
    'unpaired_ga_cur': unpaired,
    'notes': ['Bulan berjalan dari rguga_daily_outlet_inner_%s.csv (outlet penjual = ga_pairing_id, VALID_ID saja); bulan sebelumnya dari rguga_daily_outlet_%s.csv (outlet di 36 MC IJ), basis yang sama.' % (CUR_YM, PREV_YM),
              'Basis bulan sebelumnya di sini ~11%% di bawah feed penutupan %s (workbook Daily_RGUGA, view FM): lihat docs/assessments/ga_nov_scan_assessment.md bagian 2.' % PREV_YM,
              'Target GA per kecamatan (M2S) masih target bulan %s dan dibawa ke depan.' % (TM.get('target') or {}).get('month', ''),
              'Segmen PJP / NON / KAM dan lokasi outlet dibawa dari feed bulan sebelumnya; outlet baru: PJP bila punya DSE di master, selain itu NON.'],
}
feed = {'metadata': meta, 'outlets': rows}
os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
with open(OUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
with open(OUT_JS, 'w', encoding='utf-8') as f:
    f.write('// Auto-generated Gross Add (SSO) feed dari raw/GA (file MSISDN). Kontrak: docs/assessments/ga_rguga_outlet.md\n')
    f.write('var GA_FEED = ')
    json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
    f.write(";\nif (typeof window !== 'undefined') window.GA_FEED = GA_FEED;\n")
print('SUCCESS: %s (%d KB); %d baris, cut %d %s' % (OUT_JS, os.path.getsize(OUT_JS) // 1024, len(rows), cut_day, CUR_YM))
