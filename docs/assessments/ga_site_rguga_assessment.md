# Assessment · `Site_rguga_daily_outlet_202610.csv` (GA per MSISDN, site aktivasi vs outlet tagging)

Dinilai 22 Oct 2026, sebelum ada perubahan aplikasi (CLAUDE.md §2). Tidak ada kode aplikasi, skema atau feed yang diubah. Script penilaian: `scripts/assess_site_rguga.py` (hanya membaca; menulis CSV agregat ke `docs/assessments/ga_site_rguga/`, tanpa MSISDN). Angka di bawah dihitung dari file mentah `raw/GA (for upload by VIctor) /Site_rguga_daily_outlet_202610.csv` dan dicocokkan dengan `ga_feed` (Daily_RGUGA_OUTLET_202610, cut 20 Okt).

## 1. Ringkasan (baca ini dulu)

1. **File ini nasional, bukan hanya Inner Jakarta.** 1.335.300 baris = 1.335.300 MSISDN unik (tanpa duplikat), 1–20 Okt 2026, IM3 910.980 dan 3ID 424.320. Satu baris = satu RGU GA dengan **dua lokasi**: outlet yang menjualnya (`outlet_*`, tagging sell-in) dan site tempat SIM diaktivasi (`activation_*`).
2. **GA Inner Jakarta menurut site aktivasi = 131.173 pcs** (kecamatan aktivasi termasuk 121 kecamatan IJ; IM3 87.562, 3ID 43.611; 5.493 site). Ini angka kinerja DSO dan HoA. 131.173 itu memakai semua baris. Dengan aturan "usage > 25 MB" angkanya **105.544**.
3. **GA Inner Jakarta menurut tagging outlet = 153.094 baris** (cocok dengan Daily_RGUGA 152.825; lihat §5). Hanya **63,3%** dari GA outlet IJ itu benar-benar aktivasi di kecamatan IJ (96.921); **26,4%** (40.400) aktivasi di luar IJ dan **10,3%** (15.773) belum punya site aktivasi.
4. **Asal 131.173 GA di site IJ:** 96.921 (73,9%) dari outlet tagging IJ dan **34.252 (26,1%) dari outlet non-IJ** (barang masuk dari luar).
5. **Temuan penting untuk dashboard:** basis "Site / lokasi" yang sekarang memakai kolom kecamatan, micro cluster dan area di Daily_RGUGA. Kolom itu sama persis dengan `outlet_*` di file baru, artinya **lokasi outlet, bukan lokasi aktivasi**. Basis site yang sebenarnya hanya bisa dihitung dari file ini.
6. **Definisi GA perlu dikonfirmasi:** file memuat 22,9% baris dengan usage ≤ 25 MB atau kosong. Daily_RGUGA (dan dashboard) menghitung semua baris tanpa syarat usage. Dengan syarat > 25 MB, GA tagging IJ turun dari 153.094 ke sekitar 116.200 (−24%).

## 2. Isi file dan definisi kolom

| Kolom | Isi | Catatan |
|---|---|---|
| `ga_dt` | tanggal GA (1–20 Okt) | tanpa jam; hanya tanggal |
| `msisdn` | nomor yang diaktivasi | unik; **data personal, tidak dibawa ke repo** |
| `ga_brand` | IM3 / 3ID | |
| `biometric_status` | BIOMETRIC 1.291.938, REGULAR 43.362 | |
| `datavol_mb`, `datavol_gb` | usage data (MB, GB) | kosong 147.649 baris (11,1%); ada nilai ekstrem (maks 1.014.851 MB) |
| `outlet_id`, `outlet_nm` | outlet penjual (tagging) | `outlet_id` kosong 52.690; `outlet_nm` hampir selalu kosong; ID 3ID diberi nol di depan (`00552959`), di Daily_RGUGA tanpa nol |
| `dse_code`, `partner_name` | kode DSE dan PT outlet | `dse_code` kosong 80%, hanya terisi untuk outlet IJ |
| `outlet_sales_area`, `outlet_micro_cluster`, `outlet_kec_kabkot`, `outlet_kecamatan`, `outlet_kabkot`, `outlet_longitude`, `outlet_latitude` | atribut wilayah outlet | **terisi hanya 371.912 baris (28%)**: outlet di daftar wilayah (IJ dan area Jabar lain). Sisanya (963.388) kosong |
| `activation_site_id`, `activation_site_name` | site (BTS) tempat aktivasi | kosong 131.127–131.224 baris (9,8%) |
| `activation_kec_kabkot`, `activation_kecamatan`, `activation_kabkot` | kecamatan/kabupaten site aktivasi | nasional (Surabaya, Medan, ...) |

Catatan kualitas: tanpa duplikat MSISDN; tanggal lengkap 1–20 Okt; 92% baris tanpa site aktivasi juga tanpa usage (SIM terdaftar tetapi belum dipakai). Kolom `datavol_gb` selalu kosong bersama `datavol_mb`.

## 3. Aturan klasifikasi yang dipakai

- **Kecamatan IJ** = 121 kecamatan di daftar target (M2S KECAMATAN) yang sama dengan kecamatan di Daily_RGUGA. Kecamatan aktivasi di dalam daftar = GA Inner Jakarta. Semua 121 kecamatan muncul di file ini.
- **Outlet tagging IJ** = (brand, outlet_id tanpa nol di depan) ada di `ga_feed` (Daily_RGUGA), atau `outlet_micro_cluster` termasuk 36 MC IJ.
- **MC dan Area site aktivasi** = MC modus dari outlet master di site tersebut (`site_nbs`); untuk site yang tidak ada di master (1.547 site, 19.383 baris, 14,8%) dipakai MC kecamatan dari DEMARKASI. Area = area master MC itu.
- **Asal outlet non-IJ** dibagi tiga: (a) outlet di area lain dengan atribut lengkap, (b) `outlet_id` ada tetapi atribut wilayah kosong dan tidak ada di Daily_RGUGA (di luar daftar wilayah), (c) tanpa `outlet_id`.

## 4. Matriks outlet tagging × site aktivasi (semua baris, 1–20 Okt)

| Asal tagging ↓ / Site aktivasi → | Di IJ | Di luar IJ | Site kosong | Total |
|---|---:|---:|---:|---:|
| Outlet IJ (tagging) | **96.921** | 40.400 | 15.773 | 153.094 |
| Outlet non-IJ dengan atribut | 11.236 | 187.445 | 20.571 | 219.252 |
| Outlet ID tanpa atribut wilayah | 13.138 | 806.714 | 90.412 | 910.264 |
| Tanpa outlet ID | 9.878 | 38.344 | 4.468 | 52.690 |
| **Total** | **131.173** | 1.072.903 | 131.224 | 1.335.300 |

Dengan syarat usage > 25 MB: site IJ 105.544; outlet IJ → site IJ 81.244; outlet IJ → luar IJ 34.255; total outlet IJ 116.212.

### 4.1 Ke mana GA tagging IJ pergi (153.094)

| Aktivasi | Baris | % |
|---|---:|---:|
| MC yang sama dengan outlet | 52.666 | 34,4% |
| Area sama, MC berbeda | 23.749 | 15,5% |
| Area IJ berbeda | 20.506 | 13,4% |
| Luar IJ | 40.400 | 26,4% |
| Site tidak diketahui | 15.773 | 10,3% |

Per tipe outlet: **outlet master PJP** (87.134 baris) 78,6% di site IJ (MC sama 47,1%, area sama 18,8%, area IJ lain 12,7%), 11,0% luar IJ, 10,3% tanpa site. **Outlet non-master tanpa DSE (`UNASSIGNED`, 57.401 baris)** hanya 38,4% di IJ; 15.402 baris di antaranya berasal dari outlet tanpa segmen (PJP/NON/KAM) dan 96,7% aktivasi di luar IJ. Ini kandidat penjelasan 16 ribu pcs "tanpa kecamatan" di dashboard.

Lokasi luar IJ terbesar untuk GA outlet IJ: Bogor 8.052, Tangerang 3.618, Kota Tangerang 2.790, Bandung 1.933, Tangerang Selatan 1.740, Kota Bogor 1.648.

Per area, tagging → site aktivasi (baris GA):

| Area | Tagging outlet | Site aktivasi | Selisih |
|---|---:|---:|---:|
| South Jakarta Depok | 27.471 | 24.882 | −2.589 |
| Central North Jakarta | 24.432 | 17.443 | −6.989 |
| Karawang | 24.125 | 18.006 | −6.119 |
| East Jakarta | 21.917 | 17.288 | −4.629 |
| Kota Bekasi | 21.848 | 18.754 | −3.094 |
| Kab Bekasi | 17.924 | 20.940 | +3.016 |
| West Jakarta | 15.202 | 13.860 | −1.342 |

Aliran antar area (tagging → site; diagonal = area sama): Karawang → Kab Bekasi 1.482, Central North → East 1.668, Central North → West 1.630, South Jakarta → East 1.076. File per MC: `ga_site_rguga/mc_inflow_outflow.csv`.

### 4.2 Asal 131.173 GA di site IJ

| Asal | Baris | % |
|---|---:|---:|
| Outlet IJ, MC sama | 52.666 | 40,1% |
| Outlet IJ, area sama, MC lain | 23.749 | 18,1% |
| Outlet IJ, area IJ lain | 20.506 | 15,6% |
| **Subtotal distribusi internal IJ** | **96.921** | **73,9%** |
| Outlet non-IJ dengan atribut (Tangerang 2.233, Serang Cilegon 2.082, Bogor East 1.960, Bogor West 1.288, Tangsel 799, Kota Tangerang 769, ...) | 11.236 | 8,6% |
| Outlet ID tanpa atribut wilayah | 13.138 | 10,0% |
| Tanpa outlet ID | 9.878 | 7,5% |
| **Subtotal barang masuk dari luar IJ** | **34.252** | **26,1%** |

"Beda PT": di 33 dari 36 MC IJ satu MC = satu PT, jadi beda MC = beda PT. Tiga MC memiliki dua PT (Pebayuran / Muaragembong, Tegalwaru / Pangkalan, East Cikampek / Banyusari). Site aktivasi tidak punya kolom PT, sehingga tingkat PT hanya bisa didekati lewat MC.

## 5. Rekonsiliasi dengan Daily_RGUGA (`ga_feed`)

- Baris file ini pada outlet yang ada di feed (kunci brand + ID tanpa nol): **153.059** vs feed **152.825** (+0,15%). 14.580 dari 17.138 outlet ber-GA persis sama; 245 outlet feed (282 pcs) tidak ada di file; 14 outlet IJ di file (35 baris) tidak ada di feed.
- Artinya Daily_RGUGA = semua MSISDN GA per outlet **tanpa syarat usage** dan tanpa melihat lokasi aktivasi. Basis outlet di dashboard sudah benar; hanya basis "site" yang belum mengukur lokasi aktivasi.
- Dengan syarat usage > 25 MB: 116.194 pada outlet feed (−24%). Pembagian: BIOMETRIC 1.000.429 > 25 MB, 153.441 ≤ 25 MB, 138.068 kosong; REGULAR 29.675 / 4.106 / 9.581.

Pengaruh pada target kecamatan: GA outlet yang berada di 121 kecamatan target (angka di dashboard, 136.619) bukan GA yang **aktivasinya** di kecamatan itu (131.173 semua baris, 105.544 dengan > 25 MB). Terhadap target pro-rata 202.265: 64,9% dan 52,2%.

## 6. Site, teritori dan DSE

- **5.493 site IJ** punya GA; median 16 GA per site, P90 38, maksimum 1.620 (TRIDAYASAKTI_TAMBUN_PL, Tambun Selatan). 4.097 site ≥ 10 GA. Sepuluh site teratas hanya 7,4% (tersebar). Detail: `ga_site_rguga/site_ga_inner_jakarta.csv` (ID, nama, kecamatan, MC, Area, total, > 25 MB).
- **Per teritori:** GA site per Area di §4.1; per MC di `mc_inflow_outflow.csv` (tagging di MC, GA site di MC, dari MC sendiri, dari MC IJ lain, dari non-IJ). MC dengan keluaran bersih terbesar: Matraman −3.292, Tanah Abang −2.601, Bekasi Tengah −2.449, Cempaka Putih −2.319; masuk bersih terbesar: Babelan +2.279, Cibarusah +868.
- **Per DSE:** 307 baris (`dse_origin_vs_site.csv`): GA tagging, dan pembagian MC sama / area sama / area IJ lain / luar IJ / site kosong, serta % di IJ. Dari 273 DSE dengan ≥ 30 GA, median **85,5%** GA-nya diaktivasi di IJ; terendah CSOBKSS-22 (1,0%), Dwi Apriliani (36,0%), Alfian Fardiansyah (38,7%), Rixan Abdul Afif (41,8%). Perlu dicek, bisa kode login atau pola penjualan lintas wilayah.

## 7. Risiko dan hal yang tidak bisa dijawab dari file

- Tidak ada PT untuk site aktivasi; "beda PT" hanya didekati lewat MC.
- Atribut outlet kosong untuk 72% baris; sebagian besar outlet di luar wilayah. Asal "luar area" untuk kelompok ini hanya diketahui sebagai "bukan outlet IJ" (tanpa area).
- `ga_dt` tanpa jam; usage tanpa tanggal perhitungan (usage kosong bisa berarti belum dipakai, bukan tidak pernah). Apakah baris usage ≤ 25 MB akan dihitung GA saat usage naik tidak terlihat dari satu snapshot.
- File 231 MB dan berisi MSISDN: tidak boleh masuk repo atau browser. Hanya agregat (site × hari × brand × kelas asal × kelas usage) yang boleh dipakai aplikasi.
- Nama kolom `activation_kec_kabkot` mengikuti pemotongan sumber (mis. `JAKARTA PUS` di Daily_RGUGA 3ID); di file ini kecamatan IJ cocok persis dengan 121 kecamatan target.

## 8. Pertanyaan untuk pemilik data

1. Syarat GA "usage > 25 MB": diterapkan ke angka resmi? Daily_RGUGA saat ini tidak menerapkannya.
2. Baris tanpa usage dan tanpa site (10% dari GA outlet IJ): dianggap belum aktif (tidak dihitung) atau tetap dihitung?
3. Outlet dengan ID tetapi tanpa atribut wilayah (910 ribu baris): benar semuanya di luar IJ?
4. Konfirmasi pemakaian MC site dari master (site_nbs) dengan cadangan MC kecamatan DEMARKASI untuk 1.547 site yang tidak ada di master.

## 9. Rencana implementasi (belum dilakukan)

1. Builder baru `build_site_ga_feed.py`: membaca CSV, tanpa MSISDN, menghasilkan agregat per site × hari × brand × kelas asal (outlet IJ MC sama / area sama / area IJ lain / non-IJ dengan atribut / tanpa atribut / tanpa ID) × kelas usage (> 25 MB, ≤ 25 MB, kosong) dan agregat per DSE × kelas aktivasi; masuk `daily_update.py`.
2. Basis "Site / lokasi" di Gross Add dan Daily GA Trend berpindah ke GA berdasar site aktivasi; basis outlet tetap dari Daily_RGUGA. Kartu "GA outlet tagging non Inner Jakarta" memakai kelas asal baru.
3. Tabel dan peta per teritori, site, DSE; kartu distribusi internal vs barang masuk dari luar; audit baru di `audit_ga.js` (jumlah per brand/hari = file mentah, matriks sama dengan §4).

File keluaran: `docs/assessments/ga_site_rguga/dse_origin_vs_site.csv`, `site_ga_inner_jakarta.csv`, `mc_inflow_outflow.csv`.

## 10. Pemasok GA ke site Inner Jakarta dan lokasi yang paling banyak kemasukan (22 Okt 2026)

Script: `scripts/assess_site_inflow.py`; CSV: `ga_site_rguga/supplier_area_into_ij_sites.csv`, `supplier_kabupaten_into_ij_sites.csv`, `inflow_by_mc.csv`, `inflow_by_dse.csv`, `inflow_by_site.csv`, `inflow_by_kecamatan.csv`. Dasar: 131.173 GA yang aktivasinya di 121 kecamatan IJ (semua baris; kolom `ga_usage_gt25` memuat versi > 25 MB).

**Definisi.** *Pemasok* = outlet tagging yang menjual SIM. *Kemasukan (inflow)* di sebuah MC / site / kecamatan = GA yang diaktivasi di sana tetapi dijual outlet yang **bukan** ter-tag ke MC site itu (outlet MC IJ lain, area lain, atau di luar IJ). Kemasukan dari luar IJ dihitung terpisah. MC site = MC modus outlet master di site itu (bila site tidak ada di master, MC kecamatan); karena itu "MC sama" di sini 51.354, sedikit di bawah 52.666 di §4 yang memakai semua MC site. Site tidak punya DSE: DSE diberi **alokasi proporsional jumlah outlet master di site itu** (site di luar master tidak punya DSE). DSO = DSO MC site.

### 10.1 Area, kabupaten dan "region" pemasok

File tidak punya kolom Region untuk outlet; yang tersedia area (`outlet_sales_area`) dan kabupaten (`outlet_kabkot`). Region IJ = seluruh baris IJ; untuk luar IJ dipakai provinsi (pengelompokan saya dari nama kabupaten).

| Pemasok ke site IJ | GA | % dari 131.173 |
|---|---:|---:|
| Karawang | 17.747 | 13,5% |
| South Jakarta Depok | 17.736 | 13,5% |
| Central North Jakarta | 15.155 | 11,6% |
| East Jakarta | 13.112 | 10,0% |
| Kab Bekasi | 12.301 | 9,4% |
| Kota Bekasi | 11.331 | 8,6% |
| West Jakarta | 9.516 | 7,3% |
| **Subtotal area IJ** | **96.898** | **73,9%** |
| Outlet ber-ID, area tidak diketahui | 13.138 | 10,0% |
| Tanpa ID outlet | 9.878 | 7,5% |
| Area luar IJ dengan atribut (Tangerang 2.233, Serang Cilegon 2.082, Bogor East 1.960, Bogor West 1.288, Kota Tangerang Selatan 799, Kota Tangerang 769, Cirebon 419, Sukabumi Barat 334, ...) | 11.236 | 8,6% |

Kabupaten pemasok terbesar: Karawang 17.641, Jakarta Timur 13.093, Bekasi 12.285, Kota Bekasi 11.286, Jakarta Barat 9.433, Jakarta Selatan 9.270, Kota Depok 8.287, Jakarta Utara 7.830, Jakarta Pusat 7.144; di luar IJ: Bogor 3.323, Tangerang 2.259, Serang 1.539, Kota Tangerang Selatan 828. Per provinsi (luar IJ dengan atribut): **Banten 6.111**, Jawa Barat dan lainnya 5.125; 23.016 GA (17,5%) tidak bisa dilacak ke area atau kabupaten.

Jadi pemasok luar IJ yang bisa diidentifikasi terbesar adalah **Banten (Tangerang dan Serang Cilegon)**, lalu **Bogor**; pemasok antar-area IJ terbesar adalah Karawang dan South Jakarta Depok.

### 10.2 Kemasukan per level

Total GA di site IJ 131.173; **79.819 (60,8%) kemasukan dari luar MC site** (45.567 dari MC IJ lain, 34.252 dari luar IJ).

**MC (kemasukan terbesar):**

| MC | Area | DSO | GA di MC | Kemasukan | % | Dari luar IJ |
|---|---|---|---:|---:|---:|---:|
| MC-Mustika Jaya | Kota Bekasi | Muhamad Rifaldi | 6.265 | 4.952 | 79,0% | **3.554** |
| MC-Tanjung Priok | Central North | Rudi Hardana Darmawan | 4.746 | 3.187 | 67,2% | 1.030 |
| MC-Bekasi Tengah | Kota Bekasi | Aditya Hasanuddin | 5.269 | 3.187 | 60,5% | 1.624 |
| MC-Babelan | Kab Bekasi | Muhammad Gufron | 4.301 | 3.156 | 73,4% | 1.104 |
| MC-Pasar Minggu | South Jakarta Depok | Arie Setyo Prabowo | 5.603 | 3.051 | 54,5% | 1.569 |
| MC-Cakung | East Jakarta | Fahmi Kurnianto | 6.511 | 3.034 | 46,6% | 1.236 |
| MC-Kembangan | West Jakarta | Aldika Fayzal Rahaditya | 5.110 | 2.959 | 57,9% | 915 |
| MC-Cengkareng | West Jakarta | Ahyadi | 4.710 | 2.886 | 61,3% | 1.426 |

Terbanyak dari luar IJ saja: Mustika Jaya 3.554, Tambun 1.933, Bekasi Tengah 1.624, Pancoran 1.598, Pasar Minggu 1.569, Cengkareng 1.426 (daftar lengkap 36 MC di `inflow_by_mc.csv`).

**Kecamatan (kemasukan terbesar), DSO dan DSE (DSE = alokasi site):**

| Kecamatan | Area | DSO | DSE utama (alokasi kemasukan) | GA | Kemasukan | % | Dari luar IJ |
|---|---|---|---|---:|---:|---:|---:|
| Mustika Jaya, Kota Bekasi | Kota Bekasi | Muhamad Rifaldi | Tommy Saiful Atnan 1.514; Alfian Fardiansyah 1.214; Achmad Abdulah 239 | 4.670 | 3.920 | 83,9% | 3.102 |
| Tambun Selatan, Bekasi | Kab Bekasi | Muhammad Gufron / Rona Dwi Karyo | Panji Agus Mutakin 1.007; UNASSIGNED 505; Kusnadi 205 | 3.837 | 2.239 | 58,4% | 1.564 |
| Tanjung Priok, Jakarta Utara | Central North | Muhamad Yunus Hidayat / Rudi Hardana Darmawan | Muhamad Amarudin 678; Agus Kurnia Budyono 396 | 3.000 | 2.008 | 66,9% | 718 |
| Cakung, Jakarta Timur | East Jakarta | Fahmi Kurnianto / Richard Yadi Sidauruk | Kusworo 320; Heru Mulyadi 191 | 2.901 | 1.929 | 66,5% | 871 |
| Jagakarsa, Jakarta Selatan | South Jakarta Depok | Arie Setyo Prabowo | Umar 1.012; Andika 416 | 3.359 | 1.865 | 55,5% | 1.033 |
| Kembangan, Jakarta Barat | West Jakarta | Ahyadi / Aldika Fayzal Rahaditya | Dody Fahamsyah 809; Berri Aji Samporno 327 | 2.807 | 1.787 | 63,7% | 575 |
| Bekasi Barat, Kota Bekasi | Kota Bekasi | Aditya Hasanuddin / Fahmi Kurnianto | Irama Harefa 947; M. Aldiansa Pangestu 275 | 3.047 | 1.700 | 55,8% | 902 |
| Cengkareng, Jakarta Barat | West Jakarta | Ahyadi / Aldika Fayzal Rahaditya | Purwantoro 378; Rizki Wicaksono 325 | 2.560 | 1.623 | 63,4% | 712 |

Terbanyak dari luar IJ: Mustika Jaya 3.102, Tambun Selatan 1.564, Jagakarsa 1.033, Bekasi Barat 902, Cakung 871.

**DSE (alokasi kemasukan di site tempat DSE punya outlet):** Tommy Saiful Atnan 1.514 (dari luar IJ 1.240), Alfian Fardiansyah 1.216 (860), Umar 1.015 (591), Panji Agus Mutakin 1.015 (893), Irama Harefa 947 (421), Dody Fahamsyah 850 (192), Muhamad Amarudin 678, Sandy Saputra 668 (394). Dua catatan: (a) 14.195 GA yang masuk di site yang **tidak ada di master tidak bisa dialokasikan ke DSE mana pun**; (b) DSE `UNASSIGNED` (outlet non-master) menerima 4.984 (alokasi). Alokasi ini adalah **wilayah site DSE**, bukan penjualan DSE itu.

**Site (kemasukan terbesar):**

| Site | Kecamatan | MC · DSO | DSE di site | GA | Kemasukan | % | Dari luar IJ |
|---|---|---|---|---:|---:|---:|---:|
| 13CKR0252 TRIDAYASAKTI_TAMBUN_PL | Tambun Selatan | Tambun · Rona Dwi Karyo | Panji Agus Mutakin (6 outlet) | 1.620 | 1.033 | 63,8% | 980 |
| 13BKS0503 DUKUHZAMRUD_CM | Mustika Jaya | Mustika Jaya · Muhamad Rifaldi | Tommy Saiful Atnan | 947 | 938 | 99,0% | 825 |
| 13BKS0507 DUKUHZAMRUD_PANCORANBRT_LS | Mustika Jaya | idem | Alfian Fardiansyah | 900 | 897 | 99,7% | 634 |
| 12JKS0377 CIGANJURBARU_PL | Jagakarsa | Pasar Minggu · Arie Setyo Prabowo | Umar, Andika | 1.276 | 822 | 64,4% | 479 |
| 13BKS0510 DUKUH_ZAMRUD_MT | Mustika Jaya | idem | (site di luar master) | 794 | 789 | 99,4% | 773 |
| 12JKB0270 MERUYA_ANGGREK_PL | Kembangan | Kembangan · Aldika Fayzal Rahaditya | Dody Fahamsyah | 739 | 436 | 59,0% | 71 |
| 12JKT0008 PUCUNGPEJATEN_IF | Kramat Jati | Kramatjati · Rizky Kurniawan | Deny | 527 | 398 | 75,5% | 1 |

### 10.3 Temuan yang perlu ditindaklanjuti

1. **Kluster Dukuh Zamrud, Mustika Jaya (Kota Bekasi):** lima site "DUKUH*ZAMRUD*" menerima 2.674 GA, **2.647 (99%) dari luar MC**, dan sebagian besar dari luar IJ (3 site teratas: 2.232 dari luar IJ). Pemasoknya hampir semua **tanpa ID outlet atau ID tanpa atribut wilayah** (mis. 498 + 229 di DUKUHZAMRUD_CM; 558 tanpa ID di DUKUH_ZAMRUD_MT, 118 dari Cirebon). Pola ini perlu dicek: penjualan door-to-door atau titik penjualan non-outlet, atau registrasi tidak melalui outlet IJ.
2. **Tridayasakti Tambun (Tambun Selatan)** site tunggal terbesar (1.620 GA) dengan 980 dari luar IJ; 760 dari outlet ber-ID tanpa atribut dan 213 dari Serang Cilegon.
3. **Pasar Minggu / Jagakarsa:** 479 dari luar IJ di Ciganjurbaru (477 dari outlet ber-ID tanpa atribut).
4. **MC Mustika Jaya** perlu dilihat sebagai kasus terpisah: 79% kemasukan, 57% dari luar IJ; DSO Muhamad Rifaldi.
5. Kemasukan tinggi di MC dalam kota (Tanjung Priok 67%, Cengkareng 61%) sebagian besar adalah **lintas-MC di dalam IJ** (Tanjung Priok: 2.157 dari MC IJ lain dan 1.030 dari luar IJ), jadi bukan semuanya barang dari luar area.

### 10.4 Keterbatasan

- "Region" luar IJ tidak ada di file; provinsi adalah pengelompokan saya (Banten = Tangerang, Serang, Cilegon, Pandeglang, Lebak) dan 17,5% GA tidak punya area sama sekali.
- DSE di level site/kecamatan adalah alokasi dari outlet master di site, bukan DSE yang menjual atau yang bertanggung jawab atas site (site tidak punya DSE). Untuk wilayah tanggung jawab DSE yang resmi diperlukan DSE coverage dari PJP.
- Angka memakai semua baris (tanpa syarat usage > 25 MB); versi > 25 MB hanya ada untuk pemasok area, kabupaten dan site (`ga_usage_gt25`), belum untuk DSE.

## 11. Definisi Inner Jakarta dan asal tagging per provinsi / kabupaten (22 Okt 2026)

**Definisi IJ (dikonfirmasi pemilik):** GA Inner Jakarta = aktivasi di kecamatan yang termasuk Jakarta Utara, Pusat, Barat, Timur, Selatan, **Kepulauan Seribu**, Kota Depok, Kota Bekasi, Kabupaten Bekasi dan Karawang. Daftar 121 kecamatan yang dipakai (target M2S KECAMATAN = Daily_RGUGA) juga memuat 1 kecamatan Purwakarta: GA di sana hanya 15 pcs dan tetap ikut sampai pemilik memutuskan. Kepulauan Seribu: 113 GA aktivasi, area Central North Jakarta.

Script: `scripts/assess_site_tag_origin.py`; CSV: `ga_site_rguga/tag_origin_province_kabupaten.csv`, `tag_origin_province_to_destination_area.csv`. Dasar: 131.173 GA aktivasi di IJ. Provinsi dipetakan dari nama kabupaten/kota (DKI Jakarta; Banten = Tangerang, Kota Tangerang, Tangsel, Serang, Kota Serang, Kota Cilegon, Pandeglang, Lebak; sisanya Jawa Barat). Kabupaten outlet dari file (atribut outlet) atau dari lokasi outlet di Daily_RGUGA; 23.016 GA (17,5%) tidak punya kabupaten (outlet ber-ID tanpa atribut 13.138; tanpa ID 9.878).

| Provinsi outlet tagging | GA | % |
|---|---:|---:|
| Jawa Barat | 55.039 | 42,0% |
| DKI Jakarta | 46.883 | 35,7% |
| Banten | 6.235 | 4,8% |
| Tidak diketahui | 23.016 | 17,5% |

Kabupaten / kota outlet (terbesar): Karawang 17.641, Jakarta Timur 13.093, Kab Bekasi 12.285, Kota Bekasi 11.310, Jakarta Barat 9.433, Jakarta Selatan 9.270, Kota Depok 8.287, Jakarta Utara 7.830, Jakarta Pusat 7.144 (semuanya IJ). Di luar IJ: **Bogor 3.323, Tangerang 2.259, Serang 1.539, Tangsel 828, Kota Tangerang 772, Kota Serang 504, Sukabumi 488, Kota Cirebon 391, Cianjur 237, Kota Bogor 202, Sumedang 185**, Kota Sukabumi 165, Lebak 153, Kota Bandung 132, Kota Cilegon 105, Purwakarta 78, Pandeglang 75, lainnya < 50. Kepulauan Seribu sebagai asal outlet 113.

Pemasok luar IJ yang teridentifikasi: Jawa Barat di luar IJ sekitar 5,5 ribu (Bogor dominan), Banten 6,2 ribu (Tangerang dan Serang). Provinsi di luar Jabar, Banten dan DKI tidak muncul. Provinsi pemasok × area tujuan ada di `tag_origin_province_to_destination_area.csv` (Banten paling banyak masuk ke Kab Bekasi 1.305 dan West Jakarta 1.030; Jawa Barat non-IJ terutama ke Karawang dan Kab Bekasi).

Catatan: angka Banten 6.235 di sini (per kabupaten, termasuk Kota Serang) sedikit di atas 6.111 di §10.1 yang memakai nama area. Keterbatasan: pemetaan provinsi hanya mencakup outlet dengan kabupaten tertulis; 17,5% GA tidak bisa dipetakan karena file tidak memuat lokasi outlet itu.

## 12. Sebaliknya: GA ber-tagging Inner Jakarta yang diaktivasi di luar Inner Jakarta (22 Okt 2026)

Script: `scripts/assess_site_outflow.py`; CSV: `outflow_by_activation_kabupaten.csv`, `outflow_by_activation_province.csv`, `outflow_by_activation_site.csv`, `outflow_by_tagging_mc.csv`. Dasar: 153.094 GA yang outlet-nya ter-tag IJ (sama dengan Daily_RGUGA, §5).

**Hasil: ya.** **40.400 GA (26,4%)** diaktivasi di luar IJ (34.255 dengan usage > 25 MB); 96.921 (63,3%) di IJ; 15.773 (10,3%) belum punya site aktivasi.

**Per area tagging** (GA ber-tagging di area itu yang diaktivasi di luar IJ):

| Area tagging | GA tagging | Aktivasi luar IJ | % |
|---|---:|---:|---:|
| Kota Bekasi | 21.848 | 7.732 | 35,4% |
| South Jakarta Depok | 27.471 | 8.520 | 31,0% |
| East Jakarta | 21.917 | 6.070 | 27,7% |
| Central North Jakarta | 24.432 | 6.525 | 26,7% |
| West Jakarta | 15.202 | 3.397 | 22,3% |
| Kab Bekasi | 17.924 | 3.727 | 20,8% |
| Karawang | 24.125 | 4.287 | 17,8% |

**Per MC tagging (terbesar):** Bekasi Tengah 3.294 (42,7%), Matraman 2.998 (43,1%), Pasar Minggu 2.835 (39,4%), Mustika Jaya 2.565 (43,5%), Pademangan 1.965 (38,0%), Tanah Abang 1.703, Sawangan 1.679 (46,1%), Cakung 1.660.

**Per jenis outlet:** outlet master PJP hanya 11,0% keluar IJ (9.597 dari 87.134). Sumber utamanya outlet non-master: **tanpa segmen (PJP/NON/KAM) 15.402 dari 15.922 (96,7%)** dan non-master NON 13.160 dari 38.572 (34,1%). Dua kelompok ini = 70,7% dari seluruh GA yang keluar.

**Provinsi lokasi aktivasi (dipetakan dari nama kabupaten):** Jawa Barat 21.927 (54,3%), Banten 10.103 (25,0%), Sulawesi Selatan 1.621, Jawa Tengah 1.240, Kalimantan Selatan 1.033, Jawa Timur 1.027, Sumatera Utara 559, Riau 467, Kalimantan Barat 386, Sulawesi Tengah 320, Bali 287, Lampung 218, Sumatera Selatan 214, lainnya < 150 (334 GA di kabupaten kecil belum dipetakan). Total 362 kabupaten/kota.

**Kabupaten/kota aktivasi (terbesar):** Bogor 8.052, Tangerang 3.618, Kota Tangerang 2.790, Bandung 1.933, Tangsel 1.740, Kota Bogor 1.648, Kota Bandung 1.410, Cianjur 1.178, Cirebon 969, **Bulukumba (Sulsel) 807**, Bandung Barat 792, Banjar 712, Garut 668, Sukabumi 656, Kota Serang 649, Subang 647, **Tanah Laut (Kalsel) 531**, Kota Cirebon 468.

**Site (8.773 site, tersebar):** sepuluh site teratas hanya 7,7%, seratus teratas 23,2%. Terbesar: JALANPEUSAR_PL (Panongan, Tangerang) 609, MARGAMUKTI_SRN_PL (Pangalengan, Bandung) 491, SAGARA_ST (Pacet, Bandung) 373, PADANGLOANG_TB (Ujung Loe, Bulukumba) 313, SEI_MALANG_KN (Amuntai Tengah, Hulu Sungai Utara) 252, WAHIDIN_CLDG_MT (Ciledug, Kota Tangerang) 243, PEMATANG_PANJANG_CM (Kertak Hanyar, Banjar) 224.

**Pola yang perlu dicek:** (1) 79% keluar-IJ ada di Jawa Barat dan Banten (Bogor, Tangerang, Bandung dan sekitarnya), pola yang masuk akal untuk pelanggan perbatasan; (2) sebagian GA aktivasi jauh (Bulukumba, Tanah Laut, Hulu Sungai Utara, Luwu, Kepulauan Selayar) terkonsentrasi di sedikit site (mis. PADANGLOANG_TB 313, 99% usage > 25 MB): SIM dari outlet IJ yang diaktivasi di luar pulau atau penjualan bulk, perlu ditelusuri.

**Hubungan dengan §4 dan §10:** 40.400 GA keluar IJ (outlet IJ → luar IJ) dan 34.252 masuk dari luar IJ (outlet luar IJ → site IJ) hampir seimbang secara volume, tetapi 23.016 GA masuk tidak bisa dilacak asalnya, sedangkan outflow punya outlet IJ yang jelas dan siap ditindaklanjuti per MC dan DSE (CSV per MC; DSE tersedia di `dse_origin_vs_site.csv`).
