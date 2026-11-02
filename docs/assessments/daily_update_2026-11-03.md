# Daily update 3 Nov 2026 · file November pertama

Scan `raw/` 3 Nov 06:20, refresh penuh 06:28 (`daily_update.py`, tiga putaran karena dua perubahan format file). Pergantian bulan pertama. Hasil akhir: semua langkah OK, render check dan audit lulus (konsistensi 275, scorecard 154, SP 16, KRO, arsip periode 95); satu audit katalog DSE gagal (§4).

## 1. Hasil scan

| Sumber | File | Cakupan |
|---|---|---|
| MOBII (Sell-In) | `DAILY_DATA_MOBII_202611.xlsb` (2 Nov 23:16) | 1–2 Nov, hanya sheet `MTD_SP / MTD_VC / MTD_SALMO` |
| MOBO (Demand) | `DAILY_DATA_MOBO_202611.xlsb` + `_SALMO_202611` | 1–2 Nov; Oktober penuh dipakai sebagai LMTD / FM |
| PJP | `im3/3id_visit_dse_202611__02_02.zip` | **2 Nov**; 1 Nov (Minggu) tanpa ekspor = n/a; 42 file Oktober tidak ikut feed |
| End Balance | snapshot `2026-11-02` (file bertanggal 3 Nov 05:41) | 16.100 outlet (master 16.024); sebelumnya 18.282 pada 1 Nov, turun karena outlet non-PJP berasal dari Sell-In dan Sell-In baru 2 hari |
| GA by Outlet, GA site, Fav Locs, Vanguard | **tidak ada file baru** | GA tetap Oktober (31 Okt), Fav Locs 26 Okt, Vanguard 29 Okt |

## 2. Dua perubahan format yang menghentikan builder

1. **MOBO November memakai kolom baru** `organization_id` dan `product_name` (Oktober: `ID_Outlet`, `ProductName`). Id-nya sama: 8.209 dari 8.310 id November ada di file Oktober (98,8%). Builder Demand menerima kedua nama (`ID_COLS`, `PN_COLS`). Tanpa perbaikan feed Demand tetap Oktober.
2. **MOBII November hanya punya sheet `MTD_*`**, tanpa `LMTD_*` yang ada di file Oktober, sehingga LMTD Oktober terbaca 0 dan Full Month Oktober kosong. Builder Sell-In dan de-duplikasi SP Injection sekarang memakai sheet `MTD_*` workbook Oktober sebagai sisi LMTD / FM (`MOBII_LM_SRC` atau pencarian otomatis; `metadata.lm_source`). Dengan ini de-duplikasi SP Injection Oktober tetap 6.312 pcs dan baseline SP Injection Oktober (59.097 pcs) sama dengan angka penutupan Oktober.

Kedua perubahan perlu persetujuan data owner bahwa format baru ini permanen (Thofa).

## 3. Angka dan temuan

| Ukuran (1–2 Nov) | Nov | Catatan |
|---|---|---|
| Sell-In SP (semua MOBII) | 1.283 pcs | 1 Nov Minggu = 0; awal bulan setelah dorongan akhir Oktober (26.874 pcs pada 31 Okt) |
| SP Injection | 193 pcs | |
| Voucher isi / blank | Rp 103,1 Jt / Rp 55,7 Jt | |
| Saldo Mobo (SALMO sell-in) | Rp 796,7 Jt | log builder memuat Rp 1.236,9 Jt karena tier `OUTLET_MOBI` (Rp 440,1 Jt, IM3) ikut; feed outlet-bound = 796,7 Jt seperti Oktober (tier itu 5,4% di Oktober) |
| Demand: RLD / VCI / PKT / CVM | Rp 1,34 B / 0,28 B / 2,97 B / 0,19 B | VCI hari ke-2 Rp 196 Jt vs Rp 1,44 B pada 31 Okt (turun tajam, perlu dipantau) |
| Saldo Mobo demand (SAL) | Rp 6,09 B | 1 Nov Rp 0,78 B, 2 Nov Rp 5,31 B |
| PJP 2 Nov | planned 8.971, actual 8.100 (90,3%), produktif 3.801 | satu hari kerja |

Catatan baca:
- Dua hari pertama November (Minggu 1 Nov, Senin 2 Nov) tidak mewakili bulan; MTD vs Full Month Oktober memakai **per hari** sampai bulan penuh (Review Periode); proyeksi akhir bulan dari dua hari tidak bermakna.
- LMTD Okt 1–2 adalah periode migrasi Oktober (nilai sangat rendah), jadi pertumbuhan "vs LMTD Okt" terlihat besar (> +999% untuk SP) dan menyesatkan; gunakan Full Month Okt per hari.
- CVM: 52.034 baris identik dengan RECARGE dibuang seperti aturan 17 Okt (Rp 31,7 B); 23.658 baris CVM tersisa.
- Demand November belum ada SP Injection yang bertabrakan dengan MOBII (de-dup MTD 0).
- Penutupan Oktober di arsip periode utuh (SP 235.947 pcs, SALMO Rp 22,13 B, GA 323.890); audit mendeteksi dan memperbaiki satu bug: feed November membawa Oktober sebagai LMTD dua hari dan sempat menimpa Oktober di arsip. Kini arsip hanya diganti bila cutnya ≥ yang tersimpan, dan LMTD tidak dianggap bulan penuh.

## 4. Perlu keputusan / perhatian

1. **Audit `audit_dse_catalogue.py` gagal**: 272 DSE + 99 promotor toko ≠ 369 operator. Pada 2 hari November 270 DSE master punya operator di feed visit (bukan 272) karena dua DSE tidak muncul; aturan audit mengharapkan semuanya. Bukan kerusakan data; aturan perlu diizinkan "belum ada visit".
2. **GA tidak berganti bulan**: builder GA belum month-aware (nama file/sheet). File Daily_RGUGA November belum ada, jadi GA tetap Oktober; halaman Gross Add, Daily GA Trend dan Overall Performance menampilkan GA Oktober berdampingan dengan Sell-In dan PJP November sampai GA dinilai.
3. **Label dan target di halaman lama**: sekitar 290 label "Okt" / "Sep", pembagi 31 hari dan target Oktober (DSE, GA kecamatan, SP) belum ikut November. Nilai di feed November benar; tulisan halaman lama bisa menyebut Oktober. Review Periode tidak terdampak.
4. **PJP November berdiri sendiri**: feed PJP kini hanya November; perbandingan PJP dengan Oktober hanya lewat Review Periode (metrik PJP).
5. Fav Locs masih 26 Okt, 3ID GA workbook vs pivot (92.745 vs 128.334) dan GA 30–31 Okt ke Victor: belum ada jawaban.
6. Data owner: id `D…` di SALMO, daftar BOSS / Tebus Murah.

## 5. Perubahan kode

`build_demand_feed.py` (kolom baru, LMTD de-dup dari workbook bulan lalu), `build_penjualan_feed.py` (LMTD / FM dari workbook bulan lalu bila tidak ada sheet LMTD), `build_period_history.py` (bulan lalu dari feed hanya LMTD: tidak menimpa bulan penuh), `audit_period_history.py` (GA mengikuti bulan feed GA; simulasi pergantian bulan tidak bergantung bulan feed), `audit_scorecard.js` (hari kerja pertama tidak punya hari kerja sebelumnya), `period_review.js` (MTD vs Full Month dibandingkan per hari sebelum bulan penuh; pesan "tidak ada data" untuk metrik tanpa bulan itu).
