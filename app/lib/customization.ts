import type { CustomizationConfig, CustomizationField } from "./api/products";

export const CUSTOMIZATION_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const MAX_CUSTOMIZATION_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_CUSTOMIZATION_TEXT_LENGTH = 300;
export const MAX_CUSTOMIZATION_TEXTAREA_LENGTH = 2000;

export const CUSTOMIZATION_IMAGE_FOLDER = "kesar-dimensions/customizations";

const DIMENSION_AXES = ["width", "height", "depth"] as const;

export type CustomizationImageValue = {
  url: string;
  publicId: string;
};

export type CustomizationImageDraft = CustomizationImageValue & {
  deleteToken?: string;
};

export type CustomizationDimensionsDraft = {
  width: string;
  height: string;
  depth: string;
};

export type CustomizationFieldValue = string | CustomizationImageDraft[] | CustomizationDimensionsDraft;

export type CustomizationValues = Record<string, CustomizationFieldValue | undefined>;

export type CustomizationDimensionsValue = {
  unit: string;
  width?: number;
  height?: number;
  depth?: number;
};

export type CustomizationEntry =
  | {
      fieldId: string;
      key: string;
      label: string;
      type: "TEXT" | "TEXTAREA" | "SELECT";
      value: string;
    }
  | {
      fieldId: string;
      key: string;
      label: string;
      type: "NUMBER";
      value: number;
    }
  | {
      fieldId: string;
      key: string;
      label: string;
      type: "IMAGE";
      value: CustomizationImageValue[];
    }
  | {
      fieldId: string;
      key: string;
      label: string;
      type: "DIMENSIONS";
      value: CustomizationDimensionsValue;
    };

export type CartReadySelection = {
  productId: string;
  variantId: string | null;
  quantity: number;
  customization: CustomizationEntry[];
};

export type CustomizationPreparation =
  | { valid: true; entries: CustomizationEntry[] }
  | { valid: false; errors: Record<string, string> };

export function getEnabledCustomizationFields(config?: CustomizationConfig): CustomizationField[] {
  if (!config?.enabled || !Array.isArray(config.fields)) {
    return [];
  }

  return config.fields;
}

export type CustomizationImageConstraints = {
  maxFiles?: number | null;
  maxFileSize?: number | null;
  acceptedFileTypes?: string[];
};

export function getImageFieldLimit(field: CustomizationImageConstraints) {
  return typeof field.maxFiles === "number" && field.maxFiles >= 1 ? field.maxFiles : 1;
}

export function getImageFieldSizeLimit(field: CustomizationImageConstraints) {
  return typeof field.maxFileSize === "number" && field.maxFileSize >= 1
    ? Math.min(field.maxFileSize, MAX_CUSTOMIZATION_IMAGE_BYTES)
    : MAX_CUSTOMIZATION_IMAGE_BYTES;
}

export function isAcceptedImageMime(field: CustomizationImageConstraints, mime: string) {
  const accepted = (field.acceptedFileTypes ?? []).map((entry) => entry.trim().toLowerCase()).filter(Boolean);

  if (accepted.length === 0) {
    return (CUSTOMIZATION_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
  }

  return accepted.some((entry) => entry === mime || entry === "image/*" || entry === "*/*");
}

export function buildImageAcceptAttribute(field: CustomizationImageConstraints) {
  const supported = CUSTOMIZATION_IMAGE_MIME_TYPES as readonly string[];
  const accepted = (field.acceptedFileTypes ?? []).map((entry) => entry.trim().toLowerCase()).filter(Boolean);

  if (accepted.length === 0) {
    return supported.join(",");
  }

  return supported.filter((mime) => isAcceptedImageMime(field, mime)).join(",");
}

export function formatImageSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    const megabytes = bytes / (1024 * 1024);
    return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

export function readTextValue(value: CustomizationFieldValue | undefined) {
  return typeof value === "string" ? value : "";
}

export function readImageValue(value: CustomizationFieldValue | undefined): CustomizationImageDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is CustomizationImageDraft =>
      Boolean(entry) &&
      typeof entry === "object" &&
      typeof entry.url === "string" &&
      entry.url.length > 0 &&
      typeof entry.publicId === "string" &&
      entry.publicId.length > 0
  );
}

export function readDimensionsValue(value: CustomizationFieldValue | undefined): CustomizationDimensionsDraft {
  const empty: CustomizationDimensionsDraft = { width: "", height: "", depth: "" };

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return empty;
  }

  return {
    width: typeof value.width === "string" ? value.width : "",
    height: typeof value.height === "string" ? value.height : "",
    depth: typeof value.depth === "string" ? value.depth : "",
  };
}

export function prepareCustomizationEntries(
  fields: CustomizationField[],
  values: CustomizationValues
): CustomizationPreparation {
  const errors: Record<string, string> = {};
  const entries: CustomizationEntry[] = [];

  for (const field of fields) {
    const result = validateField(field, values[field.id]);

    if (result.error) {
      errors[field.id] = result.error;
      continue;
    }

    if (result.entry) {
      entries.push(result.entry);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, entries };
}

type FieldValidationResult = {
  error?: string;
  entry?: CustomizationEntry;
};

function validateField(
  field: CustomizationField,
  value: CustomizationFieldValue | undefined
): FieldValidationResult {
  switch (field.type) {
    case "TEXT":
    case "TEXTAREA": {
      const text = readTextValue(value).trim();

      if (!text) {
        return field.required ? { error: requiredMessage(field) } : {};
      }

      const maxLength =
        field.type === "TEXTAREA" ? MAX_CUSTOMIZATION_TEXTAREA_LENGTH : MAX_CUSTOMIZATION_TEXT_LENGTH;

      if (text.length > maxLength) {
        return { error: `${field.label} must be ${maxLength} characters or fewer.` };
      }

      return {
        entry: { fieldId: field.id, key: field.key, label: field.label, type: field.type, value: text },
      };
    }

    case "SELECT": {
      const text = readTextValue(value).trim();

      if (!text) {
        return field.required ? { error: requiredMessage(field) } : {};
      }

      const options = field.options ?? [];

      if (options.length === 0) {
        return { error: `${field.label} is unavailable right now.` };
      }

      if (!options.some((option) => option.value === text)) {
        return { error: `The selected option for ${field.label} is no longer available.` };
      }

      return {
        entry: { fieldId: field.id, key: field.key, label: field.label, type: field.type, value: text },
      };
    }

    case "NUMBER": {
      const text = readTextValue(value).trim();

      if (!text) {
        return field.required ? { error: requiredMessage(field) } : {};
      }

      const parsed = Number(text);

      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        return { error: `${field.label} must be a whole number.` };
      }

      const min = field.validation?.min;
      const max = field.validation?.max;

      if (typeof min === "number" && parsed < min) {
        return { error: `${field.label} must be at least ${min}.` };
      }

      if (typeof max === "number" && parsed > max) {
        return { error: `${field.label} must be ${max} or less.` };
      }

      return {
        entry: { fieldId: field.id, key: field.key, label: field.label, type: field.type, value: parsed },
      };
    }

    case "IMAGE": {
      const images = readImageValue(value);

      if (images.length === 0) {
        return field.required ? { error: `Please upload an image for ${field.label}.` } : {};
      }

      const limit = getImageFieldLimit(field);

      if (images.length > limit) {
        return {
          error: `${field.label} accepts ${limit} ${limit === 1 ? "image" : "images"} maximum.`,
        };
      }

      return {
        entry: {
          fieldId: field.id,
          key: field.key,
          label: field.label,
          type: field.type,
          value: images.map((image) => ({ url: image.url, publicId: image.publicId })),
        },
      };
    }

    case "DIMENSIONS": {
      const draft = readDimensionsValue(value);
      const config = field.dimensions;

      if (!config) {
        return field.required ? { error: `${field.label} is unavailable right now.` } : {};
      }

      const enabledAxes = DIMENSION_AXES.filter((axis) => Boolean(config[axis]?.enabled));

      if (enabledAxes.length === 0) {
        return field.required ? { error: `${field.label} is unavailable right now.` } : {};
      }

      const dimensionsValue: CustomizationDimensionsValue = { unit: config.unit?.trim() || "cm" };

      for (const axis of enabledAxes) {
        const axisConfig = config[axis];
        const raw = draft[axis].trim();
        const isRequired = field.required || Boolean(axisConfig?.required);

        if (!raw) {
          if (isRequired) {
            return { error: `${field.label}: ${capitalize(axis)} is required.` };
          }

          continue;
        }

        const parsed = Number(raw);

        if (!Number.isFinite(parsed)) {
          return { error: `${field.label}: ${capitalize(axis)} must be a number.` };
        }

        if (parsed <= 0) {
          return { error: `${field.label}: ${capitalize(axis)} must be greater than 0.` };
        }

        dimensionsValue[axis] = parsed;
      }

      const hasValue = DIMENSION_AXES.some((axis) => typeof dimensionsValue[axis] === "number");

      if (!hasValue) {
        return {};
      }

      return {
        entry: {
          fieldId: field.id,
          key: field.key,
          label: field.label,
          type: field.type,
          value: dimensionsValue,
        },
      };
    }

    default:
      return {};
  }
}

function requiredMessage(field: CustomizationField) {
  return `${field.label} is required.`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
