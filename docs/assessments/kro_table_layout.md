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
