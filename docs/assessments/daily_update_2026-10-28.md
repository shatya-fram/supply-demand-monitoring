# Daily update 28 Okt 2026: Visit PJP dan MOBII ke 27 Okt

Status: assessment sebelum commit dan publish (CLAUDE.md §2). Tidak ada kode yang diubah; feed dibangun ulang oleh `scripts/daily_update.py`.

## 1. Hasil scan `raw/`

| Data | File | Cut | Status |
|---|---|---|---|
| Visit PJP | `im3_/3id_visit_dse_202610__27_27.zip` (27 Okt 22:46) | 26 → **27 Okt** | baru |
| MOBII Supply (Penjualan ke Outlet) | `DAILY_DATA_MOBII_202610.xlsb` (28 Okt 05:44) | 26 → **27 Okt** | baru |
| MOBO Demand dan SALMO | `DAILY_DATA_MOBO_202610.xlsb`, `..._SALMO_202610.xlsb` (27 Okt 02:46) | 26 Okt | **belum ada file 27 Okt** |
| End Balance | snapshot 26 Okt (file 27 Okt 05:43) | 26 Okt | **belum ada snapshot 27 Okt** |
| GA by Outlet, GA per site, Fav Locs | file 27 Okt 11:49–11:55 | 26 Okt | tidak ada yang baru |

Akibatnya cut tidak seragam: Visit PJP dan Sell-In (MOBII) di 27 Okt; Demand (MOBO), Saldo Mobo, End Balance, GA di 26 Okt. Halaman yang membandingkan Sell-In dengan Demand per hari (Supply vs Demand, UAR) membaca satu hari lebih awal di sisi demand.

## 2. Angka utama (27 Okt vs 26 Okt)

- **PJP**: periode 1–27 Okt, 23 hari kerja, tidak ada hari yang terlewat. Planned 154.105 → **162.592**, executed 119.868 → **127.741**, hit rate 77,8% → **78,6%**, productive 45,6% → 45,9%. Cakupan MTD outlet PJP 99,1% → **99,2%** (belum divisit MTD 139 → 123). Jendela hari kerja: belum divisit 3 hari 909 → 959 (23 → 24, 26, 27 Okt; Minggu 25 Okt dilewati), 7 hari 309 → 279.
- **Sell-In (MOBII)** MTD 1–27 Okt: SP Rp 2,40 M (LMTD 1–27 Sep Rp 2,31 M), Voucher fisik Rp 5,07 M (LMTD Rp 10,15 M), Voucher bonus Rp 0,62 M (Rp 1,18 M), Saldo outlet Rp 16,78 M (Rp 22,87 M). Penurunan vs LMTD sebagian dampak migrasi awal Oktober (CLAUDE.md §5).
- **KPI DSE**: SP 133.559 pcs, outlet ber-SP 9.145, UAR >= 5 5.942.

## 3. Pemeriksaan

`render_check`, `audit_scorecard` (164), `audit_ga` (3.683), `audit_consistency` (278), `audit_kro`, `audit_sp` (16), `audit_dse_catalogue`, `audit_entity` semua lolos.

## 4. Perlu perhatian

1. MOBO, SALMO, dan End Balance 27 Okt belum diunggah; kirim ulang scan setelah Thofa mengunggah, supaya cut kembali seragam.
2. `data-change-log.md` perlu entri baru bila disetujui commit.
3. Belum commit, belum publish.
