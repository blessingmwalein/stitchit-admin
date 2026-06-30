"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";
import { Check, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

const FEATURES = [
  "Customer CRM & lead management",
  "Custom rug order tracking",
  "13-stage production monitoring",
  "Inventory & material control",
  "Double-entry financial accounting",
  "WhatsApp customer communication",
];

// ── Login form (uses useSearchParams — must be in Suspense) ──────────────────

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/dashboard";
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await login(values);
      router.push(from);
    } catch (err: any) {
      toast.error(err?.message ?? "Invalid email or password");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium">
          Email address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@stitchit.co.zw"
            className={cn("pl-9 h-11", errors.email && "border-destructive focus-visible:ring-destructive")}
            {...register("email")}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className={cn("pl-9 pr-10 h-11", errors.password && "border-destructive focus-visible:ring-destructive")}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full h-11 text-sm font-semibold mt-2"
        style={{ backgroundColor: "#f97316", color: "#fff" }}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Signing in…
          </span>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── Left: Brand panel ── */}
      <div className="hidden lg:flex lg:w-[460px] xl:w-[520px] flex-col relative overflow-hidden bg-white border-r">

        {/* ── Shape illustrations ── */}

        {/* Top-right: concentric rings (partially off-screen) */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full border border-orange-200" />
        <div className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full border border-orange-300/70" />
        <div className="pointer-events-none absolute top-3 right-3 h-36 w-36 rounded-full border border-orange-400/50" />
        {/* Small dot accent near rings */}
        <div className="pointer-events-none absolute top-8 right-[140px] h-2.5 w-2.5 rounded-full bg-orange-400/60" />
        <div className="pointer-events-none absolute top-[72px] right-[100px] h-1.5 w-1.5 rounded-full bg-orange-300/70" />

        {/* Top-left: two small accent circles */}
        <div className="pointer-events-none absolute top-12 left-8 h-4 w-4 rounded-full bg-orange-300/50" />
        <div className="pointer-events-none absolute top-20 left-16 h-2 w-2 rounded-full bg-orange-400/40" />

        {/* Middle-right: stacked rotated rounded squares */}
        <div className="pointer-events-none absolute top-[42%] right-10 h-28 w-28 rounded-2xl border-2 border-orange-200 rotate-[14deg]" />
        <div className="pointer-events-none absolute top-[44%] right-16 h-20 w-20 rounded-xl border border-orange-300/60 rotate-[-6deg]" />
        {/* Small filled dot cluster beside squares */}
        <div className="pointer-events-none absolute top-[38%] right-8 h-3 w-3 rounded-full bg-orange-400/35" />
        <div className="pointer-events-none absolute top-[36%] right-14 h-2 w-2 rounded-full bg-orange-300/50" />

        {/* Bottom-left: large soft filled circles */}
        <div className="pointer-events-none absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-orange-50" />
        <div className="pointer-events-none absolute -bottom-14 -left-14 h-56 w-56 rounded-full bg-orange-100/70" />

        {/* Bottom-right: 4×4 dot grid */}
        <div className="pointer-events-none absolute bottom-16 right-8 grid grid-cols-4 gap-[10px]">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-1 w-1 rounded-full bg-orange-300/70" />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div>
            <Image
              src="/STICHIT-01.png"
              alt="Stitch't"
              width={88}
              height={88}
              className="rounded-xl"
              priority
            />
          </div>

          {/* Headline */}
          <div className="mt-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs text-orange-600 font-semibold">Staff Portal</span>
            </div>

            <h2 className="text-4xl font-bold text-zinc-900 leading-tight tracking-tight">
              Run your rug<br />
              business{" "}
              <span className="text-orange-500">smarter</span>
            </h2>
            <p className="mt-4 text-zinc-500 text-sm leading-relaxed max-w-[300px]">
              From custom orders and production tracking to customer relationships and
              full financial reporting — Stitch&apos;t keeps everything connected.
            </p>

            {/* Features */}
            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-zinc-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <Check className="h-3 w-3 text-orange-500" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <p className="mt-auto pt-10 text-xs text-zinc-400">
            © 2026 Stitch&apos;t · Custom Tufted Rugs · Harare, Zimbabwe
          </p>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Image
            src="/STICHIT-01.png"
            alt="Stitch't"
            width={64}
            height={64}
            className="rounded-xl mx-auto"
            priority
          />
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to the Stitch&apos;t admin panel
            </p>
          </div>

          <React.Suspense
            fallback={
              <div className="mt-8 space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    <div className="h-11 w-full rounded-md bg-muted animate-pulse" />
                  </div>
                ))}
                <div className="h-11 w-full rounded-md bg-muted animate-pulse mt-2" />
              </div>
            }
          >
            <LoginForm />
          </React.Suspense>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-3">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">Staff access only</span>
            <div className="flex-1 border-t" />
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Having trouble signing in?{" "}
            <span className="text-orange-500 cursor-pointer hover:underline">
              Contact your administrator
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
