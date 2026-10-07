import { type NextRequest } from "next/server";

import { requireAdmin } from "../../../../lib/authorization";
import {
  CUSTOM_REQUEST_STATUSES,
  serializeCustomRequest,
} from "../../../../lib/customRequests";
import { connectDB } from "../../../../lib/db";
import { CustomRequest } from "../../../../models";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
  requireObjectId,
} from "../../../_utils/responses";

const ADMIN_CUSTOM_REQUEST_FIELDS = ["status", "adminNotes"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    await requireAdmin();
    const { requestId } = await params;
    requireObjectId(requestId, "requestId");
    await connectDB();

    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, ADMIN_CUSTOM_REQUEST_FIELDS, {
      requireAtLeastOne: true,
    });

    const update: Record<string, unknown> = {};

    if (payload.status !== undefined) {
      if (!(CUSTOM_REQUEST_STATUSES as readonly string[]).includes(payload.status as string)) {
        throw new ApiError(400, "Invalid custom request status.");
      }

      update.status = payload.status;
    }

    if (payload.adminNotes !== undefined) {
      if (typeof payload.adminNotes !== "string" || payload.adminNotes.trim().length > 2000) {
        throw new ApiError(400, "Admin notes must be 2000 characters or fewer.");
      }

      update.adminNotes = payload.adminNotes.trim();
    }

    const updatedRequest = await CustomRequest.findByIdAndUpdate(requestId, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedRequest) {
      throw new ApiError(404, "Custom request not found.");
    }

    return ok({ request: serializeCustomRequest(updatedRequest) });
  } catch (error) {
    return handleApiError(error, "Admin Custom Request PATCH error:");
  }
}