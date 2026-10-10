"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/pagination";

type HeroSlideApi = {
  _id: string;
  badge: string;
  title: string;
  description: string;
  image: {
    url: string;
    publicId?: string;
    altText?: string;
  };
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta: {
    label: string;
    href: string;
  };
  productId: string | null;
  product: Record<string, unknown> | null;
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
};

function formatPrice(value: unknown) {
  if (typeof value !== "number") {
    return "From ₹0";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export default function HeroSection() {
  const [slides, setSlides] = useState<HeroSlideApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSlides() {
      try {
        const response = await fetch("/api/hero", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Failed to load hero slides.");
        }

        const payload = (await response.json()) as { slides?: HeroSlideApi[] };

        if (isMounted) {
          setSlides(payload.slides ?? []);
        }
      } catch (error) {
        console.error("Hero fetch failed.", error);

        if (isMounted) {
          setSlides([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSlides();

    return () => {
      isMounted = false;
    };
  }, []);

  const swiperAutoplay = useMemo(
    () =>
      prefersReducedMotion
        ? false
        : {
            delay: 4500,
            disableOnInteraction: false,
          },
    [prefersReducedMotion]
  );

  if (isLoading) {
    return (
      <section className="storefront-hero storefront-hero-loading" aria-live="polite">
        <div className="storefront-hero-shell">
          <div className="hero-skeleton" />
        </div>
      </section>
    );
  }

  if (slides.length === 0) {
    return (
      <section className="relative pt-8 pb-14 md:pt-12 md:pb-20 overflow-hidden bg-brand-bg" aria-label="Additive Manufacturing Studio">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Editorial Headline & CTAs */}
            <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cream border border-brand-border text-[11px] font-bold tracking-widest uppercase text-brand-charcoal/80 mb-6 w-fit">
                <span className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0" />
                <span>Additive Manufacturing Studio</span>
              </div>

              <h1 className="font-heading font-extrabold text-5xl sm:text-6xl xl:text-7xl leading-[0.98] tracking-tight text-brand-charcoal mb-6">
                FROM<br />
                CONCEPT<br />
                <span className="inline-block relative">
                  TO CREATION.
                  <span className="absolute bottom-1 left-0 right-0 h-3 bg-brand-accent/40 -z-10 -rotate-1" aria-hidden="true" />
                </span>
              </h1>

              <p className="text-base sm:text-lg text-brand-muted font-normal leading-relaxed max-w-lg mb-8">
                Custom 3D printed products, personalised designs and made-to-order solutions — created around your idea.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mb-8">
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-brand-charcoal font-heading font-bold text-sm tracking-wide transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <span>SHOP BESTSELLERS</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                  </svg>
                </Link>

                <Link
                  href="/custom-request"
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white hover:bg-brand-cream border border-brand-border text-brand-charcoal font-heading font-bold text-sm tracking-wide transition-all hover:-translate-y-0.5"
                >
                  <span>CUSTOMIZE YOUR ORDER</span>
                  <svg className="w-4 h-4 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-5 sm:gap-6 pt-4 border-t border-brand-border/70 text-xs font-semibold text-brand-muted">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fillRule="evenodd" />
                  </svg>
                  <span>All India Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fillRule="evenodd" />
                  </svg>
                  <span>No 3D File Needed</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fillRule="evenodd" />
                  </svg>
                  <span>Instant WhatsApp Quote</span>
                </div>
              </div>
            </div>

            {/* Right Column: Featured Luminaire Showcase Card */}
            <div className="lg:col-span-6 xl:col-span-7 relative">
              <div className="relative mx-auto rounded-3xl overflow-hidden border border-brand-border bg-white shadow-card">
                <div className="relative w-full h-[380px] sm:h-[480px]">
                  <Image
                    src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1200&q=80"
                    alt="High precision 3D printed architectural spiral luminaire"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover object-center transition-transform duration-700 hover:scale-[1.02]"
                  />
                </div>

                {/* Bottom Left Product Tag */}
                <div className="absolute bottom-5 left-5 right-5 sm:right-auto bg-white/95 backdrop-blur-md border border-brand-border/80 px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between sm:gap-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-muted block">Bestselling Lighting</span>
                    <span className="font-heading font-bold text-sm text-brand-charcoal">Parametric Helix Luminaire</span>
                  </div>
                  <span className="font-heading font-extrabold text-sm text-brand-charcoal bg-brand-cream px-2.5 py-1 rounded-lg border border-brand-border">₹1,899</span>
                </div>

                {/* Floating Proof Badges */}
                <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-full border border-brand-border shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-accent flex-shrink-0" />
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-brand-charcoal">CUSTOM MADE</span>
                </div>

                <div className="absolute top-5 right-5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-full border border-brand-border shadow-sm flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-brand-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-brand-charcoal">DESIGN SUPPORT</span>
                </div>

                <div className="absolute bottom-20 sm:bottom-24 right-5 bg-brand-charcoal text-white px-3.5 py-2 rounded-full shadow-md flex items-center gap-2">
                  <span className="text-xs font-heading font-bold uppercase tracking-wider text-brand-accent">BULK ORDERS</span>
                  <span className="text-[10px] text-white/80 font-normal">B2B Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="storefront-hero" aria-label="Featured hero carousel">
      <div className="storefront-hero-shell">
        <Swiper
          modules={[Pagination, Autoplay]}
          pagination={{
            clickable: true,
            el: ".storefront-hero-pagination",
          }}
          autoplay={swiperAutoplay}
          loop={slides.length > 1}
          speed={700}
          grabCursor
          keyboard={{ enabled: true }}
          slidesPerView={1}
          className="storefront-hero-swiper"
        >
          {slides.map((slide) => {
            const productImage =
              typeof slide.product === "object" && slide.product !== null
                ? Array.isArray((slide.product as { images?: { url?: string }[] }).images)
                  ? ((slide.product as { images?: { url?: string }[] }).images?.[0]?.url ?? slide.image.url)
                  : slide.image.url
                : slide.image.url;

            const productTitle =
              typeof slide.product === "object" && slide.product !== null
                ? ((slide.product as { title?: string }).title ?? "Original design")
                : "Original design";

            const productPrice =
              typeof slide.product === "object" && slide.product !== null
                ? ((slide.product as { basePrice?: number }).basePrice ?? 0)
                : 0;

            return (
              <SwiperSlide key={slide._id} className="storefront-hero-slide">
                <div className="storefront-hero-copy">
                  <span className="hero-badge">{slide.badge}</span>
                  <h1 className="hero-title">
                    {slide.title.split("\n").map((line) => (
                      <span key={`${slide._id}-${line}`}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </h1>
                  <p className="hero-description">{slide.description}</p>
                  <div className="hero-actions">
                    {slide.primaryCta?.href && (
                      <a className="site-primary-cta storefront-hero-cta" href={slide.primaryCta.href}>
                        {slide.primaryCta.label}
                        <span aria-hidden="true">↗</span>
                      </a>
                    )}
                    {slide.secondaryCta?.href && (
                      <a className="hero-secondary-link" href={slide.secondaryCta.href} target={slide.secondaryCta.href.startsWith("http") ? "_blank" : undefined} rel={slide.secondaryCta.href.startsWith("http") ? "noreferrer" : undefined}>
                        {slide.secondaryCta.label}
                      </a>
                    )}
                  </div>
                </div>

                <div className="storefront-hero-visual" aria-label={slide.image.altText ?? slide.badge}>
                  {slide.productId ? (
                    <Link
                      className="hero-visual-card"
                      href={`/products/${slide.productId}`}
                      aria-label={`View ${productTitle}`}
                    >
                      <div className="hero-visual-image-wrap">
                        <Image
                          src={productImage}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 52vw"
                          priority={slide.sortOrder === 0}
                          className="hero-visual-image"
                        />
                      </div>
                      <div className="hero-product-card">
                        <span className="hero-product-label">Featured product</span>
                        <strong>{productTitle}</strong>
                        <span>{formatPrice(productPrice)}</span>
                      </div>
                    </Link>
                  ) : (
                    <div className="hero-visual-card">
                      <div className="hero-visual-image-wrap">
                        <Image
                          src={productImage}
                          alt={slide.image.altText ?? slide.badge}
                          fill
                          sizes="(max-width: 768px) 100vw, 52vw"
                          priority={slide.sortOrder === 0}
                          className="hero-visual-image"
                        />
                      </div>
                      <div className="hero-product-card">
                        <span className="hero-product-label">Featured product</span>
                        <strong>{productTitle}</strong>
                        <span>{formatPrice(productPrice)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
        <div className="storefront-hero-pagination" aria-label="Hero slide pagination" />
      </div>
    </section>
  );
}
