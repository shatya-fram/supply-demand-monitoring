# Daily update 29 Okt 2026: Visit PJP, MOBII, End Balance dan GA ke 28 / 27 Okt

Status: assessment sebelum commit dan publish (CLAUDE.md §2). Tidak ada kode yang diubah; feed dibangun ulang oleh `scripts/daily_update.py` (exit 0).

## 1. Hasil scan `raw/`

| Data | File | Cut | Status |
|---|---|---|---|
| Visit PJP | `im3_/3id_visit_dse_202610__28_28.zip` (28 Okt 22:27) | 27 → **28 Okt** | baru |
| MOBII Supply (Penjualan ke Outlet) | `DAILY_DATA_MOBII_202610.xlsb` (28 Okt 22:26) | 27 → **28 Okt** | baru |
| MOBO Demand | `DAILY_DATA_MOBO_202610.xlsb` (28 Okt 02:04) | 27 Okt | **belum ada file baru** |
| SALMO | `DAILY_DATA_MOBO_SALMO_202610.xlsb` (28 Okt 22:26) | file sampai 28 Okt | baru, tetapi **ditahan di cut MOBO 27 Okt** (Rp 6,99 M hari setelah cut tidak ditampilkan, `held_after_cut`) |
| End Balance | snapshot 28 Okt (`..._2026-10-29_05-17-58*.csv`, 29 Okt 05:34) | 27 → **28 Okt** | baru |
| **GA by Outlet** | `Daily_RGUGA_OUTLET_202610.xlsb` (28 Okt 22:31) | 26 → **27 Okt** | baru |
| **GA per MSISDN / site** | `rguga_daily_outlet_202610.csv` (28 Okt 22:31, 2.146.334 baris) | 26 → **27 Okt** | baru |
| **GA Fav Locs** | `Daily_RGUGA_favloc_202610.xlsb` (27 Okt 11:55) | 26 Okt | **tidak ada file baru**; tidak dibaca builder mana pun |

Cut tidak seragam: Visit PJP, Sell-In (MOBII), End Balance di 28 Okt; Demand (MOBO), Saldo Mobo, GA di 27 Okt. Halaman yang membandingkan Sell-In dengan Demand per hari (Supply vs Demand, UAR) membaca satu hari lebih awal di sisi demand.

## 2. Angka utama (baru vs commit terakhir)

- **PJP**: periode 1–28 Okt, 24 hari kerja, tidak ada hari terlewat. Planned 162.592 → **171.414**, executed 127.741 → **136.014**, hit rate 78,6% → **79,3%**, productive 45,9% → 46,2%, ad-hoc 14.863 → 15.814. Cakupan MTD outlet PJP 99,2% → **99,3%** (belum divisit MTD 123 → 110). Belum divisit 3 hari kerja 959 → 870, 7 hari 279 → 265. Entity-day: 119.282 planned, 94.451 actual (79,2%).
- **Sell-In (MOBII)** MTD 1–28 Okt (LMTD 1–28 Sep): SP Rp 2,52 M (2,55 M), Voucher isi Rp 5,26 M (10,88 M), Voucher blank Rp 0,71 M (1,29 M), Saldo outlet Rp 17,79 M (24,57 M). Penurunan vs LMTD sebagian dampak migrasi awal Oktober (CLAUDE.md §5).
- **End Balance snapshot 28 Okt**: 129.525 baris (27 Okt 129.321), 18.246 outlet (18.225); outlet master 23.830 baris tak berubah, adhoc 2.231 → 2.252, tidak terpetakan 14.734 → 14.765 baris (saldo tidak terpetakan Rp 2,33 M → 2,40 M).
- **GA Okt (Daily_RGUGA_OUTLET, cut 27)**: IM3 144.243 → **156.019** (+11.776), 3ID 82.669 → **92.128** (+9.459). Di outlet master: IM3 83.887 → 87.190, 3ID 36.421 → 38.763. September tetap IM3 159.420, 3ID 92.775.
- **GA site (aktivasi di IJ, dari `ga_site_feed.js`)**: 5.569 → 5.572 site; GA IJ (jumlah vektor S/A/X) 152.823 → 164.576 (+11.753 untuk 27 Okt).
- **Demand / Saldo Mobo**: tidak berubah (cut 27 Okt, Saldo Mobo Rp 130,05 M, 13.404 outlet).

## 3. Pemeriksaan

`render_check`, `audit_scorecard` (164), `audit_consistency` (278), `audit_kro`, `audit_sp` (16), `audit_dse_catalogue`, `audit_entity` semua lolos. `audit_ga` lolos 3.629 pemeriksaan (sebelumnya 3.683: jumlah pemeriksaan mengikuti data, tidak ada yang gagal). Peringatan builder yang sudah dikenal: sheet CVM berisi 54.472 baris identik dengan RECARGE (Rp 31,9 M), dibuang seperti sebelumnya.

## 4. Perlu perhatian

1. **MOBO Demand 28 Okt belum diunggah** (file masih 28 Okt 02:04). SALMO sudah sampai 28 Okt tetapi ditahan di cut demand agar Saldo Mobo tidak lebih maju daripada kategori demand lain. Kirim ulang scan setelah Thofa mengunggah MOBO.
2. **GA harian masih tinggi**: +21,2 rb GA di outlet-basis untuk 27 Okt saja (IM3 + 3ID). Lonjakan nyata di sumber sejak 23 Okt; penyebab (program/promo) belum diketahui. Tren harian dan proyeksi akhir bulan ikut naik.
3. **Fav Locs** belum ada file baru (terakhir 26 Okt); selisih +4,3% CSV vs Fav Locs yang dicatat pada asesmen 27 Okt belum dikonfirmasi ke Victor.
4. Fav Locs belum menjadi sumber di app (terkait sesi GA Circle Jaya).
5. Belum commit, belum publish. Folder `portal/`, dokumen GA Circle Jaya, dan `.claude/launch.json` bukan bagian dari update ini.

## 5. Tambahan (29 Okt 05:52): MOBO Demand 28 Okt masuk

`DAILY_DATA_MOBO_202610.xlsb` diunggah ulang 29 Okt 05:52; refresh diulang. Cut Demand dan Saldo Mobo kini **28 Okt**, seragam dengan PJP, MOBII, End Balance (28 Okt). Hanya GA yang masih 27 Okt. Demand MTD (RLD+VCI+CVM+PKT) Rp 103,22 B → **Rp 106,90 B** (+Rp 3,68 B; Reload 16,59, Voucher Injection 14,97, CVM 3,21, Paket Data 72,13; SP Injection 0,93 di luar total). Saldo Mobo (SALMO) MTD Rp 130,05 M → **Rp 137,04 M**, 13.404 → 13.493 outlet, tidak ada id tidak dikenal, tidak ada hari ditahan. Peringatan CVM identik dengan RECARGE kini 53.916 baris (21.776 CVM dipertahankan). Semua audit lolos ulang (scorecard 164, GA 3.629, consistency 278, KRO, SP 16, katalog DSE, entity, render_check). Butir 1 di §4 (MOBO belum diunggah) sudah terselesaikan.
