"use client";

import React from "react";
import { useFestivalTheme } from "./FestivalThemeProvider";

interface DiwaliHeroMotifProps {
  className?: string;
  size?: number;
  forceShow?: boolean;
}

/**
 * "KASAR — Festival of Light" Hero & Banner Festive Composition.
 *
 * Rich, multi-layered festive artwork combining:
 * 1. Dominant elevated central diya with multi-layer flicking flame (saffron, gold, incandescent core).
 * 2. Two flanking terracotta bronze diyas creating a balanced triad.
 * 3. Delicate radial geometric rangoli halo with marigold petal accents and diamond rays behind the triad.
 * 4. Ambient warm gold radial aura with gentle breathing pulse (~1.04x scale).
 * 5. Two staggered 4-point golden star sparkles.
 *
 * Performance:
 * - 100% vector SVG and GPU compositor properties (transform, opacity).
 * - Zero layout shifts; fixed bounding box.
 * - aria-hidden="true" and pointer-events: none.
 * - Strictly active only when Diwali theme and decorations are enabled.
 */
export default function DiwaliHeroMotif({
  className = "",
  size,
  forceShow = false,
}: DiwaliHeroMotifProps) {
  const festivalTheme = useFestivalTheme();

  const isDiwali = festivalTheme?.preset?.toUpperCase() === "DIWALI";
  const isDecorationsEnabled = Boolean(festivalTheme?.enableDecorations);
  const isThemeActive = Boolean(festivalTheme?.isActive);

  if (!forceShow && (!isThemeActive || !isDiwali || !isDecorationsEnabled)) {
    return null;
  }

  const isAnimated = forceShow || Boolean(festivalTheme?.enableAnimations ?? true);
  const intensity = festivalTheme?.intensity || "balanced";

  return (
    <div
      className={`diwali-hero-motif-wrapper relative inline-flex items-center justify-center flex-shrink-0 select-none pointer-events-none ${className}`}
      aria-hidden="true"
      role="presentation"
      style={size ? { width: size, height: size } : undefined}
    >
      <svg
        viewBox="0 0 100 85"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`diwali-hero-motif-svg ${isAnimated ? "diwali-hero-breathe" : ""}`}
        width="100%"
        height="100%"
      >
        <defs>
          {/* Ambient Warm Glow */}
          <radialGradient id="heroAura" cx="50%" cy="55%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity={intensity === "strong" ? 0.45 : 0.3} />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity={intensity === "strong" ? 0.25 : 0.15} />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </radialGradient>

          {/* Golden Metallic Gradient */}
          <linearGradient id="heroGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="45%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Marigold Petal Gradient */}
          <linearGradient id="heroMarigold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>

          {/* Flame Gradient */}
          <linearGradient id="heroFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Diya Bowl Shading Gradient */}
          <linearGradient id="heroBowlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
        </defs>

        {/* Layer 1: Ambient Radial Warmth */}
        <ellipse cx="50" cy="48" rx="46" ry="34" fill="url(#heroAura)" />

        {/* Layer 2: Geometric Rangoli Halo (Concentric sacred geometry & marigold petals) */}
        <g
          className={isAnimated ? "diwali-hero-halo-drift" : undefined}
          style={{ transformOrigin: "50px 42px" }}
        >
          {/* Outer Dashed Scalloped Ring */}
          <circle
            cx="50"
            cy="42"
            r="36"
            stroke="#F59E0B"
            strokeWidth="0.8"
            strokeDasharray="2.5 3.5"
            opacity="0.65"
          />

          {/* Inner Sacred Geometry Ring */}
          <circle
            cx="50"
            cy="42"
            r="28"
            stroke="#D97706"
            strokeWidth="0.6"
            opacity="0.4"
          />

          {/* 8 Symmetrical Diamond Rays & Marigold Accent Arcs */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 50 42)`}>
              {/* Marigold Petal Shape */}
              <path
                d="M50 7 C53 14 53 19 50 24 C47 19 47 14 50 7 Z"
                fill="url(#heroMarigold)"
                opacity="0.75"
              />
              {/* Outer Golden Diamond Accent */}
              <path
                d="M50 7 L51.6 10 L50 13 L48.4 10 Z"
                fill="url(#heroGold)"
                opacity="0.9"
              />
              <circle cx="50" cy="18" r="1" fill="#FEF08A" opacity="0.95" />
            </g>
          ))}
        </g>

        {/* Layer 3: Occasional Staggered Sparkles */}
        <g className={isAnimated ? "diwali-hero-sparkle-1" : "opacity-0"} style={{ transformOrigin: "74px 20px" }}>
          <path d="M74 14L75.2 18.8L80 20L75.2 21.2L74 26L72.8 21.2L68 20L72.8 18.8Z" fill="#FEF08A" />
          <circle cx="74" cy="20" r="1.1" fill="#FFFFFF" />
        </g>
        <g className={isAnimated ? "diwali-hero-sparkle-2" : "opacity-0"} style={{ transformOrigin: "24px 24px" }}>
          <path d="M24 19L25 22.8L29 24L25 25.2L24 29L23 25.2L19 24L23 22.8Z" fill="#FEF08A" />
          <circle cx="24" cy="24" r="0.9" fill="#FFFFFF" />
        </g>

        {/* Layer 4: Left Flanking Diya (Smaller, subtle angle) */}
        <g transform="translate(18, 40) rotate(-6 15 15)">
          <path
            d="M6 16C6 16 6.8 23 15 23C23.2 23 24 16 24 16C24.7 16.5 24.8 17.8 24.3 19.2C23.3 22 19.5 24 15 24C10.5 24 6.7 22 5.7 19.2C5.2 17.8 5.3 16.5 6 16Z"
            fill="url(#heroBowlGrad)"
          />
          <path
            d="M5.5 15.6C5.5 14.3 9 13.6 15 13.6C21 13.6 24.5 14.3 24.5 15.6C24.5 16.9 21 17.6 15 17.6C9 17.6 5.5 16.9 5.5 15.6Z"
            fill="#D97706"
          />
          <path d="M7 15.8C10 17 20 17 23 15.8" stroke="#FEF08A" strokeWidth="0.65" strokeLinecap="round" />
          <path d="M14.5 15L15 13.2L15.5 15Z" fill="#451A03" />
          {/* Flame Left */}
          <g className={isAnimated ? "diwali-flame-left" : undefined} style={{ transformOrigin: "15px 14px" }}>
            <path
              d="M15 4C13.8 6.8 12.2 8.8 12.2 10.8C12.2 12.6 13.4 14 15 14C16.6 14 17.8 12.6 17.8 10.8C17.8 8.8 16.2 6.8 15 4Z"
              fill="url(#heroFlameGrad)"
            />
            <path
              d="M15 6.2C14.2 8 13.3 9.4 13.3 10.8C13.3 12 14.1 13 15 13C15.9 13 16.7 12 16.7 10.8C16.7 9.4 15.8 8 15 6.2Z"
              fill="#FEF08A"
            />
            <circle cx="15" cy="11.2" r="1.1" fill="#FFFFFF" opacity="0.9" />
          </g>
        </g>

        {/* Layer 5: Right Flanking Diya (Smaller, subtle angle) */}
        <g transform="translate(52, 40) rotate(6 15 15)">
          <path
            d="M6 16C6 16 6.8 23 15 23C23.2 23 24 16 24 16C24.7 16.5 24.8 17.8 24.3 19.2C23.3 22 19.5 24 15 24C10.5 24 6.7 22 5.7 19.2C5.2 17.8 5.3 16.5 6 16Z"
            fill="url(#heroBowlGrad)"
          />
          <path
            d="M5.5 15.6C5.5 14.3 9 13.6 15 13.6C21 13.6 24.5 14.3 24.5 15.6C24.5 16.9 21 17.6 15 17.6C9 17.6 5.5 16.9 5.5 15.6Z"
            fill="#D97706"
          />
          <path d="M7 15.8C10 17 20 17 23 15.8" stroke="#FEF08A" strokeWidth="0.65" strokeLinecap="round" />
          <path d="M14.5 15L15 13.2L15.5 15Z" fill="#451A03" />
          {/* Flame Right */}
          <g className={isAnimated ? "diwali-flame-right" : undefined} style={{ transformOrigin: "15px 14px" }}>
            <path
              d="M15 4C13.8 6.8 12.2 8.8 12.2 10.8C12.2 12.6 13.4 14 15 14C16.6 14 17.8 12.6 17.8 10.8C17.8 8.8 16.2 6.8 15 4Z"
              fill="url(#heroFlameGrad)"
            />
            <path
              d="M15 6.2C14.2 8 13.3 9.4 13.3 10.8C13.3 12 14.1 13 15 13C15.9 13 16.7 12 16.7 10.8C16.7 9.4 15.8 8 15 6.2Z"
              fill="#FEF08A"
            />
            <circle cx="15" cy="11.2" r="1.1" fill="#FFFFFF" opacity="0.9" />
          </g>
        </g>

        {/* Layer 6: Dominant Elevated Center Diya */}
        <g transform="translate(35, 34)">
          {/* Bowl Underbody */}
          <path
            d="M3.5 19C3.5 19 4.5 28.5 15 28.5C25.5 28.5 26.5 19 26.5 19C27.4 19.6 27.6 21.2 27 23C25.8 26.5 21 29.5 15 29.5C9 29.5 4.2 26.5 3 23C2.4 21.2 2.6 19.6 3.5 19Z"
            fill="url(#heroBowlGrad)"
          />
          {/* Vessel Upper Rim */}
          <path
            d="M2.5 18.5C2.5 17 6.8 16 15 16C23.2 16 27.5 17 27.5 18.5C27.5 20.2 23.2 21.2 15 21.2C6.8 21.2 2.5 20.2 2.5 18.5Z"
            fill="#D97706"
          />
          {/* Oil Reservoir Depth */}
          <path
            d="M5.5 18.3C5.5 17.3 9.5 16.8 15 16.8C20.5 16.8 24.5 17.3 24.5 18.3C24.5 19.3 20.5 19.8 15 19.8C9.5 19.8 5.5 19.3 5.5 18.3Z"
            fill="#78350F"
          />
          {/* Golden Catch Highlight */}
          <path
            d="M4 18.8C8 20.2 22 20.2 26 18.8"
            stroke="#FEF08A"
            strokeWidth="0.85"
            strokeLinecap="round"
          />
          {/* Cotton Wick */}
          <path d="M14.3 17.5L15 15.2L15.7 17.5Z" fill="#451A03" />

          {/* Center Multi-Layer Flame */}
          <g className={isAnimated ? "diwali-flame-center" : undefined} style={{ transformOrigin: "15px 16px" }}>
            <path
              d="M15 3.5C13.2 7.5 11 10.5 11 13.5C11 16.2 12.8 18 15 18C17.2 18 19 16.2 19 13.5C19 10.5 16.8 7.5 15 3.5Z"
              fill="url(#heroFlameGrad)"
            />
            <path
              d="M15 6.8C13.8 9.5 12.4 11.6 12.4 13.5C12.4 15.2 13.6 16.6 15 16.6C16.4 16.6 17.6 15.2 17.6 13.5C17.6 11.6 16.2 9.5 15 6.8Z"
              fill="#FEF08A"
            />
            <path
              d="M15 9.8C14.4 11.2 13.8 12.4 13.8 13.5C13.8 14.4 14.3 15 15 15C15.7 15 16.2 14.4 16.2 13.5C16.2 12.4 15.6 11.2 15 9.8Z"
              fill="#FFFFFF"
              opacity="0.94"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
