"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { getCartItemCount, useCart } from "../../lib/api";
import { WHATSAPP_URL } from "../../lib/contact";

type GlobalHeaderProps = {
  isAdmin: boolean;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.4 15.4 4.1 4.1" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 8.5h13l1 12h-15l1-12Z" />
      <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  );
}

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  return isOpen ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function FutureNavigationItem({ children }: { children: ReactNode }) {
  return (
    <span className="site-nav-future" aria-disabled="true">
      {children}
    </span>
  );
}

export default function GlobalHeader({ isAdmin }: GlobalHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const cartQuery = useCart();
  const cartCount = cartQuery.data ? getCartItemCount(cartQuery.data) : 0;
  const cartLabel =
    cartCount > 0
      ? `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`
      : "Cart";

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    menuRef.current
      ?.querySelector<HTMLElement>("a[href], button:not(:disabled)")
      ?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" href="/" aria-label="KASAR DIMENSIONS home" onClick={closeMenu}>
          <span className="site-brand-name">KASAR</span>
          <span className="site-brand-subtitle">DIMENSIONS</span>
        </Link>

        <nav className="site-nav site-nav-desktop" aria-label="Main navigation">
          <Link href="/shop">Shop</Link>
          <FutureNavigationItem>Categories</FutureNavigationItem>
          <a className="site-nav-custom" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
            Custom Order <span aria-hidden="true" />
          </a>
          <FutureNavigationItem>Bestsellers</FutureNavigationItem>
        </nav>

        <div className="site-header-actions">
          <button className="site-icon-button" type="button" aria-label="Search (coming soon)" disabled>
            <SearchIcon />
          </button>
          <Link className="site-icon-button site-cart-button" href="/cart" aria-label={cartLabel}>
            <BagIcon />
            {cartCount > 0 && (
              <span className="site-cart-badge" aria-hidden="true">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <FutureNavigationItem>
            <span className="site-club-pill">₹99 CLUB</span>
          </FutureNavigationItem>
          <a
            className="site-primary-cta"
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
          >
            Customize now
            <span aria-hidden="true">↗</span>
          </a>
          {isAdmin && (
            <Link className="site-dashboard-link" href="/admin/dashboard">
              Dashboard
            </Link>
          )}
          <button
            ref={menuButtonRef}
            className="site-menu-button"
            type="button"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <MenuIcon isOpen={isMenuOpen} />
          </button>
        </div>
      </div>

      <nav
        ref={menuRef}
        id="mobile-navigation"
        className={`site-mobile-nav${isMenuOpen ? " is-open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
      >
        <div className="site-mobile-nav-links">
          <Link href="/shop" onClick={closeMenu}>Shop</Link>
          <FutureNavigationItem>Categories</FutureNavigationItem>
          <a className="site-nav-custom" href={WHATSAPP_URL} target="_blank" rel="noreferrer" onClick={closeMenu}>
            Custom Order <span aria-hidden="true" />
          </a>
          <FutureNavigationItem>Bestsellers</FutureNavigationItem>
          {isAdmin && (
            <Link className="site-mobile-dashboard" href="/admin/dashboard" onClick={closeMenu}>
              Dashboard
            </Link>
          )}
        </div>
        <div className="site-mobile-utilities">
          <button type="button" aria-label="Search (coming soon)" disabled>
            <SearchIcon /> Search
          </button>
          <Link className="site-mobile-cart" href="/cart" onClick={closeMenu} aria-label={cartLabel}>
            <BagIcon />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="site-mobile-cart-count" aria-hidden="true">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <FutureNavigationItem>₹99 CLUB</FutureNavigationItem>
        </div>
        <a
          className="site-primary-cta site-mobile-cta"
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          onClick={closeMenu}
        >
          Customize now <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>
  );
}
