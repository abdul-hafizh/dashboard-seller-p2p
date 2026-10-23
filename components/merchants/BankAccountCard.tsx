"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Landmark, Copy } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { FieldLabel } from "@/components/ui/FieldLabel";

export interface BankAccount {
  BankName: string | null;
  AccountNumber: string | null;
  AccountName: string | null;
  Complete: boolean;
}

const COMMON_BANKS = ["BCA", "BRI", "BNI", "Mandiri", "BSI", "CIMB Niaga", "Permata", "Danamon", "BTN", "Bank Jago", "SeaBank"];

/**
 * "Rekening Pencairan" — the logged-in merchant's own bank account, where
 * the admin transfers their withdrawals. Used on Profil Saya and on the
 * Pencairan Dana page (same SWR key, so both stay in sync).
 */
export function BankAccountCard() {
  const { data, mutate } = useSWR("payout-bank", () => apiFetch<BankAccount>("payouts/bank-account"));
  const bank = data?.data;
  if (!bank) {
    return (
      <Card>
        <CardBody className="flex justify-center py-8">
          <Spinner className="size-5" />
        </CardBody>
      </Card>
    );
  }
  // Remount on save so the form restarts from the stored values.
  return (
    <BankAccountForm
      key={`${bank.BankName}-${bank.AccountNumber}-${bank.AccountName}`}
      initial={bank}
      onSaved={(saved) => mutate({ ...data!, data: saved }, { revalidate: false })}
    />
  );
}

function BankAccountForm({ initial, onSaved }: { initial: BankAccount; onSaved: (b: BankAccount) => void }) {
  const [form, setForm] = useState({
    BankName: initial.BankName ?? "",
    AccountNumber: initial.AccountNumber ?? "",
    AccountName: initial.AccountName ?? "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch<BankAccount>("payouts/bank-account", { method: "PUT", json: form });
      toast.success("Rekening pencairan disimpan");
      onSaved(res.data);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan rekening");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Landmark className="size-4" /> Rekening Pencairan
        </CardTitle>
        <Badge tone={initial.Complete ? "success" : "warning"}>{initial.Complete ? "Lengkap" : "Belum diisi"}</Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="text-xs text-ink-soft">
          Hasil jualan yang kamu cairkan akan ditransfer admin Petope ke rekening ini. Pastikan nama pemilik rekening sesuai
          buku tabungan.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="bank-name" required>
              Nama Bank
            </FieldLabel>
            <Input
              id="bank-name"
              list="bank-options"
              value={form.BankName}
              onChange={(e) => setForm((f) => ({ ...f, BankName: e.target.value }))}
              placeholder="BCA"
              maxLength={100}
            />
            <datalist id="bank-options">
              {COMMON_BANKS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <FieldLabel htmlFor="bank-number" required>
              Nomor Rekening
            </FieldLabel>
            <Input
              id="bank-number"
              inputMode="numeric"
              value={form.AccountNumber}
              onChange={(e) => setForm((f) => ({ ...f, AccountNumber: e.target.value }))}
              placeholder="1234567890"
              maxLength={30}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="bank-holder" required>
              Nama Pemilik Rekening
            </FieldLabel>
            <Input
              id="bank-holder"
              value={form.AccountName}
              onChange={(e) => setForm((f) => ({ ...f, AccountName: e.target.value }))}
              maxLength={150}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={save}
            loading={saving}
            disabled={!form.BankName.trim() || !form.AccountNumber.trim() || !form.AccountName.trim()}
          >
            Simpan Rekening
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/** Read-only bank account of a merchant, for the admin. */
export function MerchantBankInfo({
  bankName,
  accountNumber,
  accountName,
}: {
  bankName: string | null | undefined;
  accountNumber: string | null | undefined;
  accountName: string | null | undefined;
}) {
  const complete = Boolean(bankName && accountNumber && accountName);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(accountNumber));
      toast.success("Nomor rekening disalin");
    } catch {
      toast.error("Gagal menyalin");
    }
  };
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Landmark className="size-4" /> Rekening Pencairan
        </CardTitle>
        <Badge tone={complete ? "success" : "warning"}>{complete ? "Lengkap" : "Belum diisi"}</Badge>
      </CardHeader>
      <CardBody>
        {complete ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink">{bankName}</p>
              <p className="font-mono text-base tracking-wide text-ink">{accountNumber}</p>
              <p className="text-xs text-ink-soft">a.n. {accountName}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={copy}>
              <Copy className="size-4" /> Salin No. Rekening
            </Button>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">Seller ini belum mengisi rekening pencairan di profilnya.</p>
        )}
      </CardBody>
    </Card>
  );
}
