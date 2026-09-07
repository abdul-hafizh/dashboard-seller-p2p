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

interface ProfileForm {
  FullName: string;
  Phone: string;
  WhatsappNumber: string;
  TelegramChatId: string;
}

const EMPTY_FORM: ProfileForm = { FullName: "", Phone: "", WhatsappNumber: "", TelegramChatId: "" };

export default function ProfileSettingsPage() {
  const { user, loading, refresh } = useAuth();
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      FullName: user.FullName ?? "",
      Phone: user.Phone ?? "",
      WhatsappNumber: user.WhatsappNumber ?? "",
      TelegramChatId: user.TelegramChatId ?? "",
    });
  }, [user]);

  if (loading || !user) return <FullPageSpinner />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiFetch("auth/me", {
        method: "PUT",
        json: {
          FullName: form.FullName,
          Phone: form.Phone || null,
          WhatsappNumber: form.WhatsappNumber || null,
          TelegramChatId: form.TelegramChatId || null,
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
              <FieldLabel>No. Telepon</FieldLabel>
              <Input
                value={form.Phone}
                onChange={(e) => setForm((f) => ({ ...f, Phone: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>No. WhatsApp</FieldLabel>
              <Input
                value={form.WhatsappNumber}
                onChange={(e) => setForm((f) => ({ ...f, WhatsappNumber: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Telegram Chat ID</FieldLabel>
              <Input
                value={form.TelegramChatId}
                onChange={(e) => setForm((f) => ({ ...f, TelegramChatId: e.target.value }))}
                placeholder="Contoh: 123456789"
              />
              <p className="mt-1.5 text-xs text-ink-faint">
                Digunakan untuk mengirim notifikasi pesanan baru lewat Telegram. Dapatkan Chat ID Anda
                dengan mengirim pesan ke bot notifikasi, lalu tempelkan ID yang dibalas di sini.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
