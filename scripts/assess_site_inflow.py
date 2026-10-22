#!/usr/bin/env python3
"""Assessment helper (22 Oct 2026): who supplies the GA activated in Inner Jakarta sites, and which MC / DSE / site / kecamatan receives the most GA from outside.
Reads raw/GA*/Site_rguga_daily_outlet_202610.csv (MSISDN-level, never copied) and the master; writes aggregate CSVs to docs/assessments/ga_site_rguga/.
Run from the project root: python3 scripts/assess_site_inflow.py   (needs docs/assessments/ga_site_rguga_assessment.md rules: activation kecamatan in the 121 IJ kecamatan = IJ)."""
import os, csv, glob, json, subprocess, tempfile, collections as C
tmp = tempfile.mkdtemp()
subprocess.run(['node', '-e', """global.window=global;require('./website/data/ga_feed.js');const F=GA_FEED,fs=require('fs');
fs.writeFileSync(process.argv[1]+'/feed.json',JSON.stringify({loc_keys:F.metadata.loc_keys,outlets:F.outlets.map(r=>({i:r.i,b:r.b,mc:r.mc,t:r.t})),tkec:(F.metadata.target||{}).kec}))""", tmp], check=True)
F = json.load(open(tmp + '/feed.json'))
def nid(v):
    v = str(v or '').strip().upper()
    if v.endswith('.0'): v = v[:-2]
    return v.lstrip('0')
fo = {(r['b'], nid(r['i'])): r for r in F['outlets']}
mapping = {r['micro_cluster']: r for r in csv.DictReader(open('data/catalogues/gaplok_location_mapping.csv'))}
mc_area = {m: r['master_branch'] for m, r in mapping.items()}; mc_hoa = {m: r['hoa_leader'] for m, r in mapping.items()}
dso_of = {}
for r in csv.DictReader(open('data/catalogues/dso_territory_mapping.csv')): dso_of.setdefault(r['micro_cluster'], []).append(r['nama_dso'])
M = list(csv.DictReader(open('data/catalogues/territory_management_master.csv')))
site_mc, site_dse, site_dso = C.defaultdict(C.Counter), C.defaultdict(C.Counter), C.defaultdict(C.Counter)
for r in M:
    s = r['site_nbs']
    if not s: continue
    if r['micro_cluster']: site_mc[s][r['micro_cluster']] += 1
    if r['dse_name']: site_dse[s][r['dse_name']] += 1
    if r['dso_leader']: site_dso[s][r['dso_leader']] += 1
U = set(F['loc_keys']); [U.add(t['kk']) for t in F['tkec'] or []]
kec_mc = C.defaultdict(C.Counter)
for t in F['tkec'] or []: kec_mc[t['kk']][t['mc']] += 100000
BANTEN = ('TANGERANG', 'SERANG', 'CILEGON', 'PANDEGLANG', 'LEBAK')
prov = lambda kab: 'BANTEN' if any(x in kab for x in BANTEN) else 'JAWA BARAT / LAINNYA'
f = glob.glob('raw/GA*/Site_rguga_daily_outlet_202610.csv')[0]
sup_area, sup_kab, sup_prov, sup_class = C.Counter(), C.Counter(), C.Counter(), C.Counter()
sup_area_g, sup_kab_g = C.Counter(), C.Counter()
site_t = C.defaultdict(C.Counter); site_src = C.defaultdict(C.Counter); siteinfo = {}
dse_alloc = C.defaultdict(C.Counter); mcT = C.defaultdict(C.Counter); mc_src = C.defaultdict(C.Counter)
sup_dse = C.Counter()
n_ij = 0
with open(f, newline='', encoding='utf-8') as fh:
    for row in csv.DictReader(fh):
        ak = row['activation_kec_kabkot']
        if not ak or ak not in U: continue
        b = row['ga_brand']; oid = nid(row['outlet_id']); omc = row['outlet_micro_cluster']; fr = fo.get((b, oid))
        mb = row['datavol_mb']; g = mb != '' and float(mb) > 25
        sid = row['activation_site_id']; sj = sid in site_mc
        amc = site_mc[sid].most_common(1)[0][0] if sj else (kec_mc[ak].most_common(1)[0][0] if kec_mc[ak] else '?')
        n_ij += 1
        if fr is not None or omc in mapping:
            o_mc = omc if omc in mapping else fr['mc']; cls = 'IJ_same_MC' if o_mc == amc else ('IJ_same_area_other_MC' if mc_area.get(o_mc) == mc_area.get(amc) else 'IJ_other_area')
            oarea = mc_area.get(o_mc, '(MC tidak dikenal)'); okab = row['outlet_kabkot'] or '(IJ, kabupaten dari master)'
            if fr is not None and not row['outlet_kabkot']: okab = '(IJ)'
        elif omc: cls = 'NONIJ_known'; oarea = row['outlet_sales_area']; okab = row['outlet_kabkot']
        elif oid: cls = 'NONIJ_unknown_meta'; oarea = '(outlet ber-ID, area tidak diketahui)'; okab = '(tidak diketahui)'
        else: cls = 'NONIJ_no_outlet_id'; oarea = '(tanpa ID outlet)'; okab = '(tidak diketahui)'
        sup_class[cls] += 1; sup_area[oarea] += 1; sup_kab[okab] += 1
        if g: sup_area_g[oarea] += 1; sup_kab_g[okab] += 1
        if cls.startswith('NONIJ_known'): sup_prov[prov(okab)] += 1
        elif cls == 'NONIJ_unknown_meta': sup_prov['(tidak diketahui)'] += 1
        # inflow = GA at the site sold by an outlet NOT tagged to the site's MC
        inflow = cls != 'IJ_same_MC'
        site_t[sid]['tot'] += 1
        if inflow:
            site_t[sid]['in'] += 1; site_t[sid]['in_ext'] += cls.startswith('NONIJ'); site_src[sid][oarea] += 1
            mcT[amc]['in'] += 1; mcT[amc]['in_ext'] += cls.startswith('NONIJ'); mc_src[amc][oarea] += 1
            if sj and site_dse[sid]:
                tot = sum(site_dse[sid].values())
                for d, c in site_dse[sid].items(): dse_alloc[d]['in'] += c / tot; dse_alloc[d]['in_ext'] += (c / tot) if cls.startswith('NONIJ') else 0
            else: dse_alloc['(site di luar master: tanpa DSE)']['in'] += 1
        mcT[amc]['tot'] += 1
        if sj and site_dse[sid]:
            tot = sum(site_dse[sid].values())
            for d, c in site_dse[sid].items(): dse_alloc[d]['tot'] += c / tot
        siteinfo[sid] = (row['activation_site_name'], ak, amc, sj)
print('GA at IJ sites', n_ij); print('by supplier class', dict(sup_class))
print('provinsi (non-IJ dengan atribut)', dict(sup_prov))
out = 'docs/assessments/ga_site_rguga'; os.makedirs(out, exist_ok=True)
def w(name, head, rows):
    with open(os.path.join(out, name), 'w', newline='') as fh: wr = csv.writer(fh); wr.writerow(head); wr.writerows(rows)
w('supplier_area_into_ij_sites.csv', ['outlet_area', 'ga_all', 'ga_usage_gt25'], [(a, n, sup_area_g[a]) for a, n in sup_area.most_common()])
w('supplier_kabupaten_into_ij_sites.csv', ['outlet_kabupaten', 'ga_all', 'ga_usage_gt25'], [(a, n, sup_kab_g[a]) for a, n in sup_kab.most_common()])
dsoname = lambda mc, sid=None: (site_dso[sid].most_common(1)[0][0] if sid and site_dso.get(sid) else ' / '.join(dso_of.get(mc, [])))
w('inflow_by_mc.csv', ['mc', 'area', 'hoa', 'dso', 'ga_at_sites', 'ga_inflow_outside_mc', 'pct_inflow', 'of_which_non_ij', 'top_source_areas'],
  [(m, mc_area.get(m, ''), mc_hoa.get(m, ''), ' / '.join(dso_of.get(m, [])), v['tot'], v['in'], round(v['in'] / v['tot'] * 100, 1), v['in_ext'], '; '.join('%s %d' % x for x in mc_src[m].most_common(3))) for m, v in sorted(mcT.items(), key=lambda x: -x[1]['in'])])
w('inflow_by_dse.csv', ['dse', 'ga_at_dse_sites_allocated', 'ga_inflow_outside_mc_allocated', 'of_which_non_ij'], [(d, round(v['tot']), round(v['in']), round(v['in_ext'])) for d, v in sorted(dse_alloc.items(), key=lambda x: -x[1]['in'])])
rowsS = []
for s, v in sorted(site_t.items(), key=lambda x: -x[1]['in']):
    nm, ak, amc, sj = siteinfo[s]; d = site_dse[s].most_common(3) if sj else []
    rowsS.append((s, nm, ak, amc, mc_area.get(amc, ''), dsoname(amc, s if sj else None), '; '.join('%s (%d outlet)' % x for x in d) or '(site di luar master)', v['tot'], v['in'], round(v['in'] / v['tot'] * 100, 1), v['in_ext'], '; '.join('%s %d' % x for x in site_src[s].most_common(2))))
w('inflow_by_site.csv', ['site_id', 'site_name', 'kecamatan', 'mc', 'area', 'dso', 'dse_top3', 'ga_at_site', 'ga_inflow_outside_mc', 'pct_inflow', 'of_which_non_ij', 'top_source_areas'], rowsS)
kec = C.defaultdict(C.Counter); kdse = C.defaultdict(C.Counter); kmc = C.defaultdict(C.Counter)
for s, v in site_t.items():
    nm, ak, amc, sj = siteinfo[s]; kec[ak]['tot'] += v['tot']; kec[ak]['in'] += v['in']; kec[ak]['in_ext'] += v['in_ext']; kmc[ak][amc] += v['in']
    if sj and v['in']:
        tot = sum(site_dse[s].values())
        for d, c in site_dse[s].items(): kdse[ak][d] += v['in'] * c / tot
rowsK = []
for k, v in sorted(kec.items(), key=lambda x: -x[1]['in']):
    mcs = [m for m, _ in kmc[k].most_common(2)] or [kec_mc[k].most_common(1)[0][0]]
    rowsK.append((k, ' / '.join(mcs), mc_area.get(mcs[0], ''), ' / '.join(sorted({x for m in mcs for x in dso_of.get(m, [])})), '; '.join('%s %d' % (d, round(n)) for d, n in kdse[k].most_common(3)), v['tot'], v['in'], round(v['in'] / v['tot'] * 100, 1), v['in_ext']))
w('inflow_by_kecamatan.csv', ['kecamatan', 'mc', 'area', 'dso', 'dse_top3_by_allocated_inflow', 'ga_at_kecamatan', 'ga_inflow_outside_mc', 'pct_inflow', 'of_which_non_ij'], rowsK)
print('top areas', sup_area.most_common(14)); print('top kab', sup_kab.most_common(14))
print('top MC inflow', [(m, v['in'], v['tot'], v['in_ext']) for m, v in sorted(mcT.items(), key=lambda x: -x[1]['in'])[:8]])
print('top kec', rowsK[:8]); print('top site', rowsS[:6])
print('top dse', [(d, round(v['in']), round(v['in_ext'])) for d, v in sorted(dse_alloc.items(), key=lambda x: -x[1]['in'])[:8]])
