import { type NextRequest } from "next/server";

import {
  CUSTOM_REQUEST_REFERENCE_FOLDER,
  destroyReferenceFile,
  getExtensionFromFilename,
  getReferenceFileType,
  isReferenceFileContentValid,
  isValidReferenceSignature,
  parseReferenceFileDataUrl,
  signReferencePublicId,
  uploadReferenceFile,
} from "../../lib/customRequestFiles";
import { ApiError, handleApiError, ok, parseJsonBody } from "../_utils/responses";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);

    const fileDataUrl = readRequiredString(body.fileDataUrl, "fileDataUrl");
    const filename = readRequiredString(body.filename, "filename");

    if (filename.length > 120) {
      throw new ApiError(400, "फाइल का नाम बहुत लंबा है। छोटा नाम रखें।");
    }

    const extension = getExtensionFromFilename(filename);
    const type = getReferenceFileType(extension);

    if (!type) {
      throw new ApiError(400, "यह file प्रकार सपोर्ट नहीं है। JPG, PNG, PDF, STL या STEP भेजें।");
    }

    const parsed = parseReferenceFileDataUrl(fileDataUrl);

    if (parsed.error) {
      throw new ApiError(400, parsed.error);
    }

    if (!isReferenceFileContentValid(parsed.base64, type.kind)) {
      throw new ApiError(400, "फाइल सही नहीं लग रही है। कृपया दोबारा try करें या कोई और file भेजें।");
    }

    const uploaded = await uploadReferenceFile(fileDataUrl, filename, type, parsed.bytes);

    if (!uploaded) {
      throw new ApiError(502, "फाइल upload नहीं हो पाई। कृपया दोबारा try करें।");
    }

    const deleteToken = signReferencePublicId(uploaded.publicId);

    if (!deleteToken) {
      throw new ApiError(503, "फाइल upload अभी उपलब्ध नहीं है। थोड़ी देर बाद try करें।");
    }

    return ok({ file: { ...uploaded, deleteToken } }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Custom request upload API POST error:");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);

    const publicId = readRequiredString(body.publicId, "publicId");
    const deleteToken = readRequiredString(body.deleteToken, "deleteToken");
    const resourceType: "image" | "raw" = body.resourceType === "raw" ? "raw" : "image";

    if (!publicId.startsWith(`${CUSTOM_REQUEST_REFERENCE_FOLDER}/`)) {
      throw new ApiError(400, "यह फाइल इस request की नहीं है।");
    }

    if (!isValidReferenceSignature(publicId, deleteToken)) {
      throw new ApiError(403, "इस फाइल को हटाने की अनुमति नहीं है।");
    }

    const deleted = await destroyReferenceFile(publicId, resourceType);

    if (!deleted) {
      throw new ApiError(502, "फाइल हटाई नहीं जा सकी। कृपया दोबारा try करें।");
    }

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, "Custom request upload API DELETE error:");
  }
}

function readRequiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${label} is required.`);
  }

  return value.trim();
}