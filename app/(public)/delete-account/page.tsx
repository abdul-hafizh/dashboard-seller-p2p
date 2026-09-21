import type { Metadata } from "next";
import { LegalSection, LegalTitle } from "@/components/layout/LegalSection";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Hapus Akun - ${siteConfig.appName}`,
  description: `Cara meminta penghapusan akun dan data ${siteConfig.appName}.`,
};

export default function DeleteAccountPage() {
  const { appName, contactEmail } = siteConfig;
  const subject = encodeURIComponent(`Permintaan Hapus Akun ${appName}`);
  return (
    <>
      <LegalTitle title="Hapus Akun & Data" updated={siteConfig.legalLastUpdated} />
      <p className="text-sm leading-relaxed text-ink/80">
        Anda dapat meminta penghapusan akun {appName} beserta data terkait kapan saja.
      </p>

      <LegalSection title="Cara meminta penghapusan">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>
            Kirim email ke <a href={`mailto:${contactEmail}?subject=${subject}`}>{contactEmail}</a>{" "}
            dari alamat email yang terdaftar di akun Anda.
          </li>
          <li>Gunakan subjek &quot;Permintaan Hapus Akun {appName}&quot;.</li>
          <li>Kami memverifikasi permintaan dan memprosesnya, lalu mengonfirmasi lewat email.</li>
        </ol>
      </LegalSection>

      <LegalSection title="Data yang dihapus">
        <ul>
          <li>Profil akun (nama, email) dan alamat tersimpan.</li>
          <li>Prompt, gambar, dan model 3D yang Anda buat atau unggah.</li>
          <li>Riwayat chat yang terkait akun Anda.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Data yang mungkin disimpan">
        <p>
          Catatan pesanan dan transaksi dapat kami simpan sebatas yang diwajibkan oleh hukum atau
          untuk keperluan pembukuan dan penyelesaian sengketa, dan tidak dipakai untuk tujuan lain.
        </p>
      </LegalSection>
    </>
  );
}
