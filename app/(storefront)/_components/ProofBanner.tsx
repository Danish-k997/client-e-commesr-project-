const proofItems = [
  {
    value: "16+",
    label: "ENTERPRISE",
    description: "B2B Prototyping Companies",
  },
  {
    value: "79+",
    label: "FRANCHISE",
    description: "Batch Manufacturing Clients",
  },
  {
    value: "500+",
    label: "CONSUMER",
    description: "Custom Art & Decor Buyers",
  },
  {
    value: "99.4%",
    label: "TOLERANCE",
    description: "Micron Precision Pass Rate",
  },
];

export default function ProofBanner() {
  return (
    <section className="proof-banner" aria-label="KASAR DIMENSIONS proof points">
      <div className="proof-banner-grid">
        {proofItems.map((item) => (
          <article className="proof-banner-item" key={item.label}>
            <div className="proof-banner-value-row">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
