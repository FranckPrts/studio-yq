import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, PublicShell, Section } from "../legal";

/**
 * The privacy policy. Every factual claim here is meant to be true of the code
 * as it stands — the schema, `src/lib/report/notice.ts`, `src/lib/report/gmail.ts`,
 * `src/lib/crypto/envelope.ts`. Change the code, re-read this.
 */

export const metadata: Metadata = {
  title: "Privacy policy — studio-yq",
};

export default function PrivacyPage() {
  return (
    <PublicShell>
      <LegalDocument title="Privacy policy" updated="21 October 2026">
        <Section title="Who we are">
          <p>
            studio-yq (studio.youquantified.com) is an independent project run
            by Franck Porteous, 6 Washington Pl, New York, NY 10003, United
            States (&ldquo;we&rdquo;, &ldquo;us&rdquo;). It is built on the
            open-source yq-data package from You Quantified. Questions about
            this policy or your data: <a href="mailto:fp2221@nyu.edu">fp2221@nyu.edu</a>.
          </p>
        </Section>

        <Section title="Who this policy covers">
          <p>studio-yq has two kinds of user, and treats their data differently:</p>
          <ul>
            <li>
              <strong>Organisers</strong> — the research and event teams
              (&ldquo;tenants&rdquo;) who hold an invitation-only account and set
              up projects in the studio. For their account data, we are the
              controller.
            </li>
            <li>
              <strong>Participants</strong> — people who take part in an
              experience through a project link (<code>/p/…</code>), without an
              account. Their data belongs to the organisers who run that
              project, who are its controller. We process it only on their
              behalf and on their instructions, as described below.
            </li>
          </ul>
        </Section>

        <Section title="What we store about organisers">
          <ul>
            <li>
              <strong>Account:</strong> email address, optional display name,
              a password hash (argon2id — we never store the password itself),
              whether the account is a platform administrator, and the studio
              theme you chose.
            </li>
            <li>
              <strong>Sessions:</strong> a hash of each sign-in session&rsquo;s
              token (never the token), when it was created and last used, when
              it expires, and the browser&rsquo;s user-agent string, so you can
              see where you are signed in.
            </li>
            <li>
              <strong>Sign-in protection:</strong> after a wrong password we
              record a one-way hash of the account address and of the IP
              address, with a timestamp, to throttle guessing. These rows are
              deleted once they fall outside the throttling window.
            </li>
            <li>
              <strong>Invitations and team membership:</strong> who invited
              whom, to which project and with which role, and the invited
              address when an invitation is addressed to one person. Invitation
              links are stored only as hashes.
            </li>
            <li>
              <strong>Projects:</strong> what you configure — name, avatar and
              report scripts, parameters, participant-page text and colours,
              the report email template, the conclusion page — and who agreed
              to the report-sending notice, when, and to which version.
            </li>
            <li>
              <strong>Report sending log:</strong> for each send, its kind,
              the email text as it stood, who started it, and for each message
              whether it was sent or failed and Gmail&rsquo;s message id.
              Participants appear in this log only as an anonymous id from the
              organiser&rsquo;s database — never as an email address.
            </li>
          </ul>
        </Section>

        <Section title="Connected accounts">
          <p>
            A project runs on accounts its organisers connect. We keep only what
            is needed to use them, and encrypt every credential at rest with
            AES-256-GCM under a master key held outside the database. Each
            encrypted value is bound to the row and field it belongs to, so it
            cannot be copied elsewhere and decrypted.
          </p>
          <ul>
            <li>
              <strong>Supabase:</strong> the project&rsquo;s URL and publishable
              key (both public by design — participants&rsquo; browsers use them),
              and, encrypted, the OAuth tokens and secret key we use to set up
              and read the organiser&rsquo;s database.
            </li>
            <li>
              <strong>Gmail:</strong> the address of the connected Google
              account, the permissions Google granted, and, encrypted, a refresh
              token. Short-lived access tokens are held in memory only and never
              written to the database. See the next section.
            </li>
          </ul>
        </Section>

        <Section title="Google user data">
          <p>
            A project owner or collaborator may connect a Google account so
            that participant reports are sent from that account. We request only:
          </p>
          <ul>
            <li>
              <code>openid</code> and <code>email</code> — to learn which
              address the account is, so the studio can show it and write the
              &ldquo;From&rdquo; line of each message;
            </li>
            <li>
              <code>https://www.googleapis.com/auth/gmail.send</code> — to send
              email as that account.
            </li>
          </ul>
          <p>
            <strong>How we use it.</strong> We use this access for one purpose:
            to send the participant report emails the project team writes and
            confirms in the studio, to the participants who gave their address
            to receive that report and to members of the project team for
            testing. Nothing is sent without a team member starting the send.
            We do not read, search, list, modify or delete any message, label,
            contact or setting in the mailbox, and the permission we hold does
            not allow it. Copies of the messages we send appear in the
            account&rsquo;s own Sent folder, as with any email sent from it.
          </p>
          <p>
            <strong>Sharing.</strong> We do not sell Google user data, use it
            for advertising, or use it to train artificial-intelligence or
            machine-learning models. We do not transfer it to anyone, except as
            needed to send the email itself through Google, to comply with
            the law, or to protect the security of the service. No person at
            our end reads it, except with the account owner&rsquo;s permission,
            for security purposes, or where the law requires.
          </p>
          <p>
            <strong>Limited Use.</strong> studio-yq&rsquo;s use and transfer to
            any other app of information received from Google APIs will adhere
            to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p>
            <strong>Disconnecting.</strong> Any owner or collaborator can
            disconnect Gmail on the project&rsquo;s send page: we revoke the grant at Google and delete
            the stored token. You can also remove studio-yq&rsquo;s access at
            any time from{" "}
            <a href="https://myaccount.google.com/permissions">
              your Google account&rsquo;s third-party access page
            </a>
            . Deleting a project deletes its Gmail connection with it.
          </p>
        </Section>

        <Section title="Participant data">
          <p>
            Participants&rsquo; data — their avatars, answers, scores, and the
            email address they may choose to give — is stored in the
            organisers&rsquo; own Supabase database, not in ours. A
            participant&rsquo;s browser signs in to that database anonymously
            and writes to it directly. studio-yq does not keep copies.
          </p>
          <p>
            When the project team views or reports on its project, studio-yq
            reads from that database with the credentials the organisers
            connected, to show them their own data.
          </p>
          <p>
            <strong>Email addresses</strong> pass through studio-yq only when a
            report is sent, and only after a project owner has agreed to a
            notice explaining this. At that moment we read the
            participant&rsquo;s address from the organisers&rsquo; database,
            hand it to Gmail to deliver their report, and keep it in memory for
            that one send only. We never store it, never show it in the studio,
            and never send it to anyone&rsquo;s browser.
          </p>
          <p>
            If you took part in an experience and want to see, correct or
            delete your data, contact the organisers who invited you — they
            control it. If you cannot reach them, write to us at{" "}
            <a href="mailto:fp2221@nyu.edu">fp2221@nyu.edu</a> and we will pass your request on.
          </p>
        </Section>

        <Section title="Cookies and browser storage">
          <ul>
            <li>
              Signing in sets one session cookie (httpOnly, for up to 30 days),
              used only to keep you signed in.
            </li>
            <li>
              Connecting Supabase or Gmail sets a short-lived cookie (ten
              minutes) that protects the connection flow, and is removed when
              it completes.
            </li>
            <li>
              On participant pages we set no cookies. The page&rsquo;s Supabase
              client keeps the participant&rsquo;s anonymous session in the
              browser&rsquo;s storage, on the organisers&rsquo; behalf, so they
              can come back to their avatar.
            </li>
          </ul>
          <p>We use no analytics, advertising or tracking cookies.</p>
        </Section>

        <Section title="Service providers">
          <ul>
            <li><strong>Vercel</strong> — hosts the application.</li>
            <li><strong>Neon</strong> — hosts our database.</li>
            <li>
              <strong>Google</strong> — delivers report emails through the Gmail
              API, from the account the organisers connected.
            </li>
            <li>
              <strong>Supabase</strong> — hosts each project&rsquo;s participant
              data, in an account the organisers hold and contract for
              themselves.
            </li>
            <li>
              <strong>jsDelivr</strong> — participant pages load the p5.js
              drawing library from its content-delivery network.
            </li>
          </ul>
          <p>
            Our application and database are hosted in North America (the
            United States), with Vercel and Neon. If you use studio-yq from
            outside the United States, your data is transferred to and
            processed there.
          </p>
        </Section>

        <Section title="How long we keep it">
          <ul>
            <li>Sessions end when you sign out or after 30 days.</li>
            <li>Sign-in throttling records are deleted after the throttling window.</li>
            <li>
              Deleting a project deletes its connections, scripts, team
              memberships and sending log.
            </li>
            <li>
              Accounts and projects are kept until they are deleted.
              Organisers can delete what they create in the studio themselves;
              to have your account deleted, ask us at <a href="mailto:fp2221@nyu.edu">fp2221@nyu.edu</a>.
            </li>
            <li>
              We keep no server logs of our own. Vercel and Neon keep
              operational logs under their own retention policies.
            </li>
          </ul>
        </Section>

        <Section title="Your rights">
          <p>
            Depending on where you live, you may have the right to access,
            correct, delete or export your personal data, to object to or
            restrict its processing, and to complain to a data-protection
            authority. To exercise them, contact{" "}
            <a href="mailto:fp2221@nyu.edu">fp2221@nyu.edu</a>.
          </p>
          <p>
            We are based in New York, United States, where the Federal Trade
            Commission and the New York State Attorney General oversee
            privacy. If you are in the EU, the UK or Switzerland, the GDPR (or
            its UK and Swiss equivalents) applies, and you may complain to your
            local data-protection authority — in France, the CNIL.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Organiser accounts are for adults. Participants must be 16 or
            older by default. Younger participants are allowed only when the
            organisers have parental consent under their study&rsquo;s ethics
            approval, and never anyone under 13.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We will post any change here and update the date above. If a
            change affects how we use Google user data, we will tell project
            owners before it takes effect.
          </p>
          <p>
            See also the <Link href="/terms">terms of service</Link>.
          </p>
        </Section>
      </LegalDocument>
    </PublicShell>
  );
}
