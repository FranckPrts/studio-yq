# Google OAuth verification — the Gmail-sending app

studio-yq sends participant report emails from a project owner's own Gmail account
(`src/lib/report/gmail.ts`). The Google OAuth client asks for `openid`, `email` and
`https://www.googleapis.com/auth/gmail.send` — nothing else. `gmail.send` is a **sensitive**
scope, not a restricted one, so verification needs no CASA security assessment: just
brand verification plus a sensitive-scope review.

While the app is in **Testing**, every owner must be added as a test user by hand and their
grant expires after 7 days (`invalid_grant` → "The Gmail connection needs renewing").
This document gets us out of that.

Public pages the review reads (all reachable signed out):

| Page | URL | Source |
| --- | --- | --- |
| Home | https://studio.youquantified.com/ | `src/app/page.tsx` |
| Privacy policy | https://studio.youquantified.com/privacy | `src/app/privacy/page.tsx` |
| Terms of service | https://studio.youquantified.com/terms | `src/app/terms/page.tsx` |

Signed-in users visiting `/` still go straight to `/projects`; Google's reviewers are signed out
and see the home page.

---

## 1. Before submitting: legal facts

All placeholders are filled (2026-10-21): operator Franck Porteous, 6 Washington Pl, New York,
NY 10003; contact fp2221@nyu.edu; New York law and venue; hosting in North America (Vercel,
Neon); participants 16+ by default (13 absolute floor, with parental consent); no own server
logs. studio-yq is an independent project built on the open-source yq-data package — not a
MindHive project, so MindHive appears nowhere on the public pages.

Still worth doing before submitting:

- Have someone with legal knowledge read the liability clause in `/terms` — a blanket
  "no liability" is limited by consumer law in many places; the text already says so.
- Account self-deletion: the privacy policy says accounts are deleted on request by email.
  When self-service deletion ships, update "How long we keep it" in `/privacy` and
  "Ending use" in `/terms`.

---

## 2. Steps only you can do (Google Cloud Console / Search Console)

### Now — publish unverified

- [ ] **Google Auth Platform → Audience → Publish app** (Testing → In production).
  - Effect: the test-user list no longer applies and refresh tokens stop expiring after 7 days.
  - Every owner who connected while in Testing must **reconnect Gmail once** (their old grant
    still dies on its 7-day clock). Tell current tenants.
  - Until verified: users see Google's **"Google hasn't verified this app"** warning and must
    click *Advanced → Go to studio.youquantified.com (unsafe)*; and there is a lifetime cap of
    **100 users** who can grant the sensitive scope. Fine for our invite-only tenant list.

### Domain

- [ ] **Google Search Console**: add `studio.youquantified.com` (or the `youquantified.com`
  domain property), verify via DNS TXT record, using a Google account that is an Owner or
  Editor on the Cloud project.
- [ ] **Branding → Authorised domains**: add `youquantified.com`.
- [ ] Confirm the OAuth client's redirect URI (`GOOGLE_OAUTH_REDIRECT_URI` on Vercel) is
  `https://studio.youquantified.com/api/connect/google/callback` and is on that domain.

### Branding page

- [ ] **App name**: `studio-yq` (must match what the home page calls itself; don't use
  "Google" or "Gmail" in it).
- [ ] **User support email**: `fp2221@nyu.edu`. The dropdown only offers your own Google
  account's address or a Google Group you manage — this works if you are signed in to the Cloud
  Console with the NYU Google account; otherwise create a Group or use the account you are
  signed in with.
- [ ] **App logo**: optional. If added: square PNG/JPG, 120×120 px, ≤1 MB. Note a logo
  makes brand verification mandatory and can slow it down — consider leaving it off.
- [ ] **Application home page**: `https://studio.youquantified.com/`
- [ ] **Application privacy policy link**: `https://studio.youquantified.com/privacy`
- [ ] **Application terms of service link**: `https://studio.youquantified.com/terms`
- [ ] **Developer contact email(s)**: `fp2221@nyu.edu`.

### Data Access page

- [ ] Scopes listed are exactly: `openid`, `.../auth/userinfo.email`, `.../auth/gmail.send`.
  Remove anything else.
- [ ] Paste the **scope justification** (section 3) into the `gmail.send` justification field.
- [ ] Upload the **demo video** (section 4) to YouTube as *Unlisted* and paste the link.

### Submit

- [ ] **Verification Center → Prepare for verification / Submit**. Answer review emails from
  the Trust & Safety team promptly — they often ask for one more clarification or a re-recorded
  video. Typical turnaround for a sensitive scope is a few days to a few weeks.
- [ ] When approved, tell tenants the warning screen is gone. Nobody needs to reconnect.

---

## 3. Scope justification (paste into Data Access → gmail.send)

> studio-yq (studio.youquantified.com) is an invitation-only studio that research and event
> teams use to run participant avatar experiences. After an experience, each participant who
> chose to give an email address can receive a short report about their own avatar.
>
> We request gmail.send so that a project owner can send these report emails from their own
> Gmail account. Sending from the organiser's own address is the point of the feature:
> participants recognise the sender as the study team they met, and any reply goes straight
> to that team rather than to us.
>
> The scope is used only when a member of the project team starts a send in the studio, after
> writing the email, sending a test to the team, and confirming. Each message is one call to
> users.messages.send containing that participant's report. We never read, list, search,
> modify or delete mail, and gmail.send is the narrowest scope that allows sending — it grants
> no access to the mailbox's contents. We also request openid and email only to display which
> account is connected and to write the From header.
>
> The refresh token is encrypted at rest (AES-256-GCM); access tokens are kept in memory only.
> The owner can disconnect at any time from the send page, which revokes the grant at Google
> and deletes the token. Google user data is not shared, sold, used for advertising or used to
> train AI models, and our use complies with the Google API Services User Data Policy,
> including the Limited Use requirements.

---

## 4. Demo video shot list

Google wants one continuous screen recording (2–4 minutes is plenty, no audio required but
captions or narration help) that shows: the app's real domain, the full OAuth consent flow
with the **OAuth client ID visible in the URL**, and each requested scope being used.

Prepare: a test project with a provisioned Supabase, a saved report email, the notice already
agreed, and Gmail **disconnected**. Record at a readable zoom (125–150%), in English.

1. **Home page** — open `https://studio.youquantified.com/` signed out. Pause on "Why
   studio-yq asks for Gmail access" and the Limited Use paragraph. Click through to
   `/privacy`, scroll to "Google user data", then back.
2. **Sign in** — sign in with an organiser account. Open the test project.
3. **Send page** — go to `/projects/<slug>/report/send`. Show the pass-through notice
   (already agreed) and the "connect Gmail" control. Say/caption: "Owners connect the Gmail
   account reports are sent from."
4. **Consent screen** — click connect. **Click the browser address bar** so the full
   `accounts.google.com/...` URL is readable, including `client_id=…`. Pick the Google account.
5. **Scopes** — on the consent screen, show the app name `studio-yq` and the permission
   "Send email on your behalf". Tick it if a checkbox is shown, then **Continue**.
6. **Connected** — back on the send page with `?gmail=connected`; show the connected address.
7. **Use the scope** — start a **team test**: pick one participant, send their report to the
   team. Show the run completing (sent ✓).
8. **Proof of delivery** — switch to the recipient inbox (a team member's mail client), open
   the received report, and show the **From** line is the connected Gmail address.
9. **No read access** — caption: "studio-yq only sends; it never reads the mailbox."
   Optionally show the account's Sent folder containing just that message.
10. **Disconnect** — back on the send page, disconnect Gmail. Then show
    `https://myaccount.google.com/permissions` with studio-yq no longer listed (or listed with
    only "send email" access, before disconnecting — either works).

Upload as Unlisted on YouTube; paste the link into the Data Access page.

---

## 5. After verification

- The 100-user cap and the warning screen go away.
- If we ever add a scope, the app needs re-verification before it can be requested —
  keep it to `gmail.send`.
- If the privacy policy's Google section changes, keep the Limited Use sentence verbatim.
- Code note: the comment in `src/lib/report/gmail.ts` about 7-day expiry for apps in Testing
  stays accurate as history; `invalid_grant` handling is still needed for revocations and
  password changes.
