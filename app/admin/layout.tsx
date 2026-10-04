import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthorizationError, requireAdmin } from "../lib/authorization";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect(error.status === 401 ? "/login" : "/");
    }

    throw error;
  }

  return children;
}
