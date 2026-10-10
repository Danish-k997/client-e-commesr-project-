import React from "react";

const proofItems = [
  {
    title: "CUSTOM",
    subtitle: "MADE",
    description: "Products crafted specifically around your personal idea or CAD drawing.",
  },
  {
    title: "DESIGN",
    subtitle: "SUPPORT",
    description: "Have a photo but no 3D file? Our engineering team turns it into 3D.",
  },
  {
    title: "QUALITY",
    subtitle: "PRINTING",
    description: "Industrial grade tolerances, high tensile filaments, and flawless post-processing.",
  },
  {
    title: "BULK",
    subtitle: "ORDERS",
    description: "Serving 16+ enterprise clients and 79+ franchise batches with verified reliability.",
  },
];

export default function ProofBanner() {
  return (
    <section className="border-y border-brand-border bg-brand-cream/60 py-8" aria-label="Studio Capabilities">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-brand-border">
          {proofItems.map((item) => (
            <div key={item.title} className="px-3 md:px-6 flex flex-col">
              <span className="font-heading font-extrabold text-2xl lg:text-3xl text-brand-charcoal tracking-tight">
                {item.title}
              </span>
              <span className="text-[11px] font-bold tracking-widest uppercase text-brand-charcoal/70 mb-1">
                {item.subtitle}
              </span>
              <p className="text-xs text-brand-muted leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
