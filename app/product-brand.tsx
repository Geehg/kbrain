export const PRODUCT_URL = 'https://www.luminkey.com/products/luminkey-nova-kine-keyboard?srsltid=AfmBOopQqhlZi-d2MUa2W2vrbSmgG9Iq-Bt1Buox4J7C46WI2W-sv68y';

export function ProductBrand() {
  return <div className="product-brand"><span className="manufacturer-logo">
    {/* User-supplied logo, preserved without redrawing. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/luminkey-logo.png" alt="LUMINKEY" width="269" height="42" />
  </span><strong>NOVA KINE <span>Tri-Mode Keyboard</span></strong></div>;
}

export function ProductLink() {
  return <a className="product-link" href={PRODUCT_URL} target="_blank" rel="noopener noreferrer" aria-label="제품 바로가기 (새 창)">제품 바로가기 <span aria-hidden="true">↗</span></a>;
}
