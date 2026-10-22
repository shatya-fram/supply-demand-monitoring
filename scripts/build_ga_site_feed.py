#!/usr/bin/env python3
"""
build_ga_site_feed.py  ·  GA by ACTIVATION SITE vs TAGGING OUTLET (MSISDN-level RGU GA, Inner Jakarta)

Source : raw/GA*/Site_rguga_daily_outlet_<YYYYMM>.csv  (one row = one GA MSISDN: tagging outlet + activation site).  The MSISDN never leaves this script:
         the feed holds counts only.
Rules  : docs/assessments/ga_site_rguga_assessment.md
  * Inner Jakarta (IJ) activation = activation kecamatan in the 121 kecamatan of the GA target list (M2S KECAMATAN, the same list as Daily_RGUGA); incl. Kepulauan Seribu.
  * IJ tagging outlet = (brand, outlet id without leading zeros) is an outlet of ga_feed (Daily_RGUGA) or its micro cluster is one of the 36 IJ MCs.
  * Origin class of a GA activated at an IJ site (MC of the site = main micro cluster of the master outlets at the site, else the MC of the kecamatan):
      S same MC · A same area, other MC · X other IJ area · N outlet outside IJ with attributes · U outlet id without attributes · Z no outlet id
    Inflow ("kemasukan") = every class except S; inflow from outside IJ = N + U + Z.
  * Outflow ("pengiriman") = GA of IJ tagging outlets activated outside IJ (O), or with no activation site (Z).
Output : website/data/ga_site_feed.js  (GA_SITE_FEED)
Usage  : python3 scripts/build_ga_site_feed.py   (run from the project root; reads raw/ from the working directory, everything else from the script's project)
"""
import csv, glob, json, os, subprocess, sys, tempfile, collections as C
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_BASE = os.getcwd()
CLS = 'SAXNUZ'
PROV = {}
for p, names in {
    'JAWA BARAT': 'BOGOR;BANDUNG;KOTA BOGOR;KOTA BANDUNG;CIANJUR;CIREBON;BANDUNG BARAT;BANJAR;GARUT;SUKABUMI;SUBANG;KOTA CIREBON;KOTA CIMAHI;INDRAMAYU;KOTA TASIKMALAYA;KUNINGAN;TASIKMALAYA;SUMEDANG;PURWAKARTA;MAJALENGKA;KOTA SUKABUMI;CIAMIS;PANGANDARAN;KARAWANG;BEKASI;KOTA BEKASI;KOTA DEPOK',
    'DKI JAKARTA': 'JAKARTA TIMUR;JAKARTA BARAT;JAKARTA SELATAN;JAKARTA UTARA;JAKARTA PUSAT;KEPULAUAN SERIBU',
    'BANTEN': 'TANGERANG;KOTA TANGERANG;KOTA TANGERANG SELATAN;KOTA SERANG;KOTA CILEGON;SERANG;LEBAK;PANDEGLANG',
    'JAWA TENGAH': 'JEPARA;MAGELANG;TEGAL;KUDUS;DEMAK;BANYUMAS;BREBES;KENDAL;KOTA SURAKARTA;KOTA SEMARANG;TEMANGGUNG;SUKOHARJO;BATANG;BANJARNEGARA;CILACAP;PEMALANG;PURBALINGGA;BOYOLALI;KLATEN;KEBUMEN;GROBOGAN;BLORA;KARANGANYAR;PURWOREJO;SRAGEN;KOTA SALATIGA;PEKALONGAN;SEMARANG;WONOGIRI;PATI;KOTA PEKALONGAN;KOTA TEGAL;WONOSOBO;REMBANG;KOTA MAGELANG',
    'JAWA TIMUR': 'TUBAN;KOTA SURABAYA;GRESIK;MALANG;KEDIRI;KOTA KEDIRI;MAGETAN;BOJONEGORO;SIDOARJO;JOMBANG;TULUNGAGUNG;NGANJUK;JEMBER;NGAWI;MOJOKERTO;MADIUN;KOTA MALANG;PROBOLINGGO;KOTA MOJOKERTO;LAMONGAN;PASURUAN;BANYUWANGI;PONOROGO;SAMPANG;PAMEKASAN;LUMAJANG;KOTA BLITAR;BLITAR;KOTA PASURUAN;SUMENEP',
    'DI YOGYAKARTA': 'SLEMAN;BANTUL;KOTA YOGYAKARTA', 'BALI': 'BULELENG;BADUNG;TABANAN;KOTA DENPASAR;KARANGASEM',
    'SULAWESI SELATAN': 'BULUKUMBA;LUWU;KEPULAUAN SELAYAR;WAJO;KOTA MAKASSAR;SIDENRENG RAPPANG;PINRANG;KOTA PARE PARE;TAKALAR;KOTA PALOPO;SOPPENG;GOWA',
    'SULAWESI TENGAH': 'POSO;KOTA PALU;DONGGALA;MOROWALI;TOLITOLI;TOJO UNA-UNA', 'SULAWESI UTARA': 'MINAHASA SELATAN;KOTA KOTAMOBAGU;MINAHASA;KOTA MANADO',
    'KALIMANTAN SELATAN': 'TANAH LAUT;HULU SUNGAI UTARA;KOTA BANJARMASIN;TANAH BUMBU;KOTA BANJARBARU;KOTABARU;BARITO KUALA',
    'KALIMANTAN BARAT': 'BENGKAYANG;KETAPANG;KOTA SINGKAWANG;KOTA PONTIANAK;LANDAK;KUBU RAYA', 'KALIMANTAN TENGAH': 'KOTAWARINGIN TIMUR;KOTA PALANGKARAYA',
    'KALIMANTAN TIMUR': 'PASER;KUTAI BARAT;KUTAI TIMUR;KOTA BALIKPAPAN', 'RIAU': 'KOTA PEKANBARU;INDRAGIRI HULU;KAMPAR;INDRAGIRI HILIR;BENGKALIS;PELALAWAN',
    'KEPULAUAN RIAU': 'KOTA BATAM;BINTAN;KOTA TANJUNGPINANG',
    'SUMATERA UTARA': 'SIMALUNGUN;DELI SERDANG;KOTA MEDAN;LABUHANBATU;KOTA PADANG SIDIMPUAN;KOTA PEMATANGSIANTAR;TAPANULI SELATAN;MANDAILING NATAL;PADANG LAWAS;TAPANULI UTARA;TOBA SAMOSIR;KOTA GUNUNGSITOLI;NIAS;NIAS UTARA;SAMOSIR;PADANG LAWAS UTARA',
    'SUMATERA SELATAN': 'OGAN KOMERING ULU SELATAN;PENUKAL ABAB LEMATANG ILIR;KOTA PALEMBANG;OGAN KOMERING ULU TIMUR;MUARA ENIM;OGAN KOMERING ILIR;BANYUASIN',
    'LAMPUNG': 'LAMPUNG TIMUR;LAMPUNG SELATAN;KOTA BANDAR LAMPUNG;WAY KANAN;LAMPUNG TENGAH;PRINGSEWU', 'BENGKULU': 'KAUR;KOTA BENGKULU', 'MALUKU': 'KOTA AMBON;MALUKU TENGAH',
    'NTB': 'KOTA MATARAM', 'KEP. BANGKA BELITUNG': 'BANGKA', 'PAPUA': 'MIMIKA', 'NTT': 'SUMBA TIMUR;MANGGARAI', 'JAMBI': 'KOTA JAMBI', 'ACEH': 'ACEH BESAR;PIDIE;ACEH TIMUR'}.items():
    for n in names.split(';'):
        PROV[n] = p


def nid(v):
    v = str(v or '').strip().upper()
    if v.endswith('.0'):
        v = v[:-2]
    return v.lstrip('0')


def find_csv():
    hits = sorted(glob.glob(os.path.join(RAW_BASE, 'raw', 'GA*', 'Site_rguga_daily_outlet_*.csv')), key=os.path.getmtime, reverse=True)
    if not hits:
        sys.exit('Site_rguga_daily_outlet_*.csv tidak ditemukan di raw/GA*/')
    return hits[0]


def main():
    tmp = tempfile.mkdtemp()
    subprocess.run(['node', '-e', """global.window=global;require(process.argv[2]+'/website/data/ga_feed.js');const F=GA_FEED,fs=require('fs');
fs.writeFileSync(process.argv[1]+'/feed.json',JSON.stringify({cut:F.metadata.cut_day,loc_keys:F.metadata.loc_keys,mc_info:F.metadata.mc_info,outlets:F.outlets.map(r=>({i:r.i,b:r.b,mc:r.mc,t:r.t,sg:r.sg,lk:r.lk})),tkec:(F.metadata.target||{}).kec}))""", tmp, ROOT], check=True)
    F = json.load(open(tmp + '/feed.json'))
    fo = {(r['b'], nid(r['i'])): r for r in F['outlets']}
    mapping = {r['micro_cluster']: r for r in csv.DictReader(open(os.path.join(ROOT, 'data/catalogues/gaplok_location_mapping.csv')))}
    mc_area = {m: r['master_branch'] for m, r in mapping.items()}
    mi = F['mc_info']
    M = list(csv.DictReader(open(os.path.join(ROOT, 'data/catalogues/territory_management_master.csv'))))
    site_mc, site_dse = C.defaultdict(C.Counter), C.defaultdict(C.Counter)
    for r in M:
        s = r['site_nbs']
        if s:
            if r['micro_cluster']:
                site_mc[s][r['micro_cluster']] += 1
            if r['dse_name']:
                site_dse[s][r['dse_name']] += 1
    U = set(F['loc_keys'])
    kec_mc = C.defaultdict(C.Counter)
    for t in F['tkec'] or []:
        U.add(t['kk'])
        kec_mc[t['kk']][t['mc']] += 100000
    path = find_csv()
    B = {'IM3': 0, '3ID': 1}
    vec = lambda: [0] * 12
    site, kec, mcv = C.defaultdict(vec), C.defaultdict(vec), C.defaultdict(vec)
    sinfo, kinfo = {}, {}
    mat = C.defaultdict(lambda: [0, 0])
    sup_area, sup_kab, sup_prov = C.defaultdict(lambda: [0, 0]), C.defaultdict(lambda: [0, 0]), C.defaultdict(lambda: [0, 0])
    out_area, out_mc, out_seg = C.defaultdict(lambda: [0] * 10), C.defaultdict(lambda: [0] * 10), C.defaultdict(lambda: [0] * 10)
    dest_kab, dest_prov, dest_site = C.defaultdict(lambda: [0, 0]), C.defaultdict(lambda: [0, 0]), C.defaultdict(lambda: [0, 0])
    dsite_info, dkab_src = {}, C.defaultdict(C.Counter)
    days, n_rows, d_lo, d_hi = C.Counter(), 0, '9', '0'
    with open(path, newline='', encoding='utf-8') as fh:
        for row in csv.DictReader(fh):
            n_rows += 1
            b = B[row['ga_brand']]
            d_lo, d_hi = min(d_lo, row['ga_dt']), max(d_hi, row['ga_dt'])
            oid, omc = nid(row['outlet_id']), row['outlet_micro_cluster']
            fr = fo.get((row['ga_brand'], oid))
            o_ij = fr is not None or omc in mapping
            o_mc = (omc if omc in mapping else fr['mc']) if o_ij else ''
            ak = row['activation_kec_kabkot']
            mb = row['datavol_mb']
            u = 'nul' if mb == '' else ('gt' if float(mb) > 25 else 'le')
            oc = 'IJ' if o_ij else ('NK' if omc else ('UM' if oid else 'NI'))
            act = 'NULL' if not ak else ('IJ' if ak in U else 'OUT')
            mat['%s|%s|%s' % (oc, act, u)][b] += 1
            seg = None
            if o_ij:
                seg = ('master ' + (fr['sg'] or 'tanpa segmen')) if fr and fr['t'] == 'M' else ('non-master ' + ((fr['sg'] or 'tanpa segmen') if fr else 'tanpa segmen'))
            if act == 'IJ':
                sid = row['activation_site_id']
                sj = sid in site_mc
                amc = site_mc[sid].most_common(1)[0][0] if sj else (kec_mc[ak].most_common(1)[0][0] if kec_mc[ak] else '?')
                aarea = mc_area.get(amc, '?')
                if o_ij:
                    k = 0 if o_mc == amc else (1 if mc_area.get(o_mc) == aarea else 2)
                    oarea = mc_area.get(o_mc, '(MC tidak dikenal)')
                    okab = row['outlet_kabkot'] or (F['loc_keys'][fr['lk']].split('|')[1] if fr and fr.get('lk') is not None else '(outlet IJ, kabupaten tidak tertulis)')
                elif omc:
                    k, oarea, okab = 3, row['outlet_sales_area'], row['outlet_kabkot']
                elif oid:
                    k, oarea, okab = 4, '(outlet ber-ID, area tidak diketahui)', '(tidak diketahui)'
                else:
                    k, oarea, okab = 5, '(tanpa ID outlet)', '(tidak diketahui)'
                i = b * 6 + k
                site[sid][i] += 1
                kec[ak][i] += 1
                mcv[amc][i] += 1
                if sid not in sinfo:
                    sinfo[sid] = [row['activation_site_name'], ak, amc, sj]
                sup_area[oarea][b] += 1
                sup_kab[okab][b] += 1
                sup_prov[PROV.get(okab, '(tidak diketahui)') if not okab.startswith('(') else '(tidak diketahui)'][b] += 1
            if o_ij:
                oarea = mc_area.get(o_mc, '(MC tidak dikenal)')
                kk = 4 if act == 'NULL' else (3 if act == 'OUT' else None)
                if kk is None:
                    kk = 0 if o_mc == amc else (1 if mc_area.get(o_mc) == aarea else 2)
                for tab, key in ((out_area, oarea), (out_mc, o_mc), (out_seg, seg)):
                    tab[key][b * 5 + kk] += 1
                if act == 'OUT':
                    kab = row['activation_kabkot']
                    dest_kab[kab][b] += 1
                    dest_prov[PROV.get(kab, '(provinsi belum dipetakan)')][b] += 1
                    sid = row['activation_site_id']
                    dest_site[sid][b] += 1
                    dsite_info[sid] = [row['activation_site_name'], row['activation_kecamatan'], kab]
                    dkab_src[kab][oarea] += 1
    # --- assemble
    mc_rows = []
    for m in sorted(mapping):
        i = mi.get(m) or {}
        mc_rows.append({'mc': m, 'area': mc_area[m], 'hoa': i.get('hoa', ''), 'dso': i.get('dso', ''), 'v': mcv[m]})
    kmcs = C.defaultdict(C.Counter)
    for sid, v in site.items():
        s = sinfo[sid]
        kmcs[s[1]][s[2]] += sum(v)
    kdse = C.defaultdict(C.Counter)
    for sid, v in site.items():
        s = sinfo[sid]
        if s[3] and site_dse[sid]:
            tot = sum(site_dse[sid].values())
            inflow = sum(v) - v[0] - v[6]
            for d, c in site_dse[sid].items():
                kdse[s[1]][d] += inflow * c / tot
    kec_rows = []
    for kk, v in kec.items():
        mcs = [m for m, _ in kmcs[kk].most_common(2)]
        kec_rows.append({'k': kk, 'mc': mcs, 'dse': [[d, round(x)] for d, x in kdse[kk].most_common(3)], 'v': v})
    site_rows = []
    for sid, v in site.items():
        s = sinfo[sid]
        d = [[a, c] for a, c in site_dse[sid].most_common(2)] if s[3] else []
        site_rows.append({'id': sid, 'n': s[0], 'k': s[1], 'mc': s[2], 'm': 1 if s[3] else 0, 'dse': d, 'v': v})
    site_rows.sort(key=lambda r: -sum(r['v']))
    top = lambda d, n: [[k, v] for k, v in sorted(d.items(), key=lambda x: -sum(x[1]))[:n]]
    feed = {'metadata': {
        'generated_at': datetime.now().strftime('%Y-%m-%dT%H:%M:%S'), 'source': os.path.basename(path), 'contract': 'docs/assessments/ga_site_rguga_assessment.md',
        'rows': n_rows, 'date_from': d_lo, 'date_to': d_hi, 'cut_day': int(d_hi[8:]),
        'classes': {'S': 'MC yang sama', 'A': 'area sama, MC lain', 'X': 'area IJ lain', 'N': 'outlet luar IJ (atribut ada)', 'U': 'outlet ber-ID tanpa atribut wilayah', 'Z': 'tanpa ID outlet'},
        'vector': 'v = [IM3 S,A,X,N,U,Z, 3ID S,A,X,N,U,Z]; out_* = [IM3 S,A,X,O,Z, 3ID S,A,X,O,Z] (S/A/X = aktivasi di IJ MC sama / area sama / area IJ lain, O = luar IJ, Z = site kosong)'},
        'matrix': {k: v for k, v in mat.items()}, 'mc': mc_rows, 'kec': kec_rows, 'sites': site_rows,
        'sup_area': top(sup_area, 60), 'sup_kab': top(sup_kab, 60), 'sup_prov': top(sup_prov, 40),
        'out_area': [[k, v] for k, v in out_area.items()], 'out_mc': [[k, v] for k, v in out_mc.items()], 'out_seg': [[k, v] for k, v in out_seg.items()],
        'dest_prov': top(dest_prov, 40), 'dest_kab': [[k, v, [[a, c] for a, c in dkab_src[k].most_common(2)]] for k, v in sorted(dest_kab.items(), key=lambda x: -sum(x[1]))[:60]],
        'dest_site': [[k, dsite_info[k], v] for k, v in sorted(dest_site.items(), key=lambda x: -sum(x[1]))[:150]], 'dest_n': {'kab': len(dest_kab), 'sites': len(dest_site)}}
    out = os.path.join(ROOT, 'website', 'data', 'ga_site_feed.js')
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write('// Auto-generated GA per activation site vs tagging outlet (scripts/build_ga_site_feed.py). Contract: docs/assessments/ga_site_rguga_assessment.md. Counts only, no MSISDN.\n')
        fh.write('var GA_SITE_FEED = ' + json.dumps(feed, ensure_ascii=False, separators=(',', ':')) + ';\nif (typeof window !== \'undefined\') window.GA_SITE_FEED = GA_SITE_FEED;\n')
    print('SUCCESS: %s (%d KB); %d rows, %s..%s' % (out, os.path.getsize(out) // 1024, n_rows, d_lo, d_hi))
    ij = sum(sum(v) for v in site.values())
    print('GA di site IJ', ij, '· sites', len(site), '· kecamatan', len(kec))


if __name__ == '__main__':
    main()
