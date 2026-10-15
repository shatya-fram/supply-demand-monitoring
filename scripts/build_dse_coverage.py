#!/usr/bin/env python3
"""
build_dse_coverage.py
Kecamatan and desa covered by each DSE, based on the LOCATION (lat / long) of the outlets the DSE covers.

Input   website/data/territory_feed.json   master outlets: DSE, lat, long and the mapping's own kecamatan / desa label
Output  website/data/dse_coverage.js       window.DSE_COVERAGE   (+ data/processed/dse_coverage.json)

Method
  1. An outlet with a valid coordinate (inside the Inner Jakarta bounding box) is placed at its coordinate.
  2. The mapping label (kecamatan / desa) is kept when it agrees with the location: the outlet lies within a
     reasonable distance of the median point of all outlets that carry the same label (kecamatan 12 km, desa 5 km: rural desa can be large).
  3. When it does not agree (a mislabelled or mis-geotagged outlet), the label is taken from the nearest outlets
     by coordinate (majority of the 9 nearest labelled outlets of the same branch), so coverage follows the map.
  4. Outlets without a usable coordinate cannot be checked: they keep the mapping label and are counted separately.
  Placeholder labels ('', '0', '0.0', 'nan', '-') are never reported.
No boundary polygons are available offline, so the nearest-outlet vote stands in for a reverse geocode.
"""
import json, math, os, statistics
from collections import Counter, defaultdict
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'website', 'data', 'territory_feed.json')
OUT_JS = os.path.join(ROOT, 'website', 'data', 'dse_coverage.js')
OUT_JSON = os.path.join(ROOT, 'data', 'processed', 'dse_coverage.json')
BOX = (-7.0, -5.8, 106.4, 107.8)          # lat min, lat max, long min, long max
MAX_KM = {'kec': 12.0, 'desa': 5.0}
K = 9
BAD = {'', '0', '0.0', 'nan', '-', 'none', 'null'}


def clean(v):
    s = str(v if v is not None else '').strip().lower()
    return '' if s in BAD else s


def coord(o):
    try:
        la, lo = float(o.get('lat')), float(o.get('long'))
    except (TypeError, ValueError):
        return None
    return (la, lo) if BOX[0] <= la <= BOX[1] and BOX[2] <= lo <= BOX[3] else None


def km(a, b):
    p = math.pi / 180
    x = math.sin((b[0] - a[0]) * p / 2) ** 2 + math.cos(a[0] * p) * math.cos(b[0] * p) * math.sin((b[1] - a[1]) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def main():
    outlets = json.load(open(SRC, encoding='utf-8'))['outlets']
    pts = []                                    # (outlet, (lat, long))
    for o in outlets:
        c = coord(o)
        if c:
            pts.append((o, c))
    # grid index (about 1.1 km cells) for nearest-neighbour votes
    grid = defaultdict(list)
    for i, (o, c) in enumerate(pts):
        grid[(int(c[0] * 100), int(c[1] * 100))].append(i)

    def nearest(i, field, n=K):
        o, c = pts[i]
        cx, cy = int(c[0] * 100), int(c[1] * 100)
        found = []
        for r in range(1, 12):                   # widen the ring until enough labelled neighbours are found
            found = []
            for gx in range(cx - r, cx + r + 1):
                for gy in range(cy - r, cy + r + 1):
                    for j in grid.get((gx, gy), ()):
                        if j != i and pts[j][0].get('branch') == o.get('branch') and clean(pts[j][0].get(field)):
                            found.append((km(c, pts[j][1]), j))
            if len(found) >= n:
                break
        found.sort()
        return [j for _, j in found[:n]]

    # median point of every label (per branch) for the agreement test
    centre = {}
    for field in ('kecamatan', 'desa'):
        g = defaultdict(list)
        for o, c in pts:
            v = clean(o.get(field))
            if v:
                g[(o.get('branch'), v)].append(c)
        for k, L in g.items():
            centre[(field, k)] = (statistics.median(x[0] for x in L), statistics.median(x[1] for x in L))

    geo = {}                                    # outlet_key -> {'kecamatan': label, 'desa': label}
    fixed = Counter(); kept = Counter()
    for i, (o, c) in enumerate(pts):
        res = {}
        for field, key in (('kecamatan', 'kec'), ('desa', 'desa')):
            own = clean(o.get(field))
            ctr = centre.get((field, (o.get('branch'), own))) if own else None
            if own and ctr and km(c, ctr) <= MAX_KM[key]:
                res[field] = own; kept[field] += 1
                continue
            votes = Counter(clean(pts[j][0].get(field)) for j in nearest(i, field))
            if votes:
                res[field] = votes.most_common(1)[0][0]
                fixed[field] += 1
            elif own:
                res[field] = own
        geo[o['outlet_key']] = res

    by = defaultdict(lambda: {'k': Counter(), 'd': Counter(), 'n': 0, 'nc': 0})
    for o in outlets:
        name = str(o.get('dse_name') or '').replace('.0', '').strip().upper()
        if not name or name == '0' or name.startswith('UNASSIGNED'):
            continue
        e = by[name]; e['n'] += 1
        g = geo.get(o['outlet_key'])
        if g:
            e['nc'] += 1
            kk, dd = g.get('kecamatan'), g.get('desa')
        else:                                    # no usable coordinate: mapping label, counted separately
            kk, dd = clean(o.get('kecamatan')), clean(o.get('desa'))
        if kk:
            e['k'][kk] += 1
        if dd:
            e['d'][dd] += 1
    dses = {n: {'n': e['n'], 'nc': e['nc'], 'k': [[a, b] for a, b in e['k'].most_common()], 'd': [[a, b] for a, b in e['d'].most_common()]} for n, e in by.items()}
    meta = {
        'generated_at': datetime.now().isoformat(timespec='seconds'), 'source': 'website/data/territory_feed.json',
        'basis': 'lat / long of the outlets each DSE covers; mapping label kept when it agrees with the location, otherwise the label of the 9 nearest outlets',
        'outlets': len(outlets), 'with_coordinate': len(pts), 'without_coordinate': len(outlets) - len(pts),
        'labels_kept': dict(kept), 'labels_corrected': dict(fixed), 'dses': len(dses),
        'rules': {'max_km_kecamatan': MAX_KM['kec'], 'max_km_desa': MAX_KM['desa'], 'neighbours': K},
    }
    feed = {'metadata': meta, 'dses': dses}
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('/* Kecamatan and desa covered per DSE, based on outlet lat / long (scripts/build_dse_coverage.py) */\nwindow.DSE_COVERAGE = ')
        json.dump(feed, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print(f"{len(dses)} DSEs | outlets with coordinate {len(pts):,} of {len(outlets):,} | labels kept {dict(kept)} corrected {dict(fixed)} | wrote {OUT_JS}")


if __name__ == '__main__':
    main()
