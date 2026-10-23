#!/usr/bin/env python3
"""
Apply the governed catalogue (raw/Catalogue ... FINAL_<date>) to the territory master: DSE per outlet, pairing, flags.

Owner decisions of 21 Oct 2026 (docs/assessments/catalogue_202610_detail.md):
  * DSE per outlet comes from sheet FINAL_<date> (DSE mapping in MOB).  HoA, DSO, MC and branch stay those of the master.
  * An outlet none of whose ids is in FINAL is kept as history, without DSE (non-PJP), flag TIDAK_ADA_DI_FINAL_20OKT.
  * DSE pairs whose outlets swapped between the two people: FINAL is applied; the flag DSE_TUKAR_PERLU_CEK was dropped on 21 Oct 2026 at the owner's request (FLAG_SWAPS).
  * A DSE whose login changed in the catalogue: flag ID_PERLU_VERIFIKASI.  Temporary logins (data/catalogues/dse_login_sementara.csv)
    stay separate login ids, flag LOGIN_SEMENTARA (handled in generate_dse_visits_feed.py and shown through website/data/dse_flags.js).
  * Pairing: the system pairing is kept; only the new IM3-3ID pairs of the catalogue that FINAL supports (both ids at the same DSE)
    are applied; a 3ID id used by several IM3 keeps one primary IM3 (the one already paired with it), the others become IM3-only.
    Everything else is held (data/catalogues/catalogue_<YYYYMM>/pairing_hold.csv) and asked of the data owner.

Input   data/catalogues/territory_management_master_base.json.gz   baseline master (created from the current master on first run; the
                                                                  territory builder rewrites it on every full run)
        data/catalogues/catalogue_<YYYYMM>/*.csv                  from scripts/build_catalogue_overlay_inputs.py
Output  territory_management_master.{json,csv}, territory_hierarchy_chain.json, website/data/territory_feed.{json,js}   (via the territory builder export)
        data/catalogues/dse_flags.csv, website/data/dse_flags.js, data/catalogues/catalogue_<YYYYMM>/{pairing_hold.csv,apply_report.json}
The script always starts from the baseline, so it can be re-run safely.
"""
import copy
import csv
import glob
import gzip
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_territory_management_catalogues as TM  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(ROOT, 'data', 'catalogues')
WEB = os.path.join(ROOT, 'website', 'data')
BASE = os.path.join(CAT, 'territory_management_master_base.json.gz')

FLAG_SWAPS = False                    # owner, 21 Oct 2026: the 24 swapped DSE pairs of FINAL are accepted, no DSE_TUKAR_PERLU_CEK flag (the swap is still counted in the report)
ADD_FINAL_ONLY = True                 # add the outlets that are only in FINAL to the master (owner: 21 Oct 2026, "jalankan")
F_NOT_IN_FINAL = 'TIDAK_ADA_DI_FINAL_20OKT'
F_SWAP = 'DSE_TUKAR_PERLU_CEK'
F_ID = 'ID_PERLU_VERIFIKASI'
F_LOGIN = 'LOGIN_SEMENTARA'
PLACEHOLDER = re.compile(r'^(\d+(\.0)?|0\.0|DSEIN\d+|N/?A|UNASSIGNED|)$', re.I)
ZERO_STATS = {'sp_qty': 0, 'vc_qty': 0, 'sellin_val': 0.0, 'bal_tx_count': 0, 'bal_val': 0.0, 'visit_count': 0, 'last_visit': '', 'has_supply_tx': False}


def nid(v):
    v = str(v or '').strip()
    if v.endswith('.0'):
        v = v[:-2]
    if v in ('0', 'nan', 'None'):
        return ''
    return v.lstrip('0') if v.isdigit() else v


def ncode(v):
    v = str(v or '').strip()
    return v[:-2] if v.endswith('.0') else v


def read_csv(path):
    with open(path, newline='', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))


def latest_catalogue():
    ds = sorted(glob.glob(os.path.join(CAT, 'catalogue_[0-9]*')))
    if not ds:
        sys.exit('no data/catalogues/catalogue_<YYYYMM>/ - run scripts/build_catalogue_overlay_inputs.py first')
    return ds[-1]


def set_ids(rec, im3, t3):
    rec['outlet_id_im3'], rec['outlet_id_3id'] = im3, t3
    rec['outlet_key'] = '%s_%s' % (im3 or 'NA', t3 or 'NA')


def add_flag(rec, flag):
    fl = [x for x in str(rec.get('flags') or '').split('|') if x]
    if flag not in fl:
        fl.append(flag)
    rec['flags'] = '|'.join(fl)


def apply(base_outlets, cat_dir=None):
    cat_dir = cat_dir or latest_catalogue()
    outlets = copy.deepcopy(base_outlets)
    rep = Counter()

    # ---- inputs
    hier = read_csv(os.path.join(CAT, 'dse_master_hierarchy.csv'))
    canon = {}                                             # upper name -> hierarchy spelling
    for h in hier:
        canon.setdefault(h['nama_dse'].strip().upper(), h['nama_dse'].strip())
    logins = read_csv(os.path.join(cat_dir, 'dse_logins.csv'))
    code_name = {}
    for r in logins:
        nm = canon.get(r['dse_name'].strip().upper(), r['dse_name'].strip())
        for c in (r['login_im3'], r['login_3id']):
            if c:
                code_name[ncode(c).upper()] = nm
    final = {}
    for r in read_csv(os.path.join(cat_dir, 'final_dse_mapping.csv')):
        code = ncode(r['dse_code'])
        nm = canon.get(r['dse_name'].strip().upper(), r['dse_name'].strip()) if r['dse_name'] else code_name.get(code.upper(), code)
        final[(r['brand'], nid(r['outlet_id']))] = {'code': code, 'name': nm, 'mc': r['mc']}
    cat_pairs = [(nid(r['id_im3']), nid(r['id_3id'])) for r in read_csv(os.path.join(cat_dir, 'pairing_catalogue.csv'))]
    by3 = defaultdict(set)
    for a, b in cat_pairs:
        by3[b].add(a)

    for o in outlets:
        o['dse_name_base'], o['dse_code_im3_base'], o['dse_code_3id_base'] = o.get('dse_name', ''), o.get('dse_code_im3', ''), o.get('dse_code_3id', '')
        o['outlet_id_im3'], o['outlet_id_3id'] = nid(o.get('outlet_id_im3')), nid(o.get('outlet_id_3id'))
        o.setdefault('flags', '')

    def index():
        i3, t3 = {}, {}
        for o in outlets:
            if o['outlet_id_im3']:
                i3[o['outlet_id_im3']] = o
            if o['outlet_id_3id']:
                t3.setdefault(o['outlet_id_3id'], []).append(o)
        return i3, t3

    def clone(src, im3, t3):
        c = copy.deepcopy(src)
        c.update(ZERO_STATS)
        set_ids(c, im3, t3)
        c['dse_code_im3'] = src['dse_code_im3'] if im3 and im3 == src['outlet_id_im3'] else ''
        c['dse_code_3id'] = src['dse_code_3id'] if t3 and t3 == src['outlet_id_3id'] else ''
        c['dse_code_im3_base'] = src['dse_code_im3_base'] if c['dse_code_im3'] else ''
        c['dse_code_3id_base'] = src['dse_code_3id_base'] if c['dse_code_3id'] else ''
        add_flag(c, 'PAIR_DIPISAH')
        return c

    # ---- 1. new pairs of the catalogue that FINAL supports
    base_pairs = {(o['outlet_id_im3'], o['outlet_id_3id']) for o in outlets if o['outlet_id_im3'] and o['outlet_id_3id']}
    right = set(cat_pairs)
    hold, applied = [], []
    for a, b in sorted(right - base_pairs):
        fa, fb = final.get(('IM3', a)), final.get(('3ID', b))
        if not (fa and fb and fa['name'].upper() == fb['name'].upper()):
            hold.append((a, b, 'baru, tidak didukung FINAL' if (fa or fb) else 'baru, id tidak ada di FINAL'))
            continue
        i3, t3 = index()
        Ra, Rb_list = i3.get(a), t3.get(b, [])
        Rb = Rb_list[0] if Rb_list else None
        if Ra is not None and Ra is Rb:
            continue
        if Ra is None and Rb is None:
            hold.append((a, b, 'didukung FINAL, tetapi kedua id belum ada di master'))
            continue
        new = []
        if Ra is not None:
            S, old3 = Ra, Ra['outlet_id_3id']
            if old3 and old3 != b:
                new.append(clone(S, '', old3))
            S['outlet_id_3id'] = b
            S['dse_code_3id'] = Rb['dse_code_3id'] if Rb is not None else ''
            S['dse_code_3id_base'] = Rb['dse_code_3id_base'] if Rb is not None else ''
            if Rb is not None:
                if not Rb['outlet_id_im3']:
                    Rb['_del'] = True
                else:
                    Rb['outlet_id_3id'], Rb['dse_code_3id'], Rb['dse_code_3id_base'] = '', '', ''
                    set_ids(Rb, Rb['outlet_id_im3'], '')
                    add_flag(Rb, 'PAIR_DIPISAH')
        else:
            S, old_im3 = Rb, Rb['outlet_id_im3']
            if old_im3 and old_im3 != a:
                new.append(clone(S, old_im3, ''))
            S['outlet_id_im3'], S['dse_code_im3'], S['dse_code_im3_base'] = a, '', ''
        set_ids(S, S['outlet_id_im3'], S['outlet_id_3id'])
        add_flag(S, 'PAIR_DIUBAH_CATALOGUE')
        outlets.extend(new)
        outlets[:] = [o for o in outlets if not o.get('_del')]
        applied.append((a, b))
    rep['pairs_in_catalogue'] = len(right)
    rep['pairs_new_supported_applied'] = len(applied)
    rep['pairs_held'] = len(hold)

    # ---- 2. 3ID used by several IM3: keep one primary
    i3, t3 = index()
    for b, recs in sorted(t3.items()):
        if len(recs) < 2:
            continue
        rep['3id_ids_multi_master'] += 1
        cands = [r for r in recs if r['outlet_id_im3'] and r['outlet_id_im3'] in by3.get(b, ())]
        if len(cands) == 1 and b in by3:
            prim = cands[0]
            for r in recs:
                if r is not prim:
                    if r['outlet_id_im3']:                  # a record that carries only this 3ID stays (it cannot become an id-less record)
                        r['outlet_id_3id'], r['dse_code_3id'], r['dse_code_3id_base'] = '', '', ''
                        set_ids(r, r['outlet_id_im3'], '')
                    add_flag(r, 'PAIR_3ID_GANDA')
            add_flag(prim, 'PAIR_3ID_GANDA')
            rep['3id_multi_resolved'] += 1
        else:
            for r in recs:
                add_flag(r, 'PAIR_3ID_GANDA')
                add_flag(r, F_ID)
            rep['3id_multi_open'] += 1

    # ---- 2b. outlets that are only in FINAL: added to the master (DSE from FINAL, location from IOH_Outlet 19 Okt), flag BARU_DARI_FINAL
    #      (+ IOH_NON_BERTENTANGAN when IOH_Outlet calls the outlet NON-PJP while FINAL maps it to a DSE); site NBS stays PENDING-NBS until the outlet is mapped to a site. Set ADD_FINAL_ONLY = False to keep them out.
    if ADD_FINAL_ONLY and os.path.exists(os.path.join(cat_dir, 'outlet_locations.csv')):
        loc = {(r['brand'], nid(r['outlet_id'])): r for r in read_csv(os.path.join(cat_dir, 'outlet_locations.csv'))}
        i3, t3 = index()
        only = {k for k in final if (k[0] == 'IM3' and k[1] not in i3) or (k[0] == '3ID' and k[1] not in t3)}
        mc_info = defaultdict(lambda: defaultdict(Counter))
        for o in outlets:
            for f_ in ('branch', 'dso_leader', 'hoa_leader'):
                mc_info[o['micro_cluster']][f_][o.get(f_, '')] += 1
        known_mc = {m for m, v in mc_info.items() if m}
        pair_of = {}
        for a, b in cat_pairs:                              # catalogue pairs between two FINAL-only ids with the same DSE
            fa, fb = final.get(('IM3', a)), final.get(('3ID', b))
            if ('IM3', a) in only and ('3ID', b) in only and fa and fb and fa['name'].upper() == fb['name'].upper():
                pair_of[('IM3', a)] = b; pair_of[('3ID', b)] = a
        tpl = {k: ('' if isinstance(v, str) else (False if isinstance(v, bool) else (None if v is None else 0))) for k, v in outlets[0].items()}
        def top(mc, f_):
            c = mc_info[mc][f_]
            return c.most_common(1)[0][0] if c else ''
        new_rows, done = [], set()
        for k in sorted(only):
            if k in done:
                continue
            fr = final[k]
            if fr.get('mc') not in known_mc:
                rep['final_only_outside_region'] += 1
                continue
            a, b = (k[1], pair_of.get(k, '')) if k[0] == 'IM3' else (pair_of.get(k, ''), k[1])
            done.add(('IM3', a)); done.add(('3ID', b))
            L = [loc.get(('IM3', a)) if a else None, loc.get(('3ID', b)) if b else None]
            L = [x for x in L if x]
            L0 = next((x for x in L if x.get('lat')), L[0] if L else {})
            r = dict(tpl)
            mc = fr['mc']
            set_ids(r, a, b)
            r.update({'outlet_name': next((x['name'] for x in L if x.get('name')), '') or 'Unnamed Outlet', 'site_nbs': 'PENDING-NBS',   # IOH_Outlet site_nm is not an NBS site id (it matches none of the master site ids), so it is not used
                      'dist_km': None, 'branch': top(mc, 'branch'), 'micro_cluster': mc, 'dso_leader': top(mc, 'dso_leader'), 'hoa_leader': top(mc, 'hoa_leader'),
                      'kabupaten': (L0.get('kabkot') or '').upper(), 'kecamatan': (L0.get('kecamatan') or '').upper(), 'desa': '', 'dse_name_base': '', 'dse_code_im3_base': '', 'dse_code_3id_base': '',
                      'dse_name': '', 'flags': 'BARU_DARI_FINAL', 'has_supply_tx': False})
            r['site_name'] = r['site_nbs']
            try:
                r['lat'], r['long'] = (round(float(L0['lat']), 6), round(float(L0['long']), 6)) if L0.get('lat') and L0.get('long') else (0.0, 0.0)
            except ValueError:
                r['lat'], r['long'] = 0.0, 0.0
            if any((x.get('ioh_status') == 'NON') for x in L):
                add_flag(r, 'IOH_NON_BERTENTANGAN'); rep['final_only_ioh_non'] += 1
            new_rows.append(r)
        outlets.extend(new_rows)
        rep['final_only_added'] = len(new_rows)
        rep['final_only_paired_added'] = sum(1 for r in new_rows if r['outlet_id_im3'] and r['outlet_id_3id'])

    # ---- 2c. Outlet ID IOH, outlet types and pairing status of the sheet OUTLET IOH (data/catalogues/outlet_catalogue_ioh.csv), looked up by IM3 id, then 3ID id
    ioh_path = os.path.join(CAT, 'outlet_catalogue_ioh.csv')
    byi, by3 = {}, {}
    if os.path.exists(ioh_path):
        for r in read_csv(ioh_path):
            if r['outlet_id_im3']:
                byi.setdefault(nid(r['outlet_id_im3']), r)
            if r['outlet_id_3id']:
                by3.setdefault(nid(r['outlet_id_3id']), r)
    for o in outlets:
        r = byi.get(o['outlet_id_im3']) or by3.get(o['outlet_id_3id']) or {}
        o['outlet_id_ioh'] = r.get('outlet_id_ioh', '')
        o['pairing_status'] = r.get('status_pairing', '')
        o['outlet_type_im3'] = (byi.get(o['outlet_id_im3']) or {}).get('outlet_type_im3', '')
        o['outlet_type_3id'] = (by3.get(o['outlet_id_3id']) or {}).get('outlet_type_3id', '')
        if r:
            rep['outlets_with_ioh_row'] += 1

    # ---- 3. DSE per outlet from FINAL
    flows = Counter()
    for o in outlets:
        a, b = o['outlet_id_im3'], o['outlet_id_3id']
        if not (a or b):                                      # master rows without any outlet id cannot be looked up in FINAL: left as they were
            rep['rows_without_outlet_id'] += 1
            continue
        fi, f3 = final.get(('IM3', a)) if a else None, final.get(('3ID', b)) if b else None
        o['dse_code_im3'] = fi['code'] if fi else ''
        o['dse_code_3id'] = f3['code'] if f3 else ''
        if fi or f3:
            ni, n3 = fi['name'] if fi else '', f3['name'] if f3 else ''
            o['dse_name'] = ni or n3
            if ni and n3 and ni.upper() != n3.upper():
                add_flag(o, 'DSE_IM3_3ID_BEDA')
                rep['dse_im3_3id_differ'] += 1
            rep['outlets_with_final_dse'] += 1
            base = str(o['dse_name_base'] or '')
            o['_moves'] = []
            for fr in (fi, f3):                       # per brand id: the DSE it had in the master vs the DSE FINAL gives it
                if fr and not PLACEHOLDER.match(base) and base.upper() != fr['name'].upper():
                    flows[(base, fr['name'])] += 1
                    o['_moves'].append((base, fr['name']))
        elif a or b:
            o['dse_name'] = 'UNASSIGNED'
            add_flag(o, F_NOT_IN_FINAL)
            rep['outlets_not_in_final'] += 1
    swaps = {f for f in flows if (f[1], f[0]) in flows}
    swap_names = Counter()
    for o in outlets:
        if any(k in swaps for k in o.pop('_moves', ())):
            rep['outlets_swap_flagged' if FLAG_SWAPS else 'outlets_swapped_accepted'] += 1
            if FLAG_SWAPS:
                add_flag(o, F_SWAP)
        # login renamed for the same person
        for brand, ck in (('im3', 'dse_code_im3'), ('3id', 'dse_code_3id')):
            nb, nw = ncode(o.get('%s_base' % ck)), ncode(o.get(ck))
            if nb and nw and nb.upper() != nw.upper() and str(o['dse_name_base']).upper() == o['dse_name'].upper():
                add_flag(o, F_ID)
                rep['outlets_login_renamed'] += 1
                break
    for (a_, b_) in swaps:
        swap_names[a_] += flows[(a_, b_)]
        swap_names[b_] += flows[(b_, a_)]
    rep['swap_pairs'] = len(swaps) // 2
    rep['swap_dse'] = len(swap_names)

    # ---- 4. DSE-level flags
    flag_rows = []
    for nm, n in sorted(swap_names.items()) if FLAG_SWAPS else []:
        partners = sorted({(b_ if a_ == nm else a_) for (a_, b_) in swaps if nm in (a_, b_)})
        flag_rows.append((nm.upper(), 'name', F_SWAP, '%d outlet bertukar dengan %s' % (n, ', '.join(partners)), ''))
    hier_by_name = defaultdict(list)
    for h in hier:
        hier_by_name[h['nama_dse'].strip().upper()].append(h)
    sem = read_csv(os.path.join(CAT, 'dse_login_sementara.csv')) if os.path.exists(os.path.join(CAT, 'dse_login_sementara.csv')) else []
    sem_codes = {ncode(r['login']).upper() for r in sem}
    for r in logins:
        hs = hier_by_name.get(r['dse_name'].strip().upper(), [])
        if not hs:
            continue
        h = next((x for x in hs if x['micro_cluster'] == r['mc']), hs[0])
        ch = []
        for lab, new, old in (('IM3', r['login_im3'], h['dse_id_im3']), ('3ID', r['login_3id'], h['dse_id_3id'])):
            if ncode(new).upper() != ncode(old).upper():
                ch.append('%s %s menjadi %s' % (lab, ncode(old) or 'kosong', ncode(new)))
        if ch:
            flag_rows.append((r['dse_name'].strip().upper(), 'name', F_ID, 'login berubah di katalog: ' + '; '.join(ch) + ' (login lama tetap dikenali)', ''))
    for r in sem:
        flag_rows.append((ncode(r['login']).upper(), 'login', F_LOGIN, r['keputusan'], r['dugaan_pemilik']))
    rep['dse_flag_rows'] = len(flag_rows)
    rep['sem_logins'] = len(sem_codes)

    # ---- result
    for o in outlets:
        o.pop('_del', None)
    # ---- 4. Entity and brand flag (owner, 23 Oct 2026; docs/assessments/hybrid_entity_recommendation.md): one physical outlet = one entity.
    # brand_flag is derived from the ids (never copied from the catalogue label Status Pairing); the label stays in pairing_status and a contradiction is flagged.
    n3 = Counter(nid(o.get('outlet_id_3id')) for o in outlets if nid(o.get('outlet_id_3id')))
    for o in outlets:                                         # a 3ID id on several outlet rows (also outlets added from FINAL) is an open pairing decision, flagged like the others
        i3 = nid(o.get('outlet_id_3id'))
        if i3 and n3[i3] > 1 and 'PAIR_3ID_GANDA' not in str(o.get('flags') or ''):
            add_flag(o, 'PAIR_3ID_GANDA'); add_flag(o, 'ID_PERLU_VERIFIKASI')
    flags_n = Counter()
    for o in outlets:
        a, b = bool(nid(o.get('outlet_id_im3'))), bool(nid(o.get('outlet_id_3id')))
        o['brand_flag'] = 'HYBRID' if a and b else ('IM3_ONLY' if a else ('3ID_ONLY' if b else 'TANPA_ID'))
        o['entity_id'] = o.get('outlet_id_ioh') or o['outlet_key']          # Outlet ID IOH when the catalogue has it, else the internal outlet_key
        lab = str(o.get('pairing_status') or '').upper()
        o['flag_status_conflict'] = '1' if lab and ((lab.startswith('DUAL') and o['brand_flag'] != 'HYBRID') or (lab.startswith('SINGLE') and o['brand_flag'] == 'HYBRID')) else ''
        flags_n[o['brand_flag']] += 1
        if o['flag_status_conflict']:
            flags_n['conflict'] += 1
    rep['brand_flag'] = dict(flags_n)
    rep['outlets_total'] = len(outlets)
    return outlets, rep, hold, flag_rows


def build_tree(outlets):
    tree = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    for o in outlets:
        tree[o['branch']][o['micro_cluster']][o['dse_code_im3'] or o['dse_code_3id'] or 'UNASSIGNED'].append(o['outlet_key'])
    return tree


def write_flags(flag_rows):
    path = os.path.join(CAT, 'dse_flags.csv')
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['key', 'kind', 'flag', 'note', 'dugaan_pemilik'])
        w.writerows(flag_rows)
    js = defaultdict(list)
    for k, kind, flag, note, owner in flag_rows:
        js[k].append({'f': flag, 'n': note, 'o': owner})
    with open(os.path.join(WEB, 'dse_flags.js'), 'w', encoding='utf-8') as f:
        f.write('/* DSE and login flags (scripts/apply_final_dse_mapping.py): keys are upper-case DSE names or logins */\n(function (root) {\n  var feed = ')
        json.dump(js, f, ensure_ascii=False)
        f.write(';\n  if (typeof module !== \'undefined\' && module.exports) { module.exports = feed; }\n  if (root) { root.DSE_FLAGS = feed; }\n})(typeof window !== \'undefined\' ? window : (typeof global !== \'undefined\' ? global : this));\n')


def run(base_outlets, save_base=False):
    cat_dir = latest_catalogue()
    if save_base:
        with gzip.open(BASE, 'wt', encoding='utf-8') as f:
            json.dump(base_outlets, f, ensure_ascii=False)
    outlets, rep, hold, flag_rows = apply(base_outlets, cat_dir)
    with open(os.path.join(cat_dir, 'pairing_hold.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['id_im3', 'id_3id', 'alasan'])
        w.writerows(hold)
    rep['generated_at'] = datetime.now().isoformat(timespec='seconds')
    with open(os.path.join(cat_dir, 'apply_report.json'), 'w') as f:
        json.dump(rep, f, indent=2, sort_keys=True)
    write_flags(flag_rows)
    mc_leadership, _ = TM.load_leadership_hierarchy()
    TM.export_catalogues(outlets, build_tree(outlets), mc_leadership)
    return rep


def main():
    if os.path.exists(BASE):
        with gzip.open(BASE, 'rt', encoding='utf-8') as f:
            base = json.load(f)
        save = False
        print('Baseline master:', os.path.relpath(BASE, ROOT))
    else:
        with open(os.path.join(CAT, 'territory_management_master.json'), encoding='utf-8') as f:
            base = json.load(f)
        save = True
        print('No baseline yet: the current territory master becomes the baseline.')
    rep = run(base, save_base=save)
    print(json.dumps(rep, indent=2, sort_keys=True))


if __name__ == '__main__':
    main()
