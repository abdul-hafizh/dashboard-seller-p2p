import {
  ArrowRight,
  Armchair,
  Box,
  Brush,
  Cake,
  Camera,
  FileUp,
  Gem,
  Heart,
  Lightbulb,
  Palette,
  PawPrint,
  Printer,
  Puzzle,
  Rocket,
  Shapes,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
  ToyBrick,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toPublicAssetUrl } from "@/lib/resources/format";

// Preset icons for the app's home-screen cards — same keys as api-meshy
// utils/homeCards.js HOME_ICONS; the app shows the matching Material icon.
export const HOME_ICONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "storefront", label: "Toko", icon: Store },
  { value: "auto_awesome", label: "AI / Bintang Ajaib", icon: Sparkles },
  { value: "view_in_ar", label: "Model 3D", icon: Box },
  { value: "shopping_bag", label: "Tas Belanja", icon: ShoppingBag },
  { value: "print", label: "Printer", icon: Printer },
  { value: "category", label: "Kategori", icon: Shapes },
  { value: "brush", label: "Kuas", icon: Brush },
  { value: "palette", label: "Palet Warna", icon: Palette },
  { value: "lightbulb", label: "Ide / Lampu", icon: Lightbulb },
  { value: "rocket_launch", label: "Roket", icon: Rocket },
  { value: "star", label: "Bintang", icon: Star },
  { value: "favorite", label: "Hati", icon: Heart },
  { value: "toys", label: "Mainan", icon: ToyBrick },
  { value: "cake", label: "Kue / Hadiah", icon: Cake },
  { value: "chair", label: "Furnitur", icon: Armchair },
  { value: "extension", label: "Puzzle", icon: Puzzle },
  { value: "build", label: "Perkakas", icon: Wrench },
  { value: "diamond", label: "Berlian", icon: Gem },
  { value: "pets", label: "Hewan", icon: PawPrint },
  { value: "local_offer", label: "Label Harga", icon: Tag },
  { value: "photo_camera", label: "Kamera", icon: Camera },
  { value: "upload_file", label: "Unggah File", icon: FileUp },
];

export const HOME_ACTIONS = [
  { value: "MARKET", label: "Marketplace (Produk Jadi)" },
  { value: "PROMPT", label: "Halaman Prompt AI" },
  { value: "PRINT_FILE", label: "Kirim File Siap Print ke Toko" },
];

const HEX = /^#[0-9a-f]{6}$/i;

/** The card as the app shows it, from the form's current values. */
export function HomeCardPreview({ values }: { values: Record<string, unknown> }) {
  const start = HEX.test(String(values.HomeColorStart ?? "")) ? String(values.HomeColorStart) : "#9B2FCE";
  const end = HEX.test(String(values.HomeColorEnd ?? "")) ? String(values.HomeColorEnd) : start;
  const Icon = HOME_ICONS.find((i) => i.value === values.HomeIcon)?.icon ?? Shapes;
  const image = toPublicAssetUrl(values.HomeIconImage);
  const title = String(values.HomeTitle || values.Name || "Judul kartu");
  const description = String(values.HomeDescription || values.Description || "Deskripsi kartu di halaman utama aplikasi.");
  const shown = values.ShowOnHome !== false && values.ShowOnHome !== 0 && !!values.HomeAction;

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-semibold text-ink-soft">Pratinjau di aplikasi{shown ? "" : " (tidak tampil — pilih fungsi kartu & aktifkan \"Tampil di halaman utama\")"}</p>
      <div
        className={`relative flex items-center gap-3 overflow-hidden rounded-2xl p-4 text-white ${shown ? "" : "opacity-50"}`}
        style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}
      >
        <span className="absolute -right-5 -top-5 size-24 rounded-full bg-white/10" />
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded asset preview
            <img src={image} alt="" className="size-8 object-contain" />
          ) : (
            <Icon className="size-7" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold">{title}</span>
          <span className="block text-xs leading-snug text-white/90">{description}</span>
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white" style={{ color: end }}>
          <ArrowRight className="size-4" />
        </span>
      </div>
    </div>
  );
}
