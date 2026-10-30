import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UserRole } from "./types/api";

import { Layout } from "./components/layout/Layout";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { FleetPage } from "./pages/FleetPage";
import { DriversPage } from "./pages/DriversPage";
import { TripsPage } from "./pages/TripsPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { FuelPage } from "./pages/FuelPage";
import { PipelinesPage } from "./pages/PipelinesPage";
import { IntelligencePage } from "./pages/IntelligencePage";
import { SustainabilityPage } from "./pages/SustainabilityPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AuditPage } from "./pages/AuditPage";
import { SettingsPage } from "./pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: 1,
    },
  },
});

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying FleetFlow Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
          Your current account role ({user.role}) does not have permission to access this module. Please contact your FleetFlow administrator.
        </p>
        <Navigate to="/" replace />
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="fleet" element={<FleetPage />} />
              <Route path="drivers" element={<DriversPage />} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="maintenance" element={<MaintenancePage />} />
              <Route path="fuel" element={<FuelPage />} />
              <Route path="pipelines" element={<PipelinesPage />} />
              <Route path="intelligence" element={<IntelligencePage />} />
              <Route path="sustainability" element={<SustainabilityPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route
                path="audit"
                element={
                  <ProtectedRoute allowedRoles={["admin", "fleet_manager"]}>
                    <AuditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
