import "server-only";

import crypto from "crypto";
import { Types } from "mongoose";

import {
  Membership,
  MEMBERSHIP_PRICE,
  MEMBERSHIP_DISCOUNT_AMOUNT,
  MEMBERSHIP_VALIDITY_DAYS,
} from "../models";
import type { IMembership, MembershipStatus } from "../models";

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
 * Verifies Razorpay payment signature and activates membership.
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
    throw new Error("Razorpay credentials are not configured on the server.");
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

  // 1. Verify Razorpay signature using HMAC SHA256
  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    keySecret
  );

  if (!isValid) {
    throw new Error("Invalid payment signature. Verification failed.");
  }

  // 2. Ensure order belongs to this user and membership transaction
  const membershipDoc = await Membership.findOne({
    razorpayOrderId: razorpay_order_id,
    userId,
  });

  if (!membershipDoc) {
    throw new Error("Membership order not found for this user account.");
  }

  // 3. Prevent duplicate activation if already verified
  if (membershipDoc.status === "ACTIVE") {
    return {
      id: membershipDoc._id.toString(),
      status: "ACTIVE",
      pricePaid: membershipDoc.pricePaid,
      discountAmount: membershipDoc.discountAmount,
      startsAt: membershipDoc.startsAt.toISOString(),
      expiresAt: membershipDoc.expiresAt.toISOString(),
      createdAt: membershipDoc.createdAt.toISOString(),
      updatedAt: membershipDoc.updatedAt.toISOString(),
    };
  }

  // 4. Activate the membership
  const now = new Date();
  membershipDoc.status = "ACTIVE";
  membershipDoc.razorpayPaymentId = razorpay_payment_id;
  membershipDoc.startsAt = now;
  membershipDoc.expiresAt = computeMembershipExpiry(now);
  membershipDoc.pricePaid = MEMBERSHIP_PRICE;
  membershipDoc.discountAmount = MEMBERSHIP_DISCOUNT_AMOUNT;
  await membershipDoc.save();

  // 5. Ensure single active membership per user (expire prior active, delete old pending)
  await Membership.updateMany(
    { userId, _id: { $ne: membershipDoc._id }, status: "ACTIVE" },
    { $set: { status: "EXPIRED" } }
  );
  await Membership.deleteMany(
    { userId, _id: { $ne: membershipDoc._id }, status: "PENDING" }
  );

  return {
    id: membershipDoc._id.toString(),
    status: "ACTIVE",
    pricePaid: membershipDoc.pricePaid,
    discountAmount: membershipDoc.discountAmount,
    startsAt: membershipDoc.startsAt.toISOString(),
    expiresAt: membershipDoc.expiresAt.toISOString(),
    createdAt: membershipDoc.createdAt.toISOString(),
    updatedAt: membershipDoc.updatedAt.toISOString(),
  };
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
