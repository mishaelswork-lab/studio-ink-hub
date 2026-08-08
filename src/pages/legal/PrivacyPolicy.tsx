import { Navbar } from "@/components/layout/Navbar";
import { LegalLayout } from "./LegalLayout";
import { SUPPORT_EMAIL, mailto } from "@/lib/contact";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <LegalLayout title="Privacy Policy" updated="Last updated: 3 August 2026">
      <p>
        This Privacy Policy explains how Tart ("we", "us") collects, uses, stores and
        shares your personal data. It is maintained by Tart and is written to align with the
        Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000
        and rules made thereunder.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, email address, phone number, profile photo.</li>
        <li><strong>Booking data:</strong> appointment date/time, service type (tattoo or piercing), placement, style, notes you provide.</li>
        <li><strong>Content you upload:</strong> reference photos, design uploads, portfolio images, messages to artists.</li>
        <li><strong>Payment data:</strong> transaction identifiers and status returned by our payment aggregator. We never receive or store your full card, UPI PIN or bank credentials.</li>
        <li><strong>Usage data:</strong> anonymised page performance and feature-usage events used to improve the app.</li>
      </ul>

      <h2>2. Purpose of processing</h2>
      <p>
        We process your data only to create and secure your account, deliver bookings and
        consultations, process payments, provide support, comply with legal obligations, and improve
        reliability and performance of the service.
      </p>

      <h2>3. Consent</h2>
      <p>
        We collect your explicit, informed and unambiguous consent at sign-up before processing
        personal data, and separately for non-essential analytics cookies. You may withdraw either
        consent at any time from the Privacy section of your profile or by writing to{" "}
        <a href={mailto("Withdraw consent")}>{SUPPORT_EMAIL}</a>. Withdrawal does not affect
        processing carried out before withdrawal, and may mean we can no longer provide parts of the
        service. Every consent decision is logged with its timestamp and policy version so both you
        and we have a verifiable record.
      </p>

      <h2>3A. Cookies and similar technologies</h2>
      <ul>
        <li><strong>Strictly necessary:</strong> session and authentication tokens needed to sign you in and protect against abuse. These are required to operate the service and cannot be switched off.</li>
        <li><strong>Analytics and performance (optional):</strong> anonymised page-timing and feature-usage events. These are set only after you accept them in the consent banner.</li>
        <li>We do not use advertising, cross-site tracking or data-broker cookies.</li>
      </ul>


      <h2>4. Your rights as a Data Principal</h2>
      <ul>
        <li>Access a summary of the personal data we hold about you.</li>
        <li>Request correction, completion or updating of inaccurate data.</li>
        <li>Request erasure of your data and closure of your account.</li>
        <li>Nominate another individual to exercise your rights in case of death or incapacity.</li>
        <li>Raise a grievance through our Grievance Redressal Policy.</li>
      </ul>
      <p>
        To exercise any right, email <a href={mailto("Data principal request")}>{SUPPORT_EMAIL}</a>.
        We respond within 30 days.
      </p>

      <h2>5. Sharing</h2>
      <p>
        We share the minimum data necessary with: the tattoo artist or studio you book with, our
        cloud hosting and database provider, and our RBI-authorised payment aggregator. We do not sell
        your personal data.
      </p>

      <h2>6. Security</h2>
      <p>
        Data is stored in an access-controlled managed database with row-level security, so each
        account can only read and modify its own records. Transport is encrypted with TLS. Privileged
        keys are held server-side only and are never shipped in the browser bundle.
      </p>

      <h2>7. Retention</h2>
      <p>
        We retain account and booking records for as long as your account is active and thereafter only
        as long as required for legal, tax or dispute-resolution purposes. Deletion requests are actioned
        within 30 days unless retention is legally required.
      </p>

      <h2>8. Children</h2>
      <p>
        Tart is not intended for individuals under 18. We do not knowingly process children's data.
      </p>

      <h2>9. Deleting your account</h2>
      <p>
        You can delete your account and personal data at any time from Profile &rarr; Delete account,
        inside the app. Deletion removes your profile, chats, saved ideas and consent records. Booking
        and payment records are de-identified and retained only where tax or dispute law requires it.
        Deletion is blocked only while you have an open booking; cancel or complete it first.
      </p>

      <h2>10. AI features and camera/photo access</h2>
      <p>
        Photos you upload to AI Tattoo Match are sent to our AI provider solely to generate stencil
        suggestions for you. They are not used to train models, are not shown to other users, and are
        deleted from processing storage after generation. Camera and photo-library access is requested
        only at the moment you choose to upload, and location (if granted) is used only to sort studios
        by distance. You can decline any of these and continue using the app.
      </p>


      <h2>9. Contact</h2>
      <p>
        Questions about this policy: <a href={mailto("Privacy policy query")}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  </div>
);

export default PrivacyPolicy;
