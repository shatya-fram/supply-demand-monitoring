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

## Tambahan 26 Nov 2026: unique outlet (entity-day) untuk PJP visit dan Effective Call

Masukan lapangan (DSE Derrys Saputra, MC-PANCORAN, D-1 25 Nov): "Divisit (P + A) 45" masih menghitung satu outlet Hybrid dua kali (stop IM3 dan stop 3ID), padahal outlet efektif sudah dihitung per outlet; target visit harus unique juga.

Temuan: di feed, 45 stop = 22 IM3 + 23 3ID; outlet unik yang dikunjungi = **28** (19 PJP + 9 ad-hoc); stop produktif 26 = **24 outlet unik produktif**. EC sebelumnya 26 ÷ 45 = 57.8% (pembilang dan penyebut tidak sama basis); sesudah: **24 ÷ 28 = 85.7%**.

Perubahan (satu basis di semua hitungan visit):
* `generate_dse_visits_feed.py`: sel harian entity-day bertambah `entity productive` (indeks 14).
* Overall Performance (`ovDseTable`): rencana, terlaksana, ad-hoc dan produktif memakai entity-day (MTD dan D-1): % PJP = outlet PJP unik terlaksana ÷ outlet PJP unik rencana; EC = outlet unik produktif ÷ outlet unik dikunjungi (PJP + ad-hoc).
* Feed KPI (`build_dse_kpi_feed.py`): `planned`, `actual`, `prod`, `adhoc` per DSE = entity-day (stop disimpan sebagai `stops_*`), sehingga DSE Productivity (kompliance EC, toggle visit terlaksana), KPI Nov dan Partner Performance ikut basis unik.
* Penutupan Oktober tidak berubah (basis stop). Scorecard PJP Visit dan DSE Visits tetap menampilkan hitungan stop dengan baris entity-day di bawahnya.
* `audit_scorecard.js` membandingkan kartu Overall dengan nilai entity.
