import { requireAdmin } from "../../../../lib/authorization";
import { cloudinary } from "../../../../lib/cloudinary";
import { ApiError, handleApiError, ok } from "../../../_utils/responses";

export const PRODUCT_IMAGE_FOLDER = "kesar-dimensions/products";

export async function POST() {
  try {
    await requireAdmin();

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new ApiError(500, "Cloudinary service is not properly configured.");
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = PRODUCT_IMAGE_FOLDER;

    const signature = cloudinary.utils.api_sign_request(
      {
        folder,
        timestamp,
      },
      apiSecret
    );

    return ok({
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
    });
  } catch (error) {
    return handleApiError(error, "Product upload signature POST error:");
  }
}
