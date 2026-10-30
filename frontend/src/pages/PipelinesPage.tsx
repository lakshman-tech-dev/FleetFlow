import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Play, CheckCircle2, XCircle, Clock, FileCode, ShieldCheck, ArrowRight, RefreshCw } from "lucide-react";
import { apiClient } from "../api/client";
import { PipelineRun } from "../types/api";
import { StatusBadge, Badge } from "../components/ui/Badge";
import { TopBar } from "../components/layout/TopBar";
import { useAuth } from "../context/AuthContext";

export const PipelinesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pipeline_history"],
    queryFn: apiClient.getPipelineHistory,
    refetchInterval: 10000,
  });

  const runPipelineMutation = useMutation({
    mutationFn: (pipelineName: string) => apiClient.triggerPipeline(pipelineName),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_history"] });
      setSelectedRun(result);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Pipeline execution failed");
    },
  });

  const pipelines = [
    {
      id: "daily_fleet_analytics",
      name: "Daily Fleet ETL & Parquet Transformation",
      description: "Extracts PostgreSQL operational trips, validates schemas, quarantines anomalies, calculates tonne-km carbon metrics, and generates Parquet artifacts.",
      format: "Apache Parquet (pyarrow)",
      storage: "Local Analytical Store / Azure Blob Storage",
    },
    {
      id: "fuel_efficiency_aggregation",
      name: "Fuel & Powertrain Consumption Reconciliation",
      description: "Aggregates liters consumed vs odometer deltas, computes L/100km and kg CO2 per freight segment.",
      format: "Apache Parquet / Analytics View",
      storage: "Local Store",
    },
  ];

  const runs = data?.items || [];
  const latestRun = runs[0];

  return (
    <div className="pb-12">
      <TopBar title="Data Engineering & Pipeline Workspace" subtitle="Automated ETL jobs, Parquet analytical storage, and quarantine audit logs" />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Architecture & Telemetry Banner */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Database className="w-4 h-4" />
                <span>Repeatable & Idempotent Data Engineering</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Analytical Storage & Cloud Lake Adapter</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Operational records from PostgreSQL 18 are ingested, cleaned via schema rules, quarantined upon missing fields, transformed with emissions metrics, and written to compressed Parquet files. Compatible with local disk and Azure Blob Storage.
              </p>
            </div>
            {hasRole(["admin", "fleet_manager", "analyst"]) && (
              <button
                onClick={() => runPipelineMutation.mutate("daily_fleet_analytics")}
                disabled={runPipelineMutation.isPending}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${runPipelineMutation.isPending ? "animate-spin" : ""}`} />
                {runPipelineMutation.isPending ? "Executing Pipeline..." : "Execute Daily Fleet Pipeline"}
              </button>
            )}
          </div>
        </div>

        {/* Pipeline Catalogue */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Pipeline Catalogue</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pipelines.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                    <Badge variant="info">{p.format}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mb-4">{p.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">{p.storage}</span>
                  {hasRole(["admin", "fleet_manager", "analyst"]) && (
                    <button
                      onClick={() => runPipelineMutation.mutate(p.id)}
                      disabled={runPipelineMutation.isPending}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" /> Run Job
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Execution History Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pipeline Execution Audit Log</h3>
              <p className="text-xs text-slate-500">Every run records duration, ingestion counts, and artifact paths</p>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["pipeline_history"] })}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
            >
              Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Pipeline Name</th>
                  <th className="py-3 px-4">Trigger</th>
                  <th className="py-3 px-4">Ingested</th>
                  <th className="py-3 px-4">Transformed</th>
                  <th className="py-3 px-4">Rejected / Quarantined</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Artifact Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">Loading pipeline audit records...</td>
                  </tr>
                ) : runs.length > 0 ? (
                  runs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">#{r.id}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{r.pipeline_name}</td>
                      <td className="py-3.5 px-4 capitalize">{r.trigger_type}</td>
                      <td className="py-3.5 px-4 tabular-nums">{r.records_ingested} rows</td>
                      <td className="py-3.5 px-4 tabular-nums text-emerald-700 font-bold">{r.records_transformed} rows</td>
                      <td className="py-3.5 px-4 tabular-nums">
                        {r.records_rejected > 0 ? (
                          <span className="text-amber-600 font-bold">{r.records_rejected} quarantined</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">{Number(r.execution_duration_seconds).toFixed(2)}s</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 max-w-xs truncate" title={r.parquet_artifact_path || ""}>
                        {r.parquet_artifact_path || "--"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">No pipeline runs on record. Click 'Execute' above to test.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
