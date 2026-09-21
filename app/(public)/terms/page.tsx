import type { Metadata } from "next";
import { LegalSection, LegalTitle } from "@/components/layout/LegalSection";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Syarat & Ketentuan - ${siteConfig.appName}`,
  description: `Syarat dan ketentuan penggunaan ${siteConfig.appName}.`,
};

export default function TermsPage() {
  const { appName, contactEmail } = siteConfig;
  return (
    <>
      <LegalTitle title="Syarat & Ketentuan" updated={siteConfig.legalLastUpdated} />
      <p className="text-sm leading-relaxed text-ink/80">
        Dengan menggunakan {appName}, Anda menyetujui syarat dan ketentuan berikut. Jika tidak
        setuju, mohon jangan menggunakan layanan ini.
      </p>

      <LegalSection title="1. Tentang layanan">
        <p>
          {appName} mempertemukan pelanggan dengan merchant cetak 3D. Pelanggan dapat membuat model
          3D dari prompt AI atau mengunggah file 3D sendiri, menemukan merchant terdekat, dan
          berkomunikasi melalui chat. Pesanan dibuat dan diproses secara manual oleh merchant.
          Pencetakan, harga akhir, dan pengiriman dilakukan oleh merchant, bukan oleh {appName}.
        </p>
      </LegalSection>

      <LegalSection title="2. Akun">
        <ul>
          <li>Anda bertanggung jawab atas kerahasiaan akun dan seluruh aktivitas di dalamnya.</li>
          <li>Informasi yang Anda berikan harus benar dan terbaru.</li>
          <li>Dashboard ini khusus untuk merchant dan admin yang telah terdaftar.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Konten dan hasil AI">
        <ul>
          <li>Anda bertanggung jawab atas prompt, gambar, dan file 3D yang Anda kirim.</li>
          <li>
            Dilarang mengunggah konten yang melanggar hukum, hak kekayaan intelektual pihak lain,
            atau berupa benda berbahaya seperti senjata.
          </li>
          <li>
            Hasil model 3D dari AI dapat tidak sempurna dan tidak menjamin kelayakan untuk dicetak.
            Mohon periksa sebelum memesan.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Pesanan dan pembayaran">
        <p>
          Ketentuan harga, waktu pengerjaan, pembayaran, dan pengiriman disepakati antara pelanggan
          dan merchant. Sengketa terkait pesanan diselesaikan terlebih dahulu antara kedua pihak;
          kami dapat membantu memfasilitasi bila diperlukan.
        </p>
      </LegalSection>

      <LegalSection title="5. Larangan">
        <ul>
          <li>Menyalahgunakan layanan, mengganggu sistem, atau mencoba mengakses data pihak lain.</li>
          <li>Menggunakan layanan untuk penipuan atau aktivitas melanggar hukum.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Batasan tanggung jawab">
        <p>
          Layanan disediakan &quot;sebagaimana adanya&quot;. Sejauh diizinkan hukum, {appName} tidak
          bertanggung jawab atas kerugian tidak langsung, atau atas kualitas cetak, keterlambatan,
          dan pengiriman yang dilakukan merchant.
        </p>
      </LegalSection>

      <LegalSection title="7. Penghentian dan perubahan">
        <p>
          Kami dapat menangguhkan akun yang melanggar ketentuan ini. Anda dapat menghapus akun kapan
          saja melalui halaman <a href="/delete-account">Hapus Akun</a>. Ketentuan ini dapat
          diperbarui dari waktu ke waktu; penggunaan berkelanjutan berarti Anda menyetujui
          perubahannya.
        </p>
      </LegalSection>

      <LegalSection title="8. Kontak">
        <p>
          Pertanyaan dapat dikirim ke <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </LegalSection>
    </>
  );
}
