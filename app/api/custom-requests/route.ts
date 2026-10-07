import { headers } from "next/headers";
import { type NextRequest } from "next/server";

import { auth } from "../../lib/auth";
import { connectMongo } from "../../lib/auth-db";
import { connectDB } from "../../lib/db";
import {
  CUSTOM_REQUEST_MAX_ADDITIONAL_LENGTH,
  CUSTOM_REQUEST_MAX_DESCRIPTION_LENGTH,
  CUSTOM_REQUEST_MAX_DIMENSION_VALUE,
  CUSTOM_REQUEST_MAX_FILES,
  CUSTOM_REQUEST_MAX_FILE_BYTES,
  CUSTOM_REQUEST_MAX_NAME_LENGTH,
  CUSTOM_REQUEST_MAX_QUANTITY,
  CUSTOM_REQUEST_MIN_QUANTITY,
  CUSTOM_REQUEST_UNITS,
  buildBusinessWhatsAppUrl,
  buildCustomerFollowUpMessage,
  isValidDimensionNumber,
  isValidWhatsAppNumber,
  normalizeWhatsAppNumber,
  serializeCustomRequest,
  type CustomRequestDimensionsRecord,
  type CustomRequestReferenceFileRecord,
} from "../../lib/customRequests";
import {
  CUSTOM_REQUEST_REFERENCE_FOLDER,
  isValidReferenceSignature,
} from "../../lib/customRequestFiles";
import { CustomRequest } from "../../models";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
} from "../_utils/responses";

const CUSTOM_REQUEST_FIELDS = [
  "name",
  "whatsappNumber",
  "description",
  "dimensions",
  "quantity",
  "referenceFiles",
  "additionalRequirement",
] as const;

const DIMENSION_FIELDS = ["length", "width", "height", "unit"] as const;
const REFERENCE_FILE_FIELDS = [
  "url",
  "publicId",
  "deleteToken",
  "filename",
  "mime",
  "size",
  "resourceType",
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, CUSTOM_REQUEST_FIELDS);

    const name = readName(payload.name);
    const whatsappNumber = readWhatsAppNumber(payload.whatsappNumber);
    const description = readDescription(payload.description);
    const quantity = readQuantity(payload.quantity);
    const dimensions = readDimensions(payload.dimensions);
    const referenceFiles = readReferenceFiles(payload.referenceFiles);
    const additionalRequirement = readAdditionalRequirement(payload.additionalRequirement);

    const customerId = await resolveOptionalCustomerId();

    await connectDB();

    const document = await CustomRequest.create({
      customerId,
      name,
      whatsappNumber,
      description,
      ...(dimensions ? { dimensions } : {}),
      quantity,
      referenceFiles,
      ...(additionalRequirement ? { additionalRequirement } : {}),
    });

    const record = serializeCustomRequest(document);
    const message = buildCustomerFollowUpMessage(record.name, record._id);

    return ok(
      {
        request: record,
        whatsapp: {
          url: buildBusinessWhatsAppUrl(message),
          message,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "Custom request API POST error:");
  }
}

async function resolveOptionalCustomerId() {
  try {
    await connectMongo();
    const session = await auth.api.getSession({ headers: await headers() });
    return session ? session.user.id : null;
  } catch (error) {
    console.warn("Custom request guest session lookup failed:", error);
    return null;
  }
}

function readName(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, "अपना नाम भरना जरूरी है।");
  }

  const name = value.trim();

  if (name.length > CUSTOM_REQUEST_MAX_NAME_LENGTH) {
    throw new ApiError(400, "नाम बहुत लंबा है। कृपया छोटा नाम लिखें।");
  }

  return name;
}

function readWhatsAppNumber(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, "WhatsApp नंबर भरना जरूरी है।");
  }

  if (!isValidWhatsAppNumber(value)) {
    throw new ApiError(400, "कृपया सही WhatsApp नंबर भरें। यह 10 अंकों का होना चाहिए (जैसे 9876543210)।");
  }

  return normalizeWhatsAppNumber(value);
}

function readDescription(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, "कृपया बताइए कि आपको क्या बनवाना है।");
  }

  const description = value.trim();

  if (description.length > CUSTOM_REQUEST_MAX_DESCRIPTION_LENGTH) {
    throw new ApiError(400, "जानकारी बहुत लंबी है। कृपया छोटी रखें।");
  }

  return description;
}

function readQuantity(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ApiError(400, "कृपया पीस की संख्या पूरे अंक में लिखें।");
  }

  if (value < CUSTOM_REQUEST_MIN_QUANTITY || value > CUSTOM_REQUEST_MAX_QUANTITY) {
    throw new ApiError(
      400,
      `पीस की संख्या ${CUSTOM_REQUEST_MIN_QUANTITY} से ${CUSTOM_REQUEST_MAX_QUANTITY} के बीच रखें।`
    );
  }

  return value;
}

function readDimensions(value: unknown): CustomRequestDimensionsRecord | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "साइज / नाप की जानकारी सही format में नहीं है।");
  }

  const record = value as Record<string, unknown>;
  const unsupported = Object.keys(record).filter((field) => !(DIMENSION_FIELDS as readonly string[]).includes(field));

  if (unsupported.length > 0) {
    throw new ApiError(400, `Unsupported dimension field(s): ${unsupported.join(", ")}.`);
  }

  const dimensions: CustomRequestDimensionsRecord = {};

  for (const axis of ["length", "width", "height"] as const) {
    if (record[axis] === undefined || record[axis] === null || record[axis] === "") {
      continue;
    }

    if (!isValidDimensionNumber(record[axis])) {
      throw new ApiError(400, "साइज की संख्या सही नहीं है। कृपया 0 या बड़ी संख्या लिखें।");
    }

    if (record[axis] > CUSTOM_REQUEST_MAX_DIMENSION_VALUE) {
      throw new ApiError(400, "साइज बहुत बड़ी है। कृपया छोटी रखें।");
    }

    dimensions[axis] = record[axis];
  }

  if (record.unit !== undefined) {
    const unit = String(record.unit);

    if (!(CUSTOM_REQUEST_UNITS as readonly string[]).includes(unit)) {
      throw new ApiError(400, "साइज की इकाई (mm / cm / inch) चुनें।");
    }

    dimensions.unit = unit as CustomRequestDimensionsRecord["unit"];
  }

  const hasValue = Object.values(dimensions).length > 0;

  return hasValue ? dimensions : undefined;
}

function readReferenceFiles(value: unknown): CustomRequestReferenceFileRecord[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ApiError(400, "फोटो / फाइल की जानकारी सही format में नहीं है।");
  }

  if (value.length > CUSTOM_REQUEST_MAX_FILES) {
    throw new ApiError(400, `${CUSTOM_REQUEST_MAX_FILES} से ज्यादा फाइल नहीं भेज सकते।`);
  }

  const files: CustomRequestReferenceFileRecord[] = [];

  for (const entry of value) {
    files.push(readReferenceFile(entry));
  }

  return files;
}

function readReferenceFile(value: unknown): CustomRequestReferenceFileRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApiError(400, "एक फाइल की जानकारी सही नहीं है। दोबारा upload करें।");
  }

  const record = value as Record<string, unknown>;
  const unsupported = Object.keys(record).filter(
    (field) => !(REFERENCE_FILE_FIELDS as readonly string[]).includes(field)
  );

  if (unsupported.length > 0) {
    throw new ApiError(400, `Unsupported reference file field(s): ${unsupported.join(", ")}.`);
  }

  const url = readRequiredString(record.url, "url", "फाइल का link सही नहीं है। दोबारा upload करें।");
  const publicId = readRequiredString(
    record.publicId,
    "publicId",
    "फाइल की जानकारी सही नहीं है। दोबारा upload करें।"
  );

  if (url.length > 500) {
    throw new ApiError(400, "फाइल का link सही नहीं है। दोबारा upload करें।");
  }

  if (!publicId.startsWith(`${CUSTOM_REQUEST_REFERENCE_FOLDER}/`)) {
    throw new ApiError(400, "फाइल की जानकारी सही नहीं है। दोबारा upload करें।");
  }

  if (!isValidReferenceSignature(publicId, record.deleteToken)) {
    throw new ApiError(400, "फाइल की जानकारी सही नहीं है। दोबारा upload करें।");
  }

  const file: CustomRequestReferenceFileRecord = { url, publicId };

  if (typeof record.filename === "string" && record.filename.trim()) {
    file.filename = record.filename.trim().slice(0, 120);
  }

  if (typeof record.mime === "string" && record.mime.trim()) {
    file.mime = record.mime.trim().slice(0, 80);
  }

  if (typeof record.size === "number" && Number.isFinite(record.size) && record.size >= 0) {
    if (record.size > CUSTOM_REQUEST_MAX_FILE_BYTES) {
      throw new ApiError(400, "फाइल की जानकारी सही नहीं है। दोबारा upload करें।");
    }

    file.size = record.size;
  }

  if (record.resourceType === "raw" || record.resourceType === "image") {
    file.resourceType = record.resourceType;
  }

  return file;
}

function readAdditionalRequirement(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "अतिरिक्त जानकारी सही format में नहीं है।");
  }

  const additional = value.trim();

  if (!additional) {
    return undefined;
  }

  if (additional.length > CUSTOM_REQUEST_MAX_ADDITIONAL_LENGTH) {
    throw new ApiError(400, "अतिरिक्त जानकारी बहुत लंबी है। कृपया छोटी रखें।");
  }

  return additional;
}

function readRequiredString(value: unknown, label: string, userMessage: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${label} ${userMessage}`);
  }

  return value.trim();
}