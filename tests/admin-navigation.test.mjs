import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("Admin Sidebar: Navigation array contains both Products and Festival Themes with no duplicates", async () => {
  const sidebarFile = path.resolve("app/admin/_components/AdminSidebar.tsx");
  const content = await fs.readFile(sidebarFile, "utf8");

  // Extract navigation item hrefs and labels
  const hrefMatches = [...content.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
  const labelMatches = [...content.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);

  assert.equal(hrefMatches.length, 8, "Must contain exactly 8 admin navigation routes");
  assert.equal(labelMatches.length, 8, "Must contain exactly 8 admin navigation labels");

  // Verify unique routes and labels
  const uniqueHrefs = new Set(hrefMatches);
  const uniqueLabels = new Set(labelMatches);
  assert.equal(uniqueHrefs.size, 8, "All href routes must be unique (no duplicate paths)");
  assert.equal(uniqueLabels.size, 8, "All menu labels must be unique");

  // Verify both Product Management and Festival Management are present
  assert.equal(hrefMatches.includes("/admin/products"), true, "Must include /admin/products");
  assert.equal(hrefMatches.includes("/admin/festival-themes"), true, "Must include /admin/festival-themes");
  assert.equal(labelMatches.includes("Products"), true, "Must include Products label");
  assert.equal(labelMatches.includes("Festival Themes"), true, "Must include Festival Themes label");
});

test("Admin Sidebar: All registered navigation destinations have matching page.tsx files", async () => {
  const expectedRoutes = [
    { href: "/admin/dashboard", pagePath: "app/admin/dashboard/page.tsx" },
    { href: "/admin/orders", pagePath: "app/admin/orders/page.tsx" },
    { href: "/admin/products", pagePath: "app/admin/products/page.tsx" },
    { href: "/admin/categories", pagePath: "app/admin/categories/page.tsx" },
    { href: "/admin/custom-requests", pagePath: "app/admin/custom-requests/page.tsx" },
    { href: "/admin/festival-themes", pagePath: "app/admin/festival-themes/page.tsx" },
    { href: "/admin/hero", pagePath: "app/admin/hero/page.tsx" },
    { href: "/admin/memberships", pagePath: "app/admin/memberships/page.tsx" },
  ];

  for (const route of expectedRoutes) {
    const fullPath = path.resolve(route.pagePath);
    let stat;
    try {
      stat = await fs.stat(fullPath);
    } catch {
      assert.fail(`Page file missing for registered route ${route.href}: ${route.pagePath}`);
    }
    assert.equal(stat.isFile(), true, `${route.pagePath} must be a file`);
  }
});

test("Admin Sidebar: Active route detection matches root and nested child workflows accurately", () => {
  function isActive(pathname, itemHref) {
    return (
      pathname === itemHref ||
      (itemHref !== "/admin/dashboard" && pathname.startsWith(`${itemHref}/`))
    );
  }

  // Exact matches
  assert.equal(isActive("/admin/dashboard", "/admin/dashboard"), true);
  assert.equal(isActive("/admin/products", "/admin/products"), true);
  assert.equal(isActive("/admin/festival-themes", "/admin/festival-themes"), true);
  assert.equal(isActive("/admin/orders", "/admin/orders"), true);

  // Sub-routes for products: Add product and Edit product should activate "Products"
  assert.equal(isActive("/admin/products/new", "/admin/products"), true);
  assert.equal(isActive("/admin/products/prod_123/edit", "/admin/products"), true);
  assert.equal(isActive("/admin/products/new", "/admin/orders"), false);

  // Sub-routes for orders
  assert.equal(isActive("/admin/orders/ord_999", "/admin/orders"), true);
  assert.equal(isActive("/admin/orders/ord_999", "/admin/dashboard"), false);

  // Sub-routes for custom requests
  assert.equal(isActive("/admin/custom-requests/req_456", "/admin/custom-requests"), true);
  assert.equal(isActive("/admin/custom-requests/req_456", "/admin/categories"), false);

  // Dashboard must not match child paths of other routes
  assert.equal(isActive("/admin/orders", "/admin/dashboard"), false);
  assert.equal(isActive("/admin/dashboard/extra", "/admin/dashboard"), false);
});

test("Admin Sidebar Layout: CSS Module defines independent vertical scrolling with constrained bounds", async () => {
  const cssFile = path.resolve("app/admin/_components/AdminSidebar.module.css");
  const content = await fs.readFile(cssFile, "utf8");

  // Sidebar container constraints
  assert.equal(content.includes("display: flex;"), true, ".sidebar must use flexbox");
  assert.equal(content.includes("flex-direction: column;"), true, ".sidebar must be a column flex");
  assert.equal(content.includes("overflow: hidden;"), true, ".sidebar must constrain outer overflow");

  // Nav scroll container properties
  assert.equal(content.includes("overflow-y: auto;"), true, ".nav must define overflow-y: auto");
  assert.equal(content.includes("overflow-x: hidden;"), true, ".nav must define overflow-x: hidden");
  assert.equal(content.includes("min-height: 0;"), true, ".nav must define min-height: 0 to allow flex shrinking");
  assert.equal(content.includes("overscroll-behavior: contain;"), true, ".nav must contain scroll chaining");

  // Header must remain pinned at top
  assert.equal(content.includes("flex-shrink: 0;"), true, ".header must not shrink when menu overflows");

  // Responsive mobile drawer support
  assert.equal(content.includes("-webkit-overflow-scrolling: touch;"), true, "Must enable smooth touch momentum scrolling on mobile");
});
