import { type NextRequest } from "next/server";
import mongoose from "mongoose";

import { requireAdmin } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import { Membership } from "../../../models";
import { ApiError, handleApiError, ok } from "../../_utils/responses";

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function readPage(value: string | null): number {
  if (!value) return 1;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, "page must be a positive integer.");
  }
  return parsed;
}

function readLimit(value: string | null): number {
  if (!value) return 10;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new ApiError(400, "limit must be an integer between 1 and 50.");
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Enforce admin-only authorization
    await requireAdmin();
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const statusParam = (searchParams.get("status") ?? "ALL").toUpperCase();
    const search = searchParams.get("search")?.trim() ?? "";
    const page = readPage(searchParams.get("page"));
    const limit = readLimit(searchParams.get("limit"));

    const now = new Date();

    // 2. Compute server-authoritative summary statistics
    const [
      totalMembers,
      activeMembers,
      expiredMembers,
      cancelledMembers,
      pendingMembers,
      revenueResult,
    ] = await Promise.all([
      // Total successful/completed memberships (excludes PENDING attempts)
      Membership.countDocuments({ status: { $in: ["ACTIVE", "EXPIRED", "CANCELLED"] } }),
      // Active memberships: status ACTIVE and expiry strictly in the future
      Membership.countDocuments({ status: "ACTIVE", expiresAt: { $gt: now } }),
      // Expired memberships: status EXPIRED or ACTIVE but expiry passed
      Membership.countDocuments({
        $or: [{ status: "EXPIRED" }, { status: "ACTIVE", expiresAt: { $lte: now } }],
      }),
      // Cancelled memberships
      Membership.countDocuments({ status: "CANCELLED" }),
      // Pending checkout attempts
      Membership.countDocuments({ status: "PENDING" }),
      // Total revenue from successful/activated memberships only (excludes PENDING)
      Membership.aggregate([
        { $match: { status: { $in: ["ACTIVE", "EXPIRED", "CANCELLED"] } } },
        { $group: { _id: null, total: { $sum: "$pricePaid" } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total ?? 0;

    // 3. Construct filter for members list
    const filterConditions: Record<string, unknown>[] = [];

    // Status filter
    if (statusParam === "ACTIVE") {
      filterConditions.push({ status: "ACTIVE", expiresAt: { $gt: now } });
    } else if (statusParam === "EXPIRED") {
      filterConditions.push({
        $or: [{ status: "EXPIRED" }, { status: "ACTIVE", expiresAt: { $lte: now } }],
      });
    } else if (statusParam === "PENDING") {
      filterConditions.push({ status: "PENDING" });
    } else if (statusParam === "CANCELLED") {
      filterConditions.push({ status: "CANCELLED" });
    } else if (statusParam !== "ALL") {
      throw new ApiError(400, "Invalid status filter.");
    }

    // Search filter across customer name, email, razorpayOrderId, razorpayPaymentId
    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");

      // Find user IDs matching customer name or email in user collection
      const matchingUsers = await mongoose.connection.db
        ?.collection("user")
        .find(
          { $or: [{ name: searchRegex }, { email: searchRegex }] },
          { projection: { _id: 1 } }
        )
        .toArray();

      const matchedUserIds = (matchingUsers || []).map((u) => u._id.toString());

      filterConditions.push({
        $or: [
          { userId: { $in: matchedUserIds } },
          { userId: searchRegex },
          { razorpayOrderId: searchRegex },
          { razorpayPaymentId: searchRegex },
        ],
      });
    }

    const finalQuery =
      filterConditions.length === 0
        ? {}
        : filterConditions.length === 1
          ? filterConditions[0]
          : { $and: filterConditions };

    // 4. Query filtered dataset with pagination
    const totalMatching = await Membership.countDocuments(finalQuery);
    const membershipDocs = await Membership.find(finalQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // 5. Hydrate customer details from user collection in a single batch query
    const userIds = Array.from(
      new Set(membershipDocs.map((m) => m.userId).filter(Boolean))
    );

    const objectIds = userIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const userDocs = userIds.length > 0
      ? await mongoose.connection.db
          ?.collection("user")
          .find({
            $or: [
              { _id: { $in: objectIds } },
              { id: { $in: userIds } },
            ],
          })
          .toArray()
      : [];

    const userMap = new Map<string, { name?: string; email?: string }>();
    if (userDocs) {
      for (const u of userDocs) {
        const idStr = u._id?.toString();
        if (idStr) userMap.set(idStr, { name: u.name, email: u.email });
        if (u.id && typeof u.id === "string") {
          userMap.set(u.id, { name: u.name, email: u.email });
        }
      }
    }

    // 6. Serialize membership records with safe fields and effective status
    const serializedMemberships = membershipDocs.map((doc) => {
      const isStillActive =
        doc.status === "ACTIVE" && new Date(doc.expiresAt).getTime() > now.getTime();

      const effectiveStatus = isStillActive
        ? "ACTIVE"
        : doc.status === "ACTIVE"
          ? "EXPIRED"
          : doc.status;

      const user = userMap.get(doc.userId);

      return {
        id: doc._id.toString(),
        userId: doc.userId,
        customerName: user?.name || "Customer",
        customerEmail: user?.email || "—",
        status: effectiveStatus,
        rawStatus: doc.status,
        pricePaid: doc.pricePaid ?? 99,
        discountAmount: doc.discountAmount ?? 150,
        startsAt: doc.startsAt ? new Date(doc.startsAt).toISOString() : null,
        expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
        updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
        razorpayOrderId: doc.razorpayOrderId ?? null,
        razorpayPaymentId: doc.razorpayPaymentId ?? null,
      };
    });

    return ok({
      stats: {
        totalMembers,
        activeMembers,
        expiredMembers,
        cancelledMembers,
        pendingMembers,
        totalRevenue,
      },
      memberships: serializedMemberships,
      pagination: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.max(1, Math.ceil(totalMatching / limit)),
      },
    });
  } catch (error) {
    return handleApiError(error, "Admin Memberships API error:");
  }
}
