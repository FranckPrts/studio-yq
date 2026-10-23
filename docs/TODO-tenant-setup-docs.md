# TODO: document tenant setup, step by step

Note to self (2026-10-16): each step below needs a proper how-to (what to click, what to paste,
what can go wrong). This list is from memory, not checked against the code — verify the order
and wording when writing the real docs. `administration.md` and `participant-styling.md` may
already cover some of it.

## Steps a tenant goes through to get a working project

1. **Account** — get an account on studio.youquantified.com (password of at least 12 characters).
2. **Create the project** — name + slug (participant URL is `/p/<slug>`).
3. **Create a Supabase project** — one Supabase project per experiment, no sharing.
   - Turn on anonymous sign-ins.
   - Warn about anonymous-auth rate limits (~30 sign-ins/hour per IP) and how MAU adds up at events.
4. **Connect Supabase** in the console — project URL, anon key, secret key (stored encrypted).
5. **Apply the schema** to the tenant DB (and "re-run schema" when it changes version, e.g. v2 for `participant_contacts`).
6. **Upload the avatar p5 script** exported from the YQ editor (p5 1.11.3).
7. **Declare parameters** in the builder (continuous/discrete slider, select-one, text).
8. **Participant questions** — optional email collection checkbox + its purpose line.
9. **Styling/theme** — palette, font, links (dark/light theme).
10. **Team** — invite collaborators/viewers.
11. **Connect the YQ scene** — paste the pre-filled hookup snippet (Supabase URL + anon key) into the scene script's CONFIG; the scene writes `session_scores` and clears `is_staged`.
12. **Run the event** — staging avatars (max 2 at a time).
13. **Participant report email** (optional)
    - mini-script (optional; otherwise the main script is used)
    - check the map
    - write the email template + conclusion page
    - acknowledge the email pass-through notice
    - connect Gmail. Today the Google app is still in Testing (owners must be added as test users
      and reconnect weekly) — temporary: see `docs/google-oauth-verification.md` for publishing
      the app and getting it verified. Once published, owners connect once; until verified they
      click through Google's "unverified app" warning.
    - team test → rehearsal → real send
