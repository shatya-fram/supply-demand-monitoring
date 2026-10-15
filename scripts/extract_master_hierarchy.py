#!/usr/bin/env python3
"""
Extract Inner Jakarta Master Hierarchy from docs/MASTER DSE Hirarki.xlsx
Generates governed local mapping catalogues in data/catalogues/
"""

import os
import csv
import json
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX_PATH = os.path.join(WORKSPACE_DIR, "docs", "MASTER DSE Hirarki.xlsx")
CATALOGUES_DIR = os.path.join(WORKSPACE_DIR, "data", "catalogues")

def read_xlsx_sheet(xlsx_path, target_sheet_name="MASTER DSE BSM HOA"):
    with zipfile.ZipFile(xlsx_path, "r") as z:
        # Load shared strings
        sst = []
        if "xl/sharedStrings.xml" in z.namelist():
            sst_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in sst_root.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si"):
                t_elems = si.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")
                sst.append("".join([t.text or "" for t in t_elems]))

        # Get workbook sheets
        wb_root = ET.fromstring(z.read("xl/workbook.xml"))
        rels_root = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rel_map = {
            r.get("Id"): r.get("Target")
            for r in rels_root.iter("{http://schemas.openxmlformats.org/package/2006/relationships}Relationship")
        }

        target_file = None
        for s in wb_root.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet"):
            if s.get("name") == target_sheet_name:
                r_id = s.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
                target_file = "xl/" + rel_map[r_id]
                break

        if not target_file:
            raise ValueError(f"Sheet {target_sheet_name} not found in {xlsx_path}")

        s_root = ET.fromstring(z.read(target_file))
        rows = []
        for r in s_root.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row"):
            cells = {}
            for c in r.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
                ref = c.get("r")
                col = "".join([ch for ch in ref if ch.isalpha()])
                t = c.get("t")
                v = c.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
                val = v.text if v is not None else ""
                if t == "s" and val.isdigit():
                    val = sst[int(val)]
                cells[col] = val.strip()
            rows.append(cells)

    return rows

def main():
    os.makedirs(CATALOGUES_DIR, exist_ok=True)
    print(f"Reading {XLSX_PATH}...")
    rows = read_xlsx_sheet(XLSX_PATH)

    # Header is row 0
    header_map = rows[0]
    col_keys = {
        "A": "region",
        "B": "branch",
        "C": "nama_hoa",
        "D": "micro_cluster",
        "E": "nama_dso",
        "F": "nama_dse",
        "G": "id_telegram",
        "H": "alamat",
        "I": "no_ktp",
        "J": "jenis_kelamin",
        "K": "role",
        "L": "msisdn_mobo",
        "M": "email",
        "N": "remarks",
        "O": "rayon",
        "P": "dse_id_im3",
        "Q": "dse_id_3id",
        "R": "pt_dseid_im3",
        "S": "pt_dseid_3id"
    }

    dse_list = []
    dso_map = {}
    branch_map = defaultdict(lambda: {"hoa": set(), "clusters": set(), "dsos": set(), "dse_count": 0})

    for r in rows[1:]:
        entry = {field: r.get(col, "") for col, field in col_keys.items()}
        if not entry["branch"] or not entry["nama_dse"]:
            continue

        dse_list.append(entry)

        # DSO summary
        dso_key = (entry["branch"], entry["micro_cluster"], entry["nama_dso"])
        if dso_key not in dso_map:
            dso_map[dso_key] = {
                "region": entry["region"],
                "branch": entry["branch"],
                "nama_hoa": entry["nama_hoa"],
                "micro_cluster": entry["micro_cluster"],
                "nama_dso": entry["nama_dso"],
                "dse_count": 0,
                "dses": []
            }
        dso_map[dso_key]["dse_count"] += 1
        dso_map[dso_key]["dses"].append(entry["nama_dse"])

        # Branch summary
        b = entry["branch"]
        if entry["nama_hoa"]:
            branch_map[b]["hoa"].add(entry["nama_hoa"])
        if entry["micro_cluster"]:
            branch_map[b]["clusters"].add(entry["micro_cluster"])
        if entry["nama_dso"]:
            branch_map[b]["dsos"].add(entry["nama_dso"])
        branch_map[b]["dse_count"] += 1

    # 1. Write full DSE Master Catalogue CSV
    dse_csv_path = os.path.join(CATALOGUES_DIR, "dse_master_hierarchy.csv")
    csv_fields = [
        "region", "branch", "nama_hoa", "micro_cluster", "nama_dso",
        "nama_dse", "role", "dse_id_im3", "dse_id_3id", "msisdn_mobo",
        "rayon", "pt_dseid_im3", "pt_dseid_3id", "email"
    ]
    with open(dse_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(dse_list)
    print(f"✓ Saved {len(dse_list)} DSE records to {dse_csv_path}")

    # 2. Write full DSE Master Catalogue JSON
    dse_json_path = os.path.join(CATALOGUES_DIR, "dse_master_hierarchy.json")
    with open(dse_json_path, "w", encoding="utf-8") as f:
        json.dump(dse_list, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved DSE JSON catalogue to {dse_json_path}")

    # 3. Write DSO Territory Mapping CSV & JSON
    dso_list = list(dso_map.values())
    dso_csv_path = os.path.join(CATALOGUES_DIR, "dso_territory_mapping.csv")
    dso_fields = ["region", "branch", "nama_hoa", "micro_cluster", "nama_dso", "dse_count"]
    with open(dso_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=dso_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(dso_list)
    print(f"✓ Saved {len(dso_list)} DSO territories to {dso_csv_path}")

    dso_json_path = os.path.join(CATALOGUES_DIR, "dso_territory_mapping.json")
    with open(dso_json_path, "w", encoding="utf-8") as f:
        json.dump(dso_list, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved DSO JSON mapping to {dso_json_path}")

    # 4. Write Branch Summary
    branch_summary = []
    for b, data in sorted(branch_map.items()):
        branch_summary.append({
            "region": "INNER JAKARTA",
            "branch": b,
            "head_of_area": ", ".join(sorted(data["hoa"])),
            "micro_clusters_count": len(data["clusters"]),
            "dso_count": len(data["dsos"]),
            "dse_count": data["dse_count"]
        })
    branch_csv_path = os.path.join(CATALOGUES_DIR, "branch_area_summary.csv")
    with open(branch_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["region", "branch", "head_of_area", "micro_clusters_count", "dso_count", "dse_count"])
        writer.writeheader()
        writer.writerows(branch_summary)
    print(f"✓ Saved {len(branch_summary)} Branch summaries to {branch_csv_path}")

    print("\nExtraction Summary:")
    print(f"- Region: INNER JAKARTA")
    print(f"- Total Branches: {len(branch_summary)}")
    print(f"- Total Micro-clusters / DSOs: {len(dso_list)}")
    print(f"- Total DSEs: {len(dse_list)}")

if __name__ == "__main__":
    main()
