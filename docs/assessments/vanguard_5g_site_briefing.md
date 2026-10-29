# Vanguard 5G · assessment data dan pendekatan Briefing Pagi DSE

Tanggal assessment: 29 Okt 2026. Sumber: `raw/Vanguard/` (2 file xlsx). Dibaca dengan stdlib
(zipfile + XML), tidak ada perubahan pada aplikasi. Dokumen ini adalah data contract untuk builder
dan menu Vanguard (gerbang assessment CLAUDE.md §2).

## 1. Isi folder

| File | Sheet data | Baris | Grain |
|---|---|---|---|
| `Vanguard_InnerJKT_Flag_Step1-5_LIVE_29Okt2026.xlsx` | `Sites + Step 1-5` | 5,844 | 1 baris = 1 site (semua site Inner Jakarta, 5G dan Non-5G) |
| `Vanguard_InnerJKT_OutletMapping_Step1-5_LIVE_29Okt2026.xlsx` | `Outlet Mapping x Step` | 18,970 | 1 baris = 1 site x 1 outlet (hanya 3,728 site 5G) |

Sheet `Ringkasan` di tiap file hanya rekap (dipakai sebagai cek silang).

**Kolom kunci.** Flag file: `Site ID` (unik, 5,844), `Flag 5G`, `Scope`, `Area`, `Micro Cluster`, `Kecamatan`,
`Latitude`/`Longitude`, `Step 1..5` (Done / Proses / Belum), `Jml Selesai (1-5)`, `Status 1-5`.
Outlet mapping: `Site ID`, `Outlet ID`, `Outlet Name`, `DSE Name`, `DSE ID`, `Step 1 (site)`, `Step 2 (outlet)`,
`Step 3 (outlet)`, `Step 4`, `Step 5 (site)`, `Step Belum (1-5)`.
Kolom kosong 100% di flag file (abaikan): `Site Type`, `Category`, `DSE IM3 Code`, `DSE 3ID Code`;
`Brand`, `Kabupaten`, `Plan On Air` hanya 1 baris terisi.

**Semantik step.** Step 1 (speed test 5G) dan Step 5 (street branding) = per SITE. Step 2 (engagement) dan Step 3 (branding)
= per OUTLET. Step 4 (advocacy) = outlet atau POI di level site. Dalam file outlet, Step 1/5 dicopy ke semua outlet site itu.

## 2. Temuan

**Volume dan progres (site 5G = 3,728; 1 site "In Scope" lebih banyak, 3,729).**

| | Done (site 5G) |
|---|---|
| Step 1 Speed test | 1,222 |
| Step 2 Engagement | 708 |
| Step 3 Branding | 866 |
| Step 4 Advocacy | 785 |
| Step 5 Street branding | 1,069 |

Lengkap 5 step: 491 site. Belum satu pun: 2,119 site. Perlu dikunjungi (belum lengkap): 3,237 site.
Di level outlet, Step 2 baru 725 dan Step 3 924 dari 18,970 baris, jadi Step 2-4 adalah pekerjaan terbesar.

**Wilayah.** Hanya 28 dari 36 MC punya site 5G; MC-BABELAN dan MC-CIKARANG BARAT masing-masing 1 site, KAB BEKASI 2 site
(809 site Non-5G). Flag file memakai nama area `KAB BEKASI`, outlet file `KOTA BEKASI`; branch CENTRAL NORTH 1,054 vs area 1,053
(1 baris tidak konsisten). Koordinat semua valid (dalam box Jakarta-Karawang). Step 1 dan 5 di kedua file cocok 100%.

**Kualitas pemetaan outlet.**
- 900 baris tanpa outlet = 900 site 5G tanpa outlet terpetakan (hanya 2,828 dari 3,728 site punya outlet).
- 16,689 Outlet ID unik; 14,165 (85%) ada di master Territory. Sisanya (2,524) di luar master.
- 949 pasangan outlet-site ganda dan 432 outlet muncul di lebih dari 1 site.
- Median 5.5 outlet per site, p90 12, maks 32.

**Masalah utama: identitas DSE di Vanguard tidak bisa dipakai.**
- 385 `DSE ID` (master hanya 272 DSE). Bentuknya campuran: 137 nomor HP / angka, 136 `DSE*`/`CSO*`, 98 `1-…`, 14 lain.
- 82% baris punya `DSE Name` berisi nomor HP, bukan nama.
- Hanya 199 dari 385 ID cocok dengan login di katalog DSE; pada outlet yang ada di master, DSE Vanguard sama dengan DSE master hanya di 31% baris.
- Kesimpulan: DSE tidak diambil dari Vanguard. DSE ditentukan dari master aplikasi (DSE per outlet dari sheet FINAL, `dse_catalogue`).

**Label tanggal.** Nama file `LIVE_29Okt2026`, tetapi catatan di sheet `Ringkasan` bilang flag 5G dan status step adalah snapshot 1 Okt
dan "tarik `vg_live.db` untuk angka terkini". Perlu konfirmasi pemilik data: file ini live 29 Okt atau snapshot 1 Okt?

## 3. Uji pemetaan site ke DSE lewat master aplikasi

Aturan berlapis, diuji pada 3,728 site 5G:

1. DSE terbanyak dari outlet master yang bertag `site_nbs` = site tersebut: 2,456 site.
2. Ditambah DSE master dari outlet daftar Vanguard (Outlet ID dicocokkan ke master): total 2,765 site.
3. Sisanya: DSE terbanyak dari outlet master dalam radius 1 km dari koordinat site: +939 site, total **3,704 site (99.4%)**.
4. 24 site tetap tanpa DSE (perlu penunjukan DSO).

Beban hasilnya: **192 DSE** memegang site (80 DSE tidak punya site, umumnya di MC tanpa 5G: Karawang, Cikampek, Bekasi Kab).
Per DSE median 17.5 site, p90 30, **maks 80**. Artinya distribusi miring; DSO harus bisa menggeser site antar DSE dalam satu MC.

Kapasitas: 192 DSE x 3 site = 576 kunjungan site per hari; 3,237 site belum lengkap = sekitar 5.6 hari kerja untuk satu putaran jika merata,
tetapi DSE terberat (80 site) butuh sekitar 27 hari. Selain itu satu site butuh sampai 5 step dan Step 2-4 berada di outlet, bukan di tiang site.

## 4. Rekomendasi pendekatan

**Prinsip.** Vanguard = sumber STATUS (apa yang sudah Done). Aplikasi = sumber PLAN (siapa, kapan, urutan). Rencana dihitung ulang tiap pagi dari status terbaru,
jadi site yang belum selesai otomatis ikut ke hari berikutnya dan yang sudah Done hilang.

1. **Builder `scripts/build_vanguard_feed.py`** (stdlib): ambil file terbaru `raw/Vanguard/*Flag*` dan `*OutletMapping*`, hitung site → DSE (aturan §3),
   tulis `website/data/vanguard_feed.js` dan `data/catalogues/vanguard_site_dse.csv` (hasil assignment, bisa dikoreksi DSO).
   Dipasang di `daily_update.py` sehingga **sync = jatuhkan dua file baru ke `raw/Vanguard/` lalu jalankan daily update**. Tanpa cloud (aturan Phase 1).
2. **Generator plan harian** (di builder, deterministik): per DSE per hari, ambil PJP hari itu (`pjp_mapping_feed`), hitung titik tengah rute, lalu pilih 3 site belum lengkap
   terdekat dari rute (radius maks dapat diatur, default 1.5 km), urut: site dengan step paling sedikit Done dulu, lalu paling dekat. Per site tampilkan checklist:
   - Step 1 dan Step 5 di titik site (kerjakan sekali per site),
   - Step 2/3/4 di outlet yang terpetakan ke site itu, outlet yang ada di PJP hari ini diberi tanda "sambil PJP".
3. **Menu baru `mb_vanguard` "Vanguard 5G · Briefing Pagi"** (grup menu Monitoring, bukan Catalogue; kunci tab didaftarkan di `RT_VIEW_TABS`, tautan bisa dibagikan):
   - **Briefing Pagi**: filter Area › MC › DSO; satu kartu per DSE (nama + login + lencana, 3 site, step yang harus dikerjakan, outlet target, jarak ke rute);
     tombol salin teks WhatsApp per MC dan cetak/PNG untuk DSO.
   - **Progres**: funnel Step 1-5 per Area › MC › DSO › DSE; angka bisa diklik ke daftar site/outlet (gaya popup yang sudah ada).
   - **Daftar Site / Outlet**: semua site 5G dengan status step, filter step belum.
   - **Kualitas Data**: site tanpa outlet (900), site tanpa DSE (24), outlet di luar master, DSE ID Vanguard tak terpetakan, beban DSE tak seimbang.
4. **Penyesuaian oleh DSO**: file kecil `data/catalogues/vanguard_site_override.csv` (`site_id,dse_name`) untuk menggeser site; builder membacanya setelah aturan otomatis.
5. **Pengukuran kepatuhan**: target 3 site per DSE per hari dihitung dari kenaikan jumlah site Done antar dua file harian (selisih snapshot), bukan dari klaim DSE.
   Cross-check opsional: kunjungan MOBI (GPS) dekat koordinat site.

## 5. Keputusan yang dibutuhkan dari pemilik

1. Apakah file Vanguard bisa diekspor tiap malam (atau pagi sebelum briefing) ke `raw/Vanguard/`? Atau ada akses `vg_live.db`? Ini menentukan kesegaran briefing.
2. Konfirmasi tanggal data: file ini live 29 Okt atau snapshot 1 Okt?
3. Setuju DSE ditentukan dari master aplikasi dan bukan dari DSE ID Vanguard?
4. Site tanpa DSE (24) dan MC tanpa 5G: dibiarkan, atau DSO menunjuk DSE?
5. Radius site dari rute PJP (default 1.5 km) dan apakah Step 2-4 boleh dikerjakan di hari lain dari Step 1/5.

## 6. Status build (29 Okt 2026)

Dibangun: `scripts/build_vanguard_feed.py` (hook di `daily_update.py`), `website/data/vanguard_feed.js`, `data/catalogues/vanguard_site_dse.csv`,
`data/processed/vanguard_history.json`, `website/vanguard.js`, menu `mb_vanguard` (tab Briefing Pagi, Progres Step 1-5, Daftar Site, Kualitas Data), cek di `render_check.js`.
Hasil: 3,728 site, 3,704 punya DSE, 273 DSE dikenali, rencana Kamis 190 DSE. Default 3 site per hari, radius 1.5 km (`VG_SITES_PER_DAY`, `VG_RADIUS_KM`).
Belum: popup angka per outlet, kepatuhan harian (butuh file kedua), keputusan 5.1-5.2 (kesegaran file, tanggal data).

## 6b. Pemilih tanggal (29 Okt 2026)

Briefing Pagi memakai pemilih tanggal (input tanggal, tombol hari kerja sebelumnya / berikutnya, Hari ini), bukan lagi tombol hari. Rencana dibuat per tanggal dari tanggal build sampai akhir bulan berikutnya (Minggu dilewati).
PJP tiap tanggal = template mingguan menurut hari dalam minggu; **PJP November dianggap sama dengan Oktober** (keputusan owner). Setiap site muncul sekali per bulan kalender. Mapping site ke DSE tetap sama di November dan siklus November mulai dari awal, tanpa memperhitungkan apakah site pernah dijadwalkan atau belum di Oktober (keputusan owner 29 Okt 2026). Site yang sudah lengkap Step 1-5 tidak dijadwalkan.
Libur nasional belum diperhitungkan.

## 6c. Koordinat master rusak (29 Okt 2026)

610 outlet di master punya koordinat di luar wilayah karena titik desimal hilang (mis. `-623004203`, harusnya -6.23004203). Builder memperbaikinya bila hasilnya jatuh di wilayah Inner Jakarta + Karawang (31 outlet) dan membuang sisanya (579, tanpa koordinat), supaya titik tengah rute dan jarak tidak rusak. Perlu dibereskan di sumber master (data owner).
