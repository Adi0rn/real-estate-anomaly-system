"use client";

import React, { useState, useEffect, useCallback } from "react";
import { IconRefresh } from "@/components/icons";

interface SchemaData {
  tables: Array<{ table_name: string; table_type: string }>;
  columns: Array<{
    table_name: string;
    column_name: string;
    data_type: string;
    udt_name: string;
    is_nullable: string;
    column_default: string | null;
    ordinal_position: number;
  }>;
  primaryKeys: Array<{
    table_name: string;
    column_name: string;
    constraint_name: string;
  }>;
  foreignKeys: Array<{
    table_name: string;
    column_name: string;
    foreign_table_name: string;
    foreign_column_name: string;
    constraint_name: string;
  }>;
  uniqueConstraints: Array<{
    table_name: string;
    column_name: string;
    constraint_name: string;
  }>;
  checkConstraints: Array<{
    table_name: string;
    constraint_name: string;
    check_clause: string;
  }>;
  indexes: Array<{
    table_name: string;
    index_name: string;
    index_definition: string;
  }>;
  views: Array<{
    view_name: string;
    view_definition: string;
  }>;
  triggers: Array<{
    trigger_name: string;
    table_name: string;
    trigger_definition: string;
  }>;
  triggerFunctions: Array<{
    function_name: string;
    function_definition: string;
  }>;
}

export default function DbmsSchemaExplorer() {
  const [data, setData] = useState<SchemaData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("Property");
  const [activeTab, setActiveTab] = useState<"tables" | "indexes" | "triggers" | "views">("tables");

  const fetchSchema = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/dbms/schema");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load database schema.");
      }
      setData(json.schema);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Schema inspection failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/dbms/schema");
        const json = await res.json();
        if (ignore) return;
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load database schema.");
        }
        setData(json.schema);
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : "Schema inspection failed");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] p-8 text-center shadow-2xs">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent inline-block" />
        <p className="mt-2 text-xs text-slate-500 dark:text-[#a1a8b0] font-mono">
          Querying PostgreSQL system catalogs (pg_class, pg_proc, pg_trigger, pg_indexes)...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-5 text-xs text-rose-700 dark:text-rose-400">
        <div className="font-semibold flex items-center justify-between">
          <span>Failed to inspect database schema catalogs</span>
          <button
            onClick={fetchSchema}
            className="text-indigo-600 dark:text-indigo-400 underline font-mono text-[11px]"
          >
            Retry
          </button>
        </div>
        <p className="mt-1 font-mono text-[11px]">{error}</p>
      </div>
    );
  }

  const tableColumns = data.columns.filter((c) => c.table_name === selectedTable);
  const tablePKs = data.primaryKeys.filter((pk) => pk.table_name === selectedTable);
  const tableFKs = data.foreignKeys.filter((fk) => fk.table_name === selectedTable);
  const tableUniques = data.uniqueConstraints.filter((u) => u.table_name === selectedTable);
  const tableChecks = data.checkConstraints.filter((ck) => ck.table_name === selectedTable);
  const tableIndexes = data.indexes.filter((idx) => idx.table_name === selectedTable);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#191c1f] shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#30363d] p-4 bg-slate-50/70 dark:bg-[#202428]/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Live PostgreSQL System Catalog Explorer
            </h3>
            <span className="font-mono text-[10px] bg-slate-200 dark:bg-[#2d333b] text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
              Read-Only
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#a1a8b0] mt-0.5">
            Real-time reflection of tables, constraints, indexes, triggers, and views in the Supabase schema.
          </p>
        </div>

        <button
          onClick={fetchSchema}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded border border-slate-300 dark:border-[#30363d] bg-white dark:bg-[#191c1f] px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#272c33] transition-colors"
        >
          <IconRefresh className="w-3.5 h-3.5" />
          <span>Refresh Catalogs</span>
        </button>
      </div>

      {/* Explorer Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-[#30363d] bg-slate-100/50 dark:bg-[#141619] px-4 pt-2 gap-2 text-xs">
        <button
          onClick={() => setActiveTab("tables")}
          className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
            activeTab === "tables"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-[#191c1f] rounded-t"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Application Tables ({data.tables.length})
        </button>
        <button
          onClick={() => setActiveTab("indexes")}
          className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
            activeTab === "indexes"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-[#191c1f] rounded-t"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Indexes & HNSW ({data.indexes.length})
        </button>
        <button
          onClick={() => setActiveTab("triggers")}
          className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
            activeTab === "triggers"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-[#191c1f] rounded-t"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Triggers & PL/pgSQL ({data.triggers.length})
        </button>
        <button
          onClick={() => setActiveTab("views")}
          className={`px-3 py-2 font-semibold border-b-2 transition-colors ${
            activeTab === "views"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-[#191c1f] rounded-t"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Relational Views ({data.views.length})
        </button>
      </div>

      {/* Tab 1: Tables & Columns */}
      {activeTab === "tables" && (
        <div className="p-4 space-y-4">
          {/* Table Selector Pills */}
          <div className="flex flex-wrap gap-1.5">
            {data.tables.map((t) => (
              <button
                key={t.table_name}
                onClick={() => setSelectedTable(t.table_name)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  selectedTable === t.table_name
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-2xs"
                    : "bg-slate-100 dark:bg-[#202428] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#272c33]"
                }`}
              >
                {t.table_name}
              </button>
            ))}
          </div>

          {/* Table Details */}
          <div className="border border-slate-200 dark:border-[#30363d] rounded-md overflow-x-auto">
            <div className="bg-slate-50 dark:bg-[#202428] px-3 py-2 border-b border-slate-200 dark:border-[#30363d] flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                Table: &quot;{selectedTable}&quot; ({tableColumns.length} columns)
              </span>
              <div className="flex gap-2 text-[11px] font-mono">
                {tablePKs.length > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    PK: {tablePKs.map((pk) => pk.column_name).join(", ")}
                  </span>
                )}
                {tableFKs.length > 0 && (
                  <span className="text-sky-600 dark:text-sky-400">
                    FKs: {tableFKs.length}
                  </span>
                )}
                {tableIndexes.length > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Indexes: {tableIndexes.length}
                  </span>
                )}
              </div>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/60 dark:bg-[#141619] text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                <tr>
                  <th className="py-1.5 px-3">#</th>
                  <th className="py-1.5 px-3">Column Name</th>
                  <th className="py-1.5 px-3">Data Type</th>
                  <th className="py-1.5 px-3">Nullable</th>
                  <th className="py-1.5 px-3">Default / Constraint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#252a30]">
                {tableColumns.map((c) => {
                  const isPK = tablePKs.some((pk) => pk.column_name === c.column_name);
                  const fk = tableFKs.find((f) => f.column_name === c.column_name);
                  const isUnique = tableUniques.some((u) => u.column_name === c.column_name);

                  return (
                    <tr
                      key={c.column_name}
                      className="hover:bg-slate-50/50 dark:hover:bg-[#1e2227] font-mono text-[11px]"
                    >
                      <td className="py-1.5 px-3 text-slate-400">{c.ordinal_position}</td>
                      <td className="py-1.5 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{c.column_name}</span>
                        {isPK && (
                          <span className="px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[9px] font-bold">
                            PK
                          </span>
                        )}
                        {isUnique && !isPK && (
                          <span className="px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-[9px]">
                            UNIQUE
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-indigo-600 dark:text-indigo-400">
                        {c.data_type === "USER-DEFINED" ? c.udt_name : c.data_type}
                      </td>
                      <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400">
                        {c.is_nullable === "YES" ? "NULL" : "NOT NULL"}
                      </td>
                      <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400">
                        {fk ? (
                          <span className="text-sky-600 dark:text-sky-400">
                            → {fk.foreign_table_name}({fk.foreign_column_name})
                          </span>
                        ) : c.column_default ? (
                          <span className="text-slate-600 dark:text-slate-300">
                            {c.column_default}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Check Constraints & Indexes summary */}
          {tableChecks.length > 0 && (
            <div className="rounded border border-slate-200 dark:border-[#30363d] p-3 text-xs bg-slate-50/50 dark:bg-[#191c1f]">
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">
                CHECK Constraints:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                {tableChecks.map((ck) => (
                  <li key={ck.constraint_name}>
                    <strong>{ck.constraint_name}:</strong> {ck.check_clause}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Indexes (including HNSW) */}
      {activeTab === "indexes" && (
        <div className="p-4 space-y-3">
          <div className="text-xs text-slate-600 dark:text-[#a1a8b0]">
            Database indexes mapped across application entities, including PostgreSQL B-Tree indexes and pgvector Approximate Nearest Neighbor (HNSW) vector search indexes.
          </div>
          <div className="space-y-2">
            {data.indexes.map((idx) => {
              const isHnsw = idx.index_definition.toLowerCase().includes("hnsw");
              return (
                <div
                  key={idx.index_name}
                  className={`p-3 rounded border text-xs font-mono transition-colors ${
                    isHnsw
                      ? "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20"
                      : "border-slate-200 dark:border-[#30363d] bg-slate-50/40 dark:bg-[#191c1f]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {idx.index_name}
                    </span>
                    <div className="flex gap-1.5 items-center">
                      <span className="text-[10px] bg-slate-200 dark:bg-[#2d333b] text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded">
                        Table: {idx.table_name}
                      </span>
                      {isHnsw && (
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold uppercase">
                          pgvector HNSW
                        </span>
                      )}
                    </div>
                  </div>
                  <pre className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-all mt-1">
                    {idx.index_definition}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Triggers & PL/pgSQL */}
      {activeTab === "triggers" && (
        <div className="p-4 space-y-4">
          <div className="text-xs text-slate-600 dark:text-[#a1a8b0]">
            Active database triggers and PL/pgSQL stored procedures registered in the PostgreSQL catalog.
          </div>

          <div className="space-y-4">
            {data.triggers.map((trg) => (
              <div
                key={trg.trigger_name}
                className="p-4 rounded-lg border border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {trg.trigger_name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded">
                    ON Table: &quot;{trg.table_name}&quot;
                  </span>
                </div>
                <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-[11px] overflow-x-auto">
                  {trg.trigger_definition}
                </div>
              </div>
            ))}

            {data.triggerFunctions.map((fn) => (
              <div
                key={fn.function_name}
                className="p-4 rounded-lg border border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/10 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      PL/pgSQL Function: {fn.function_name}()
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded">
                    Trigger Handler
                  </span>
                </div>
                <pre className="bg-slate-900 text-emerald-400 p-3 rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {fn.function_definition}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Relational Views */}
      {activeTab === "views" && (
        <div className="p-4 space-y-4">
          <div className="text-xs text-slate-600 dark:text-[#a1a8b0]">
            Persistent relational views installed in PostgreSQL system catalog (pg_class relkind = &apos;v&apos;).
          </div>
          {data.views.map((v) => (
            <div
              key={v.view_name}
              className="p-4 rounded-lg border border-slate-200 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#191c1f] text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-slate-900 dark:text-white">
                  VIEW: &quot;{v.view_name}&quot;
                </span>
                <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded">
                  Installed in public schema
                </span>
              </div>
              <pre className="bg-slate-900 text-sky-300 p-3 rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                {v.view_definition}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
