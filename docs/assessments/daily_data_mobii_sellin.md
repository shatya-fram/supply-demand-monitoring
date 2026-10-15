# Asesmen Data: `DAILY_DATA_MOBII_202610.xlsb` (penjualan Sell-In harian MOBII)

**Lingkup**: dasar untuk menu **Morning DSE Briefing · Penjualan** (Sell-In produk ke outlet) dan, sebagai bonus, Tahap 1 pipeline (alokasi distributor → DSE) yang sebelumnya dianggap tidak ada di `raw/`.
**Ditulis**: 13 Okt 2026. Ini kontrak data untuk builder feed Penjualan; perubahan definisi harus diubah di sini dulu.
**Refresh 14 Okt 2026**: sumber sekarang `raw/Data as of 14 Oct /DAILY_DATA_MOBII_202610.xlsb` (dibuat 14 Okt 07:48). Perbedaan dari ekspor 13 Okt: kolom hits SP/VC bernama `DT_01..DT_31` (bukan `HITS_xx`), sheet `Sheet1` dan `Sanity_Check` hilang, data MTD berisi sampai **13 Okt**. Builder memilih file ini bila ada, menerima kedua nama kolom, dan menentukan cut otomatis dari hari MTD terakhir yang berisi data (sekarang 13). Angka di bawah ini adalah asesmen ekspor 13 Okt (cut 12).

**Sumber (asesmen awal)**: `raw/MOBI TRansfer Balance/DAILY_DATA_MOBII_202610.xlsb` (5,5 MB, dibuat 13 Okt 2026 15:06; saat diasesmen file sedang terbuka di Excel, ada lock file `~$DAILY_DATA_MOBII_202610.xlsb`, abaikan).
**Pembanding**: `website/data/territory_feed.js` (master 14.694 outlet), `raw/Outlet & Mapping/adhoc_outlet_im3_3id_data_gcp.xlsb` (17.465 IM3 + 18.337 3ID outlet Inner), laporan Physical Distribution dan MOBO balance (`raw/SP VC Sellin/`, `raw/MOBI TRansfer Balance/*_balance_*.csv`), `data/processed/sellin_feed.json`.

---

## 1. Struktur file

Enam sheet = 2 periode × 3 kategori produk. Format **lebar**: satu baris per `id_outlet × brand × product_name`, dengan satu kolom per tanggal.

| Sheet | Baris | Kolom | Isi | Hari berisi data |
|---|---:|---:|---|---|
| `LMTD_SP` | 29.161 | 65 | Starter pack, September | 1–30 Sep (6 Sep kosong, Minggu) |
| `LMTD_VC` | 44.579 | 65 | Voucher fisik, September | 1–30 Sep |
| `LMTD_SALMO` | 20.463 | 34 | Saldo Mobo (e-voucher), September | 1–30 Sep |
| `MTD_SP` | 1.980 | 65 | Starter pack, Oktober | **1–12 Okt** |
| `MTD_VC` | 3.825 | 65 | Voucher fisik, Oktober | **1–12 Okt** |
| `MTD_SALMO` | 6.608 | 34 | Saldo Mobo, Oktober | 1–12 Okt (11 Okt kosong, Minggu) |

Kolom: `id_outlet`, `brand` (IM3 / 3ID), `product_name`, lalu `HITS_01..HITS_31` dan `AMOUNT_01..AMOUNT_31` (SP, VC) atau hanya `AMOUNT_01..AMOUNT_31` (SALMO). Tidak ada kolom wilayah, DSE, atau tanggal; tanggal ada di nama kolom. Tidak ada nilai negatif. Tidak ada baris kosong.

Makna kolom (diverifikasi dari harga per unit = AMOUNT ÷ HITS yang konstan per produk):

| Kolom | Arti | Contoh |
|---|---|---|
| `HITS_dd` | kuantitas unit yang masuk ke node pada tanggal dd | SP ZERO: 37.931 unit @ Rp 10.000 |
| `AMOUNT_dd` | nilai rupiah pada tanggal dd | voucher 6G 6G 6G 2hr @ Rp 9.200; AON 5GB @ Rp 30.000 |
| SALMO `AMOUNT_dd` | saldo Mobo (Rp) yang ditransfer ke node; tidak ada kuantitas | E-Voucher Rp 2.226 M IM3 MTD |

Catatan produk: `V0 3in1 JABO_SUK_NewREG` (IM3) dan `VOUCHER PHYSICAL BLANK 3IN1` (3ID) adalah voucher fisik kosong @ Rp 500; secara kuantitas sangat besar (819.511 dan 232.715 unit MTD) tetapi nilainya kecil. Untuk KPI nilai jangan dicampur dengan voucher berisi; tampilkan sebagai "voucher blank" terpisah.

## 2. Kunci: `id_outlet` adalah id SALDOMOBO node penerima, bukan hanya outlet

`id_outlet` cocok ke `SALDOMOBO_ID` / `DEST_SALDOMOBO_ID` pada laporan Physical Distribution dan MOBO balance. Node penerima bisa outlet, node DSE/canvasser, node distributor (MPC), sub-distributor (MP3), SDP, atau stockist FWA. Jadi file ini memuat **seluruh rantai**: operator → MPC → DSE/MP3/SDP → outlet.

Klasifikasi tiap id (urutan: master outlet → mapping adhoc → nama node di laporan MOBI):

| Tier penerima | Cara dikenali |
|---|---|
| Outlet (master) | `id_outlet` = `outlet_id_im3` (IM3) atau `outlet_id_3id` (3ID) di master 14.694 outlet |
| Outlet (mapping, bukan master) | ada di `adhoc_outlet_im3_3id_data_gcp.xlsb` tetapi tidak terpetakan ke DSE/site di master |
| DSE / Canvasser node | nama node di laporan MOBI diawali `Canvasser_` (contoh `D3202501002` = Canvasser_PT-TANJUNG PRIOK) |
| MPC distributor node | diawali `MPC - OWNER_` (contoh `D426102067` = MPC JB-JAK-JAKARTA PUSAT) |
| MP3 / SDP / stockist | `_MP3`, `SDP_`, atau nama PT stockist FWA |
| Tidak dikenal | tidak ada di sumber mana pun |

## 3. Hasil per tier, MTD 1–12 Okt 2026 (Rp juta)

| Kategori | Brand | Outlet master | Outlet mapping | DSE node | MPC node | SDP / stockist / lain | Tidak dikenal | Total |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| SP | IM3 | 73,4 | 0 | 405,0 | 203,0 | 0,8 | 0 | 682,1 |
| SP | 3ID | 12,6 | 0,9 | 17,5 | 266,7 | 43,0 | 5,4 | 346,1 |
| VC | IM3 | 170,3 | 0,6 | 1.070,0 | 1.027,0 | 52,3 | 0 | 2.320,3 |
| VC | 3ID | 111,4 | 205,6 | 29,0 | 68,1 | 0 | 1,8 | 415,9 |
| SALMO | IM3 | 2.204,8 | 21,3 | 0 | 0 | 0 | 0 | 2.226,1 |
| SALMO | 3ID | 699,1 | 20,3 | 0 | 0 | 0 | 0 | 719,4 |

Bacaan:
- **Sell-In ke outlet** (tier outlet master + mapping) MTD: SP Rp 86,9 jt (7.940 unit), VC Rp 487,9 jt (194.537 unit, termasuk voucher blank), saldo Rp 2.945,5 jt. Outlet pembeli: SP 1.779 (IM3 1.420 + 3ID 359), VC 3.359, saldo 6.455. Kecocokan ke master di tier outlet 98–99 % berdasarkan nilai.
- **Alokasi / fill-in** (tier DSE + MPC + MP3/SDP) MTD: SP Rp 935,0 jt, VC Rp 2.246,4 jt. Ini stok yang masuk ke DSE dan distributor, bukan penjualan ke outlet; inilah Tahap 1 yang di rencana (`project-status-and-migration-plan.md`, Step 3) dicatat "tidak ada di raw/". Angka ini **tidak boleh dijumlahkan** dengan penjualan outlet.
- Saldo Mobo hanya ada di tier outlet (transfer ke saldo outlet), tanpa tier alokasi.
- September (LMTD) berpola sama: outlet master SP Rp 2.493 jt, VC Rp 9.539 jt, saldo Rp 25.703 jt; DSE node SP Rp 3.240 jt, VC Rp 7.649 jt. Ada tier "tidak dikenal" di LMTD_SP 3ID sebesar Rp 816 jt (177 id) yang perlu dicek ke tim MOBI (kemungkinan node yang sudah tidak aktif di Oktober).

## 4. Rekonsiliasi dengan feed Sell-In yang ada (`sellin_feed.json`, dari laporan Physical Distribution, 1–10 Okt)

| Kategori, brand | Feed lama (Rp jt) | MOBII daily tier outlet (Rp jt, 1–12 Okt) | Outlet pembeli lama → MOBII |
|---|---:|---:|---|
| SP IM3 | 28,6 | 73,4 | 738 → 1.420 (semua 738 ada di MOBII) |
| SP 3ID | 4,3 | 13,5 | 182 → 359 (semua ada) |
| VC IM3 | 126,9 | 170,9 | 1.982 → 2.502 (1.980 ada) |
| VC 3ID | 11,9 | 317,0 | 326 → 857 (310 ada) |
| Saldo IM3 | 1.674,0 | 2.226,1 | 3.373 → 4.231 (3.328 ada) |
| Saldo 3ID | 511,9 | 719,4 | 1.781 → 2.224 (1.723 ada) |

Laporan Physical Distribution hanya merekam transfer yang diinisiasi lewat MOBI (DSE/MPX/SDP → outlet) sampai 10 Okt; MOBII daily merekam semua stok yang masuk ke outlet sampai 12 Okt, apa pun pengirimnya. Outlet pembeli di feed lama hampir seluruhnya himpunan bagian dari MOBII daily, jadi kedua sumber konsisten dan MOBII daily adalah sumber yang lebih lengkap untuk menu Penjualan. Feed Sell-In lama tetap berguna untuk atribusi **pengirim** (DSE mana yang mengirim), yang tidak ada di MOBII daily.

## 5. Keterbatasan dan hal yang harus dijaga

1. **Tanggal cut**: MTD berisi 12 Okt, sedangkan semua feed lain berhenti di 11 Okt (`DAYS = 11`). Builder harus menerima parameter cut agar 12 Okt bisa disembunyikan untuk konsistensi, atau cut proyek dinaikkan ke 12 Okt sekaligus.
2. **LMTD vs MTD harus dibandingkan pada jumlah hari yang sama** (1–12 Sep vs 1–12 Okt), bukan September penuh.
3. Tidak ada dimensi wilayah di file. Branch, MC, kecamatan, site, DSE, DSO, HoA harus diambil dari master lewat `id_outlet`; outlet tier "mapping, bukan master" hanya punya MC/branch dari file adhoc, tanpa DSE.
4. `id_outlet` bertipe campur (angka dan teks seperti `SH030976`, `D426102067`, `1-183967641538`); normalisasi: string, trim, huruf besar, buang akhiran `.0`.
5. Voucher blank @ Rp 500 mendominasi kuantitas VC; pisahkan dalam tampilan.
6. Tier "tidak dikenal" kecil di MTD (Rp 7 jt) tetapi Rp 1.300 jt di LMTD; tampilkan sebagai baris "tidak terpetakan" agar total tetap rekonsil, jangan dibuang.
7. Pembacaan `.xlsb` di builder memakai parser stdlib yang sudah ada di `build_territory_management_catalogues.py` (`parse_xlsb_sheet_rows`), atau `pyxlsb` bila terpasang; tanpa pandas, sesuai aturan proyek.

## 6. Definisi yang diusulkan untuk menu Penjualan

| Istilah | Definisi |
|---|---|
| **Sell-In outlet** | baris tier Outlet (master + mapping). Kategori: SP (unit, Rp), VC berisi (unit, Rp), VC blank (unit), Saldo (Rp). |
| **Alokasi** (Tahap 1) | baris tier DSE / MPC / MP3 / SDP / stockist. Tab terpisah "Alokasi distributor → DSE", bukan dijumlahkan ke Sell-In outlet. |
| **MTD** | 1 Okt sampai tanggal cut (11 atau 12 Okt). **LMTD** = tanggal yang sama di September. Growth = MTD ÷ LMTD − 1. |
| **Run-rate** | rata-rata harian hari kerja MTD × jumlah hari kerja bulan; proyeksi akhir bulan dibanding September penuh. |
| **Outlet aktif beli** | outlet dengan ≥ 1 hari bernilai > 0 pada kategori itu dalam MTD; cakupan = outlet aktif ÷ outlet master di teritori. |
| **Hari sejak beli terakhir** | tanggal cut − tanggal terakhir bernilai > 0; slab 0–2, 3–6, 7–10, belum beli MTD (selaras dengan slab kunjungan PJP). |
| **Teritori** | mengikuti filter bar seperti menu PJP: tanpa filter → per Area, Branch/HoA → per MC, MC → per DSE (DSE outlet dari master), DSE → per outlet. |

Struktur menu yang diusulkan (satu feed `website/data/penjualan_feed.js`, dibangun oleh `scripts/build_penjualan_feed.py`):

1. **Ringkasan**: kartu KPI MTD vs LMTD per kategori (SP, VC berisi, VC blank, Saldo) nilai dan unit, growth, run-rate, outlet aktif beli, hari terakhir ada transaksi; tren harian 1–12 Okt vs 1–12 Sep.
2. **Per Teritori**: tabel regroup otomatis (Area → MC → DSE → outlet) dengan nilai per kategori, growth vs LMTD, outlet aktif ÷ outlet master, dan heatmap harian nilai Sell-In per teritori (pola yang sama dengan heatmap PJP).
3. **Produk**: mix per produk dan brand (unit, Rp, outlet pembeli, harga/unit), MTD vs LMTD.
4. **Outlet**: daftar outlet dengan nilai per kategori, tanggal beli terakhir, slab hari sejak beli, dan silang dengan kunjungan PJP (dikunjungi tetapi tidak beli / beli tanpa kunjungan).
5. **Alokasi distributor → DSE** (Tahap 1): stok masuk ke node DSE dan MPC per hari, dibanding Sell-In outlet DSE tersebut (stok di tangan = alokasi − sell-in), dibangun dari tier non-outlet file yang sama.

Keputusan pemilik (13 Okt 2026): **cut 12 Okt**; **VC blank dihitung unit dan nilai dengan harga IM3 Rp 500 / 3ID Rp 300** (nilai di file untuk blank 3ID @ Rp 500 ditimpa); **outlet adhoc masuk laporan** memakai MC/kecamatan/site dari file adhoc dan Branch/HoA/DSO dari hierarki master MC-nya (outlet adhoc tidak punya DSE: dikelompokkan sebagai "UNASSIGNED (adhoc)").

## 7. Rekonsiliasi dengan sheet `Sanity_Check` (ditambahkan ke file 13 Okt 15:51)

Sheet `Sanity_Check` menjumlahkan **semua baris** tiap sheet (LMTD dipotong ke hari 1–12) tanpa membedakan penerima, dan memakai nilai voucher blank apa adanya. Menu Penjualan memisahkan penerima. Keduanya rekonsil sampai rupiah (Rp juta):

| Komoditas | Periode | Sell-In ke outlet (menu) | Alokasi DSE/MPC/MP3/SDP | Node lain / tidak dikenal | Koreksi harga blank | = Sanity_Check |
|---|---|---:|---:|---:|---:|---:|
| SP | MTD | 87,0 | 892,1 | 49,2 | 0 | 1.028,3 |
| SP | LMTD | 864,0 | 1.835,3 | 484,7 | 0 | 3.184,1 |
| VC | MTD | 480,2 | 2.206,0 | 3,4 | +46,5 | 2.736,2 |
| VC | LMTD | 3.962,4 | 4.067,4 | 182,1 | −181,0 | 8.030,9 |
| SALMO | MTD | 2.945,5 | 0 | 0 | 0 | 2.945,5 |
| SALMO | LMTD | 9.300,8 | 0 | 0,2 | 0 | 9.301,0 |

Koreksi harga blank: file menilai blank 3ID Rp 500/unit di kedua periode, blank IM3 Rp 500/unit di Oktober tetapi **Rp 300/unit di September**; aturan pemilik (IM3 500, 3ID 300) diterapkan ke kedua periode supaya growth blank like-for-like. `Sanity_Check` sendiri menandai "MTD outlet base is under half of LMTD – check data completeness" (SP 9,6 %, VC 17,2 %, SALMO 32,3 % dari outlet September) dan growth total −67 %; jadi penurunan Oktober ada di sumber, bukan akibat pemisahan tier. Kartu rekonsiliasi yang sama ada di tab Ringkasan (lingkup seluruh region, semua brand). Builder melewati sheet non-data (`Sheet1`, `Sanity_Check`).

## 8. Implementasi (13 Okt 2026)

- Builder `scripts/build_penjualan_feed.py` (stdlib, parser xlsb dari `build_territory_management_catalogues.py`; nama sheet dibaca dari `xl/workbook.bin`) → `website/data/penjualan_feed.js` (6,1 MB) dan `data/processed/penjualan_feed.json`.
- Isi feed: `outlets` (16.420 outlet yang bertransaksi 1–12 Okt atau 1–12 Sep; fakta per kategori dalam array `[mq, mv, lq, lv, fq, fv, hari_terakhir_mtd, hari_terakhir_lmtd, hari_aktif_mtd, hari_aktif_lmtd, md=[[hari, nilai]]]`), `mc_daily` (deret harian MTD dan LMTD per MC × brand × kategori), `products` (72), `allocation` (301 node non-outlet dengan `md` dan `ld` berisi qty), `tiers` (rekonsiliasi per tier), `metadata` (cut, hari, harga blank, jumlah outlet master per Area/MC/DSE, hierarki MC).
- Hasil MTD 1–12 Okt (Sell-In ke outlet): SP Rp 87,0 jt · Voucher isi Rp 399,3 jt · Voucher blank Rp 80,9 jt · Saldo Rp 2.945,5 jt. LMTD hari yang sama: SP Rp 864,0 jt · VCF Rp 3.423,9 jt · VCB Rp 538,5 jt · Saldo Rp 9.300,8 jt. Alokasi non-outlet MTD: SP Rp 892,1 jt · VCF Rp 1.809,0 jt · VCB Rp 397,0 jt.
- **Sinyal bisnis yang harus dibaca hati-hati**: nilai Sell-In ke outlet Oktober 1–12 hanya sekitar 10 % (SP), 12 % (VCF) dan 32 % (saldo) dari hari yang sama di September. File MTD_SP memang jauh lebih tipis (1.980 vs 29.161 baris). Pola ini konsisten dengan catatan "anjloknya pasokan stok di awal bulan" pada data akuisisi Oktober di sesi Antigravity; tampilan menunjukkannya apa adanya, dengan deret harian supaya terlihat kapan pasokan mulai masuk lagi.
- Menu **Morning DSE Briefing · Penjualan** (`viewPenjualan`, dipanggil dari placeholder `viewMbPenjualan`): tab Ringkasan, Per Teritori (regroup otomatis Area → MC → DSE → outlet, override tersedia), Heatmap Harian (nilai per hari, Detail turun level), Produk, Outlet (beli terakhir, hari sejak, belum beli MTD, silang visit PJP), Alokasi Distributor → DSE. Filter: bar Branch/HoA/MC, brand, kategori, kotak cari. Render check memuat 33 status menu ini.

## 9. Tata letak detail: band, scorecard, kolom performa di depan (13 Okt 2026, permintaan pemilik)

- **Band "Area selection"** di atas isi menu menampilkan sekali teritori yang dipilih (Branch, HoA, MC, DSE, brand, kategori). Kolom induk (misal "MC · DSE") pada tabel dan heatmap **disembunyikan bila semua baris punya induk yang sama**, supaya tidak diulang per baris.
- **Scorecard** tampil di bawah band, sebelum tabel/heatmap: per komoditas SP, Voucher (isi + blank), Saldo dan Total: nilai MTD vs LMTD dan growth, qty MTD vs LMTD dan growth, **UAR** (unique active retailer = outlet dengan nilai > 0) MTD vs LMTD dan growth, September penuh (nilai, qty, UAR), **sebaran** nilai September penuh antar komoditas (bar dan persen), dan run-rate Oktober.
- **Kolom performa di depan**: pada tab Per Teritori, Heatmap Harian dan Outlet, kolom Sep penuh · MTD · LMTD · Growth berada tepat setelah nama entitas, sebelum kolom harian, dan mengikuti kategori yang dipilih.
- Pola yang sama diterapkan di menu DSE Visits & Beat Plans (tab PJP Execution dan Daily Heatmap): band Area selection, scorecard PJP (rencana, terlaksana, hit %, rata-rata per hari aktif, produktif, outlet divisit / belum, site tanpa visit, hari terbaik dan terburuk) saat ada teritori terpilih, dan kolom Planned · Executed · Hit % di depan hari.

## 10. Matriks slab per Area dan MC (14 Okt 2026, permintaan pemilik)

- Menu diberi nama **Penjualan ke Outlet**. Tab baru **Matriks Slab**: baris = Area (subtotal) › Micro Cluster, sel = jumlah outlet yang total Sell-In MTD-nya (1–12 Okt) jatuh di slab itu, dengan persen terhadap outlet master di baris.
- Komoditas dan slab:
  - **Starter Pack (pcs)**: 0 (zero), 1, 2–3, 4–5, 6–10, 11–20, 21–50, 51–100, > 100. Produk: default **SP ZERO + ORI 3GB** (nama mengandung "ZERO", atau "ORI" dan "3GB"), pilihan SP ZERO saja, SP ORI 3GB saja, semua SP, atau satu produk tertentu.
  - **Voucher isi (pcs)**: slab yang sama; kategori produk voucher bisa dipilih dari daftar (semua voucher isi / satu produk). Voucher blank tidak termasuk.
  - **Saldo Mobo (Rp)**: 0, 1–150 Rb, 151–300 Rb, 301–500 Rb, 501 Rb–1 Jt, 1–2 Jt, 2–5 Jt, 5–10 Jt, 10–20 Jt, 20–50 Jt, > 50 Jt.
- Slab 0 = outlet master di MC tanpa Sell-In MTD pada produk terpilih (outlet master − outlet master yang membeli). Outlet adhoc yang membeli masuk slab ≥ 1 dan kolom "Outlet beli", tetapi tidak menambah basis outlet master.
- Untuk itu feed membawa kuantitas per outlet per produk: `outlets[].p = {indeks produk: [mq, mv, lq, lv]}` dan `products[].i` sebagai indeks (feed 7,2 MB). Filter Brand dan bar Branch/HoA/MC berlaku; MC tanpa pembeli tetap tampil dengan basisnya.

Tambahan (14 Okt 2026): tab Matriks Slab punya dua matriks. **Outlet** seperti di atas. **DSE**: sel = jumlah DSE yang total Sell-In MTD seluruh outlet master binaannya jatuh di slab itu; basis = DSE master per MC dari master teritori (`TERRITORY_FEED.outlets.dse_name`, DSE ditempatkan di MC tempat outletnya paling banyak); slab SP/voucher untuk DSE: 0, 1, 2–10, 11–20, 21–30, 31–50, > 50 pcs; saldo memakai slab rupiah yang sama. Slab 0 = DSE yang outlet binaannya tidak membeli produk terpilih. Outlet adhoc tidak punya DSE sehingga tidak ikut matriks DSE.

**Update 15 Okt 2026**: tab "Alokasi Distributor → DSE" dihapus dari menu Penjualan ke Outlet atas permintaan pemilik. Baris node non-outlet (DSE, MPC, MP3, SDP, stockist) tetap ada di feed (`allocation`) dan di kolom rekonsiliasi Sanity_Check, tetapi tidak ditampilkan sebagai tabel. Tab penjualan di Ringkasan Performance dinamai "Penjualan Menu" dan memuat menu Penjualan ke Outlet yang sama (Ringkasan, Per Teritori, Heatmap Harian, Matriks Slab, Produk, Outlet).

**Update 15 Okt 2026 · Top Produk**: `products[]` di feed Penjualan bertambah `fq`, `fv`, `fo` (qty, nilai dan jumlah outlet pembeli di September penuh, hari 1–30, hanya tier outlet; voucher blank memakai harga repricing). Total produk September penuh = Rp 45,16 M dan direkonsiliasi ke file: untuk SALMO dan SP, jumlah tier outlet + node alokasi sama dengan total semua id di sheet LMTD (SALMO Rp 28,909 M; SP Rp 8,959 M). Angka ini sekitar 3% lebih besar daripada `fv` di baris outlet (Rp 43,79 M) karena baris outlet sengaja membuang outlet yang hanya aktif setelah tanggal cut di September. Jumlah produk di feed 72 → 80 (produk yang hanya terjual pada hari 14–30 September). MTD dan LMTD tidak berubah. Dipakai oleh Penjualan ke Outlet › Produk › Top Produk (top 10 menurut nilai, outlet pembeli atau qty; se-region).

**Update 15 Okt 2026 · SP Injection masuk Sell-In (permintaan pemilik)**: kategori `SPI` ditambahkan ke `outlets[].c` di feed Penjualan, bersumber dari `data/processed/demand_feed.json` (sheet `MTD_SP_INJECTION` di DAILY_DATA_MOBO). `mq` = pcs, `mv` = Rupiah, dipotong sampai `cut_day` (13 Okt) agar sejajar dengan MOBII; dicocokkan lewat kunci outlet `k`. **MTD saja**: `lq/lv/fq/fv = 0` dan `metadata.spi.has_baseline = false` sampai LMTD dan bulan penuh disiapkan. Outlet yang hanya punya SP Injection ditambahkan sebagai baris outlet. Urutan jalan: `build_demand_feed.py` sebelum `build_penjualan_feed.py` (sudah diatur di `daily_update.py`).
- Di aplikasi: toggle **Termasuk SP Injection / Tanpa** (default termasuk) di bar filter Penjualan ke Outlet; kolom SP Injection di Per Teritori, Heatmap Harian dan Outlet; grup SP Injection di Scorecard; komoditas **SP Injection (pcs)** di Matriks Slab (outlet dan DSE). Total Sell-In, UAR dan run-rate memuat SP Injection; **Growth dan Gap ke Sep penuh dihitung tanpa SP Injection** (like-for-like) sampai baseline tersedia. Setelah baseline diisi, set `has_baseline = true` di builder.
- SP Injection dihapus dari Performance Outlet (Demand); total demand tidak berubah. Tab UAR "SP Sell-Out / Gross Add" di menu lain masih memakai feed demand dan tidak diubah. Produk SP Injection per SKU belum masuk tab Produk.
