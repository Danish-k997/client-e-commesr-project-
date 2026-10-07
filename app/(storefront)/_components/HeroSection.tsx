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
      <section className="storefront-hero storefront-hero-empty" aria-live="polite">
        <div className="storefront-hero-shell">
          <div className="storefront-hero-empty-card">
            <span className="eyebrow">KASAR DIMENSIONS</span>
            <h1>Designing premium, made-to-order pieces.</h1>
            <p>New hero campaigns will appear here as they are published.</p>
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
