import type { CustomizationDimensionsValue, CustomizationImageValue } from "./customization";

import {
  MAX_CUSTOMIZATION_TEXTAREA_LENGTH,
} from "./customization";

export const MAX_CART_ITEMS = 20;
export const MAX_CART_ITEM_QUANTITY = 99;
export const MAX_CART_ITEM_CUSTOMIZATION_ENTRIES = 20;
export const MAX_CART_ITEM_CUSTOMIZATION_IMAGES = 12;

export type CartCustomizationEntry =
  | {
      fieldId: string;
      type: "TEXT" | "TEXTAREA" | "SELECT";
      value: string;
    }
  | {
      fieldId: string;
      type: "NUMBER";
      value: number;
    }
  | {
      fieldId: string;
      type: "IMAGE";
      value: CustomizationImageValue[];
    }
  | {
      fieldId: string;
      type: "DIMENSIONS";
      value: CustomizationDimensionsValue;
    };

export type CartIdentityInput = {
  productId: string;
  variantId?: string | null;
  customization?: readonly CartCustomizationEntry[];
};

const DIMENSION_AXIS_KEYS = ["width", "height", "depth"] as const;

function normalizeReferenceId(id: string | null | undefined) {
  if (!id) {
    return "";
  }

  return id.trim().toLowerCase();
}

function canonicalizeEntryKey(entry: CartCustomizationEntry) {
  const fieldId = entry.fieldId.trim().toLowerCase();

  switch (entry.type) {
    case "TEXT":
    case "TEXTAREA":
    case "SELECT":
      return `${fieldId}=${entry.type}=s:${entry.value.trim()}`;

    case "NUMBER":
      return `${fieldId}=${entry.type}=n:${String(entry.value)}`;

    case "IMAGE": {
      const images = entry.value
        .map((image) => {
          const url = image.url.trim().toLowerCase();
          const publicId = image.publicId.trim().toLowerCase();
          return `${url}|||${publicId}`;
        })
        .sort();

      return `${fieldId}=${entry.type}=i:[${images.join(",")}]`;
    }

    case "DIMENSIONS": {
      const value = entry.value;
      const unit = typeof value.unit === "string" ? value.unit.trim().toLowerCase() : "cm";
      const axes = DIMENSION_AXIS_KEYS.filter((axis) => typeof value[axis] === "number")
        .map((axis) => `${axis}:${String(value[axis])}`)
        .join(",");

      return `${fieldId}=${entry.type}=d:${unit}{${axes}}`;
    }

    default:
      return `${fieldId}=unknown`;
  }
}

export function getCartItemIdentityKey(input: CartIdentityInput) {
  const productId = normalizeReferenceId(input.productId);
  const variantId = normalizeReferenceId(input.variantId);
  const customization = input.customization ?? [];

  const customizationKey = customization
    .map(canonicalizeEntryKey)
    .sort()
    .join(";");

  return [productId, variantId, customizationKey].join("::");
}

export function sameCartItemIdentity(a: CartIdentityInput, b: CartIdentityInput) {
  return getCartItemIdentityKey(a) === getCartItemIdentityKey(b);
}

export function isValidCartCustomizationEntry(entry: CartCustomizationEntry) {
  if (
    !entry ||
    typeof entry !== "object" ||
    typeof entry.fieldId !== "string" ||
    entry.fieldId.trim().length === 0 ||
    typeof entry.type !== "string"
  ) {
    return false;
  }

  switch (entry.type) {
    case "TEXT":
    case "TEXTAREA":
    case "SELECT": {
      const value = entry.value;
      return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_CUSTOMIZATION_TEXTAREA_LENGTH;
    }

    case "NUMBER": {
      return typeof entry.value === "number" && Number.isInteger(entry.value) && entry.value >= 0;
    }

    case "IMAGE": {
      const images = entry.value;

      if (!Array.isArray(images) || images.length === 0 || images.length > MAX_CART_ITEM_CUSTOMIZATION_IMAGES) {
        return false;
      }

      return images.every(
        (image) =>
          Boolean(image) &&
          typeof image === "object" &&
          typeof image.url === "string" &&
          image.url.trim().length > 0 &&
          !image.url.startsWith("data:") &&
          typeof image.publicId === "string" &&
          image.publicId.trim().length > 0
      );
    }

    case "DIMENSIONS": {
      const value = entry.value;

      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
      }

      if (typeof value.unit !== "undefined" && (typeof value.unit !== "string" || value.unit.trim().length === 0)) {
        return false;
      }

      const hasAxis = DIMENSION_AXIS_KEYS.some((axis) => {
        const axisValue = value[axis];
        return (
          typeof axisValue !== "undefined" &&
          typeof axisValue === "number" &&
          Number.isFinite(axisValue) &&
          axisValue > 0
        );
      });

      if (!hasAxis) {
        return false;
      }

      return DIMENSION_AXIS_KEYS.every((axis) => {
        const axisValue = value[axis];
        return (
          typeof axisValue === "undefined" || (typeof axisValue === "number" && Number.isFinite(axisValue) && axisValue > 0)
        );
      });
    }

    default:
      return false;
  }
}