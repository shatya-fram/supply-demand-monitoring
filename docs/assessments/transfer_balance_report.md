# Transfer Balance Report (`inner_tf_balance_<YYYYMM>____<dd>_<dd>.csv`) · assessment

Assessed 23 Oct 2026 (CLAUDE.md §2) before any builder reads it. File: `raw/MOBI TRansfer Balance/inner_tf_balance_202610____22_22.csv` (23 Oct 05:34, 3.2 MB), one day (22 Oct 2026), region INNER JAKARTA. **No builder reads it yet**: `build_sellin_feed.py` globs the same folder but expects the pipe-delimited MOBI *Physical Distribution Summary Report* (`TRANSACTION DATETIME|…`, `ORDER TYPES -> Balance Transfer`); this file is a different export ("Transfer Balance Report", comma CSV with a 12-line quoted preamble, header starting `DateTime`), so it is skipped silently.

## 1. Layout
Preamble: `Transfer Balance Report`, `End Date`, `Start Date`, `Area / Region / Cluster / Sales Area / Channel / Additional Territory / Organization ID / Organization Type / Target Organization ID` (all "All" or blank). Header (31 columns): `DateTime, Transaction ID, Channel, Region, Area, Sales Area, Cluster, Additional Territory, Transaction Channel, Organization Type, Organization ID, Organization Name, Operator ID, Operator Name, Operator Type, MSISDN, User Name, Credit Party ID, Credit Party Name, Approval Operator ID, Approval Operator Name, Approval DateTime, Approval Channel, Account Type, Amount, Debit Party Pre-Balance, Debit Party Post Balance, Credit Party Pre-Balance, Credit Party Post Balance, Transaction Status, Status Description`.
- Grain: one row = one saldo transfer (debit party = `Organization ID`, credit party = `Credit Party ID`). `Transaction ID` is unique (8,713 rows, 0 duplicates). `Account Type` is always `Saldo Mobo Account`.
- Territory columns are the MOBI hierarchy of the **debit** party (`Area` = INNER JAKARTA WEST / EAST, `Sales Area` = 12 labels incl. SOUTH JAKARTA, DEPOK, NORTH / SOUTH KARAWANG, KOTA BEKASI, `Cluster` = 41 MC labels). They do not match the 7 master areas one to one: map through the credit-party outlet, not through these columns.
- `Operator ID / Name / Type` = the person who executed the transfer (Canvasser = DSE login such as `DSEIN016`, `DSERNAK02`; MPC Owner; MPC Alokasi Adm; Outlet Owner). `MSISDN` is a personal number: **mask before publishing** (prepare_public_release already masks msisdn columns; keep the column name).
- Pre / post balances of both parties allow an end-of-day Saldo Mobo balance per party.

## 2. Volumes (22 Oct 2026)
8,713 rows: 8,599 Completed (Rp 5.50 B), 114 Failed (Rp 0.16 B; insufficient dealer stock account 55, wrong credentials 49, dormant outlet 5). Debit `Organization Type`: Outlet 6,114 · Dealer 2,551 · SDP 48. Channels: API 8,596, WEB 88, USSD 29.

## 3. Flows (Completed, ids normalised: leading zeros stripped so `00293014` = 3ID `293014`)
| Debit party | Operator type | Credit party class | Rows | Rp B | Distinct credit parties | Meaning |
|---|---|---|---|---|---|---|
| Dealer | Canvasser | PJP outlet (master) | 2,315 | 1.410 | 2,216 | **DSE fill-in to outlet** (= MOBII SALMO) |
| Dealer | Canvasser | non-PJP (adhoc) / unknown | 8 | 0.003 | 8 | same, outside master |
| SDP | Canvasser | PJP outlet | 45 | 0.031 | 45 | SDP fill-in to outlet |
| Dealer | MPC Owner / MPC Alokasi Adm | non-PJP (adhoc) | 51 | 3.789 | 40 | **distributor allocation to MPC / sub-dealer accounts** (ids like 1479329 NAZWA CELL Rp 700 Jt, 00293014 GOVANIA CELL Rp 405 Jt, SH142016 B-TRIK Rp 350 Jt): these "outlets" are MPC nodes, not retail |
| Dealer | MPC Owner / MPC Alokasi Adm | PJP outlet | 54 | 0.133 | 49 | direct allocation to master outlets |
| Outlet | (none, `MDL-USER`) | **itself** | 6,038 | 0.042 | 2,327 | self transfer, median Rp 950: a system / fee movement, not a fill-in |
| Outlet | Outlet Owner | one unknown id | 76 | 0.025 | 1 | outlet to outlet (one credit id) |
| Dealer / SDP | – | itself | 10 | 0.012 | 10 | self |

72 dealers (PT ELKOMINDO MITRA MANDIRI, PT SANNIN BROTHER MEGAH SATU / DUA / KAB BEKASI, PT Sakalaguna Semesta, PT. Buana Telekomindo, PT LOKA KARSA INFORMASI, …), 4 SDP, 531 operator logins on dealer rows.

## 4. Reconciliation with MOBII (same day)
- MOBII `MTD_SALMO` 22 Oct (outlet-bound saldo transfer): **Rp 1.444 B on 1,965 outlets**. Transfer report canvasser (DSE / SDP) → outlet: **Rp 1.495 B on 2,265 outlets**. 1,701 outlets appear in both, **1,404 with the identical amount**; 564 outlets only in the report (Rp 0.41 B) and 264 only in MOBII (Rp 0.29 B). So the report is the transaction-level source of the MOBII saldo sell-in (differences = ids MOBII attributes differently / timing of the D-1 extract); it does not replace MOBII, which stays the governed daily feed.
- The MPC allocation (Dealer → MPC accounts, Rp 3.79 B) is **not** in MOBII `MTD_SALMO` and absent from the MOBII allocation nodes too (their SALMO is Rp 0.00 B MTD, Rp 0.001 B on 22 Oct: the MOBII allocation sheet carries physical stock, not saldo): this is the missing **distributor fill-in** layer of Phase 1 item 1 (MPC / MP3 → DSE / canvasser → outlet).
- Self transfers (Rp 0.04 B) and failed rows must be excluded from any sell-in figure.

## 5. Can it be a source for "Distributor fill-in"?
Yes, with rules: (1) keep `Transaction Status = Completed`; (2) drop rows where debit = credit party; (3) classify the credit party by id against the master (PJP), the adhoc list (non-PJP) and the dealer / MPC id set (ids starting `D`, `SDP`, `1-`, `2-`, or appearing as a debit `Organization ID` of type Dealer / SDP); (4) flow = debit type × operator type × credit class: *Dealer → MPC account* = allocation, *Dealer / SDP (Canvasser) → outlet* = fill-in to outlet, *Outlet → Outlet* = redistribution; (5) territory from the credit-party outlet (master MC / Area), fall back to the report `Cluster`; (6) MSISDN never leaves the builder. Open questions for the data owner: which MPC / sub-dealer ids are the MPC nodes (the Rp 3.79 B goes to 40 ids that the adhoc list calls outlets); whether the export can cover a date range (this one is one day; a daily drop would need the same `endbal`-style accumulation with dedupe on `Transaction ID`); whether the 6,038 self transfers of Rp 950 are a fee.

## 6. Decision needed
Build `build_transfer_balance_feed.py` (new reader; `build_sellin_feed.py` keeps the old MOBI layout) only if the owner wants the distributor-allocation layer on screen (Partner › Alokasi Distributor). Until then the file is listed as not consumed in `docs/data-change-log.md`.
