# Program · Harian (5 Nov 2026)

Menu `mb_program_daily` ("📅 Program · Harian", link `#/mb_program_daily?kroProd=…&pdTab=kat|det&pdGroup=am|area|dso|dse`). Permintaan pemilik: performa harian per kategori outlet program (whitelist) vs non-program / Retail, D1–D30 ke kanan, lalu MTD · LMTD · Growth · Last FM; plus versi detail per Area, MC, DSO dengan toggle program, kunjungan dan performa.

## Data (dinilai dulu, tidak ada yang ditebak)
* Harian per outlet sudah ada di feed sumber: GA `o` (hari, qty) di `ga_feed`; SP, Voucher (VCF+VCB) dan Saldo (SALMO) sell-in di `penjualan_feed` (`c[...][10]`); SP Injection, Voucher Injection dan Saldo sell-out di `demand_feed`. Harian bulan lalu **tidak** ada untuk sell-in / demand, tetapi tidak dibutuhkan: LMTD dan Last FM sudah ada sebagai total di baris KRO (`q`).
* `build_kro_feed.py` sudah menggabungkan semuanya per outlet fisik, jadi vektor harian ditambahkan di sana (satu sumber, aturan Hybrid / entity yang sama) dan ditulis ke `website/data/program_daily_feed.js` (`window.PROGRAM_DAILY`, 140 KB): `rows` = vektor harian 6 ukuran (ga, sp, vsi, vso, ssi, sso) hari 1..cut untuk setiap anggota program (1,374 outlet); `mc` = total harian dan [FM, LMTD, MTD] semua outlet per `area|MC`. **Non-program harian = total MC − anggota**, sehingga tidak perlu vektor harian 17 ribu outlet.
* Rekonsiliasi: jumlah harian semua MC = MTD per ukuran (GA 15,330; SP 4,054; Voucher SI Rp 562.8 Jt; Voucher SO Rp 666.5 Jt; Saldo SI Rp 2.121 M; Saldo SO Rp 14.51 M), dicek di `render_check.js`.
* Cut berbeda per ukuran (GA 3 Nov, MOBII / MOBO 4 Nov): hari sesudah cut tampil "·" (bukan nol). Bila GA bulan berjalan belum diterima (GA behind) kolom harian dan MTD GA n/a.

## Tampilan
* **Per kategori program**: baris = tiap program (AVA, PROMOTOR, TOP PLAYER, DtU, KAM, AVA TM, DSF, …; yang dimatikan diberi "(mati)"), **Program terpilih (gabungan)**, **Non-program / Retail** dan **TOTAL**. Kolom: Outlet, kunjungan (≥1×, belum, %), D1..D30, MTD, LMTD, Growth (MTD ÷ LMTD − 1, hari sama), Last FM.
* **Detail Area › MC › DSO**: kelompok Area › MC (DSO tertera), Area, DSO (satu per MC) atau DSE; toggle program yang sama dengan Program & Tipe Outlet; kolom tambahan Non-program (MTD, growth) dan **Program ÷ non-program per outlet**.
* Produk dan ukuran sama dengan Program & Tipe Outlet (SP, Voucher SI / SO, Saldo SI / SO, GA); Rp dalam juta. Unduh CSV tabel yang tampil.
* Filter Area / HoA / MC berlaku pada semua kolom; **filter DSE** membuat harian non-program dan total n/a (total harian hanya per MC), MTD / LMTD / kunjungan tetap. Periode B (FM Okt vs FM Sep): menu menjelaskan bahwa harian hanya periode berjalan.
* Satu outlet di beberapa program muncul di setiap program, tetapi dihitung sekali di Gabungan.

## Cek
`node scripts/render_check.js`: 2 tampilan × 6 produk / ukuran × 4 pengelompokan tanpa error, tanpa undefined / NaN, jumlah harian = MTD. Tanpa audit baru; angka diambil dari `q` baris KRO, jadi mengikuti `audit_kro.js`.
