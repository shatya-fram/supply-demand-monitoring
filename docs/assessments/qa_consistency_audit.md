# QA audit: buttons, appearance, scorecard / KPI consistency and wrong-data checks (23 Oct 2026)

Scope (owner request): check every button, the appearance, the scorecard / KPI consistency and that no wrong data is shown, by functionality, formula and logic. Method: all 1,504 rendered cases of `render_check.js` (every view and sub-view with its toggles) were scanned in Node, plus a cross-page comparison of the same metric, plus a static check of the click handlers. Code state: commit 38c9ab1, feeds to 25 Oct (GA 24 Oct). Re-runnable: `node scripts/audit_consistency.js` (278 checks; it fails on the three defects below when run on the old code).

## 1. What was checked and passed
- **Wrong-data patterns** in 1,504 rendered cases: no `undefined`, `NaN`, `[object …]` or `null` text; no negative count in a count column; no share / coverage column above 100% (apart from defect 2 below). One false alarm: an outlet really named "Infinity cell" (id 17439680).
- **Duplicate scorecards** within a page: none left (the duplicate lower row of Site location GA was removed on 24 Oct).
- **Buttons and controls:** 179 distinct `data-*` attributes are rendered; 178 are handled in `onClick` / `onChange` / `onInput`; the one left, `data-nosort`, is a marker read by the table sorter. No dead button found.
- **Same metric, same value on every page** (278 checks): total demand, Sell-In MTD, PJP % (P) and ad-hoc visits, End Balance total and zero-stock outlets, GA MTD (Gross Add = Daily GA Trend = Ringkasan GA), SP Data Sell-In (= SP 3GB + injection of the KPI feed). All agree.
- Existing audits still pass: `render_check`, `audit_scorecard` (164), `audit_ga` (3,845), `audit_kro`, `audit_entity`, `audit_dse_catalogue`.

## 2. Defects found and fixed (commit with this file)
| # | Where | Wrong | Fix |
|---|---|---|---|
| 1 | Demand Customer and Ringkasan > Demand, card "UAR · outlet dengan demand" | 11,228 outlets with demand were shown as **69.6% of 16,130 PJP outlets**, but 707 of them are non-PJP: PJP-only is 10,521 = **65.2%** (breaks the count rule: a % of PJP outlets has a PJP numerator) | Card now reads "65.2% outlet PJP aktif (10,521 dari 16,130) · +707 non-PJP · Δ PJP … vs LMTD …", Last FM on PJP outlets |
| 2 | Sell-In Monitoring (legacy `sellin` view), column "UAR %" | UAR (any) counted outlets outside the master, divided by PJP outlets: **100.6%** at outlet level (5,978 / 5,943), 100.1% on another page | Numerator is PJP outlets only, "+N non-PJP" beneath, CSV follows |
| 3 | PJP Visit and DSE Visits, card "Run-Rate Velocity" | **+1140.4% WoW** compared Oct 1-4 (system migration, 540 stops / day) with the last 7 days (6,692 / day): not a week over week | Feed field `growth_wow.wow_pct` = last 7 days vs the 7 days before: **+20.2%** (6,692 vs 5,568 per day); card text "Last 7 days … vs previous 7 days …" (the ramp narrative text keeps using W1 / W2) |

## 3. Open points that need an owner decision (not changed)
1. **Four different "PJP outlet" bases on screen:** 16,130 (rows of the territory master), 15,767 (UAR tab), 14,962 (outlets with a DSE, Overall) and 14,959 (visits feed). So "belum divisit MTD" reads 170 of 14,962 on Overall and 169 of 14,959 on PJP Visit. The master file has **9 duplicate rows** (8 outlet keys: 5 where one copy has the placeholder name `0.0`, one id on two MCs, and key `0_0` three times with **no outlet id at all**) and 56 ids on more than one row (known `PAIR_3ID_GANDA`). Proposal: one canonical base (distinct outlet keys with a DSE for coverage, distinct keys for UAR) and remove the id-less `0_0` rows and the `0.0` duplicates in `apply_final_dse_mapping.py`.
2. **"Kemarin" cards of End Balance use Sunday:** "Sell-in saldo kemarin (25 Okt) Rp 500 Rb, 1 outlet, −99.9%" is a Sunday artefact (SALMO transfers are about zero on Sunday). Penjualan already uses the last working day ("hari kerja terakhir"). Proposal: same rule for End Balance.
3. **"Not visited in the last 3 days" (32%) and "inactive sites last 3 days" (21%)** count calendar days: the window 23-25 Oct includes Sunday 25 Oct, when there is no PJP (11 planned). Proposal: anchor the 3-day and 7-day windows on working days.
4. **GA target cards on the outlet basis:** Gross Add Ringkasan (outlet basis) still shows "GA vs target Oktober (kecamatan)" and "Proyeksi vs target", while the owner's rule (24 Oct) is that the target belongs to the site / location basis and Daily GA Trend already hides it on the outlet basis. Proposal: hide on the outlet basis in Gross Add Ringkasan too (the Overall Performance GA-vs-target scorecard stays, documented in CLAUDE.md).
5. **Two productivity definitions side by side** (by design, both labelled): "Kunjungan Produktif 45.7%" = productive ÷ executed stops; "Effective Call 35.1%" = productive ÷ (planned + ad-hoc).


## 4. Owner decisions applied (27 Oct 2026)
1. **PJP outlet base:** the territory master is de-duplicated in `apply_final_dse_mapping.py` (3 id-less `0_0` rows dropped, 7 duplicate rows with the placeholder name `0.0` or an unassigned copy dropped): 16,130 → **16,120 distinct outlets**, of which **14,958 have a DSE** (the PJP base of the visits feed, Overall and PJP Visit: 169/170 "belum divisit" now one number, 139 MTD). Sell-in / demand UAR still divides by all 16,120 master outlets (1,162 of them have no DSE); aligning that to the 14,958 PJP base needs a tier change for outlets without DSE and is left as the next decision.
2. **End Balance "kemarin":** the cards use the last working day (Mon-Sat) and the working day before it (`metadata.kemarin_day`, `kemarin_prev_day`; 26 Oct vs 24 Oct today), labelled "saldo hari kerja terakhir".
3. **Not visited 3 / 7 days:** windows are the last 3 / 7 working days (Sundays and days without an export skipped) in `generate_dse_visits_feed.py` (`dates_last_3d`, `dates_last_7d`); at cut 26 Oct the 3-day window is 23, 24, 26 Oct. The run-rate week over week stays on calendar days.
4. **GA target cards:** `gaTgtCards` returns nothing on the outlet basis; the target stays on the site / location basis and in the Overall Performance scorecard.
