# Audit pemetaan data ke teritori

**Dibuat**: 21 Oct 2026 19:59 oleh `scripts/audit_data_mapping.py`. Menjawab: apakah data MOBII, MOBO, PJP, ENDBAL dan target sudah masuk ke outlet, DSE, MC dan Area yang tepat, dan berapa yang belum.

## 1. Master outlet dan penugasan DSE

| Ukuran | Jumlah | % |
|---|---:|---:|
| Outlet master | 16,130 | 100% |
| Dengan DSE | 14,962 | 92.8% |
| Tanpa DSE (UNASSIGNED) | 1,168 | 7.2% |
| Tanpa Micro Cluster | 0 | 0.0% |
| Tanpa Branch | 0 | 0.0% |
| Dengan GPS | 16,081 | 99.7% |

Perbaikan 15 Okt: kode DSE `0` / `0.0` di file mapping berarti "tidak ada DSE", bukan DSE bernama 0. Sebelumnya 859 outlet di 17 MC terbaca sebagai satu DSE "0" dengan target proxy Rp 1,42 M; kini berlabel `UNASSIGNED` dan tidak masuk roster DSE.
DSE berbeda dengan nama sama: **SUSANTO** (CSO-LOKADPK273ID · MC-CIMANGGIS, CSOBKSB-083ID · MC-PONDOK GEDE). Di KPI feed keduanya kini punya kunci sendiri (nama + kode) sehingga target dan sell-in tidak tercampur.

## 2. Penugasan outlet ke DSE: master vs sheet "Pairing Outlet-DSE" di file target

| Ukuran | Jumlah | % |
|---|---:|---:|
| Pasangan outlet-DSE di file target | 47,270 | 100% |
| Outlet ditemukan di master | 13,079 | 27.7% |
| DSE sama dengan master | 11,760 | 89.9% |
| DSE berbeda dari master | 1,319 | 10.1% |

| Penyebab selisih DSE (outlet ada di master) | Outlet | % selisih |
|---|---:|---:|
| DSE lain menurut FINAL | 893 | 67.7% |
| Master tanpa DSE: outlet tidak ada di FINAL 20 Okt | 396 | 30.0% |
| Outlet baru dari FINAL (belum ada di master saat target dibuat) | 29 | 2.2% |
| Orang sama, login berganti | 1 | 0.1% |

Contoh beda: outlet 569016 → file 2613051169 vs master CSOBUANAJKP09; outlet 17704190 → file 2613051224 vs master CSOBUANAJKB03; outlet 17787835 → file DSELUIG21 vs master DSEPNKN02; outlet 571255 → file 1-136027989777 vs master UNASSIGNED; outlet 576760 → file DSEKARA0622 vs master CSOBUANAJKP093ID.
Selisih ini menentukan basis outlet yang dihitung untuk OSA dan UAR per DSE. Master outlet (file mapping outlet) tetap sumber resmi aplikasi; sheet pairing hanya dipakai sebagai pembanding.

## 3. MOBII · Sell-In (DAILY_DATA_MOBII)

| Penerima di file | Nilai MTD | % nilai | Baris | Id |
|---|---:|---:|---:|---:|
| Outlet master | Rp 11.29 M | 62.3% | 32,400 | 29,312 |
| Node DSE (stok ke DSE) | Rp 3.56 M | 19.7% | 160 | 97 |
| Node MPC | Rp 2.77 M | 15.3% | 141 | 74 |
| Outlet adhoc (bukan master, ada di mapping adhoc) | Rp 271.1 jt | 1.5% | 121 | 92 |
| Id tidak dikenal | Rp 103.7 jt | 0.6% | 136 | 128 |
| Node SDP | Rp 76.6 jt | 0.4% | 10 | 5 |
| Node lain (stockist FWA dll) | Rp 53.0 jt | 0.3% | 12 | 9 |

Sell-In yang sampai ke **outlet** (master + adhoc): Rp 11.56 M = 63.8% dari seluruh file; sisanya adalah stok ke node distribusi yang memang bukan outlet. Id tidak dikenal: 0.6% nilai.
Outlet di feed: 17,692 (master 15,586, adhoc 2,106); outlet adhoc tanpa MC: 0. Outlet master tersebar di 36 MC.
Outlet master tanpa DSE di feed Sell-In: 1,054 (nilai MTD tetap dihitung di Area dan MC, tetapi tidak ke DSE mana pun).

## 4. MOBO · Demand (DAILY_DATA_MOBO)

| Kelas id | Nilai MTD | % nilai | Id |
|---|---:|---:|---:|
| Outlet adhoc | Rp 122.09 M | 70.8% | 1,689 |
| Outlet master (id IM3) | Rp 27.36 M | 15.9% | 31,099 |
| Outlet master (id 3ID) | Rp 13.34 M | 7.7% | 10,355 |
| Id tidak dikenal | Rp 9.67 M | 5.6% | 72 |

Id yang tidak bisa ditaruh di outlet mana pun: 15 id, Rp 31.9 jt. Nilai demand adhoc 70.8%: pola node grosir atau penjual online, bukan outlet ritel (lihat tab Konsentrasi).
Outlet master dengan demand tetapi tanpa DSE: 933.

## 5. PJP · Kunjungan DSE (MOBI Journey Plan)

| Ukuran | Operator | Rencana | Terlaksana |
|---|---:|---:|---:|
| Operator cocok dengan DSE master | 272 | 108,008 | 78,818 |
| Operator tidak ada di master | 205 | 3,167 | 715 |
| Total file PJP | 477 | 111,175 | 79,533 |

Yang sampai ke roster DSE di KPI feed: rencana 108,008 dari 111,175 (97.2%), terlaksana 78,818 dari 79,533 (99.1%). Selisihnya dua jenis: operator yang tidak ada di master sama sekali, dan DSE master tanpa outlet. Keduanya tetap dihitung di Area dan MC lewat teritori kunjungannya, tetapi tidak di scorecard per DSE.
Normalisasi nama branch PJP ke master: KOTA BEKASI → BEKASI (58 operator), SOUTH JAKARTA → SOUTH JAKARTA DEPOK (6 operator), CIREBON → OUTSIDE MASTER TERRITORY (5 operator), BOGOR EAST → OUTSIDE MASTER TERRITORY (3 operator), SOUTH JAKARTA DEPOK → OUTSIDE MASTER TERRITORY (3 operator), NORTH KARAWANG → KARAWANG (2 operator), BOGOR WEST → OUTSIDE MASTER TERRITORY (2 operator), PANDEGLANG LEBAK → OUTSIDE MASTER TERRITORY (2 operator).
Outlet pada jadwal kunjungan yang cocok dengan master outlet: 26,173 dari 26,874 (97.4%).
Operator belum cocok (rencana terbesar): DSEIN107 (MC-CIPAYUNG, 313), CSO-UTARA-01 (MC-CIBITUNG, 232), DSEIN100 (MC-KARAWANG, 165), DSEIN1003ID (MC-KARAWANG, 163), DSEIN1223ID (MC-TAMBUN, 110), 2613050594 (MC-MATRAMAN, 108).

## 6. ENDBAL · Stock balance outlet

| Klasifikasi organisasi | Jumlah |
|---|---:|
| master | 23,830 |
| tidak terpetakan | 14,623 |
| adhoc | 2,096 |
| bukan outlet | 342 |

Outlet di feed: 18,121 (master 16,025, adhoc 2,096). Organisasi bertipe outlet yang tidak terpetakan ke master maupun adhoc: 14,623, dengan stok Rp 2.30 M yang tidak masuk ke MC mana pun (teratas: MC-KARAWANG 1,139, MC-CIKARANG 860, MC-RENGASDENGKLOK 853, MC-DEPOK BARAT 852).

## 7. Target Setting per DSE vs file target

| Ukuran | File target | Aplikasi (KPI feed) |
|---|---:|---:|
| Baris / DSE | 272 | 272 |
| Target Sell-In SP (pcs) | 266,769 | 266,765 |
| Target OSA IOH (Rp) | 73,636,987,706 | 73,636,987,731 |
| Baris target yatim (tidak menempel ke DSE) | — | 0 |
| DSE tanpa target resmi (pakai proxy) | — | 0 |

Pembandingan per DSE (kode DSE IM3 / 3ID, SP IM3 + 3ID, OSA IM3, OSA 3ID, MC) dijalankan untuk semua baris file; hasil di bagian Kesimpulan.

## 8. Kesimpulan

- Target per DSE: **260 dari 272 baris file cocok persis** dengan aplikasi (baris 22: CSOBKSB-02 target atau MC berbeda dari file; baris 23: CSOBKSS-04 target atau MC berbeda dari file; baris 24: CSOBKSS-05 target atau MC berbeda dari file; baris 26: CSOBKST-11 target atau MC berbeda dari file; baris 27: DSEIN002 target atau MC berbeda dari file).
- Yang diperbaiki hari ini: pseudo-DSE "0" (outlet tanpa DSE), dua DSE bernama SUSANTO yang tergabung, dan pencocokan target di menu Target Setting yang memakai nama saja (kini nama + MC).
- Yang masih terbuka: operator PJP yang tidak cocok dengan master, id MOBII / MOBO tidak dikenal, dan organisasi ENDBAL tidak terpetakan (bagian 3 sampai 6). Itu butuh pembaruan file mapping outlet atau master DSE dari pemilik data.
