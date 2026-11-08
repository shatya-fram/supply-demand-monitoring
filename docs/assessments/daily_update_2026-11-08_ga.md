# Refresh GA saja, 8 Nov 2026

Permintaan pemilik 8 Nov 2026: "REFRESH DATA GROSS ADD, untuk MOBII, MOBO ENDBAL dan PJP akan di update besok". Hanya GA, GA site, KRO, Stok dan arsip periode yang dibangun ulang; MOBII, MOBO, ENDBAL, PJP dan Vanguard tidak disentuh (cut tetap 6 Nov, ENDBAL 5 Nov).

## File baru (8 Nov 10:15)
- `rguga_daily_outlet_inner_202611.csv` (tagging): D1-D7, 49.052 GA. Sebelumnya D1-D6.
- `rguga_daily_favloc_inner_202611.csv` (Fav Locs, basis site): D1-D7, 50.688 GA.
- `rguga_favloc_&_rguga_outlet_Inner_Jakarta_202611.xlsb`: tidak dibaca builder.

## Hasil
- Cut GA tagging dan Fav Locs sama: D7 (sebelumnya D6). GA MTD tagging 49.052 (IM3 33.007, 3ID 16.045); D7 = 12.810.
- Bulan lalu (Okt, dari MSISDN) tetap 287.269.
- D1-D5 tidak berubah. **D6 tidak direvisi: 10.799 (Fav Locs 10.828)**, 3 outlet teratas (17452102, SH155202, 153825) = 42%. D7 juga tinggi (12.810; 17768382, 17138808, SH155202, 17452102 = 37%). Dua hari berturut-turut di atas 10 ribu: tanyakan ke Victor apakah ini kampanye atau lonjakan data.
- Sell-In, Demand, PJP tetap cut 6 Nov; GA kini D7, jadi GA satu hari di depan kelompok lain sampai besok.

## Audit
audit_ga 3.467 OK, audit_kro OK, audit_consistency 275 OK, audit_scorecard 162 OK, audit_period_history 96 OK, render_check OK. audit_sp 1 gagal (sama seperti 7 Nov, simpul bulk SH254705, tidak terkait GA).
