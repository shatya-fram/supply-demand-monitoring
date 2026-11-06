# Program target setting · Target vs Aktual (6 Nov 2026)

Sumber: lembar "ALOKASI PROGRAM NOVEMBER" (gambar dari pemilik, 6 Nov 2026), disalin ke `data/catalogues/program_target_nov.csv` (satu baris per channel dan area), dibangun ke `website/data/program_target_feed.js` oleh `python3 scripts/build_program_target_feed.py`. Total per channel dicocokkan dengan lembar dan dicek di `render_check.js`.

| Channel | Grup | Target Nov | Unit | Aturan | Program yang diukur |
|---|---|---:|---|---|---|
| AVA 50,150 @10K | Retail outlet | 21,600 | 36 MC | alokasi 600/MC | AVA |
| KOTKAB @5K | Retail outlet | 41,526 | hanya 3 area | 60% outlet | KOTKAB (daftar Oktober, 3,631 id) |
| PROMOTOR 7K / 10K | Retail outlet | 48,000 | 120 promotor | 400/promotor, cap 400 | n/a: RGUGA tidak punya GA per promotor |
| OUTLET PROMOTOR +10K | Retail outlet | 24,000 | 120 | 200/promotor, tanpa cap | Promotor |
| TEBUS MURAH / KAM @10K | Big outlet | 15,000 | 30 kuota | 30 outlet per region | KAM (daftar Tebus Murah belum ada) |
| TOP PLAYER (New) @20K | Big outlet | 80,000 | 1 per area | 10k + 10k | TOP PLAYER (WS) |
| DTU DSE @1K | DTU + DSF | 26,650 | 272 DSE | DSE 3/hari | DtU (sementara) |
| DSF +10K | DTU + DSF | 12,500 | 25 DSF | +10K | DSF (59 id, 3 di master) |

## Asumsi (perlu dikonfirmasi pemilik)
1. **Ukuran aktual = GA pcs** untuk semua channel (lembar tidak menyebut ukuran). Dapat diganti per channel di CSV kolom `measure` (ga, sp, vsi, vso, ssi, sso) tanpa ubah kode.
2. KOTKAB sekarang program (daftar tipe KOTKAB katalog 202610) karena lembar memberi target; sebelumnya "bukan program".
3. Target harian = target bulan ÷ jumlah hari bulan (hari rata); target pro-rata = target × hari berjalan ÷ hari bulan.
4. Target per area saja (belum per MC); target antar channel tidak dijumlahkan.

## Tampilan
Tab **Target vs Aktual** di Program & Tipe Outlet (`prgTab=target`): kartu per channel, grafik kumulatif target vs aktual (aktual, proyeksi pada CRR, jalur RRR), **Monthly Target View** (target, pro-rata, MTD, % dan gap vs pro-rata, % dan gap ke target bulan, CRR, RRR, proyeksi, status) dan **Daily Target View** (D1..D30 harian vs target harian, atau kumulatif vs target kumulatif), channel › area dengan buka / tutup. **CRR** = MTD ÷ hari berjalan; **RRR** = (target − MTD) ÷ hari tersisa untuk 100%. Status: hijau ≥ 100% pro-rata, kuning 80–100%, merah < 80%.

## Perubahan lain di hari yang sama
* **Program · Harian** (`prgTab=harian`): urutan kolom diubah: Performa (MTD, LMTD, Growth, Last FM) di kiri, lalu Achievement vs target (target bulan, % vs pro-rata, gap, CRR, RRR) dan non-program, kolom harian dengan % achievement dan gap vs target harian, **kunjungan PJP di paling kanan**. Target dipakai bila channel punya target pada ukuran yang dipilih (GA).
* **Daily GA Trend** (kedua basis): kotak **Target harian est** (default 12,000 pcs/hari, hari rata, disimpan di link `gtDt`), garis target di grafik harian dan kumulatif, kartu Target harian · MTD vs pro-rata · **CRR vs RRR** · proyeksi vs target, dan kolom Target harian / % harian / gap kumulatif di tabel D1–D31.

## Kenapa LMTD Oktober basis Site belum lengkap (pertanyaan pemilik, 6 Nov)
Feed site bulan berjalan memakai file Fav Locs November (`rguga_daily_favloc_inner_202611.csv`), jadi hanya berisi November. Oktober dengan definisi yang sama (lokasi favorit) hanya ada di `Daily_RGUGA_favloc_202610.xlsb` (snapshot 27 Okt): **level Region saja, D1–D26** (cabang tidak lengkap, tanpa kecamatan / MC). File Oktober per kecamatan (`Site_rguga_daily_outlet_202610.csv`, `Daily_RGUGA_Kecamatan_202610.xlsb`) memakai definisi aktivasi site, tidak sebanding dengan Fav Locs (D1 Oktober 6,836 vs 7,353). Karena itu LMTD per kecamatan / MC / Area di basis Site n/a; basis Outlet (tagging) lengkap. LMTD Region D1–D3 Fav Locs Oktober = 4,767 + 4,669 + 5,077 = 14,513 GA vs MTD November 17,347 (+19.5%). Belum dibangun ke app (perlu keputusan: hanya Region, atau minta file Fav Locs Oktober per kecamatan).

## Pengelompokan channel, Summary Achievement dan Katalog Program (owner, 6 Nov 2026)
* **Grup channel (dapat dibuka / ditutup, `CH_GROUPS`)** di semua tab Program & Tipe Outlet (Ringkasan, Harian, Matriks, Summary, Target): **Wholesaler** = TOP PLAYER, TEBUS MURAH / KAM (daftar KAM), AVA TM; **Program** = AVA, PROMOTOR; **Direct** = DtU, DSF; **Retail & KRO** = KOTKAB + outlet di luar semua program flag, dengan rincian slab Retail (R1, R2, tanpa volume bulan lalu) dan KRO (K1.., kelas Wholesaler non-program) menurut slab produk terpilih bulan lalu. Baris grup menghitung outlet sekali (gabungan program). Harian per slab non-program n/a (vektor harian hanya untuk anggota program; non-program total dari total MC − anggota).
* **Review kunjungan** = baris/seksi terakhir setiap tab: outlet, dikunjungi ≥ 1×, belum, %, tanpa DSE, check-in per outlet, KRO+ belum dikunjungi, per grup, program dan slab.
* **Summary Achievement** (`prgTab=summary`): Region, per Area, per Channel (grup), pivot Channel / Area / Channel › Area / Area › Channel, kolom Target Nov (FM target), pro-rata, MTD, % vs pro-rata, gap, LMTD, growth, Last FM, CRR, DRR (= RRR), proyeksi; matriks Channel × Area (% / gap / MTD / target); grafik batang MTD aktual vs MTD target (pro-rata) dan MTD aktual vs target bulan penuh. Total hanya menjumlahkan channel yang punya aktual (PROMOTOR sebagai orang tidak ikut).
* **Katalog · Program & Partisipasi Program** (`#/cat_program`): daftar id per program, partisipasi (outlet dengan volume MTD), performa MTD / LMTD / Last FM / kunjungan per program, daftar outlet sampai level outlet (ID IM3 / 3ID, program, Area, MC, DSE, performa, kunjungan, link Profil Outlet), pencarian, unduh CSV.
* Belum dijawab pemilik: memakai `OUTLET_WISE` (workbook 6 Nov, PROMOTOR 189 id, KRO 528, AVA 288, WS 50, KAM 75) sebagai daftar program November, dan cut GA D4.

## Guideline target 6 Nov 2026: Bridge Target (menggantikan angka di tabel awal dokumen ini)
Sumber: slide "TARGET PER SALES AREA" dan "DSF + D2U PER SALES AREA" (GA Bridge Plan, sheet PRGRAM SELLOUT, November), disalin ke `data/catalogues/program_target_bridge_nov.csv` (total target per area + angka per hari guideline) dan `program_target_nov.csv`.
* **Total target 361,750** (per area: Central North 48,325 · East 47,770 · Kab Bekasi 66,691 · Karawang 45,752 · Kota Bekasi 44,878 · South Jakarta Depok 67,037 · West 41,297). Target harian = total ÷ 30 = 12,058.
* **Retail & KRO natural = sisanya** = total target area − Retail Program − Wholesaler − D2U − DSF (total 128,474; 4,282 per hari). Kanal baru `RETAIL & KRO NATURAL` (program `~NP` = outlet di luar semua program flag).
* **Retail Program** = AVA 21,600 + **Promotor 36,000** (300 per promotor = 75% dari lembar sebelumnya; OUTLET PROMOTOR tidak lagi dipisah) + **Kab/Kota Fokus (KOTKAB) 41,526** = 99,126 (3,304 per hari). KOTKAB sekarang bagian grup Program.
* **Wholesaler** = TM 500 per hari · KAM 15,000 + TOP PLAYER 80,000 = 95,000 (3,167 per hari). **D2U** = 26,650 (272 DSE, DSE 3/hari, CB 10K) dan **DSF** = 12,500 (25 DSF, # DSF = target ÷ 500, CB 10K); DSF per area berubah menjadi 2,000 · 1,500 · 2,500 · 2,000 · 2,000 · 1,500 · 1,000.
* Per hari = bulanan ÷ 30 (slide 1, semua kolom per hari dijumlah = target harian ±1); slide DSF + D2U = bulanan ÷ 25 hari kerja (DSF 500 per hari, D2U 1,066, combined 1,566; 39,150 per bulan).
* `python3 scripts/build_program_target_feed.py` mencocokkan setiap angka (natural, program, wholesaler, D2U, DSF, target harian, D2U / DSF per 25 hari) dengan guideline: **semua sesuai** (`metadata.bridge_check` kosong); `render_check.js` gagal bila total ≠ 361,750 atau ada selisih.
* Tab **Bridge Target** (`prgTab=bridge`): dua tabel seperti slide, kolom Cek vs guideline, dan Bridge vs aktual (MTD vs pro-rata per komponen dan area). Grup channel: Program = AVA, Promotor, KOTKAB; Retail & KRO = natural (non-program) dengan slab Retail dan KRO.
* Informasi di situs: deskripsi menu Program & Tipe Outlet (Supply & Demand) dan kartu laporan 02 di landing page portal menyebut Bridge Target, Target vs Aktual dan Summary Achievement.

### Konfirmasi pemilik (6 Nov 2026)
* **Promotor + Outlet Promotor dihitung 36.000** (bukan 72.000): dengan 72.000 sisa Retail & KRO Kota Bekasi negatif (−751) dan total 361.750 tidak bisa dipenuhi. Sisa Retail & KRO = 128.474 (4.282 per hari).
* **DSF total 12.500**, pembagian per area mengikuti slide DSF + D2U (2.000 · 1.500 · 2.500 · 2.000 · 2.000 · 1.500 · 1.000), bukan lembar ALOKASI PROGRAM (1.500 · 2.000 · 2.000 · 2.000 · 2.000 · 2.000 · 1.000).
* Cross-check lembar ALOKASI (Promotor 48.000 + Outlet Promotor 24.000, total komponen 269.276, sisa 92.474) tidak dipakai; angka di app sudah sesuai konfirmasi ini, tidak ada perubahan data.
