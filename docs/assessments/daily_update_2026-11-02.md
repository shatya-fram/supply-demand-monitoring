# Daily update 2 Nov 2026 dan kesiapan penutupan Oktober: Visit PJP, MOBII, MOBO, SALMO, GA ke 31 Okt; End Balance snapshot 1 Nov

Status: assessment sebelum commit dan publish (CLAUDE.md §2). Refresh `daily_update.py` selesai setelah tiga perbaikan kecil (§3). Semua audit lolos. Ada satu temuan data yang perlu keputusan sebelum publish (§2.1: MOBO 31 Okt belum lengkap). Belum ada yang di-commit.

## 1. Hasil scan `raw/`

| Data | File | Cut | Status |
|---|---|---|---|
| MOBII Supply | `DAILY_DATA_MOBII_202610.xlsb` (2 Nov 00:22) | 30 → **31 Okt** | baru, lengkap (SP, Voucher, Saldo semua ada hari ke-31) |
| MOBO Demand | `DAILY_DATA_MOBO_202610.xlsb` (2 Nov 00:22) | 30 → 31 Okt di feed | baru, **tetapi RLD / VCI / CVM / PKT berhenti di 30 Okt** (§2.1) |
| SALMO | `DAILY_DATA_MOBO_SALMO_202610.xlsb` (2 Nov 00:22) | 30 → **31 Okt** | baru, Oktober penuh, Rp 155,38 B |
| End Balance | `..._2026-11-02_06-13-12*.csv` (2 Nov 07:29) | snapshot 30 Okt → **1 Nov** | baru (snapshot 31 Okt tidak ada, file 1 Nov tidak diunggah) |
| Visit PJP | `im3_/3id_visit_dse_202610__31_31.zip` (2 Nov 00:23) | 30 → **31 Okt** | baru; 1 Nov Minggu, tidak ada file |
| GA by Outlet | `Daily_RGUGA_OUTLET_202610 (1).xlsb` (2 Nov 07:28, 157 MB) | 27 → **31 Okt** | baru, **nama file berakhiran "(1)"** (§3) |
| GA per site (MSISDN) | `rguga_daily_outlet_202610.csv`, `Site_rguga_daily_outlet_202610.csv` | 27 Okt | **belum ada file baru** |
| GA Fav Locs | `Daily_RGUGA_favloc_202610.xlsb` | 26 Okt | belum ada file baru, tidak dibaca builder |
| Vanguard 5G | file LIVE 29 Okt | 29 Okt | belum ada file baru |

## 2. Angka dan temuan

- **Visit PJP (Inner Jakarta, Okt penuh, 27 hari kerja, tidak ada hari terlewat)**: planned 188.537 → **197.617**, executed 151.721 → **159.340**, hit rate 80,5% → **80,6%**, productive 70.970 → 74.019, ad-hoc 18.113 → 18.819. Baris regional lain (Outer Jakarta, West Java, uji) dibuang oleh filter yang disetujui 31 Okt.
- **Sell-In (MOBII) Okt penuh vs Sep penuh**: SP Rp 3,26 B vs 2,77 B (+17,7%; hari ke-31 saja Rp 0,54 B), Voucher isi 5,75 vs 11,97 B, Voucher blank 0,93 vs 1,52 B, Saldo outlet 22,13 vs 28,91 B (-23,5%). Selisih Voucher dan Saldo sebagian dampak migrasi awal Oktober (CLAUDE.md §5), bukan bug feed.
- **Demand (RLD+VCI+CVM+PKT)**: Rp 115,21 B (sampai 30 Okt) vs Sep penuh Rp 106,50 B (+8,2%). Per kategori: Paket Data 76,00 vs 65,79; Reload 18,14 vs 12,37; Voucher Injection 17,70 vs 22,12; CVM 3,38 vs 6,22; SP Injection 1,00 vs 1,88. **Saldo Mobo (SALMO)** Okt penuh Rp 155,38 B vs Sep Rp 143,39 B (+8,4%), 13.708 outlet.
- **GA by Outlet (cut 31 Okt)**: IM3 156.019 → **195.556**, 3ID 92.128 → **128.334**; total 323.890 vs September 252.195 (+28,4%). Target Oktober per kecamatan: IM3 210.821, 3ID 102.505 (pembanding target tetap basis site, bukan angka ini). Selisih 3ID antara ringkasan workbook (92.745) dan pivot mentah (128.334) sudah dikenal sejak asesmen sebelumnya, belum dikonfirmasi ke Victor.
- **End Balance** snapshot 1 Nov: 129.807 baris, 18.282 outlet (master 16.024, adhoc 2.258), sell-in cut 31 Okt.
- **Audit**: `render_check`, `audit_scorecard` (164), `audit_ga` (3.629), `audit_consistency` (278), `audit_kro`, `audit_sp` (16), `audit_dse_catalogue`, `audit_entity` lolos.

### 2.1 Temuan yang perlu keputusan: MOBO 31 Okt tidak lengkap

Di feed demand, hari ke-31 hanya berisi SALMO (Rp 4,49 B) dan SP Injection (Rp 25 Jt); Reload, Voucher Injection, CVM dan Paket Data tidak punya baris 31 Okt (30 Okt: Paket Data Rp 1,70 B, Voucher Injection Rp 1,57 B, Reload Rp 1,05 B). Builder mengambil cut dari hari terakhir kategori mana pun, sehingga `cut_day` menjadi 31 dan:

- Demand MTD tampak datar (Rp 115,21 B sama dengan kemarin) sementara cut tertulis 31 Okt;
- rata-rata per hari dan proyeksi memakai 31 hari padahal empat kategori utama baru 30 hari;
- Sell-In 31 Okt (Rp 0,5 B SP, 0,9 B Saldo) dibandingkan dengan demand yang belum ada hari itu.

Pola ini sama dengan 29 Okt (MOBO terlambat sehari), tetapi saat itu SALMO ditahan di cut MOBO. Dua jalan: (a) Thofa mengunggah ulang MOBO dengan 31 Okt, lalu refresh diulang; (b) builder dibuat menetapkan cut dari RLD/VCI/CVM/PKT dan menahan hari lebih akhir untuk SALMO dan SP Injection (mekanisme `held_after_cut` yang sudah ada). Saya rekomendasikan (a) dulu; (b) sebagai pengaman agar kejadian ini tidak lolos diam-diam.

## 3. Perubahan kode pada refresh ini

1. `scripts/build_penjualan_feed.py`: `days_lmtd` dipotong ke panjang September (30 hari). Cut 31 melawan bulan 30 hari membuat refresh gagal (`ValueError: day 31 must be in range 1..30`); LMTD = bulan penuh. Ini kejadian pertama kali dengan cut 31 dan akan terulang pada setiap bulan 31 hari yang mengikuti bulan 30 hari.
2. `scripts/build_ga_feed.py`: file GA diterima dengan akhiran unduhan ulang browser (`Daily_RGUGA_OUTLET_202610 (1).xlsb`). Sebelumnya step GA berhenti dengan "Perlu Daily_RGUGA_OUTLET_202610.xlsb". File bernama polos tidak ada lagi di folder.
3. `scripts/audit_ga.js`: (a) "perlu per hari" bernilai 0 bila tidak ada hari tersisa (cut 31 dari 31; sebelumnya Infinity / NaN); (b) kartu Trend basis site memakai cut terkecil antara file outlet dan file site (site masih 27 Okt, outlet 31 Okt), sesuai perilaku aplikasi.

Basis site (Daily GA Trend `gaBasis=site`, Gross Add > Site location GA) masih berhenti di 27 Okt karena CSV MSISDN belum diperbarui; angkanya tidak sebanding dengan basis outlet sampai Victor mengunggah CSV baru.

## 4. Kesiapan penutupan Oktober: Sep penuh, Okt penuh, MTD Nov vs LMTD Nov

Pertanyaan: apakah semua data yang sudah ditangkap masih bisa dianalisis setelah bulan berganti. Jawaban: **bisa untuk Sep penuh dan Okt penuh sekarang; MTD Nov vs LMTD (Okt) belum bisa tanpa penyesuaian kode**, dan datanya perlu dibekukan dulu.

### 4.1 Yang sudah bisa dianalisis hari ini

| Ukuran | Sep penuh | Okt penuh | Seri harian Okt (basis LMTD Nov) |
|---|---|---|---|
| Sell-In MOBII (SP, Voucher isi / blank, Saldo) | `fv` per produk | `mv` (cut 31) | `mc_daily.m` per MC, brand, kategori |
| Demand MOBO (RLD, VCI, CVM, PKT, SPI) | `fv` / `lv` | `mv` (**30 hari**, §2.1) | `outlets[].c[kat][4]` |
| Saldo Mobo (SALMO) | `l.SAL` FM | Okt penuh | `c.SAL[4]` |
| GA by Outlet | `s` per outlet | `o` per outlet | `o` (hari, qty) |
| PJP / visit | **tidak ada** (feed mulai 1 Okt) | 27 hari kerja | `daily_timeline`, `daily` per DSE |
| End Balance | snapshot saja | snapshot 1 Nov | tidak ada seri bulanan |

PJP tidak punya baseline September di aplikasi; ini bukan kehilangan data melainkan data yang memang tidak pernah dimuat.

### 4.2 Yang akan bermasalah saat file November masuk

1. **Bulan tertanam di kode**: `MTD_MONTH, LMTD_MONTH = (2026, 10), (2026, 9)` (penjualan), `MONTH = (2026, 10)` (demand), sheet GA `IM3 SEP / IM3 OCT` dan target `TARGET OCT`, nama file `..._202609 / _202610`. Aplikasi memuat sekitar 290 label "Okt" / "Sep" dan 23 tempat dengan pembagi atau proyeksi 31 hari (`mtd_month_days`); **November 30 hari**, jadi proyeksi akhir bulan akan salah 3,3% bila tidak diparameterkan.
2. **Visit PJP**: builder menggabungkan semua file zip / csv di `raw/`. File November akan bercampur dengan 31 file Oktober dalam satu feed berperiode lintas bulan, dan seluruh laporan membaca "1 Okt s.d. hari ini". Perlu pemisahan per bulan dan arsip Oktober sebagai pembanding LMTD.
3. **Rotasi sumber**: LMTD / Last FM dibaca dari file bulan lalu (`DAILY_DATA_MOBO_202609`, `..._SALMO_202609`) selama file itu ada di `raw/`. Untuk November, pembanding adalah `_202610`; jika file Oktober dipindahkan, LMTD Nov kosong. `daily_update.py` sudah memilih file per bulan (bagian ini siap).
4. **LMTD Nov dengan hari berbeda**: Nov 1–N dibandingkan Okt 1–N (rentang sama; Okt migrasi 1–9 Okt rendah membuat LMTD Nov yang pertama turun sebagai pembanding, perlu catatan di layar seperti catatan Oktober vs September). Pembanding Nov vs **Sep** tidak ada di model sekarang.
5. **Target**: target DSE (`raw/*Target DSE*.xlsx`), target GA kecamatan (M2S KECAMATAN) dan target SP Oktober tidak berlaku untuk November; kartu target akan n/a atau memakai target Oktober bila tidak dikunci per bulan.
6. **Hari terakhir bulan dan cut 31**: kasus cut 31 melawan bulan lalu 30 hari sudah ditangkap dan diperbaiki (§3). Kasus ke depan: cut 30 Nov melawan Okt 31 hari (LMTD harus berhenti di 30, FM tetap 31), cut 29–31 Des melawan Nov, dan Februari.

### 4.3 Rekomendasi (urutan kerja, perlu persetujuan Anda)

1. **Bekukan penutupan Oktober** sebelum file November masuk: salin feed Oktober final (`data/processed/*.json`, `website/data/*.js`) ke `data/processed/archive/2026-10/` setelah MOBO 31 Okt lengkap; commit sebagai tag penutupan. Ini membuat Okt penuh tetap dapat dianalisis walau sumber `raw/` berubah.
2. **Parameterisasi bulan** di satu tempat (bulan berjalan, bulan lalu, jumlah hari, nama sheet, target) dan label aplikasi dari konfigurasi, dengan tes "simulasi cut November" di `render_check.js` seperti simulasi cut 25 Okt yang sudah ada. Ini pekerjaan kode besar (ratusan label) dan sebaiknya sesi tersendiri dengan asesmen data November lebih dulu setelah file pertama (2–3 Nov) tiba.
3. **Pisahkan PJP per bulan** (feed Okt diarsipkan, feed Nov mulai kosong, LMTD Nov dibaca dari arsip).
4. Minta Thofa mengunggah MOBO 31 Okt dan mempertahankan file Oktober di folder; minta Victor mengunggah CSV GA site 28–31 Okt.

## 5. Perlu perhatian lain

1. Working tree juga memuat perubahan `website/app.js` dan `website/vanguard.js` dari sesi Vanguard, `portal/`, dokumen GA Circle Jaya dan `.claude/launch.json`; tidak ikut commit ini.
2. GA site (MSISDN) dan Fav Locs berhenti di 27 / 26 Okt; Vanguard di 29 Okt.
3. Data-owner yang masih terbuka: id SALMO berawalan `D…`, daftar BOSS / Tebus Murah, selisih GA 3ID ringkasan vs pivot, dan konfirmasi +4,3% CSV vs Fav Locs.
4. Belum commit, belum publish.

## 6. Tambahan (2 Nov 08:50): MOBO 31 Okt masuk, Oktober demand penuh

`DAILY_DATA_MOBO_202610.xlsb` diunggah ulang (08:50, nama tanpa spasi) dengan hari ke-31 untuk semua kategori; refresh diulang, **RESULT: OK**. Butir §2.1 terselesaikan: `cut_day` 31 kini benar untuk demand.

- Hari 31 Okt: Paket Data Rp 2,04 B, Voucher Injection 1,44 B, Reload 0,84 B, CVM 0,09 B, SALMO 4,49 B, SP Injection 0,03 B.
- **Demand Okt penuh (RLD+VCI+CVM+PKT)**: Rp 115,21 → **119,63 B** (+Rp 4,42 B) vs September penuh Rp 106,50 B (**+12,3%**). Paket Data 78,04 (Sep 65,79), Reload 18,98 (12,37), Voucher Injection 19,14 (22,12), CVM 3,47 (6,22), SP Injection 1,00 (1,88). SALMO Rp 155,38 B (Sep 143,39 B).
- Peringatan CVM identik RECARGE: 52.034 baris dibuang, 23.658 dipertahankan.
- Semua audit lolos lagi: `audit_scorecard` 164, `audit_ga` 3.629, `audit_consistency` 278, `audit_kro`, `audit_sp` 16, `audit_dse_catalogue`, `audit_entity`, `render_check`.
- File lain tidak berubah sejak commit `e92fcac`: GA site CSV masih 27 Okt, Fav Locs 26 Okt, Vanguard 29 Okt.
- Perubahan feed sejak commit `e92fcac` hanya feed yang memuat demand (25 file); belum di-commit.
