# Daily update 31 Okt 2026: MOBII, MOBO, SALMO, End Balance ke 30 Okt; export Visit PJP 30 Okt bermasalah

Status: assessment sebelum commit dan publish (CLAUDE.md §2). Export Visit PJP 30 Okt ternyata scope Circle (lihat §3); atas persetujuan owner (31 Okt) builder visits kini hanya membaca baris `REGIONAL = INNER JAKARTA`. Refresh ulang **RESULT: OK**, semua audit lolos. Belum ada yang di-commit.

## 1. Hasil scan `raw/`

| Data | File | Cut | Status |
|---|---|---|---|
| MOBII Supply | `DAILY_DATA_MOBII_202610.xlsb` (31 Okt 00:42) | 29 → **30 Okt** | baru |
| MOBO Demand | `DAILY_DATA_MOBO_202610.xlsb` (31 Okt 00:42) | 29 → **30 Okt** | baru |
| SALMO | `DAILY_DATA_MOBO_SALMO_202610.xlsb` (31 Okt 00:42) | 29 → **30 Okt** | baru, tidak ada hari ditahan |
| End Balance | snapshot 30 Okt (`endbal_20261030.zip`, `..._2026-10-31_06-30-15*.csv`) | 29 → **30 Okt** | baru |
| Visit PJP | `im3_/3id_visit_dse_202610__30_30.zip` (31 Okt 00:43; salinan identik juga di root `raw/`) | 29 → **30 Okt** | baru, scope Circle, difilter ke Inner Jakarta (§3) |
| GA by Outlet, GA per site | `Daily_RGUGA_OUTLET_202610.xlsb`, `rguga_daily_outlet_202610.csv` (28 Okt 22:31) | 27 Okt | **belum ada file baru** |
| GA Fav Locs | `Daily_RGUGA_favloc_202610.xlsb` (27 Okt 11:55) | 26 Okt | belum ada file baru; tidak dibaca builder mana pun |
| Vanguard 5G | file LIVE 29 Okt | 29 Okt | belum ada file baru |

## 2. Angka (bagian yang sehat)

- **Sell-In (MOBII) MTD 1–30 Okt**: SP Rp 2,54 → **2,72 B**, Voucher isi 5,50 → **5,63 B**, Voucher blank 0,84 → **0,89 B**, Saldo outlet 19,95 → **21,19 B**.
- **Demand MTD (RLD+VCI+CVM+PKT)**: Rp 110,81 → **115,21 B** (+Rp 4,40 B). Saldo Mobo (SALMO) Rp 143,10 → **150,89 B**, 13.553 → 13.674 outlet.
- **End Balance snapshot 30 Okt**: 129.769 baris (129.703), 18.281 outlet (18.270).
- **GA** tetap 27 Okt (IM3 156.019, 3ID 92.128).
- **PJP (Inner Jakarta, 1–30 Okt, 26 hari kerja, tidak ada hari terlewat)**: planned 180.801 → **188.537**, executed 144.772 → **151.721**, hit rate 80,1% → **80,5%**, productive 46,7% → 46,8%, ad-hoc 17.359 → 18.113. 30 Okt: 8.465 planned / 7.411 actual. Cakupan MTD outlet PJP 99,3% → **99,1%** (belum divisit MTD 100 → 130); belum divisit 3 hari kerja 838 → 1.078, 7 hari 250 → 296. WoW +8,3%. Operator 483 (DSE 272 + PROMOTOR TOKO 211), sama seperti sebelumnya.
- Audit lolos: `audit_scorecard` (164), `audit_ga` (3.629), `audit_consistency` (278), `audit_kro`, `audit_sp` (16), `audit_dse_catalogue`, `audit_entity`. Peringatan CVM identik RECARGE sudah dikenal (52.703 baris dibuang, 22.989 dipertahankan).

## 3. Export Visit PJP 30 Okt dan perubahan builder

- File 30 Okt (111 MB, 261.710 baris) tidak punya baris `REGIONAL -> INNER JAKARTA` dan berisi seluruh Circle Jakarta Raya: INNER JAKARTA 83.862 baris, **OUTER JAKARTA 100.114**, **WEST JAVA 77.710**, 23 baris `REGIONAL-TEST`. File 29 Okt (39 MB) hanya Inner Jakarta. Tanpa filter, planned 30 Okt menjadi 25.810 (normal sekitar 9.000), operator 2.274 (normal 483) dan `audit_scorecard` gagal.
- **Perubahan kode** (`scripts/generate_dse_visits_feed.py`, disetujui owner: hanya Inner Jakarta): baris dengan kolom `REGIONAL` selain `INNER JAKARTA` dilewati dan dihitung di log (`Rows of other regionals skipped`). Satu penyesuaian lanjutan: hari yang tercakup file tetapi tanpa satu pun baris Inner Jakarta (Minggu 18 Okt, yang sebelumnya hanya berisi baris sampah `regional_desc` / `area_desc` di file 3ID) tetap tampil sebagai hari 0 / 0, sehingga jendela WoW 7 hari tetap utuh (`audit_consistency` gagal 2 pemeriksaan sebelum penyesuaian ini).
- **Efek pada angka lama (kecil, ke arah benar)**: file 3ID hari-hari sebelumnya juga memuat sedikit baris non-Inner Jakarta (mis. 28 Okt 396 baris OUTER JAKARTA / WEST JAVA, 29 Okt 503 baris) dan baris uji (`REGIONAL-TEST`, `EAST JAVA`) yang tadinya ikut dihitung sebagai stop di luar wilayah master. Total planned hari 1–29 Okt turun dari 180.801 menjadi 180.072 (-729, 0,4%); 28 Okt 8.822 → 8.799, 29 Okt 9.387 → 9.355. Angka PJP 29 Okt yang sudah dipublikasikan kemarin karenanya 0,4% lebih tinggi daripada angka terkoreksi.
- Saran ke Thofa: export berikutnya tetap dengan filter Regional = Inner Jakarta (file 30 Okt hanya dibaca dengan benar karena filter di builder).

## 4. Perlu perhatian lain

1. GA 28–30 Okt belum diunggah (GA tiga hari di belakang); Fav Locs terakhir 26 Okt; Vanguard belum ada file baru (29 Okt).
2. Working tree memuat perubahan `website/app.js` dan `website/vanguard.js` dari sesi lain; tidak ikut di-commit.
3. Belum commit, belum publish.
