"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type SafeUser = {
  userId: number;
  name: string;
  email: string;
  role: string;
};

type NavbarProps = {
  isDbConnected?: boolean | null;
  activeSection?: "explore" | "semantic";
  onSectionSelect?: (section: "explore" | "semantic") => void;
};

export default function Navbar({
  isDbConnected,
  activeSection,
  onSectionSelect,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isHome = pathname === "/";
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.authenticated && data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // Unauthenticated or network error
      });

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-md shadow-indigo-500/20 text-white font-bold text-lg group-hover:scale-105 transition-transform">
            🏢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-lg">
                PropAnomaly
              </span>
              <span className="hidden sm:inline-block rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                AI Radar
              </span>
            </div>
            <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block">
              Valuation & Anomaly Detection System
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
          <Link
            href="/"
            onClick={() => {
              if (isHome && onSectionSelect) onSectionSelect("explore");
            }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              isHome && activeSection !== "semantic"
                ? "bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Home
          </Link>

          <Link
            href="/#browse"
            onClick={() => {
              if (isHome && onSectionSelect) onSectionSelect("explore");
            }}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              isHome && activeSection === "explore"
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            Browse Properties
          </Link>

          <button
            type="button"
            onClick={() => {
              if (onSectionSelect) {
                onSectionSelect("semantic");
              } else if (!isHome) {
                router.push("/#semantic");
              }
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              isHome && activeSection === "semantic"
                ? "bg-white text-indigo-600 shadow-xs dark:bg-zinc-800 dark:text-indigo-400"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>✨</span>
            <span>Semantic Search</span>
          </button>

          <Link
            href="/admin"
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              isAdmin
                ? "bg-white text-amber-600 shadow-xs dark:bg-zinc-800 dark:text-amber-400"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <span>⚠️</span>
            <span>Admin</span>
          </Link>
        </nav>

        {/* Right side auth & DB status */}
        <div className="flex items-center gap-3">
          {/* DB Indicator */}
          <div className="hidden lg:flex items-center">
            {isDbConnected === true ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live DB
              </span>
            ) : isDbConnected === false ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Offline
              </span>
            ) : null}
          </div>

          {/* User Auth Info / Actions */}
          <div className="hidden sm:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <span
                    className={`rounded-md px-1.5 py-0.2 text-[10px] font-bold ${
                      user.role === "ADMIN"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-colors"
                >
                  {isLoggingOut ? "..." : "Logout"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:hidden space-y-2">
          {user && (
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user.name}</span>
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 font-bold text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {user.role}
              </span>
            </div>
          )}

          <Link
            href="/"
            onClick={() => {
              setMobileMenuOpen(false);
              if (onSectionSelect) onSectionSelect("explore");
            }}
            className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Home
          </Link>
          <Link
            href="/#browse"
            onClick={() => {
              setMobileMenuOpen(false);
              if (onSectionSelect) onSectionSelect("explore");
            }}
            className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Browse Properties
          </Link>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              if (onSectionSelect) {
                onSectionSelect("semantic");
              } else {
                router.push("/#semantic");
              }
            }}
            className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            ✨ AI Semantic Search
          </button>
          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            ⚠️ Admin Anomaly Radar
          </Link>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Log Out
              </button>
            ) : (
              <div className="flex gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center rounded-xl border border-zinc-200 py-2 text-xs font-semibold text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
