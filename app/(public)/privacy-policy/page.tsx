import type { Metadata } from "next";
import { LegalSection, LegalTitle } from "@/components/layout/LegalSection";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Kebijakan Privasi - ${siteConfig.appName}`,
  description: `Kebijakan privasi aplikasi dan dashboard ${siteConfig.appName}.`,
};

export default function PrivacyPolicyPage() {
  const { appName, contactEmail } = siteConfig;
  return (
    <>
      <LegalTitle title="Kebijakan Privasi" updated={siteConfig.legalLastUpdated} />
      <p className="text-sm leading-relaxed text-ink/80">
        {appName} adalah layanan cetak 3D: pelanggan dapat membuat model 3D dari prompt AI atau
        mengunggah file 3D sendiri, mencari merchant terdekat, lalu berkomunikasi melalui chat.
        Kebijakan ini menjelaskan data apa yang kami kumpulkan, untuk apa, dan pilihan Anda, baik di
        aplikasi seluler maupun di dashboard merchant.
      </p>

      <LegalSection title="1. Data yang kami kumpulkan">
        <ul>
          <li>
            <strong>Data akun:</strong> nama, alamat email, dan kata sandi (disimpan dalam bentuk
            terenkripsi/hash). Jika Anda masuk dengan Google, kami menerima nama dan email dari akun
            Google tersebut.
          </li>
          <li>
            <strong>Lokasi:</strong> lokasi perangkat, hanya ketika Anda mengizinkan, untuk mencari
            merchant terdekat.
          </li>
          <li>
            <strong>Alamat:</strong> alamat pengiriman dan informasi kontak yang Anda simpan untuk
            pesanan.
          </li>
          <li>
            <strong>Konten buatan pengguna:</strong> prompt AI, foto atau gambar yang Anda pilih, file
            3D yang Anda unggah, dan model 3D hasil pembuatan.
          </li>
          <li>
            <strong>Pesanan dan pembayaran:</strong> riwayat pesanan, status, serta informasi
            pengiriman dan pembayaran yang terkait pesanan.
          </li>
          <li>
            <strong>Pesan chat:</strong> percakapan antara pelanggan dan merchant, termasuk lampiran.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Cara kami menggunakan data">
        <ul>
          <li>Membuat dan mengelola akun serta memverifikasi identitas saat masuk.</li>
          <li>Menampilkan merchant terdekat dan memfasilitasi chat serta pesanan.</li>
          <li>Membuat model 3D dari prompt atau gambar Anda.</li>
          <li>Memproses pesanan, pengiriman, dan pelacakan.</li>
          <li>Menjaga keamanan layanan dan mencegah penyalahgunaan.</li>
        </ul>
        <p>Kami tidak menjual data pribadi Anda.</p>
      </LegalSection>

      <LegalSection title="3. Berbagi data dengan pihak lain">
        <ul>
          <li>
            <strong>Merchant:</strong> merchant yang Anda hubungi menerima informasi yang diperlukan
            untuk memproses pesanan (mis. nama, kontak, alamat pengiriman, file 3D, isi chat).
          </li>
          <li>
            <strong>Penyedia layanan:</strong> kami memakai layanan pihak ketiga untuk masuk dengan
            Google, chat, pembuatan model 3D berbasis AI, pembayaran, dan pengiriman. Data dibagikan
            hanya sebatas yang diperlukan untuk layanan tersebut.
          </li>
          <li>
            <strong>Kewajiban hukum:</strong> bila diwajibkan oleh hukum atau permintaan resmi
            otoritas.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Penyimpanan dan keamanan">
        <p>
          Data disimpan di server kami dan penyedia layanan yang kami gunakan. Kami menerapkan
          langkah-langkah keamanan yang wajar, tetapi tidak ada sistem yang sepenuhnya bebas risiko.
          Data disimpan selama akun Anda aktif atau selama diperlukan untuk tujuan di atas dan
          kewajiban hukum.
        </p>
      </LegalSection>

      <LegalSection title="5. Hak dan pilihan Anda">
        <ul>
          <li>Mengakses dan memperbarui data profil serta alamat Anda di dalam aplikasi.</li>
          <li>Mencabut izin lokasi kapan saja melalui pengaturan perangkat.</li>
          <li>
            Meminta penghapusan akun dan data terkait melalui halaman{" "}
            <a href="/delete-account">Hapus Akun</a> atau email ke{" "}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Anak-anak">
        <p>
          Layanan ini tidak ditujukan bagi anak di bawah 13 tahun, dan kami tidak dengan sengaja
          mengumpulkan data dari mereka.
        </p>
      </LegalSection>

      <LegalSection title="7. Perubahan kebijakan">
        <p>
          Kami dapat memperbarui kebijakan ini. Tanggal &quot;Terakhir diperbarui&quot; di atas akan
          menyesuaikan, dan perubahan penting akan kami sampaikan melalui aplikasi atau email.
        </p>
      </LegalSection>

      <LegalSection title="8. Hubungi kami">
        <p>
          Pertanyaan tentang privasi dapat dikirim ke{" "}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </LegalSection>
    </>
  );
}
