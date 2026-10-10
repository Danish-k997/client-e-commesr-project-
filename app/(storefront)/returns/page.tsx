import Link from "next/link";
import type { Metadata } from "next";

import { CONTACT_PHONE_URL, WHATSAPP_NUMBER, WHATSAPP_URL } from "../../lib/contact";
import styles from "../_components/PolicyPage.module.css";

export const metadata: Metadata = {
  title: "Returns & Refund Policy | KASAR DIMENSIONS",
  description:
    "Review our returns, replacement, and refund terms for 3D printed catalog products, custom requests, and damaged item claims.",
};

const LAST_UPDATED = "October 10, 2026";

export default function ReturnsAndRefundPolicyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Studio Guarantee</span>
        <h1 className={styles.title}>Returns &amp; Refund Policy</h1>
        <p className={styles.lead}>
          We take immense pride in every 3D printed piece fabricated in our studio.
          Please review our clear guidelines on returns, exchanges, damaged items, and refund processing.
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaBadge}>Last updated: {LAST_UPDATED}</span>
          <span className={styles.metaBadge}>Support Window: 48 hours for transit issues</span>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>1. Custom-Made &amp; Personalized Products</h2>
          <div className={styles.highlightBox}>
            &ldquo;Customized and fully custom-made products are not eligible for return or exchange due to a change of mind, because they are made or configured according to the customer&apos;s requirements.&rdquo;
          </div>
          <p>
            Because personalized products (featuring your custom names, uploaded photos, specific dimensions, or custom color combinations) and bespoke 3D CAD fabrication requests cannot be re-stocked or resold to other customers, all custom sales are final once printing commences.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Damaged, Defective, or Incorrectly Supplied Products</h2>
          <p>
            If your order arrives damaged during transit, suffers from a manufacturing defect, or is not the item you ordered, we will make it right immediately at zero extra cost to you.
          </p>
          <h3>How to Report an Issue:</h3>
          <ol>
            <li>
              <strong>Report within 48 Hours:</strong> Contact our studio team on WhatsApp at <strong>+91 {WHATSAPP_NUMBER}</strong> within 48 hours of courier delivery.
            </li>
            <li>
              <strong>Provide Order &amp; Photo Evidence:</strong> Share your Order ID along with 2–3 clear photos or a short video showing the outer shipping box, courier label, and the specific damage or defect on the 3D printed product.
            </li>
            <li>
              <strong>Studio Review:</strong> Our technical team will review the photos and confirm the issue within 24 hours.
            </li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>3. Resolution &amp; Refund Options</h2>
          <p>Once a defect, transit damage, or incorrect item delivery is confirmed, you may choose:</p>
          <div className={styles.gridTwo}>
            <article className={styles.card}>
              <strong>1. Complimentary Priority Reprint</strong>
              <p>We will immediately fabricate a brand-new replacement piece and dispatch it with expedited courier shipping at our expense.</p>
            </article>
            <article className={styles.card}>
              <strong>2. 100% Full Refund</strong>
              <p>A complete refund including any shipping charges paid will be reversed directly to your original payment method via Razorpay.</p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <h2>4. Standard (Non-Customized) Catalog Products</h2>
          <p>
            For standard, non-personalized catalog products purchased without any custom parameters:
          </p>
          <ul>
            <li>You may request a return within <strong>7 calendar days</strong> of delivery.</li>
            <li>The item must be unused, in its original protective packaging, and in saleable condition.</li>
            <li>
              Return shipping for change-of-mind returns on non-customized goods is borne by the customer, or a reverse-pickup fee may be deducted from the refund.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Refund Timeline &amp; Method</h2>
          <ul>
            <li>
              <strong>Refund Processing:</strong> Approved refunds are initiated by KASAR DIMENSIONS within <strong>24 to 48 hours</strong> of verification.
            </li>
            <li>
              <strong>Bank Credit Timeline:</strong> Depending on your banking institution, funds typically reflect in your account within <strong>5 to 7 business days</strong> via Razorpay.
            </li>
            <li>
              <strong>Membership Discount Treatment:</strong> If a membership discount was applied to an order that is partially refunded, the refund will be calculated proportionally based on the net payable amount paid.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Statutory Consumer Rights</h2>
          <p>
            Nothing in this Returns &amp; Refund Policy is intended to exclude, restrict, or modify any non-excludable statutory consumer rights, guarantees, or remedies available to you under applicable consumer protection legislation in India.
          </p>
        </section>

        <nav className={styles.relatedNav} aria-label="Related studio policies">
          <span className={styles.relatedNavTitle}>Related Policies</span>
          <div className={styles.relatedLinks}>
            <Link href="/terms" className={styles.relatedLink}>Terms &amp; Conditions</Link>
            <Link href="/shipping" className={styles.relatedLink}>Shipping Policy</Link>
            <Link href="/privacy-policy" className={styles.relatedLink}>Privacy Policy</Link>
            <Link href="/membership/terms" className={styles.relatedLink}>Membership Policy</Link>
          </div>
        </nav>

        <div className={styles.actions}>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.primaryAction}
          >
            Report Damage or Defect on WhatsApp
          </a>
          <a href={CONTACT_PHONE_URL} className={styles.secondaryAction}>
            Call Studio: +91 {WHATSAPP_NUMBER}
          </a>
        </div>
      </div>
    </main>
  );
}
