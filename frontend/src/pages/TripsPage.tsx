import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Navigation, CheckCircle2, XCircle, Send, Search, Clock, DollarSign, Weight, AlertCircle } from "lucide-react";
import { apiClient } from "../api/client";
import { Trip, TripStatus, Vehicle, Driver } from "../types/api";
import { StatusBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { TopBar } from "../components/layout/TopBar";
import { useAuth } from "../context/AuthContext";

export const TripsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [completeTripItem, setCompleteTripItem] = useState<Trip | null>(null);
  const [cancelTripItem, setCancelTripItem] = useState<Trip | null>(null);

  // Creation form state
  const [tripCode, setTripCode] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargoDesc, setCargoDesc] = useState("");
  const [cargoWeight, setCargoWeight] = useState(8000);
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [driverId, setDriverId] = useState<number | "">("");
  const [departureTime, setDepartureTime] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [revenue, setRevenue] = useState(2400);
  const [formError, setFormError] = useState<string | null>(null);

  // Complete / Cancel state
  const [endOdometer, setEndOdometer] = useState<number>(0);
  const [cancelReason, setCancelReason] = useState("");

  const { data: tripsData, isLoading } = useQuery({
    queryKey: ["trips", statusFilter, search],
    queryFn: () => apiClient.getTrips({ status: statusFilter || undefined, search: search || undefined }),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles_for_dispatch"],
    queryFn: () => apiClient.getVehicles({ status: "available" }),
  });

  const { data: driversData } = useQuery({
    queryKey: ["drivers_for_dispatch"],
    queryFn: () => apiClient.getDrivers({ status: "active" }),
  });

  const createTripMutation = useMutation({
    mutationFn: apiClient.createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setIsCreateModalOpen(false);
      resetCreateForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to create trip");
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: (id: number) => apiClient.dispatchTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to dispatch trip");
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, endOdo }: { id: number; endOdo: number }) => apiClient.completeTrip(id, endOdo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setCompleteTripItem(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to complete trip");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => apiClient.cancelTrip(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setCancelTripItem(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to cancel trip");
    },
  });

  const resetCreateForm = () => {
    setTripCode("");
    setOrigin("");
    setDestination("");
    setCargoDesc("");
    setCargoWeight(8000);
    setVehicleId("");
    setDriverId("");
    setDepartureTime("");
    setDeliveryTime("");
    setRevenue(2400);
    setFormError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createTripMutation.mutate({
      trip_code: tripCode,
      origin,
      destination,
      cargo_description: cargoDesc,
      cargo_weight_kg: cargoWeight,
      assigned_vehicle_id: vehicleId ? Number(vehicleId) : undefined,
      assigned_driver_id: driverId ? Number(driverId) : undefined,
      scheduled_departure: new Date(departureTime).toISOString(),
      scheduled_delivery: new Date(deliveryTime).toISOString(),
      revenue,
    });
  };

  const handleOpenComplete = (t: Trip) => {
    setCompleteTripItem(t);
    const startOdo = t.start_odometer_km || 0;
    setEndOdometer(Number(startOdo) + 250);
  };

  return (
    <div className="pb-12">
      <TopBar title="Trip Dispatch & Routing" subtitle="Freight schedules, vehicle capacity allocation, and delivery completion" />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[260px] flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search trip code, origin, or destination..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="dispatched">Dispatched</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {hasRole(["admin", "fleet_manager", "dispatcher"]) && (
            <button
              onClick={() => {
                resetCreateForm();
                const now = new Date();
                const dep = new Date(now.getTime() + 2 * 3600 * 1000).toISOString().slice(0, 16);
                const arr = new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 16);
                setDepartureTime(dep);
                setDeliveryTime(arr);
                setTripCode(`TRIP-${Math.floor(1000 + Math.random() * 9000)}`);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Trip Schedule
            </button>
          )}
        </div>

        {/* Trips Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Trip Code</th>
                  <th className="py-3 px-4">Origin & Destination</th>
                  <th className="py-3 px-4">Cargo & Weight</th>
                  <th className="py-3 px-4">Assigned Unit & Driver</th>
                  <th className="py-3 px-4">Departure & ETA</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading freight dispatch board...
                    </td>
                  </tr>
                ) : tripsData?.items && tripsData.items.length > 0 ? (
                  tripsData.items.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{t.trip_code}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{t.origin}</div>
                        <div className="text-[11px] text-slate-400">→ {t.destination}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>{t.cargo_description || "General Cargo"}</div>
                        <div className="text-[11px] text-slate-400">{Number(t.cargo_weight_kg).toLocaleString()} kg</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {t.vehicle ? (
                          <div className="font-semibold text-slate-800">{t.vehicle.registration_number}</div>
                        ) : (
                          <span className="text-amber-600 font-medium text-[11px]">Unassigned vehicle</span>
                        )}
                        {t.driver ? (
                          <div className="text-[11px] text-slate-500">{t.driver.full_name}</div>
                        ) : (
                          <span className="text-amber-600 block text-[11px]">Unassigned driver</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800">{new Date(t.scheduled_departure).toLocaleDateString()}</div>
                        <div className="text-[11px] text-slate-400">{new Date(t.scheduled_delivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={t.status} />
                        {t.delay_minutes > 0 && (
                          <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
                            +{t.delay_minutes} min delay
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ${Number(t.revenue).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasRole(["admin", "fleet_manager", "dispatcher"]) && t.status === "draft" && (
                            <button
                              onClick={() => dispatchMutation.mutate(t.id)}
                              title="Dispatch Vehicle"
                              disabled={dispatchMutation.isPending}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                            >
                              <Send className="w-3 h-3" /> Dispatch
                            </button>
                          )}
                          {hasRole(["admin", "fleet_manager", "dispatcher"]) && (t.status === "dispatched" || t.status === "in_progress") && (
                            <button
                              onClick={() => handleOpenComplete(t)}
                              title="Complete Trip Delivery"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Complete
                            </button>
                          )}
                          {hasRole(["admin", "fleet_manager", "dispatcher"]) && t.status !== "completed" && t.status !== "cancelled" && (
                            <button
                              onClick={() => setCancelTripItem(t)}
                              title="Cancel Trip"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No freight trips found for selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Create Trip */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Trip Manifest"
          description="Schedule origin, destination, cargo payload, vehicle allocation, and driver."
          maxWidth="xl"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trip Code *</label>
                <input
                  type="text"
                  required
                  value={tripCode}
                  onChange={(e) => setTripCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Origin *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicago Depot"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destination *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Detroit Terminal"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo Description</label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Machinery"
                  value={cargoDesc}
                  onChange={(e) => setCargoDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo Weight (kg) *</label>
                <input
                  type="number"
                  required
                  min={100}
                  value={cargoWeight}
                  onChange={(e) => setCargoWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Allocate Vehicle *</label>
                <select
                  required
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">-- Select Available Vehicle --</option>
                  {vehiclesData?.items?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.make} {v.model} (Max Cap: {v.max_capacity_kg} kg)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Driver *</label>
                <select
                  required
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="">-- Select Certified Driver --</option>
                  {driversData?.items?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.license_category.replace("_", " ")}) - Safety: {d.safety_score}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Delivery Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Freight Revenue ($) *</label>
                <input
                  type="number"
                  min={0}
                  value={revenue}
                  onChange={(e) => setRevenue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTripMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {createTripMutation.isPending ? "Creating..." : "Save Trip Draft"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Complete Trip */}
        <Modal
          isOpen={!!completeTripItem}
          onClose={() => setCompleteTripItem(null)}
          title={`Complete Trip Delivery — ${completeTripItem?.trip_code}`}
          description="Log final delivery odometer to release vehicle and driver to available pool."
          maxWidth="md"
        >
          {completeTripItem && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-700">
                <div>Route: <strong className="text-slate-900">{completeTripItem.origin} → {completeTripItem.destination}</strong></div>
                <div>Start Odometer: <strong className="text-slate-900">{Number(completeTripItem.start_odometer_km || 0).toLocaleString()} km</strong></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ending Odometer Reading (km) *
                </label>
                <input
                  type="number"
                  required
                  min={Number(completeTripItem.start_odometer_km || 0)}
                  value={endOdometer}
                  onChange={(e) => setEndOdometer(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Calculated trip distance: {Math.max(0, endOdometer - Number(completeTripItem.start_odometer_km || 0))} km
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompleteTripItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => completeMutation.mutate({ id: completeTripItem.id, endOdo: endOdometer })}
                  disabled={completeMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {completeMutation.isPending ? "Completing..." : "Confirm Delivery Complete"}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal: Cancel Trip */}
        <Modal
          isOpen={!!cancelTripItem}
          onClose={() => setCancelTripItem(null)}
          title={`Cancel Trip — ${cancelTripItem?.trip_code}`}
          maxWidth="md"
        >
          {cancelTripItem && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Cancelling this trip will release assigned vehicle and driver. Please record an operational reason:
              </p>
              <textarea
                required
                rows={3}
                placeholder="Reason for cancellation (e.g. shipper cargo cancelled, severe highway closure)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setCancelTripItem(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={() => cancelMutation.mutate({ id: cancelTripItem.id, reason: cancelReason || "Operational cancellation" })}
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
