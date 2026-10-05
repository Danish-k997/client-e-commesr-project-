import { type NextRequest } from "next/server";

import { connectDB } from "../../../lib/db";
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

const SUBCATEGORY_FIELDS = [
  "categoryId",
  "name",
  "slug",
  "description",
  "image",
  "status",
  "sortOrder",
] as const;

type SubcategoryRouteContext = {
  params: Promise<{ subcategoryId: string }>;
};

export async function GET(_request: NextRequest, { params }: SubcategoryRouteContext) {
  try {
    const { subcategoryId } = await params;
    requireObjectId(subcategoryId, "subcategoryId");

    await connectDB();

    const subcategory = await Subcategory.findOne({
      _id: subcategoryId,
      status: "ACTIVE",
    }).lean();

    if (!subcategory) {
      throw new ApiError(404, "Subcategory not found.");
    }

    return ok({ subcategory: serializeDocument(subcategory) });
  } catch (error) {
    return handleApiError(error, "Subcategory API GET error:");
  }
}

export async function PATCH(request: NextRequest, { params }: SubcategoryRouteContext) {
  try {
    await requireAdmin();

    const { subcategoryId } = await params;
    requireObjectId(subcategoryId, "subcategoryId");

    await connectDB();

    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, SUBCATEGORY_FIELDS, { requireAtLeastOne: true });
    const categoryId = payload.categoryId;

    if (categoryId !== undefined) {
      if (typeof categoryId !== "string") {
        throw new ApiError(400, "categoryId must be a valid ObjectId.");
      }

      requireObjectId(categoryId, "categoryId");

      const categoryExists = await Category.exists({ _id: categoryId });

      if (!categoryExists) {
        throw new ApiError(404, "Parent category not found.");
      }
    }

    const subcategory = await Subcategory.findByIdAndUpdate(subcategoryId, payload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!subcategory) {
      throw new ApiError(404, "Subcategory not found.");
    }

    return ok({ subcategory: serializeDocument(subcategory) });
  } catch (error) {
    return handleApiError(error, "Subcategory API PATCH error:");
  }
}

export async function DELETE(_request: NextRequest, { params }: SubcategoryRouteContext) {
  try {
    await requireAdmin();

    const { subcategoryId } = await params;
    requireObjectId(subcategoryId, "subcategoryId");

    await connectDB();

    const subcategory = await Subcategory.findById(subcategoryId).lean();

    if (!subcategory) {
      throw new ApiError(404, "Subcategory not found.");
    }

    const productCount = await Product.countDocuments({ subcategoryId });

    if (productCount > 0) {
      throw new ApiError(409, "Subcategory cannot be deleted while referenced by products.");
    }

    await Subcategory.deleteOne({ _id: subcategoryId });

    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error, "Subcategory API DELETE error:");
  }
}
