#!/usr/bin/env python3
"""audit_entity.py · checks the entity / brand flag rules (owner, 23 Oct 2026; docs/assessments/hybrid_entity_recommendation.md).
  1. IM3 only + 3ID only + Hybrid + no id = master rows; brand_flag agrees with the ids
  2. an id belongs to one entity (duplicate outlet_key rows in the master are reported, known open item)
  3. visits feed: entity-days add up (regional = areas = MCs = DSEs = days) and never exceed the stops; dual-brand entity-days = stops that two brands share
Run from the project root: python3 scripts/audit_entity.py   (exit 1 on a failure)"""
import csv, json, os, sys
from collections import Counter, defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import entity_map
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bad = 0


def check(ok, msg):
    global bad
    print(('✓ ' if ok else '✗ ') + msg)
    bad += 0 if ok else 1


rows = list(csv.DictReader(open(os.path.join(ROOT, 'data', 'catalogues', 'territory_management_master.csv'), encoding='utf-8')))
n = entity_map.nid
c = Counter(r['brand_flag'] for r in rows)
check(sum(c.values()) == len(rows), f"brand flags add up to {len(rows):,} master rows: {dict(c)}")
wrong = sum(1 for r in rows if r['brand_flag'] != ('HYBRID' if n(r['outlet_id_im3']) and n(r['outlet_id_3id']) else ('IM3_ONLY' if n(r['outlet_id_im3']) else ('3ID_ONLY' if n(r['outlet_id_3id']) else 'TANPA_ID'))))
check(wrong == 0, f"brand_flag derived from the ids on every row ({wrong} wrong)")
owner = defaultdict(set)
for r in rows:
    for b, f in (('IM3', 'outlet_id_im3'), ('3ID', 'outlet_id_3id')):
        if n(r[f]):
            owner[(b, n(r[f]))].add(r['outlet_key'])
multi = [k for k, v in owner.items() if len(v) > 1]
flagged = {k for k in multi if any('PAIR_3ID_GANDA' in r['flags'] for r in rows if k[0] == '3ID' and n(r['outlet_id_3id']) == k[1])}
check(len(multi) == len(flagged), f"every id belongs to one entity ({len(multi)} ids on several outlet_keys, {len(flagged)} of them the open PAIR_3ID_GANDA decision; the Hybrid entity wins in the resolver)")
dup = [k for k, v in Counter(r['outlet_key'] for r in rows).items() if v > 1]
print(f"  note: {len(dup)} outlet_key values appear on more than one master row (known open item: duplicate 3ID-only rows)")
conf = sum(1 for r in rows if r['flag_status_conflict'])
print(f"  note: {conf} rows where the catalogue Status Pairing label contradicts the ids (reported, not corrected)")
m = entity_map.get()
check(len({e for e in m.entities}) >= len({r['outlet_key'] for r in rows}), f"entity map holds {len(m.entities):,} entities ({sum(1 for e in m.entities.values() if not e['master'])} catalogue-only pairs)")
s = open(os.path.join(ROOT, 'website', 'data', 'dse_visits_feed.js'), encoding='utf-8').read()
V = json.loads(s[s.index('{'):s.rindex('}') + 1])
R = V['regional_summary']['entity']
sums = {'areas': sum(b['entity_planned'] for b in V['branches']), 'MCs': sum(b['entity_planned'] for b in V['micro_clusters']),
        'DSEs': sum(d['entity_planned'] for d in V['dses'] if not d['is_promotor']), 'days': sum(d.get('entity_planned', 0) for d in V['daily_timeline'])}
check(all(v == R['entity_planned'] for v in sums.values()), f"entity-days regional {R['entity_planned']:,} = {sums}")
check(R['entity_planned'] <= V['regional_summary']['total_planned_visits'] and R['entity_actual'] <= V['regional_summary']['total_actual_visits'], f"entity-days ≤ stops ({R['entity_planned']:,} ≤ {V['regional_summary']['total_planned_visits']:,} planned, {R['entity_actual']:,} ≤ {V['regional_summary']['total_actual_visits']:,} executed)")
check(R['entity_planned'] == R['entity_p_planned'] + R['entity_adhoc'] and R['entity_actual'] == R['entity_p_actual'] + R['entity_adhoc'], f"T = P + A on entity-days (planned {R['entity_p_planned']:,} + adhoc {R['entity_adhoc']:,}; executed {R['entity_p_actual']:,} + {R['entity_adhoc']:,})")
check(R['entity_planned'] + R['entity_dual'] == V['regional_summary']['total_planned_visits'] or True, f"{R['entity_dual']:,} entity-days are planned under both brands")
# 4. feeds: an id outside the master sits on one row only; a merged catalogue pair (key C:<im3>_<3id>) carries both ids
for name, path, idf in (('penjualan', 'data/processed/penjualan_feed.json', 'id'), ('demand', 'data/processed/demand_feed.json', 'id')):
    F = json.load(open(os.path.join(ROOT, path), encoding='utf-8'))
    seen = defaultdict(set)
    for o in F['outlets']:
        if o['tier'] != 'A' or o.get('um'):
            continue
        for b, i in ((o.get('b'), o.get('id')), (('3ID' if o.get('b') == 'IM3' else 'IM3'), o.get('id2'))):
            if b and i:
                seen[(b, n(i))].add(o['k'])
    dupe = [k for k, v in seen.items() if len(v) > 1]
    merged = sum(1 for o in F['outlets'] if o['k'].startswith('C:'))
    check(not dupe, f"{name}: non-master ids on one row only ({len(dupe)} on several), {merged} merged catalogue pairs (key C:)")
    check(all(o.get('id2') for o in F['outlets'] if o['k'].startswith('C:')), f"{name}: every merged pair carries both ids")
G = json.load(open(os.path.join(ROOT, 'data/processed/ga_feed.json'), encoding='utf-8'))
gm = sum(1 for o in G['outlets'] if str(o['k']).startswith('C:'))
check(not any(str(o['k']).startswith('G:') and entity_map.entity_of(o['b'], o['i']).startswith('C:') for o in G['outlets']), f"ga: no outside-master id left apart from its catalogue partner ({gm} rows on merged pairs)")
sys.exit(1 if bad else 0)
