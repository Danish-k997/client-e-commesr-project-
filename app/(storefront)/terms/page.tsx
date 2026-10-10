import Link from "next/link";
import type { Metadata } from "next";

import { CONTACT_PHONE_URL, WHATSAPP_NUMBER, WHATSAPP_URL } from "../../lib/contact";
import styles from "../_components/PolicyPage.module.css";

export const metadata: Metadata = {
  title: "Terms & Conditions | KASAR DIMENSIONS",
  description:
    "Read the terms of service, custom 3D printing guidelines, ordering rules, and conditions for KASAR DIMENSIONS.",
};

const LAST_UPDATED = "October 10, 2026";

export default function TermsAndConditionsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Legal Agreement</span>
        <h1 className={styles.title}>Terms &amp; Conditions</h1>
        <p className={styles.lead}>
          Welcome to KASAR DIMENSIONS. These terms govern your use of our storefront, digital services,
          and custom 3D printing fabrication orders.
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaBadge}>Last updated: {LAST_UPDATED}</span>
          <span className={styles.metaBadge}>Jurisdiction: India</span>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using the KASAR DIMENSIONS website (&ldquo;kasardimensions.com&rdquo;) and purchasing our products or commissioning custom 3D fabrication services, you agree to be bound by these Terms &amp; Conditions.
          </p>
          <p>
            If you do not agree with any part of these terms, you should not access the website or place orders with our studio.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Services &amp; Product Types</h2>
          <p>KASAR DIMENSIONS operates an additive manufacturing and design studio offering three distinct product experiences:</p>
          <ul>
            <li>
              <strong>Ready-to-Ship &amp; Catalog Products:</strong> Pre-designed 3D printed models, decor, and accessories available directly from our collection.
            </li>
            <li>
              <strong>Customizable Products:</strong> Studio catalog products that allow customer-specified personalisation options, such as custom engraved text, selected color combinations, custom dimensions, or reference photo uploads.
            </li>
            <li>
              <strong>Fully Custom Requests:</strong> Bespoke engineering and fabrication projects initiated via our Custom Request workflow where clients submit their own sketches, 3D CAD files (STL, STEP, STP), replacement part requirements, or novel product concepts for custom quotation and manufacturing.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Ordering, Pricing &amp; Payments</h2>
          <ul>
            <li>All product prices and fees are stated in Indian Rupees (INR).</li>
            <li>
              Our backend systems are authoritative for prices, stock availability, delivery charges, and applicable membership discounts. Any display discrepancies resulting from client-side caching will be resolved using authoritative server pricing before checkout completion.
            </li>
            <li>
              Payment is processed securely through <strong>Razorpay</strong> via domestic UPI, net banking, debit cards, or credit cards. Orders are confirmed only upon successful payment verification.
            </li>
            <li>
              We reserve the right to decline or cancel an order in cases of technical pricing errors, payment fraud suspicion, or unfeasible 3D printability. If an order is cancelled by the studio, a full refund is issued promptly.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. 3D Printing &amp; Manufacturing Characteristics</h2>
          <p>
            Our products are manufactured using professional Additive Manufacturing (3D Printing) techniques.
            Please understand the physical characteristics inherent to this technology:
          </p>
          <div className={styles.highlightBox}>
            <strong>Additive Layer Lines &amp; Tolerances:</strong> 3D printed objects are built layer-by-layer. Visible microscopic layer lines, minor surface texture variances, and standard dimensional tolerances of ±0.2 mm to ±0.5 mm are normal physical properties of additive fabrication and do not constitute manufacturing defects.
          </div>
          <p>
            Color representation may vary slightly across different screen displays and filament production batches. Material temperature limits (e.g. standard PLA softening above 55°C) should be observed as indicated in product care guides.
          </p>
        </section>

        <section className={section5Class(styles)}>
          <h2>5. Custom Requests &amp; Uploaded Content</h2>
          <p>When uploading reference images, logos, text, or 3D models (STL/STEP) to our platform:</p>
          <ul>
            <li>
              You represent and warrant that you own or possess all necessary rights, licenses, and permissions to use and authorize us to print the submitted designs.
            </li>
            <li>
              You agree not to upload content that infringes upon third-party intellectual property rights, copyrights, trademarks, or patents.
            </li>
            <li>
              You agree not to submit files for manufacturing weapons, hazardous implements, or items prohibited by Indian law.
            </li>
            <li>
              Once manufacturing or material slicing has commenced for a custom or personalized order, specifications cannot be modified and orders cannot be cancelled due to change of mind.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Membership Privileges</h2>
          <p>
            Customers may choose to activate our <strong>1-Year ₹99 Club Membership</strong>.
            Membership privileges include up to ₹150 OFF on every eligible order with a product subtotal of ₹150 or more for 365 days from activation.
          </p>
          <p>
            Membership purchase itself is not discountable, does not auto-renew, and cannot be exchanged for cash.
            For full rules and examples, see our dedicated <Link href="/membership/terms" style={{ color: "var(--text)", fontWeight: 700, textDecoration: "underline" }}>Membership Policy</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Shipping &amp; Delivery</h2>
          <p>
            Shipping fees (Free or Paid) and delivery estimates are computed during checkout.
            Because our items are fabricated on-demand, manufacturing lead time typically ranges from 2 to 5 business days, followed by domestic courier transit.
            Detailed information is set out in our <Link href="/shipping" style={{ color: "var(--text)", fontWeight: 700, textDecoration: "underline" }}>Shipping Policy</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Returns, Replacements &amp; Refunds</h2>
          <p>
            Because customized and fully custom-made products are fabricated according to customer-specific requirements, they are not eligible for return or exchange due to a change of mind.
          </p>
          <p>
            If an item arrives damaged in transit or possesses a verifiable defect, customers must notify us within 48 hours of delivery with photographic evidence.
            Full details and customer statutory rights are documented in our <Link href="/returns" style={{ color: "var(--text)", fontWeight: 700, textDecoration: "underline" }}>Returns &amp; Refund Policy</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Intellectual Property of Studio</h2>
          <p>
            All trademarks, logos, brand names (&ldquo;KASAR DIMENSIONS&rdquo;), proprietary 3D catalog models, website UI, graphics, and code are the exclusive intellectual property of KASAR DIMENSIONS. You may not reproduce, duplicate, or exploit any studio catalog assets without explicit written authorization.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Limitation of Liability &amp; Governing Law</h2>
          <p>
            To the maximum extent permitted by applicable Indian law, KASAR DIMENSIONS shall not be liable for indirect, incidental, or consequential damages resulting from the use or inability to use our products or services.
          </p>
          <p>
            These Terms &amp; Conditions are governed by and construed in accordance with the laws of India. Any disputes arising out of or related to these terms shall be subject to the exclusive jurisdiction of the competent courts in India.
          </p>
        </section>

        <nav className={styles.relatedNav} aria-label="Related studio policies">
          <span className={styles.relatedNavTitle}>Related Policies</span>
          <div className={styles.relatedLinks}>
            <Link href="/privacy-policy" className={styles.relatedLink}>Privacy Policy</Link>
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
            Have Questions? Contact on WhatsApp
          </a>
          <a href={CONTACT_PHONE_URL} className={styles.secondaryAction}>
            Call Studio: +91 {WHATSAPP_NUMBER}
          </a>
        </div>
      </div>
    </main>
  );
}

function section5Class(s: Record<string, string>) {
  return s.section;
}
