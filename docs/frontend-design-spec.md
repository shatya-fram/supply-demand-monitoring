# Frontend Design Spec: Inner Jakarta Supply & Demand Monitoring

**Date:** 12 October 2026
**Status:** Draft v0.1, prototype with **illustrative data**
**Source:** `Brand Guide/Inner Jakarta Brand Guide.pdf` (Brand & Frontend Guide v2.0, 4 Oct 2026)
**Prototype:** `website/` (open `website/index.html` in a browser; no build step)

---

## 1. What was built

A standard multi-view website, plain HTML, CSS and JavaScript, no framework and no server needed.

| File | Purpose |
|---|---|
| `website/index.html` | Page shell: sidebar, header band, filter bar, scope line, content |
| `website/tokens.css` | Brand tokens from the guide (colours, ramps, type, spacing, rules) |
| `website/styles.css` | Components built only from `var(--ij-*)` tokens |
| `website/app.js` | Views, cascading filters, aggregation, number formatting |

All numbers are generated, seeded and **illustrative**. They are labelled as such on every screen and must be replaced by the OneDrive feed. Territory names are plausible placeholders, not the real hierarchy.

## 2. Views

| View | Contents |
|---|---|
| Morning Sales Brief | Period toggle (MTD vs LMTD, Full month, YTD); four KPI cards (Revenue, Demand, Stock In, Stock on market with days of cover); top-down table by branch/kab-kota/kecamatan; detail on row click; separate Growing and Declining tables |
| Leaders Territory Analysis | Revenue bars (ink, selected unit red) plus table with share, growth, sites and revenue per site; detail on row click |
| Supply vs Demand | Level toggle (Kecamatan, Site, DSE); KPIs for Stock In, Demand, Supply − Demand gap and Stock on market; paired bars; table with days of cover and status band |
| Data & Mappings | Real folder inventory of `99_RAW_DATA` and status of the three mapping catalogues (not yet available) |

## 3. Brand rules applied

| Guide rule | Implementation |
|---|---|
| Flat, ruled, ink first (p.3) | 2px ink rules on every card and band, `border-radius: 0`, no shadows or gradients |
| Ink first, red for signal (p.3) | Red used only for the primary button, scope line, selected row mark, selected bar, and decline text. Active nav and active toggle invert to white on ink |
| Numbers lead (p.3) | KPI value 800 / 23px is the largest element on a card; label is a small uppercase caption; one-line note below |
| Same anatomy everywhere (p.8) | Header band, filter bar (Area → Branch → Kab/Kota → Kecamatan, instant), scope line in red, KPIs, primary view, detail |
| Core palette (p.4) | `--ij-ink #201E1D`, `--ij-ground #F3F2F2`, `--ij-surface #FFFFFF`, `--ij-accent #EC3013`, `--ij-accent-deep #B3210D` for red text |
| Movement colours (p.5) | Up `#1F6B3A`, slight `#5AA06F`, flat `#8A857F`, down `#B3210D`; yellow `#E8B40A` used as a fill swatch only |
| Typography (p.6) | Archivo 400–800 from Google Fonts, fallback Arial; page title 800 / 15px caps, section label 700 / 8.5px, table header 700 / 8px, cell 500 / 10.5px, note 400 / 9.5px |
| Grid and spacing (p.7) | Sidebar 224px, content padding 18px 24px, gap 14px, card padding 12px 14px |
| Tables (p.10) | Sorted by revenue contribution, current period bold, prior muted, selected row red 3px left mark plus `#FDEEEB` wash, growth and decline in separate tables |
| Charts (p.10) | Ink bars, one red highlight, values labelled directly, no gridlines or legends |
| Number formatting (p.11) | English units: `Rp 412.6 B`, `Rp 1.24 T`, `Rp 86 M`, `2.32 M`, `48,312`, signed percentages with a true minus, em dash for no data |
| Buttons (p.9) | One red primary per screen (Export brief on the Morning Brief); hover accent 600; focus is a 2px red outline |

The number formatter was run against the guide's own examples and returns the expected strings.

## 4. Deviations and decisions needed

1. **Brand kit files missing.** The guide references `export/brand-kit/tokens.css`, `tokens.json` and `ppt-theme.xml`. They are not in the folder, so `tokens.css` was rebuilt from the values printed in the guide. Replace with the official file if it exists.
2. **Offline app not used as a reference.** `Inner Jakarta Complete App (offline) 27 Sept.html` is a packed bundle (about 9 MB) that unpacks itself in a browser; its source was not read. The PDF guide was the reference. Compare the prototype side by side with the live app for visual differences.
3. **Contrast cautions in the guide's own colours.** Slight-growth green `#5AA06F` is about 3.1:1 on white and the label grey `#8A857F` about 3.7:1, both below 4.5:1 for small text. The build follows the guide; consider a darker value for slight growth or a pairing with the sign (+) so colour is never the only cue. Signs are always shown.
4. **Top 15 tables.** The guide specifies 15 each for growth and decline; the prototype uses `min(15, half the rows)` because only 26 placeholder kecamatan exist.
5. **Stock-cover status bands** (under 4 days risk, under 7 watch, over 21 overstock) are placeholders **[TBC]** until Operations agrees the thresholds.
6. **Language.** The app uses English units. Bahasa Indonesia units (`Rp 412,6 M`, `Jt`, dot thousands) are defined in the guide but not implemented; one locale per report.
7. **Font loading.** Archivo loads from Google Fonts, so a fully offline or locked-down network falls back to Arial. Self-host the font files if the app must work offline.
8. **Level of detail.** Site and DSE rows are generated sub-units with anonymous IDs (`SITE-01-03`, `DSE-01-02`). Real DSE and outlet data must respect internal data-protection rules.

## 5. Connecting real data (later phases)

`app.js` builds data in one function, `buildData()`. Replace it with a loader that returns the same row shape per kecamatan (`area, branch, kota, kec, sites, rev, revL, demand, demandL, sin, sinL, mkt`) plus site and DSE children. Field meanings to confirm before wiring **[TBC]**:

| Field | Meaning | Open question |
|---|---|---|
| `rev` / `revL` | Revenue current / prior period | Which source file and column |
| `demand` / `demandL` | Customer demand (sell-out proxy) | Transactions, activations or orders |
| `sin` / `sinL` | Stock In (supply) | Likely `MOBII_SELLIN_SP_VC` or a distribution source |
| `mkt` | Stock on market | Reported stock or opening + in − sales |

## 6. Not yet done

- Visual check across browsers and phone widths (logic was tested under Node: every view renders for all filter, period and level combinations without invalid values; layout has not been inspected on screen).
- Accessibility audit with a screen reader.
- Real authentication, upload, validation and mapping management (Phase 2 of the delivery plan).
- PowerPoint theme (`ppt-theme.xml`) for the morning brief deck.
