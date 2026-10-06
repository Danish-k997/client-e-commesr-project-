import Link from "next/link";

export default function AdminFooter() {
  return (
    <footer className="admin-footer">
      <p>© {new Date().getFullYear()} KASAR DIMENSIONS</p>
      <Link href="/">View Website</Link>
    </footer>
  );
}
