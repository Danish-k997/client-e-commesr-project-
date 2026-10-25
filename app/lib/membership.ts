import "server-only";

import crypto from "crypto";
import { Types } from "mongoose";

import {
  Membership,
  PaymentTransaction,
  MEMBERSHIP_PRICE,
  MEMBERSHIP_DISCOUNT_AMOUNT,
  MEMBERSHIP_VALIDITY_DAYS,
} from "../models";
import type { IMembership, MembershipStatus } from "../models";
import { ApiError } from "../api/_utils/responses";

export {
  MEMBERSHIP_PRICE,
  MEMBERSHIP_DISCOUNT_AMOUNT,
  MEMBERSHIP_VALIDITY_DAYS,
};

export interface SerializedUserMembership {
  id: string;
  status: MembershipStatus;
  pricePaid: number;
  discountAmount: number;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserMembershipState {
  isActive: boolean;
  membership: SerializedUserMembership | null;
}

export interface MembershipDiscountCalculation {
  subtotal: number;
  discount: number;
  payableAmount: number;
  isMembershipApplied: boolean;
}

/**
 * Computes membership expiry date exactly 1 year from the start date.
 */
export function computeMembershipExpiry(startsAt: Date): Date {
  const expiresAt = new Date(startsAt.getTime());
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  return expiresAt;
}

/**
 * Evaluates whether a membership is currently active:
 * - status must be "ACTIVE"
 * - expiresAt must be in the future relative to referenceDate
 */
export function isMembershipActive(
  membership: Pick<IMembership, "status" | "expiresAt"> | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  if (!membership) {
    return false;
  }

  if (membership.status !== "ACTIVE") {
    return false;
  }

  const expiryTime = new Date(membership.expiresAt).getTime();
  if (Number.isNaN(expiryTime)) {
    return false;
  }

  return expiryTime > referenceDate.getTime();
}

/**
 * Server-authoritative calculation for order membership discount.
 * 
 * Rules:
 * - Active members receive up to ₹150 discount per eligible order.
 * - If order subtotal is less than ₹150, discount cannot exceed subtotal.
 * - Payable amount must never be negative.
 * - Membership purchase itself does not receive discount.
 */
export function calculateMembershipDiscount(
  orderSubtotal: number,
  hasActiveMembership: boolean,
  options: { isMembershipPurchase?: boolean } = {}
): MembershipDiscountCalculation {
  const safeSubtotal = Number.isFinite(orderSubtotal) && orderSubtotal > 0
    ? Math.round(orderSubtotal * 100) / 100
    : 0;

  // Membership purchase itself never receives a membership discount.
  // Eligible orders require a product subtotal of at least ₹150 before applying the discount.
  if (options.isMembershipPurchase || !hasActiveMembership || safeSubtotal <= 0) {
    return {
      subtotal: safeSubtotal,
      discount: 0,
      payableAmount: safeSubtotal,
      isMembershipApplied: false,
    };
  }

  const discount = safeSubtotal >= MEMBERSHIP_DISCOUNT_AMOUNT
    ? Math.min(MEMBERSHIP_DISCOUNT_AMOUNT, safeSubtotal)
    : 0;
  const payableAmount = Math.max(0, Math.round((safeSubtotal - discount) * 100) / 100);

  return {
    subtotal: safeSubtotal,
    discount,
    payableAmount,
    isMembershipApplied: discount > 0,
  };
}

/**
 * Verifies Razorpay payment signature using HMAC SHA256 and timingSafeEqual.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature.length !== signature.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf-8"),
      Buffer.from(signature, "utf-8")
    );
  } catch {
    return false;
  }
}

/**
 * Retrieves the currently active membership document for a given user, or null if none.
 */
export async function getActiveMembershipForUser(userId: string): Promise<IMembership | null> {
  const now = new Date();

  const membership = await Membership.findOne({
    userId,
    status: "ACTIVE",
    expiresAt: { $gt: now },
  })
    .sort({ expiresAt: -1 })
    .lean();

  return (membership as unknown as IMembership) || null;
}

/**
 * Returns current user membership state safe for client consumption.
 * Sensitive payment IDs / tokens are omitted.
 * Only returns completed/activated memberships (ignores uncompleted PENDING attempts).
 */
export async function getMembershipForUser(userId: string): Promise<UserMembershipState> {
  const latest = await Membership.findOne({
    userId,
    status: { $ne: "PENDING" },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!latest) {
    return {
      isActive: false,
      membership: null,
    };
  }

  const doc = latest as unknown as IMembership;
  const active = isMembershipActive(doc);

  const effectiveStatus: MembershipStatus = active
    ? "ACTIVE"
    : doc.status === "ACTIVE"
      ? "EXPIRED"
      : doc.status;

  return {
    isActive: active,
    membership: {
      id: (doc._id as Types.ObjectId | string).toString(),
      status: effectiveStatus,
      pricePaid: doc.pricePaid,
      discountAmount: doc.discountAmount,
      startsAt: new Date(doc.startsAt).toISOString(),
      expiresAt: new Date(doc.expiresAt).toISOString(),
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    },
  };
}

/**
 * Creates a Razorpay Order for exactly ₹99 and records a PENDING membership.
 */
export async function createRazorpayMembershipOrder(userId: string): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured on the server.");
  }

  const amountInPaise = MEMBERSHIP_PRICE * 100;
  const receipt = `rcpt_mem_${userId.slice(-6)}_${Date.now()}`.slice(0, 40);
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  const response = await fetch("https://api.razorpay.com/v1/orders", {
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
        userId,
        purpose: "MEMBERSHIP",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMessage =
      (errorBody as { error?: { description?: string } })?.error?.description ||
      "Failed to create Razorpay order.";
    throw new Error(errorMessage);
  }

  const razorpayOrder = (await response.json()) as { id: string; amount: number; currency: string };

  // Store a PENDING membership transaction record linked to this razorpayOrderId
  await Membership.create({
    userId,
    status: "PENDING",
    pricePaid: MEMBERSHIP_PRICE,
    discountAmount: MEMBERSHIP_DISCOUNT_AMOUNT,
    startsAt: new Date(),
    expiresAt: computeMembershipExpiry(new Date()),
    razorpayOrderId: razorpayOrder.id,
  });

  return {
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId,
  };
}

/**
 * Serializes a membership document safely for API consumers.
 */
export function serializeMembership(doc: {
  _id: unknown;
  status: unknown;
  pricePaid: unknown;
  discountAmount: unknown;
  startsAt: unknown;
  expiresAt: unknown;
  createdAt: unknown;
  updatedAt: unknown;
}): SerializedUserMembership {
  return {
    id: String(doc._id),
    status: doc.status as MembershipStatus,
    pricePaid: Number(doc.pricePaid) || MEMBERSHIP_PRICE,
    discountAmount: Number(doc.discountAmount) || MEMBERSHIP_DISCOUNT_AMOUNT,
    startsAt:
      doc.startsAt instanceof Date
        ? doc.startsAt.toISOString()
        : String(doc.startsAt ?? ""),
    expiresAt:
      doc.expiresAt instanceof Date
        ? doc.expiresAt.toISOString()
        : String(doc.expiresAt ?? ""),
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt ?? ""),
  };
}

export type FinalizeMembershipPaymentSuccessInput = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  source: "BROWSER" | "WEBHOOK";
  userId?: string | null;
  paymentAmount?: number | null; // in paise
  paymentCurrency?: string | null;
  paymentStatus?: string | null;
};

export type FinalizeMembershipPaymentSuccessResult = {
  success: boolean;
  isAlreadyVerified: boolean;
  membership: SerializedUserMembership;
  message: string;
};

/**
 * Authoritative, server-side finalization of membership payment.
 * Used by BOTH browser verification callback and asynchronous Razorpay webhooks.
 *
 * Invariants (P0-C & P0-B):
 * 1. Matches stored Razorpay order ID in Membership collection.
 * 2. Enforces price of exactly ₹99 (9900 integer paise) and currency INR.
 * 3. Prevents cross-purchase reuse: payment ID cannot be consumed if used for product order or other membership.
 * 4. Idempotent: repeated verification or duplicate webhook does not extend membership expiry or duplicate records.
 * 5. Concurrency safe: handles unique index race conditions safely.
 */
export async function finalizeMembershipPaymentSuccess(
  input: FinalizeMembershipPaymentSuccessInput
): Promise<FinalizeMembershipPaymentSuccessResult> {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    userId,
    paymentAmount,
    paymentCurrency,
    paymentStatus,
  } = input;

  const cleanOrderId = razorpayOrderId?.trim();
  const cleanPaymentId = razorpayPaymentId?.trim();

  if (!cleanOrderId || !cleanPaymentId) {
    throw new ApiError(400, "Missing Razorpay order ID or payment ID for membership.");
  }

  // 1. Locate Membership document by razorpayOrderId
  const membershipDoc = await Membership.findOne({ razorpayOrderId: cleanOrderId });
  if (!membershipDoc) {
    throw new ApiError(404, "No matching membership order found for this Razorpay order.");
  }

  // 2. If userId is provided, verify user ownership
  if (userId && membershipDoc.userId !== userId) {
    throw new ApiError(403, "Membership order does not belong to the authenticated user.");
  }

  // 3. Amount and currency validation (P0-C)
  // Expected amount: strictly ₹99 (9900 paise) in INR
  const expectedPaise = MEMBERSHIP_PRICE * 100;
  if (paymentAmount !== null && paymentAmount !== undefined && paymentAmount !== expectedPaise) {
    throw new ApiError(
      400,
      `Membership payment amount mismatch: Expected ${expectedPaise} paise, received ${paymentAmount} paise.`
    );
  }

  if (paymentCurrency && paymentCurrency !== "INR") {
    throw new ApiError(
      400,
      `Membership payment currency mismatch: Expected INR, received ${paymentCurrency}.`
    );
  }

  if (paymentStatus && paymentStatus !== "captured" && paymentStatus !== "authorized") {
    throw new ApiError(
      400,
      `Membership payment status invalid: Expected captured, received ${paymentStatus}.`
    );
  }

  // 4. Cross-purchase & Replay consumption check (P0-B & P0-C):
  // A payment ID used for a physical product order must NEVER activate membership
  const consumedInOrder = await PaymentTransaction.findOne({
    razorpayPaymentId: cleanPaymentId,
    status: "SUCCESS",
  });
  if (consumedInOrder) {
    throw new ApiError(
      409,
      "Security violation: This Razorpay payment ID was already utilized for a product order."
    );
  }

  // A payment ID used for another user's membership must NEVER activate this membership
  const consumedInOtherMembership = await Membership.findOne({
    razorpayPaymentId: cleanPaymentId,
    status: "ACTIVE",
    _id: { $ne: membershipDoc._id },
  });
  if (consumedInOtherMembership) {
    throw new ApiError(
      409,
      "Security violation: This Razorpay payment ID was already utilized for another membership."
    );
  }

  // 5. Idempotency guard:
  // If already active with this payment ID, return without extending expiry
  if (membershipDoc.status === "ACTIVE") {
    if (membershipDoc.razorpayPaymentId && membershipDoc.razorpayPaymentId !== cleanPaymentId) {
      throw new ApiError(
        409,
        "Membership was already activated with a different payment ID."
      );
    }
    return {
      success: true,
      isAlreadyVerified: true,
      membership: serializeMembership(membershipDoc),
      message: "Membership already active.",
    };
  }

  // 6. Activate membership atomically & handle concurrent replay safely
  const now = new Date();
  membershipDoc.status = "ACTIVE";
  membershipDoc.razorpayPaymentId = cleanPaymentId;
  membershipDoc.startsAt = now;
  membershipDoc.expiresAt = computeMembershipExpiry(now);
  membershipDoc.pricePaid = MEMBERSHIP_PRICE;
  membershipDoc.discountAmount = MEMBERSHIP_DISCOUNT_AMOUNT;

  try {
    await membershipDoc.save();
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      // Duplicate key collision on razorpayPaymentId (concurrent execution)
      const existing = await Membership.findOne({ razorpayPaymentId: cleanPaymentId });
      if (existing && existing._id.toString() === membershipDoc._id.toString()) {
        return {
          success: true,
          isAlreadyVerified: true,
          membership: serializeMembership(existing),
          message: "Membership already active.",
        };
      }
      throw new ApiError(409, "Concurrent conflict: Payment ID already consumed.");
    }
    throw err;
  }

  // 7. Expire previous active memberships and cleanup old pendings for this user
  await Membership.updateMany(
    { userId: membershipDoc.userId, _id: { $ne: membershipDoc._id }, status: "ACTIVE" },
    { $set: { status: "EXPIRED" } }
  );
  await Membership.deleteMany(
    { userId: membershipDoc.userId, _id: { $ne: membershipDoc._id }, status: "PENDING" }
  );

  return {
    success: true,
    isAlreadyVerified: false,
    membership: serializeMembership(membershipDoc),
    message: "Membership activated successfully!",
  };
}

/**
 * Verifies Razorpay payment signature and activates membership (Browser flow).
 */
export async function verifyAndActivateMembership(
  userId: string,
  paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
): Promise<SerializedUserMembership> {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new ApiError(500, "Razorpay credentials are not configured on the server.");
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    keySecret
  );

  if (!isValid) {
    throw new ApiError(400, "Invalid payment signature. Verification failed.");
  }

  const result = await finalizeMembershipPaymentSuccess({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    source: "BROWSER",
    userId,
  });

  return result.membership;
}

/**
 * Creates and stores an active membership record with 1-year validity.
 */
export async function createMembership(params: {
  userId: string;
  pricePaid?: number;
  startsAt?: Date;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
}): Promise<IMembership> {
  const startsAt = params.startsAt ?? new Date();
  const expiresAt = computeMembershipExpiry(startsAt);

  const membership = await Membership.create({
    userId: params.userId,
    status: "ACTIVE",
    pricePaid: params.pricePaid ?? MEMBERSHIP_PRICE,
    discountAmount: MEMBERSHIP_DISCOUNT_AMOUNT,
    startsAt,
    expiresAt,
    razorpayOrderId: params.razorpayOrderId ?? null,
    razorpayPaymentId: params.razorpayPaymentId ?? null,
  });

  return membership;
}
