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
