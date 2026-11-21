# TODO: featured projects page, and keeping an experience after it closes

Written 2026-11-21 from a conversation with Franck. Not built yet. Decisions
still open are marked **(decide)**.

Two pieces of work, in the order they depend on each other:

- **A. Featured projects page.** A public page that counts, across every
  project Franck has featured, the avatars participants made and the sessions
  those avatars were scored in by YQ, and shows each featured project.
- **B. Experience snapshots.** A copy of a project's experience kept by Studio,
  so the participant-facing pages still work, and the published page can still
  be edited, once the survey is closed or the tenant's Supabase is gone.

A can ship on live counts first. B then becomes where A reads its numbers.

---

## Terms

- **Avatar**: a row in the tenant's `avatars` table. It is the participant's
  profile, used in sessions and scored by YQ.
- **Session**: a row in `session_scores`, written by the YQ scene when a staged
  pair finishes a run.
- The page shows the two as **two counts in two different colours**, never
  added together.

---

## A. Featured projects page

### A1. The featured flag

- [ ] Add `featuredAt DateTime?` on `Project`, a timestamp rather than a boolean,
      like `conclusionPublishedAt`. Add a migration.
- [ ] Add `canFeatureProjects()` in `src/lib/auth/capabilities.ts`. Only
      platform admins pass it, so only Franck sets the flag. No project role,
      however high, can set it.
- [ ] Add a feature / unfeature switch on the project overview, shown to
      platform admins only, plus a column on `/admin` (or a list on
      `/admin/invitations` next to platform roles).
- [ ] **(decide)** Should unfeaturing hide the project immediately, or keep its
      past numbers in the total? Proposed: hide it, and remove it from the total.

### A2. Asking to be featured

- [ ] In project settings (overview), show tenants a short line: "Want this
      project featured on studio.youquantified.com? Email <project manager>."
      Use a `mailto:` link with the project's name and slug in the subject.
- [ ] **(decide)** The address to use. Store it as an env var
      (`FEATURE_REQUEST_EMAIL`) rather than hard-coding it.
- [ ] Once a project is featured, the line says "Featured since <date>".

### A3. Project description and team, for the page

- [ ] Add a `description` field on `Project`: plain text, short, with no HTML,
      in the same spirit as `copy`. Owners and collaborators edit it in the
      project settings.
- [ ] Choose which members are listed publicly. Proposed: an opt-in
      `showOnFeatured` on `Membership`, which each person sets for themselves,
      with the display name only (never the email address).
      **(decide)** Opt-in per person, or every member is listed by default?
- [ ] A featured project with no description falls back to the project's name
      and its visual. A project that has a description also shows it and its
      listed members.

### A4. The page

- [ ] Add a public route, e.g. `/featured` (or put it on the home page `/`).
      **(decide)** Which URL. No sign-in, so it stays outside the studio
      layout, like `/p/[slug]`.
- [ ] Top of the page: the total avatar count and the total session count, in
      two colours from the design tokens (not literal hexes; see
      `docs/participant-styling.md`).
- [ ] Then one card per featured project:
  - [ ] its visual, drawn with the starter-style template first: the default
        avatar from its current script (or a captured mini, which
        `MiniCapture` already stores as a picture, so no sandbox is needed on
        the page)
  - [ ] its avatar count and session count, in the same two colours
  - [ ] its description and listed members, when it has a description
  - [ ] a link to its conclusion page when that is published
- [ ] Add a loading skeleton (`SkeletonPage`), and check the phone layout at 16px
      padding.
- [ ] Add a link to it from the home page and the legal footer.

### A5. Where the numbers come from

Participant data is in each tenant's own Supabase, never in Studio's
database, so counting means asking every featured project's Supabase.

- [ ] Add a server function, `countExperience(project)`: `select count` with
      `head: true` on `avatars` and on `session_scores`, using the stored
      connection, the same way `src/lib/spoke/ops.ts` counts staged
      avatars. Counts only. No rows leave the tenant's database.
- [ ] Cache the counts. Store `{ avatars, sessions, countedAt }` per project
      in Studio's database (an aggregate, not participant data) and refresh on
      a schedule (a Vercel cron every 10 to 15 minutes) or when stale on read.
      The page reads only the cache.
- [ ] If a project's Supabase can't be reached (reconnect needed, deleted),
      keep its last counts and its `countedAt`, and don't error the page.
- [ ] Once B exists, a closed project's counts come from its snapshot, and
      stop changing.

---

## B. Experience snapshots: keeping what Studio ran

### Why

Today everything a participant sees after the event (results, board and
conclusion) is read live from the tenant's Supabase with the publishable key
(`src/lib/spoke/results.ts`, `board/board.tsx`). If the tenant pauses, deletes
or wipes that Supabase project (free-tier projects pause after a week idle),
those pages go blank, the featured counts go stale, and the record of the
experience is gone.

### What changes in principle

**(decide), and it matters most:** Studio currently promises that no
participant data is stored here (README, `prisma/schema.prisma` header,
`/privacy` "Participant data", `/terms`). A snapshot of avatars and scores is
participant data held by Studio. Options:

1. **Aggregate only.** Keep only counts, histogram bins, the chosen map
   snapshot image and the conclusion stats. The promise stands. Results per
   participant still need the tenant's Supabase.
2. **Pseudonymous copy.** Avatars (name, params, answers) and scores, but
   never `participant_contacts` and never emails. Needs the privacy page,
   terms and tenant guide updated, and a tenant opt-in per project.
3. **Fold it into the research layer.** The Studio-provided database planned
   for research data (`canCreateResearchConsent`, RESEARCHER role) holds
   the snapshot too, under the same consent and retention rules.

Proposed: start with 1 for the featured page, and design 2 as the first
table of the research-layer database (option 3), so this is not built twice.

### B1. Taking a snapshot

- [ ] Add a `ProjectSnapshot` model (or `ExperienceSnapshot`, to avoid confusion
      with `MapSnapshot`): `projectId`, `takenAt`, `takenById`,
      `schemaVersion`, counts, conclusion stats, and, under option 2,
      the avatars and scores as JSON.
- [ ] Take one automatically when participation is closed
      (`openForParticipation` → false), and on demand from the project's
      Database page ("save a snapshot now").
- [ ] Read through `service_role` server side, the way the report send already
      reads the tenant's database. Skip `participant_contacts` entirely.
- [ ] Keep each one (append-only, like scripts), or keep the latest.
      **(decide)**

### B2. Serving pages from it

- [ ] When participation is closed and a snapshot exists, `/p/[slug]/results`,
      `/p/[slug]/conclusion` and the board read from the snapshot instead of
      the tenant's Supabase.
- [ ] The **published page stays editable**: the conclusion template, email
      template, copy, theme and description are already Studio-side, so
      editing them after close keeps working. Only the data under them is
      frozen. The conclusion editor's preview must read the snapshot too.
- [ ] Reopening participation switches back to live reads. Closing again takes
      a fresh snapshot.
- [ ] Show on the overview: "Snapshot from <date>, N avatars, M sessions", so
      the team knows what's frozen.

### B3. Retention and deletion

- [ ] Deleting a project deletes its snapshots (cascade), and the danger-zone
      text says so.
- [ ] Wiping the tenant's database from the Database page asks whether to keep
      or drop the snapshot.
- [ ] Update `/privacy`, `/terms`, `README.md` "Where data lives", the schema
      header comment and `docs/getting-started-for-tenants.md` to match
      the option chosen above.

---

## Order of work

1. A1 flag and capability, A2 request line
2. A3 description and member opt-in
3. A5 live counts with cache
4. A4 the page
5. B decision (aggregate / pseudonymous / research layer)
6. B1 snapshot on close, then B2 serving from it, then B3 retention and docs

## Open questions for Franck

- The page's URL, and whether it replaces or sits beside the home page.
- The project manager address for feature requests.
- Members on the page: opt-in per person, or all by default?
- "Attempt to first show the template": I read this as each project's card showing
  its avatar drawn from its own template (script) first, then the description and
  team. Correct this if you meant a page template shown before any project is featured.
- Snapshots: option 1, 2 or 3 above.
