# Audit pemetaan data ke teritori

**Dibuat**: 15 Oct 2026 12:38 oleh `scripts/audit_data_mapping.py`. Menjawab: apakah data MOBII, MOBO, PJP, ENDBAL dan target sudah masuk ke outlet, DSE, MC dan Area yang tepat, dan berapa yang belum.

## 1. Master outlet dan penugasan DSE

| Ukuran | Jumlah | % |
|---|---:|---:|
| Outlet master | 14,694 | 100% |
| Dengan DSE | 13,834 | 94.1% |
| Tanpa DSE (UNASSIGNED) | 860 | 5.9% |
| Tanpa Micro Cluster | 0 | 0.0% |
| Tanpa Branch | 0 | 0.0% |
| Dengan GPS | 14,688 | 100.0% |

Perbaikan 15 Okt: kode DSE `0` / `0.0` di file mapping berarti "tidak ada DSE", bukan DSE bernama 0. Sebelumnya 859 outlet di 17 MC terbaca sebagai satu DSE "0" dengan target proxy Rp 1,42 M; kini berlabel `UNASSIGNED` dan tidak masuk roster DSE.
DSE berbeda dengan nama sama: **SUSANTO** (CSO-LOKADPK27 · MC-CIMANGGIS, CSOBKSB-08 · MC-PONDOK GEDE). Di KPI feed keduanya kini punya kunci sendiri (nama + kode) sehingga target dan sell-in tidak tercampur.

## 2. Penugasan outlet ke DSE: master vs sheet "Pairing Outlet-DSE" di file target

| Ukuran | Jumlah | % |
|---|---:|---:|
| Pasangan outlet-DSE di file target | 47,270 | 100% |
| Outlet ditemukan di master | 13,034 | 27.6% |
| DSE sama dengan master | 12,985 | 99.6% |
| DSE berbeda dari master | 49 | 0.4% |

Contoh beda: outlet 569016 → file 2613051169 vs master CSOBUANAJKP09; outlet 17704190 → file 2613051224 vs master CSOBUANAJKB03; outlet 17787835 → file DSELUIG21 vs master DSEPNKN02; outlet 571255 → file 1-136027989777 vs master DSETMUN11; outlet 576760 → file DSEKARA0622 vs master CSOBUANAJKP09.
Selisih ini menentukan basis outlet yang dihitung untuk OSA dan UAR per DSE. Master outlet (file mapping outlet) tetap sumber resmi aplikasi; sheet pairing hanya dipakai sebagai pembanding.

## 3. MOBII · Sell-In (DAILY_DATA_MOBII)

| Penerima di file | Nilai MTD | % nilai | Baris | Id |
|---|---:|---:|---:|---:|
| Outlet master | Rp 4.15 M | 53.9% | 15,149 | 14,707 |
| Node MPC | Rp 1.61 M | 20.8% | 123 | 67 |
| Node DSE (stok ke DSE) | Rp 1.55 M | 20.1% | 89 | 61 |
| Outlet adhoc (bukan master, ada di mapping adhoc) | Rp 277.3 jt | 3.6% | 333 | 301 |
| Node SDP | Rp 55.8 jt | 0.7% | 7 | 3 |
| Node lain (stockist FWA dll) | Rp 45.7 jt | 0.6% | 10 | 8 |
| Id tidak dikenal | Rp 14.0 jt | 0.2% | 31 | 30 |

Sell-In yang sampai ke **outlet** (master + adhoc): Rp 4.43 M = 57.5% dari seluruh file; sisanya adalah stok ke node distribusi yang memang bukan outlet. Id tidak dikenal: 0.2% nilai.
Outlet di feed: 16,523 (master 13,788, adhoc 2,735); outlet adhoc tanpa MC: 0. Outlet master tersebar di 36 MC.
Outlet master tanpa DSE di feed Sell-In: 727 (nilai MTD tetap dihitung di Area dan MC, tetapi tidak ke DSE mana pun).

## 4. MOBO · Demand (DAILY_DATA_MOBO)

| Kelas id | Nilai MTD | % nilai | Id |
|---|---:|---:|---:|
| Outlet adhoc | Rp 46.40 M | 79.7% | 1,704 |
| Outlet master (id IM3) | Rp 8.17 M | 14.0% | 18,930 |
| Outlet master (id 3ID) | Rp 3.68 M | 6.3% | 3,424 |
| Id tidak dikenal | Rp 5.9 jt | 0.0% | 10 |

Id yang tidak bisa ditaruh di outlet mana pun: 11 id, Rp 6.0 jt. Nilai demand adhoc 79.7%: pola node grosir atau penjual online, bukan outlet ritel (lihat tab Konsentrasi).
Outlet master dengan demand tetapi tanpa DSE: 154.

## 5. PJP · Kunjungan DSE (MOBI Journey Plan)

| Ukuran | Operator | Rencana | Terlaksana |
|---|---:|---:|---:|
| Operator cocok dengan DSE master | 293 | 61,409 | 38,893 |
| Operator tidak ada di master | 181 | 1,449 | 231 |
| Total file PJP | 474 | 62,858 | 39,124 |

Yang sampai ke roster DSE di KPI feed: rencana 59,178 dari 62,858 (94.1%), terlaksana 37,624 dari 39,124 (96.2%). Selisihnya dua jenis: operator yang tidak ada di master sama sekali, dan DSE master tanpa outlet. Keduanya tetap dihitung di Area dan MC lewat teritori kunjungannya, tetapi tidak di scorecard per DSE.
Operator yang cocok dengan DSE master tetapi tidak punya outlet di master (sehingga tidak ada di roster DSE Productivity dan tidak punya target): 21 operator, rencana 2,231 kunjungan. Contoh: DANIAS SUNDAH (MC-CIBITUNG, 277), RADESTA FICRY (MC-CIBITUNG, 256), ADNAN AL AP GHANI (MC-KARAWANG, 178), Rizki Wicaksono (MC-CENGKARENG, 155), KUSNADI (MC-TAMBUN, 124).
Normalisasi nama branch PJP ke master: KOTA BEKASI → BEKASI (58 operator), SOUTH JAKARTA → SOUTH JAKARTA DEPOK (7 operator), CIREBON → OUTSIDE MASTER TERRITORY (5 operator), BOGOR EAST → OUTSIDE MASTER TERRITORY (3 operator), SOUTH JAKARTA DEPOK → OUTSIDE MASTER TERRITORY (3 operator), NORTH KARAWANG → KARAWANG (2 operator), BOGOR WEST → OUTSIDE MASTER TERRITORY (2 operator), KAB BANDUNG → OUTSIDE MASTER TERRITORY (2 operator).
Outlet pada jadwal kunjungan yang cocok dengan master outlet: 26,543 dari 27,648 (96.0%).
Operator belum cocok (rencana terbesar): CSO-UTARA-01 (MC-CIBITUNG, 146), 2613050594 (MC-MATRAMAN, 66), 2613051089 (MC-PANCORAN, 57), 2613052657 (MC-PANCORAN, 48), CSO-UTARA-08 (MC-CIBITUNG, 39), 1-186304119362 (MC-BEJI, 33).

## 6. ENDBAL · Stock balance outlet

| Klasifikasi organisasi | Jumlah |
|---|---:|
| master | 22,318 |
| tidak terpetakan | 15,255 |
| adhoc | 2,722 |
| bukan outlet | 342 |

Outlet di feed: 17,326 (master 14,604, adhoc 2,722). Organisasi bertipe outlet yang tidak terpetakan ke master maupun adhoc: 15,255, dengan stok Rp 3.70 M yang tidak masuk ke MC mana pun (teratas: MC-KARAWANG 1,158, MC-DEPOK BARAT 909, MC-CIKARANG 886, MC-RENGASDENGKLOK 878).

## 7. Target Setting per DSE vs file target

| Ukuran | File target | Aplikasi (KPI feed) |
|---|---:|---:|
| Baris / DSE | 272 | 272 |
| Target Sell-In SP (pcs) | 266,769 | 266,770 |
| Target OSA IOH (Rp) | 73,636,987,706 | 73,636,987,694 |
| Baris target yatim (tidak menempel ke DSE) | — | 0 |
| DSE tanpa target resmi (pakai proxy) | — | 0 |

Pembandingan per DSE (kode DSE IM3 / 3ID, SP IM3 + 3ID, OSA IM3, OSA 3ID, MC) dijalankan untuk semua baris file; hasil di bagian Kesimpulan.

## 8. Kesimpulan

- Target per DSE: **272 dari 272 baris file cocok persis** dengan aplikasi.
- Yang diperbaiki hari ini: pseudo-DSE "0" (outlet tanpa DSE), dua DSE bernama SUSANTO yang tergabung, dan pencocokan target di menu Target Setting yang memakai nama saja (kini nama + MC).
- Yang masih terbuka: operator PJP yang tidak cocok dengan master, id MOBII / MOBO tidak dikenal, dan organisasi ENDBAL tidak terpetakan (bagian 3 sampai 6). Itu butuh pembaruan file mapping outlet atau master DSE dari pemilik data.
