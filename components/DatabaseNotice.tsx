"use client";

import React from "react";

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
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Database Connection Required for Live Data
            </h3>
            <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
              The backend API cannot connect to PostgreSQL because{" "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-[11px] font-semibold text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
                DATABASE_URL
              </code>{" "}
              is not yet configured in your local environment.
            </p>
            {errorMessage && (
              <p className="mt-1.5 font-mono text-[11px] text-amber-900/90 dark:text-amber-300/90">
                Server response: {errorMessage}
              </p>
            )}
            <div className="mt-3 text-xs text-amber-900/90 dark:text-amber-200/90">
              <span className="font-medium">To connect live property data:</span>
              <ol className="mt-1 list-inside list-decimal space-y-0.5 text-amber-800/80 dark:text-amber-300/80 text-[11px]">
                <li>
                  Obtain the Supabase PostgreSQL connection string from the project administrator.
                </li>
                <li>
                  Create a <code className="font-mono">.env</code> file in the repository root with:{" "}
                  <code className="font-mono">DATABASE_URL=&quot;...&quot;</code>
                </li>
                <li>Click &quot;Retry Connection&quot; below to re-query the backend.</li>
              </ol>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {isRetrying ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Checking...
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry Connection
            </>
          )}
        </button>
      </div>
    </div>
  );
}
