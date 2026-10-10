import Link from "next/link";
import React from "react";

export default function MembershipPromotionSection() {
  return (
    <section className="py-6" id="membership" aria-labelledby="membership-promo-title">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-brand-cream via-white to-brand-cream rounded-3xl border border-brand-border p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Badge & Value */}
          <div className="flex items-center gap-5 w-full md:w-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#18181B] text-[#CCFF00] flex flex-col items-center justify-center flex-shrink-0 shadow-sm border border-black/10">
              <span className="text-[10px] font-bold tracking-wider uppercase text-white/90">JUST</span>
              <span className="font-heading font-extrabold text-2xl leading-none text-[#CCFF00]">₹99</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md mb-1">
                <span>MEMBER BENEFIT</span>
              </div>
              <h3 id="membership-promo-title" className="font-heading font-extrabold text-xl sm:text-2xl text-brand-charcoal">
                JOIN FOR ₹99. SAVE ₹150 ON YOUR ORDER.
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Become a member for ₹99 and instantly get ₹150 OFF on eligible orders over ₹499.
              </p>
            </div>
          </div>

          {/* Right: Direct Conversion CTA */}
          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-center gap-3 w-full md:w-auto flex-shrink-0">
            <Link
              href="/membership"
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-[#18181B] hover:bg-black border border-[#CCFF00]/40 hover:border-[#CCFF00] font-heading font-extrabold text-xs uppercase tracking-wider transition-all duration-200 shadow-md hover:shadow-[0_0_20px_rgba(204,255,0,0.25)] hover:-translate-y-0.5 active:translate-y-0"
              style={{ color: "#CCFF00" }}
            >
              <span style={{ color: "#CCFF00" }} className="text-[#CCFF00] font-heading font-extrabold text-xs tracking-wider">
                BECOME A MEMBER
              </span>
              <svg
                className="w-4 h-4 text-[#CCFF00] transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
                style={{ color: "#CCFF00" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link
              href="/membership/terms"
              className="text-[10px] text-brand-muted block text-center md:text-left hover:underline"
            >
              Terms &amp; conditions apply.
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
