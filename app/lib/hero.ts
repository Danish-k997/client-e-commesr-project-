import { HeroSlide, Product, type HeroSlideStatus } from "../models";

import { connectDB } from "./db";

export type HeroSlideWithProduct = {
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
  product: unknown | null;
  status: HeroSlideStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export async function getActiveHeroSlides(): Promise<HeroSlideWithProduct[]> {
  await connectDB();

  const slides = await HeroSlide.find({ status: "ACTIVE" })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

  const productIds = slides
    .map((slide) => slide.productId?.toString())
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds }, status: "ACTIVE" }).lean()
    : [];

  const productMap = new Map<string, unknown>(
    products.map((product) => [product._id.toString(), product as unknown])
  );

  return slides.map((slide) => {
    const product: unknown | null = slide.productId
      ? (productMap.get(slide.productId.toString()) ?? null)
      : null;

    return {
      _id: slide._id.toString(),
      badge: slide.badge,
      title: slide.title,
      description: slide.description,
      image: {
        url: slide.image.url,
        publicId: slide.image.publicId,
        altText: slide.image.altText,
      },
      primaryCta: {
        label: slide.primaryCta.label,
        href: slide.primaryCta.href,
      },
      secondaryCta: {
        label: slide.secondaryCta.label,
        href: slide.secondaryCta.href,
      },
      productId: slide.productId ? slide.productId.toString() : null,
      product,
      status: slide.status,
      sortOrder: slide.sortOrder,
      createdAt: slide.createdAt.toISOString(),
      updatedAt: slide.updatedAt.toISOString(),
    } satisfies HeroSlideWithProduct;
  });
}

export async function getAllHeroSlidesForAdmin(): Promise<HeroSlideWithProduct[]> {
  await connectDB();

  const slides = await HeroSlide.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();

  const productIds = slides
    .map((slide) => slide.productId?.toString())
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).lean()
    : [];

  const productMap = new Map<string, unknown>(
    products.map((product) => [product._id.toString(), product as unknown])
  );

  return slides.map((slide) => {
    const product: unknown | null = slide.productId
      ? (productMap.get(slide.productId.toString()) ?? null)
      : null;

    return {
      _id: slide._id.toString(),
      badge: slide.badge,
      title: slide.title,
      description: slide.description,
      image: {
        url: slide.image.url,
        publicId: slide.image.publicId,
        altText: slide.image.altText,
      },
      primaryCta: {
        label: slide.primaryCta.label,
        href: slide.primaryCta.href,
      },
      secondaryCta: {
        label: slide.secondaryCta.label,
        href: slide.secondaryCta.href,
      },
      productId: slide.productId ? slide.productId.toString() : null,
      product,
      status: slide.status,
      sortOrder: slide.sortOrder,
      createdAt: slide.createdAt.toISOString(),
      updatedAt: slide.updatedAt.toISOString(),
    } satisfies HeroSlideWithProduct;
  });
}
