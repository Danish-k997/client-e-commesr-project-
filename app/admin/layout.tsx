import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AuthorizationError, requireAdmin } from "../lib/authorization";
import AdminShell from "./_components/AdminShell";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  let session: Awaited<ReturnType<typeof requireAdmin>>;

  try {
    session = await requireAdmin();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect(error.status === 401 ? "/login" : "/");
    }

    throw error;
  }

  return (
    <AdminShell userName={session.user.name} userEmail={session.user.email}>
      {children}
    </AdminShell>
  );
}
