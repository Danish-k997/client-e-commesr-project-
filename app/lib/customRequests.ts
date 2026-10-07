import { WHATSAPP_NUMBER } from "./contact";

export const CUSTOM_REQUEST_STATUSES = [
  "NEW",
  "CONTACTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type CustomRequestStatus = (typeof CUSTOM_REQUEST_STATUSES)[number];

export const CUSTOM_REQUEST_UNITS = ["mm", "cm", "inch"] as const;

export type CustomRequestUnit = (typeof CUSTOM_REQUEST_UNITS)[number];

export const CUSTOM_REQUEST_MAX_NAME_LENGTH = 80;
export const CUSTOM_REQUEST_MAX_DESCRIPTION_LENGTH = 2000;
export const CUSTOM_REQUEST_MAX_ADDITIONAL_LENGTH = 1000;
export const CUSTOM_REQUEST_MIN_QUANTITY = 1;
export const CUSTOM_REQUEST_MAX_QUANTITY = 1000;
export const CUSTOM_REQUEST_MAX_DIMENSION_VALUE = 100000;

export const CUSTOM_REQUEST_MAX_FILES = 5;
export const CUSTOM_REQUEST_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const CUSTOM_REQUEST_FILE_ACCEPT =
  ".jpg,.jpeg,.png,.pdf,.stl,.step,.stp";

export const CUSTOM_REQUEST_FILE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "pdf",
  "stl",
  "step",
  "stp",
] as const;

export const CUSTOM_REQUEST_FILE_HINT = "JPG, PNG, PDF, STL, STEP";

export type CustomRequestFileResourceType = "image" | "raw";

export type CustomRequestDimensionsRecord = {
  length?: number;
  width?: number;
  height?: number;
  unit?: CustomRequestUnit;
};

export type CustomRequestReferenceFileRecord = {
  url: string;
  publicId: string;
  filename?: string;
  mime?: string;
  size?: number;
  resourceType?: CustomRequestFileResourceType;
};

export type CustomRequestRecord = {
  _id: string;
  customerId?: string | null;
  name: string;
  whatsappNumber: string;
  description: string;
  dimensions?: CustomRequestDimensionsRecord;
  quantity: number;
  referenceFiles: CustomRequestReferenceFileRecord[];
  additionalRequirement?: string;
  status: CustomRequestStatus;
  isRead: boolean;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits;
}

export function getCustomRequestFileExtension(filename: string) {
  if (typeof filename !== "string") {
    return "";
  }

  const match = /\.([a-z\d]+)$/i.exec(filename.trim());

  return match ? match[1].toLowerCase() : "";
}

export function isValidWhatsAppNumber(value: string) {
  return /^[6-9]\d{9}$/.test(normalizeWhatsAppNumber(value));
}

export function buildWhatsAppUrl(numberWithCountryCode: string, message?: string) {
  const url = `https://wa.me/${numberWithCountryCode}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}

export function buildBusinessWhatsAppUrl(message?: string) {
  return buildWhatsAppUrl(`91${WHATSAPP_NUMBER}`, message);
}

export function buildCustomerWhatsAppUrl(customerNumber: string, message?: string) {
  return buildWhatsAppUrl(`91${normalizeWhatsAppNumber(customerNumber)}`, message);
}

export function buildCustomerFollowUpMessage(name: string, requestId: string) {
  return [
    "नमस्ते, मैंने वेबसाइट पर अपना custom product idea भेजा है।",
    "",
    `नाम: ${name}`,
    `Request ID: ${requestId}`,
    "",
    "मैं अपने custom product के बारे में बात करना चाहता/चाहती हूँ।",
  ].join("\n");
}

export function buildAdminWhatsAppMessage(name: string) {
  return `नमस्ते ${name}, आपकी custom product की जानकारी हमें मिल गई है। आइए इसके बारे में WhatsApp पर बात करते हैं।`;
}

export function formatCustomRequestDate(value?: string | Date) {
  if (!value) {
    return "—";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function isValidDimensionNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function serializeCustomRequest(document: {
  _id: unknown;
  customerId?: unknown;
  name: unknown;
  whatsappNumber: unknown;
  description: unknown;
  dimensions?: CustomRequestDimensionsRecord | null;
  quantity: unknown;
  referenceFiles?: CustomRequestReferenceFileRecord[] | null;
  additionalRequirement?: unknown;
  status: unknown;
  isRead: unknown;
  adminNotes?: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}): CustomRequestRecord {
  return {
    _id: String(document._id),
    customerId: document.customerId ? String(document.customerId) : null,
    name: String(document.name ?? ""),
    whatsappNumber: String(document.whatsappNumber ?? ""),
    description: String(document.description ?? ""),
    dimensions: document.dimensions ?? undefined,
    quantity: Number(document.quantity ?? 0),
    referenceFiles: Array.isArray(document.referenceFiles) ? document.referenceFiles : [],
    additionalRequirement: document.additionalRequirement ? String(document.additionalRequirement) : undefined,
    status: (document.status as CustomRequestStatus) ?? "NEW",
    isRead: Boolean(document.isRead),
    adminNotes: document.adminNotes ? String(document.adminNotes) : undefined,
    createdAt: String(document.createdAt),
    updatedAt: String(document.updatedAt),
  };
}