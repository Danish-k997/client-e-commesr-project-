import { type NextRequest } from "next/server";

import { connectDB } from "../../lib/db";
import { requireAdmin } from "../../lib/authorization";
import { Category, Subcategory } from "../../models";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
  requireObjectId,
  serializeDocument,
} from "../_utils/responses";

const SUBCATEGORY_FIELDS = [
  "categoryId",
  "name",
  "slug",
  "description",
  "image",
  "status",
  "sortOrder",
] as const;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const adminView = request.nextUrl.searchParams.get("scope") === "admin";
    const query: { status?: "ACTIVE"; categoryId?: string } = adminView ? {} : { status: "ACTIVE" };
    const categoryId = request.nextUrl.searchParams.get("categoryId");

    if (adminView) {
      await requireAdmin();
    }

    if (categoryId) {
      query.categoryId = requireObjectId(categoryId, "categoryId");
    }

    const subcategories = await Subcategory.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return ok({ subcategories: serializeDocument(subcategories) });
  } catch (error) {
    return handleApiError(error, "Subcategories API GET error:");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, SUBCATEGORY_FIELDS);
    const categoryId = payload.categoryId;

    if (typeof categoryId !== "string") {
      throw new ApiError(400, "categoryId is required.");
    }

    requireObjectId(categoryId, "categoryId");

    const categoryExists = await Category.exists({ _id: categoryId });

    if (!categoryExists) {
      throw new ApiError(404, "Parent category not found.");
    }

    const subcategory = await Subcategory.create(payload);

    return ok({ subcategory: serializeDocument(subcategory) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Subcategories API POST error:");
  }
}
