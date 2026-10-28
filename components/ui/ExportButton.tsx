import { Download } from "lucide-react";
import type { QueryValue } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

/** "Ekspor Excel" — downloads the backend's .xlsx of a list, with the filters currently on screen. */
export function ExportButton({ path, query }: { path: string; query?: Record<string, QueryValue> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return (
    <a href={`/api/backend/${path}${qs ? `?${qs}` : ""}`} download>
      <Button type="button" variant="outline" size="sm">
        <Download className="size-4" /> Ekspor Excel
      </Button>
    </a>
  );
}
