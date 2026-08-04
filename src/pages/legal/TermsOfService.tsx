import { Navbar } from "@/components/layout/Navbar";
import { LegalLayout } from "./LegalLayout";
import { SUPPORT_EMAIL, mailto } from "@/lib/contact";

const TermsOfService = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <LegalLayout title="Terms of Service" updated="Last updated: 3 August 2026">
      <p>
        By creating an account or using Tart you agree to these Terms. If you do not agree,
        please do not use the service.
      </p>

      <h2>1. What Tart is</h2>
      <p>
        Tart is a discovery and booking platform that connects clients with independent tattoo and
        piercing artists and studios. We are not the provider of the tattoo or piercing service itself;
        the artist or studio you book is solely responsible for the work performed, hygiene standards,
        aftercare guidance and applicable licences.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old to book a tattoo or piercing through Tart and must
        provide accurate information about yourself.
      </p>

      <h2>3. Bookings and payments</h2>
      <ul>
        <li>Booking requests are confirmed only when the artist accepts them.</li>
        <li>Cover charges, deposits and boost fees are collected through an RBI-authorised payment aggregator.</li>
        <li>Prices shown are indicative; the final quote is agreed with the artist.</li>
        <li>Cancellations and refunds follow the artist's stated policy; disputes can be raised through our grievance process.</li>
      </ul>

      <h2>4. Content you upload</h2>
      <p>
        You retain ownership of reference images and designs you upload. You grant Tart a limited
        licence to store and display that content for the purpose of delivering the service. You must not
        upload content that is unlawful, obscene, infringing, hateful, or that depicts identifiable people
        without their permission.
      </p>

      <h2>5. Artist obligations</h2>
      <p>
        Artists must hold all licences and health/hygiene approvals required in their jurisdiction, keep
        their availability and pricing accurate, and honour accepted bookings. Tart may suspend
        accounts that receive repeated substantiated complaints.
      </p>

      <h2>6. Acceptable use</h2>
      <p>
        Do not attempt to breach access controls, scrape at scale, reverse-engineer the service,
        or use it to harass other users. Accounts that do so may be suspended without notice.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the extent permitted by law, Tart is not liable for indirect or consequential loss, or for
        the outcome, quality or health consequences of any tattoo or piercing performed by an artist
        booked through the platform.
      </p>

      <h2>8. Governing law</h2>
      <p>
        These Terms are governed by the laws of India. Courts at Bengaluru, Karnataka have exclusive
        jurisdiction.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these Terms: <a href={mailto("Terms of Service query")}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  </div>
);

export default TermsOfService;
