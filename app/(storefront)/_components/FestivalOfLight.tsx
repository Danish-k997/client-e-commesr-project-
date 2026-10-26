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
 * "KASAR — Festival of Light" Scroll-Linked Diwali Motion Experience.
 *
 * Implements a 4-stage progressive choreography:
 * Stage 1 — Initial entrance: Delicate rangoli outlines emerge as section enters viewport.
 * Stage 2 — Festive reveal: Multi-diya triad emerges, Shubh Deepavali greeting rises into view.
 * Stage 3 — Scroll response: Outer rangoli ring and ambient halo gently respond to scroll progress
 *             via direct CSS variable manipulation in requestAnimationFrame (0 React re-renders during scroll).
 * Stage 4 — Resting state: Settles into a calm, luxurious idle state where only organic flame flickers continue.
 *
 * Performance:
 * - Direct GPU compositor transforms (transform, opacity).
 * - Passive scroll listener attached ONLY while intersecting viewport.
 * - Respects prefers-reduced-motion and enableAnimations toggle.
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

  useEffect(() => {
    if (!isDiwaliActive) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!enableAnimations || mediaQuery.matches) {
      setAnimationStage("settled");
      setHasTriggered(true);
      return;
    }

    let rafId: number | null = null;
    let isTrackingScroll = false;

    function handleScroll() {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        // Normalized progress: 0 when top enters bottom of screen, 1 when bottom leaves top
        const progress = Math.min(Math.max((vh - rect.top) / (vh + rect.height * 0.8), 0), 1);
        containerRef.current.style.setProperty("--diwali-scroll-progress", progress.toFixed(3));
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          if (!isTrackingScroll) {
            isTrackingScroll = true;
            window.addEventListener("scroll", handleScroll, { passive: true });
            handleScroll();
          }

          if (!hasTriggered) {
            setHasTriggered(true);
            setAnimationStage("revealing");

            const t1 = setTimeout(() => {
              setAnimationStage("greeting");
            }, 500);

            const t2 = setTimeout(() => {
              setAnimationStage("living");
            }, 1100);

            const t3 = setTimeout(() => {
              setAnimationStage("settled");
            }, 2400);

            return () => {
              clearTimeout(t1);
              clearTimeout(t2);
              clearTimeout(t3);
            };
          }
        } else {
          if (isTrackingScroll) {
            isTrackingScroll = false;
            window.removeEventListener("scroll", handleScroll);
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
          }
        }
      },
      { threshold: [0, 0.15, 0.35, 0.7] }
    );

    const currentEl = containerRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (isTrackingScroll) {
        window.removeEventListener("scroll", handleScroll);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
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
        {/* Layer 1: Geometric Rangoli Mandala Base with Scroll-Linked Rotation */}
        <div
          className={`transition-all duration-700 ease-out transform ${
            isRevealed ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
          style={{
            transform: enableAnimations
              ? "rotate(calc((var(--diwali-scroll-progress, 0.5) - 0.5) * 44deg)) scale(calc(0.96 + var(--diwali-scroll-progress, 0.5) * 0.08))"
              : undefined,
            willChange: enableAnimations ? "transform" : undefined,
          }}
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

        {/* Layer 2: 3-Diya Arrangement Mounted Over Rangoli Center with Subtle Scroll Shift */}
        <div
          className={`absolute flex items-end justify-center gap-1.5 transition-all duration-700 delay-150 transform ${
            isRevealed ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-2"
          }`}
          style={{
            bottom: compact ? "10px" : "16px",
            transform: enableAnimations
              ? "translateY(calc((1 - min(var(--diwali-scroll-progress, 0.5) * 1.5, 1)) * 6px + (var(--diwali-scroll-progress, 0.5) - 0.5) * -5px))"
              : undefined,
            willChange: enableAnimations ? "transform" : undefined,
          }}
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
