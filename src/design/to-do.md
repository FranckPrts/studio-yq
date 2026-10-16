# Design system — state of play

What exists in `src/design/`, what does not, and what still has to be swapped
over. Newest decisions at the bottom of each section.

The rules this system implements are not invented here — they are written down
in [`docs/participant-styling.md`](../../docs/participant-styling.md): three
colour roles, underlined text buttons, flat square controls, no radius or
shadow, literal colours only for diagnostics. When a primitive and that document
disagree, the document wins and the primitive is the bug. The same rules, with
tokens and live components, are published as the Studio YQ design system
(https://claude.ai/artifact/RkbSQbGqe9WPti5hNADsbq).

Two constraints that shape every file:

- **No colour values.** The palette is three CSS variables each project
  overrides (`--color-void`, `--color-paper`, `--color-dim`, declared without
  `inline` in `globals.css` for that reason). A primitive holding a hex would
  stop following the tenant.
- **No `"use client"`.** Every primitive is a plain element, so it renders from
  a Server Component as happily as from a Client one — like the `<button>` it
  replaces. Callers passing `onChange` must be Client Components, which was
  already true of the markup being replaced.

---

## Plan — toward a light theme

The default palette is `dark` (renamed from "Nowadays" on 2026-10-14); `light`
is the second studio theme. Phases 1–3 are the path there. Phases 4–5 are housekeeping that does
not block it and can run alongside or after.

### Phase 1 — Reconcile the record *(done 2026-10-14)*

- [x] Rewrite this file against the code: stale items closed or corrected,
      call sites recounted.
- [x] Write `docs/participant-styling.md`. Eight files cited it as the source
      of the rules, but it had never been committed. Written down from those
      citations; no new policy.

### Phase 2 — Groundwork the light theme needs *(done 2026-10-14)*

- [x] **Diagnostic colours are tokens.** Decided: *fixed per theme, never
      tenant-set* (no schema change). `globals.css` declares, by role and
      contrast tier rather than shade: `danger` (was red-400), `danger-strong`
      (red-300), `danger-strongest` (red-200), `danger-line` (red-500, borders
      and tinted fills), `warning` (amber-400), `warning-strong` (amber-200),
      `warning-line` (amber-500), `success` (emerald-400). Values are Tailwind's
      own, so dark is unchanged. All 133 literal uses swapped (34 files,
      opacity modifiers kept: `text-warning/80`, `border-danger-line/40`);
      `TONE` / `TONE_BORDER` follow. A light theme remaps the eight variables.
- [x] **Canvas backdrop follows the palette.** The sandboxed frame's document is
      now transparent, so the iframe's own `bg-void` shows through — the frame
      cannot read the page's variables, so nothing is passed in.
- [x] **Contrast check.** `contrast()`, `contrastIssues()` and
      `MIN_TEXT_CONTRAST` (4.5) in `project-theme.ts`; the palette form lists
      any text role under 4.5:1 on void, advisory — it still saves. **The
      default dark palette trips it** (dim on void 4.3:1), so a project on the
      defaults shows the warning until Phase 3 settles dark's `dim`.
- [x] **daisyUI removed** — the plugin, the dependency and the dead
      `.range-hue`. It had to go now, not later: its `[data-theme="dark"]`
      block declares its own `--color-success` / `--color-warning`, which would
      have outranked the new tokens. What its base supplied is replaced in
      `globals.css` from our palette: `color-scheme: dark`, the root ground and
      text colour, the scrollbar colour. Pages with no `bg-void` of their own
      (home, parameters, preview-frame, `/dev/primitives`) now sit on void
      instead of daisyUI's blue-grey `base-100`. `data-theme="dark"` on
      `<html>` stays, as the hook Phase 3 themes from.
- [x] **Focus bugs fixed.** `Checkbox` / `Radio` glyphs use the new
      `PEER_FOCUS_RING` (`peer-focus-visible:`), drawn from the hidden input.
      `.term-input` moved into `@layer components`, so the `Select` ring shows.
- [x] **Found on the way: every field's hairline was invisible.** Unlayered,
      `.term-input`'s `border: 0` / `width` / `padding` / `background`
      outranked every utility at the call site — the `border-b border-paper/20`
      on 44 of 46 fields, `bg-void` on selects, `w-40`, `w-32`, `p-3`. The same
      layer move fixes all of it, so **fields now show the underline they were
      written with.** A visible change across the admin forms; checked in
      `/dev/primitives` and `/projects`.

### Phase 3 — The light theme *(built 2026-10-14)*

- [x] **"Light" is a studio theme, chosen per person.** `User.studioTheme`
      (`DARK` | `LIGHT`, default `DARK`; migration `…_studio_theme`). Two
      members of one project each keep their own; it is set from `/account`
      (two submit buttons, no JavaScript) and applied as `<html data-theme>` by
      the root layout. Signed-out pages are dark.
- [x] **Participant surfaces never follow it.** `page-shell`, `shut`,
      `experience` and the board set their own `data-theme` from the project's
      `void` (`themeScheme()`, luminance over 0.179 ⇒ light), so a project's
      diagnostics suit its own ground whoever is looking — a light-void
      project now gets readable amber and red for the first time.
- [x] **Values, all ≥ 4.5:1 for text at the opacities the markup uses** (worked
      out in `globals.css` beside each one). Light: void `#f4f1ea`, paper
      `#1d1b18` (15.2:1), dim `#716c62` (4.6:1); danger red-700/800/900,
      warning amber-900/950, success emerald-700 (4.8:1; `text-success` is
      always used at full opacity so it can be this bright); `-line` red-600 / amber-700.
- [x] **Dark's `dim` fixed:** `#7f776b` (4.3:1) → `#857d71` (4.7:1), in
      `globals.css` and `DEFAULT_THEME`. Projects that already saved the old
      value keep it, and see the contrast warning on their palette form.
- [x] `STUDIO_PALETTES` in `project-theme.ts` mirrors both blocks for code that
      needs the values; `/dev/primitives` uses it for its `dark` / `light`
      presets and sets the matching `data-theme` on its project panel.
- [x] The Studio YQ design system has both themes, the per-theme diagnostic
      tokens under the code's names, and the dim fix. Its cover is drawn from
      tokens, so it follows the theme on its own.
- [ ] **Verify in the browser** once the dev server restarts (it still holds
      the Prisma client from before the migration): `/account` switch, a light
      studio page, a participant page while signed in on light.

### Phase 4 — Missing primitives

Backlog below. `field.tsx` first; decide radius before `panel.tsx`.

### Phase 5 — Adoption

The table at the bottom, `AvatarControls.tsx` first.

### Open decisions

- [x] **What "light" covers.** The studio interface, per person — not a
      project preset. Decided 2026-10-14.
- [x] **Diagnostic colours: "literal" → "fixed per theme, never tenant-set".**
      Agreed 2026-10-14; `ProjectTheme` stays three colours plus a font.
- [x] **Dark's `dim`.** Nudged to `#857d71` (4.7:1). Decided 2026-10-14.
- [ ] **Radius.** `docs/participant-styling.md` says none; `rounded` appears 29
      times across 11 app files (panels, outline buttons, code blocks; 3 more
      in the `/dev/sketch` harness), plus 4
      `rounded-full` (the beacon dot, the console's avatar swatch — dots,
      arguably exempt). Either the document gains an admin exception or the
      panels go square. `Badge` already sides with the document.

---

## Built

### Foundations

- [x] **`tokens.ts`** — `cx()`, `FOCUS_RING`, `FIELD` / `FIELD_SELECT`, the four
      tones (`neutral` / `strong` / `warning` / `danger`) as text and border
      classes, and the three sizes actually in use (`xs` = 11px, `sm`, `base`).
- [x] **`src/lib/theme.ts` retired.** The hardcoded `VOID_COLOR` /
      `PAPER_COLOR` / `DIM_COLOR` are gone; the palette lives in
      `src/lib/theme/project-theme.ts` (`ProjectTheme`, `DEFAULT_THEME`,
      `themeCssVars()`).

### Primitives

- [x] **`button.tsx`** — `Button`, `ButtonLink`, `buttonClass()`,
      `choiceClass()`. Five variants, all read off the existing markup rather
      than invented: `action` (the forward submit), `plain` (caller owns the
      colour — the participant flow sets it inline from the theme), `quiet`,
      `danger`, `choice`. `pending` disables on its own so call sites stop
      writing `disabled={pending || …}`.
- [x] **`select.tsx`** — `Select` (native `<select>`), `selectClass()`,
      `optionsFrom()` for the `as const` lookups in `src/lib`.
- [x] **`checkbox.tsx`** — `Checkbox` (`[ ]` / `[x]`), `MultiOptionGroup` (the
      text-button multiselect, with `maxSelected` locking the unchosen only).
- [x] **`radio.tsx`** — `Radio` (`( )` / `(o)`), `RadioGroup`, `OptionGroup`
      (the text-button segmented select; a radio group semantically, which is
      why it lives here and not next to the dropdown).
- [x] **`toggle.tsx`** — `Switch` (`on` / `off`, `role="switch"`), `SwitchRow`
      (`label : on`). `name` mirrors the state into a hidden input so a
      controlled switch can sit in a server-action form.
- [x] **`slider.tsx`** — `Slider` over `.term-range`, with `track` for hue ramps
      and `brackets` for the `| … |` row.
- [x] **`badge.tsx`** — `Badge`, `ReadyBadge`, `badgeClass()`. `bare` (coloured
      text, the default, which is what the pages already do) and `outlined`
      (square hairline box).
- [x] **`index.ts`** — one import path, `@/design`.

### Harness

- [x] **`/dev/primitives`** — every variant of every primitive, once in the
      admin context and once under a project palette and typeface switchable on
      the page (presets `dark`, `light`, `ocean`, `low contrast`).

Typechecks and lints clean. **Adoption has barely started** — the only import
of `@/design` outside the harness is `cx` in `(studio)/sidebar.tsx`.

---

## Backlog

### Foundations

- [ ] **Motion tokens.** Nothing animates beyond `transition-opacity` (2 sites)
      and the `beacon` pulse. Not needed until something does.
- [ ] **Icons.** None in the codebase (the one `<svg>`, in
      `board/score-histogram.tsx`, is a chart). If they arrive they must be
      `currentColor` so they follow the palette.

### Primitives

- [ ] **`field.tsx`** — the text input. The most-repeated string in the app:
      `term-input` appears 46 times across 21 files, nearly always with
      `border-b border-paper/20`, plus the label + hint + error wrapper that
      several forms re-declare locally. `FIELD` in `tokens.ts` is the
      placeholder. **Highest-value next primitive.**
- [ ] **`textarea.tsx`** — 5 sites: `visual/builder.tsx` ×2,
      `report/email/email-editor.tsx`, `participant-frontend/text-form.tsx`,
      `console/console.tsx`.
- [ ] **`file-input.tsx`** — 4 sites: `visual/section.tsx` ×2,
      `report/mini-avatar/{upload-section,mini-preview}.tsx`, with the `file:`
      pseudo-class styling duplicated between them.
- [ ] **`color-input.tsx`** — the swatch in
      `participant-frontend/palette-form.tsx`. Central, since it *is* the tenant
      theming UI.
- [ ] **`rule.tsx`** — `.term-rule` is used in 10 places, always as
      `<div aria-hidden className="term-rule text-dim/40" />` (board, board-row,
      experience, results, conclusion). A one-line component removes the
      repetition.
- [ ] **`spinner.tsx`** — no spinner exists; loading is the word `saving…`.
      Possibly correct as-is.

### Composites

None built. In rough order of how often the pattern repeats:

- [ ] **`alert.tsx`** — the `role="alert"` paragraph, 32 sites
      (`text-xs text-red-400` and its saved/info variants).
- [ ] **`panel.tsx`** — `rounded border …` boxes, 24 sites: neutral
      (`border-paper/20 p-3`), `danger` (`border-red-500/40`) and `warning`
      (`border-amber-500/40`). Waits on the radius decision.
- [ ] **`code-block.tsx`** — `bg-paper/5`, 7 sites.
- [ ] **`form-actions.tsx`** — the submit-plus-saved-state footer repeated across
      the admin forms.
- [ ] **`page-header.tsx`** — `nav.tsx` is already most of this.
- [ ] **`section-nav.tsx`** — the project sections; `(studio)/sidebar.tsx` owns
      it now.
- [ ] **`bucket-row.tsx`** — the readiness row on the project overview.
- [ ] **`list-row.tsx`** / **`member-row.tsx`** — projects list, invitations,
      members, parameters.
- [ ] **`empty-state.tsx`** — "You are not a member of any project yet."
- [ ] **`modal.tsx`** — no modal exists; destructive actions use inline confirm
      panels instead, which may be the better pattern. Decide before building.
- [ ] **`stepper.tsx`** — the participant `questions → tune → done` flow.

---

## Adoption — not started

Call-site counts as of 2026-10-14 (`<button>`, `<select>`, checkbox inputs,
range inputs, `role="switch"`), so the size of each swap is known before it
starts. Totals: **107 buttons, 10 selects, 9 checkboxes, 1 slider, 1 switch.**
No native radio exists anywhere — `Radio` / `RadioGroup` are new capability,
not a replacement. Up from 52 buttons / 4 checkboxes on 2026-10-01, mostly the
report section.

Paths under `src/app/`; `(studio)` is `projects/[slug]/(studio)/`.

| Area | Files | Call sites |
|---|---|---|
| Visual builder | `(studio)/visual/builder.tsx` | 9 buttons, 4 selects, 5 checkboxes |
| Visual upload | `(studio)/visual/section.tsx` | 2 buttons |
| Report · send | `(studio)/report/send/{page,send-console}.tsx` | 13 buttons, 3 checkboxes |
| Report · email | `(studio)/report/email/{email-editor,email-preview}.tsx` | 12 buttons |
| Report · mini-avatar | `(studio)/report/mini-avatar/{upload-section,mini-preview}.tsx` | 9 buttons |
| Report · map | `(studio)/report/{map/map-view,use-report-room}.tsx` | 3 buttons |
| Members | `(studio)/members-section.tsx` | 5 buttons, 2 selects |
| Database | `(studio)/database/{danger-section,provision-section,section}.tsx` | 8 buttons, 1 select |
| Style & language | `(studio)/participant-frontend/{palette-form,text-form,preview-pane}.tsx` | 5 buttons, 1 select, 1 checkbox |
| Overview | `(studio)/{settings-form,participation-toggle,conclusion-toggle}.tsx` | 4 buttons |
| Live console | `projects/[slug]/console/console.tsx` | 13 buttons |
| Board | `projects/[slug]/board/board.tsx` | 1 button |
| Projects list | `projects/page.tsx` | 1 button |
| Participant runtime | `p/[slug]/{experience,nav}.tsx` | 10 buttons |
| Avatar controls | `src/components/AvatarControls.tsx` | 3 buttons, 1 slider, 1 switch |
| Invitations | `admin/invitations/{page,form,admins-section}.tsx` | 4 buttons, 2 selects |
| Invite / sign-in / account | `invite/[token]/{page,form,join-form}.tsx`, `signin/form.tsx`, `account/form.tsx` | 5 buttons |

Suggested order: **`AvatarControls.tsx` first.** It is the one file that
exercises the slider, the switch, the option group and the multiselect at once,
it is covered by the preview on the participant-frontend page, and it is the
file the styling document is strictest about — so it is the honest test of
whether these primitives are actually drop-in.

### Known swap hazards

- **`choice` buttons carry no `text-paper` of their own.** `Button variant="plain"`
  inherits `currentColor` because the participant flow sets colour inline from
  the project theme (`style={{ color: theme.dim }}`). Keep that inline style when
  swapping, or the button loses its colour.
- **`Checkbox` changes the rendering.** Existing checkboxes are unstyled browser
  defaults; the new one is `[ ]` / `[x]` text. That is a deliberate visual
  change, not a regression — the current control ignores the palette entirely.
- **`Switch` with `name` posts a hidden input.** `participation-toggle.tsx` and
  `conclusion-toggle.tsx` use the opposite pattern — a hidden input
  holding the *inverse* value plus a submit button. Do not blindly swap it; it
  is a form post, not a controlled switch.
