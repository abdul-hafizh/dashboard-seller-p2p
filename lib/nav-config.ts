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
  ListOrdered,
  Palette,
  UserCog,
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
      { href: "/dashboard/print-queue", label: "Antrian Cetak", icon: ListOrdered, roles: [ROLE.MERCHANT] },
      { href: "/dashboard/canva", label: "Canva", icon: Palette, roles: [ROLE.MERCHANT] },
      { href: "/dashboard/addresses", label: "Alamat", icon: Home },
    ],
  },
  {
    title: "Data Master",
    items: [
      // Materials & Printers are merchant-owned data (scoped server-side to
      // the merchant's own MerchantId/Branch) — both roles see them.
      { href: "/dashboard/materials", label: "Material", icon: Layers },
      { href: "/dashboard/printers", label: "Printer", icon: Printer },
      // Everything below is global reference data the backend now
      // restricts to Super Admin for create/update/delete.
      { href: "/dashboard/product-categories", label: "Kategori Produk", icon: Tags, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/printer-types", label: "Tipe Printer", icon: Cpu, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/print-profiles", label: "Profil Cetak", icon: SlidersHorizontal, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/payment-methods", label: "Metode Pembayaran", icon: CreditCard, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/shipping-methods", label: "Metode Pengiriman", icon: Truck, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/shipping-services", label: "Layanan Pengiriman", icon: Truck, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/order-statuses", label: "Status Pesanan", icon: ListChecks, roles: [ROLE.SUPER_ADMIN] },
    ],
  },
  {
    title: "Organisasi & Wilayah",
    items: [
      { href: "/dashboard/companies", label: "Perusahaan", icon: Building2, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/branches", label: "Cabang", icon: Building, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/countries", label: "Negara", icon: Globe, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/provinces", label: "Provinsi", icon: Map, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/cities", label: "Kota", icon: MapPin, roles: [ROLE.SUPER_ADMIN] },
    ],
  },
  {
    title: "Akun",
    items: [
      { href: "/dashboard/settings/profile", label: "Profil Saya", icon: UserCog },
    ],
  },
  {
    title: "Administrasi",
    items: [
      { href: "/dashboard/users", label: "Pengguna", icon: Users, roles: [ROLE.SUPER_ADMIN] },
    ],
  },
];
