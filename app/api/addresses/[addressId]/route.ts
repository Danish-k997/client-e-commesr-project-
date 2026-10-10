import { type NextRequest } from "next/server";

import { requireAuth } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import { Address } from "../../../models";
import {
  ADDRESS_FIELDS,
  serializeAddress,
  validateAddressInput,
} from "../../../lib/address";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  pickAllowedFields,
  requireObjectId,
} from "../../_utils/responses";

type AddressRouteContext = {
  params: Promise<{ addressId: string }>;
};

export async function GET(_request: NextRequest, { params }: AddressRouteContext) {
  try {
    const session = await requireAuth();
    const { addressId } = await params;
    requireObjectId(addressId, "addressId");

    await connectDB();

    const address = await Address.findOne({
      _id: addressId,
      userId: session.user.id,
    }).lean();

    if (!address) {
      throw new ApiError(404, "Address not found.");
    }

    return ok({ address: serializeAddress(address) });
  } catch (error) {
    return handleApiError(error, "Address API GET error:");
  }
}

export async function PATCH(request: NextRequest, { params }: AddressRouteContext) {
  try {
    const session = await requireAuth();
    const { addressId } = await params;
    requireObjectId(addressId, "addressId");

    await connectDB();

    const existing = await Address.findOne({
      _id: addressId,
      userId: session.user.id,
    });

    if (!existing) {
      throw new ApiError(404, "Address not found.");
    }

    const body = await parseJsonBody(request);
    const payload = pickAllowedFields(body, ADDRESS_FIELDS, {
      requireAtLeastOne: true,
    });
    const validated = validateAddressInput(payload, { isUpdate: true });

    if (validated.isDefault === true) {
      await Address.updateMany(
        { userId: session.user.id, _id: { $ne: addressId }, isDefault: true },
        { $set: { isDefault: false } }
      );
    } else if (validated.isDefault === false && existing.isDefault) {
      const otherAddress = await Address.findOne({
        userId: session.user.id,
        _id: { $ne: addressId },
      }).sort({ createdAt: -1 });

      if (otherAddress) {
        await Address.updateOne(
          { _id: otherAddress._id },
          { $set: { isDefault: true } }
        );
      } else {
        validated.isDefault = true;
      }
    }

    const updated = await Address.findOneAndUpdate(
      { _id: addressId, userId: session.user.id },
      { $set: validated },
      { new: true, returnDocument: "after", runValidators: true }
    ).lean();

    if (!updated) {
      throw new ApiError(404, "Address not found.");
    }

    return ok({ address: serializeAddress(updated) });
  } catch (error) {
    return handleApiError(error, "Address API PATCH error:");
  }
}

export async function DELETE(_request: NextRequest, { params }: AddressRouteContext) {
  try {
    const session = await requireAuth();
    const { addressId } = await params;
    requireObjectId(addressId, "addressId");

    await connectDB();

    const existing = await Address.findOne({
      _id: addressId,
      userId: session.user.id,
    });

    if (!existing) {
      throw new ApiError(404, "Address not found.");
    }

    await Address.deleteOne({ _id: addressId, userId: session.user.id });

    if (existing.isDefault) {
      const remaining = await Address.findOne({
        userId: session.user.id,
      }).sort({ createdAt: -1 });

      if (remaining) {
        await Address.updateOne(
          { _id: remaining._id },
          { $set: { isDefault: true } }
        );
        await Address.updateMany(
          { userId: session.user.id, _id: { $ne: remaining._id }, isDefault: true },
          { $set: { isDefault: false } }
        );
      }
    }

    return ok({ deleted: true, addressId });
  } catch (error) {
    return handleApiError(error, "Address API DELETE error:");
  }
}
