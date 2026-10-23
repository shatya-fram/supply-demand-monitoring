# DSE catalogue from the master file and PROMOTOR TOKO (23 Oct 2026)

Owner decision: the **272 DSE of the MASTER file** are the DSE catalogue; all are **DSE, AKTIF**, with the login ids in the master file's format; every operator outside the master is **PROMOTOR TOKO**. Reports show the **name with the login ids below it**.

## What was built
* `scripts/build_dse_catalogue.py` (runs in `daily_update.py` after the visits feed): `data/catalogues/dse_catalogue.csv` (272 rows: name, role DSE, status AKTIF, login IM3, login 3ID, branch, MC, DSO, HoA, outlets, person id; no phone, e-mail or NIK), `data/catalogues/promotor_toko.csv` (212 operators), `website/data/dse_catalogue_feed.js` (`window.DSE_CAT`).
* Visits feed: every operator row has `role` (DSE / PROMOTOR TOKO) and `dse_status` (AKTIF for the master DSE).
* Result: 272 DSE (all matched to a visits-feed person id; 14,937 outlets by name and MC), **PROMOTOR TOKO 212 = 123 promotor logins (PRJAYAIN##) + 89 logins not in the master** (e.g. DSEIN100/107 temporary logins, CSO-UTARA-01, 1-1355… ids); 272 + 212 = the 484 operators of the visits feed.
* App: `dseLoginEnhance` adds `IM3 <login> · 3ID <login>` under a DSE name in every rendered table and popup; the DSE table of DSE Visits writes the master logins itself (other operators keep the logins seen in MOBI); the header DSE select shows `Name · IM3 / 3ID login` (old codes stay searchable); the Territory outlet table shows the master logins under the DSE; promotor and non-master operators get the badge PROMOTOR TOKO.
* Checks: `python3 scripts/audit_dse_catalogue.py` (272 rows equal the master file name, MC and both logins; roles in the visits feed; 272 + 212 = 484) and `render_check.js` (DSE table carries logins and the badge).

## Notes and open points
1. **The master-file logins differ from the catalogue's** for 44 logins (the catalogue has the new DSEIN codes) and 40 are only in the master file (`dse_catalogue_vs_mobii_operators.md`). The screen now shows the master logins as decided; in MOBI transactions and visits the observed login can still be the catalogue code. Both stay searchable in the header select.
2. A name shared by two people (**SUSANTO**) cannot be looked up by name: no login line is added to a cell that shows only that name (the DSE Visits table, keyed by person id, shows it correctly).
3. **Flag PROMOTOR TOKO · TRANSAKSI** (owner, 23 Oct 2026: keep the measures, flag the transacting ones): of the 212, **3 logins really transacted** (CSO-LOKADPK01, CSOBUANAJKB0171, DSEIN107: 168 productive visits, SP 109, VC 633, saldo Rp 20.7 Jt); none of the 123 PRJAYAIN promotors did. They carry the badge `🎤 PROMOTOR TOKO · TRANSAKSI` with the amounts in the tooltip, and `promotor_toko.csv` has the column `flag` plus the amounts.
4. **Measures are unchanged**: promotor logins stay outside the PJP measures; the 89 non-master logins stay in the planned / executed totals and are reported as "login belum terpetakan". If PROMOTOR TOKO as a whole should also be left out of the PJP and KPI measures, tell me and the visits feed switches (the numbers will move).
5. The 12 temporary logins (DSEIN100/107/115/116/120/122) are now PROMOTOR TOKO by this rule; the earlier decision (separate login, probable owner for the target row) still applies to the KPI feed.
