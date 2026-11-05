# Daily update 5 Nov 2026 · Sell-In, Demand dan PJP sampai 4 Nov

Scan `raw/` 5 Nov 06:12 dan refresh penuh (`daily_update.py`, satu putaran, semua langkah OK). Audit lulus: konsistensi 275, scorecard 162, GA 3.629, KRO, SP 16, arsip periode 95, entity. Audit katalog DSE masih menandai dua cek (§4).

## 1. Hasil scan

| Sumber | File | Cakupan |
|---|---|---|
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202611.xlsb` (4 Nov 23:11; salinan "(1)" bertanggal 4 Nov 06:49 adalah versi lama) | 1–4 Nov |
| MOBO (Demand) | `DAILY_DATA_MOBO_202611.xlsb` + `_SALMO_202611` (4 Nov 23:11) | 1–4 Nov |
| PJP | `im3/3id_visit_dse_202611__04_04.zip` (4 Nov 23:09) | **4 Nov**; 1 Nov (Minggu) n/a |
| End Balance | snapshot 4 Nov (file bertanggal 5 Nov 05:12, `endbal_20261104.zip`) | 16.125 outlet |
| GA by Outlet, GA site, Fav Locs, Vanguard | tidak ada file baru | GA tetap 31 Okt, Fav Locs 26 Okt, Vanguard 29 Okt |

Sell-In, Demand dan PJP sama-sama cut 4 Nov (pada 4 Nov Demand sempat tertinggal sehari; sekarang sejajar).

## 2. Angka (MTD Nov 1–4 vs LMTD Okt 1–4)

LMTD Okt 1–4 adalah periode migrasi (nilai sangat rendah); 1 Nov hari Minggu. Kolom terakhir membandingkan dengan rata-rata harian Oktober hari 13–31.

| Ukuran | Nov 1–4 | LMTD Okt 1–4 | Nov 4 | Rata-rata Okt/hari |
|---|---|---|---|---|
| SP semua MOBII | 3.598 pcs | 68 | 1.363 | 12.000 |
| SP Injection | 456 pcs | 405 | 144 | 2.802 |
| Voucher isi | Rp 398,7 Jt | Rp 106,6 Jt | Rp 161,1 Jt | Rp 281,4 Jt |
| Voucher blank | Rp 164,1 Jt | Rp 0,3 Jt | Rp 52,7 Jt | Rp 44,7 Jt |
| Saldo Mobo (sell-in) | Rp 2,12 B | Rp 23,5 Jt | Rp 651,7 Jt | Rp 1,01 B |
| Demand Reload | Rp 2,61 B | Rp 2,60 B | Rp 997,3 Jt | Rp 534,4 Jt |
| Demand Voucher Injection | Rp 666,5 Jt | Rp 1,50 B | Rp 223,3 Jt | Rp 639,0 Jt |
| Demand Paket data | Rp 7,42 B | Rp 12,40 B | Rp 2,17 B | Rp 2,28 B |
| Demand CVM | Rp 514,3 Jt | Rp 558,6 Jt | Rp 157,1 Jt | Rp 106,0 Jt |
| Demand Saldo Mobo (SAL) | Rp 14,51 B | Rp 19,71 B | Rp 3,88 B | Rp 4,89 B |
| PJP planned / actual | 25.492 / 23.243 | 7.289 / 2.153 | 8.409 / 7.722 | 7.634 / 6.711 |
| PJP produktif / ad-hoc | 11.706 / 2.404 | 100 / 46 | 4.046 / 748 | 3.415 / 844 |

Catatan baca:
- Hari ke-4 November: Reload (Rp 997 Jt, hampir dua kali rata-rata Oktober), Paket data dan CVM sudah mendekati atau di atas rata-rata Oktober; PJP actual 7.722 di atas rata-rata Oktober.
- Sell-In SP dan Voucher isi masih jauh di bawah rata-rata Oktober (pola awal bulan setelah dorongan akhir Oktober; SP naik bertahap 952 → 1.363 pcs per hari).
- **Voucher Injection tetap sekitar sepertiga rata-rata Oktober** (Rp 223 Jt pada 4 Nov vs Rp 639 Jt; Rp 167–223 Jt per hari selama 3 hari berturut-turut). Perlu dikonfirmasi apakah itu pola November atau perubahan pencatatan.
- Pertumbuhan terhadap LMTD Okt tertekan oleh migrasi Oktober; gunakan perbandingan per hari terhadap Full Month Oktober (Review Periode).
- CVM: 52.034 baris identik RECARGE dibuang (Rp 31,7 B, aturan 17 Okt); angkanya sama dengan hari-hari sebelumnya karena salinan itu ikut file.

## 3. Pengecekan data

- Cut sejajar di tiga kelompok data (Sell-In 4, Demand 4, PJP 4); arsip periode tersimpan: Nov group cut 4 untuk ketiganya.
- Daftar DSE: 272 DSE + 136 PROMOTOR TOKO = 408 operator di feed visit (cek ini lulus; sebelumnya 369 operator).

## 4. Perlu keputusan / perhatian

1. **Tiga DSE punya visit, tetapi feed visit mencatatnya di MC lain dari master** (koreksi 5 Nov: asesmen awal menulis "belum punya visit", itu salah). Feed visit menaruh seorang DSE di MC tempat paling banyak outlet yang ia rencanakan (`generate_dse_visits_feed.py`, `info["mcs"].most_common`), bukan MC master:
   - **Edi Warsono** (master MC-CENGKARENG, 48 outlet, login IM3 `DSEIN102` / 3ID `DSEIN1023ID`): 36 kunjungan terencana dan terlaksana (3 dan 4 Nov). 17 outlet IM3 ada di Cengkareng (outlet miliknya), tetapi 19 outlet 3ID ada di MC-KEMBANGAN dan di master milik **Irfan Saptian**. Mayoritas menang, jadi ia tercatat di MC-KEMBANGAN dan tidak muncul di baris MC-Cengkareng (yang 100% hanya mencerminkan 9 DSE lain). 14 dari 48 outlet miliknya belum dikunjungi bulan ini.
   - **Ihsan Riyadlul Jinan** (master MC-BATUJAYA, 67 outlet) dan **Sukron Mamun** (master MC-BATUJAYA, 57 outlet): 56 dan 62 kunjungan terencana, seluruhnya di outlet MC-RENGASDENGKLOK yang di master milik DSE lain (Erick Rejeki Limbong dan Juana). 44 dan 31 outlet master mereka belum dikunjungi. Mereka tercatat di MC-RENGASDENGKLOK.
   - Ini yang membuat audit katalog DSE menandai dua cek: pencocokan katalog ke `person_id` memakai nama dan MC, dan MC-nya berbeda. Yang perlu diputuskan: apakah ini salah mapping login MOBI (plan DSE dipakai di wilayah lain; mirip temuan DSE bertukar 21 Okt), atau pindah wilayah sah. Dampak ke laporan: baris MC Cengkareng, Batujaya, Rengasdengklok dan Kembangan tidak mencerminkan wilayah master, dan outlet master yang tidak direncanakan tidak muncul sebagai kegagalan di baris MC.
2. Voucher Injection rendah (lihat §2).
3. GA belum month-aware: file Daily_RGUGA November belum ada; GA tetap Oktober; Fav Locs masih 26 Okt.
4. Target November memakai distribusi Target Oktober (carry-forward, keputusan 4 Nov).
5. Data owner: id `D…` di SALMO, daftar BOSS / Tebus Murah, serta menu nonaktif "Analisis Teritori Pimpinan" dan "Kunjungan DSE & PJP" (hapus atau tetap).

## 5. Perubahan kode

Tidak ada perubahan kode; hanya feed dan arsip periode yang diperbarui.
