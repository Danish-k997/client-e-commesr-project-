import type {
  CustomizationConfig,
  CustomizationField,
  CustomizationFieldBase,
  CustomizationFieldType,
  CustomizationOption,
} from "../../lib/api";

export const CUSTOMIZATION_FIELD_TYPES: CustomizationFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "SELECT",
  "NUMBER",
  "IMAGE",
  "DIMENSIONS",
];

export const CUSTOMIZATION_FIELD_TYPE_LABELS: Record<CustomizationFieldType, string> = {
  TEXT: "Short text",
  TEXTAREA: "Long text",
  SELECT: "Dropdown select",
  NUMBER: "Number",
  IMAGE: "Image upload",
  DIMENSIONS: "Dimensions",
};

export const MAX_CUSTOMIZATION_FIELDS = 20;

const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export type CustomizationFieldDraft = {
  id: string;
  key: string;
  type: CustomizationFieldType;
  label: string;
  required: boolean;
  placeholder: string;
  helpText: string;
  optionsText: string;
  min: string;
  max: string;
  maxFiles: string;
  maxFileSize: string;
  acceptedFileTypes: string;
  unit: string;
  widthEnabled: boolean;
  widthRequired: boolean;
  heightEnabled: boolean;
  heightRequired: boolean;
  depthEnabled: boolean;
  depthRequired: boolean;
};

function makeKey() {
  return Math.random().toString(36).slice(2);
}

function makeCustomizationId(prefix: "cust" | "opt") {
  return `${prefix}_${makeKey()}`;
}

export function toCustomizationKey(value: string) {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return /^[a-z]/.test(base) ? base : `f_${base}`;
}

export function blankFieldDraft(type: CustomizationFieldType = "TEXT"): CustomizationFieldDraft {
  return {
    id: makeCustomizationId("cust"),
    key: "",
    type,
    label: "",
    required: false,
    placeholder: "",
    helpText: "",
    optionsText: "",
    min: "",
    max: "",
    maxFiles: "",
    maxFileSize: "",
    acceptedFileTypes: "",
    unit: "cm",
    widthEnabled: false,
    widthRequired: false,
    heightEnabled: false,
    heightRequired: false,
    depthEnabled: false,
    depthRequired: false,
  };
}

export function isBlankFieldDraft(draft: CustomizationFieldDraft) {
  return !draft.label.trim() && !draft.key.trim();
}

export function customizationToDrafts(config?: CustomizationConfig): CustomizationFieldDraft[] {
  if (!config || !Array.isArray(config.fields)) {
    return [];
  }

  return config.fields.map(fieldToDraft);
}

export function fieldToDraft(field: CustomizationField): CustomizationFieldDraft {
  return {
    id: field.id,
    key: field.key,
    type: field.type,
    label: field.label,
    required: field.required,
    placeholder: field.placeholder ?? "",
    helpText: field.helpText ?? "",
    optionsText: field.type === "SELECT" ? field.options.map((option) => option.value).join(", ") : "",
    min: field.type === "NUMBER" ? formatNullable(field.validation?.min) : "",
    max: field.type === "NUMBER" ? formatNullable(field.validation?.max) : "",
    maxFiles: field.type === "IMAGE" ? formatNullable(field.maxFiles) : "",
    maxFileSize: field.type === "IMAGE" ? formatNullable(field.maxFileSize) : "",
    acceptedFileTypes: field.type === "IMAGE" ? (field.acceptedFileTypes ?? []).join(", ") : "",
    unit: field.type === "DIMENSIONS" ? field.dimensions.unit : "cm",
    widthEnabled: field.type === "DIMENSIONS" ? field.dimensions.width.enabled : false,
    widthRequired: field.type === "DIMENSIONS" ? field.dimensions.width.required : false,
    heightEnabled: field.type === "DIMENSIONS" ? field.dimensions.height.enabled : false,
    heightRequired: field.type === "DIMENSIONS" ? field.dimensions.height.required : false,
    depthEnabled: field.type === "DIMENSIONS" ? field.dimensions.depth.enabled : false,
    depthRequired: field.type === "DIMENSIONS" ? field.dimensions.depth.required : false,
  };
}

export function draftToField(draft: CustomizationFieldDraft): CustomizationField {
  const base: CustomizationFieldBase = {
    id: draft.id,
    key: draft.key.trim(),
    type: draft.type,
    label: draft.label.trim(),
    required: draft.required,
    sortOrder: 0,
  };
  const placeholder = draft.placeholder.trim();
  const helpText = draft.helpText.trim();

  if (placeholder) {
    base.placeholder = placeholder;
  }

  if (helpText) {
    base.helpText = helpText;
  }

  if (draft.type === "TEXT" || draft.type === "TEXTAREA") {
    return base as CustomizationField;
  }

  if (draft.type === "SELECT") {
    const options: CustomizationOption[] = parseCommaSeparated(draft.optionsText).map((value) => ({
      id: makeCustomizationId("opt"),
      value,
    }));

    return { ...base, type: "SELECT", options } as CustomizationField;
  }

  if (draft.type === "NUMBER") {
    return {
      ...base,
      type: "NUMBER",
      validation: {
        min: toNullableNumber(draft.min),
        max: toNullableNumber(draft.max),
      },
    } as CustomizationField;
  }

  if (draft.type === "IMAGE") {
    return {
      ...base,
      type: "IMAGE",
      maxFiles: toNullableNumber(draft.maxFiles),
      maxFileSize: toNullableNumber(draft.maxFileSize),
      acceptedFileTypes: parseCommaSeparated(draft.acceptedFileTypes),
    } as CustomizationField;
  }

  return {
    ...base,
    type: "DIMENSIONS",
    dimensions: {
      unit: draft.unit.trim() || "cm",
      width: { enabled: draft.widthEnabled, required: draft.widthRequired },
      height: { enabled: draft.heightEnabled, required: draft.heightRequired },
      depth: { enabled: draft.depthEnabled, required: draft.depthRequired },
    },
  } as CustomizationField;
}

export function validateCustomizationDrafts(enabled: boolean, drafts: CustomizationFieldDraft[]) {
  if (!enabled) {
    return "";
  }

  if (drafts.length === 0) {
    return "Customization is enabled but has no fields. Add a field or turn customization off.";
  }

  const seenKeys = new Set<string>();

  for (const draft of drafts) {
    if (isBlankFieldDraft(draft)) {
      continue;
    }

    if (!draft.label.trim()) {
      return "Every customization field needs a label.";
    }

    if (draft.label.trim().length > 120) {
      return "Customization field labels must be 120 characters or less.";
    }

    const key = draft.key.trim();

    if (!key) {
      return "Every customization field needs a key.";
    }

    if (!FIELD_KEY_PATTERN.test(key)) {
      return "Customization keys must start with a letter and use only lowercase letters, numbers, and underscores.";
    }

    if (seenKeys.has(key)) {
      return "Customization field keys must be unique.";
    }

    seenKeys.add(key);

    if (draft.type === "SELECT") {
      const options = parseCommaSeparated(draft.optionsText);

      if (options.length === 0) {
        return "Dropdown fields need at least one option.";
      }

      if (options.length !== new Set(options.map((option) => option.toLowerCase())).size) {
        return "Dropdown options must be unique.";
      }
    }

    if (draft.type === "NUMBER") {
      const min = toNullableNumber(draft.min);
      const max = toNullableNumber(draft.max);

      if (min !== null && (Number.isNaN(min) || min < 0)) {
        return "Number minimum must be a non-negative whole number.";
      }

      if (max !== null && (Number.isNaN(max) || max < 0)) {
        return "Number maximum must be a non-negative whole number.";
      }

      if (min !== null && max !== null && !Number.isNaN(min) && !Number.isNaN(max) && min > max) {
        return "Number minimum cannot be greater than the maximum.";
      }
    }

    if (draft.type === "IMAGE") {
      const maxFiles = toNullableNumber(draft.maxFiles);
      const maxFileSize = toNullableNumber(draft.maxFileSize);

      if (maxFiles !== null && (Number.isNaN(maxFiles) || maxFiles < 1)) {
        return "Max files must be a positive whole number.";
      }

      if (maxFileSize !== null && (Number.isNaN(maxFileSize) || maxFileSize < 1)) {
        return "Max file size must be a positive whole number.";
      }
    }

    if (draft.type === "DIMENSIONS" && !draft.widthEnabled && !draft.heightEnabled && !draft.depthEnabled) {
      return "Dimensions fields need at least one enabled dimension.";
    }
  }

  if (seenKeys.size === 0) {
    return "Customization is enabled but no fields are configured.";
  }

  return "";
}

function formatNullable(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isNaN(parsed) ? NaN : parsed;
}

function parseCommaSeparated(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}