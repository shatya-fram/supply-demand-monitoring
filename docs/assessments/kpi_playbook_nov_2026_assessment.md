# KPI DSE, Booster dan KPI Partner / HoA / DSO · Kebijakan November 2026

Asesmen sebelum perubahan aplikasi (CLAUDE.md §2). Sumber: slide kebijakan insentif November 2026 dari pemilik
(19 Nov 2026): KPI DSE Rp 3,25 Jt, simulator insentif DSE (use case 1 dan 2), GA Achiever, Subs 1st Recharge,
Ringkasan DSE (maks Rp 3,75 Jt) dan tabel KPI HoA / DSO / DSP / KAM dengan Compliance. Slide gambar, tidak ada file di
`raw/`; angka di bawah dibaca dari gambar dan dicocokkan dengan dua use case simulator.
Feed: `scripts/build_kpi_nov_feed.py` → `website/data/kpi_nov_feed.js` (`window.KPI_NOV_FEED`). Tampilan: menu `mb_kpinov`.
Playbook sebagai teks aksi per KPI belum diberikan pemilik; yang ditampilkan adalah aksi turunan data (jarak ke slab berikutnya).

## 1. Kebijakan yang dibaca

### 1.1 KPI DSE (maks Rp 3.250.000 per DSE per bulan)

| KPI | Bobot slide | Slab | Insentif | Maks |
|---|---|---|---|---|
| OSA | 30% | 90% → 0,2% · 100% → 0,4% | tarif × amount OSA (Rp) | Rp 750.000 |
| SP Data Sell In | 35% | 90% → Rp 500 · 100% → Rp 1.000 | tarif × pcs SP | Rp 500.000 |
| RGU-GA Trade KPI (**BARU**, outlet wise) | 35% | 80% → Rp 1.000 · 100% → Rp 2.000 | tarif × GA | Rp 1.000.000 |
| Tambahan insentif GA (double) | – | hanya bila GA 100% | sama dengan insentif GA | Rp 1.000.000 |

Maks: 750 + 500 + 1.000 + 1.000 = Rp 3,25 Jt (cocok dengan slide). Bobot 30 / 35 / 35 adalah informasi, bukan pengali.

**Kepatuhan (compliance)**: Outlet mapping sell-in SP Data ≥ 5 pcs (standar 30 urban, 25 rural) bobot 50% dan Effective Call
bobot 50% (standar **70%** pada use case dan tabel HoA; slide pertama menulis "50%" di label, yang adalah bobotnya).
Tiap indikator dibatasi 100%. Indeks: skor ≥ 100% × 1; ≥ 90% sampai < 100% × 0,97; ≥ 80% sampai < 90% × 0,95; < 80% → 0.
**Insentif akhir = total insentif × indeks kepatuhan.** Catatan slide: EC dihitung dari seluruh outlet mapping DSE, transaksi
minimum Rp 75.000, kunjungan ad-hoc ke outlet mapping DSE dihitung sebagai outlet dikunjungi.

Verifikasi dengan simulator: use case 1 (OSA 200 Jt → 800 rb dipotong 750 rb; SP 500 pcs → 500 rb; GA 500 → 1 Jt + tambahan 1 Jt
= 2 Jt; total 3,25 Jt) dan use case 2 (OSA 130 Jt → 520 rb; SP 250 → 250 rb; GA 400 → 800 rb + 800 rb = 1,6 Jt; total 2,37 Jt).
Pencapaian dihitung dari total IM3 + 3ID (IOH), bukan per brand. Builder aplikasi mereproduksi kedua angka itu (lihat §6).

### 1.2 Booster 1-30 November 2026 (maks Rp 500.000 per DSE)

- **GA Achiever** (maks Rp 300.000): insentif per outlet menurut GA di outlet per bulan. Hybrid (GA IM3 + 3ID digabung per outlet):
  6-10 GA Rp 5.000 · 11-20 Rp 10.000 · ≥ 21 Rp 20.000. Single brand: 4-7 / 8-14 / ≥ 15 dengan tarif sama. Syarat: ≥ 60% outlet
  PJP punya ≥ 3 GA (hybrid) atau ≥ 2 GA (single); di bawahnya Rp 0 (insentif "tertahan"). Berlaku untuk DSE dengan ≥ 10 outlet PJP.
  Tarif tidak kumulatif; outlet di bawah tier pertama tidak dibayar tetapi tetap dihitung untuk syarat masuk.
  Use case 1: 32 dari 38 outlet (84%), 8 / 12 / 8 outlet → Rp 320.000 → dibayar Rp 300.000. Use case 3: 20 dari 40 (50%) → Rp 0.
- **Subs 1st Recharge** (maks Rp 200.000): pelanggan GA yang recharge ≥ Rp 10.000 di trade; M0 (hari 0-30) dan M1 (hari 31-60);
  tarif per outlet 5-9 / 10-19 / ≥ 20 pelanggan: M0 Rp 5.000 / 10.000 / 20.000, M1 Rp 7.500 / 15.000 / 25.000; syarat hybrid ≥ 6 outlet
  aktif (≥ 5 pelanggan di M0 atau M1), single ≥ 3; satu outlet maks Rp 45.000.

### 1.3 KPI HoA / DSO / DSP dan KAM (tabel kedua)

| KPI | HoA, DSO / DSP | Skor maks HoA & DSO | Skor maks DSP | KAM | Skor maks KAM |
|---|---|---|---|---|---|
| Secondary | – | – | – | 40% | 105% |
| RGU-GA Trade KPI | 50% | 130% | 160% | 20% | 130% |
| RGU-GA FWA | 15% | 130% | 160% | – | – |
| Produktivitas DSE Compliance (SP 5 pcs + EC 70%) **BARU** | 35% | 110% | 140% | – | – |
| % Kontribusi transaksi Inner Outlet BOSS | – | – | – | 40% | 130% |

Compliance kunjungan outlet unik (HoA, DSO, DSP): ≥ 95% × 1; 85% sampai < 95% × 0,99; < 85% × 0,98; 0% × 0 (kunjungan wajib).
**Skor akhir IS = total skor × indeks compliance × pencapaian revenue prepaid region (maks 100%).**

## 2. Data yang tersedia dan yang tidak

| Kebutuhan | Sumber | Status |
|---|---|---|
| OSA amount, target OSA per DSE (November) | `dse_kpi_feed.js` (`osa_all`, `osa_tgt`) | ada (basis: semua outlet mapping) |
| SP Data pcs (SP 3GB + S PLUS V2 + Injection), target SP | `sp3_pcs`, `spi_pcs`, `sp_tgt` | ada; target region 145.048 pcs |
| GA per DSE (target) | `target_feed.js` `dses[].ga` (IM3 / 3ID / IOH) | ada; 272 DSE |
| GA per DSE (aktual), per outlet | `ga_feed.js` (outlet tagging, D1-D17) | ada; kunci DSE = nama master |
| Outlet SP ≥ 5 pcs | `sp_uar5` (per outlet PJP, SP 3GB + Injection) | ada |
| Outlet unik effective call, outlet unik dikunjungi | `dse_visits_feed.js` `outlets[].e/d/a` + master | ada, dihitung builder (272 DSE, 3 tanpa nama unik) |
| Target GA dan FWA 4G per HoA / DSO / PT partner | `target_kpi_feed.js` (areas, mcs, pts) | ada |
| GA aktual HoA / DSO / partner | `ga_feed.js` (tagging) dan `ga_site_feed.js` (site) per MC dan brand | ada, dua basis |
| **Aktual GA FWA** | tidak ada di `raw/` | **n/a** |
| **Aktual Secondary, Secondary KAM, % Kontribusi BOSS** | tidak ada | **n/a** (KAM hanya ditampilkan sebagai aturan) |
| **Pencapaian revenue prepaid region** | hanya target Prepaid di `target_kpi` | **n/a** (faktor skor akhir tidak dihitung) |
| **Recharge pelanggan GA (M0 / M1)** | tidak ada | **n/a** (Subs 1st Recharge hanya aturan) |

Angka yang tidak punya data tampil **n/a**, bukan 0 (aturan proyek). Skor HoA / DSO / DSP dihitung parsial atas bobot yang punya data
dan diberi label bobot tersedia.

## 3. Asumsi (perlu konfirmasi pemilik)

1. **OSA dan SP dibayar atas aktual MTD**, tarif × aktual (sesuai use case: 130 Jt × 0,4% = 520 rb). Pencapaian membandingkan aktual MTD dengan target pro-rata (hari berjalan ÷ 30), seperti halaman DSE Productivity. Toggle pro-rata / bulan penuh tersedia.
2. **Insentif GA tambahan (double)** sama besar dengan insentif GA dasar sebelum ditotal, dibatasi Rp 1 Jt sendiri (use case 1 dan 2 cocok).
3. **Effective Call (keputusan pemilik 20 Nov 2026): aturan 18 Nov 2026** = kunjungan produktif ÷ outlet dikunjungi (PJP + ad-hoc), standar 70%; sama dengan Overall Performance dan DSE Productivity. Definisi outlet unik pada slide tidak dipakai (kolom `ec_u` di feed hanya informasi).
4. **Definisi efektif tetap aturan 13 Nov 2026**: SP atau voucher pcs > 0, atau saldo ≥ Rp 75.000 per outlet-hari (Hybrid digabung). Slide menyebut "transaksi minimum Rp 75.000" tanpa memisahkan produk; nilai rupiah SP / voucher per kunjungan tidak ada di feed visit.
5. **Efektif sebulan**: outlet dihitung efektif bila efektif minimal satu hari di bulan berjalan (basis outlet unik).
6. **DSE Hybrid** (untuk booster) = DSE dengan target IM3 dan target 3ID (250 dari 272). Single brand lainnya.
7. **GA Achiever** memakai GA per outlet fisik (kedua brand digabung) di outlet PJP DSE, bulan berjalan s.d. D17 (GA terlambat satu hari dari sell-in). Outlet tanpa GA tidak ada di feed GA dan dihitung dari jumlah outlet PJP (`map_n`).
8. **DSE sebagai person id**: nama kembar (SUSANTO) tidak dicocokkan dengan nama, sehingga outlet unik dan GA-nya n/a.
9. **Tabel HoA / DSO / DSP**: skor komponen = bobot × min(pencapaian, skor maks). Pencapaian GA = GA aktual ÷ target pro-rata (target `TOTAL RGU GA` dari Target KPI IE November); GA aktual per MC dan brand dalam dua basis: site / lokasi (aturan KPI HoA / DSO, default) dan tagging outlet. DSP = PT partner per MC dan brand (IM3 MPC / MITRAIM3, 3ID MP3 / 3KIOSK) memakai GA brand tersebut di MC-nya.
10. **Komponen compliance HoA / DSO / DSP** = rata-rata dua rasio (outlet SP ≥ 5 pcs ÷ standar, EC unik ÷ 70%) di agregat DSE, tanpa pembatasan 100%, dibatasi skor maks komponen. **Indeks compliance** dihitung dari outlet unik dikunjungi ÷ outlet mapping (basis PJP).
11. Kelas urban / rural per DSE tetap aturan Area (Karawang dan Kab Bekasi rural) kecuali file target menyebut lain.
12. Insentif DSE per outlet non-PJP, ad-hoc di luar mapping dan non-PJP tidak dihitung (sesuai aturan PJP / non-PJP).

## 3b. Temuan data pada angka 18 Nov 2026 (MTD)

- **SP Data Sell-In sangat rendah**: SP 3GB 2.961 pcs + SP Injection 3.956 pcs di 272 DSE, terhadap target pro-rata sekitar 87 rb pcs; **tidak ada DSE yang mencapai 90%**, sehingga insentif SP = Rp 0 untuk semua DSE. SP Zero / KPK / FWA (kelas Rp 10.000) tidak dihitung sesuai aturan 20 Oct 2026. **Dikonfirmasi pemilik 20 Nov 2026: SP Data November tetap tanpa SP Zero.**
- **Outlet SP ≥ 5 pcs**: total 664 outlet dibanding standar 30 / 25 per DSE (pro-rata 18 hari); hanya 11 DSE yang ≥ 80% standar. Akibatnya skor kepatuhan < 80% dan **indeks 0 untuk 248 dari 272 DSE**; insentif KPI final hanya sekitar Rp 24 Jt dari Rp 221 Jt sebelum indeks. Penyebab utama ini adalah SP, bukan EC (EC sudah di atas standar).
- GA di outlet PJP DSE: 72.807 (D17) terhadap target pro-rata 61.079 = 119%; 147 DSE ≥ 100% dan mendapat double.
- Standar outlet SP ≥ 5 pcs diprorata (30 × 18 / 30) seperti halaman DSE Productivity; slide tidak menyebut pro-rata. Toggle "Target bulan penuh" menunjukkan akhir bulan.
- Nama DSE kembar SUSANTO: GA 623 pcs tidak dialokasikan (0,85%), kedua barisnya n/a.

## 4. Konflik dengan aturan yang sudah ada

- **Periode B (Full Month Oktober, `per=oct`) memakai kebijakan dan playbook Oktober** (keputusan pemilik 20 Nov 2026): menu KPI & Insentif November menampilkan kebijakan Oktober pada periode itu dan menunjuk ke DSE Productivity (feed penutupan Oktober).
- **Halaman DSE Productivity dan Partner Territory Performance memakai kebijakan Oktober** (OSA 40% / SP 60%, maks Rp 1 Jt per KPI, EC 50%). Setelah asesmen ini, halaman itu diberi catatan dan menunjuk ke KPI November; menyamakan perhitungannya menunggu keputusan pemilik. Karena EC sudah sama, selisih tinggal bobot, tarif dan GA.
- Target Okt tetap untuk tampilan periode B (`per=oct`).
- Bulk dan booster SP tetap dihitung sebagai performa (tidak ada pengecualian baru).

## 5. Kontrak feed

`KPI_NOV_FEED.policy` memuat semua tarif; `dses[pid]` = `{hy, ga_t[IM3,3ID,IOH], ga[IM3,3ID], map_n, vis_u, ec_u, gslab[3], gelig, gout}`;
`mcs[]` = `{mc, area, hoa, dso, tag[IM3,3ID], site[IM3,3ID]|null}`. Digabung di browser dengan `DSE_KPI_FEED` (OSA / SP / `sp_uar5`),
`TARGET_KPI_FEED` (target HoA / DSO / PT) dan visits feed. Dijalankan oleh `daily_update.py` setelah feed GA, KPI dan visits.

## 6. Pemeriksaan

`node scripts/audit_kpi_nov.js` mereproduksi use case 1 dan 2 simulator DSE (3,25 Jt dan 2,37 Jt), use case GA Achiever 1-3
(Rp 300.000, 205.000, 0) dan Subs 1st Recharge 1-3 (Rp 200.000, 115.000, 0), indeks kepatuhan, serta mencocokkan total GA feed
dengan total `ga_feed.js` dan jumlah DSE dengan `dse_kpi_feed.js`. `node scripts/render_check.js` merender view `mb_kpinov`.
