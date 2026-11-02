# Profil Outlet (menu `mb_outlet`) · kontrak data

Permintaan owner 2 Nov 2026: satu menu untuk mencari outlet berdasarkan **ID outlet** atau **nama outlet** dan menampilkan profil **Sell-In** (qty, produk teratas), **GA** (qty, produk teratas) dan **Visit**.

## Sumber (semua feed yang sudah ada, tidak ada feed baru)

| Bagian | Feed | Isi yang dipakai |
|---|---|---|
| Identitas | `TERRITORY_FEED` (master 16.120 outlet) | ID IM3 / 3ID / IOH, nama, DSE, DSO, HoA, MC, branch, kecamatan, kabupaten, site, tipe, partner, flag, brand flag |
| Pencarian | master + outlet di luar master dari `PENJUALAN_FEED` (`A:` / `C:`) dan `GA_FEED` (`G:`) | nama (substring), ID IM3 / 3ID / IOH (sama persis, awalan, mengandung) |
| Sell-In | `PENJUALAN_FEED` (MOBII, outlet-bound) | per kategori (SP, Voucher isi + blank, Saldo SALMO, SP Injection MOBO) MTD / LMTD / FM; per produk `p[idx]` untuk produk teratas; harian `c[cat][10]` |
| GA | `GA_FEED` (Daily_RGUGA, outlet tagging) | `o` Oktober dan `s` September per hari, per brand; hybrid dijumlahkan per outlet fisik (kunci `k`) |
| Visit | `dseVisitsFeed` | per DSE `outlets[].d` (`x` dikunjungi, `p` rencana belum dikunjungi), `last_visit[k]` |

Satu outlet fisik = satu entitas (kunci `k`; hybrid IM3 + 3ID digabung, aturan 23 Okt 2026).

## Definisi

- **SP semua MOBII** = semua Starter Pack (Zero, KPK, kartu kosong, FWA, 3GB, S PLUS, lainnya). **SP Data KPI** = SP 3GB + S PLUS + SP Injection (SP Zero tidak dihitung), sama dengan glosarium 27 Okt 2026 (`scripts/sp_defs.py`, port `spClass` di `outlet_profile.js`).
- **Produk teratas Sell-In**: lima produk Starter Pack (urut qty MTD) dan lima produk Voucher (urut Rp MTD) dengan qty MTD, Rp, LMTD, FM dan persentase. Saldo Mobo tidak punya produk (nilai dan jumlah transfer saja).
- **GA**: MTD vs LMTD (hari yang sama) vs FM September, per brand, hari aktif (SSO), hari terbaik, slab standar dari GA September (Retail <= 30, KRO 31-100, Wholesaler > 100).
- **Produk teratas GA: tidak tersedia.** Daily_RGUGA_OUTLET hanya memuat jumlah GA per outlet per hari dan per brand, tanpa produk / paket (file MSISDN site juga tidak memuat produk). Halaman menyebutnya, tidak mengarang angka.
- **Visit**: per login DSE: rencana, dikunjungi, % terlaksana, kalender harian, kunjungan terakhir. Outlet tanpa DSE (di luar PJP) ditandai.
- **Sinyal**: PJP belum dikunjungi, SP >= 5 tanpa GA, tanpa SP dan GA, GA tanpa SP.

## Tautan

`#/mb_outlet?opQ=<kata kunci>&opSel=<kunci outlet>` (kunci `opQ`, `opSel` di `RT_VIEW_TABS`). Contoh: `#/mb_outlet?opSel=0_149609`.

## Pemeriksaan

`node scripts/render_check.js`: pencarian nama / ID, profil outlet master hybrid, master satu brand, di luar master (sell-in dan GA saja) dan kunci yang tidak ada; angka SP MTD dan GA MTD pada profil sama dengan feed.
