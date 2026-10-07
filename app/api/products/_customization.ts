import { randomUUID } from "node:crypto";

import { ApiError } from "../_utils/api-error";
import type {
  IProductCustomization,
  IProductCustomizationDimensions,
  IProductCustomizationField,
  IProductCustomizationOption,
  IProductCustomizationValidation,
  CustomizationFieldType,
} from "../../models";

export const MAX_CUSTOMIZATION_FIELDS = 20;

const FIELD_TYPE_VALUES: CustomizationFieldType[] = ["TEXT", "TEXTAREA", "SELECT", "NUMBER", "IMAGE", "DIMENSIONS"];
const FIELD_ID_PATTERN = /^cust_[a-zA-Z0-9_-]+$/;
const OPTION_ID_PATTERN = /^opt_[a-zA-Z0-9_-]+$/;
const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const DEFAULT_CUSTOMIZATION: IProductCustomization = { enabled: false, fields: [] };

function fieldLabel(index: number, suffix: string) {
  return `customization.fields[${index}]${suffix}`;
}

export function parseCustomization(value: unknown): IProductCustomization {
  if (!isRecord(value)) {
    throw new ApiError(400, "customization must be an object.");
  }

  const enabled = readBoolean(value.enabled, "customization.enabled", false) ?? false;
  const fields = value.fields === undefined ? [] : parseFields(value.fields);

  return { enabled, fields };
}

export function normalizeStoredCustomization(value: IProductCustomization | null | undefined): IProductCustomization {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_CUSTOMIZATION;
  }

  const fields = Array.isArray(value.fields) ? value.fields : [];

  return {
    enabled: value.enabled === true,
    fields,
  };
}

function parseFields(value: unknown): IProductCustomizationField[] {
  if (!Array.isArray(value)) {
    throw new ApiError(400, "customization.fields must be an array.");
  }

  if (value.length > MAX_CUSTOMIZATION_FIELDS) {
    throw new ApiError(400, `A product can have at most ${MAX_CUSTOMIZATION_FIELDS} customization fields.`);
  }

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new ApiError(400, `${fieldLabel(index, "")} must be an object.`);
    }

    const type = readFieldType(entry.type, index);

    const key = readString(entry.key, fieldLabel(index, ".key"), true);

    if (!key || !FIELD_KEY_PATTERN.test(key)) {
      throw new ApiError(400, `${fieldLabel(index, ".key")} must start with a letter and use only lowercase letters, numbers, and underscores.`);
    }

    if (seenKeys.has(key)) {
      throw new ApiError(400, "Customization field keys must be unique within a product.");
    }

    seenKeys.add(key);

    const label = readString(entry.label, fieldLabel(index, ".label"), true);

    if (!label) {
      throw new ApiError(400, `${fieldLabel(index, ".label")} is required.`);
    }

    if (label.length > 120) {
      throw new ApiError(400, `${fieldLabel(index, ".label")} must be 120 characters or less.`);
    }

    const id = resolveFieldId(entry.id, seenIds, index);
    const required = readBoolean(entry.required, fieldLabel(index, ".required"), false) ?? false;
    const placeholder = readString(entry.placeholder, fieldLabel(index, ".placeholder"), false) ?? "";
    const helpText = readString(entry.helpText, fieldLabel(index, ".helpText"), false) ?? "";

    const field: IProductCustomizationField = {
      id,
      key,
      type,
      label,
      required,
      placeholder,
      helpText,
      sortOrder: index,
    };

    if (type === "SELECT") {
      field.options = parseOptions(entry.options, index);
    }

    if (type === "NUMBER") {
      field.validation = parseNumberValidation(entry.validation, index);
    }

    if (type === "IMAGE") {
      const maxFiles =
        entry.maxFiles === null ? null : (readInteger(entry.maxFiles, fieldLabel(index, ".maxFiles"), false) ?? null);
      const maxFileSize =
        entry.maxFileSize === null
          ? null
          : (readInteger(entry.maxFileSize, fieldLabel(index, ".maxFileSize"), false) ?? null);

      if (maxFiles !== null && maxFiles < 1) {
        throw new ApiError(400, `${fieldLabel(index, ".maxFiles")} must be a positive integer.`);
      }

      if (maxFileSize !== null && maxFileSize < 1) {
        throw new ApiError(400, `${fieldLabel(index, ".maxFileSize")} must be a positive integer.`);
      }

      field.maxFiles = maxFiles;
      field.maxFileSize = maxFileSize;
      field.acceptedFileTypes = parseAcceptedFileTypes(entry.acceptedFileTypes, index);
    }

    if (type === "DIMENSIONS") {
      field.dimensions = parseDimensions(entry.dimensions, index);
    }

    return field;
  });
}

function resolveFieldId(value: unknown, seenIds: Set<string>, index: number) {
  const providedId = readString(value, fieldLabel(index, ".id"), false);
  const id = providedId ?? `cust_${randomToken()}`;

  if (!FIELD_ID_PATTERN.test(id)) {
    throw new ApiError(400, `${fieldLabel(index, ".id")} has an invalid format.`);
  }

  if (seenIds.has(id)) {
    throw new ApiError(409, "Customization field ids must be unique within a product.");
  }

  seenIds.add(id);
  return id;
}

function parseOptions(value: unknown, index: number): IProductCustomizationOption[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(400, `${fieldLabel(index, ".options")} must be a non-empty array.`);
  }

  const seenIds = new Set<string>();
  const seenValues = new Set<string>();

  return value.map((entry, optionIndex) => {
    if (!isRecord(entry)) {
      throw new ApiError(400, `${fieldLabel(index, `.options[${optionIndex}]`)} must be an object.`);
    }

    const optionValue = readString(entry.value, fieldLabel(index, `.options[${optionIndex}].value`), true);

    if (!optionValue) {
      throw new ApiError(400, `${fieldLabel(index, `.options[${optionIndex}].value`)} is required.`);
    }

    const normalizedValue = optionValue.toLowerCase();

    if (seenValues.has(normalizedValue)) {
      throw new ApiError(400, `${fieldLabel(index, ".options")} values must be unique.`);
    }

    seenValues.add(normalizedValue);

    const providedId = readString(entry.id, fieldLabel(index, `.options[${optionIndex}].id`), false);
    const id = providedId ?? `opt_${randomToken()}`;

    if (!OPTION_ID_PATTERN.test(id)) {
      throw new ApiError(400, `${fieldLabel(index, `.options[${optionIndex}].id`)} has an invalid format.`);
    }

    if (seenIds.has(id)) {
      throw new ApiError(409, `${fieldLabel(index, ".options")} ids must be unique.`);
    }

    seenIds.add(id);

    return { id, value: optionValue };
  });
}

function parseNumberValidation(value: unknown, index: number): IProductCustomizationValidation {
  if (value === undefined) {
    return { min: null, max: null };
  }

  if (!isRecord(value)) {
    throw new ApiError(400, `${fieldLabel(index, ".validation")} must be an object.`);
  }

  const min = value.min === null ? null : (readInteger(value.min, fieldLabel(index, ".validation.min"), false) ?? null);
  const max = value.max === null ? null : (readInteger(value.max, fieldLabel(index, ".validation.max"), false) ?? null);

  if (min !== null && min < 0) {
    throw new ApiError(400, `${fieldLabel(index, ".validation.min")} must be a non-negative integer.`);
  }

  if (max !== null && max < 0) {
    throw new ApiError(400, `${fieldLabel(index, ".validation.max")} must be a non-negative integer.`);
  }

  if (min !== null && max !== null && min > max) {
    throw new ApiError(400, `${fieldLabel(index, ".validation.min")} cannot be greater than ${fieldLabel(index, ".validation.max")}.`);
  }

  return { min, max };
}

function parseAcceptedFileTypes(value: unknown, index: number): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ApiError(400, `${fieldLabel(index, ".acceptedFileTypes")} must be an array.`);
  }

  const types = value.map((fileType, fileTypeIndex) =>
    readString(fileType, fieldLabel(index, `.acceptedFileTypes[${fileTypeIndex}]`), true)
  );

  if (types.some((fileType) => !fileType)) {
    throw new ApiError(400, `${fieldLabel(index, ".acceptedFileTypes")} entries cannot be empty.`);
  }

  return types as string[];
}

function parseDimensions(value: unknown, index: number): IProductCustomizationDimensions {
  if (!isRecord(value)) {
    throw new ApiError(400, `${fieldLabel(index, ".dimensions")} must be an object.`);
  }

  const unit = readString(value.unit, fieldLabel(index, ".dimensions.unit"), false) ?? "cm";

  if (unit.length > 20) {
    throw new ApiError(400, `${fieldLabel(index, ".dimensions.unit")} must be 20 characters or less.`);
  }

  const width = parseDimensionAxis(value.width, index, "width");
  const height = parseDimensionAxis(value.height, index, "height");
  const depth = parseDimensionAxis(value.depth, index, "depth");

  if (!width.enabled && !height.enabled && !depth.enabled) {
    throw new ApiError(400, `${fieldLabel(index, ".dimensions")} must have at least one enabled dimension.`);
  }

  return { unit, width, height, depth };
}

function parseDimensionAxis(value: unknown, index: number, axis: "width" | "height" | "depth") {
  if (value === undefined) {
    return { enabled: false, required: false };
  }

  if (!isRecord(value)) {
    throw new ApiError(400, `${fieldLabel(index, `.dimensions.${axis}`)} must be an object.`);
  }

  return {
    enabled: readBoolean(value.enabled, fieldLabel(index, `.dimensions.${axis}.enabled`), false) ?? false,
    required: readBoolean(value.required, fieldLabel(index, `.dimensions.${axis}.required`), false) ?? false,
  };
}

function readFieldType(value: unknown, index: number): CustomizationFieldType {
  if (typeof value !== "string" || !FIELD_TYPE_VALUES.includes(value as CustomizationFieldType)) {
    throw new ApiError(400, `${fieldLabel(index, ".type")} must be one of ${FIELD_TYPE_VALUES.join(", ")}.`);
  }

  return value as CustomizationFieldType;
}

function readString(value: unknown, label: string, required: boolean) {
  if (value === undefined) {
    if (required) {
      throw new ApiError(400, `${label} is required.`);
    }

    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, `${label} must be a string.`);
  }

  const trimmed = value.trim();

  if (required && !trimmed) {
    throw new ApiError(400, `${label} is required.`);
  }

  return trimmed;
}

function readInteger(value: unknown, label: string, required: boolean) {
  if (value === undefined) {
    if (required) {
      throw new ApiError(400, `${label} is required.`);
    }

    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ApiError(400, `${label} must be an integer.`);
  }

  return value;
}

function readBoolean(value: unknown, label: string, required: boolean) {
  if (value === undefined) {
    if (required) {
      throw new ApiError(400, `${label} is required.`);
    }

    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new ApiError(400, `${label} must be a boolean.`);
  }

  return value;
}

function randomToken() {
  return randomUUID().replace(/-/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}