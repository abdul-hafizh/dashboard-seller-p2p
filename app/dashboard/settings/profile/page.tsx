"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { MerchantDocumentsCard } from "@/components/merchants/MerchantDocumentsCard";
import { OperatingHoursCard } from "@/components/merchants/OperatingHoursCard";
import { BankAccountCard } from "@/components/merchants/BankAccountCard";
import { ProfilePhotosCard } from "@/components/merchants/ProfilePhotosCard";
import { StoreAddressCard } from "@/components/merchants/StoreAddressCard";
import { TelegramCard } from "@/components/merchants/TelegramCard";

type TaxType = "PKP" | "NON_PKP";

interface ProfileForm {
  FullName: string;
  WhatsappNumber: string;
  TaxType: TaxType;
  NPWP: string;
}

const EMPTY_FORM: ProfileForm = {
  FullName: "",
  WhatsappNumber: "",
  TaxType: "NON_PKP",
  NPWP: "",
};

const TAX_OPTIONS: { value: TaxType; label: string; description: string }[] = [
  { value: "NON_PKP", label: "Non-PKP", description: "Belum dikukuhkan sebagai Pengusaha Kena Pajak." },
  { value: "PKP", label: "PKP", description: "Pengusaha Kena Pajak. Untuk data administrasi pajak — PPN pesanan ditagihkan ke customer dan disetor Petope." },
];

export default function ProfileSettingsPage() {
  const { user, loading, refresh, isMerchant } = useAuth();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      FullName: user.FullName ?? "",
      // One contact number: WhatsApp (older accounts may only have a phone number).
      WhatsappNumber: user.WhatsappNumber || user.Phone || "",
      TaxType: user.TaxProfile?.TaxType ?? "NON_PKP",
      NPWP: user.TaxProfile?.NPWP ?? "",
    });
  }, [user]);

  if (loading || !user) return <FullPageSpinner />;

  // Only Indonesian merchants have a PKP / Non-PKP status.
  const taxProfile = user.TaxProfile;
  const showTax = Boolean(taxProfile?.Applicable);
  const canEditTax = Boolean(taxProfile?.CanEdit);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch("auth/me", {
        method: "PUT",
        json: {
          FullName: form.FullName,
          // Phone mirrors WhatsApp — labels and couriers still read it.
          Phone: form.WhatsappNumber || null,
          WhatsappNumber: form.WhatsappNumber || null,
          ...(showTax && canEditTax
            ? { TaxType: form.TaxType, NPWP: form.TaxType === "PKP" || form.NPWP ? form.NPWP : null }
            : {}),
        },
      });
      toast.success("Profil berhasil diperbarui");
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <ProfilePhotosCard />
      <Card>
        <CardHeader>
          <CardTitle>Profil Saya</CardTitle>
        </CardHeader>
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <FieldLabel>Email</FieldLabel>
              <Input value={user.Email} disabled />
            </div>
            <div>
              <FieldLabel required>Nama Lengkap</FieldLabel>
              <Input
                value={form.FullName}
                onChange={(e) => setForm((f) => ({ ...f, FullName: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel>No. WhatsApp</FieldLabel>
              <Input
                value={form.WhatsappNumber}
                inputMode="tel"
                placeholder="08xxxxxxxxxx"
                onChange={(e) => setForm((f) => ({ ...f, WhatsappNumber: e.target.value }))}
              />
            </div>
            {showTax && (
              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <FieldLabel>Jenis Pajak Seller</FieldLabel>
                  <p className="text-xs text-ink-faint">Berlaku untuk seller di Indonesia.</p>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {TAX_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-3 ${
                        form.TaxType === opt.value ? "border-brand-purple bg-brand-purple/5" : "border-border bg-surface"
                      } ${canEditTax ? "" : "cursor-not-allowed opacity-60"}`}
                    >
                      <input
                        type="radio"
                        name="TaxType"
                        value={opt.value}
                        checked={form.TaxType === opt.value}
                        disabled={!canEditTax}
                        onChange={() => setForm((f) => ({ ...f, TaxType: opt.value }))}
                        className="mt-1 accent-brand-purple"
                      />
                      <span>
                        <span className="block text-sm font-bold text-ink">{opt.label}</span>
                        <span className="mt-0.5 block text-xs text-ink-soft">{opt.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div>
                  <FieldLabel required={form.TaxType === "PKP"}>NPWP</FieldLabel>
                  <Input
                    value={form.NPWP}
                    disabled={!canEditTax}
                    onChange={(e) => setForm((f) => ({ ...f, NPWP: e.target.value }))}
                    placeholder="15 atau 16 digit"
                    required={form.TaxType === "PKP"}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      {isMerchant && <TelegramCard />}
      {isMerchant && <StoreAddressCard />}
      {isMerchant && <OperatingHoursCard />}
      {isMerchant && <BankAccountCard />}
      {isMerchant && <MerchantDocumentsCard />}
    </div>
  );
}
