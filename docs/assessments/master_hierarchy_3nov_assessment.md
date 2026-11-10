# Assessment · Update Master Hierarchy 3 Nov 2026 vs master dan catalogue sebelumnya (10 Nov 2026)

Read-only (CLAUDE.md §2): tidak ada kode, feed atau data yang diubah, tidak ada commit. File: `raw/Catalogue/Update_Master_Hierarchy_3_Nov_2026.xlsb` (diunggah 4 Nov). Pembanding: master teritori saat ini (`territory_management_master.csv`, 16.120 outlet, DSE per outlet dari sheet FINAL 20 Okt + master DSE 12 Okt), katalog DSE (`dse_catalogue.csv`, 272 DSE) dan `CATALOGUE_OUTLET_NOVEMBER.xlsb` (5 Nov, 36.391 id). Id dinormalkan (tanpa nol di depan). Kolom nomor telepon CSM / CSO **tidak dipakai dan tidak dicetak** di sini.

## 1. Ringkasan
1. File ini adalah **hierarki penuh seluruh outlet Inner Jakarta** (bukan hanya outlet ber-DSE): 27.274 outlet fisik, **15.162 ber-DSE** dan **12.112 tanpa DSE**. Master kita 16.120 outlet karena hanya memuat sebagian: selisih terbesar adalah outlet tanpa DSE (IM3 +3.990, 3ID +7.034 id baru).
2. **DSE berubah di 1.012 id (706 outlet fisik) ke DSE lain**, 698 id kehilangan DSE dan 149 id mendapat DSE; 509 outlet fisik master kehilangan DSE dan 65 mendapat DSE. 4 DSE bertukar MC (Batujaya ↔ Rengasdengklok, Kembangan ↔ Cengkareng) dan 2 DSE diganti login (Tanjung Priok, Cikarang Barat).
3. **Pairing IM3 – 3ID berubah**: 8.053 pasangan (master 7.867): 7.017 sama, 1.036 baru, 850 hilang (808 di antaranya kedua id masih ada tetapi tidak berpasangan lagi).
4. **Koordinat membaik**: 577 dari 646 outlet master yang koordinatnya tidak valid punya koordinat valid di file ini.
5. **Konflik dengan katalog 5 Nov**: untuk 35.014 id yang sama, kode DSE berbeda pada 1.396 id (542 beda DSE, 472 katalog kosong tetapi hierarki berisi, 382 sebaliknya). Dua sumber DSE ini harus diputuskan satu.
6. **Jumlah DSE per area = 37 · 36 · 41 · 44 · 34 · 55 · 25 (272)**, sama dengan "# DSE" pada slide target D2U, jadi file ini konsisten dengan guideline target 6 Nov.

## 2. Isi file
| Sheet | Isi | Baris |
|---|---|---:|
| `IM3` | satu baris per outlet IM3: Region, Sub Area (WEST / EAST), Branch, MPC (distributor) nama dan kode, Micro Cluster, CSM, **CSO Code** (= DSE), Outlet Code, nama, kategori, Channel, MOBO Dealer, lat / long, Organisation Group, Partner Territory, Kecamatan, Circle, Brand, `CHECK` | 16.700 |
| `3ID` | idem untuk 3ID | 18.605 (18.540 kode unik: **65 kode ganda**) |
| `dual_brand` | pasangan IM3 ↔ 3ID (kode, nama, CSO kedua sisi, kategori, kecamatan, PT, MC), kolom `DUAL BRAND` dan `CHECK` | 8.053 |
| `DSE` | 272 DSE: Branch, MC, PT, USERID IM3 dan 3ID, jumlah outlet dual / single IM3 / single 3ID / total, `% ACH DUAL BRAND` | 272 |

Arti `CHECK`: 1 = pasangan dual dengan **DSE yang sama di kedua brand** (7.022 pasangan, tepat jumlah "dual" di sheet DSE); 0 = tanpa CSO, atau single, atau DSE beda. Tidak ada nama DSE, DSO maupun HoA di file ini (nama DSE tetap dari katalog / master, DSO dan HoA dari master DSE).

Kualitas: tidak ada kode IM3 ganda; 65 kode 3ID ganda dan 56 id 3ID dipakai di lebih dari satu pasangan (cocok dengan `PAIR_3ID_GANDA` kita, 33 id); 4 baris dengan branch `SOUTH KARAWANG` (3) atau kosong (1); kategori: Outlet Regular, Non-Telco, KRO (183 IM3, 13 3ID), Telco Non-Chip; semua Channel Traditional dan MOBO Dealer YES.

## 3. Perbedaan vs master / catalogue sebelumnya
**Cakupan id** (master saat ini → file baru): IM3 12.658 → 16.700 (+4.120 baru, 78 hilang); 3ID 11.295 → 18.540 (+7.309 baru, 64 hilang). Id baru: IM3 130 ber-DSE dan 3.990 tanpa; 3ID 275 ber-DSE dan 7.034 tanpa. Id master yang hilang dari file: 142 (semuanya ber-DSE) → perlu dicek (keluar atau diganti id).

**Pairing**: 8.053 vs 7.867. Pasangan baru 1.036 (462 hanya IM3 ada di master, 354 kedua id ada di master tetapi berpasangan lain, 132 kedua id baru, 88 hanya 3ID). Pasangan master yang hilang 850 (808 kedua id ada, dipasangkan ulang atau dilepas).

**DSE per outlet** (id yang ada di kedua file):

| | Sama | Ganti ke DSE lain | Kehilangan DSE | Mendapat DSE |
|---|---:|---:|---:|---:|
| IM3 (12.580 id) | 11.586 | 701 | 230 | 63 |
| 3ID (11.231 id) | 10.366 | 311 | 468 | 86 |

Semua 1.012 penggantian adalah **orang lain** (bukan sekadar format login): 988 dalam MC yang sama, 24 lintas MC. Per outlet fisik: 14.446 tetap ber-DSE, **706 pindah DSE**, 509 kehilangan, 65 mendapat, 1.024 tanpa DSE di kedua.
* **Batujaya 206** dan **Rengasdengklok 124** outlet pindah karena 4 DSE bertukar MC (Erick Rejeki Limbong dan Juana ke Batujaya, Ihsan Riyadlul Jinan dan Sukron Mamun ke Rengasdengklok); Irfan Saptian ke Cengkareng dan Edi Warsono ke Kembangan.
* **Cakung 93**: DSE Khinanti Mulya Setya turun 55 → 2 outlet (login `DSEIN061`); **Cikarang Barat 48** dan **Tanjung Priok 42**: login DSE diganti (DSEIN032 → 2613053632, 2613051093 → 2613050947, nama DSE baru belum ada).
* Outlet kehilangan DSE terbanyak: Cibitung 98, Cakung 79, Cipayung 54, Pebayuran 47, Matraman 44, Mustika Jaya 42, Batujaya 30; Babelan 26 hilang dan 21 mendapat.
* Outlet per DSE: median 54,5 (min 2, maks 98); total 15.242 (dual dihitung sekali) vs 14.933 di katalog DSE kita.

**Wilayah**: 28 outlet pindah branch (KAB BEKASI → KOTA BEKASI 8, EAST → KOTA BEKASI 5, WEST → SOUTH DEPOK 3, dll., setelah KOTA BEKASI = BEKASI), **169 outlet pindah MC** (Babelan → Tambun 24, Tanjung Priok → Kelapa Gading 14, Cempaka Putih → Tanah Abang 13, Bekasi Tengah → Bekasi Utara 10, Matraman → Cakung 9, Grogol → Kembangan 8, Pademangan → Tanjung Priok 7, Kramatjati → Ciracas 7). MC: 36 MC, sama dengan master (selain 1 baris kosong).

**Koordinat**: valid 16.658 / 16.700 IM3 dan 18.560 / 18.605 3ID; master 15.474 / 16.120 valid, 646 tidak valid → 577 bisa diperbaiki (peta, jarak Vanguard, cakupan kecamatan DSE).

**Vs katalog November 5 Nov** (`MAPPING GROUP`, `DSE_CODE_NOV`): 36.391 id vs 35.240; sama 35.014; hanya katalog 1.377 (NON 1.228, KAM 86, PJP 39, WS 22); hanya hierarki 226. Kode DSE: sama 33.618, **beda 542**, katalog kosong / hierarki terisi 472, hierarki kosong / katalog terisi 382. Label katalog vs CSO: **677 outlet berlabel PJP tanpa CSO di hierarki** dan **914 outlet berlabel NON yang punya CSO**.

## 4. Dampak jika dipakai sebagai sumber DSE / hierarki
| Area aplikasi | Dampak |
|---|---|
| Basis PJP (outlet ber-DSE, 14.958) | naik ke sekitar 15.162 entity; 509 outlet keluar dari PJP dan 65 masuk; % cakupan PJP, "outlet tanpa DSE" dan kartu Kesehatan outlet berubah |
| Atribusi DSE per outlet (KRO, Program, Harian, Profil Outlet, Stok, End Balance, Penjualan per DSE) | 706 outlet pindah DSE; DSE Productivity, insentif, KRO NO_DSE dan daftar outlet per DSE bergeser (terbesar Batujaya, Rengasdengklok, Cakung) |
| Kunjungan PJP | kunjungan lama tetap atas nama DSE saat check-in; outlet yang pindah akan tampak "dikunjungi DSE lain" (sudah ada pola 414 / 424 di FINAL) |
| Target DSE / D2U | jumlah DSE 272 tetap; target per DSE yang berbasis outlet berubah di MC yang bertukar |
| Hybrid / entity | 1.036 pasangan baru dan 850 hilang: jumlah Hybrid 7.868 → sekitar 8.053, aturan `PAIR_3ID_GANDA` perlu dijalankan ulang |
| Peta, Vanguard, cakupan kecamatan | 577 koordinat tidak valid bisa dipulihkan |
| PT · Partner Distribusi | MPC (distributor sebenarnya, nama dan kode) tersedia per outlet; selama ini hanya nama Partner Territory (PT-MC) |
| Katalog program November | label PJP / NON dan DSE antara katalog 5 Nov dan hierarki saling bertentangan di 1.396 id (lihat keputusan 1) |

## 5. Informasi dan insight yang tersedia di file ini
1. **Dual brand per DSE** (`% ACH DUAL BRAND`): 46,1% outlet DSE adalah dual (7.022 dari 15.242); median per DSE 45%, rentang 0–100%. DSE dengan dual 0%: Cengkareng, Cikarang Barat, Tanjung Priok (masing-masing 33–46 outlet); tertinggi: MC Karawang, Tegalwaru, Tanjung Priok (≥ 95%). Peluang: 5.135 outlet IM3-only dan 3.085 outlet 3ID-only ber-DSE yang belum dual.
2. **Kualitas pasangan dual**: 7.022 pasangan dengan DSE sama, 171 dengan DSE berbeda, 640 hanya satu sisi ber-DSE, 220 tanpa DSE.
3. **Outlet tanpa DSE (12.112 outlet, 44%)** per branch: Central North 1.909 · East 1.884 · Kab Bekasi 2.032 · Karawang 1.543 · Kota Bekasi 1.268 · South Depok 2.083 · West 1.389: daftar target ekspansi PJP / DSF / D2U (D2U 3 outlet per DSE per hari).
4. **MPC / distributor per outlet** (24 MPC untuk IM3, 41 untuk 3ID) dan kode MPC: dasar pemetaan distributor ke outlet dan DSE.
5. **Sub Area WEST / EAST**, Outlet_category (Regular, Non-Telco, KRO, Telco Non-Chip), Organisation Group (FISIK / NON FISIK), koordinat lengkap.
6. **Beban DSE**: 2–98 outlet per DSE, 47 dari 270 DSE berubah ≥ 10 outlet dibanding katalog kita (kandidat rebalancing).

## 6. Keputusan yang dibutuhkan dari pemilik
1. **Sumber DSE per outlet**: Update Master Hierarchy 3 Nov (hierarki resmi, 272 DSE konsisten dengan target D2U) atau `DSE_CODE_NOV` katalog 5 Nov (542 beda DSE, 472 + 382 kosong sebagian)? Rekomendasi: hierarki 3 Nov sebagai sumber DSE dan hubungan Hybrid, katalog 5 Nov hanya untuk MAPPING GROUP program (AVA, KRO, KAM, ...).
2. **Basis PJP**: apakah outlet yang kehilangan DSE di hierarki (509) memang tidak lagi PJP, dan 914 outlet berlabel NON yang punya CSO dihitung PJP?
3. **Outlet tanpa DSE (12.112)**: masuk master sebagai non-PJP (menambah sekitar 11.000 baris, ukuran feed teritori naik) atau tetap di luar master dan hanya dipakai untuk analisis cakupan?
4. **Nama DSE** untuk login baru 2613050947 (Tanjung Priok) dan 2613053632 (Cikarang Barat), serta nasib Herry Apriyanto dan Raja Mangku Alam Yando Pasoni.
5. **65 kode 3ID ganda dan 56 id di banyak pasangan**: aturan satu IM3 primer per 3ID tetap dipakai?
6. **Kolom nomor telepon CSM / CSO**: tidak diimpor (data pribadi); konfirmasi.

## 7. Rencana bila disetujui (belum dikerjakan)
1. Parser `build_master_hierarchy.py` (stdlib) membaca file → `data/catalogues/master_hierarchy_202611/` (outlet_hierarchy.csv tanpa kolom telepon, dse_sheet.csv, dual_pairs.csv, apply_report.json berisi daftar perubahan di atas).
2. Terapkan ke `apply_final_dse_mapping.py` (DSE per outlet, pairing, koordinat, MPC) lalu bangun ulang peta, cakupan DSE, PJP mapping, visits, KPI, KRO, Vanguard dan jalankan audit entity, scorecard, konsistensi dan KRO.
3. Perbarui katalog DSE (login baru, MC bertukar), panel status flag di Manajemen Teritori dan tambah flag `DSE_BERUBAH_3NOV`.
4. Dokumen perbedaan per outlet (`master_hierarchy_3nov_diff.csv`) untuk diverifikasi tim lapangan sebelum dipakai.

## 8. Keputusan pemilik (10 Nov 2026) dan hasil penerapan
Keputusan: (1) **hierarki 3 Nov = sumber DSE per outlet**; katalog 5 Nov hanya untuk kategori program (ringkasan perbedaan di bawah). (2) Outlet yang kehilangan DSE dan outlet berlabel NON yang punya CSO = **non-PJP**; bila ada transaksi (MOBII, MOBO, GA, kunjungan PJP) diberi flag. (3) 12.112 outlet tanpa DSE **masuk master sebagai non-PJP**, bertransaksi = flag. (4) nama DSE login baru: belum dijawab, dipakai asumsi di bawah. (5) satu IM3 primer per 3ID tetap. (6) nomor telepon tidak diimpor. Cut GA D4: ditahan.

**Penerapan** (`scripts/build_master_hierarchy.py` → `data/catalogues/master_hierarchy_202611/`; overlay `overlay_hierarchy()` di `apply_final_dse_mapping.py`; `scripts/build_nonpjp_flags.py`; ringkasan oleh `scripts/compare_catalogue_hierarchy.py`):
* Master **27.350 outlet** (sebelumnya 16.120): **14.868 PJP** dan **12.482 non-PJP** (DSE UNASSIGNED). Hybrid 8.001, IM3-only 8.760, 3ID-only 10.589. 10.764 outlet baru (flag `BARU_DARI_HIERARKI`, site NBS menunggu), 77 outlet master yang hilang dari hierarki disimpan sebagai histori non-PJP (`HILANG_DARI_HIERARKI`, 76 baris).
* DSE: 717 outlet berganti DSE (`DSE_BERUBAH_3NOV`), 554 kehilangan DSE (`DSE_HILANG_3NOV`), 260 outlet berlabel NON katalog dijadikan non-PJP (`NON_PJP_KATALOG`), 24 outlet dengan kode CSO yang bukan salah satu dari 272 DSE (`CSO_TIDAK_DIKENAL`, non-PJP), 120 outlet pindah MC (`MC_PINDAH_3NOV`), 556 koordinat diperbaiki.
* **Pengaman (di luar instruksi, perlu konfirmasi)**: 5 DSE yang 85–100% outlet hierarkinya berlabel NON di katalog 5 Nov (Adnan Al Ap Ghani, Kusnadi, Radesta Ficry, Danias Sundah, Rano Hidayat; semuanya DSE yang di FINAL dilayani login sementara DSEIN100 / 122 / 115 / 116 / 120) **tetap PJP**: tanpa pengaman, 283 outlet dan seluruh portofolio mereka menjadi non-PJP dan DSE ber-target tanpa outlet. Daftar ada di `apply_report.json` (`hier_dse_non_label_ignored`).
* **Flag non-PJP bertransaksi** (`NON_PJP_ADA_TRANSAKSI`, `data/catalogues/nonpjp_tx_flags.csv`, `website/data/nonpjp_flags.js`, filter di Manajemen Teritori): dari 12.482 outlet non-PJP, **1.823 bertransaksi bulan ini**: GA 1.196, MOBO 818, MOBII 392, check-in PJP 1 (alasan non-PJP: tanpa DSE di hierarki 1.333, DSE hilang 294, label NON 169, hilang dari hierarki 15). Perlu dicek tim: GA terbanyak, dan outlet TANPA DSE dengan MOBO / MOBII besar (potensi masuk PJP).
* **Login DSE baru** (asumsi, pertanyaan 4 terbuka): login 2613050947 (MC Tanjung Priok) dipakai sebagai pengganti **Herry Apriyanto** dan 2613053632 (MC Cikarang Barat) sebagai pengganti **Raja Mangku Alam Yando Pasoni** (satu-satunya DSE yang hilang di MC itu; flag `DSE_BARU_LOGIN`, target DSE ikut, `DSEIN032` di `dse_login_sementara.csv`); ganti lewat `master_hierarchy_202611/dse_login_replacement.csv` (kolom `login,dse_name`) lalu jalankan ulang parser.
* Catatan sisi: 4 DSE bertukar MC mengikuti sheet DSE (katalog DSE dan feed kunjungan memakai MC baru).

**Dampak aturan "satu IM3 primer per 3ID"** (56 id 3ID dipakai oleh lebih dari satu IM3): 56 pasangan dibuang, jadi **56 outlet IM3 menjadi IM3-only** (44 di antaranya ber-DSE, 43 punya MOBII dan 21 punya GA bulan ini). Primer = pasangan dengan DSE sama di kedua sisi (53 dari 56 id), lalu pasangan yang sudah ada di master, lalu IM3 dengan id terkecil. Akibatnya semua transaksi id 3ID tersebut (MOBII, MOBO, GA, kunjungan) dihitung ke outlet primer, outlet sekunder hanya membawa sisi IM3-nya; jumlah Hybrid turun 56 dibanding hierarki (8.053 → 7.997 + 4), dan tiap 3ID itu tetap berflag `PAIR_3ID_GANDA` untuk verifikasi lapangan.

### Ringkasan perbedaan katalog 5 Nov vs hierarki 3 Nov (kategori program tetap dari katalog)
* 35.014 id sama di kedua file: DSE sama 32.222; **beda DSE 542**; katalog kosong / hierarki ada 472; hierarki kosong / katalog ada 382; label **NON tetapi punya CSO 871** (260 outlet master non-PJP setelah pengaman); label PJP tetapi tanpa CSO 525. Hanya di katalog 1.377 id (NON 1.228, KAM 86, PJP 39, WS 22); hanya di hierarki 226. Daftar per id: `master_hierarchy_202611/diff_catalogue_nov.csv` (tanpa nama atau telepon).
* Kategori program (AVA, PROMOTOR, KRO, KAM, WS) tetap dari katalog 5 Nov (`program_nov.csv`); hierarki tidak membawa kategori program (hanya Outlet_category: Regular, Non-Telco, KRO 183 IM3 + 13 3ID, Telco Non-Chip).

### Daftar program: `OUTLET_WISE` (workbook GA 9 Nov) vs katalog 5 Nov
Sheet `OUTLET_WISE` berubah sejak versi 6 Nov: kolom `MAPPING GROUP` hilang, diganti `PJP NON`, `FINAL OUTLET` dan satu kolom per program (AVA 50,150 · PROMOTOR · TEBUS MURAH KAM · TOP PLAYER · DTU DSE · DSF) plus `dse_nov`; 36.851 id (PJP 20.893, NON 15.958) vs katalog 36.391 (PJP-like 22.145, NON 14.246): **3.618 id beda label PJP / NON**, 461 id hanya di OUTLET_WISE. Kolom program hampir kosong (AVA 8, PROMOTOR 31, DSF 34, DTU 10, TM 5, TOP PLAYER 3 dari 36.851 id): belum layak sebagai daftar program, jadi **tetap katalog 5 Nov**. `dse_nov` berbeda dari hierarki di 3.117 id dan dari katalog di 2.021 id (sumber DSE ketiga, tidak dipakai). Detail: `diff_outlet_wise.csv`.

### Perubahan lain akibat penerapan
* `daily_update.py` ikut memuat data mentah 6–10 Nov (kunjungan sampai 9 Nov, MOBO 10 Nov, GA 9 Nov); target SP tetap 266.765 (semua DSE ber-target).
* Audit: `audit_period_history.py` mentoleransi 0,2% pada FM bulan lalu (sell-in Oktober +0,02–0,1% karena lebih banyak outlet terpetakan ke MC Inner Jakarta); `audit_consistency.js` menurunkan UAR % > 100 di level DSE menjadi peringatan (2 DSE: satu DSE dengan 2 outlet di hierarki yang masih menjual ke 21 outlet, satu lagi 107%); `audit_dse_catalogue.py` memakai MC dari sheet DSE hierarki.
* Ukuran: feed teritori 17,5 → 30,6 MB, master JSON 35 MB (situs Pages sekitar +13 MB).

### Yang masih terbuka
1. Nama DSE untuk dua login baru (asumsi di atas) dan nasib Herry Apriyanto / Raja Mangku (login lama).
2. Pengaman 5 DSE (label NON) dan DSE Khinanti Mulya Setya (MC Cakung: 2 outlet di hierarki, 55 sebelumnya, tetap menjual ke 21 outlet).
3. 12.482 outlet non-PJP termasuk 1.823 bertransaksi: apakah masuk PJP (terutama yang ber-MOBO / MOBII besar).
4. Cut GA D4 (ditahan) dan sumber daftar program November.
