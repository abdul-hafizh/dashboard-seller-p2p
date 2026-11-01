"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FieldLabel } from "@/components/ui/FieldLabel";

/**
 * "Ubah Email" — step 1 sends a 6-digit code to the new address, step 2
 * confirms it; only then the account's email changes (the old address gets a
 * notice). See POST /auth/me/email/request-code and /confirm.
 */
export function ChangeEmailDialog({ open, currentEmail, onClose, onChanged }: {
  open: boolean;
  currentEmail: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const close = () => {
    setStep("email");
    setNewEmail("");
    setCode("");
    onClose();
  };

  const requestCode = async (event?: FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch<{ resendAfterSeconds: number }>("auth/me/email/request-code", {
        method: "POST",
        json: { NewEmail: newEmail.trim() },
      });
      toast.success(res.message || "Kode verifikasi dikirim");
      setStep("code");
      setCode("");
      setResendIn(res.data?.resendAfterSeconds ?? 60);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal mengirim kode verifikasi");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch("auth/me/email/confirm", { method: "POST", json: { Code: code.trim() } });
      toast.success(res.message || "Email berhasil diubah");
      onChanged();
      close();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Gagal memverifikasi kode");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Ubah Email" description={`Email sekarang: ${currentEmail}`} size="sm">
      {step === "email" ? (
        <form className="space-y-4" onSubmit={requestCode}>
          <div>
            <FieldLabel htmlFor="new-email" required>
              Email baru
            </FieldLabel>
            <Input
              id="new-email"
              type="email"
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nama@contoh.com"
              required
            />
            <p className="mt-1 text-xs text-ink-faint">Kode verifikasi 6 digit akan dikirim ke email baru ini.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Batal
            </Button>
            <Button type="submit" loading={busy} disabled={!newEmail.trim()}>
              Kirim Kode
            </Button>
          </div>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={confirm}>
          <p className="text-sm text-ink-soft">
            Masukkan kode yang dikirim ke <b className="text-ink">{newEmail.trim()}</b>. Kode berlaku 10 menit. Cek juga folder spam.
          </p>
          <div>
            <FieldLabel htmlFor="email-code" required>
              Kode verifikasi
            </FieldLabel>
            <Input
              id="email-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="text-center text-lg tracking-[0.5em]"
              required
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="text-xs font-semibold text-brand-purple hover:underline disabled:cursor-not-allowed disabled:text-ink-faint disabled:no-underline"
              disabled={resendIn > 0 || busy}
              onClick={() => requestCode()}
            >
              {resendIn > 0 ? `Kirim ulang dalam ${resendIn} detik` : "Kirim ulang kode"}
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("email")}>
                Ganti Email
              </Button>
              <Button type="submit" loading={busy} disabled={code.length !== 6}>
                Verifikasi
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
