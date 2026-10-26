"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { createAuthClient } from "better-auth/react";

import { getCartItemCount, useCart, useCategories } from "../../lib/api";
import { getApplicationRole } from "../../lib/roles";
import TopAnnouncementBar from "./TopAnnouncementBar";
import { useFestivalTheme } from "./FestivalThemeProvider";
import FestivalMotif from "./FestivalMotif";

const authClient = createAuthClient();

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

export default function GlobalHeader({ isAdmin: initialIsAdmin }: GlobalHeaderProps) {
  const router = useRouter();
  const [clientIsAdmin, setClientIsAdmin] = useState<boolean | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);

  // Search interface states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isAdmin = clientIsAdmin ?? initialIsAdmin;

  useEffect(() => {
    let isMounted = true;
    async function syncAdminSession() {
      try {
        const { data } = await authClient.getSession();
        if (isMounted) {
          if (data?.user) {
            const role = (data.user as { role?: string }).role;
            setClientIsAdmin(getApplicationRole(role) === "ADMIN");
          } else {
            setClientIsAdmin(false);
          }
        }
      } catch {
        // Silently preserve initialIsAdmin if session check fails
      }
    }

    void syncAdminSession();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const festivalTheme = useFestivalTheme();
  const isFestivalActive = Boolean(festivalTheme?.isActive && festivalTheme.preset !== "DEFAULT");
  const showDecorations = isFestivalActive && festivalTheme?.enableDecorations;

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

  // Handle outside click and escape for search dropdown
  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node) &&
        searchButtonRef.current &&
        !searchButtonRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        searchButtonRef.current?.focus();
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
  }, [isSearchOpen]);

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

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    const query = searchQuery.trim();
    setIsSearchOpen(false);
    setIsMenuOpen(false);
    if (query) {
      router.push(`/shop?search=${encodeURIComponent(query)}`);
    } else {
      router.push("/shop");
    }
  }

  return (
    <header className="site-header">
      <TopAnnouncementBar />
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      <div className="site-header-inner">
        <Link className="site-brand" href="/" aria-label="KASAR DIMENSIONS home" onClick={closeMenu}>
          <Image
            src="/logo final.png"
            alt="KASAR DIMENSIONS logo"
            width={40}
            height={43}
            className="site-brand-logo"
            priority
          />
          <div className="site-brand-text">
            <span className="site-brand-name">KASAR</span>
            <span className="site-brand-subtitle">DIMENSIONS</span>
          </div>
          {isFestivalActive && (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-heading font-extrabold uppercase tracking-widest ml-1 shadow-2xs transition-all duration-300"
              style={{
                background:
                  festivalTheme?.preset === "DIWALI"
                    ? "linear-gradient(135deg, rgba(254, 243, 199, 0.65) 0%, rgba(254, 249, 195, 0.35) 100%)"
                    : "var(--festival-surface-tint, rgba(254, 243, 199, 0.4))",
                border:
                  festivalTheme?.preset === "DIWALI"
                    ? "1px solid rgba(217, 119, 6, 0.55)"
                    : "1px solid var(--festival-border, rgba(217, 119, 6, 0.4))",
                color: "var(--festival-accent, #D97706)",
                boxShadow:
                  festivalTheme?.preset === "DIWALI"
                    ? "0 1px 6px rgba(217, 119, 6, 0.15)"
                    : "none",
              }}
            >
              {showDecorations && (
                <FestivalMotif preset={festivalTheme?.preset} variant="badge" size={12} />
              )}
              <span>{festivalTheme?.title.split(" ")[0]} Edition</span>
            </span>
          )}
        </Link>

        <nav className="site-nav site-nav-desktop" aria-label="Main navigation">
          <Link href="/">Home</Link>
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
          {/* Search Button (Accessible on Mobile and Desktop) */}
          <button
            ref={searchButtonRef}
            className="site-icon-button"
            type="button"
            aria-label={isSearchOpen ? "Close search bar" : "Open product search"}
            aria-expanded={isSearchOpen}
            aria-controls="header-search-bar"
            onClick={() => {
              setIsSearchOpen((open) => !open);
              if (!isSearchOpen) {
                setTimeout(() => searchInputRef.current?.focus(), 60);
              }
            }}
          >
            <SearchIcon />
          </button>

          {/* Cart Button */}
          <Link className="site-icon-button site-cart-button" href="/cart" aria-label={cartLabel} onClick={closeMenu}>
            <BagIcon />
            {cartCount > 0 && (
              <span className="site-cart-badge" aria-hidden="true">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* Customer Account Button */}
          <Link className="site-icon-button" href="/account" aria-label="Customer account" onClick={closeMenu}>
            <UserIcon />
          </Link>

          {/* Admin Dashboard Pill */}
          {isAdmin && (
            <Link
              className="site-dashboard-pill"
              href="/admin/dashboard"
              aria-label="Admin Dashboard"
              onClick={closeMenu}
            >
              <span className="site-dashboard-dot" aria-hidden="true" />
              <span>Dashboard</span>
            </Link>
          )}

          {/* Desktop Primary CTA */}
          <Link className="site-primary-cta" href="/shop?customizable=true" onClick={closeMenu}>
            Customize now
          </Link>

          {/* Mobile Menu Hamburger */}
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

      {/* Expandable Responsive Search Bar */}
      {isSearchOpen && (
        <div
          id="header-search-bar"
          ref={searchContainerRef}
          className="site-header-search-bar"
          role="region"
          aria-label="Quick product search"
        >
          <form className="site-header-search-form" onSubmit={handleSearchSubmit}>
            <SearchIcon />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search custom 3D prints, keyrings, decor..."
              className="site-header-search-input"
              aria-label="Search products"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="site-header-search-clear"
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
            <button type="submit" className="site-header-search-submit">
              Search
            </button>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="site-header-search-close"
              aria-label="Close search"
            >
              Close
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer Navigation */}
      <nav
        ref={menuRef}
        id="mobile-navigation"
        className={`site-mobile-nav${isMenuOpen ? " is-open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
      >
        {/* Quick Search within Mobile Drawer */}
        <div className="site-mobile-nav-search">
          <form onSubmit={handleSearchSubmit} className="site-mobile-search-form">
            <SearchIcon />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="site-mobile-search-input"
              aria-label="Search products in navigation drawer"
            />
            <button type="submit" className="site-mobile-search-btn">
              Go
            </button>
          </form>
        </div>

        <div className="site-mobile-nav-links">
          <Link href="/" onClick={closeMenu}>Home</Link>
          <Link href="/shop" onClick={closeMenu}>Shop All Products</Link>

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
            <span>Custom 3D Print Request</span>
            <span className="site-nav-dot" aria-hidden="true" />
          </Link>
          <Link href="/#bestsellers" onClick={closeMenu}>Bestsellers</Link>
          <Link href="/membership" onClick={closeMenu} className="site-mobile-membership-link">
            <span>Become a Member (₹99)</span>
          </Link>
          <Link href="/account" onClick={closeMenu}>My Account & Orders</Link>
          {isAdmin && (
            <Link className="site-mobile-dashboard" href="/admin/dashboard" onClick={closeMenu}>
              <span className="site-mobile-dashboard-badge">ADMIN</span>
              <span>Dashboard</span>
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
