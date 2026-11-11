# Assessment · Daftar peserta program (Participants AVA, Participants KotKab, Top Player Nov), 11 Nov 2026

Tiga file baru di `raw/Catalogue` (upload 11 Nov 09:24-09:25). Dibaca dengan `scripts/xlsb_reader.py` (xlsb) dan pembaca xlsx stdlib; dicocokkan ke master `territory_management_master.csv` lewat id IM3 / 3ID. Assessment SEBELUM (snapshot `data/catalogues/catalogue_202611/program_before_participants.json`) dan SESUDAH ada di bawah; belum di-commit dan belum dipublish.

## 1. Isi file

| File / sheet | Isi | Baris / id unik | Dipakai untuk |
|---|---|---:|---|
| Participants AVA · `AVA 50 3ID` | Region, Branch, MC, CSO, Outlet Code, Name, Brand | 113 baris | program **AVA** |
| Participants AVA · `AVA 50 IM3.` | sama, tanpa kolom Brand | 162 baris | program **AVA** (275 baris, 6 tanpa kode outlet: 269 id unik, tanpa duplikat) |
| Participants AVA · `Top Player` | Branch, MC, Partner, **Target Program Free KPK = 1000**, Outlet 3ID | 5 | program **Top Player (peserta Nov)** |
| Participants AVA · `Tebus Murah` | MC, Outlet 3ID dan IM3, flag PJP / KAM (14 PJP, 11 KAM) | 25 baris, 29 id | program **Tebus Murah** (sebelumnya kosong) |
| Participants KotKab · `Sheet1` | Sub Area, Branch, MC, KOT KAB, KEC (hanya 1,202 terisi), CSO, id IM3 dan 3ID | 3,516 baris, 4,383 id unik (12 duplikat) | program **Kotkab** (3 branch: KAB BEKASI, KOTA BEKASI, CENTRAL NORTH JAKARTA) |
| Participants KotKab · `Sheet2` | pivot: 2,663 IM3 + 1,732 3ID | - | pemeriksaan |
| Top Player Nov · `AVA` | **MSISDN** per outlet: 483 baris, hanya 7 outlet | 7 | tidak diimpor; 7 id semuanya sudah di daftar AVA lama |
| Top Player Nov · `DTU` | **11,100 MSISDN** (MDI SBM, Kab. Bekasi, MC Babelan, program Wholesaler; 10,600 3ID + 500 IM3) | tanpa id outlet | tidak diimpor, hanya dihitung |
| Top Player Nov · `BOOSTER` | **10,800 MSISDN** (SBM 5,000, Elkom 3,000, DVN 2,800; Kab. Bekasi; 6,800 3ID + 4,000 IM3) | tanpa id outlet | tidak diimpor, hanya dihitung |

Nomor telepon (MSISDN) tidak pernah masuk repo atau feed. `Top Player Nov.xlsb` adalah daftar nomor target program (Free KPK / DTU / Booster) per MDI, bukan daftar outlet, jadi tidak bisa dipetakan ke outlet atau DSE.

## 2. Sebelum vs sesudah (daftar id dan outlet di feed KRO)

| Program | Id SEBELUM | Id SESUDAH | Outlet di feed sebelum → sesudah | Cocok dengan daftar lama | Hanya baru | Hanya lama |
|---|---:|---:|---|---:|---:|---:|
| AVA | 268 | **269** | 252 → 245 | 94 | 175 | 174 |
| Kotkab | 3,631 | **4,383** | 2,971 → 3,414 | 3,594 | 789 | 37 |
| Tebus Murah | 0 | **29** | 0 → 27 | - | 29 | - |
| Top Player (peserta Nov) | - | **5** | - → 4 | - | 5 | - |
| Wholesaler (katalog 202611) = TOP PLAYER lama | 46 | 46 (tidak diubah) | 46 → 46 | 0 dengan peserta | - | - |
| AVA TM | 43 | 43 | 43 → 43 | 0 dengan AVA 50 | - | - |
| KAM | 88 | 88 | 81 → 81 | 4 dengan Tebus Murah | - | - |
| Program lain (Promotor, DTU, DSF, KRO) | tidak berubah | tidak berubah | - | - | - | - |

## 3. Kecocokan ke master

* AVA 50: 239 dari 269 id ada di master (218 outlet fisik, 236 PJP, 3 non-PJP); 30 id di luar master.
* Kotkab: 4,371 dari 4,383 id cocok (3,413 outlet fisik, 4,231 PJP, 140 non-PJP); 12 id tidak ada di master.
* Tebus Murah: 14 dari 29 id cocok (10 PJP, 4 non-PJP); 15 id di luar master (11 baris berflag KAM, kebanyakan di luar master).
* Top Player: 3 dari 5 id cocok (1 PJP, 2 non-PJP).

## 4. Temuan dan hal yang perlu diputuskan pemilik

1. **AVA bergeser besar**: daftar `AVA 50` hanya 94 id yang sama dengan daftar AVA kategori November (268); 174 id lama keluar dan 175 id baru masuk. Nama sheet "AVA 50" kemungkinan program berbeda (50 outlet per ...?). Saya mengganti seluruh daftar AVA dengan peserta (asumsi: file ini daftar peserta resmi); mohon konfirmasi.
2. **Top Player**: sheet hanya 5 outlet (target Free KPK 1000 pcs) sedangkan TOP PLAYER lama = flag Wholesaler katalog (46 id) dan target program 80,000. Saya menambahkan 5 outlet sebagai sumber tambahan `Top Player (peserta Nov)` di toggle TOP PLAYER (union); daftar 46 id tidak dihapus. Mohon konfirmasi apakah peserta menggantikan flag Wholesaler.
3. **Kotkab**: peserta lebih lengkap (4,383 id) dari daftar katalog (3,631). Kolom KEC hanya terisi 1,202 baris, jadi tidak dipakai; label branch KAB BEKASI / KOTA BEKASI mengikuti master (tidak ada perubahan label).
4. **Tebus Murah** kini terisi 29 id (flag PJP 14, KAM 11); 15 id di luar master tidak punya DSE / MC di aplikasi sehingga performanya n/a. Target bridge Tebus Murah | KAM (15,000) tidak berubah.
5. File MSISDN (DTU 11,100 dan BOOSTER 10,800) tidak bisa menjadi daftar outlet; bila dibutuhkan monitoring DTU / Booster per MDI, perlu file dengan id outlet atau MDI per outlet.

## 5. Implementasi

* `scripts/build_program_participants.py` (baru): membaca ketiga file, menulis `data/catalogues/catalogue_202611/program_participants.csv` (program, brand, id, nama, branch, MC, sumber) dan mengganti baris AVA, Kotkab, Tebus Murah dan Top Player (peserta Nov) di `kro_program_outlets.csv`. Dipanggil di akhir `build_catalogue_nov_programs.py` supaya katalog November tidak menimpanya.
* `website/app.js`: `PRG_SPEC` TOP PLAYER bersumber juga dari `Top Player (peserta Nov)`.
* Feed KRO dan feed target program dibangun ulang (bridge check vs guideline OK).

## 6. Pemeriksaan sesudah perubahan

`render_check.js` lulus semua view; `audit_kro.js` reconciles; `audit_consistency.js` 275 dari 275; `audit_scorecard.js` 162 dari 162 lulus. Belum commit, belum publish.
