"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { IconBuilding } from "@/components/icons";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Invalid email or password.");
      }

      // Success: redirect user to their destination
      router.push(redirectTarget);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-lg border border-slate-200/90 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-6 sm:p-8 shadow-2xs transition-colors">
        <div className="mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 dark:bg-white text-white dark:text-slate-900 mb-3">
            <IconBuilding className="w-4 h-4 text-slate-100 dark:text-slate-900" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
            Sign In to PropAudit
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#a1a8b0]">
            Access your valuation models and review queues
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-2.5 text-xs text-rose-800 dark:text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded border border-slate-200 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#202428] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-slate-800 dark:focus:border-slate-400 focus:bg-white dark:focus:bg-[#202428] transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Password
              </label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded border border-slate-200 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#202428] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-slate-800 dark:focus:border-slate-400 focus:bg-white dark:focus:bg-[#202428] font-mono transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-slate-900 dark:bg-white py-2.5 text-xs font-semibold text-white dark:text-slate-900 shadow-xs hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white dark:border-slate-900 border-t-transparent" />
                <span>Authenticating...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 dark:border-[#30363d] pt-4 text-center text-xs text-slate-500 dark:text-[#a1a8b0]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-slate-900 dark:text-white hover:underline"
          >
            Create account →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#111315] text-slate-900 dark:text-[#f3f4f6] flex flex-col transition-colors duration-150">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6">
        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-sm h-80 animate-pulse rounded-lg bg-slate-200 dark:bg-[#202428]" />
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
