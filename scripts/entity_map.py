#!/usr/bin/env python3
"""
entity_map.py  ·  shared outlet entity resolver (owner decision 23 Oct 2026; docs/assessments/hybrid_entity_recommendation.md)

One physical outlet = one entity. A Hybrid outlet carries an IM3 id and a 3ID id and is ONE entity; IM3 only and 3ID only outlets are one entity each.
entity_of(brand, id) returns the entity key:
  * master outlet                      -> its outlet_key (the internal key used by every feed)
  * id paired in the catalogue only    -> 'C:<im3>_<3id>'   (both ids of the pair give the same key)
  * anything else                      -> 'S:<brand>:<id>'  (single-brand entity outside the master)
brand_flag_of(brand, id) -> HYBRID / IM3_ONLY / 3ID_ONLY (derived from the ids, never from the catalogue label).

Sources: data/catalogues/territory_management_master.csv (columns entity_id, brand_flag, outlet_key, ids) and, for pairs the master does not hold,
data/catalogues/outlet_catalogue_ioh.csv. Pure stdlib; import as `import entity_map`.
"""
import csv
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')


def nid(v):
    s = str(v if v is not None else '').strip()
    if s.endswith('.0'):
        s = s[:-2]
    s = s.lstrip('0')
    return '' if s.upper() == 'NAN' else s


class EntityMap:
    def __init__(self):
        self.by_id = {}          # (brand, id) -> (entity key, brand_flag)
        self.entities = {}       # entity key -> {'ids': {'IM3': id, '3ID': id}, 'flag': ..., 'entity_id': ..., 'master': bool}
        p = os.path.join(CAT, 'territory_management_master.csv')
        with open(p, encoding='utf-8', newline='') as f:
            for r in csv.DictReader(f):
                a, b = nid(r.get('outlet_id_im3')), nid(r.get('outlet_id_3id'))
                key = r['outlet_key']
                flag = r.get('brand_flag') or ('HYBRID' if a and b else ('IM3_ONLY' if a else ('3ID_ONLY' if b else 'TANPA_ID')))
                self.entities[key] = {'ids': {'IM3': a, '3ID': b}, 'flag': flag, 'entity_id': r.get('entity_id') or key, 'master': True}
                for br, i in (('IM3', a), ('3ID', b)):
                    if i:
                        cur = self.by_id.get((br, i))
                        if cur is None or (flag == 'HYBRID' and cur[1] != 'HYBRID'):     # an id on two master rows (open PAIR_3ID_GANDA decision): the Hybrid entity wins
                            self.by_id[(br, i)] = (key, flag)
        p = os.path.join(CAT, 'outlet_catalogue_ioh.csv')
        if os.path.exists(p):
            with open(p, encoding='utf-8', newline='') as f:
                for r in csv.DictReader(f):
                    a, b = nid(r.get('outlet_id_im3')), nid(r.get('outlet_id_3id'))
                    if not (a and b) or ('IM3', a) in self.by_id or ('3ID', b) in self.by_id:
                        continue
                    key = 'C:%s_%s' % (a, b)
                    self.entities[key] = {'ids': {'IM3': a, '3ID': b}, 'flag': 'HYBRID', 'entity_id': r.get('outlet_id_ioh') or key, 'master': False}
                    self.by_id[('IM3', a)] = (key, 'HYBRID')
                    self.by_id[('3ID', b)] = (key, 'HYBRID')

    def entity_of(self, brand, oid):
        i = nid(oid)
        hit = self.by_id.get((brand, i))
        return hit[0] if hit else 'S:%s:%s' % (brand, i)

    def brand_flag_of(self, brand, oid):
        i = nid(oid)
        hit = self.by_id.get((brand, i))
        return hit[1] if hit else ('IM3_ONLY' if brand == 'IM3' else '3ID_ONLY')


_MAP = None


def get():
    global _MAP
    if _MAP is None:
        _MAP = EntityMap()
    return _MAP


def entity_of(brand, oid):
    return get().entity_of(brand, oid)


def brand_flag_of(brand, oid):
    return get().brand_flag_of(brand, oid)


def merge_key(brand, oid, default):
    """Key for an outlet outside the master: the shared catalogue-pair key 'C:<im3>_<3id>' when the catalogue pairs this id with the other brand's id
    (both brands then land on one entity), else `default`. Pairs whose partner id is a master outlet are not merged (held by the owner's pairing rule)."""
    ek = get().entity_of(brand, oid)
    return ek if ek.startswith('C:') else default


def pair_ids(key):
    e = get().entities.get(key)
    return dict(e['ids']) if e else None


if __name__ == '__main__':
    m = get()
    from collections import Counter
    c = Counter(e['flag'] for e in m.entities.values())
    print('entities', len(m.entities), dict(c), 'ids', len(m.by_id), 'catalogue-only pairs', sum(1 for e in m.entities.values() if not e['master']))
