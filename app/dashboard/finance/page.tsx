"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Wallet,
  Store,
  Coins,
  Truck,
  Landmark,
  HandCoins,
  Info,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formatCurrency } from "@/lib/resources/format";
import { ReportTabs } from "@/components/reports/ReportTabs";
import { ExportButton } from "@/components/ui/ExportButton";
import Link from "next/link";

interface SellerFinance {
  MerchantId: string;
  StoreName: string;
  Email?: string | null;
  Orders: number;
  CompletedOrders: number;
  GrossSales: number;
  Discount: number;
  BasePrice: number;
  Tax: number;
  ServiceFee: number;
  SellerFee: number;
  MerchantServiceFee?: number;
  MerchantTax?: number;
  Earnings: number;
  EarningsCompleted: number;
  EarningsInProgress: number;
}

interface FinanceReport {
  Sellers: SellerFinance[];
  SellerTotals: Partial<SellerFinance>;
  Platform?: {
    ServiceFee: number;
    ShippingCollected: number;
    CourierOrders: number;
    PickupOrders: number;
    OrdersWithoutGatewayPayment: number;
    TokenNetSales: number;
    TokenTax: number;
    ProductSales: number;
    SellerFee: number;
    MerchantServiceFee?: number;
    CustomerServiceFee?: number;
    MerchantTax?: number;
    /** Hak seller — completed orders only. */
    OwedToSellers: number;
    /** Paid orders not completed yet: held, not the seller's yet. */
    HeldForSellers?: number;
    SellerTax: number;
    TaxToRemit: number;
    Income: number;
    /** Promo diskon dari pusat paid by Petope (Promosi). */
    PromoSubsidy?: number;
    PromoOrders?: number;
    TotalCollected: number;
    GatewayIncoming: number;
  };
  Payouts?: { Earned: number; PaidOut: number; Pending: number; Available: number; InProgress: number };
  Shipping?: { CustomerPayments: number; TopUps: number; CourierCharges: number; BiteshipBalance: number; Margin: number };
  Tokens?: {
    Orders: number;
    Tokens: number;
    Gateway: { Orders: number; Tokens: number; Sales: number; ServiceFee: number; Tax: number; Total: number };
    GooglePlay: { Orders: number; Tokens: number; EstimatedGross: number };
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthStart = () => {
  const now = new Date();
  return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
};

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  emphasis,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${emphasis ? "border-brand-purple/30 bg-brand-purple/5" : "border-border bg-surface"}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <Icon className="size-4 text-brand-purple" /> {label}
      </div>
      <p className="mt-1.5 text-lg font-extrabold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{hint}</p>}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-xl border border-border bg-surface-muted/60 p-3 text-xs text-ink-soft">
      <Info className="mt-0.5 size-3.5 shrink-0 text-ink-faint" />
      <div className="space-y-1">{children}</div>
    </div>
  );
}

/**
 * Rekap Keuangan — merchant: own earnings. Super admin:
 * Petope's income (service fee, tokens, shipping pass-through) and every
 * seller's earnings. Computed from our order/payment records.
 */
export default function FinancePage() {
  const { isAdmin } = useAuth();
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(() => toDateInput(new Date()));

  const { data, isLoading, error } = useSWR(["finance-report", from, to], () =>
    apiFetch<FinanceReport>("reports/finance", { query: { from, to } }),
  );
  const report = data?.data;
  const totals = report?.SellerTotals ?? {};
  const platform = report?.Platform;
  const tokens = report?.Tokens;

  return (
    <div className="space-y-5">
      <ReportTabs />
      <Card>
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-base font-extrabold text-ink">{isAdmin ? "Rekap Keuangan" : "Rekap Penjualan Toko"}</h1>
            <p className="mt-0.5 text-xs text-ink-soft">
              {isAdmin
                ? "Semua pembayaran masuk ke rekening DOKU pusat; hak seller dicairkan lewat menu Pencairan Dana."
                : "Hasil jualan toko kamu dari pesanan yang sudah dibayar."}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid grid-cols-2 gap-3 sm:w-80">
              <div>
                <FieldLabel htmlFor="fin-from">Dari</FieldLabel>
                <Input id="fin-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <FieldLabel htmlFor="fin-to">Sampai</FieldLabel>
                <Input id="fin-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <ExportButton path="reports/finance/export" query={{ from, to }} />
          </div>
        </div>
      </Card>


      {isLoading && !report ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : error ? (
        <Card>
          <EmptyState icon={Wallet} title="Gagal memuat rekap" description={error instanceof Error ? error.message : undefined} />
        </Card>
      ) : !report ? null : (
        <>
          {isAdmin && platform && tokens && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="size-4" /> Petope Pusat
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Stat
                    icon={Wallet}
                    label="Total Dibayar Customer"
                    value={formatCurrency(platform.TotalCollected)}
                    hint="Harga produk + PPN + ongkir; semua masuk ke rekening DOKU pusat"
                  />
                  <Stat
                    icon={Landmark}
                    label="Pendapatan Petope"
                    value={formatCurrency(platform.Income)}
                    hint="Biaya layanan + fee transaksi dari seller + token − subsidi promo, sebelum potongan DOKU / Google"
                    emphasis
                  />
                  <Stat
                    icon={HandCoins}
                    label="Hak Seller"
                    value={formatCurrency(platform.OwedToSellers)}
                    hint={`Hanya pesanan selesai (harga dasar − fee transaksi − admin fee). ${formatCurrency(platform.HeldForSellers ?? 0)} masih tertahan di pesanan yang belum selesai.`}
                  />
                  <Stat
                    icon={Truck}
                    label="Ongkir (diteruskan ke Biteship)"
                    value={formatCurrency(platform.ShippingCollected)}
                    hint={`${platform.CourierOrders} pengiriman kurir · bukan pendapatan`}
                  />
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border p-4 text-sm">
                    <p className="mb-2 font-bold text-ink">Rincian Pendapatan</p>
                    <dl className="space-y-1.5">
                      <div className="flex justify-between">
                        <dt className="text-ink-soft">Fee transaksi seller ({totals.Orders ?? 0} pesanan)</dt>
                        <dd className="font-semibold text-ink">{formatCurrency(platform.SellerFee)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-soft">Biaya layanan dari seller</dt>
                        <dd className="font-semibold text-ink">{formatCurrency(platform.ServiceFee)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-soft">Token via DOKU · {tokens.Gateway.Orders} trx · {tokens.Gateway.Tokens.toLocaleString("id-ID")} token</dt>
                        <dd className="font-semibold text-ink">{formatCurrency(tokens.Gateway.Sales + tokens.Gateway.ServiceFee)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-soft">
                          Token via Google Play · {tokens.GooglePlay.Orders} trx · {tokens.GooglePlay.Tokens.toLocaleString("id-ID")} token
                        </dt>
                        <dd className="font-semibold text-ink">± {formatCurrency(tokens.GooglePlay.EstimatedGross)}</dd>
                      </div>
                      {(platform.PromoSubsidy ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-ink-soft">Subsidi promo dari pusat · {platform.PromoOrders ?? 0} pesanan</dt>
                          <dd className="font-semibold text-error">− {formatCurrency(platform.PromoSubsidy)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div className="rounded-2xl border border-border p-4 text-sm">
                    <p className="mb-2 font-bold text-ink">Rekening DOKU Pusat</p>
                    <dl className="space-y-1.5">
                      <div className="flex justify-between">
                        <dt className="text-ink-soft">Pembayaran DOKU tercatat</dt>
                        <dd className="font-semibold text-ink">{formatCurrency(platform.GatewayIncoming)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-soft">Keluar ke saldo Biteship (ongkir)</dt>
                        <dd className="text-ink">− {formatCurrency(platform.ShippingCollected)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ink-soft">Hak seller (pesanan selesai)</dt>
                        <dd className="text-ink">− {formatCurrency(platform.OwedToSellers)}</dd>
                      </div>
                      {(platform.HeldForSellers ?? 0) > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-ink-soft">Tertahan (pesanan belum selesai)</dt>
                          <dd className="text-ink">− {formatCurrency(platform.HeldForSellers)}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-ink-soft">PPN untuk disetor</dt>
                        <dd className="text-ink">− {formatCurrency(platform.TaxToRemit)}</dd>
                      </div>
                    </dl>
                    {report.Payouts && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="mb-1.5 font-bold text-ink">Pencairan Seller (sepanjang waktu)</p>
                        <dl className="space-y-1.5">
                          <div className="flex justify-between"><dt className="text-ink-soft">Sudah ditransfer</dt><dd className="text-ink">{formatCurrency(report.Payouts.PaidOut)}</dd></div>
                          <div className="flex justify-between"><dt className="text-ink-soft">Menunggu transfer</dt><dd className="text-brand-orange-deep">{formatCurrency(report.Payouts.Pending)}</dd></div>
                          <div className="flex justify-between"><dt className="text-ink-soft">Saldo seller belum diajukan</dt><dd className="text-ink">{formatCurrency(report.Payouts.Available)}</dd></div>
                        </dl>
                        <Link href="/dashboard/payouts" className="mt-1 inline-block text-xs font-semibold text-brand-purple">Buka Pencairan Dana →</Link>
                      </div>
                    )}
                    {report.Shipping && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="mb-1.5 font-bold text-ink">Ongkir (sepanjang waktu)</p>
                        <dl className="space-y-1.5">
                          <div className="flex justify-between"><dt className="text-ink-soft">Ongkir masuk dari customer</dt><dd className="text-ink">{formatCurrency(report.Shipping.CustomerPayments)}</dd></div>
                          <div className="flex justify-between"><dt className="text-ink-soft">Biaya kurir Biteship</dt><dd className="text-ink">− {formatCurrency(report.Shipping.CourierCharges)}</dd></div>                        </dl>
                        <Link href="/dashboard/shipping-ledger" className="mt-1 inline-block text-xs font-semibold text-brand-purple">Buka Keuangan Ongkir →</Link>
                      </div>
                    )}
                    {platform.OrdersWithoutGatewayPayment > 0 && (
                      <p className="mt-2 text-[11px] text-brand-orange-deep">
                        {platform.OrdersWithoutGatewayPayment} pesanan seller berstatus lunas tanpa catatan pembayaran DOKU
                        (ditandai lunas manual / data lama).
                      </p>
                    )}
                  </div>
                </div>

                <Note>
                  <p>
                    Angka dihitung dari data pesanan & pembayaran Petope. <b>Potongan biaya DOKU (MDR)</b> dan <b>pencairan
                    (settlement) dari DOKU ke rekening bank pusat</b> tidak tersedia lewat API — DOKU mencairkannya otomatis sesuai
                    jadwal settlement akun; cek di DOKU Back Office.
                  </p>
                  <p>
                    <b>Google Play</b> dicatat dengan harga normal per token; nilai bersih setelah potongan Google (umumnya 15%) dan pajak ada
                    di Play Console › Laporan keuangan.
                  </p>
                </Note>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="size-4" /> {isAdmin ? "Penjualan per Seller" : "Ringkasan Penjualan"}
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Stat
                  icon={Wallet}
                  label="Hak Seller (Pesanan Selesai)"
                  value={formatCurrency(totals.Earnings ?? 0)}
                  hint="Hanya pesanan yang sudah diterima customer, setelah potongan fee transaksi + admin fee. Bisa dicairkan."
                  emphasis
                />
                <Stat
                  icon={HandCoins}
                  label="Pesanan Selesai"
                  value={`${totals.CompletedOrders ?? 0} / ${totals.Orders ?? 0}`}
                  hint="Selesai dari semua pesanan dibayar di periode ini"
                />
                <Stat
                  icon={Truck}
                  label="Tertahan (Belum Selesai)"
                  value={formatCurrency(totals.EarningsInProgress ?? 0)}
                  hint="Sudah dibayar tapi belum diterima customer — belum masuk hak seller"
                />
                <Stat
                  icon={Coins}
                  label="Penjualan Kotor"
                  value={formatCurrency(totals.GrossSales ?? 0)}
                  hint={`Sebelum diskon ${formatCurrency(totals.Discount ?? 0)}`}
                />
              </div>

              {isAdmin &&
                (report.Sellers.length === 0 ? (
                  <EmptyState icon={Store} title="Belum ada penjualan" description="Tidak ada pesanan seller yang dibayar di periode ini." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/60 text-xs font-bold uppercase tracking-wide text-ink-soft">
                          <th className="whitespace-nowrap px-4 py-3">Seller</th>
                          <th className="whitespace-nowrap px-4 py-3 text-right">Selesai / Pesanan</th>
                          <th className="whitespace-nowrap px-4 py-3 text-right">Penjualan Kotor</th>
                          <th className="whitespace-nowrap px-4 py-3 text-right">Hak Seller (Selesai)</th>
                          <th className="whitespace-nowrap px-4 py-3 text-right">Tertahan (Belum Selesai)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.Sellers.map((s) => (
                          <tr key={s.MerchantId} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                            <td className="whitespace-nowrap px-4 py-3">
                              <p className="font-semibold text-ink">{s.StoreName}</p>
                              {s.Email && <p className="text-xs text-ink-soft">{s.Email}</p>}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-ink-soft">
                              {s.CompletedOrders}/{s.Orders}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-ink">{formatCurrency(s.GrossSales)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-success">{formatCurrency(s.Earnings)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-ink-soft">{formatCurrency(s.EarningsInProgress)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

              <Note>
                <p>
                  Penjualan bersih = harga produk setelah diskon membership (yang dibayar customer, tanpa ongkir). Pembayarannya masuk ke
                  rekening DOKU pusat. Hak seller hanya dihitung dari pesanan yang sudah selesai (diterima customer) dan sudah dipotong fee transaksi + admin fee; pesanan yang belum selesai tercatat sebagai tertahan; rinciannya per pesanan ada di detail pesanan. PPN dibayar customer dan disetor Petope.
                </p>
                <p>Periode dihitung dari tanggal pembayaran pesanan.</p>
              </Note>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
