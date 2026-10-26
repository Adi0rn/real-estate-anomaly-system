"use client";

import React, { useSyncExternalStore } from "react";
import { useTheme } from "./ThemeProvider";
import { IconSun, IconMoon } from "./icons";

interface ThemeToggleProps {
  className?: string;
}

const emptySubscribe = () => () => {};

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const { theme, toggleTheme } = useTheme();

  if (!isMounted) {
    return (
      <div
        className={`h-8 w-8 rounded-md border border-slate-200 dark:border-[#30363d] bg-transparent ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202428] hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-hidden focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 shadow-2xs ${className}`}
    >
      {isDark ? (
        <IconSun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-12" />
      ) : (
        <IconMoon className="h-4 w-4 text-slate-600 transition-transform duration-200 hover:-rotate-12" />
      )}
      <span className="sr-only">
        {isDark ? "Switch to light theme" : "Switch to dark theme"}
      </span>
    </button>
  );
}
