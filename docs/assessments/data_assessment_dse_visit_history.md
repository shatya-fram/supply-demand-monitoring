# Technical Data Assessment: DSE Visit History & Beat Plan Compliance

**Assessment Scope**: Phase 1 Sell-In Pipeline · Stage 2 (DSE Field Visits & Beat Plans)  
**Data Sources**:  
- `raw/MOBI VISIT DSE/3id_visit_dse_202610__01_11.zip` (`Journey_Plan_Summary_Detail_Report_271556241_0.csv`)
- `raw/MOBI VISIT DSE/im3_visit_dse_202610__01_11.zip` (`Journey_Plan_Summary_Detail_Report_271557544_0.csv`)  
- Reconciled against `website/data/territory_feed.js` (14,694 Master Stores & 273 DSE Canvassers) and downstream Sell-In ledgers (`raw/SP VC Sellin/`, `raw/MOBI TRansfer Balance/`).

---

## 1. Executive Summary & Core Insights

The DSE Visit log in `raw/MOBI VISIT DSE/` represents the **operational engine** of the Sell-In pipeline. Over the 11-day period from **01-Oct-2026 to 11-Oct-2026**, DSE canvassers operated across Inner Jakarta under scheduled beat plans (Journey Plans).

```mermaid
flowchart TD
    subgraph S1["1. Beat Plan Scheduling"]
        P_VISITS["45,540 Scheduled Store Visits<br>(21,169 Distinct Retail Outlets)"]
    end

    subgraph S2["2. Field Execution (Check-In)"]
        EX_VISITS["26,152 Executed Visits (57.4%)<br>15,685 Unique Stores Visited"]
        MISSED["19,388 Missed Visits (42.6%)<br>Route Compliance Deficit"]
    end

    subgraph S3["3. Downstream Supply Conversion"]
        DELIV_SP["2,945 Outlets Physical SP/VC<br>★ 97.9% Visit-Driven Conversion"]
        DELIV_SALDO["4,691 Outlets Electronic Saldo<br>46.4% On-Site / 53.6% Remote"]
    end

    P_VISITS --> EX_VISITS
    P_VISITS --> MISSED
    EX_VISITS --> DELIV_SP
    EX_VISITS --> DELIV_SALDO
```

### Key Takeaways:
1. **Route Compliance Ramp-up**: Route compliance starts at **5.6% on Oct 1** (early month distributor briefings and allocation) and climbs steadily to **69.4% by Oct 9-10** as field execution matures.
2. **Physical Sell-In is 97.9% Visit-Coupled**: Of the 3,007 stores receiving physical Starter Packs and Vouchers in this period, **2,945 (97.9%)** had a completed physical DSE visit. Physical supply delivery is strictly anchored to in-person store attendance.
3. **Electronic Saldo is 46.4% Hybrid**: Of the 10,114 stores receiving Mobo saldo, **4,691 (46.4%)** were visited in-person, while **5,423 (53.6%)** were topped up remotely by DSEs/SDPs without an on-premise check-in.
4. **GPS Integrity**: Completed check-ins exhibit high geolocation discipline, with a **median deviation of only 60 meters** from master store coordinates (95.1% within 250m; 100% within 500m).
5. **Visit Duration Profile**: DSEs spend a **median of 8 minutes 7 seconds** per outlet (average 18m 21s). Over 54% of visits fall in the 2–10 minute window, reflecting rapid replenishment and balance transfers.

---

## 2. Dataset Period & Temporal Cadence

- **Temporal Coverage**: **01-Oct-2026 00:00:00 WIB to 11-Oct-2026 23:59:59 WIB** (11 calendar days, 9 business workdays).
- **Day-by-Day Volume & Compliance Progression**:

| Schedule Date | Day of Week | Planned Visits | Actual Check-Ins | Route Compliance Rate (%) | Operational Context |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **01-Oct-2026** | Thu | 1,234 | 69 | **5.6%** | Month kickoff, MPC distributor stock pick-up, initial beat plan sync |
| **02-Oct-2026** | Fri | 2,846 | 981 | **34.5%** | Initial field deployment & DSE territory orientation |
| **03-Oct-2026** | Sat | 3,591 | 1,195 | **33.3%** | Weekend round 1 (selected commercial retail hubs) |
| **04-Oct-2026** | Sun | 15 | 8 | **53.3%** | Official rest day (minimal on-demand emergency visits) |
| **05-Oct-2026** | Mon | 4,017 | 2,094 | **52.1%** | Full weekly beat plan launch across all branches |
| **06-Oct-2026** | Tue | 4,263 | 2,546 | **59.7%** | Steady-state route execution |
| **07-Oct-2026** | Wed | 6,621 | 3,768 | **56.9%** | Mid-week replenishment push (SP & Saldo restock) |
| **08-Oct-2026** | Thu | 7,226 | 4,624 | **64.0%** | High-velocity visit run |
| **09-Oct-2026** | Fri | 7,396 | 5,135 | **69.4%** | Peak weekday coverage (5,135 visits completed) |
| **10-Oct-2026** | Sat | 8,300 | 5,732 | **69.1%** | Highest single-day visit execution of the month |
| **11-Oct-2026** | Sun | 31 | 0 | **0.0%** | Rest day |
| **TOTAL** | **11 Days** | **45,540** | **26,152** | **57.4%** | **Overall 11-Day Route Execution Rate** |

---

## 3. Hourly Visit Velocity (WIB)

Field visits show a pronounced peak during the midday commercial rush:

```
06:00 - 08:59 :   116 visits ( 0.5%)  | 
09:00 - 10:59 : 2,313 visits ( 8.8%)  | █████
11:00 - 11:59 : 3,075 visits (11.8%)  | █████████████
12:00 - 12:59 : 3,494 visits (13.4%)  | ██████████████
13:00 - 13:59 : 3,961 visits (15.1%)  | ████████████████  <-- PEAK VISIT HOUR
14:00 - 14:59 : 3,457 visits (13.2%)  | ██████████████
15:00 - 15:59 : 2,564 visits ( 9.8%)  | ██████████
16:00 - 17:59 : 3,683 visits (14.1%)  | ███████████████
18:00 - 21:59 : 3,325 visits (12.7%)  | █████████████
22:00 - 23:59 :   427 visits ( 1.6%)  | █
```

- **Core Working Window (11:00 – 15:00 WIB)**: Accounts for **13,987 visits (53.5%)**.
- **Evening Coverage (18:00 – 22:00 WIB)**: Accounts for **12.7%** of visits, capturing late-night roadside kiosks and high-traffic transit kiosks.

---

## 4. Master Catalogue Reconciliation (14,694 Mapped Stores)

Cross-referencing the MOBI visit logs against the unified Master Catalogue (`website/data/territory_feed.js`) yields:

| Dimension | Total Count | % of Master Catalogue | Operational Significance |
| :--- | :---: | :---: | :--- |
| **Total Master Outlets** | **14,694** | 100.0% | Static master store footprint |
| **Stores in Scheduled Beat Plans** | **11,732** | **79.9%** | Stores active in current journey plan routing |
| **Stores Visited (Check-In Completed)** | **9,059** | **61.7%** | Stores visited at least once in 01–11 Oct |
| **Master Stores Unvisited in Oct 01–11** | **5,626** | **38.3%** | Blind spots / potential stockout risk |
| **Non-Master Stores Visited in MOBI** | **6,626** | — | Adhoc/traditional retailers visited outside static master |
| **Total Unique Stores Visited in MOBI** | **15,685** | — | Total physical retail points reached |

### Visit Frequency Distribution (Visited Outlets)
- **1 visit**: 8,253 stores (52.6%) — standard fortnightly/monthly cycle.
- **2 visits**: 4,971 stores (31.7%) — weekly scheduled beat plan.
- **3 visits**: 1,873 stores (11.9%) — high-frequency replenishment.
- **4 to 7 visits**: 574 stores (3.7%) — flagship / gold tier retail accounts.
- **10 visits**: 1 store (0.01%) — daily service store.

---

## 5. DSE Canvasser Productivity & Route Metrics

- **Active DSE Operators with Logged Visits**: **582 DSEs** (combined IM3 and 3ID canvassers across Inner Jakarta).
- **Store Coverage per DSE (in 11 days)**:
  - Median: **29 unique stores** | Average: **28.5 stores**
  - Range: **1 to 75 unique stores**.
- **Visit Check-Ins per DSE (in 11 days)**:
  - Median: **40 visits** | Average: **45.4 visits**
  - Range: **1 to 150 visits** (~16.7 visits/day for top canvassers across 9 working days).

---

## 6. Geolocation Compliance & Proximity Audit

Analyzing all **26,415 physical check-in events**:

| Distance from Registered Store GPS | Check-In Count | Share (%) | Audit Classification |
| :--- | :---: | :---: | :--- |
| **$\le$ 50 meters** | **12,661** | **47.9%** | **On-Premise (Doorstep / Inside Store)** |
| **$\le$ 100 meters** | **17,629** | **66.7%** | **High Confidence (Storefront / Immediate Street)** |
| **$\le$ 250 meters** | **25,127** | **95.1%** | **Acceptable Proximity (Neighborhood / Parking)** |
| **$\le$ 500 meters** | **26,415** | **100.0%** | **Urban Drift Threshold** |
| **$> 500$ meters** | **0** | **0.0%** | **Off-Site / Suspicious Check-In** |

> [!NOTE]
> Completed `Check In` events display **100% compliance** within 500 meters, with a **median deviation of only 60 meters**. This validates the technical reliability of MOBI check-in timestamps as genuine physical encounters.

---

## 7. Visit Duration Profile (Time in Store)

Analyzing all **26,147 recorded visit duration intervals**:

- **Median Duration**: **8 minutes 7 seconds**
- **Average Duration**: **18 minutes 21 seconds**

| Duration Bracket | Visit Count | Share (%) | Typical Store Activity |
| :--- | :---: | :---: | :--- |
| **$< 2$ minutes** | 1,521 | 5.8% | *Quick tap / "Drive-by" voucher drop* |
| **2 to 10 minutes** | **14,153** | **54.1%** | *Standard replenishment: Saldo top-up & physical SP receipt* |
| **10 to 30 minutes** | **7,510** | **28.7%** | *In-depth engagement: Stock taking, merchandising, problem resolution* |
| **$> 30$ minutes** | 2,963 | 11.3% | *Extended session: Onboarding, new SIM registration, high-volume order* |

---

## 8. Branch & Micro Cluster Compliance Breakdown

### Branch-Level Compliance (Ranked by Volume)

| Branch | Planned Visits | Executed Check-Ins | Compliance Rate (%) | Assessment |
| :--- | :---: | :---: | :---: | :--- |
| **SOUTH JAKARTA DEPOK** | 7,928 | 5,685 | **71.7%** | ★ Highest volume & highest compliance |
| **KOTA BEKASI** | 4,810 | 3,256 | **67.7%** | Strong urban route execution |
| **WEST JAKARTA** | 4,589 | 3,054 | **66.6%** | Solid compliance |
| **EAST JAKARTA** | 5,016 | 3,136 | **62.5%** | Consistent execution |
| **CENTRAL NORTH JAKARTA** | 6,323 | 3,618 | **57.2%** | Moderate compliance in dense traffic corridors |
| **KARAWANG** | 6,218 | 3,199 | **51.4%** | Semi-rural territory spread |
| **KAB BEKASI** | 6,976 | 2,699 | **38.7%** | ⚠️ Bottleneck: High planned route, low completion |
| **SOUTH JAKARTA** | 960 | 508 | **52.9%** | Specialized commercial accounts |
| **BEKASI** | 575 | 308 | **53.6%** | Sub-hub coverage |
| **NORTH KARAWANG** | 1,180 | 314 | **26.6%** | Rural transit corridor |

### Top 10 Micro Clusters by Completed Check-Ins

| Micro Cluster | Branch | Planned Visits | Executed Check-Ins | Compliance Rate (%) |
| :--- | :--- | :---: | :---: | :---: |
| **MC-CEMPAKA PUTIH** | CENTRAL NORTH JAKARTA | 2,090 | **1,384** | 66.2% |
| **MC-GROGOL** | WEST JAKARTA | 1,428 | **1,286** | **90.1%** (Best in Class) |
| **MC-KEBAYORAN** | SOUTH JAKARTA DEPOK | 1,484 | **1,153** | 77.7% |
| **MC-PONDOK GEDE** | KOTA BEKASI | 1,553 | **1,151** | 74.1% |
| **MC-PANCORAN** | SOUTH JAKARTA DEPOK | 1,719 | **1,150** | 66.9% |
| **MC-PASAR MINGGU** | SOUTH JAKARTA DEPOK | 1,990 | **1,068** | 53.7% |
| **MC-KARAWANG** | KARAWANG | 1,572 | **1,000** | 63.6% |
| **MC-CENGKARENG** | WEST JAKARTA | 1,915 | **998** | 52.1% |
| **MC-MUSTIKA JAYA** | KOTA BEKASI | 1,450 | **982** | 67.7% |
| **MC-CIRACAS** | EAST JAKARTA | 1,251 | **965** | 77.1% |

---

## 9. Conclusion & Pre-Commit Recommendation for Phase 1

This technical data assessment confirms that:
1. **DSE Visits are the Gateway to Physical Sell-In**: 97.9% of physical voucher/starter pack shipments correlate with a completed check-in.
2. **Electronic Saldo Operates on Two Channels**: 46.4% on-site during visits, and 53.6% remote replenishment.
3. **Data Quality is High**: Check-in GPS accuracy (median 60m) and checkout timestamps (99.9% checkout completion) are verified.
4. **Targeted Opportunity**: 5,626 mapped master stores received zero visits in the first 11 days of October, representing prime candidates for beat plan optimization and stockout prevention.
