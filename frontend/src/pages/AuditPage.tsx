import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Eye,
  RefreshCw,
  User,
  Clock,
  Terminal,
} from "lucide-react";
import { apiClient } from "../api/client";
import { AuditLog } from "../types/api";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { StatCard } from "../components/ui/StatCard";
import { TopBar } from "../components/layout/TopBar";

export const AuditPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit", searchTerm],
    queryFn: () => apiClient.getAuditLogs({ search: searchTerm || undefined }),
  });

  const auditLogs = data?.items || [];

  const filteredLogs = auditLogs.filter((log) => {
    if (outcomeFilter !== "all" && log.outcome !== outcomeFilter) return false;
    return true;
  });

  const totalLogs = auditLogs.length;
  const successLogs = auditLogs.filter((l) => l.outcome === "success").length;
  const deniedLogs = auditLogs.filter((l) => l.outcome === "denied" || l.outcome === "failure").length;
  const uniqueActors = new Set(auditLogs.map((l) => l.actor_email)).size;

  return (
    <div className="pb-12">
      <TopBar title="Audit & Governance Trail" subtitle="Immutable system event log, role-based access verifications, and compliance tracking" />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Security Event Stream</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit stream monitoring server-side authorization decisions and database mutations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-teal-600" : ""}`} />
              Refresh Stream
            </button>
          </div>
        </div>

      {/* Security Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Recorded Events"
          value={totalLogs}
          subtitle="Persistent audit logs"
          icon={Shield}
        />
        <StatCard
          title="Authorized Actions"
          value={successLogs}
          subtitle="100% verified RBAC grants"
          icon={CheckCircle}
        />
        <StatCard
          title="Access Exceptions"
          value={deniedLogs}
          subtitle="Denied / failed access"
          icon={deniedLogs > 0 ? AlertTriangle : Lock}
        />
        <StatCard
          title="Active Principals"
          value={uniqueActors}
          subtitle="Distinct system accounts"
          icon={User}
        />
      </div>

      {/* Security Compliance Banner */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/20 text-teal-400 rounded-lg shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Cryptographic Data Sanitization Active</h3>
            <p className="text-xs text-slate-300">
              Audit trails strictly exclude passwords, raw tokens, and PII keys. All entries are append-only.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-teal-400" />
          <span>AUDIT_ENCRYPTION: SHA-256 / AES-GCM</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor, action, entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Outcome:</span>
          </div>
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="all">All Outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="denied">Denied</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading security event stream...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No matching audit events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp (UTC)</th>
                  <th className="px-4 py-3">Actor Email</th>
                  <th className="px-4 py-3">Security Action</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900 text-xs">
                        {log.actor_email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 capitalize">
                        {log.entity_type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-slate-500">
                        {log.entity_id || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.outcome === "success" ? (
                          <Badge variant="success">SUCCESS</Badge>
                        ) : log.outcome === "denied" ? (
                          <Badge variant="danger">DENIED</Badge>
                        ) : (
                          <Badge variant="warning">FAILURE</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium px-2 py-1 rounded hover:bg-teal-50 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Event Details Inspection */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event #${selectedLog.id} — ${selectedLog.action}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Actor Principal:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedLog.actor_email}</p>
              </div>
              <div>
                <span className="text-slate-400">Timestamp:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{new Date(selectedLog.timestamp).toUTCString()}</p>
              </div>
              <div>
                <span className="text-slate-400">Target Entity:</span>
                <p className="font-semibold text-slate-900 mt-0.5">{selectedLog.entity_type} (ID: {selectedLog.entity_id || "N/A"})</p>
              </div>
              <div>
                <span className="text-slate-400">Authorization Status:</span>
                <p className="font-semibold uppercase mt-0.5 text-teal-600">{selectedLog.outcome}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Audit Metadata Payload</label>
              <pre className="p-3 bg-slate-900 text-teal-400 font-mono text-xs rounded-lg overflow-x-auto max-h-60 border border-slate-800">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  </div>
  );
};
