import Link from "next/link";
import React from "react";
import { CONTACT_PHONE_URL, WHATSAPP_NUMBER } from "../../lib/contact";

export default function CompactFinalCta() {
  return (
    <section className="py-12 bg-white border-t border-brand-border" aria-label="Start your custom project">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-[11px] font-bold tracking-widest uppercase text-brand-muted block mb-2">
          START YOUR PROJECT
        </span>
        <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-brand-charcoal tracking-tight mb-2">
          READY TO CREATE YOUR OWN?
        </h2>
        <p className="text-sm text-brand-muted max-w-md mx-auto mb-8">
          Send us your idea and let&apos;s turn it into a real, tangible product.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="#custom-order"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-brand-charcoal font-heading font-bold text-sm uppercase tracking-wider transition-all shadow-sm hover:shadow hover:-translate-y-0.5"
          >
            <span>CUSTOMIZE NOW</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-cream hover:bg-brand-border/40 border border-brand-border text-brand-charcoal font-heading font-bold text-sm uppercase tracking-wider transition-all"
          >
            <span>SHOP PRODUCTS</span>
          </Link>
        </div>

        {/* Quick Verified Contact Info Strip */}
        <div className="mt-8 pt-6 border-t border-brand-border/60 flex flex-wrap items-center justify-center gap-6 text-xs text-brand-muted font-medium">
          <a
            href={CONTACT_PHONE_URL}
            className="flex items-center gap-1.5 hover:text-brand-charcoal transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span>+91 {WHATSAPP_NUMBER}</span>
          </a>
          <a
            href="mailto:kasardimensions@gmail.com"
            className="flex items-center gap-1.5 hover:text-brand-charcoal transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-brand-charcoal" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <span>kasardimensions@gmail.com</span>
          </a>
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                clipRule="evenodd"
                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                fillRule="evenodd"
              />
            </svg>
            <span>Ranchi, Jharkhand (All India Delivery)</span>
          </span>
        </div>
      </div>
    </section>
  );
}
