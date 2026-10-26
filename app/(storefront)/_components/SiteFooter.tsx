"use client";

import Link from "next/link";

import { INSTAGRAM_URL, WHATSAPP_NUMBER, WHATSAPP_URL } from "../../lib/contact";
import { useFestivalTheme } from "./FestivalThemeProvider";
import DiwaliHeroMotif from "./DiwaliHeroMotif";
import RangoliMotif from "./RangoliMotif";
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
  const festivalTheme = useFestivalTheme();
  const isFestivalActive = Boolean(festivalTheme?.isActive && festivalTheme.preset !== "DEFAULT");
  const isDiwaliActive = isFestivalActive && festivalTheme?.preset === "DIWALI";
  const showDecorations = isFestivalActive && festivalTheme?.enableDecorations;

  return (
    <footer className={styles.footer}>
      {/* Diwali Festive Brand Chapter Banner */}
      {isDiwaliActive && showDecorations && (
        <div className={styles.festiveBand} aria-label="Diwali Festive Season">
          {/* Decorative Toran / Bandhanwar Arch Pattern */}
          <div className={styles.festiveToran} aria-hidden="true">
            <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className={styles.festiveToranSvg}>
              <path
                d="M0 0 Q50 20 100 0 Q150 20 200 0 Q250 20 300 0 Q350 20 400 0 Q450 20 500 0 Q550 20 600 0 Q650 20 700 0 Q750 20 800 0 Q850 20 900 0 Q950 20 1000 0 Q1050 20 1100 0 Q1150 20 1200 0"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity="0.65"
              />
              {[50, 150, 250, 350, 450, 550, 650, 750, 850, 950, 1050, 1150].map((cx) => (
                <circle key={cx} cx={cx} cy="10" r="2.2" fill="#FEF08A" opacity="0.8" />
              ))}
            </svg>
          </div>

          {/* Centered Festive Tribute */}
          <div className={styles.festiveContent}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
              <DiwaliHeroMotif size={48} />
              <div className="flex flex-col items-center sm:items-start">
                <span className={styles.festiveGreeting}>✦ SHUBH DEEPAVALI ✦</span>
                <span className={styles.festiveSubtext}>
                  May the festival of lights bring illumination, prosperity, and precision to your creations.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Background Rangoli Watermark */}
      {isDiwaliActive && showDecorations && (
        <div className={styles.festiveWatermark} aria-hidden="true">
          <RangoliMotif size={320} animateRotation={false} color="#D97706" secondaryColor="#F59E0B" showGlints={false} />
        </div>
      )}

      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* Column 1: Brand */}
          <section className={styles.brand} aria-labelledby="footer-brand-title">
            <Link className={styles.wordmark} href="/" id="footer-brand-title">
              KASAR DIMENSIONS
            </Link>
            {isDiwaliActive && showDecorations && (
              <span className={styles.festiveBrandBadge}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Diwali Edition · Additive Studio</span>
              </span>
            )}
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
