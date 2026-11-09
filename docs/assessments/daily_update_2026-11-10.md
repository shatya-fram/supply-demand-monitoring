# Daily update 10 Nov 2026

Scan 10 Nov 05:33, lalu refresh penuh (`daily_update.py`, RESULT OK).

## File yang masuk
| Data | File | Cut |
|---|---|---|
| Sell-In MOBII | `DAILY_DATA_MOBII_202611.xlsb` (9 Nov 22:30) | 9 Nov |
| Demand MOBO + SALMO | `DAILY_DATA_MOBO_202611.xlsb`, `..._SALMO_202611.xlsb` (9 Nov 22:30) | 9 Nov |
| PJP visit | `*_visit_dse_202611__09_09.zip` (9 Nov 22:31) | 9 Nov |
| ENDBAL | snapshot 9 Nov (16.269 outlet; 16.024 master, 245 non-PJP) | 9 Nov |
| GA by Outlet + Fav Locs | tidak ada file baru sejak 9 Nov 07:11 | **8 Nov** |

GA satu hari di belakang kelompok lain (D8 vs D9) sampai file GA D9 masuk.

## Perbandingan dengan feed sebelumnya
- D1-D8 tidak ada yang direvisi (Sell-In, Demand, PJP, GA).
- **D9 (Senin 9 Nov)**: SP MOBII 5.832 pcs; SP Injection 2.432 pcs (bulk 7 Nov 30.095 tidak berulang); SALMO sell-in Rp 807 Jt; Voucher isi Rp 174 Jt; Saldo Mobo (MOBO SAL) Rp 5,69 B; Voucher Injection Rp 312 Jt; Recharge Rp 1,37 B.
- **PJP D9**: planned 8.965, actual 8.633 (96,3%), productive 4.961, ad-hoc 938. D8 Minggu tetap planned 34 actual 0.
- ENDBAL: snapshot 9 Nov, 245 outlet non-PJP (sebelumnya 169 di snapshot 8 Nov).
- Catatan runner: lembar CVM berisi 52.034 baris identik RECARGE (Rp 31,7 B), dihapus builder (sama seperti sebelumnya).

## Audit
audit_consistency 275 OK, audit_scorecard 162 OK, audit_ga 3.467 OK, audit_kro OK, **audit_sp 16/16 OK (sebelumnya gagal 1)**, audit_period_history 96 OK, render_check OK.
Gagal (sudah ada sebelumnya): `audit_dse_catalogue` 2 cek, karena tiga DSE (Edi Warsono, Ihsan Riyadlul Jinan, Sukron Mamun) tercatat di MC lain di feed visit; keputusan tampilan (opsi 2) masih terbuka.

## Terbuka
1. File GA D9 (tagging dan Fav Locs) belum ada.
2. Lonjakan GA D6-D7 (konfirmasi Victor) dan bulk SP/SP Injection 7 Nov (Babelan, Bekasi Tengah, Pasar Minggu, Cipayung).
3. Tiga DSE di MC lain (opsi tampilan 2).
