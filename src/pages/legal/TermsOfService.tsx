import { Navbar } from "@/components/layout/Navbar";
import { LegalLayout } from "./LegalLayout";
import { SUPPORT_EMAIL, mailto } from "@/lib/contact";

const TermsOfService = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <LegalLayout title="Terms of Service" updated="Last updated: 4 August 2026">
      <p>
        These Terms are a binding agreement between you and Tart. By creating an account, browsing,
        or otherwise using Tart you accept them in full. If you do not agree, you must stop using the
        service immediately.
      </p>

      <h2>1. What Tart is — and is not</h2>
      <p>
        Tart is an intermediary discovery and booking platform under Section 2(1)(w) of the
        Information Technology Act, 2000. We connect clients with independent tattoo and piercing
        artists and studios. <strong>We do not perform tattooing or piercing, do not employ artists,
        and are not a party to the service contract between you and an artist.</strong> The artist
        or studio you book is solely responsible for the work performed, hygiene and sterilisation
        standards, aftercare guidance, insurance and all applicable licences and health approvals.
      </p>

      <h2>2. Eligibility and accurate information</h2>
      <ul>
        <li>You must be at least 18 years old to book a tattoo or piercing through Tart.</li>
        <li>You must provide accurate identity, contact and medical-relevant information.</li>
        <li>You are responsible for all activity under your account and for keeping credentials secure.</li>
        <li>One person, one account. Impersonation or shared accounts may be terminated without notice.</li>
      </ul>

      <h2>3. Assumption of risk and health disclaimer</h2>
      <p>
        Tattooing and piercing are invasive procedures that carry inherent risks including pain,
        infection, allergic reaction, scarring and permanent change to your appearance. You accept
        these risks voluntarily. Tart provides no medical advice. Disclose allergies, skin conditions,
        pregnancy, blood-borne conditions and medication to the artist before your appointment.
      </p>

      <h2>4. Bookings, payments and refunds</h2>
      <ul>
        <li>A booking request is a request only; it binds no one until the artist accepts it.</li>
        <li>Cover charges, deposits, memberships and featured-listing fees are collected through an RBI-authorised payment aggregator. Tart does not store card, UPI PIN or bank credentials.</li>
        <li>Prices shown are indicative estimates. The final quote is agreed directly with the artist.</li>
        <li>Cover charges and boost fees are non-refundable once the service has been rendered, except where required by law.</li>
        <li>Refunds for the tattoo or piercing service itself are determined by the artist's stated policy; Tart may facilitate but does not guarantee any refund it does not itself hold.</li>
        <li>Chargebacks raised without first using our grievance process may result in account suspension pending resolution.</li>
      </ul>

      <h2>5. Content you upload</h2>
      <p>
        You retain ownership of reference images and designs you upload. You grant Tart a worldwide,
        non-exclusive, royalty-free licence to host, store, reproduce, resize and display that content
        strictly to operate, secure and improve the service. You warrant that you own or are licensed
        to upload every image you submit and that it does not infringe any third-party right.
      </p>

      <h2>6. Prohibited content and conduct</h2>
      <ul>
        <li>No unlawful, obscene, hateful, defamatory or infringing content.</li>
        <li>No images of identifiable people without their permission, and no content involving minors.</li>
        <li>No scraping, crawling, bulk download, reverse-engineering, or circumvention of access controls, rate limits or paywalls.</li>
        <li>No automated account creation, credential stuffing, or attempts to test the security of the platform without written authorisation.</li>
        <li>No off-platform solicitation intended to avoid Tart fees for bookings originating on Tart.</li>
        <li>No harassment of artists, clients or staff.</li>
      </ul>

      <h2>7. Artist obligations and indemnity</h2>
      <p>
        Artists must hold every licence and health/hygiene approval required in their jurisdiction,
        keep availability and pricing accurate, and honour accepted bookings. Artists indemnify and
        hold Tart harmless against any claim, loss, penalty or legal cost arising from their work,
        their premises, their staff, or their breach of law or of these Terms.
      </p>

      <h2>8. Moderation, suspension and termination</h2>
      <p>
        Tart may remove content, restrict features, suspend or permanently terminate any account at
        its sole discretion — with or without notice — where we reasonably believe there is fraud,
        abuse, risk to users, a legal requirement, repeated substantiated complaints, or a breach of
        these Terms. No refund is owed for the unused portion of a paid feature terminated for cause.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        The Tart name, logo, interface, design system, curated design boards, generated stencils, code
        and databases are owned by Tart or its licensors and are protected by the Copyright Act, 1957
        and the Trade Marks Act, 1999. Nothing in these Terms transfers any right in them to you.
      </p>

      <h2>10. Service availability</h2>
      <p>
        The service is provided "as is" and "as available". To the maximum extent permitted by law we
        disclaim all warranties, express or implied, including merchantability, fitness for a
        particular purpose, uninterrupted availability, and accuracy of artist-supplied information.
        We may modify, suspend or discontinue any feature at any time.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Tart, its founders, employees and contractors are not
        liable for indirect, incidental, special, punitive or consequential loss, loss of profit,
        goodwill or data, or for the outcome, quality, safety or health consequences of any tattoo or
        piercing performed by an artist booked through the platform. Where liability cannot be
        excluded, our aggregate liability to you is limited to the total fees you paid to Tart in the
        three months preceding the event giving rise to the claim, or ₹5,000, whichever is lower.
      </p>

      <h2>12. Your indemnity to us</h2>
      <p>
        You agree to indemnify and hold Tart harmless from any claim, demand, damage, penalty or legal
        cost arising out of your content, your use of the service, your breach of these Terms, or your
        violation of any law or third-party right.
      </p>

      <h2>13. Force majeure</h2>
      <p>
        Tart is not liable for any failure or delay caused by events beyond its reasonable control,
        including network or hosting outages, cyber-attack, government action, strikes, epidemics or
        natural disaster.
      </p>

      <h2>14. Changes to these Terms</h2>
      <p>
        We may update these Terms. Material changes will be notified in-app or by email at least seven
        days before taking effect. Continued use after that date is acceptance of the revised Terms.
      </p>

      <h2>15. Grievances, governing law and disputes</h2>
      <p>
        Raise any dispute first through our <a href="/grievance">Grievance Redressal Policy</a>; you
        agree to do so before commencing legal proceedings. These Terms are governed by the laws of
        India. Disputes not resolved through grievance redressal shall be referred to arbitration by a
        sole arbitrator under the Arbitration and Conciliation Act, 1996, seated in Bengaluru, in
        English. Subject to arbitration, courts at Bengaluru, Karnataka have exclusive jurisdiction.
      </p>

      <h2>16. Severability and entire agreement</h2>
      <p>
        If any clause is held unenforceable, the remainder stays in force. These Terms, together with
        the Privacy Policy and Grievance Redressal Policy, are the entire agreement between us.
      </p>

      <h2>17. Contact</h2>
      <p>
        Questions about these Terms: <a href={mailto("Terms of Service query")}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalLayout>
  </div>
);

export default TermsOfService;
