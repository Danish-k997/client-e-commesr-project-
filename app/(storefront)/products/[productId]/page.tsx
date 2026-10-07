import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { requireObjectId } from "../../../api/_utils/responses";
import { findProductVariants, findPublicProduct, serializeCustomerProduct } from "../../../api/products/_utils";
import { connectDB } from "../../../lib/db";
import type { CustomerProductRecord } from "../../../lib/api";
import ProductDetailView from "./_components/ProductDetailView";

type ProductPageProps = {
  params: Promise<{ productId: string }>;
};

const getProductForPage = cache(async (productId: string): Promise<CustomerProductRecord | null> => {
  try {
    requireObjectId(productId, "productId");
  } catch {
    return null;
  }

  await connectDB();

  const product = await findPublicProduct(productId);

  if (!product) {
    return null;
  }

  const variants = await findProductVariants(productId);

  return serializeCustomerProduct(product, variants) as unknown as CustomerProductRecord;
});

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProductForPage(productId);

  if (!product) {
    return { title: "Product not found | KASAR DIMENSIONS" };
  }

  const title = product.seoTitle?.trim() || product.title;
  const description =
    product.seoDescription?.trim() ||
    product.shortDescription?.trim() ||
    product.description.replace(/\s+/g, " ").trim().slice(0, 160);

  const primaryImage = product.images.find((image) => image.isPrimary && image.url) ?? product.images.find((image) => image.url);

  return {
    title,
    description,
    alternates: {
      canonical: `/products/${product._id}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: primaryImage ? [{ url: primaryImage.url, alt: primaryImage.altText || product.title }] : undefined,
    },
    twitter: {
      card: primaryImage ? "summary_large_image" : "summary",
      title,
      description,
      images: primaryImage ? [primaryImage.url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { productId } = await params;
  const product = await getProductForPage(productId);

  if (!product) {
    notFound();
  }

  return <ProductDetailView key={product._id} initialProduct={product} />;
}
