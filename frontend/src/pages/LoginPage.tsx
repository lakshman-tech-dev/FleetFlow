import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Leaf, Lock, Mail, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("admin@fleetflow.io");
  const [password, setPassword] = useState("FleetFlow2026!Admin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Authentication failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demEmail: string, demPass: string) => {
    setEmail(demEmail);
    setPassword(demPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center items-center p-6 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10">
        {/* Brand Header */}
        <div className="bg-[#0B1120] p-8 text-center border-b border-slate-800">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 items-center justify-center text-white mb-3 shadow-lg shadow-teal-500/30">
            <Leaf className="w-7 h-7 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Fleet<span className="text-teal-400">Flow</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            AI-Powered Sustainable Logistics Intelligence
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@fleetflow.io"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Authenticating..." : "Sign In to FleetFlow"}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Demo Role Selectors */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Quick Demo Access
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setDemoAccount("admin@fleetflow.io", "FleetFlow2026!Admin")}
                className="p-1.5 text-left rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
              >
                👑 Administrator
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount("manager@fleetflow.io", "FleetFlow2026!Demo")}
                className="p-1.5 text-left rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
              >
                🚛 Fleet Manager
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount("dispatcher@fleetflow.io", "FleetFlow2026!Demo")}
                className="p-1.5 text-left rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
              >
                📡 Dispatcher
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount("safety@fleetflow.io", "FleetFlow2026!Demo")}
                className="p-1.5 text-left rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium"
              >
                🛡️ Safety Officer
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
