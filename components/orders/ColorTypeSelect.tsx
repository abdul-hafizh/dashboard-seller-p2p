"use client";

import { Select } from "@/components/ui/Select";
import { FieldLabel } from "@/components/ui/FieldLabel";

/** "Satu warna" / "Multicolor" for an OrderItem.ColorType (SINGLE | MULTI). */
export function colorTypeLabel(value: string | null | undefined): string | null {
  if (value === "MULTI") return "Multicolor";
  if (value === "SINGLE") return "Satu warna";
  return null;
}

/** Required Jenis Warna picker for a design / custom item — set by the seller, no effect on the price. */
export function ColorTypeSelect({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <div>
      <FieldLabel htmlFor={id} required>
        Jenis Warna
      </FieldLabel>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Pilih...</option>
        <option value="SINGLE">Satu warna (single color)</option>
        <option value="MULTI">Multicolor</option>
      </Select>
      <p className="mt-1 text-xs text-ink-faint">Dicetak dengan satu warna filamen atau beberapa warna. Tidak mengubah harga.</p>
    </div>
  );
}
