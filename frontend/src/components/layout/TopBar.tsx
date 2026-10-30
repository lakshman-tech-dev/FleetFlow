import React from "react";
import { Sparkles, Activity } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const TopBar: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* AI Engine Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200/80 rounded-full text-xs font-medium text-teal-800">
          <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
          <span>AI Intelligence Active</span>
        </div>

        {/* Database Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-700">
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>PostgreSQL 18 Connected</span>
        </div>

        {/* User Role Tag */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md uppercase tracking-wider text-[11px]">
            {user?.role?.replace("_", " ") || "GUEST"}
          </span>
        </div>
      </div>
    </header>
  );
};
