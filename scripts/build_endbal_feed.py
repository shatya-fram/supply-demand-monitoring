#!/usr/bin/env python3
"""
build_endbal_feed.py
END BALANCE Outlet feed: closing stock balance per outlet (ENDBAL, Stock Balance Daily Report) joined to our master
territory (area, MC, DSO, DSE, site) and to saldo sell-in from DAILY_DATA_MOBII (penjualan feed).

Inputs
  raw/ENDBAL/endbal_*.csv                 Stock Balance Daily Report (comma CSV, header line starts with "Date"); every file in the folder is read
  website/data/territory_feed.json        master outlets (IM3 / 3ID ids -> outlet_key, branch, MC, DSO, DSE, site)
  data/processed/penjualan_feed.json      DAILY_DATA_MOBII per outlet (saldo MTD, September full, day values) and ad-hoc outlets

Account types: Stock Account Normal = stock (headline), Commission Transaction Account = commission, blank = unlabelled wallets ("lainnya").
The three are kept apart; the page lets the user choose the balance basis.

Outputs
  website/data/endbal_feed.js   window.ENDBAL_FEED
  data/processed/endbal_feed.json
"""
import csv, glob, json, os, re
from collections import defaultdict, Counter
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'raw', 'ENDBAL', '*.csv')
TERR = os.path.join(ROOT, 'website', 'data', 'territory_feed.json')
PENJ = os.path.join(ROOT, 'data', 'processed', 'penjualan_feed.json')
OUT_JS = os.path.join(ROOT, 'website', 'data', 'endbal_feed.js')
OUT_JSON = os.path.join(ROOT, 'data', 'processed', 'endbal_feed.json')


def fl(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def norm(s):
    return str(s if s is not None else '').strip().lstrip('0')


def read_rows():
    rows, files = [], []
    for p in sorted(glob.glob(RAW)):
        hdr, n = None, 0
        with open(p, encoding='utf-8-sig', errors='replace', newline='') as f:
            for r in csv.reader(f):
                if hdr is None:
                    if r and r[0] == 'Date' and len(r) > 10:
                        hdr = r
                    continue
                if len(r) == len(hdr):
                    rows.append(dict(zip(hdr, r))); n += 1
        files.append({'file': os.path.relpath(p, ROOT), 'rows': n})
    # Every export is a full snapshot of one day: summing several days would double every balance, so only the latest snapshot is used.
    latest = max((r['Date'] for r in rows), default=None)
    if latest:
        skipped = sorted({r['Date'] for r in rows if r['Date'] != latest})
        rows = [r for r in rows if r['Date'] == latest]
        for f in files:
            f['snapshot'] = latest
        if skipped:
            print(f"  ENDBAL: using snapshot {latest} only; older snapshot(s) ignored: {', '.join(skipped)}")
    return rows, files


def main():
    rows, files = read_rows()
    if not rows:
        raise SystemExit('no ENDBAL rows found in raw/ENDBAL')
    terr = json.load(open(TERR, encoding='utf-8'))['outlets']
    pj = json.load(open(PENJ, encoding='utf-8'))
    PM = pj['metadata']
    cut = PM['cut_day']
    mc_info = PM.get('mc_info', {})

    master = {}                                    # normalised id -> master outlet
    for o in terr:
        for c in (o.get('outlet_id_im3'), o.get('outlet_id_3id')):
            if c and norm(c):
                master.setdefault(norm(c), o)
    pj_by_key = {o['k']: o for o in pj['outlets']}
    adhoc = {}
    for o in pj['outlets']:
        if o.get('tier') == 'A':
            adhoc.setdefault(norm(o['id']), o)

    # ---- per organization
    org = defaultdict(lambda: {'st': 0.0, 'ot': 0.0, 'cm': 0.0, 'av': 0.0, 'avo': 0.0, 'type': '', 'cl': '', 'name': '', 'sa': ''})
    for r in rows:
        o = org[r['Organization ID']]
        b, a, t = fl(r['Current Balance']), fl(r['Average Transaction Amount']), r['Account Type']
        if t == 'Stock Account Normal':
            o['st'] += b; o['av'] += a
        elif t == 'Commission Transaction Account':
            o['cm'] += b
        else:
            o['ot'] += b; o['avo'] += a
        o['type'] = o['type'] or r['Organization Type']; o['cl'] = o['cl'] or r['Cluster']
        o['name'] = o['name'] or r['Organization Name']; o['sa'] = o['sa'] or r['Sales Area']
    snapshot = rows[0]['Date']

    # ---- roll up to one record per outlet key (dual-brand outlets have two organization ids)
    out = {}
    cls = Counter()
    unmapped = Counter()
    unmapped_bal = 0.0
    for oid, o in org.items():
        if o['type'] != 'Outlet':
            cls['bukan outlet'] += 1
            continue
        k = norm(oid)
        m = master.get(k)
        a = None if m else adhoc.get(k)
        if m:
            key, t = m['outlet_key'], 'M'
            p = pj_by_key.get(key)
            rec = {'k': key, 'n': m['outlet_name'], 't': 'M', 'b': m['branch'], 'm': m['micro_cluster'], 'o': m.get('dso_leader', ''), 'h': m.get('hoa_leader', ''),
                   'd': str(m.get('dse_name') or '').replace('.0', ''), 's': m.get('site_nbs') or m.get('site_name') or ''}
            cls['master'] += 1
        elif a:
            key = a['k']
            mi = mc_info.get(a['mc'], {})
            p = a
            rec = {'k': key, 'n': a.get('n') or o['name'], 't': 'A', 'b': mi.get('br', ''), 'm': a['mc'], 'o': mi.get('dso', ''), 'h': mi.get('hoa', ''), 'd': 'UNASSIGNED (adhoc)', 's': a.get('site') or ''}
            cls['adhoc'] += 1
        else:
            cls['tidak terpetakan'] += 1
            unmapped[o['cl'] or '(kosong)'] += 1
            unmapped_bal += o['st']
            continue
        e = out.get(key)
        if not e:
            sal = (p or {}).get('c', {}).get('SALMO')
            y = pv = 0
            if sal:
                for d in sal[10] or []:
                    if d[0] == cut: y += d[1]
                    if d[0] == cut - 1: pv += d[1]
            rec.update({'i': [], 'st': 0.0, 'ot': 0.0, 'cm': 0.0, 'av': 0.0, 'y': round(y), 'p': round(pv), 'mt': round(sal[1]) if sal else 0, 'sf': round(sal[5]) if sal else 0, 'sl': round(sal[3]) if sal else 0})
            e = out[key] = rec
        e['i'].append(oid)
        e['st'] += o['st']; e['ot'] += o['ot']; e['cm'] += o['cm']; e['av'] += o['av']

    recs = []
    for e in out.values():
        e['st'] = round(e['st']); e['ot'] = round(e['ot']); e['cm'] = round(e['cm']); e['av'] = round(e['av'])
        recs.append(e)
    recs.sort(key=lambda r: (r['b'], r['m'], r['d'], r['n']))

    feed = {
        'metadata': {
            'generated_at': datetime.now().isoformat(timespec='seconds'), 'snapshot': snapshot, 'files': files,
            'sellin_cut': PM['cut'], 'sellin_cut_day': cut, 'rows': len(rows), 'organizations': len(org),
            'outlet_orgs': sum(1 for o in org.values() if o['type'] == 'Outlet'), 'classification': dict(cls),
            'unmapped_by_cluster': dict(unmapped.most_common(15)), 'unmapped_stock_balance': round(unmapped_bal),
            'outlets': len(recs), 'master_outlets': sum(1 for r in recs if r['t'] == 'M'), 'adhoc_outlets': sum(1 for r in recs if r['t'] == 'A'),
            'rules': {
                'stock': 'Stock Account Normal balance (one per outlet); headline measure',
                'other': 'rekening tanpa label Account Type (lainnya); komisi = Commission Transaction Account; keduanya terpisah dari stok',
                'avg': 'Average Transaction Amount of the stock account (daily); inventory days = balance / avg when avg > 0',
                'sellin': 'saldo sell-in from DAILY_DATA_MOBII: y = cut day, p = day before, mt = MTD, sf = September full, sl = LMTD',
                'mapping': 'outlet id (IM3 or 3ID, leading zeros stripped) -> master outlet, else ad-hoc outlet; unmapped outlets are only counted',
            },
        },
        'outlets': recs,
    }
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* END BALANCE feed (ENDBAL stock balance + saldo sell-in), generated by scripts/build_endbal_feed.py */\nwindow.ENDBAL_FEED = ')
        json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    M = feed['metadata']
    print(f"snapshot {snapshot} | rows {M['rows']:,} | orgs {M['organizations']:,} | outlets {M['outlets']:,} (master {M['master_outlets']:,}, adhoc {M['adhoc_outlets']:,}) | unmapped {cls['tidak terpetakan']:,}")
    print(f"stock Rp {sum(r['st'] for r in recs):,} | zero {sum(1 for r in recs if r['st'] <= 0):,} | saldo sell-in day {cut}: Rp {sum(r['y'] for r in recs):,} ({sum(1 for r in recs if r['y'] > 0):,} outlets)")
    print(f"wrote {OUT_JS} ({os.path.getsize(OUT_JS)/1024:.0f} KB)")


if __name__ == '__main__':
    main()
