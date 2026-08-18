"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FieldLabel, FieldError } from "@/components/ui/FieldLabel";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const schema = z.object({
  Email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  Password: z.string().min(1, "Password wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      setServerError(payload?.message || "Login gagal. Coba lagi.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  const handleGoogleCredential = async (idToken: string) => {
    setServerError(null);
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      setServerError(payload?.message || "Masuk dengan Google gagal. Coba lagi.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <AuthCard
      title="Masuk ke Dashboard"
      subtitle="Khusus untuk merchant & admin Snapy AI 3D"
      error={serverError}
      footer={
        <>
          Belum punya akun merchant?{" "}
          <Link href="/register" className="font-bold text-brand-purple hover:underline">
            Daftar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <div>
          <FieldLabel required>Email</FieldLabel>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              type="email"
              placeholder="nama@email.com"
              invalid={Boolean(errors.Email)}
              className="pl-10"
              {...register("Email")}
            />
          </div>
          <FieldError message={errors.Email?.message} />
        </div>

        <div>
          <FieldLabel required>Password</FieldLabel>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <PasswordInput
              placeholder="Masukkan password"
              invalid={Boolean(errors.Password)}
              className="pl-10"
              {...register("Password")}
            />
          </div>
          <FieldError message={errors.Password?.message} />
        </div>

        <Button type="submit" size="lg" className="mt-2 w-full" loading={isSubmitting}>
          Masuk
          <ArrowRight className="size-4" />
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold text-ink-faint">atau</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />
    </AuthCard>
  );
}
