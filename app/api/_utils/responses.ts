import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { AuthorizationError } from "../../lib/authorization";

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok(payload: Record<string, unknown> = {}, init?: ResponseInit) {
  return NextResponse.json({ status: "ok", ...payload }, init);
}

export function fail(message: string, statusCode: number) {
  return NextResponse.json({ status: "error", message }, { status: statusCode });
}

export async function parseJsonBody(request: Request) {
  try {
    const body = await request.json();

    if (!isRecord(body) || Array.isArray(body)) {
      throw new ApiError(400, "Request body must be a JSON object.");
    }

    return body;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(400, "Malformed JSON request body.");
  }
}

export function pickAllowedFields(
  body: Record<string, unknown>,
  allowedFields: readonly string[],
  options: { requireAtLeastOne?: boolean } = {}
) {
  const allowed = new Set(allowedFields);
  const unsupportedFields = Object.keys(body).filter((field) => !allowed.has(field));

  if (unsupportedFields.length > 0) {
    throw new ApiError(400, `Unsupported field(s): ${unsupportedFields.join(", ")}.`);
  }

  const payload: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field];
    }
  }

  if (options.requireAtLeastOne && Object.keys(payload).length === 0) {
    throw new ApiError(400, "At least one supported field is required.");
  }

  return payload;
}

export function requireObjectId(value: string, label: string) {
  if (!/^[a-f\d]{24}$/i.test(value) || !mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, `${label} must be a valid ObjectId.`);
  }

  return value;
}

export function serializeDocument<T>(document: T) {
  return JSON.parse(JSON.stringify(document)) as T;
}

export function handleApiError(error: unknown, logMessage: string) {
  if (error instanceof AuthorizationError) {
    return fail(error.message, error.status);
  }

  if (error instanceof ApiError) {
    return fail(error.message, error.statusCode);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return fail(error.message, 400);
  }

  if (isMongoDuplicateKeyError(error)) {
    return fail("A record with that slug already exists.", 409);
  }

  console.error(logMessage, error);
  return fail("Internal server error", 500);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMongoDuplicateKeyError(error: unknown) {
  return (
    isRecord(error) &&
    error.code === 11000
  );
}
