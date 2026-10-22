#!/usr/bin/env python3
"""Assessment helper (22 Oct 2026): raw/GA*/Site_rguga_daily_outlet_202610.csv (MSISDN-level GA, activation site vs tagging outlet).
Not part of the daily refresh and writes nothing the app reads. Prints the figures of docs/assessments/ga_site_rguga_assessment.md and writes the
aggregate CSVs in docs/assessments/ga_site_rguga/ (no MSISDN). Run from the project root: python3 scripts/assess_site_rguga.py"""
import os, subprocess, tempfile
_tmp = tempfile.mkdtemp()
os.environ['S'] = _tmp
subprocess.run(['node', '-e', """global.window=global;require('./website/data/ga_feed.js');const F=GA_FEED,fs=require('fs');
fs.writeFileSync(process.env.S+'/feed.json',JSON.stringify({loc_keys:F.metadata.loc_keys,mc_info:F.metadata.mc_info,outlets:F.outlets.map(r=>({i:r.i,b:r.b,k:r.k,t:r.t,sg:r.sg,mc:r.mc,br:r.br,dse:r.dse,lk:r.lk,o:r.o,n:r.n})),tkec:(F.metadata.target||{}).kec}))"""], check=True)

# ---- part 1: origin matrix, usage rule, relations ----
import os, csv, glob, json, collections as C
S=os.environ['S']; F=json.load(open(S+'/feed.json'))
nid=lambda v: str(v or '').strip().upper().replace('.0','') if str(v or '').strip().endswith('.0') else str(v or '').strip().upper()
def nid(v):
    v=str(v or '').strip().upper()
    if v.endswith('.0'): v=v[:-2]
    return v.lstrip('0')
fo={(r['b'],nid(r['i'])):r for r in F['outlets']}
mapping={r['micro_cluster']:r for r in csv.DictReader(open('data/catalogues/gaplok_location_mapping.csv'))}
mc_area={m:r['master_branch'] for m,r in mapping.items()}
M=list(csv.DictReader(open('data/catalogues/territory_management_master.csv')))
site_mc=C.defaultdict(C.Counter)
for r in M:
    if r['site_nbs'] and r['micro_cluster']: site_mc[r['site_nbs']][r['micro_cluster']]+=1
f=glob.glob('raw/GA*/Site_rguga_daily_outlet_202610.csv')[0]
# pass A: IJ kecamatan universe
U=set(F['loc_keys']); [U.add(t['kk']) for t in F['tkec'] or []]
kec_mc=C.defaultdict(C.Counter)
for t in F['tkec'] or []: kec_mc[t['kk']][t['mc']]+=100000
with open(f,newline='',encoding='utf-8') as fh:
    for row in csv.DictReader(fh):
        if row['outlet_micro_cluster'] in mapping:
            k=row['outlet_kec_kabkot']; U.add(k); kec_mc[k][row['outlet_micro_cluster']]+=1
print('IJ kecamatan universe',len(U))
# kecamatan names only (kecamatan part) for fuzzy
Ukec={k.split('|')[0] for k in U}
out=C.Counter(); 
def rel(o_mc,a_mcs):
    if o_mc in a_mcs: return 'same_MC'
    oa=mc_area.get(o_mc); aa={mc_area.get(m) for m in a_mcs}
    return 'same_area_diff_MC' if oa in aa else 'diff_area_IJ'
M2=C.Counter(); BQ=C.Counter(); notfound=C.Counter(); siteagree=C.Counter()
site_rows=C.Counter(); site_name={}; kec_rows=C.Counter(); mc_rows=C.Counter(); area_rows=C.Counter()
dse=C.defaultdict(lambda:C.Counter()); dseinfo={}
daily=C.defaultdict(C.Counter); leak=C.Counter(); inflow=C.Counter(); inflow_blank=C.Counter()
rel_area=C.Counter(); usage=C.defaultdict(C.Counter)
with open(f,newline='',encoding='utf-8') as fh:
    for row in csv.DictReader(fh):
        b=row['ga_brand']; oid=nid(row['outlet_id']); omc=row['outlet_micro_cluster']
        fr=fo.get((b,oid))
        # outlet origin
        if fr is not None or omc in mapping: o='IJ'; 
        elif omc: o='nonIJ_known'
        elif oid: o='unknown_meta'
        else: o='no_outlet_id'
        o_mc = omc if omc in mapping else (fr['mc'] if fr else '')
        ak=row['activation_kec_kabkot']; sid=row['activation_site_id']
        if not ak: a='act_null'
        elif ak in U: a='IJ'
        else: a='nonIJ'
        mb=row['datavol_mb']; u='null' if mb=='' else ('gt25' if float(mb)>25 else 'le25')
        M2[(o,a)]+=1; usage[(o,a)][u]+=1; BQ[(b,o,a)]+=1
        d=int(row['ga_dt'][8:]); daily[(o,a)][d]+=1
        # site-level IJ flag vs kecamatan-level
        sj = sid in site_mc
        siteagree[(a,'site_in_master' if sj else 'site_not_master')]+=1
        if a=='IJ':
            site_rows[sid]+=1; site_name[sid]=(row['activation_site_name'],ak); kec_rows[ak]+=1
            amcs=set(site_mc[sid]) if sj else set(m for m,_ in kec_mc[ak].most_common(1))
            amc=(site_mc[sid].most_common(1)[0][0] if sj else (kec_mc[ak].most_common(1)[0][0] if kec_mc[ak] else '?'))
            mc_rows[amc]+=1; area_rows[mc_area.get(amc,'?')]+=1
            if o=='IJ' and o_mc:
                r=rel(o_mc,amcs); rel_area[(r,'site' if sj else 'kec')]+=1; inflow[r]+=1
                rel_area[('pair',mc_area.get(o_mc),mc_area.get(amc))]+=1
            elif o!='IJ':
                inflow[o]+=1
                if o=='nonIJ_known': inflow_blank[(row['outlet_sales_area'])]+=1
        if o=='IJ' and a=='nonIJ': leak[row['activation_kabkot']]+=1
        if o=='IJ':
            nm=fr['dse'] if fr else ''
            dse[nm][('tot')]+=1
            dse[nm][('IJ_'+rel(o_mc,set(site_mc[sid]) if sj else set(m for m,_ in kec_mc[ak].most_common(1))) ) if a=='IJ' else ('nonIJ' if a=='nonIJ' else 'act_null')]+=1
            dseinfo[nm]=(fr['mc'] if fr else o_mc, fr['br'] if fr else mc_area.get(o_mc,''))
print('MATRIX outlet x activation'); [print(' ',k,v) for k,v in sorted(M2.items())]
print('usage by cell',{k:dict(v) for k,v in usage.items()})
print('site_agree',siteagree)
print('inflow into IJ sites',inflow); print('rel',rel_area.most_common(40))
print('nonIJ_known outlets area',inflow_blank.most_common(15))
print('IJ outlet activated outside IJ: kabkot',leak.most_common(15))
print('IJ activation rows by area',area_rows); print('sites with IJ activation',len(site_rows),'kecamatan',len(kec_rows))
print('top sites',[(s,site_name[s],n) for s,n in site_rows.most_common(5)])
json.dump({'M2':{'|'.join(k):v for k,v in M2.items()},'area_rows':area_rows,'mc_rows':mc_rows,'dse':{k:dict(v) for k,v in dse.items()},'dseinfo':dseinfo,'site_rows':site_rows,'site_name':site_name,'kec_rows':kec_rows,'leak':leak,'daily':{ '|'.join(k):dict(v) for k,v in daily.items()},'usage':{'|'.join(k):dict(v) for k,v in usage.items()},'BQ':{'|'.join(k):v for k,v in BQ.items()},'rel_area':{'|'.join(map(str,k)):v for k,v in rel_area.items()},'inflow_blank':inflow_blank},open(S+'/p4.json','w'))

# ---- part 2: per-area, per-MC, per-DSE and per-site outputs ----

def nid(v):
    v=str(v or '').strip().upper()
    if v.endswith('.0'): v=v[:-2]
    return v.lstrip('0')
fo={(r['b'],nid(r['i'])):r for r in F['outlets']}
mapping={r['micro_cluster']:r for r in csv.DictReader(open('data/catalogues/gaplok_location_mapping.csv'))}
mc_area={m:r['master_branch'] for m,r in mapping.items()}
M=list(csv.DictReader(open('data/catalogues/territory_management_master.csv')))
site_mc=C.defaultdict(C.Counter)
for r in M:
    if r['site_nbs'] and r['micro_cluster']: site_mc[r['site_nbs']][r['micro_cluster']]+=1
U=set(F['loc_keys']); [U.add(t['kk']) for t in F['tkec'] or []]
kec_mc=C.defaultdict(C.Counter)
for t in F['tkec'] or []: kec_mc[t['kk']][t['mc']]+=100000
f=glob.glob('raw/GA*/Site_rguga_daily_outlet_202610.csv')[0]
tier=C.Counter(); tagmc=C.Counter(); dsemcs=C.defaultdict(C.Counter); pt=C.defaultdict(C.Counter); dayu=C.defaultdict(C.Counter); 
pair=C.Counter(); mcflow=C.defaultdict(lambda:C.Counter()); dsetab=C.defaultdict(C.Counter); dsemc={}
brand=C.Counter(); site=C.defaultdict(lambda:C.Counter()); siteinfo={}
areaT=C.Counter(); areaS=C.Counter(); kecS=C.defaultdict(C.Counter)
with open(f,newline='',encoding='utf-8') as fh:
    for row in csv.DictReader(fh):
        b=row['ga_brand']; oid=nid(row['outlet_id']); omc=row['outlet_micro_cluster']; fr=fo.get((b,oid))
        mb=row['datavol_mb']; u='null' if mb=='' else ('gt25' if float(mb)>25 else 'le25'); d=int(row['ga_dt'][8:])
        dayu[d][u]+=1
        if omc in mapping: pt[omc][row['partner_name']]+=1
        ij_o = fr is not None or omc in mapping
        o_mc = omc if omc in mapping else (fr['mc'] if fr else '')
        ak=row['activation_kec_kabkot']; sid=row['activation_site_id']; a_ij = ak in U if ak else False
        if a_ij:
            sj=sid in site_mc
            amc=(site_mc[sid].most_common(1)[0][0] if sj else (kec_mc[ak].most_common(1)[0][0] if kec_mc[ak] else '?'))
            amcs=set(site_mc[sid]) if sj else {amc}
            aarea=mc_area.get(amc,'?')
            kecS[ak][(b,u)]+=1
            site[sid][('tot')]+=1; site[sid][('gt25' if u=='gt25' else 'oth')]+=1
            siteinfo[sid]=(row['activation_site_name'],ak,amc,aarea,sj)
            areaS[aarea]+=1; brand[(b,'IJsite',u)]+=1
            if ij_o:
                r='same_MC' if o_mc in amcs else ('same_area_diff_MC' if mc_area.get(o_mc)==aarea else 'diff_area_IJ')
                pair[(mc_area.get(o_mc),aarea)]+=1; mcflow[o_mc][('out_to',amc)]+=1; mcflow[amc][('in_from',o_mc)]+=1
                brand[(b,'IJtag->IJsite',u)]+=1
            else:
                kind='nonIJ_known' if omc else ('unknown_meta' if oid else 'no_outlet_id')
                mcflow[amc][('in_from',kind)]+=1; brand[(b,'ext->IJsite',u)]+=1
        if ij_o:
            nm=fr['dse'] if fr else '(tanpa DSE di master)'
            pass
            areaT[mc_area.get(o_mc,'?')]+=1; tagmc[o_mc]+=1; dsemcs[nm][o_mc]+=1
            if not ak: c='act_null'
            elif not a_ij: c='outside_IJ'
            else: c=r
            dsetab[nm][c]+=1; dsetab[nm]['tot']+=1; tier[((fr['t'],fr['sg']) if fr else ('x','x'),c)]+=1
            if u=='gt25': dsetab[nm]['gt25']+=1
print('PT per IJ MC:',{m:dict(c) for m,c in pt.items() if len(c)>1}, 'IJ MC with PT',len(pt))
print('day usage', {d:dict(v) for d,v in sorted(dayu.items())})
print('areaT',dict(areaT),'areaS',dict(areaS))
areas=sorted(areaT)
print('PAIR (tag area -> site area)'); 
for a in areas: print(a,[pair[(a,b)] for b in areas])
print('brand',dict(brand))
print('sites IJ',len(site),'top10 share',sum(n for _,n in sorted(((s,c['tot']) for s,c in site.items()),key=lambda x:-x[1])[:10])/sum(c['tot'] for c in site.values()))
import statistics
tots=sorted(c['tot'] for c in site.values()); print('site GA median',statistics.median(tots),'p90',tots[int(.9*len(tots))],'max',tots[-1], 'sites>=1',len(tots), 'site with >=10',sum(1 for t in tots if t>=10))
print('sites not in master',sum(1 for s,i in siteinfo.items() if not i[4]), 'rows',sum(site[s]['tot'] for s,i in siteinfo.items() if not i[4]))
# DSE CSV
os.makedirs('docs/assessments/ga_site_rguga',exist_ok=True)
cols=['tot','same_MC','same_area_diff_MC','diff_area_IJ','outside_IJ','act_null','gt25']
with open('docs/assessments/ga_site_rguga/dse_origin_vs_site.csv','w',newline='') as fh:
    w=csv.writer(fh); w.writerow(['dse','area','mc']+['ga_tagged_all','ga_site_same_mc','ga_site_same_area_diff_mc','ga_site_diff_area_ij','ga_site_outside_ij','ga_site_unknown','ga_tagged_usage_gt25','pct_in_ij'])
    for nm,c in sorted(dsetab.items(),key=lambda x:-x[1]['tot']):
        inij=c['same_MC']+c['same_area_diff_MC']+c['diff_area_IJ']
        mm=dsemcs[nm].most_common(1)[0][0]; w.writerow([nm,'' if nm=='UNASSIGNED' else mc_area.get(mm,''),mm if len(dsemcs[nm])==1 or nm!='UNASSIGNED' else '(banyak MC)']+[c[k] for k in cols]+[round(inij/c['tot']*100,1) if c['tot'] else ''])
print('DSE rows',len(dsetab))
with open('docs/assessments/ga_site_rguga/site_ga_inner_jakarta.csv','w',newline='') as fh:
    w=csv.writer(fh); w.writerow(['activation_site_id','site_name','kec_kabkot','mc','area','site_in_master','ga_all','ga_usage_gt25'])
    for s,c in sorted(site.items(),key=lambda x:-x[1]['tot']): i=siteinfo[s]; w.writerow([s,i[0],i[1],i[2],i[3],int(i[4]),c['tot'],c['gt25']])
with open('docs/assessments/ga_site_rguga/mc_inflow_outflow.csv','w',newline='') as fh:
    w=csv.writer(fh); w.writerow(['mc','area','ga_tagged_in_mc_outlets','ga_site_in_mc','from_same_mc','from_other_ij_mc','from_non_ij_known','from_unknown_outlet','from_no_outlet_id'])
    tag=tagmc
    for m in sorted(mapping):
        fl=mcflow[m]; same=fl[('in_from',m)]; other=sum(v for (k,x),v in fl.items() if k=='in_from' and x in mapping and x!=m)
        w.writerow([m,mc_area[m],tag[m],sum(v for (k,x),v in fl.items() if k=='in_from'),same,other,fl[('in_from','nonIJ_known')],fl[('in_from','unknown_meta')],fl[('in_from','no_outlet_id')]])

print('TIER',sorted(tier.items(),key=str))

