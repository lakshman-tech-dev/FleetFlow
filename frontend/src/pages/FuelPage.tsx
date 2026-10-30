import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Fuel, DollarSign, Receipt, TrendingUp, AlertTriangle } from "lucide-react";
import { apiClient } from "../api/client";
import { FuelRecord, FuelRecordType, ExpenseRecord, ExpenseCategory } from "../types/api";
import { Badge, StatusBadge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { TopBar } from "../components/layout/TopBar";
import { useAuth } from "../context/AuthContext";

export const FuelPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<"fuel" | "expenses">("fuel");
  const [isAddFuelOpen, setIsAddFuelOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Fuel Form
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [recordType, setRecordType] = useState<FuelRecordType>("purchase");
  const [odometerKm, setOdometerKm] = useState(100000);
  const [litres, setLitres] = useState(120);
  const [unitPrice, setUnitPrice] = useState(1.42);
  const [location, setLocation] = useState("");
  const [fuelFormError, setFuelFormError] = useState<string | null>(null);

  // Expense Form
  const [expVehicleId, setExpVehicleId] = useState<number | "">("");
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("toll");
  const [expAmount, setExpAmount] = useState(45.0);
  const [expDesc, setExpDesc] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expReceipt, setExpReceipt] = useState("");
  const [expFormError, setExpFormError] = useState<string | null>(null);

  const { data: fuelData, isLoading: fuelLoading } = useQuery({
    queryKey: ["fuel_records"],
    queryFn: () => apiClient.getFuelRecords(),
  });

  const { data: expensesData, isLoading: expLoading } = useQuery({
    queryKey: ["expense_records"],
    queryFn: () => apiClient.getExpenses(),
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ["vehicles_all"],
    queryFn: () => apiClient.getVehicles(),
  });

  const createFuelMutation = useMutation({
    mutationFn: apiClient.createFuelRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel_records"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["sustainability"] });
      queryClient.invalidateQueries({ queryKey: ["active_detections"] });
      setIsAddFuelOpen(false);
    },
    onError: (err: any) => {
      setFuelFormError(err.response?.data?.detail || "Failed to log fuel entry");
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: apiClient.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_records"] });
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      setIsAddExpenseOpen(false);
    },
    onError: (err: any) => {
      setExpFormError(err.response?.data?.detail || "Failed to log expense");
    },
  });

  const totalFuelCost = fuelData?.items?.reduce((sum, f) => sum + Number(f.total_cost), 0) || 0;
  const totalFuelLitres = fuelData?.items?.reduce((sum, f) => sum + Number(f.litres), 0) || 0;
  const totalExpenses = expensesData?.items?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  return (
    <div className="pb-12">
      <TopBar title="Fuel Management & Operating Expenses" subtitle="Audit fuel consumption vs purchases, telemetry efficiency, and transit tolls" />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Fuel Spend</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              ${totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400">{totalFuelLitres.toLocaleString()} Total Litres Pumped</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Other OpEx</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              ${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400">Tolls, parking, driver allowances, permits</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Fleet Direct Costs</span>
            <span className="text-2xl font-bold text-teal-600 mt-1 block">
              ${(totalFuelCost + totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-400">Integrated ledger</span>
          </div>
        </div>

        {/* Tab Switcher & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("fuel")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "fuel" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Fuel Ledger ({fuelData?.total || 0})
            </button>
            <button
              onClick={() => setActiveTab("expenses")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "expenses" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Operating Expenses ({expensesData?.total || 0})
            </button>
          </div>

          {hasRole(["admin", "fleet_manager", "dispatcher"]) && (
            <div className="flex items-center gap-2">
              {activeTab === "fuel" ? (
                <button
                  onClick={() => setIsAddFuelOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Log Fuel Refill
                </button>
              ) : (
                <button
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Add Expense
                </button>
              )}
            </div>
          )}
        </div>

        {/* Table View */}
        {activeTab === "fuel" ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Vehicle Unit</th>
                    <th className="py-3 px-4">Record Type</th>
                    <th className="py-3 px-4">Litres</th>
                    <th className="py-3 px-4">Unit Price</th>
                    <th className="py-3 px-4">Total Cost</th>
                    <th className="py-3 px-4">Odometer</th>
                    <th className="py-3 px-4">Efficiency</th>
                    <th className="py-3 px-4">Est. CO2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {fuelLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">Loading fuel logs...</td>
                    </tr>
                  ) : fuelData?.items && fuelData.items.length > 0 ? (
                    fuelData.items.map((f) => {
                      const veh = vehiclesData?.items?.find((v) => v.id === f.vehicle_id);
                      return (
                        <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">{new Date(f.transaction_date).toLocaleDateString()}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {veh?.registration_number || `Unit #${f.vehicle_id}`}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant={f.record_type === "consumption" ? "info" : "success"}>
                              {f.record_type.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{Number(f.litres).toFixed(1)} L</td>
                          <td className="py-3.5 px-4">${Number(f.unit_price).toFixed(2)}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">${Number(f.total_cost).toFixed(2)}</td>
                          <td className="py-3.5 px-4 tabular-nums">{Number(f.odometer_km).toLocaleString()} km</td>
                          <td className="py-3.5 px-4">
                            {f.efficiency_km_per_litre ? (
                              <span className={`font-semibold ${Number(f.efficiency_km_per_litre) < 2.5 ? "text-rose-600" : "text-emerald-700"}`}>
                                {Number(f.efficiency_km_per_litre).toFixed(2)} km/L
                              </span>
                            ) : (
                              <span className="text-slate-400">--</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-emerald-800 font-medium">
                            {f.calculated_co2_kg ? `${f.calculated_co2_kg} kg` : "--"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">No fuel records logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Vehicle Unit</th>
                    <th className="py-3 px-4">Receipt Ref</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {expLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">Loading expenses...</td>
                    </tr>
                  ) : expensesData?.items && expensesData.items.length > 0 ? (
                    expensesData.items.map((e) => {
                      const veh = vehiclesData?.items?.find((v) => v.id === e.vehicle_id);
                      return (
                        <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">{e.expense_date}</td>
                          <td className="py-3.5 px-4 capitalize">
                            <Badge variant={e.expense_category === "toll" ? "info" : e.expense_category === "insurance" ? "purple" : "warning"}>
                              {e.expense_category.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-slate-900 font-medium">{e.description}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {veh?.registration_number || (e.vehicle_id ? `Unit #${e.vehicle_id}` : "Fleet General")}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">{e.receipt_reference || "--"}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            ${Number(e.amount).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">No operational expenses logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Log Fuel Entry */}
        <Modal
          isOpen={isAddFuelOpen}
          onClose={() => setIsAddFuelOpen(false)}
          title="Log Fuel Transaction"
          description="Record litres purchased or consumed. AI anomaly detector evaluates efficiency."
          maxWidth="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFuelFormError(null);
              if (!vehicleId) {
                setFuelFormError("Please select a vehicle");
                return;
              }
              createFuelMutation.mutate({
                vehicle_id: Number(vehicleId),
                record_type: recordType,
                transaction_date: new Date().toISOString(),
                odometer_km: odometerKm,
                litres,
                unit_price: unitPrice,
                location: location || undefined,
              });
            }}
            className="space-y-4 text-xs"
          >
            {fuelFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                {fuelFormError}
              </div>
            )}

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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="">-- Select Vehicle --</option>
                {vehiclesData?.items?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} - {v.make} {v.model} ({v.fuel_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Record Type *</label>
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value as FuelRecordType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="purchase">Fuel Purchase (Refill)</option>
                  <option value="consumption">Trip Consumption (Telemetry)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Odometer (km) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Litres *</label>
                <input
                  type="number"
                  required
                  step="0.1"
                  min={1}
                  value={litres}
                  onChange={(e) => setLitres(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Price per Litre ($) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min={0.1}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Station / Location</label>
              <input
                type="text"
                placeholder="e.g. Chicago Depot Fuel Island"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddFuelOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createFuelMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-xs"
              >
                {createFuelMutation.isPending ? "Logging..." : "Log Fuel Record"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Expense */}
        <Modal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          title="Log Operational Expense"
          description="Record road tolls, cargo permits, transit insurance, or driver per diem."
          maxWidth="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setExpFormError(null);
              createExpenseMutation.mutate({
                vehicle_id: expVehicleId ? Number(expVehicleId) : undefined,
                expense_category: expCategory,
                amount: expAmount,
                expense_date: expDate,
                description: expDesc,
                receipt_reference: expReceipt || undefined,
              });
            }}
            className="space-y-4 text-xs"
          >
            {expFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                {expFormError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="toll">Road & Highway Toll</option>
                  <option value="permit">Transit / State Permit</option>
                  <option value="repair">Workshop Misc Repair</option>
                  <option value="parking">Terminal Parking</option>
                  <option value="insurance">Insurance Premium</option>
                  <option value="driver_allowance">Driver Per Diem</option>
                  <option value="other">Other Expense</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount ($) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min={1}
                  value={expAmount}
                  onChange={(e) => setExpAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
              <input
                type="text"
                required
                placeholder="e.g. I-80 Electronic Toll Gate Crossing"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle (Optional)</label>
                <select
                  value={expVehicleId}
                  onChange={(e) => setExpVehicleId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">General Fleet Expense</option>
                  {vehiclesData?.items?.map((v) => (
                    <option key={v.id} value={v.id}>{v.registration_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Reference</label>
                <input
                  type="text"
                  placeholder="e.g. REC-9921"
                  value={expReceipt}
                  onChange={(e) => setExpReceipt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createExpenseMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-xs"
              >
                {createExpenseMutation.isPending ? "Logging..." : "Save Expense"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};
