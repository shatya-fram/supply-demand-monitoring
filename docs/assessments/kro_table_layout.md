# Asesmen · Susunan kolom tabel Outlet & KRO Management (kolom per periode)

Ditulis 20 Okt 2026 sebelum perubahan kode (CLAUDE.md §2). Permintaan pemilik: field di tabel KRO ditata ulang menjadi grup kolom per periode (FM, LMTD, MTD, Proyeksi, Gap, Growth, UAR, Visit) supaya terstruktur. Melengkapi `kro_product_ladders.md`.

## 1. Definisi

| Istilah | Arti | Sumber di feed |
|---|---|---|
| **FM** | September penuh (30 hari) | `q[key][0]` |
| **LMTD** | September tanggal 1 sampai cut (hari yang sama dengan MTD) | `q[key][1]` |
| **MTD** | Oktober 1 sampai cut | `q[key][2]` |
| **Proyeksi** | GA: MTD ÷ cut × 31; produk lain: run-rate 7 hari terakhir × 31 | `q[key][3]` |
| **Gap** | MTD − FM (negatif = kurang dari bulan penuh lalu) | dihitung di browser |
| **Growth** | MTD ÷ LMTD − 1 (tanggal sama, adil) | dihitung di browser |
| **UAR** | jumlah outlet dengan volume > 0 pada periode itu (outlet aktif) | dihitung dari `rows` + `slim` |
| **Ukuran** | jumlah outlet, volume (pcs atau Rp) dan pendamping (Rp untuk pcs, qty untuk Rp; `q2`) | `q`, `q2` |

## 2. Inventaris kolom sekarang dan masalahnya

| Tabel | Kolom sekarang | Masalah |
|---|---|---|
| Slab standar | Outlet Sep · Outlet Okt (proyeksi) · Δ · volume Sep · % volume · success visit · belum · % dikunjungi · check-in per outlet · tanpa DSE | hanya dua periode (FM, proyeksi); tidak ada LMTD / MTD, gap, growth, UAR; visit bercampur dengan ukuran |
| Perpindahan kelas | baris September, kolom proyeksi Okt | hanya FM → proyeksi; tidak ada perbandingan tanggal-sama (LMTD → MTD) |
| Ringkasan per Area › MC › tipe | Outlet · Wholesaler Sep → Okt · KRO Sep → Okt · KRO + Wholesaler · volume Sep · % volume · % dikunjungi · belum · Retail | dua periode dalam satu sel ("Sep → Okt"); volume hanya September; tanpa MTD, gap, growth, UAR |
| Katalog outlet | slab Sep → Okt · volume Sep · MTD · proyeksi · ukuran pendamping · PJP visit · demand · sell-in · flag | tidak ada LMTD, gap, growth; Rp / qty tidak berdampingan |
| Tracking per DSO / DSE | Wholesaler (n, success, belum) · KRO (n, success, belum) · % dikunjungi · check-in · per outlet · kurang · tanpa DSE · MTD · vs laju Sep · demand | visit dan volume satu baris tanpa pengelompokan |

## 3. Ketersediaan periode per produk dan ukuran

| Kunci | FM | LMTD | MTD | Proyeksi | Qty / Rp pendamping |
|---|---|---|---|---|---|
| SP (sell-in + injection) | ya | ya (injection LMTD dari `demand_feed` `l.SPI`) | ya | ya | Rp dari nilai SP + SPI |
| Voucher sell-in | ya | ya | ya | ya | qty voucher |
| Voucher sell-out (VCI) | ya | ya | ya | ya | qty hits |
| Saldo sell-in | ya | ya | ya | ya | jumlah transfer |
| **Saldo sell-out** | **tidak ada** (tanpa file SALMO September) | **tidak ada** | ya | ya | qty tidak ada |
| GA | ya | ya | ya | ya | Rp tidak ada |

Periode yang tidak ada ditampilkan **n/a**, tidak pernah 0; grup FM / LMTD / Gap / Growth Saldo sell-out menampilkan "n/a".

## 4. Yang kurang di feed

- Kelas pada periode LMTD dan MTD (bukan hanya FM dan proyeksi): dihitung di browser dari `q` dengan tangga yang sama (kelas MTD memakai volume parsial, sama dengan Slab SGA).
- `rows` hanya memuat outlet KRO ke atas pada FM atau proyeksi; supaya hitungan KRO / Wholesaler pada LMTD dan MTD lengkap, builder kini juga memasukkan outlet yang KRO+ pada LMTD atau MTD.
- `slim` (outlet Retail) hanya punya FM, MTD, proyeksi; LMTD ditambahkan supaya UAR dan hitungan Retail per periode lengkap. Hitungan Retail dan UAR membutuhkan `kro_slim.js`; selama belum termuat tabel menandai "memuat".

## 5. Susunan baru

Header dua baris, grup kolom per periode, dengan chip untuk menampilkan / menyembunyikan grup (diingat di `state.kroCols`):

**Ringkasan (Area › MC › tipe):** Outlet · [FM Sep: Wholesaler, KRO, volume kohort] · [LMTD: idem] · [MTD Okt: idem] · [Proyeksi Okt: idem] · [Gap & Growth: gap volume (MTD−FM), growth volume vs LMTD, gap outlet KRO+W, growth outlet vs LMTD] · [UAR: outlet aktif FM, LMTD, MTD, % aktif] · [Visit PJP: % dikunjungi, belum] · Retail. Volume kohort = volume outlet yang KRO+ pada September (pada proyeksi bila tidak ada September).

**Slab standar:** baris slab; grup FM, LMTD, MTD, Proyeksi (outlet, volume), Gap & Growth (outlet dan volume), UAR (total aktif), Visit (success, belum, % dikunjungi, check-in per outlet, tanpa DSE per slab FM).

**Perpindahan kelas:** pilihan FM → Proyeksi atau LMTD → MTD (tanggal sama).

**Katalog dan tracking:** kolom per grup FM / LMTD / MTD / Proyeksi (nilai utama dengan pendamping Rp atau qty di bawahnya), Gap & Growth, Visit, Konteks (demand, sell-in), Flag.

Semua angka tetap bisa diklik (popup FM, LMTD, MTD dalam Rp dan qty, gap, growth; salin teks / gambar / PNG).

## 6. Semua tabel: pembantu bersama dan inventaris (21 Okt 2026)

**Pembantu bersama** (di sebelah `th()` di `website/app.js`): `pgBar(tid, groups)` (chip tampil / sembunyikan grup, status per id tabel di `state.pgCols[tid]` dan localStorage `pgCols:<tid>`), `pgHead(tid, lead, groups, tail)` (header dua baris; `th()` di `lead` / `tail` otomatis rowspan 2), `pgOn(tid, id)` (dipakai pembangun baris). Grup standar: FM Sep, LMTD Sep, MTD Okt, Proyeksi Okt, Gap & Growth, UAR, Konteks, Visit PJP, Lainnya. Hanya tata letak dan pengelompokan; angka tidak diubah. Tabel KRO memakai pembantu sendiri (`kroHead2`, `kroCg`) dengan perilaku sama; dipertahankan karena sudah dipakai popup `kr|`.

**Batch 1 · Penjualan ke Outlet (selesai):**

| Tabel (id) | Kolom sekarang → grup |
|---|---|
| MTD vs LMTD per kategori (`pj_kat`) | Sep penuh → FM · Unit / Nilai / Outlet beli LMTD → LMTD · Unit / Nilai / Outlet beli MTD → MTD · Run-rate akhir bulan → Proyeksi · Growth nilai → Gap & Growth · Rp/unit → Lainnya |
| Per teritori (`pj_ter`) | blok performa: Sep penuh → FM · LMTD → LMTD · MTD → MTD · Growth + Gap ke Sep penuh → Gap & Growth; kolom Outlet PJP, UAR, kategori tetap di luar grup |
| Heatmap (`pj_heat`) | blok performa yang sama; kolom hari tetap |
| Outlet (`pj_out`) | blok performa yang sama; kolom kategori, beli terakhir, visit tetap |
| Mix produk (`pj_prod`) | Unit / Nilai / % nilai / Outlet MTD → MTD · Unit / Nilai / Outlet LMTD → LMTD · Growth → Gap & Growth |

Tidak diubah: tabel harian Penjualan (hari × kategori; hanya satu deret harian dengan pembanding LMTD sama hari), matriks slab (`sl|`, sudah per periode di popup), matriks produk (`vm|`).

**Pengelompokan otomatis (`pgPost`)**: untuk tabel selain Penjualan dan KRO, pengelompokan dilakukan setelah view dibangun: tabel dikenali dari label header (`pgSpec(tid, groups, need)`), kolom pindah ke grup periodenya, sel tidak diubah (atribut `data-ov`, `data-*`, DSE coverage tetap), baris yang melebar (colspan) di area grup dibiarkan. `render_check.js` memeriksa lebar setiap baris biasa sama dengan header dua baris.

**Status akhir per tabel**

| Keluarga | Tabel | Status |
|---|---|---|
| KRO | slab, perpindahan, ringkasan, katalog, tracking | dikelompokkan (`kroHead2`) |
| Penjualan | per kategori, teritori, heatmap, outlet, produk | dikelompokkan (`pgHead`) |
| Demand Customer | komoditas (`po_kom`), teritori (`po_ter`), produk (`po_prod`), outlet (`po_out`) | dikelompokkan (`pgPost`) |
| Demand Customer | heatmap harian, konsentrasi, SvD | tidak ada periode kedua; dibiarkan |
| Gross Add / Daily GA Trend | ringkasan per teritori, per DSE, sumber outlet (`ga_ter`, `ga_src`), outlet (`ga_out`), harian (`ga_day`), target (`ga_tgt`), Daily GA Trend dan tabel MC (`ga_trend`, `ga_trterr`) | dikelompokkan |
| UAR | pertumbuhan UAR (sumber, teritori), daftar aktif (`uar_src`, `uar_ter`, `uar_act`) | dikelompokkan |
| Partner | territory, alokasi, node (`pt_ter`, `pt_alo`, `pt_node`) | dikelompokkan |
| End Balance | zero stock (`eb_zero`), ringkasan (`eb_rk`) | dikelompokkan; popup `eb|` dan sel hitungan · % tidak diubah |
| End Balance | pita saldo, slab inventory days, site, detail | tidak ada periode kedua (satu snapshot); dibiarkan |
| Overall Performance | kartu dan tabel skor | sudah per ukuran dengan MTD / LMTD / Growth di dalam setiap ukuran; dibiarkan |
| DSE Productivity | skor KPI (Amount, Target, Ach., Insentif) | target vs aktual, bukan periode; dibiarkan |
| PJP / visit | rencana vs realisasi per hari, inaktivitas | tidak ada kolom periode kedua; dibiarkan |
| Target Setting | target IM3 / 3ID / IOH vs aktual MTD | tidak ada periode kedua; dibiarkan |
