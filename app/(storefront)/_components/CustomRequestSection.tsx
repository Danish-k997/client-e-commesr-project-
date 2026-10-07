"use client";

import Link from "next/link";

export default function CustomRequestSection() {
  return (
    <section className="custom-request-section-home" aria-label="Fully custom product request">
      <div className="custom-request-section-shell">
        <p className="eyebrow">FULLY CUSTOM</p>
        <h2 className="custom-request-section-title">अपना सामान बनवाना है?</h2>
        <p className="custom-request-section-subtitle">
          आपके पास कोई फोटो, आइडिया या पुराना टूटा हुआ पार्ट है? उसकी जानकारी भेजें। हम आगे आपसे बात करके इसे बनाने का तरीका बताएँगे।
        </p>
        <Link className="site-primary-cta custom-request-section-cta" href="/custom-request">
          अपना आइडिया भेजें
        </Link>
      </div>
    </section>
  );
}