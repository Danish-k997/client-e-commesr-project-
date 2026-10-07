import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cloudinary } from "./cloudinary";
import { formatImageSize } from "./customization";
import { CUSTOM_REQUEST_MAX_FILE_BYTES } from "./customRequests";

export const CUSTOM_REQUEST_REFERENCE_FOLDER = "kesar-dimensions/custom-requests";

export type CustomRequestFileKind = "image" | "pdf" | "model";
export type CustomRequestFileResourceType = "image" | "raw";

type ReferenceFileType = {
  extension: string;
  mime: string;
  kind: CustomRequestFileKind;
  resourceType: CustomRequestFileResourceType;
};

const EXTENSION_TYPES: Record<string, ReferenceFileType> = {
  jpg: { extension: "jpg", mime: "image/jpeg", kind: "image", resourceType: "image" },
  jpeg: { extension: "jpeg", mime: "image/jpeg", kind: "image", resourceType: "image" },
  png: { extension: "png", mime: "image/png", kind: "image", resourceType: "image" },
  pdf: { extension: "pdf", mime: "application/pdf", kind: "pdf", resourceType: "image" },
  stl: { extension: "stl", mime: "model/stl", kind: "model", resourceType: "raw" },
  step: { extension: "step", mime: "model/step", kind: "model", resourceType: "raw" },
  stp: { extension: "stp", mime: "model/step", kind: "model", resourceType: "raw" },
};

export type ParsedReferenceFileDataUrl = {
  base64: string;
  bytes: number;
};

export function getExtensionFromFilename(filename: string) {
  if (typeof filename !== "string") {
    return "";
  }

  const match = /\.([a-z\d]+)$/i.exec(filename.trim());

  return match ? match[1].toLowerCase() : "";
}

export function getReferenceFileType(extension: string) {
  return EXTENSION_TYPES[extension] ?? null;
}

export function parseReferenceFileDataUrl(dataUrl: string, maxBytes = CUSTOM_REQUEST_MAX_FILE_BYTES) {
  const match = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(dataUrl);

  if (!match || !match[2]) {
    return {
      error: "फाइल का format सही नहीं है। कृपया दोबारा उठाएं।",
    } as const;
  }

  const base64 = match[3].replace(/\s+/g, "");

  if (!base64) {
    return { error: "फाइल खाली है। कृपया दोबारा try करें।" } as const;
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = Math.floor((base64.length * 3) / 4) - padding;

  if (bytes <= 0) {
    return { error: "फाइल खाली है। कृपया दोबारा try करें।" } as const;
  }

  if (bytes > maxBytes) {
    return {
      error: `फाइल बहुत बड़ी है। ${formatImageSize(maxBytes)} से छोटी फाइल भेजें।`,
    } as const;
  }

  return { error: null, base64, bytes } as const;
}

export function isReferenceFileContentValid(base64: string, kind: CustomRequestFileKind) {
  try {
    const header = Buffer.from(base64.slice(0, 64), "base64");

    if (kind === "image" || kind === "pdf") {
      if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
        return true;
      }

      if (header.length >= 4 && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
        return true;
      }

      if (header.length >= 4 && header.toString("ascii", 0, 4) === "%PDF") {
        return true;
      }

      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function uploadReferenceFile(
  dataUrl: string,
  filename: string,
  type: ReferenceFileType,
  size: number
) {
  try {
    const options: Record<string, unknown> = {
      folder: CUSTOM_REQUEST_REFERENCE_FOLDER,
      resource_type: type.resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    };

    if (type.kind === "image") {
      options.transformation = [{ quality: "auto" }, { fetch_format: "auto" }];
    }

    const result = await cloudinary.uploader.upload(dataUrl, options);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      filename,
      mime: type.mime,
      size,
      resourceType: type.resourceType,
    };
  } catch (error) {
    console.error("Custom request reference upload failed:", error);
    return null;
  }
}

export function signReferencePublicId(publicId: string) {
  const key = process.env.CLOUDINARY_API_SECRET;

  if (!key) {
    return null;
  }

  return createHmac("sha256", key).update(publicId).digest("hex");
}

export function isValidReferenceSignature(publicId: string, token: unknown) {
  if (typeof token !== "string" || !/^[a-f\d]{64}$/i.test(token)) {
    return false;
  }

  try {
    const expected = signReferencePublicId(publicId);

    if (!expected) {
      return false;
    }

    const expectedBuffer = Buffer.from(expected, "hex");
    const providedBuffer = Buffer.from(token, "hex");

    return (
      expectedBuffer.length === providedBuffer.length &&
      timingSafeEqual(expectedBuffer, providedBuffer)
    );
  } catch {
    return false;
  }
}

export async function destroyReferenceFile(publicId: string, resourceType: "image" | "raw") {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result?.result === "ok" || result?.result === "not found";
  } catch (error) {
    console.error("Custom request reference cleanup failed:", error);
    return false;
  }
}