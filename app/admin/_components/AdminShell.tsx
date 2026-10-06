"use client";

import { useEffect, useState, type ReactNode } from "react";

import AdminFooter from "./AdminFooter";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

type AdminShellProps = {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
};

export default function AdminShell({ children, userName, userEmail }: AdminShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSidebarOpen]);

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="admin-shell">
      <AdminTopbar
        userName={userName}
        userEmail={userEmail}
        onMenuClick={() => setIsSidebarOpen(true)}
      />
      <div className="admin-shell-body">
        <AdminSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="admin-shell-content">
          <main className="admin-main" id="admin-main-content">
            {children}
          </main>
          <AdminFooter />
        </div>
      </div>
    </div>
  );
}
