import { type NextRequest } from "next/server";

import { requireAdmin } from "../../../../lib/authorization";
import { connectDB } from "../../../../lib/db";
import { HeroSlide } from "../../../../models";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  requireObjectId,
  serializeDocument,
} from "../../../_utils/responses";
import { buildHeroPayload, destroyCloudinaryAsset } from "../_utils";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ heroId: string }> }
) {
  try {
    await requireAdmin();
    const { heroId } = await params;
    requireObjectId(heroId, "heroId");
    await connectDB();

    const existingSlide = await HeroSlide.findById(heroId).lean();

    if (!existingSlide) {
      throw new ApiError(404, "Hero slide not found.");
    }

    const body = await parseJsonBody(request);
    const nextPayload = await buildHeroPayload(body, { image: existingSlide.image });
    const previousPublicId = existingSlide.image?.publicId;
    const updatedSlide = await HeroSlide.findByIdAndUpdate(heroId, nextPayload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedSlide) {
      throw new ApiError(404, "Hero slide not found.");
    }

    if (previousPublicId && nextPayload.image?.publicId && previousPublicId !== nextPayload.image.publicId) {
      await destroyCloudinaryAsset(previousPublicId);
    }

    return ok({ slide: serializeDocument(updatedSlide) });
  } catch (error) {
    return handleApiError(error, "Admin Hero PATCH error:");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ heroId: string }> }
) {
  try {
    await requireAdmin();
    const { heroId } = await params;
    requireObjectId(heroId, "heroId");
    await connectDB();

    const slide = await HeroSlide.findById(heroId).lean();

    if (!slide) {
      throw new ApiError(404, "Hero slide not found.");
    }

    const deletedSlide = await HeroSlide.findByIdAndDelete(heroId).lean();

    if (deletedSlide?.image?.publicId) {
      await destroyCloudinaryAsset(deletedSlide.image.publicId);
    }

    return ok({ deleted: true, slide: serializeDocument(deletedSlide) });
  } catch (error) {
    return handleApiError(error, "Admin Hero DELETE error:");
  }
}
