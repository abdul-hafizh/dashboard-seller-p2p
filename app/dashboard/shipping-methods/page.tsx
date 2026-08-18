"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { shippingMethodsConfig } from "@/lib/resources/shipping-methods.config";

export default function ShippingMethodsPage() {
  return <ResourceTable config={shippingMethodsConfig} />;
}
