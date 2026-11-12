# Assessment · Whitelist Outlet Program v1 dan alokasi Top Player (11 Nov 2026)

Satu file baru di `raw/Catalogue`: `Whitelist_Outlet_Program_v1.xlsb` (upload 11 Nov 20:04), ditambah gambar alokasi Top Player (partner, alokasi, id outlet; grand total 79,500) dari owner. Dibaca dengan `scripts/xlsb_reader.py`, dicocokkan ke master `territory_management_master.csv` dan ke daftar program yang sedang aktif di sistem (commit `5a5f8e9`, yang sudah terbit). Assessment ini dibuat SEBELUM commit dan publish.

Snapshot sebelum: `data/catalogues/catalogue_202611/program_before_whitelist.json`; GA / SP sebelum dan sesudah: `program_perf_whitelist_before_after.json`.

## 1. Isi file

| Sheet | Isi | Baris | Dipakai |
|---|---|---:|---|
| `AVA 50,150` | brand, branch, partner territory, id, nama, **TARGET 50 / 150 pcs per outlet** ("Alokasi 600 per MC, CB Rp 10,000") | 820, hanya **325** di 7 branch Inner Jakarta (sisanya Sukabumi, Bogor, Bandung, Tangerang, dll.) | program **AVA** |
| `PROMOTOR` | outlet promotor (CB Rp 10,000) | 216 | program **Promotor** |
| `TEBUS MURAH` | 30 outlet per region, target 500-1000 pcs (CB Rp 10,000) | 30 | program **Tebus Murah** |
| `TOP PLAYER` | CB 10+10 = Rp 20,000, awal mula free KPK | 23 | program **Top Player (peserta Nov)** |
| `DTU` | **login DTU DSE** (`DTUIN001..`, bukan id outlet), CB Rp 16,000 | 59 | program **DTU** (ditambah) |
| `DSF` | id DSF | 40 | tidak mengubah daftar DSF (semuanya sudah ada) |
| `ALL OUTLET` | 36,924 outlet Inner Jakarta dengan flag per program (AVA 319, Promotor 212, Tebus Murah 27, Top Player 17, DTU 42, DSF 39) dan kolom DUPLIKAT PROGRAM (654 outlet) | 36,924 | pemeriksaan jumlah |
| `SUMMARY` | pivot per branch: AVA 319, Promotor 212, Tebus Murah 27, Top Player 17, DTU 42, DSF 39, total 656 | - | pemeriksaan: jumlah per branch cocok dengan sheet AVA / Promotor |

Ejaan branch dinormalkan (`Kab Bekasi` = KAB BEKASI, `East Jakarta` = EAST JAKARTA, `BEKASI` = KOTA BEKASI). Dua id berada di dua program sekaligus (satu AVA + Promotor, satu Tebus Murah + Top Player), sama dengan kolom DUPLIKAT PROGRAM; id itu dihitung di kedua program.

## 2. Sebelum vs sesudah (daftar id di `kro_program_outlets.csv`)

| Program | Id sebelum | Id sesudah | Sama | Baru | Keluar |
|---|---:|---:|---:|---:|---:|
| AVA | 269 | **322** | 267 | 55 | 2 |
| Promotor | 124 | **213** | 115 | 98 | 9 |
| Tebus Murah | 29 | 29 | 29 | 0 | 0 |
| Top Player (peserta Nov) | 5 | **23** | 5 | 18 | 0 |
| DTU (catalogue type + login DTU DSE) | 331 | **390** | 331 | 59 login | 0 |
| DSF, Kotkab, Wholesaler 202611 (TOP PLAYER lama), AVA TM, KAM | tidak berubah | | | | |

Whitelist v1 menggantikan daftar peserta (Participants AVA) untuk AVA, Promotor, Tebus Murah dan Top Player, karena lebih baru dan memakai ID outlet yang sama (AVA 267 dari 269 id lama tetap ada).

## 3. Kecocokan ke feed (outlet yang benar-benar terukur)

| Program | Id | Outlet di feed KRO | Catatan |
|---|---:|---:|---|
| AVA | 322 | 294 (237 outlet punya baris performa) | hampir semua PJP (235) |
| Promotor | 213 | 141 (126 punya baris performa, 124 PJP) | 72 id promotor tidak ada di feed (di luar master dan tanpa transaksi) |
| Tebus Murah | 29 | 27 (24 punya baris) | hanya 9 PJP; 15 id non-master |
| Top Player | 23 | 22 (18 punya baris) | **16 dari 18 non-PJP** (wholesaler di luar master) |
| DTU DSE login | 59 | 16 login ditemukan di feed | 43 login belum punya transaksi di MOBII / MOBO; login tidak masuk baris KRO, hanya daftar |

## 4. Mapping performa (GA dan SP, feed KRO, MTD 1-9 Nov, LMTD sama hari, FM Oktober)

| Program | Outlet sebelum → sesudah | GA MTD | GA LMTD | GA FM Okt | SP MTD (pcs) | SP LMTD | SP FM |
|---|---|---|---|---|---|---|---|
| AVA | 200 → **237** | 4,010 → **4,676** | 3,036 → 3,524 | 11,788 → 13,687 | 736 → 814 | 98 → 143 | 3,372 → 3,928 |
| Promotor | 84 → **126** | 2,949 → **4,624** | 3,341 → 5,356 | 12,812 → 19,505 | 430 → 648 | 35 → 48 | 1,536 → 2,252 |
| Top Player (peserta) | 2 → **18** | 30 → **22,292** | 49 → 635 | 137 → 12,524 | 0 | 0 | 5 → 10 |
| Tebus Murah | 24 → 24 | 3,327 | 1,404 | 21,595 | 44 | 15 | 16,513 |

* **Top Player**: 22,292 GA MTD dari 18 outlet (wholesaler besar yang non-PJP, misalnya Wr Ucil 4,793, Axie Infinity 3,005, Sedayu Cell 2,877, Gimbal Cell 2,296, Khusnul Cell 2,177). Dengan daftar peserta ini Top Player terlihat jauh lebih besar daripada daftar 5 outlet sebelumnya; dibandingkan dengan target GA Top Player 80,000, MTD 9 hari = 27.9% (pro-rata 9/30 = 30%).
* **Promotor**: kini 126 outlet bukan 84, GA MTD 4,624 vs LMTD 5,356 (-13.7%), jadi program tampak lemah di basis baru; sebelumnya -11.7%.
* **AVA**: GA MTD +32.7% vs LMTD pada basis baru (4,676 vs 3,524); SP pcs MTD 814 vs LMTD 143.
* Basis GA mengikuti feed (cut GA = 9 Nov); SP, Voucher dan Saldo sampai 10 Nov.

## 5. Alokasi Top Player (gambar) vs target program

15 baris alokasi, 23 id outlet (pasangan IM3 + 3ID dihitung dua id), total **79,500 pcs**; kita sudah punya target Top Player 80,000 (`program_target_nov.csv`):

| Branch | Alokasi gambar | Target di sistem | Selisih |
|---|---:|---:|---:|
| CENTRAL NORTH JAKARTA | 10,000 | 10,000 | 0 |
| EAST JAKARTA | 10,000 | 10,000 | 0 |
| KAB BEKASI | 10,000 | 10,000 | 0 |
| **KARAWANG** | **9,500** | 10,000 | **-500** |
| KOTA BEKASI | 10,000 | 10,000 | 0 |
| SOUTH JAKARTA DEPOK | 15,000 | 15,000 | 0 |
| WEST JAKARTA | 15,000 | 15,000 | 0 |
| **Total** | **79,500** | **80,000** | **-500** |

Selisih 500 hanya di Karawang (alokasi gambar Elkomindo 3,500 + Kawan Data 3,000 + Sakalaguna 3,000 = 9,500). Alokasi per partner dan id disimpan di `data/catalogues/catalogue_202611/top_player_allocation_nov.csv`; semua 23 id di gambar sama dengan 23 id sheet TOP PLAYER. Partner di gambar (Buana Telekomindo, Multi Makmur Indonesia, Trimindo Jaya Mandiri, Distribusi Voucher Nusantara, Elkomindo Mitra Mandiri, Sannin Brother Megah, Kawan Data Nusantara, Sakalaguna Semesta, Loka Karsa Informasi) belum dipakai sebagai kolom di aplikasi; hanya 9 dari 23 id ada di master, sisanya non-PJP sehingga partner dari master tidak tersedia.

## 6. Hal yang perlu keputusan pemilik

1. **Top Player**: 23 outlet peserta (target Free KPK, alokasi 79,500) ditambahkan ke toggle TOP PLAYER, tidak menggantikan 46 id Wholesaler katalog; keduanya bersama. Konfirmasi: apakah daftar 23 ini saja yang dihitung untuk target Top Player 80,000?
2. **Selisih Karawang 500** pada alokasi (79,500 vs 80,000): koreksi target atau alokasi?
3. **AVA tier 50 / 150**: 252 outlet tier 50, 29 tier 150, 2 tier 100, 42 tanpa tier (kolom TARGET berisi 'IM3' / '3ID' yang saya abaikan). Disimpan di `whitelist_program_v1.csv` (`ava_tier_pcs`) tetapi belum dipakai sebagai target per outlet di aplikasi.
4. **DTU**: sheet DTU berisi login DTU DSE, bukan outlet; saya menambahkannya sebagai daftar tambahan (59 login, 16 ada di feed). Performa DTU di aplikasi masih dari 331 outlet tipe DTU.
5. 525 baris AVA di luar Inner Jakarta (Sukabumi, Bogor, Bandung, dll.) tidak dipakai.

## 7. Implementasi

* `scripts/build_whitelist_program.py` (baru, dipanggil setelah `build_program_participants.py` di `build_catalogue_nov_programs.py`): menulis `data/catalogues/catalogue_202611/whitelist_program_v1.csv` dan mengganti baris AVA, Promotor, Tebus Murah, Top Player di `kro_program_outlets.csv`; menambah login DTU DSE.
* Data baru: `top_player_allocation_nov.csv` (dari gambar).
* Feed KRO, feed target dan feed harian program dibangun ulang; bridge check vs guideline OK. Tidak ada perubahan `app.js`.
* Nomor telepon tidak ada di workbook ini dan tidak diimpor.

## 8. Pemeriksaan sesudah perubahan

`render_check.js` lulus semua view; `audit_kro.js` reconciles; `audit_consistency.js` 275 dari 275; `audit_scorecard.js` 162 dari 162. Belum commit, belum publish.

## 9. Keputusan pemilik (11 Nov 2026) dan hasil akhir

1. **TOP PLAYER = 23 outlet peserta saja** (sumber `Top Player (peserta Nov)`); daftar Wholesaler katalog 202611 (46 id) tetap sebagai data tetapi tidak lagi menjadi sumber toggle TOP PLAYER (`PRG_SPEC` di `app.js`).
2. **Target Top Player tetap 80,000 dan Karawang 10,000** (target program tidak diubah); alokasi gambar 79,500 hanya dicatat.
3. **Tier AVA 50 / 150 tidak dipakai dulu** (tetap tersimpan di `whitelist_program_v1.csv`).
4. **DTU tetap 331 outlet tipe DTU**: login `DTUIN###` tidak ditambahkan ke program (builder melewati sheet DTU); 59 login hanya ada di `whitelist_program_v1.csv`.

Pemeriksaan ulang sesudah keputusan: render_check lulus, audit_kro reconciles, konsistensi 275 / 275, scorecard 162 / 162.

## 10. Koreksi (11 Nov 2026): Top Player = 24 id

Gambar alokasi memuat **24 id** (bukan 23): `562979` (Centini Cell, KAB BEKASI, Sannin Brother Megah) tidak ada di sheet TOP PLAYER workbook. Gambar menjadi acuan: `build_whitelist_program.py` menambahkan semua id `top_player_allocation_nov.csv` ke Top Player (peserta Nov), sehingga daftar = 24 id. Angka "23" di bagian di atas = isi sheet saja.

## 11. Area untuk outlet program non-master (owner, 12 Nov 2026: "Ya, bangun")

Kasus SH159810 dan SH241506: keduanya sudah di Top Player tetapi bukan outlet master, jadi tanpa Area (GA Top Player Central North Jakarta tampil 0; 8,585 dari 22,293 GA MTD jatuh ke OUTSIDE MASTER TERRITORY).
Perubahan: `build_kro_feed.py` memberi outlet non-master yang ada di whitelist program **Area = branch whitelist** (30 outlet; field baris `pbr = 1`; MC dan DSE tetap kosong, status tetap non-PJP). Hasil: tidak ada lagi outlet Top Player di luar wilayah; Central North Jakarta memuat SH241506 (GA MTD 1,977); West Jakarta memuat 4 outlet (GA MTD 6,608). SH159810 tidak punya baris GA / supply di feed KRO (hanya saldo sell-out Rp 946,200 di Demand) sehingga belum tampil di tabel program.

## 12. Whitelist_Outlet_Program_Nov_2026.xlsb (12 Nov 2026, dari Downloads)

Versi baru workbook yang sama (sheet AVA 50,150, PROMOTOR, TEBUS MURAH, TOP PLAYER, DTU, DSF, ALL OUTLET, SUMMARY) ditambah sheet **RETAILER_DISTRIBUTOR** ("Outlet produksi 5GB/28 & 7GB": 37 outlet, qty 5,000, kategori Retailer Distributor / Outlet Regular / Outlet Server / Wholesaler) dan kolom bantu pasangan IM3 / 3ID di sheet PROMOTOR. Salinan disimpan di `raw/Catalogue/`; `build_whitelist_program.py` kini memilih file `Whitelist_Outlet_Program*.xlsb` terbaru menurut waktu upload.

| Sheet / program | v1 (11 Nov) | Nov 2026 (12 Nov) | Perubahan |
|---|---:|---:|---|
| AVA 50,150 | 325 baris Inner Jakarta | 325 | **tidak berubah** (322 id, sama dengan daftar aktif) |
| PROMOTOR | 215 baris / 213 id | 228 baris / **228 id** | **+16 id baru, 1 keluar (172682)**; 13 outlet 3ID bertambah; branch Kota Bekasi 26 → 32, East Jakarta 27 → 32, Central North Jakarta 30 → 32, Kab Bekasi 21 → 23 |
| TEBUS MURAH | 29 | 29 | tidak berubah |
| DTU | 59 login | 59 | tidak berubah (program DTU tetap 331 outlet tipe DTU, keputusan 11 Nov) |
| DSF | 40 | 40 | tidak berubah (semua sudah ada di daftar DSF 96 id) |
| TOP PLAYER | 23 | 23 | tidak berubah (24 id dari gambar tetap) |
| RETAILER_DISTRIBUTOR | tidak ada | 37 outlet | **belum dipakai** (bukan salah satu dari lima program yang diminta) |

Id Promotor baru: 12303351, 144847, 1771717, 294861, 299996, 307714, 322880, 39589, 409410, 53540, 60798, 654762, 84663, 88263, 88663, SH024192. 61 dari 228 baris tidak punya nama outlet ('0'), kebanyakan sisi 3ID dari pasangan hybrid.

Hasil di feed (Promotor): id 213 → **228**, outlet terukur di feed KRO 141 → **150**. Program lain tidak berubah.

Performa Promotor (GA / SP, MTD 1-10 Nov): outlet dengan baris performa 126 → **131** (PJP 124 → 129); GA MTD 4,624 → **4,636**, LMTD 5,356 → 5,389, FM Okt 19,505 → 19,626; SP MTD 682 → 705 pcs, LMTD 48 → 54. Perubahan kecil karena 16 id baru hampir tidak bertransaksi.
