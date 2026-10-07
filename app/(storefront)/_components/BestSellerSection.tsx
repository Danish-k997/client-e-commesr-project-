"use client";

import styles from "./BestSellerSection.module.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { A11y, Autoplay, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper/types";

import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/navigation";
import "swiper/css/a11y";

import {
  ApiClientError,
  useCustomerProducts,
  type ProductRecord,
} from "../../lib/api";
import { useAddCartItem } from "../../lib/api/cart";

const AUTOPLAY_DELAY = 3800;
const BEST_SELLER_LIMIT = 10;

const BEST_SELLER_BASE_VIEWS = 1.2;
const BEST_SELLER_BASE_GAP = 16;

const BEST_SELLER_BREAKPOINTS = {
  768: { slidesPerView: 2.4, spaceBetween: 16 },
  981: { slidesPerView: 3.4, spaceBetween: 20 },
  1280: { slidesPerView: 4.5, spaceBetween: 20 },
} as const;

type BestSellerBreakpoint = keyof typeof BEST_SELLER_BREAKPOINTS;

function computeVisibleSlides(width: number) {
  let visible = BEST_SELLER_BASE_VIEWS;

  (Object.keys(BEST_SELLER_BREAKPOINTS) as unknown as BestSellerBreakpoint[])
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((breakpoint) => {
      if (width >= breakpoint) {
        visible = BEST_SELLER_BREAKPOINTS[breakpoint as BestSellerBreakpoint].slidesPerView;
      }
    });

  return visible;
}

function useVisibleSlides() {
  const [visibleSlides, setVisibleSlides] = useState(() =>
    typeof window === "undefined" ? BEST_SELLER_BASE_VIEWS : computeVisibleSlides(window.innerWidth)
  );

  useEffect(() => {
    const mediaQueries = (Object.keys(BEST_SELLER_BREAKPOINTS) as unknown as BestSellerBreakpoint[])
      .map(Number)
      .map((breakpoint) => window.matchMedia(`(min-width: ${breakpoint}px)`));

    const sync = () => setVisibleSlides(computeVisibleSlides(window.innerWidth));

    mediaQueries.forEach((mediaQuery) => mediaQuery.addEventListener("change", sync));
    return () => mediaQueries.forEach((mediaQuery) => mediaQuery.removeEventListener("change", sync));
  }, []);

  return visibleSlides;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mediaQuery.matches);

    onChange();
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function getPrimaryImage(product: ProductRecord) {
  return product.images.find((image) => image.isPrimary && image.url) ?? product.images.find((image) => image.url);
}

function canAddDirectly(product: ProductRecord) {
  return !product.hasVariants && !product.customization?.enabled;
}

type BestSellerHeaderProps = {
  showControls: boolean;
  prevButtonRef?: React.RefObject<HTMLButtonElement | null>;
  nextButtonRef?: React.RefObject<HTMLButtonElement | null>;
};

function BestSellerHeader({ showControls, prevButtonRef, nextButtonRef }: BestSellerHeaderProps) {
  return (
    <div className="best-seller-header">
      <div>
        <p className="eyebrow">Curated by the studio</p>
        <h2 className="best-seller-title">Best sellers</h2>
        <p className="best-seller-subtitle">
          Handpicked pieces from the KASAR DIMENSIONS collection.
        </p>
      </div>
      <div className="best-seller-controls" hidden={!showControls}>
        <button
          type="button"
          ref={prevButtonRef}
          className="best-seller-arrow"
          aria-label="Previous best sellers"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          ref={nextButtonRef}
          className="best-seller-arrow"
          aria-label="Next best sellers"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function BestSellerCard({ product }: { product: ProductRecord }) {
  const router = useRouter();
  const addMutation = useAddCartItem();
  const [justAdded, setJustAdded] = useState(false);
  const [addError, setAddError] = useState("");
  const feedbackTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  const image = getPrimaryImage(product);
  const productHref = `/products/${product._id}`;
  const outOfStock = product.availability === "OUT_OF_STOCK";
  const supportsDirectAdd = canAddDirectly(product);
  const isPendingThis = addMutation.isPending;
  const showAdded = addMutation.isSuccess && justAdded && !outOfStock;

  function handleAddToCart() {
    if (isPendingThis) {
      return;
    }

    addMutation.mutate(
      { productId: product._id, variantId: null, quantity: 1 },
      {
        onSuccess: () => {
          setAddError("");
          setJustAdded(true);
          if (feedbackTimer.current !== null) {
            window.clearTimeout(feedbackTimer.current);
          }
          feedbackTimer.current = window.setTimeout(() => {
            setJustAdded(false);
            addMutation.reset();
          }, 2400);
        },
        onError: (error) => {
          if (error instanceof ApiClientError && error.statusCode === 401) {
            router.push("/login");
            return;
          }
          const message =
            error instanceof ApiClientError ? error.message : "Couldn’t add to cart. Please try again.";
          setAddError(message);
          if (feedbackTimer.current !== null) {
            window.clearTimeout(feedbackTimer.current);
          }
          feedbackTimer.current = window.setTimeout(() => setAddError(""), 3200);
        },
      }
    );
  }

  const addLabel = showAdded ? "Added" : isPendingThis ? "Adding…" : "Add to Cart";

  return (
    <article className="best-seller-card">
      <Link className="best-seller-card-media" href={productHref}>
        {image ? (
          <Image
            src={image.url}
            alt={image.altText || product.title}
            fill
            sizes="(max-width: 640px) 74vw, (max-width: 980px) 40vw, 300px"
            draggable={false}
          />
        ) : (
          <span className="best-seller-no-image">Image unavailable</span>
        )}
        <span className="best-seller-badge">Best Seller</span>
        <span
          className={`best-seller-availability${outOfStock ? " is-unavailable" : ""}`}
        >
          {outOfStock ? "Out of stock" : "In stock"}
        </span>
      </Link>

      <div className="best-seller-card-body">
        <h3 className="best-seller-card-title">
          <Link href={productHref}>
            {product.title}
          </Link>
        </h3>

        <div className="best-seller-card-prices">
          <strong>{formatPrice(product.basePrice)}</strong>
          {product.compareAtPrice !== null &&
            product.compareAtPrice !== undefined &&
            product.compareAtPrice > product.basePrice && (
              <span className="best-seller-compare-at">{formatPrice(product.compareAtPrice)}</span>
            )}
        </div>

        <div className="best-seller-card-actions">
          {supportsDirectAdd && !outOfStock ? (
            <button
              type="button"
              className={`best-seller-add-btn${showAdded ? " is-added" : ""}`}
              disabled={isPendingThis}
              onClick={handleAddToCart}
            >
              {addLabel}
            </button>
          ) : (
            <Link className="best-seller-add-btn best-seller-choose-btn" href={productHref}>
              {outOfStock ? "View product" : "Choose options"}
            </Link>
          )}
          <Link className="best-seller-view-link" href={productHref}>
            View details
          </Link>
        </div>

        {addError && <p className="best-seller-add-error" role="alert">{addError}</p>}
      </div>
    </article>
  );
}

function BestSellerCardSkeleton() {
  return (
    <div className="best-seller-skeleton" aria-hidden="true">
      <span className="best-seller-skeleton-media" />
      <span className="best-seller-skeleton-line" />
      <span className="best-seller-skeleton-line short" />
    </div>
  );
}

function BestSellerShelf({ products }: { products: ProductRecord[] }) {
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const swiperRef = useRef<SwiperInstance | null>(null);

  const reducedMotion = usePrefersReducedMotion();
  const visibleSlides = useVisibleSlides();

  const canScroll = products.length > visibleSlides;
  const autoplayReady = canScroll && !reducedMotion;

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper?.autoplay) {
      return;
    }

    if (autoplayReady) {
      swiper.autoplay.start();
    } else {
      swiper.autoplay.stop();
    }
  }, [autoplayReady]);

  function pauseAutoplay() {
    if (autoplayReady) {
      swiperRef.current?.autoplay?.stop();
    }
  }

  function resumeAutoplay(event: React.FocusEvent<HTMLDivElement>) {
    if (!autoplayReady || event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    swiperRef.current?.autoplay?.start();
  }

  return (
    <div className="best-seller-shelf">
      <BestSellerHeader
        showControls={canScroll}
        prevButtonRef={prevButtonRef}
        nextButtonRef={nextButtonRef}
      />
      <div
        className="best-seller-viewport"
        onFocusCapture={pauseAutoplay}
        onBlurCapture={resumeAutoplay}
      >
        <Swiper
          modules={[Autoplay, Navigation, A11y]}
          slidesPerView={BEST_SELLER_BASE_VIEWS}
          spaceBetween={BEST_SELLER_BASE_GAP}
          breakpoints={BEST_SELLER_BREAKPOINTS}
          speed={560}
          grabCursor
          autoplay={{
            delay: AUTOPLAY_DELAY,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
            stopOnLastSlide: true,
          }}
          onBeforeInit={(swiper) => {
            const navigation = swiper.params.navigation;
            if (navigation && prevButtonRef.current && nextButtonRef.current) {
              navigation.prevEl = prevButtonRef.current;
              navigation.nextEl = nextButtonRef.current;
            }
          }}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          className="best-seller-swiper"
        >
          {products.map((product) => (
            <SwiperSlide key={product._id} className="best-seller-slide">
              <BestSellerCard product={product} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

export default function BestSellerSection() {
  const productsQuery = useCustomerProducts({
    page: 1,
    limit: BEST_SELLER_LIMIT,
    sort: "newest",
    isFeatured: true,
  });

  if (productsQuery.isError) {
    return null;
  }

  const products = productsQuery.data?.products ?? [];

  if (!productsQuery.isPending && products.length === 0) {
    return null;
  }

  return (
    <section className="best-seller-section" aria-label="Best Sellers">
      {productsQuery.isPending ? (
        <>
          <BestSellerHeader showControls={false} />
          <div className="best-seller-skeleton-row" aria-hidden="true">
            {Array.from({ length: 5 }, (_, index) => (
              <BestSellerCardSkeleton key={index} />
            ))}
          </div>
        </>
      ) : (
        <BestSellerShelf products={products} />
      )}
    </section>
  );
}