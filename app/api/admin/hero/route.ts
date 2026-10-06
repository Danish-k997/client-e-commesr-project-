import { type NextRequest } from "next/server";

import { requireAdmin } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import { getAllHeroSlidesForAdmin } from "../../../lib/hero";
import { HeroSlide } from "../../../models";
import {
  handleApiError,
  ok,
  parseJsonBody,
  serializeDocument,
} from "../../_utils/responses";
import { buildHeroPayload } from "./_utils";

export async function GET() {
  try {
    await requireAdmin();
    const slides = await getAllHeroSlidesForAdmin();
    return ok({ slides });
  } catch (error) {
    return handleApiError(error, "Admin Hero API GET error:");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const body = await parseJsonBody(request);
    const payload = await buildHeroPayload(body);
    const slide = await HeroSlide.create(payload);

    return ok({ slide: serializeDocument(slide) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Admin Hero API POST error:");
  }
}
