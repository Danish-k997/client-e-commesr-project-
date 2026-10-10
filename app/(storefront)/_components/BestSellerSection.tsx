"use client";

import Link from "next/link";
import { useRef } from "react";
import { A11y, Autoplay, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper/types";

import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/navigation";
import "swiper/css/a11y";

import { useCustomerProducts } from "../../lib/api";
import ProductCard from "./ProductCard";

const AUTOPLAY_DELAY = 4500;
const BEST_SELLER_LIMIT = 10;

export default function BestSellerSection() {
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const swiperRef = useRef<SwiperInstance | null>(null);

  const productsQuery = useCustomerProducts({
    page: 1,
    limit: BEST_SELLER_LIMIT,
    sort: "newest",
    isFeatured: true,
  });

  const products = productsQuery.data?.products ?? [];

  if (productsQuery.isError || (!productsQuery.isPending && products.length === 0)) {
    return null;
  }

  return (
    <section className="py-16 md:py-24" id="bestsellers" aria-label="Bestsellers">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-brand-border gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-brand-muted block mb-1">
              CURATED SELECTION
            </span>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-brand-charcoal tracking-tight">
              BESTSELLERS
            </h2>
            <p className="text-sm text-brand-muted mt-1">
              Popular picks, ready to order.
            </p>
          </div>
          <div className="flex items-center gap-4 self-start sm:self-end">
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 text-xs font-heading font-bold uppercase tracking-wider text-brand-charcoal hover:text-brand-charcoal/70 transition-colors"
            >
              <span>VIEW ALL PRODUCTS</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 8l4 4m0 0l-4 4m4-4H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </Link>
            {/* Arrow Navigation */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                ref={prevButtonRef}
                aria-label="Previous best sellers"
                className="w-9 h-9 rounded-full border border-brand-border bg-white hover:bg-brand-cream text-brand-charcoal flex items-center justify-center transition-all shadow-subtle active:scale-95 disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
              <button
                type="button"
                ref={nextButtonRef}
                aria-label="Next best sellers"
                className="w-9 h-9 rounded-full border border-brand-border bg-white hover:bg-brand-cream text-brand-charcoal flex items-center justify-center transition-all shadow-subtle active:scale-95 disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Swiper Carousel */}
        <div className="relative">
          <Swiper
            modules={[Autoplay, Navigation, A11y]}
            slidesPerView={1.2}
            spaceBetween={16}
            breakpoints={{
              640: { slidesPerView: 2.3, spaceBetween: 20 },
              1024: { slidesPerView: 3.5, spaceBetween: 24 },
              1280: { slidesPerView: 4, spaceBetween: 24 },
            }}
            speed={560}
            grabCursor
            autoplay={{
              delay: AUTOPLAY_DELAY,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
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
            className="pb-4"
          >
            {products.map((product) => (
              <SwiperSlide key={product._id} className="h-auto">
                <ProductCard product={product} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}