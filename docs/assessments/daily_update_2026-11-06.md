# Daily update 6 Nov 2026 · Sell-In, Demand dan PJP sampai 5 Nov, GA November masuk (D3)

Scan `raw/` 6 Nov 07:33 dan refresh penuh (`daily_update.py`, satu putaran, semua langkah OK). Audit: konsistensi 275, scorecard 162, GA 3.467, SP 16, arsip periode 96 lulus. Audit KRO sempat gagal 8 cek (sudah ada sebelum refresh ini) dan **sudah diperbaiki** (§4); audit katalog DSE menandai 2 cek (§4).

## 1. Hasil scan

| Sumber | File | Cakupan |
|---|---|---|
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202611.xlsb` (6 Nov 00:31) | 1–5 Nov |
| MOBO (Demand) | `DAILY_DATA_MOBO_202611.xlsb` + `_SALMO_202611` (6 Nov 00:31) | 1–5 Nov |
| PJP | `im3/3id_visit_dse_202611__05_05.zip` (5 Nov 23:12) | **5 Nov**; 1 Nov (Minggu) n/a |
| End Balance | snapshot 5 Nov (`endbal_20261105.zip`, file 6 Nov 06:03) | 16.135 outlet |
| **GA by Outlet** | `rguga_daily_outlet_inner_202611.csv` (5 Nov 03:57) | **GA November sudah masuk**, cut D3; bulan lalu dari `rguga_daily_outlet_202610.csv` |
| **GA site / Fav Locs** | `rguga_daily_favloc_inner_202611.csv` (5 Nov 03:57) | Fav Locs November D3 (file D4, dipotong D3 agar sejajar dengan tagging) |
| Vanguard | `Vanguard_InnerJKT_Flag_Step1-5_per05Nov2026.xlsx` | status 5 Nov; file OutletMapping masih 29 Okt (peringatan di halaman) |
| Katalog Nov | `CATALOGUE_OUTLET_NOVEMBER.xlsb` | kategori program November (AVA, Promotor, WS, KAM, DSF, AVA TM, KRO), ditangani sesi KRO / Program |

Cut per kelompok: Sell-In 5, Demand 5, PJP 5, GA 3.

## 2. Angka (MTD Nov 1–5 vs LMTD Okt 1–5)

LMTD Okt 1–5 adalah periode migrasi (nilai sangat rendah); 1 Nov hari Minggu. Rata-rata Okt per hari = hari 13–31.

| Ukuran | Nov 1–5 | LMTD Okt 1–5 | Nov 5 | Rata-rata Okt/hari |
|---|---|---|---|---|
| SP semua MOBII | 5.167 pcs | 94 | 1.569 | 12.000 |
| SP Injection | 557 pcs | 501 | 101 | 2.802 |
| Voucher isi | Rp 563,6 Jt | Rp 118,2 Jt | Rp 164,9 Jt | Rp 281,4 Jt |
| Voucher blank | Rp 227,3 Jt | Rp 0,8 Jt | Rp 63,2 Jt | Rp 44,7 Jt |
| Saldo Mobo (sell-in) | Rp 2,74 B | Rp 148,6 Jt | Rp 621,0 Jt | Rp 1,01 B |
| Demand Reload | Rp 3,78 B | Rp 4,01 B | Rp 1,17 B | Rp 534,4 Jt |
| Demand Voucher Injection | Rp 935,5 Jt | Rp 2,11 B | Rp 269,0 Jt | Rp 639,0 Jt |
| Demand Paket data | Rp 9,68 B | Rp 15,46 B | Rp 2,26 B | Rp 2,28 B |
| Demand CVM | Rp 614,0 Jt | Rp 653,4 Jt | Rp 99,7 Jt | Rp 106,0 Jt |
| Demand Saldo Mobo (SAL) | Rp 19,18 B | Rp 26,99 B | Rp 4,68 B | Rp 4,89 B |
| PJP planned / actual | 34.144 / 31.292 | 11.208 / 4.192 | 8.652 / 8.049 | 7.634 / 6.711 |
| PJP produktif / ad-hoc | 16.033 / 3.306 | 316 / 175 | 4.327 / 902 | 3.415 / 844 |
| GA (tagging, D1–D3) | 15.330 pcs (5.412 / 5.346 / 4.572) | Okt D1–D3 lihat di Daily GA Trend | D3 4.572 | |

Catatan baca:
- Hari ke-5: Reload (Rp 1,17 B, dua kali rata-rata Oktober), Paket data dan Saldo Mobo demand mendekati rata-rata Oktober; PJP actual 8.049 di atas rata-rata (6.711), produktif 4.327.
- Saldo Mobo sell-in turun bertahap (795 → 673 → 652 → 621 Jt per hari) dan masih di bawah rata-rata Oktober; SP naik bertahap (952 → 1.569 pcs per hari) tetapi jauh di bawah rata-rata Oktober (pola awal bulan).
- **Voucher Injection** naik pelan (167 → 223 → 269 Jt per hari) tetapi masih sekitar 42% rata-rata Oktober.
- CVM: 52.034 baris identik RECARGE dibuang (aturan 17 Okt) seperti hari-hari sebelumnya.

## 3. GA: basis baru

GA November dibaca dari file MSISDN (`build_ga_feed_month.py`, CLAUDE.md "GA month roll"). Bulan sebelumnya ikut dibangun dari file MSISDN Oktober (FM Oktober 287.269 GA), sekitar 11% di bawah penutupan Oktober beku di tampilan FM Okt (323.890 dari workbook Daily_RGUGA), karena workbook memuat lebih banyak GA di outlet non-master. MTD Nov vs LMTD Okt sebanding (sama basis), tetapi dua tampilan tidak menunjukkan Oktober yang sama. Banner "Data GA masih Oktober" otomatis hilang karena GA sudah November.

## 4. Perlu keputusan / perhatian

1. **Audit KRO: sempat gagal 8 cek, sudah diperbaiki** (commit `341d6d0`, hanya `scripts/build_kro_feed.py`). Gagal juga pada commit sebelumnya (checkout bersih `b2f3ebf`), jadi bukan dari data 6 Nov. Selisihnya sangat kecil dan feed selalu lebih rendah (SP Last FM 173.868 vs 173.888 pcs; Saldo sell-out Last FM Rp 155,371 B vs Rp 155,382 B). Penyebab: baris master dengan kunci lama (`0_317011`, `NA_sh013732`, `NA_307805`, `0_144884`, ...) membawa id 3ID yang sama dengan outlet yang oleh GA dikunci dengan `outlet_key` yang benar; builder hanya menjumlah `sup[k]` / `dem[k]`, sehingga baris itu dianggap sudah terpakai tetapi tidak pernah dijumlahkan. Sekarang setiap outlet juga menjumlah semua baris yang membawa salah satu idnya (tanpa duplikat). Feed KRO dibangun ulang dari feed 6 Nov: "KRO feed reconciles"; render check dan semua audit lulus.
2. **Tiga DSE tercatat di MC lain di feed visit** (Edi Warsono, Ihsan Riyadlul Jinan, Sukron Mamun; lihat asesmen 5 Nov): menyebabkan dua cek audit katalog DSE; opsi tampilan sudah diajukan, belum diputuskan.
3. Voucher Injection rendah dibanding Oktober.
4. Vanguard: outlet-level Step 2–4 masih dari OutletMapping 29 Okt.
5. Fav Locs dan GA dipotong D3; sinkron lagi saat file D4 / D5 datang.
6. Data owner: id `D…` di SALMO, daftar BOSS / Tebus Murah.

## 5. Perubahan kode

Tidak ada perubahan kode pada refresh ini; hanya feed dan arsip periode (grup `ga` November masuk arsip, cut 3).
