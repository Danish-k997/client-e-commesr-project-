import { type NextRequest } from "next/server";

import { connectDB } from "../../../lib/db";
import { cloudinary } from "../../../lib/cloudinary";
import { requireAdmin } from "../../../lib/authorization";
import { Category, Product, Subcategory } from "../../../models";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
  requireObjectId,
  serializeDocument,
} from "../../_utils/responses";

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

type CategoryRouteContext = {
  params: Promise<{ categoryId: string }>;
};

export async function GET(_request: NextRequest, { params }: CategoryRouteContext) {
  try {
    const { categoryId } = await params;
    requireObjectId(categoryId, "categoryId");

    await connectDB();

    const category = await Category.findOne({ _id: categoryId, status: "ACTIVE" }).lean();

    if (!category) {
      throw new ApiError(404, "Category not found.");
    }

    return ok({ category: serializeDocument(category) });
  } catch (error) {
    return handleApiError(error, "Category API GET error:");
  }
}

export async function PATCH(request: NextRequest, { params }: CategoryRouteContext) {
  try {
    await requireAdmin();

    const { categoryId } = await params;
    requireObjectId(categoryId, "categoryId");

    await connectDB();

    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, CATEGORY_FIELDS, { requireAtLeastOne: true });
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

    const clearImage = payload.image === "";
    if (clearImage) {
      delete payload.image;
      delete payload.imagePublicId;
    } else if (payload.imagePublicId === "") {
      delete payload.imagePublicId;
    }

    const update = clearImage
      ? { $set: payload, $unset: { image: 1, imagePublicId: 1 } }
      : payload;
    const category = await Category.findByIdAndUpdate(categoryId, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!category) {
      throw new ApiError(404, "Category not found.");
    }

    return ok({ category: serializeDocument(category) });
  } catch (error) {
    return handleApiError(error, "Category API PATCH error:");
  }
}

export async function DELETE(_request: NextRequest, { params }: CategoryRouteContext) {
  try {
    await requireAdmin();

    const { categoryId } = await params;
    requireObjectId(categoryId, "categoryId");

    await connectDB();

    const category = await Category.findById(categoryId).lean();

    if (!category) {
      throw new ApiError(404, "Category not found.");
    }

    const [subcategoryCount, productCount] = await Promise.all([
      Subcategory.countDocuments({ categoryId }),
      Product.countDocuments({ categoryId }),
    ]);

    if (subcategoryCount > 0 || productCount > 0) {
      throw new ApiError(
        409,
        "Category cannot be deleted while referenced by subcategories or products."
      );
    }

    await Category.deleteOne({ _id: categoryId });

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, "Category API DELETE error:");
  }
}
