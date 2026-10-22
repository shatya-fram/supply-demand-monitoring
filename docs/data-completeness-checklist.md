# Data completeness checklist · MTD, LMTD, last full month

Status as of **23 Oct 2026 06:00 WIB** (feeds built from the files in `raw/`). ✅ complete · ⚠️ available with a caveat · ❌ not available in any file under `raw/`.
MTD = 1–22 Oct (GA: 1–20 Oct). LMTD = September day 1 to the same cut day. FM = September 1–30.

## 1. Visit PJP (`raw/MOBI VISIT DSE/*_visit_dse_*`)
| Window | Status | Detail |
|---|---|---|
| MTD Oct 1–16 | ✅ | 16 of 16 days in the feed, no missing day (12, 14 and 16 Oct arrived as separate exports; the `14_14` file first received held 15 Oct). 4 Oct has no PJP stop; 11 Oct has 31 (Sundays). |
| LMTD Sep | ❌ | No September journey-plan export, so visit growth vs last month cannot be shown. |
| FM Sep | ❌ | same |
| Caveats | ⚠️ | 1–6 Oct are low (planned 1,107 → 4,183; normal level from 7 Oct: 6.5–8.7 K): October system migration. Promotors and ad-hoc visits at outlets without a DSE are excluded from PJP measures. |

## 2. MOBII Sell-In (`Data as of 15 Oct /DAILY_DATA_MOBII_202610.xlsb`: MTD_ and LMTD_ sheets)
| Commodity | MTD Oct 1–16 | LMTD Sep 1–16 | FM Sep 1–30 |
|---|---|---|---|
| Starter Pack (SP) | ✅ 16 / 16 days | ✅ | ✅ 29 / 30 days (6 Sep, a Sunday, is zero) |
| Voucher isi | ✅ 16 / 16 | ✅ | ✅ 30 / 30 (voucher sheet, split by product name) |
| Voucher blank | ✅ 16 / 16 | ✅ | ✅ 30 / 30 (valued at IM3 Rp 500 / 3ID Rp 300 per unit) |
| Saldo Mobo | ✅ 14 / 16 days (4 and 11 Oct, Sundays, are zero) | ✅ | ✅ 30 / 30 (Sundays about Rp 1 Jt) |
| SP Injection (MOBO) inside Sell-In | ⚠️ MTD only | ❌ | ❌ |

Caveats: 1–9 Oct are genuinely low (migration), so MTD vs LMTD is structurally negative. The September full month moves with every new file (Rp 44.13 B → 44.25 B between 16 and 17 Oct); source of the restatement unknown.

## 3. MOBO demand, outlet → customer (`DAILY_DATA_MOBO_202610.xlsb`, `DAILY_DATA_MOBO_SALMO_202610.xlsb`)
| Commodity | MTD Oct 1–16 | LMTD Sep | FM Sep |
|---|---|---|---|
| Reload (RLD) | ✅ 16 / 16 days | ❌ | ❌ |
| Voucher Injection (VCI) | ✅ 16 / 16 | ❌ | ❌ |
| CVM | ⚠️ 16 / 16 days, Rp 1.86 B, 4,113 outlets (the sheet carried 61,391 rows copied from RECARGE; exact copies are removed) | ❌ | ❌ |
| Paket Data (PKT, sheet RECARGE) | ✅ 16 / 16 | ❌ | ❌ |
| SP Injection (SPI) | ✅ 16 / 16 (units; Rp from 14 Oct file) | ❌ | ❌ |
| Saldo Mobo demand (SAL) | ⚠️ 16 / 16 days, Rp 72.06 B, outside total demand until its overlap with the other categories is confirmed | ❌ | ❌ |

September MOBO (`DAILY_DATA_MOBO_202609.xlsb`, full close, received 18 Oct) now supplies LMTD and Last FM for Reload, Voucher Injection, CVM, Paket Data and SP Injection. Only Saldo Mobo (SALMO) still has no September file.
Other caveats: Reload (about Rp 247 Jt) and SP Injection are low on 15 and 16 Oct against 12–14 Oct; 55 SALMO ids (Rp 6.89 B) and a few other ids cannot be attributed to any outlet.

## 4. Gross Add (`raw/GA/` only; MOBO and GA BIOMETRIC are not used)
| Basis | MTD Oct 1–15 | LMTD Sep 1–15 | FM Sep 1–30 |
|---|---|---|---|
| Outlet GA and SSO (`Daily_RGUGA_OUTLET_202609/202610.xlsb`) | ✅ 15 / 15 days (16 Oct not yet in the workbook: GA is one day behind the other feeds) | ✅ | ✅ 30 / 30 days |
| Site GA: outlet GA rolled up per NBS site → MC → Area (same RGUGA data) | ✅ | ✅ | ✅ |
| Site GA: real activation location (`M2S KECAMATAN - 202609.xlsb`, per kecamatan) | ❌ October | ⚠️ not usable (does not reconcile) | ⚠️ September to about 26 Sep only |

Caveats: 3ID outlets that the outlet sheets omit are carried through `data/catalogues/ga_ij_outlet_registry.csv` (without them 3ID would read about 5 points lower); about one third of October GA sits on outlets outside the master list (no DSE); October days 1–13 were revised by a few pcs between files.

## 5. Checklist kelengkapan (MTD, LMTD, FM) · update 23 Oct 2026

Cut data: MOBII, MOBO, SALMO, PJP visit, ENDBAL snapshot = 22 Okt · GA = 20 Okt (dua hari di belakang). LMTD = 1–22 Sep, FM = 1–30 Sep. ✅ lengkap · ⚠️ ada catatan · ❌ tidak ada di `raw/`

| Komponen | MTD Okt | LMTD Sep | FM Sep |
|---|---|---|---|
| **Visit PJP** | ✅ 1–22 Okt, tanpa hari kosong | ❌ | ❌ |
| **PJP Weekly** (beat plan permanen) | ✅ `SMARTBEAT_WEEKLY_PJP.xlsx` (21 Okt) | n/a | n/a |
| **MOBII**: SP | ✅ 1–22 Okt (18 Okt Minggu, nol) | ✅ | ✅ 29/30 (6 Sep Minggu, nol) |
| MOBII: Voucher isi | ✅ 22/22 | ✅ | ✅ 30/30 |
| MOBII: Voucher blank | ✅ (3–4 Okt nol karena migrasi; 11 dan 18 Okt Minggu nol) | ✅ | ✅ 30/30 |
| MOBII: Saldo Mobo (transfer) | ✅ (4 dan 11 Okt Minggu nol) · Rp 12.03 B | ✅ | ✅ 30/30 |
| **MOBO**: Reload | ✅ 22/22 (Rp 12.28 B) | ✅ | ✅ 30/30, Rp 12.37 B |
| MOBO: Voucher Injection | ✅ 22/22 (Rp 12.20 B) | ✅ | ✅ 30/30, Rp 22.12 B |
| MOBO: CVM | ⚠️ 22/22, Rp 2.50 B; sheet CVM memuat salinan RECARGE (57,632 baris, Rp 36.0 B) yang dibuang | ✅ | ✅ 30/30, Rp 6.22 B |
| MOBO: Paket Data | ✅ 22/22 (Rp 56.40 B) | ✅ | ✅ 30/30, Rp 65.75 B |
| MOBO: SP Injection | ✅ 22/22 (Rp 0.70 B) | ✅ | ✅ 30/30, Rp 1.88 B (di luar total demand) |
| MOBO: SALMO (demand saldo) | ✅ 22/22, Rp 106.25 B, di luar total demand; id di luar master ikut sebagai non-PJP | ✅ Rp 94.37 B | ✅ 30/30, Rp 143.39 B |
| **GA outlet dan SSO** | ⚠️ 1–20 Okt (file RGUGA belum diperbarui sejak 21 Okt) | ✅ | ✅ 30/30 |
| **GA site** (lokasi aktivasi, `Site_rguga`) | ✅ CSV 22 Okt dipakai (Gross Add › Site location GA) | ✅ | ✅ |
| **Target GA** (M2S KECAMATAN) | ✅ target Oktober | n/a | n/a |
| ENDBAL (stok dan saldo outlet) | ✅ snapshot 22 Okt | n/a | n/a |
| Transfer Balance Report (`inner_tf_balance_*.csv`) | ⚠️ ada (22 Okt, Rp 5.50 B completed) tetapi **belum dibaca builder** (format baru) | ❌ | ❌ |

Yang masih perlu: file RGUGA outlet 21–22 Okt, export PJP September, M2S Oktober, dan keputusan apakah Transfer Balance Report (Dealer / SDP → outlet) dibangun sebagai sumber fill-in distributor. Tidak dipakai builder mana pun: GA by Fav Locs (kecamatan), `IOH SELL IN … 21 OCT` (nasional), `trx_details_20261022`, rencana rute `SMARTBEAT_DAILY_PJP`.
