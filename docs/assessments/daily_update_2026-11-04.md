# Daily update 4 Nov 2026 · Sell-In, Demand dan PJP sampai 3 Nov

Scan `raw/` 4 Nov 07:17; refresh ulang setelah PJP 3 Nov dan MOBII lengkap masuk, lalu sekali lagi setelah MOBO November masuk. Hasil akhir: **Sell-In, Demand dan PJP semuanya cut 3 Nov**; semua langkah OK; audit konsistensi (275), scorecard (162), GA (3.629), KRO, SP (16), arsip periode (95) dan entity lulus. Audit katalog DSE masih menandai tiga cek (§4).

## 1. Hasil scan

| Sumber | File | Cakupan |
|---|---|---|
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202611.xlsb` (4 Nov 06:49; ada salinan "(1)" berukuran sama) | 1–3 Nov, sheet `MTD_*`; LMTD / FM Oktober dari workbook Oktober |
| PJP | `im3/3id_visit_dse_202611__03_03.zip` (4 Nov 00:21, juga di `OneDrive_2_11-4-2026/`) | **3 Nov**; 1 Nov (Minggu) n/a |
| End Balance | snapshot 3 Nov (`endbal_20261103.zip`, file 4 Nov 06:09) | 16.110 outlet |
| MOBO Demand | `DAILY_DATA_MOBO_202611.xlsb` (4 Nov 00:47, 1,5 MB) + `DAILY_DATA_MOBO_SALMO_202611.xlsb` (00:47) | 1–3 Nov; sempat tidak ada di `raw/` pada scan pertama (belum tersinkron dari OneDrive) |
| GA by Outlet, GA site, Fav Locs, Vanguard | tidak ada file baru | GA tetap 31 Okt, Fav Locs 26 Okt, Vanguard 29 Okt |

## 2. Pengaman runner

Pada scan pertama MOBO November belum ada di `raw/`; tanpa pengaman runner membaca MOBO Oktober sebagai "bulan berjalan" dan akan menimpa feed Demand November dengan data Oktober. `daily_update.py` sekarang melewati langkah Demand bila MOBII lebih baru dari MOBO terbaru (feed Demand tetap seperti terakhir, langkah lain jalan). Setelah MOBO November tersinkron pengaman tidak aktif dan Demand ikut sampai 3 Nov.

## 3. Angka (MTD Nov 1–3 vs LMTD Okt 1–3)

LMTD Okt 1–3 adalah periode migrasi (nilai sangat rendah); 1 Nov hari Minggu.

| Ukuran | Nov 1–3 | LMTD Okt 1–3 |
|---|---|---|
| SP semua MOBII | 2.235 pcs (3 Nov 952) | 65 |
| SP Injection | 312 pcs | 358 |
| Voucher isi | Rp 237,6 Jt | Rp 102,9 Jt |
| Voucher blank | Rp 111,4 Jt | Rp 0,3 Jt |
| Saldo Mobo sell-in | Rp 1,47 B | Rp 23,5 Jt |
| PJP planned / actual / produktif / ad-hoc | 17.083 / 15.521 / 7.660 / 1.656 | 7.289 / 2.153 / 100 / 46 |

Demand (Rp Jt, 1–3 Nov vs LMTD Okt 1–3): Reload 1.614,7 vs 1.368,3; Voucher Injection 443,2 vs 1.269,1; Paket data 5.246,4 vs 9.562,7; CVM 357,2 vs 439,8; Saldo Mobo (SAL) 10.622,2 vs 16.745,4. Hari ke-3: Reload 271,4, VCI 167,4, PKT 2.276,3, SAL 4.536,9. Voucher Injection dan Paket data tetap jauh di bawah LMTD Okt (yang mencakup periode migrasi) dan di bawah rata-rata Oktober; perlu dipantau.

PJP 3 Nov: planned 8.112, actual 7.421 (91,5%), produktif 3.859, ad-hoc 866. Sell-In hari ke-3: SP 952 pcs, voucher isi Rp 134,5 Jt, saldo Rp 672,8 Jt.

## 4. Perlu keputusan / perhatian

1. Audit katalog DSE: 272 DSE master vs 270 punya visit di dua-tiga hari pertama November (dua DSE belum muncul): aturan audit mengharapkan semuanya; perlu dilonggarkan.
2. GA belum month-aware: file Daily_RGUGA November belum ada; Fav Locs masih 26 Okt.
3. Target November memakai distribusi Oktober (carry-forward) sesuai keputusan pemilik 4 Nov.
4. Data owner: id `D…` di SALMO, daftar BOSS / Tebus Murah.

## 5. Perubahan kode

`daily_update.py` (langkah Demand dilewati bila MOBO bulan berjalan belum ada; tidak aktif pada refresh akhir), `build_penjualan_feed.py` (baris pasangan IM3–3ID yang hanya punya SP Injection membawa `id2`; audit entity lulus), `audit_period_history.py` (simulasi pergantian bulan mengikuti bulan feed, tidak lagi terpatok bulan tertentu).
