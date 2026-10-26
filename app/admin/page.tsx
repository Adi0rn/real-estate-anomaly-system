"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import AnomalyRadar from "@/components/AnomalyRadar";
import DatabaseNotice from "@/components/DatabaseNotice";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import { AnomalyRecord } from "@/types";
import { IconShieldAlert, IconLock } from "@/components/icons";

type SafeUser = {
  userId: number;
  name: string;
  email: string;
  role: string;
};

export default function AdminPage() {
  const router = useRouter();

  const [user, setUser] = useState<SafeUser | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  // Review action state
  const [isReviewingId, setIsReviewingId] = useState<number | null>(null);
  const [reviewMessage, setReviewMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Fetch anomalies from GET /api/anomalies
  const fetchAnomalies = useCallback(async () => {
    try {
      const res = await fetch("/api/anomalies");
      const data = await res.json();

      if (res.status === 401) {
        router.push("/login?redirect=/admin");
        return;
      }

      if (res.status === 403) {
        throw new Error(data.error || "Administrative permissions required.");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to retrieve anomalies.");
      }

      setIsDbConnected(true);
      setAnomalies(data.anomalies || []);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching anomaly records";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Check authentication & load initial anomalies
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();

        if (!isMounted) return;

        if (!authRes.ok || !authData.authenticated || !authData.user) {
          router.push("/login?redirect=/admin");
          return;
        }

        setUser(authData.user);
        setAuthChecked(true);

        if (authData.user.role !== "ADMIN") {
          setIsLoading(false);
          return;
        }

        // User is ADMIN, load anomalies
        const anomRes = await fetch("/api/anomalies");
        const anomData = await anomRes.json();

        if (!isMounted) return;

        if (anomRes.ok && anomData.success) {
          setIsDbConnected(true);
          setAnomalies(anomData.anomalies || []);
          setError(null);
        } else {
          setIsDbConnected(false);
          setError(anomData.error || "Failed to retrieve anomalies.");
        }
      } catch (err: unknown) {
        if (isMounted) {
          setIsDbConnected(false);
          setError(err instanceof Error ? err.message : "Failed to load admin data");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Handle anomaly review action (Confirm / Dismiss)
  const handleReviewAnomaly = async (anomalyId: number, decision: "CONFIRMED" | "DISMISSED") => {
    setIsReviewingId(anomalyId);
    setReviewMessage(null);

    try {
      const res = await fetch(`/api/admin/anomalies/${anomalyId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Review operation failed.");
      }

      setReviewMessage({
        text: `Anomaly #${anomalyId} marked as ${decision}.`,
        type: "success",
      });

      // Update local anomaly item
      setAnomalies((prev) =>
        prev.map((item) =>
          item.anomalyId === anomalyId
            ? { ...item, status: decision }
            : item
        )
      );

      // Refresh data
      await fetchAnomalies();
    } catch (err: unknown) {
      setReviewMessage({
        text: err instanceof Error ? err.message : "Review submission failed.",
        type: "error",
      });
    } finally {
      setIsReviewingId(null);
    }
  };

  // Auth checking skeleton
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#111315] text-slate-900 dark:text-[#f3f4f6] flex items-center justify-center transition-colors">
        <div className="text-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-900 dark:border-white border-t-transparent inline-block" />
          <p className="mt-3 text-xs text-slate-500 dark:text-[#a1a8b0] font-mono">Verifying administrative credentials...</p>
        </div>
      </div>
    );
  }

  // Non-admin view (role === "USER")
  if (user && user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#111315] text-slate-900 dark:text-[#f3f4f6] transition-colors duration-150">
        <Navbar />
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
          <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-8 shadow-2xs">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-[#202428] text-slate-700 dark:text-slate-300 mb-3">
              <IconLock className="h-5 w-5" />
            </div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              Administrator Privileges Required
            </h1>
            <p className="mt-2 text-xs text-slate-600 dark:text-[#a1a8b0] max-w-md mx-auto leading-relaxed">
              Signed in as <strong>{user.email}</strong> with standard role{" "}
              <span className="font-mono text-[11px] bg-slate-100 dark:bg-[#202428] px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">
                {user.role}
              </span>. Reviewing and confirming pricing anomalies requires an authenticated ADMIN account.
            </p>
            <div className="mt-6 flex justify-center gap-3 text-xs">
              <Link
                href="/"
                className="rounded-md border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#202428] px-3 py-1.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#272c33] transition-colors"
              >
                Return to Marketplace
              </Link>
              <Link
                href="/login?redirect=/admin"
                className="rounded-md bg-slate-900 dark:bg-white px-3 py-1.5 font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
              >
                Switch Account
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Admin view
  return (
    <div className="min-h-screen bg-[#fbfbfa] dark:bg-[#111315] text-slate-900 dark:text-[#f3f4f6] transition-colors duration-150">
      <Navbar isDbConnected={isDbConnected} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        {/* Admin Header */}
        <div className="border-b border-slate-200/90 dark:border-[#30363d] pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-[#a1a8b0] mb-1.5">
                <IconShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Auditing Console • Authenticated Admin</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                Statistical Pricing Anomaly Review
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-[#a1a8b0] max-w-2xl leading-relaxed">
                Supervise automated pricing valuation anomalies. Confirm valid market discrepancies or dismiss false positive alerts generated by machine learning benchmarks.
              </p>
            </div>

            <div className="rounded border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 shadow-2xs self-start md:self-auto font-mono">
              <span className="text-slate-400 dark:text-slate-500">Auditor:</span> {user?.name} ({user?.email})
            </div>
          </div>
        </div>

        {/* Database Notice */}
        {isDbConnected === false && (
          <DatabaseNotice
            errorMessage={error || undefined}
            onRetry={() => {
              setIsLoading(true);
              fetchAnomalies();
            }}
            isRetrying={isLoading}
          />
        )}

        {/* Anomaly Radar with Live Review Actions */}
        <AnomalyRadar
          anomalies={anomalies}
          isLoading={isLoading}
          error={error}
          onSelectProperty={(id) => setSelectedPropertyId(id)}
          onRefresh={() => {
            setIsLoading(true);
            fetchAnomalies();
          }}
          isAdmin={true}
          onReviewAnomaly={handleReviewAnomaly}
          isReviewingId={isReviewingId}
          reviewMessage={reviewMessage}
        />
      </main>

      {/* Property Details Quick Modal */}
      <PropertyDetailModal
        propertyId={selectedPropertyId}
        onClose={() => setSelectedPropertyId(null)}
      />
    </div>
  );
}
