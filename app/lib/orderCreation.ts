"server-only";

import crypto from "crypto";
import mongoose from "mongoose";

import { Order, PaymentTransaction, Product, ProductVariant } from "../models";
import { clearPurchasedCartItems } from "../api/cart/_service";
import type {
  IOrderItem,
  IOrderPricing,
  IOrderShippingAddress,
  IOrderMembershipSnapshot,
} from "../models";
import { computeCheckoutQuote, type BuyNowCheckoutInput } from "./checkout";
import {
  generateOrderNumber,
  serializeOrder,
  serializePaymentTransaction,
  type SerializedOrder,
  type SerializedPaymentTransaction,
} from "./order";
import { ApiError } from "../api/_utils/responses";

type OrderDoc = InstanceType<typeof Order>;
type TransactionDoc = InstanceType<typeof PaymentTransaction>;

export type CreateCheckoutOrderInput = {
  selectedAddressId: string;
  source?: "BUY_NOW" | "CART";
  buyNow?: BuyNowCheckoutInput | null;
  idempotencyKey?: string | null;
};

export type CreateCheckoutOrderResult = {
  order: SerializedOrder;
  transaction: SerializedPaymentTransaction;
  isIdempotentReplay: boolean;
};

/**
 * Server-authoritative Order and PaymentTransaction creator.
 *
 * Invariants:
 * 1. Authenticates user and verifies delivery address ownership authoritatively.
 * 2. Re-runs server checkout quote (re-evaluates DB product prices, stock, delivery fee, and membership discount).
 * 3. Enforces idempotency via idempotencyKey to prevent duplicate orders from double-clicks or retries.
 * 4. Freezes immutable snapshots of shipping address, items, line subtotals, images, delivery fee, and pricing.
 * 5. Creates Order in "PENDING_PAYMENT" status.
 * 6. Creates initial PaymentTransaction in "INITIATED" status.
 * 7. Atomicity / safe compensation guarantees: avoids orphaned corrupt records if DB operations fail.
 */
export async function createCheckoutOrder(
  userId: string,
  input: CreateCheckoutOrderInput
): Promise<CreateCheckoutOrderResult> {
  if (!userId || typeof userId !== "string") {
    throw new ApiError(401, "Authentication required.");
  }

  const { selectedAddressId, source = "CART", buyNow, idempotencyKey } = input;

  if (!selectedAddressId || typeof selectedAddressId !== "string") {
    throw new ApiError(400, "A delivery address is required to create an order.");
  }

  if (!mongoose.isValidObjectId(selectedAddressId)) {
    throw new ApiError(400, "Invalid delivery address identifier.");
  }

  const normalizedKey = idempotencyKey?.trim() || null;

  // 1. Idempotency Check: prevent duplicate orders if client retries or double-clicks
  if (normalizedKey) {
    const existingOrder = await Order.findOne({
      userId,
      idempotencyKey: normalizedKey,
    }).lean();

    if (existingOrder) {
      if (
        existingOrder.status === "PENDING_PAYMENT" ||
        existingOrder.paymentStatus === "PENDING_PAYMENT" ||
        existingOrder.status === "PENDING"
      ) {
        let transactionDoc = await PaymentTransaction.findOne({
          orderId: existingOrder._id,
        })
          .sort({ attemptNumber: -1 })
          .lean();

        if (!transactionDoc) {
          // Self-heal transaction record if previous creation was interrupted
          transactionDoc = await PaymentTransaction.create({
            userId,
            orderId: existingOrder._id,
            provider: "RAZORPAY",
            amount: existingOrder.pricing.totalAmount,
            currency: existingOrder.currency || "INR",
            status: "INITIATED",
            attemptNumber: 1,
            idempotencyKey: normalizedKey,
          });
        }

        return {
          order: serializeOrder(existingOrder),
          transaction: serializePaymentTransaction(transactionDoc),
          isIdempotentReplay: true,
        };
      }

      if (
        existingOrder.status === "CONFIRMED" ||
        existingOrder.paymentStatus === "PAID"
      ) {
        throw new ApiError(409, "An order with this idempotency key has already been completed.");
      }

      if (existingOrder.status === "CANCELLED") {
        throw new ApiError(409, "This order was cancelled. Please start a new checkout session.");
      }
    }
  }

  // 2. Authoritative checkout validation & pricing quote
  const quote = await computeCheckoutQuote(userId, {
    source,
    addressId: selectedAddressId,
    buyNow,
  });

  if (!quote.isValid || quote.items.length === 0) {
    throw new ApiError(400, "Cannot create order with invalid items.");
  }

  if (!quote.address) {
    throw new ApiError(400, "A valid delivery address is required to create an order.");
  }

  // 3. Unique Order Number generation
  let orderNumber = generateOrderNumber();
  let attempts = 0;
  while (await Order.exists({ orderNumber })) {
    orderNumber = generateOrderNumber();
    attempts++;
    if (attempts >= 5) {
      throw new ApiError(500, "Failed to generate unique order number. Please try again.");
    }
  }

  // 4. Build immutable snapshots
  const shippingAddress: IOrderShippingAddress = {
    fullName: quote.address.fullName,
    phone: quote.address.phone,
    addressLine1: quote.address.addressLine1,
    addressLine2: quote.address.addressLine2 || null,
    city: quote.address.city,
    state: quote.address.state,
    pincode: quote.address.pincode,
    landmark: quote.address.landmark || null,
  };

  const items: IOrderItem[] = quote.items.map((item) => ({
    productId: new mongoose.Types.ObjectId(item.productId),
    variantId: item.variantId ? new mongoose.Types.ObjectId(item.variantId) : null,
    title: item.title,
    slug: item.slug,
    image: item.image,
    variantSku: item.variantSku,
    variantAttributes: item.variantAttributes,
    price: item.price,
    quantity: item.quantity,
    lineSubtotal: item.lineSubtotal,
    deliveryFee: item.deliveryFee,
    deliveryType: item.deliveryType,
    customization: item.customization,
  }));

  const pricing: IOrderPricing = {
    subtotal: quote.pricing.subtotal,
    productSubtotal: quote.productSubtotal,
    deliveryFee: quote.pricing.deliveryTotal,
    deliveryAmount: quote.deliveryAmount,
    discountAmount: quote.pricing.discountPaise,
    membershipDiscount: quote.membershipDiscount,
    totalAmount: quote.payableAmount,
    currency: "INR",
  };

  const membership: IOrderMembershipSnapshot = {
    isApplied: quote.pricing.discountPaise > 0,
    discountAmount: quote.pricing.discountPaise,
  };

  // 5. Atomic persistence with compensating rollback
  let session: mongoose.ClientSession | null = null;
  let supportsTransactions = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    supportsTransactions = true;
  } catch {
    session = null;
    supportsTransactions = false;
  }

  let orderDoc: OrderDoc | null = null;
  let transactionDoc: TransactionDoc | null = null;

  try {
    if (supportsTransactions && session) {
      const [createdOrder] = await Order.create(
        [
          {
            orderNumber,
            userId,
            idempotencyKey: normalizedKey,
            items,
            pricing,
            membership,
            shippingAddress,
            source,
            status: "PENDING_PAYMENT",
            paymentStatus: "PENDING_PAYMENT",
            paymentAttemptsCount: 1,
            currency: "INR",
          },
        ],
        { session }
      );
      orderDoc = createdOrder;

      const [createdTransaction] = await PaymentTransaction.create(
        [
          {
            userId,
            orderId: orderDoc._id,
            provider: "RAZORPAY",
            amount: quote.payableAmount,
            currency: "INR",
            status: "INITIATED",
            attemptNumber: 1,
            idempotencyKey: normalizedKey,
          },
        ],
        { session }
      );
      transactionDoc = createdTransaction;

      await session.commitTransaction();
    } else {
      orderDoc = await Order.create({
        orderNumber,
        userId,
        idempotencyKey: normalizedKey,
        items,
        pricing,
        membership,
        shippingAddress,
        source,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING_PAYMENT",
        paymentAttemptsCount: 1,
        currency: "INR",
      });

      try {
        transactionDoc = await PaymentTransaction.create({
          userId,
          orderId: orderDoc._id,
          provider: "RAZORPAY",
          amount: quote.payableAmount,
          currency: "INR",
          status: "INITIATED",
          attemptNumber: 1,
          idempotencyKey: normalizedKey,
        });
      } catch (txError) {
        // Compensating rollback: remove order to prevent orphaned corrupt record
        await Order.deleteOne({ _id: orderDoc._id });
        throw txError;
      }
    }
  } catch (error) {
    if (supportsTransactions && session) {
      await session.abortTransaction().catch(() => {});
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }

  return {
    order: serializeOrder(orderDoc),
    transaction: serializePaymentTransaction(transactionDoc),
    isIdempotentReplay: false,
  };
}

/**
 * Creates a new payment attempt for an existing pending order (e.g. customer retry after failure).
 */
export async function createPaymentRetryTransaction(
  userId: string,
  orderId: string,
  idempotencyKey?: string | null
): Promise<SerializedPaymentTransaction> {
  if (!mongoose.isValidObjectId(orderId)) {
    throw new ApiError(400, "Invalid order identifier.");
  }

  const order = await Order.findOne({
    _id: orderId,
    userId,
  });

  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  if (order.status !== "PENDING_PAYMENT" && order.status !== "PENDING") {
    throw new ApiError(400, `Cannot initiate payment for order in status ${order.status}.`);
  }

  const normalizedKey = idempotencyKey?.trim() || null;

  if (normalizedKey) {
    const existingTx = await PaymentTransaction.findOne({
      orderId: order._id,
      idempotencyKey: normalizedKey,
    }).lean();

    if (existingTx) {
      return serializePaymentTransaction(existingTx);
    }
  }

  // Find latest attempt number
  const latestTx = await PaymentTransaction.findOne({ orderId: order._id })
    .sort({ attemptNumber: -1 })
    .lean();

  const nextAttemptNumber = (latestTx?.attemptNumber ?? 0) + 1;

  const newTx = await PaymentTransaction.create({
    userId,
    orderId: order._id,
    provider: "RAZORPAY",
    amount: order.pricing.totalAmount,
    currency: order.currency || "INR",
    status: "INITIATED",
    attemptNumber: nextAttemptNumber,
    idempotencyKey: normalizedKey,
  });

  // Update order's paymentAttemptsCount
  await Order.updateOne(
    { _id: order._id },
    { $set: { paymentAttemptsCount: nextAttemptNumber } }
  );

  return serializePaymentTransaction(newTx);
}

export type CreateRazorpayOrderServiceResult = {
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amount: number; // in integer paise
  currency: string;
  keyId: string;
  transactionId: string;
  attemptNumber: number;
  customer?: {
    name: string;
    email: string;
    contact: string;
  };
};

/**
 * Creates a Razorpay Order for an existing internal Order.
 *
 * Invariants:
 * 1. Authenticates user and verifies order ownership.
 * 2. Verifies order is in a payable state (rejects paid or cancelled orders).
 * 3. Derives amount strictly from internal server Order record (integer paise). Never trusts client amount.
 * 4. Deduplicates repeated requests: reuses existing active razorpayOrderId to avoid duplicate payment orders.
 * 5. Uses safe receipt max 40 chars linking orderNumber.
 * 6. Records razorpayOrderId in PaymentTransaction and persists failures safely.
 */
export async function createRazorpayOrderForInternalOrder(
  userId: string,
  orderId: string,
  transactionId?: string | null
): Promise<CreateRazorpayOrderServiceResult> {
  if (!userId || typeof userId !== "string") {
    throw new ApiError(401, "Authentication required.");
  }

  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    throw new ApiError(400, "Invalid order identifier.");
  }

  // 1. Verify Order exists and belongs to authenticated user
  const order = await Order.findOne({
    _id: orderId,
    userId,
  });

  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  // 2. Verify Order is in payable state
  if (order.paymentStatus === "PAID" || order.status === "CONFIRMED") {
    throw new ApiError(400, "Order is already paid.");
  }

  if (order.status === "CANCELLED") {
    throw new ApiError(400, "Order has been cancelled.");
  }

  if (order.status !== "PENDING_PAYMENT" && order.status !== "PENDING") {
    throw new ApiError(400, `Cannot initiate payment for order in status "${order.status}".`);
  }

  // 3. Verify server-authoritative amount (NEVER accept client amount)
  const amountInPaise = order.pricing.totalAmount;
  if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new ApiError(400, "Invalid payable order amount.");
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new ApiError(500, "Razorpay credentials are not configured on the server.");
  }

  // 4. Resolve PaymentTransaction attempt
  let transaction: TransactionDoc | null = null;
  if (transactionId && mongoose.isValidObjectId(transactionId)) {
    transaction = await PaymentTransaction.findOne({
      _id: transactionId,
      orderId: order._id,
      userId,
    });
  }

  if (!transaction) {
    // Find latest transaction for this order
    transaction = await PaymentTransaction.findOne({
      orderId: order._id,
      userId,
    }).sort({ attemptNumber: -1 });
  }

  // 5. Idempotent deduplication:
  // If current transaction already has a Razorpay order ID and has not failed, reuse it!
  if (transaction && transaction.razorpayOrderId && transaction.status !== "FAILED") {
    return {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      razorpayOrderId: transaction.razorpayOrderId,
      amount: transaction.amount,
      currency: transaction.currency || "INR",
      keyId,
      transactionId: transaction._id.toString(),
      attemptNumber: transaction.attemptNumber,
      customer: {
        name: order.shippingAddress.fullName,
        email: "",
        contact: order.shippingAddress.phone,
      },
    };
  }

  // If previous transaction failed or no transaction exists, create a fresh attempt
  if (!transaction || transaction.status === "FAILED") {
    const nextAttempt = (transaction?.attemptNumber ?? 0) + 1;
    transaction = await PaymentTransaction.create({
      userId,
      orderId: order._id,
      provider: "RAZORPAY",
      amount: amountInPaise,
      currency: "INR",
      status: "INITIATED",
      attemptNumber: nextAttempt,
    });

    order.paymentAttemptsCount = nextAttempt;
    await order.save();
  }

  // 6. Call Razorpay Orders API
  const receipt = `rcpt_${order.orderNumber}`.slice(0, 40);
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  let razorpayResponse: Response;
  try {
    razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt,
        notes: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          userId,
          attemptNumber: String(transaction.attemptNumber),
        },
      }),
    });
  } catch (networkError) {
    transaction.status = "FAILED";
    transaction.error = {
      code: "NETWORK_ERROR",
      description:
        networkError instanceof Error ? networkError.message : "Network error contacting Razorpay",
      source: "network",
      step: "create_order",
    };
    await transaction.save();

    throw new ApiError(502, "Unable to communicate with payment gateway. Please try again.");
  }

  if (!razorpayResponse.ok) {
    const errorBody = await razorpayResponse.json().catch(() => null);
    const errorDesc =
      (errorBody as { error?: { description?: string } })?.error?.description ||
      "Failed to create Razorpay order.";

    transaction.status = "FAILED";
    transaction.error = {
      code: (errorBody as { error?: { code?: string } })?.error?.code || "RAZORPAY_API_ERROR",
      description: errorDesc,
      source: "razorpay_gateway",
      step: "create_order",
      metadata: errorBody,
    };
    await transaction.save();

    throw new ApiError(502, `Payment gateway error: ${errorDesc}`);
  }

  const razorpayOrder = (await razorpayResponse.json()) as {
    id: string;
    amount: number;
    currency: string;
  };

  // 7. Update transaction with razorpayOrderId
  transaction.razorpayOrderId = razorpayOrder.id;
  transaction.status = "PENDING";
  await transaction.save();

  return {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId,
    transactionId: transaction._id.toString(),
    attemptNumber: transaction.attemptNumber,
    customer: {
      name: order.shippingAddress.fullName,
      email: "",
      contact: order.shippingAddress.phone,
    },
  };
}

export type FinalizeOrderPaymentSuccessInput = {
  orderId?: string | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string | null;
  signatureVerified?: boolean;
  source: "BROWSER" | "WEBHOOK";
  userId?: string | null;
  transactionId?: string | null;
};

export type FinalizeOrderPaymentSuccessResult = {
  success: boolean;
  isAlreadyVerified: boolean;
  order: SerializedOrder;
  transaction: SerializedPaymentTransaction | null;
  message: string;
};

/**
 * Shared, authoritative order payment finalization service.
 * Used by BOTH browser verification and asynchronous Razorpay webhooks.
 *
 * Invariants:
 * 1. Idempotency guard: If order is already paid, returns existing confirmed state without duplicating actions.
 * 2. Decrements product and variant stock strictly once (tracked via `order.isStockDecremented`).
 * 3. Clears only purchased items from cart if order source was "CART" (preserves cart for Buy Now).
 * 4. Marks PaymentTransaction as "SUCCESS" and Order as "CONFIRMED" + "PAID".
 */
export async function finalizeOrderPaymentSuccess(
  input: FinalizeOrderPaymentSuccessInput
): Promise<FinalizeOrderPaymentSuccessResult> {
  const {
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    signatureVerified = true,
    userId,
    transactionId,
  } = input;

  const cleanOrderId = razorpayOrderId?.trim();
  const cleanPaymentId = razorpayPaymentId?.trim();
  const cleanSignature = razorpaySignature?.trim() || null;

  // 1. Locate PaymentTransaction
  let transaction: TransactionDoc | null = null;

  if (transactionId && mongoose.isValidObjectId(transactionId)) {
    const txQuery: Record<string, unknown> = { _id: transactionId };
    if (userId) txQuery.userId = userId;
    transaction = await PaymentTransaction.findOne(txQuery);
  }

  if (!transaction && cleanOrderId) {
    const txQuery: Record<string, unknown> = { razorpayOrderId: cleanOrderId };
    if (userId) txQuery.userId = userId;
    transaction = await PaymentTransaction.findOne(txQuery).sort({ attemptNumber: -1 });
  }

  // 2. Locate internal Order
  let order: OrderDoc | null = null;
  const targetOrderId =
    orderId && mongoose.isValidObjectId(orderId) ? orderId : transaction?.orderId;

  if (targetOrderId) {
    const orderQuery: Record<string, unknown> = { _id: targetOrderId };
    if (userId) orderQuery.userId = userId;
    order = await Order.findOne(orderQuery);
  }

  if (!order && orderId && typeof orderId === "string") {
    const orderQuery: Record<string, unknown> = { orderNumber: orderId.trim() };
    if (userId) orderQuery.userId = userId;
    order = await Order.findOne(orderQuery);
  }

  if (!order) {
    throw new ApiError(404, "Order not found or unauthorized.");
  }

  // If transaction wasn't found yet, locate latest by order._id
  if (!transaction) {
    transaction = await PaymentTransaction.findOne({ orderId: order._id }).sort({ attemptNumber: -1 });
  }

  if (userId && order.userId.toString() !== userId.toString()) {
    throw new ApiError(403, "Unauthorized access to order.");
  }

  // 3. IDEMPOTENCY GUARD:
  // If order is already confirmed and paid, return existing state without duplicate actions
  if (order.status === "CONFIRMED" && order.paymentStatus === "PAID") {
    if (transaction && transaction.status !== "SUCCESS") {
      transaction.status = "SUCCESS";
      if (cleanPaymentId) transaction.razorpayPaymentId = cleanPaymentId;
      if (cleanSignature) transaction.razorpaySignature = cleanSignature;
      transaction.signatureVerified = true;
      transaction.error = null;
      await transaction.save();
    }

    return {
      success: true,
      isAlreadyVerified: true,
      order: serializeOrder(order),
      transaction: transaction ? serializePaymentTransaction(transaction) : null,
      message: "Payment already successfully verified.",
    };
  }

  // 4. Update PaymentTransaction
  if (transaction) {
    transaction.status = "SUCCESS";
    if (cleanPaymentId) transaction.razorpayPaymentId = cleanPaymentId;
    if (cleanSignature) transaction.razorpaySignature = cleanSignature;
    transaction.signatureVerified = Boolean(signatureVerified);
    transaction.error = null;
    await transaction.save();
  }

  // 5. Update Order status
  order.status = "CONFIRMED";
  order.paymentStatus = "PAID";

  // 6. Inventory / Stock decrement (strictly once, concurrency-safe)
  // Atomically claim the decrement so concurrent browser & webhook calls cannot double-decrement
  const claimedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      isStockDecremented: { $ne: true },
    },
    {
      $set: { isStockDecremented: true },
    },
    { new: true }
  );

  if (claimedOrder) {
    for (const item of order.items) {
      const qty = item.quantity;
      if (item.variantId) {
        await ProductVariant.updateOne(
          { _id: item.variantId },
          { $inc: { stock: -qty } }
        );
      } else {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: -qty } }
        );
      }
    }
  }

  order.isStockDecremented = true;
  await order.save();

  // 7. Clear Cart if order source was CART
  if (order.source === "CART") {
    await clearPurchasedCartItems(order.userId, order.items).catch(() => {});
  }

  return {
    success: true,
    isAlreadyVerified: false,
    order: serializeOrder(order),
    transaction: transaction ? serializePaymentTransaction(transaction) : null,
    message: "Payment successfully verified and order confirmed.",
  };
}

export type RecordPaymentFailureInput = {
  orderId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  error?: Record<string, unknown> | null;
};

export async function recordOrderPaymentFailure(
  input: RecordPaymentFailureInput
): Promise<{ recorded: boolean; orderId?: string }> {
  const { orderId, razorpayOrderId, razorpayPaymentId, error } = input;

  const cleanOrderId = razorpayOrderId?.trim();
  const cleanPaymentId = razorpayPaymentId?.trim();

  // 1. Locate Transaction
  let transaction: TransactionDoc | null = null;
  if (cleanOrderId) {
    transaction = await PaymentTransaction.findOne({ razorpayOrderId: cleanOrderId }).sort({ attemptNumber: -1 });
  }

  // 2. Locate Order
  let order: OrderDoc | null = null;
  if (orderId && mongoose.isValidObjectId(orderId)) {
    order = await Order.findById(orderId);
  } else if (transaction) {
    order = await Order.findById(transaction.orderId);
  }

  if (!order && !transaction) {
    return { recorded: false };
  }

  // 3. If order is already CONFIRMED and PAID, ignore late failure notification
  if (order && order.status === "CONFIRMED" && order.paymentStatus === "PAID") {
    return { recorded: false, orderId: order._id.toString() };
  }

  // 4. Update transaction
  if (transaction && transaction.status !== "SUCCESS") {
    transaction.status = "FAILED";
    if (cleanPaymentId) transaction.razorpayPaymentId = cleanPaymentId;
    transaction.error = {
      code: (error?.code as string) || (error?.error_code as string) || "PAYMENT_FAILED",
      description: (error?.description as string) || (error?.error_description as string) || "Payment was not completed",
      source: (error?.source as string) || (error?.error_source as string) || "gateway",
      step: (error?.step as string) || (error?.error_step as string) || "payment",
      reason: (error?.reason as string) || (error?.error_reason as string) || null,
      metadata: error || null,
    };
    await transaction.save();
  }

  // 5. Update order payment status (preserve order and stock so customer can retry)
  if (order && order.status === "PENDING_PAYMENT") {
    order.paymentStatus = "FAILED";
    await order.save();
  }

  return { recorded: true, orderId: order?._id.toString() };
}

export type VerifyOrderPaymentInput = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  orderId?: string | null;
  transactionId?: string | null;
};

export type VerifyOrderPaymentResult = {
  success: boolean;
  isAlreadyVerified: boolean;
  order: SerializedOrder;
  transaction: SerializedPaymentTransaction | null;
  message: string;
};

/**
 * Server-authoritative cryptographic verification of Razorpay payment and idempotent order finalization.
 * Used for browser verification callback. Delegates to `finalizeOrderPaymentSuccess`.
 */
export async function verifyAndFinalizeOrderPayment(
  userId: string,
  input: VerifyOrderPaymentInput
): Promise<VerifyOrderPaymentResult> {
  if (!userId || typeof userId !== "string") {
    throw new ApiError(401, "Authentication required.");
  }

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,
    transactionId,
  } = input;

  if (
    !razorpay_order_id ||
    typeof razorpay_order_id !== "string" ||
    !razorpay_payment_id ||
    typeof razorpay_payment_id !== "string" ||
    !razorpay_signature ||
    typeof razorpay_signature !== "string"
  ) {
    throw new ApiError(400, "Missing or invalid payment verification parameters.");
  }

  const cleanOrderId = razorpay_order_id.trim();
  const cleanPaymentId = razorpay_payment_id.trim();
  const cleanSignature = razorpay_signature.trim();

  // 1. Locate PaymentTransaction
  let transaction: TransactionDoc | null = null;

  if (transactionId && mongoose.isValidObjectId(transactionId)) {
    transaction = await PaymentTransaction.findOne({
      _id: transactionId,
      userId,
    });
  }

  if (!transaction) {
    transaction = await PaymentTransaction.findOne({
      razorpayOrderId: cleanOrderId,
      userId,
    }).sort({ attemptNumber: -1 });
  }

  // 2. Locate internal Order
  const targetOrderId =
    orderId && mongoose.isValidObjectId(orderId) ? orderId : transaction?.orderId;

  const order = targetOrderId
    ? await Order.findOne({ _id: targetOrderId, userId })
    : null;

  if (!order) {
    throw new ApiError(404, "Order not found or unauthorized.");
  }

  // 3. IDEMPOTENCY GUARD:
  // If order is already confirmed and paid (e.g. by webhook that arrived first!), return existing result immediately
  if (
    order.status === "CONFIRMED" &&
    order.paymentStatus === "PAID"
  ) {
    return {
      success: true,
      isAlreadyVerified: true,
      order: serializeOrder(order),
      transaction: transaction ? serializePaymentTransaction(transaction) : null,
      message: "Payment already successfully verified.",
    };
  }

  // 4. Cryptographic signature verification using server secret
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new ApiError(500, "Razorpay credentials are not configured on the server.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${cleanOrderId}|${cleanPaymentId}`)
    .digest("hex");

  const isSignatureValid =
    expectedSignature.length === cleanSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(cleanSignature, "utf-8")
    );

  if (!isSignatureValid) {
    if (transaction) {
      transaction.status = "FAILED";
      transaction.razorpayPaymentId = cleanPaymentId;
      transaction.razorpaySignature = cleanSignature;
      transaction.signatureVerified = false;
      transaction.error = {
        code: "INVALID_SIGNATURE",
        description: "Cryptographic payment signature mismatch.",
        source: "verification",
        step: "verify_signature",
      };
      await transaction.save();
    }

    throw new ApiError(400, "Invalid payment signature. Verification failed.");
  }

  // 5. Delegate to shared finalization service
  const result = await finalizeOrderPaymentSuccess({
    orderId: order._id.toString(),
    razorpayOrderId: cleanOrderId,
    razorpayPaymentId: cleanPaymentId,
    razorpaySignature: cleanSignature,
    signatureVerified: true,
    source: "BROWSER",
    userId,
    transactionId: transaction?._id.toString(),
  });

  return result as VerifyOrderPaymentResult;
}


