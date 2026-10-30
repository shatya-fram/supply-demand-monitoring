# Daily update 30 Okt 2026: Visit PJP, MOBO, SALMO dan End Balance ke 29 Okt

Status: assessment sebelum commit dan publish (CLAUDE.md §2). Tidak ada kode yang diubah oleh update ini; feed dibangun ulang oleh `scripts/daily_update.py` (exit 0).

## 1. Hasil scan `raw/`

| Data | File | Cut | Status |
|---|---|---|---|
| Visit PJP | `im3_/3id_visit_dse_202610__29_29.zip` (29 Okt 22:56) | 28 → **29 Okt** | baru |
| MOBO Demand | `DAILY_DATA_MOBO_202610.xlsb` (29 Okt 22:55) | 28 → **29 Okt** | baru |
| SALMO | `DAILY_DATA_MOBO_SALMO_202610.xlsb` (29 Okt 22:55) | 28 → **29 Okt** | baru, tidak ada hari ditahan |
| End Balance | snapshot 29 Okt (`..._2026-10-30_05-12-59*.csv`, `endbal_20261029.zip`) | 28 → **29 Okt** | baru |
| MOBII Supply (Penjualan ke Outlet) | `DAILY_DATA_MOBII_202610.xlsb` (30 Okt 06:40) | 28 → **29 Okt** | baru (diunggah setelah refresh pertama, refresh diulang) |
| GA by Outlet, GA per site | `Daily_RGUGA_OUTLET_202610.xlsb`, `rguga_daily_outlet_202610.csv` (28 Okt 22:31) | 27 Okt | **belum ada file baru** |
| GA Fav Locs | `Daily_RGUGA_favloc_202610.xlsb` (27 Okt 11:55) | 26 Okt | **belum ada file baru**; tidak dibaca builder mana pun |
| Vanguard 5G | `Vanguard_InnerJKT_*_Step1-5_LIVE_29Okt2026.xlsx` (29 Okt 07:57) | 29 Okt | dibaca builder baru `build_vanguard_feed.py` (bagian dari `daily_update`); file pertama, progres harian n/a sampai ada file kedua |

Cut: Visit PJP, Sell-In (MOBII), Demand, Saldo Mobo, End Balance semuanya di 29 Okt; hanya GA yang masih 27 Okt. End Balance memakai Sell-In sampai 29 Okt (`sellin_cut`).

## 2. Angka utama (baru vs commit terakhir)

- **PJP**: periode 1–29 Okt, 25 hari kerja, tidak ada hari terlewat. Planned 171.414 → **180.801**, executed 136.014 → **144.772**, hit rate 79,3% → **80,1%**, productive 46,2% → 46,7%, ad-hoc 15.814 → 17.359. Cakupan MTD outlet PJP 99,3% (belum divisit MTD 110 → 100); belum divisit 3 hari kerja 870 → 838, 7 hari 265 → 250.
- **Demand MTD (RLD+VCI+CVM+PKT) 1–29 Okt**: Rp 106,90 B → **Rp 110,81 B** (+Rp 3,91 B). Reload 17,08, Voucher Injection 16,13, CVM 3,29, Paket Data 74,30; SP Injection 0,95 (di luar total).
- **Saldo Mobo (SALMO) MTD**: Rp 137,04 B → **Rp 143,10 B**, 13.493 → 13.553 outlet, hari terakhir 29 Okt.
- **End Balance snapshot 29 Okt**: 129.703 baris (28 Okt 129.525), 18.246 outlet tak berubah; baris tidak terpetakan 14.765 → 14.812, saldo tidak terpetakan Rp 2,40 B → Rp 1,96 B.
- **Sell-In (MOBII)** MTD 1–29 Okt (LMTD 1–29 Sep): SP Rp 2,54 B (2,62 B), Voucher isi 5,50 B (11,59 B), Voucher blank 0,84 B (1,43 B), Saldo outlet 19,95 B (27,63 B). Penurunan vs LMTD sebagian dampak migrasi awal Oktober (CLAUDE.md §5).
- **GA** tetap 27 Okt: IM3 156.019, 3ID 92.128.
- **Vanguard 5G (file LIVE 29 Okt)**: Step selesai 1.222 / 708 / 866 / 785 / 1.069 (Step 1–5), 491 site lengkap.

## 3. Pemeriksaan

`render_check`, `audit_scorecard` (164), `audit_ga` (3.629), `audit_consistency` (278), `audit_kro`, `audit_sp` (16), `audit_dse_catalogue`, `audit_entity` semua lolos. Peringatan builder yang sudah dikenal: sheet CVM berisi 53.315 baris identik dengan RECARGE (Rp 31,8 B), dibuang; 22.377 baris CVM dipertahankan.

## 4. Perlu perhatian

1. **GA 28 Okt belum diunggah** (GA dua hari di belakang data lain). Fav Locs terakhir 26 Okt; selisih +4,3% CSV vs Fav Locs belum dikonfirmasi ke Victor.
2. Working tree memuat perubahan `website/app.js` dan `website/vanguard.js` dari sesi lain (Vanguard); itu bukan bagian dari update data ini dan tidak ikut di-commit di sini.
3. Belum commit, belum publish. Folder `portal/`, dokumen GA Circle Jaya, dan `.claude/launch.json` bukan bagian dari update ini.
