# Design system — state of play

What exists in `src/design/`, what does not, and what still has to be swapped
over. Newest decisions at the bottom of each section.

The rules this system implements are not invented here — they are written down
in [`docs/participant-styling.md`](../../docs/participant-styling.md): three
colour roles, underlined text buttons, flat square controls, no radius or
shadow, literal colours only for diagnostics. When a primitive and that document
disagree, the document wins and the primitive is the bug.

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

## Built

### Foundations

- [x] **`tokens.ts`** — `cx()`, `FOCUS_RING`, `FIELD` / `FIELD_SELECT`, the four
      tones (`neutral` / `strong` / `warning` / `danger`) as text and border
      classes, and the three sizes actually in use (`xs` = 11px, `sm`, `base`).

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

Typechecks and lints clean. **Nothing in the app imports them yet** — that is
the next phase, deliberately not started.

---

## Not built yet

### Foundations

- [ ] **Decide whether `warning` and `danger` join the theme contract.** Today
      they are literal amber and red, reserved for diagnostics. `ProjectTheme`
      has exactly three colours plus a font key, so adding a semantic accent is
      a schema change, not a CSS change. Current answer: keep them literal.
- [ ] **Resolve the radius contradiction.** `docs/participant-styling.md` says
      no radius; `rounded` appears on 18 admin elements, plus 2 `rounded-full`
      on the console's avatar swatch (a dot, arguably exempt). Either the
      document gains an exception for admin panels, or the
      panels lose the class. The new `Badge` sides with the document and is
      square.
- [ ] **Retire `src/lib/theme.ts`.** It still exports `VOID_COLOR`,
      `PAPER_COLOR` and `DIM_COLOR` as hardcoded hex — the pre-tenant palette.
      Anything reading it is frozen on Nowadays brown. Check each caller, then
      delete.
- [ ] **No contrast check.** A tenant can pick `dim` and `void` too close to
      read. Already logged as a known gap in `docs/participant-styling.md`; a
      warning on the palette form is the fix.
- [ ] **Motion tokens.** Nothing animates today beyond `transition-opacity`. Not
      needed until something does.
- [ ] **Icons.** There are none in the codebase. Not needed yet; if they arrive
      they must be currentColor so they follow the palette.

### Primitives

- [ ] **`field.tsx`** — the text input. The most-repeated string in the app
      (`term-input border-b border-paper/20`, ~12 sites) plus the
      label + hint + error wrapper that `builder.tsx`, `form.tsx` and
      `copy-form.tsx` each re-declare locally. `FIELD` in `tokens.ts` is the
      placeholder. **Highest-value next primitive.**
- [ ] **`textarea.tsx`** — one site today (`builder.tsx`, the JSON box).
- [ ] **`file-input.tsx`** — two sites in `visual/section.tsx`, with the
      `file:` pseudo-class styling duplicated between them.
- [ ] **`color-input.tsx`** — the swatch in `participant-frontend/form.tsx`.
      Central, since it *is* the tenant theming UI.
- [ ] **`rule.tsx`** — `.term-rule` exists in `globals.css` and is currently
      used by nothing, having gone with the deleted `terminal.tsx`. Either give
      it a component or drop the CSS.
- [ ] **`spinner.tsx`** — no spinner exists; loading is the word `saving…`.
      Possibly correct as-is.

### Composites

None built. In rough order of how often the pattern repeats:

- [ ] **`panel.tsx`** — `rounded border border-paper/20 p-3`, ~8 sites, plus
      `danger` (`border-red-500/40`) and `warning` (`border-amber-500/40`)
      variants that appear 6 more times.
- [ ] **`alert.tsx`** — the `role="alert"` error paragraph, repeated in
      every form (`text-xs text-red-400`), plus the saved/info variants.
- [ ] **`page-header.tsx`** — `nav.tsx` is already most of this.
- [ ] **`section-nav.tsx`** — the five project sections; `nav.tsx` owns it.
- [ ] **`bucket-row.tsx`** — the readiness row on the project overview.
- [ ] **`list-row.tsx`** / **`member-row.tsx`** — projects list, invitations,
      members, parameters.
- [ ] **`empty-state.tsx`** — "You are not a member of any project yet."
- [ ] **`modal.tsx`** — no modal exists; destructive actions use inline confirm
      panels instead, which may be the better pattern. Decide before building.
- [ ] **`stepper.tsx`** — the participant `questions → tune → done` flow.
- [ ] **`code-block.tsx`** — `rounded bg-paper/5 p-3 text-[10px]`, 4 sites.
- [ ] **`form-actions.tsx`** — the submit-plus-saved-state footer, repeated
      verbatim in five forms.

### Harness

- [ ] **A blank page to see and poke the primitives.** Agreed as the immediate
      next step. `src/app/dev/sketch/` is the precedent for a dev-only route;
      it should render every variant of every primitive in both an admin context
      and under a non-default project palette, since a primitive that only looks
      right in Nowadays brown is not finished.

---

## Adoption — not started

Call-site counts as of 2026-10-01, so the size of each swap is known before it
starts. Totals: **52 buttons, 10 selects, 4 checkboxes, 1 slider, 1 switch.**
No native radio exists anywhere — `Radio` / `RadioGroup` are new capability, not
a replacement.

| Area | Files | Call sites |
|---|---|---|
| Parameters builder | `projects/[slug]/parameters/builder.tsx` | 9 buttons, 4 selects, 3 checkboxes |
| Members | `projects/[slug]/members-section.tsx` | 5 buttons, 2 selects |
| Live console | `projects/[slug]/console/console.tsx` | 5 buttons |
| Participant runtime | `p/[slug]/experience.tsx` | 5 buttons |
| Avatar controls | `components/AvatarControls.tsx` | 3 buttons, 1 slider, 1 switch |
| Database | `database/{danger,provision,section}.tsx` | 8 buttons, 1 select |
| Invitations | `admin/invitations/{page,form,admins-section}.tsx` | 4 buttons, 2 selects |
| Invite / signin | `invite/[token]/*`, `signin/form.tsx` | 4 buttons |
| Style & language | `participant-frontend/{form,copy-form,preview-pane}.tsx` | 4 buttons, 1 select, 1 checkbox |
| Visual | `projects/[slug]/visual/section.tsx` | 2 buttons |
| Overview | `projects/[slug]/{page,settings-form,participation-toggle}.tsx` | 2 buttons |
| Projects list | `projects/page.tsx` | 1 button |
| Board | `projects/[slug]/board/board.tsx` | — (no controls) |

Suggested order, once the test page exists: **`AvatarControls.tsx` first.** It is
the one file that exercises the slider, the switch, the option group and the
multiselect at once, it is covered by the preview on the participant-frontend
page, and it is the file the styling document is strictest about — so it is the
honest test of whether these primitives are actually drop-in.

### Known swap hazards

- **`choice` buttons carry no `text-paper` of their own.** `Button variant="plain"`
  inherits `currentColor` because the participant flow sets colour inline from
  the project theme (`style={{ color: theme.dim }}`). Keep that inline style when
  swapping, or the button loses its colour.
- **`Checkbox` changes the rendering.** Existing checkboxes are unstyled browser
  defaults; the new one is `[ ]` / `[x]` text. That is a deliberate visual
  change, not a regression — the current control ignores the palette entirely.
- **`Switch` with `name` posts a hidden input.** `participation-toggle.tsx` uses
  the opposite pattern (a hidden input holding the *inverse* value plus a submit
  button). Do not blindly swap it; it is a form post, not a controlled switch.
- **`daisyUI` is still a dependency.** `@plugin "daisyui"` sits in
  `globals.css:2` and the unused `.range-hue` rule at line 39 is the only thing
  referencing its variables. Once the primitives are adopted, both can go — but
  check `.range-hue` really has no callers first.
