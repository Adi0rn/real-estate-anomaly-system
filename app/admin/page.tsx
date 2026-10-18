"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import AnomalyRadar from "@/components/AnomalyRadar";
import DatabaseNotice from "@/components/DatabaseNotice";
import PropertyDetailModal from "@/components/PropertyDetailModal";
import { AnomalyRecord } from "@/types";

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

  const [isReviewingId, setIsReviewingId] = useState<number | null>(null);
  const [reviewMessage, setReviewMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Fetch anomalies (secured API: requires ADMIN)
  const fetchAnomalies = useCallback(async () => {
    try {
      const res = await fetch("/api/anomalies");
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(data.error || "Administrator authorization required.");
        }
        setIsDbConnected(false);
        throw new Error(data.error || "Failed to retrieve anomalies.");
      }

      setIsDbConnected(true);
      setAnomalies(data.anomalies || []);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load anomalies";
      setError(message);
      setAnomalies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize: verify auth and load anomalies if admin
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();

        if (!isMounted) return;

        if (!authData?.authenticated || !authData?.user) {
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
        text: `Anomaly #${anomalyId} successfully marked as ${decision}.`,
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
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-3 text-xs text-zinc-400">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  // Non-admin view (role === "USER")
  if (user && user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-20 text-center">
          <div className="rounded-3xl border border-red-200 bg-white p-10 shadow-xs dark:border-red-900/50 dark:bg-zinc-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl text-red-600 dark:bg-red-950/50 dark:text-red-400 mb-4">
              🚫
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Access Restricted to Administrators
            </h1>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              You are currently signed in as <strong>{user.email}</strong> with role{" "}
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">USER</span>.
              Reviewing and managing pricing anomaly alerts requires an authenticated ADMIN role.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/"
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Return Home
              </Link>
              <Link
                href="/login?redirect=/admin"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
              >
                Sign In with Admin Account
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Admin view
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      <Navbar isDbConnected={isDbConnected} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-6">
          {/* Admin Header */}
          <div className="rounded-3xl bg-zinc-900 px-6 py-8 sm:px-8 sm:py-10 text-white shadow-md relative overflow-hidden dark:bg-zinc-900 dark:border dark:border-zinc-800">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                  Administrator Console
                </span>
                <span className="text-xs text-zinc-400">Authenticated: {user?.name} ({user?.email})</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Statistical Pricing Anomaly Review
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                Review flagged outliers where property pricing deviates significantly from the median of local comparable listings. As an authenticated administrator, you can confirm valid anomalies or dismiss false positives.
              </p>
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
        </div>
      </main>

      {/* Property Details Modal */}
      <PropertyDetailModal
        propertyId={selectedPropertyId}
        onClose={() => setSelectedPropertyId(null)}
      />
    </div>
  );
}
