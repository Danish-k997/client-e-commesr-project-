import Link from "next/link";
import type { Metadata } from "next";

import { CONTACT_PHONE_URL, WHATSAPP_NUMBER, WHATSAPP_URL } from "../../lib/contact";
import styles from "../_components/PolicyPage.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | KASAR DIMENSIONS",
  description:
    "Learn how KASAR DIMENSIONS collects, uses, and protects your personal information, custom 3D design files, and order details.",
};

const LAST_UPDATED = "October 10, 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Privacy &amp; Data Protection</span>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.lead}>
          At KASAR DIMENSIONS, we respect your privacy and are committed to protecting the personal data
          and custom 3D design files you entrust with our studio.
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaBadge}>Last updated: {LAST_UPDATED}</span>
          <span className={styles.metaBadge}>Applies to: kasardimensions.com</span>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>1. Introduction &amp; Scope</h2>
          <p>
            This Privacy Policy outlines how KASAR DIMENSIONS (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the studio&rdquo;)
            collects, processes, and protects your information when you browse our website, purchase 3D-printed products,
            submit customized orders, or request bespoke additive manufacturing solutions.
          </p>
          <p>
            We strictly limit data collection to what is necessary to manufacture your orders, manage your account,
            and provide reliable customer support. We do not sell or rent your personal information to third-party marketers.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Information We Collect</h2>
          <p>We collect information you provide directly to us through account registration, order checkout, and custom design requests:</p>
          <ul>
            <li>
              <strong>Account Information:</strong> Your name, email address, and encrypted authentication credentials managed through our secure authentication system.
            </li>
            <li>
              <strong>Shipping &amp; Contact Details:</strong> Delivery address (full name, phone number, street address, city, state, pincode, and optional landmark) collected at checkout to ensure accurate courier delivery.
            </li>
            <li>
              <strong>Custom 3D Printing &amp; Design Files:</strong> Uploaded CAD models (STL, STEP, STP), reference images (JPG, PNG, WebP), technical drawings, and specifications (dimensions in mm, cm, or inches, and material requests) submitted via our Custom Request or Product Customization workflows.
            </li>
            <li>
              <strong>Order &amp; Transaction History:</strong> Records of items purchased, customization selections, order status, membership status, and payment references.
            </li>
            <li>
              <strong>Communications:</strong> Enquiries, feedback, and project consultations sent via WhatsApp or direct phone calls to our studio support line.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Payment Data Security</h2>
          <p>
            Payment transactions on KASAR DIMENSIONS are processed through our authorized payment gateway partner, <strong>Razorpay</strong>.
          </p>
          <div className={styles.highlightBox}>
            <strong>PCI-DSS Compliant Payments:</strong> KASAR DIMENSIONS never collects, processes, or stores your credit/debit card numbers, UPI PINs, or net banking passwords on our servers. All sensitive financial transactions occur securely on Razorpay&apos;s encrypted infrastructure. We only receive verification tokens, payment status, and transaction IDs required to confirm your order.
          </div>
        </section>

        <section className={styles.section}>
          <h2>4. How We Use Your Information</h2>
          <p>Your data is used strictly for legitimate commercial and operational purposes:</p>
          <ul>
            <li>To process, fabricate, and deliver your 3D printed products and bespoke orders.</li>
            <li>To evaluate custom requests, analyze 3D printability, and communicate technical quotes or progress updates.</li>
            <li>To manage your customer account and administer the 1-Year ₹99 Club Membership savings automatically at checkout.</li>
            <li>To send transactional emails (account verification, order confirmation, and dispatch notifications).</li>
            <li>To provide personalized support via WhatsApp and phone regarding design reviews or delivery questions.</li>
            <li>To comply with statutory accounting, tax, and consumer protection requirements under applicable Indian laws.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Third-Party Service Providers</h2>
          <p>
            We partner only with reputable technology providers necessary to run our ecommerce storefront and fabrication operations:
          </p>
          <div className={styles.gridTwo}>
            <article className={styles.card}>
              <strong>Razorpay</strong>
              <p>Payment gateway handling secure domestic UPI, card, and netbanking transactions.</p>
            </article>
            <article className={styles.card}>
              <strong>Cloudinary</strong>
              <p>Encrypted cloud storage for reference photographs and custom design uploads.</p>
            </article>
            <article className={styles.card}>
              <strong>Resend</strong>
              <p>Email delivery service for transactional notices and account verification.</p>
            </article>
            <article className={styles.card}>
              <strong>Delivery Partners</strong>
              <p>Domestic logistics and courier services receiving only destination shipping addresses for physical order delivery.</p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <h2>6. Intellectual Property in Custom Files</h2>
          <p>
            You retain all ownership rights in the sketches, ideas, 3D models (STL/STEP), and images you submit for custom fabrication.
            KASAR DIMENSIONS uses your uploaded files solely to evaluate, prepare, slice, and 3D print your requested items.
            We will not sell or share your proprietary design files with unrelated third parties.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Data Retention &amp; Security</h2>
          <p>
            We implement industry-standard safeguards including HTTPS encryption in transit, server-authoritative authentication,
            and restricted database access to protect your personal information against unauthorized access or disclosure.
          </p>
          <p>
            Order records and associated transaction metadata are retained for the duration required by applicable commercial and tax regulations.
            Temporary reference uploads for cancelled or unfulfilled inquiries are periodically purged.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Your Privacy Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal information stored in your account profile.</li>
            <li>Update or correct your contact and delivery addresses.</li>
            <li>Request deletion of your account and personal data, subject to legal record-keeping obligations.</li>
            <li>Enquire about how your custom manufacturing files are handled or stored.</li>
          </ul>
          <p>
            To exercise any of these rights, contact us on WhatsApp at <strong>+91 {WHATSAPP_NUMBER}</strong> or call <strong>+91 {WHATSAPP_NUMBER}</strong>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Policy Updates</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect operational or legal enhancements.
            Any revisions will be posted on this page with an updated &ldquo;Last updated&rdquo; date.
          </p>
        </section>

        <nav className={styles.relatedNav} aria-label="Related studio policies">
          <span className={styles.relatedNavTitle}>Related Policies</span>
          <div className={styles.relatedLinks}>
            <Link href="/terms" className={styles.relatedLink}>Terms &amp; Conditions</Link>
            <Link href="/returns" className={styles.relatedLink}>Returns &amp; Refund Policy</Link>
            <Link href="/shipping" className={styles.relatedLink}>Shipping Policy</Link>
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
            Privacy Enquiries on WhatsApp
          </a>
          <a href={CONTACT_PHONE_URL} className={styles.secondaryAction}>
            Call Studio: +91 {WHATSAPP_NUMBER}
          </a>
        </div>
      </div>
    </main>
  );
}
