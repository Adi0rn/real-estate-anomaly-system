"use client";

import React from "react";
import { IconAlertTriangle, IconRefresh } from "@/components/icons";

type DatabaseNoticeProps = {
  errorMessage?: string;
  onRetry: () => void;
  isRetrying: boolean;
};

export default function DatabaseNotice({
  errorMessage,
  onRetry,
  isRetrying,
}: DatabaseNoticeProps) {
  return (
    <div className="rounded-lg border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-xs text-amber-900 dark:text-amber-300 shadow-2xs transition-colors">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded border border-amber-200 dark:border-amber-800/80 bg-amber-100 dark:bg-amber-900/60 p-1.5 text-amber-900 dark:text-amber-200 shrink-0 mt-0.5">
            <IconAlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Database Connection Offline
            </h3>
            <p className="mt-1 text-slate-600 dark:text-[#a1a8b0] leading-relaxed">
              The application backend requires a valid PostgreSQL connection in{" "}
              <code className="rounded bg-slate-100 dark:bg-[#202428] px-1 py-0.5 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                DATABASE_URL
              </code>{" "}
              to serve live real estate records and valuation models.
            </p>
            {errorMessage && (
              <p className="mt-1 font-mono text-[11px] text-rose-700 dark:text-rose-400">
                Diagnostics: {errorMessage}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#202428] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-[#272c33] disabled:opacity-50 transition-colors"
        >
          <IconRefresh className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
          <span>{isRetrying ? "Retrying..." : "Retry Connection"}</span>
        </button>
      </div>
    </div>
  );
}
