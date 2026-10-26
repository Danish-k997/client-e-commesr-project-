"use client";

import React from "react";
import { useFestivalTheme } from "./FestivalThemeProvider";
import FestivalMotif from "./FestivalMotif";

export interface DiyaClusterProps {
  className?: string;
  forceShow?: boolean;
  showGreeting?: boolean;
  greetingText?: string;
  size?: "sm" | "md" | "lg";
  align?: "center" | "start" | "end";
}

/**
 * Reusable, art-directed Indian Diya Cluster component.
 * Renders an authentic, balanced 3-diya arrangement with staggered flame flickers,
 * soft radiant amber warmth, and an optional festive greeting.
 *
 * Automatically controlled by the active Festival Theme:
 * - Only renders when Diwali is active and decorations are enabled (unless forceShow is true)
 * - Flame flickers respect the theme animation toggle and prefers-reduced-motion
 * - Glow scales with theme intensity (subtle / balanced / strong)
 */
export default function DiyaCluster({
  className = "",
  forceShow = false,
  showGreeting = false,
  greetingText = "Shubh Deepavali",
  size = "md",
  align = "center",
}: DiyaClusterProps) {
  const festivalTheme = useFestivalTheme();

  const isDiwaliActive = forceShow || (
    Boolean(festivalTheme?.isActive) &&
    festivalTheme?.preset === "DIWALI" &&
    Boolean(festivalTheme?.enableDecorations)
  );

  if (!isDiwaliActive) {
    return null;
  }

  // Scale dimensions by size prop
  const centerSize = size === "sm" ? 22 : size === "lg" ? 34 : 28;
  const flankSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;

  const justifyClass =
    align === "start" ? "justify-start" : align === "end" ? "justify-end" : "justify-center";

  return (
    <div
      className={`festival-diya-cluster-container inline-flex flex-col items-center select-none ${className}`}
      aria-hidden="true"
    >
      {/* Optional Refined Festive Greeting */}
      {showGreeting && (
        <span className="festival-diya-cluster-greeting text-[11px] font-heading font-extrabold tracking-widest uppercase text-amber-700 bg-amber-50/90 border border-amber-300/60 px-3 py-1 rounded-full shadow-xs mb-2 backdrop-blur-xs flex items-center gap-1.5">
          <span className="text-amber-500 text-[10px]">✦</span>
          <span>{greetingText}</span>
          <span className="text-amber-500 text-[10px]">✦</span>
        </span>
      )}

      {/* Balanced 3-Diya Composition with Ambient Radiance */}
      <div className={`relative inline-flex items-end ${justifyClass} gap-1.5 px-3 py-1`}>
        {/* Ambient Warm Golden Aura */}
        <span
          className="festival-diya-glow absolute inset-0 -m-2 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 60%, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.08) 50%, transparent 75%)",
          }}
        />

        {/* Left Flanking Diya */}
        <div
          className="relative transition-transform duration-300 transform -rotate-3 hover:rotate-0"
          style={{ marginBottom: "1px" }}
        >
          <FestivalMotif
            preset="DIWALI"
            variant="badge"
            size={flankSize}
            className="festival-diya-flank-left opacity-90 drop-shadow-xs"
          />
        </div>

        {/* Elevated Centerpiece Diya */}
        <div
          className="relative transition-transform duration-300 transform scale-105 z-10"
          style={{ marginBottom: "3px" }}
        >
          <FestivalMotif
            preset="DIWALI"
            variant="heading"
            size={centerSize}
            className="festival-diya-center drop-shadow-sm"
          />
        </div>

        {/* Right Flanking Diya */}
        <div
          className="relative transition-transform duration-300 transform rotate-3 hover:rotate-0"
          style={{ marginBottom: "1px" }}
        >
          <FestivalMotif
            preset="DIWALI"
            variant="badge"
            size={flankSize}
            className="festival-diya-flank-right opacity-90 drop-shadow-xs"
          />
        </div>
      </div>
    </div>
  );
}
