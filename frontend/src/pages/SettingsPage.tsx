import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  User as UserIcon,
  Users,
  Shield,
  Sliders,
  Database,
  Cloud,
  CheckCircle2,
  Plus,
  Lock,
  Mail,
  Key,
} from "lucide-react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { User, UserRole } from "../types/api";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { TopBar } from "../components/layout/TopBar";

export const SettingsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"profile" | "users" | "thresholds" | "cloud">("profile");

  // User management state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "dispatcher" as UserRole,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.getUsers(),
    enabled: currentUser?.role === "admin",
  });

  const createUserMutation = useMutation({
    mutationFn: (data: typeof userFormData) => apiClient.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsAddUserOpen(false);
      setUserFormData({ email: "", full_name: "", password: "", role: "dispatcher" });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.detail || "Failed to create user account.");
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.email || !userFormData.password || !userFormData.full_name) {
      setFormError("All fields are required.");
      return;
    }
    createUserMutation.mutate(userFormData);
  };

  return (
    <div className="pb-12">
      <TopBar title="System & Account Settings" subtitle="Manage operational thresholds, administrative accounts, role assignments, and cloud integrations" />

      <div className="p-8 max-w-7xl mx-auto space-y-6">

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("profile")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === "profile"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            User Profile
          </button>
          {currentUser?.role === "admin" && (
            <button
              onClick={() => setActiveTab("users")}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
                activeTab === "users"
                  ? "border-teal-600 text-teal-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Users className="w-4 h-4" />
              User & Role Management
            </button>
          )}
          <button
            onClick={() => setActiveTab("thresholds")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === "thresholds"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Sliders className="w-4 h-4" />
            Operational Parameters
          </button>
          <button
            onClick={() => setActiveTab("cloud")}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition ${
              activeTab === "cloud"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Cloud className="w-4 h-4" />
            Azure & Cloud Services
          </button>
        </nav>
      </div>

      {/* Tab: Profile */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-teal-600" />
              Active Operator Identity
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-400 font-medium">Full Name</span>
                <p className="font-medium text-slate-800 text-base">{currentUser?.full_name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Email Address</span>
                <p className="font-medium text-slate-800">{currentUser?.email}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Assigned Role</span>
                <div className="mt-1">
                  <Badge variant="info">
                    {currentUser?.role.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">Account Status</span>
                <div className="mt-1 flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Active & Authorized
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600" />
              Role Permissions Overview
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your role grants specific granular capabilities enforced server-side on every API transaction.
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                <span className="text-slate-700">Fleet Registry CRUD</span>
                <span className="font-semibold text-emerald-600">Granted</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                <span className="text-slate-700">Trip Dispatch & Re-assignment</span>
                <span className="font-semibold text-emerald-600">Granted</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                <span className="text-slate-700">Data Engineering Pipeline Triggers</span>
                <span className="font-semibold text-emerald-600">Granted</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                <span className="text-slate-700">Security Audit Logs Access</span>
                <span className={`font-semibold ${currentUser?.role === "admin" || currentUser?.role === "fleet_manager" ? "text-emerald-600" : "text-slate-400"}`}>
                  {currentUser?.role === "admin" || currentUser?.role === "fleet_manager" ? "Granted" : "Restricted"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users (Admin only) */}
      {activeTab === "users" && currentUser?.role === "admin" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">User Accounts Directory</h2>
              <p className="text-xs text-slate-500">Manage internal operators, roles, and authorization levels.</p>
            </div>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add User Account
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            {usersLoading ? (
              <div className="p-12 text-center text-slate-500 text-sm">Loading users...</div>
            ) : (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Full Name</th>
                    <th className="px-4 py-3">Email Address</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Account Status</th>
                    <th className="px-4 py-3">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersData?.items?.map((u: User) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900 text-xs">{u.full_name}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{u.role.replace("_", " ").toUpperCase()}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {u.is_active ? (
                          <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="text-rose-600 text-xs font-medium">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab: Thresholds */}
      {activeTab === "thresholds" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Emissions Factors & ISO 14083 Constants</h2>
            <p className="text-xs text-slate-500">
              Standard coefficients applied to fuel transactions to compute GHG scope 1 & 2 emissions.
            </p>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Diesel Emissions Factor</span>
                  <p className="text-slate-400">EPA / DEFRA Fuel Standard</p>
                </div>
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded">2.68 kg CO2/L</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Petrol (Gasoline) Emissions Factor</span>
                  <p className="text-slate-400">EPA Standard Blend</p>
                </div>
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded">2.31 kg CO2/L</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Electric Grid Average (EV)</span>
                  <p className="text-slate-400">National Average Grid Intensity</p>
                </div>
                <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded">0.45 kg CO2/kWh</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Operational Safety Thresholds</h2>
            <p className="text-xs text-slate-500">
              Configurable system triggers that flag vehicles and drivers for proactive review.
            </p>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Driver License Expiry Warning</span>
                  <p className="text-slate-400">Warning window prior to expiry</p>
                </div>
                <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded">30 Days</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Preventive Service Interval</span>
                  <p className="text-slate-400">Distance trigger for maintenance</p>
                </div>
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded">10,000 km</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">Fuel Anomaly Threshold (Isolation Forest)</span>
                  <p className="text-slate-400">Contamination parameter</p>
                </div>
                <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded">0.05 (5%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Cloud */}
      {activeTab === "cloud" && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-teal-600" />
              Microsoft Azure Architecture State
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configuration details for Azure App Service, Managed PostgreSQL, and Blob Storage connectivity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Azure Database for PostgreSQL</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-slate-500">Flexible Server (v16/18 Compatible)</p>
              <div className="pt-2 text-slate-700 font-mono">Status: Connected</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Azure Blob Storage</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-slate-500">Parquet Analytical Data Lake Container</p>
              <div className="pt-2 text-slate-700 font-mono">Container: fleetflow-analytics</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">Azure App Service</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-slate-500">Linux B1 Tier / Python 3.12 Runtime</p>
              <div className="pt-2 text-slate-700 font-mono">Port: 8000 (FastAPI ASGI)</div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddUserOpen(false)}
          title="Create New User Account"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={userFormData.full_name}
                onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                placeholder="e.g. Rachel Green"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                placeholder="operator@fleetflow.io"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                placeholder="Min 8 characters with numbers"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role Assignment</label>
              <select
                value={userFormData.role}
                onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="dispatcher">Dispatcher</option>
                <option value="fleet_manager">Fleet Manager</option>
                <option value="safety_officer">Safety Officer</option>
                <option value="analyst">Analyst</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createUserMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
              >
                {createUserMutation.isPending ? "Creating..." : "Save Account"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  </div>
  );
};
