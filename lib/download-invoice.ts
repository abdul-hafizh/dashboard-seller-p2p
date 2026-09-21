/** Downloads an order's invoice PDF through the authenticated `/api/backend` proxy.
 * Throws an Error whose message is safe to show to the user. */
export async function downloadInvoice(orderId: string, orderNumber?: string | null): Promise<void> {
  const res = await fetch(`/api/backend/orders/${orderId}/invoice`);

  if (!res.ok) {
    let message = "Gagal mengunduh invoice.";
    try {
      const payload = await res.json();
      if (payload?.message) message = payload.message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Invoice-${orderNumber ?? orderId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
