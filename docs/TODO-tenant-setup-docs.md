# TODO: document tenant setup, step by step

Note to self (2026-10-16, updated 2026-10-23): each step below needs a proper how-to (what to click, what to paste,
what can go wrong). This list is from memory, not checked against the code — verify the order
and wording when writing the real docs. `administration.md` and `participant-styling.md` may
already cover some of it.

## Steps a tenant goes through to get a working project

1. **Account** — accept an invitation (sent from `/admin/invitations`); password of at least 12 characters.
2. **Platform role** — an admin grants CREATOR (or RESEARCHER) so the person can create projects. Roles are granted, never invited.
3. **Create the project** — name + slug, chosen once (can't be changed later). Participant URL is `/p/<slug>`.
4. **Create a Supabase project** — one Supabase project per experiment, no sharing.
5. **Connect Supabase** on the project's database page (Supabase OAuth), then provision from there:
   - apply the schema ("re-run schema" when its version changes, e.g. v2 for `participant_contacts`)
   - turn on anonymous sign-ins (fallback: turn them on by hand in Supabase)
   - anonymous sign-ins per hour, per IP: Supabase defaults to ~30 (a venue Wi-Fi breaks
     participant 31); provisioning raises it to 1000 (never lowers a higher one), and the form
     shows the current value. Rehearse with 50+ phones on one network before a real event.
6. **Visual** — upload the avatar p5 script exported from the YQ editor (p5 1.11.3), or click "use the starter".
7. **Declare parameters** in the builder (continuous/discrete slider, select-one, text).
8. **Participant questions** — optional email collection checkbox + its purpose line.
9. **Styling/theme** — palette, font, links (dark/light theme).
10. **Team** — invite collaborators/viewers.
11. **Connect the YQ scene** — paste the pre-filled hookup snippet (Supabase URL + anon key) into the scene script's CONFIG; the scene writes `session_scores` and clears `is_staged`.
12. **Open participation** and run the event — staging avatars (max 2 at a time).
13. **After the event** — close participation, publish the conclusion page.
    Scores CSV export exists in the ops console but is left out of the tenant guide: it moves into the research component (see below).
14. **Participant report email** (optional)
    - mini-script (optional; otherwise the main script is used)
    - check the map
    - write the email template + conclusion page
    - acknowledge the email pass-through notice
    - connect Gmail. Today the Google app is still in Testing (owners must be added as test users
      and reconnect weekly) — temporary: see `docs/google-oauth-verification.md` for publishing
      the app and getting it verified. Once published, owners connect once; until verified they
      click through Google's "unverified app" warning.
    - team test → rehearsal → real send

## Next to-dos

- **HIGH PRIORITY: bundle the scores CSV export into the research component.** Removed from
  the tenant guide (`getting-started-for-tenants.md`) until then.
- Tenant guide step 8 (connect the YQ scene) changes once the YouQuantified package is in the
  platform; step 3 (connect your database) changes once the research layer / Studio-provided
  database lands.
- Gmail sending limitation (Google app in Testing: each sender added as a test user, reconnect
  weekly) is left out of the tenant guide on purpose. Tell tenants one to one until the app is
  published (`docs/google-oauth-verification.md`).
