import { type NextRequest } from "next/server";

import { requireAdmin } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import { Order } from "../../../models";
import { handleApiError, ok } from "../../_utils/responses";
import {
  buildAdminOrdersFilter,
  getAdminOrdersMetrics,
  hydrateCustomersForUserIds,
  parseDateFilter,
  parseLimit,
  parsePage,
  type AdminOrderListItem,
} from "../../../lib/adminOrders";

export async function GET(request: NextRequest) {
  try {
    // 1. Authorize admin
    await requireAdmin();
    await connectDB();

    // 2. Parse & sanitize query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parsePage(searchParams.get("page"));
    const limit = parseLimit(searchParams.get("limit"));
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const startDateObj = parseDateFilter(startDate, "startDate");
    const endDateObj = parseDateFilter(endDate, "endDate");

    // 3. Build compound filter
    const filter = await buildAdminOrdersFilter({
      status,
      paymentStatus,
      startDate,
      endDate,
      search,
    });

    // 4. Query paginated list and count matching records
    const [totalMatching, orderDocs, metrics] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select({
          _id: 1,
          orderNumber: 1,
          createdAt: 1,
          source: 1,
          status: 1,
          paymentStatus: 1,
          userId: 1,
          items: 1,
          pricing: 1,
          isStockDecremented: 1,
          isStockRestored: 1,
          cancelledAt: 1,
        })
        .lean(),
      getAdminOrdersMetrics({
        startDate: startDateObj,
        endDate: endDateObj,
      }),
    ]);

    // 5. Batch-hydrate customer profiles in a single query
    const userIds = orderDocs.map((doc) => doc.userId).filter(Boolean);
    const customerMap = await hydrateCustomersForUserIds(userIds);

    // 6. Map into slim table response
    const orders: AdminOrderListItem[] = orderDocs.map((doc) => {
      const customer = customerMap.get(doc.userId) ?? {
        id: doc.userId,
        name: "Unknown Customer",
        email: "—",
      };

      const itemCount = Array.isArray(doc.items)
        ? doc.items.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0)
        : 0;

      const productSubtotal =
        Number(doc.pricing?.productSubtotal ?? doc.pricing?.subtotal) || 0;
      const deliveryAmount = Number(doc.pricing?.deliveryAmount) || 0;
      const membershipDiscount =
        Number(doc.pricing?.membershipDiscount ?? doc.pricing?.discountAmount) || 0;
      const totalAmount = Number(doc.pricing?.totalAmount) || 0;
      const currency = String(doc.pricing?.currency ?? "INR");

      return {
        _id: doc._id.toString(),
        orderNumber: doc.orderNumber,
        createdAt:
          doc.createdAt instanceof Date
            ? doc.createdAt.toISOString()
            : String(doc.createdAt ?? ""),
        source: doc.source,
        status: doc.status,
        paymentStatus: doc.paymentStatus,
        customer,
        itemCount,
        pricing: {
          productSubtotal,
          deliveryAmount,
          membershipDiscount,
          totalAmount,
          currency,
        },
        isStockDecremented: Boolean(doc.isStockDecremented),
        isStockRestored: Boolean(doc.isStockRestored),
        cancelledAt:
          doc.cancelledAt instanceof Date
            ? doc.cancelledAt.toISOString()
            : doc.cancelledAt
              ? String(doc.cancelledAt)
              : null,
      };
    });

    return ok({
      orders,
      pagination: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.max(1, Math.ceil(totalMatching / limit)),
      },
      metrics,
    });
  } catch (error) {
    return handleApiError(error, "Admin Orders API GET error:");
  }
}
