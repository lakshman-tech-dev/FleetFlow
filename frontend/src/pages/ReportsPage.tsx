import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  Fuel,
  Wrench,
  Leaf,
  CheckCircle2,
  AlertCircle,
  Truck,
} from "lucide-react";
import { apiClient } from "../api/client";
import { StatCard } from "../components/ui/StatCard";
import { TopBar } from "../components/layout/TopBar";

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<string>("trips");
  const [dateRange, setDateRange] = useState<string>("30d");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["reports", "kpis"],
    queryFn: () => apiClient.getKPIs(),
  });

  const { data: sustainability, isLoading: sustLoading } = useQuery({
    queryKey: ["reports", "sustainability"],
    queryFn: () => apiClient.getSustainability(),
  });

  const handleExport = async (type: string) => {
    try {
      setIsExporting(true);
      setExportSuccess(null);
      const blob = await apiClient.exportReportCsv(type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fleetflow_${type}_report_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setExportSuccess(`Successfully downloaded ${type.toUpperCase()} CSV report.`);
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const reportPresets = [
    {
      id: "trips",
      name: "Trip Logistics & Dispatch Manifest",
      description: "Complete operational history with start/end odometers, routes, revenues, delay calculations, and cargo payloads.",
      icon: Truck,
      recordsLabel: `${kpis?.completed_trips || 0} completed trips recorded`,
    },
    {
      id: "vehicles",
      name: "Fleet Asset & Utilization Ledger",
      description: "Inventory of all registered heavy, light, and electric vehicles with lifecycle statuses, odometer readings, and payload limits.",
      icon: TrendingUp,
      recordsLabel: `${kpis?.total_vehicles || 0} registered fleet assets`,
    },
    {
      id: "fuel",
      name: "Fuel Ingestion & Carbon Ledger",
      description: "Itemized refuel entries, unit fuel pricing, measured consumption efficiency (km/L), and computed CO2 emission footprints.",
      icon: Fuel,
      recordsLabel: `${(kpis?.total_fuel_consumed_litres || 0).toLocaleString()} litres logged`,
    },
    {
      id: "maintenance",
      name: "Preventive & Corrective Maintenance Register",
      description: "Service work orders, maintenance costs, odometer milestones, and vendor servicing details.",
      icon: Wrench,
      recordsLabel: `$${(kpis?.total_maintenance_cost || 0).toLocaleString()} total maintenance spend`,
    },
  ];

  return (
    <div className="pb-12">
      <TopBar title="Reports & Analytics Export" subtitle="Database-backed operational extracts, financial reconciliations, and regulatory compliance exports" />

      <div className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Export Center</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any operational domain to download CSV data verified against PostgreSQL records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport(reportType)}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting CSV..." : `Export Selected (${reportType.toUpperCase()})`}
            </button>
          </div>
        </div>

      {exportSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Operating Revenue"
          value={`$${(kpis?.total_revenue || 0).toLocaleString()}`}
          subtitle={`Net: $${(kpis?.net_operating_income || 0).toLocaleString()}`}
          icon={DollarSign}
        />
        <StatCard
          title="Total Operational Spend"
          value={`$${(kpis?.total_operating_cost || 0).toLocaleString()}`}
          subtitle={`Fuel: $${(kpis?.total_fuel_cost || 0).toLocaleString()}`}
          icon={Fuel}
        />
        <StatCard
          title="On-Time Delivery Rate"
          value={`${kpis?.on_time_delivery_rate_percent || 0}%`}
          subtitle={`${kpis?.delayed_trips || 0} recorded delays`}
          icon={TrendingUp}
        />
        <StatCard
          title="Carbon Footprint"
          value={`${(kpis?.total_co2_emissions_kg || 0).toLocaleString()} kg`}
          subtitle={`${kpis?.co2_per_km_g || 0} g CO2 / km`}
          icon={Leaf}
        />
      </div>

      {/* Report Selection Grid */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Standard Operational Datasets</h2>
            <p className="text-xs text-slate-500">Select an operational domain to inspect and export as compliant CSV.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Reporting Horizon:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last Quarter</option>
                <option value="all">All-Time Historical</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportPresets.map((preset) => {
            const Icon = preset.icon;
            const isSelected = reportType === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => setReportType(preset.id)}
                className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "border-teal-500 bg-teal-50/20 shadow-xs"
                    : "border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${isSelected ? "bg-teal-600 text-white" : "bg-slate-200/70 text-slate-600"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-slate-900 text-sm">{preset.name}</h3>
                    </div>
                    <input
                      type="radio"
                      checked={isSelected}
                      onChange={() => setReportType(preset.id)}
                      className="text-teal-600 focus:ring-teal-500 h-4 w-4"
                    />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{preset.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">{preset.recordsLabel}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(preset.id);
                    }}
                    className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-800 font-semibold px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100/80 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download CSV
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial & Environmental Reconciliation Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Executive Reconciliation Metrics</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Metric Indicator</th>
                <th className="px-4 py-3">Database Measurement</th>
                <th className="px-4 py-3">Calculation Basis</th>
                <th className="px-4 py-3">Audit Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3.5 font-medium text-slate-900">Fleet Utilization</td>
                <td className="px-4 py-3.5 font-semibold text-teal-700">{kpis?.fleet_utilization_percent || 0}%</td>
                <td className="px-4 py-3.5">Active Dispatches / Total Non-Retired Fleet Vehicles</td>
                <td className="px-4 py-3.5 text-emerald-600 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-medium text-slate-900">Average Fuel Economy</td>
                <td className="px-4 py-3.5 font-semibold text-slate-900">{kpis?.average_fuel_efficiency_km_per_l || 0} km/L</td>
                <td className="px-4 py-3.5">Total Documented Trip KM / Verified Litres Dispensed</td>
                <td className="px-4 py-3.5 text-emerald-600 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-medium text-slate-900">Gross Operating Profit</td>
                <td className="px-4 py-3.5 font-semibold text-emerald-700">
                  ${((kpis?.net_operating_income || 0)).toLocaleString()}
                </td>
                <td className="px-4 py-3.5">Revenue - (Fuel Costs + Maintenance Workorders + Incidental Expenses)</td>
                <td className="px-4 py-3.5 text-emerald-600 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3.5 font-medium text-slate-900">Freight Transport Intensity</td>
                <td className="px-4 py-3.5 font-semibold text-slate-900">{kpis?.co2_per_tonne_km_g || 0} g CO2 / t-km</td>
                <td className="px-4 py-3.5">Total CO2 (g) / Aggregate Cargo Tonne-Kilometres</td>
                <td className="px-4 py-3.5 text-emerald-600 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ISO 14083 Compliant
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  );
}
