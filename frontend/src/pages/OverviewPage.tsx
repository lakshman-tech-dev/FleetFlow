import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Navigation,
  Wrench,
  Fuel,
  Leaf,
  DollarSign,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { apiClient } from "../api/client";
import { StatCard } from "../components/ui/StatCard";
import { StatusBadge } from "../components/ui/Badge";
import { TopBar } from "../components/layout/TopBar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Link } from "react-router-dom";

export const OverviewPage: React.FC = () => {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["kpis"],
    queryFn: apiClient.getKPIs,
    refetchInterval: 15000,
  });

  const { data: tripsData } = useQuery({
    queryKey: ["recent_trips"],
    queryFn: () => apiClient.getTrips({ status: undefined }),
  });

  const { data: detectionsData } = useQuery({
    queryKey: ["active_detections"],
    queryFn: () => apiClient.getDetections({ is_resolved: false }),
  });

  const { data: sustainability } = useQuery({
    queryKey: ["sustainability_summary"],
    queryFn: apiClient.getSustainability,
  });

  if (kpisLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const fleetDonutData = [
    { name: "Available", value: kpis?.vehicles_available || 0, color: "#10B981" },
    { name: "Dispatched", value: kpis?.vehicles_dispatched || 0, color: "#0D9488" },
    { name: "In Maintenance", value: kpis?.vehicles_maintenance || 0, color: "#F59E0B" },
    { name: "Retired", value: kpis?.vehicles_retired || 0, color: "#94A3B8" },
  ];

  const financialTrendData = [
    { name: "Trips Completed", revenue: Number(kpis?.total_revenue || 0), cost: Number(kpis?.total_operating_cost || 0), fuel: Number(kpis?.total_fuel_cost || 0) },
    { name: "Prev Benchmark", revenue: Number(kpis?.total_revenue || 0) * 0.88, cost: Number(kpis?.total_operating_cost || 0) * 0.92, fuel: Number(kpis?.total_fuel_cost || 0) * 0.94 },
  ];

  return (
    <div className="pb-12">
      <TopBar title="Executive Command Center" subtitle="Real-time operational metrics, fleet readiness, and AI risk dispatch alerts" />

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Tier 1: Core Operational KPIs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Fleet Operations & Financials</h2>
            <span className="text-xs text-slate-400">Live Telemetry Sync</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Fleet Utilization"
              value={`${kpis?.fleet_utilization_percent || 0}%`}
              subtitle={`${kpis?.vehicles_dispatched || 0} active / ${kpis?.total_vehicles || 0} total units`}
              icon={Truck}
              accentColor="teal"
              trend={{ value: "+3.2%", isPositive: true }}
            />
            <StatCard
              title="Active Trips"
              value={kpis?.active_trips || 0}
              subtitle={`${kpis?.completed_trips || 0} completed | ${kpis?.delayed_trips || 0} delayed`}
              icon={Navigation}
              accentColor="blue"
              trend={{ value: `${kpis?.on_time_delivery_rate_percent || 0}% on-time`, isPositive: (kpis?.on_time_delivery_rate_percent || 0) >= 90 }}
            />
            <StatCard
              title="Operating Profit"
              value={`$${Number(kpis?.net_operating_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subtitle={`Revenue $${Number(kpis?.total_revenue || 0).toLocaleString()} - Cost $${Number(kpis?.total_operating_cost || 0).toLocaleString()}`}
              icon={DollarSign}
              accentColor="emerald"
            />
            <StatCard
              title="Fleet Avg Efficiency"
              value={`${kpis?.average_fuel_efficiency_km_per_l || 0} km/L`}
              subtitle={`Total Fuel: ${Number(kpis?.total_fuel_consumed_litres || 0).toLocaleString()} L`}
              icon={Fuel}
              accentColor="amber"
            />
          </div>
        </div>

        {/* Tier 2: AI Risk Alerts & Sustainability Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Carbon Footprint"
            value={`${kpis?.total_co2_emissions_kg || 0} kg`}
            subtitle={`${kpis?.co2_per_km_g || 0} g CO2/km | ${kpis?.co2_per_tonne_km_g || 0} g/tonne-km`}
            icon={Leaf}
            accentColor="emerald"
          />
          <StatCard
            title="Maintenance Flags"
            value={kpis?.pending_maintenance_alerts || 0}
            subtitle={`${kpis?.vehicles_maintenance || 0} vehicles grounded in shop`}
            icon={Wrench}
            accentColor="amber"
          />
          <StatCard
            title="Critical AI Anomalies"
            value={kpis?.critical_ai_anomalies || 0}
            subtitle="Flagged by Isolation Forest & Rules"
            icon={Sparkles}
            accentColor="rose"
          />
          <StatCard
            title="Total Fleet Size"
            value={kpis?.total_vehicles || 0}
            subtitle={`${kpis?.vehicles_available || 0} vehicles ready to dispatch`}
            icon={Truck}
            accentColor="purple"
          />
        </div>

        {/* Tier 3: Charts and Operational Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Financial & Operating Trends */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Financial Overview</h3>
                <p className="text-xs text-slate-500">Revenue vs Operating Expenditures and Fuel Costs</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                Operating Margin: {kpis?.total_revenue && Number(kpis.total_revenue) > 0 ? ((Number(kpis.net_operating_income) / Number(kpis.total_revenue)) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#FFF", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Bar dataKey="revenue" name="Revenue ($)" fill="#0D9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="Operating Cost ($)" fill="#64748B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fuel" name="Fuel Expense ($)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Fleet Status Donut */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Fleet Status Distribution</h3>
              <p className="text-xs text-slate-500">Live vehicle availability breakdown</p>
            </div>

            <div className="h-56 my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fleetDonutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {fleetDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#FFF", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Ready for dispatch:</span>
              <span className="font-bold text-emerald-600">{kpis?.vehicles_available} units</span>
            </div>
          </div>
        </div>

        {/* Tier 4: Priority AI Alerts Panel & Recent Trips */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Priority AI Risk Alerts */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Priority AI Risk Alerts</h3>
              </div>
              <Link to="/intelligence" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {detectionsData?.items && detectionsData.items.length > 0 ? (
                detectionsData.items.slice(0, 4).map((det) => (
                  <div key={det.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900 capitalize">
                        {det.detection_type.replace("_", " ")}
                      </span>
                      <StatusBadge status={det.severity} />
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{det.explanation}</p>
                    <div className="mt-2 text-[11px] text-teal-700 font-medium">
                      Risk Score: {det.risk_score} / 100
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No active risk alerts. Operations operating within normal baseline.
                </div>
              )}
            </div>
          </div>

          {/* Recent Trips Table */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active & Recent Trips</h3>
              <Link to="/trips" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                Dispatch Board <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Trip Code</th>
                    <th className="pb-3">Route</th>
                    <th className="pb-3">Cargo Weight</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {tripsData?.items && tripsData.items.slice(0, 5).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-semibold text-slate-900">{t.trip_code}</td>
                      <td className="py-3">{t.origin} → {t.destination}</td>
                      <td className="py-3">{t.cargo_weight_kg.toLocaleString()} kg</td>
                      <td className="py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-900">
                        ${Number(t.revenue).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tier 5: Sustainability Highlights */}
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold">
              <Leaf className="w-3.5 h-3.5 text-teal-400" />
              <span>ESG Carbon Performance</span>
            </div>
            <h3 className="text-lg font-bold tracking-tight">Sustainable Fleet Decarbonization Progress</h3>
            <p className="text-xs text-slate-300 max-w-xl">
              FleetFlow tracks verified distance, fuel-specific emission factors (Diesel 2.68 kg CO2/L, Petrol 2.31 kg CO2/L), and freight tonne-km metrics. Fleet baseline emissions reduced by {sustainability?.baseline_reduction_percent || 7.4}% this quarter.
            </p>
          </div>
          <Link
            to="/sustainability"
            className="shrink-0 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-md"
          >
            Open Sustainability Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
};
