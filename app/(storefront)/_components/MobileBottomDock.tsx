"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCartItemCount, useCart } from "../../lib/api";

function BagIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

export default function MobileBottomDock() {
  const pathname = usePathname();
  const cartQuery = useCart();
  const cartCount = cartQuery.data ? getCartItemCount(cartQuery.data) : 0;

  // Don't duplicate controls on checkout or cart pages where bottom conversion bars already exist
  if (pathname === "/checkout" || pathname === "/cart") {
    return null;
  }

  return (
    <aside
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-brand-border p-3 px-4 flex items-center gap-3 shadow-lg"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))" }}
      aria-label="Mobile quick actions"
    >
      <Link
        href="/cart"
        className="p-3 rounded-xl bg-brand-cream border border-brand-border text-brand-charcoal flex items-center justify-center relative hover:bg-white transition-colors"
        aria-label={`Shopping Cart, ${cartCount} items`}
      >
        <BagIcon />
        {cartCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-brand-accent text-brand-charcoal text-[11px] font-bold rounded-full flex items-center justify-center shadow-xs"
            aria-hidden="true"
          >
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        )}
      </Link>

      <Link
        href="/shop?customizable=true"
        className="flex-1 py-3.5 px-4 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-brand-charcoal font-heading font-bold text-xs uppercase tracking-wider text-center shadow-sm transition-all"
      >
        CUSTOMIZE NOW
      </Link>
    </aside>
  );
}
