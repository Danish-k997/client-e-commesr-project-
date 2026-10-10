export const dynamic = "force-dynamic";

import crypto from "crypto";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "../../../lib/db";
import { WebhookEvent } from "../../../models";
import {
  finalizeOrderPaymentSuccess,
  recordOrderPaymentFailure,
} from "../../../lib/orderCreation";

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  status?: string;
  error_code?: string;
  error_description?: string;
  error_source?: string;
  error_step?: string;
  error_reason?: string;
  notes?: {
    orderId?: string;
    orderNumber?: string;
    userId?: string;
  };
}

interface RazorpayOrderEntity {
  id?: string;
  amount?: number;
  status?: string;
  notes?: {
    orderId?: string;
    orderNumber?: string;
    userId?: string;
  };
}

interface RazorpayWebhookPayload {
  event?: string;
  id?: string;
  created_at?: number;
  payload?: {
    payment?: {
      entity?: RazorpayPaymentEntity;
    };
    order?: {
      entity?: RazorpayOrderEntity;
    };
  };
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured on the server.");
      return NextResponse.json(
        { error: "Webhook secret is not configured" },
        { status: 500 }
      );
    }

    // 1. Read raw body text for exact HMAC signature verification
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json(
        { error: "Empty webhook payload" },
        { status: 400 }
      );
    }

    // 2. Cryptographic signature verification using constant-time comparison
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const isSignatureValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf-8"),
        Buffer.from(signature, "utf-8")
      );

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    // 3. Connect to database
    await connectDB();

    // 4. Parse payload JSON
    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      return NextResponse.json(
        { error: "Malformed JSON payload" },
        { status: 400 }
      );
    }

    const eventName = payload?.event;
    if (!eventName || typeof eventName !== "string") {
      return NextResponse.json(
        { error: "Missing event in payload" },
        { status: 400 }
      );
    }

    // 5. Generate or resolve unique event identifier for idempotency tracking
    const paymentEntity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;

    const rzpOrderId = paymentEntity?.order_id || orderEntity?.id || null;
    const rzpPaymentId = paymentEntity?.id || null;
    const internalOrderId =
      paymentEntity?.notes?.orderId || orderEntity?.notes?.orderId || null;

    const headerEventId = request.headers.get("x-razorpay-event-id");
    const eventId =
      headerEventId ||
      payload?.id ||
      `${eventName}_${rzpOrderId || "noorder"}_${rzpPaymentId || "nopayment"}_${payload.created_at || Date.now()}`;

    // 6. Check Idempotency via WebhookEvent record
    const existingEvent = await WebhookEvent.findOne({ eventId });
    if (existingEvent && existingEvent.status === "PROCESSED") {
      return NextResponse.json(
        { received: true, duplicate: true, message: "Event already processed." },
        { status: 200 }
      );
    }

    // Record event as PROCESSING if not already existing
    let webhookEventDoc = existingEvent;
    if (!webhookEventDoc) {
      try {
        webhookEventDoc = await WebhookEvent.create({
          eventId,
          provider: "RAZORPAY",
          event: eventName,
          razorpayOrderId: rzpOrderId,
          razorpayPaymentId: rzpPaymentId,
          status: "PROCESSING",
        });
      } catch (createErr: unknown) {
        // If concurrent insert occurred with duplicate key
        if (
          typeof createErr === "object" &&
          createErr !== null &&
          "code" in createErr &&
          (createErr as { code?: number }).code === 11000
        ) {
          return NextResponse.json(
            { received: true, duplicate: true, message: "Concurrent duplicate event received." },
            { status: 200 }
          );
        }
        throw createErr;
      }
    }

    // 7. Route and handle specific required events
    if (eventName === "payment.captured" || eventName === "order.paid") {
      if (!rzpOrderId) {
        webhookEventDoc.status = "FAILED";
        webhookEventDoc.error = "Missing razorpay order identifier in captured payment event.";
        await webhookEventDoc.save();
        return NextResponse.json(
          { error: "Missing order reference in event payload" },
          { status: 400 }
        );
      }

      const result = await finalizeOrderPaymentSuccess({
        orderId: internalOrderId,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId || "",
        signatureVerified: true,
        source: "WEBHOOK",
      });

      webhookEventDoc.status = "PROCESSED";
      if (result.order?._id && mongoose.isValidObjectId(result.order._id)) {
        webhookEventDoc.orderId = new mongoose.Types.ObjectId(result.order._id);
      }
      await webhookEventDoc.save();

      return NextResponse.json(
        {
          received: true,
          event: eventName,
          orderNumber: result.order.orderNumber,
          isAlreadyVerified: result.isAlreadyVerified,
        },
        { status: 200 }
      );
    } else if (eventName === "payment.failed") {
      await recordOrderPaymentFailure({
        orderId: internalOrderId,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPaymentId,
        error: paymentEntity?.error_code
          ? {
              code: paymentEntity.error_code,
              description: paymentEntity.error_description,
              source: paymentEntity.error_source,
              step: paymentEntity.error_step,
              reason: paymentEntity.error_reason,
            }
          : null,
      });

      webhookEventDoc.status = "PROCESSED";
      await webhookEventDoc.save();

      return NextResponse.json(
        { received: true, event: eventName, recorded: true },
        { status: 200 }
      );
    } else {
      // Safe ignore for other events
      webhookEventDoc.status = "IGNORED";
      await webhookEventDoc.save();

      return NextResponse.json(
        { received: true, event: eventName, ignored: true },
        { status: 200 }
      );
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Internal server error processing webhook";
    console.error("Razorpay webhook error:", errorMsg);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
