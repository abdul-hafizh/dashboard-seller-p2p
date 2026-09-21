/**
 * Single source of truth for the app's public identity and contact details.
 * Used by the footer, the login/register pages, page metadata and the public
 * legal pages (privacy policy, terms, contact, account deletion) required for
 * the Play Store listing. To change the name or contact, edit ONLY this file.
 */
export const siteConfig = {
  appName: "Petope",
  companyName: "Petope",
  tagline: "Cetak 3D dari prompt AI atau file 3D milikmu, langsung ke merchant terdekat.",
  contactEmail: "petope@gmail.com",
  /** Shown as "Terakhir diperbarui" on the legal pages. Update when their content changes. */
  legalLastUpdated: "21 September 2026",
} as const;

/** Public pages linked from the footer. Reachable without logging in. */
export const legalLinks = [
  { href: "/privacy-policy", label: "Kebijakan Privasi" },
  { href: "/terms", label: "Syarat & Ketentuan" },
  { href: "/delete-account", label: "Hapus Akun" },
  { href: "/contact", label: "Kontak" },
] as const;
