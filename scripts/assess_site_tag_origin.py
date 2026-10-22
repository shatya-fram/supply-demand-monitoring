#!/usr/bin/env python3
"""Assessment helper (22 Oct 2026): for all GA activated in Inner Jakarta (activation kecamatan in the 121 IJ kecamatan, incl. Kepulauan Seribu),
where is the tagging outlet: kabupaten / kota and province. Reads raw/GA*/Site_rguga_daily_outlet_202610.csv (MSISDN never copied); writes aggregate CSVs
to docs/assessments/ga_site_rguga/. Run from the project root: python3 scripts/assess_site_tag_origin.py"""
import os, csv, glob, json, subprocess, tempfile, collections as C
tmp = tempfile.mkdtemp()
subprocess.run(['node', '-e', """global.window=global;require('./website/data/ga_feed.js');const F=GA_FEED,fs=require('fs');
fs.writeFileSync(process.argv[1]+'/feed.json',JSON.stringify({loc_keys:F.metadata.loc_keys,outlets:F.outlets.map(r=>({i:r.i,b:r.b,mc:r.mc,lk:r.lk})),tkec:(F.metadata.target||{}).kec}))""", tmp], check=True)
F = json.load(open(tmp + '/feed.json'))
def nid(v):
    v = str(v or '').strip().upper()
    if v.endswith('.0'): v = v[:-2]
    return v.lstrip('0')
fo = {(r['b'], nid(r['i'])): r for r in F['outlets']}
mapping = {r['micro_cluster']: r for r in csv.DictReader(open('data/catalogues/gaplok_location_mapping.csv'))}
mc_area = {m: r['master_branch'] for m, r in mapping.items()}
M = list(csv.DictReader(open('data/catalogues/territory_management_master.csv')))
site_mc = C.defaultdict(C.Counter)
for r in M:
    if r['site_nbs'] and r['micro_cluster']: site_mc[r['site_nbs']][r['micro_cluster']] += 1
U = set(F['loc_keys']); [U.add(t['kk']) for t in F['tkec'] or []]
kec_mc = C.defaultdict(C.Counter)
for t in F['tkec'] or []: kec_mc[t['kk']][t['mc']] += 100000
BANTEN = {'TANGERANG', 'KOTA TANGERANG', 'KOTA TANGERANG SELATAN', 'SERANG', 'KOTA SERANG', 'KOTA CILEGON', 'PANDEGLANG', 'LEBAK'}
DKI = {'JAKARTA TIMUR', 'JAKARTA BARAT', 'JAKARTA SELATAN', 'JAKARTA UTARA', 'JAKARTA PUSAT', 'KEPULAUAN SERIBU'}
def province(kab):
    if kab in DKI: return 'DKI JAKARTA'
    if kab in BANTEN: return 'BANTEN'
    return 'JAWA BARAT'
f = glob.glob('raw/GA*/Site_rguga_daily_outlet_202610.csv')[0]
orig = C.defaultdict(lambda: C.Counter()); prov_dest = C.defaultdict(C.Counter); area_sales = C.defaultdict(C.Counter)
dest_kab = C.Counter(); n = 0
with open(f, newline='', encoding='utf-8') as fh:
    for row in csv.DictReader(fh):
        ak = row['activation_kec_kabkot']
        if not ak or ak not in U: continue
        n += 1; b = row['ga_brand']; oid = nid(row['outlet_id']); omc = row['outlet_micro_cluster']; fr = fo.get((b, oid))
        mb = row['datavol_mb']; g = mb != '' and float(mb) > 25
        sid = row['activation_site_id']
        amc = site_mc[sid].most_common(1)[0][0] if sid in site_mc else (kec_mc[ak].most_common(1)[0][0] if kec_mc[ak] else '?')
        dest = mc_area.get(amc, '?'); dest_kab[ak.split('|')[1]] += 1
        if row['outlet_kabkot']: kab = row['outlet_kabkot']; src = 'atribut outlet file'
        elif fr is not None and fr.get('lk') is not None: kab = F['loc_keys'][fr['lk']].split('|')[1]; src = 'lokasi di Daily_RGUGA'
        elif fr is not None: kab = '(outlet IJ, kabupaten tidak tertulis)'; src = 'outlet IJ tanpa kecamatan'
        elif oid: kab = '(outlet ber-ID, kabupaten tidak diketahui)'; src = 'ID tanpa atribut'
        else: kab = '(tanpa ID outlet)'; src = 'tanpa ID'
        pv = province(kab) if not kab.startswith('(') else '(tidak diketahui)'
        o = orig[(pv, kab)]; o['all'] += 1; o['gt25'] += g; o['IM3'] += b == 'IM3'; o['3ID'] += b == '3ID'
        prov_dest[pv][dest] += 1
        if row['outlet_sales_area']: area_sales[row['outlet_sales_area']][pv] += 1
print('GA at IJ sites', n)
tot = C.Counter()
for (pv, kab), o in orig.items(): tot[pv] += o['all']
print('by province', tot.most_common())
out = 'docs/assessments/ga_site_rguga'
with open(out + '/tag_origin_province_kabupaten.csv', 'w', newline='') as fh:
    w = csv.writer(fh); w.writerow(['provinsi_outlet', 'kabupaten_kota_outlet', 'ga_all', 'pct_of_ga_ij', 'ga_usage_gt25', 'im3', '3id'])
    for (pv, kab), o in sorted(orig.items(), key=lambda x: (-tot[x[0][0]] if not x[0][0].startswith('(') else 0, -x[1]['all'])): w.writerow([pv, kab, o['all'], round(o['all'] / n * 100, 2), o['gt25'], o['IM3'], o['3ID']])
areas = sorted({a for d in prov_dest.values() for a in d})
with open(out + '/tag_origin_province_to_destination_area.csv', 'w', newline='') as fh:
    w = csv.writer(fh); w.writerow(['provinsi_outlet'] + areas + ['total'])
    for pv, d in sorted(prov_dest.items(), key=lambda x: -sum(x[1].values())): w.writerow([pv] + [d[a] for a in areas] + [sum(d.values())])
for (pv, kab), o in sorted(orig.items(), key=lambda x: -x[1]['all'])[:40]: print(pv, '|', kab, o['all'], o['gt25'])
print('dest kab', dest_kab.most_common())
print({pv: dict(d) for pv, d in prov_dest.items()})
