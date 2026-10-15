#!/usr/bin/env python3
"""
build_territory_management_catalogues.py
----------------------------------------
Builds governed static catalogues for Territory Management:
- Outlet to Site Mapping (from adhoc_outlet_im3_3id_data_gcp.xlsb)
- Outlet to DSE & Personnel Mapping (from Data_Mapping_Update & MASTER DSE Hirarki)
- Territory Mapping: Outlet -> Site -> DSE -> DSO/MC Leader -> HoA Area Leader
- Supply Transaction indicators per outlet (SP/VC Sell-In, MOBI Balance, DSE Visits)

Outputs:
  data/catalogues/territory_management_master.json
  data/catalogues/territory_management_master.csv
  data/catalogues/territory_hierarchy_chain.json
  website/data/territory_feed.js
  website/data/territory_feed.json
"""

import os
import sys
import json
import csv
import glob
import struct
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict

WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(WORKSPACE_ROOT, 'raw')
DOCS_DIR = os.path.join(WORKSPACE_ROOT, 'docs')
CATALOGUES_DIR = os.path.join(WORKSPACE_ROOT, 'data', 'catalogues')
WEBSITE_DATA_DIR = os.path.join(WORKSPACE_ROOT, 'website', 'data')

os.makedirs(CATALOGUES_DIR, exist_ok=True)
os.makedirs(WEBSITE_DATA_DIR, exist_ok=True)


# ==============================================================================
# 1. XLSB Parser Helpers (Pure Python, Zero External Dependencies)
# ==============================================================================
def parse_xlsb_sst(raw_sst):
    pos = 0
    strings = []
    while pos < len(raw_sst):
        b = raw_sst[pos]; rec_type = b & 0x7F; pos += 1
        if b & 0x80: rec_type |= (raw_sst[pos] & 0x7F) << 7; pos += 1
        b = raw_sst[pos]; rec_len = b & 0x7F; pos += 1; shift = 7
        while b & 0x80: b = raw_sst[pos]; rec_len |= (b & 0x7F) << shift; pos += 1; shift += 7
        rec_data = raw_sst[pos:pos+rec_len]; pos += rec_len
        if rec_type == 0x13: # BrtSSTItem
            str_len = struct.unpack('<I', rec_data[1:5])[0]
            s = rec_data[5:5 + str_len * 2].decode('utf-16le', errors='ignore')
            strings.append(s)
    return strings


def decode_xlsb_rk(rk):
    is_int = bool(rk & 0x02)
    div_100 = bool(rk & 0x01)
    val = (rk >> 2) if is_int else struct.unpack('<d', struct.pack('<II', 0, rk & 0xFFFFFFFC))[0]
    return val / 100.0 if div_100 else val


def parse_xlsb_sheet_rows(sheet_bytes, sst):
    pos = 0
    rows = []
    curr_row = None
    while pos < len(sheet_bytes):
        b = sheet_bytes[pos]; rec_type = b & 0x7F; pos += 1
        if b & 0x80: rec_type |= (sheet_bytes[pos] & 0x7F) << 7; pos += 1
        b = sheet_bytes[pos]; rec_len = b & 0x7F; pos += 1; shift = 7
        while b & 0x80: b = raw = sheet_bytes[pos]; rec_len |= (b & 0x7F) << shift; pos += 1; shift += 7
        rec_data = sheet_bytes[pos:pos+rec_len]; pos += rec_len
        if rec_type == 0x00: # BrtRowHdr
            if curr_row is not None:
                rows.append(curr_row)
            curr_row = {}
        elif rec_type == 0x07 and curr_row is not None: # BrtCellIsst
            col = struct.unpack('<I', rec_data[0:4])[0]
            isst = struct.unpack('<I', rec_data[8:12])[0]
            curr_row[col] = sst[isst] if isst < len(sst) else f'#SST_{isst}'
        elif rec_type == 0x02 and curr_row is not None: # BrtCellRk
            col = struct.unpack('<I', rec_data[0:4])[0]
            rk = struct.unpack('<I', rec_data[8:12])[0]
            curr_row[col] = decode_xlsb_rk(rk)
        elif rec_type == 0x05 and curr_row is not None: # BrtCellReal
            col = struct.unpack('<I', rec_data[0:4])[0]
            curr_row[col] = struct.unpack('<d', rec_data[8:16])[0]
    if curr_row is not None:
        rows.append(curr_row)
    return rows


# ==============================================================================
# 2. Extract Master Leadership Hierarchy (docs/MASTER DSE Hirarki.xlsx)
# ==============================================================================
def load_leadership_hierarchy():
    print("[1/5] Loading Leadership Hierarchy (HoA & DSO) from docs/MASTER DSE Hirarki.xlsx...")
    xlsx_path = os.path.join(DOCS_DIR, 'MASTER DSE Hirarki.xlsx')
    mc_leadership = {}
    dse_leadership = {}
    
    with zipfile.ZipFile(xlsx_path) as z:
        sst = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                sst.append(''.join(t.text for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text))
        
        wb = ET.fromstring(z.read('xl/workbook.xml'))
        sheets = wb.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets/{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet')
        rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rels}
        
        for s in sheets:
            if s.attrib['name'] == 'MASTER DSE BSM HOA':
                target = 'xl/' + rel_map[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
                stree = ET.fromstring(z.read(target))
                header = None
                for row in stree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                    vals = []
                    for c in row.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                        v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                        t = c.attrib.get('t')
                        val = v.text if v is not None else ''
                        if t == 's' and val.isdigit():
                            val = sst[int(val)] if int(val) < len(sst) else val
                        vals.append(val)
                    if not vals:
                        continue
                    if 'REGION' in vals and 'BRANCH/AREA' in vals:
                        header = vals
                        continue
                    if header and len(vals) >= 6:
                        d = dict(zip(header, vals))
                        mc = d.get('MICRO CLUSTER', '').strip()
                        hoa = d.get('NAMA HOA', '').strip()
                        dso = d.get('NAMA DSO', '').strip()
                        branch = d.get('BRANCH/AREA', '').strip()
                        dse_name = d.get('NAMA DSE', '').strip()
                        cso_im3 = d.get('EMAIL', '').strip()
                        cso_3id = d.get('REMARKS', '').strip()
                        
                        if mc:
                            mc_leadership[mc] = {
                                'hoa_leader': hoa,
                                'dso_leader': dso,
                                'branch': branch
                            }
                        if dse_name:
                            info = {
                                'hoa_leader': hoa,
                                'dso_leader': dso,
                                'branch': branch,
                                'micro_cluster': mc,
                                'dse_name': dse_name
                            }
                            dse_leadership[dse_name.upper()] = info
                            if cso_im3: dse_leadership[cso_im3.upper()] = info
                            if cso_3id: dse_leadership[cso_3id.upper()] = info
                            
    print(f"  Mapped {len(mc_leadership)} Micro Cluster leadership nodes and {len(dse_leadership)} DSE alias references.")
    return mc_leadership, dse_leadership


# ==============================================================================
# 3. Extract Outlet to Site Mapping (raw/Outlet & Mapping/adhoc_...xlsb)
# ==============================================================================
def load_gcp_site_mapping():
    print("[2/5] Loading Site NBS to Outlet Mapping from raw/Outlet & Mapping/adhoc_outlet_im3_3id_data_gcp.xlsb & NBS files...")
    xlsb_path = os.path.join(RAW_DIR, 'Outlet & Mapping', 'adhoc_outlet_im3_3id_data_gcp.xlsb')
    site_mapping = {}
    
    # 2A. Load from adhoc_outlet_im3_3id_data_gcp.xlsb (Sheet 1: IM3, Sheet 2: 3ID)
    if os.path.exists(xlsb_path):
        with zipfile.ZipFile(xlsb_path) as z:
            sst = parse_xlsb_sst(z.read('xl/sharedStrings.bin'))
            for sname in ['xl/worksheets/sheet1.bin', 'xl/worksheets/sheet2.bin']:
                if sname not in z.namelist(): continue
                rows = parse_xlsb_sheet_rows(z.read(sname), sst)
                if not rows: continue
                h = rows[0]
                id_col = next((k for k, v in h.items() if v == 'id'), None)
                nbs_col = next((k for k, v in h.items() if 'nbs' in str(v).lower() or 'site id' in str(v).lower()), None)
                dist_col = next((k for k, v in h.items() if 'dist' in str(v).lower()), None)
                lat_col = next((k for k, v in h.items() if 'lat' in str(v).lower()), None)
                lon_col = next((k for k, v in h.items() if 'lon' in str(v).lower()), None)
                brand_col = next((k for k, v in h.items() if v == 'brand'), None)
                
                for r in rows[1:]:
                    oid_val = r.get(id_col)
                    if oid_val is None: continue
                    oid = str(oid_val).split('.')[0].strip()
                    nbs_id = str(r.get(nbs_col) or '').strip()
                    if not nbs_id or nbs_id == 'None': continue
                    
                    dist = r.get(dist_col)
                    try: dist = round(float(dist), 3) if dist is not None else None
                    except: dist = None
                    
                    lat = r.get(lat_col)
                    try: lat = float(lat) if lat is not None else None
                    except: lat = None
                    
                    lon = r.get(lon_col)
                    try: lon = float(lon) if lon is not None else None
                    except: lon = None
                    
                    brand = r.get(brand_col)
                    if oid:
                        site_mapping[oid] = {
                            'site_nbs': nbs_id,
                            'dist_km': dist,
                            'lat': lat,
                            'long': lon,
                            'brand': brand,
                            'source': 'adhoc_gcp'
                        }
        print(f"  Loaded {len(site_mapping):,} outlet-to-NBS mappings from adhoc GCP.")

    # 2B. Fallback from raw/Outlet & Mapping/NBS Site to Outlet/IM3_OUTLET_NBS_202608.csv
    nbs_csv_path = os.path.join(RAW_DIR, 'Outlet & Mapping', 'NBS Site to Outlet', 'IM3_OUTLET_NBS_202608.csv')
    if os.path.exists(nbs_csv_path):
        added_csv = 0
        with open(nbs_csv_path, 'r', encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f, delimiter=';')
            for r in reader:
                oid = str(r.get('organization_id', '')).split('.')[0].strip()
                site_id = str(r.get('site_id', '')).strip()
                if oid and site_id and site_id != 'None' and oid not in site_mapping:
                    dist = r.get('distance_km')
                    try: dist = round(float(dist), 3) if dist else None
                    except: dist = None
                    lat = r.get('latitude')
                    try: lat = float(lat) if lat else None
                    except: lat = None
                    lon = r.get('longitude')
                    try: lon = float(lon) if lon else None
                    except: lon = None
                    site_mapping[oid] = {
                        'site_nbs': site_id,
                        'dist_km': dist,
                        'lat': lat,
                        'long': lon,
                        'brand': 'IM3',
                        'source': 'nbs_csv'
                    }
                    added_csv += 1
        print(f"  Added {added_csv:,} supplemental mappings from NBS Site to Outlet CSV.")

    print(f"  Total unified Site NBS to Outlet mappings available: {len(site_mapping):,}")
    return site_mapping


# ==============================================================================
# 4. Extract Supply Transactions per Outlet (SP/VC, MOBI Balance, Visits)
# ==============================================================================
def load_supply_transactions():
    print("[3/5] Extracting recorded supply transactions per outlet (01–11 Oct 2026)...")
    sp_vc_data = defaultdict(lambda: {'sp_qty': 0, 'vc_qty': 0, 'sellin_val': 0.0, 'orders': 0})
    balance_data = defaultdict(lambda: {'bal_tx_count': 0, 'bal_val': 0.0})
    visit_data = defaultdict(lambda: {'visit_count': 0, 'last_visit': ''})
    
    # 4A. SP VC Selli
    for path in sorted(glob.glob(os.path.join(RAW_DIR, 'SP VC Sellin', '*.csv')) + glob.glob(os.path.join(RAW_DIR, 'SP VC Selli', '*.csv'))):
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if 'TRANSACTION DATETIME' in line:
                    header = line.strip().split('|')
                    break
            reader = csv.DictReader(f, fieldnames=header, delimiter='|')
            for r in reader:
                oid = str(r.get('DEST_SALDOMOBO_ID', '')).split('.')[0].strip()
                cat = r.get('PRODUCT CATEGORY', '')
                try:
                    qty = float(r.get('QTY', 0) or 0)
                    val = float(r.get('FINAL VALUE', 0) or 0)
                except:
                    continue
                if oid:
                    sp_vc_data[oid]['orders'] += 1
                    sp_vc_data[oid]['sellin_val'] += val
                    if 'Starter' in cat:
                        sp_vc_data[oid]['sp_qty'] += int(qty)
                    elif 'Voucher' in cat:
                        sp_vc_data[oid]['vc_qty'] += int(qty)

    # 4B. MOBI Transfer Balance
    for path in sorted(glob.glob(os.path.join(RAW_DIR, 'MOBI TRansfer Balance', '*.csv'))):
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if 'TRANSACTION DATETIME' in line:
                    header = line.strip().split('|')
                    break
            reader = csv.DictReader(f, fieldnames=header, delimiter='|')
            for r in reader:
                oid = str(r.get('DEST_SALDOMOBO_ID', '')).split('.')[0].strip()
                try:
                    val = float(r.get('FINAL VALUE', 0) or 0)
                except:
                    val = 0.0
                if oid:
                    balance_data[oid]['bal_tx_count'] += 1
                    balance_data[oid]['bal_val'] += val

    # 4C. MOBI VISIT DSE
    for path in sorted(glob.glob(os.path.join(RAW_DIR, 'MOBI VISIT DSE', '*.zip'))):
        with zipfile.ZipFile(path) as z:
            with z.open(z.namelist()[0]) as f:
                for _ in range(8): next(f)
                reader = csv.DictReader((line.decode('utf-8', errors='ignore') for line in f), delimiter='|')
                for r in reader:
                    oid = str(r.get('SALDOMOBO ORG ID', '')).split('.')[0].strip()
                    dt = r.get('DATETIME', '') or r.get('SCHEDULE DATE', '')
                    if oid:
                        for key_id in set([oid, oid.lstrip('0')]):
                            if not key_id: continue
                            visit_data[key_id]['visit_count'] += 1
                            if dt and dt > visit_data[key_id]['last_visit']:
                                visit_data[key_id]['last_visit'] = dt

    print(f"  Physical SP/VC Sell-In Outlets: {len(sp_vc_data):,}")
    print(f"  Electronic Balance Outlets: {len(balance_data):,}")
    print(f"  DSE Visited Outlets: {len(visit_data):,}")
    return sp_vc_data, balance_data, visit_data


# ==============================================================================
# 5. Build Unified Territory Management Master Catalogue
# ==============================================================================
def build_master_catalogue(mc_leadership, dse_leadership, site_mapping, sp_vc_data, balance_data, visit_data):
    print("[4/5] Building unified Territory Management master catalogue from Data_Mapping_Update...")
    master_path = os.path.join(RAW_DIR, 'Outlet & Mapping', 'Data_Mapping_Update - 2610091600.xlsb')
    
    outlets = []
    hierarchy_tree = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    
    with zipfile.ZipFile(master_path) as z:
        sst = parse_xlsb_sst(z.read('xl/sharedStrings.bin'))
        rows = parse_xlsb_sheet_rows(z.read('xl/worksheets/sheet1.bin'), sst)
        h = rows[0]
        
        # Column mapping
        col_map = {
            'circle': next(k for k, v in h.items() if v == 'Circle Name'),
            'region': next(k for k, v in h.items() if v == 'Region Name'),
            'branch': next(k for k, v in h.items() if v == 'Branch Name'),
            'mc': next(k for k, v in h.items() if v == 'Micro Cluster Name (MC)'),
            'pt_im3': next(k for k, v in h.items() if v == 'Partner Territory Name (PT) IM3'),
            'pt_3id': next(k for k, v in h.items() if v == 'Partner Territory Name (PT) 3ID'),
            'partner_im3': next(k for k, v in h.items() if v == 'Partner Name IM3'),
            'partner_3id': next(k for k, v in h.items() if v == 'Partner Name 3ID'),
            'dse_im3': next(k for k, v in h.items() if v == 'DSE CODE IM3'),
            'dse_3id': next(k for k, v in h.items() if v == 'DSE CODE 3ID'),
            'outlet_id_im3': next(k for k, v in h.items() if v == 'Outlet Code IM3'),
            'outlet_name_im3': next(k for k, v in h.items() if v == 'Outlet IM3 Name'),
            'outlet_id_3id': next(k for k, v in h.items() if v == 'Outlet Code 3ID'),
            'outlet_name_3id': next(k for k, v in h.items() if v == 'Outlet 3ID Name'),
            'kabupaten': next(k for k, v in h.items() if v == 'Kabupaten'),
            'kecamatan': next(k for k, v in h.items() if v == 'Kecamatan'),
            'desa': next(k for k, v in h.items() if v == 'Desa'),
            'lat': next(k for k, v in h.items() if v == 'Lat'),
            'long': next(k for k, v in h.items() if v == 'Long'),
        }
        
        for idx, r in enumerate(rows[1:]):
            oid_im3 = str(r.get(col_map['outlet_id_im3'], '')).split('.')[0].strip()
            oid_3id = str(r.get(col_map['outlet_id_3id'], '')).split('.')[0].strip()
            oname_im3 = str(r.get(col_map['outlet_name_im3'], '')).strip()
            oname_3id = str(r.get(col_map['outlet_name_3id'], '')).strip()
            
            # a DSE code of 0 / 0.0 means "no DSE mapped to this outlet", not a DSE called 0
            dse_im3 = str(r.get(col_map['dse_im3'], '')).strip()
            dse_3id = str(r.get(col_map['dse_3id'], '')).strip()
            if dse_im3.replace('.0', '') in ('0', 'nan', 'None'): dse_im3 = ''
            if dse_3id.replace('.0', '') in ('0', 'nan', 'None'): dse_3id = ''
            mc = str(r.get(col_map['mc'], '')).strip()
            branch = str(r.get(col_map['branch'], '')).strip()
            
            # Resolve Site NBS
            site_info = site_mapping.get(oid_im3) or site_mapping.get(oid_3id) or {}
            site_nbs = site_info.get('site_nbs')
            dist_km = site_info.get('dist_km')
            if not site_nbs or site_nbs == 'None':
                site_nbs = 'PENDING-NBS'
                dist_km = None
                
            site_name = site_nbs
            lat = r.get(col_map['lat']) or site_info.get('lat') or 0.0
            lon = r.get(col_map['long']) or site_info.get('long') or 0.0
            
            # Resolve HoA and DSO Leadership
            mc_info = mc_leadership.get(mc, {})
            hoa_leader = mc_info.get('hoa_leader', '')
            dso_leader = mc_info.get('dso_leader', '')
            
            # Resolve DSE name
            dse_ref = dse_leadership.get(dse_im3.upper()) or dse_leadership.get(dse_3id.upper()) or {}
            dse_name = dse_ref.get('dse_name') or dse_im3 or dse_3id or 'UNASSIGNED'
            if not hoa_leader and dse_ref.get('hoa_leader'):
                hoa_leader = dse_ref['hoa_leader']
            if not dso_leader and dse_ref.get('dso_leader'):
                dso_leader = dse_ref['dso_leader']
                
            # Default fallbacks if empty
            if not hoa_leader:
                hoa_leader = f"HoA {branch}"
            if not dso_leader:
                dso_leader = f"DSO {mc.replace('MC-', '')}"
                
            # Resolve Supply Transactions
            sp_vc = sp_vc_data.get(oid_im3) or sp_vc_data.get(oid_3id) or {'sp_qty': 0, 'vc_qty': 0, 'sellin_val': 0.0, 'orders': 0}
            bal = balance_data.get(oid_im3) or balance_data.get(oid_3id) or {'bal_tx_count': 0, 'bal_val': 0.0}
            vis = visit_data.get(oid_im3) or visit_data.get(oid_3id) or {'visit_count': 0, 'last_visit': ''}
            
            has_supply_tx = (sp_vc['orders'] > 0 or bal['bal_tx_count'] > 0 or vis['visit_count'] > 0)
            
            rec = {
                'outlet_key': f"{oid_im3 or 'NA'}_{oid_3id or 'NA'}",
                'outlet_id_im3': oid_im3,
                'outlet_id_3id': oid_3id,
                'outlet_name': oname_im3 or oname_3id or 'Unnamed Outlet',
                'site_name': site_name,
                'site_nbs': site_nbs,
                'dist_km': dist_km,
                'dse_code_im3': dse_im3,
                'dse_code_3id': dse_3id,
                'dse_name': dse_name,
                'dso_leader': dso_leader,
                'hoa_leader': hoa_leader,
                'branch': branch,
                'micro_cluster': mc,
                'partner_name_im3': str(r.get(col_map['partner_im3'], '')).strip(),
                'partner_name_3id': str(r.get(col_map['partner_3id'], '')).strip(),
                'kabupaten': str(r.get(col_map['kabupaten'], '')).strip(),
                'kecamatan': str(r.get(col_map['kecamatan'], '')).strip(),
                'desa': str(r.get(col_map['desa'], '')).strip(),
                'lat': round(float(lat), 6) if lat else 0.0,
                'long': round(float(lon), 6) if lon else 0.0,
                # Supply stats
                'sp_qty': sp_vc['sp_qty'],
                'vc_qty': sp_vc['vc_qty'],
                'sellin_val': sp_vc['sellin_val'],
                'bal_tx_count': bal['bal_tx_count'],
                'bal_val': bal['bal_val'],
                'visit_count': vis['visit_count'],
                'last_visit': vis['last_visit'],
                'has_supply_tx': has_supply_tx
            }
            outlets.append(rec)
            
            # Group into leadership tree
            dse_key = dse_im3 or dse_3id or 'UNASSIGNED'
            hierarchy_tree[branch][mc][dse_key].append(rec['outlet_key'])
            
    print(f"  Processed {len(outlets):,} unified outlet territory master records.")
    return outlets, hierarchy_tree


# ==============================================================================
# 6. Export Files & Feeds
# ==============================================================================
def export_catalogues(outlets, hierarchy_tree, mc_leadership):
    print("[5/5] Exporting static catalogues and web feeds...")
    
    # 6A. Save territory_management_master.json
    json_path = os.path.join(CATALOGUES_DIR, 'territory_management_master.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(outlets, f, indent=2, ensure_ascii=False)
    print(f"  Saved JSON: {json_path} ({os.path.getsize(json_path):,} bytes)")

    # 6B. Save territory_management_master.csv
    csv_path = os.path.join(CATALOGUES_DIR, 'territory_management_master.csv')
    if outlets:
        keys = list(outlets[0].keys())
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(outlets)
        print(f"  Saved CSV: {csv_path} ({os.path.getsize(csv_path):,} bytes)")

    # 6C. Build Leadership Tree Summary
    tree_summary = []
    for branch, mcs in hierarchy_tree.items():
        b_outlets = 0
        b_supply_outlets = 0
        b_sellin_val = 0.0
        b_bal_val = 0.0
        mc_list = []
        
        for mc, dses in mcs.items():
            mc_info = mc_leadership.get(mc, {})
            mc_outlets = sum(len(o_keys) for o_keys in dses.values())
            b_outlets += mc_outlets
            
            dse_list = []
            for dse_code, o_keys in dses.items():
                dse_list.append({
                    'dse_code': dse_code,
                    'outlet_count': len(o_keys)
                })
            mc_list.append({
                'micro_cluster': mc,
                'dso_leader': mc_info.get('dso_leader', f"DSO {mc}"),
                'outlet_count': mc_outlets,
                'dse_count': len(dses),
                'dses': dse_list
            })
            
        branch_hoa = ''
        for mc in mcs.keys():
            if mc_leadership.get(mc, {}).get('hoa_leader'):
                branch_hoa = mc_leadership[mc]['hoa_leader']
                break
        if not branch_hoa:
            branch_hoa = f"HoA {branch}"
            
        tree_summary.append({
            'branch': branch,
            'hoa_leader': branch_hoa,
            'outlet_count': b_outlets,
            'micro_clusters': mc_list
        })
        
    tree_path = os.path.join(CATALOGUES_DIR, 'territory_hierarchy_chain.json')
    with open(tree_path, 'w', encoding='utf-8') as f:
        json.dump(tree_summary, f, indent=2, ensure_ascii=False)
    print(f"  Saved Hierarchy Chain: {tree_path}")

    # 6D. Export Compact Web Feed
    # For high performance rendering in the browser, produce a compact web feed
    # containing the master outlets, summary rollups, and lookup indices.
    web_feed = {
        'generated_at': '2026-10-12',
        'metrics': {
            'total_outlets': len(outlets),
            'total_sites': len(set((o['micro_cluster'], o['site_name']) for o in outlets if o.get('micro_cluster') and o.get('site_name') and o.get('site_name') != 'PENDING-NBS')),
            'total_dses': len(set(o['dse_code_im3'] or o['dse_code_3id'] for o in outlets if o['dse_code_im3'] or o['dse_code_3id'])),
            'total_micro_clusters': len(set(o['micro_cluster'] for o in outlets if o['micro_cluster'])),
            'total_branches': len(set(o['branch'] for o in outlets if o['branch'])),
            'outlets_with_supply_tx': sum(1 for o in outlets if o['has_supply_tx']),
            'total_sellin_val': sum(o['sellin_val'] for o in outlets),
            'total_bal_val': sum(o['bal_val'] for o in outlets),
            'total_visits': sum(o['visit_count'] for o in outlets),
        },
        'hierarchy': tree_summary,
        'outlets': outlets
    }
    
    web_json_path = os.path.join(WEBSITE_DATA_DIR, 'territory_feed.json')
    with open(web_json_path, 'w', encoding='utf-8') as f:
        json.dump(web_feed, f, ensure_ascii=False)
    print(f"  Saved Web Feed JSON: {web_json_path} ({os.path.getsize(web_json_path):,} bytes)")

    web_js_path = os.path.join(WEBSITE_DATA_DIR, 'territory_feed.js')
    with open(web_js_path, 'w', encoding='utf-8') as f:
        f.write("(function(root) {\n")
        f.write("  var feed = ")
        json.dump(web_feed, f, ensure_ascii=False)
        f.write(";\n")
        f.write("  if (typeof module !== 'undefined' && module.exports) { module.exports = feed; }\n")
        f.write("  if (root) { root.TERRITORY_FEED = feed; }\n")
        f.write("})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));\n")
    print(f"  Saved Web Feed JS: {web_js_path} ({os.path.getsize(web_js_path):,} bytes)")
    print("\n✓ Territory Management Catalogues Built Successfully!")


def main():
    mc_leadership, dse_leadership = load_leadership_hierarchy()
    site_mapping = load_gcp_site_mapping()
    sp_vc_data, balance_data, visit_data = load_supply_transactions()
    outlets, hierarchy_tree = build_master_catalogue(mc_leadership, dse_leadership, site_mapping, sp_vc_data, balance_data, visit_data)
    export_catalogues(outlets, hierarchy_tree, mc_leadership)


if __name__ == '__main__':
    main()
