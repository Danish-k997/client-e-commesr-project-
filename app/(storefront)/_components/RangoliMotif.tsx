"use client";

import React from "react";

export interface RangoliMotifProps {
  size?: number;
  className?: string;
  animateRotation?: boolean;
  color?: string;
  secondaryColor?: string;
  showGlints?: boolean;
}

/**
 * Reusable, precision-crafted Indian Rangoli Mandala component.
 * Inspired by luxury festive geometry (Cartier, Armani Beauty The Diwali Edit):
 * - Concentric sacred geometry: 8-petaled lotus, diamond ray accents, beaded mandala rings.
 * - Compositor-friendly smooth rotation on the outer decorative ring.
 * - Tiny 4-point stellar glints for subtle radiance.
 */
export default function RangoliMotif({
  size = 64,
  className = "",
  animateRotation = true,
  color = "#D97706",
  secondaryColor = "#F59E0B",
  showGlints = true,
}: RangoliMotifProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`festival-rangoli-svg ${className}`}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        pointerEvents: "none",
      }}
    >
      <defs>
        {/* Soft Radiant Radial Glow */}
        <radialGradient id="rangoliAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.35" />
          <stop offset="50%" stopColor={secondaryColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>

        {/* Golden Metallic Linear Gradient */}
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor={secondaryColor} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>

      {/* Ambient Radial Warmth */}
      <circle cx="50" cy="50" r="48" fill="url(#rangoliAura)" />

      {/* Outer Rotating Decorative Ring (Slow, majestic rotation) */}
      <g
        className={animateRotation ? "festival-rangoli-outer-ring" : undefined}
        style={{ transformOrigin: "50px 50px" }}
      >
        {/* Outer Fine Scalloped Ray Ring */}
        <circle
          cx="50"
          cy="50"
          r="44"
          stroke={secondaryColor}
          strokeWidth="0.8"
          strokeDasharray="2 4"
          opacity="0.8"
        />

        {/* 8 Cardinal & Diagonal Diamond Ray Accents */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <g key={angle} transform={`rotate(${angle} 50 50)`}>
            <path
              d="M50 4L52 9L50 14L48 9Z"
              fill="url(#goldGradient)"
              opacity="0.9"
            />
            <circle cx="50" cy="18" r="1.2" fill="#FEF08A" />
          </g>
        ))}

        {/* Intermediate Geometric Ring */}
        <circle
          cx="50"
          cy="50"
          r="36"
          stroke={color}
          strokeWidth="0.9"
          strokeDasharray="4 2"
          opacity="0.85"
        />
      </g>

      {/* Static Inner Mandala (Symmetry & Precision) */}
      <g style={{ transformOrigin: "50px 50px" }}>
        {/* 8-Petaled Sacred Lotus Flower */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <g key={`petal-${angle}`} transform={`rotate(${angle} 50 50)`}>
            <path
              d="M50 20 C44 32 44 42 50 46 C56 42 56 32 50 20 Z"
              fill={secondaryColor}
              fillOpacity="0.18"
              stroke="url(#goldGradient)"
              strokeWidth="1"
            />
            {/* Inner Petal Vein */}
            <line
              x1="50"
              y1="24"
              x2="50"
              y2="42"
              stroke="#FDE047"
              strokeWidth="0.7"
              strokeLinecap="round"
              opacity="0.75"
            />
          </g>
        ))}

        {/* Concentric Lotus Calyx Ring */}
        <circle
          cx="50"
          cy="50"
          r="16"
          stroke={color}
          strokeWidth="1.2"
          fill="#FFFBEB"
          fillOpacity="0.4"
        />

        <circle
          cx="50"
          cy="50"
          r="11"
          stroke={secondaryColor}
          strokeWidth="0.8"
          strokeDasharray="1.5 2"
        />

        {/* Central Luminous Bindu Core */}
        <circle cx="50" cy="50" r="5" fill="url(#goldGradient)" />
        <circle cx="50" cy="50" r="2.2" fill="#FFFFFF" opacity="0.95" />
      </g>

      {/* Optional Stellar Glints at Cardinal Coordinates */}
      {showGlints && (
        <g className="festival-rangoli-glints" style={{ transformOrigin: "50px 50px" }}>
          {/* Top-Right Glint */}
          <path
            d="M82 18 L83 23 L88 24 L83 25 L82 30 L81 25 L76 24 L81 23 Z"
            fill="#FEF08A"
            className="festival-glint-1"
          />
          {/* Bottom-Left Glint */}
          <path
            d="M18 78 L19 82 L23 83 L19 84 L18 88 L17 84 L13 83 L17 82 Z"
            fill="#FEF08A"
            className="festival-glint-2"
          />
        </g>
      )}
    </svg>
  );
}
