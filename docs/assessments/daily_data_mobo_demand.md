# Asesmen & Kontrak: `DAILY_DATA_MOBO_202610.xlsb` (demand / sell-out outlet)

**Ditulis**: 14 Okt 2026, diperbarui 14 Okt 2026 15:31 (sheet paket data terisi) dan 18:12 (data sampai 13 Okt, sheet diganti nama, SP Injection bernilai). Dasar menu **Morning DSE Briefing · Performance Outlet** (sisi **demand**), berpasangan dengan Penjualan ke Outlet (sisi **supply**, `daily_data_mobii_sellin.md`).
**Sumber**: `raw/Data as of 14 Oct /DAILY_DATA_MOBO_202610.xlsb` (6,1 MB, 14 Okt 18:12). Builder `scripts/build_demand_feed.py` → `website/data/demand_feed.js` (3 MB) dan `data/processed/demand_feed.json`. Status: **dapat dipreview, belum di-commit** atas permintaan pemilik.

---

## 1. Struktur file

Lima sheet, semuanya MTD (tidak ada LMTD, jadi **tidak ada growth vs bulan lalu**). Format lebar seperti MOBII: satu baris per `ID_Outlet × ProductName`, kolom `HITS_01..31` (unit) dan `AMOUNT_01..31` (rupiah). Kolom pertama berisi nama komoditas. Sejak file 14 Okt 18:12 nama sheet berubah (`SP_INJECTION`, `RELOAD`, `VOUCHER`, `CVM`, `RECARGE`); builder menerima nama lama dan baru lewat `SHEET_ALIASES`.

| Sheet | Baris | Outlet | Isi | Rupiah? |
|---|---:|---:|---|---|
| `SP_INJECTION` (dulu `MTD_SP_INJECTION`) | 2.166 | 2.166 | SP yang di-inject outlet ke konsumen (Perdana, SP Happy …) | Ya sejak 18:12, Rp 186 jt untuk 10.936 pcs; tidak dijumlahkan ke total demand |
| `RELOAD` | 15.973 | 5.144 | isi ulang pulsa; `ProductName` = nominal | Ya, Rp 9,45 M, 632.729 hits |
| `VOUCHER` | 11.095 | 3.587 | inject voucher paket data | Ya, Rp 7,33 M, 426.280 hits |
| `CVM` | 12.223 | 3.830 | paket CVM | Ya, Rp 1,57 M, 70.297 hits |
| `RECARGE` (judul kolom `RECHARGE`) | 68.468 | 11.091 | **penjualan paket data** (Freedom Internet, "9GB l 9GB l 9GB - 2hr", Happy 3ID); dimuat sebagai kategori **PKT Paket Data**, bukan isi ulang pulsa | Ya, Rp 36,81 M, 1.753.904 hits |

Hari berisi data: **1–13 Okt** pada semua sheet (sama dengan MOBII). Hari 1–11 identik dengan file 15:31; versi 18:12 hanya menambah hari 12 dan 13 serta rupiah SP Injection.

## 2. Kunci outlet

`ID_Outlet` tanpa kolom brand. Pencocokan: id IM3 master → IM3; id 3ID master → 3ID; selain itu mapping adhoc (`adhoc_outlet_im3_3id_data_gcp.xlsb`, kunci `A:<brand>:<id>` sama dengan feed Penjualan); selain itu "tidak dikenal".

| Sheet | Master IM3 | Master 3ID | Adhoc | Tidak dikenal |
|---|---:|---:|---:|---:|
| SP Injection | 1.587 id, Rp 109 jt | 452 id, Rp 50 jt | 125 id, Rp 27 jt | 2 id |
| Reload | 4.780 id, Rp 952 jt | 0 | 364 id, **Rp 8.499 jt** | 0 |
| Voucher Injection | 3.363 id, Rp 2.240 jt | 0 | 224 id, **Rp 5.091 jt** | 0 |
| CVM | 3.586 id, Rp 647 jt | 0 | 243 id, Rp 927 jt | 1 id (Rp 0,1 jt) |
| **Paket Data** | 6.863 id, Rp 3.524 jt | 3.375 id, Rp 3.280 jt | 846 id, **Rp 29.998 jt** | 7 id (Rp 5,7 jt) |

Temuan: Reload, Voucher Injection dan CVM hampir seluruhnya dari id IM3. **Paket Data dan SP Injection membawa demand 3ID** (3.375 outlet master 3ID di Paket Data, Rp 3,3 M). Cakupan master hampir penuh (10 id, Rp 5,8 jt, tidak dikenal).

Outlet master yang punya id IM3 dan 3ID adalah satu baris di feed. Nilai demand per brand disimpan di kolom `bv = [Rp IM3, Rp 3ID]` (dihitung dari brand id yang bertransaksi), sedangkan `b` hanya brand pertama yang terlihat dan dipakai untuk filter Brand.

## 3. Peringatan data: konsentrasi pada id adhoc

Id adhoc memegang **90 % nilai Reload**, 69 % Voucher Injection, 59 % CVM dan **82 % Paket Data**, padahal hanya 364, 224, 243 dan 846 id. Satu id (`17712974`) menyumbang Rp 6,18 M Reload dan id `SH049754` Rp 0,91 M; beberapa id voucher di atas Rp 400 jt. Ini pola node grosir atau distributor, bukan outlet ritel. Karena itu menu menyediakan tombol **Outlet adhoc: Ikut / Tanpa adhoc** (default Ikut, sesuai keputusan pemilik di Penjualan), kartu peringatan di Ringkasan bila adhoc > 50 % demand, dan tabel 8 outlet demand terbesar. Dugaan lama bahwa Reload terpotong top-2.000 per nominal **tidak didukung**: pada hari ke-1 hits Reload di file harian (32.174) sama dengan baris Completed di ekspor transaksi (32.181). Selisih ada di rupiah (file harian Rp 432 jt, ekspor Rp 481 jt, 10 %) dan definisi nilainya perlu dikonfirmasi ke pemilik file. Id 17712974 hanya punya 3 baris Transfer di ekspor 1 Okt, sehingga Rp 6,18 M Reload-nya di file harian belum bisa diverifikasi.

## 4. Definisi

| Istilah | Definisi |
|---|---|
| **Demand** | Reload + Voucher Injection + CVM + Paket Data (rupiah). SP Injection dihitung terpisah dalam unit karena tidak punya nilai. |
| **UAR demand** | outlet dengan demand rupiah > 0 pada salah satu komoditas bernilai (SP Injection: unit > 0). |
| **Run-rate** | rata-rata harian MTD × 31. |
| **Supply** | Sell-In ke outlet dari DAILY_DATA_MOBII (SP, voucher, saldo), dipotong ke hari yang sama (1–11 Okt). Saldo Mobo = pembanding utama demand. |
| **Demand ÷ Saldo** | demand rupiah ÷ saldo Mobo yang masuk. > 1× = outlet menjual lebih banyak daripada saldo yang diisi (memakai saldo awal, kanal lain atau margin). Indikatif, bukan rasio sell-through murni karena demand dicatat pada harga jual. |
| **Segmen supply vs demand** | per outlet master (ditambah adhoc yang punya demand): Demand + Supply; Demand tanpa Supply MTD; Supply tanpa Demand MTD; Tanpa keduanya. |

## 5. Hasil, 1–13 Okt 2026

| | Semua outlet | Tanpa adhoc |
|---|---:|---:|
| Total demand | Rp 55,16 M | Rp 10,64 M |
| Paket Data / Reload / Voucher / CVM | 36,80 M / 9,45 M / 7,33 M / 1,57 M | 6,80 M / 952 jt / 2,24 M / 647 jt |
| Outlet dengan demand (UAR) | 10.129 | 9.031 |
| Outlet inject SP | 2.044 (10.889 pcs, Rp 186 jt) | 1.919 (9.455 pcs) |
| Run-rate akhir Okt | Rp 131,5 M | Rp 25,4 M |
| Saldo Sell-In masuk 1–13 Okt | Rp 3,52 M | Rp 3,46 M |
| Demand ÷ Saldo | **15,7×** | **3,1×** |

Konsentrasi: **10 outlet menghasilkan 49,9 % demand region** dan 100 outlet 85,0 %; outlet terbesar (id adhoc 17712974) 11,2 %. Adhoc memegang 80,7 % demand. Rasio Demand ÷ Saldo di atas 1× tetap indikatif: demand dicatat pada harga jual, outlet memakai kanal isi saldo lain, dan Paket Data dibeli dari saldo Mobo yang dibeli lebih awal.

Momentum (cut 13 Okt): 7.208 outlet aktif ≤ 2 hari, 1.718 melambat 3–6 hari, 1.203 berhenti ≥ 7 hari; demand 11–13 Okt Rp 10,40 M vs 8–10 Okt Rp 12,91 M (−19,4 %, dipengaruhi pola hari kerja).

## 6. Menu Performance Outlet (disederhanakan 15 Okt 2026)

Tujuh tab: **Ringkasan** (scorecard demand dengan kolom hari kerja terakhir, tabel harian demand vs saldo masuk, rekonsiliasi per sheet dan kelas outlet, outlet terbesar), **Per Teritori** (regroup otomatis Area → MC → DSE → outlet dengan Detail), **Heatmap Harian**, **Produk**, **Konsentrasi**, **Outlet**, **Supply vs Demand**. Tab Matriks Slab, Bauran & Penetrasi dan Momentum dihapus atas permintaan pemilik (kodenya masih ada di riwayat git, commit 06d32cb).

| Tab | Isi | Definisi |
|---|---|---|
| Produk › Daftar Produk | mix produk se-region per komoditas | tidak mengikuti filter teritori |
| Produk › Top Produk per Kategori | top 10 produk di tiap kategori (SP Injection, Reload, Voucher Injection, CVM, Paket Data) dengan hits, nilai, % kategori, kumulatif, outlet pembeli, Rp/hit | dihitung dari outlet dalam filter (Branch, HoA, MC, DSE, Brand, adhoc ikut atau tanpa); SP Injection urut unit, lainnya urut nilai; opsi urut outlet pembeli; hanya MTD karena file MOBO tidak punya bulan lalu |
| Konsentrasi | kurva Pareto, outlet untuk 50 % dan 80 % demand, kelas master vs adhoc, 25 outlet terbesar | urutan total demand MTD seluruh outlet dalam filter |

Filter: Branch/HoA/MC, brand, komoditas, Outlet adhoc ikut/tanpa, cari. Band Area selection, kolom performa di depan, satuan M/Jt/Rb.

## 7. Keterbatasan

1. Tidak ada LMTD: growth bulan lalu tidak tersedia; minta ekstrak LMTD (sheet bulan lalu) agar parity dengan Penjualan.
2. Demand dan supply sama-sama sampai 13 Okt (file 18:12); versi sebelumnya berhenti 11 Okt.
3. Brand disimpulkan dari id; id adhoc yang ada di kedua brand diambil yang cocok dengan kunci adhoc di feed Penjualan, jika tidak IM3.
4. SP Injection kini bernilai tetapi tetap tidak dijumlahkan ke demand rupiah (stok fisik, bukan saldo); matriks dan heatmap SP memakai unit.
5. Selisih rupiah Reload 10 % antara file harian dan ekspor transaksi hari ke-1 belum dijelaskan (bagian 3).
6. Ekspor transaksi mentah (`raw/MOBO TRANSACTION DETAILS/`) hanya berisi 1 Okt; kolom tambahan (status gagal, wallet type, SP lama/baru, jam, pelanggan unik) belum bisa dibuat MTD sampai ada ekspor 1–13 Okt.
7. Brand filter memakai `b` (brand pertama terlihat) sehingga outlet master dengan dua id ikut ke satu brand; split nilai di tab Bauran memakai `bv`.


## 8. CVM sheet carrying RECARGE rows (17 Oct 2026)
The workbook saved 17 Oct 04:35 had 75,692 rows in both `CVM` and `RECARGE`. The CVM sheet held the real CVM rows (14,301 outlet × product keys, Rp 1.86 B) **plus** 61,391 rows that equal RECARGE rows on outlet, product and every day value (Rp 36.2 B). Built as is, CVM would have read Rp 38.1 B and total demand would have been overstated by about 60% (Paket Data counted twice). `build_demand_feed.py` now removes CVM rows that are exact copies of RECARGE rows (`drop_copied_rows`), prints a WARNING with the count and amount, and keeps the 14,301 genuine CVM rows (Rp 1.86 B, consistent with 16 Oct's Rp 1.77 B plus one day). If the sheets are ever swapped completely the warning shows a much larger count: check the file before using the result.
