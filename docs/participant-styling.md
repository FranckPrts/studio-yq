# Participant styling

How studio-yq looks, what a project can change, and what it cannot. The
primitives in `src/design/` implement these rules; when a primitive and this
document disagree, this document wins and the primitive is the bug.

Written down on 2026-10-14 from the rules the code already cited this file for
(`src/design/*.tsx`, `src/lib/theme/project-theme.ts`). Nothing here is new
policy — open questions are marked as such.

The same rules, with tokens and live components, are in the Studio YQ design
system: https://claude.ai/artifact/RkbSQbGqe9WPti5hNADsbq.

## Three colour roles

Every surface is painted from three colours, and nothing else:

| Role | Variable | For |
| --- | --- | --- |
| **void** | `--color-void` | The ground. Page background; a `<select>`'s own background, so the OS-painted option list stays readable. |
| **paper** | `--color-paper` | Body text, and whatever the person is acting on: the forward button, the chosen option, a checked `[x]`, the slider handle, the focus ring. |
| **dim** | `--color-dim` | Structure and quiet text: hints, labels, separators, unchosen options, the slider track. |

Fainter steps are opacities or mixes of these (`bg-surface` for a box,
`text-dim/40` for a locked option, `border-paper/10` for a row divider), never
new colours.

The colour split is meaningful, not decorative. On the slider the track is dim
(structure) and the handle is paper (the thing being moved); in an option row
the chosen one is paper and the rest are dim.

## Studio themes

The studio — every page a team member works in — comes in `dark` and `light`.
Each person picks their own on `/account` (`User.studioTheme`); two people on
one project each keep theirs. It is applied as `<html data-theme>` and changes
the three colours and the diagnostics together, from the `[data-theme]` blocks
in `globals.css`. It never reaches a participant page.

## What a project controls

A project's theme (`ProjectTheme`, stored whole in `Project.theme`) is exactly:

- the three colours above, and
- a typeface key from `FONTS` — a list we host, so licensing and loading stay
  our problem rather than the tenant's.

They are set as CSS variables on the participant page by `themeCssVars()`,
server-rendered so the palette never flickers in. `globals.css` declares the
palette **without** `inline` for this reason: Tailwind utilities compile to
`var(--color-…)`, so a project's values reach everything styled with
`bg-void`, `text-paper` or `text-dim`.

**Consequence for code:** never write a palette colour as a literal. A
component holding a hex stops following the project the moment it ships.

## What a project does not control

- **Diagnostic colours.** Amber means *something needs attention*; red means
  *something is broken*. They are fixed so that no palette can tune the one
  signal that must stay visible into invisibility. They are tokens fixed per
  theme in `globals.css` — `warning`, `danger`, `success`, each with
  higher-contrast `-strong` steps and a `-line` for borders. A participant
  page picks the dark or light set from its own `void` (`themeScheme()`), so
  they stay readable on any palette without a project being able to touch them.
  Write `text-danger`, `border-warning-line/40`; never a Tailwind red or amber.
- **Hue ramps a visual script supplies.** A slider showing the colours a
  parameter maps to draws the script's own gradient. This is the one other
  place a literal colour is expected.
- **Interface words.** `on` / `off`, `[ ]` / `[x]`, `( )` / `(o)`, `|` and `:`
  are ours, not copy. Participant-facing copy — questions, the noun ("star"),
  `saving…`-style status — belongs to the project.

## The terminal look

- **Buttons are underlined text.** No filled or boxed button. The forward
  action is paper and underlined; a way out (cancel, sign out) is dim until
  hovered; a destructive action is dim and reddens only on hover.
- **Controls are text.** A toggle is the word `on` or `off`, underlined when
  on — never a sliding pill. A checkbox is a typed `[ ]` / `[x]`, a radio
  `( )` / `(o)`, each a fixed `3ch` wide so toggling never shifts the label. An
  option row is a run of words with the chosen one underlined.
- **Surfaces, not borders; 4px corners everywhere.** A box — panel, field,
  chip, boxed button, badge, code block, tile — is set apart by a tint of the
  ground, never drawn round with a line, and has the 4px `rounded` corner.
  `bg-surface` (paper at 6% over void) for neutral boxes, `bg-surface-hover`
  (10%) for hover and popovers, `bg-warning-surface` / `bg-danger-surface`
  for status boxes. All are opaque mixes of the palette, so they follow the
  theme and a project's colours. Only dots (`rounded-full`) are round. No
  shadow. Row dividers between list items stay as `border-paper/10` lines —
  they separate, they do not enclose. (Decided 2026-10-17.)
- **Colour does the emphasis.** The one strong call on a page — `cancel` while
  a send counts down — is inverted: `bg-paper text-void` (15:1). A destructive
  boxed button sits on `bg-danger-surface` in `text-danger-strongest`. Inside a
  status box, text keeps to that box's tones and `paper`; `dim` does not
  reliably clear 4.5:1 there. Success has no surface: green text on a green
  tint fails in light.
- **Status sits beside a button, never inside it.** A button keeps its label;
  `saved`, `unsaved changes` or the copy button's `copied` is a word next to
  it, in a live region. Only the pending label (`saving…`) replaces the text.
- **Section headings are lowercase.** `text-xs text-dim`, the same on every
  page (`participation`, `2 · sending account`). The project menu's group
  headings are the one uppercase, letter-spaced label: they are navigation,
  not page content. (Decided 2026-10-26.)
- **The rule.** The `------` line under a terminal text field and between
  control rows is `.term-rule`: a gradient of 10px dashes and 7px gaps, 2px
  tall, so it reads like typed hyphens.
- **One focus treatment.** A 1px paper outline held 2px off the control, on
  `:focus-visible` only — the same on a slider handle, a button or a checkbox.
- **Three sizes.** 11px for hints, labels and badges; 14px for buttons,
  options and selects; 16px for body. 10px mono for code. No larger scale.
- **Faces.** Admin is Geist (Geist Mono for code). The participant flow
  defaults to DM Mono and follows the project's typeface key.
- **Motion.** Almost none: `transition-opacity`, and the slow 3s `beacon`
  pulse on the "open" dot, off under `prefers-reduced-motion`.
- **Icons.** None. If any arrive they must be `currentColor` SVGs, so they
  follow the palette.

## Known gaps

- **Contrast is advised, not enforced.** The palette form warns when `paper` or
  `dim` falls under 4.5:1 on `void` (`contrastIssues()` in
  `project-theme.ts`) and still saves. Both studio themes and the default
  project palette clear it; projects saved with the old default dim
  (`#7f776b`, 4.3:1) see the warning.
