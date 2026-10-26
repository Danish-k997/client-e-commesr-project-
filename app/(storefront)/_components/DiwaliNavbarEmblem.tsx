"use client";

import React from "react";
import { useFestivalTheme } from "./FestivalThemeProvider";

interface DiwaliNavbarEmblemProps {
  className?: string;
  size?: number;
  forceShow?: boolean;
}

/**
 * Compact, continuously animated Diwali emblem for the KASAR DIMENSIONS navbar.
 * Replaces the wide text-based pill badge with a purely visual, luxury motif:
 * - Traditional Indian Diya with rich terracotta/bronze vessel & polished golden rim catch.
 * - Delicate circular rangoli mandala halo with 8 sacred geometry diamond ray accents.
 * - Multi-layer warm golden flame with natural organic flickering.
 * - Occasional tiny golden sparkles/glints around the ornament.
 * - GPU-composited continuous breathing pulse scale (~1.08x) with zero layout shift.
 * - Purely visual, aria-hidden="true", pointer-events: none (zero obstruction to navigation).
 * - Strictly active only when Diwali theme + decorations are enabled.
 */
export default function DiwaliNavbarEmblem({
  className = "",
  size,
  forceShow = false,
}: DiwaliNavbarEmblemProps) {
  const festivalTheme = useFestivalTheme();

  const isDiwali = festivalTheme?.preset?.toUpperCase() === "DIWALI";
  const isDecorationsEnabled = Boolean(festivalTheme?.enableDecorations);
  const isThemeActive = Boolean(festivalTheme?.isActive);

  // Strictly render only when Diwali theme is active and decorations are enabled
  if (!forceShow && (!isThemeActive || !isDiwali || !isDecorationsEnabled)) {
    return null;
  }

  const isAnimated = forceShow || Boolean(festivalTheme?.enableAnimations);

  return (
    <span
      className={`diwali-navbar-emblem-wrapper inline-flex items-center justify-center flex-shrink-0 select-none pointer-events-none ${className}`}
      aria-hidden="true"
      role="presentation"
      style={size ? { width: size, height: size } : undefined}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`diwali-navbar-emblem-svg ${isAnimated ? "diwali-navbar-emblem-inner" : ""}`}
        width="100%"
        height="100%"
      >
        <defs>
          {/* Soft Warm Radial Aura */}
          <radialGradient id="diwaliNavAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.45" />
            <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
          </radialGradient>

          {/* Golden Metallic Linear Gradient */}
          <linearGradient id="diwaliNavGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Flame Gradient */}
          <linearGradient id="diwaliNavFlameGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="40%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          {/* Diya Bowl Shading Gradient */}
          <linearGradient id="diwaliNavBowlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#78350F" />
          </linearGradient>
        </defs>

        {/* Ambient Radial Warmth */}
        <circle cx="20" cy="20" r="18" fill="url(#diwaliNavAura)" className="diwali-nav-aura" />

        {/* Delicate Rangoli Halo (Concentric ornamental mandala) */}
        <g className={isAnimated ? "diwali-navbar-rangoli-halo" : undefined} style={{ transformOrigin: "20px 20px" }}>
          {/* Fine Scalloped Ray Ring */}
          <circle
            cx="20"
            cy="20"
            r="16.5"
            stroke="#F59E0B"
            strokeWidth="0.7"
            strokeDasharray="1.5 2"
            opacity="0.65"
          />
          {/* Inner Accent Ring */}
          <circle
            cx="20"
            cy="20"
            r="13"
            stroke="#D97706"
            strokeWidth="0.5"
            opacity="0.35"
          />

          {/* 8 Sacred Geometry Diamond Ray Accents */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 20 20)`}>
              <path
                d="M20 4.2L20.8 5.8L20 7.4L19.2 5.8Z"
                fill="url(#diwaliNavGold)"
                opacity="0.85"
              />
              <circle cx="20" cy="9.2" r="0.65" fill="#FEF08A" opacity="0.9" />
            </g>
          ))}
        </g>

        {/* Occasional Golden Sparkles / Light Glints */}
        <g className={isAnimated ? "diwali-navbar-sparkle-1" : "opacity-0"} style={{ transformOrigin: "29px 9px" }}>
          <path
            d="M29 6L29.6 8.4L32 9L29.6 9.6L29 12L28.4 9.6L26 9L28.4 8.4Z"
            fill="#FEF08A"
          />
          <circle cx="29" cy="9" r="0.7" fill="#FFFFFF" />
        </g>
        <g className={isAnimated ? "diwali-navbar-sparkle-2" : "opacity-0"} style={{ transformOrigin: "10px 11px" }}>
          <path
            d="M10 9L10.5 10.5L12 11L10.5 11.5L10 13L9.5 11.5L8 11L9.5 10.5Z"
            fill="#FEF08A"
          />
          <circle cx="10" cy="11" r="0.6" fill="#FFFFFF" />
        </g>

        {/* Traditional Indian Diya (Vessel + Flame) */}
        <g className="diwali-navbar-diya-group">
          {/* Diya Bowl Underbody */}
          <path
            d="M9 22C9 22 10 30.5 20 30.5C30 30.5 31 22 31 22C31.8 22.6 32 24.2 31.4 26C30.2 29.5 25.5 32 20 32C14.5 32 9.8 29.5 8.6 26C8 24.2 8.2 22.6 9 22Z"
            fill="url(#diwaliNavBowlGrad)"
          />

          {/* Diya Upper Rim & Pinched Beak */}
          <path
            d="M8 21.5C8 19.8 12.5 19 20 19C27.5 19 32 19.8 32 21.5C32 23.2 27.5 24 20 24C12.5 24 8 23.2 8 21.5Z"
            fill="#D97706"
          />

          {/* Interior Oil Reservoir */}
          <path
            d="M11 21.3C11 20.3 14.5 19.8 20 19.8C25.5 19.8 29 20.3 29 21.3C29 22.3 25.5 22.8 20 22.8C14.5 22.8 11 22.3 11 21.3Z"
            fill="#78350F"
          />

          {/* Polished Golden Rim Catch Line */}
          <path
            d="M9.5 21.8C13.5 23.2 26.5 23.2 30.5 21.8"
            stroke="#FEF08A"
            strokeWidth="0.8"
            strokeLinecap="round"
          />

          {/* Cotton Baati (Wick) */}
          <path d="M19.4 20.5L20 18.5L20.6 20.5Z" fill="#451A03" />

          {/* Multi-Layered Flickering Flame */}
          <g
            className={isAnimated ? "diwali-navbar-flame" : undefined}
            style={{ transformOrigin: "20px 19px" }}
          >
            {/* Outer Flame (Golden Amber) */}
            <path
              d="M20 7.5C18.5 11 16.5 13.5 16.5 16C16.5 18.3 18 20 20 20C22 20 23.5 18.3 23.5 16C23.5 13.5 21.5 11 20 7.5Z"
              fill="url(#diwaliNavFlameGrad)"
            />

            {/* Inner Flame (Radiant Warm Yellow) */}
            <path
              d="M20 10.2C19 12.5 17.8 14.2 17.8 16C17.8 17.5 18.8 18.8 20 18.8C21.2 18.8 22.2 17.5 22.2 16C22.2 14.2 21 12.5 20 10.2Z"
              fill="#FEF08A"
            />

            {/* Core Incandescent Spark */}
            <path
              d="M20 12.8C19.5 14 19.1 15 19.1 16C19.1 16.8 19.5 17.3 20 17.3C20.5 17.3 20.9 16.8 20.9 16C20.9 15 20.5 14 20 12.8Z"
              fill="#FFFFFF"
              opacity="0.92"
            />
          </g>
        </g>
      </svg>
    </span>
  );
}
