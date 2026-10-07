import Link from "next/link";

import { CONTACT_PHONE_URL, WHATSAPP_URL } from "../../lib/contact";

function FutureFooterItem({ children }: { children: string }) {
  return (
    <span className="site-footer-future" aria-disabled="true">
      {children}
    </span>
  );
}

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          <section className="site-footer-brand" aria-labelledby="footer-brand-title">
            <Link className="site-footer-wordmark" href="/" id="footer-brand-title">
              KASAR DIMENSIONS
            </Link>
            <p>Custom 3D printed products made around your idea.</p>
            <div className="site-social-labels" aria-label="Social channels">
              <FutureFooterItem>Instagram</FutureFooterItem>
              <FutureFooterItem>Facebook</FutureFooterItem>
            </div>
          </section>

          <nav className="site-footer-column" aria-label="Shop links">
            <h2>Shop</h2>
            <ul>
              <li><FutureFooterItem>Bestsellers</FutureFooterItem></li>
              <li><FutureFooterItem>All products</FutureFooterItem></li>
              <li><FutureFooterItem>Categories</FutureFooterItem></li>
            </ul>
          </nav>

          <nav className="site-footer-column" aria-label="Custom product links">
            <h2>Custom</h2>
            <ul>
              <li><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">Custom order</a></li>
              <li><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">Personalised products</a></li>
            </ul>
          </nav>

          <nav className="site-footer-column" aria-label="Help links">
            <h2>Help</h2>
            <ul>
              <li><a href={CONTACT_PHONE_URL}>Contact</a></li>
              <li><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp</a></li>
              <li><FutureFooterItem>Shipping</FutureFooterItem></li>
              <li><FutureFooterItem>Returns</FutureFooterItem></li>
            </ul>
          </nav>
        </div>

        <div className="site-footer-bottom">
          <p>© {new Date().getFullYear()} KASAR DIMENSIONS. All rights reserved.</p>
          <nav aria-label="Legal information">
            <FutureFooterItem>Privacy policy</FutureFooterItem>
            <FutureFooterItem>Terms of service</FutureFooterItem>
            <FutureFooterItem>Refund &amp; shipping policy</FutureFooterItem>
          </nav>
        </div>
      </div>
    </footer>
  );
}
