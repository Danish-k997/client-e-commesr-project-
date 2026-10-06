import { connectDB } from "../../lib/db";
import { Category, HeroSlide, Product } from "../../models";

async function getDashboardMetrics() {
  await connectDB();

  const [productCount, categoryCount, heroSlideCount] = await Promise.all([
    Product.countDocuments({ status: { $ne: "ARCHIVED" } }),
    Category.countDocuments({ status: "ACTIVE" }),
    HeroSlide.countDocuments(),
  ]);

  return [
    {
      label: "Products",
      value: productCount,
      detail: "Active catalog records, excluding archived items.",
    },
    {
      label: "Categories",
      value: categoryCount,
      detail: "Active storefront categories.",
    },
    {
      label: "Hero Slides",
      value: heroSlideCount,
      detail: "Homepage hero records.",
    },
  ];
}

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <section className="admin-dashboard-page">
      <div className="admin-dashboard-header">
        <span className="eyebrow">Admin overview</span>
        <h1>Dashboard</h1>
        <p>Welcome back. Review the current storefront management areas from one place.</p>
      </div>

      <div className="admin-metric-grid" aria-label="Dashboard overview">
        {metrics.map((metric) => (
          <article className="admin-metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
