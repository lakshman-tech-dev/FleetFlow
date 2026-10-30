import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, AlertTriangle, CheckCircle, ShieldAlert, Wrench, Fuel, Clock, ArrowRight } from "lucide-react";
import { apiClient } from "../api/client";
import { AIDetection, MaintenanceRiskItem, DeliveryDelayRiskItem } from "../types/api";
import { StatusBadge, Badge } from "../components/ui/Badge";
import { TopBar } from "../components/layout/TopBar";
import { useAuth } from "../context/AuthContext";

export const IntelligencePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<"detections" | "maintenance" | "delays">("detections");
  const [severityFilter, setSeverityFilter] = useState<string>("");

  const { data: detectionsData, isLoading: detectionsLoading } = useQuery({
    queryKey: ["detections", severityFilter],
    queryFn: () => apiClient.getDetections({ severity: severityFilter || undefined }),
  });

  const { data: maintenanceRiskData, isLoading: maintRiskLoading } = useQuery({
    queryKey: ["maint_risk"],
    queryFn: apiClient.getMaintenanceRisk,
  });

  const { data: delayRiskData, isLoading: delayRiskLoading } = useQuery({
    queryKey: ["delay_risk"],
    queryFn: apiClient.getDeliveryDelayRisk,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => apiClient.resolveDetection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detections"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to resolve detection");
    },
  });

  return (
    <div className="pb-12">
      <TopBar title="AI Intelligence & Risk Center" subtitle="Explainable anomaly detection, multi-factor maintenance risk, and delay forecasts" />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* ML Transparency Notice Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-teal-950 rounded-2xl p-6 border border-slate-800 text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Model Transparency & Explainability</span>
            </div>
            <h3 className="text-base font-bold text-white">Auditable Machine Learning Architecture</h3>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Isolation Forest is utilized for unsupervised fuel anomaly detection (persisted artifact v1.2.0). Maintenance and delay risk scoring combine physical telematics, odometer thresholds, and historical failure records with transparent, component-weighted rationales.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="block text-xs font-semibold text-teal-400">Scikit-Learn 1.6 Engine</span>
            <span className="text-[11px] text-slate-400">100% Deterministic & Explainable</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("detections")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "detections" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active Detections & Anomalies ({detectionsData?.total || 0})
            </button>
            <button
              onClick={() => setActiveTab("maintenance")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "maintenance" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Vehicle Maintenance Risk Matrix ({maintenanceRiskData?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("delays")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "delays" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Delivery Delay Risk Forecasts ({delayRiskData?.length || 0})
            </button>
          </div>

          {activeTab === "detections" && (
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          )}
        </div>

        {/* Tab 1: AI Anomaly Detections */}
        {activeTab === "detections" && (
          <div className="space-y-4">
            {detectionsLoading ? (
              <div className="text-center py-16 text-slate-400 text-xs">Evaluating anomaly models...</div>
            ) : detectionsData?.items && detectionsData.items.length > 0 ? (
              detectionsData.items.map((det) => (
                <div
                  key={det.id}
                  className={`bg-white rounded-xl border p-5 shadow-2xs transition-all ${
                    det.is_resolved ? "border-slate-200 opacity-60" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${det.severity === "critical" || det.severity === "high" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 capitalize">
                            {det.detection_type.replace("_", " ")}
                          </h4>
                          <span className="text-xs text-slate-400">
                            • {det.entity_type} #{det.entity_id}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Detected: {new Date(det.detected_at).toLocaleString()} • Model v{det.model_version}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Risk Score</span>
                        <span className="text-sm font-bold text-slate-900">{det.risk_score} / 100</span>
                      </div>
                      <StatusBadge status={det.severity} />
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                    <div>
                      <strong className="text-slate-900">Explainable Model Rationale:</strong>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{det.explanation}</p>
                    </div>

                    <div>
                      <strong className="text-teal-900">Recommended Action Plan:</strong>
                      <p className="text-teal-700 mt-0.5 font-medium">{det.suggested_action}</p>
                    </div>

                    {det.input_features && (
                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-3 text-[11px] text-slate-500">
                        {Object.entries(det.input_features).map(([k, v]) => (
                          <span key={k}>
                            <strong className="capitalize">{k.replace("_", " ")}:</strong> {typeof v === "number" ? v.toLocaleString() : String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {det.is_resolved ? `Resolved on ${new Date(det.resolved_at || "").toLocaleDateString()}` : "Investigation open"}
                    </span>
                    {!det.is_resolved && hasRole(["admin", "fleet_manager", "safety_officer"]) && (
                      <button
                        onClick={() => resolveMutation.mutate(det.id)}
                        disabled={resolveMutation.isPending}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Acknowledge & Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                No active anomalies detected across fleet operations.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Maintenance Risk Matrix */}
        {activeTab === "maintenance" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maintRiskLoading ? (
              <div className="col-span-2 text-center py-16 text-slate-400 text-xs">Calculating multi-factor maintenance risk scores...</div>
            ) : maintenanceRiskData && maintenanceRiskData.length > 0 ? (
              maintenanceRiskData.map((m) => (
                <div key={m.vehicle_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{m.registration_number}</h4>
                        <span className="text-[11px] text-slate-400">Vehicle Unit #{m.vehicle_id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{m.risk_score} / 100</span>
                        <StatusBadge status={m.severity} />
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mb-3">{m.explanation}</p>

                    <div className="space-y-1.5 mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Risk Factors Breakdown</span>
                      {m.factors.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                          <span className="text-slate-700 font-medium">{f.factor}: <span className="text-slate-500 font-normal">{f.detail}</span></span>
                          <span className={`text-[11px] font-bold ${f.status === "CRITICAL" ? "text-rose-600" : f.status === "WARNING" ? "text-amber-600" : "text-slate-600"}`}>
                            +{f.weight} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-200/60 text-xs text-teal-800 font-medium">
                    Recommendation: {m.recommended_action}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-16 text-slate-400 text-xs">No maintenance risk evaluations available.</div>
            )}
          </div>
        )}

        {/* Tab 3: Delivery Delay Predictions */}
        {activeTab === "delays" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {delayRiskLoading ? (
              <div className="col-span-2 text-center py-16 text-slate-400 text-xs">Generating route duration and delay forecasts...</div>
            ) : delayRiskData && delayRiskData.length > 0 ? (
              delayRiskData.map((d) => (
                <div key={d.trip_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{d.trip_code}</h4>
                        <span className="text-[11px] text-slate-400">Freight Trip #{d.trip_id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.predicted_delay_minutes > 0 ? (
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            +{d.predicted_delay_minutes} min delay forecast
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            On Time Expected
                          </span>
                        )}
                        <StatusBadge status={d.severity} />
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mb-3">{d.explanation}</p>

                    <div className="space-y-1.5 mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contributing Features</span>
                      {d.risk_factors.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                          <span className="text-slate-700 font-medium">{f.factor}: <span className="text-slate-500 font-normal">{f.detail}</span></span>
                          <span className={`text-[11px] font-bold ${f.impact === "HIGH" ? "text-rose-600" : f.impact === "MEDIUM" ? "text-amber-600" : "text-emerald-600"}`}>
                            {f.weight > 0 ? `+${f.weight}` : f.weight} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200/60 text-xs text-sky-800 font-medium">
                    Mitigation: {d.mitigation_suggestion}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-16 text-slate-400 text-xs">No active trips requiring delay risk evaluation.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
