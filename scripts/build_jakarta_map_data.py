#!/usr/bin/env python3
"""
build_jakarta_map_data.py
Builds the spatial dataset for the "JAKARTA INNER MAP" sub-view.
Generates:
  - website/data/jakarta_map_feed.js (high-performance browser map data feed)
  - data/catalogues/jakarta_map_feed.json (master JSON mirror)

Includes:
  1. 7 HoA Branch Area Border polygons (convex hulls + centroids + metrics)
  2. 36 Micro Cluster Border polygons (convex hulls + centroids + metrics + DSO)
  3. 171 Kecamatan Border polygons (convex hulls + centroids + metrics)
  4. 3,858 Cellular NBS Sites (GPS coordinates, coverage metrics, store lists)
  5. 14,694 Retail Outlets (normalized lat/long, supply status, DSE, MC, Site)
"""

import os
import sys
import json
import csv
import math

def normalize_coord(lat, lon):
    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        return None
    # Fix missing decimal in lat like -623004203 -> -6.23004203
    if lat < -100 and lat > -100000000000:
        s = str(int(lat))
        if s.startswith('-6'):
            lat = float('-6.' + s[2:])
    # Fix missing decimal in lon like 1068088500 -> 106.808850
    if lon > 1000 and lon < 100000000000:
        s = str(int(lon))
        if s.startswith('106') or s.startswith('107'):
            lon = float(s[:3] + '.' + s[3:])
    # Range check for Greater Jakarta / Jabodetabek / Karawang
    if -7.5 <= lat <= -5.5 and 106.0 <= lon <= 108.0:
        return round(lat, 6), round(lon, 6)
    return None

def convex_hull(points):
    """Monotone chain 2D convex hull returning list of [lat, lon] vertices."""
    pts = sorted(list(set(points)))
    if len(pts) == 0:
        return []
    if len(pts) == 1:
        lat, lon = pts[0]
        r = 0.005
        return [[round(lat + r * math.cos(a), 6), round(lon + r * math.sin(a), 6)]
                for a in [0, 1.05, 2.09, 3.14, 4.19, 5.24]]
    if len(pts) == 2:
        lat1, lon1 = pts[0]
        lat2, lon2 = pts[1]
        r = 0.003
        return [[round(lat1 - r, 6), round(lon1 - r, 6)],
                [round(lat1 + r, 6), round(lon1 - r, 6)],
                [round(lat2 + r, 6), round(lon2 + r, 6)],
                [round(lat2 - r, 6), round(lon2 + r, 6)]]
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]

def compute_centroid(points):
    if not points:
        return [-6.22, 106.85]
    lat_sum = sum(p[0] for p in points)
    lon_sum = sum(p[1] for p in points)
    return [round(lat_sum / len(points), 6), round(lon_sum / len(points), 6)]

def get_status(o):
    sellin = float(o.get('sellin_val') or 0)
    bal = float(o.get('bal_val') or 0)
    vis = int(o.get('visit_count') or 0)
    if sellin > 0:
        return 'sellin'
    if bal > 0:
        return 'saldo'
    if vis > 0:
        return 'visit'
    return 'none'

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    master_path = os.path.join(root, 'data', 'catalogues', 'territory_management_master.json')
    if not os.path.exists(master_path):
        print(f"Master not found: {master_path}")
        sys.exit(1)

    print("Loading master catalogue...")
    with open(master_path, 'r', encoding='utf-8') as f:
        master = json.load(f)

    # 1. Coordinate recovery from NBS mapping CSVs
    print("Loading coordinate recovery map from raw NBS CSVs...")
    recovery_map = {}
    csv_paths = [
        os.path.join(root, 'raw', 'Outlet & Mapping', 'NBS Site to Outlet', 'IM3_OUTLET_NBS_202608.csv'),
        os.path.join(root, 'raw', 'Outlet & Mapping', 'NBS Site to Outlet', '3ID_OUTLET_NBS_202608.csv')
    ]
    for cp in csv_paths:
        if os.path.exists(cp):
            with open(cp, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.DictReader(f, delimiter=';')
                for row in reader:
                    oid = str(row.get('organization_id') or '').strip()
                    c = normalize_coord(row.get('latitude'), row.get('longitude'))
                    if c and oid:
                        recovery_map[oid] = c

    # 2. Assign coordinates and build site points
    outlet_coords = {}
    site_points = {}
    for o in master:
        k = o['outlet_key']
        c = normalize_coord(o.get('lat'), o.get('long'))
        if not c:
            im3 = str(o.get('outlet_id_im3') or '').strip()
            three = str(o.get('outlet_id_3id') or '').strip()
            c = recovery_map.get(im3) or recovery_map.get(three)
        if c:
            outlet_coords[k] = c
            site = o.get('site_nbs') or o.get('site_name')
            if site and site != 'UNKNOWN':
                dist = float(o.get('dist_km') or 0.2)
                site_points.setdefault(site, []).append((c[0], c[1], dist))

    # 3. Calculate site centroids
    site_centroids = {}
    for site, pts in site_points.items():
        total_w = sum(1.0 / (d + 0.05) for _, _, d in pts)
        w_lat = sum(lat / (d + 0.05) for lat, _, d in pts)
        w_lon = sum(lon / (d + 0.05) for _, lon, d in pts)
        site_centroids[site] = (round(w_lat / total_w, 6), round(w_lon / total_w, 6))

    # 4. Fallback for remaining outlets (using site centroid or MC centroid)
    mc_temp_points = {}
    for o in master:
        k = o['outlet_key']
        if k in outlet_coords:
            mc = o.get('micro_cluster') or 'UNKNOWN'
            mc_temp_points.setdefault(mc, []).append(outlet_coords[k])

    mc_centroids_fallback = {mc: compute_centroid(pts) for mc, pts in mc_temp_points.items()}

    for i, o in enumerate(master):
        k = o['outlet_key']
        if k not in outlet_coords:
            site = o.get('site_nbs') or o.get('site_name')
            if site in site_centroids:
                slat, slon = site_centroids[site]
                angle = (i * 0.7) % 6.28
                r = 0.0008
                outlet_coords[k] = (round(slat + r * math.cos(angle), 6), round(slon + r * math.sin(angle), 6))
            else:
                mc = o.get('micro_cluster') or 'UNKNOWN'
                mclat, mclon = mc_centroids_fallback.get(mc, (-6.22, 106.85))
                angle = (i * 0.9) % 6.28
                r = 0.002
                outlet_coords[k] = (round(mclat + r * math.cos(angle), 6), round(mclon + r * math.sin(angle), 6))

    # 5. Distinct colors for Branches and MCs
    BRANCH_COLORS = {
        'SOUTH JAKARTA DEPOK': '#EC3013',      # Indosat Red
        'KARAWANG': '#0284C7',                 # Ocean Sky Blue
        'KAB BEKASI': '#10B981',               # Emerald Green
        'WEST JAKARTA': '#F59E0B',              # Amber / Gold
        'BEKASI': '#8B5CF6',                   # Purple
        'CENTRAL NORTH JAKARTA': '#EC4899',    # Magenta / Pink
        'EAST JAKARTA': '#14B8A6'              # Teal
    }

    # 6. Build Branch, MC, and Kecamatan groupings
    branches_map = {}
    mcs_map = {}
    kec_map = {}
    sites_map = {}

    for o in master:
        k = o['outlet_key']
        lat, lon = outlet_coords[k]
        br = o.get('branch') or 'UNKNOWN'
        mc = o.get('micro_cluster') or 'UNKNOWN'
        kec = o.get('kecamatan') or 'UNKNOWN'
        kab = o.get('kabupaten') or 'UNKNOWN'
        site = o.get('site_nbs') or o.get('site_name') or 'UNKNOWN'
        st = get_status(o)
        is_active = (st != 'none')
        sellin = float(o.get('sellin_val') or 0)
        bal = float(o.get('bal_val') or 0)
        vis = int(o.get('visit_count') or 0)
        dse = o.get('dse_name') or o.get('dse_code_im3') or 'UNKNOWN'
        dist = float(o.get('dist_km') or 0.2)

        # Branch
        b_entry = branches_map.setdefault(br, {
            'branch': br,
            'hoa_leader': o.get('hoa_leader') or 'Area Leader',
            'points': [],
            'outlets_count': 0,
            'active_count': 0,
            'sellin_val': 0.0,
            'saldo_val': 0.0,
            'visit_count': 0,
            'dses': set(),
            'mcs': set(),
            'sites': set(),
            'color': BRANCH_COLORS.get(br, '#4F46E5')
        })
        b_entry['points'].append((lat, lon))
        b_entry['outlets_count'] += 1
        if is_active: b_entry['active_count'] += 1
        b_entry['sellin_val'] += sellin
        b_entry['saldo_val'] += bal
        b_entry['visit_count'] += vis
        b_entry['dses'].add(dse)
        b_entry['mcs'].add(mc)
        b_entry['sites'].add(site)

        # Micro Cluster
        m_entry = mcs_map.setdefault(mc, {
            'micro_cluster': mc,
            'dso_leader': o.get('dso_leader') or 'Micro Cluster Supervisor',
            'branch': br,
            'hoa_leader': o.get('hoa_leader') or '',
            'points': [],
            'outlets_count': 0,
            'active_count': 0,
            'sellin_val': 0.0,
            'saldo_val': 0.0,
            'visit_count': 0,
            'dses': set(),
            'sites': set(),
            'color': BRANCH_COLORS.get(br, '#4F46E5')
        })
        m_entry['points'].append((lat, lon))
        m_entry['outlets_count'] += 1
        if is_active: m_entry['active_count'] += 1
        m_entry['sellin_val'] += sellin
        m_entry['saldo_val'] += bal
        m_entry['visit_count'] += vis
        m_entry['dses'].add(dse)
        m_entry['sites'].add(site)

        # Kecamatan
        k_key = f"{br}___{kec}"
        k_entry = kec_map.setdefault(k_key, {
            'kecamatan': kec,
            'kabupaten': kab,
            'branch': br,
            'micro_cluster': mc,
            'points': [],
            'outlets_count': 0,
            'active_count': 0,
            'sellin_val': 0.0,
            'saldo_val': 0.0,
            'visit_count': 0,
            'color': BRANCH_COLORS.get(br, '#4F46E5')
        })
        k_entry['points'].append((lat, lon))
        k_entry['outlets_count'] += 1
        if is_active: k_entry['active_count'] += 1
        k_entry['sellin_val'] += sellin
        k_entry['saldo_val'] += bal
        k_entry['visit_count'] += vis

        # Sites (DSO mapped across 36 MCs)
        if site != 'UNKNOWN' and site != 'PENDING-NBS' and mc:
            site_key = f"{site}::{mc}"
            s_entry = sites_map.setdefault(site_key, {
                'site_id': site,
                'site_key': site_key,
                'branch': br,
                'micro_cluster': mc,
                'hoa_leader': o.get('hoa_leader') or '',
                'dso_leader': o.get('dso_leader') or '',
                'points': [],
                'distances': [],
                'outlets_count': 0,
                'active_count': 0,
                'saldo_val': 0.0,
                'visit_count': 0
            })
            s_entry['points'].append((lat, lon))
            s_entry['distances'].append(dist)
            s_entry['outlets_count'] += 1
            if is_active: s_entry['active_count'] += 1
            s_entry['saldo_val'] += bal
            s_entry['visit_count'] += vis

    # Finalize Branches
    branches_list = []
    for br, b in sorted(branches_map.items()):
        hull = convex_hull(b['points'])
        centroid = compute_centroid(b['points'])
        branches_list.append({
            'branch': br,
            'hoa_leader': b['hoa_leader'],
            'outlets_count': b['outlets_count'],
            'active_count': b['active_count'],
            'active_pct': round((b['active_count'] / b['outlets_count'] * 100) if b['outlets_count'] else 0, 1),
            'sellin_val': round(b['sellin_val'], 2),
            'saldo_val': round(b['saldo_val'], 2),
            'visit_count': b['visit_count'],
            'dse_count': len(b['dses']),
            'mc_count': len(b['mcs']),
            'site_count': len(b['sites']),
            'centroid': centroid,
            'hull': hull,
            'color': b['color']
        })

    # Finalize Micro Clusters
    mcs_list = []
    for mc, m in sorted(mcs_map.items()):
        hull = convex_hull(m['points'])
        centroid = compute_centroid(m['points'])
        mcs_list.append({
            'micro_cluster': mc,
            'dso_leader': m['dso_leader'],
            'branch': m['branch'],
            'hoa_leader': m['hoa_leader'],
            'outlets_count': m['outlets_count'],
            'active_count': m['active_count'],
            'active_pct': round((m['active_count'] / m['outlets_count'] * 100) if m['outlets_count'] else 0, 1),
            'sellin_val': round(m['sellin_val'], 2),
            'saldo_val': round(m['saldo_val'], 2),
            'visit_count': m['visit_count'],
            'dse_count': len(m['dses']),
            'site_count': len(m['sites']),
            'centroid': centroid,
            'hull': hull,
            'color': m['color']
        })

    # Finalize Kecamatans
    kec_list = []
    for k_key, k in sorted(kec_map.items()):
        hull = convex_hull(k['points'])
        centroid = compute_centroid(k['points'])
        kec_list.append({
            'kecamatan': k['kecamatan'],
            'kabupaten': k['kabupaten'],
            'branch': k['branch'],
            'micro_cluster': k['micro_cluster'],
            'outlets_count': k['outlets_count'],
            'active_count': k['active_count'],
            'active_pct': round((k['active_count'] / k['outlets_count'] * 100) if k['outlets_count'] else 0, 1),
            'sellin_val': round(k['sellin_val'], 2),
            'saldo_val': round(k['saldo_val'], 2),
            'visit_count': k['visit_count'],
            'centroid': centroid,
            'hull': hull,
            'color': k['color']
        })

    # Finalize Sites
    sites_list = []
    for site_key, s in sorted(sites_map.items()):
        base_site = s['site_id']
        # Coordinates from computed centroid of physical base site
        if base_site in site_centroids:
            slat, slon = site_centroids[base_site]
        else:
            slat, slon = compute_centroid(s['points'])
        dists = s['distances']
        avg_dist = round(sum(dists) / len(dists), 3) if dists else 0.2
        min_dist = round(min(dists), 3) if dists else 0.05
        sites_list.append({
            'site_id': base_site,
            'site_key': site_key,
            'lat': slat,
            'long': slon,
            'branch': s['branch'],
            'micro_cluster': s['micro_cluster'],
            'hoa_leader': s['hoa_leader'],
            'dso_leader': s['dso_leader'],
            'outlets_count': s['outlets_count'],
            'active_count': s['active_count'],
            'active_pct': round((s['active_count'] / s['outlets_count'] * 100) if s['outlets_count'] else 0, 1),
            'saldo_val': round(s['saldo_val'], 2),
            'visit_count': s['visit_count'],
            'avg_dist_km': avg_dist,
            'min_dist_km': min_dist
        })

    # Finalize Outlets (compact array)
    outlets_rows = []
    for o in master:
        k = o['outlet_key']
        lat, lon = outlet_coords[k]
        st = get_status(o)
        outlets_rows.append([
            k,
            o.get('outlet_name') or 'Outlet',
            lat,
            lon,
            o.get('site_nbs') or o.get('site_name') or 'N/A',
            round(float(o.get('dist_km') or 0.2), 3),
            o.get('dse_name') or o.get('dse_code_im3') or 'Unassigned',
            o.get('dse_code_im3') or '',
            o.get('micro_cluster') or '',
            o.get('dso_leader') or '',
            o.get('branch') or '',
            o.get('hoa_leader') or '',
            o.get('kecamatan') or '',
            o.get('desa') or '',
            st,
            round(float(o.get('sellin_val') or 0), 2),
            round(float(o.get('bal_val') or 0), 2),
            int(o.get('visit_count') or 0),
            o.get('last_visit') or ''
        ])

    map_feed = {
        'generated_at': '2026-10-12',
        'metrics': {
            'total_outlets': len(outlets_rows),
            'total_sites': len(sites_list),
            'total_branches': len(branches_list),
            'total_mcs': len(mcs_list),
            'total_kecamatans': len(kec_list),
            'center': [-6.225, 106.845],
            'bounds': [[-6.75, 106.5], [-5.95, 107.5]]
        },
        'branches': branches_list,
        'micro_clusters': mcs_list,
        'kecamatans': kec_list,
        'sites': sites_list,
        'outlet_columns': [
            'key', 'name', 'lat', 'long', 'site', 'dist', 'dse_name', 'dse_code',
            'mc', 'dso', 'branch', 'hoa', 'kec', 'desa', 'status', 'sellin', 'bal', 'visits', 'last_visit'
        ],
        'outlets': outlets_rows
    }

    # Write website/data/jakarta_map_feed.js
    out_js = os.path.join(root, 'website', 'data', 'jakarta_map_feed.js')
    os.makedirs(os.path.dirname(out_js), exist_ok=True)
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write("(function(root) {\n")
        f.write("  var mapFeed = ")
        json.dump(map_feed, f, separators=(',', ':'))
        f.write(";\n")
        f.write("  if (typeof module !== 'undefined' && module.exports) { module.exports = mapFeed; }\n")
        f.write("  if (root) { root.JAKARTA_MAP_FEED = mapFeed; }\n")
        f.write("})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));\n")

    print(f"Generated {out_js} ({os.path.getsize(out_js) / 1024 / 1024:.2f} MB)")

    # Mirror JSON
    out_json = os.path.join(root, 'data', 'catalogues', 'jakarta_map_feed.json')
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(map_feed, f, separators=(',', ':'))
    print(f"Generated {out_json} ({os.path.getsize(out_json) / 1024 / 1024:.2f} MB)")

    print(f"Spatial dataset built successfully:")
    print(f"  - Branches: {len(branches_list)}")
    print(f"  - Micro Clusters: {len(mcs_list)}")
    print(f"  - Kecamatans: {len(kec_list)}")
    print(f"  - Sites: {len(sites_list)}")
    print(f"  - Outlets: {len(outlets_rows)}")

if __name__ == '__main__':
    main()
