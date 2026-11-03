# Assessment · Restrukturisasi Gross Add: GA by Tagging dan GA by Site Location dengan lapis circle Jaya (24 Okt 2026)

**Status: assessment sebelum implementasi dan sebelum commit** (CLAUDE.md §2). Tidak ada kode aplikasi yang diubah. Periode 1–21 Okt 2026; sumber: `rguga_daily_outlet_202610.csv` (RGU GA per MSISDN, 1.416.785 baris), `Daily_RGUGA_OUTLET_202610.xlsb` (tagging, cut 21 Okt), `GA by Fav Locs/Daily_RGUGA_Kecamatan_202610.xlsb` dan `adhoc_rguga_daily_kec_202610.xlsb` (taksonomi region resmi, GA site location harian). Inner Jakarta (IJ) = 120 kecamatan (Purwakarta dikeluarkan, 24 Okt).

## 1. Permintaan

- **GA by Tagging** = semua RGU GA yang berasal dari produksi (sell-in) outlet IJ. Scorecard ditambah: **total RGU GA vs LMTD**; **di-tag IJ dan di-aktivasi di IJ**; **di-tag IJ, aktivasi di luar IJ tetapi masih circle Jaya**; **di-tag IJ, aktivasi di luar Jaya** (Jawa Timur, Jawa Tengah, Sumatera, Kalimantan dst.). Semua berdasarkan RGU GA site location.
- **GA by Site Location** = semua RGU GA yang terjadi di site IJ, dilacak sumber pengirimnya: sesama IJ (MC sama, Area sama); sesama IJ beda SA (Area); sesama circle Jaya bukan IJ (West Java, Outer Jakarta); tagging dari luar Jaya (Jawa Timur, Jawa Tengah, Sumatera, Kalimantan dst.).

## 2. Definisi circle Jaya dari data

Workbook Fav Locs memberi taksonomi region untuk **825 kecamatan** (`kec_kabkot` → region, area, branch, MC): **INNER JAKARTA** (7 area: Central North, East, West, South Jakarta Depok, Kota Bekasi, Kab Bekasi, Karawang), **OUTER JAKARTA** (11 area: Tangerang, Kota Tangerang, Kota Tangsel, Serang Cilegon, Pandeglang Lebak, Bogor East, Bogor West, Cianjur Utara, Cianjur Selatan, Sukabumi Barat, Sukabumi Timur) dan **WEST JAVA** (12 area: Kab Bandung, Kota Bandung, Bandung Barat Cimahi, Cirebon, Indramayu, Majakuning, Ciamis, Garut, Sumedang, Subang, Purwakarta, Tasikmalaya). **Circle Jaya = tiga region ini** (Banten masuk Outer Jakarta). Kecamatan yang tidak ada di 825 kunci itu berada **di luar Jaya**. Catatan: workbook menandai `SUKASARI|PURWAKARTA` (7 GA tagging IJ) sebagai Inner Jakarta; sesuai keputusan owner 24 Okt kecamatan itu diperlakukan sebagai bukan IJ (West Java).

## 3. Hasil: GA by Tagging (GA di-tag IJ, 160.523 baris di CSV; Daily_RGUGA 160.384, selisih 0,09%)

| Di-aktivasi di | GA | % | Rincian |
|---|---:|---:|---|
| **Inner Jakarta** (site IJ) | 104.589 | 65,2% | MC sama 56.030 · Area sama MC lain 26.635 · Area IJ lain 21.924 |
| **Circle Jaya bukan IJ** | 34.080 | 21,2% | Outer Jakarta 23.158 (Bogor 8.727, Tangerang 3.767, Kota Tangerang 2.932, Kota Tangsel 1.835, Kota Bogor 1.740, Cianjur 1.252) · West Java 10.165 (Bandung 1.983, Kota Bandung 1.486, Cirebon 1.027, Bandung Barat 834, Garut 707) · kecamatan Jaya belum terpetakan 757 |
| **Luar Jaya** | 10.310 | 6,4% | Kalimantan 2.464 · Sulawesi 2.354 · Sumatera 1.812 · Jawa Tengah 1.519 · Jawa Timur 1.232 · Bali & Nusa Tenggara 331 · DI Yogyakarta 98 · Maluku & Papua 49 · provinsi belum terpetakan 451 |
| Belum ada site aktivasi | 11.544 | 7,2% | umumnya belum ada usage |
| **Total** | **160.523** | 100% | |

**Total vs LMTD** (Daily_RGUGA, cut 21 Okt): 160.384 vs 158.905 = **+0,9%**. Rincian di atas **tidak punya LMTD** (file site hanya Oktober); kartu rincian menampilkan n/a untuk LMTD.

## 4. Hasil: GA by Site Location (GA aktivasi di site IJ, 140.359 baris)

| Sumber pengirim | GA | % | Keterangan |
|---|---:|---:|---|
| (a) Sesama IJ, **Area sama** | 82.665 | 58,9% | MC sama 56.030 · MC lain di area sama 26.635 |
| (b) Sesama IJ, **beda SA (Area)** | 21.924 | 15,6% | |
| (c) **Circle Jaya bukan IJ** (outlet berlokasi di Outer Jakarta / West Java) | 11.880 | 8,5% | Outer Jakarta 10.743 · West Java 1.137 |
| (d) **Luar Jaya / outlet ber-ID tanpa atribut wilayah** | 13.571 | 9,7% | lihat §5: lokasi outlet tidak ada di file |
| (e) Tanpa ID outlet | 10.319 | 7,4% | tidak bisa dilacak |
| **Total** | **140.359** | 100% | |

**Total vs LMTD** (workbook Fav Locs, IJ site location): 1–20 Okt 131.770 vs 127.796 (**+3,1%**); sampai 21 Okt ≈ 140.359 vs 137.288 (Sep 1–21) = **+2,2%** (angka 21 Okt dari CSV; selisih kecil karena CSV mengeluarkan Purwakarta, 17 GA). Rincian sumber tidak punya LMTD.

## 5. Keterbatasan penting: lokasi outlet "luar Jaya"

File RGU GA per MSISDN memuat atribut wilayah (area, MC, kecamatan, kabupaten) **hanya untuk outlet di circle Jaya**. Outlet dengan `outlet_id` tetapi tanpa atribut (13.571 GA di site IJ; 971.152 baris nasional) tidak punya lokasi. **Uji asumsi "tanpa atribut = di luar Jaya":** 88,7% aktivasi mereka terjadi di luar Jaya (outlet Jaya ber-atribut: 5,2% di luar Jaya), jadi asumsi itu kuat secara agregat, tetapi **pulau / provinsi asal tidak diketahui** (tidak ada kolom lokasi).

**Perkiraan asal (inferensi)** untuk 13.571 GA itu: provinsi aktivasi dominan dari seluruh GA outlet yang sama: Outer Jakarta 5.443 (40%) dan West Java 535 (4%) berarti sebenarnya outlet **Jaya** yang atributnya kosong; luar Jaya: Jawa Timur 2.455, Sumatera 1.545, Jawa Tengah 1.082, Sulawesi 217, Bali & Nusa Tenggara 99, DI Yogyakarta 40, Kalimantan 30, belum terpetakan 1.035; tidak pasti (semua aktivasinya di IJ) 1.088. **Koreksi (24 Okt, uji file sell-in / tagging Jaya, bagian 9):** ke-1.182 outlet itu (13.571 GA) **tidak ada** di file sell-in / tagging circle Jaya (55.394 outlet Inner, Outer Jakarta dan West Java), jadi **semuanya outlet di luar circle Jaya**; dugaan bahwa sekitar 6 ribu di antaranya outlet Jaya (Outer Jakarta dan West Java) **tidak benar**. Seluruh 13.571 GA masuk kartu (d) luar Jaya; hanya pembagian provinsinya yang tetap perkiraan.

Baris **tanpa ID outlet** (55.531 nasional; 10.319 di site IJ) tidak bisa diklasifikasikan: 48% aktivasinya di luar Jaya, 18,6% di IJ; ditampilkan terpisah sebagai "tidak teridentifikasi".

## 6. Usulan struktur tampilan

**Basis Outlet sell-in (GA by Tagging), tab Ringkasan:** baris kartu baru di atas kartu yang ada, semua bisa diklik (top 20 lokasi tujuan, jumlah outlet IJ dan RGU GA, pola `gl|` yang sudah ada):
1. **Total RGU GA tagging IJ** vs LMTD (160.384, +0,9%);
2. **Di-tag IJ, diaktivasi di IJ** (104.589, 65,2%; sub MC sama / area sama / area lain);
3. **Di-tag IJ, diaktivasi di luar IJ dalam circle Jaya** (34.080, 21,2%; sub Outer Jakarta dan West Java);
4. **Di-tag IJ, diaktivasi di luar Jaya** (10.310, 6,4%; sub Kalimantan, Sulawesi, Sumatera, Jawa Tengah, Jawa Timur, lainnya);
5. **Belum ada site aktivasi** (11.544, 7,2%) agar total = 100%.

**Basis Site Location GA, tab Ringkasan:** lima kartu pelacak sumber menggantikan lima kartu sekarang: **Total site location** vs LMTD; **(a) sesama IJ Area sama** (sub MC sama / MC lain); **(b) sesama IJ beda SA**; **(c) circle Jaya bukan IJ** (Outer Jakarta, West Java); **(d) luar Jaya** (outlet ber-ID tanpa atribut, dengan perkiraan provinsi) dan **(e) tanpa ID outlet**. Tabel Area kemasukan, top kecamatan / site, dan popup mengikuti kelas baru.

**Data yang perlu dibangun:** (1) CSV kecil `data/catalogues/jaya_kecamatan_region.csv` (825 kecamatan → region, area, branch, MC) dari workbook Fav Locs, dibaca builder site; (2) `build_ga_site_feed.py` menambah kelas tujuan (IJ / Outer Jakarta / West Java / luar Jaya per pulau / tanpa site) untuk GA tagging IJ dan kelas asal (a–e) untuk GA site IJ, plus inferensi provinsi asal per outlet; (3) kecamatan Jaya yang belum ada di 825 kunci (757 GA) dipetakan lewat kabupaten; (4) audit_ga.js dan render_check.js: setiap kelas dijumlahkan ke total (160.523 dan 140.359), kartu = hitung ulang, popup ≤ 20 baris.

## 7. Pertanyaan untuk owner sebelum implementasi

1. **Circle Jaya = Inner Jakarta + Outer Jakarta + West Java** (Banten di dalam Outer Jakarta) menurut Fav Locs: benar?
2. Outlet ber-ID tanpa atribut (13.571 GA): tampilkan sebagai "luar Jaya (perkiraan provinsi dari aktivasi)", dan 6.0 ribu yang kemungkinan outlet Jaya dipindah ke kartu (c)? Atau tetap satu bucket "tanpa lokasi outlet"?
3. "Sesama IJ (MC sama, Area sama)" saya artikan Area sama (MC sama + MC lain di area sama) dengan sub-baris; "beda SA" = area IJ lain. Sesuai?
4. Kartu rincian tanpa LMTD (file site hanya Oktober): n/a; hanya total yang dibandingkan dengan LMTD. Sesuai?
5. Kecamatan Sukasari|Purwakarta: tetap ditandai West Java (bukan IJ).

## 8. Dasar penentuan lokasi outlet dan GA di IJ dari outlet luar Jaya

**Dua dasar yang berbeda (bukan longitude / latitude):**

1. **Outlet dengan atribut wilayah (outlet circle Jaya):** lokasi dari kolom `outlet_kecamatan` dan `outlet_kabkot`; kecamatan dicocokkan dengan taksonomi region workbook Fav Locs (825 kecamatan) untuk menentukan Inner Jakarta, Outer Jakarta atau West Java. Kolom longitude dan latitude outlet ada tetapi tidak dipakai untuk klasifikasi region.
2. **Outlet tanpa atribut (luar Jaya):** kecamatan, kabupaten, longitude dan latitude **kosong**, sehingga lokasi outlet tidak ada. Perkiraan memakai **lokasi aktivasi**: semua GA outlet itu di seluruh file nasional dikelompokkan menurut provinsi tempat aktivasi (provinsi dari daftar nama kabupaten yang disusun untuk analisa ini), dan provinsi dengan aktivasi terbanyak dianggap asal outlet. Ini perkiraan dan lemah bila GA outlet tersebar (1.088 GA ditandai "tidak pasti", 1.035 GA provinsinya belum terpetakan).

**Apakah ada GA di Inner Jakarta dari outlet di Sulawesi, Kalimantan, Sumatera, Jawa Timur dsb?** Ada, melalui 13.571 GA (9,7% dari 140.359) yang dijual outlet ber-ID tanpa atribut. Perkiraan asal outlet:

| Perkiraan asal outlet | GA |
|---|---:|
| Jawa Timur | 2.455 |
| Sumatera | 1.545 |
| Jawa Tengah | 1.082 |
| Sulawesi | 217 |
| Bali & Nusa Tenggara | 99 |
| DI Yogyakarta | 40 |
| Kalimantan | 30 |
| Maluku & Papua | 1 |
| Provinsi belum terpetakan | 1.035 |
| **Subtotal luar Jaya (perkiraan)** | **≈ 6.500** |
| ~~Kemungkinan outlet Jaya dengan atribut kosong~~ (Outer Jakarta 5.443, West Java 535): **dikoreksi di bagian 9, bukan outlet Jaya**; aktivasinya di Outer Jakarta / West Java tetapi outlet penjualnya di luar Jaya | 5.979 |
| Tidak pasti (semua aktivasi outlet itu di IJ) | 1.088 |

GA dari outlet Sulawesi dan Kalimantan ke IJ hampir tidak ada; arah sebaliknya (GA di-tag IJ yang diaktivasi di Sulawesi 2.354 dan Kalimantan 2.464) jauh lebih besar. Data lokasi outlet nasional (kecamatan atau lat/long outlet luar Jaya) belum ada di `raw/`; bila tersedia, perkiraan ini menjadi fakta.

## 9. Tanggal tagging / sell-in: apakah tersedia?

**Klarifikasi:** tabel di atas bukan "tagging terakhir di luar IJ". Setiap MSISDN di file hanya punya **satu outlet penjual (outlet tagging)** dan **satu tanggal: tanggal GA / aktivasi (`ga_dt`)**. Tidak ada tanggal tagging atau sell-in, nomor seri SIM atau batch per MSISDN, sehingga **tanggal tagging per MSISDN tidak bisa diberikan** dari file ini. "Perkiraan asal outlet" hanyalah dugaan di mana outlet itu berada (lokasi outlet tidak ada di file).

**Sumber tanggal di level outlet:** file `IOH SELL IN (D-2) & OUTLET LATEST TAGGING (D-1) 21 OCT UPDATE 2026.csv` memuat per outlet per hari per produk: `SELLIN` (sell-in ke outlet) dan `RET_TAG` (outlet tagging, `qty_ga`), 1–21 Okt, **hanya circle Jakarta Raya** (Inner Jakarta 77.129 baris, Outer Jakarta 94.054, West Java 57.063; 55.394 outlet). Ini memberi tanggal sell-in / tagging per **outlet**, bukan per MSISDN.

**Uji:** 1.182 outlet ber-ID tanpa atribut yang menghasilkan 13.571 GA di site IJ **tidak ada satu pun** di file tersebut. Dua arti: (1) tidak ada tanggal sell-in / tagging untuk outlet luar Jaya di data yang ada; (2) mereka memang outlet **di luar circle Jaya** (bukan outlet Jaya yang atributnya kosong).

**Yang bisa dikerjakan:** untuk outlet Jaya (sumber a, b dan c, serta GA by Tagging) kolom "sell-in / tagging terakhir" per outlet dari file ini dapat ditambahkan di popup (tanggal terakhir dan qty), dengan catatan bahwa itu level outlet. Untuk outlet luar Jaya dan tanpa ID outlet kolomnya n/a.
