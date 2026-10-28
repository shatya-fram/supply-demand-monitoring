# Daily update 28 Okt 2026 (siang): MOBO, SALMO dan End Balance ke 27 Okt

Status: assessment sebelum commit dan publish (CLAUDE.md §2). Tidak ada kode yang diubah; feed dibangun ulang oleh `scripts/daily_update.py`.

## 1. Hasil scan `raw/`

| Data | File | Cut | Status |
|---|---|---|---|
| Visit PJP | `*_visit_dse_202610__27_27.zip` | 27 Okt | sudah terbit pagi ini, tidak ada file 28 Okt |
| MOBII Supply | `DAILY_DATA_MOBII_202610.xlsb` (28 Okt 05:44) | 27 Okt | sudah terbit pagi ini |
| **MOBO Demand dan SALMO** | `DAILY_DATA_MOBO_202610.xlsb`, `..._SALMO_202610.xlsb` (28 Okt 02:04) | 26 → **27 Okt** | baru |
| **End Balance** | snapshot 27 Okt (`endbal_20261027.zip`, CSV 28 Okt 07:51) | 26 → **27 Okt** | baru |
| GA by Outlet, GA per site, Fav Locs | file 27 Okt 11:49–11:55 | 26 Okt | **belum ada file baru** |

Semua data kini di 27 Okt kecuali GA (26 Okt).

## 2. Angka utama

- **Demand MTD (RLD + VCI + CVM + PKT) 1–27 Okt: Rp 103,22 B** (26 Okt: Rp 98,24 B, jadi +Rp 4,98 B untuk 27 Okt). Reload Rp 16,43 B, Voucher Injection Rp 13,56 B, CVM Rp 3,11 B, Paket Data Rp 70,11 B; SP Injection Rp 0,85 B (di luar total).
- **Saldo Mobo (SALMO) MTD:** Rp 125,62 M → **Rp 130,05 M**, 13.404 outlet, hari terakhir 27 Okt, tidak ada id tidak dikenal.
- **End Balance snapshot 27 Okt:** 129.321 baris, 18.225 outlet (master 16.025, non-PJP 2.200); stok Rp 3,52 M, 5.570 outlet stok nol; saldo sell-in 27 Okt Rp 1,17 M di 1.858 outlet.
- Peringatan builder yang sudah dikenal: sheet CVM berisi 54.472 baris identik dengan RECARGE (Rp 31,9 M), dibuang seperti sebelumnya.

## 3. Pemeriksaan

`render_check`, `audit_scorecard` (164), `audit_ga` (3.683), `audit_consistency` (278), `audit_kro`, `audit_sp` (16), `audit_dse_catalogue`, `audit_entity` semua lolos.

## 4. Perlu perhatian

1. GA tertinggal sehari (26 Okt) sampai Victor mengunggah file GA 27 Okt; kartu GA MTD dan target tetap pada 26 Okt.
2. Belum commit, belum publish.
