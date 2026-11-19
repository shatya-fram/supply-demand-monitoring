#!/usr/bin/env python3
"""
build_kpi_nov_feed.py
KPI and incentive inputs for the November 2026 policy (owner slides, 19 Nov 2026):
KPI DSE (OSA, SP Data Sell-In, RGU-GA Trade KPI + double GA incentive, compliance), the two boosters
(GA Achiever, Subs 1st Recharge) and the HoA / DSO / DSP scorecard (GA Trade KPI, GA FWA, DSE compliance).
Contract and every assumption: docs/assessments/kpi_playbook_nov_2026_assessment.md.

Scoring is done in the browser (website/kpi_nov.js) from these inputs and the policy block.
This builder adds only what the other feeds do not carry, keyed by DSE person id (pid of dse_kpi_feed):
  GA per brand (outlet tagging, ga_feed.js, running month), GA outlet slab counts for GA Achiever,
  unique mapped outlets, unique effective-call outlets and unique visited outlets (PJP mapping outlets only),
  GA per MC and brand on both bases (outlet tagging and activation site).

Run after build_ga_feed, daily_update.py (dse_kpi_feed, visits) and build_ga_site_feed:
  python3 scripts/build_kpi_nov_feed.py
Pure stdlib.
"""
import json
import os
from collections import defaultdict
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'website', 'data')
OUT_JS = os.path.join(D, 'kpi_nov_feed.js')

EC_SALDO_MIN = 75000        # Effective call: saldo >= Rp 75,000, or SP / Voucher pcs > 0 (owner 13 Nov 2026; same as generate_dse_visits_feed.py)

POLICY = {
    'title': 'KPI DSE · Playbook November 2026',
    'version': 'nov2026',
    'source': 'Slides kebijakan insentif DSE November 2026 (owner, 19 Nov 2026)',
    'dse': {
        'osa': {'label': 'OSA', 'weight': 0.30, 'slabs': [{'sla': 0.90, 'rate': 0.002}, {'sla': 1.00, 'rate': 0.004}], 'max_rp': 750000,
                'basis': 'rate x OSA amount (Rp)'},
        'sp': {'label': 'SP Data Sell In', 'weight': 0.35, 'slabs': [{'sla': 0.90, 'rate': 500}, {'sla': 1.00, 'rate': 1000}], 'max_rp': 500000,
               'basis': 'rate x SP pcs (SP 3GB + SP S PLUS V2 + SP Injection)'},
        'ga': {'label': 'RGU-GA Trade KPI', 'weight': 0.35, 'new': True, 'slabs': [{'sla': 0.80, 'rate': 1000}, {'sla': 1.00, 'rate': 2000}], 'max_rp': 1000000,
               'double_at': 1.0, 'double_max_rp': 1000000, 'basis': 'rate x GA (outlet wise); double fee when GA achievement >= 100%'},
        'max_total_rp': 3250000,
        'compliance': {
            'sp5': {'label': 'Outlet mapping sell-in SP Data >= 5 pcs', 'weight': 0.5, 'min_pcs': 5, 'standard_urban': 30, 'standard_rural': 25},
            'ec': {'label': 'Effective call (aturan 18 Nov 2026: produktif / outlet dikunjungi)', 'weight': 0.5, 'standard': 0.70},
            'cap': 1.0,
            'index': [{'min': 1.0, 'x': 1.0}, {'min': 0.9, 'x': 0.97}, {'min': 0.8, 'x': 0.95}, {'min': 0.0, 'x': 0.0}],
        },
    },
    'booster': {
        'window': '1-30 November 2026',
        'max_total_rp': 500000,
        'ga_achiever': {
            'label': 'GA Achiever', 'max_rp': 300000, 'outlet_max_rp': 20000, 'min_pjp_outlets': 10, 'min_share': 0.60,
            'hybrid': {'elig_ga': 3, 'tiers': [{'from': 6, 'to': 10, 'rate': 5000}, {'from': 11, 'to': 20, 'rate': 10000}, {'from': 21, 'to': None, 'rate': 20000}]},
            'single': {'elig_ga': 2, 'tiers': [{'from': 4, 'to': 7, 'rate': 5000}, {'from': 8, 'to': 14, 'rate': 10000}, {'from': 15, 'to': None, 'rate': 20000}]},
        },
        'recharge': {
            'label': 'Subs 1st Recharge', 'max_rp': 200000, 'outlet_max_rp': 45000, 'min_active_hybrid': 6, 'min_active_single': 3,
            'tiers': [{'from': 5, 'to': 9, 'm0': 5000, 'm1': 7500}, {'from': 10, 'to': 19, 'm0': 10000, 'm1': 15000}, {'from': 20, 'to': None, 'm0': 20000, 'm1': 25000}],
            'data': 'belum ada (recharge >= Rp 10.000 per pelanggan GA tidak ada di raw/)',
        },
    },
    'scorecard': {
        'compliance_index': [{'min': 0.95, 'x': 1.0}, {'min': 0.85, 'x': 0.99}, {'min': 0.0001, 'x': 0.98}, {'min': 0.0, 'x': 0.0}],
        'rows': [
            {'k': 'sec', 'label': 'Secondary', 'cat': 'Secondary', 'hoa': None, 'hoa_max': None, 'dsp_max': None, 'kam': 0.40, 'kam_max': 1.05},
            {'k': 'ga', 'label': 'RGU-GA Trade KPI', 'cat': 'Akuisisi', 'hoa': 0.50, 'hoa_max': 1.30, 'dsp_max': 1.60, 'kam': 0.20, 'kam_max': 1.30},
            {'k': 'fwa', 'label': 'RGU-GA FWA', 'cat': 'Akuisisi', 'hoa': 0.15, 'hoa_max': 1.30, 'dsp_max': 1.60, 'kam': None, 'kam_max': None},
            {'k': 'cmp', 'label': 'Produktivitas DSE Compliance (Outlet Sell In SP 5 pcs + Effective Call 70%)', 'cat': 'Produktivitas DSE', 'hoa': 0.35, 'hoa_max': 1.10, 'dsp_max': 1.40, 'kam': None, 'kam_max': None},
            {'k': 'boss', 'label': '% Kontribusi Transaksi Inner Outlet BOSS', 'cat': '', 'hoa': None, 'hoa_max': None, 'dsp_max': None, 'kam': 0.40, 'kam_max': 1.30},
        ],
    },
}


def load_js(name):
    with open(os.path.join(D, name), encoding='utf-8') as f:
        s = f.read()
    return json.loads(s[s.index('{'):s.rindex('}') + 1])


def norm(v):
    return ' '.join(str(v or '').upper().split())


def main():
    kpi = load_js('dse_kpi_feed.js')
    tgt = load_js('target_feed.js')
    ga = load_js('ga_feed.js')
    with open(os.path.join(D, 'dse_visits_feed.js'), encoding='utf-8') as f:
        s = f.read()
    vis = json.loads(s[s.index('{'):s.rindex('}') + 1])
    with open(os.path.join(D, 'territory_feed.json'), encoding='utf-8') as f:
        terr = json.load(f)
    site = load_js('ga_site_feed.js')

    # DSE name -> list of KPI rows (a name shared by two people is not looked up by name)
    by_name = defaultdict(list)
    for r in kpi['dses']:
        by_name[norm(r['n'])].append(r)
    dup_names = sorted(n for n, v in by_name.items() if len(v) > 1)
    pid_of_name = {n: v[0]['pid'] for n, v in by_name.items() if len(v) == 1 and v[0].get('pid')}

    # targets (GA per brand) by DSE name
    tga = {}
    for d in tgt['dses']:
        tga.setdefault(norm(d['n']), d)

    # mapped PJP outlets per DSE (master: DSE name + outlet key); non-PJP outlets have DSE UNASSIGNED
    mapped = defaultdict(set)
    for o in terr['outlets']:
        n = norm(o.get('dse_name'))
        if n and n != 'UNASSIGNED':
            mapped[n].add(o['outlet_key'])

    cut = ga['metadata']['cut_day']
    # GA per DSE: brand totals and per physical outlet (combined brands)
    ga_b = defaultdict(lambda: {'IM3': 0, '3ID': 0})
    ga_o = defaultdict(lambda: defaultdict(int))
    ga_mc = defaultdict(lambda: {'IM3': 0, '3ID': 0})
    unmatched_ga = 0
    for r in ga['outlets']:
        o = r.get('o') or []
        q = sum(o[i + 1] for i in range(0, len(o) - 1, 2))
        if q <= 0:
            continue
        ga_mc[r['mc']][r['b']] += q
        n = norm(r.get('dse'))
        if not n or n == 'UNASSIGNED' or r.get('sg') != 'PJP':
            continue
        ga_b[n][r['b']] += q
        ga_o[n][r['k']] += q

    # visits: unique visited / unique effective outlets among the mapped outlets of the DSE (ad-hoc at mapped outlets included)
    vis_by_pid = {d['person_id']: d for d in vis['dses'] if d.get('in_master')}
    out = {}
    for r in kpi['dses']:
        n, pid = norm(r['n']), r.get('pid')
        unique = n in pid_of_name
        d = vis_by_pid.get(pid)
        mset = mapped.get(n, set()) if unique else set()
        vis_u = eff_u = 0
        if d and unique:
            days = defaultdict(lambda: defaultdict(lambda: [0, 0, 0]))   # outlet key -> day -> [sp, vc, saldo]
            seen = set()
            for o in d.get('outlets', []):
                k = o.get('k')
                if k not in mset:
                    continue
                if (o.get('d') or '').strip('.') or (o.get('a') or '').strip('.'):
                    seen.add(k)
                for e in o.get('e', []):
                    x = days[k][e[0]]
                    x[0] += e[1]; x[1] += e[2]; x[2] += e[3]
                    seen.add(k)
            vis_u = len(seen)
            for k, dd in days.items():
                if any(v[0] > 0 or v[1] > 0 or v[2] >= EC_SALDO_MIN for v in dd.values()):
                    eff_u += 1
        t = tga.get(n)
        gb = ga_b.get(n, {'IM3': 0, '3ID': 0})
        hybrid = bool(t and t['sp'][0] > 0 and t['sp'][1] > 0)
        per = ga_o.get(n, {})
        el_h, el_s = POLICY['booster']['ga_achiever']['hybrid']['elig_ga'], POLICY['booster']['ga_achiever']['single']['elig_ga']
        ths = POLICY['booster']['ga_achiever']['hybrid' if hybrid else 'single']
        slab = [0, 0, 0]
        elig = 0
        for q in (per.values() if unique else []):
            if q >= ths['elig_ga']:
                elig += 1
            for i, tr in enumerate(ths['tiers']):
                if q >= tr['from'] and (tr['to'] is None or q <= tr['to']):
                    slab[i] += 1
        out[pid] = {
            'pid': pid, 'hy': 1 if hybrid else 0,
            'ga_t': t['ga'] if t else None,
            'ga': [round(gb['IM3'], 0), round(gb['3ID'], 0)] if unique else None,   # a name shared by two people: GA cannot be attributed
            'map_n': len(mset) if unique else None,
            'vis_u': vis_u if unique else None, 'ec_u': eff_u if unique else None,
            'gslab': slab, 'gelig': elig, 'gout': len(per),
        }

    # GA per MC and brand: outlet tagging and activation site
    mcs = []
    site_mc = {m['mc']: m for m in site['mc']}
    all_mc = sorted(set(ga_mc) | set(site_mc))
    for m in all_mc:
        if not m:
            continue
        s = site_mc.get(m)
        info = ga['metadata']['mc_info'].get(m, {})
        mcs.append({
            'mc': m, 'area': (s or {}).get('area') or info.get('br'), 'hoa': (s or {}).get('hoa') or info.get('hoa'), 'dso': (s or {}).get('dso') or info.get('dso'),
            'tag': [ga_mc[m]['IM3'] if m in ga_mc else 0, ga_mc[m]['3ID'] if m in ga_mc else 0],
            'site': [sum(s['v'][0:6]), sum(s['v'][6:12])] if s else None,
        })

    feed = {
        'metadata': {
            'generated_at': datetime.now().isoformat(timespec='seconds'), 'month': '2026-11', 'month_days': kpi['metadata']['month_days'],
            'cut_day_sellin': kpi['metadata']['cut_day'], 'cut_day_visits': kpi['metadata']['visits_cut_day'], 'cut_day_ga': cut,
            'site_cut_day': site['metadata'].get('cut_day'),
            'contract': 'docs/assessments/kpi_playbook_nov_2026_assessment.md',
            'duplicate_names': dup_names, 'dse_with_ga_target': sum(1 for v in out.values() if v['ga_t']),
            'rules': {
                'ga': 'GA per DSE = GA at PJP outlets of the DSE (outlet tagging, Daily_RGUGA / rguga_daily_outlet_inner), IM3 + 3ID, D1..D' + str(cut),
                'outlet_ec': 'unique mapped outlets with an effective call in the month (SP or Voucher pcs > 0, or saldo >= Rp 75,000 per outlet-day, brands combined), ad-hoc visits at mapped outlets included',
                'hybrid': 'DSE with both an IM3 and a 3ID target (target_feed)',
            },
        },
        'policy': POLICY,
        'dses': out,
        'mcs': mcs,
    }
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* KPI November feed, generated by scripts/build_kpi_nov_feed.py */\nwindow.KPI_NOV_FEED = ' + json.dumps(feed, ensure_ascii=False, separators=(',', ':')) + ';\n')
    n_ec = sum(1 for v in out.values() if v['ec_u'] is not None)
    print('DSE', len(out), 'with ga target', feed['metadata']['dse_with_ga_target'], 'with unique outlets', n_ec, 'dup names', dup_names)
    print('hybrid DSE', sum(v['hy'] for v in out.values()), 'GA total', sum(sum(v['ga']) for v in out.values() if v['ga']), 'MC rows', len(mcs))


if __name__ == '__main__':
    main()
