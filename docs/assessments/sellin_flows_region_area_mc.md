# Sell-In Flows at Region, Area and MC Level (MOBI data only)

**Date:** 13 October 2026 · **Window:** 01–11 Oct 2026 · **Scope confirmed by the owner:** MOBI data only; balance flows MPX→DSE, MPX→Outlet, DSE→Outlet; physical flows MPX→Outlet, MPX→DSE (plus MPX→MP3 bulk and DSE→Outlet for context); Region → Area → MC first, outlet / site / kecamatan later.
**Tier rules:** sender from FROM NODE NAME prefix (`MPC - OWNER` = MPX distributor, `Canvasser` = DSE, `SDP` = sub-dealer partner, other = UNK). Receiver: `Mobo Outlet` / `Non Mobo Outlet` = outlet; `Canvasser` = DSE; `_MP3` / `MPC - OWNER` = sub-distributor stock point. MC = DEST PARTNER TERRITORY, falling back to the initiator MC; rows outside the 36 Inner Jakarta MCs are dropped and counted.

## Findings

1. **Product category exists in the physical report**: `PRODUCT CATEGORY` = `Voucher` or `Starter Pack`, with 27 SKUs. A product family can be derived from the SKU name and unit rate (table 1). The balance report has one category only, `E-Voucher` (saldo in rupiah).
2. **Balance MPX→DSE and MPX→Outlet are not in the export.** All balance rows are DSE→Outlet (6,215 Inner Jakarta rows, Rp 2.08 B), SDP→Outlet (Karawang only, Rp 43 M) or unidentified senders (Rp 63 M). The distributor-to-DSE saldo top-up must come from another MOBI export.
3. **Physical MPX→DSE is nearly empty** (31 rows, 149 units). **Physical MPX→Outlet** exists only in Karawang (7,520 voucher units from the distributor plus 2,204 from SDPs). The large physical movement is **MPX→MP3** (168,809 vouchers, 22,852 starter packs into territory stock points) followed by **DSE→Outlet** (116,118 vouchers, 3,159 starter packs).
4. Starter packs: 22,852 units filled into MP3 stock points vs 3,159 sold in to outlets by DSEs in the same 11 days.

## Tables (generated from the raw files)

```
### 1. PRODUCT CATEGORY in the physical report (SP VC Sellin), units 01–11 Oct, all flows
Brand Category      Family (derived from SKU name / rate)   rows     units        value Rp  SKUs
3ID   Starter Pack  SP FWA / HiFi Air                         33     1,580      78,600,000  3
3ID   Starter Pack  SP bundle KPK / kosong                   202     9,719      97,190,000  3
3ID   Voucher       VC blank 3in1 (Rp 500)                   576    75,744      37,872,000  1
IM3   Starter Pack  SP FWA / HiFi Air                        109       278       2,780,000  2
IM3   Starter Pack  SP ORI 3GB                                 6     2,460      73,800,000  3
IM3   Starter Pack  SP Zero / regular                        729    13,131     131,310,000  2
IM3   Voucher       VC blank 3in1 (Rp 500)                  1658   163,219      81,609,500  1
IM3   Voucher       VC data (FI/FIS/6G)                     1346    59,619     749,322,550  12

### 2. BALANCE flows (MOBI Transfer Balance), Rp, Inner Jakarta MCs only
rows by flow (IJ): {'DSE>OUTLET': 6215, 'UNK>OUTLET': 182, 'SDP>OUTLET': 208} | rows outside IJ MCs dropped: 6155
Area (branch)                     MPX>DSE       MPX>OUTLET       SDP>OUTLET       DSE>OUTLET       UNK>OUTLET
SOUTH JAKARTA DEPOK                     0                0                0      702,610,178        8,305,000
CENTRAL NORTH JAKARTA                   0                0                0      314,795,543          257,100
WEST JAKARTA                            0                0                0      257,391,765        3,501,100
EAST JAKARTA                            0                0                0      231,163,900       10,479,100
KAB BEKASI                              0                0                0      208,214,500       25,506,400
BEKASI                                  0                0                0      183,822,100        8,345,200
KARAWANG                                0                0       43,290,000      181,137,120        6,350,000
REGION INNER JAKARTA                    0                0       43,290,000    2,079,135,106       62,743,900

### 3. PHYSICAL flows (SP VC Sellin), units, Inner Jakarta MCs only
rows by flow (IJ): {'MPX>MP3': 116, 'DSE>OUTLET': 4164, 'MPX>OTHER': 8, 'MPX>DSE': 31, 'UNK>OUTLET': 100, 'SDP>OUTLET': 185, 'UNK>MP3': 1, 'MPX>OUTLET': 38} | rows outside IJ MCs dropped: 16

-- VOUCHER units
Area (branch)                 MPX>MP3      MPX>DSE   MPX>OUTLET   SDP>OUTLET   DSE>OUTLET   UNK>OUTLET
SOUTH JAKARTA DEPOK            47,019            0            0            0       61,949            0
KAB BEKASI                     49,049            0            0            0       18,624        1,529
EAST JAKARTA                   23,130            0            0            0       17,741            0
CENTRAL NORTH JAKARTA          40,901            0            0            0       15,889            0
WEST JAKARTA                        0            0            0            0        1,144            0
KARAWANG                        8,710           30        7,520        2,152          415           10
BEKASI                              0            0            0            0          356            0
REGION INNER JAKARTA          168,809           30        7,520        2,152      116,118        1,539

-- STARTER PACK units
Area (branch)                 MPX>MP3      MPX>DSE   MPX>OUTLET   SDP>OUTLET   DSE>OUTLET   UNK>OUTLET
KARAWANG                        1,350            3            0           52        1,757            0
CENTRAL NORTH JAKARTA           6,955            0            0            0          875            0
KAB BEKASI                      8,911          116            0            0          495           63
BEKASI                             92            0            0            0           31            0
SOUTH JAKARTA DEPOK             5,544            0            0            0            1            0
REGION INNER JAKARTA           22,852          119            0           52        3,159           63

### 4. MC level (36), physical units VC / SP and balance Rp, by flow
MC                   Branch                 | MPX>MP3 VC MPX>MP3 SP | MPX>OUT VC MPX>OUT SP |  MPX>DSE | DSE>OUT VC DSE>OUT SP |  Bal DSE>OUT Rp  Bal SDP>OUT
MC-BEKASI TENGAH     BEKASI                 |          0          0 |          0          0 |        0 |          0          0 |      53,713,400            0
MC-BEKASI UTARA      BEKASI                 |          0         40 |          0          0 |        0 |        200          0 |      34,933,300            0
MC-MUSTIKA JAYA      BEKASI                 |          0         52 |          0          0 |        0 |         10          0 |      41,927,400            0
MC-PONDOK GEDE       BEKASI                 |          0          0 |          0          0 |        0 |        146         31 |      53,248,000            0
MC-CEMPAKA PUTIH     CENTRAL NORTH JAKARTA  |     22,651      3,522 |          0          0 |        0 |     12,435          0 |      74,343,300            0
MC-KELAPA GADING     CENTRAL NORTH JAKARTA  |          0          0 |          0          0 |        0 |      2,625        575 |      36,910,933            0
MC-PADEMANGAN        CENTRAL NORTH JAKARTA  |          0          0 |          0          0 |        0 |          0          0 |      85,258,310            0
MC-TANAH ABANG       CENTRAL NORTH JAKARTA  |     18,250      2,965 |          0          0 |        0 |        706          0 |      49,469,500            0
MC-TANJUNG PRIOK     CENTRAL NORTH JAKARTA  |          0        468 |          0          0 |        0 |        123        300 |      68,813,500            0
MC-CAKUNG            EAST JAKARTA           |          0          0 |          0          0 |        0 |      2,541          0 |      98,274,400            0
MC-CIRACAS           EAST JAKARTA           |          0          0 |          0          0 |        0 |      8,900          0 |      51,724,800            0
MC-KRAMATJATI        EAST JAKARTA           |     23,130          0 |          0          0 |        0 |      6,300          0 |      55,507,000            0
MC-MATRAMAN          EAST JAKARTA           |          0          0 |          0          0 |        0 |          0          0 |      25,657,700            0
MC-BABELAN           KAB BEKASI             |     15,000          0 |          0          0 |        0 |        700          0 |      49,800,000            0
MC-CIBARUSAH         KAB BEKASI             |      2,800      1,386 |          0          0 |       30 |        447        157 |      19,804,400            0
MC-CIBITUNG          KAB BEKASI             |          0          0 |          0          0 |        0 |     13,865         20 |      24,905,200            0
MC-CIKARANG BARAT    KAB BEKASI             |      2,900      1,661 |          0          0 |       39 |        373        135 |      16,132,400            0
MC-CIKARANG TIMUR    KAB BEKASI             |      2,849      1,314 |          0          0 |       47 |        257        128 |      22,974,200            0
MC-PEBAYURAN         KAB BEKASI             |     25,500      4,550 |          0          0 |        0 |          0          0 |      27,842,300            0
MC-TAMBUN            KAB BEKASI             |          0          0 |          0          0 |        0 |      2,982         55 |      46,756,000            0
MC-BATUJAYA          KARAWANG               |      4,800      1,350 |          0          0 |        6 |        139        556 |      38,732,670            0
MC-EAST CIKAMPEK     KARAWANG               |          0          0 |      3,610          0 |        0 |         11          0 |      37,231,500            0
MC-KARAWANG          KARAWANG               |          0          0 |          0          0 |        0 |         16        300 |      29,239,600            0
MC-RENGASDENGKLOK    KARAWANG               |          0          0 |          0          0 |        0 |        209        863 |      24,663,850            0
MC-TEGALWARU         KARAWANG               |          0          0 |      2,152         52 |        3 |         20         38 |      22,920,000   43,290,000
MC-WEST CIKAMPEK     KARAWANG               |      3,910          0 |      3,910          0 |       24 |         20          0 |      28,349,500            0
MC-BEJI              SOUTH JAKARTA DEPOK    |      5,134      2,661 |          0          0 |        0 |          0          0 |      23,117,500            0
MC-CIMANGGIS         SOUTH JAKARTA DEPOK    |          0          0 |          0          0 |        0 |          0          0 |      46,251,500            0
MC-CIPAYUNG          SOUTH JAKARTA DEPOK    |          0          0 |          0          0 |        0 |          0          0 |      72,325,878            0
MC-KEBAYORAN         SOUTH JAKARTA DEPOK    |          0          0 |          0          0 |        0 |     15,320          0 |     220,568,900            0
MC-PANCORAN          SOUTH JAKARTA DEPOK    |          0        220 |          0          0 |        0 |      9,373          0 |     148,448,800            0
MC-PASAR MINGGU      SOUTH JAKARTA DEPOK    |          0          0 |          0          0 |        0 |     36,781          1 |     155,755,200            0
MC-SAWANGAN          SOUTH JAKARTA DEPOK    |     41,885      2,663 |          0          0 |        0 |        475          0 |      36,142,400            0
MC-CENGKARENG        WEST JAKARTA           |          0          0 |          0          0 |        0 |        908          0 |     128,498,565            0
MC-GROGOL            WEST JAKARTA           |          0          0 |          0          0 |        0 |        236          0 |      67,396,400            0
MC-KEMBANGAN         WEST JAKARTA           |          0          0 |          0          0 |        0 |          0          0 |      61,496,800            0
```
