"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconSparkles, IconShieldAlert, IconBuilding, IconX } from "@/components/icons";
import ThemeToggle from "@/components/ThemeToggle";

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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-[#30363d] bg-[#fbfbfa]/95 dark:bg-[#111315]/95 backdrop-blur-sm transition-colors duration-150">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-xs group-hover:bg-slate-800 dark:group-hover:bg-slate-100 transition-colors">
            <IconBuilding className="w-4 h-4 text-slate-100 dark:text-slate-900" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                PROPAUDIT
              </span>
              <span className="hidden sm:inline-block border border-slate-200 dark:border-[#30363d] bg-slate-100 dark:bg-[#202428] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 rounded">
                Analytics
              </span>
            </div>
            <span className="hidden text-[10px] text-slate-500 dark:text-[#a1a8b0] tracking-wide sm:block">
              Valuation & Anomaly Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-1 text-xs shadow-2xs transition-colors">
          <Link
            href="/"
            onClick={() => {
              if (isHome && onSectionSelect) onSectionSelect("explore");
            }}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              isHome && activeSection !== "semantic"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "text-slate-600 dark:text-[#a1a8b0] hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Listings
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
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              isHome && activeSection === "semantic"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "text-slate-600 dark:text-[#a1a8b0] hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <IconSparkles className="w-3.5 h-3.5 opacity-80" />
            <span>Semantic Search</span>
          </button>

          <Link
            href="/admin"
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              isAdmin
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "text-slate-600 dark:text-[#a1a8b0] hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <IconShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Anomaly Audit</span>
          </Link>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Theme Toggle (Desktop & Mobile accessible) */}
          <ThemeToggle />

          {/* Database Connectivity Status */}
          {isDbConnected === true ? (
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span>Live Database</span>
            </div>
          ) : isDbConnected === false ? (
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Database Offline</span>
            </div>
          ) : null}

          {/* User Auth */}
          <div className="hidden sm:flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] px-2.5 py-1 text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <span
                    className={`rounded px-1 text-[9px] font-bold uppercase tracking-wider ${
                      user.role === "ADMIN"
                        ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                        : "bg-slate-100 dark:bg-[#272c33] text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-md border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#202428] transition-colors disabled:opacity-50"
                >
                  {isLoggingOut ? "..." : "Sign Out"}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-slate-900 dark:bg-white px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900 shadow-2xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202428] md:hidden transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <IconX className="h-5 w-5" />
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 dark:border-[#30363d] bg-[#fbfbfa] dark:bg-[#111315] px-4 py-3 md:hidden space-y-2 transition-colors">
          {user && (
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-[#30363d] text-xs">
              <span className="font-semibold text-slate-900 dark:text-white">{user.name}</span>
              <span className="rounded bg-slate-100 dark:bg-[#202428] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
            className="block rounded-md px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202428] transition-colors"
          >
            Marketplace Listings
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
            className="w-full text-left rounded-md px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202428] flex items-center gap-2 transition-colors"
          >
            <IconSparkles className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
            <span>Semantic Vector Search</span>
          </button>
          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-md px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#202428] flex items-center gap-2 transition-colors"
          >
            <IconShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Anomaly Audit Console</span>
          </Link>

          {/* Dedicated Mobile Theme Toggle Row */}
          <div className="flex items-center justify-between px-3 py-2 rounded-md bg-slate-50 dark:bg-[#191c1f] border border-slate-200/80 dark:border-[#30363d] text-xs">
            <span className="font-medium text-slate-700 dark:text-slate-300">Theme</span>
            <ThemeToggle />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-[#30363d] flex flex-col gap-2">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left rounded-md px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                Sign Out
              </button>
            ) : (
              <div className="flex gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center rounded-md border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] py-2 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center rounded-md bg-slate-900 dark:bg-white py-2 text-xs font-semibold text-white dark:text-slate-900 transition-colors"
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
