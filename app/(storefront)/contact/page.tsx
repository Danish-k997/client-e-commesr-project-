import Link from "next/link";
import type { Metadata } from "next";

import {
  CONTACT_PHONE_URL,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  WHATSAPP_NUMBER,
  WHATSAPP_URL,
} from "../../lib/contact";
import styles from "../_components/PolicyPage.module.css";

export const metadata: Metadata = {
  title: "Contact Us | KASAR DIMENSIONS",
  description:
    "Get in touch with KASAR DIMENSIONS for custom 3D printing consultations, order inquiries, bespoke CAD modeling, and studio support.",
};

export default function ContactPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>Studio Support</span>
        <h1 className={styles.title}>Contact Us</h1>
        <p className={styles.lead}>
          Have a question about a 3D printed piece, want to discuss a custom design idea, or need an update on your order?
          We are here to help.
        </p>
        <div className={styles.metaRow}>
          <span className={styles.metaBadge}>Support Hours: Mon – Sat, 10:00 AM – 7:00 PM IST</span>
          <span className={styles.metaBadge}>Fastest Response: WhatsApp</span>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>Direct Contact Channels</h2>
          <p>
            Connect directly with our fabrication engineers and customer care team:
          </p>

          <div className={styles.gridTwo}>
            <article className={styles.card}>
              <strong>WhatsApp Business Support</strong>
              <p>Chat directly for rapid quotes, reference photo sharing, and order status updates.</p>
              <div style={{ marginTop: "10px" }}>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.primaryAction}
                  style={{ minWidth: "100%", padding: "0.75rem 1rem", fontSize: "0.9rem" }}
                >
                  Chat on WhatsApp: +91 {WHATSAPP_NUMBER}
                </a>
              </div>
            </article>

            <article className={styles.card}>
              <strong>Telephone Enquiries</strong>
              <p>Call our studio support line during operating hours (10:00 AM – 7:00 PM IST).</p>
              <div style={{ marginTop: "10px" }}>
                <a
                  href={CONTACT_PHONE_URL}
                  className={styles.secondaryAction}
                  style={{ minWidth: "100%", padding: "0.75rem 1rem", fontSize: "0.9rem" }}
                >
                  Call Now: +91 {WHATSAPP_NUMBER}
                </a>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Social Channels</h2>
          <p>
            Follow KASAR DIMENSIONS on Instagram to view recent customer prints, fabrication timelapses, and studio releases:
          </p>
          <div style={{ marginTop: "12px" }}>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryAction}
              style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
              <span>Follow @{INSTAGRAM_HANDLE} on Instagram</span>
            </a>
          </div>
        </section>

        <section className={styles.section}>
          <h2>What Are You Looking For?</h2>
          <div className={styles.gridTwo}>
            <article className={styles.card}>
              <strong>Want a New Design from Scratch?</strong>
              <p>Have an original idea, photo, sketch, or replacement part requirement? Submit your CAD model or images directly through our dedicated form.</p>
              <div style={{ marginTop: "12px" }}>
                <Link
                  href="/custom-request"
                  className={styles.relatedLink}
                  style={{ display: "inline-block" }}
                >
                  Submit Fully Custom Request →
                </Link>
              </div>
            </article>

            <article className={styles.card}>
              <strong>Personalise an Existing Product?</strong>
              <p>Browse our collection of 3D printed creations configured for custom text engraving, specific dimensions, and customer options.</p>
              <div style={{ marginTop: "12px" }}>
                <Link
                  href="/shop?customizable=true"
                  className={styles.relatedLink}
                  style={{ display: "inline-block" }}
                >
                  Browse Customizable Products →
                </Link>
              </div>
            </article>
          </div>
        </section>

        <nav className={styles.relatedNav} aria-label="Related studio policies">
          <span className={styles.relatedNavTitle}>Studio Policies</span>
          <div className={styles.relatedLinks}>
            <Link href="/terms" className={styles.relatedLink}>Terms &amp; Conditions</Link>
            <Link href="/privacy-policy" className={styles.relatedLink}>Privacy Policy</Link>
            <Link href="/returns" className={styles.relatedLink}>Returns &amp; Refund Policy</Link>
            <Link href="/shipping" className={styles.relatedLink}>Shipping Policy</Link>
            <Link href="/membership/terms" className={styles.relatedLink}>Membership Policy</Link>
          </div>
        </nav>
      </div>
    </main>
  );
}
