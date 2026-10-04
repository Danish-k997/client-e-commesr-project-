import "server-only";

import { headers } from "next/headers";

import { auth } from "./auth";
import { connectMongo } from "./auth-db";
import { getApplicationRole } from "./roles";

export class AuthorizationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required" : "Admin access required");
    this.name = "AuthorizationError";
  }
}

export async function requireAuth() {
  await connectMongo();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    throw new AuthorizationError(401);
  }

  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();

  if (getApplicationRole(session.user.role) !== "ADMIN") {
    throw new AuthorizationError(403);
  }

  return session;
}
