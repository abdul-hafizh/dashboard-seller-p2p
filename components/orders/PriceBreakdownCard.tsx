import { Receipt } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/resources/format";

export interface OrderMoney {
  SubtotalAmount?: number | null;
  DiscountAmount?: number | null;
  TaxAmount?: number | null;
  TotalAmount?: number | null;
  SellerFeeAmount?: number | null;
  MerchantServiceFeePercent?: number | null;
  MerchantServiceFeeAmount?: number | null;
  MerchantTaxAmount?: number | null;
}

const n = (v: number | null | undefined) => Number(v) || 0;

function Row({ label, value, tone, bold }: { label: string; value: string; tone?: "minus" | "plus"; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "border-t border-border pt-2 font-bold text-ink" : "text-ink-soft"}`}>
      <dt>{label}</dt>
      <dd className={tone === "minus" ? "text-error" : bold ? "text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}

/**
 * What the customer paid and what the seller keeps for one order (same rules
 * as the backend's utils/sellerBalance.js): seller's share = price after the
 * tier discount − fee transaksi − admin fee; on older orders (no admin-fee
 * snapshot) the customer's PPN went to the seller too.
 */
export function PriceBreakdownCard({ order, shippingCost }: { order: OrderMoney; shippingCost: number }) {
  const subtotal = n(order.SubtotalAmount);
  const discount = n(order.DiscountAmount);
  const base = Math.max(0, subtotal - discount);
  const tax = n(order.TaxAmount);
  const sellerFee = n(order.SellerFeeAmount);
  const adminFee = n(order.MerchantServiceFeeAmount);
  const merchantTax = n(order.MerchantTaxAmount);
  const legacyTax = order.MerchantServiceFeePercent == null ? tax : 0;
  const sellerNet = base + legacyTax - sellerFee - adminFee - merchantTax;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="size-4" /> Rincian Harga
        </CardTitle>
      </CardHeader>
      <CardBody className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Dibayar customer</p>
          <dl className="space-y-1.5 text-sm">
            <Row label="Subtotal produk" value={formatCurrency(subtotal)} />
            {discount > 0 && <Row label="Diskon tier" value={`− ${formatCurrency(discount)}`} tone="minus" />}
            {tax > 0 && <Row label="PPN" value={formatCurrency(tax)} />}
            <Row label="Ongkir" value={formatCurrency(shippingCost)} />
            <Row label="Total dibayar" value={formatCurrency(n(order.TotalAmount) + shippingCost)} bold />
          </dl>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Hak seller</p>
          <dl className="space-y-1.5 text-sm">
            <Row label="Harga setelah diskon" value={formatCurrency(base)} />
            {legacyTax > 0 && <Row label="PPN (pesanan lama)" value={formatCurrency(legacyTax)} />}
            <Row label="Fee transaksi" value={`− ${formatCurrency(sellerFee)}`} tone="minus" />
            <Row label="Admin fee" value={`− ${formatCurrency(adminFee)}`} tone="minus" />
            {merchantTax > 0 && <Row label="PPN seller" value={`− ${formatCurrency(merchantTax)}`} tone="minus" />}
            <Row label="Total hak seller" value={formatCurrency(sellerNet)} bold />
          </dl>
          <p className="mt-2 text-[11px] text-ink-faint">Ongkir diteruskan ke kurir (Biteship), bukan bagian hak seller.</p>
        </div>
      </CardBody>
    </Card>
  );
}
