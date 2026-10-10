import Link from "next/link";
import type { Metadata } from "next";

import styles from "./Terms.module.css";
import policyStyles from "../../_components/PolicyPage.module.css";

export const metadata: Metadata = {
  title: "Membership Terms & Conditions | KASAR DIMENSIONS",
  description:
    "Official terms and conditions for the KASAR DIMENSIONS 1-Year ₹99 Club Membership and ₹150 order benefit.",
};

const LAST_UPDATED = "October 10, 2026";

const exampleRows = [
  { subtotal: "₹100", discount: "₹0", reason: "Subtotal is below ₹150." },
  { subtotal: "₹150", discount: "₹150", reason: "Eligible subtotal reaches the threshold." },
  { subtotal: "₹500", discount: "₹150", reason: "Discount capped at ₹150." },
  { subtotal: "₹1,000", discount: "₹150", reason: "Discount remains capped at ₹150." },
];

export default function MembershipTermsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Membership Terms</p>
        <h1 className={styles.title}>Membership Terms &amp; Conditions</h1>
        <p className={styles.lead}>
          Please read these terms to understand how the ₹99 Membership and ₹150 order benefit works.
        </p>
        <div className={policyStyles.metaRow}>
          <span className={policyStyles.metaBadge}>Last updated: {LAST_UPDATED}</span>
          <span className={policyStyles.metaBadge}>Membership: 1 Year (365 Days)</span>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>1. Membership</h2>
          <ul>
            <li>Membership costs ₹99.</li>
            <li>Membership is valid for 1 year from successful activation.</li>
            <li>Membership benefits become available only after successful payment and membership activation.</li>
            <li>One active membership applies to the customer&apos;s account according to the existing membership system.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. ₹150 Discount Eligibility</h2>
          <ul>
            <li>Members can receive up to ₹150 OFF on eligible orders.</li>
            <li>The eligible product subtotal must be ₹150 or more.</li>
            <li>If the eligible product subtotal is below ₹150, the membership discount does not apply.</li>
            <li>The discount cannot exceed ₹150.</li>
            <li>The discount cannot make the payable product amount negative.</li>
            <li>The membership discount is not applicable to the purchase of the membership itself.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. How the Discount Works</h2>
          <div className={styles.exampleGrid}>
            {exampleRows.map((row) => (
              <article key={row.subtotal} className={styles.exampleCard}>
                <div className={styles.exampleHeader}>
                  <span>Product subtotal</span>
                  <strong>{row.subtotal}</strong>
                </div>
                <div className={styles.exampleRow}>
                  <span>Membership discount</span>
                  <strong>{row.discount}</strong>
                </div>
                <p>{row.reason}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>4. Membership Validity</h2>
          <ul>
            <li>Membership remains valid for 1 year from activation.</li>
            <li>Once the membership expires, the ₹150 benefit is no longer available.</li>
            <li>Expired membership does not automatically renew.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Payment &amp; Activation</h2>
          <ul>
            <li>Membership is activated only after successful payment verification.</li>
            <li>A failed, cancelled or incomplete payment does not activate membership.</li>
            <li>Payment status is verified server-side.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Discount Restrictions</h2>
          <ul>
            <li>Membership benefits cannot be transferred to another account.</li>
            <li>Membership benefits cannot be exchanged for cash.</li>
            <li>Membership purchase itself is not eligible for the membership discount.</li>
            <li>The discount is applied according to the platform&apos;s eligible-order calculation.</li>
            <li>Only the server can determine the final eligible discount.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. Changes / Cancellation</h2>
          <p>
            Membership benefits and terms may be updated in the future where reasonably necessary, and
            the latest terms published on the website will apply to future use.
          </p>
        </section>

        <nav className={policyStyles.relatedNav} aria-label="Related studio policies">
          <span className={policyStyles.relatedNavTitle}>Related Policies</span>
          <div className={policyStyles.relatedLinks}>
            <Link href="/terms" className={policyStyles.relatedLink}>Terms &amp; Conditions</Link>
            <Link href="/privacy-policy" className={policyStyles.relatedLink}>Privacy Policy</Link>
            <Link href="/returns" className={policyStyles.relatedLink}>Returns &amp; Refund Policy</Link>
            <Link href="/shipping" className={policyStyles.relatedLink}>Shipping Policy</Link>
          </div>
        </nav>
      </div>

      <div className={styles.actions}>
        <Link href="/membership" className={styles.primaryAction}>
          Back to Membership
        </Link>
      </div>
    </main>
  );
}
