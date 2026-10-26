"use client";

import Link from "next/link";
import { CONTACT_PHONE_URL, FORMATTED_PHONE, WHATSAPP_URL } from "../../lib/contact";
import { useFestivalTheme } from "./FestivalThemeProvider";
import FestivalMotif from "./FestivalMotif";
import styles from "./TopAnnouncementBar.module.css";

function PhoneIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function TopAnnouncementBar() {
  const festivalTheme = useFestivalTheme();
  const isFestivalActive = Boolean(
    festivalTheme?.isActive &&
      festivalTheme.showAnnouncement &&
      festivalTheme.announcementText?.trim()
  );

  return (
    <aside className={styles.topBar} aria-label="Announcement & Quick Contacts">
      <div className={styles.inner}>
        <div className={styles.deliveryMessage}>
          {isFestivalActive ? (
            <div className={styles.festivalGreeting}>
              <span className={styles.festivalSymbol} aria-hidden="true">
                {festivalTheme?.enableDecorations ? (
                  <FestivalMotif preset={festivalTheme.preset} variant="inline" size={15} />
                ) : (
                  festivalTheme?.symbol
                )}
              </span>
              <span className={styles.festivalText}>{festivalTheme?.announcementText}</span>
              <span className={styles.dotSeparator} aria-hidden="true">
                ·
              </span>
              <span className={styles.deliverySubtext}>Pan-India delivery 🇮🇳</span>
            </div>
          ) : (
            <span>Fast pan-India delivery 🇮🇳 · Custom 3D prints made to order</span>
          )}
        </div>

        <div className={styles.actions}>
          <a
            href={CONTACT_PHONE_URL}
            className={styles.link}
            aria-label={`Call client support at ${FORMATTED_PHONE}`}
          >
            <PhoneIcon />
            <span className={styles.phoneText}>{FORMATTED_PHONE}</span>
          </a>

          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
            aria-label="Chat with us on WhatsApp"
          >
            <WhatsAppIcon />
            <span>WhatsApp</span>
          </a>

          <Link
            href="/membership"
            className={`${styles.link} ${styles.membershipLink}`}
            aria-label="Become a Member to unlock discounts"
          >
            <span className={styles.membershipBadge} aria-hidden="true" />
            <StarIcon />
            <span>Become a Member</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
