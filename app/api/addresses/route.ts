import { type NextRequest } from "next/server";

import { requireAuth } from "../../lib/authorization";
import { connectDB } from "../../lib/db";
import { Address } from "../../models";
import {
  ADDRESS_FIELDS,
  serializeAddress,
  validateAddressInput,
} from "../../lib/address";
import {
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
} from "../_utils/responses";

export async function GET() {
  try {
    const session = await requireAuth();
    await connectDB();

    const addresses = await Address.find({ userId: session.user.id })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return ok({ addresses: addresses.map(serializeAddress) });
  } catch (error) {
    return handleApiError(error, "Addresses API GET error:");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, ADDRESS_FIELDS);
    const validated = validateAddressInput(payload, { isUpdate: false });

    const existingCount = await Address.countDocuments({
      userId: session.user.id,
    });

    let isDefault = validated.isDefault ?? false;
    if (existingCount === 0) {
      isDefault = true;
    } else if (isDefault) {
      await Address.updateMany(
        { userId: session.user.id, isDefault: true },
        { $set: { isDefault: false } }
      );
    } else {
      const hasDefault = await Address.exists({
        userId: session.user.id,
        isDefault: true,
      });
      if (!hasDefault) {
        isDefault = true;
      }
    }

    const address = await Address.create({
      ...validated,
      userId: session.user.id,
      isDefault,
    });

    return ok({ address: serializeAddress(address) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Addresses API POST error:");
  }
}
