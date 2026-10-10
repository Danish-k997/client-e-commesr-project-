"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import AdminFooter from "./AdminFooter";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import styles from "./AdminShell.module.css";

type AdminShellProps = {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
};

export default function AdminShell({ children, userName, userEmail }: AdminShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isSidebarOpen) {
      return;
    }

    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
        return;
      }

      if (event.key === "Tab") {
        const sidebar = document.getElementById("admin-sidebar");
        const focusableElements = sidebar?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!sidebar || !focusableElements?.length) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (event.shiftKey && (activeElement === firstElement || !sidebar.contains(activeElement))) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && (activeElement === lastElement || !sidebar.contains(activeElement))) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [isSidebarOpen]);

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className={`${styles.shell} admin-shell`}>
      <AdminTopbar
        userName={userName}
        userEmail={userEmail}
        onMenuClick={() => setIsSidebarOpen(true)}
        menuButtonRef={menuButtonRef}
        isSidebarOpen={isSidebarOpen}
      />
      <div className={`${styles.body} admin-shell-body`}>
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          closeButtonRef={closeButtonRef}
        />
        <div className={`${styles.content} admin-shell-content`}>
          <main className={`${styles.main} admin-main`} id="admin-main-content">
            {children}
          </main>
          <AdminFooter />
        </div>
      </div>
    </div>
  );
}
