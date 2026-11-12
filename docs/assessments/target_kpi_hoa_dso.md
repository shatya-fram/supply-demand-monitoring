# Assessment · Target KPI IE November 2026: target HoA (Area), DSO (MC) dan partner, per bulan

Ditulis 12 Nov 2026, sebelum perubahan kode (CLAUDE.md §2). Sumber: `CHECKED - Target KPI IE November 2026 - INNER.xlsb` (OneDrive 2026 Operation › Nov 2026 › Target Sets; salinan lokal `raw/Targets/`, 235 KB, diubah 9 Nov 15:47). Menjadi kontrak data untuk `scripts/build_target_kpi_feed.py` → `website/data/target_kpi_feed.js` (`TARGET_KPI_FEED`) dan tab baru di menu Konfigurasi · Target Setting.

## 1. Isi workbook

| Sheet | Isi | Dipakai |
|---|---|---|
| **Summary** | 15 KPI × tiga blok kolom: **IOH** (kolom 4–18), **3ID** (19–33), **IM3** (34–48), pada tiga tingkat: Region (1 baris), **Area** (7 baris; kolom *Name* = **HoA**), **MC** (36 baris; kolom *Name* = **DSO**) | ya, sumber utama |
| IOH_Target | target Region IOH / IM3 / 3ID tiga blok (TARGET NOVEMBER, TARGET FEEDBACK REGION, GAP): hanya Region | tidak (Region sudah di Summary); sama dengan Summary |
| **IM3_PT**, **3ID_PT** | target per **partner (PT)**: Region, Branch, MC, PT, tipe partner (MPC / MITRAIM3 / MP3 / 3KIOSK), nama partner, 15 KPI dalam blok *FINAL REBALANCING* (kolom pertama), *TARGET FINAL APPROVED HQ* dan *GAP* | ya, blok pertama (dicek sama dengan blok approved) |

**15 KPI:** Sell-In, Sell-In KAM, Total RGU GA, RGU GA 5G, RGU GA non 5G, M2S, Acq Rev (Rp), FWA 4G, Primary (Rp), Secondary (Rp), Secondary KAM (Rp), Trade Supply (Rp), Trade Demand (Rp), Tertiary B# (Rp), Prepaid (Rp). Sel *Update as of* di Summary berisi 30 Nov 2026 (tanggal akhir bulan, bukan tanggal revisi; file diubah 9 Nov).

## 2. Pemetaan ke struktur aplikasi

- **HoA = kepala Area** (baris Area, kolom Name); **DSO = kepala MC** (baris MC, kolom Name). Nama yang tampil memakai master aplikasi; ejaan workbook disimpan (`hoa_src`, `dso_src`).
- **KOTA BEKASI** di workbook = branch `BEKASI` di feed (di layar sudah ditampilkan KOTA BEKASI, CLAUDE.md §5).
- Selisih ejaan nama: HoA *R AGUS SULARTO* / *Ragus Sularto*, *BUTET ROSWIDA SIDAURUK* / *Roswida Sidauruk*; DSO MC-CIBARUSAH (*RADEN SYARIEF DURAHMAN* / *R. SYARIEF DURAHMAN*), MC-CIKARANG BARAT (*MAULIDIRIZKI* / *MAULIDRIZKI*), MC-GROGOL (*LESTARI AMURIH RAHAYU* / *LESTARI A. R.*). 33 dari 36 MC dan 5 dari 7 HoA identik; semua MC dan Area cocok satu-satu dengan master (36 MC, 7 area, tanpa MC tersisa).

## 3. Pemeriksaan konsistensi (semua dijalankan builder, `metadata.months[].checks`)

| Pemeriksaan | Hasil |
|---|---|
| Jumlah 7 Area = Region, jumlah 36 MC = Region (semua KPI selain KAM, IOH / IM3 / 3ID) | cocok |
| IOH = IM3 + 3ID di setiap Area dan MC | cocok |
| Jumlah partner (IM3_PT, 3ID_PT, 78 baris) = Region untuk semua 15 KPI | cocok |
| Blok *FINAL REBALANCING* = blok *TARGET FINAL APPROVED HQ* di sheet PT | sama |
| **Sell-In KAM 32.899 pcs dan Secondary KAM Rp 59,0 M** | **hanya di Region IOH**: tidak dialokasikan ke Area, MC maupun partner (IM3 dan 3ID bernilai 0). Ditampilkan di baris Region saja. |
| **Total RGU GA ≠ RGU GA 5G + non 5G** | **di 28 dari 36 MC selisih** (mis. MC-CIBARUSAH total 5.876 vs 5G + non 5G 5.432; MC-CIKARANG BARAT 8.041 vs 9.261); di Area dan Region cocok. **Total RGU GA yang dipakai** (361.750 = target GA di Program Target Bridge); kolom 5G / non 5G ditampilkan apa adanya dengan catatan. |
| IM3_PT: judul blok kedua dan ketiga bertuliskan *TARGET OKTOBER* | label usang di workbook; angka sama dengan November (jumlah branch SELL IN IM3 = 206.188 = Region). |

## 4. Total November (Region Inner Jakarta)

Sell-In 299.082 pcs (IM3 206.187 + 3ID 92.895; + KAM 32.899 di Region), **Total RGU GA 361.750** (IM3 238.388 + 3ID 123.362; 5G 34.793), M2S 124.813, FWA 4G 2.396, Acq Rev Rp 10,72 M, Primary Rp 129,94 M, Secondary Rp 128,66 M (+ KAM 59,00 M), Trade Supply Rp 106,22 M, Trade Demand Rp 90,18 M, Tertiary B# Rp 121,97 M, Prepaid Rp 601,41 M.

## 5. Selisih dengan target yang sudah ada di aplikasi (perlu diputuskan pemilik)

1. **Sell-In: 299.082 (HoA / DSO, Nov) vs 266.765 (target per DSE, distribusi Oktober yang dibawa ke November)**: selisih 32.317 pcs (+12,1%). Target DSE belum dibagi ulang untuk November. Tab HoA / DSO memakai angka workbook; tab DSE dan Ringkasan lama tetap Oktober sampai target DSE November terbit. **Definisi KPI "SELL IN"** diasumsikan sama dengan Sell-In SP KPI (SP 3GB + SP Injection, CLAUDE.md §5): perlu konfirmasi.
2. **Total RGU GA 361.750 = target GA Program Bridge** (cocok); target GA per kecamatan (M2S, Oktober) tetap Oktober.
3. KPI Rupiah (Primary, Secondary, Trade Supply, Trade Demand, Tertiary B#, Prepaid, Acq Rev) dan M2S, FWA 4G **tidak punya sumber aktual di aplikasi**; hanya target yang ditampilkan, pencapaian "n/a".

## 6. Aktual yang dibandingkan di aplikasi

| KPI | Aktual | Catatan |
|---|---|---|
| Total RGU GA | `ga_feed` bulan berjalan, per Area / MC / brand (GA MTD, tagging outlet) | cut mengikuti feed GA |
| Sell-In | Sell-In SP KPI (SP 3GB + SP Injection) per MC dari feed KPI DSE, IOH saja (tidak dipisah IM3 / 3ID) | asumsi §5.1 |
| lainnya | n/a | tidak ada sumber |

Pencapaian = aktual ÷ (target × pro-rata hari), sama dengan menu lama (`cfAch`); pro-rata mengikuti jam bulan (`moClocks`).

## 7. Desain per bulan

- **Input per bulan** = `data/catalogues/target_kpi/<YYYYMM>.csv` (long: month, brand, level, branch, mc, pt, partner_type, partner, name, kpi, value, source). Builder menulis CSV dari workbook bila workbook lebih baru, sehingga bulan baru = taruh workbook di `raw/Targets/` + satu baris di `MONTH_SOURCES`, atau CSV diedit / ditambah tangan.
- **Oktober (parsial, diturunkan)**: Sell-In = target SP per Area / MC (hasil rebalancing, IOH 266.765), OSA (Rp 73,64 M) dan Total RGU GA = target M2S KECAMATAN per Area / MC (IOH 313.326, jumlah IM3 210.821 + 3ID 102.505). KPI lain n/a. Tidak ada angka karangan.
- **November**: workbook di atas (lengkap, 15 KPI, Area, MC, partner).
- Menu **Konfigurasi · Target Setting** mendapat tab **HoA · Area**, **DSO · MC**, **Partner · PT** dan **Bridge bulan ke bulan** (perubahan target Okt → Nov per Area dan MC), dengan pemilih **Bulan target**, pemilih **brand** (IOH / IM3 / 3ID) dan grup KPI; tab lama (Ringkasan, per DSE, rebalancing) tetap Oktober dengan banner yang menyatakan itu.

## 8. Hasil build (12 Nov 2026)

`python3 scripts/build_target_kpi_feed.py`: `data/catalogues/target_kpi/202611.csv` 2.994 baris (Region, 7 Area, 36 MC dan 78 baris partner × 15 KPI × IOH / IM3 / 3ID) dan `202610.csv` (parsial, 7 Area + 36 MC + Region × 3 KPI × 3 brand); feed 98 KB. Catatan builder untuk November hanya tiga: Total RGU GA ≠ 5G + non 5G di 28 MC, dan Sell-In KAM / Secondary KAM hanya di Region (§3).

**Bridge Oktober → November (IOH)**: Sell-In 266.765 → 299.082 (+32.317, +12,1%); Total RGU GA 313.326 → 361.750 (+48.424, +15,5%). Per Area, Sell-In bergerak dari **−12,1% (KAB BEKASI: 59.162 → 52.021)** sampai **+27,3% (EAST JAKARTA)** (BEKASI +13,1%, CENTRAL NORTH JAKARTA +21,0%, KARAWANG +20,1%, SOUTH JAKARTA DEPOK +20,6%, WEST JAKARTA +10,6%), dan Total RGU GA naik di semua Area, +13,5% (SOUTH JAKARTA DEPOK) sampai +17,5% (WEST JAKARTA). **Per MC lebih lebar**: Sell-In −24,5% (MC-CIKARANG BARAT), −17,9% (MC-BABELAN), −12,0% (MC-CIBITUNG), −10,8% (MC-CIKARANG TIMUR) sampai +29,8% (MC-KRAMATJATI); Total RGU GA −25,0% (MC-CIKARANG BARAT) sampai +55,0% (MC-CIBARUSAH dan MC-TAMBUN). Target KAB BEKASI turun di Sell-In sementara target GA-nya naik 13,6%: perlu dikonfirmasi bahwa itu rebalancing yang disengaja (MC-CIKARANG BARAT turun di kedua KPI).

**Pencapaian Sell-In MTD (cut 11 Nov): definisi sangat menentukan.** Aktual KPI (SP 3GB + SP Injection) 4.893 pcs = **4,5%** dari target pro-rata; semua Starter Pack MOBII dari DSE (SP Zero ikut) 42.927 pcs = **39,1%**. Selisih besar karena SP Zero (40.730 pcs MTD) tidak dihitung pada KPI. Tab menampilkan **kedua** pencapaian dan menandai definisi "Sell-In" workbook sebagai belum dikonfirmasi; satu pertanyaan untuk pemilik: apakah target Sell-In 299.082 pcs mencakup SP Zero? Total RGU GA: 77.209 pcs MTD (cut 10 Nov, GA outlet tagging) = 64,0% dari target pro-rata.

**Pemeriksaan otomatis**: `render_check.js` merender semua tab × bulan × brand × grup KPI dan memeriksa jumlah Area dan MC = Region untuk setiap bulan; `build_target_kpi_feed.py` mencetak setiap pemeriksaan di §3.

