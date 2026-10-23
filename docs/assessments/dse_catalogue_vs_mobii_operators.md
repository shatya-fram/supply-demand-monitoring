# Assessment · DSE of the catalogue vs the operators in MOBII transactions, and promotor status (23 Oct 2026)

Read-only (CLAUDE.md §2); nothing rebuilt. "Catalogue" = sheet DSE of `CATALAGUE_INNER_JAKARTA_202610.xlsb` (`catalogue_202610/dse_logins.csv`, 272 rows / 271 names / 544 logins). "Master file" = `dse_master_hierarchy.csv` (272 rows / 271 names / 540 logins). Logins compared after removing spaces and upper-casing. **MOBII transactions that carry an operator login** exist in two reports only: the **Transfer Balance Report of 22 Oct** (`inner_tf_balance_202610____22_22.csv`, operator id and type) and the **Physical Distribution + Balance Transfer reports of 1–11 Oct** (operator id, no type). The daily workbook `DAILY_DATA_MOBII` has no operator, and there is no SP / voucher operator file after 11 Oct.

## 1. Catalogue vs master file (the two DSE lists)

* The **271 DSE names are identical** in both files (0 only in one).
* The **login sets differ**: 504 logins in both, **44 only in the catalogue** (e.g. DSEIN101 Nur Ainun, DSEIN102 Edi Warsono, DSEIN103 Nurhariki; 2613051007 / 2613051013 / 2613051030) and **40 only in the master file** (e.g. CSO-LOKADPK19 Junita Riana, CSO-SELATAN-01/03/04, 1-186306401553 Sulendra). Same people, different login codes: the catalogue carries the new DSEIN logins.
* Of the 44 catalogue-only logins, **40 already transact** in MOBII; of the 40 master-only logins only **15** do. So the catalogue is the better login list for transactions; the master file still has about 25 logins that no longer transact.

## 2. Transfer Balance 22 Oct (Completed, self-transfers dropped): 532 operator logins

| Operator type | Mapped in both files | Only catalogue | Not in either |
|---|---:|---:|---:|
| **Canvasser** (DSE fill-in) | **455 logins** · 2,169 rows · Rp 1,381 Jt | **36** · 199 rows · Rp 65 Jt | **0** |
| MPC Owner | – | – | 31 logins · 66 rows · Rp 1,755 Jt |
| MPC Alokasi Adm | – | – | 8 logins · 40 rows · Rp 2,169 Jt |
| Outlet Owner | – | – | 1 login · 76 rows · Rp 25 Jt |
| CANVASSER TEST | – | – | 1 login (`OWN320240403`, one transfer of Rp 50 Jt, Completed) |

* **Every Canvasser login (491) is in the catalogue** (455 also in the master file, 36 only in the catalogue): 100% mapped. Their value is Rp 1,445 Jt.
* The non-Canvasser operators are distributor and MPC accounts (allocation Rp 3.9 B), not DSE; they are correctly outside both DSE files.
* Operator type has **no Promotor** in this report; 491 canvassers = 489 Canvasser + 2 Canvasser SDP in the visit report.
* One test login moved Rp 50 Jt on 22 Oct: to be checked with the data owner.

## 3. Physical Distribution + Balance Transfer 1–11 Oct (outlet-bound, destination INNER JAKARTA): 554 logins

| Class | Logins | Rows | Rp |
|---|---:|---:|---:|
| In catalogue and master file | **484** | 10,113 | 1,337,321 Jt (includes distributor allocation flows) |
| Only catalogue | **32** | 279 | 51 Jt |
| Only master file | **15** | 435 | 58 Jt |
| **In neither** | **23** | 170 | **0.8 Jt** |

* 95.8% of the logins (531 of 554) and 99.99% of the value are in a DSE file. The 23 unmapped are distributor / MPC owner accounts (OWND…, OPMG…, 1-1633…, 2-0012…, INDOSATADMIN) with Rp 0.0 on the outlet-bound lines, plus two that look like DSE logins to confirm: `CSO-LOKADPK10` (1 row, Rp 0.5 Jt, TRIMINDO JAYA MANDIRI) and `2613051973` (2 rows, Rp 0.3 Jt, PT DISTRIBUSI VOUCHER NUSANTARA).
* Over the whole file (all regions) 670 more logins are "in neither": Outer Jakarta / Bandung DSEs (DSEWJ, DSEOT, CVSCJU, CSO-BANDUNG) and distributor accounts; they are not Inner Jakarta.

## 4. DSE people

* 271 DSE (catalogue): **271 have at least one MOBII transaction login**, 0 without; **264** transferred saldo on 22 Oct.
* The 12 temporary logins (`DSEIN100/107/115/116/120/122`, IM3 + 3ID): only DSEIN107 transacts (it stays a separate login, owner decision 21 Oct).

## 5. Promotor status

* **No file marks a promotor**: neither the catalogue DSE sheet nor the master file has a role / type column (only `role` in the master file, empty).
* Promotors exist only in the **MOBI visit report** (operator type `Promotor`, 99 logins in 20–22 Oct: `PRJAYAIN##` 63 IM3 + `PRJAYAIN##ID` 36 3ID) and in the 123 promotor persons of the visits feed (flag 🎤 Promotor, excluded from PJP measures).
* **None of the 99 promotor logins is in the catalogue or the master file, and none appears in the MOBII transactions** (0 in the Transfer Balance 22 Oct, 0 in the physical / balance reports): promotors do not sell in to outlets through MOBII; their outlet programme visits are the only trace.
* Catalogue outlet types include `PROMOTOR` for outlets (program flag), which is an outlet attribute, not a login status.

## 6. Reading

1. The DSE file to use for transactions is the **catalogue**: it maps all 491 canvasser logins of 22 Oct (the master file would miss 36) and 516 of 554 inner-Jakarta logins of 1–11 Oct.
2. Remaining unmapped operators are distributors / MPC accounts and need no DSE mapping. Two logins to confirm: `CSO-LOKADPK10`, `2613051973`.
3. Promotor status has to come from the visit report operator type (pattern `PRJAYAIN`); ask the data owner to add a role column (DSE / Promotor / SDP) to the catalogue DSE sheet.
4. Check `OWN320240403` (CANVASSER TEST, Rp 50 Jt completed).
