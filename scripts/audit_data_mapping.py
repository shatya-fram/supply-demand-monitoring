#!/usr/bin/env python3
"""
audit_data_mapping.py  ·  Is every downloaded file parsed to the right place?

Reads the built feeds (and the target workbook's pairing sheet) and reports, per source, how much
of the data landed on a master outlet / DSE / MC and how much did not:

  MOBII  Sell-In (penjualan feed)      value by receiving tier: master outlet, adhoc outlet, DSE / MPC / SDP nodes, unknown id
  MOBO   demand (demand feed)          value by id class: master IM3, master 3ID, adhoc, unknown id
  PJP    visits (dse_visits_feed)      operators matched to a master DSE, planned / executed visits and outlets on master
  ENDBAL stock balance                 organisations by classification, unmapped stock
  TARGET workbook vs DSE KPI feed      every DSE target row vs the DSE in the app (SP, OSA IM3 / 3ID / IOH, MC)
  MASTER outlet -> DSE assignment      master vs the workbook sheet "Pairing Outlet-DSE"

Writes docs/assessments/data_mapping_audit.md. Pure stdlib. Run from the project root.
"""
import collections, importlib.util, json, os, re, sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
OUT = 'docs/assessments/data_mapping_audit.md'
L = []


def h(t): L.append('\n## ' + t + '\n')
def p(t=''): L.append(t)
def table(head, rows):
    L.append('| ' + ' | '.join(head) + ' |'); L.append('|' + '|'.join(['---'] + ['---:'] * (len(head) - 1)) + '|')
    for r in rows: L.append('| ' + ' | '.join(str(x) for x in r) + ' |')
    L.append('')
def n0(v): return f'{int(round(v)):,}'
def rp(v): return f'Rp {v / 1e9:,.2f} M' if abs(v) >= 1e9 else f'Rp {v / 1e6:,.1f} jt'
def pc(a, b): return f'{a / b * 100:.1f}%' if b else '—'
def norm(s): return re.sub(r'\.0$', '', re.sub(r'\s+', ' ', str(s or '').strip().upper()))


terr = json.load(open('website/data/territory_feed.json', encoding='utf-8'))['outlets']
P = json.load(open('data/processed/penjualan_feed.json', encoding='utf-8'))
D = json.load(open('data/processed/demand_feed.json', encoding='utf-8'))
src = open('website/data/dse_visits_feed.js', encoding='utf-8').read()
V = json.loads(re.search(r'var dseVisitsFeed = (\{.*\});?\s*$', src, re.S).group(1))
E = json.load(open('data/processed/endbal_feed.json', encoding='utf-8'))
K = json.load(open('data/processed/dse_kpi_feed.json', encoding='utf-8'))
T = json.load(open('data/processed/target_feed.json', encoding='utf-8'))

L.append('# Audit pemetaan data ke teritori')
p(f'\n**Dibuat**: {datetime.now():%d %b %Y %H:%M} oleh `scripts/audit_data_mapping.py`. Menjawab: apakah data MOBII, MOBO, PJP, ENDBAL dan target sudah masuk ke outlet, DSE, MC dan Area yang tepat, dan berapa yang belum.')

# ---------------- master ----------------
h('1. Master outlet dan penugasan DSE')
n = len(terr); un = sum(1 for o in terr if norm(o['dse_name']).startswith('UNASSIGNED'))
nomc = sum(1 for o in terr if not o.get('micro_cluster')); nobr = sum(1 for o in terr if not o.get('branch'))
gps = sum(1 for o in terr if o.get('lat') not in (None, '', 0, '0'))
table(['Ukuran', 'Jumlah', '%'], [['Outlet master', n0(n), '100%'], ['Dengan DSE', n0(n - un), pc(n - un, n)], ['Tanpa DSE (UNASSIGNED)', n0(un), pc(un, n)],
       ['Tanpa Micro Cluster', n0(nomc), pc(nomc, n)], ['Tanpa Branch', n0(nobr), pc(nobr, n)], ['Dengan GPS', n0(gps), pc(gps, n)]])
p('Perbaikan 15 Okt: kode DSE `0` / `0.0` di file mapping berarti "tidak ada DSE", bukan DSE bernama 0. Sebelumnya 859 outlet di 17 MC terbaca sebagai satu DSE "0" dengan target proxy Rp 1,42 M; kini berlabel `UNASSIGNED` dan tidak masuk roster DSE.')
names = collections.defaultdict(set)
for o in terr:
    nm = norm(o['dse_name'])
    if nm and not nm.startswith('UNASSIGNED'): names[nm].add((o['dse_code_im3'] or o['dse_code_3id'], o['micro_cluster']))
dups = {k: v for k, v in names.items() if len({c for c, _ in v}) > 1}
p('DSE berbeda dengan nama sama: ' + (', '.join(f'**{k}** ({", ".join(sorted(f"{c} · {m}" for c, m in v))})' for k, v in dups.items()) or 'tidak ada') + '. Di KPI feed keduanya kini punya kunci sendiri (nama + kode) sehingga target dan sell-in tidak tercampur.')

# pairing sheet
spec = importlib.util.spec_from_file_location('btf', 'scripts/build_target_feed.py'); btf = importlib.util.module_from_spec(spec); spec.loader.exec_module(btf)
wbpath = btf.find_file(); pair = btf.read_sheet(wbpath, 'Pairing Outlet-DSE')
by_o = {}
for o in terr:
    for c in (o['outlet_id_im3'], o['outlet_id_3id']):
        if c: by_o.setdefault(norm(c), o)
tot = fnd = same = diff = 0; ex = []
for nrow, r in pair:
    if nrow < 2 or not (r.get(2) or r.get(3)): continue
    tot += 1
    o = by_o.get(norm(r.get(2))) or by_o.get(norm(r.get(3)))
    if not o: continue
    fnd += 1
    codes = {norm(o['dse_code_im3']), norm(o['dse_code_3id'])} - {''}
    pc_ = {norm(r.get(0)), norm(r.get(1))} - {''}
    if codes & pc_: same += 1
    else:
        diff += 1
        if len(ex) < 5: ex.append((r.get(2) or r.get(3), sorted(pc_)[:1], sorted(codes)[:1] or ['UNASSIGNED']))
h('2. Penugasan outlet ke DSE: master vs sheet "Pairing Outlet-DSE" di file target')
table(['Ukuran', 'Jumlah', '%'], [['Pasangan outlet-DSE di file target', n0(tot), '100%'], ['Outlet ditemukan di master', n0(fnd), pc(fnd, tot)], ['DSE sama dengan master', n0(same), pc(same, fnd)], ['DSE berbeda dari master', n0(diff), pc(diff, fnd)]])
if ex: p('Contoh beda: ' + '; '.join(f'outlet {a} → file {b[0] if b else "-"} vs master {c[0]}' for a, b, c in ex) + '.')
p('Selisih ini menentukan basis outlet yang dihitung untuk OSA dan UAR per DSE. Master outlet (file mapping outlet) tetap sumber resmi aplikasi; sheet pairing hanya dipakai sebagai pembanding.')

# ---------------- MOBII ----------------
h('3. MOBII · Sell-In (DAILY_DATA_MOBII)')
agg = collections.defaultdict(lambda: [0, 0, 0])
for t in P['tiers']:
    if t['period'] != 'MTD': continue
    a = agg[t['tier']]; a[0] += t['v']; a[1] += t['rows']; a[2] += t['ids']
tv = sum(v[0] for v in agg.values())
lab = {'OUTLET_M': 'Outlet master', 'OUTLET_A': 'Outlet adhoc (bukan master, ada di mapping adhoc)', 'DSE': 'Node DSE (stok ke DSE)', 'MPC': 'Node MPC', 'MP3': 'Node MP3', 'SDP': 'Node SDP', 'OTHER': 'Node lain (stockist FWA dll)', 'UNKNOWN': 'Id tidak dikenal'}
table(['Penerima di file', 'Nilai MTD', '% nilai', 'Baris', 'Id'], [[lab.get(k, k), rp(v[0]), pc(v[0], tv), n0(v[1]), n0(v[2])] for k, v in sorted(agg.items(), key=lambda x: -x[1][0])])
outl = agg['OUTLET_M'][0] + agg['OUTLET_A'][0]
p(f'Sell-In yang sampai ke **outlet** (master + adhoc): {rp(outl)} = {pc(outl, tv)} dari seluruh file; sisanya adalah stok ke node distribusi yang memang bukan outlet. Id tidak dikenal: {pc(agg["UNKNOWN"][0], tv)} nilai.')
mcs = set(o['mc'] for o in P['outlets'] if o['tier'] == 'M')
adh_no = sum(1 for o in P['outlets'] if o['tier'] == 'A' and not o.get('mc'))
p(f'Outlet di feed: {n0(len(P["outlets"]))} (master {n0(sum(1 for o in P["outlets"] if o["tier"] == "M"))}, adhoc {n0(sum(1 for o in P["outlets"] if o["tier"] == "A"))}); outlet adhoc tanpa MC: {adh_no}. Outlet master tersebar di {len(mcs)} MC.')
un_dse = sum(1 for o in P['outlets'] if o['tier'] == 'M' and norm(o.get('dse')).startswith('UNASSIGNED') or norm(o.get('dse')) in ('0', ''))
p(f'Outlet master tanpa DSE di feed Sell-In: {n0(un_dse)} (nilai MTD tetap dihitung di Area dan MC, tetapi tidak ke DSE mana pun).')

# ---------------- MOBO ----------------
h('4. MOBO · Demand (DAILY_DATA_MOBO)')
rows = collections.defaultdict(lambda: [0, 0])
for t in D['tiers']:
    if t['cat'] == 'SPI': continue
    a = rows[t['cls']]; a[0] += t['v']; a[1] += t['ids']
dv = sum(v[0] for v in rows.values())
cl = {'master_im3': 'Outlet master (id IM3)', 'master_3id': 'Outlet master (id 3ID)', 'adhoc': 'Outlet adhoc', 'unknown': 'Id tidak dikenal'}
table(['Kelas id', 'Nilai MTD', '% nilai', 'Id'], [[cl.get(k, k), rp(v[0]), pc(v[0], dv), n0(v[1])] for k, v in sorted(rows.items(), key=lambda x: -x[1][0])])
unk = D['metadata'].get('unknown', {})
p(f'Id yang tidak bisa ditaruh di outlet mana pun: {unk.get("ids", 0)} id, {rp(unk.get("value", 0))}. Nilai demand adhoc {pc(rows["adhoc"][0], dv)}: pola node grosir atau penjual online, bukan outlet ritel (lihat tab Konsentrasi).')
dno = sum(1 for o in D['outlets'] if o['tier'] == 'M' and (norm(o['dse']).startswith('UNASSIGNED') or norm(o['dse']) in ('0', '')))
p(f'Outlet master dengan demand tetapi tanpa DSE: {n0(dno)}.')

# ---------------- PJP ----------------
h('5. PJP · Kunjungan DSE (MOBI Journey Plan)')
ds = V['dses']; inm = [d for d in ds if d.get('in_master')]; outm = [d for d in ds if not d.get('in_master')]
pl = sum(d['planned_visits'] for d in ds); ac = sum(d['actual_visits'] for d in ds)
plm = sum(d['planned_visits'] for d in inm); acm = sum(d['actual_visits'] for d in inm)
table(['Ukuran', 'Operator', 'Rencana', 'Terlaksana'], [['Operator cocok dengan DSE master', n0(len(inm)), n0(plm), n0(acm)], ['Operator tidak ada di master', n0(len(outm)), n0(pl - plm), n0(ac - acm)], ['Total file PJP', n0(len(ds)), n0(pl), n0(ac)]])
kp = sum(r['planned'] for r in K['dses']); ka = sum(r['actual'] for r in K['dses'])
p(f'Yang sampai ke roster DSE di KPI feed: rencana {n0(kp)} dari {n0(pl)} ({pc(kp, pl)}), terlaksana {n0(ka)} dari {n0(ac)} ({pc(ka, ac)}). Selisihnya dua jenis: operator yang tidak ada di master sama sekali, dan DSE master tanpa outlet. Keduanya tetap dihitung di Area dan MC lewat teritori kunjungannya, tetapi tidak di scorecard per DSE.')
kn = {norm(r['n']) for r in K['dses']}
codes_kpi = set()
for o in terr:
    if norm(o['dse_name']) in kn:
        for c in (o['dse_code_im3'], o['dse_code_3id']):
            if c: codes_kpi.add(norm(c))
nr = [d for d in inm if norm(d['dse_name']) not in kn and not any(norm(l.split(':', 1)[-1]) in codes_kpi for l in d.get('logins', []))]
if nr:
    p(f'Operator yang cocok dengan DSE master tetapi tidak punya outlet di master (sehingga tidak ada di roster DSE Productivity dan tidak punya target): {len(nr)} operator, rencana {n0(sum(d["planned_visits"] for d in nr))} kunjungan. Contoh: ' + ', '.join(f'{d["dse_name"]} ({d.get("micro_cluster") or "?"}, {n0(d["planned_visits"])})' for d in sorted(nr, key=lambda x: -x['planned_visits'])[:5]) + '.')
raw = collections.Counter((d.get('raw_branch'), d.get('branch')) for d in ds if d.get('raw_branch') != d.get('branch'))
if raw: p('Normalisasi nama branch PJP ke master: ' + ', '.join(f'{a} → {b} ({n0(c)} operator)' for (a, b), c in raw.most_common(8)) + '.')
oo = oc = 0
for d in ds:
    for o in d.get('outlets') or []:
        oo += 1
        if o.get('k'): oc += 1
p(f'Outlet pada jadwal kunjungan yang cocok dengan master outlet: {n0(oc)} dari {n0(oo)} ({pc(oc, oo)}).')
if outm: p('Operator belum cocok (rencana terbesar): ' + ', '.join(f'{d["dse_name"]} ({d.get("micro_cluster") or "?"}, {n0(d["planned_visits"])})' for d in sorted(outm, key=lambda x: -x['planned_visits'])[:6]) + '.')

# ---------------- ENDBAL ----------------
h('6. ENDBAL · Stock balance outlet')
m = E['metadata']; cls = m['classification']
table(['Klasifikasi organisasi', 'Jumlah'], [[k, n0(v)] for k, v in sorted(cls.items(), key=lambda x: -x[1])])
p(f'Outlet di feed: {n0(m["outlets"])} (master {n0(m["master_outlets"])}, adhoc {n0(m["adhoc_outlets"])}). Organisasi bertipe outlet yang tidak terpetakan ke master maupun adhoc: {n0(cls.get("tidak terpetakan", 0))}, dengan stok {rp(m["unmapped_stock_balance"])} yang tidak masuk ke MC mana pun (teratas: ' + ', '.join(f'{k} {n0(v)}' for k, v in list(m['unmapped_by_cluster'].items())[:4]) + ').')

# ---------------- TARGET ----------------
h('7. Target Setting per DSE vs file target')
ta = K['metadata'].get('target_audit', {})
k_sp = sum(r['sp_tgt'] or 0 for r in K['dses']); k_osa = sum(r['osa_tgt'] for r in K['dses'])
wbrows = [(nn, r) for nn, r in btf.read_sheet(wbpath, btf.SHEET_NAME) if nn >= 6 and r.get(0) and r.get(7)]
w_sp = sum(btf.fl(r, 27) for _, r in wbrows); w_osa = sum(btf.fl(r, 31) for _, r in wbrows)
table(['Ukuran', 'File target', 'Aplikasi (KPI feed)'], [['Baris / DSE', n0(len(wbrows)), n0(len(K['dses']))], ['Target Sell-In SP (pcs)', n0(w_sp), n0(k_sp)], ['Target OSA IOH (Rp)', n0(w_osa), n0(k_osa)],
       ['Baris target yatim (tidak menempel ke DSE)', '—', n0(len(ta.get('orphan_rows', [])))], ['DSE tanpa target resmi (pakai proxy)', '—', n0(len(ta.get('roster_without_official_target', [])))]])
p('Pembandingan per DSE (kode DSE IM3 / 3ID, SP IM3 + 3ID, OSA IM3, OSA 3ID, MC) dijalankan untuk semua baris file; hasil di bagian Kesimpulan.')

# ---------------- conclusion ----------------
code2 = {}
for o in terr:
    for c in (o['dse_code_im3'], o['dse_code_3id']):
        if c: code2[norm(c)] = (norm(o['dse_name']), o['micro_cluster'])
byname = collections.defaultdict(list)
for r in K['dses']: byname[norm(r['n'])].append(r)
bad = []
for nn, r in wbrows:
    nm = (code2.get(norm(r[7])) or code2.get(norm(r.get(8, ''))) or (None,))[0]
    c = byname.get(nm, [])
    if len(c) > 1: c = [x for x in c if x['mc'] == r[3]] or c
    if not c: bad.append(f'baris {nn}: DSE {r[7]} tidak ditemukan'); continue
    c = c[0]
    if c['sp_tgt'] != round(btf.fl(r, 25) + btf.fl(r, 26)) or abs(c['osa_tgt'] - round(btf.fl(r, 31))) > 1 or c['mc'] != r[3] or c['osa_tgt_im3'] != round(btf.fl(r, 29)) or c['osa_tgt_3id'] != round(btf.fl(r, 30)):
        bad.append(f'baris {nn}: {r[7]} target atau MC berbeda dari file')
h('8. Kesimpulan')
p(f'- Target per DSE: **{len(wbrows) - len(bad)} dari {len(wbrows)} baris file cocok persis** dengan aplikasi' + (' (' + '; '.join(bad[:5]) + ')' if bad else '') + '.')
p('- Yang diperbaiki hari ini: pseudo-DSE "0" (outlet tanpa DSE), dua DSE bernama SUSANTO yang tergabung, dan pencocokan target di menu Target Setting yang memakai nama saja (kini nama + MC).')
p('- Yang masih terbuka: operator PJP yang tidak cocok dengan master, id MOBII / MOBO tidak dikenal, dan organisasi ENDBAL tidak terpetakan (bagian 3 sampai 6). Itu butuh pembaruan file mapping outlet atau master DSE dari pemilik data.')
open(OUT, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('\n'.join(L)); print('\nwritten', OUT)
