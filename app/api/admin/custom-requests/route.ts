import { type NextRequest } from "next/server";

import { requireAdmin } from "../../../lib/authorization";
import { CUSTOM_REQUEST_STATUSES, serializeCustomRequest } from "../../../lib/customRequests";
import { connectDB } from "../../../lib/db";
import { CustomRequest } from "../../../models";
import { ApiError, handleApiError, ok } from "../../_utils/responses";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") ?? "ALL";
    const page = readPage(searchParams.get("page"));
    const limit = readLimit(searchParams.get("limit"));

    if (status !== "ALL" && !(CUSTOM_REQUEST_STATUSES as readonly string[]).includes(status)) {
      throw new ApiError(400, "Invalid status filter.");
    }

    const filter: Record<string, unknown> = status === "ALL" ? {} : { status };

    const total = await CustomRequest.countDocuments(filter);
    const requests = await CustomRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const unreadCount = await CustomRequest.countDocuments({ isRead: false });

    return ok({
      requests: requests.map((request) => serializeCustomRequest(request)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      unreadCount,
    });
  } catch (error) {
    return handleApiError(error, "Admin Custom Requests API GET error:");
  }
}

function readPage(value: string | null) {
  if (!value) {
    return 1;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, "page must be a positive integer.");
  }

  return parsed;
}

function readLimit(value: string | null) {
  if (!value) {
    return 12;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new ApiError(400, "limit must be an integer between 1 and 50.");
  }

  return parsed;
}