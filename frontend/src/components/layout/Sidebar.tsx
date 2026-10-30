import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Truck,
  Users,
  Navigation,
  Wrench,
  Fuel,
  Database,
  Sparkles,
  Leaf,
  FileBarChart,
  ShieldCheck,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const Sidebar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();

  const navItems = [
    { label: "Overview", to: "/", icon: LayoutDashboard, roles: ["admin", "fleet_manager", "dispatcher", "safety_officer", "analyst"] },
    { label: "Fleet", to: "/fleet", icon: Truck, roles: ["admin", "fleet_manager", "dispatcher", "safety_officer", "analyst"] },
    { label: "Drivers", to: "/drivers", icon: Users, roles: ["admin", "fleet_manager", "dispatcher", "safety_officer"] },
    { label: "Trips & Dispatch", to: "/trips", icon: Navigation, roles: ["admin", "fleet_manager", "dispatcher", "analyst"] },
    { label: "Maintenance", to: "/maintenance", icon: Wrench, roles: ["admin", "fleet_manager", "safety_officer", "dispatcher"] },
    { label: "Fuel & Expenses", to: "/fuel", icon: Fuel, roles: ["admin", "fleet_manager", "analyst", "dispatcher"] },
    { label: "Data Pipelines", to: "/pipelines", icon: Database, roles: ["admin", "fleet_manager", "analyst"] },
    { label: "AI Intelligence", to: "/intelligence", icon: Sparkles, roles: ["admin", "fleet_manager", "safety_officer", "analyst"] },
    { label: "Sustainability", to: "/sustainability", icon: Leaf, roles: ["admin", "fleet_manager", "analyst", "safety_officer"] },
    { label: "Reports & Export", to: "/reports", icon: FileBarChart, roles: ["admin", "fleet_manager", "analyst"] },
    { label: "Audit & Security", to: "/audit", icon: ShieldCheck, roles: ["admin", "fleet_manager"] },
    { label: "Settings", to: "/settings", icon: Settings, roles: ["admin"] },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80 bg-[#0B1120]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
          <Leaf className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-white font-sans">
            Fleet<span className="text-teal-400">Flow</span>
          </span>
          <span className="block text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            Logistics Intelligence
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          if (!hasRole(item.roles as any)) return null;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-teal-600 text-white shadow-xs font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800 bg-[#0B1120]/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-teal-400 font-bold text-xs uppercase shrink-0">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name || "User"}</p>
              <p className="text-[10px] text-teal-400 uppercase font-medium tracking-wider truncate">
                {user?.role?.replace("_", " ") || "Member"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
