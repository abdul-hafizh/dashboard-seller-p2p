import Link from "next/link";
import { legalLinks, siteConfig } from "@/lib/site-config";

export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-border bg-surface px-4 py-5 md:px-6 ${className}`}>
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-xs text-ink-soft md:flex-row">
        <p>
          &copy; {new Date().getFullYear()} {siteConfig.companyName}. Semua hak dilindungi.
        </p>
        <nav aria-label="Tautan footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="font-semibold hover:text-brand-purple hover:underline">
              {link.label}
            </Link>
          ))}
          <a href={`mailto:${siteConfig.contactEmail}`} className="font-semibold hover:text-brand-purple hover:underline">
            {siteConfig.contactEmail}
          </a>
        </nav>
      </div>
    </footer>
  );
}
