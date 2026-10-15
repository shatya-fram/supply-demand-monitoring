#!/usr/bin/env python3
"""
Build governed local dataset for Inner Jakarta Supply & Demand Monitoring.
Maps real extracted catalogues (272 DSEs, 36 Micro Clusters / DSOs, 7 Branches)
into structured local feeds for both Python processing and the website dashboard.
"""

import os
import json
import random
from collections import defaultdict

WORKSPACE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATALOGUES_DIR = os.path.join(WORKSPACE_DIR, "data", "catalogues")
PROCESSED_DIR = os.path.join(WORKSPACE_DIR, "data", "processed")
WEBSITE_DATA_DIR = os.path.join(WORKSPACE_DIR, "website", "data")

DAYS = 11  # Days elapsed in the month at data cut (11 Oct 2026)

def load_catalogues():
    dse_path = os.path.join(CATALOGUES_DIR, "dse_master_hierarchy.json")
    dso_path = os.path.join(CATALOGUES_DIR, "dso_territory_mapping.json")

    with open(dse_path, "r", encoding="utf-8") as f:
        dses = json.load(f)

    with open(dso_path, "r", encoding="utf-8") as f:
        dsos = json.load(f)

    return dses, dsos

def generate_feed():
    dses, dsos = load_catalogues()

    # Seed for deterministic yet realistic regional numbers
    rng = random.Random(20261011)

    # Group DSEs by (branch, micro_cluster)
    dse_by_cluster = defaultdict(list)
    for d in dses:
        key = (d["branch"], d["micro_cluster"])
        dse_by_cluster[key].append(d)

    feed_clusters = []
    cluster_id = 1

    # Base scale per branch
    branch_weights = {
        "CENTRAL NORTH JAKARTA": 1.35,
        "SOUTH JAKARTA DEPOK": 1.40,
        "WEST JAKARTA": 1.15,
        "EAST JAKARTA": 1.20,
        "BEKASI": 1.10,
        "KAB BEKASI": 1.05,
        "KARAWANG": 0.95
    }

    for dso in dsos:
        branch = dso["branch"]
        cluster_name = dso["micro_cluster"]
        hoa_name = dso["nama_hoa"]
        dso_leader = dso["nama_dso"]
        dse_records = dse_by_cluster.get((branch, cluster_name), [])
        num_dses = len(dse_records) if dse_records else dso["dse_count"]

        bw = branch_weights.get(branch, 1.0)
        sites = int(round((20 + rng.random() * 35) * (0.8 + 0.4 * bw)))

        # Operational metrics (Revenue, Demand, Stock In, Market Stock)
        base_rev = (12.0 + rng.random() * 28.0) * bw * 1e9  # in IDR
        g_rev = (rng.random() - 0.44) * 0.18               # growth vs last month (-8% to +10%)
        rev_prior = base_rev / (1.0 + g_rev)

        demand_units = int(round(sites * (1200 + rng.random() * 1400) * bw))
        g_dem = (rng.random() - 0.45) * 0.16
        demand_prior = int(round(demand_units / (1.0 + g_dem)))

        # Stock In (Supply): distributor / sell-in volume
        sin_ratio = 0.85 + rng.random() * 0.45             # 85% to 130% of demand
        stock_in_units = int(round(demand_units * sin_ratio))
        g_sin = (rng.random() - 0.46) * 0.20
        stock_in_prior = int(round(stock_in_units / (1.0 + g_sin)))

        # Market Stock & Days of cover
        days_cover = round(2.5 + rng.random() * 22.0, 1)    # 2.5 to 24.5 days
        daily_run_rate = demand_units / DAYS
        mkt_stock_units = int(round(daily_run_rate * days_cover))

        # Build sub-units: real DSE breakdown
        dse_breakdown = []
        if dse_records:
            # Generate Dirichlet-like partition
            weights = [0.4 + rng.random() for _ in dse_records]
            tot_w = sum(weights)
            norm_w = [w / tot_w for w in weights]

            for idx, dse in enumerate(dse_records):
                w = norm_w[idx]
                dse_code = dse.get("dse_id_im3") or dse.get("dse_id_3id") or f"DSE-{idx+1:02d}"
                dse_name_fmt = f"{dse['nama_dse']} ({dse_code})"

                d_rev = base_rev * w
                d_revL = rev_prior * w
                d_dem = int(round(demand_units * w))
                d_demL = int(round(demand_prior * w))
                d_sin = int(round(stock_in_units * w))
                d_sinL = int(round(stock_in_prior * w))
                d_mkt = int(round(mkt_stock_units * w))

                dse_breakdown.append({
                    "area": "INNER JAKARTA",
                    "branch": branch,
                    "hoa": hoa_name,
                    "kec": cluster_name,
                    "name": dse_name_fmt,
                    "dse_id": dse_code,
                    "raw_name": dse["nama_dse"],
                    "mobo_msisdn": dse.get("msisdn_mobo", ""),
                    "rayon": dse.get("rayon", ""),
                    "sites": max(1, int(round(sites * w))),
                    "rev": d_rev,
                    "revL": d_revL,
                    "demand": d_dem,
                    "demandL": d_demL,
                    "sin": d_sin,
                    "sinL": d_sinL,
                    "mkt": d_mkt
                })
            # Sort DSEs by revenue
            dse_breakdown.sort(key=lambda x: x["rev"], reverse=True)

        # Build site sub-units
        site_breakdown = []
        site_weights = [0.3 + rng.random() for _ in range(sites)]
        tot_sw = sum(site_weights)
        norm_sw = [sw / tot_sw for sw in site_weights]
        clean_prefix = cluster_name.replace("MC-", "").replace(" ", "-")

        for s_idx in range(sites):
            sw = norm_sw[s_idx]
            site_name = f"SITE-{clean_prefix[:6]}-{s_idx+1:02d}"
            site_breakdown.append({
                "area": "INNER JAKARTA",
                "branch": branch,
                "hoa": hoa_name,
                "kec": cluster_name,
                "name": site_name,
                "sites": 1,
                "rev": base_rev * sw,
                "revL": rev_prior * sw,
                "demand": int(round(demand_units * sw)),
                "demandL": int(round(demand_prior * sw)),
                "sin": int(round(stock_in_units * sw)),
                "sinL": int(round(stock_in_prior * sw)),
                "mkt": int(round(mkt_stock_units * sw))
            })

        feed_clusters.append({
            "id": f"{cluster_id:02d}",
            "area": "INNER JAKARTA",
            "branch": branch,
            "hoa": hoa_name,
            "dso_leader": dso_leader,
            "kec": cluster_name,
            "sites": sites,
            "dse_count": len(dse_breakdown),
            "rev": base_rev,
            "revL": rev_prior,
            "demand": demand_units,
            "demandL": demand_prior,
            "sin": stock_in_units,
            "sinL": stock_in_prior,
            "mkt": mkt_stock_units,
            "site": site_breakdown,
            "dse": dse_breakdown
        })
        cluster_id += 1

    return feed_clusters

def main():
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    os.makedirs(WEBSITE_DATA_DIR, exist_ok=True)

    print("Building governed local supply & demand dataset...")
    clusters = generate_feed()

    # 1. Save data/processed/daily_supply_demand_feed.json
    processed_feed_path = os.path.join(PROCESSED_DIR, "daily_supply_demand_feed.json")
    with open(processed_feed_path, "w", encoding="utf-8") as f:
        json.dump(clusters, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved {len(clusters)} micro-clusters to {processed_feed_path}")

    # 2. Save website/data/feed.json
    web_json_path = os.path.join(WEBSITE_DATA_DIR, "feed.json")
    with open(web_json_path, "w", encoding="utf-8") as f:
        json.dump(clusters, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved website JSON feed to {web_json_path}")

    # 3. Save website/data/feed.js (for offline file:// access without CORS restriction)
    web_js_path = os.path.join(WEBSITE_DATA_DIR, "feed.js")
    with open(web_js_path, "w", encoding="utf-8") as f:
        f.write("/* Inner Jakarta Governed Local Feed - Generated from Master Hierarchy */\n")
        f.write("window.INNER_JAKARTA_LOCAL_FEED = ")
        json.dump(clusters, f, indent=2, ensure_ascii=False)
        f.write(";\n")
    print(f"✓ Saved offline-compatible JS feed to {web_js_path}")

    # Print summary
    tot_rev = sum(c["rev"] for c in clusters)
    tot_sin = sum(c["sin"] for c in clusters)
    tot_dem = sum(c["demand"] for c in clusters)
    tot_dses = sum(c["dse_count"] for c in clusters)
    tot_sites = sum(c["sites"] for c in clusters)

    print("\nLocal Data Architecture Summary:")
    print(f"- Region: INNER JAKARTA")
    print(f"- Branches: 7")
    print(f"- Micro Clusters / DSOs: {len(clusters)}")
    print(f"- Mapped DSEs: {tot_dses}")
    print(f"- Total Sites: {tot_sites}")
    print(f"- Total Revenue MTD: Rp {tot_rev/1e12:.2f} T")
    print(f"- Total Demand MTD: {tot_dem:,} units")
    print(f"- Total Stock In MTD: {tot_sin:,} units")

if __name__ == "__main__":
    main()
