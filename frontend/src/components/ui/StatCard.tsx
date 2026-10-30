import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: "teal" | "blue" | "emerald" | "amber" | "rose" | "purple";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = "teal",
}) => {
  const accentBorders = {
    teal: "border-l-teal-600",
    blue: "border-l-blue-600",
    emerald: "border-l-emerald-600",
    amber: "border-l-amber-500",
    rose: "border-l-rose-500",
    purple: "border-l-indigo-600",
  };

  const iconColors = {
    teal: "text-teal-600 bg-teal-50",
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    rose: "text-rose-600 bg-rose-50",
    purple: "text-indigo-600 bg-indigo-50",
  };

  return (
    <div
      className={`bg-white rounded-xl p-5 border border-slate-200 border-l-4 ${accentBorders[accentColor]} shadow-xs hover:shadow-md transition-shadow duration-200`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <div className={`p-2.5 rounded-lg ${iconColors[accentColor]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-md ${
              trend.isPositive ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
};
