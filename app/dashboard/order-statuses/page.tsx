"use client";

import { ResourceTable } from "@/components/crud/ResourceTable";
import { orderStatusesConfig } from "@/lib/resources/order-statuses.config";

export default function OrderStatusesPage() {
  return <ResourceTable config={orderStatusesConfig} />;
}
