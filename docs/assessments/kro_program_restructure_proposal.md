# Analisis dan rekomendasi · Restrukturisasi menu KRO Management dan Program & Tipe Outlet (4 Nov 2026)

Status: **analisis saja, belum ada kode atau feed yang diubah** (CLAUDE.md §2). Basis data: `kro_feed.js` dibangun 4 Nov (cut supply / demand / visit 3 Nov), `data/catalogues/kro_program_outlets.csv`, `catalogue_202610/outlet_types.csv`, kode `viewKro` / `viewProgram` di `website/app.js`.

## 1. Permintaan

| Menu | Fokus yang diminta |
|---|---|
| **KRO Management** | Pisahkan outlet menurut **tipe KRO bulan sebelumnya** (kelas slab) untuk **GA, Sell-In, Voucher, Saldo Mobo**; kinerja dilacak **FM Okt · LMTD Okt · MTD Nov** |
| **Program & Tipe Outlet** | Outlet yang di-**flag ikut program**: **AVA, PROMOTOR, WHOLESALER, TEBUS MURAH, DSF, DSE** |

## 2. Kondisi sekarang

**Struktur `mb_kro`:** 4 tab (Ringkasan KRO, Katalog Outlet, Tracking per DSO / DSE, Aksi Prioritas), toggle produk (SP, Voucher, Saldo, GA) dan Sell In / Sell Out, serta **tiga mode katalog**: Slab performa bulan lalu, **Whitelist**, dan **Program**. **Struktur `mb_program`:** toggle program (union / irisan) lalu **mengulang hampir seluruh analisis KRO** (slab per periode, perbandingan program, Area › MC, daftar outlet).

**Masalah yang ditemukan**

1. **Dua konsep tercampur.** "KRO / Wholesaler" ada sebagai *kelas kinerja* (slab volume bulan lalu) dan sebagai *tipe katalog* (label statis di OUTLET IOH). Keduanya sering tidak sama (bagian 3). `mb_kro` memuat mode Program dan Whitelist, `mb_program` memuat analisis slab, jadi batas kedua menu kabur dan logikanya ganda.
2. **Periode GA tidak sejajar dengan produk lain.** Supply dan demand sudah bulan berjalan (FM = Okt, LMTD = 1–3 Okt, MTD = 1–3 Nov; `cuts`: supply 3, demand 3, visit 3), tetapi **feed GA masih Oktober**: `cuts.ga = 31`, basis GA = September (`ga_base_days 30`). Jadi di layar kelas GA "bulan lalu" = **September** dan MTD GA = **Oktober penuh**, sedangkan SP / Voucher / Saldo "bulan lalu" = **Oktober**. Satu outlet bisa KRO di GA (basis Sep) tetapi dinilai dengan basis Okt di produk lain. Belum ada file GA November.
3. **Label periode masih kaku.** 24 label "FM Sep / LMTD Sep / MTD Okt" dan catatan "FM = September penuh · MTD = Oktober" masih tertulis di `app.js` dan di teks `definitions` feed, padahal data supply / demand sudah Okt / Nov.
4. **Program tidak lengkap.** Daftar program hanya berisi apa yang ada di katalog: AVA 297, Promotor 199, DTU 331, Wholesaler (katalog) 117, KRO (katalog) 587. **BOSS dan Tebus Murah: 0 anggota. DSF dan DSE: tidak ada sumber data sama sekali.** Flag tipe KOTKAB (3.631 outlet) memang bukan program.
5. **Retail ikut dimuat** lewat `kro_slim.js` (18.883 outlet) hanya untuk mode Whitelist / Program, sehingga halaman KRO terasa berat dan angka "outlet" bertambah setelah file kedua selesai dimuat.

## 3. Data yang mendasari rekomendasi

**Kelas KRO / Wholesaler per produk** (standar slab; 4 Nov, FM bulan sebelumnya)

| Produk | KRO + Wholesaler di FM | Wholesaler | KRO | KRO + W di proyeksi bulan ini |
|---|---:|---:|---:|---:|
| GA (basis Sep, MTD Okt) | 1.145 | 314 | 831 | 1.135 |
| SP sell-in + injection (FM Okt) | 609 | 133 | 476 | 343 |
| Voucher sell-in (Rp) | 27 | 2 | 25 | 4 |
| Voucher sell-out (VCI) | 226 | 14 | 212 | 26 |
| Saldo sell-in (SALMO) | 305 | 1 | 304 | 192 |
| Saldo sell-out (SAL) | 787 | 130 | 657 | 444 |

* **Perputaran tinggi pada GA:** dari 1.145 outlet KRO + W di September, **hanya 610 tetap KRO + W di Oktober** (535 turun, 585 outlet baru naik). Ini alasan kohort harus dikunci pada kelas *bulan sebelumnya* lalu dilacak, bukan diklasifikasi ulang tiap bulan.
* **Voucher sell-in hampir tidak punya KRO** (27 outlet): slab Rp 10 jt ke atas jarang tercapai di sell-in; pelacakan yang bermakna ada di sell-out (VCI, 226).

**Tipe katalog vs kelas kinerja (basis FM)**

| Flag katalog | Outlet | KRO + W di slab GA | di slab SP | di slab Saldo sell-in |
|---|---:|---:|---:|---:|
| KRO (katalog) | 575 | 424 (74%) | 39 (7%) | 50 (9%) |
| Wholesaler (katalog) | 116 | 91 (78%) | 9 (8%) | 8 (7%) |
| AVA | 275 | 86 (31%) | 38 (14%) | 34 (12%) |
| Promotor | 145 | 112 (77%) | 20 (14%) | 14 (10%) |
| DTU | 320 | 56 (17%); 228 outlet tanpa GA | 17 (5%) | 3 (1%) |

Label katalog hanya cocok dengan kelas kinerja pada GA (74–78%); untuk SP, Voucher, dan Saldo kecocokannya di bawah 15%. **Dua konsep ini memang berbeda dan harus dipisah.** Program saling tumpang tindih sedikit (AVA ∩ KRO 30, AVA ∩ DTU 11, AVA ∩ Promotor 10, selebihnya ≤ 9), jadi satu outlet boleh ikut lebih dari satu program tanpa aturan khusus.

**Aksi Prioritas (contoh layar South Jakarta Depok, produk SP):** Belum dikunjungi 8 · Berhenti 36 · Turun kategori 15 · Supply tanpa GA 24 · GA tanpa supply outlet 110 · Tanpa data sell-in 67 · Tanpa DSE 1 · Tanpa demand 119. Flag-flag ini sudah sesuai kebutuhan KRO Management dan dipertahankan.

## 4. Rekomendasi

### A. KRO Management (`mb_kro`): kohort berdasarkan kelas KRO bulan sebelumnya
1. **Satu definisi kohort:** kelas slab pada **FM (bulan lalu)** per produk. Pelacakan: **FM Okt · LMTD Okt (1–cut) · MTD Nov · Proyeksi Nov · Gap & Growth · UAR · Visit PJP** (sudah ada, tinggal label dan basis dibuat mengikuti bulan feed).
2. **Produk (tab produk):** **GA · Sell-In SP · Voucher · Saldo Mobo**, dengan toggle Sell In / Sell Out tetap untuk Voucher dan Saldo. Satu halaman Ringkasan per produk: tabel kohort (Wholesaler W1–W4, KRO K1–K2, Retail) × periode, matriks perpindahan kelas (FM → proyeksi, atau LMTD → MTD pada hari yang sama), dan ringkasan Area › MC › tipe KRO.
3. **Tab baru "KRO 360":** satu baris per outlet dengan kelas di **empat produk sekaligus** (GA / SP / Voucher / Saldo) dan jumlah produk di mana outlet berkelas KRO atau Wholesaler. Menjawab "outlet mana KRO di semua produk" dan "KRO di GA tetapi Retail di SP". Data sudah ada di feed (`q` per produk), tidak perlu feed baru.
4. **Hapus mode Whitelist dan Program dari KRO** (dipindah ke Program & Tipe Outlet, lihat B). `mb_kro` hanya memuat outlet berkelas KRO dan Wholesaler di FM, jadi `kro_slim.js` (Retail) tidak lagi dimuat di halaman ini; Retail hanya lewat pencarian ID / nama.
5. **Tampilkan tipe katalog sebagai atribut / filter** ("Tipe katalog: KRO, Wholesaler, AVA, Promotor …") di Katalog Outlet, bukan sebagai kohort.
6. **Tab Tracking per DSO / DSE dan Aksi Prioritas dipertahankan** tanpa perubahan flag.
7. **Perbaiki periode GA** (butuh keputusan, bagian 6): sampai file GA November ada, tampilkan GA dengan FM = **Oktober penuh**, LMTD = 1–cut Okt, MTD Nov = **n/a** (bukan Oktober penuh di kolom MTD). Setelah file GA Nov masuk, otomatis sejajar. Label periode dibaca dari `metadata` (bukan teks kaku).

### B. Program & Tipe Outlet (`mb_program`): outlet yang di-flag ikut program
1. **Satu program = satu flag keikutsertaan:** **AVA, PROMOTOR, WHOLESALER, TEBUS MURAH, DSF, DSE** (nama persis seperti permintaan). Tiap program menjadi kartu: jumlah outlet, % dikunjungi (visit PJP), UAR, serta **empat produk (GA, SP, Voucher, Saldo)** dalam FM / LMTD / MTD, untuk melihat **dampak program** pada kinerja.
2. **Perbandingan program vs non-program** di MC yang sama (sudah ada data di feed): rata-rata volume per outlet program dibanding rata-rata outlet bukan program di MC itu. Ini ukuran keikutsertaan yang bermakna; saat ini tabel hanya membandingkan program satu sama lain.
3. **Satu outlet boleh banyak program:** kohort gabungan (union) sebagai default, irisan sebagai opsi (sudah ada). Mode **Whitelist** dipindah ke sini sebagai "Program manual (unggah daftar ID)" untuk BOSS, Tebus Murah, DSF, DSE sebelum sumber resminya ada.
4. **Wholesaler di sini = flag tipe katalog** (116 outlet), bukan kelas kinerja. Kelas kinerja Wholesaler ada di KRO Management; di Program dua angka itu ditampilkan berdampingan ("flag Wholesaler / kelas GA W").
5. **KRO dan DTU:** keluarkan **KRO (katalog)** dari daftar program (sudah menjadi tipe kinerja di menu KRO); **DTU** ada di data (331) tetapi tidak disebut di permintaan. Rekomendasi: simpan sebagai "tipe lain" yang bisa dinyalakan, bukan program utama (keputusan 3).
6. **Kolom yang sama persis di kedua menu** (FM / LMTD / MTD / Proyeksi, UAR, visit), memakai satu komponen tabel, supaya angka tidak berbeda antar menu.

### C. Yang dipakai ulang (tidak dibangun baru)
Feed `kro_feed.js` (kelas, volume FM / LMTD / MTD, visit, flag), helper slab dan popup `kr|`, tabel periode, `kroKatalog` / `kroTracking`, dan unggah CSV program. Perubahan utama ada di `viewKro` / `viewProgram` (pemecahan tanggung jawab), label periode berbasis feed, dan builder GA / KRO untuk basis GA (bila disetujui).

## 5. Rencana kerja bertahap (setelah persetujuan)

| Tahap | Isi | Risiko |
|---|---|---|
| 1 | Label dan basis periode mengikuti feed (Okt / Nov) di kedua menu; GA FM = Okt, MTD Nov n/a | Rendah, mengubah teks dan satu baris builder |
| 2 | Pisahkan `mb_kro` (hanya kohort FM KRO + W) dan `mb_program` (flag program); pindahkan Whitelist | Sedang, mengubah routing dan state |
| 3 | Tab KRO 360 | Rendah, hanya menampilkan data feed |
| 4 | Kartu program dengan perbandingan program vs non-program; flag baru TEBUS MURAH, DSF, DSE | Tergantung data (bagian 6) |
| 5 | `render_check` (popup vs angka sel), `audit_kro.js`, dokumen, CLAUDE.md | Wajib sebelum commit |

## 6. Keputusan yang saya perlukan

1. **Sumber data TEBUS MURAH, DSF, dan DSE.** Tidak ada di `raw/` maupun di katalog 202610 (tipe yang tersedia hanya RETAIL, KRO, WS, Wholesaler, DTU, AVA, Kotkab, Promotor). Mohon kirim file daftar ID outlet per program, atau konfirmasi apakah dipetakan dari sheet lain. **Arti "DSF" dan "DSE" sebagai flag program** juga perlu dijelaskan (apakah DSE berarti outlet yang dilayani DSE / PJP, atau program tertentu?).
2. **GA bulan lalu:** setuju memakai **Oktober penuh** sebagai FM sampai file GA November tersedia, dengan MTD Nov = n/a?
3. **DTU dan KRO (katalog):** DTU tetap sebagai "tipe lain"; KRO (katalog) hanya menjadi atribut?
4. **Wholesaler di Program:** flag katalog (116 outlet) berdampingan dengan kelas kinerja, atau satu saja?
5. **Retail di KRO Management:** hanya lewat pencarian (rekomendasi), atau tetap ada filter Kategori?

Setelah poin 1, 2, dan 4 dijawab, tahap 1–3 bisa langsung dikerjakan; tahap 4 menunggu data program.

## 7. Keputusan owner (4 Nov 2026) dan yang sudah dibangun

**Keputusan:** (1) Tebus Murah, DSF dan DSE memakai daftar Oktober sampai ada perubahan (hanya AVA, Promotor, Wholesaler dan DTU yang punya daftar Oktober di katalog 202610; **Tebus Murah, DSF dan DSE belum punya daftar**, tersedia lewat unggah CSV `program,outlet_id`); (2) GA memakai Oktober dulu: FM = Oktober penuh, MTD November n/a; (3) DTU = channel baru **Direct to Users (DtU)**, tampil sebagai program; (4) dua Wholesaler: **kelas kinerja** (historis, KRO Management) dan **kelas flagging** (whitelist katalog), dengan nama data **TOP PLAYER**; (5) Retail di KRO Management: **filter Kategori dan pencarian**, dua-duanya.

**Dibangun**
* `build_kro_feed.py`: mode **GA behind** (bila file GA lebih tua dari bulan Sell-In, otomatis): GA FM = bulan GA penuh (Oktober, 31 hari), LMTD = 1..cut Oktober, MTD dan proyeksi `null` (n/a), `metadata.keys.ga.has_mtd = false`, `cuts.ga_behind`; flag STOP / DOWN tidak muncul untuk GA tanpa MTD. Begitu file GA November masuk, builder kembali ke mode normal. Dampak: kelas GA dan SP / Voucher / Saldo sekarang pada bulan yang sama (sebelumnya GA September vs lainnya Oktober). KRO + Wholesaler GA di FM: 1.135 (Oktober); `audit_kro.js` memahami mode ini.
* **KRO Management**: kohort = kelas bulan lalu; mode Whitelist dan Program dihapus dari menu; tab baru **KRO 360** (kelas pada empat produk, kartu klik untuk daftar: KRO+ di 1 / 2 / 3 / 4 produk, GA tanpa SP, SP tanpa GA); Katalog Outlet punya filter Kategori dan pencarian (Retail lewat pencarian) dan menampilkan tipe katalog / program sebagai atribut di bawah ID.
* **Program & Tipe Outlet**: toggle AVA · PROMOTOR · TOP PLAYER · DtU · TEBUS MURAH · DSF · DSE (yang belum ada daftar tampil "menunggu daftar"), unggah CSV program dan **whitelist ID manual** pindah ke sini, tabel baru **Program vs bukan program** di MC yang sama (% aktif dan volume per outlet aktif per periode), analisis slab per periode tetap.
* Label periode: GA dalam mode behind memakai jam Sell-In (`moBaseFor` → `sg`), jadi FM Okt · LMTD Okt · MTD Nov tampil di semua produk; banner GA menjelaskan.
* `render_check.js`: kartu KRO 360 = baris popup, tidak ada mode Whitelist / Program di KRO, urutan toggle program.
