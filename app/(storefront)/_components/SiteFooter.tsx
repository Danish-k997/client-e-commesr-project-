import Link from "next/link";

import { INSTAGRAM_URL, WHATSAPP_NUMBER, WHATSAPP_URL } from "../../lib/contact";
import styles from "./SiteFooter.module.css";

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* Column 1: Brand */}
          <section className={styles.brand} aria-labelledby="footer-brand-title">
            <Link className={styles.wordmark} href="/" id="footer-brand-title">
              KASAR DIMENSIONS
            </Link>
            <p className={styles.tagline}>
              Custom 3D-printed products, personalised designs and made-to-order fabrication built around your ideas.
            </p>
            <div className={styles.socialList} aria-label="Social channels">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="Follow KASAR DIMENSIONS on Instagram"
              >
                <InstagramIcon />
                <span>Instagram</span>
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="Chat with KASAR DIMENSIONS on WhatsApp"
              >
                <WhatsAppIcon />
                <span>WhatsApp</span>
              </a>
            </div>
          </section>

          {/* Column 2: Shop */}
          <nav className={styles.column} aria-labelledby="footer-shop-title">
            <h2 id="footer-shop-title" className={styles.columnTitle}>Shop</h2>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link href="/shop" className={styles.link}>
                  All Products
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/#categories" className={styles.link}>
                  Categories
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/#bestsellers" className={styles.link}>
                  Bestsellers
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/shop?customizable=true" className={styles.link}>
                  Customizable Products
                </Link>
              </li>
            </ul>
          </nav>

          {/* Column 3: Account & Custom */}
          <nav className={styles.column} aria-labelledby="footer-account-title">
            <h2 id="footer-account-title" className={styles.columnTitle}>Account &amp; Orders</h2>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link href="/account" className={styles.link}>
                  My Account
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/addresses" className={styles.link}>
                  Saved Addresses
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/membership" className={styles.link}>
                  ₹99 Club Membership
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/custom-request" className={styles.link}>
                  Custom 3D Request
                </Link>
              </li>
            </ul>
          </nav>

          {/* Column 4: Help & Contact */}
          <nav className={styles.column} aria-labelledby="footer-help-title">
            <h2 id="footer-help-title" className={styles.columnTitle}>Help &amp; Contact</h2>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link href="/contact" className={styles.link}>
                  Contact
                </Link>
              </li>
              <li className={styles.linkItem}>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                  title={`WhatsApp: +91 ${WHATSAPP_NUMBER}`}
                >
                  WhatsApp Number
                </a>
              </li>
              <li className={styles.linkItem}>
                <Link href="/shipping" className={styles.link}>
                  Shipping Policy
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/returns" className={styles.link}>
                  Returns &amp; Refund Policy
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/privacy-policy" className={styles.link}>
                  Privacy Policy
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/terms" className={styles.link}>
                  Terms &amp; Conditions
                </Link>
              </li>
              <li className={styles.linkItem}>
                <Link href="/membership/terms" className={styles.link}>
                  Membership Policy
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Footer bottom bar */}
        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {currentYear} KASAR DIMENSIONS. All rights reserved.
          </p>
          <nav className={styles.bottomNav} aria-label="Legal information">
            <Link href="/privacy-policy" className={styles.bottomLink}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={styles.bottomLink}>
              Terms &amp; Conditions
            </Link>
            <Link href="/returns" className={styles.bottomLink}>
              Returns &amp; Refund Policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
