# Assessment · Target per DSE November 2026 (OSA, Sell-In SP, GA), 17 Nov 2026

File baru di `raw/Targets`: `Update Target KPI DSE - November 2026.xlsb` (upload 17 Nov 19:03), satu sheet (`Sheet1`), satu baris per DSE. Assessment ini dibuat SEBELUM commit dan publish; belum ada perubahan di aplikasi atau feed. Hasil pemetaan ke DSE di sistem ditulis ke `data/catalogues/dse_target_202611.csv` (tanpa nomor telepon).

## 1. Isi file

| Kolom | Isi |
|---|---|
| Branch, Micro Cluster, Partner Territory | wilayah DSE (7 branch, 36 MC) |
| USERID_IM3, USERID_3ID | login DSE (contoh `CSOBUANAJKP11` dan `CSOBUANAJKP113ID`; sama dengan login di Master Hierarchy 3 Nov dan DSE catalogue) |
| FEEDBACK SA TARGET OSA | target OSA dalam Rp: IM3, 3ID, IOH |
| FEEDBACK SA TARGET SELLIN | target Sell-In SP dalam pcs: IM3, 3ID, IOH |
| FEEDBACK SA TARGET GA | target GA dalam pcs: IM3, 3ID, IOH (**baru, tidak ada di file Oktober**) |

Semua kolom berjudul "REBALANCING (YG DIGUNAKAN)", jadi ini target hasil rebalancing yang dipakai. Isi: 272 baris DSE.

## 2. Pemetaan ke DSE di sistem (272 DSE catalogue)

| Cara pencocokan | Baris |
|---|---:|
| Login IM3 sama dengan login di DSE catalogue | 267 |
| Login ada di Master Hierarchy 3 Nov, lalu nama cocok ke catalogue | 3 |
| Tidak cocok per login; satu-satunya DSE catalogue tanpa target di MC yang sama | 2 |
| **Terpetakan** | **272 dari 272** |

* MC di file sama dengan MC di catalogue pada semua baris yang cocok (0 beda); tidak ada DSE yang menerima dua baris; tidak ada DSE catalogue tanpa target.
* Dua baris terakhir (asumsi, perlu konfirmasi): login `2613053681` (MC-BEKASI UTARA) dipetakan ke **AAN KOSSUNJAMINARA** (M010) dan `2613053633` (MC-CIMANGGIS) ke **SUSANTO** (M082), karena masing-masing satu-satunya DSE catalogue di MC itu yang belum punya target. Login ini tidak ada di Master Hierarchy; kemungkinan login baru.
* Pencocokan memakai `person_id` (bukan nama), sehingga SUSANTO yang namanya dipakai dua orang tetap tepat.

## 3. Total November vs target yang sedang dipakai (Oktober, carry-forward)

| Ukuran (IOH) | November (file baru) | Dipakai sekarang (Okt, carry-forward) | Selisih |
|---|---:|---:|---:|
| Sell-In SP (pcs) | **145,048** | 266,765 | **-45.6%** |
| OSA (Rp) | **46.62 B** | 73.64 B | **-36.7%** |
| GA (pcs) | **107,767** | tidak ada target GA per DSE | baru |

Pada 266 DSE yang bisa dicocokkan satu per satu dengan target Oktober: SP -44.6% (256,430 → 142,176), OSA -37.1%; median per DSE SP -31%, OSA -34%; 67 DSE naik, 197 turun (SP).

Per area (IOH): Central North Jakarta 22,496 SP / Rp 6.68 B / 14,504 GA · East Jakarta 16,665 / 5.82 B / 14,332 · Kab Bekasi 18,531 / 7.40 B / 16,138 · Karawang 22,116 / 7.67 B / 19,059 · Kota Bekasi 20,988 / 6.01 B / 13,463 · South Jakarta Depok 28,446 / 8.45 B / 19,932 · West Jakarta 15,806 / 4.59 B / 10,340.

## 4. Temuan yang perlu diperhatikan

1. **Target SP = 0 untuk 22 DSE di tiga MC penuh**: MC-CIRACAS (9 DSE), MC-BABELAN (6) dan MC-RENGASDENGKLOK (7). OSA dan GA mereka terisi. Jika dipakai apa adanya, pencapaian SP tiga MC itu tidak punya penyebut (n/a). Perlu konfirmasi apakah memang tidak ada target SP di MC tersebut.
2. **IOH tidak sama dengan IM3 + 3ID pada 165 DSE**: total OSA IM3 + 3ID = Rp 48.52 B, IOH = Rp 46.62 B (selisih -Rp 1.91 B); SP selisih +78 pcs; GA -437 pcs. Kolom IOH berisi angka bulat (misalnya Rp 175,000,000) sedangkan pembagian IM3 / 3ID adalah sisa. Aplikasi memakai IOH, jadi saya tetap memakai kolom IOH sebagai target dan IM3 / 3ID hanya sebagai rincian.
3. **Target GA per DSE hanya 29.8% dari target GA wilayah**: 107,767 dari 361,750 (Total RGU GA Region, Target KPI IE November). Per area 24-42% (Karawang 41.7%, Kab Bekasi 24.2%, Central North Jakarta 30.0%); sisanya ada di program dan kanal non-DSE (Top Player, D2U, DSF dan sebagainya). 13 DSE memiliki target GA 400-401 pcs (tampaknya lantai).
4. **Target SP tidak sama dengan Sell-In KPI IE**: target Sell-In Region 299,082 (termasuk SP dan produk lain) vs 145,048 pcs SP per DSE.
5. **Perubahan besar dari Oktober**: SP dan OSA turun sekitar sepertiga sampai separuh; achievement DSE (OSA, SP, insentif) akan terlihat naik pada basis ini. Perlu diputuskan apakah target ini berlaku untuk seluruh November dan menggantikan carry-forward Oktober.

## 5. Usulan implementasi (belum dikerjakan)

1. `build_target_feed.py` membaca `raw/Targets/Update Target KPI DSE*.xlsb` (bulan sesuai nama file) sebagai sumber target DSE November: SP, OSA dan **GA** per DSE (feed `TARGET_FEED.dses[].ga`), dengan pemetaan per `person_id` seperti di CSV; Oktober tetap dari berkas rebalancing (view B).
2. DSE Productivity, Target Setting dan Overall Performance memakai target baru; kartu pencapaian GA per DSE ditambahkan.
3. Pemeriksaan: total feed = total file (SP 145,048, OSA Rp 46.62 B, GA 107,767), 272 DSE, `audit_scorecard.js`, `audit_consistency.js`, `render_check.js`.

## 6. Keputusan pemilik yang dibutuhkan

1. Pakai target November ini menggantikan carry-forward Oktober (SP 266,765, OSA Rp 73.6 B) untuk DSE Productivity dan Overall Performance?
2. Dua login baru (`2613053681`, `2613053633`) dipetakan ke AAN KOSSUNJAMINARA dan SUSANTO: benar?
3. Target SP 0 di MC-CIRACAS, MC-BABELAN dan MC-RENGASDENGKLOK: memang tidak ada target SP, atau perlu diisi?
4. Tambahkan target GA per DSE ke kartu pencapaian DSE?

## 7. Keputusan pemilik (18 Nov 2026) dan implementasi

1. **Target November menggantikan carry-forward Oktober** (OSA, Sell-In SP dan GA per DSE dari file ini). `build_target_feed.py` membaca `raw/Targets/Update Target KPI DSE*.xlsb`, memakai kolom IOH file (bukan IM3 + 3ID), menambah `ga = [IM3, 3ID, IOH]` per DSE, Area, MC dan Region, dan memberi label periode November 2026; banner carry-forward hilang. Total feed = total file: SP 145,048.36, OSA Rp 46,616,656,468, GA 107,767. Oktober tetap dari berkas lama (view B, arsip beku).
2. **Target GA PJP dan non-PJP = sisa dari 361K**: sisa = TOTAL RGU GA Region 361,750 − target GA DSE 107,767 = **253,983 pcs** (`metadata.ga_remainder`; kartu "Sisa target GA · PJP dan non-PJP" di Target Setting).
3. **Dua login baru** `2613053681` dan `2613053633` memakai hierarki: ditempatkan pada satu-satunya DSE di MC-nya yang belum punya baris target (AAN KOSSUNJAMINARA di MC-BEKASI UTARA, SUSANTO di MC-CIMANGGIS); login baru disimpan di `id_nov`. **File tidak memuat nama DSE**, jadi nama dari hierarki / catalogue dipakai; beri tahu bila ada nama lain. Tujuh baris lain juga ditempatkan lewat MC / pemilik login sementara (DSEIN100/115/116/120/122, 2613050947, 2613053632).
4. **Target SP 0 di tiga MC** (CIRACAS, BABELAN, RENGASDENGKLOK) diterima apa adanya (pencapaian SP tiga MC itu n/a).
5. App: Target Setting memuat pita GA (IM3, 3ID, IOH) di semua tabel, kartu Target GA per DSE dan Sisa target GA. Pencapaian GA per DSE belum ditampilkan (hanya target).
6. Pemeriksaan: `render_check.js` (ekspektasi periode diperbarui: SP 145,048 untuk feed live), `audit_scorecard` 162 / 162, `audit_consistency` 278 / 278.
