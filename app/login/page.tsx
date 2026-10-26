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
    setError(null);

    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed.");
      }

      // Successful login
      if (data.user?.role === "ADMIN" && redirectTarget === "/") {
        router.push("/admin");
      } else {
        router.push(redirectTarget);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-lg border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xs">
        <div className="mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-white mb-3">
            <IconBuilding className="w-4 h-4 text-slate-100" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-950">
            Sign In to PropAudit
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Access your valuation models and review queues
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Password
              </label>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-800 focus:bg-white font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-slate-900 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Authenticating...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-slate-900 hover:underline"
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
    <div className="min-h-screen bg-[#fbfbfa] text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6">
        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-sm h-80 animate-pulse rounded-lg bg-slate-200" />
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
