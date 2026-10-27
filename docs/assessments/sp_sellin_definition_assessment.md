# Assessment · Definisi Qty SP Sell-In di semua menu dan scorecard

Status: **draft untuk review owner, belum di-commit dan belum di-publish** (permintaan owner 27 Okt 2026).
Data: feed `penjualan_feed`, `demand_feed`, `dse_kpi_feed`, cut 26 Okt 2026 (MTD 1-26 Okt, LMTD 1-26 Sep, FM = September penuh). Satuan pcs.
Catatan: 1-9 Okt rendah karena migrasi MOBII/MOBO (bukan bug feed).

## 1. Sumber dan jenis SP

| Sumber | Isi | Brand |
|---|---|---|
| MOBII (`category SP`) | Starter Pack yang dijual **ke outlet** (DSE / MPX / SDP → outlet), qty dari report MOBII | IM3 dan 3ID |
| MOBO `SP_INJECTION` (`category SPI`) | SP yang **di-inject outlet ke konsumen** (digital, satuan pcs); tidak masuk total demand Rp | IM3 dan 3ID (baris produk di demand feed tanpa field brand; brand dari id outlet) |

Kelas produk MOBII (`sp_class`, `scripts/build_dse_kpi_feed.py`):

| Kelas | Aturan nama / harga | Dihitung di KPI SP? |
|---|---|---|
| **SP 3GB / SP Data 3GB (ORI)** | nama memuat `3GB` dan bukan ZERO | **Ya** |
| **SP 0 / SP Zero** | ZERO, KPK (3ID), KOSONG (bundling kartu kosong), FWA, atau harga Rp 10.000 | **Tidak** |
| **Lainnya (`other`)** | Happy 5GB/7GB eSIM, **SP HAPPY S PLUS V2**, dll. | **Tidak** (jatuh di luar 3GB dan di luar zero) |
| **SP Injection (MOBO)** | semua produk SPI (Perdana, SP Happy, dst.) | **Ya** (ditambah ke SP 3GB; switch "Termasuk di SP") |

## 2. Qty per brand dan tipe (cut 26 Okt)

| Brand | Tipe | MTD Okt | LMTD Sep | FM Sep |
|---|---|---:|---:|---:|
| 3ID | SP 3GB (ORI) | 9.440 | 8.285 | 8.326 |
| 3ID | Other (hampir semuanya SP HAPPY S PLUS V2, Rp 13.000) | 59.220 | 41 | 141 |
| 3ID | SP Zero (KPK, KOSONG) | 54.020 | 36.319 | 48.731 |
| IM3 | SP 3GB (ORI) | 5.421 | 27.089 | 29.647 |
| IM3 | SP Zero (ZERO, FWA) | 52.005 | 89.478 | 114.700 |
| IM3+3ID | **SP Injection (MOBO)** | 52.977 | 100.905 | 124.791 |

Pemisahan SPI per brand tidak ada di feed baris produk; angka di atas total IM3+3ID.

**Temuan utama:** *SP HAPPY S PLUS V2* (3ID) 59.180 pcs MTD, nol di September, kemungkinan produk baru pengganti SP 3GB 3ID. Karena kelasnya `other`, ia **tidak masuk KPI SP** (3GB + injection), padahal volumenya 6x SP 3GB 3ID. Perlu keputusan owner (lihat §5).

## 3. Definisi yang dipakai di tiap menu

Kode definisi: **A** = semua SP MOBII (Zero, KPK, KOSONG, FWA, 3GB, other); **B** = SP 3GB saja; **D** = SP Injection MOBO; **KPI** = B + D (SP0 dan other tidak dihitung); **E** = A + D.

| Menu / scorecard | Label di layar | Def |
|---|---|---|
| Overall Performance · Achievement SP vs target | SP 3GB + injection | **KPI** |
| Overall Performance · Sell-In SP MTD | semua SP MOBII (tanpa injection) | **A** |
| Overall Performance · D-1 Sell-In SP, UAR Sell-In SP (qty > 0), tabel sp_mtd / sp_d1 / h_sp0 / h_zero | "Sell-In SP" | **A** (UAR = > 0 pcs) |
| DSE Productivity · SP Data Sell In, SP achievement, insentif | SP Data Sell In | **KPI** (toggle Termasuk di SP / Tanpa Injection) |
| DSE Productivity · UAR | Outlet sell-in SP data >= 5 pcs | **KPI** per outlet (`sp_uar5`; `sp_uar5_ns` = B saja) |
| Target Setting · Aktual SP MTD | vs Target Sell-In SP (IOH) | **KPI** (`dkSpPcs`); aktual belum dipisah IM3 / 3ID, target tersedia IM3 / 3ID / IOH |
| Penjualan ke Outlet · grup Starter Pack | Starter Pack + kolom SP Injection terpisah | **A**, D dipisah (toggle `pjSpiOn`; D tanpa baseline = "n/a (MTD saja)") |
| Penjualan · slab selector | SP ZERO + ORI 3GB / SP ZERO / SP ORI 3GB / Semua SP / SP Injection | subset A dan D |
| Penjualan · heat map % vs target harian | % target | **A vs target KPI** (tidak sebasis) |
| Sell-In Monitoring (MOBI) | SP Pieces Sold In, UAR 3 pcs | **A** (tanpa injection; UAR >= 3) |
| PT Partner · Alokasi / Territory | SP diterima MPC, fill-in ke DSE, sell-in ke outlet | **A**, split brand `ptBrand` |
| PT Partner · Performance | SP incl. injection per DSE | **KPI** (satu menu, dua definisi) |
| UAR menu · UAR Sell-In SP | SP | **A** |
| Gross Add | Sell-in SP (pcs) vs GA | **A** |
| Opportunity | Outlet tanpa GA dan / atau SP sell-in | **A** (nol di `c.SP[0]`, injection diabaikan) |
| Program & Tipe Outlet | Outlet >= 5 SP | **A** (semua produk SP MOBII, IM3+3ID) |
| Outlet & KRO Management (produk SP, slab pcs) | SP sell-in + injection | **E** |
| Stok Outlet (`mb_stock`) | Starter Pack; stok = estimasi arus | **E** (sell-out = GA) |
| Demand Customer | MOBO: SP Injection | **D** saja, di luar total demand |

## 4. Ketidakkonsistenan

1. Kata "SP" / "Sell-In SP" memuat **empat definisi** (A, KPI, E, A + D terpisah). Kartu bersebelahan di Overall Performance memakai A dan KPI.
2. **Target vs aktual tidak sebasis**: target SP (266.765 pcs) = SP 3GB + injection (konfirmasi owner 20 Okt), tetapi heat map Penjualan membandingkannya dengan A.
3. **UAR**: ambang 1 pcs (Overall), 3 pcs (Sell-In Monitoring), 5 pcs (DSE Productivity, Program); basis juga beda (A vs KPI).
4. `dkSp3()` jatuh ke `sp_pcs` (A) bila `sp3_pcs` tidak ada, sehingga KPI bisa diam-diam menjadi A.
5. **Brand**: IM3 dan 3ID dijumlah di hampir semua menu. Brand terpisah hanya di Penjualan (filter), PT Partner (`ptBrand`) dan target. Aktual KPI DSE tidak dipisah brand. SPI tidak punya brand di baris produk.
6. **S PLUS V2 (3ID)** tidak dihitung di KPI tetapi dihitung di semua menu basis A / E.
7. **Overlap nama produk**: "SP HAPPY 3GB 30D JABO" ada di MOBII (sell-in) dan MOBO (injection, harga Rp 290). Belum terbukti apakah satu pcs yang sama terhitung dua kali di basis E / KPI (sell-in ke outlet lalu di-inject outlet ke konsumen).
8. Baseline injection: LMTD dan FM September tersedia (`has_baseline`), tapi beberapa tampilan (Penjualan) tetap menandai "n/a (MTD saja)".
9. Tab `spi` di menu UAR sebenarnya SSO Gross Add (GA), bukan injection (label internal salah).

## 5. Pertanyaan keputusan owner

1. **S PLUS V2 (3ID, Rp 13.000)**: dihitung sebagai SP Data di KPI? (kalau ya, +59.180 pcs MTD, achievement 3ID naik tajam)
2. **SP Injection**: tetap ditambahkan ke SP sell-in (KPI sekarang), atau dipisah sebagai sell-out / aktivasi? Apakah SP yang sudah dijual MOBII lalu di-inject berisiko hitung ganda?
3. **Satu glosarium** untuk semua menu: usul tiga istilah baku: **SP Data Sell-In (KPI)** = 3GB + (S PLUS V2 bila disetujui) + Injection; **SP Sell-In semua (MOBII)** = A; **SP Zero** = dilaporkan terpisah. Semua kartu diberi label eksplisit, heat map target memakai KPI.
4. **UAR SP**: satu ambang (usul >= 5 pcs, basis KPI) di semua menu?
5. Perlu pemisahan IM3 / 3ID untuk aktual KPI (SPI dulu butuh field brand dari MOBO)?

## 6. Rencana perubahan (belum dikerjakan)

Setelah jawaban owner: (a) satu fungsi definisi SP di `app.js` dan builder; (b) ubah label kartu; (c) heat map target ke basis KPI; (d) samakan ambang UAR; (e) tambah `scripts/audit_sp.js`; (f) update CLAUDE.md. Tidak ada kode, feed, commit atau publish sampai ada persetujuan.

## 7. Validasi lanjutan dan keputusan owner (27 Okt 2026)

### 7.1 SP Injection per brand dan gabungan (dari `penjualan_feed`, cut 26 Okt)

| Brand | MTD Okt | LMTD Sep (1-26) |
|---|---:|---:|
| IM3 | 37.082 | 56.633 |
| 3ID | 9.617 | 33.425 |
| Brand belum terpetakan (id MOBO tidak ada di mapping) | 6.278 | 10.847 |
| **IM3+3ID (gabungan)** | **52.977** | **100.905** |

Jadi brand sebenarnya sudah ada di level outlet / MC (`mc_daily` dan `o.b`), koreksi untuk catatan §2 yang menyebut SPI tidak bisa dipisah. Yang belum ada: field brand di `dse_kpi_feed` (`spi_pcs`) dan di baris produk demand feed. Keputusan owner: **tampilkan per brand dan gabungan**; 11,9% SPI MTD masih tanpa brand dan harus tampil sebagai baris "Tanpa brand".

### 7.2 SP HAPPY S PLUS V2 (3ID, Rp 13.000): sejak kapan?

Dibaca langsung dari `DAILY_DATA_MOBII_202610.xlsb` (sheet `MTD_SP`, kolom `DT_xx`):

| Tanggal | Qty (semua id) | Catatan |
|---|---:|---|
| 16 Okt | 1 | satu pcs di MyTri Cell (master, MC-BEJI): kemungkinan uji coba |
| 23 Okt | 64.993 | muncul massal |
| 24 Okt | 27.330 | |
| 25 Okt | 10.700 | |
| 26 Okt | 0 | |

- Total file 103.024 pcs di 10 id; feed memuat 59.180 pcs di 9 id (id `SH254705`, 43.844 pcs, tidak ikut feed).
- Hampir semuanya bulk 1.000-25.000 pcs per id dalam 3 hari: 321959 (MC Bekasi Tengah, 29.082 pcs di feed), 149609 (master PJP, DSE Muhamad Imam Saptiaji, 13.600), SH053076 (5.999), 554521 (4.500), 284066 (2.400), 554179 (1.200), 84629 (998). **7 dari 9 id adalah non-PJP (adhoc)**, bukan retail biasa; polanya penyaluran massal ke akun distributor / sub-agen, bukan sell-in ke outlet.
- Kesimpulan: S PLUS V2 baru hadir sejak **23 Okt 2026** (16 Okt hanya 1 pcs). Karena baru 4 hari, belum ada baseline dan sulit disebut SP Data reguler. Rekomendasi: **jangan masukkan ke KPI sekarang**; tampilkan sebagai baris terpisah "SP HAPPY S PLUS V2" sampai owner memastikan (a) produk ini pengganti SP 3GB 3ID atau produk loading, (b) 7 id non-PJP tersebut bagian dari scope outlet-bound.

### 7.3 Hitung ganda MOBII sell-in dan MOBO injection

Perbandingan per (id outlet, nama produk) antara `MTD_SP` MOBII dan `SP_INJECTION` MOBO:

- Hanya 2 nama produk yang sama di kedua sumber (SP HAPPY 3GB 30D JABO dan SP HAPPY 5GB 14D REGIONAL); 4 pasangan id + produk yang sama.
- Keempat pasangan semuanya **SP HAPPY 3GB 30D JABO**, id berformat `1-1633...` (bukan id outlet biasa), dan semua pada hari yang sama:

| id | Tanggal | MOBII sell-in | MOBO injection |
|---|---|---:|---:|
| 1-163309552354 | 21 Okt | 3.247 | 3.248 |
| 1-163320592965 | 21 Okt | 2.897 | 2.900 |
| 1-163319981144 | 21 Okt | 73 | 73 |
| 1-163319981272 | 22 Okt | 1 | 1 |

- Qty sama persis (selisih 1-3 pcs) pada hari yang sama: **bukti kuat satu pergerakan yang sama tercatat dua kali** (sell-in di MOBII, lalu injection di MOBO). Totalnya 6.222 pcs MOBO = **11,7% SPI MTD**, dan 6.218 pcs di sisi MOBII.
- Dampak: di definisi KPI (3GB + Injection) dan basis E (semua SP + Injection) 6.2 rb pcs terhitung dua kali. Di luar 4 pasangan itu tidak ada tumpang tindih id + produk; 3.092 dari 5.747 id MOBO juga muncul di MOBII, tetapi dengan produk berbeda, jadi bukan hitung ganda.
- Usulan aturan: bila id + produk + tanggal sama di MOBII dan MOBO dengan qty selisih <= 1%, **qty MOBO dikeluarkan dari SP Injection** (hanya MOBII yang dihitung). Dampak SPI MTD -6.222 pcs (52.977 menjadi 46.755). Perlu persetujuan owner sebelum diterapkan.

### 7.4 Keputusan owner yang sudah ada

| Hal | Keputusan owner (27 Okt 2026) |
|---|---|
| Definisi per menu di §3 | Sesuai (A, KPI, E, A + SPI terpisah) |
| Target SP | Target mencakup SP Data + SP Injection (KPI) |
| UAR SP | 5 pcs di DSE Productivity dan Program; Sell-In Monitoring diberi **toggle 3 pcs / 5 pcs** |
| SP Injection | Masuk **sell-in ke outlet** dan **performa DSE** (tidak dipisah sebagai sell-out) |
| SPI per brand | Tampil per brand dan gabungan |
| S PLUS V2 | Tunggu hasil tanggal mulai (lihat §7.2) |
| Hitung ganda | Validasi lebih lanjut (lihat §7.3) |

### 7.5 Yang akan dikerjakan setelah persetujuan (belum dimulai)

1. Pisahkan IM3 / 3ID / tanpa brand di `spi_*` pada `dse_kpi_feed`, dan tampilkan per brand + gabungan di kartu SP.
2. Aturan deduplikasi MOBII-MOBO (§7.3) di builder + audit.
3. Heat map "% vs target harian" Penjualan memakai basis KPI (3GB + SPI) seperti target.
4. Toggle UAR 3 / 5 pcs di Sell-In Monitoring; tabel Overall UAR "SP > 0" diberi label eksplisit.
5. `dkSp3` tidak lagi jatuh diam-diam ke semua SP (tampilkan n/a bila `sp3_pcs` kosong).
6. Label eksplisit di setiap kartu SP (KPI / Semua SP / Semua SP + Injection), `scripts/audit_sp.js`, CLAUDE.md.

### 7.6 Keputusan 27 Okt 2026: S PLUS V2 masuk SP Sell-In

Owner: S PLUS V2 dihitung sebagai SP Sell-In (KPI), dan penjualannya ke konsumen masuk Sell-Out / MOBO Demand bila ada.
- Dikerjakan: `sp_class` (`build_dse_kpi_feed.py`) memberi kelas `3gb` pada nama berisi `S PLUS`. `sp3_pcs` total 14.861 menjadi 31.832 pcs (hanya outlet berDSE / PJP: terutama 149609, DSE Muhamad Imam Saptiaji 13.600 pcs); S PLUS di id non-PJP tetap di luar KPI DSE karena tidak punya DSE.
- Sell-Out: sheet MOBO (SP_INJECTION, RELOAD, VOUCHER, CVM, RECARGE) belum memuat produk S PLUS sampai 26 Okt, jadi belum ada qty sell-out. Begitu muncul di `SP_INJECTION` ia otomatis masuk SP Injection / Demand.
- Belum dikerjakan: aturan dedup §7.3 dan butir lain §7.5.

### 7.7 Dikerjakan (27 Okt 2026, belum di-commit)

1. **Dedup MOBII-MOBO**: `build_demand_feed.py` membaca MOBII `MTD_SP` / `LMTD_SP` dan membuang qty MOBO SP Injection yang sama (id + produk + hari, selisih <= max(3, 1%)). Oktober -6.222 pcs (SPI MTD 52.977 menjadi 46.755), September -4.906 pcs (FM 124.791 menjadi 119.885, LMTD 100.905 menjadi 98.437). Tercatat di `demand_feed` `metadata.spi_dedup`.
2. **SPI per brand**: `spb` di `dse_kpi_feed` (IM3 / 3ID / NB: SP Data dan SPI MTD, LMTD, Sep); kartu "SP Data Sell In" DSE Productivity menampilkan IM3, 3ID, tanpa brand dan gabungan. Jumlah brand = `sp3_pcs` / `spi_pcs`.
3. **Heat map Penjualan vs target**: seri harian Starter Pack = SP Data + Injection (`sk` di `penjualan_feed` + `c.SPI`), sebasis dengan target.
4. **UAR**: toggle 3 / 5 pcs di Sell-In Monitoring (`sellinUar`); label UAR Overall "semua SP MOBII, > 0 pcs".
5. **`dkSp3`** tidak lagi jatuh ke semua SP.
6. **Label** kartu SP diperjelas (D-1, UAR, Gross Add metrik); modul bersama `scripts/sp_defs.py`; `scripts/audit_sp.js` (16 pemeriksaan sesuai).
7. Hasil: render_check, audit_scorecard (164), audit_consistency (278), audit_ga lolos.
