# Daily update 9 Nov 2026

Scan `python3 scripts/daily_update.py --check` 9 Nov 05:43, lalu refresh penuh (`daily_update.py`, exit 0).

## File yang masuk
| Data | File | Cut |
|---|---|---|
| Sell-In MOBII | `DAILY_DATA_MOBII_202611.xlsb` (8 Nov 22:39) | 8 Nov |
| Demand MOBO + SALMO | `DAILY_DATA_MOBO_202611.xlsb`, `..._SALMO_202611.xlsb` (8 Nov 22:39) | 8 Nov |
| PJP visit | `*_visit_dse_202611__07_07.zip`, `__08_08.zip` (8 Nov 22:40) | 8 Nov |
| ENDBAL | `Stock Balance Daily Report_2026-11-09_...` (isi snapshot 8 Nov; 16.193 outlet) | 8 Nov |
| GA by Outlet + Fav Locs | tidak ada file baru sejak 8 Nov 10:15 | **7 Nov** |

GA tetap D7: kelompok lain D8, jadi GA satu hari di belakang sampai file GA berikutnya.

## Perbandingan dengan feed sebelumnya
- Hari 1-6 tidak ada yang direvisi (Sell-In, Demand, PJP, GA).
- **D7 (Sabtu 7 Nov)**: SP MOBII 21.006 pcs (hari biasa sekitar 1.500); SP Injection 30.095 pcs, hampir semua di 4 MC: Babelan 10.008, Bekasi Tengah 10.000, Pasar Minggu 6.001, Cipayung 2.503. Saldo Mobo (MOBO SAL) 8,27 B (D6 6,49 B), SALMO sell-in 1,17 B, Voucher Injection 659 Jt. Pola bulk injection ke beberapa MC, bukan kenaikan merata; perlu konfirmasi pemilik data.
- **D8 (Minggu 8 Nov)**: PJP planned 34, actual 0 (hari Minggu, bukan hari kerja). Sell-In dan Demand D8 rendah (SALMO sell-in 0,3 Jt, saldo Mobo 1,84 B), wajar untuk hari Minggu.
- GA D6 10.799 dan D7 12.810 tetap tinggi (belum ada revisi), lihat `daily_update_2026-11-08_ga.md`.
- Catatan runner: lembar CVM berisi 52.034 baris identik dengan RECARGE (Rp 31,7 B), dihapus oleh builder (sama seperti sebelumnya).

## Audit
audit_consistency 275 OK, audit_scorecard 162 OK, audit_ga 3.467 OK, audit_kro OK, audit_period_history 96 OK, render_check OK.
Gagal (sudah ada sebelumnya):
- `audit_sp`: de-dup 5.465 dari 36.272 pcs SP Injection MTD (15% terlampaui) karena simpul bulk SP S PLUS V2 dan bulk 7 Nov; bukan bug feed.
- `audit_dse_catalogue`: `in_master persons` bukan 272 (tiga DSE tercatat di MC lain; keputusan tampilan opsi 2 masih terbuka).

## Terbuka
1. Konfirmasi bulk SP/SP Injection 7 Nov (4 MC di atas) dan lonjakan GA D6-D7 (Victor).
2. File GA 8 Nov (D8) belum ada.
3. Ambang de-dup `audit_sp` 15%: longgarkan atau kecualikan simpul distributor.
4. Tiga DSE di MC lain (opsi tampilan 2).
