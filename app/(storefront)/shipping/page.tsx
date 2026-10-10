import Link from "next/link";
import type { Metadata } from "next";

import { CONTACT_PHONE_URL, WHATSAPP_NUMBER, WHATSAPP_URL } from "../../lib/contact";
import styles from "../_components/PolicyPage.module.css";

export const metadata: Metadata = {
  title: "Shipping Policy | KASAR DIMENSIONS",
  description:
    "Learn about our 3D printing manufacturing timelines, shipping fees, courier delivery estimates across India, and tracking.",
};

const LAST_UPDATED = "October 10, 2026";

export default function ShippingPolicyPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Logistics &amp; Dispatch</span>
        <h1 className={styles.title}>Shipping Policy</h1>
        <p className={styles.lead}>
          Every KASAR DIMENSIONS product is custom-fabricated with precision.
          Here is how we handle 3D printing lead times, shipping charges, courier transit, and order delivery.
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaBadge}>Last updated: {LAST_UPDATED}</span>
          <span className={styles.metaBadge}>Delivery Coverage: All Serviceable Pincodes in India</span>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>1. Manufacturing &amp; Fabrication Lead Times</h2>
          <p>
            Unlike mass-market retail, KASAR DIMENSIONS is an on-demand additive manufacturing studio.
            Each piece is 3D printed, cleaned, cured or post-processed, and quality-inspected before dispatch.
          </p>
          <div className={styles.gridTwo}>
            <article className={styles.card}>
              <strong>Standard Catalog Products</strong>
              <p>Fabrication and packaging typically takes <strong>1 to 3 business days</strong>.</p>
            </article>
            <article className={styles.card}>
              <strong>Personalized Custom Products</strong>
              <p>Text engraving, color changes, and photo prep take <strong>2 to 4 business days</strong>.</p>
            </article>
            <article className={styles.card}>
              <strong>Fully Custom 3D Requests</strong>
              <p>CAD model review, slicing, and multi-hour print cycles take <strong>3 to 6 business days</strong>.</p>
            </article>
            <article className={styles.card}>
              <strong>Batch / Multiple Quantities</strong>
              <p>Orders with multiple units are scheduled consecutively; timeline confirmed upon order.</p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <h2>2. Shipping Charges &amp; Calculations</h2>
          <p>
            Shipping charges on KASAR DIMENSIONS are determined transparently on a product-by-product basis:
          </p>
          <ul>
            <li>
              <strong>Free Shipping Products:</strong> Many studio catalog products are configured with free domestic shipping, with zero delivery fee at checkout.
            </li>
            <li>
              <strong>Paid Delivery Products:</strong> Oversized, delicate, or specialty items carry a specific line-item delivery fee calculated authoritatively by our server during checkout before payment.
            </li>
            <li>
              <strong>Authoritative Quote:</strong> The exact total delivery charge is always displayed clearly in your order summary before you confirm payment.
            </li>
            <li>
              <strong>Membership Terms:</strong> Membership discounts apply to eligible product subtotals; delivery fees remain non-discountable.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Courier Transit &amp; Delivery Estimates</h2>
          <p>
            Once fabrication is complete and your parcel passes our precision inspection, it is handed over to our domestic logistics partners.
          </p>
          <ul>
            <li>
              <strong>Metro Cities (Delhi, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad, Pune):</strong> Typically <strong>2 to 4 business days</strong> following dispatch.
            </li>
            <li>
              <strong>Rest of India (Tier 2 &amp; Tier 3 Cities):</strong> Typically <strong>3 to 7 business days</strong> following dispatch.
            </li>
            <li>
              <strong>Remote or Special Regions:</strong> May take <strong>7 to 10 business days</strong> depending on local carrier serviceability.
            </li>
          </ul>
          <p style={{ marginTop: "12px", fontSize: "0.88rem", color: "var(--text-muted)" }}>
            * Delivery estimates are provided in good faith based on courier performance and are not guaranteed arrival deadlines.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Address Accuracy &amp; Pincode Verification</h2>
          <p>
            To prevent delays or misrouting:
          </p>
          <ul>
            <li>Ensure your 6-digit postal pincode, complete street address, and active mobile phone number are accurate at checkout.</li>
            <li>Couriers may contact you via SMS or phone call prior to attempted delivery.</li>
            <li>If a package is returned to our studio due to an incorrect address or repeated failure to receive, re-shipping fees will apply.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. Tracking Your Order</h2>
          <p>
            When your order is dispatched, tracking details and airway bill numbers are shared via WhatsApp or email.
            You can also view live order progress at any time by logging into your account on our website.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Potential Delays</h2>
          <p>
            While we strive for prompt dispatch, occasional delays can arise from:
          </p>
          <ul>
            <li>Inclement weather conditions, regional transport restrictions, or peak festival holiday surges.</li>
            <li>Complex 3D prints that fail initial tolerance inspections and require a studio reprint for quality assurance.</li>
            <li>Delays in receiving required design clarifications or reference image confirmations from the customer.</li>
          </ul>
          <p>
            If any unexpected delay occurs during fabrication, our studio team will proactively notify you via WhatsApp.
          </p>
        </section>

        <nav className={styles.relatedNav} aria-label="Related studio policies">
          <span className={styles.relatedNavTitle}>Related Policies</span>
          <div className={styles.relatedLinks}>
            <Link href="/terms" className={styles.relatedLink}>Terms &amp; Conditions</Link>
            <Link href="/returns" className={styles.relatedLink}>Returns &amp; Refund Policy</Link>
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
            Track Order on WhatsApp
          </a>
          <a href={CONTACT_PHONE_URL} className={styles.secondaryAction}>
            Call Studio: +91 {WHATSAPP_NUMBER}
          </a>
        </div>
      </div>
    </main>
  );
}
