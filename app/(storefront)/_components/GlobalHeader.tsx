"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { getCartItemCount, useCart, useCategories } from "../../lib/api";

type GlobalHeaderProps = {
  isAdmin: boolean;
};

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 8.5h13l1 12h-15l1-12Z" />
      <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

function ChevronDownIcon({ isOpen }: { isOpen?: boolean }) {
  return (
    <svg
      className={`site-nav-chevron${isOpen ? " is-open" : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function GlobalHeader({ isAdmin }: GlobalHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);
  const categoriesTriggerRef = useRef<HTMLButtonElement>(null);
  const categoriesCloseTimer = useRef<number | null>(null);

  const cartQuery = useCart();
  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];

  const cartCount = cartQuery.data ? getCartItemCount(cartQuery.data) : 0;
  const cartLabel =
    cartCount > 0
      ? `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`
      : "Cart";

  // Close desktop categories dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!isCategoriesOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        categoriesDropdownRef.current &&
        !categoriesDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoriesOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCategoriesOpen(false);
        categoriesTriggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCategoriesOpen]);

  // Lock scroll and handle escape key for mobile menu
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
    setIsCategoriesOpen(false);
    setIsMobileCategoriesOpen(false);
  }

  function handleDesktopDropdownMouseEnter() {
    if (categoriesCloseTimer.current !== null) {
      window.clearTimeout(categoriesCloseTimer.current);
      categoriesCloseTimer.current = null;
    }
    setIsCategoriesOpen(true);
  }

  function handleDesktopDropdownMouseLeave() {
    categoriesCloseTimer.current = window.setTimeout(() => {
      setIsCategoriesOpen(false);
      categoriesCloseTimer.current = null;
    }, 160);
  }

  function handleCategoriesTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsCategoriesOpen(true);
      setTimeout(() => {
        categoriesDropdownRef.current
          ?.querySelector<HTMLElement>("a[href]")
          ?.focus();
      }, 0);
    }
  }

  return (
    <header className="site-header">
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <div className="site-header-inner">
        <Link className="site-brand" href="/" aria-label="KASAR DIMENSIONS home" onClick={closeMenu}>
          <span className="site-brand-name">KASAR</span>
          <span className="site-brand-subtitle">DIMENSIONS</span>
        </Link>

        <nav className="site-nav site-nav-desktop" aria-label="Main navigation">
          <Link href="/shop">Shop</Link>

          <div
            ref={categoriesDropdownRef}
            className="site-nav-dropdown-wrapper"
            onMouseEnter={handleDesktopDropdownMouseEnter}
            onMouseLeave={handleDesktopDropdownMouseLeave}
          >
            <button
              ref={categoriesTriggerRef}
              type="button"
              className="site-nav-dropdown-trigger"
              aria-expanded={isCategoriesOpen}
              aria-haspopup="true"
              aria-controls="nav-categories-menu"
              onClick={() => setIsCategoriesOpen((open) => !open)}
              onKeyDown={handleCategoriesTriggerKeyDown}
            >
              Categories
              <ChevronDownIcon isOpen={isCategoriesOpen} />
            </button>

            {isCategoriesOpen && (
              <div
                id="nav-categories-menu"
                className="site-nav-dropdown-menu"
                role="menu"
                aria-label="Product categories"
              >
                <Link
                  href="/shop"
                  className="site-nav-dropdown-item site-nav-dropdown-all"
                  role="menuitem"
                  onClick={() => setIsCategoriesOpen(false)}
                >
                  All Categories
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category._id}
                    href={`/shop?categoryId=${encodeURIComponent(category._id)}`}
                    className="site-nav-dropdown-item"
                    role="menuitem"
                    onClick={() => setIsCategoriesOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/#bestsellers">Bestsellers</Link>
          <Link href="/custom-request" className="site-nav-custom-link">
            <span>Custom Order</span>
            <span className="site-nav-dot" aria-hidden="true" />
          </Link>
          <Link href="/membership">Membership</Link>
        </nav>

        <div className="site-header-actions">
          <Link className="site-icon-button" href="/shop" aria-label="Search collection">
            <SearchIcon />
          </Link>
          <Link className="site-icon-button site-cart-button" href="/cart" aria-label={cartLabel}>
            <BagIcon />
            {cartCount > 0 && (
              <span className="site-cart-badge" aria-hidden="true">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <Link className="site-icon-button" href="/account" aria-label="Customer account">
            <UserIcon />
          </Link>
          <Link className="site-club-pill" href="/membership" aria-label="₹99 Club Membership">
            <span className="site-club-dot" aria-hidden="true" />
            <span>₹99 Club</span>
          </Link>
          <Link className="site-primary-cta" href="/shop?customizable=true">
            Customize now
          </Link>
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

          <div className="site-mobile-category-group">
            <button
              type="button"
              className="site-mobile-category-trigger"
              aria-expanded={isMobileCategoriesOpen}
              aria-controls="mobile-categories-list"
              onClick={() => setIsMobileCategoriesOpen((open) => !open)}
            >
              <span>Categories</span>
              <ChevronDownIcon isOpen={isMobileCategoriesOpen} />
            </button>
            {isMobileCategoriesOpen && (
              <div id="mobile-categories-list" className="site-mobile-category-list">
                <Link
                  href="/shop"
                  className="site-mobile-category-link site-mobile-category-all"
                  onClick={closeMenu}
                >
                  All Categories
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category._id}
                    href={`/shop?categoryId=${encodeURIComponent(category._id)}`}
                    className="site-mobile-category-link"
                    onClick={closeMenu}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/custom-request" onClick={closeMenu} className="site-mobile-custom-link">
            <span>Custom Order</span>
            <span className="site-nav-dot" aria-hidden="true" />
          </Link>
          <Link href="/#bestsellers" onClick={closeMenu}>Bestsellers</Link>
          <Link href="/membership" onClick={closeMenu}>₹99 Club Membership</Link>
          <Link href="/account" onClick={closeMenu}>My Account & Addresses</Link>
          {isAdmin && (
            <Link className="site-mobile-dashboard" href="/admin/dashboard" onClick={closeMenu}>
              Dashboard
            </Link>
          )}
        </div>

        <Link
          className="site-primary-cta site-mobile-cta"
          href="/shop?customizable=true"
          onClick={closeMenu}
        >
          Customize now
        </Link>
      </nav>
    </header>
  );
}
