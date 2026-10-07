import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest } from "next/server";

import {
  CUSTOMIZATION_IMAGE_FOLDER,
  CUSTOMIZATION_IMAGE_MIME_TYPES,
  MAX_CUSTOMIZATION_IMAGE_BYTES,
  formatImageSize,
  getImageFieldLimit,
  getImageFieldSizeLimit,
  isAcceptedImageMime,
} from "../../lib/customization";
import { cloudinary } from "../../lib/cloudinary";
import { connectDB } from "../../lib/db";
import { ApiError, handleApiError, ok, parseJsonBody, requireObjectId } from "../_utils/responses";
import { findPublicProduct } from "../products/_utils";

const FIELD_ID_PATTERN = /^cust_[a-zA-Z0-9_-]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);

    const productId = readRequiredString(body.productId, "productId");
    const fieldId = readRequiredString(body.fieldId, "fieldId");
    const imageDataUrl = readRequiredString(body.imageDataUrl, "imageDataUrl");
    const position = readPosition(body.position);

    requireObjectId(productId, "productId");

    if (!FIELD_ID_PATTERN.test(fieldId)) {
      throw new ApiError(400, "fieldId has an invalid format.");
    }

    await connectDB();

    const product = await findPublicProduct(productId);

    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    const customization = product.customization;

    if (!customization?.enabled || !Array.isArray(customization.fields)) {
      throw new ApiError(400, "This product does not accept customization.");
    }

    const field = customization.fields.find((entry) => entry.id === fieldId);

    if (!field || field.type !== "IMAGE") {
      throw new ApiError(400, "This customization field does not accept image uploads.");
    }

    const limit = getImageFieldLimit(field);

    if (position >= limit) {
      throw new ApiError(400, `This field accepts ${limit} ${limit === 1 ? "image" : "images"} maximum.`);
    }

    const parsedImage = parseImageDataUrl(imageDataUrl);
    const sizeLimit = getImageFieldSizeLimit(field);

    if (parsedImage.bytes > sizeLimit) {
      throw new ApiError(400, `Image must be ${formatImageSize(sizeLimit)} or smaller.`);
    }

    if (!(CUSTOMIZATION_IMAGE_MIME_TYPES as readonly string[]).includes(parsedImage.mime)) {
      throw new ApiError(400, "That file type is not supported. Use a JPG, PNG, WebP, GIF, or AVIF image.");
    }

    if (!isAcceptedImageMime(field, parsedImage.mime)) {
      throw new ApiError(400, "That file type is not allowed for this field.");
    }

    const sniffedMime = sniffImageMime(parsedImage.base64);

    if (!sniffedMime || sniffedMime !== parsedImage.mime) {
      throw new ApiError(400, "The file could not be verified as an image.");
    }

    const uploadResult = await uploadCustomizationImage(imageDataUrl);
    const publicId = uploadResult.public_id;

    return ok({
      image: {
        url: uploadResult.secure_url,
        publicId,
        deleteToken: signPublicId(publicId),
      },
    });
  } catch (error) {
    return handleApiError(error, "Customization upload API POST error:");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);

    const publicId = readRequiredString(body.publicId, "publicId");
    const deleteToken = readRequiredString(body.deleteToken, "deleteToken");

    if (!publicId.startsWith(`${CUSTOMIZATION_IMAGE_FOLDER}/`)) {
      throw new ApiError(400, "publicId is not a customization upload.");
    }

    if (!isValidSignature(publicId, deleteToken)) {
      throw new ApiError(403, "This upload cannot be removed.");
    }

    let result: { result?: string } | undefined;

    try {
      result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    } catch (error) {
      console.error("Customization image cleanup failed:", error);
      throw new ApiError(502, "We couldn't remove that image. Please try again.");
    }

    if (result?.result !== "ok" && result?.result !== "not found") {
      throw new ApiError(502, "We couldn't remove that image. Please try again.");
    }

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, "Customization upload API DELETE error:");
  }
}

function parseImageDataUrl(imageDataUrl: string) {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(imageDataUrl);

  if (!match || !match[2]) {
    throw new ApiError(400, "imageDataUrl must be a base64 encoded image data URL.");
  }

  const mime = match[1].trim().toLowerCase();
  const base64 = match[3].replace(/\s+/g, "");

  if (!mime || !base64) {
    throw new ApiError(400, "imageDataUrl must contain image data.");
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((base64.length * 3) / 4) - padding;

  if (bytes <= 0) {
    throw new ApiError(400, "imageDataUrl must contain image data.");
  }

  if (bytes > MAX_CUSTOMIZATION_IMAGE_BYTES) {
    throw new ApiError(400, `Image must be ${formatImageSize(MAX_CUSTOMIZATION_IMAGE_BYTES)} or smaller.`);
  }

  return { mime, base64, bytes };
}

async function uploadCustomizationImage(imageDataUrl: string) {
  try {
    return await cloudinary.uploader.upload(imageDataUrl, {
      folder: CUSTOMIZATION_IMAGE_FOLDER,
      resource_type: "image",
      transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
    });
  } catch (error) {
    console.error("Customization image upload failed:", error);
    throw new ApiError(502, "We couldn't upload that image. Please try again.");
  }
}

function sniffImageMime(base64: string) {
  try {
    const header = Buffer.from(base64.slice(0, 64), "base64");

    if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return "image/jpeg";
    }

    if (
      header.length >= 4 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    ) {
      return "image/png";
    }

    if (header.length >= 4 && header.toString("ascii", 0, 3) === "GIF") {
      return "image/gif";
    }

    if (
      header.length >= 12 &&
      header.toString("ascii", 0, 4) === "RIFF" &&
      header.toString("ascii", 8, 12) === "WEBP"
    ) {
      return "image/webp";
    }

    if (header.length >= 12 && header.toString("ascii", 4, 8) === "ftyp") {
      const brand = header.toString("ascii", 8, 12);

      if (brand === "avif" || brand === "avis") {
        return "image/avif";
      }
    }

    return null;
  } catch {
    return null;
  }
}

function signPublicId(publicId: string) {
  const key = process.env.CLOUDINARY_API_SECRET;

  if (!key) {
    throw new ApiError(503, "Image uploads are unavailable right now.");
  }

  return createHmac("sha256", key).update(publicId).digest("hex");
}

function isValidSignature(publicId: string, token: string) {
  try {
    const expected = Buffer.from(signPublicId(publicId), "hex");
    const provided = Buffer.from(token, "hex");

    return expected.length === provided.length && timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

function readRequiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${label} is required.`);
  }

  return value.trim();
}

function readPosition(value: unknown) {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ApiError(400, "position must be a non-negative integer.");
  }

  return value;
}

