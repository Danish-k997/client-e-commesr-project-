import { type NextRequest } from "next/server";

import { connectDB } from "../../lib/db";
import { cloudinary } from "../../lib/cloudinary";
import { requireAdmin } from "../../lib/authorization";
import { Category, Subcategory } from "../../models";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
  serializeDocument,
} from "../_utils/responses";

const CATEGORY_FIELDS = [
  "name",
  "slug",
  "description",
  "image",
  "imagePublicId",
  "imageDataUrl",
  "status",
  "sortOrder",
] as const;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const adminView = request.nextUrl.searchParams.get("scope") === "admin";

    if (adminView) {
      await requireAdmin();
    }

    const categories = await Category.find(adminView ? {} : { status: "ACTIVE" })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    const subcategoryCounts = adminView
      ? await Subcategory.aggregate<{ _id: string; count: number }>([
          { $group: { _id: "$categoryId", count: { $sum: 1 } } },
        ])
      : [];
    const subcategoryCountByCategoryId = new Map(
      subcategoryCounts.map((entry) => [entry._id.toString(), entry.count])
    );

    return ok({
      categories: serializeDocument(
        adminView
          ? categories.map((category) => ({
              ...category,
              subcategoryCount: subcategoryCountByCategoryId.get(category._id.toString()) ?? 0,
            }))
          : categories
      ),
    });
  } catch (error) {
    return handleApiError(error, "Categories API GET error:");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, CATEGORY_FIELDS);
    const imageDataUrl = payload.imageDataUrl;
    delete payload.imageDataUrl;

    if (imageDataUrl !== undefined && typeof imageDataUrl !== "string") {
      throw new ApiError(400, "imageDataUrl must be an image data URL.");
    }

    if (typeof imageDataUrl === "string" && imageDataUrl.trim()) {
      if (!imageDataUrl.startsWith("data:image/")) {
        throw new ApiError(400, "imageDataUrl must be an image data URL.");
      }

      const result = await cloudinary.uploader.upload(imageDataUrl, {
        folder: "kesar-dimensions/categories",
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
      });
      payload.image = result.secure_url;
      payload.imagePublicId = result.public_id;
    }

    if (payload.image === "") {
      delete payload.image;
      delete payload.imagePublicId;
    }

    if (payload.imagePublicId === "") {
      delete payload.imagePublicId;
    }

    const category = await Category.create(payload);

    return ok({ category: serializeDocument(category) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Categories API POST error:");
  }
}
