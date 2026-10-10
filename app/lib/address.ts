import { ApiError } from "../api/_utils/responses";
import { ADDRESS_TYPES, type AddressType } from "../models/Address";

export { ADDRESS_TYPES };
export type { AddressType };

export const ADDRESS_FIELDS = [
  "fullName",
  "phone",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pincode",
  "landmark",
  "type",
  "isDefault",
] as const;

export type AddressField = (typeof ADDRESS_FIELDS)[number];

export type SerializedAddress = {
  _id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  type: AddressType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ValidatedAddressInput = {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string | null;
  type?: AddressType;
  isDefault?: boolean;
};

export function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits;
}

export function isValidPhoneNumber(value: string): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = normalizePhoneNumber(value);
  return /^[6-9]\d{9}$/.test(normalized);
}

export function isValidPincode(value: string): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return /^[1-9]\d{5}$/.test(value.trim());
}

export function isValidAddressType(value: unknown): value is AddressType {
  return typeof value === "string" && (ADDRESS_TYPES as readonly string[]).includes(value);
}

export function validateAddressInput(
  body: Record<string, unknown>,
  options: { isUpdate?: boolean } = {}
): ValidatedAddressInput {
  const isUpdate = Boolean(options.isUpdate);
  const result: ValidatedAddressInput = {};

  // fullName
  if (!isUpdate || body.fullName !== undefined) {
    if (body.fullName === undefined || body.fullName === null) {
      throw new ApiError(400, "Full name is required.");
    }
    if (typeof body.fullName !== "string" || body.fullName.trim().length === 0) {
      throw new ApiError(400, "Full name is required.");
    }
    if (body.fullName.trim().length > 100) {
      throw new ApiError(400, "Full name cannot exceed 100 characters.");
    }
    result.fullName = body.fullName.trim();
  }

  // phone
  if (!isUpdate || body.phone !== undefined) {
    if (body.phone === undefined || body.phone === null) {
      throw new ApiError(400, "Phone number is required.");
    }
    if (typeof body.phone !== "string" || body.phone.trim().length === 0) {
      throw new ApiError(400, "Phone number is required.");
    }
    if (!isValidPhoneNumber(body.phone)) {
      throw new ApiError(400, "Please provide a valid 10-digit Indian phone number.");
    }
    result.phone = normalizePhoneNumber(body.phone);
  }

  // addressLine1
  if (!isUpdate || body.addressLine1 !== undefined) {
    if (body.addressLine1 === undefined || body.addressLine1 === null) {
      throw new ApiError(400, "Address line 1 is required.");
    }
    if (typeof body.addressLine1 !== "string" || body.addressLine1.trim().length === 0) {
      throw new ApiError(400, "Address line 1 is required.");
    }
    if (body.addressLine1.trim().length > 255) {
      throw new ApiError(400, "Address line 1 cannot exceed 255 characters.");
    }
    result.addressLine1 = body.addressLine1.trim();
  }

  // addressLine2 (optional)
  if (body.addressLine2 !== undefined) {
    if (body.addressLine2 === null || body.addressLine2 === "") {
      result.addressLine2 = null;
    } else if (typeof body.addressLine2 === "string") {
      const trimmed = body.addressLine2.trim();
      if (trimmed.length > 255) {
        throw new ApiError(400, "Address line 2 cannot exceed 255 characters.");
      }
      result.addressLine2 = trimmed.length > 0 ? trimmed : null;
    } else {
      throw new ApiError(400, "Address line 2 must be a string.");
    }
  }

  // city
  if (!isUpdate || body.city !== undefined) {
    if (body.city === undefined || body.city === null) {
      throw new ApiError(400, "City is required.");
    }
    if (typeof body.city !== "string" || body.city.trim().length === 0) {
      throw new ApiError(400, "City is required.");
    }
    if (body.city.trim().length > 100) {
      throw new ApiError(400, "City cannot exceed 100 characters.");
    }
    result.city = body.city.trim();
  }

  // state
  if (!isUpdate || body.state !== undefined) {
    if (body.state === undefined || body.state === null) {
      throw new ApiError(400, "State is required.");
    }
    if (typeof body.state !== "string" || body.state.trim().length === 0) {
      throw new ApiError(400, "State is required.");
    }
    if (body.state.trim().length > 100) {
      throw new ApiError(400, "State cannot exceed 100 characters.");
    }
    result.state = body.state.trim();
  }

  // pincode
  if (!isUpdate || body.pincode !== undefined) {
    if (body.pincode === undefined || body.pincode === null) {
      throw new ApiError(400, "Pincode is required.");
    }
    if (typeof body.pincode !== "string" || body.pincode.trim().length === 0) {
      throw new ApiError(400, "Pincode is required.");
    }
    if (!isValidPincode(body.pincode)) {
      throw new ApiError(400, "Please provide a valid 6-digit Indian PIN code.");
    }
    result.pincode = body.pincode.trim();
  }

  // landmark (optional)
  if (body.landmark !== undefined) {
    if (body.landmark === null || body.landmark === "") {
      result.landmark = null;
    } else if (typeof body.landmark === "string") {
      const trimmed = body.landmark.trim();
      if (trimmed.length > 255) {
        throw new ApiError(400, "Landmark cannot exceed 255 characters.");
      }
      result.landmark = trimmed.length > 0 ? trimmed : null;
    } else {
      throw new ApiError(400, "Landmark must be a string.");
    }
  }

  // type
  if (body.type !== undefined) {
    if (!isValidAddressType(body.type)) {
      throw new ApiError(400, "Address type must be HOME, WORK, or OTHER.");
    }
    result.type = body.type;
  } else if (!isUpdate) {
    result.type = "HOME";
  }

  // isDefault
  if (body.isDefault !== undefined) {
    if (typeof body.isDefault !== "boolean") {
      throw new ApiError(400, "isDefault must be a boolean.");
    }
    result.isDefault = body.isDefault;
  } else if (!isUpdate) {
    result.isDefault = false;
  }

  return result;
}

export function serializeAddress(document: {
  _id: unknown;
  userId: unknown;
  fullName: unknown;
  phone: unknown;
  addressLine1: unknown;
  addressLine2?: unknown;
  city: unknown;
  state: unknown;
  pincode: unknown;
  landmark?: unknown;
  type: unknown;
  isDefault: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}): SerializedAddress {
  return {
    _id: String(document._id),
    userId: String(document.userId),
    fullName: String(document.fullName ?? ""),
    phone: String(document.phone ?? ""),
    addressLine1: String(document.addressLine1 ?? ""),
    addressLine2: document.addressLine2 ? String(document.addressLine2) : null,
    city: String(document.city ?? ""),
    state: String(document.state ?? ""),
    pincode: String(document.pincode ?? ""),
    landmark: document.landmark ? String(document.landmark) : null,
    type: (document.type as AddressType) ?? "HOME",
    isDefault: Boolean(document.isDefault),
    createdAt:
      document.createdAt instanceof Date
        ? document.createdAt.toISOString()
        : String(document.createdAt ?? ""),
    updatedAt:
      document.updatedAt instanceof Date
        ? document.updatedAt.toISOString()
        : String(document.updatedAt ?? ""),
  };
}

export type ShippingAddressSnapshot = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
};

/**
 * Creates an immutable shipping address snapshot from an address record/document.
 * Validates required fields server-side before order placement.
 */
export function createShippingAddressSnapshot(address: {
  fullName?: unknown;
  phone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  state?: unknown;
  pincode?: unknown;
  landmark?: unknown;
}): ShippingAddressSnapshot {
  const fullName = typeof address.fullName === "string" ? address.fullName.trim() : "";
  const rawPhone = typeof address.phone === "string" ? address.phone.trim() : "";
  const phone = normalizePhoneNumber(rawPhone);
  const addressLine1 = typeof address.addressLine1 === "string" ? address.addressLine1.trim() : "";
  const addressLine2 =
    typeof address.addressLine2 === "string" && address.addressLine2.trim().length > 0
      ? address.addressLine2.trim()
      : null;
  const city = typeof address.city === "string" ? address.city.trim() : "";
  const state = typeof address.state === "string" ? address.state.trim() : "";
  const pincode = typeof address.pincode === "string" ? address.pincode.trim() : "";
  const landmark =
    typeof address.landmark === "string" && address.landmark.trim().length > 0
      ? address.landmark.trim()
      : null;

  if (!fullName) {
    throw new ApiError(400, "Shipping address is missing required field: full name.");
  }
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw new ApiError(400, "Shipping address has an invalid or missing phone number.");
  }
  if (!addressLine1) {
    throw new ApiError(400, "Shipping address is missing required field: address line 1.");
  }
  if (!city) {
    throw new ApiError(400, "Shipping address is missing required field: city.");
  }
  if (!state) {
    throw new ApiError(400, "Shipping address is missing required field: state.");
  }
  if (!pincode || !/^[1-9]\d{5}$/.test(pincode)) {
    throw new ApiError(400, "Shipping address has an invalid or missing PIN code.");
  }

  return {
    fullName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
    landmark,
  };
}

