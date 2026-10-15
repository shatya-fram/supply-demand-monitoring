# Accessibility & Design-System Review · Inner Jakarta Supply & Demand Monitoring

**Standard:** WCAG 2.1 AA · **Reference:** Inner Jakarta Brand & Frontend Guide v2.0 (`docs/frontend-design-spec.md`, `website/tokens.css`) · **Date:** 14 Oct 2026
**Scope:** `website/index.html`, `website/app.js`, `website/styles.css`, `website/tokens.css`; all 12 views, every toggle, tab, dynamic filter, select and heatmap. Method: static review of markup and styles, WCAG contrast computation on the token pairs in use, and an automated click sweep in the running app that opens every tab and presses every distinct control in every view while recording JavaScript errors and empty renders.

---

## 1. Functional sweep: do all toggles and dynamic filters work?

Sweep = for each view: click every non-tab control, then open each tab and click every control inside it; exercise the first two options of every select; press Reset. Controls that download files (CSV export) are skipped.

| View | Tabs opened | Controls clicked | Selects exercised | JS errors | Empty render |
|---|---:|---:|---:|---:|---:|
| Overall Performance SA/MC (`mb_overall`) | 0 | 23 | 10 | 0 | 0 |
| Ringkasan Performance (`mb_ringkasan`) | 0 | 15 | 6 | 0 | 0 |
| PJP Visit (`mb_pjp`) | 7 | 186 | 8 | 0 | 0 |
| Penjualan ke Outlet (`mb_penjualan`) | 7 | 82 | 6 | 0 | 0 |
| Opportunity (`mb_opportunity`) | 0 | 0 (placeholder) | 6 | 0 | 0 |
| Brief Penjualan Pagi (`brief`) | 0 | 10 | 6 | 0 | 0 |
| Analisis Teritori Pimpinan (`terr`) | 0 | 7 | 6 | 0 | 0 |
| Supply vs Demand (`svd`) | 0 | 3 | 6 | 0 | 0 |
| Kunjungan DSE & PJP (`visits`) | 8 | 174 | 6 | 0 | 0 |
| Monitoring Sell-In (`sellin`) | 11 | 311 | 6 | 0 | 0 |
| Manajemen Teritori (`territory`) | 7 | 207 | 6 | 0 | 0 |
| Peta Inner Jakarta (`map`) | 0 | 1 | 10 | 0 | 0 |
| Data & Pemetaan (`data`) | 0 | 0 | 6 | 0 | 0 |
| **Total** | **47** | **1,019** | **88** | **0** | **0** |

Result after the fixes below: every tab, toggle, dynamic filter, drill button, pager and select in all 13 views re-rendered without a JavaScript error or an empty view. The first run of the same sweep (before the fixes) produced 170 errors, all from the stale-map defect described next.

**Defect found and fixed (before the final sweep):** after leaving a view that had mounted a Leaflet map (Map Site, Peta Inner Jakarta, Ringkasan Performance map), the map instance stayed alive while its container had been removed by the next render. Its canvas renderer kept redrawing on a detached canvas and threw `Cannot read properties of undefined (reading 'save')` / `_leaflet_pos` on every later click anywhere in the app (dozens of errors per click in the first sweep). Fix: `cleanupStaleMaps()` runs at the start of every `render()` and again right after the view HTML is replaced; it stops and removes any of the three map instances (`_jakartaMapInstance`, `_inactMapInstance`, `_mbMapInstance`) whose container is no longer in the document, and the canvas triangle renderer skips drawing when its context is gone. The final sweep shows zero errors, so this is closed.

## 2. Accessibility findings

### Perceivable
| # | Issue | WCAG | Severity | Status |
|---|---|---|---|---|
| P1 | Label colour token `--ij-label` (#8A857F) on white is 3.66:1; it was used for table headers (13 px bold), KPI labels and detail labels, all below 18.7 px bold, so 4.5:1 applies. | 1.4.3 Contrast | 🔴 Critical | **Fixed**: text that used `--ij-label` now uses `--ij-muted` (#6B6764, 5.60:1). `--ij-label` remains for rules and decoration. Brand decision to confirm. |
| P2 | Heatmap cells switched to white text on mid-green (`rgba(22,163,74,0.67)` ≈ #63C286): 2.2:1. Same in the Site-detail slab cells (white on 60 % red/orange). | 1.4.3 | 🔴 Critical | **Fixed**: dark text always; green alpha capped at 0.72 (PJP) / 0.70 (Penjualan); slab-cell alpha capped at 0.35 with the slab's dark foreground. Cells under 30 % keep red-on-pink 6.8:1. |
| P3 | Accent as body-size text (`--ij-accent` #EC3013 on white 4.20:1) in deltas/notes; white on the primary (red) button 4.20:1. Large/bold ≥ 18.7 px passes; smaller fails. | 1.4.3 | 🟡 Major | Open. Spec already provides `--ij-accent-deep` (#B3210D, 6.69:1) for red text; the `.scope` line uses it. Recommend: use `--ij-accent-deep` for any red text under 18.7 px and keep `--ij-accent` for fills and rules. |
| P4 | `--ij-up-soft` (#5AA06F, 3.14:1) and `--ij-watch` (#E8B40A, 1.92:1) as text. `up-soft` is applied to small delta text in the illustrative views; `watch` is used only as a swatch fill (OK). | 1.4.3 | 🟡 Major | Open (illustrative views, Step 5 will replace them). Recommend `--ij-up` for text, keep `up-soft` for fills. |
| P5 | Colour is not the only carrier of meaning: heat cells show the percentage and count, slab cells the count, status chips carry text, map markers have tooltips and tables duplicate the map. | 1.4.1 | ✅ Pass | — |
| P6 | `<html lang="en">` while navigation and the Morning DSE Briefing are Indonesian. | 3.1.1 | 🟢 Minor | **Fixed**: `lang="id"`. The English Monitoring views are now marked as Indonesian; acceptable short-term, mark English sections with `lang="en"` if screen-reader users need it. |

### Operable
| # | Issue | WCAG | Severity | Status |
|---|---|---|---|---|
| O1 | Clickable table rows (`tr[tabindex="0"]`) only reacted to Enter/Space for two of the seven row types (`data-key`, `data-unvis-sel`); site, never-visited-group and other rows needed a mouse. | 2.1.1 Keyboard | 🟡 Major | **Fixed**: the key handler accepts any `tr[tabindex]`. |
| O2 | `.map-select` set `outline: none` and only recoloured the border on focus, so keyboard focus on every dropdown and search box in the toolbars was barely visible. | 2.4.7 Focus visible | 🟡 Major | **Fixed**: `:focus-visible` outline (2 px accent, offset 2 px) restored; global rule already covered buttons and links. |
| O3 | Touch targets: toolbar toggles are ~30 × 60 px, table buttons ~26 px high, pagination buttons similar. Below the 44 px AAA target; meets the 24 px AA (WCAG 2.2) minimum. | 2.5.5 | 🟢 Minor | Open. Desktop briefing tool; raise `.map-btn` / `.btn` padding to 8 px 14 px if field use on tablets is planned. |
| O4 | Leaflet canvas markers (site triangles, outlet circles) are not focusable; the same data is available in the ranked site table and the per-site outlet table under the map, with the same Google Maps links. | 2.1.1 | ✅ Pass (equivalent provided) | — |
| O5 | Focus order follows DOM order: filter bar → tabs → toolbar → tables. Re-render after each click replaces `#view`, so focus returns to `body`; search inputs restore focus and caret explicitly. | 2.4.3 | 🟢 Minor | Open. Consider restoring focus to the clicked control's replacement after render (match by data attributes). |

### Understandable
| # | Issue | WCAG | Severity | Status |
|---|---|---|---|---|
| U1 | Six search inputs had only a placeholder (with an emoji) as their name. | 3.3.2 Labels | 🟡 Major | **Fixed**: `aria-label` on all six. |
| U2 | Filter-bar selects are wrapped in `<label>` with visible text (Branch, Head of Area, Micro Cluster): named correctly. In-view selects (DSE pickers, product picker) are preceded by a visible `map-label` but not programmatically associated. | 3.3.2 | 🟢 Minor | Open: add `aria-label` to `#pjSlabProdSelect` and the briefing DSE select. |
| U3 | The slab/visit windows are nested ("no visit in last 3 days" ⊇ "last 7 days" ⊇ "MTD"); users read "3 days" as the smallest group. | 3.1.3 Unusual words | 🟡 Major (comprehension) | Open: see section 4; relabel as "≥ 3 hari tanpa visit (09–11 Okt)" or show exclusive bands. |

### Robust
| # | Issue | WCAG | Severity | Status |
|---|---|---|---|---|
| R1 | Tabs: buttons carry `role="tab"` + `aria-selected` inside `role="tablist"` containers; no `aria-controls`/`tabpanel` ids. Toolbar toggles are plain buttons whose state is only the `.active` class. | 4.1.2 Name, role, value | 🟡 Major | Open: add `aria-pressed="true|false"` to `.map-btn` toggles and `aria-controls` on tabs. |
| R2 | Icon-only button "📍" (jump to map) had no accessible name. | 4.1.2 | 🟡 Major | **Fixed**: `aria-label` + `title` "Lihat di peta". |
| R3 | Live region: `#scope` is `aria-live="polite"` so filter changes are announced; KPI changes are not. | 4.1.3 | 🟢 Minor | Open. |

### Colour contrast check (token pairs in use)
| Element | Foreground | Background | Ratio | Required | Pass |
|---|---|---|---:|---:|---|
| Body / table text | #201E1D | #FFFFFF | 16.60 | 4.5 | ✅ |
| Secondary text `--ij-ink-2` | #4A4644 | #FFFFFF | 9.33 | 4.5 | ✅ |
| Muted / notes `--ij-muted` | #6B6764 | #FFFFFF | 5.60 | 4.5 | ✅ |
| Labels `--ij-label` (before fix) | #8A857F | #FFFFFF | 3.66 | 4.5 | ❌ → fixed |
| Labels on page ground | #8A857F | #F3F2F2 | 3.27 | 4.5 | ❌ → fixed |
| Red text `--ij-accent` | #EC3013 | #FFFFFF | 4.20 | 4.5 | ❌ small / ✅ large |
| Red text `--ij-accent-deep` | #B3210D | #FFFFFF | 6.69 | 4.5 | ✅ |
| Primary button text | #FFFFFF | #EC3013 | 4.20 | 4.5 | ❌ small / ✅ 15 px bold border-line |
| Up green text `--ij-up` | #1F6B3A | #FFFFFF | 6.52 | 4.5 | ✅ |
| `--ij-up-soft` as text | #5AA06F | #FFFFFF | 3.14 | 4.5 | ❌ |
| `--ij-watch` as text | #E8B40A | #FFFFFF | 1.92 | 4.5 | ❌ (fill only) |
| good-tag | #166534 | #dcfce7 | 6.49 | 4.5 | ✅ |
| alert-tag | #991b1b | #fee2e2 | 6.80 | 4.5 | ✅ |
| Slab 3–6 d | #92400e | #fef3c7 | 6.37 | 4.5 | ✅ |
| Slab 7–10 d | #9a3412 | #ffedd5 | 6.38 | 4.5 | ✅ |
| Sidebar / active toggle | #FFFFFF | #201E1D | 16.60 | 4.5 | ✅ |
| Heat cell ≥ 70 % (before fix) | #FFFFFF | ≈#4FAF6F | 2.73 | 4.5 | ❌ → fixed |
| Heat cell (after fix) | #111111 | ≈#A7DCB9 | 12.21 | 4.5 | ✅ |
| Brand badges IM3 / 3ID / Hybrid | #111111 | #facc15 / #c084fc / #2dd4bf | ≥ 7 | 4.5 | ✅ |
| Progress-bar label | #111111 | #f1f5f9 | 17.24 | 4.5 | ✅ |

### Keyboard navigation (after fixes)
| Element | Tab order | Enter / Space | Escape | Arrows |
|---|---|---|---|---|
| Sidebar nav buttons | 1st | activates view | — | — (native buttons; arrow-key roving not implemented) |
| Filter selects | after nav | native | native | native |
| Sub-nav tabs (`role="tab"`) | DOM order | activates | — | not implemented (Minor) |
| Toolbar toggles (`.map-btn`) | DOM order | activates | — | — |
| Clickable rows (`tr[tabindex]`) | DOM order | activates (fixed) | — | — |
| Search inputs | DOM order | types, re-renders, caret restored | — | — |
| Leaflet map | zoom buttons focusable | native | — | native pan |

## 3. Design-system audit

**Score: 72 / 100.** Tokens are well defined and used for layout and colour in `styles.css` (241 token references versus 55 raw hex values, most of them in the visits/sales badge and tag block). The main debt is in `app.js`: 365 inline `style="…"` fragments and 152 raw hex colours, nine distinct font sizes (10–18 px) and a three-way split of button styles.

| Category | Defined in tokens | Hardcoded found | Note |
|---|---|---|---|
| Colours | 42 (`--ij-*` palette, movement, ramps) | 55 hex in `styles.css`, 152 in `app.js` | Heat greens `#16a34a`, tag colours, slab palette, badge yellows/purples are Tailwind-style literals outside the brand ramps. |
| Spacing | 6 steps (`--ij-space-1…6`) + card/pad | arbitrary 5–30 px inline | Inline paddings on buttons (`5px 9px`, `6px 12px`) and margins. |
| Typography | one family, weights 400–800 | 9 sizes inline (10, 11, 11.5, 12, 12.5, 13, 14, 14.5, 15 px) | No type scale tokens; smallest live text 10 px (heat sub-counts, slab percentages). |
| Radius / rules | `--ij-radius: 0`, `--ij-rule-w: 2px` | `border-radius: 2px` on brand badges; 1 px borders on `.map-btn` | Two button border weights (1 px map-btn vs 2 px btn / sub-nav). |

| Component | States | Variants | Docs | Score | Notes |
|---|---|---|---|---|---|
| Button `.btn` | hover ✅ focus ✅ disabled ⚠️ (inline opacity) | primary ✅ small ⚠️ (`.btn-sm` uses `!important`) | ⚠️ | 7/10 | |
| Toggle `.map-btn` | hover ✅ active ✅ focus ✅ | accent ✅ | ❌ | 6/10 | 1 px border and 14.5 px/800 differ from `.btn` (2 px, 15 px/700); no `aria-pressed`. |
| Tab `.sub-nav button` | hover ✅ active ✅ | — | ❌ | 6/10 | Same visual as `.map-btn.active`; roles present. |
| Nav `.nav button` | hover ✅ current ✅ | sub ✅ | ✅ (spec) | 9/10 | Active state inverts, never red: matches guide. |
| KPI card | — | up/down/flat via class | ✅ | 8/10 | Delta colour fails when `up-soft`. |
| Table `.tbl` | hover ✅ sel ✅ | num/cur/prior | ✅ | 8/10 | Header colour fixed to muted. |
| Tags / badges | — | good/alert/slab, IM3/3ID/hybrid | ❌ | 6/10 | Palette outside tokens; 2 px radius vs radius 0 rule. |
| Heatmap cell | — | ratio / value / binary | ⚠️ | 7/10 | Inline styles; colours now contrast-safe. |
| Select / search | focus ✅ (fixed) | `.map-select`, `.search-input`, `.field select` | ❌ | 6/10 | Three input styles; unify on one. |
| Leaflet map | — | 2 base-map sets | ⚠️ | 7/10 | Layers icon drawn inline; marker colours outside tokens. |

### Naming consistency
| Issue | Where | Recommendation |
|---|---|---|
| Three button families (`.btn`, `.map-btn`, `.sub-nav button`, plus `.toggle button`) with different border weights and type | all views | Collapse to `.btn` (action) and `.btn.toggle[aria-pressed]` (toggle) with one 2 px border and one type size (14.5 px/700). |
| Semantic tags use Tailwind colours (`#dcfce7`, `#fee2e2`, `#facc15`, `#c084fc`, `#2dd4bf`) | visits/sales | Add brand-ramp tokens: `--ij-ok-bg/--ij-ok-fg`, `--ij-alert-bg/--ij-alert-fg`, `--ij-im3`, `--ij-3id`, `--ij-hybrid`, and the four slab colours. |
| Mixed language in one view (English Monitoring views, Indonesian briefing) | nav, views | Decide one UI language per view; the nav is now Indonesian. |

### Priority actions
1. **Token the semantic palette** (tags, badges, slabs, heat green) and move the 152 inline hex values in `app.js` onto them: one place to fix contrast, consistent with the brand ramps.
2. **One toggle component** with `aria-pressed`, 2 px border and a single type size, replacing `.map-btn` / `.sub-nav button` / `.toggle button`.
3. **Red text rule**: `--ij-accent-deep` for any red text under 18.7 px; `--ij-accent` for fills, rules and the primary button only (raise button text to 15 px bold or darken the fill to `--ij-accent-600` for 4.5:1).
4. Add `aria-label` to in-view selects and `aria-controls` to tabs; restore focus after re-render.

## 4. Why "no visit in the last 3 days" is larger than "7 days" and "MTD"

The three windows are **nested, not exclusive**. For every master outlet the feed keeps the date of its last completed check-in. The columns are:

| Column | Definition | Set relation |
|---|---|---|
| MTD (belum pernah) | no completed check-in on any day 01–11 Oct | smallest |
| 7 hari | no completed check-in 05–11 Oct (last check-in on or before 04 Oct, or never) | ⊇ MTD |
| 3 hari | no completed check-in 09–11 Oct (last check-in on or before 08 Oct, or never) | ⊇ 7 hari |

"Not visited in the last 3 days" is the *weakest* condition: an outlet visited on 06 Oct satisfies it, but not the 7-day or MTD condition. So 8,035 ≥ 4,441 ≥ 4,226 is the correct ordering. For sites the same logic applies to "no outlet under the site visited in the window" (1,676 ≥ 768 ≥ 720). The inactivity slabs in Site detail use the **exclusive** bands instead (Active ≤ 2 d, 3–6 d, 7–10 d, Never), which is why they sum to the outlet base. Recommended relabel for the nested columns: "≥ 3 hari tanpa visit (09–11 Okt)", "≥ 7 hari tanpa visit (05–11 Okt)", "Belum pernah MTD (01–11 Okt)".

## 5. Files changed by this review
- `website/app.js`: `cleanupStaleMaps()` in `render()`; keyboard activation for all `tr[tabindex]`; `aria-label` on six search inputs and the 📍 button; heat-cell and slab-cell text contrast.
- `website/styles.css`: `.map-select` focus ring; `--ij-label` text → `--ij-muted`.
- `website/index.html`: `lang="id"`.
