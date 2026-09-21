import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { LegalSection, LegalTitle } from "@/components/layout/LegalSection";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Kontak - ${siteConfig.appName}`,
  description: `Hubungi tim ${siteConfig.appName}.`,
};

export default function ContactPage() {
  const { appName, companyName, contactEmail, tagline } = siteConfig;
  return (
    <>
      <LegalTitle title="Hubungi Kami" />
      <p className="text-sm leading-relaxed text-ink/80">{tagline}</p>

      <LegalSection title="Kontak">
        <p className="flex items-center gap-2.5">
          <Mail className="size-4 text-brand-purple" />
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </p>
        <p>
          {companyName}: dukungan pelanggan dan merchant {appName}. Kami berusaha membalas dalam
          beberapa hari kerja.
        </p>
      </LegalSection>
    </>
  );
}
