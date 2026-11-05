# Assessment · Catalogue outlet November: kategori program per November (5 Nov 2026)

Read-only (CLAUDE.md §2): nothing rebuilt, nothing committed. File baru: `raw/Catalogue/CATALOGUE_OUTLET_NOVEMBER.xlsb` (upload 5 Nov 16:35). Dibaca dengan `scripts/xlsb_reader.py`; cocok ke master `territory_management_master.csv` (16,120 outlet) lewat id IM3 / 3ID (tanpa nol di depan).

## 1. Isi file

| Sheet | Isi |
|---|---|
| **Sheet1** | 36,391 baris = **satu baris per (brand, id)**: IM3 17,566, 3ID 18,825, tanpa duplikat brand+id. Kolom: `brand, id, s, site_nm, category, kecamatan_nm, kabkot_nm, region, sales_area, micro_cluster, partner_name, DSE_CODE_NOV, FINAL CATEGORY OUTLET OCT, MAPPING GROUP`. Semua Inner Jakarta, 7 sales area. |
| Sheet2 | Tabel kamus: 16 nilai `FINAL CATEGORY OUTLET OCT` → `GROUP` (MAPPING GROUP). |
| Sheet4 | Pivot count id per sales area × MAPPING GROUP (total 36,391, cocok dengan Sheet1). |

Catatan: nama kolom `FINAL CATEGORY OUTLET OCT` (bukan NOV), jadi isinya kemungkinan kategori final Oktober yang dipakai sebagai dasar November. Yang berlabel November hanya `DSE_CODE_NOV`. Perlu konfirmasi pemilik data.

## 2. Kategori program (MAPPING GROUP), per id brand

| MAPPING GROUP | id | Isi `FINAL CATEGORY OUTLET OCT` |
|---|---:|---|
| PJP | 21,447 | PJP |
| NON (non-PJP) | 14,223 | NON |
| **AVA** | **268** | AVA - PJP 260, AVA - NON 8 |
| **KRO** | **195** | KRO - PJP 187, KRO - NON 8 |
| **PROMOTOR** | **124** | PROMOTOR - PJP 119, PROMOTOR - NON 5 |
| **KAM** | **88** | KAM (semua) |
| **WS** (Wholesaler / AVA TM) | **46** | AVA TM 22, AVA TM - KAM 11, AVA TM - PJP 8, AVA TM - NON 2, WS - PJP 3 |

Per sales area: AVA 25–51, KRO 18–35, KAM 6–17, PROMOTOR 4–39, WS 4–9 (Sheet4).

Temuan:
* Kategori **baru dibanding Oktober**: **KAM** (88 id; 83 di antaranya belum ada di master) dan **AVA TM** (WS group). Belum ada **Tebus Murah**, **DSE**, **BOSS** dan **DtU** sebagai kategori. **DSF** hanya muncul di kolom `category` (59 baris, semuanya MAPPING GROUP NON), bukan di MAPPING GROUP.
* Kolom `category` (tipe sistem: Outlet Regular 30,973, Non-Telco 3,838, Server 868, KRO 196, Retailer Distributor 104, DSF 59, Wholesaler 34, Agent IOH 25, …) berbeda dari MAPPING GROUP: contoh AVA hampir semua "Outlet Regular", KAM kebanyakan "Outlet Server" (74) atau "Wholesaler" (12).
* Satu id punya satu kategori; **satu outlet fisik (Hybrid) bisa punya dua kategori** karena IM3 dan 3ID diberi label sendiri-sendiri (lihat §4).

## 3. Cocok ke master

* Id cocok ke master: IM3 12,592 dari 17,566; 3ID 11,264 dari 18,825. **Total 16,046 outlet (entity) master** dari 16,120 (74 outlet master tidak ada di file).
* **Tidak ada di master: 12,386 id NON** (non-PJP, di luar territory master), plus KAM 83, WS 35, PJP 21, PROMOTOR 9, AVA 1. Jadi **hampir semua program ada di master** (AVA 267 dari 268, KRO 195, PROMOTOR 115 dari 124), kecuali KAM dan WS (sebagian besar di luar master).
* Semua baris `PJP` punya DSE di master. `DSE_CODE_NOV` terisi 21,620 baris (semua cocok ke outlet master ber-DSE). Kode DSE November sama dengan kode master pada 19,767 baris dan **berbeda pada 1,853 baris** (perlu dilihat: bisa login baru DSEIN atau perubahan DSE).
* 990 baris PJP tidak punya `DSE_CODE_NOV` padahal master punya DSE; 591 baris NON punya DSE_CODE_NOV (NON bukan berarti tanpa DSE).

## 4. Satu outlet, dua label

Per outlet master (entity): label tertinggi (urutan WS > AVA > KRO > PROMOTOR > KAM > PJP > NON): PJP 14,153 · NON 1,374 · **AVA 253 · KRO 186 · PROMOTOR 64 · WS 11 · KAM 5**. **553 outlet punya label IM3 ≠ label 3ID** (mis. AVA+PJP 140, KRO+PJP 102, NON+PJP 236, KRO+PROMOTOR 23, PJP+PROMOTOR 19, AVA+KRO 9). Aturan Hybrid = satu entity (23 Okt) menuntut aturan gabung: **usul program = ada di salah satu id** (union), kelas dasar PJP/NON dari DSE.

## 5. Perbandingan dengan daftar Oktober (`kro_program_outlets.csv`, katalog 202610)

| Program | Okt (id) | Nov (id) | Sama | Hanya Okt | Hanya Nov |
|---|---:|---:|---:|---:|---:|
| AVA | 297 | 268 | 260 | 37 | 8 |
| PROMOTOR | 199 | 124 | 103 | 96 | 21 |
| Wholesaler / WS | 117 (tipe WS/Wholesaler) | 46 | – | – | – |
| KRO | 587 (tipe KRO, katalog) | 195 | 33 id Okt KRO ada di KRO Nov | 495 id Okt KRO sekarang berlabel **PJP** | – |
| DtU | 331 | tidak ada | 272 id DtU Okt sekarang berlabel PJP | – | – |

Artinya: **definisi program berubah**. Nov memakai daftar yang jauh lebih sempit (KRO 587 → 195; PROMOTOR 199 → 124; DtU hilang), dan KAM + AVA TM baru. Tidak boleh ditimpa diam-diam: angka Program & Tipe Outlet bergeser besar. Kelas performa KRO/Wholesaler di `mb_kro` tetap dari slab bulan lalu (tidak terpengaruh).

## 6. Rekomendasi (belum dibangun, perlu persetujuan)

1. **Sumber November**: parser baru untuk `CATALOGUE_OUTLET_NOVEMBER.xlsb` (Sheet1) di `build_catalogue_overlay_inputs.py` → `data/catalogues/catalogue_202611/` (`program_nov.csv`: brand, id, entity, mapping group, final category, DSE_CODE_NOV). `kro_program_outlets.csv` November ditulis dari MAPPING GROUP: **AVA, PROMOTOR, KRO program, KAM, WS/AVA TM**; PJP dan NON hanya sebagai dasar (bukan program).
2. **`mb_program`**: tambah toggle **KAM** dan **AVA TM** (nama dari kamus Sheet2), pertahankan AVA, PROMOTOR; **TOP PLAYER** tetap = flag Wholesaler (di Nov = WS 46 id); **DtU** dan **Tebus Murah/DSF/DSE** tetap memakai daftar Oktober sampai file baru (DtU tidak ada di file ini; DSF perlu keputusan apakah `category = DSF` 59 id dipakai).
3. **Aturan entity**: program outlet = union IM3/3ID; tampilkan 553 outlet yang labelnya berbeda sebagai flag (`PROGRAM_BEDA_BRAND`) untuk dikembalikan ke pemilik data.
4. **Monitoring performa**: tidak perlu mesin baru; `prgBench` sudah membandingkan program vs non-program di MC yang sama (GA, SP, Voucher, Saldo, FM · LMTD · MTD, visit PJP). Tambah: program November vs Oktober (movement keluar/masuk program), dan performa per kategori `KAM`, `AVA TM`.
5. **Kode DSE November**: bandingkan 1,853 baris yang beda dari master sebelum memutuskan memakai `DSE_CODE_NOV` (DSE per outlet saat ini dari FINAL 20 Okt).
6. Audit: `render_check.js` (toggle baru, popup `kr|pg|`), `audit_kro.js`, cek baru jumlah per program = angka di assessment ini.

## 7. Keputusan yang dibutuhkan dari pemilik

1. Apakah `FINAL CATEGORY OUTLET OCT` + `MAPPING GROUP` memang kategori program **November** (nama kolom masih OCT)?
2. Daftar program November menggantikan Oktober penuh (KRO 587 → 195, PROMOTOR 199 → 124, DtU hilang), atau hanya menambah AVA TM dan KAM?
3. **KAM** = Key Account Manager outlet? Apakah masuk menu Program & Tipe Outlet sebagai program tersendiri, dan apakah 83 id KAM di luar master dimasukkan sebagai non-PJP?
4. **DSF** (`category = DSF`, 59 id) dipakai sebagai program DSF?
5. Aturan Hybrid: union (rekomendasi) atau ikuti label IM3?
6. Pakai `DSE_CODE_NOV` untuk DSE per outlet November?

## 8. Built (5 Nov 2026, owner: "Ya, bangun"; rekomendasi §6 dipakai untuk keputusan §7 yang belum dijawab)

* `scripts/build_catalogue_nov_programs.py` (dipanggil di akhir `build_catalogue_overlay_inputs.py`, bisa juga jalan sendiri): membaca Sheet1 `CATALOGUE_OUTLET_*.xlsb` terbaru, menulis `data/catalogues/catalogue_202611/program_nov.csv` (semua 36,391 baris) dan **mengganti** baris program di `kro_program_outlets.csv` yang didefinisikan file November: AVA 268, Promotor 124, Wholesaler (katalog 202611) 46, KAM 88, AVA TM 43, KRO (program Nov) 195 (id per brand; Hybrid = union karena id salah satu brand menunjuk outlet yang sama). DtU, KRO tipe katalog 202610, Tebus Murah, DSF, DSE tetap daftar Oktober / kosong. PJP dan NON hanya dasar.
* Cocok ke master di feed KRO (`meta.programs`, outlet / id): AVA 254/268, AVA TM 42/43, KAM 80/88, KRO Nov 195/195, Promotor 94/124, WS 45/46, DtU 312/331.
* App: `PRG_SPEC` + toggle **KAM** dan **AVA TM**; TOP PLAYER = Wholesaler katalog 202611; KRO (program Nov) tidak jadi toggle (KRO Management memakai kelas bulan lalu). Baris Area › MC memberi label "(tanpa MC)" untuk id program di luar master (popup `kr|pg|N:<area>|…`; sebelumnya kunci `M:` kosong menggabung beberapa area).
* Belum: `DSE_CODE_NOV` (1,853 baris beda dari master) tidak dipakai; DSF `category` dan flag `PROGRAM_BEDA_BRAND` (553 outlet) menunggu keputusan; perbandingan program Nov vs Okt (movement) belum ada.
* Cek: `render_check.js` lulus. `audit_kro.js` 8 selisih kecil (±20 pcs dari 173,868) ada juga dengan feed sebelum perubahan ini (sumber raw bergeser oleh sesi lain), bukan dari daftar program.

## 9. KAM dan DSF sebagai kategori program (owner, 5 Nov 2026)

KAM dan DSF diperlakukan setara AVA / PROMOTOR: masing-masing satu program dengan daftar sendiri, dihitung di Program & Tipe Outlet (slab, UAR, growth, kunjungan PJP, popup). KAM = MAPPING GROUP KAM (88 id, 80 cocok master). **DSF = `category` DSF (59 id): hanya 3 yang ada di master**, sisanya outlet di luar master (non-PJP), jadi performa DSF di aplikasi sebagian besar n/a sampai id di luar master masuk; daftar ada di `kro_program_outlets.csv` (builder `build_catalogue_nov_programs.py`).
