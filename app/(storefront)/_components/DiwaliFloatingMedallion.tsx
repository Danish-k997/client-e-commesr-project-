"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { WHATSAPP_URL, WHATSAPP_NUMBER } from "../../lib/contact";
import { useFestivalTheme } from "./FestivalThemeProvider";
import RangoliMotif from "./RangoliMotif";
import FestivalMotif from "./FestivalMotif";

function WhatsAppIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 18.08c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.31c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.85 5.8 2.4 1.55 1.55 2.41 3.61 2.4 5.8-.01 4.52-3.69 8.17-8.25 8.17zm4.5-6.14c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z" />
    </svg>
  );
}

function DefaultWhatsAppFloatingButton({ hasBottomDock }: { hasBottomDock: boolean }) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed z-30 flex items-center justify-center w-13 h-13 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] ${
        hasBottomDock
          ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom,12px))] right-4 md:bottom-6 md:right-6"
          : "bottom-4 right-4 md:bottom-6 md:right-6"
      }`}
      aria-label="Chat on WhatsApp"
      title="Chat on WhatsApp"
    >
      <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 18.08c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.31c0-4.52 3.68-8.2 8.2-8.2 2.19 0 4.25.85 5.8 2.4 1.55 1.55 2.41 3.61 2.4 5.8-.01 4.52-3.69 8.17-8.25 8.17zm4.5-6.14c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.12-.56.12-.17.25-.64.8-.79.97-.14.17-.29.19-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z" />
      </svg>
      <span className="sr-only">Chat with KASAR DIMENSIONS on WhatsApp</span>
    </a>
  );
}

/**
 * Interactive Diwali Floating Rangoli Medallion.
 *
 * For the active Diwali theme:
 * - Displays a circular animated Rangoli Medallion with rotating outer ring & illuminated central diya.
 * - On tap/click: Expands a refined festive blessing card that PRESERVES the direct WhatsApp consultation
 *   and custom festive order pathways.
 * - Restores default FloatingWhatsAppButton whenever Diwali theme is inactive.
 */
export default function DiwaliFloatingMedallion() {
  const pathname = usePathname();
  const hasBottomDock = pathname !== "/checkout" && pathname !== "/cart";
  const festivalTheme = useFestivalTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDiwaliActive = Boolean(
    festivalTheme?.isActive &&
    festivalTheme.preset === "DIWALI" &&
    festivalTheme.enableDecorations
  );

  const enableAnimations = Boolean(festivalTheme?.enableAnimations ?? true);

  // Close on outside click or ESC key
  useEffect(() => {
    if (!isExpanded) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsExpanded(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  // When Diwali is not active, cleanly restore the original standard WhatsApp button
  if (!isDiwaliActive) {
    return <DefaultWhatsAppFloatingButton hasBottomDock={hasBottomDock} />;
  }

  const positionClass = hasBottomDock
    ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom,12px))] right-4 md:bottom-6 md:right-6"
    : "bottom-4 right-4 md:bottom-6 md:right-6";

  return (
    <div className={`fixed z-40 ${positionClass}`} ref={cardRef}>
      {/* Expanded Festive Card Overlay */}
      {isExpanded && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="Diwali Festive Greeting and Consultation"
          className="absolute bottom-16 right-0 w-80 max-w-[calc(100vw-32px)] p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-amber-300 shadow-2xl transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-3"
        >
          {/* Card Header with Close Button */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-1.5">
              <FestivalMotif preset="DIWALI" variant="badge" size={16} />
              <span className="text-[11px] font-heading font-extrabold uppercase tracking-widest text-amber-900">
                Shubh Deepavali
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="w-6 h-6 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 flex items-center justify-center text-xs font-bold transition-colors"
              aria-label="Close festive greeting"
            >
              ✕
            </button>
          </div>

          {/* Festive Message Body */}
          <div className="py-3 text-center">
            <p className="text-xs text-neutral-700 font-medium leading-relaxed">
              May the festival of lights illuminate your spaces with prosperity, joy, and handcrafted elegance.
            </p>
            <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider mt-1.5">
              ✦ Handcrafted 3D Creations for Diwali ✦
            </p>
          </div>

          {/* Action CTAs: Preserves Direct WhatsApp + Storefront Customizer */}
          <div className="flex flex-col gap-2 pt-2 border-t border-amber-200/60">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-all shadow-xs active:scale-98"
            >
              <WhatsAppIcon />
              <span>Chat on WhatsApp (+91 {WHATSAPP_NUMBER})</span>
            </a>

            <Link
              href="/shop?customizable=true"
              onClick={() => setIsExpanded(false)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-heading font-bold uppercase tracking-wider transition-all shadow-xs active:scale-98"
            >
              <span>Explore Custom Keepsakes &rarr;</span>
            </Link>
          </div>
        </div>
      )}

      {/* Floating Medallion Trigger Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label="Open Diwali Festive Greeting & WhatsApp Support"
        title="Shubh Deepavali — Festive Greeting & Support"
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-linear-to-br from-amber-500 via-amber-600 to-amber-700 text-white shadow-xl hover:shadow-2xl transition-transform duration-300 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        style={{
          boxShadow: "0 4px 20px rgba(217, 119, 6, 0.45), 0 0 0 2px rgba(254, 240, 138, 0.6)",
        }}
      >
        {/* Outer Rotating Rangoli Ring */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-1">
          <RangoliMotif
            size={52}
            animateRotation={enableAnimations}
            color="#FEF08A"
            secondaryColor="#FDE047"
            showGlints={true}
          />
        </div>

        {/* Center Illuminated Diya */}
        <div className="relative z-10 scale-100 group-hover:scale-110 transition-transform pointer-events-none">
          <FestivalMotif preset="DIWALI" variant="heading" size={24} />
        </div>

        {/* Small WhatsApp Indicator Dot on corner to signal direct chat support availability */}
        <span
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#25D366] border-2 border-white flex items-center justify-center shadow-xs"
          title="WhatsApp Support Active"
          aria-hidden="true"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        </span>
      </button>
    </div>
  );
}
