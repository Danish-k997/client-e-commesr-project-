"use client";

import React from "react";
import type { FestivalPreset } from "../../models/FestivalTheme";

export type MotifVariant = "badge" | "heading" | "corner" | "inline" | "cluster";

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

  // If cluster is requested for Diwali, delegate to balanced multi-diya layout
  if (normalized === "DIWALI" && variant === "cluster") {
    const clusterCenter = size || 26;
    const clusterFlank = Math.round(clusterCenter * 0.72);
    return (
      <span
        className={`festival-motif-cluster inline-flex items-end justify-center gap-1 relative ${className}`}
        aria-hidden="true"
      >
        <FestivalMotif preset="DIWALI" variant="badge" size={clusterFlank} className="opacity-90 transform -rotate-3" />
        <FestivalMotif preset="DIWALI" variant="heading" size={clusterCenter} className="z-10 scale-105" />
        <FestivalMotif preset="DIWALI" variant="badge" size={clusterFlank} className="opacity-90 transform rotate-3" />
      </span>
    );
  }

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

  // 1. DIWALI — Traditional Indian Diya Lamp with Refined Multi-Layer Flame & Terracotta Vessel
  if (normalized === "DIWALI") {
    return (
      <svg
        viewBox="0 0 24 24"
        style={style}
        className={`festival-motif festival-motif-diwali ${className}`}
        aria-hidden="true"
        fill="none"
      >
        {/* Soft Ambient Radiance Behind Flame */}
        <circle cx="12" cy="7.5" r="4.5" fill="var(--festival-accent, #D97706)" opacity="0.18" className="festival-flame-radiance" />

        {/* Outer Flame (Golden Amber) */}
        <path
          d="M12 2C10.8 5 9.2 6.8 9.2 8.8C9.2 10.6 10.4 12 12 12C13.6 12 14.8 10.6 14.8 8.8C14.8 6.8 13.2 5 12 2Z"
          fill="var(--festival-accent, #D97706)"
          className="festival-flame-path"
        />

        {/* Inner Flame (Radiant Warm Yellow) */}
        <path
          d="M12 4.2C11.3 5.8 10.4 7.2 10.4 8.6C10.4 9.8 11.1 10.8 12 10.8C12.9 10.8 13.6 9.8 13.6 8.6C13.6 7.2 12.7 5.8 12 4.2Z"
          fill="#FEF08A"
          className="festival-flame-inner"
        />

        {/* Core Incandescent Spark */}
        <path
          d="M12 6.2C11.6 7.2 11.2 8 11.2 8.8C11.2 9.4 11.5 9.8 12 9.8C12.5 9.8 12.8 9.4 12.8 8.8C12.8 8 12.4 7.2 12 6.2Z"
          fill="#FFFFFF"
          opacity="0.9"
        />

        {/* Cotton Wick Baati Tip */}
        <path
          d="M11.6 12.4L12 11.2L12.4 12.4H11.6Z"
          fill="#78350F"
        />

        {/* Earthen Terracotta Vessel Underbody */}
        <path
          d="M3.2 13.6C3.2 13.6 3.8 18.8 12 18.8C20.2 18.8 20.8 13.6 20.8 13.6C21.6 14 21.8 15 21.5 16.5C20.8 19.8 16.8 22 12 22C7.2 22 3.2 19.8 2.5 16.5C2.2 15 2.4 14 3.2 13.6Z"
          fill="var(--festival-accent, #B45309)"
        />

        {/* Upper Vessel Rim & Pinched Beak */}
        <path
          d="M2.2 13.2C2.2 12 5.5 11.4 12 11.4C18.5 11.4 21.8 12 21.8 13.2C21.8 14.6 18.5 15.6 12 15.6C5.5 15.6 2.2 14.6 2.2 13.2Z"
          fill="var(--festival-accent-secondary, #F59E0B)"
        />

        {/* Interior Oil Reservoir */}
        <path
          d="M4.5 13.1C4.5 12.4 7.5 12 12 12C16.5 12 19.5 12.4 19.5 13.1C19.5 13.8 16.5 14.4 12 14.4C7.5 14.4 4.5 13.8 4.5 13.1Z"
          fill="#D97706"
        />

        {/* Polished Golden Rim Catch Line */}
        <path
          d="M3.5 13.5C6.8 14.7 17.2 14.7 20.5 13.5"
          stroke="#FEF08A"
          strokeWidth="0.75"
          strokeLinecap="round"
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
