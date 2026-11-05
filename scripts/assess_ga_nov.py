#!/usr/bin/env python3
"""
assess_ga_nov.py · assessment of the newest GA files (raw/GA*/rguga_daily_outlet_inner_202611.csv and rguga_daily_favloc_inner_202611.csv)

Maps the MSISDN-level GA of November to outlet, site, DSE and program and compares it with October:
  MTD Nov (days 1..cut)  vs  LMTD Oct (days 1..cut, same dates)  vs  FM Oct (full month)  -> growth, % of FM, run-rate and projection.
Outlet basis  : ga_pairing_id (the selling outlet, brand id) -> master outlet key (entity_map) -> DSE, MC, site, program flags.
                October baseline = data/processed/ga_feed.json (Daily_RGUGA_OUTLET, outlet tagging, month 2026-10).
Fav Locs basis: ga_site_id (favourite location of the SIM) -> site; October baseline only exists per branch (Daily_RGUGA_favloc_202610.xlsb), not per site.
Writes (local only, never committed): exports/ga_nov/*.csv ; prints the aggregates used by docs/assessments/ga_nov_scan_assessment.md
Pure stdlib. Run from the project root: python3 scripts/assess_ga_nov.py
"""
import csv, glob, json, os, re, struct, sys, zipfile, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import entity_map  # noqa: E402
from build_territory_management_catalogues import parse_xlsb_sst, parse_xlsb_sheet_rows  # noqa: E402

GA_DIR = glob.glob('raw/GA*')[0]
OUT = 'exports/ga_nov'
os.makedirs(OUT, exist_ok=True)
NOV_DAYS, OCT_DAYS = 30, 31


def nid(v):
    return entity_map.nid(v)


# ---------------------------------------------------------------- master, programs, October baseline
terr = json.load(open('website/data/territory_feed.json', encoding='utf-8'))['outlets']
M = {o['outlet_key']: o for o in terr}
by_id = {}
for o in terr:
    for b, f in (('IM3', 'outlet_id_im3'), ('3ID', 'outlet_id_3id')):
        i = nid(o.get(f))
        if i:
            cur = by_id.get((b, i))
            if cur is None or o.get('brand_flag') == 'HYBRID':
                by_id[(b, i)] = o['outlet_key']
ga = json.load(open('data/processed/ga_feed.json', encoding='utf-8'))
OCT = collections.defaultdict(lambda: collections.defaultdict(lambda: [0] * 32))   # key -> brand -> day -> GA
ATTR = {}
for r in ga['outlets']:
    ATTR.setdefault(r['k'], {'mc': r.get('mc'), 'br': r.get('br'), 'dse': r.get('dse'), 'sg': r.get('sg'), 'site': r.get('site'), 'kec': r.get('kec'), 'n': r.get('n')})
IJ_MCS = set(ga['metadata']['mc_info'])
OCT_CACHE = os.path.join(OUT, 'oct_outlet_daily.json')


def key_of_early(brand, oid):
    i = nid(oid)
    k = by_id.get((brand, i))
    return k or entity_map.merge_key(brand, i, 'G:%s:%s' % (brand, i))


# October baseline = rguga_daily_outlet_202610.csv (MSISDN, outlet tagging), outlets of the 36 Inner Jakarta micro clusters: it matches the team's own
# October "ALL" series within 1% per day, whereas ga_feed.json (Daily_RGUGA xlsb) is about 9% higher (323,890 vs 287,269 GA), so it is NOT the November basis.
oct_csv = os.path.join(GA_DIR, 'rguga_daily_outlet_202610.csv')
if os.path.exists(OCT_CACHE) and os.path.getmtime(OCT_CACHE) > os.path.getmtime(oct_csv):
    for k, bs in json.load(open(OCT_CACHE)).items():
        for b, a in bs.items():
            OCT[k][b] = a
else:
    with open(oct_csv, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['outlet_micro_cluster'] not in IJ_MCS:
                continue
            k = key_of_early(r['ga_brand'], r['outlet_id'])
            OCT[k][r['ga_brand']][int(r['ga_dt'][8:])] += 1
            if k not in M and k not in ATTR:
                ATTR[k] = {'mc': r['outlet_micro_cluster'], 'br': r['outlet_sales_area'], 'dse': r['dse_code'] or '(tanpa DSE)', 'sg': '', 'site': '', 'kec': r['outlet_kecamatan'], 'n': r['outlet_nm']}
    json.dump({k: {b: a for b, a in bs.items()} for k, bs in OCT.items()}, open(OCT_CACHE, 'w'))
print('October baseline: %d outlets, %d GA (rguga_daily_outlet_202610.csv, IJ micro clusters)' % (len(OCT), sum(sum(a) for bs in OCT.values() for a in bs.values())))

PROG = collections.defaultdict(set)
for r in csv.DictReader(open('data/catalogues/kro_program_outlets.csv', encoding='utf-8')):
    p = r['program'].replace(' (katalog 202610)', '')
    p = {'Wholesaler': 'Top Player (WS)', 'DTU': 'DtU', 'KRO': 'KRO (katalog)'}.get(p, p)
    for b in ('IM3', '3ID'):
        k = by_id.get((b, nid(r['outlet_id'])))
        if k:
            PROG[k].add(p)


def key_of(brand, oid):
    i = nid(oid)
    k = by_id.get((brand, i))
    if k:
        return k
    return entity_map.merge_key(brand, i, 'G:%s:%s' % (brand, i))


def info(k):
    o = M.get(k)
    if o:
        return {'n': o['outlet_name'], 'mc': o['micro_cluster'], 'br': o['branch'], 'dse': o['dse_name'] or 'UNASSIGNED', 'site': o['site_nbs'], 'kec': o['kecamatan'], 'pjp': 'PJP' if o['dse_name'] and o['dse_name'].upper() != 'UNASSIGNED' else 'non-PJP', 'flag': o.get('brand_flag')}
    a = ATTR.get(k) or {}
    return {'n': a.get('n') or '', 'mc': a.get('mc') or '(di luar master)', 'br': a.get('br') or '(di luar master)', 'dse': a.get('dse') or '(tanpa DSE)', 'site': a.get('site') or '', 'kec': a.get('kec') or '', 'pjp': 'non-PJP', 'flag': ''}


# ---------------------------------------------------------------- November files
def read_csv(name):
    return list(csv.DictReader(open(os.path.join(GA_DIR, name), encoding='utf-8')))


outlet_rows = read_csv('rguga_daily_outlet_inner_202611.csv')
fav_rows = read_csv('rguga_daily_favloc_inner_202611.csv')
CUT_O = max(int(r['ga_dt'][8:]) for r in outlet_rows)
CUT_F = max(int(r['ga_dt'][8:]) for r in fav_rows)
CUT = min(CUT_O, CUT_F)
print('outlet file days 1..%d (%d rows) · favloc file days 1..%d (%d rows) · common cut %d' % (CUT_O, len(outlet_rows), CUT_F, len(fav_rows), CUT))

NOV = collections.defaultdict(lambda: collections.defaultdict(lambda: [0] * 32))
unm = collections.Counter()
for r in outlet_rows:
    k = key_of(r['brand'], r['ga_pairing_id'])
    NOV[k][r['brand']][int(r['ga_dt'][8:])] += 1
    if k not in M:
        unm[k] += 1
print('outlet GA keys %d, of which not in master %d (%d GA)' % (len(NOV), sum(1 for k in NOV if k not in M), sum(unm.values())))


def tot(a, hi, lo=1):
    return sum(a[lo:hi + 1])


def row_of(k):
    n = NOV.get(k, {}); o = OCT.get(k, {})
    nm = {b: tot(n[b], CUT) for b in n}; ol = {b: tot(o[b], CUT) for b in o}; of = {b: tot(o[b], OCT_DAYS) for b in o}
    return {'nov': sum(nm.values()), 'lm': sum(ol.values()), 'fm': sum(of.values()), 'nov_im3': nm.get('IM3', 0), 'nov_3id': nm.get('3ID', 0), 'lm_im3': ol.get('IM3', 0), 'lm_3id': ol.get('3ID', 0), 'fm_im3': of.get('IM3', 0), 'fm_3id': of.get('3ID', 0)}


def gr(a, b):
    return (a / b - 1) * 100 if b else None


def fmt(v, d=1):
    return '' if v is None else ('%.*f' % (d, v))


def slab(fm):
    return 'Wholesaler >100' if fm > 100 else ('KRO 31-100' if fm > 30 else ('Retail 1-30' if fm > 0 else 'Tanpa GA Okt'))


keys = sorted(set(NOV) | set(OCT))
R = {k: row_of(k) for k in keys}
for k in keys:
    R[k]['slab'] = slab(R[k]['fm'])

# ---------------------------------------------------------------- outlet table
with open(os.path.join(OUT, 'outlet_compare.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['outlet_key', 'nama', 'status', 'dse', 'mc', 'branch', 'site', 'kecamatan', 'program', 'slab_fm_okt', 'ga_lmtd_okt', 'ga_mtd_nov', 'growth_pct', 'ga_fm_okt', 'mtd_pct_of_fm', 'rr_nov_per_hari', 'rr_okt_per_hari', 'proyeksi_nov'])
    for k in keys:
        r, i = R[k], info(k)
        if not (r['nov'] or r['lm'] or r['fm']):
            continue
        w.writerow([k, i['n'], i['pjp'], i['dse'], i['mc'], i['br'], i['site'], i['kec'], '|'.join(sorted(PROG.get(k, []))), r['slab'], r['lm'], r['nov'], fmt(gr(r['nov'], r['lm'])), r['fm'], fmt(r['nov'] / r['fm'] * 100 if r['fm'] else None), fmt(r['nov'] / CUT, 2), fmt(r['fm'] / OCT_DAYS, 2), fmt(r['nov'] / CUT * NOV_DAYS, 0)])


def table(name, label, group, only_master=False):
    g = collections.defaultdict(lambda: collections.Counter())
    for k in keys:
        r = R[k]
        if not (r['nov'] or r['lm'] or r['fm']):
            continue
        if only_master and k not in M:
            continue
        for lab in group(k):
            c = g[lab]
            c['outlets_fm'] += 1 if r['fm'] else 0; c['outlets_lm'] += 1 if r['lm'] else 0; c['outlets_nov'] += 1 if r['nov'] else 0
            for f_ in ('nov', 'lm', 'fm', 'nov_im3', 'nov_3id', 'lm_im3', 'lm_3id', 'fm_im3', 'fm_3id'):
                c[f_] += r[f_]
            c['n'] += 1
    rows = []
    for lab, c in g.items():
        rows.append([lab, c['n'], c['outlets_lm'], c['outlets_nov'], c['outlets_fm'], c['lm'], c['nov'], fmt(gr(c['nov'], c['lm'])), c['fm'], fmt(c['nov'] / c['fm'] * 100 if c['fm'] else None), fmt(c['nov'] / CUT * NOV_DAYS, 0), c['lm_im3'], c['nov_im3'], c['lm_3id'], c['nov_3id']])
    rows.sort(key=lambda x: -x[8])
    with open(os.path.join(OUT, name), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow([label, 'outlet_total', 'sso_lmtd_okt', 'sso_mtd_nov', 'sso_fm_okt', 'ga_lmtd_okt', 'ga_mtd_nov', 'growth_pct', 'ga_fm_okt', 'mtd_pct_of_fm', 'proyeksi_nov', 'lmtd_im3', 'mtd_im3', 'lmtd_3id', 'mtd_3id'])
        w.writerows(rows)
    return rows


reg = table('region_compare.csv', 'wilayah', lambda k: ['INNER JAKARTA'])
br = table('branch_compare.csv', 'branch', lambda k: [info(k)['br']])
mc = table('mc_compare.csv', 'mc', lambda k: [info(k)['mc']])
dse = table('dse_compare.csv', 'dse', lambda k: [info(k)['dse']], only_master=False)
site = table('site_outlet_compare.csv', 'site_outlet', lambda k: [info(k)['site'] or '(tanpa site)'])
prog = table('program_compare.csv', 'program', lambda k: sorted(PROG.get(k, [])) or ['(tanpa flag program)'])
slabs = table('slab_compare.csv', 'slab_fm_okt', lambda k: [R[k]['slab']])
pjp = table('pjp_compare.csv', 'status', lambda k: [info(k)['pjp']])
octd = [0] * 32
for bs in OCT.values():
    for a in bs.values():
        for d in range(1, 32): octd[d] += a[d]
novd = [0] * 32
for bs in NOV.values():
    for a in bs.values():
        for d in range(1, 32): novd[d] += a[d]
sh = 3
print('REGION daily Okt 1..8', octd[1:9], 'Nov 1..%d' % CUT_O, novd[1:CUT_O + 1], 'Okt total', sum(octd))
print('LMTD sama tanggal (Okt 1..%d)=%d | sejajar hari (Okt %d..%d)=%d | MTD Nov=%d' % (CUT, sum(octd[1:CUT + 1]), 1 + sh, CUT + sh, sum(octd[1 + sh:CUT + sh + 1]), sum(novd[1:CUT + 1])))
print('REGION', reg[0])
print('BRANCH', [(r[0], r[5], r[6], r[7], r[8]) for r in br])
print('PJP', [(r[0], r[5], r[6], r[7], r[8]) for r in pjp])
print('SLAB', [(r[0], r[1], r[5], r[6], r[7], r[8]) for r in slabs])
print('PROGRAM', [(r[0], r[1], r[5], r[6], r[7], r[8]) for r in prog])

# UAR improvement tier reached at the cut (per outlet, per brand >=3 / >=5, combined >=10 / >=20), November vs the same days of October
def tier(a, b):
    c = a + b
    return 4 if c >= 20 else (3 if c >= 10 else (2 if (a >= 5 or b >= 5) else (1 if (a >= 3 or b >= 3) else 0)))


tn = collections.Counter(); tl = collections.Counter()
for k in keys:
    r = R[k]
    if k in M and (r['nov'] or r['lm']):
        tn[tier(r['nov_im3'], r['nov_3id'])] += 1; tl[tier(r['lm_im3'], r['lm_3id'])] += 1
print('UAR tier outlets (master, with GA) Nov %s | Oct same days %s' % (sorted(tn.items()), sorted(tl.items())))

# movers: outlets that were active in October but have no GA in November so far (and the opposite)
lost = [k for k in keys if R[k]['lm'] > 0 and R[k]['nov'] == 0]
new = [k for k in keys if R[k]['lm'] == 0 and R[k]['nov'] > 0]
print('active LMTD Oct, none Nov: %d outlets (%d GA LMTD) · new in Nov: %d outlets (%d GA)' % (len(lost), sum(R[k]['lm'] for k in lost), len(new), sum(R[k]['nov'] for k in new)))

# ---------------------------------------------------------------- Fav Locs
FAV = collections.defaultdict(lambda: collections.defaultdict(lambda: [0] * 32))     # site -> brand -> day
FSTAT = collections.Counter(); CLS = collections.defaultdict(lambda: collections.Counter())
site_mc = collections.defaultdict(collections.Counter); site_br = {}
for o in terr:
    if o['site_nbs']:
        site_mc[o['site_nbs']][o['micro_cluster']] += 1; site_br[o['site_nbs']] = o['branch']
def nbr(b):
    return 'BEKASI' if b == 'KOTA BEKASI' else b


for r in fav_rows:
    site_br[r['ga_site_id']] = nbr(r['ga_site_branch'])
for r in fav_rows:
    d = int(r['ga_dt'][8:]); s = r['ga_site_id']
    FAV[s][r['brand']][d] += 1
    st = r['ga_pairing_status']; FSTAT[st] += 1
    if st == 'VALID_ID':
        k = key_of(r['brand'], r['ga_pairing_id']); oi = info(k) if k in M else None
        if oi is None: c = 'penjual di luar master'
        elif oi['site'] == s: c = 'penjual di site yang sama'
        elif site_mc.get(s) and oi['mc'] in site_mc[s]: c = 'penjual di MC yang sama'
        elif oi['br'] == site_br.get(s): c = 'penjual di branch yang sama'
        else: c = 'penjual di branch lain'
    else:
        c = {'NO_ID': 'tanpa ID penjual', 'SOURCE_NOT_FOUND': 'sumber tagging tidak ditemukan'}.get(st, st)
    CLS[d][c] += 1
print('FAVLOC pairing status', dict(FSTAT))
allc = collections.Counter()
for d in CLS: allc.update(CLS[d])
print('FAVLOC origin classes (days 1..%d): %s' % (CUT_F, dict(allc)))

with open(os.path.join(OUT, 'site_favloc_vs_outlet.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['site_id', 'branch', 'mc_utama', 'favloc_ga_nov_1_%d' % CUT, 'favloc_ga_nov_1_%d' % CUT_F, 'favloc_im3', 'favloc_3id', 'outlet_ga_lmtd_okt', 'outlet_ga_mtd_nov', 'outlet_ga_fm_okt', 'selisih_favloc_minus_outlet_mtd', 'rasio_favloc_per_outlet'])
    outl = {r[0]: r for r in site}
    sites = set(FAV) | set(outl)
    rows = []
    for s in sites:
        fa = FAV.get(s, {}); f3 = sum(tot(a, CUT) for a in fa.values()); f4 = sum(tot(a, CUT_F) for a in fa.values())
        o = outl.get(s)
        rows.append([s, site_br.get(s, ''), (site_mc[s].most_common(1)[0][0] if site_mc.get(s) else ''), f3, f4, sum(tot(a, CUT_F) for b, a in fa.items() if b == 'IM3'), sum(tot(a, CUT_F) for b, a in fa.items() if b == '3ID'), o[5] if o else 0, o[6] if o else 0, o[8] if o else 0, f3 - (o[6] if o else 0), fmt(f3 / o[6] if o and o[6] else None, 2)])
    rows.sort(key=lambda x: -x[3])
    w.writerows(rows)
    print('SITE favloc vs outlet: %d sites; favloc GA (1..%d) %d vs outlet GA MTD at these sites %d' % (len(rows), CUT, sum(r[3] for r in rows), sum(r[8] for r in rows)))
    print('top 5 net inflow sites (favloc - outlet):', [(r[0], r[3], r[8]) for r in sorted(rows, key=lambda x: -x[10])[:5]])
    print('top 5 net outflow sites:', [(r[0], r[3], r[8]) for r in sorted(rows, key=lambda x: x[10])[:5]])

# Oct baseline of Fav Locs per branch (workbook pivot, cumulative MTD per day)
def xl_rows(path, sheet):
    with zipfile.ZipFile(path) as z:
        sst = parse_xlsb_sst(z.read('xl/sharedStrings.bin'))
        data = z.read('xl/workbook.bin'); names = []; pos = 0
        while pos < len(data):
            b = data[pos]; rt = b & 0x7F; pos += 1
            if b & 0x80: rt |= (data[pos] & 0x7F) << 7; pos += 1
            b = data[pos]; ln = b & 0x7F; pos += 1; sh = 7
            while b & 0x80: b = data[pos]; ln |= (b & 0x7F) << sh; pos += 1; sh += 7
            rec = data[pos:pos + ln]; pos += ln
            if rt == 156:
                n1 = struct.unpack('<I', rec[8:12])[0]; p = 12 + n1 * 2; n2 = struct.unpack('<I', rec[p:p + 4])[0]
                names.append(rec[p + 4:p + 4 + n2 * 2].decode('utf-16le', errors='ignore'))
        files = sorted([n for n in z.namelist() if re.match(r'xl/worksheets/sheet\d+\.bin$', n)], key=lambda n: int(re.findall(r'\d+', n)[0]))
        return parse_xlsb_sheet_rows(z.read(files[names.index(sheet)]), sst)


oct_fav = {}
try:
    rows_ = xl_rows(os.path.join(GA_DIR, 'Daily_RGUGA_favloc_202610.xlsb'), 'PIVOT 202610')
    hdr = None
    for r in rows_:
        v = [r[c] for c in sorted(r)]
        if v[:3] == ['region', 'branch', 'brand']:
            hdr = v
        elif hdr and len(v) > 4 and v[0] == 'INNER JAKARTA' and isinstance(v[3], (int, float)):
            oct_fav[(v[1], v[2])] = [x for x in v[3:] if isinstance(x, (int, float))]
except Exception as e:
    print('favloc October pivot not read:', e)
fb = collections.defaultdict(lambda: [0, 0, 0, 0])
for s, per in FAV.items():
    b = site_br.get(s, '(site di luar master)')
    for brand, a in per.items():
        fb[b][0] += tot(a, CUT); fb[b][1] += tot(a, CUT_F)
for (b, brd), cum in oct_fav.items():
    b = nbr(b)
    fb[b][2] += cum[min(CUT, len(cum)) - 1]; fb[b][3] += cum[-1]
print('FAVLOC per branch (Nov 1..%d | Nov 1..%d | Okt LMTD 1..%d (pivot) | Okt last pivot day (%d days))' % (CUT, CUT_F, CUT, len(next(iter(oct_fav.values()))) if oct_fav else 0))
with open(os.path.join(OUT, 'favloc_branch_compare.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(['branch', 'favloc_nov_mtd_%d' % CUT, 'favloc_nov_mtd_%d' % CUT_F, 'favloc_okt_lmtd_%d' % CUT, 'favloc_okt_fm_pivot', 'growth_pct'])
    for b, v in sorted(fb.items(), key=lambda x: -x[1][0]):
        w.writerow([b, v[0], v[1], v[2], v[3], fmt(gr(v[0], v[2]))]); print('  ', b, v[0], v[1], v[2], v[3], fmt(gr(v[0], v[2])))
print('written to', OUT)
