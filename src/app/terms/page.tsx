import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, PublicShell, Section } from "../legal";

/** The terms of service. */

export const metadata: Metadata = {
  title: "Terms of service — studio-yq",
};

export default function TermsPage() {
  return (
    <PublicShell>
      <LegalDocument title="Terms of service" updated="21 October 2026">
        <Section title="About these terms">
          <p>
            These terms govern use of studio-yq (studio.youquantified.com), run
            as an independent project by Franck Porteous, 6 Washington Pl, New
            York, NY 10003, United States (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By signing in, or by taking
            part in an experience run on studio-yq, you agree to them. How we
            handle personal data is described in the{" "}
            <Link href="/privacy">privacy policy</Link>.
          </p>
        </Section>

        <Section title="The service">
          <p>
            studio-yq lets research and event teams (&ldquo;organisers&rdquo;)
            set up participant avatar experiences: each project connects to the
            organisers&rsquo; own Supabase database, serves participant pages
            from a link, and can send each participant a report email from a
            Gmail account the organisers connect.
          </p>
        </Section>

        <Section title="Accounts">
          <ul>
            <li>
              Accounts are by invitation only. An invitation is personal unless
              it says otherwise; do not share your sign-in.
            </li>
            <li>
              You are responsible for keeping your password secure and for what
              happens under your account. Tell us at{" "}
              <a href="mailto:fp2221@nyu.edu">fp2221@nyu.edu</a> if you think it has been
              misused.
            </li>
            <li>
              Project owners decide who joins their project and with which
              role, and are responsible for their team&rsquo;s use of it.
            </li>
          </ul>
        </Section>

        <Section title="Organisers' responsibilities">
          <p>If you run a project, you agree that:</p>
          <ul>
            <li>
              you are the controller of your participants&rsquo; data and have
              a lawful basis — such as informed consent under your study&rsquo;s
              ethics approval — for collecting and processing it, including
              their email address when you ask for one;
            </li>
            <li>
              you send report emails only to participants who gave their
              address to receive them, and to your own team; studio-yq is not
              for marketing, bulk or unsolicited email;
            </li>
            <li>
              the Supabase and Google accounts you connect are yours or your
              organisation&rsquo;s to connect, and your use of them through
              studio-yq follows those providers&rsquo; own terms, including
              Gmail&rsquo;s sending limits and policies;
            </li>
            <li>
              you are responsible for the scripts, text, images and emails you
              put into your project, and have the rights to use them.
            </li>
          </ul>
        </Section>

        <Section title="Participants">
          <p>
            If you take part in an experience, the organisers who invited you
            are responsible for it and for your data; their own information
            and consent terms apply alongside these. Please do not enter
            anything offensive or anyone else&rsquo;s personal information.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>Nobody may use studio-yq to:</p>
          <ul>
            <li>break the law or infringe anyone&rsquo;s rights;</li>
            <li>send spam, phishing or misleading email;</li>
            <li>
              upload scripts or content meant to harm participants, their
              devices, or the service;
            </li>
            <li>
              try to reach another tenant&rsquo;s projects or data, or to get
              around access controls, rate limits or security measures.
            </li>
          </ul>
          <p>
            We may suspend an account or project that does, and disconnect its
            connected accounts.
          </p>
        </Section>

        <Section title="Your content">
          <p>
            Organisers keep all rights in what they put into studio-yq and in
            their participants&rsquo; data. You give us only the permission we
            need to host, process and display it in order to run your project.
            We keep the rights in studio-yq itself.
          </p>
        </Section>

        <Section title="Availability and changes">
          <p>
            studio-yq is provided as it is and as available. We work to keep it
            running and secure but do not promise it will be uninterrupted or
            free of errors, and we may change or retire features. Keep your own
            copy of anything you cannot afford to lose — your participant data
            already lives in your own database.
          </p>
        </Section>

        <Section title="Liability">
          <p>
            To the fullest extent the law allows, we accept no liability for
            any loss or damage arising from your use of studio-yq, or from
            being unable to use it — including lost data, lost emails, missed
            events, or anything done with the accounts you connect. Nothing in
            these terms limits liability that the law does not allow to be
            limited.
          </p>
        </Section>

        <Section title="Ending use">
          <p>
            You can stop using studio-yq at any time; ask us at{" "}
            <a href="mailto:fp2221@nyu.edu">fp2221@nyu.edu</a> to delete your account. We may
            end or suspend access for a breach of these terms, or if we stop
            running the service, with reasonable notice where we can give it.
            Disconnecting Gmail or Supabase, or deleting a project, removes
            the stored credentials for it.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws of the State of New York,
            without regard to its conflict-of-laws rules. Disputes go to the
            state and federal courts located in New York County, New York. If
            you are a consumer in the EU or the UK, you keep the protections of
            the mandatory law where you live and may bring proceedings there.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We will post any change here and update the date above. Continuing
            to use studio-yq after a change means accepting it.
          </p>
          <p>
            Contact: <a href="mailto:fp2221@nyu.edu">fp2221@nyu.edu</a>.
          </p>
        </Section>
      </LegalDocument>
    </PublicShell>
  );
}
