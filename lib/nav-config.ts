import {
  LayoutDashboard,
  Layers,
  Tags,
  Cpu,
  SlidersHorizontal,
  Printer,
  Building2,
  Building,
  Globe,
  Map,
  MapPin,
  CreditCard,
  Truck,
  ListChecks,
  Package,
  ShoppingCart,
  Users,
  MessageCircle,
  Home,
  type LucideIcon,
} from "lucide-react";
import { ROLE } from "./constants";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Omit to allow both Super Admin and Merchant. */
  roles?: number[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Utama",
    items: [{ href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard }],
  },
  {
    title: "Bisnis",
    items: [
      { href: "/dashboard/products", label: "Produk", icon: Package },
      { href: "/dashboard/orders", label: "Pesanan", icon: ShoppingCart },
      { href: "/dashboard/chat", label: "Pesan", icon: MessageCircle, roles: [ROLE.MERCHANT] },
      { href: "/dashboard/addresses", label: "Alamat", icon: Home },
    ],
  },
  {
    title: "Data Master",
    items: [
      { href: "/dashboard/materials", label: "Material", icon: Layers },
      { href: "/dashboard/product-categories", label: "Kategori Produk", icon: Tags },
      { href: "/dashboard/printer-types", label: "Tipe Printer", icon: Cpu },
      { href: "/dashboard/print-profiles", label: "Profil Cetak", icon: SlidersHorizontal },
      { href: "/dashboard/printers", label: "Printer", icon: Printer },
      { href: "/dashboard/payment-methods", label: "Metode Pembayaran", icon: CreditCard },
      { href: "/dashboard/shipping-methods", label: "Metode Pengiriman", icon: Truck },
      { href: "/dashboard/order-statuses", label: "Status Pesanan", icon: ListChecks },
    ],
  },
  {
    title: "Organisasi & Wilayah",
    items: [
      { href: "/dashboard/companies", label: "Perusahaan", icon: Building2 },
      { href: "/dashboard/branches", label: "Cabang", icon: Building },
      { href: "/dashboard/countries", label: "Negara", icon: Globe },
      { href: "/dashboard/provinces", label: "Provinsi", icon: Map },
      { href: "/dashboard/cities", label: "Kota", icon: MapPin },
    ],
  },
  {
    title: "Administrasi",
    items: [
      { href: "/dashboard/users", label: "Pengguna", icon: Users, roles: [ROLE.SUPER_ADMIN] },
    ],
  },
];
