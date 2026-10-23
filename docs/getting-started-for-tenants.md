# Getting started with studio-yq

studio-yq (studio.youquantified.com) lets you run an interactive avatar experience at an
event. Participants open a link on their phone and build their own avatar by answering a few
questions. The avatars then come to life in a YouQuantified scene, and afterwards each
participant can get a personal report by email.

This guide walks through what setting up a project involves, from your first login to the
email you send after the event.

---

## What you'll need

- **A studio-yq account.** We send you an invitation.
- **A Supabase account** (the free tier is enough to start). Your participants' data lives in
  *your* Supabase project, not on our side.
- **A YouQuantified scene** to display the avatars and record scores.
- **An avatar script** (p5.js) made in the YouQuantified editor. You can also start from our
  starter avatar.
- *(Optional)* **A Gmail account**, if you want to send participants a report after the event.

---

## 1. Create your account

Accept the invitation we email you and choose a password of at least 12 characters. For your
first project, we'll set it up and share it with you. After that, we'll turn on project
creation so you can start new ones yourself.

## 2. Create a project

Each project has a name and a short **slug**. The slug becomes your participants' link:
`studio.youquantified.com/p/<your-slug>`. **You can't change the slug later**, so choose it
carefully.

## 3. Connect your database

Each project needs **its own Supabase project**. Please don't reuse one across experiments.

1. Create a new project in Supabase.
2. In studio-yq, open your project's **Database** page and connect Supabase. You'll be asked
   to authorise access.
3. From the same page, let studio-yq set up the database for you. This creates the tables and
   turns on the anonymous sign-ins participants use.
4. **Raise the sign-in limit if your event shares one network.** By default Supabase allows
   about 30 anonymous sign-ins per hour from the same internet address. On a venue's Wi-Fi,
   participant 31 would be turned away. You can raise the limit from the Database page.

> **Tip:** before a real event, rehearse with as many phones as you can on the venue's network.

## 4. Add your avatar

On the **Visual** page, upload the avatar script exported from the YouQuantified editor, or
click **Use the starter** to try things out first.

## 5. Choose what participants decide

In the parameter builder, declare the choices participants make for their avatar:

- continuous slider
- discrete slider
- select one option
- free text

You can also ask for an **email address** (optional). Explain why you're asking in the
"purpose" line. Addresses are stored only in your Supabase project.

## 6. Make it look like yours

Set your palette, font, wording and links, and pick the light or dark theme. Preview the
participant page as you go.

## 7. Invite your team

Add collaborators (who can edit) or viewers (read-only) to the project.

## 8. Connect your YouQuantified scene

studio-yq gives you a pre-filled snippet with your project's connection details. Paste it into
your scene script's configuration block. The scene then shows the avatars staged in
studio-yq (up to two at a time) and records each session's scores.

## 9. Run the event

Open participation, share the link (or a QR code), and stage avatars into the scene as
participants come up.

## 10. After the event

- Close participation.
- Publish a **conclusion page** for participants.

## 11. Send participant reports (optional)

Each participant can get one email covering all of their avatars. It includes their avatar, a
map of everyone's avatars drawn in your project's style, and how they scored.

1. *(Optional)* Upload a **mini-avatar** script, a simplified version of your avatar used on
   the map. Without one, your main avatar is used.
2. Check the map.
3. Write the email in the editor. A live preview shows each person's version.
4. Read and accept the **email notice**. To send, studio-yq reads each participant's address
   from your Supabase project at sending time, uses it, and doesn't keep it.
5. Connect the **Gmail account** that will send the emails.
6. Send a test to your team, then a rehearsal to yourself, then the real send. A send log
   makes sure nobody gets the same email twice.

---

## Good to know

- **Your participants, your data.** Participant data stays in your Supabase project. Only the
  project setup (scripts, wording, styling, team) lives on studio-yq.
- **Deleting a project** removes it from studio-yq only. It doesn't touch your Supabase
  project, your Gmail connection or your scene, so tidy those up yourself if you no longer
  need them.

## Questions?

Get in touch with us. We're happy to walk through the setup.
