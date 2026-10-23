import { type NextRequest } from "next/server";

import { requireAdmin } from "../../../../lib/authorization";
import { cloudinary } from "../../../../lib/cloudinary";
import { ApiError, handleApiError, ok, parseJsonBody } from "../../../_utils/responses";
import { PRODUCT_IMAGE_FOLDER } from "../upload-signature/route";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await parseJsonBody(request);
    const publicId = typeof body.publicId === "string" ? body.publicId.trim() : "";

    if (!publicId || !publicId.startsWith(`${PRODUCT_IMAGE_FOLDER}/`)) {
      throw new ApiError(400, "Invalid image publicId.");
    }

    const result = await cloudinary.uploader.destroy(publicId);

    return ok({ deleted: result?.result === "ok" || result?.result === "not found" });
  } catch (error) {
    return handleApiError(error, "Product image destroy error:");
  }
}
