# Daily update 27 Okt 2026 (sore): GA by Outlet dan Fav Locs

Status: assessment sebelum commit dan publish (CLAUDE.md §2). Tidak ada kode yang diubah; hanya feed yang dibangun ulang oleh `scripts/daily_update.py`.

## 1. Hasil scan `raw/`

| Data | File | Cut | Status |
|---|---|---|---|
| Visit PJP | `*_visit_dse_202610__26_26.zip` | 26 Okt | tidak berubah |
| MOBO Demand, SALMO, MOBII | `DAILY_DATA_*_202610.xlsb` (27 Okt 02:46) | 26 Okt | isi sama dengan refresh pagi |
| End Balance | snapshot 26 Okt (file 27 Okt 05:43) | 26 Okt | tidak berubah |
| **GA by Outlet** | `Daily_RGUGA_OUTLET_202610.xlsb` (27 Okt 11:54) | **26 Okt** (sebelumnya 24 Okt) | baru |
| **GA per MSISDN / site** | `rguga_daily_outlet_202610.csv` (27 Okt 11:49) | **26 Okt** (sebelumnya 21 Okt) | baru, 1.999.094 baris (sebelumnya 1.416.785) |
| **GA Fav Locs** | `Daily_RGUGA_favloc_202610.xlsb` (27 Okt 11:55) | 26 Okt | baru; belum dibaca builder mana pun, dipakai sebagai cek silang |

## 2. Angka GA

- GA Okt (cut 26): IM3 144.243 (sebelumnya 124.332 di cut 24), 3ID 82.669 (66.334). Di outlet master: IM3 83.887, 3ID 36.421.
- Site IJ (aktivasi di 120 kecamatan IJ), CSV: 197.774 GA, 5.569 site.
- Fav Locs (workbook, IOH, Inner Jakarta, 1–26 Okt): 189.665. CSV lebih tinggi 8.109 (+4,3%); selisih 20 Okt sebelumnya hanya 0,45%. Perlu dicek ke pengunggah (Victor): mungkin beda definisi site IJ untuk kecamatan batas, atau beda tanggal tarik.
- Semua audit lolos: render, scorecard 164, GA 3.683, KRO, katalog DSE, entity.

## 3. Hal yang perlu perhatian

1. **Lonjakan GA harian** (CSV, seluruh circle): 74 rb (20 Okt) → 112 rb (23) → 114 rb (24) → 126 rb (25) → 134 rb (26). Di IJ (Fav Locs) 7 rb → 12.419 (25 Okt) → 19.394 (26 Okt). Tidak ada duplikat MSISDN-hari di CSV. Lonjakan nyata di sumber; penyebab (program/promo) belum diketahui. Tren harian dan proyeksi akhir bulan ikut naik.
2. **Selisih ringkasan workbook 3ID**: feed 82.669 vs sheet ringkasan 59.900 untuk Okt (Sep juga selisih 22.579). Ini sudah ada sebelumnya (ID 3ID di luar sheet ringkasan, registry); bukan akibat file baru.
3. `data/catalogues/kro_outlet_catalogue.csv` berubah ±4.680 baris karena KRO dibangun ulang dengan cut GA 26 Okt.
4. Hari lain di feed (PJP, MOBO, MOBII, ENDBAL) hanya berubah di `generated_at`.

## 4. Belum dikerjakan

- Fav Locs belum menjadi sumber di app (ia memberi taksonomi 825 kecamatan → region; terkait sesi GA Circle Jaya).
- Belum commit, belum publish.
