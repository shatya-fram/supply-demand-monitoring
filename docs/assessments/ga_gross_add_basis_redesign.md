# Assessment · Gross Add: dua basis, dua sumber data (24 Okt 2026)

Permintaan owner (24 Okt 2026): Gross Add basis **Outlet sell-in (tagging)** tidak boleh punya tab Target Kecamatan; semua tab-nya memakai data Daily_RGUGA (tagging) dan berbeda dari tab level site. Basis **Site location GA** memakai data level site (RGU GA per MSISDN, aktivasi) dan wajib punya target kecamatan. Harian berbentuk heatmap, Outlet punya format Retail / KRO / Wholesaler dan tag outlet, ada tab Grafik harian dengan toggle kontribusi harian segmen. Data dinilai di `ga_site_rguga_assessment.md` dan `ga_inner_jakarta_performance.md`; dokumen ini menetapkan kontrak tampilan.

## 1. Tab per basis dan sumber datanya

| Tab | Outlet sell-in (tagging) | Site location GA |
|---|---|---|
| Ringkasan | Per Area › MC › DSE (Daily_RGUGA) | Site location GA: 5 kartu, kemasukan dan pengiriman, top kecamatan dan site (GA_SITE_FEED) |
| **Target Kecamatan** | **tidak ada** | ada; pencapaian = GA yang **diaktivasi** di kecamatan (GA_SITE_FEED `kd`) vs target M2S KECAMATAN |
| Slab GA | slab GA per outlet / DSE (Daily_RGUGA, clickable `sg|`) | slab GA per **site** (0 · 1–9 · 10–29 · 30–59 · 60–99 · 100–199 · ≥ 200), clickable `ss|` |
| Per DSE | ada (tagging, DSE insentif) | tidak ada (lokasi tidak punya DSE) |
| Outlet | 3 format: daftar outlet, **kategori Retail / KRO / Wholesaler**, **tag outlet** (program dan flag) | tidak ada (site tidak punya daftar outlet) |
| Harian | **heatmap** Area › MC, tanpa target dan tanpa kecamatan; MTD, LMTD, growth | **heatmap** Area › MC › **Kecamatan vs target**; target Okt, GA MTD, % vs pro-rata |
| **Grafik harian** (baru) | GA per hari: total / kontribusi Retail · KRO · Wholesaler / % kontribusi; kumulatif vs September | idem, 6 segmen asal outlet (Retail, KRO, Wholesaler IJ, outlet luar IJ, ID tanpa atribut, tanpa ID); kumulatif vs target pro-rata |
| Slab SSO | slab SSO per outlet (Daily_RGUGA) | slab hari aktif per site (0 · 1–5 · 6–10 · 11–15 · ≥ 16 hari), clickable `ss|` |

Sumber outlet (PJP / NON / KAM), Cakupan dan filter DSE tidak berlaku di basis site; tombolnya disabled dengan catatan. Brand dan filter Branch / HoA / MC berlaku di kedua basis.

## 2. Data baru di `ga_site_feed.js` (hanya hitungan, tanpa MSISDN)

`cut` (21 Okt), `kd` (GA harian per kecamatan aktivasi per brand, 120 kecamatan), `skd` (idem per segmen penjual R / K / W / N / U / Z), `sdo` (GA tagging IJ yang diaktivasi di luar IJ per segmen), `msites` (site master per MC, untuk slab "0 GA"), `sites[].ad` (hari aktif per site per brand). Segmen penjual memakai tangga standar owner pada GA September penuh per outlet fisik (Retail ≤ 30, KRO 31–100, Wholesaler > 100). Builder: `scripts/build_ga_site_feed.py`; ukuran feed 2,1 MB.

Total (setelah Purwakarta dikeluarkan, 24 Okt 2026): 140.359 GA aktivasi di IJ (1–21 Okt) = jumlah `kd` = jumlah `skd`: Retail 66.045, KRO 16.321, Wholesaler 22.223, outlet luar IJ 11.880, ID tanpa atribut 13.571, tanpa ID outlet 10.319. Target Oktober 313.326 (IM3 210.821, 3ID 102.505), pro-rata 21/31 = 212.253; pencapaian site 66,1% dari pro-rata.

## 3. Definisi yang dipakai

- **MC dan Area di tab Target, Harian dan Grafik (site)** mengikuti sheet DEMARKASI target (MC dan Area dari kecamatan), supaya target dan pencapaian memakai wilayah yang sama. Ringkasan (kemasukan) dan Slab site memakai **MC utama outlet master di site**; selisih kecil karena satu kecamatan bisa memuat site dari lebih satu MC.
- **Slab site** adalah usulan (GA per site per bulan: 0 · 1–9 · 10–29 · 30–59 · 60–99 · 100–199 · ≥ 200; median site 16 GA per 20 hari); owner bisa menyesuaikan di `GS_SLAB_GA`. Slab "0" = site master tanpa GA (daftar tidak tersedia, angka tidak bisa diklik).
- **LMTD September per site / kecamatan tidak ada** di file site (file hanya Oktober): kolom pembanding September basis site menampilkan n/a atau tidak ditampilkan (tidak ada angka 0 buatan).
- **Kategori outlet** (basis outlet): kelas GA September; perpindahan kelas dihitung dari proyeksi Oktober (GA MTD ÷ cut × 31). **Tag outlet**: program (KRO, Wholesaler, Promotor, DTU, AVA dari `kro_program_outlets.csv`; BOSS dan Tebus Murah belum ada anggota), sumber PJP / NON / KAM, master vs non-master, ber-DSE vs tanpa DSE, Hybrid / IM3 saja / 3ID saja, kategori.
- GA = semua MSISDN di file. **Keputusan owner 24 Okt 2026: aturan usage > 25 MB tidak dipakai dulu** (tombol matriks "Usage > 25 MB" dihapus dari tab Site location GA).

## 4. Pemeriksaan

- `scripts/audit_ga.js` (3.707 pemeriksaan): tab outlet basis tanpa `target`, tab site basis tanpa `dse` dan `outlet`; heatmap outlet: GA MTD dan LMTD region = hitung ulang, jumlah D1..Dcut = MTD, tanpa kolom kecamatan / target; Grafik outlet: total = GA MTD, Retail + KRO + Wholesaler = total; tabel kategori: GA dan outlet = cakupan; tag Ber-DSE + Tanpa DSE = outlet; basis site: target Okt dan GA di kecamatan target = jumlah `kd`, heatmap site region = GA site dan target, Grafik site total dan segmen = `skd`, slab site jumlah site = aktif + master tanpa GA.
- `scripts/render_check.js`: semua tab kedua basis × brand × wilayah, tiga format Outlet, tiga tampilan Grafik, popup slab site (jumlah baris = angka di sel).
- Tombol baru (format outlet, tampilan grafik, buka / tutup baris heatmap) diuji dengan klik di browser; link bersama membawa `gaOutFmt` dan `gaGraf`.

## 5. Keputusan owner (24 Okt 2026)

1. Batas slab site (0 · 1–9 · 10–29 · 30–59 · 60–99 · 100–199 · ≥ 200): disetujui.
2. Tidak ada September per site / kecamatan di file site: diterima (growth per kecamatan n/a).
3. MC DEMARKASI untuk Target / Harian / Grafik dan MC master untuk Ringkasan / Slab site: diterima.
4. **Purwakarta (SUKASARI|PURWAKARTA, 1 kecamatan) dikeluarkan dari Inner Jakarta**: 120 kecamatan; target kecamatan itu (IM3 134,2 + 3ID 50,5) ikut keluar. **Usage > 25 MB tidak dipakai dulu.**
