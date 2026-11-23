# Assessment · Basis PJP untuk semua % outlet di scorecard (23 Nov 2026)

Permintaan owner: persentase pada scorecard yang dibandingkan dengan jumlah outlet harus memakai **outlet PJP saja** (outlet master yang punya DSE); outlet tanpa DSE, non-PJP dan id belum terpetakan tidak ikut sebagai pembilang maupun penyebut.

## Temuan (contoh Overall Performance, SOUTH JAKARTA DEPOK · MC-KEBAYORAN)

Master MC-KEBAYORAN memuat 762 outlet = **476 ber-DSE (PJP)** + 286 tanpa DSE (DSE UNASSIGNED sejak Master Hierarchy 3 Nov, sebenarnya non-PJP). Kartu Kesehatan outlet dan UAR memakai 762 sebagai penyebut dan menghitung outlet tanpa DSE di pembilang, sedangkan kartu "Outlet divisit" sudah memakai 476. Akibatnya persentase tidak sejajar.

| Kartu | Sebelum | Sesudah (basis 476) |
|---|---|---|
| Outlet tanpa Sell-In SP MTD | 568 = 74.5% dari 762 | 59.9% dari 476 |
| Outlet tanpa GA MTD | 448 = 58.8% dari 762 | 41.8% dari 476 |
| Scorecard outlet nol (minimal 1 nol) | 675 = 88.6% | 81.9% |
| Outlet tanpa SALMO sell-in MTD | 486 = 63.8% | 42.6% |
| Outlet nol di GA + SP + SALMO | 332 = 43.6% | 17.6% |
| Outlet saldo nol (ENDBAL) | 290 = 38.1% | 19.5% |
| UAR Sell-In SP | 194 = 25.5% dari 762 | 40.1% dari 476 |
| UAR SALMO MTD | 276 = 36.2% | 57.4% |
| D-1 SSO vs total outlet | 64 = 8.4% dari 762 | 55 = 11.6% dari 476 |

## Perbaikan (app.js, satu titik untuk semua halaman)

* `pjpMark` (dipanggil dari `pjFeedRaw`, `poFeed`, `gaFeed`): baris feed Penjualan, Demand dan GA yang master tetapi tanpa DSE ditandai non-PJP (tier `A`, di GA `t = 'N'`, field `_np`); angkanya tetap ada di semua total, hanya keluar dari pembilang dan penyebut PJP. `master_counts` per Area / MC menjadi jumlah outlet ber-DSE dari master teritori (nilai asli di `master_counts_all`).
* `opdBase` (dasar kartu kesehatan outlet, End Balance, Opportunity, PJP): hanya outlet ber-DSE.
* Berlaku untuk semua halaman yang memakai basis itu: Overall Performance, Sell-In Monitoring (UAR %), Demand (UAR %), Gross Add / SSO, End Balance, Opportunity, PT Partner.
* Penutupan Oktober (`per=oct`) tidak berubah (basis master lama).
* `audit_scorecard.js` memakai basis yang sama (outlet ber-DSE).

Catatan: `PER=oct node scripts/audit_scorecard.js` gagal 16 pemeriksaan karena audit membaca master teritori November (27,350) sedangkan feed Oktober memakai master Oktober (16,120); ini tidak disebabkan perubahan ini (jalur Oktober tidak diubah).
