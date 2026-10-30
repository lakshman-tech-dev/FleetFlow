import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench, CheckCircle2, Play, AlertTriangle, Calendar, DollarSign, Clock } from "lucide-react";
import { apiClient } from "../api/client";
import { MaintenanceRecord, MaintenanceType, MaintenanceStatus } from "../types/api";
import { StatusBadge, Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { TopBar } from "../components/layout/TopBar";
import { useAuth } from "../context/AuthContext";

export const MaintenancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [completeModalRecord, setCompleteModalRecord] = useState<MaintenanceRecord | null>(null);

  // Form State
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [serviceType, setServiceType] = useState<MaintenanceType>("preventive");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometerKm, setOdometerKm] = useState(100000);
  const [serviceProvider, setServiceProvider] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Complete Form State
  const [finalCost, setFinalCost] = useState(650);
  const [nextOdoThreshold, setNextOdoThreshold] = useState<number | "">("");

  const { data: recordsData, isLoading } = useQuery({
    queryKey: ["maintenance", statusFilter],
    queryFn: () => apiClient.getMaintenance({ status: statusFilter || undefined }),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles_all"],
    queryFn: () => apiClient.getVehicles(),
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: apiClient.scheduleMaintenance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to schedule maintenance");
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: number) => apiClient.startMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to start maintenance");
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, cost, nextOdo, prov }: { id: number; cost: number; nextOdo?: number; prov?: string }) =>
      apiClient.completeMaintenance(id, cost, nextOdo, prov),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setCompleteModalRecord(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to complete maintenance");
    },
  });

  const resetForm = () => {
    setVehicleId("");
    setServiceType("preventive");
    setDescription("");
    setScheduledDate(new Date().toISOString().slice(0, 10));
    setOdometerKm(100000);
    setServiceProvider("");
    setFormError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!vehicleId) {
      setFormError("Please select a target vehicle");
      return;
    }
    createMaintenanceMutation.mutate({
      vehicle_id: Number(vehicleId),
      service_type: serviceType,
      description,
      scheduled_date: scheduledDate,
      odometer_km: odometerKm,
      service_provider: serviceProvider || undefined,
    });
  };

  const totalSpent = recordsData?.items
    ?.filter((r) => r.status === "completed")
    .reduce((acc, r) => acc + Number(r.cost), 0) || 0;

  return (
    <div className="pb-12">
      <TopBar title="Fleet Maintenance & Workshop" subtitle="Preventive inspections, overhaul tracking, and vehicle availability status" />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Completed Maintenance Spend</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400">Total historical repairs & inspections</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active In-Shop Work</span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">
              {recordsData?.items?.filter((r) => r.status === "in_progress").length || 0} units
            </span>
            <span className="text-[11px] text-slate-400">Grounded from dispatch pool</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Scheduled Upcoming</span>
            <span className="text-2xl font-bold text-teal-600 mt-1 block">
              {recordsData?.items?.filter((r) => r.status === "scheduled").length || 0} records
            </span>
            <span className="text-[11px] text-slate-400">Routine mileage thresholds</span>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
            >
              <option value="">All Service Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress (Grounded)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {hasRole(["admin", "fleet_manager"]) && (
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Schedule Maintenance
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Vehicle Unit</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Service Description</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Cost</th>
                  <th className="py-3 px-4">Odometer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading maintenance records...
                    </td>
                  </tr>
                ) : recordsData?.items && recordsData.items.length > 0 ? (
                  recordsData.items.map((m) => {
                    const veh = vehiclesData?.items?.find((v) => v.id === m.vehicle_id);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {veh?.registration_number || `Vehicle #${m.vehicle_id}`}
                        </td>
                        <td className="py-3.5 px-4 capitalize">
                          <Badge variant={m.service_type === "emergency" ? "danger" : m.service_type === "repair" ? "warning" : "info"}>
                            {m.service_type}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate" title={m.description}>
                          {m.description}
                        </td>
                        <td className="py-3.5 px-4">{m.scheduled_date}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ${Number(m.cost).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 tabular-nums">{Number(m.odometer_km).toLocaleString()} km</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasRole(["admin", "fleet_manager"]) && m.status === "scheduled" && (
                              <button
                                onClick={() => startMutation.mutate(m.id)}
                                title="Start Service (Grounded)"
                                disabled={startMutation.isPending}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                              >
                                <Play className="w-3 h-3" /> Start Service
                              </button>
                            )}
                            {hasRole(["admin", "fleet_manager"]) && (m.status === "in_progress" || m.status === "scheduled") && (
                              <button
                                onClick={() => {
                                  setCompleteModalRecord(m);
                                  setFinalCost(Number(m.cost) || 600);
                                  setNextOdoThreshold(Number(m.odometer_km) + 15000);
                                }}
                                title="Mark Completed"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Complete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No maintenance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Schedule Maintenance */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Schedule Fleet Maintenance Service"
          description="Plan preventive inspection, tire rotation, or component repairs."
          maxWidth="lg"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Vehicle *</label>
                <select
                  required
                  value={vehicleId}
                  onChange={(e) => {
                    const vid = e.target.value ? Number(e.target.value) : "";
                    setVehicleId(vid);
                    const selected = vehiclesData?.items?.find((v) => v.id === vid);
                    if (selected) setOdometerKm(Number(selected.current_odometer_km));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">-- Select Vehicle --</option>
                  {vehiclesData?.items?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.make} {v.model} ({v.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Type *</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as MaintenanceType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="preventive">Preventive Maintenance</option>
                  <option value="repair">Corrective Repair</option>
                  <option value="inspection">Safety / Regulatory Inspection</option>
                  <option value="emergency">Emergency Breakdown</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Scope *</label>
              <textarea
                required
                rows={3}
                placeholder="Detailed scope of service, parts to replace, or reported issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Date *</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Odometer (km) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Workshop / Vendor</label>
                <input
                  type="text"
                  placeholder="e.g. Scania Workshop"
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMaintenanceMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {createMaintenanceMutation.isPending ? "Scheduling..." : "Schedule Service"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Complete Maintenance */}
        <Modal
          isOpen={!!completeModalRecord}
          onClose={() => setCompleteModalRecord(null)}
          title="Complete Maintenance Record"
          description="Log invoice cost and next service threshold to return vehicle to Available status."
          maxWidth="md"
        >
          {completeModalRecord && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Final Service Cost ($) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={finalCost}
                  onChange={(e) => setFinalCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Next Service Odometer Threshold (km)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150000"
                  value={nextOdoThreshold}
                  onChange={(e) => setNextOdoThreshold(e.target.value ? parseFloat(e.target.value) : "")}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setCompleteModalRecord(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    completeMutation.mutate({
                      id: completeModalRecord.id,
                      cost: finalCost,
                      nextOdo: nextOdoThreshold ? Number(nextOdoThreshold) : undefined,
                    })
                  }
                  disabled={completeMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {completeMutation.isPending ? "Saving..." : "Confirm & Restore Vehicle"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
