#!/usr/bin/env python3
"""Non-PJP outlets with transactions (owner, 10 Nov 2026): every master outlet that is NOT PJP (DSE UNASSIGNED: no CSO in the Master Hierarchy 3 Nov, label NON in the November
catalogue, or gone from the hierarchy) but has a transaction this month is flagged NON_PJP_ADA_TRANSAKSI with the streams: MOBII (sell-in), MOBO (demand), GA, PJP (a completed check-in).
Run after the feeds (daily_update.py does):  python3 scripts/build_nonpjp_flags.py
Writes data/catalogues/nonpjp_tx_flags.csv (outlet_key, reasons, streams, values) and website/data/nonpjp_flags.js (window.NONPJP_FLAGS; also adds the flag to the territory feed
rows when that feed is loaded before it)."""
import csv, json, os, re
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')
WEB = os.path.join(ROOT, 'website', 'data')


def load_js(name):
    s = open(os.path.join(WEB, name), encoding='utf-8').read()
    return json.JSONDecoder().raw_decode(s[s.index('=') + 1:].lstrip())[0]


def g(a, i):
    return (a[i] if a and len(a) > i and a[i] else 0) or 0


def main():
    master = list(csv.DictReader(open(os.path.join(CAT, 'territory_management_master.csv'), encoding='utf-8')))
    nonpjp = {}
    for m in master:
        dse = (m['dse_name'] or '').strip().upper()
        if dse in ('', 'UNASSIGNED') or re.match(r'^(\d+(\.0)?|0\.0)$', dse):
            nonpjp[m['outlet_key']] = m
    streams = {k: {} for k in nonpjp}
    PJ = load_js('penjualan_feed.js')
    for o in PJ['outlets']:
        k = o.get('k')
        if k in streams:
            c = o.get('c') or {}
            v = g(c.get('SP'), 0) + g(c.get('SPI'), 0) + sum(g(c.get(x), 1) for x in ('VCF', 'VCB', 'SALMO'))
            if v > 0:
                streams[k]['MOBII'] = streams[k].get('MOBII', 0) + v
    DM = load_js('demand_feed.js')
    for o in DM['outlets']:
        k = o.get('k')
        if k in streams:
            c = o.get('c') or {}
            v = sum(g(c.get(x), 1) for x in c) + g(c.get('SPI'), 0)
            if v > 0:
                streams[k]['MOBO'] = streams[k].get('MOBO', 0) + v
    GA = load_js('ga_feed.js')
    for o in GA['outlets']:
        k = o.get('k')
        if k in streams:
            q = sum((o.get('o') or [])[i + 1] for i in range(0, len(o.get('o') or []), 2))
            if q > 0:
                streams[k]['GA'] = streams[k].get('GA', 0) + q
    VF = load_js('dse_visits_feed.js')
    for p in VF.get('dses', []):
        for ov in p.get('outlets', []):
            k = ov.get('k')
            if k in streams:
                x = str(ov.get('d') or '').count('x')
                if x:
                    streams[k]['PJP'] = streams[k].get('PJP', 0) + x
    rows, cnt = [], Counter()
    for k, st in streams.items():
        m = nonpjp[k]
        flags = m['flags'].split('|')
        reasons = [f for f in ('NON_PJP_MANUAL', 'NON_PJP_KATALOG', 'DSE_HILANG_3NOV', 'TANPA_DSE_HIERARKI', 'HILANG_DARI_HIERARKI', 'TIDAK_ADA_DI_FINAL_20OKT') if f in flags]
        cnt['non_pjp_outlets'] += 1
        if st:
            cnt['with_transactions'] += 1
            for s_ in st:
                cnt['stream_' + s_] += 1
            for r_ in reasons[:1]:
                cnt['reason_' + r_] += 1
            rows.append([k, m['outlet_id_im3'], m['outlet_id_3id'], m['micro_cluster'], m['branch'], '|'.join(reasons), '|'.join(sorted(st)), st.get('MOBII', 0), st.get('MOBO', 0), st.get('GA', 0), st.get('PJP', 0)])
    rows.sort(key=lambda r: -(r[7] + r[8] + r[9]))
    with open(os.path.join(CAT, 'nonpjp_tx_flags.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['outlet_key', 'id_im3', 'id_3id', 'micro_cluster', 'branch', 'alasan_non_pjp', 'sumber_transaksi', 'mobii_mtd', 'mobo_mtd', 'ga_mtd', 'check_in_pjp'])
        w.writerows(rows)
    feed = {r[0]: r[6] for r in rows}
    with open(os.path.join(WEB, 'nonpjp_flags.js'), 'w', encoding='utf-8') as f:
        f.write('/* Non-PJP outlets with transactions this month (scripts/build_nonpjp_flags.py): outlet_key -> sumber (MOBII|MOBO|GA|PJP). Adds the flag NON_PJP_ADA_TRANSAKSI to the territory feed rows. */\n(function (root) {\n  var feed = ')
        json.dump(feed, f, separators=(',', ':'))
        f.write(";\n  if (root) { root.NONPJP_FLAGS = feed; var T = root.TERRITORY_FEED; if (T && T.outlets) T.outlets.forEach(function (o) { if (feed[o.outlet_key]) { var fl = String(o.flags || '').split('|').filter(Boolean); if (fl.indexOf('NON_PJP_ADA_TRANSAKSI') < 0) fl.push('NON_PJP_ADA_TRANSAKSI'); o.flags = fl.join('|'); o.nonpjp_tx = feed[o.outlet_key]; } }); }\n  if (typeof module !== 'undefined' && module.exports) { module.exports = feed; }\n})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null));\n")
    print(dict(cnt))


if __name__ == '__main__':
    main()
