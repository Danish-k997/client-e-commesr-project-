"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { useCategories, type CategoryRecord } from "../../lib/api/products";

const FALLBACK_CATEGORIES = [
  {
    _id: "home-living",
    name: "HOME & LIVING",
    slug: "home-living",
    description: "Useful everyday products",
    image:
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
  },
  {
    _id: "mobile-tech",
    name: "MOBILE",
    slug: "mobile-tech",
    description: "Stands & accessories",
    image:
      "https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=800&q=80",
  },
  {
    _id: "car-bike",
    name: "CAR & BIKE",
    slug: "car-bike",
    description: "Custom vehicle accessories",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBhHNFcF6bQQt8e_HDJz1r-EAYqDzgd8WbOCWZWV1Ux14T6kmeEiuNLzQmPf_atbG0X9Yf9eojXS98eDcZ4QV_ytTsHQl-_vFLk6tTS2Jsv8bhsH7w0QwB8R_Kg19tTzunJmrvpjIzFfGveaRICYOb4utIYsKbuFVcYqgK0zjairGykDiB63t9FllCw5xBoPSkgd96LOQ1d8gSZJOW-gWyDy-MHz9_P5VI5o3MGB1XIpCqHsWjoyCon",
  },
  {
    _id: "office-workspace",
    name: "OFFICE",
    slug: "office-workspace",
    description: "Smart workspace products",
    image:
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
  },
  {
    _id: "gifts",
    name: "GIFTS",
    slug: "gifts",
    description: "Personalised keepsakes",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAsPbjvLiZ8GySSv66vtBRjxDjMpLoGcSDhLoUyPcFnBO1v-BsRIkAyzJZyrEtHIzYDD5W1vMqWQh561CMnmUJSqfhIarAGucyXta7tqPggboDeKayl7slFUA8U6Us98RAEZUqGLakKWyZdSUwAZ3_lz_PFVYoJuqjgrknRo1ONSu_Azt0jRcbpl_imdibvn_h-sq_4g5Hm_1HKr8Upuac1nkxGDctCIx76PC-GL1Qa7Pw3ssjwBKuv",
  },
  {
    _id: "toys",
    name: "TOYS",
    slug: "toys",
    description: "Articulated figures & puzzles",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAZGsQ9JhylXKhcOs9rqf3KcvJ-bfyrMHhKPYXgh7tW37CqvbgwREYJTOwg4yn_1JY8CQ85zco4Omx2E_EGXkQn3sS4bUqNFIcZcBX4UlymCCj1Z0qC1sSzUUuOojlim9ZJMRSQqH-wn8rN97PP0QaEAEun1ghihPUYFTLnbg82JPx_bDxFr4oRmctVz7wPiujs6of-CQPzPAztQm2o4mKyLkb2ypXWqnovnYlA3OOQvEYx9TWG_-po",
  },
  {
    _id: "industrial",
    name: "INDUSTRIAL",
    slug: "industrial",
    description: "Functional replacement parts",
    image:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
  },
  {
    _id: "education",
    name: "EDUCATION",
    slug: "education",
    description: "DNA & scale models",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAVcRkfcTuovPL0DTSfOvaOcLUDQxt66T4UrYqjJFSbyj9eX7H6_H5x-5N0QH-1KezB57YSIFkIp9ukChELq-xVON0m4-4tX4kHUoehYwy_U0gE06BjRlt5LLsUlqM1X0o3NhO4-Dgt93BDcOtjEq8IYs2Nf4MapfU74ObEdzyIPiKtDFG8MqEV-ownhlsUFHNr6Nz_lAdJU1sGVc2XpTvrVfOg1nefgije3SThmRV-PKECuIzZdVR8",
  },
  {
    _id: "decoration",
    name: "DECORATION",
    slug: "decoration",
    description: "Sculptural art & decor",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBnrFE_yXUVsn1u2E-JOQlp9K4NsItMrBC1C5j9N5gCZLBTRvuQkYQ5F-UfiKD4B-yqGlIHp9IONpUYd-xQs6ibs_elHwa3kKAVkZukgLscBIorsGNjNC0X6NcTCPTE-jlEAKksyIM1BlNNTYtl__IDpi5eywnTLllC9iyzzaxBZq8MI9ac3Pfjppq7didv6lSE6Fu_9D06YwjlVMRDSnO-bURWzXLX79JiEJXMtUmJR1mRcYSWfB2wX5pHo_sUy8bldA",
  },
  {
    _id: "personalised",
    name: "PERSONALISED",
    slug: "personalised",
    description: "Bespoke text & designs",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAsPbjvLiZ8GySSv66vtBRjxDjMpLoGcSDhLoUyPcFnBO1v-BsRIkAyzJZyrEtHIzYDD5W1vMqWQh561CMnmUJSqfhIarAGucyXta7tqPggboDeKayl7slFUA8U6Us98RAEZUqGLakKWyZdSUwAZ3_lz_PFVYoJuqjgrknRo1ONSu_Azt0jRcbpl_imdibvn_h-sq_4g5Hm_1HKr8Upuac1nkxGDctCIx76PC-GL1Qa7Pw3ssjwBKuv",
  },
];

export default function ShopByCategorySection() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const categoriesQuery = useCategories();
  const rawCategories = categoriesQuery.data ?? [];

  const items =
    rawCategories.length > 0
      ? rawCategories.map((c: CategoryRecord, i: number) => ({
          _id: c._id,
          name: c.name,
          slug: c.slug,
          description: c.description || "Custom 3D printed collection",
          image: c.image || FALLBACK_CATEGORIES[i % FALLBACK_CATEGORIES.length].image,
        }))
      : FALLBACK_CATEGORIES;

  const scrollLeft = () => {
    carouselRef.current?.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRight = () => {
    carouselRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  return (
    <section className="py-16 bg-brand-cream/40 border-y border-brand-border" id="categories" aria-label="Shop by category">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-brand-muted block mb-1">
              CATALOG EXPLORER
            </span>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-brand-charcoal tracking-tight">
              SHOP BY CATEGORY
            </h2>
            <p className="text-sm text-brand-muted mt-1">
              Find something made for your space, work or idea.
            </p>
          </div>
          <div className="flex items-center gap-4 self-start sm:self-end">
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 text-xs font-heading font-bold uppercase tracking-wider text-brand-charcoal hover:text-brand-charcoal/70 transition-colors"
            >
              <span>VIEW ALL CATEGORIES</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M17 8l4 4m0 0l-4 4m4-4H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </Link>
            {/* Arrow Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={scrollLeft}
                aria-label="Scroll left"
                className="w-9 h-9 rounded-full border border-brand-border bg-white hover:bg-brand-cream text-brand-charcoal flex items-center justify-center transition-all shadow-subtle active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={scrollRight}
                aria-label="Scroll right"
                className="w-9 h-9 rounded-full border border-brand-border bg-white hover:bg-brand-cream text-brand-charcoal flex items-center justify-center transition-all shadow-subtle active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Category Carousel Container (10 Categories) */}
        <div
          ref={carouselRef}
          className="flex flex-row overflow-x-auto gap-5 no-scrollbar py-2 scroll-smooth snap-x snap-mandatory"
        >
          {items.map((cat, idx) => {
            const indexStr = String(idx + 1).padStart(2, "0");
            const href = `/shop?categoryId=${encodeURIComponent(cat._id)}`;

            return (
              <Link
                key={cat._id}
                href={href}
                className="w-[70vw] sm:w-[260px] lg:w-[245px] flex-shrink-0 snap-start group bg-white rounded-2xl border border-brand-border overflow-hidden shadow-subtle hover:shadow-card-hover transition-all flex flex-col hover:-translate-y-1"
              >
                <div className="h-[190px] w-full overflow-hidden bg-brand-cream/50 relative">
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 70vw, 260px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-brand-charcoal/80 backdrop-blur-sm text-white font-heading font-bold text-[10px]">
                    {indexStr}
                  </span>
                </div>
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="font-heading font-bold text-base text-brand-charcoal group-hover:text-brand-charcoal">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-brand-muted mt-1 line-clamp-1">{cat.description}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <span className="w-7 h-7 rounded-full bg-brand-cream flex items-center justify-center text-brand-charcoal group-hover:bg-brand-accent transition-colors">
                      <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}