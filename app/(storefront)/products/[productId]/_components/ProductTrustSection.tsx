"use client";

import styles from "./ProductTrustSection.module.css";

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

function StudioIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m21.12 6.4-6-3.7a3.52 3.52 0 0 0-3.66 0l-6 3.7A3.48 3.48 0 0 0 3.5 9.42v5.16a3.48 3.48 0 0 0 1.96 3.02l6 3.7a3.52 3.52 0 0 0 3.66 0l6-3.7a3.48 3.48 0 0 0 1.96-3.02V9.42a3.48 3.48 0 0 0-1.96-3.02Z" />
      <path d="m3.8 8.6 8.2 4.9 8.2-4.9" />
      <path d="M12 13.5V22" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Compact trust indicator placed right below purchase CTAs.
 * Gives immediate assurance at the point of action without visual clutter.
 */
export function ProductTrustPill() {
  const scrollToCredentials = () => {
    const target = document.getElementById("studio-credentials");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={styles["trust-pill"]} role="region" aria-label="Business credentials overview">
      <div className={styles["trust-pill-info"]}>
        <span className={styles["trust-pill-icon"]} aria-hidden="true">
          <ShieldCheckIcon />
        </span>
        <div className={styles["trust-pill-text"]}>
          <strong>GST &amp; MSME Registered Studio</strong>
          <span>Crafted in Ranchi, Jharkhand</span>
        </div>
      </div>
      <button
        type="button"
        className={styles["trust-pill-action"]}
        onClick={scrollToCredentials}
        aria-label="Scroll to official studio credentials"
      >
        <span>Credentials</span>
        <ArrowDownIcon />
      </button>
    </div>
  );
}

/**
 * Comprehensive credentials panel placed below Product Details & Specifications.
 * Provides transparent, verifiable proof of business registration and direct maker authenticity.
 */
export function ProductCredentialsSection() {
  return (
    <section
      id="studio-credentials"
      className={styles["credentials-section"]}
      aria-labelledby="credentials-heading"
    >
      <header className={styles["credentials-header"]}>
        <div className={styles["credentials-tag"]}>
          <span className={styles["credentials-tag-dot"]} aria-hidden="true" />
          <span>VERIFIED BUSINESS CREDENTIALS</span>
        </div>
        <h2 id="credentials-heading" className={styles["credentials-title"]}>
          Crafted In-House. Officially Registered.
        </h2>
        <p className={styles["credentials-subtitle"]}>
          Every product is designed, 3D printed, inspected, and dispatched directly from our
          registered fabrication studio in Ranchi, Jharkhand.
        </p>
      </header>

      <div className={styles["credentials-grid"]}>
        {/* Card 1: GST Registration */}
        <article className={styles["credential-card"]}>
          <div className={styles["card-top"]}>
            <div className={styles["card-icon"]} aria-hidden="true">
              <ShieldCheckIcon />
            </div>
            <span className={`${styles["card-badge"]} ${styles["badge-green"]}`}>
              <span className={styles["badge-dot"]} />
              Active Taxpayer
            </span>
          </div>

          <div className={styles["card-content"]}>
            <span className={styles["card-category"]}>TAX COMPLIANCE</span>
            <h3 className={styles["card-title"]}>GST Registered</h3>
            <div className={styles["card-identifier"]}>
              <span className={styles["id-label"]}>GSTIN</span>
              <strong className={styles["id-value"]}>20KIRPK6636R1ZA</strong>
            </div>
            <p className={styles["card-description"]}>
              Registered taxpayer under trade name <strong>KASAR DIMENSIONS</strong>. Official tax invoices
              with valid GST breakdown provided for all orders.
            </p>
          </div>
        </article>

        {/* Card 2: MSME / Udyam */}
        <article className={styles["credential-card"]}>
          <div className={styles["card-top"]}>
            <div className={styles["card-icon"]} aria-hidden="true">
              <CertificateIcon />
            </div>
            <span className={`${styles["card-badge"]} ${styles["badge-lime"]}`}>
              <span className={styles["badge-dot"]} />
              Govt. Registered
            </span>
          </div>

          <div className={styles["card-content"]}>
            <span className={styles["card-category"]}>GOVT. OF INDIA</span>
            <h3 className={styles["card-title"]}>MSME Micro Enterprise</h3>
            <div className={styles["card-identifier"]}>
              <span className={styles["id-label"]}>UDYAM</span>
              <strong className={styles["id-value"]}>UDYAM-JH-19-0023565</strong>
            </div>
            <p className={styles["card-description"]}>
              Certified Micro Enterprise with the Ministry of MSME for polymer &amp; plastic products
              manufacturing under manufacturing unit <strong>Kasar Dimensions</strong>.
            </p>
          </div>
        </article>

        {/* Card 3: Fabrication Studio & Direct Dispatch */}
        <article className={styles["credential-card"]}>
          <div className={styles["card-top"]}>
            <div className={styles["card-icon"]} aria-hidden="true">
              <StudioIcon />
            </div>
            <span className={`${styles["card-badge"]} ${styles["badge-dark"]}`}>
              <span className={styles["badge-dot"]} />
              Studio Direct
            </span>
          </div>

          <div className={styles["card-content"]}>
            <span className={styles["card-category"]}>FABRICATION STUDIO</span>
            <h3 className={styles["card-title"]}>Made in Ranchi, JH</h3>
            <div className={styles["card-identifier"]}>
              <span className={styles["id-label"]}>PRODUCTION</span>
              <strong className={styles["id-value"]}>100% In-House Build</strong>
            </div>
            <p className={styles["card-description"]}>
              Direct maker workshop — zero middlemen or third-party dropshipping. Every model is
              3D printed with micron precision and individually quality-verified before shipping.
            </p>
          </div>
        </article>
      </div>

      <footer className={styles["credentials-footer"]}>
        <p>
          Legal Entity: <strong>Kasar Dimensions</strong> (Proprietorship entity of Ritik Roshan Kumar).
          Operating out of Ranchi, Jharkhand. For custom fabrication queries, reach our direct studio line on WhatsApp.
        </p>
      </footer>
    </section>
  );
}
