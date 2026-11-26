# Assessment · Ad-hoc di Visit Productivity dan Effective Call (26 Nov 2026)

Aturan owner (26 Nov 2026), sejalan dengan aturan 18 Nov:

1. **Ad-hoc tidak masuk penyebut PJP visit**: % PJP visit (sukses visit, visit productivity) = PJP terlaksana ÷ PJP rencana (permanent journey plan / beat plan saja).
2. **Ad-hoc dihitung di pencapaian Effective Call**: EC = visit produktif (termasuk ad-hoc) ÷ outlet yang dikunjungi (PJP + ad-hoc).

## Pemeriksaan sistem

Sudah benar sebelum perubahan: kartu % PJP (P) dan D-1 di Overall Performance, PJP Visit dan DSE Visits (view P), heatmap P, Effective Call di Overall Performance, DSE Productivity (kompliance) dan feed KPI (`prod` ÷ `actual`), yang ad-hoc sudah ikut di pembilang dan penyebut EC.

Masih memakai penyebut dengan ad-hoc (T = rencana + ad-hoc) dan diperbaiki:

| Tempat | Sebelum | Sesudah |
|---|---|---|
| DSE Productivity, tombol "Visit terlaksana ÷ rencana" | terlaksana ÷ (rencana + adhoc) | PJP terlaksana ÷ rencana PJP (field baru `adhoc` di feed KPI) |
| Tabel lama DSE Visits (harian, Area, MC, DSE, total grup, baris TOTAL) | Planned / Executed / hit % termasuk ad-hoc | Planned / Executed / hit % hanya PJP (`bvalP`); % produktif tetap per visit terlaksana termasuk ad-hoc dan ditimbang dengan visit terlaksana total |
| Opportunity / Program: kelayakan PJP (hit rate ≥ 100% dan ≥ 90%), metrik "visit rendah" per DSE dan MC, chip DSE | `target_hit_rate` feed (termasuk ad-hoc) | hit rate PJP tanpa ad-hoc (`hitP0`) |

Dibiarkan sebagai angka total yang berlabel jelas: kartu "Total Visit (T = P + A)" dan "% T vs rencana + adhoc" (PJP Visit, DSE Visits, Overall Performance).

Penutupan Oktober (`per=oct`) tidak berubah.
