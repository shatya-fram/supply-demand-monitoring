# Daily update 7 Nov 2026 · Sell-In, Demand, PJP dan GA sampai 6 Nov

Scan `raw/` 7 Nov 10:31 dan refresh penuh (`daily_update.py`, satu putaran, semua langkah OK). Audit lulus: konsistensi 275, scorecard 162, GA 3.467, KRO, arsip periode 96. **Audit SP gagal 1 cek** (§4, bukan kerusakan data) dan audit katalog DSE menandai 2 cek (DSE di MC lain, lihat asesmen 5 Nov).

## 1. Hasil scan

| Sumber | File | Cakupan |
|---|---|---|
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202611.xlsb` (7 Nov 03:26) | 1–6 Nov |
| MOBO (Demand) | `DAILY_DATA_MOBO_202611.xlsb` + `_SALMO_202611` (7 Nov 03:26) | 1–6 Nov |
| PJP | `im3/3id_visit_dse_202611__06_06.zip` | **6 Nov**; 1 Nov (Minggu) n/a |
| End Balance | snapshot 5 Nov (file 6 Nov 06:03, 16.151 outlet) | **belum ada snapshot baru**: tidak ada file ENDBAL bertanggal 7 Nov |
| GA by Outlet | `rguga_daily_outlet_inner_202611.csv` (7 Nov 03:29, 36.242 baris) | **D1–D6** (sebelumnya D5) |
| GA site / Fav Locs | `rguga_daily_favloc_inner_202611.csv` (7 Nov 03:29, 36.013 baris) | D1–D6 |
| Vanguard | tidak ada file baru | status 5 Nov; Step 2–4 dari OutletMapping 29 Okt (disetujui pemilik) |

Cut sejajar di semua kelompok: Sell-In 6, Demand 6, PJP 6, **GA 6** (tagging dan Fav Locs).

Catatan unggahan: zip PJP 6 Nov ada di dua folder (`MOBI VISIT DSE` dan `ENDBAL`); runner melipat salinan yang sama, tetapi dua CSV `Journey_Plan_Summary_Detail_Report_*.csv` ikut terekstrak ke folder ENDBAL (tidak dipakai builder ENDBAL; sebaiknya unggah ke satu folder).

## 2. Angka (MTD Nov 1–6 vs LMTD Okt 1–6)

LMTD Okt 1–6 adalah periode migrasi (nilai sangat rendah); 1 Nov hari Minggu. Rata-rata Okt per hari = hari 13–31.

| Ukuran | Nov 1–6 | LMTD Okt 1–6 | Nov 6 | Rata-rata Okt/hari |
|---|---|---|---|---|
| SP semua MOBII | 7.680 pcs | 125 | 2.513 | 12.000 |
| SP Injection | 657 pcs | 635 | 100 | 2.802 |
| Voucher isi | Rp 766,1 Jt | Rp 136,3 Jt | Rp 202,5 Jt | Rp 281,4 Jt |
| Voucher blank | Rp 285,9 Jt | Rp 2,0 Jt | Rp 58,6 Jt | Rp 44,7 Jt |
| Saldo Mobo (sell-in) | Rp 3,36 B | Rp 287,5 Jt | Rp 616,6 Jt | Rp 1,01 B |
| Demand Reload | Rp 5,22 B | Rp 5,12 B | Rp 1,44 B | Rp 534,4 Jt |
| Demand Voucher Injection | Rp 1,31 B | Rp 2,49 B | Rp 378,3 Jt | Rp 639,0 Jt |
| Demand Paket data | Rp 12,19 B | Rp 18,42 B | Rp 2,50 B | Rp 2,28 B |
| Demand CVM | Rp 721,0 Jt | Rp 764,3 Jt | Rp 106,9 Jt | Rp 106,0 Jt |
| Demand Saldo Mobo (SAL) | Rp 25,67 B | Rp 32,80 B | Rp 6,49 B | Rp 4,89 B |
| PJP planned / actual | 42.330 / 39.087 | 15.310 / 6.674 | 8.186 / 7.795 | 7.634 / 6.711 |
| PJP produktif / ad-hoc | 20.351 / 4.202 | 716 / 382 | 4.318 / 896 | 3.415 / 844 |
| GA tagging D1–D6 | 36.242 pcs | n/a (basis berbeda) | 10.799 | |

Catatan baca:
- Hari ke-6 (Jumat): Reload Rp 1,44 B (hampir tiga kali rata-rata Oktober), Paket data Rp 2,50 B dan Saldo Mobo demand Rp 6,49 B di atas rata-rata Oktober; Voucher Injection naik Rp 378 Jt (sekitar 59% rata-rata Oktober).
- Sell-In: SP 2.513 pcs (tertinggi bulan ini), Voucher isi Rp 202,5 Jt; Saldo Mobo sell-in stabil di Rp 617–652 Jt per hari, masih di bawah rata-rata Oktober.
- PJP actual 7.795 (planned 8.186, 95,2%), di atas rata-rata Oktober.

## 3. GA D6: lonjakan harian

GA tagging 6 Nov = **10.799** (D1–D5: 4.572–5.412 per hari, D6 dua kali lipat), dengan 2.227 outlet pemasok yang sama seperti hari lain. Dipicu segelintir outlet: **17452102 (1.998 GA)**, **SH155202 (1.584)**, **153825 (963)** = 4.545 GA, 42% dari hari itu (D5: 153825 596 dan SH155202 159). Fav Locs D6 hanya 7.104 (+23% dari D5), jadi selisih tagging-Fav Locs melebar. Perlu konfirmasi data owner (Victor) apakah itu penjualan sah (program, acara) atau pencatatan ganda; angkanya masuk GA MTD (36.242) dan SSO apa adanya.

## 4. Perlu keputusan / perhatian

1. **Audit SP gagal 1 cek** ("de-dup stays small < 15% of MTD SP Injection": 3.999 dari 4.656 pcs, 86%). Penyebab satu kejadian sah menurut aturan 27 Okt: id 3ID **SH254705** (distributor / partner, tier UNKNOWN, Oktober 52.332 pcs) menerima **3.999 pcs SP HAPPY S PLUS V2 (Rp 52,0 Jt) pada 6 Nov** di MOBII dan jumlah yang sama tercatat di MOBO SP Injection; aturan menyimpan MOBII dan membuang injeksi, jadi tidak ada penggandaan. Ambang 15% terlalu ketat untuk satu node besar; usul: longgarkan audit atau kecualikan node distributor. Belum diubah.
2. GA D6 lonjakan (lihat §3) untuk dikonfirmasi ke Victor.
3. End Balance belum ada snapshot 7 Nov.
4. Tiga DSE tercatat di MC lain di feed visit (Edi Warsono, Ihsan Riyadlul Jinan, Sukron Mamun): keputusan tampilan menunggu pemilik.
5. Voucher Injection masih di bawah rata-rata Oktober tetapi naik (Rp 167 → 378 Jt per hari).
6. Data owner: id `D…` di SALMO, daftar BOSS / Tebus Murah.

## 5. Perubahan kode

Tidak ada perubahan kode pada refresh ini; hanya feed dan arsip periode (grup GA November cut 6).
