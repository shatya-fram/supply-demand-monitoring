# Assessment · GA deep dive, Daily GA Trend, KRO / Wholesaler catalogue

Assessed 18 Oct 2026, before any app change (CLAUDE.md §2); revised the same day after the owner's decisions (§6). Extends `ga_rguga_outlet.md`. Data contract for `scripts/build_ga_feed.py` (location fields `lk`, `lm`, `la`), `scripts/build_kro_feed.py` (`website/data/kro_feed.js`, `KRO_FEED`; `data/catalogues/kro_outlet_catalogue.csv`) and the Gross Add, Daily GA Trend and Outlet & KRO Management views.

## 1. Owner decisions (18 Oct 2026)

1. **GA BIOMETRIC, #OUTLET ACTIVE GA and M2S KECAMATAN are not used any more.** The builder no longer reads them; the feed carries no `control` or `location` block.
2. **Location basis = the location columns of `Daily_RGUGA_OUTLET` itself** (kecamatan / kec_kabkot, micro cluster, area). No NBS-outlet mapping, no master site.
3. **Standard slab ladder**, per outlet per month, for both GA (sell-out) and SP sell-in (supply): Retail 0 · 1–10 · 10–30; KRO 30–60 · 60–100; Wholesaler 100–200 · 200–500 · 500–1000 · > 1000. The upper bound belongs to the lower slab (the convention of the existing SG_PCS slabs). This replaces the first 60 / 100 / 200 proposal.
4. **Visits:** highlight, for KRO and for Wholesaler, how many have a success visit and how many have not been visited so far.

## 2. The two GA bases on the data that remains

Both bases use the **same RGUGA quantities**; they differ in the attribution dimension.

| | **A · Outlet tagging** (DSE incentive) | **B · Site / location** (HoA, Region, DSO) |
|---|---|---|
| Attribution | outlet → master DSE → MC → Area | the file's own kecamatan → micro cluster → area (`lk`, `lm`, `la`) |
| Extra KPIs | GA ber-DSE (base of the DSE incentive), SSO per DSE, outlet list | active kecamatan, GA per active kecamatan, top-10 concentration |
| Not available | location of an activation | DSE, outlet list, SSO per DSE |

Finding: with the file's own geography the totals barely move against the master attribution. Of 30,180 brand-outlet rows only 120 carry a micro cluster in the file that differs from the master (e.g. outlets mapped to MC-CEMPAKA PUTIH in the master that the file puts in MC-TANAH ABANG) and 9 an area that differs. Area totals differ by at most 1 GA (SOUTH JAKARTA DEPOK 19,565 tagging vs 19,564 location). 9.9% of October GA (10,691 pcs) sits at outlets that have no kecamatan in the files (raw-pivot outlets); they are shown as "(kecamatan tidak tertulis di file)". The sheet area label "KOTA BEKASI" is mapped to the master area BEKASI through the file's micro cluster. So B is a different cut of the same quantity, not a different quantity: a true activation location (where the MSISDN was activated, versus the outlet that tagged it) is not in any file that remains, and the "GA at location X from outlet Y" matrix stays unbuilt (extract needed: `date · brand · activating site or kecamatan · tagged outlet id · qty`).

## 3. Audit of the Gross Add view (cut 15 Oct, IOH, all outlets)

| # | Finding | Evidence | Treatment |
|---|---|---|---|
| F1 | SSO headline and its percentage use different numerators | "SSO MTD" 13,075 (all outlets with ≥ 1 GA) vs "61.8% dari 14,639 outlet master" = 9,053 / 14,639 | Card states SSO all, SSO master, % of master, SSO outside master (4,022). |
| F2 | "Gap SSO vs Last FM" compares 15 days with 30 days | SSO MTD 13,075 vs Sep full 19,418 = −6,343 (SSO is a distinct count) | Replaced by average SSO per day (outlet-days with GA ÷ days) for MTD, LMTD and Last FM, plus SSO LMTD (same 15 days); the territory tables show "SSO / hari vs LMTD". |
| F3 | GA that cannot be credited to a DSE is in the headline | GA at outlets with a DSE 69,146 of 108,369 (63.8%); SSO with a DSE 9,645; 39,223 pcs at outlets without a DSE | Card "GA ber-DSE (dasar insentif DSE)" in basis A. |
| F4 | Site basis showed the same cards as tagging, built from NBS-site roll-up | previous implementation | Basis B now has its own territory (kecamatan) and its own cards (§2). The NBS roll-up and the BIOMETRIC / M2S reference tables are removed, as is the Distribusi & Roaming tab. |
| F5 | Weekday mix differs between MTD and LMTD | Oct 1–15 has 3 Thursdays, Sep 1–15 has 3 Tuesdays; the weekday-aligned LMTD (3–17 Sep) is 111,642, so MTD 108,369 is −2.9%, not +0.1% | Daily GA Trend shows both and a weekday profile. |
| F6 | Run-rate and projection are linear | MTD ÷ 15 × 31 = 223,963; the last-7-day run-rate gives a different path (about 7,985/day on 8–15 Oct against 6,355 on 1–7 Oct) | Daily GA Trend shows both projections. |
| F7 | SSO is falling while GA is flat | average SSO per day 2,728 vs 3,235 LMTD (−15.7%); GA per SSO-day 2.6 vs 2.2 | GA is carried by fewer outlets; this feeds the KRO concentration finding. |
| F8 | Feeds have different cuts | GA 15 Oct; sell-in and demand 16 Oct; PJP visits 16 Oct | Every KRO column states its own cut. |

Checked and aligned: GA MTD = Σ outlets (108,369 = IM3 71,742 + 3ID 36,627); run-rate = GA ÷ cut (7,225); projection = run-rate × 31 (223,963); LMTD = Sep days 1..cut; Last FM 252,195 = Σ outlets Sep 1–30; IOH SSO folds IM3 + 3ID per physical outlet; `% SSO PJP` uses PJP outlets only.

## 4. KRO / Wholesaler catalogue on the standard ladder

Classes in the feed: `W4` > 1000, `W3` 500–1000, `W2` 200–500, `W1` 100–200 (Wholesaler); `K2` 60–100, `K1` 30–60 (KRO); `R2` 10–30, `R1` 1–10 (Retail); `N` none. Two bases: **GA** (RGUGA pcs per physical outlet, IM3 + 3ID folded; September 30 days, October = MTD ÷ 15 × 31) and **SUPPLY** (Starter Pack sell-in pcs, MOBII outlet-bound; October = last 7 cut days × 31 ÷ 7 because 1–9 Oct sell-in is depressed by the migration; SP Injection is shown MTD only, not in the slab). Universe: 22,878 outlets = 22,452 with GA rows (14,639 master + 7,813 outside the master with GA) + 426 supply-only outlets (sell-in rows no GA outlet claims, mostly adhoc).

### 4.1 September base

| Slab | GA outlets | GA pcs | SUPPLY outlets | SP pcs |
|---|---|---|---|---|
| Wholesaler > 1000 | 14 | 26,005 | 2 | 3,166 |
| Wholesaler 500–1000 | 20 | 12,805 | 8 | 4,911 |
| Wholesaler 200–500 | 115 | 35,156 | 54 | 14,503 |
| Wholesaler 100–200 | 166 | 22,783 | 68 | 9,965 |
| KRO 60–100 | 190 | 14,785 | 119 | 9,173 |
| KRO 30–60 | 633 | 26,380 | 596 | 24,127 |
| Retail 10–30 | 3,280 | 56,454 | 4,683 | 80,175 |
| Retail 1–10 | 15,000 | 57,827 | 9,156 | 51,531 |

Wholesalers (> 100): 315 outlets carry 96,749 of 252,195 GA (38.4%); KRO (30–100): 823 outlets 41,165 (16.3%); together 1,138 outlets (5%) carry 54.7%. SUPPLY: 132 Wholesalers and 715 KRO.

### 4.2 Findings that drive the flags

- **The KRO and Wholesaler cohort of September is falling.** Its October MTD GA is 43,981 against 68,957 at September's pace (−36.2%) while region GA is flat: growth is in Retail.
- **Coverage gap (basis GA, highest slab of September or the October projection).** Wholesalers: 485 outlets, 284 success visits (58.6%), **201 never visited (41.4%)**, 183 without a DSE; success rate (executed ÷ planned) 65.3%. KRO: 1,164 outlets, 856 success visits (73.5%), **308 never visited (26.5%)**, 264 without a DSE; success rate 70.3%. Of the 14 Wholesalers above 1000 GA a month, 10 have no completed visit in 1–16 Oct.
- **The two bases barely overlap**: GA Wholesalers are mostly Retail or empty on supply; the supply flow measures what is pushed to the outlet, not what the outlet activates.

### 4.3 Flags (per outlet, computed in the builder)

NO_VISIT (KRO or above, no executed PJP stop 1–16 Oct) · LOW_VISIT (< 2 visits) · GA_DOWN (fell a whole category: Wholesaler → KRO → Retail) · GA_STOP (September KRO, no GA MTD) · SUPPLY_NO_GA (SP sell-in > 30 and GA ≤ 10 in September) · GA_NO_SUPPLY (GA KRO whose SP sell-in is below 30% of its GA; NO_SUPPLY_ROW when the outlet has no sell-in row) · NO_DSE · SPIKE (a day ≥ 300 GA or > 50% of the month) · NO_DEMAND (zero MOBO demand MTD).

## 5. PJP visits by DSO: not identifiable

The MOBI Journey Plan export carries `OPERATOR TYPE` ∈ {Canvasser, Promotor, Canvasser SDP, CANVASSER OUTLET}; no DSO login. The 84 operator rows that are not in the DSE master (not promotors) hold 74 executed stops (0.1%); none carries a DSO name and `OPERATOR FULL NAME` is empty. The menu therefore reports visits per outlet by the field operator and the **DSO team view** (all DSEs of the DSO's MC), highlighting success visits and never-visited KRO / Wholesaler per DSO / MC / DSE. Data request: the DSO MOBI login list to count DSO check-ins separately.

## 6. Feed layout (`KRO_FEED`) and open items

- `metadata`: slab classes, near threshold 25, per-source cuts (`ga 15`, `supply 16`, `demand 16`, `visits 16`), counts and volumes per slab and basis, definitions, `mc_info`.
- `mc_sum[mc]`: counts and volumes per slab and basis for every outlet in the MC (including Retail).
- `rows` (3,610): every outlet that is KRO or above on any basis or month, or above 25 pcs (watch list): identity, territory, DSE, `ga {fm, lm, mtd, pr, im3, 3id, max, day[]}`, `sp {fm, lm, mtd, pr, d7, pr7, spi}`, `vc`, `sal`, `dm`, `v {x, p, d, by[], dses}`, `c` (four slab codes), `fl`, `pri`.
- Catalogue CSV: outlets of KRO or above in September on either basis, base month 2026-09; regenerate each month after the last full month closes.

Open: (a) DSO login list; (b) pair-level activation extract if a true activation location is wanted; (c) SP sell-in per outlet is outlet-bound only, so GA outlets supplied through DSE allocation or MPC show as "GA tanpa supply outlet".
