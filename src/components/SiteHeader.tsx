import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { NavLinks } from "./NavLinks";

/** شريط علوي لاصق — سطح صلب وخط شعري واحد أسفله */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-bar">
        <Link href="/" className="site-brand min-w-0">
          <BrandMark size={24} className="site-brand-mark" />
          <span className="min-w-0">
            <span className="site-brand-name block">توقّع</span>
            <span className="site-brand-tagline hidden sm:block">
              مكتب التحليل
            </span>
          </span>
        </Link>

        <NavLinks />
      </div>
    </header>
  );
}
