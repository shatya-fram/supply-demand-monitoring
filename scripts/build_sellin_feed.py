#!/usr/bin/env python3
"""
build_sellin_feed.py
Builds the Sell-In Monitoring feed from the MOBI exports:
  raw/SP VC Sellin/*.csv            (Physical Distribution Summary Report, DISTRIBUTION TYPE = Sell In)
  raw/MOBI TRansfer Balance/*.csv   (same layout, DISTRIBUTION TYPE = Balance Transfer)

Scope (owner decision, 13 Oct 2026): outlet-bound flows only, DSE -> Outlet and MPX/SDP -> Outlet.
Bulk MPX -> MP3 and MPX -> DSE rows are counted in metadata but not emitted as facts.
Product category follows the report: Voucher, Starter Pack (physical), E-Voucher (balance).

Rules locked in docs/assessments/mobii_field_map_and_dse_allocation.md section 4:
  header by token, 44 fields, value = QTY x RATE/UNIT (physical) or QTY (balance),
  territory from the master outlet first, then DEST PARTNER TERRITORY / DEST ADDITIONAL TERRITORY,
  DSE from USER NAME = master DSE code, then the outlet's assigned DSE, else the login.

Outputs:
  website/data/sellin_feed.js   (window.SELLIN_FEED)
  data/processed/sellin_feed.json
"""
import os, re, csv, glob, json, collections
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'raw')
MASTER = os.path.join(ROOT, 'website', 'data', 'territory_feed.json')
OUT_JS = os.path.join(ROOT, 'website', 'data', 'sellin_feed.js')
OUT_JSON = os.path.join(ROOT, 'data', 'processed', 'sellin_feed.json')

SOURCES = [
    ('P', 'Physical', [os.path.join(RAW, 'SP VC Sellin', '*.csv'), os.path.join(RAW, 'SP VC Selli', '*.csv')]),
    ('B', 'Balance', [os.path.join(RAW, 'MOBI TRansfer Balance', '*.csv')]),
]
NUM = re.compile(r'^\d+(\.\d+)?$')


def num(v):
    return float(v) if v and NUM.match(v) else 0.0


def load_report(patterns):
    rows, files, skipped = [], [], 0
    for pat in patterns:
        for p in sorted(glob.glob(pat)):
            hdr = None
            n = 0
            with open(p, encoding='utf-8', errors='replace') as f:
                for line in f:
                    if hdr is None:
                        if line.startswith('TRANSACTION DATETIME'):
                            hdr = line.rstrip('\r\n').split('|')
                        continue
                    r = line.rstrip('\r\n').split('|')
                    if len(r) != len(hdr):
                        skipped += 1
                        continue
                    rows.append(dict(zip(hdr, [x.strip() for x in r])))
                    n += 1
            files.append({'file': os.path.relpath(p, ROOT), 'rows': n})
    return rows, files, skipped


def sender_tier(name):
    u = name.upper()
    if u.startswith('CANVASSER'): return 'DSE'
    if u.startswith('MPC - OWNER'): return 'MPX'
    if u.startswith('SDP'): return 'SDP'
    return 'UNK'


def receiver_tier(r):
    if r['DEST_OUTLET TYPE'] in ('Mobo Outlet', 'Non Mobo Outlet'): return 'OUTLET'
    tn = r['TO NODE NAME'].upper()
    if tn.startswith('CANVASSER'): return 'DSE'
    if tn.startswith('MPC - OWNER') or '_MP3' in r['DEST_ORGANIZATIONNAME'].upper() or 'MP3' in r['DEST_OUTLET TYPE'].upper(): return 'MP3'
    if tn.startswith('OUTLET'): return 'OUTLET'
    return 'OTHER'


def norm_distributor(name):
    n = re.sub(r'[^A-Z0-9 ]', ' ', name.upper())
    n = re.sub(r'\b(PT|CV|TBK)\b', ' ', n)
    return re.sub(r'\s+', ' ', n).strip()


def load_gaplok():
    cat = os.path.join(ROOT, 'data', 'catalogues')
    groups = json.load(open(os.path.join(cat, 'gaplok_product_groups.json'), encoding='utf-8'))
    sku_to_denom = {}
    for gkey, g in groups.items():
        for d in g['denominations']:
            for sku in d['skus']:
                sku_to_denom[sku.upper()] = (gkey, d['key'])
    loc = {r['micro_cluster']: r for r in json.load(open(os.path.join(cat, 'gaplok_location_mapping.json'), encoding='utf-8'))}
    return groups, sku_to_denom, loc


def main():
    groups, sku_to_denom, gaplok_loc = load_gaplok()
    unmapped_skus = collections.Counter()
    master = json.load(open(MASTER, encoding='utf-8'))
    outlets = master['outlets']
    by_im3 = {str(o['outlet_id_im3']).strip(): o for o in outlets if o.get('outlet_id_im3')}
    by_3id = {str(o['outlet_id_3id']).strip(): o for o in outlets if o.get('outlet_id_3id')}
    dse_by_code = {}
    for o in outlets:
        for c in (o.get('dse_code_im3'), o.get('dse_code_3id')):
            if c and o.get('dse_name'):
                dse_by_code[str(c).strip().upper()] = o['dse_name']
    mc_branch = {o['micro_cluster']: o['branch'] for o in outlets}
    mc_dso = {o['micro_cluster']: o.get('dso_leader', '') for o in outlets}
    branch_hoa = {o['branch']: o.get('hoa_leader', '') for o in outlets}
    ij_mcs = set(mc_branch)

    facts = []
    extra_outlets = {}
    days = set()
    meta_flows = collections.Counter()
    dropped = collections.Counter()
    unmapped_dse_logins = collections.Counter()
    distributors = collections.Counter()
    file_info = {}

    for src, src_label, patterns in SOURCES:
        rows, files, skipped = load_report(patterns)
        file_info[src_label] = {'files': files, 'skipped_rows': skipped}
        for r in rows:
            st, rt = sender_tier(r['FROM NODE NAME']), receiver_tier(r)
            meta_flows[(src_label, st + '>' + rt)] += 1
            if rt != 'OUTLET':
                dropped['not outlet-bound (' + st + '>' + rt + ')'] += 1
                continue
            brand = r['BRAND']
            key = r['DEST_SALDOMOBO_ID']
            lookup = by_im3 if brand == 'IM3' else by_3id
            o = lookup.get(key) or lookup.get(key.lstrip('0'))
            if o:
                mc, kec, okey = o['micro_cluster'], o.get('kecamatan') or '', o['outlet_key']
                mapped = 1
            else:
                mc = r['DEST PARTNER TERRITORY'] if r['DEST PARTNER TERRITORY'] in ij_mcs else (r['INITIATOR MICRO CLUSTER'] if r['INITIATOR MICRO CLUSTER'] in ij_mcs else '')
                if not mc:
                    dropped['outside Inner Jakarta MCs'] += 1
                    continue
                kec = r['DEST ADDITIONAL TERRITORY'].upper()
                okey = 'X:' + brand + ':' + key
                mapped = 0
                if okey not in extra_outlets:
                    extra_outlets[okey] = {'outlet_key': okey, 'outlet_name': r['DEST_ORGANIZATIONNAME'], 'branch': mc_branch[mc], 'micro_cluster': mc,
                                           'kecamatan': kec, 'site_nbs': 'UNMAPPED', 'dse_name': '', 'dso_leader': mc_dso.get(mc, ''), 'hoa_leader': branch_hoa.get(mc_branch[mc], '')}
            try:
                dt = datetime.strptime(r['TRANSACTION DATETIME'], '%d-%b-%Y %H:%M:%S')
            except ValueError:
                dropped['bad datetime'] += 1
                continue
            day = dt.strftime('%Y-%m-%d')
            days.add(day)
            qty = num(r['QTY'])
            value = qty * num(r['RATE/UNIT']) if src == 'P' else qty
            cat = {'Voucher': 'VC', 'Starter Pack': 'SP', 'E-Voucher': 'EV'}.get(r['PRODUCT CATEGORY'], r['PRODUCT CATEGORY'][:2].upper())
            login = r['USER NAME'].strip()
            if st == 'DSE':
                dse = dse_by_code.get(login.upper())
                if not dse and o and o.get('dse_name'):
                    dse = o['dse_name']
                if not dse:
                    dse = 'login:' + login
                    unmapped_dse_logins[login] += 1
            else:
                dse = ''
            distributors[norm_distributor(r['ORGANIZATION NAME'])] += 1
            if src == 'B':
                grp, denom = 'SALDO', 'SALDO'
            else:
                grp, denom = sku_to_denom.get(r['PRODUCT NAME'].strip().upper(), ('SP' if cat == 'SP' else 'VC', 'OTHER_' + cat))
                if denom.startswith('OTHER_'):
                    unmapped_skus[r['PRODUCT NAME']] += 1
            facts.append([day, brand, src, cat, st, round(qty), round(value), okey, dse, mc, kec, mapped, r['PRODUCT NAME'][:40], login, norm_distributor(r['ORGANIZATION NAME']), grp, denom])

    days = sorted(days)
    day_idx = {d: i for i, d in enumerate(days)}
    for f in facts:
        f[0] = day_idx[f[0]]

    # product list for the toolbar / drill
    products = collections.defaultdict(lambda: [0, 0, 0])
    for f in facts:
        p = products[(f[1], f[3], f[12])]
        p[0] += 1; p[1] += f[5]; p[2] += f[6]

    feed = {
        'metadata': {
            'generated_at': datetime.now().isoformat(timespec='seconds'),
            'period_start': days[0], 'period_end': days[-1], 'days': days,
            'sources': file_info,
            'columns': ['day_idx', 'brand', 'src(P=physical,B=balance)', 'cat(VC,SP,EV)', 'flow(DSE,MPX,SDP,UNK -> outlet)', 'qty', 'value_rp', 'outlet_key', 'dse_name', 'mc', 'kecamatan', 'mapped', 'product', 'login', 'distributor', 'gaplok_group(SP,VC,SALDO)', 'gaplok_denomination'],
            'unmapped_skus': dict(unmapped_skus),
            'flows_seen': {k[0] + ' ' + k[1]: v for k, v in sorted(meta_flows.items())},
            'dropped': dict(dropped),
            'facts': len(facts),
            'unmapped_outlets': len(extra_outlets),
            'unmapped_dse_logins': len(unmapped_dse_logins),
            'rules': 'value = QTY x RATE/UNIT (physical) or QTY (balance); outlet-bound rows only; territory from master, else DEST PARTNER TERRITORY; DSE from login = master DSE code, else outlet assigned DSE, else login',
        },
        'facts': facts,
        'gaplok': {'product_groups': groups, 'locations': gaplok_loc},
        'extra_outlets': list(extra_outlets.values()),
        'products': [{'brand': k[0], 'cat': k[1], 'name': k[2], 'tx': v[0], 'qty': v[1], 'value': v[2]} for k, v in sorted(products.items(), key=lambda x: -x[1][2])],
        'distributors': [{'name': k, 'tx': v} for k, v in distributors.most_common()],
    }
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(feed, f, ensure_ascii=False)
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* Sell-In Monitoring feed, generated by scripts/build_sellin_feed.py */\n')
        f.write('window.SELLIN_FEED = ')
        json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    m = feed['metadata']
    print(f"facts {m['facts']:,} | days {m['period_start']}..{m['period_end']} | unmapped outlets {m['unmapped_outlets']} | unmapped DSE logins {m['unmapped_dse_logins']}")
    print('dropped:', m['dropped'])
    print('flows seen:', m['flows_seen'])
    tot = collections.Counter()
    for f in facts:
        tot[(f[2], f[3], 'qty')] += f[5]; tot[(f[2], f[3], 'value')] += f[6]
    print('totals:', {f"{k[0]}/{k[1]} {k[2]}": f"{v:,.0f}" for k, v in sorted(tot.items())})
    print(f"wrote {OUT_JS} ({os.path.getsize(OUT_JS)/1024:.0f} KB)")


if __name__ == '__main__':
    main()
