#!/usr/bin/env python3
"""
build_dse_kpi_feed.py
DSE productivity inputs for the "KPI DSE - Oct 2026" incentive policy (Morning DSE Briefing, Ringkasan Performance).

One record per master DSE (272). Scoring (slabs, incentive, compliance index) is done in the browser from these
inputs and the policy block, so the basis toggles (prorata vs full month, OSA amount basis, Effective Call
definition) can change without rebuilding.

Sources (all local):
  data/processed/penjualan_feed.json   DAILY_DATA_MOBII per master outlet: saldo / SP / voucher, MTD and September full
  website/data/dse_visits_feed.js      PJP visits per person: planned, executed, productive visits
  website/data/territory_feed.json     master outlet -> DSE, MC, DSO, HoA, branch (outlet mapping)
  data/catalogues/dse_kpi_targets.csv  OPTIONAL official inputs per DSE: dse_name, osa_target_rp, class (U|R)
                                       If missing, OSA target = September actual (proxy) and class from the branch rule.

Outputs:
  website/data/dse_kpi_feed.js         window.DSE_KPI_FEED
  data/processed/dse_kpi_feed.json
  data/catalogues/dse_kpi_targets_template.csv   the proxy targets, ready to be edited and saved as dse_kpi_targets.csv

Policy source: slide "KPI DSE - Oct 2026" (see docs/assessments/dse_kpi_policy.md for every reading and assumption).
"""
import csv
import json
import os
import re
from collections import defaultdict
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PENJ = os.path.join(ROOT, 'data', 'processed', 'penjualan_feed.json')
VISITS = os.path.join(ROOT, 'website', 'data', 'dse_visits_feed.js')
TERR = os.path.join(ROOT, 'website', 'data', 'territory_feed.json')
TARGETS = os.path.join(ROOT, 'data', 'catalogues', 'dse_kpi_targets.csv')
TEMPLATE = os.path.join(ROOT, 'data', 'catalogues', 'dse_kpi_targets_template.csv')
OUT_JS = os.path.join(ROOT, 'website', 'data', 'dse_kpi_feed.js')
OUT_JSON = os.path.join(ROOT, 'data', 'processed', 'dse_kpi_feed.json')

RURAL_BRANCHES = {'KARAWANG', 'KAB BEKASI'}      # rule used until the owner supplies a class per DSE

POLICY = {
    'title': 'KPI DSE - Oct 2026',
    'osa': {
        'label': 'OSA',
        'weight': 0.40,                                   # donut on the slide (informational, not a rupiah multiplier)
        'slabs': [{'sla': 0.90, 'rate': 0.002}, {'sla': 1.00, 'rate': 0.004}],   # share of the OSA amount paid at SLA 90% / 100%
        'max_rp': 1000000,
        'qualify_min_rp': 300000,                         # GAPLOK: outlet counts for OSA productivity from Rp 300K sell-in
    },
    'sp': {
        'label': 'SP Data Sell In',
        'weight': 0.60,
        'tiers': [{'sla': 0.90, 'pcs': 1500, 'payout': 0.90}, {'sla': 1.00, 'pcs': 2000, 'payout': 1.00}],   # payout = share of max
        'max_rp': 1000000,
    },
    'compliance': {
        'uar': {'label': 'Outlet mapping sell in SP data >= 5 pcs', 'weight': 0.50, 'min_pcs': 5, 'target_urban': 30, 'target_rural': 25},
        'ec': {'label': 'Effective call (fix PJP)', 'weight': 0.50, 'target': 0.50},
        'cap': 1.0,                                       # GAPLOK "Total EF (cap 100%)": each component capped at 100%
        'index': [{'min': 1.00, 'x': 1.00}, {'min': 0.90, 'x': 0.97}, {'min': 0.80, 'x': 0.95}, {'min': 0.0, 'x': 0.0}],
    },
}


def norm(s):
    s = str(s if s is not None else '').upper().strip()
    if s.endswith('.0'):
        s = s[:-2]
    return re.sub(r'\s+', ' ', s)


def load_visits():
    src = open(VISITS, encoding='utf-8').read()
    m = re.search(r'var dseVisitsFeed = (\{.*\});?\s*$', src, re.S)
    return json.loads(m.group(1))


def num(v):
    return v if isinstance(v, (int, float)) else 0


def main():
    pj = json.load(open(PENJ, encoding='utf-8'))
    terr = json.load(open(TERR, encoding='utf-8'))['outlets']
    vf = load_visits()
    M = pj['metadata']

    # ---- master roster: DSE -> branch / MC / DSO / HoA (mode over mapped outlets), codes
    roster = {}
    # two different DSEs can share a name (e.g. SUSANTO in MC-PONDOK GEDE and MC-CIMANGGIS): those get a code-based key
    # so their targets and sell-in are not merged. Outlets without a DSE (UNASSIGNED) are not a DSE and stay out of the roster.
    name_codes = defaultdict(set)
    for o in terr:
        nm = norm(o.get('dse_name'))
        if nm and not nm.startswith('UNASSIGNED'):
            name_codes[nm].add(norm(o.get('dse_code_im3')) or norm(o.get('dse_code_3id')))
    def dse_key(o):
        nm = norm(o.get('dse_name'))
        if not nm or nm.startswith('UNASSIGNED'):
            return None
        return nm if len(name_codes[nm]) <= 1 else nm + ' | ' + (norm(o.get('dse_code_im3')) or norm(o.get('dse_code_3id')))
    outlet_dse = {o['outlet_key']: dse_key(o) for o in terr}
    for o in terr:
        k = dse_key(o)
        if not k:
            continue
        e = roster.setdefault(k, {'name': o.get('dse_name'), 'codes': set(), 'br': defaultdict(int), 'mc': defaultdict(int), 'dso': '', 'hoa': '', 'assigned': 0})
        e['assigned'] += 1
        e['br'][o['branch']] += 1
        e['mc'][o['micro_cluster']] += 1
        e['dso'] = e['dso'] or o.get('dso_leader', '')
        e['hoa'] = e['hoa'] or o.get('hoa_leader', '')
        for c in (o.get('dse_code_im3'), o.get('dse_code_3id')):
            if c:
                e['codes'].add(norm(c))
    code_to_key = {c: k for k, e in roster.items() for c in e['codes']}

    # ---- sell-in per master outlet, rolled up to its DSE
    acc = defaultdict(lambda: {'saldo_mtd': 0, 'saldo_lmtd': 0, 'sp_pcs': 0, 'sp_amt': 0, 'sp_lpcs': 0, 'sp_uar5': 0, 'sp_out': 0, 'spi_pcs': 0, 'spi_amt': 0, 'spi_out': 0,
                                'osa_amt': 0, 'osa_all': 0, 'sep_all': 0, 'osa_out': 0, 'sep_saldo': 0, 'sep_osa_amt': 0, 'sep_osa_out': 0, 'sp_sep_pcs': 0, 'outlets_seen': 0})
    qmin = POLICY['osa']['qualify_min_rp']
    unmatched = 0
    for o in pj['outlets']:
        if o.get('tier') == 'A':
            continue
        k = outlet_dse.get(o.get('k')) or norm(o.get('dse'))
        if k not in roster:
            unmatched += 1
            continue
        c = o.get('c') or {}
        def g(cat, i):
            a = c.get(cat)
            return num(a[i]) if a else 0
        a = acc[k]
        a['outlets_seen'] += 1
        sal_m, sal_l, sal_f = g('SALMO', 1), g('SALMO', 3), g('SALMO', 5)
        sp_q, sp_v, sp_lq, sp_fq = g('SP', 0), g('SP', 1), g('SP', 2), g('SP', 4)
        vc_m = g('VCF', 1) + g('VCB', 1)
        vc_f = g('VCF', 5) + g('VCB', 5)
        a['saldo_mtd'] += sal_m; a['saldo_lmtd'] += sal_l; a['sep_saldo'] += sal_f
        a['sp_pcs'] += sp_q; a['sp_amt'] += sp_v; a['sp_lpcs'] += sp_lq; a['sp_sep_pcs'] += sp_fq
        if sp_q >= POLICY['compliance']['uar']['min_pcs']:
            a['sp_uar5'] += 1
        if sp_q > 0:
            a['sp_out'] += 1
        spi_q = g('SPI', 0)                           # SP Injection (digital, MOBO), MTD pcs; part of Sell-In SP achievement (owner, 19 Oct 2026)
        a['spi_pcs'] += spi_q; a['spi_amt'] += g('SPI', 1)
        if spi_q > 0:
            a['spi_out'] += 1
        tot_m = sal_m + sp_v + vc_m                   # OSA value = SP + voucher + saldo Mobo sell-in value
        tot_f = sal_f + g('SP', 5) + vc_f
        a['osa_all'] += tot_m; a['sep_all'] += tot_f
        if tot_m >= qmin:                             # OSA productive outlet this month
            a['osa_out'] += 1
            a['osa_amt'] += tot_m
        if tot_f >= qmin:                             # same rule on September full month: proxy target
            a['sep_osa_out'] += 1
            a['sep_osa_amt'] += tot_f

    # ---- visits per person -> master DSE (by normalised name, else by login code)
    vis = {}
    dup = 0
    for d in vf['dses']:
        k = norm(d.get('dse_name'))
        if k not in roster:
            k = None
            for l in d.get('logins') or []:
                code = norm(str(l).split(':', 1)[-1])
                if code in code_to_key:
                    k = code_to_key[code]
                    break
        if not k:
            continue
        if k in vis:
            dup += 1
        v = vis.setdefault(k, {'planned': 0, 'actual': 0, 'prod': 0, 'person': d.get('person_id')})
        v['planned'] += num(d.get('planned_visits')); v['actual'] += num(d.get('actual_visits')); v['prod'] += num(d.get('productive_visits'))

    # ---- optional official targets / class
    given = {}
    if os.path.exists(TARGETS):
        with open(TARGETS, encoding='utf-8-sig') as f:
            for r in csv.DictReader(f):
                given[norm(r.get('dse_name'))] = r

    # ---- official target setting (scripts/build_target_feed.py): OSA Rp and Sell-In SP pcs per DSE
    tgt = {}
    tgt_orphans, tgt_rows = [], 0                  # target rows that cannot be placed on a roster DSE
    TF = os.path.join(ROOT, 'data', 'processed', 'target_feed.json')
    if os.path.exists(TF):
        for d in json.load(open(TF, encoding='utf-8'))['dses']:
            tgt_rows += 1
            k = code_to_key.get(norm(d['id'])) or code_to_key.get(norm(d['id3'])) or norm(d['n'])
            if k not in roster:
                tgt_orphans.append({'id': d['id'], 'n': d['n'], 'mc': d['mc'], 'sp': d['sp'][2], 'osa': d['osa'][2]})
            if k in roster:
                if k in tgt:                          # two target rows share one roster key (same DSE name): add them up
                    for fld in ('sp', 'osa'):
                        tgt[k][fld] = [a + b for a, b in zip(tgt[k][fld], d[fld])]
                else:
                    tgt[k] = {**d, 'sp': list(d['sp']), 'osa': list(d['osa'])}

    rows = []
    for k, e in roster.items():
        br = max(e['br'], key=e['br'].get)
        mc = max(e['mc'], key=e['mc'].get)
        a = acc[k]
        v = vis.get(k)
        cls = 'R' if br in RURAL_BRANCHES else 'U'
        gt = given.get(k)
        tgt_src = 'proxy'
        osa_tgt = a['sep_osa_amt']
        if gt:
            try:
                if gt.get('osa_target_rp') not in (None, ''):
                    osa_tgt = float(gt['osa_target_rp']); tgt_src = 'file'
            except ValueError:
                pass
            if (gt.get('class') or '').strip().upper() in ('U', 'R'):
                cls = gt['class'].strip().upper()
        t = tgt.get(k)
        if t:
            osa_tgt = t['osa'][2]; tgt_src = 'official'
        rows.append({
            'n': re.sub(r'\.0$', '', str(e['name']).strip()), 'k': k, 'br': br, 'mc': mc, 'dso': e['dso'], 'hoa': e['hoa'], 'cls': cls, 'assigned': e['assigned'],
            'saldo_mtd': round(a['saldo_mtd']), 'saldo_lmtd': round(a['saldo_lmtd']), 'osa_amt': round(a['osa_amt']), 'osa_all': round(a['osa_all']), 'osa_out': a['osa_out'],
            'osa_tgt': round(osa_tgt), 'osa_tgt_all': round(a['sep_all']), 'osa_tgt_src': tgt_src,
            'sp_tgt': t['sp'][2] if t else None, 'sp_tgt_im3': t['sp'][0] if t else None, 'sp_tgt_3id': t['sp'][1] if t else None, 'osa_tgt_im3': t['osa'][0] if t else None, 'osa_tgt_3id': t['osa'][1] if t else None,
            'sp_pcs': round(a['sp_pcs']), 'sp_amt': round(a['sp_amt']), 'sp_lpcs': round(a['sp_lpcs']), 'sp_sep': round(a['sp_sep_pcs']),
            'sp_uar5': a['sp_uar5'], 'sp_out': a['sp_out'], 'spi_pcs': round(a['spi_pcs']), 'spi_amt': round(a['spi_amt']), 'spi_out': a['spi_out'],
            'planned': v['planned'] if v else 0, 'actual': v['actual'] if v else 0, 'prod': v['prod'] if v else 0, 'vis': bool(v), 'pid': v['person'] if v else None,
        })
    rows.sort(key=lambda r: (r['br'], r['mc'], r['n'].upper()))

    feed = {
        'metadata': {
            'generated_at': datetime.now().isoformat(timespec='seconds'),
            'period': 'MTD Oktober 2026', 'cut_day': M['cut_day'], 'cut': M['cut'], 'month_days': M.get('mtd_month_days', 31),
            'visits_cut_day': len((vf.get('metadata') or {}).get('days') or []), 'visits_cut': ((vf.get('metadata') or {}).get('period_end')),
            'dses': len(rows), 'dses_with_visits': sum(1 for r in rows if r['vis']),
            'target_audit': {'target_rows': tgt_rows, 'placed': len(tgt), 'orphan_rows': tgt_orphans, 'roster_without_official_target': [r['n'] for r in rows if r['osa_tgt_src'] != 'official']}, 'sources': {
                'sellin': 'data/processed/penjualan_feed.json (DAILY_DATA_MOBII)', 'visits': 'website/data/dse_visits_feed.js',
                'master': 'website/data/territory_feed.json', 'targets': ('official: data/processed/target_feed.json (Target DSE Hybrid FINAL REBALANCING), %d DSEs' % len(tgt)) if tgt else ('file' if given else 'proxy: September actual per DSE (no data/catalogues/dse_kpi_targets.csv)')},
            'rules': {
                'osa_amount': 'value (Rp) of SP + voucher (isi and blank) + saldo Mobo sell-in to DSE-mapped outlets whose combined value reaches Rp 300K in the period (GAPLOK OSA productivity rule); toggle: all outlets',
                'osa_target': 'official individual OSA target (IOH = IM3 + 3ID, rebalanced) from the target workbook; proxy = September full month only where a DSE has no official target',
                'sp_target': 'official Sell-In SP target in pcs per DSE (rebalanced), prorated MTD in the app',
                'sp_pcs': 'SP pcs sold in (all brands, all SP products) to DSE-mapped outlets; SP injection (digital, MOBO) is in spi_pcs / spi_amt / spi_out, MTD only; the app adds it to SP achievement (switch on by default)',
                'uar': 'DSE-mapped outlets with >= 5 SP pcs in the period',
                'effective_call': 'productive visits (executed visit with SP/VC qty > 0 or saldo > Rp 50K) / planned visits (fix PJP); toggle: executed visits',
                'class': 'urban/rural by branch rule (KARAWANG, KAB BEKASI = rural) unless the targets file gives U|R',
            },
            'unmatched_penjualan_outlets': unmatched, 'duplicate_visit_rows': dup,
        },
        'policy': POLICY,
        'dses': rows,
    }
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(feed, f, ensure_ascii=False)
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* DSE KPI feed (KPI DSE - Oct 2026), generated by scripts/build_dse_kpi_feed.py */\nwindow.DSE_KPI_FEED = ')
        json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    with open(TEMPLATE, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['dse_name', 'osa_target_rp', 'class', 'branch', 'micro_cluster', 'note'])
        for r in rows:
            w.writerow([r['n'], r['osa_tgt'], r['cls'], r['br'], r['mc'], 'proxy = September actual; edit and save as dse_kpi_targets.csv'])

    tot = lambda key: sum(r[key] for r in rows)
    print(f"{len(rows)} DSEs | with visits {feed['metadata']['dses_with_visits']} | penjualan outlets not matched to a DSE: {unmatched} | duplicate visit rows: {dup}")
    print(f"sell-in cut {M['cut']} | visits cut day {feed['metadata']['visits_cut_day']}")
    print(f"Targets: {tgt_rows} workbook rows, {len(tgt)} placed on a roster DSE, {len(tgt_orphans)} orphan rows, {sum(1 for r in rows if r['osa_tgt_src'] != 'official')} roster DSEs without an official target")
    print(f"OSA amount {tot('osa_amt'):,.0f} (qualifying outlets {tot('osa_out'):,}) of SP+VC+saldo {tot('osa_all'):,.0f} | proxy target {tot('osa_tgt'):,.0f}")
    print(f"SP pcs {tot('sp_pcs'):,} | outlets with SP {tot('sp_out'):,} | UAR>=5 {tot('sp_uar5'):,} | class R {sum(1 for r in rows if r['cls']=='R')} U {sum(1 for r in rows if r['cls']=='U')}")
    print(f"visits: planned {tot('planned'):,} executed {tot('actual'):,} productive {tot('prod'):,}")
    top = sorted(rows, key=lambda r: -r['sp_pcs'])[:5]
    print('top SP pcs:', [(r['n'], r['sp_pcs'], r['sp_uar5']) for r in top])
    print(f"wrote {OUT_JS} ({os.path.getsize(OUT_JS)/1024:.0f} KB)")


if __name__ == '__main__':
    main()
