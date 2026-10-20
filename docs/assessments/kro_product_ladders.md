# Assessment · Outlet & KRO Management per produk (SP, Voucher, Saldo), sell-in / sell-out, tiga mode katalog

Ditulis 20 Okt 2026 sebelum perubahan skema atau kode (CLAUDE.md §2). Memperluas `ga_kro_deep_dive.md` (tangga slab GA / SP, 18 Okt). Kontrak data untuk `scripts/build_kro_feed.py` → `website/data/kro_feed.js` (`KRO_FEED`) dan UI `viewKro()` di `website/app.js`.

## 1. Permintaan pemilik (20 Okt 2026)

1. Menu dibagi per **produk**: SP (termasuk SP Injection), Voucher, Saldo (REBUY). SP memakai tangga pcs yang ada (Retail 0 · 1–10 · 10–30 | KRO 30–60 · 60–100 | Wholesaler 100–200 · 200–500 · 500–1000 · > 1000). Voucher dan Saldo memakai tangga **nilai Rupiah**: Retail 0–5 jt dan 5–10 jt; KRO 10–30, 30–60, 60–90 jt; Wholesaler 90–200, 200–400, > 400 jt.
2. Voucher dan Saldo punya dua toggle: **SELL IN** (MOBII, nilai sell-in ke outlet) dan **SELL OUT** (MOBO: Voucher Injection, Saldo Mobo SALMO).
3. Katalog outlet punya tiga mode: (a) Slab performa bulan lalu, (b) Whitelist outlet (unggah / tempel daftar id, diparse di browser), (c) Program (BOSS, Tebus Murah, dst.).
4. Ringkasan KRO mengikuti produk di filter utama dan bisa dikelompokkan per Area, MC, tipe KRO, dan performa.

**Asumsi yang dinyatakan di layar:** pemilik menulis Retail 0–5 / 5–10 dan KRO mulai 10 jt tanpa celah; batas 10 jt diperlakukan sebagai batas, **batas atas masuk slab bawah** (sama dengan tangga pcs): 10 jt tepat = Retail 5–10, KRO 10–30 dimulai di atas 10 jt, 30 jt tepat = KRO 10–30, dst. Tangga nilai: `W3` > 400, `W2` > 200–400, `W1` > 90–200, `K3` > 60–90, `K2` > 30–60, `K1` > 10–30, `R2` > 5–10, `R1` 0–5 (> 0), `N` = 0.

## 2. Sumber per produk dan ukuran

| Produk · ukuran | Sumber (feed) | Per outlet | September (Last FM) | LMTD | Catatan |
|---|---|---|---|---|---|
| **SP** (sell-in + injection) | `penjualan_feed` `c.SP` (pcs MOBII) + `demand_feed` `c.SPI` (SP Injection MOBO, pcs = hits) | pcs | SP `fq` + `l.SPI[2]` | SP `lq` + `l.SPI[0]` | Sejak 20 Okt SP Injection ikut tangga (sebelumnya terpisah); baseline injection September ada di `demand_feed` `l.SPI` (ditambahkan 18 Okt). |
| **Voucher · Sell In** | `penjualan_feed` `c.VCF` + `c.VCB` (nilai Rp: isi = QTY × RATE, blank = QTY × harga blank per brand) | Rp | `fv` | `lv` | outlet-bound saja (DSE / MPC / SDP tidak masuk), sesuai CLAUDE.md §5. |
| **Voucher · Sell Out** | `demand_feed` `c.VCI` (Voucher Injection MOBO) | Rp | `l.VCI[3]` | `l.VCI[1]` | CVM tidak dipakai: sheet CVM di file MOBO dapat memuat salinan RECARGE (builder demand sudah menyaringnya); sell-out voucher = VCI saja. |
| **Saldo · Sell In** | `penjualan_feed` `c.SALMO` (transfer saldo MOBII, nilai Rp) | Rp | `fv` | `lv` | file MOBII punya Sep penuh, jadi bulan lalu tersedia. |
| **Saldo · Sell Out** | `demand_feed` `c.SAL` (SALMO MOBO, Rp transaksi saldo outlet ke pelanggan) | Rp | **tidak ada** | **tidak ada** | `DAILY_DATA_MOBO_SALMO_202610` hanya Oktober; tidak ada file September. Katalog "slab bulan lalu" tidak bisa dihitung; layar memakai proyeksi Oktober dan menyatakannya. 57 id SALMO (Rp 7,9 M) tidak ada di master / adhoc dan tidak masuk outlet mana pun. |
| **GA** (dipertahankan) | `ga_feed` | pcs | Sep | Sep 1..cut | Tetap sebagai produk keempat agar tidak ada fungsi 18 Okt yang hilang. |

Kunci join sama dengan builder sebelumnya: kunci fisik outlet master (`k`), outlet adhoc via `(brand, id)`. Outlet master dengan dua id (IM3 + 3ID) dilipat menjadi satu outlet fisik.

## 3. Proyeksi Oktober

- GA: MTD ÷ cut × 31 (tidak berubah).
- SP, Voucher, Saldo (sell-in **dan** sell-out): **run-rate 7 hari terakhir × 31 ÷ 7**, karena MOBII dan MOBO dimigrasi dan 1–9 Okt sangat rendah (CLAUDE.md, catatan 15 Okt). Nilai harian ada di `md` tiap kategori (`[[hari, nilai, qty]]`).
- Kelas "Okt" = kelas dari proyeksi itu; MTD ditampilkan apa adanya.

## 4. Distribusi pada data 19 Okt (outlet fisik, sebelum menu diubah)

Hitungan outlet pada tangga nilai (basis penjualan_feed / demand_feed, semua tier): Voucher sell-in September: 53 outlet KRO+ (K1 31, K2 16, W 6); Saldo sell-in September: 398 KRO+; Voucher sell-out September (Last FM): 78 KRO+; Saldo sell-out MTD: 297 KRO+ (W3 37, W1 17). Kohor Voucher kecil: sebagian besar outlet Retail pada tangga nilai ini. Angka final direkonsiliasi di §8.

## 5. Skema feed baru (`KRO_FEED`)

- `metadata.ladders`: `pcs` dan `val` (kode, kategori, label, batas bawah); `metadata.keys`: `ga, sp, vsi, vso, ssi, sso` dengan ladder, satuan, `has_fm`, cut, label.
- `rows[]`: outlet berslab KRO ke atas (atau "dekat" KRO) pada **salah satu** dari enam kunci. Tambahan: `q{key: [fm, lm, mtd, pr]}`, `c{key_fm, key_pr}` untuk enam kunci, `fl{key: [flag]}`, `pri{key}`. Medan lama (`ga`, `sp`, `vc`, `sal`, `dm`, `v`) tetap.
- `mc_sum[mc].k[key] = {cf, cp, qf, qp}`: hitungan outlet dan volume per kelas untuk **semua** outlet (termasuk Retail), per kunci.
- `slim[]`: seluruh outlet yang tidak masuk `rows` (id, nama, MC, DSE, check-in, tiga angka per kunci) supaya whitelist / program dapat mencari outlet mana pun, termasuk Retail.
- `programs`: daftar program dari `data/catalogues/kro_program_outlets.csv` (`program,outlet_id`), di-resolve ke kunci outlet; id yang tidak ditemukan dicatat. Template: `data/catalogues/kro_program_outlets_template.csv`.

## 6. Mode katalog

(a) **Slab bulan lalu**: perilaku sekarang, pada produk dan ukuran terpilih (Saldo sell-out: proyeksi Oktober saja). (b) **Whitelist**: id outlet (IM3, 3ID, atau kunci outlet) ditempel atau diunggah (CSV / TXT) dan diparse di browser; tidak ada pengiriman keluar. Id tak ditemukan dicantumkan. (c) **Program**: daftar di feed + unggahan CSV `program,outlet_id` di browser. **Tidak ada daftar program (BOSS, Tebus Murah, dst.) di `raw/`**; keanggotaan BOSS juga sudah dicatat "tidak ada" di `program_sellin_opportunity.md`. Daftar program kosong sampai pemilik mengirim file; nama BOSS dan Tebus Murah sudah tersedia sebagai pilihan.

## 7. Aturan lain

- Tipe KRO per outlet = kelas tertinggi (Sep atau proyeksi Okt) pada kunci terpilih; success visit = ≥ 1 check-in PJP selesai bulan ini (tidak berubah).
- Pengelompokan ringkasan: Area, MC, Tipe KRO (Wholesaler / KRO / Retail), Performa (Baru KRO, Naik slab, Tetap, Turun slab, Berhenti) bila ada bulan lalu.
- Retail hanya dihitung (tidak bisa dibuka daftar), sama seperti sebelumnya.

## 8. Hasil build dan rekonsiliasi (feed 19 Okt 2026)

`python3 scripts/build_kro_feed.py`: 23,545 outlet fisik (778 outlet hanya-sell-in dan 208 hanya-demand ditambahkan ke universe GA, tier non-PJP "S"); `rows` 5,815 (berslab KRO ke atas atau "dekat" pada salah satu dari enam ukuran), `slim` 17,590 outlet Retail di `website/data/kro_slim.js` (2.4 MB, dimuat saat Whitelist / Program dibuka); `kro_feed.js` 4.25 MB (sebelumnya 2.7 MB). Kolom turunan (`c`, `pri`, `hoa`, `dso`) dihitung di browser dari `q`, `fl` dan `mc_info`.

Jumlah outlet per slab (semua outlet, September → proyeksi Oktober), KRO dan Wholesaler saja:

| Ukuran | KRO Sep | Wholesaler Sep | KRO Okt | Wholesaler Okt |
|---|---|---|---|---|
| GA | 823 | 315 | 867 | 313 |
| SP + injection | 1,110 | 336 | 1,907 | 159 |
| Voucher sell-in | 47 | 6 | 15 | 1 |
| Voucher sell-out | 59 | 19 | 159 | 11 |
| Saldo sell-in | 387 | 11 | 508 | 2 |
| Saldo sell-out | n/a | n/a | 584 | 71 |

`node scripts/audit_kro.js` (72 pemeriksaan, semua lolos): (1) volume MTD, LMTD (outlet berslab) dan Last FM tiap ukuran pada `rows` + `slim` = total feed sumber (`penjualan_feed`, `demand_feed`, `ga_feed`), termasuk SP Injection; (2) pengklasifikasi browser (`kroCls`) pada nilai `q` mereproduksi jumlah KRO dan Wholesaler builder per kunci, September dan proyeksi; (3) outlet di `mc_sum` = `outlets_total`. `node scripts/render_check.js` merender setiap produk × ukuran × tab × mode katalog × pengelompokan, whitelist dan program, dan membuka setiap sel yang bisa diklik (popup `kr|…`) tanpa `undefined` / `NaN`.

Catatan: kelas SP di Okt lebih tinggi dari di September karena SP Injection ikut dan proyeksi memakai run-rate 7 hari terakhir (setelah dip migrasi 1–9 Okt); angka sell-in September memakai bulan penuh. Kelompok KRO sell-in voucher kecil (47 outlet) karena voucher isi sell-in terutama lewat alokasi DSE / MPC (bukan outlet-bound).

## 9. Terbuka

- Daftar anggota program (BOSS, Tebus Murah, dan program lain) belum ada di `raw/`: dibutuhkan file `program,outlet_id` dari pemilik program.
- Saldo sell-out menunggu file `DAILY_DATA_MOBO_SALMO_202609` agar punya Last FM / LMTD dan perpindahan kelas.
- Id SALMO yang bukan outlet master / adhoc (57 id, Rp 7.9 M) tidak masuk outlet mana pun.
