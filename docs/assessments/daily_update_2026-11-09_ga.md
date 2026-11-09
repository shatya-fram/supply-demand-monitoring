# Refresh GA, 9 Nov 2026 siang

Scan 14:13: hanya file GA yang baru (9 Nov 07:11). MOBII, MOBO, SALMO, PJP dan ENDBAL tidak berubah sejak refresh pagi (cut 8 Nov, ENDBAL snapshot 8 Nov), jadi hanya GA, GA site, KRO, Stok dan arsip periode yang dibangun ulang.

## File baru
- `rguga_daily_outlet_inner_202611.csv` (tagging): D1-D8, 57.265 GA.
- `rguga_daily_favloc_inner_202611.csv` (Fav Locs, site): D1-D8, 61.822 GA.

## Hasil
- GA tagging D1-D7 **tidak berubah**; D8 (Minggu 8 Nov) 8.213 GA, 14% dari 3 outlet teratas (1424547 924 GA). GA MTD 57.265 (IM3 39.208, 3ID 18.057). Cut GA kini D8, sejajar dengan Sell-In, Demand dan PJP.
- **Fav Locs D1-D7 direvisi naik** (file sebelumnya vs sekarang): D6 10.828 -> 11.562, D7 10.752 -> 13.847, D1-D5 naik 15-120 GA per hari. Total D1-D7 50.688 -> 54.694. Fav Locs adalah basis site, jadi angka basis site Gross Add dan Daily GA Trend (site) berubah; basis tagging tidak.
- D8 Fav Locs: 4.758 dari 7.128 GA (67%) tanpa outlet pasangan (`RET_TAG` NO_ID), wajar untuk basis site; kecamatan tetap terhitung.
- D6 (10.799) dan D7 (12.810) tagging tetap tinggi dan tidak direvisi (konfirmasi Victor masih terbuka). D8 kembali normal untuk hari Minggu.

## Audit
audit_ga 3.467 OK, audit_kro OK, audit_consistency 275 OK, audit_scorecard 162 OK, audit_period_history 96 OK, render_check OK. `audit_sp` tidak dijalankan ulang (tidak terkait GA; gagal 1 cek seperti pagi ini).
