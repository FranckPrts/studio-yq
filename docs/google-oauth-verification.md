# Google OAuth verification — gmail.send

Submission material for Google Auth Platform → Data Access → Submit for verification.

Scopes requested (`src/lib/report/gmail.ts`): `openid`, `email`, `https://www.googleapis.com/auth/gmail.send`.
Only `gmail.send` is sensitive; `openid` and `email` need no justification.

## Scope justification (paste into the gmail.send field)

studio-yq is a web app that research teams and event organisers use to run participant
avatar experiences. After a session, each participant receives a short personal report of
their experience by email.

The owner of a project connects their own Gmail account so these reports are sent from the
organiser's address, the address participants already know and can reply to. studio-yq uses
`gmail.send` only to send these report emails, one per participant, when an owner starts a
send on the project's "send" page. A send only starts after the owner has agreed to a notice
about using participants' email addresses.

We request only `gmail.send`, the narrowest scope that allows sending. studio-yq never reads,
lists, modifies or deletes any email, contact or other Gmail data. A narrower scope would not
work: the reports must come from the organiser's own mailbox, not a shared no-reply address,
so that participants recognise the sender and replies reach the organiser. The OAuth refresh
token is stored encrypted, used only for sending, and deleted when an owner clicks
"disconnect" or deletes the project. How data is handled is described in our privacy policy:
https://studio.youquantified.com/privacy

## Demo video script (≈2–3 min, upload to YouTube as Unlisted)

Record in English, in a browser where the address bar is visible the whole time. Use a
project whose participants are your own test addresses. No narration needed, but on-screen
captions or a voice-over describing each step helps the reviewer.

1. **Homepage.** Open `https://studio.youquantified.com`. Scroll so the description and the
   privacy link are visible. Click **privacy** and show the policy, including the section on
   Gmail.
2. **Sign in.** Go back, click **sign in**, and sign in to studio-yq.
3. **Open the send page.** Open a project → **report → send**. Show step 1 (the participant
   email notice, already agreed) and step 2, **sending account**, with nothing connected.
4. **Consent screen (the key shot).** Click **connect a Gmail account**. On Google's consent
   screen:
   - pause on the **app name "studio-yq"**;
   - click into the address bar and **scroll through the URL until `client_id=` is visible**
     (Google requires the client ID to be shown);
   - show the permission line **"Send email on your behalf"**.
   Click **Continue / Allow**.
5. **Connected.** Back in studio-yq, show "Gmail connected" and "Sending as …" with the line
   "It can send as this account, never read it."
6. **Send.** In step 3, start a send to the test participant(s) and let it finish.
7. **Delivery.** Switch to the participant's inbox and open the received report email. Show
   the **From** address matching the connected account.
8. **Revoke (optional, recommended).** Back on the send page, click **disconnect**, then show
   the account no longer appears under sending account.

## Before submitting

- Data Access lists only `openid`, `email`, `gmail.send`. Remove anything else.
- Branding: homepage `https://studio.youquantified.com`, privacy
  `https://studio.youquantified.com/privacy`, terms `https://studio.youquantified.com/terms`,
  authorised domain `youquantified.com`.
- The privacy policy mentions Gmail sending and states that use of Google user data follows the
  [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
  including the Limited Use requirements. Reviewers look for this sentence.
