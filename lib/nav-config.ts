import {
  LayoutDashboard,
  Tags,
  Cpu,
  Printer,
  Globe,
  Map,
  MapPin,
  CreditCard,
  Truck,
  ListChecks,
  Package,
  ShoppingCart,
  Users,
  Store,
  MessageCircle,
  ListOrdered,
  UserCog,
  Settings2,
  Sparkles,
  FilePlus2,
  Percent,
  BarChart3,
  Wallet,
  Banknote,
  Contact,
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
      // Merchant: own sales · Super Admin: every seller (scoped server-side).
      { href: "/dashboard/sales", label: "Laporan Penjualan", icon: BarChart3 },
      // Merchant: "Penghasilan Saya" · Super Admin: Petope + sellers.
      { href: "/dashboard/customers", label: "Customer", icon: Contact, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/finance", label: "Rekap Keuangan", icon: Wallet },
      // Merchant: own balance + withdrawals · Super Admin: process them.
      { href: "/dashboard/payouts", label: "Pencairan Dana", icon: Banknote },
      { href: "/dashboard/shipping-ledger", label: "Keuangan Ongkir", icon: Truck, roles: [ROLE.SUPER_ADMIN] },
      // Meshy credit balance + every 3D generation.
      { href: "/dashboard/meshy", label: "Aktivitas Meshy", icon: Sparkles, roles: [ROLE.SUPER_ADMIN] },
      {
        href: "/dashboard/ai-model-orders",
        label: "Pesanan dari AI Model",
        icon: Sparkles,
        roles: [ROLE.MERCHANT],
      },
      {
        href: "/dashboard/custom-orders",
        label: "Pesanan Custom",
        icon: FilePlus2,
        roles: [ROLE.MERCHANT],
      },
      { href: "/dashboard/chat", label: "Pesan", icon: MessageCircle, roles: [ROLE.MERCHANT] },
      { href: "/dashboard/print-queue", label: "Antrian Cetak", icon: ListOrdered, roles: [ROLE.MERCHANT] },
      // Hidden for now: the page lives in app/dashboard/_canva (the "_" prefix keeps
      // Next.js from routing it) — rename the folder back to restore /dashboard/canva.
      // { href: "/dashboard/canva", label: "Canva", icon: Palette, roles: [ROLE.MERCHANT] },
    ],
  },
  {
    title: "Data Master",
    items: [
      // Materials & Printers are merchant-owned data (scoped server-side to
      // the merchant's own MerchantId/Branch) — both roles see them.
      { href: "/dashboard/printers", label: "Printer", icon: Printer },
      // Everything below is global reference data the backend now
      // restricts to Super Admin for create/update/delete.
      { href: "/dashboard/product-categories", label: "Kategori Produk", icon: Tags, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/printer-types", label: "Merk", icon: Cpu, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/payment-methods", label: "Metode Pembayaran", icon: CreditCard, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/shipping-methods", label: "Kurir & Layanan", icon: Truck, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/order-statuses", label: "Status Pesanan", icon: ListChecks, roles: [ROLE.SUPER_ADMIN] },
    ],
  },
  {
    title: "Organisasi & Wilayah",
    items: [
      // Hidden for now: Company is a legacy org entity not used by the P2P seller flow.
      // { href: "/dashboard/companies", label: "Perusahaan", icon: Building2, roles: [ROLE.SUPER_ADMIN] },
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
      { href: "/dashboard/merchants", label: "Seller", icon: Store, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/price-master", label: "Master Harga", icon: Tags, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/tax-fee-settings", label: "Pajak & Biaya Layanan", icon: Percent, roles: [ROLE.SUPER_ADMIN] },
      { href: "/dashboard/system-settings", label: "Pengaturan Sistem", icon: Settings2, roles: [ROLE.SUPER_ADMIN] },
    ],
  },
];
