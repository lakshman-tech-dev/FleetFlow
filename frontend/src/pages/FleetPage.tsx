import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, Truck, AlertCircle, Wrench, Eye, Ban } from "lucide-react";
import { apiClient } from "../api/client";
import { Vehicle, VehicleType, VehicleStatus, FuelType } from "../types/api";
import { StatusBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { TopBar } from "../components/layout/TopBar";
import { useAuth } from "../context/AuthContext";

export const FleetPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [retireConfirmVehicle, setRetireConfirmVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [regNumber, setRegNumber] = useState("");
  const [vin, setVin] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(2024);
  const [vehicleType, setVehicleType] = useState<VehicleType>("truck");
  const [maxCapacity, setMaxCapacity] = useState(20000);
  const [odometer, setOdometer] = useState(0);
  const [fuelType, setFuelType] = useState<FuelType>("diesel");
  const [cost, setCost] = useState(150000);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["vehicles", statusFilter, typeFilter, search],
    queryFn: () =>
      apiClient.getVehicles({
        status: statusFilter || undefined,
        vehicle_type: typeFilter || undefined,
        search: search || undefined,
      }),
  });

  const createVehicleMutation = useMutation({
    mutationFn: apiClient.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to create vehicle");
    },
  });

  const retireMutation = useMutation({
    mutationFn: (id: number) => apiClient.retireVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setRetireConfirmVehicle(null);
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Failed to retire vehicle");
    },
  });

  const resetForm = () => {
    setRegNumber("");
    setVin("");
    setMake("");
    setModel("");
    setYear(2024);
    setVehicleType("truck");
    setMaxCapacity(20000);
    setOdometer(0);
    setFuelType("diesel");
    setCost(150000);
    setFormError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createVehicleMutation.mutate({
      registration_number: regNumber,
      vin: vin || undefined,
      make,
      model,
      year,
      vehicle_type: vehicleType,
      max_capacity_kg: maxCapacity,
      current_odometer_km: odometer,
      fuel_type: fuelType,
      acquisition_cost: cost,
      status: "available",
    });
  };

  return (
    <div className="pb-12">
      <TopBar title="Fleet Management" subtitle="Registry of commercial trucks, electric vans, and semi-trailers" />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Action Header & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative min-w-[260px] flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search registration, VIN, make or model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
              />
            </div>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="dispatched">Dispatched</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>

            {/* Filter by Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            >
              <option value="">All Categories</option>
              <option value="truck">Truck</option>
              <option value="semi_trailer">Semi-Trailer</option>
              <option value="van">Van</option>
              <option value="electric_van">Electric Van</option>
              <option value="refrigerated_truck">Refrigerated Truck</option>
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
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          )}
        </div>

        {/* Vehicles Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4">Make & Model</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Fuel Type</th>
                  <th className="py-3 px-4">Payload Cap</th>
                  <th className="py-3 px-4">Odometer</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading fleet registry from PostgreSQL...
                    </td>
                  </tr>
                ) : data?.items && data.items.length > 0 ? (
                  data.items.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{v.registration_number}</td>
                      <td className="py-3.5 px-4">
                        {v.make} {v.model} <span className="text-slate-400">({v.year})</span>
                      </td>
                      <td className="py-3.5 px-4 capitalize">{v.vehicle_type.replace("_", " ")}</td>
                      <td className="py-3.5 px-4 capitalize">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          v.fuel_type === "electric" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          v.fuel_type === "hybrid" ? "bg-teal-50 text-teal-700 border border-teal-200" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {v.fuel_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{Number(v.max_capacity_kg).toLocaleString()} kg</td>
                      <td className="py-3.5 px-4 tabular-nums">{Number(v.current_odometer_km).toLocaleString()} km</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedVehicle(v)}
                            title="Inspect Vehicle Details"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {hasRole(["admin", "fleet_manager"]) && v.status !== "retired" && (
                            <button
                              onClick={() => setRetireConfirmVehicle(v)}
                              title="Decommission / Retire Vehicle"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No vehicles found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add Vehicle */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Register New Fleet Vehicle"
          description="Enter vehicle specifications, identification, and capacity parameters."
          maxWidth="xl"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registration Plate *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FL-501-TRK"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">VIN (Chassis Number)</label>
                <input
                  type="text"
                  placeholder="17-character VIN"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Make *</label>
                <input
                  type="text"
                  required
                  placeholder="Volvo, Scania, Ford"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model *</label>
                <input
                  type="text"
                  required
                  placeholder="FH16, eTransit, Actros"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Year *</label>
                <input
                  type="number"
                  required
                  min={1995}
                  max={2030}
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value) || 2024)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Category *</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="truck">Long-Haul Truck</option>
                  <option value="semi_trailer">Semi-Trailer</option>
                  <option value="van">Van</option>
                  <option value="electric_van">Electric Van</option>
                  <option value="refrigerated_truck">Refrigerated Truck</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel / Powertrain *</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as FuelType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="diesel">Diesel (2.68 kg CO2/L)</option>
                  <option value="petrol">Petrol (2.31 kg CO2/L)</option>
                  <option value="electric">Electric (Clean Grid 0.45)</option>
                  <option value="hybrid">Hybrid Powertrain</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Payload (kg) *</label>
                <input
                  type="number"
                  required
                  min={500}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Odometer (km)</label>
                <input
                  type="number"
                  min={0}
                  value={odometer}
                  onChange={(e) => setOdometer(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Acquisition Cost ($)</label>
                <input
                  type="number"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createVehicleMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {createVehicleMutation.isPending ? "Registering..." : "Register Vehicle"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: View Vehicle Details */}
        <Modal
          isOpen={!!selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          title={`Vehicle Specification — ${selectedVehicle?.registration_number}`}
          description={`${selectedVehicle?.make} ${selectedVehicle?.model} (${selectedVehicle?.year})`}
          maxWidth="lg"
        >
          {selectedVehicle && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Registration Plate</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedVehicle.registration_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Current Status</span>
                  <StatusBadge status={selectedVehicle.status} />
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Vehicle Category</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedVehicle.vehicle_type.replace("_", " ")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Powertrain</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedVehicle.fuel_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Max Payload Capacity</span>
                  <span className="font-semibold text-slate-800">{Number(selectedVehicle.max_capacity_kg).toLocaleString()} kg</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Current Odometer</span>
                  <span className="font-semibold text-slate-800">{Number(selectedVehicle.current_odometer_km).toLocaleString()} km</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">VIN</span>
                  <span className="font-mono text-slate-700">{selectedVehicle.vin || "Not recorded"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold uppercase text-[10px]">Acquisition Cost</span>
                  <span className="font-semibold text-slate-800">${Number(selectedVehicle.acquisition_cost).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal: Confirm Retire */}
        <Modal
          isOpen={!!retireConfirmVehicle}
          onClose={() => setRetireConfirmVehicle(null)}
          title="Confirm Vehicle Decommission"
          maxWidth="md"
        >
          {retireConfirmVehicle && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Are you sure you want to permanently decommission and retire vehicle{" "}
                <strong className="text-slate-900">{retireConfirmVehicle.registration_number}</strong>?
                Retired vehicles cannot be dispatched on new freight trips.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setRetireConfirmVehicle(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => retireMutation.mutate(retireConfirmVehicle.id)}
                  disabled={retireMutation.isPending}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  {retireMutation.isPending ? "Retiring..." : "Retire Vehicle"}
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
