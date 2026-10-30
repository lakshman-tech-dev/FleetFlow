import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ShieldCheck, AlertTriangle, Calendar, Phone, Mail, Award } from "lucide-react";
import { apiClient } from "../api/client";
import { Driver, DriverStatus, LicenseCategory } from "../types/api";
import { StatusBadge, Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { TopBar } from "../components/layout/TopBar";
import { useAuth } from "../context/AuthContext";

export const DriversPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseCategory, setLicenseCategory] = useState<LicenseCategory>("heavy_vehicle");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["drivers", statusFilter, categoryFilter, search],
    queryFn: () =>
      apiClient.getDrivers({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        search: search || undefined,
      }),
  });

  const createDriverMutation = useMutation({
    mutationFn: apiClient.createDriver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to create driver");
    },
  });

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setLicenseNumber("");
    setLicenseCategory("heavy_vehicle");
    setLicenseExpiry("");
    setFormError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createDriverMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      license_number: licenseNumber,
      license_category: licenseCategory,
      license_expiry: licenseExpiry,
      status: "active",
      safety_score: 98.0,
    });
  };

  return (
    <div className="pb-12">
      <TopBar title="Driver Management" subtitle="Certified operators, license compliance, safety scoring, and trip logs" />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[260px] flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search driver name, license or email..."
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
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
            >
              <option value="">All License Classes</option>
              <option value="heavy_vehicle">Heavy Vehicle (HV)</option>
              <option value="commercial">Commercial (CDL)</option>
              <option value="light_vehicle">Light Vehicle (LV)</option>
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
              <Plus className="w-4 h-4" /> Add Driver
            </button>
          )}
        </div>

        {/* Drivers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-3 text-center py-16 text-slate-400 text-xs">
              Loading verified driver records...
            </div>
          ) : data?.items && data.items.length > 0 ? (
            data.items.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                        {d.first_name[0]}{d.last_name[0]}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{d.full_name}</h4>
                        <span className="text-[11px] text-slate-400 capitalize">
                          {d.license_category.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>

                  {/* Safety & Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100 my-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Safety Score</span>
                      <span className="font-bold text-teal-700 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-teal-600" /> {d.safety_score} / 100
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Trips Completed</span>
                      <span className="font-bold text-slate-800">{d.total_trips_completed}</span>
                    </div>
                  </div>

                  {/* License Info & Expiry Warning */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">License:</span>
                      <span className="font-mono font-semibold text-slate-800">{d.license_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Expires:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-800">{d.license_expiry}</span>
                        {d.is_license_expired ? (
                          <Badge variant="danger">EXPIRED</Badge>
                        ) : d.days_until_license_expiry <= 30 ? (
                          <Badge variant="warning">{d.days_until_license_expiry}d left</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{d.phone}</span>
                  </div>
                  <button
                    onClick={() => setSelectedDriver(d)}
                    className="text-teal-600 hover:text-teal-700 font-semibold"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-16 text-slate-400 text-xs">
              No driver profiles found.
            </div>
          )}
        </div>

        {/* Modal: Add Driver */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Onboard New Commercial Driver"
          description="Enter driver credentials, verified license details, and qualification class."
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">License Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DL-HV-10928"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">License Class *</label>
                <select
                  value={licenseCategory}
                  onChange={(e) => setLicenseCategory(e.target.value as LicenseCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="heavy_vehicle">Heavy Vehicle (HV) - Trucks & Semi</option>
                  <option value="commercial">Commercial (CDL)</option>
                  <option value="light_vehicle">Light Vehicle (LV) - Delivery Vans</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">License Expiry Date *</label>
              <input
                type="date"
                required
                value={licenseExpiry}
                onChange={(e) => setLicenseExpiry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
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
                disabled={createDriverMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {createDriverMutation.isPending ? "Adding..." : "Onboard Driver"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: View Driver Profile */}
        <Modal
          isOpen={!!selectedDriver}
          onClose={() => setSelectedDriver(null)}
          title={`Driver Profile — ${selectedDriver?.full_name}`}
          maxWidth="md"
        >
          {selectedDriver && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 uppercase text-[10px] font-semibold">Status:</span>
                  <StatusBadge status={selectedDriver.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">License Number:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedDriver.license_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Class:</span>
                  <span className="font-semibold text-slate-800 capitalize">{selectedDriver.license_category.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expiry:</span>
                  <span className="font-semibold text-slate-800">{selectedDriver.license_expiry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Safety Index:</span>
                  <span className="font-bold text-teal-700">{selectedDriver.safety_score} / 100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Completed Trips:</span>
                  <span className="font-bold text-slate-900">{selectedDriver.total_trips_completed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact Email:</span>
                  <span className="text-slate-800">{selectedDriver.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-slate-800">{selectedDriver.phone}</span>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};
