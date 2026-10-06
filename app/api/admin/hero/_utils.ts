import mongoose from "mongoose";

import { cloudinary } from "../../../lib/cloudinary";
import { Product } from "../../../models";
import { ApiError } from "../../_utils/responses";

export type HeroImageValue = {
  url: string;
  publicId?: string;
  altText?: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringValue(value: unknown, label: string, required: boolean) {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed && required) {
      throw new ApiError(400, `${label} is required.`);
    }

    return trimmed || undefined;
  }

  if (required) {
    throw new ApiError(400, `${label} is required.`);
  }

  return undefined;
}

export function normalizeCta(value: unknown, fallback: { label: string; href: string }) {
  if (!isRecord(value)) {
    return fallback;
  }

  const label = getStringValue(value.label, "cta label", false) ?? fallback.label;
  const href = getStringValue(value.href, "cta href", false) ?? fallback.href;

  return {
    label: label || fallback.label,
    href: href || fallback.href,
  };
}

export function normalizeStatus(value: unknown): "ACTIVE" | "INACTIVE" {
  return value === "INACTIVE" ? "INACTIVE" : "ACTIVE";
}

export function normalizeSortOrder(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);

    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return fallback;
}

export async function destroyCloudinaryAsset(publicId?: string) {
  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.warn("Failed to destroy Cloudinary asset:", publicId, error);
  }
}

export async function uploadHeroImage(imageDataUrl: string, altText: string) {
  const result = await cloudinary.uploader.upload(imageDataUrl, {
    folder: "kesar-dimensions/hero",
    resource_type: "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    altText: altText || result.original_filename || "Hero slide image",
  } satisfies HeroImageValue;
}

export async function resolveHeroImage(
  body: Record<string, unknown>,
  existingImage?: HeroImageValue
): Promise<HeroImageValue> {
  const imageUrl = getStringValue(body.imageUrl, "imageUrl", false) ?? existingImage?.url;
  const imageDataUrl = getStringValue(body.imageDataUrl, "imageDataUrl", false);
  const altText = getStringValue(body.imageAltText, "imageAltText", false) ?? existingImage?.altText ?? "";

  if (imageDataUrl) {
    return uploadHeroImage(imageDataUrl, altText);
  }

  if (imageUrl) {
    return {
      url: imageUrl,
      publicId: existingImage?.publicId ?? "",
      altText,
    };
  }

  if (existingImage && existingImage.url) {
    return existingImage;
  }

  throw new ApiError(400, "Image is required for a hero slide.");
}

export async function resolveHeroProductId(value: unknown, fallback: string | null) {
  const nextValue = value === undefined || value === "" ? fallback : value;

  if (nextValue === null || nextValue === undefined) {
    return null;
  }

  const productId = String(nextValue).trim();

  if (!productId) {
    return null;
  }

  if (!/^[a-f\d]{24}$/i.test(productId)) {
    throw new ApiError(400, "productId must be a valid ObjectId.");
  }

  const product = await Product.findById(productId).select("_id").lean();

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  return new mongoose.Types.ObjectId(productId);
}

export async function buildHeroPayload(
  body: Record<string, unknown>,
  existing?: { image?: HeroImageValue }
): Promise<{
  badge: string;
  title: string;
  description: string;
  image: HeroImageValue;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  productId: mongoose.Types.ObjectId | null;
  status: "ACTIVE" | "INACTIVE";
  sortOrder: number;
}> {
  const badge = getStringValue(body.badge, "badge", true) ?? "";
  const title = getStringValue(body.title, "title", true) ?? "";
  const description = getStringValue(body.description, "description", true) ?? "";
  const primaryCta = normalizeCta(body.primaryCta, {
    label: "SHOP BESTSELLERS",
    href: "/products",
  });
  const secondaryCta = normalizeCta(body.secondaryCta, {
    label: "CUSTOMIZE YOUR ORDER",
    href: "https://wa.me/918102888865",
  });
  const productId = await resolveHeroProductId(body.productId, null);
  const image = await resolveHeroImage(body, existing?.image);

  return {
    badge,
    title,
    description,
    image,
    primaryCta,
    secondaryCta,
    productId,
    status: normalizeStatus(body.status),
    sortOrder: normalizeSortOrder(body.sortOrder, 0),
  };
}
