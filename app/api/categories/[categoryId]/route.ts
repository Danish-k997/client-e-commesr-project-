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

const CATEGORY_FIELDS = ["name", "slug", "description", "image", "status", "sortOrder"] as const;

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
    const category = await Category.findByIdAndUpdate(categoryId, payload, {
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
