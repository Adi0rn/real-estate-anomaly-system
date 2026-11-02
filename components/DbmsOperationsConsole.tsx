"use client";

import React, { useState, useEffect, useCallback } from "react";
import DbmsSchemaExplorer from "@/components/DbmsSchemaExplorer";
import { formatINR } from "@/src/lib/property-images";
import { IconBuilding, IconRefresh, IconTrendingUp, IconTrendingDown } from "@/components/icons";

interface ConsoleProperty {
  propertyId: number;
  title: string;
  description: string;
  propertyType: string;
  listingType: string;
  price: number;
  areaSqft: number;
  bedrooms: number;
  bathrooms: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
  ownerId: number;
  priceHistoryCount: number;
  createdAt: string;
}

interface PriceHistoryEntry {
  priceId: number;
  propertyId: number;
  price: number;
  recordedAt: string;
  previousPrice: number | null;
  priceDifference: number | null;
}

export default function DbmsOperationsConsole() {
  const [properties, setProperties] = useState<ConsoleProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [selectedPropertyHistory, setSelectedPropertyHistory] = useState<PriceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sub-Navigation: Operations vs Schema Explorer
  const [activeConsoleView, setActiveConsoleView] = useState<"operations" | "schema">("operations");

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: "Luxury 3 BHK Penthouse in Bandra West",
    description: "Premium sea-facing penthouse with expansive balcony and private elevators.",
    propertyType: "APARTMENT",
    listingType: "SALE",
    price: "18500000",
    areaSqft: "1850",
    bedrooms: "3",
    bathrooms: "3",
    address: "Bandra Reclamation, Bandra West",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [lastCreatedRecord, setLastCreatedRecord] = useState<ConsoleProperty | null>(null);

  // Update Price State
  const [newPriceInput, setNewPriceInput] = useState<string>("");
  const [isSubmittingPrice, setIsSubmittingPrice] = useState<boolean>(false);
  const [triggerAuditFeedback, setTriggerAuditFeedback] = useState<{
    oldPrice: number;
    newPrice: number;
    latestPriceHistory: PriceHistoryEntry | null;
    historyCount: number;
  } | null>(null);

  // Delete State
  const [propertyToDelete, setPropertyToDelete] = useState<ConsoleProperty | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Collapsible SQL Inspector
  const [isSqlInspectorOpen, setIsSqlInspectorOpen] = useState<boolean>(false);

  // Fetch list of console-created DRAFT properties
  const fetchConsoleProperties = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/dbms/properties");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load DBMS Console properties.");
      }
      setProperties(data.properties || []);
      if (data.properties.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(data.properties[0].propertyId);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error fetching properties");
    } finally {
      setIsLoading(false);
    }
  }, [selectedPropertyId]);

  // Fetch longitudinal history for selected property
  const fetchPropertyHistory = useCallback(async (propertyId: number) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/dbms/properties/${propertyId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedPropertyHistory(data.priceHistory || []);
      }
    } catch {
      // Non-blocking history load
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadProps = async () => {
      try {
        const res = await fetch("/api/admin/dbms/properties");
        const data = await res.json();
        if (ignore) return;
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load DBMS Console properties.");
        }
        setProperties(data.properties || []);
        if (data.properties.length > 0) {
          setSelectedPropertyId((prev) => prev ?? data.properties[0].propertyId);
        }
      } catch (err: unknown) {
        if (!ignore) setErrorMessage(err instanceof Error ? err.message : "Error fetching properties");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    loadProps();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!selectedPropertyId) {
      return;
    }

    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/admin/dbms/properties/${selectedPropertyId}`);
        const data = await res.json();
        if (ignore) return;
        if (res.ok && data.success) {
          setSelectedPropertyHistory(data.priceHistory || []);
        }
      } catch {
        // Non-blocking history load
      } finally {
        if (!ignore) setIsLoadingHistory(false);
      }
    };
    loadHistory();
    return () => {
      ignore = true;
    };
  }, [selectedPropertyId]);

  // Handle Create Property
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTriggerAuditFeedback(null);

    try {
      const res = await fetch("/api/admin/dbms/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create property.");
      }

      setSuccessMessage(
        `Property #${data.propertyId} created successfully with [DBMS CONSOLE] prefix and status = DRAFT.`
      );
      setLastCreatedRecord(data.property);
      setSelectedPropertyId(data.propertyId);
      await fetchConsoleProperties();
      await fetchPropertyHistory(data.propertyId);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Update Price
  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) return;

    const numPrice = Number(newPriceInput);
    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMessage("Please enter a valid positive price.");
      return;
    }

    setIsSubmittingPrice(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/dbms/properties/${selectedPropertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPrice: numPrice }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Price update failed.");
      }

      setTriggerAuditFeedback({
        oldPrice: data.oldPrice,
        newPrice: data.newPrice,
        latestPriceHistory: data.latestPriceHistory,
        historyCount: data.historyCount,
      });

      setSuccessMessage(
        `Property #${selectedPropertyId} price updated from ${formatINR(data.oldPrice)} to ${formatINR(
          data.newPrice
        )}. Trigger property_price_history_trigger successfully recorded audit row!`
      );
      setNewPriceInput("");
      await fetchConsoleProperties();
      await fetchPropertyHistory(selectedPropertyId);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Price update failed");
    } finally {
      setIsSubmittingPrice(false);
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!propertyToDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/dbms/properties/${propertyToDelete.propertyId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Deletion failed.");
      }

      setSuccessMessage(
        `Property #${data.deletedPropertyId} ("${data.title}") and all cascaded PriceHistory rows deleted successfully.`
      );
      setPropertyToDelete(null);
      if (selectedPropertyId === propertyToDelete.propertyId) {
        setSelectedPropertyId(null);
      }
      await fetchConsoleProperties();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Deletion failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedProperty = properties.find((p) => p.propertyId === selectedPropertyId);

  return (
    <div className="space-y-6">
      {/* Navigation Bar inside Operations Console */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#30363d] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              DBMS Interactive Operations & Schema Console
            </h2>
            <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
              DDL / DML Safe Sandbox
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#a1a8b0] mt-1">
            Execute scoped transactions, trigger validations, and live catalog inspections strictly within administrative boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-0.5 text-xs">
            <button
              onClick={() => setActiveConsoleView("operations")}
              className={`px-3 py-1 font-semibold rounded transition-colors ${
                activeConsoleView === "operations"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Operations Console
            </button>
            <button
              onClick={() => setActiveConsoleView("schema")}
              className={`px-3 py-1 font-semibold rounded transition-colors ${
                activeConsoleView === "schema"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Schema Explorer
            </button>
          </div>

          <button
            onClick={() => {
              fetchConsoleProperties();
              if (selectedPropertyId) fetchPropertyHistory(selectedPropertyId);
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#191c1f] px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#202428] transition-colors"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/80 dark:bg-emerald-950/20 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-start justify-between">
          <div>
            <span className="font-bold mr-1.5">Success:</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 font-mono text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/80 dark:bg-rose-950/20 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-start justify-between">
          <div>
            <span className="font-bold mr-1.5">Error:</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 font-mono text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Schema View */}
      {activeConsoleView === "schema" && <DbmsSchemaExplorer />}

      {/* Operations View */}
      {activeConsoleView === "operations" && (
        <div className="space-y-6">
          {/* Top Grid: Create Property Form (Left) & Active Property Actions (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Section A: Create Property Form */}
            <div className="lg:col-span-6 rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-5 shadow-2xs space-y-4">
              <div className="border-b border-slate-200 dark:border-[#30363d] pb-3">
                <div className="flex items-center gap-2">
                  <IconBuilding className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Section A: Create DRAFT Console Property
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-[#a1a8b0] mt-0.5">
                  Inserts into &quot;Property&quot; with automatic &quot;[DBMS CONSOLE]&quot; prefix and creates the initial &quot;PriceHistory&quot; baseline row in an atomic transaction.
                </p>
              </div>

              <form onSubmit={handleCreateProperty} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Title (Prefix [DBMS CONSOLE] will be auto-appended)
                  </label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    required
                    className="w-full rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    required
                    className="w-full rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Property Type
                    </label>
                    <select
                      value={createForm.propertyType}
                      onChange={(e) => setCreateForm({ ...createForm, propertyType: e.target.value })}
                      className="w-full rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="APARTMENT">APARTMENT</option>
                      <option value="HOUSE">HOUSE</option>
                      <option value="VILLA">VILLA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Listing Type
                    </label>
                    <select
                      value={createForm.listingType}
                      onChange={(e) => setCreateForm({ ...createForm, listingType: e.target.value })}
                      className="w-full rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="SALE">SALE</option>
                      <option value="RENT">RENT</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={createForm.price}
                      onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                      required
                      min="1"
                      className="w-full rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Area (Sq.ft)
                    </label>
                    <input
                      type="number"
                      value={createForm.areaSqft}
                      onChange={(e) => setCreateForm({ ...createForm, areaSqft: e.target.value })}
                      required
                      min="100"
                      className="w-full rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Bedrooms / Baths
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        title="Bedrooms"
                        value={createForm.bedrooms}
                        onChange={(e) => setCreateForm({ ...createForm, bedrooms: e.target.value })}
                        required
                        min="0"
                        className="w-1/2 rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-2 py-1.5 text-slate-900 dark:text-white font-mono"
                      />
                      <input
                        type="number"
                        title="Bathrooms"
                        value={createForm.bathrooms}
                        onChange={(e) => setCreateForm({ ...createForm, bathrooms: e.target.value })}
                        required
                        min="0"
                        className="w-1/2 rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-2 py-1.5 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={createForm.city}
                      onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                      required
                      className="w-full rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={createForm.state}
                      onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                      required
                      className="w-full rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={createForm.pincode}
                      onChange={(e) => setCreateForm({ ...createForm, pincode: e.target.value })}
                      required
                      className="w-full rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={createForm.address}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    required
                    className="w-full rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Owner: Current Administrator • Status: DRAFT
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingCreate}
                    className="rounded bg-indigo-600 hover:bg-indigo-700 px-4 py-2 font-bold text-white transition-colors disabled:opacity-50"
                  >
                    {isSubmittingCreate ? "Executing Transaction..." : "Insert Property (Atomic Tx)"}
                  </button>
                </div>
              </form>

              {lastCreatedRecord && (
                <div className="rounded border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 text-xs space-y-1 font-mono">
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">
                    Newly Created Property ID: #{lastCreatedRecord.propertyId}
                  </span>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    Title: {lastCreatedRecord.title} • Price: {formatINR(lastCreatedRecord.price)}
                  </div>
                </div>
              )}
            </div>

            {/* Section B & C: Console Properties & Price Update / Delete */}
            <div className="lg:col-span-6 space-y-6">
              {/* Properties List Selector */}
              <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-5 shadow-2xs space-y-3">
                <div className="border-b border-slate-200 dark:border-[#30363d] pb-2 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Eligible DBMS Console Properties ({properties.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#a1a8b0]">
                      Showing only [DBMS CONSOLE] DRAFT records owned by your administrator account.
                    </p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="py-6 text-center text-xs text-slate-500 font-mono">
                    Loading console records...
                  </div>
                ) : properties.length === 0 ? (
                  <div className="p-4 rounded border border-dashed border-slate-300 dark:border-[#30363d] text-center text-xs text-slate-500 dark:text-slate-400">
                    No DBMS Console DRAFT properties found. Use Section A to create your first test record!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {properties.map((p) => (
                      <div
                        key={p.propertyId}
                        onClick={() => setSelectedPropertyId(p.propertyId)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors flex items-center justify-between ${
                          selectedPropertyId === p.propertyId
                            ? "border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30"
                            : "border-slate-200 dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#202428]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                            <span className="font-mono text-indigo-600 dark:text-indigo-400">
                              #{p.propertyId}
                            </span>
                            <span className="truncate max-w-xs">{p.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {p.city}, {p.state} • {p.propertyType} • {p.listingType} • {p.priceHistoryCount} revisions
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {formatINR(p.price)}
                          </span>
                          <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-mono uppercase">
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section B: Update Price & Trigger Test */}
              {selectedProperty && (
                <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-5 shadow-2xs space-y-4">
                  <div className="border-b border-slate-200 dark:border-[#30363d] pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Section B: Update Price &amp; Trigger Execution
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#a1a8b0]">
                        Selected: #{selectedProperty.propertyId} • Current: {formatINR(selectedProperty.price)}
                      </p>
                    </div>

                    {/* Section C: Delete Button */}
                    <button
                      type="button"
                      onClick={() => setPropertyToDelete(selectedProperty)}
                      className="px-2.5 py-1 rounded border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-semibold transition-colors"
                    >
                      Delete Property
                    </button>
                  </div>

                  <form onSubmit={handleUpdatePrice} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        New Price Amount (₹)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="e.g. 19500000"
                          value={newPriceInput}
                          onChange={(e) => setNewPriceInput(e.target.value)}
                          required
                          min="1"
                          className="flex-1 rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#141619] px-3 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={isSubmittingPrice || !newPriceInput}
                          className="rounded bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 font-bold text-white transition-colors disabled:opacity-50"
                        >
                          {isSubmittingPrice ? "Triggering..." : "Update Price (Invoke Trigger)"}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Trigger Feedback Banner */}
                  {triggerAuditFeedback && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 text-xs font-mono space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Database Trigger &quot;property_price_history_trigger&quot; Executed</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 text-[11px] grid grid-cols-2 gap-2">
                        <div>Old Price: {formatINR(triggerAuditFeedback.oldPrice)}</div>
                        <div>New Price: {formatINR(triggerAuditFeedback.newPrice)}</div>
                        <div>Trigger Created PriceID: #{triggerAuditFeedback.latestPriceHistory?.priceId}</div>
                        <div>Total Revisions: {triggerAuditFeedback.historyCount}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section D: Property Price History & LAG() Analytics */}
          {selectedProperty && (
            <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#30363d] pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Section D: Property #{selectedProperty.propertyId} Price Revision History
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#a1a8b0]">
                    Chronological audit log populated by PostgreSQL trigger with window-function LAG() delta analysis.
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-500">
                  {selectedPropertyHistory.length} audit row(s)
                </span>
              </div>

              {isLoadingHistory ? (
                <div className="py-6 text-center text-xs text-slate-500 font-mono">
                  Loading price history records...
                </div>
              ) : selectedPropertyHistory.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center font-mono">
                  No PriceHistory entries found for this property.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 dark:bg-[#141619] text-slate-600 dark:text-slate-400 text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Price ID</th>
                        <th className="py-2 px-3">Recorded At</th>
                        <th className="py-2 px-3">Recorded Price</th>
                        <th className="py-2 px-3">Previous Price (LAG)</th>
                        <th className="py-2 px-3">Revision Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#252a30] text-[11px]">
                      {selectedPropertyHistory.map((h) => {
                        const delta = h.priceDifference;
                        const hasDelta = delta !== null && delta !== undefined;
                        const isUp = hasDelta && delta > 0;
                        const isDown = hasDelta && delta < 0;

                        return (
                          <tr key={h.priceId} className="hover:bg-slate-50/50 dark:hover:bg-[#1e2227]">
                            <td className="py-2 px-3 text-slate-500">#{h.priceId}</td>
                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                              {new Date(h.recordedAt).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                              {formatINR(h.price)}
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {h.previousPrice ? formatINR(h.previousPrice) : "— (Initial)"}
                            </td>
                            <td className="py-2 px-3">
                              {hasDelta ? (
                                <span
                                  className={`inline-flex items-center gap-1 font-semibold ${
                                    isUp
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : isDown
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {isUp && <IconTrendingUp className="w-3 h-3" />}
                                  {isDown && <IconTrendingDown className="w-3 h-3" />}
                                  {isUp ? "+" : ""}
                                  {formatINR(delta)}
                                </span>
                              ) : (
                                <span className="text-slate-400">Baseline</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section E: Collapsible SQL Statement Inspector */}
          <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] shadow-2xs overflow-hidden">
            <button
              onClick={() => setIsSqlInspectorOpen(!isSqlInspectorOpen)}
              className="w-full flex items-center justify-between p-4 bg-slate-50/80 dark:bg-[#202428]/60 hover:bg-slate-100 dark:hover:bg-[#272c33] transition-colors text-xs font-bold text-slate-900 dark:text-white"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                  SQL Inspector
                </span>
                <span>Section E: Parameterized SQL Statements &amp; Schema DDL</span>
              </div>
              <span className="font-mono text-slate-400">{isSqlInspectorOpen ? "▲ Hide" : "▼ Expand"}</span>
            </button>

            {isSqlInspectorOpen && (
              <div className="p-4 space-y-4 text-xs">
                <div className="text-slate-500 text-[11px]">
                  Parameterized queries used by the DBMS Console endpoints alongside the database triggers installed during schema migrations.
                </div>

                <div className="space-y-3 font-mono text-[11px]">
                  {/* 1. INSERT Property */}
                  <div className="rounded border border-slate-200 dark:border-[#30363d] p-3 bg-slate-50/50 dark:bg-[#141619]">
                    <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                      <span>1. INSERT Property [Executed in Transaction]</span>
                      <span className="text-[9px] uppercase px-1 rounded bg-indigo-100 dark:bg-indigo-950/50">DML</span>
                    </div>
                    <pre className="text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
{`INSERT INTO "Property" (
  "title", "description", "propertyType", "listingType", "price",
  "areaSqft", "bedrooms", "bathrooms", "address", "city", "state", "pincode",
  "latitude", "longitude", "status", "ownerId", "createdAt", "updatedAt"
) VALUES (
  $1, $2, $3, $4, $5,
  $6, $7, $8, $9, $10, $11, $12,
  NULL, NULL, 'DRAFT', $13, NOW(), NOW()
) RETURNING "propertyId";`}
                    </pre>
                  </div>

                  {/* 2. INSERT PriceHistory */}
                  <div className="rounded border border-slate-200 dark:border-[#30363d] p-3 bg-slate-50/50 dark:bg-[#141619]">
                    <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-bold mb-1">
                      <span>2. Initial PriceHistory Snapshot [Executed in Transaction]</span>
                      <span className="text-[9px] uppercase px-1 rounded bg-indigo-100 dark:bg-indigo-950/50">DML</span>
                    </div>
                    <pre className="text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
{`INSERT INTO "PriceHistory" ("propertyId", "price", "recordedAt")
VALUES ($1, $2, NOW())
RETURNING "priceId";`}
                    </pre>
                  </div>

                  {/* 3. UPDATE Property */}
                  <div className="rounded border border-slate-200 dark:border-[#30363d] p-3 bg-slate-50/50 dark:bg-[#141619]">
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                      <span>3. UPDATE Property (Fires Trigger) [Executed in Transaction]</span>
                      <span className="text-[9px] uppercase px-1 rounded bg-emerald-100 dark:bg-emerald-950/50">DML</span>
                    </div>
                    <pre className="text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
{`UPDATE "Property"
SET "price" = $1, "updatedAt" = NOW()
WHERE "propertyId" = $2;`}
                    </pre>
                  </div>

                  {/* 4. DELETE Property */}
                  <div className="rounded border border-slate-200 dark:border-[#30363d] p-3 bg-slate-50/50 dark:bg-[#141619]">
                    <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold mb-1">
                      <span>4. DELETE Property (FK Cascades) [Executed in Transaction]</span>
                      <span className="text-[9px] uppercase px-1 rounded bg-rose-100 dark:bg-rose-950/50">DML</span>
                    </div>
                    <pre className="text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
{`DELETE FROM "Property"
WHERE "propertyId" = $1;`}
                    </pre>
                  </div>

                  {/* 5. CREATE FUNCTION */}
                  <div className="rounded border border-slate-200 dark:border-[#30363d] p-3 bg-slate-50/50 dark:bg-[#141619]">
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold mb-1">
                      <span>5. PL/pgSQL Function: record_property_price_history()</span>
                      <span className="text-[9px] uppercase px-1 rounded bg-amber-100 dark:bg-amber-950/50">Schema DDL</span>
                    </div>
                    <pre className="text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
{`CREATE OR REPLACE FUNCTION public.record_property_price_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."PriceHistory" ("propertyId", "price", "recordedAt")
    VALUES (NEW."propertyId", NEW."price", CURRENT_TIMESTAMP);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;`}
                    </pre>
                  </div>

                  {/* 6. CREATE TRIGGER */}
                  <div className="rounded border border-slate-200 dark:border-[#30363d] p-3 bg-slate-50/50 dark:bg-[#141619]">
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold mb-1">
                      <span>6. Database Trigger: property_price_history_trigger</span>
                      <span className="text-[9px] uppercase px-1 rounded bg-amber-100 dark:bg-amber-950/50">Schema DDL</span>
                    </div>
                    <pre className="text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
{`CREATE TRIGGER property_price_history_trigger
AFTER UPDATE OF price ON public."Property"
FOR EACH ROW
WHEN (OLD.price IS DISTINCT FROM NEW.price)
EXECUTE FUNCTION public.record_property_price_history();`}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Explicit Delete Confirmation Modal */}
      {propertyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">
              Confirm Property Deletion
            </h3>
            <p className="text-xs text-slate-600 dark:text-[#a1a8b0] leading-relaxed">
              Are you sure you want to permanently delete DBMS Console record:
            </p>
            <div className="rounded border border-slate-200 dark:border-[#30363d] bg-slate-50 dark:bg-[#141619] p-3 text-xs font-mono space-y-1">
              <div><strong>Property ID:</strong> #{propertyToDelete.propertyId}</div>
              <div><strong>Title:</strong> {propertyToDelete.title}</div>
              <div><strong>City:</strong> {propertyToDelete.city}</div>
              <div><strong>Status:</strong> {propertyToDelete.status}</div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              Notice: Foreign key ON DELETE CASCADE will automatically remove all associated PriceHistory rows.
            </p>

            <div className="flex justify-end gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setPropertyToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#202428] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#272c33]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 font-bold text-white transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm & Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
