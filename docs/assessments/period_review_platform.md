# Review Periode: MTD / LMTD / Full Month dengan tren harian

Dibuat 2 Nov 2026 atas permintaan pemilik (siapkan platform untuk review MTD Nov, LMTD Okt, Full Month Sep, Full Month Okt dan tren dari semua performa yang tersimpan). Kontrak untuk menu `mb_periods`, arsip `data/history/period_history.json` dan penanganan pergantian bulan.

## 1. Apa yang dibangun

| Bagian | File | Fungsi |
|---|---|---|
| Arsip performa harian | `scripts/build_period_history.py` → `data/history/period_history.json`, `website/data/period_history.js` | Menyimpan seri harian per bulan dari feed yang sudah ditata: Sell-In MOBII (SP, SP Injection, Voucher isi, Voucher blank, Saldo Mobo; pcs dan Rp), Demand MOBO (RLD, VCI, CVM, PKT, SAL, SPI), GA outlet tagging, PJP (planned, actual, productive, ad-hoc). Per MC dan ALL; area dan region dijumlahkan oleh tampilan. |
| Menu Review Periode | `website/period_review.js`, `#/mb_periods` | Empat periode, tren harian / kumulatif, tren total per bulan, tabel harian, cakupan arsip. |
| Pembekuan penutupan bulan | `scripts/archive_month_close.py` → `data/archive/<YYYY-MM>/*.gz` | Salinan feed tingkat outlet bulan yang ditutup (13,3 MB gz). Tidak ikut rilis publik. **Oktober 2026 sudah dibekukan.** |
| Audit | `scripts/audit_period_history.py` | 71 cek: arsip = feed (Sell-In, Demand, GA), jumlah MC ≤ ALL, simulasi pergantian bulan, bulan yang sudah ditutup tidak menyusut. Masuk `daily_update.py`. |
| Render check | `scripts/render_check.js` | Setiap metrik × teritori × mode tren, angka MTD = arsip, area = jumlah MC, dan **simulasi November** (MTD Nov cut 2 vs LMTD Okt 1–2 vs Full Month Okt vs Full Month Sep). |

## 2. Definisi periode

Bulan berjalan **C** dipilih di layar (default bulan terbaru di arsip).

- **MTD C** = tanggal 1 sampai cut metrik itu (cut per kelompok data: Sell-In, Demand, GA, PJP bisa berbeda).
- **LMTD C-1** = tanggal 1 sampai min(cut, jumlah hari bulan C-1). Nov cut 2 membandingkan Okt 1–2; cut 31 Okt melawan September 30 hari berhenti di 30 (kartu menambahkan pertumbuhan **per hari** bila jumlah harinya berbeda).
- **Full Month C-1** dan **Full Month C-2**.

Hari ini (C = Okt): MTD Okt = Okt penuh, LMTD Sep, FM Sep, FM Agu (n/a, belum diarsipkan). Setelah data November masuk (C = Nov): MTD Nov, LMTD Okt, FM Okt, **FM Sep**, sesuai permintaan.

Aturan angka: hari tanpa data = **n/a**, bukan 0 (PJP 12 Okt dan hari setelah cut). Bulan yang hanya punya total (demand September) tampil di KPI dan batang bulanan tetapi tanpa garis harian.

## 3. Isi arsip hari ini

| Bulan | Sell-In | Demand | GA | PJP |
|---|---|---|---|---|
| Sep 2026 | harian penuh (30 hari) | **hanya total** (LMTD dan FM) | harian penuh | **tidak ada** (feed mulai 1 Okt) |
| Okt 2026 | harian penuh (31) | harian penuh (31) | harian penuh (31) | harian (31; 4 metrik) |

End Balance disimpan sebagai titik snapshot (1 Nov); tren harian terbentuk seiring snapshot bertambah.

Aturan arsip: kelompok bulan hanya diganti bila cut baru ≥ cut tersimpan, sehingga feed yang berganti bulan atau file parsial tidak mengecilkan bulan yang sudah ditutup (diuji di audit).

## 4. Pergantian bulan: yang sudah disiapkan dan yang belum

Sudah (kode):
1. `build_penjualan_feed.py` dan `build_demand_feed.py` menurunkan bulan berjalan dari nama file (`..._202611.xlsb`), bulan lalu = bulan sebelumnya, `lmtd_full_days` dan `mtd_month_days` dari kalender (November 30 hari). Dengan file Oktober hasilnya **identik** dengan feed yang sudah di-commit (dicek).
2. `daily_update.py`: saat file MOBII terbaru menyebut bulan lebih baru dari feed, ia mengarsipkan bulan lama lebih dulu (riwayat + arsip) sebelum builder menimpa; file PJP bulan sebelumnya tidak dimasukkan ke feed bulan baru (feed PJP = bulan berjalan; Oktober ada di arsip dan di Review Periode).
3. Langkah baru `PERIOD · history` dan `Audit · period history` di runner.

Belum, dan perlu penilaian saat file November datang:
1. **GA** (`build_ga_feed.py`): bulan, nama file (`202609 / 202610`), nama sheet (`IM3 SEP / OCT`) dan format baca bulan lalu masih tetap. File Daily_RGUGA November baru bisa dibaca setelah tata letaknya dilihat; sampai itu **feed GA tetap Oktober** (arsip riwayat GA Oktober aman). Akibatnya halaman GA dan Overall Performance bisa menampilkan GA Oktober berdampingan dengan Sell-In November sampai GA diselesaikan.
2. **Label aplikasi** (sekitar 290 "Okt" / "Sep" di `app.js`) dan pembagi 31 hari di 23 tempat (`mtd_month_days` sudah benar di feed; sebagian halaman masih memakai 31). Halaman lama bisa menyebut "Oktober" untuk data November. Review Periode tidak terdampak (label dari arsip).
3. **Target** (DSE, GA kecamatan, SP) masih target Oktober; kartu target untuk November belum ada.
4. Feed lain yang menggabungkan file lintas bulan (KPI, KRO, Stok, Vanguard) belum dinilai untuk November.
5. Simulasi November hanya ada untuk Review Periode; halaman lain belum disimulasikan.

Rekomendasi: sesi tersendiri untuk parameterisasi bulan di app dan GA setelah file November pertama dinilai (§4.3 asesmen 2 Nov).

## 5. Catatan baca

- Oktober 2026: sell-in dan demand 1–9 Okt rendah karena migrasi (bukan bug); LMTD Nov dan Okt vs Sep ikut tertekan; layar memberi catatan.
- Region = semua id (termasuk di luar master); Area dan MC = id yang terpetakan ke MC, jadi jumlah MC ≤ Region.
- GA di arsip = Daily_RGUGA (outlet tagging). Basis site hanya Oktober dan belum diarsipkan.
- PJP T = P + A (stop, bukan entity-day).
- ENDBAL 2 Nov sudah ada di `raw/ENDBAL*` tetapi belum dibangun; masuk refresh berikutnya.

## 6. Cara pakai

```bash
python3 scripts/daily_update.py           # termasuk arsip riwayat + audit
python3 scripts/build_period_history.py   # hanya arsip riwayat
python3 scripts/archive_month_close.py 2026-10   # bekukan penutupan bulan (otomatis saat bulan berganti)
python3 scripts/audit_period_history.py
```
