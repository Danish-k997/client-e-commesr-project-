import { type NextRequest } from "next/server";

import { connectDB } from "../../lib/db";
import { requireAdmin } from "../../lib/authorization";
import { Category } from "../../models";
import {
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
  serializeDocument,
} from "../_utils/responses";

const CATEGORY_FIELDS = ["name", "slug", "description", "image", "status", "sortOrder"] as const;

export async function GET() {
  try {
    await connectDB();

    const categories = await Category.find({ status: "ACTIVE" })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return ok({ categories: serializeDocument(categories) });
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
    const category = await Category.create(payload);

    return ok({ category: serializeDocument(category) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Categories API POST error:");
  }
}
