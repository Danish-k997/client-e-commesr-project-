"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFestivalTheme } from "./FestivalThemeProvider";
import RangoliMotif from "./RangoliMotif";
import FestivalMotif from "./FestivalMotif";

export interface FestivalOfLightProps {
  className?: string;
  forceShow?: boolean;
  compact?: boolean;
}

/**
 * "KASAR — Festival of Light" Signature Diwali Motion Experience.
 *
 * Implements a 4-stage choreography:
 * Stage 1 — Reveal: Ambient warm light blooms, rangoli geometry scales in, diya cluster illuminates.
 * Stage 2 — Greeting: "✦ SHUBH DEEPAVALI ✦" gracefully rises and fades into view.
 * Stage 3 — Living Details: Staggered independent flame flickers, gentle outer rangoli rotation, delicate glints.
 * Stage 4 — Calm Idle State: Settles into a calm, luxurious resting state without infinite looping.
 *
 * Fully integrated with Festival Theme Manager:
 * - Only renders when DIWALI theme is active and decorations enabled
 * - Respects enableAnimations toggle and prefers-reduced-motion media query
 * - Intensity setting (subtle/balanced/strong) adjusts glow and decorative presence
 */
export default function FestivalOfLight({
  className = "",
  forceShow = false,
  compact = false,
}: FestivalOfLightProps) {
  const festivalTheme = useFestivalTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [animationStage, setAnimationStage] = useState<"idle" | "revealing" | "greeting" | "living" | "settled">("idle");
  const [hasTriggered, setHasTriggered] = useState(false);

  const isDiwaliActive = forceShow || (
    Boolean(festivalTheme?.isActive) &&
    festivalTheme?.preset === "DIWALI" &&
    Boolean(festivalTheme?.enableDecorations)
  );

  const enableAnimations = forceShow || Boolean(festivalTheme?.enableAnimations ?? true);
  const intensity = festivalTheme?.intensity || "balanced";

  // Trigger reveal via IntersectionObserver when entering viewport
  useEffect(() => {
    if (!isDiwaliActive || hasTriggered) return;

    // If animations are turned off or user prefers reduced motion, settle immediately
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!enableAnimations || mediaQuery.matches) {
      setAnimationStage("settled");
      setHasTriggered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasTriggered) {
          setHasTriggered(true);

          // Stage 1: Reveal (0s - 400ms)
          setAnimationStage("revealing");

          // Stage 2: Greeting (500ms)
          const t1 = setTimeout(() => {
            setAnimationStage("greeting");
          }, 500);

          // Stage 3: Living Details (1000ms)
          const t2 = setTimeout(() => {
            setAnimationStage("living");
          }, 1100);

          // Stage 4: Settled Calm Idle State (2200ms)
          const t3 = setTimeout(() => {
            setAnimationStage("settled");
          }, 2400);

          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
          };
        }
      },
      { threshold: 0.25 }
    );

    const currentEl = containerRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, [isDiwaliActive, hasTriggered, enableAnimations]);

  if (!isDiwaliActive) {
    return null;
  }

  const rangoliSize = compact ? 72 : 110;
  const centerDiyaSize = compact ? 26 : 34;
  const flankDiyaSize = compact ? 18 : 24;

  const isRevealed = animationStage !== "idle";
  const showGreeting = animationStage === "greeting" || animationStage === "living" || animationStage === "settled";

  return (
    <div
      ref={containerRef}
      className={`festival-of-light-container relative flex flex-col items-center justify-center select-none py-2 ${className}`}
      aria-label="Diwali Festival of Light visual tribute"
    >
      {/* Stage 1: Ambient Luminous Halo */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${
          isRevealed ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            intensity === "subtle"
              ? "radial-gradient(circle at 50% 55%, rgba(245, 158, 11, 0.12) 0%, transparent 65%)"
              : intensity === "strong"
              ? "radial-gradient(circle at 50% 55%, rgba(245, 158, 11, 0.28) 0%, rgba(217, 119, 6, 0.12) 40%, transparent 75%)"
              : "radial-gradient(circle at 50% 55%, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.08) 45%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Central Visual Composition: Rangoli Mandala + Diya Triad */}
      <div className="relative flex items-center justify-center">
        {/* Layer 1: Geometric Rangoli Mandala Base */}
        <div
          className={`transition-all duration-700 ease-out transform ${
            isRevealed ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
          aria-hidden="true"
        >
          <RangoliMotif
            size={rangoliSize}
            animateRotation={enableAnimations && (animationStage === "living" || animationStage === "settled")}
            color="#D97706"
            secondaryColor="#F59E0B"
            showGlints={intensity !== "subtle"}
          />
        </div>

        {/* Layer 2: 3-Diya Arrangement Mounted Over Rangoli Center */}
        <div
          className={`absolute flex items-end justify-center gap-1.5 transition-all duration-700 delay-150 transform ${
            isRevealed ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-2"
          }`}
          style={{ bottom: compact ? "10px" : "16px" }}
          aria-hidden="true"
        >
          {/* Left Flanking Diya */}
          <div className="transform -rotate-4 hover:rotate-0 transition-transform">
            <FestivalMotif
              preset="DIWALI"
              variant="badge"
              size={flankDiyaSize}
              className="festival-diya-flank-left drop-shadow-xs"
            />
          </div>

          {/* Elevated Center Diya */}
          <div className="scale-105 z-10 transition-transform hover:scale-110">
            <FestivalMotif
              preset="DIWALI"
              variant="heading"
              size={centerDiyaSize}
              className="festival-diya-center drop-shadow-sm"
            />
          </div>

          {/* Right Flanking Diya */}
          <div className="transform rotate-4 hover:rotate-0 transition-transform">
            <FestivalMotif
              preset="DIWALI"
              variant="badge"
              size={flankDiyaSize}
              className="festival-diya-flank-right drop-shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Stage 2 & 3: Festive Greeting with Smooth Fade-and-Rise Reveal */}
      <div
        className={`mt-2 flex flex-col items-center transition-all duration-700 ease-out transform ${
          showGreeting ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <span className="festival-greeting-pill inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-heading font-extrabold tracking-widest uppercase text-amber-800 bg-amber-50/95 border border-amber-300/70 shadow-xs backdrop-blur-xs">
          <span className="text-amber-500 text-[10px] animate-pulse">✦</span>
          <span>SHUBH DEEPAVALI</span>
          <span className="text-amber-500 text-[10px] animate-pulse">✦</span>
        </span>
        <span className="text-[10px] font-medium tracking-wide text-neutral-500 mt-1 uppercase">
          Festival of Light · Crafted with Precision
        </span>
      </div>
    </div>
  );
}
