"use client";

import React from "react";
import type { FestivalPreset } from "../../models/FestivalTheme";

export type MotifVariant = "badge" | "heading" | "corner" | "inline";

interface FestivalMotifProps {
  preset?: FestivalPreset | string;
  variant?: MotifVariant;
  className?: string;
  size?: number;
  color?: string;
}

export default function FestivalMotif({
  preset = "DEFAULT",
  variant = "badge",
  className = "",
  size,
  color,
}: FestivalMotifProps) {
  const normalized = preset.toUpperCase();

  // Determine pixel size based on variant if not explicitly given
  const defaultSize =
    variant === "heading" ? 24 : variant === "corner" ? 32 : variant === "inline" ? 14 : 16;
  const actualSize = size || defaultSize;

  const style: React.CSSProperties = {
    width: actualSize,
    height: actualSize,
    display: "inline-block",
    verticalAlign: "middle",
    flexShrink: 0,
    pointerEvents: "none",
  };

  if (color) {
    style.color = color;
  }

  // 1. DIWALI — Traditional Diya Lamp with Flickering Flame
  if (normalized === "DIWALI") {
    return (
      <svg
        viewBox="0 0 24 24"
        style={style}
        className={`festival-motif festival-motif-diwali ${className}`}
        aria-hidden="true"
        fill="none"
      >
        {/* Flame */}
        <path
          d="M12 2C11 5 9.5 6.5 9.5 8.5C9.5 10.2 10.6 11.5 12 11.5C13.4 11.5 14.5 10.2 14.5 8.5C14.5 6.5 13 5 12 2Z"
          fill="var(--festival-accent, #D97706)"
          className="festival-flame-path"
        />
        {/* Inner flame glow */}
        <path
          d="M12 4.5C11.5 6 10.8 7 10.8 8.2C10.8 9 11.3 9.8 12 9.8C12.7 9.8 13.2 9 13.2 8.2C13.2 7 12.5 6 12 4.5Z"
          fill="#FEF08A"
        />
        {/* Diya Base Vessel */}
        <path
          d="M4 13C4 13 4 18 12 18C20 18 20 13 20 13C20 13 21 13 21 14C21 18.5 16.5 21 12 21C7.5 21 3 18.5 3 14C3 13 4 13 4 13Z"
          fill="var(--festival-accent-secondary, #F59E0B)"
        />
        {/* Diya Rim */}
        <path
          d="M2.5 13.5C2.5 12.5 5 12 12 12C19 12 21.5 12.5 21.5 13.5C21.5 14.5 19 15 12 15C5 15 2.5 14.5 2.5 13.5Z"
          fill="var(--festival-accent, #D97706)"
        />
      </svg>
    );
  }

  // 2. HOLI — Celebratory Gulal Color Splash
  if (normalized === "HOLI") {
    return (
      <svg
        viewBox="0 0 24 24"
        style={style}
        className={`festival-motif festival-motif-holi ${className}`}
        aria-hidden="true"
        fill="none"
      >
        {/* Central burst */}
        <path
          d="M12 4C12.8 7.5 14 8.5 17.5 9.2C14 10 12.8 11.2 12 14.8C11.2 11.2 10 10 6.5 9.2C10 8.5 11.2 7.5 12 4Z"
          fill="var(--festival-accent, #E11D48)"
        />
        {/* Radiating pigment droplets */}
        <circle cx="18.5" cy="5.5" r="1.8" fill="var(--festival-accent-secondary, #7C3AED)" />
        <circle cx="5.5" cy="6" r="1.5" fill="var(--festival-accent, #E11D48)" />
        <circle cx="19.5" cy="16.5" r="2.2" fill="var(--festival-accent, #E11D48)" />
        <circle cx="5" cy="16" r="1.8" fill="var(--festival-accent-secondary, #7C3AED)" />
        <circle cx="12" cy="19.5" r="1.6" fill="var(--festival-accent-secondary, #7C3AED)" />
      </svg>
    );
  }

  // 3. EID — Crescent Moon & Eight-Pointed Star
  if (normalized === "EID") {
    return (
      <svg
        viewBox="0 0 24 24"
        style={style}
        className={`festival-motif festival-motif-eid ${className}`}
        aria-hidden="true"
        fill="none"
      >
        {/* Crescent Moon */}
        <path
          d="M14.5 3C9.8 3 6 6.8 6 11.5C6 16.2 9.8 20 14.5 20C17.2 20 19.5 18.7 21 16.8C16.8 17.2 13 14 13 9.8C13 6.9 14.5 4.4 17 3.2C16.2 3.1 15.4 3 14.5 3Z"
          fill="var(--festival-accent, #059669)"
        />
        {/* Star */}
        <path
          d="M17.5 7L18.2 8.8L20 9.5L18.2 10.2L17.5 12L16.8 10.2L15 9.5L16.8 8.8L17.5 7Z"
          fill="var(--festival-accent-secondary, #0D9488)"
        />
      </svg>
    );
  }

  // 4. RAKSHA BANDHAN — Sacred Rakhi Medallion & Ceremonial Thread
  if (normalized === "RAKSHA_BANDHAN") {
    return (
      <svg
        viewBox="0 0 24 24"
        style={style}
        className={`festival-motif festival-motif-rakhi ${className}`}
        aria-hidden="true"
        fill="none"
      >
        {/* Thread lines extending out */}
        <path d="M1 12H6M18 12H23" stroke="var(--festival-accent-secondary, #F59E0B)" strokeWidth="1.8" strokeLinecap="round" />
        {/* Outer beaded ring */}
        <circle cx="12" cy="12" r="7.5" stroke="var(--festival-accent, #DC2626)" strokeWidth="1.6" strokeDasharray="2 2" />
        {/* Inner gold medallion */}
        <circle cx="12" cy="12" r="5" fill="var(--festival-accent-secondary, #F59E0B)" />
        {/* Center vermilion gem */}
        <circle cx="12" cy="12" r="2.6" fill="var(--festival-accent, #DC2626)" />
      </svg>
    );
  }

  // 5. CHRISTMAS — Crystalline Snowflake & Evergreen Star
  if (normalized === "CHRISTMAS") {
    return (
      <svg
        viewBox="0 0 24 24"
        style={style}
        className={`festival-motif festival-motif-christmas ${className}`}
        aria-hidden="true"
        fill="none"
      >
        {/* Symmetrical Snowflake Arms */}
        <path
          d="M12 2V22M2 12H22M5 5L19 19M5 19L19 5"
          stroke="var(--festival-accent, #15803D)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        {/* Branch tips */}
        <path
          d="M10 4L12 2L14 4M10 20L12 22L14 20M4 10L2 12L4 14M20 10L22 12L20 14"
          stroke="var(--festival-accent, #15803D)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Center berry accent */}
        <circle cx="12" cy="12" r="2" fill="var(--festival-accent-secondary, #B91C1C)" />
      </svg>
    );
  }

  // 6. DEFAULT — Sacred KASAR DIMENSIONS Pyramid Emblem
  return (
    <svg
      viewBox="0 0 24 24"
      style={style}
      className={`festival-motif festival-motif-default ${className}`}
      aria-hidden="true"
      fill="none"
    >
      <polygon
        points="12,3 22,20 2,20"
        stroke="var(--festival-accent, #CCFF00)"
        strokeWidth="2"
        fill="rgba(204, 255, 0, 0.15)"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="2.2" fill="var(--festival-accent, #CCFF00)" />
    </svg>
  );
}
