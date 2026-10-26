"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { IconBuilding } from "@/components/icons";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed.");
      }

      // Successful registration
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa] text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-lg border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xs">
            <div className="mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-white mb-3">
                <IconBuilding className="w-4 h-4 text-slate-100" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-950">
                Register Platform Account
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Join PropAudit to query market listings and valuation data
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
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arjun Mehta"
                  className="w-full rounded border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="arjun@example.com"
                  className="w-full rounded border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-slate-800 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                    <span>Creating Account...</span>
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
              Already registered?{" "}
              <Link
                href="/login"
                className="font-semibold text-slate-900 hover:underline"
              >
                Sign in →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
