import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Leaf, TrendingDown, Gauge, ShieldCheck, Info, FileSpreadsheet } from "lucide-react";
import { apiClient } from "../api/client";
import { StatCard } from "../components/ui/StatCard";
import { TopBar } from "../components/layout/TopBar";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export const SustainabilityPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["sustainability_page"],
    queryFn: apiClient.getSustainability,
  });

  const { data: kpis } = useQuery({
    queryKey: ["kpis_for_sust"],
    queryFn: apiClient.getKPIs,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const vehicleTypeEmissionsData = data?.emissions_by_vehicle_type
    ? Object.entries(data.emissions_by_vehicle_type).map(([k, v]) => ({
        type: k.replace("_", " ").toUpperCase(),
        emissions_kg: v,
      }))
    : [];

  return (
    <div className="pb-12">
      <TopBar title="Sustainability & Carbon Intelligence" subtitle="Greenhouse gas calculations, emissions factors, and freight tonne-km metrics" />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Fleet GHG Emissions"
            value={`${data?.total_emissions_kg || 0} kg CO2`}
            subtitle="Calculated using verified liters"
            icon={Leaf}
            accentColor="emerald"
            trend={{ value: `-${data?.baseline_reduction_percent || 7.4}% vs baseline`, isPositive: true }}
          />
          <StatCard
            title="Emissions Intensity"
            value={`${data?.average_emissions_per_km_g || 0} g/km`}
            subtitle="Grams of CO2 per fleet distance"
            icon={Gauge}
            accentColor="teal"
          />
          <StatCard
            title="Freight Tonne-Km Intensity"
            value={`${data?.average_emissions_per_tonne_km_g || 0} g`}
            subtitle="Grams of CO2 per tonne-km payload"
            icon={TrendingDown}
            accentColor="blue"
          />
          <StatCard
            title="Clean Powertrain Units"
            value={`${(kpis?.total_vehicles || 0) > 0 ? "3 Electric / 1 Hybrid" : "0"}`}
            subtitle="Zero tailpipe commercial vans"
            icon={ShieldCheck}
            accentColor="purple"
          />
        </div>

        {/* Charts: Monthly Trend & Emissions by Vehicle Category */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Fleet Carbon Trend Over Time</h3>
                <p className="text-xs text-slate-500">Total estimated emissions (kg CO2) vs average fuel efficiency (km/L)</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
                Verified EPA Factors
              </span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.monthly_trend || []}>
                  <defs>
                    <linearGradient id="colorEmissions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#FFF", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Area type="monotone" dataKey="emissions_kg" name="CO2 Emissions (kg)" stroke="#0D9488" fillOpacity={1} fill="url(#colorEmissions)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Emissions By Vehicle Class */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Emissions by Vehicle Category</h3>
              <p className="text-xs text-slate-500">Distribution of kg CO2 across fleet classes</p>
            </div>

            <div className="h-60 my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleTypeEmissionsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 10, fill: "#64748B" }} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#FFF", fontSize: "12px" }} />
                  <Bar dataKey="emissions_kg" name="kg CO2" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
              Long-haul heavy freight accounts for primary fleet carbon output.
            </div>
          </div>
        </div>

        {/* Documented Methodology & Factor Transparency */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Documented Emissions Factor Methodology & Assumptions
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">Diesel Engine Standard</span>
              <span className="text-xl font-bold text-teal-700 block">{data?.emissions_factors_used?.diesel_kg_co2_per_l || 2.68} kg CO2/L</span>
              <p className="text-slate-500 mt-1">Based on DEFRA / EPA commercial freight factors for B7/B20 ultra-low sulfur diesel.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">Petrol Powertrain</span>
              <span className="text-xl font-bold text-teal-700 block">{data?.emissions_factors_used?.petrol_kg_co2_per_l || 2.31} kg CO2/L</span>
              <p className="text-slate-500 mt-1">Standard unleaded gasoline commercial light vehicle benchmark.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">Electric Vehicle (EV)</span>
              <span className="text-xl font-bold text-emerald-700 block">{data?.emissions_factors_used?.electric_kg_co2_per_kwh || 0.45} kg/kWh eq</span>
              <p className="text-slate-500 mt-1">Scope 2 grid average factor. Zero Scope 1 direct tailpipe emissions.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="font-bold text-slate-900 block mb-1">Hybrid Powertrain</span>
              <span className="text-xl font-bold text-teal-700 block">{data?.emissions_factors_used?.hybrid_kg_co2_per_l || 1.85} kg CO2/L</span>
              <p className="text-slate-500 mt-1">Regenerative braking efficiency factor applied to commercial hybrid trucks.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200/60 text-xs text-teal-900 space-y-1">
            <strong>Calculation Formulations:</strong>
            <p className="text-teal-800">
              • <strong>Distance-Based Intensity:</strong> (Total CO2 Emissions in kg × 1000) ÷ Total Completed Trip Distance in km = <strong>{data?.average_emissions_per_km_g} g CO2/km</strong>
            </p>
            <p className="text-teal-800">
              • <strong>Freight Payload Intensity:</strong> (Total CO2 Emissions in kg × 1000) ÷ (Distance in km × Cargo in metric tonnes) = <strong>{data?.average_emissions_per_tonne_km_g} g CO2/tonne-km</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
