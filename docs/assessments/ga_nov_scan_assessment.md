# Scan GA terbaru (5 Nov 2026) · outlet, site, DSE, program · MTD Nov vs LMTD Okt vs FM Okt

Skrip: `scripts/assess_ga_nov.py` (stdlib; hasil CSV lokal di `exports/ga_nov/`, tidak di-commit). Belum ada perubahan app atau feed.

## 1. File yang dipindai (`raw/GA*/`)

| File | Isi | Hari |
|---|---|---|
| `rguga_daily_outlet_inner_202611.csv` | GA per MSISDN, outlet penjual = `ga_pairing_id` (semua VALID_ID, branch penjual di Inner Jakarta) | 1-3 Nov, 15.330 GA |
| `rguga_daily_favloc_inner_202611.csv` | GA per MSISDN menurut lokasi favorit (`ga_site_id`, site di IJ); penjual bisa di luar IJ atau tidak ditemukan | 1-4 Nov, 22.727 GA |
| `rguga_favloc_&_rguga_outlet_Inner_Jakarta_202611.xlsb` | kedua tabel di atas + sheet tim: OUTLET_WISE (flag PROMOTOR / WS / KRO per outlet), NOV vs OCT per kategori, mapping grup | rumus tanpa nilai tersimpan |
| `rguga_daily_outlet_202610.csv`, `Daily_RGUGA_favloc_202610.xlsb` | baseline Oktober | Okt penuh (outlet); fav loc hanya pivot per branch sampai hari 26 |

## 2. Temuan basis (penting)

- **Baseline Oktober harus dari CSV MSISDN, bukan `ga_feed.json`.** Seri Oktober tim sendiri (sheet MAPPING_GROUP_OCT, ALL) cocok dalam 1% dengan CSV Oktober untuk 36 MC IJ (hari 1: 6.275 vs 6.313), sedangkan `ga_feed.json` (xlsb Daily_RGUGA) lebih tinggi sekitar 9% (323.890 vs 287.269 GA; hari 1: 6.824). Membandingkan November dengan `ga_feed` akan melebih-lebihkan penurunan.
- Hari terakhir November (3 Nov) hanya 4.572 GA vs 5.4 rb di dua hari sebelumnya: kemungkinan belum lengkap; baca sebagai batas bawah.
- Nov 1-3 = Min-Sel; Okt 1-3 = Kam-Sab. LMTD sejajar hari kerja = Okt 4-6.
- Fav Locs: Oktober per site tidak tersedia (hanya pivot per branch sampai hari 26), jadi perbandingan site fav loc vs Oktober tidak bisa dibuat; yang bisa: per branch dan November per site.

## 3. Hasil outlet GA (mapping ke master, satu outlet fisik = satu entitas)

| Ukuran | Nilai |
|---|---|
| GA MTD Nov (1-3) | 15.330 |
| LMTD Okt (1-3) | 17.435 → **-12,1%** (sejajar hari kerja 17.535 → -12,6%) |
| FM Okt | 287.269 → MTD = 5,3% FM (pro-rata 3/31 = 9,7%) |
| Run-rate | 5.110/hari vs 9.267/hari Oktober · proyeksi Nov 153.300 (hanya bila laju 3 hari bertahan) |
| Outlet dengan GA | 5.137 (Nov) vs 5.391 (LMTD Okt); 2.925 outlet aktif di LMTD Okt belum ada GA, 2.671 baru aktif |
| Outlet di luar master | 551 id, 3.202 GA (21%), tanpa site |

Per branch (LMTD → MTD): South Jakarta Depok -9,6% · Bekasi -25,8% · East Jakarta -6,6% · Central North Jakarta -26,7% · **Kab Bekasi +19,7%** · Karawang -14,2% · West Jakarta -22,4%.
Per status: PJP 12.564 → 11.340 (-9,7%) · non-PJP 4.871 → 3.990 (-18,1%).
Per MC (>= 800 GA Okt): turun terdalam Tanjung Priok -55,6%, Pademangan -41,7%, Tambun -41,2%, Bekasi Tengah -38,8%; naik Babelan +225% (878 vs 270), Cibarusah +51%, Cikarang Timur +47%, Kebayoran +30%.
Per DSE (225 DSE, FM Okt >= 300): 125 di bawah LMTD; terburuk Agus Kurnia Budyono 192 → 33, Irama Harefa 71 → 18, Yosep Martin 70 → 18; terbaik Dimas Prayogo 20 → 95, Repi Anjani 25 → 114.

Per slab (GA FM Okt): Wholesaler > 100: 320 outlet, 5.497 → 4.884 (-11,2%) · KRO 31-100: 701 outlet, 3.267 → 2.570 (-21,3%) · Retail 1-30: 13.267 outlet, 8.671 → 7.333 (-15,4%) · 543 GA dari outlet tanpa GA di Oktober.

Per program / flag katalog: Tanpa flag -10,2% · **AVA +14,9%** · Promotor +3,5% · Top Player (WS) -26,8% · KRO (katalog) -29,6% · **DtU -49,9%** (505 → 253).
UAR Improvement (outlet master): tier UAR 3+ pada hari 1-3: Nov 979 outlet vs 1.126 di Okt periode sama; UAR 10 / 20: 152 vs 199.

## 4. Hasil Fav Locs (lokasi favorit)

Asal penjual untuk 22.727 GA (hari 1-4): penjual di luar master 6.595 (29%), MC yang sama 4.206, branch yang sama 3.600, site yang sama 1.226, branch lain 1.841, sumber tagging tidak ditemukan 3.010, tanpa ID penjual 2.249. Jadi hanya sekitar 5% GA mendarat di site yang sama dengan outlet penjualnya.

Per branch (fav loc, hari 1-3 Nov vs hari 1-3 Okt dari pivot): Kab Bekasi +5,0% · South Jakarta Depok +20,3% · Karawang +15,7% · East Jakarta +3,9% · West Jakarta +26,3% · Bekasi +13,3% · **Central North Jakarta -12,0%**. Catatan: fav loc naik sementara outlet tagging turun, artinya GA yang tercatat di lokasi IJ tidak turun, tetapi penjualnya makin banyak di luar outlet IJ yang termapping (atau sumber tagging belum ditemukan).
Site dengan selisih fav loc − outlet terbesar: 13CKR0252 (512 vs 4 GA, kemasukan) dan 13CKR0917 (outlet menjual 510 GA, fav loc hanya 5, pengiriman besar).

## 5. Keterbatasan dan yang perlu diputuskan

1. Baseline: pakai CSV Oktober MSISDN untuk perbandingan Nov vs Okt (disarankan); `ga_feed` Oktober perlu dibangun ulang dengan basis yang sama bila menu GA dipindah ke periode berjalan.
2. Fav loc per site Oktober tidak ada: perlu file MSISDN fav loc Oktober dengan format sama bila ingin growth per site / kecamatan.
3. Program: flag katalog Oktober (kro_program_outlets) dipakai; flag November belum ada (TEBUS MURAH, DSF, DSE kosong).
4. Belum dimasukkan ke app: pipeline GA (builder, feed, view A) masih Oktober.
