# Data change log

One entry per data refresh: what arrived in `raw/`, what changed in the feeds, what to watch. Newest first. Method details live in `docs/assessments/`; run the refresh with `python3 scripts/daily_update.py`.

## 16 Oct 2026 (second refresh, 06:00 WIB)

| Scope | Source (raw/) | Cut | Change |
|---|---|---|---|
| PJP visits | `OneDrive_2_10-16-2026 (1)/*_14_14.zip` (real 14 Oct) and `*_15_15.zip` | 01–15 Oct, no gap | 14 Oct added: 8,345 planned / 6,284 executed. Month: planned 69,790 → **78,135**, executed 45,248 → **51,532** (64.8% → 66.0%), productive 15,411 → 18,161 (35.2%), outlet coverage 87.4% → 90.0%, never visited MTD 1,739 → 1,387, sites with 0 visits 314 → 254. Days 1–13 and 15 unchanged. |
| Demand SALMO (new) | `Data as of 15 Oct /DAILY_DATA_MOBO_SALMO_202610.xlsb` | 1–15 Oct | New category `SAL` (saldo the outlet transacts to customers): Rp 67.79 B attributed to 11,622 outlets, 79% on ad-hoc ids, 50 unresolved ids = Rp 6.62 B. Shown separately, **not in total demand** (Rp 60.98 B) until its overlap with Reload / Voucher / Paket Data is confirmed. `docs/assessments/daily_data_mobo_salmo.md`. |
| MOBO demand | `DAILY_DATA_MOBO_202610 (3).xlsb` | 15 Oct | Same cell values as the 22:24 file in all five sheets: no change. |
| KPI inputs | rebuilt | visits 15 Oct | follows the new PJP days |

Notes
- The file named `*_14_14.zip` first received held 15 Oct; coverage is now read from each report's `PERIOD ->` line and byte-identical copies (a renamed `14_14` → `15_15`) are read once, otherwise IM3 15 Oct would have counted twice.
- `DAILY_DATA_MOBO_SALMO_*` is not the MOBO demand workbook; the daily command's MOBO search excludes it.
- Print sheets show "SALMO Rp x" (demand, October only) under Demand MTD and a "Demand SALMO MTD" column in the population sheet; last-FM / LMTD SALMO there stays the MOBII Sell-In.

## 16 Oct 2026 (first refresh, 05:30 WIB)

| Scope | Source | Cut | Change |
|---|---|---|---|
| Supply · MOBII | `Data as of 15 Oct /DAILY_DATA_MOBII_202610.xlsb` | 13 → **15 Oct** | Days 14–15 added (Rp 1.01 B and 1.07 B), days 1–13 unchanged. Sell-In MTD (SP + voucher + saldo) Rp 4.43 B → 6.51 B; MTD vs LMTD −68.7% → −61.4% (October migration low base). September full month +Rp 0.34 B (+0.8%) vs the previous file: small restatement, not traced per outlet. |
| Demand · MOBO | `DAILY_DATA_MOBO_202610.xlsb` | 14 → **15 Oct** | Day 15 added; days ≤ 14 unchanged. Demand (RLD + VCI + CVM + PKT) Rp 58.25 B → 60.96 B. Day 15 looks partial for Reload (48% of day 14) and SP Injection (47%); Paket Data 96%, Voucher Injection 93%, CVM 90%. |
| PJP visits | `*_14_14.zip` (content 15 Oct) | 01–15 Oct, **14 Oct n/a** | 15 Oct added: 8,282 planned / 6,646 executed. Planned 61,508 → 69,790, executed 62.8% → 64.8%. 14 Oct flagged "data not available", not zero. |
| ENDBAL | `ENDBAL/87136690_Stock Balance Daily Report_2026-10-16_*.csv` | snapshot **15 Oct** | Only the newest snapshot date is read (the 14 and 15 Oct files would have been summed): stock Rp 3.58 B → 3.55 B, zero-stock outlets 4,870 → 5,091 (master 3,013 → 3,011). |
| GA | no new file | 13 Oct | unchanged |

Tooling in the same commit: ENDBAL and GA join the daily command, stale-file warning after 36 h, PJP duplicate and period detection, DSE sum check without promotors.

## 15 Oct 2026 (evening)

| Scope | Source | Change |
|---|---|---|
| GA / SSO | `GA/Daily_RGUGA_OUTLET_202609.xlsb` re-issued 21:02 | September full month IOH 218,257 → **252,195** pcs, LMTD (1–13 Sep) 81,004 → 92,596; October MTD vs LMTD **+12.6% → −1.5%** (IM3 +4.3% → −2.0%, 3ID +34.1% → −0.6%). 3ID outlets absent from the new sheets are kept through `data/catalogues/ga_ij_outlet_registry.csv` (without them 3ID would be −5.5%). `docs/assessments/ga_rguga_outlet.md` §9. |
| Gross Add menu | — | Basis GA bar above the tabs, site NBS basis, scorecard with last full month, gap, run-rate and SSO gap, Overall Inner Jakarta table. |

## Open data items (16 Oct 2026)
1. MOBO 15 Oct is partial for Reload and SP Injection; refresh when the full-day file arrives.
2. MOBII and MOBO for 16 Oct are not in `raw/` yet.
3. SALMO overlap with the other MOBO categories, and the 50 unresolved ids (Rp 6.62 B), are unconfirmed; no September SALMO file for LMTD / last full month.
4. September +Rp 0.34 B restatement in the MOBII file is not explained.
5. GA feed still ends at 13 Oct (no newer RGUGA October file).
