# Asesmen & Kontrak: Menu Opportunity · Program Sell-In dan Zero Improvement

**Ditulis**: 14 Okt 2026. Menu **Morning DSE Briefing · Opportunity** dengan dua sub-tab: **Program** (UAR Improvement, Rabu Mantap, Kota/Kab Khusus) dan **Zero Improvement**. Semua dihitung di browser dari `website/data/penjualan_feed.js` (kontrak `daily_data_mobii_sellin.md`), feed kunjungan PJP (`dse_visits_feed.js`) dan master teritori. Fungsi: `viewOpportunity()` dan `op*` di `website/app.js`.

Sumber aturan: empat slide program yang dikirim pemilik 14 Okt 2026 (insentif UAR, simulasi Rabu Mantap, poster RabuMantap IM3 7–9 Okt 2026, Penetrasi Kotkab Khusus).

---

## 1. Data yang tersedia dan yang tidak

| Diperlukan oleh aturan | Ada? | Dipakai |
|---|---|---|
| Unit SP sell-in per outlet per brand, MTD | Ya | `outlets[].p` (qty per produk per outlet) → unit SP IM3 / 3ID per outlet |
| Unit SP per outlet per hari (untuk "UAR 5 di tgl 1–7") | Ya, gabungan brand | `outlets[].c.SP[10] = [[hari, nilai, qty]]` (ditambahkan 14 Okt) |
| Nilai harian per kategori per outlet (jendela Rabu–Jumat) | Ya | `md` per kategori SP, VCB, SALMO; VCF dikecualikan |
| Outlet binaan per DSE, DSE per MC | Ya | master teritori (`dse_name`, `dse_code_*`) |
| % sukses PJP per DSE | Ya, 1–11 Okt | `dseVisitsFeed.dses` (join nama DSE, fallback kode login) |
| Flag outlet AVA | **Tidak** | belum bisa dikecualikan |
| Peserta program BOSS | **Tidak** | belum bisa dikecualikan |
| Stock-out / sell-out 15 (Kotkab) | **Tidak** | komisi ditampilkan sebagai potensi maksimum |
| Hari 13–17 Okt (Kotkab) dan 12–14 Okt (PJP 100%) | **Belum** | data berhenti 12 Okt (sell-in) dan 11 Okt (PJP) |

## 2. UAR Improvement (insentif DSE)

| Aturan slide | Translasi |
|---|---|
| UAR 3 per brand → Rp 15.000 / outlet; UAR 5 per brand → Rp 35.000 / outlet | **UAR n = outlet master dengan n unit Starter Pack sell-in MTD pada brand itu.** Asumsi kerja: "UAR" di slide ini adalah ambang per outlet (karena insentif per outlet); kalau yang dimaksud aktivasi (sell-out GA), basisnya harus diganti ke sumber transaksi MOBO. |
| UAR 10 / UAR 20 gabungan → Rp 100.000 / Rp 200.000 | unit IM3 + 3ID pada outlet yang sama; tier tertinggi dipakai, tidak kumulatif; di bawah 10 gabungan, tier per brand dijumlahkan (outlet bisa dapat 15 rb IM3 + 15 rb 3ID). |
| Maksimum Rp 1.000.000 / DSE | insentif DSE = Σ insentif outlet binaan master, dipotong 1 jt. |
| Compliance 50 % UAR 3 | ≥ 50 % outlet binaan (basis = outlet master per `dse_name`) mencapai UAR 3 pada salah satu brand. |
| Compliance 100 % PJP visit 1–14 Okt | % sukses PJP DSE dari feed kunjungan (1–11 Okt). Status "Comply" hanya bila 100 %; "on track" bila ≥ 90 %. |
| UAR 5 di 1–7 Okt → +Rp 5.000 / outlet | unit SP hari 1–7 ≥ 5 (semua brand, pendekatan) dan outlet minimal tier UAR 5. |
| Outlet AVA tidak eligible | belum diterapkan (tidak ada flag). |

Keluaran: kartu (outlet binaan, UAR 3+, tier, insentif sebelum/sesudah cap, DSE comply, outlet hampir naik tier ≤ 2 unit), tabel MC/DSO, tabel DSE (compliance, PJP, insentif), tabel outlet (unit per brand, tier, jarak ke tier berikut).

## 3. Rabu Mantap (cashback outlet)

| Aturan slide | Translasi |
|---|---|
| Periode Rabu–Jumat setiap minggu (poster: 7–9 Okt 2026) | Jendela dibentuk dari kalender MTD: **Kam–Jum 1–2 Okt** (parsial, Rabu 30 Sep di luar data) dan **Rab–Jum 7–9 Okt**; jendela 14–16 Okt muncul otomatis saat data masuk. |
| Akumulasi 100 Rb / 500 Rb / 1 Jt / 3 Jt / 5 Jt → total cashback 1.500 / 7.500 / 20.000 / 68.000 / 126.000 | akumulasi nilai sell-in outlet pada hari-hari jendela; cashback = total tier tertinggi (bertingkat, sesuai simulasi Outlet A/B/C). |
| "Transaksi yang dihitung: inject fisik, kecuali voucher ori" | default **SP + voucher blank**; opsi "termasuk saldo Mobo" bila inject saldo ikut; voucher isi (ORI) selalu di luar. Perlu konfirmasi definisi "inject fisik" ke pemilik program. |
| Jabodetabek/Banten/Jabar; bukan peserta BOSS; cashback D+1 saldo Mobo | wilayah terpenuhi; BOSS belum bisa dikecualikan; poster berlogo IM3, gunakan tombol Brand bila hanya IM3. |

Keluaran: kartu (outlet bertransaksi, penerima per tier, beban cashback, hampir naik tier ≤ Rp 50 Rb), tabel MC/DSO, DSE, outlet dengan jarak ke tier berikut.

## 4. Kota/Kab Khusus (penetrasi SP)

| Aturan slide | Translasi |
|---|---|
| Khusus Kota Bekasi, Kab. Bekasi, Central North Jakarta (22 kot/kab nasional) | branch master **BEKASI, KAB BEKASI, CENTRAL NORTH JAKARTA**. |
| Sell-in min 5 (tgl 1–17), blended/kombinasi | outlet dengan ≥ 5 unit SP IM3 + 3ID MTD; data sampai 12 Okt. |
| Stock-out 15 → komisi 90.000 (maks tgl 20) / 75.000 (1 bulan), via partner | stock-out tidak ada di data; komisi = potensi maksimum 90.000 × outlet yang lolos sell-in. |
| Target 60 % outlet under kot/kab | target per MC = ⌈60 % × outlet master⌉; gap = target − outlet ≥ 5 unit; "1–4 unit" = outlet terdekat untuk didorong. |

## 5. Zero Improvement

Outlet master dengan nilai 0 pada kategori terpilih selama 1–12 Okt, dipisah: **Lapsed** (ada nilai September penuh), **Dormant** (nol September dan Oktober tetapi ada transaksi kategori lain), **Tanpa transaksi apa pun** (outlet master yang tidak muncul di file sama sekali, dihitung per MC = outlet master − outlet di feed). Disilangkan dengan check-in PJP MTD ("nol tapi sudah divisit"). Urutan outlet: nilai September terbesar dulu (peluang pulih terbesar).

## 6. Catatan untuk pemilik

1. Konfirmasi arti **UAR** di slide insentif (unit SP sell-in vs aktivasi). Semua angka UAR berubah bila basisnya aktivasi.
2. Konfirmasi arti **"inject fisik"** di Rabu Mantap (SP + voucher blank saja, atau termasuk inject saldo Mobo).
3. Kirim daftar **outlet AVA** dan **peserta BOSS** agar pengecualian bisa diterapkan.
4. Stock-out untuk Kotkab butuh sumber sell-out (MOBO transaction details, Step 5 rencana).
5. Baris outlet di feed digabung per outlet master lintas brand (`b` = brand terakhir terlihat); split per brand dilakukan lewat produk, bukan lewat `b`.
