"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { paymentMethodsConfig } from "@/lib/resources/payment-methods.config";

export default function PaymentMethodsPage() {
  return <ResourceTable config={paymentMethodsConfig} />;
}
