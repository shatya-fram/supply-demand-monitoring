# Detail · Katalog 202610 vs sistem: struktur file, HoA KAB BEKASI, Outlet ke DSE, Pairing, sebelum dan sesudah

Tanggal 21 Okt 2026. Analisis saja, tidak ada builder, feed atau kode yang diubah. Pelengkap [catalogue_202610_vs_system.md](catalogue_202610_vs_system.md).
Daftar detail per baris ada di folder [catalogue_202610/](catalogue_202610/) (CSV, buka di Excel):

| File | Isi | Baris |
|---|---|---|
| `file_structure.csv` | semua kolom tiap sheet: huruf kolom, header, jumlah terisi, jumlah distinct, contoh | 198 |
| `hoa_kab_bekasi_before_after.csv` | 7 MC KAB BEKASI: DSO dan HoA sebelum dan sesudah, DSE, outlet, GA | 7 |
| `outlet_dse_changes.csv` | outlet yang DSE-nya berubah, dengan jenis perubahan | 1.766 |
| `outlets_only_in_final.csv` | outlet ada di FINAL, belum ada di sistem | 1.523 |
| `outlets_only_in_system.csv` | outlet ada di sistem, tidak ada di FINAL | 1.527 |
| `pairing_changes.csv` | pasangan IM3-3ID yang baru atau hilang, dengan kategori | 1.916 |

## Koreksi atas ringkasan sebelumnya
1. **"7 MC dipimpin DSP"** adalah angka seluruh region, bukan KAB BEKASI. Di KAB BEKASI hanya 2 MC yang dipimpin DSP (Pebayuran dan Tambun); 5 MC lain dipimpin DSO.
2. **"Pasangan outlet yang sama 13.428"** salah. Hitungan itu memakai kolom id yang terisi juga untuk outlet single-brand. Angka yang benar ada di bagian 3.
3. Lima login sementara yang saya sebut "belum ada di sheet DSE" sudah bisa ditelusuri ke orangnya lewat outlet yang dikunjungi (bagian 2.3).

---

## A. Struktur file `CATALAGUE_INNER_JAKARTA_202610.xlsb`

| Sheet | Baris data | Grain (1 baris =) | Kunci | Padanan di sistem |
|---|---|---|---|---|
| IS Participant | 48 (36 MC terisi) | satu DSO / DSP per MC, HoA di kolom K:N | MC (kolom C) | `dso_territory_mapping.csv` (baru: kolom ROLE, NIK, MSISDN, email, NIK HoA) |
| Territory | 826 (header dengan grup "IM3 Sep - Before" dan "IM3 Oct - After") | satu kecamatan | `SYS_KEC_ID` (B), `kecamatan\|kabkot` (C) | DEMARKASI di `ga_feed` (hanya 121 kecamatan Inner Jakarta) |
| DSE | 272 | satu DSE | login IM3 (H), login 3ID (I) | `dse_master_hierarchy.csv` |
| PT | 7 | satu branch, ringkasan pairing | branch (C) | tidak ada |
| OUTLET IOH | 13.801 (di atas header ada catatan tanggal dan grup) | satu baris pairing outlet, dua blok | Master Outlet Key (A) | `adhoc_outlet_im3_3id_data_gcp.xlsb`, kolom pairing di `territory_management_master.csv` |
| FINAL_20261020 | 22.426 | satu outlet satu brand | `brand` + `outlet_id` | kolom `dse_code_im3`, `dse_code_3id`, `micro_cluster` di territory master |
| `im3` dan `3id` | 12.197 dan 10.229 | sama dengan FINAL, dipecah per brand | idem | idem |
| IOH_Outlet | 35.955 | satu outlet satu brand | `brand` + `id` | tidak ada setara; sebagian ada di territory master dan feed GA |

### Kolom penting per sheet
- **IS Participant:** A AREA (INNER JAKARTA EAST / WEST), B BRANCH, C MC, F ROLE (DSO / DSP), G NIK, H nama, I MSISDN, J email, K NIK HoA, L nama HoA. NIK DSO berformat angka (IOH), NIK DSP berformat `AM…` (partner).
- **Territory:** blok Before (H-P): PT, MC, BRANCH, AREA, REGION, CIRCLE, MPC_SHORTCODE, PARTNER BEFORE, MPC/MITRAIM3. Blok After (Q-Y): kolom yang sama untuk Oktober. Lalu Z:AA LATITUDE / LONGITUDE dan AB:AF partner 3ID (MP3 / 3KIOSK).
- **DSE:** A BRANCH, B MICRO CLUSTER, C PARTNER TERRITORY, D/E PARTNER ID NEW (IM3 / 3ID), F/G nama MPX, H USERNAME IM3, I USERNAME 3ID, J AGENCY NAME, K NAMA DSE, L NIK DSO/DSP, M nama DSO/DSP, N NIK HoA, O nama HoA, P `#IM3`, Q `#3ID`.
- **OUTLET IOH:** blok kiri A-V (data 2 Okt; hierarki master 16 Okt): key, Pairing Status, id dan nama IM3, DSE_CODE IM3, id dan nama 3ID, DSE_CODE 3ID, kanonik circle / region / branch / MC / PT / kecamatan. Blok tengah X-AG (IM3) dan AI-AR (3ID): id, nama, DSE_CODE, KECAMATAN, PT, MC, status (Active / not in tbl mobo organization), tipe outlet (RETAIL, KRO, WS, Wholesaler, DTU, AVA, Kotkab, Promotor). Blok kanan AT-AY: FLAG (DUAL / SINGLE BRAND), status pairing (PAIRING / NOT PAIRING / SINGLE BRAND), banding KECAMATAN, PT, MC (SAMA / BEDA), NOTE; lalu CREATE ONO IM3, RE-OPEN PAIRING, Auto Link.
- **FINAL_20261020:** brand, outlet_id (8 digit untuk 3ID), id_outlet (angka), outlet_org_status, circle, region, area, branch, dse_id (dua kolom identik), dse_mapped (semua "DSE mapped"), mc, CHECK (kosong).
- **IOH_Outlet:** mth (serial 46314 = 19 Okt 2026), id, site_nm, flag (OUTLET / OUTLET-NBS), longitude, latitude, kec_kabkot, kecamatan_nm, kabkot_nm, circle, region, area, sales_area, micro_cluster, partner_name, dse_code, brand, PJP NON, stamping (kosong semua), DTU, AVA, Kota Kabupaten, Wholesaler, Promotor, UNIQ.

### Perbedaan konvensi yang bisa merusak join
| Hal | Sistem | Katalog baru |
|---|---|---|
| id 3ID | tanpa nol di depan (`24499`) atau `SHxxxxxx` | 8 digit (`00024499`) di OUTLET IOH dan FINAL, tanpa nol di IOH_Outlet |
| kode DSE numerik | `2613051013.0` (ada `.0`) | `2613051013` |
| Nama HoA | `Roswida Sidauruk`, `Ragus Sularto` | `BUTET ROSWIDA SIDAURUK`, `R AGUS SULARTO` |
| Nama DSO | `R. SYARIEF DURAHMAN`, `LESTARI A. R.` | `RADEN SYARIEF DURAHMAN`, `LESTARI AMURIH RAHAYU` |
| Branch | BEKASI, DEPOK, SOUTH JAKARTA, NORTH / SOUTH KARAWANG | KOTA BEKASI, SOUTH JAKARTA DEPOK, KARAWANG (Territory, FINAL, IOH_Outlet); OUTLET IOH masih nama lama |
| Area | 7 branch sebagai area | dua area induk: INNER JAKARTA EAST dan WEST (branch tetap 7) |

---

## 1. HoA KAB BEKASI: sebelum dan sesudah

| MC | DSO / DSP sebelum | DSO / DSP sesudah (peran) | HoA sebelum | HoA sesudah | DSE | Outlet ber-DSE | GA MTD Okt | GA LMTD Sep |
|---|---|---|---|---|---|---|---|---|
| MC-BABELAN | Muhammad Gufron | Muhammad Gufron (DSO) | Budi Priyambodo | **Ali Sabana** | 6 | 425 | 1.881 | 5.193 |
| MC-CIBARUSAH | R. Syarief Durahman | Raden Syarief Durahman (DSO) | Budi Priyambodo | **Ali Sabana** | 5 | 198 | 1.194 | 1.687 |
| MC-CIBITUNG | Rian Sanjaya Surna | Rian Sanjaya Surna (DSO) | Budi Priyambodo | **Ali Sabana** | 6 | 372 | 2.080 | 2.900 |
| MC-CIKARANG BARAT | Muhamad Shandi Maulidrizki | Muhamad Shandi Maulidirizki (DSO) | Budi Priyambodo | **Ali Sabana** | 6 | 294 | 2.281 | 2.912 |
| MC-CIKARANG TIMUR | Theovillus Marthin Yohanes | sama (DSO) | Budi Priyambodo | **Ali Sabana** | 5 | 346 | 2.141 | 2.782 |
| MC-PEBAYURAN | Sandy Nopriansyah | sama (**DSP**) | Budi Priyambodo | Budi Priyambodo | 6 | 326 | 2.060 | 2.033 |
| MC-TAMBUN | Rona Dwi Karyo | sama (**DSP**) | Budi Priyambodo | Budi Priyambodo | 7 | 402 | 4.710 | 5.913 |

GA di tabel ini basis outlet tagging per MC, sampai 18 Okt (feed GA terakhir); target dan jumlah outlet dari feed KPI DSE.

**Dampak per HoA (angka sama dengan tabel di atas)**

| HoA | Cakupan sebelum | Cakupan sesudah | Perubahan |
|---|---|---|---|
| Budi Priyambodo | 7 MC, 41 DSE, 2.363 outlet, GA 16.347 (LMTD 23.420, −30,2%) | 2 MC, 13 DSE, 728 outlet, GA 6.770 (LMTD 7.946, −14,8%), target SP 13.474 pcs, target OSA Rp 3,65 M | cakupan menyusut ke 2 MC, keduanya dipimpin DSP |
| Ali Sabana | BEKASI (kota) 34 DSE | BEKASI 34 DSE + 5 MC KAB BEKASI 28 DSE, 1.635 outlet, GA 9.577 (LMTD 15.474, −38,1%), target SP 45.688 pcs, target OSA Rp 9,89 M = 62 DSE | cakupan hampir dua kali lipat, dan turun di angka GA yang terbesar |

**Konsekuensi di aplikasi:** filter dan kartu per HoA (Overall Performance, Gross Add, DSE Productivity), roll-up target per HoA, daftar HoA di header, serta `gaplok_location_mapping.csv` yang sekarang mencatat Budi Priyambodo untuk 7 MC. Angka area KAB BEKASI sendiri tidak berubah; yang berubah hanya HoA yang melihatnya.

**Pola yang terlihat (bukan fakta dari file):** dua MC milik Budi adalah satu-satunya MC KAB BEKASI yang dipimpin DSP (staf partner, NIK `AM…`). Lima MC lain dipimpin DSO IOH.

**Yang perlu dikonfirmasi:** (a) apakah pemecahan ini resmi dan berlaku mulai Oktober; (b) apakah HoA untuk semua DSE di KAB BEKASI mengikuti MC (bukan per DSE); (c) apakah di region lain DSP-led MC (Batujaya, Tegalwaru, Bekasi Tengah, Pondok Gede, Cengkareng) tetap di bawah HoA branch masing-masing; di file memang begitu.

---

## 2. Outlet ke DSE (FINAL 20 Okt) vs sistem

Pembanding sistem: `territory_management_master.csv` (14.694 outlet fisik; IM3 11.985 id, 3ID 10.445 id). Pencocokan memakai brand + id outlet (nol di depan dibuang), 20.903 baris outlet-brand cocok.

### 2.1 Gambaran
| Kelompok | Jumlah | Catatan |
|---|---|---|
| Cocok di kedua sisi | 20.903 | MC sama untuk 20.849, beda 54 |
| Hanya di FINAL | 1.523 (IM3 673, 3ID 850) | belum ada di sistem |
| Hanya di sistem | 1.527 (IM3 461, 3ID 1.066) | tidak ada di FINAL |
| DSE berubah di antara yang cocok | 1.766 | rincian 2.2 |

### 2.2 1.766 perubahan DSE, dipecah (`outlet_dse_changes.csv`)
| Jenis | Baris outlet-brand | Outlet fisik | Sell-in Sep penuh / MTD Okt (feed penjualan) | Arti |
|---|---|---|---|---|
| **dari ID sementara ke nama DSE** | 570 | 390 | Rp 1,20 M / Rp 0,37 M | sistem menaruh outlet pada login sementara (`DSEIN100`, `DSEIN107`, `DSEIN115`, `DSEIN116`, `DSEIN120`, `DSEIN122`, `DSEIN124`); FINAL memberi nama orangnya. Ini perbaikan data, bukan pindah tugas |
| **pindah antar DSE (searah)** | 514 | 399 | Rp 0,87 M / Rp 0,21 M | outlet pindah dari DSE A ke DSE B; DSE tujuan selalu berada di MC yang sama dengan MC outlet di FINAL (18 outlet juga berganti MC dari sistem ke FINAL) |
| **pindah antar DSE (saling tukar)** | 424 (24 pasangan DSE) | 304 | Rp 0,82 M / Rp 0,18 M | arus A→B dan B→A sama-sama ada; daftar lengkap di bagian 6.3 |
| **dari tanpa DSE** | 223 | 182 | Rp 0,91 M / Rp 0,19 M | outlet UNASSIGNED di sistem kini punya DSE (3ID 155, IM3 68); terbanyak East Cikampek 64, Cibitung 50 |
| **login baru, orang sama** | 35 | 35 | Rp 0,15 M / Rp 0,05 M | hanya kode login berubah (3ID) |

Pembanding: sell-in region (SP + voucher + saldo) Sep penuh Rp 44,7 M, MTD Okt s/d 20 Okt Rp 11,6 M (Okt tertekan migrasi).

Pindah antar DSE terbesar per MC: Matraman 165, Sawangan 117, Cipayung 80, Kelapa Gading 78, Beji 69, Cikarang Timur 65, Mustika Jaya 54, Cakung 53. Placeholder ke nama DSE terbanyak di Cibitung 169, Karawang 108, Tambun 82, Kebayoran 72, Cipayung 47.

Dampak ke aplikasi: UAR, OSA, target SP dan insentif DSE dihitung dari outlet per DSE, jadi 938 baris outlet pindah antar DSE (514 + 424) akan memindahkan angka antar DSE. Placeholder dan tanpa DSE (793 outlet) menambah angka milik DSE bernama.

### 2.3 Login sementara `DSEIN1xx` ditelusuri ke orangnya
Feed kunjungan memuat 23 ID sementara `T0xx` (login `DSEIN100`-`DSEIN124`). Dengan mencocokkan outlet yang mereka kunjungi ke DSE di FINAL:

- **18 login yang ada di sheet DSE baru terbukti cocok** dengan nama di sheet (contoh DSEIN101 → Nur Ainun, 189 id; DSEIN104 → Rizki Wicaksono; DSEIN113 → Andrian). Satu ambigu: **DSEIN107** (sheet DSE: Junita Riana) outletnya terbagi Devi Indriyani 79 dan Junita Riana 74.
- **5 login yang tidak ada di sheet DSE** ternyata punya pemilik berdasarkan outlet: **DSEIN100 → Adnan Al Ap Ghani** (213 id, MC Karawang), **DSEIN115 → Radesta Ficry** (MC Cibitung), **DSEIN116 → Danias Sundah** (Cibitung), **DSEIN120 → Rano Hidayat** (Cibarusah), **DSEIN122 → Kusnadi** (Tambun). Ini kesimpulan dari kecocokan outlet, bukan dari file; perlu konfirmasi Anda. Sheet DSE mencatat orang-orang itu dengan login lain (mis. `26130510973ID` untuk Adnan).

### 2.4 Hanya di FINAL (1.523 outlet, `outlets_only_in_final.csv`)
- Terbanyak di MC-Pondok Gede 316, Cipayung 143, East Cikampek 89, Batujaya 87, Beji 70, Mustika Jaya 68.
- Sudah dikenal sistem sebagai non-master: 1.021 punya baris di feed GA (3.514 pcs GA Oktober), 1.209 punya baris di feed penjualan. 43 tidak ada di IOH_Outlet.
- **Bertentangan dengan IOH_Outlet:** FINAL menyebut semuanya "DSE mapped", tetapi di IOH_Outlet 1.418 berstatus NON dan hanya 62 PJP.
- Status org: 1.443 Active, 75 "not in tbl mobo organization", 5 "Pending at SALDOMOBO".

### 2.5 Hanya di sistem (1.527 outlet, `outlets_only_in_system.csv`)
- Terbanyak: MC-Babelan 161, Cibarusah 136, Tambun 115, Grogol 109, Pebayuran 105, Cikarang Timur 96; per branch KAB BEKASI 754, WEST JAKARTA 235, SOUTH JAKARTA DEPOK 224.
- 1.430 outlet fisik di balik 1.527 id. Sell-in Sep penuh Rp 2,59 M (5,8% dari region), MTD Okt Rp 0,39 M. 1.155 id punya transaksi di sistem dan 1.152 punya kunjungan; 3.307 pcs GA Oktober. Rincian volume di bagian 6.2. (Angka "Rp 39,2 M dari Rp 1.367 M" di versi sebelumnya salah: berasal dari kolom `sellin_val` territory master yang skalanya tidak sebanding dengan feed penjualan.)
- 711 dari 1.527 memang tanpa DSE di sistem (masuk akal tidak ada di FINAL, yang hanya memuat outlet ber-DSE).
- 279 adalah satu id brand yang lepas, sementara id brand lain milik outlet fisik yang sama masih ada di FINAL.
- Di IOH_Outlet: 753 berstatus PJP, 678 NON, 96 tidak ada. **753 PJP itu berarti IOH_Outlet (19 Okt) dan FINAL (20 Okt) tidak sepakat** tentang siapa yang ber-DSE.

### 2.6 Dua sumber DSE yang tidak sepakat
Dari 20.730 outlet yang ada di FINAL dan IOH_Outlet, 1.600 (7,7%) punya kode DSE berbeda; 928 outlet PJP di IOH_Outlet tidak ada di FINAL. Perlu keputusan sumber mana yang menang (saran: FINAL untuk DSE karena jumlahnya dekat dengan sheet DSE: IM3 12.197 vs 12.189 di sheet; untuk 3ID selisih 220: 10.229 vs 10.449).

---

## 3. Pairing IM3 ↔ 3ID (sheet OUTLET IOH)

### 3.1 Sheet ini berisi dua versi pairing yang bertentangan
Satu baris punya blok kiri (data **2 Okt**) dan blok kanan hasil analisis pairing yang lebih baru (kolom FLAG, NOTE, CREATE ONO IM3, RE-OPEN). Keduanya tidak sama pada **1.160 dari 13.801 baris**.

| Versi | Pasangan IM3-3ID nyata | Sama dengan sistem | Baru | Hilang dari sistem |
|---|---|---|---|---|
| Sistem (sebelum) | 7.787 | – | – | – |
| Blok kiri, status DUAL BRAND (2 Okt) | 7.685 | 7.552 (97%) | 133 | 235 |
| **Blok kanan, FLAG DUAL BRAND (sesudah)** | **6.863** | **6.367** | **496** | **1.420** |

Jadi sistem hampir sama dengan blok kiri (versi lama), dan blok kanan adalah perubahan sebenarnya: 1.226 pasangan lama dilepas dan 404 pasangan baru dibuat.

### 3.2 Rincian blok kanan terhadap sistem (`pairing_changes.csv`)
**496 pasangan baru:**
| Kategori | Jumlah |
|---|---|
| IM3 dikenal sistem, 3ID baru ke sistem | 179 + 19 |
| Kedua id baru ke sistem | 87 |
| Re-pair: IM3 berpasangan dengan 3ID lain di sistem, 3ID ini single | 105 |
| Re-pair: kedua id berpasangan dengan partner berbeda | 95 |
| 3ID dikenal, IM3 baru | 9 |
| Dua outlet single di sistem dipasangkan | 2 |

**1.420 pasangan sistem yang tidak ada di file:**
| Kategori | Jumlah |
|---|---|
| IM3 ada di file, 3ID dilepas (jadi IM3 single) | 1.129 |
| Kedua id tidak ada di file | 224 |
| Kedua id ada tetapi dipasangkan berbeda | 61 |
| 3ID ada, IM3 tidak ada | 6 |

### 3.3 Karakter data blok kanan
- Hubungan IM3 → 3ID satu-ke-satu, tetapi **186 id 3ID dipasangkan ke lebih dari satu IM3** (380 baris). Sistem sudah punya 47 id 3ID yang muncul di lebih dari satu outlet, jadi ini bukan hal baru tetapi lebih banyak. Aturan di bagian 6.4.
- Status: PAIRING 6.377, NOT PAIRING 652 (97 di antaranya memakai DSE yang sama), SINGLE BRAND 6.772. Banding antar brand: kecamatan sama 6.428, kecamatan beda 601 (155 di antaranya PT dan MC juga beda). Tindakan: CREATE ONO IM3 2.268, RE-OPEN 135, RE-MAPPING/RE-OPEN 60, auto-link 827.
- Jumlah id unik 3ID di file hanya 6.670 (sistem 10.445) karena blok kanan hanya memuat 3ID yang berpasangan; 3ID single tidak ada di blok ini.

### 3.4 Mengapa dianggap basi
Tanggal data 2 Okt, branch memakai nama lama (NORTH / SOUTH KARAWANG, SOUTH JAKARTA, DEPOK), MC kanonik beda dengan MC per brand pada 5.029 dari 11.533 baris, dan pairing blok kiri dan kanan bertentangan. Sebagai referensi tipe outlet (KRO 465 IM3 / 128 3ID, WS 57) file ini tetap berguna.

---

## 4. Ringkasan sebelum dan sesudah

| Objek | Sebelum (sistem) | Sesudah (katalog 202610) | Selisih |
|---|---|---|---|
| MC dan kecamatan Inner Jakarta | 36 MC, 121 kecamatan | sama; 58 kecamatan pindah MC dari September | tidak ada |
| DSE | 272, 18 login lama | 272, 18 login baru | 17 ganti login, 1 baru punya login IM3 |
| HoA KAB BEKASI | Budi: 7 MC, 41 DSE | Ali: 5 MC, 28 DSE; Budi: 2 MC, 13 DSE | 28 DSE pindah HoA |
| DSO / DSP | 36 DSO | 29 DSO + 7 DSP | 7 MC berubah sebutan peran |
| Outlet ber-DSE | 14.694 fisik, 860 tanpa DSE | FINAL 22.426 id (hanya ber-DSE) | +1.523 id baru, −1.527 id hilang |
| DSE per outlet | master 12-15 Okt | 20 Okt | 1.766 baris berubah (938 benar-benar pindah, 570 ID sementara jadi nama, 223 dari kosong, 35 login) |
| Pairing | 7.787 pasangan | 6.863 (blok kanan) | +496 / −1.420; keputusan di 6.4 |
| Branch | BEKASI | KOTA BEKASI | label |

## 5. Keputusan owner (21 Okt 2026) dan status

| # | Keputusan | Status |
|---|---|---|
| 1 | Semua MC KABUPATEN BEKASI di bawah HoA **Budi Priyambodo** | Dipakai. Sistem sudah begitu, tidak ada perubahan. Catatan: file katalog menulis Ali Sabana untuk 5 MC, jadi perbedaan ini muncul lagi bila file dibaca mentah |
| 2 | Sumber DSE per outlet = **FINAL_20261020** | Dipakai |
| 3 | 1.527 id hanya di sistem: simpan sebagai histori, cek volume, pertimbangkan unmap atau non-PJP | Volume dan usulan di 6.2 |
| 4 | Login sementara (`DSEIN100`, 107, 115, 116, 120, 122, 124) tetap sebagai LOGIN ID dan diberi flag | Dipakai; usulan flag di 6.1 |
| 5 | Daftar tabel perubahan pasangan DSE yang saling tukar | 6.3 dan `dse_swap_pairs.csv` |
| 6 | Pairing: versi dan aturan 3ID ganda | Usulan di 6.4, perlu persetujuan |
| 7 | Nama branch di layar = **KOTA BEKASI** | Dipakai; dampak di 6.5 |
| 8 | Tipe outlet sebagai flag di menu PROGRAM (Outlet & KRO Management) | Selesai: `data/catalogues/kro_program_outlets.csv`, 6.6 |

## 6. Tindak lanjut

### 6.1 Login sementara sebagai LOGIN ID dengan flag
Usulan flag `LOGIN_SEMENTARA` pada DSE di feed kunjungan dan KPI, dengan kolom `dugaan_pemilik` (informasi saja, tidak dipakai untuk menggabungkan angka). Ada 23 ID `T0xx`: 18 sudah ada di sheet DSE baru sebagai DSE bernama, 5 tidak (DSEIN100, 115, 116, 120, 122). Usulan: semuanya tetap sebagai login ID dengan flag; dugaan pemilik untuk 5 login yang tidak ada di sheet DSE adalah Adnan Al Ap Ghani, Radesta Ficry, Danias Sundah, Rano Hidayat dan Kusnadi, dan untuk 18 lainnya nama dari sheet DSE (`DSEIN107` ambigu: Junita Riana atau Devi Indriyani). Akibat: jumlah DSE tidak berubah, tetapi outlet yang di FINAL tercatat atas nama orang akan menampilkan orang yang sama di dua baris (nama dan login) sampai Anda memutuskan penggabungan.

### 6.2 Outlet yang hanya di sistem: volume dan usulan
Per outlet fisik (1.430 outlet di balik 1.527 id). Volume dari feed penjualan (SP + voucher + saldo): Sep penuh dan MTD Okt s/d 20 Okt. 279 outlet masih punya satu id brand di FINAL, jadi tetap.

| Kelompok (volume bulanan tertinggi antara Sep dan Okt) | Outlet | Sell-in Sep penuh | MTD Okt | GA Okt | Kunjungan | Usulan |
|---|---|---|---|---|---|---|
| Tanpa sell-in dan GA | 80 | Rp 0 | Rp 0 | 0 | 586 | non-PJP, histori saja |
| Tanpa sell-in, ada GA | 37 | Rp 0 | Rp 0 | 322 | 480 | non-PJP, pantau |
| < Rp 1 Jt | 839 | Rp 346 Jt | Rp 19 Jt | 1.015 | 19.680 | non-PJP, pantau |
| Rp 1–5 Jt | 175 | Rp 286 Jt | Rp 21 Jt | 348 | 6.085 | non-PJP, aktif |
| Rp 5–20 Jt | 14 | Rp 142 Jt | Rp 0 | 75 | 311 | cek DSE sebelum di-unmap |
| > Rp 20 Jt | 6 | Rp 517 Jt | Rp 0 | 413 | 159 | cek DSE sebelum di-unmap |
| **Hilang penuh** | **1.151** | **Rp 1,29 M (2,9% region)** | **Rp 40 Jt (0,3%)** | **2.173** | | |
| Masih punya satu id brand di FINAL | 279 | Rp 1,30 M | Rp 352 Jt | 1.134 | | tetap, tidak diubah |

Temuan: 20 outlet teratas (14 + 6) memegang Rp 659 Jt atau 51% dari volume Sep outlet yang hilang, dan hampir tidak ada sell-in di Oktober. Seluruh 1.151 outlet masih ada di jadwal PJP mingguan; 443 berstatus PJP di IOH_Outlet. Usulan: **jangan hapus**. Ubah menjadi *non-PJP tanpa DSE* dengan flag `TIDAK_ADA_DI_FINAL_20OKT`, supaya histori sell-in, GA dan kunjungan tetap terbaca tetapi mereka keluar dari basis PJP dan cakupan. Untuk 20 outlet bervolume tinggi, mohon cek dulu apakah memang DSE-nya dilepas.

Sepuluh teratas (volume Sep tertinggi):

| Outlet | MC | DSE di sistem | Sell-in Sep | MTD Okt | GA Okt |
|---|---|---|---|---|---|
| dava cell | MC-CIRACAS | Andi Rizaldy | Rp 279 Jt | Rp 0 Jt | 401 |
| 0.0 | MC-PEBAYURAN | UNASSIGNED | Rp 58 Jt | Rp 0 Jt | 7 |
| 0.0 | MC-PEBAYURAN | UNASSIGNED | Rp 55 Jt | Rp 0 Jt | 0 |
| 0.0 | MC-CIBITUNG | UNASSIGNED | Rp 53 Jt | Rp 0 Jt | 0 |
| Warung Uda herman | MC-CEMPAKA PUTIH | ROHMAD WIDODO | Rp 43 Jt | Rp 0 Jt | 0 |
| 0.0 | MC-CENGKARENG | UNASSIGNED | Rp 30 Jt | Rp 0 Jt | 5 |
| Davia Cell | MC-BEKASI UTARA | MUHAMMAD IQBAL | Rp 19 Jt | Rp 0 Jt | 1 |
| DUA PUTRA cell | MC-TAMBUN | UNASSIGNED | Rp 16 Jt | Rp 0 Jt | 1 |
| Dzakhirah cell | MC-BABELAN | BENI RAMDANI KUSUMAWARDA | Rp 16 Jt | Rp 0 Jt | 0 |
| Fifah cell | MC-PANCORAN | 2613051011.0 | Rp 13 Jt | Rp 0 Jt | 11 |

Daftar lengkap dengan kelompok dan usulan: `outlets_only_in_system_volume.csv`.

### 6.3 Pasangan DSE yang saling tukar (24 pasang, 424 outlet)
"Sistem" = DSE di master 12–15 Okt. "FINAL" = DSE di FINAL 20 Okt. Kolom kunjungan memakai DSE dengan check-in terbanyak di outlet itu sepanjang Oktober (feed kunjungan).

| DSE A | DSE B | MC | A→B | B→A | Total | Kunjungan Okt sesuai sistem | sesuai FINAL | Sell-in Sep |
|---|---|---|---|---|---|---|---|---|
| MUHAMMAD FEBRIANSYAH | Mohammad Faisal Ahfanda | MC-SAWANGAN | 56 | 52 | 108 | 101 | 6 | Rp 96 Jt |
| Agus Sutrisno P | M ARIEF TRI ANANDA | MC-MATRAMAN | 56 | 51 | 107 | 107 | 0 | Rp 218 Jt |
| Nursaranita | PUTRI NUR KOMALA | MC-CIPAYUNG | 26 | 4 | 30 | 30 | 0 | Rp 114 Jt |
| Reva Ayu Maharani | Tina | MC-TEGALWARU | 11 | 8 | 19 | 18 | 0 | Rp 74 Jt |
| MUHAMAD FIRDAUS | SAIDINA HAMZAH | MC-BEJI | 6 | 11 | 17 | 17 | 0 | Rp 71 Jt |
| AGUNG NUGROHO | SANUSI FATILA YUSUP | MC-CIKARANG TIMUR | 8 | 9 | 17 | 17 | 0 | Rp 36 Jt |
| MUHAMMAD FARWIS | YANDI LESMANA | MC-PADEMANGAN | 10 | 4 | 14 | 12 | 2 | Rp 46 Jt |
| Faisal Fachruddin P | M. Alzikri | MC-KELAPA GADING | 10 | 1 | 11 | 11 | 0 | Rp 10 Jt |
| M. Alzikri | SUBIARTO | MC-KELAPA GADING | 10 | 1 | 11 | 11 | 0 | Rp 15 Jt |
| Laraswati Indah Anggraeni | SAIDINA HAMZAH | MC-BEJI | 4 | 5 | 9 | 9 | 0 | Rp 12 Jt |
| Heru Mulyadi | Radja Jabinil Azhar | MC-CAKUNG | 1 | 7 | 8 | 8 | 0 | Rp 2 Jt |
| FARIDA ARYANI | SAIDINA HAMZAH | MC-BEJI | 5 | 3 | 8 | 8 | 0 | Rp 9 Jt |
| ACHMAD ABDULAH | MUKTIARTO | MC-MUSTIKA JAYA | 3 | 4 | 7 | 7 | 0 | Rp 10 Jt |
| ANITIYA | SUSANTO | MC-CIMANGGIS | 4 | 3 | 7 | 7 | 0 | Rp 8 Jt |
| Andy Putra Intani | Sahrul | MC-CENGKARENG | 1 | 6 | 7 | 7 | 0 | Rp 9 Jt |
| Aries Wirawan | Reza Hidayat | MC-KEMBANGAN | 1 | 6 | 7 | 7 | 0 | Rp 14 Jt |
| ALEXANDER MANURUNG | TEGUH HARI KURNIA | MC-MATRAMAN | 2 | 5 | 7 | 7 | 0 | Rp 3 Jt |
| SAIDINA HAMZAH | SURYADI DANU SAPUTRA | MC-BEJI | 2 | 4 | 6 | 6 | 0 | Rp 6 Jt |
| EKO SURYANTO | FIRMAN HIDAYAT | MC-PEBAYURAN | 2 | 4 | 6 | 6 | 0 | Rp 36 Jt |
| HERRY CHRISTIAN | SYAIPUL BAHRI | MC-MUSTIKA JAYA | 1 | 4 | 5 | 5 | 0 | Rp 9 Jt |
| Ega Fitriyansyah Saputra | Irfan Saptian | MC-KEMBANGAN | 3 | 1 | 4 | 4 | 0 | Rp 8 Jt |
| HERRY CHRISTIAN | MUHAMMAD ZULFIKAR | MC-MUSTIKA JAYA | 3 | 1 | 4 | 4 | 0 | Rp 7 Jt |
| MOHAMMAD SLAMET | YOSEP MARTIN | MC-BEKASI UTARA | 1 | 2 | 3 | 3 | 0 | Rp 4 Jt |
| M ARIEF TRI ANANDA | MUHAMMAD FADLI | MC-MATRAMAN | 1 | 1 | 2 | 2 | 0 | Rp 10 Jt |

Kesimpulan: pada **414 dari 424 outlet** DSE yang berkunjung di Oktober adalah DSE di master sistem, bukan DSE di FINAL (8 sesuai FINAL, 2 tanpa kunjungan). Ini cocok dengan dua kemungkinan: kode DSE tertukar di FINAL, atau penugasan baru yang efektif 20 Okt (setelah kunjungan tercatat). Dari data tidak bisa dibedakan. Sebagian "pasangan" sebenarnya rantai, bukan pertukaran dua orang (Saidina Hamzah muncul dengan 4 DSE lain di MC-Beji, Herry Christian dengan 2 di Mustika Jaya, M. Alzikri dengan 2 di Kelapa Gading), yang lebih mirip salah kode. Dua pasangan terbesar menyumbang 215 dari 424 outlet: Muhammad Febriansyah ↔ Mohammad Faisal Ahfanda (MC-Sawangan, 108) dan Agus Sutrisno P ↔ M Arief Tri Ananda (MC-Matraman, 107). Mohon konfirmasi ke DSO terkait sebelum FINAL diterapkan untuk 424 outlet ini; sementara usulan saya diterapkan dengan flag `DSE_TUKAR_PERLU_CEK`. Daftar tingkat outlet: `outlet_dse_changes.csv` (kolom `kind` = `pindah_antar_DSE_saling_tukar`).

### 6.4 Pairing IM3 ↔ 3ID: usulan
Bukti dari FINAL (outlet yang berpasangan semestinya di DSE yang sama):
- **1.420 pasangan yang dilepas blok kanan:** 1.230 (87%) masih punya kedua id di FINAL dengan DSE yang sama, 36 DSE berbeda, 111 hanya satu id, 43 tidak ada. FINAL membantah pelepasan ini.
- **496 pasangan baru blok kanan:** 244 (49%) didukung FINAL (DSE sama), 117 DSE berbeda, 99 hanya satu id, 36 tidak ada.

Usulan: **pertahankan pairing sistem yang ada**. Dari blok kanan terapkan hanya 244 pasangan baru yang didukung FINAL, dan jangan lepaskan pasangan yang didukung FINAL (1.230). Sisanya (190 pelepasan dan 252 pasangan baru yang tidak terkonfirmasi) ditahan dan dikirim ke pemilik data. Mohon minta snapshot OUTLET IOH yang bertanggal terbaru.

Aturan untuk 3ID dengan lebih dari satu IM3 (186 id, 380 baris): satu 3ID punya satu pasangan **primer**; IM3 lainnya menjadi *single*, agar volume 3ID tidak terhitung dua kali. Primer = IM3 yang sudah berpasangan dengan 3ID itu di sistem (164 id otomatis). 22 id perlu keputusan (8 tanpa pasangan di sistem, 14 dengan lebih dari satu). Hanya 12 id yang nama IM3-nya sama. Daftar: `pairing_3id_with_multiple_im3.csv` (kolom `usulan`).

### 6.5 KOTA BEKASI
Mengubah label dari `BEKASI` ke `KOTA BEKASI` menyentuh dropdown Area, tabel per Area, heatmap, ekspor CSV, `CLAUDE.md`, gaplok mapping, dan kunci filter yang memakai teks branch (filter, URL hash, tautan yang sudah dibagikan). Usulan: satu peta tampilan (`BEKASI → KOTA BEKASI`) dan tetap menerima `BEKASI` di URL lama.

### 6.6 Tipe outlet sebagai PROGRAM
`data/catalogues/kro_program_outlets.csv` dibuat (1.335 baris id) dan `build_kro_feed.py` dijalankan ulang. Program yang muncul di Outlet & KRO Management, mode **Program**:

| Program | Id di file | Outlet cocok di feed | Sumber |
|---|---|---|---|
| KRO (katalog 202610) | 553 | 543 | OUTLET IOH (2 Okt), STATUS OUTLET = KRO |
| Wholesaler (katalog 202610) | 112 | 104 | OUTLET IOH (WS, Wholesaler) dan IOH_Outlet (19 Okt) |
| Promotor | 198 | 145 | kedua sumber |
| DTU | 182 | 172 | kedua sumber |
| AVA | 290 | 266 | kedua sumber |

`Kotkab` (4.162 id) tidak dimasukkan karena maknanya tidak jelas (kemungkinan outlet lintas kota / kabupaten); mohon konfirmasi bila dibutuhkan. `audit_kro.js` (rekonsiliasi) dan `render_check.js` lulus. Tipe KRO hanya ada di OUTLET IOH (2 Okt), jadi lebih tua daripada tipe lain.

## 7. Belum dikerjakan (menunggu persetujuan)
1. Mengubah builder territory master, DSE master dan feed kunjungan agar membaca FINAL_20261020 (butuh persetujuan 6.1, 6.3 dan 6.4).
2. Flag `LOGIN_SEMENTARA`, `TIDAK_ADA_DI_FINAL_20OKT`, `DSE_TUKAR_PERLU_CEK` di feed dan layar.
3. Penggantian label KOTA BEKASI.

## 8. Implementasi (21 Okt 2026)

Keputusan owner di bagian 5 sudah diterapkan (HoA KAB BEKASI tetap Budi Priyambodo; sumber DSE = FINAL; pairing: sistem dipertahankan + 244 pasangan baru yang didukung FINAL; flag DSE tukar dan login sementara; label KOTA BEKASI; tipe outlet sebagai program). Laporan mesin: `data/catalogues/catalogue_202610/apply_report.json`.

| Langkah | Skrip | Hasil |
|---|---|---|
| Baca katalog `.xlsb` jadi CSV masukan | `scripts/build_catalogue_overlay_inputs.py` (pembaca xlsb di `scripts/xlsb_reader.py`) | `data/catalogues/catalogue_202610/{final_dse_mapping,dse_logins,pairing_catalogue,outlet_types}.csv`, `kro_program_outlets.csv` |
| Terapkan ke master teritori | `scripts/apply_final_dse_mapping.py` (juga dipanggil `build_territory_management_catalogues.py`) | master 14.750 outlet (baseline 14.694; +56 dari pasangan yang dipisah); DSE dari FINAL untuk 13.582 outlet; **1.165 outlet tanpa DSE** berflag `TIDAK_ADA_DI_FINAL_20OKT` (baseline 860 tanpa DSE); 306 outlet `DSE_TUKAR_PERLU_CEK` (24 pasang, 42 DSE); 93 outlet login berganti (`ID_PERLU_VERIFIKASI`); 143 outlet DSE id IM3 ≠ id 3ID di FINAL (`DSE_IM3_3ID_BEDA`) |
| Pairing | idem | 203 pasangan baru didukung FINAL diterapkan; 41 didukung tetapi kedua id belum ada di master; 292 ditahan (`pairing_hold.csv`); 3ID ganda: dari 47 id di master, 17 diselesaikan (satu IM3 primer), 30 terbuka (flag `PAIR_3ID_GANDA` + `ID_PERLU_VERIFIKASI`) |
| Flag DSE / login | idem | `data/catalogues/dse_flags.csv`, `website/data/dse_flags.js` (80 baris) |
| Feed kunjungan | `generate_dse_visits_feed.py` | login baru katalog menjadi alias DSE bernama yang sama (272 orang tetap 272, tanpa ID sementara `T0xx`); login sementara tetap login ID (968 kunjungan terencana) dengan flag `LOGIN_SEMENTARA` |
| Feed KPI | `build_dse_kpi_feed.py` | 272 DSE; kunci DSE gabungan IM3+3ID lewat hierarki dan katalog; target baris login sementara ikut pemilik tunggal (SP 266.765 pcs dan OSA Rp 73,64 M tetap utuh) |
| Layar | `website/app.js`, `index.html`, `styles.css` | menu **Program & Tipe Outlet** (`#/mb_program`), chip flag di baris outlet (Territory Management) dan di bawah nama DSE, label KOTA BEKASI |
| Pemeriksaan | `render_check.js` (termasuk program, popup dan relabel), `audit_scorecard.js` 140, `audit_ga.js` 4.648, `audit_kro.js` | semua lulus |

Catatan dan hal yang masih terbuka:
- **Outlet yang hanya di FINAL kini ditambahkan ke master** (update 21 Okt sore): 1.462 outlet fisik (41 pasangan IM3-3ID, sisanya single), lokasi dan nama dari IOH_Outlet dan OUTLET IOH, site NBS `PENDING-NBS` sampai dipetakan, flag `BARU_DARI_FINAL`; 1.373 juga berflag `IOH_NON_BERTENTANGAN` karena IOH_Outlet menyebutnya NON-PJP. Master jadi 16.212 outlet. Saklar `ADD_FINAL_ONLY` di `apply_final_dse_mapping.py`.
- **Panel status flag** di Territory Management (jumlah per flag, filter tabel outlet, daftar DSE dan login berflag, kolom Flags di unduhan CSV).
- **File target (sheet Pairing Outlet-DSE) tidak sejalan dengan FINAL**: dari 13.035 outlet yang ada di keduanya, DSE sama hanya 90,1% (sebelumnya 99,6% terhadap master lama), 1.290 outlet berbeda. Basis outlet per DSE untuk OSA dan UAR kini mengikuti FINAL, sedangkan target dihitung pada pasangan lama; perlu dikonfirmasi ke pembuat target. Lihat `data_mapping_audit.md` (dibangun ulang).
- 292 pasangan ditahan dan 30 id 3ID ganda terbuka menunggu pemilik data; 24 pasang DSE tukar menunggu konfirmasi DSO.
- Mengganti label KOTA BEKASI hanya di layar; feed, nilai filter dan tautan lama tetap `BEKASI`.
- `Kotkab` tidak dijadikan program.
