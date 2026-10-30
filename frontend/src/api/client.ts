import axios from "axios";
import {
  AuthResponse,
  Vehicle,
  Driver,
  Trip,
  MaintenanceRecord,
  FuelRecord,
  ExpenseRecord,
  PipelineRun,
  AIDetection,
  MaintenanceRiskItem,
  DeliveryDelayRiskItem,
  OperationalKPIs,
  SustainabilityAnalytics,
  AuditLog,
  User,
  CopilotQueryResponse,
} from "../types/api";

const api = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fleetflow_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle unauthenticated 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("fleetflow_token");
        localStorage.removeItem("fleetflow_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const apiClient = {
  // Auth
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    return res.data;
  },
  getCurrentUser: async (): Promise<User> => {
    const res = await api.get<User>("/auth/me");
    return res.data;
  },

  // Users
  getUsers: async (): Promise<{ items: User[]; total: number }> => {
    const res = await api.get<{ items: User[]; total: number }>("/users");
    return res.data;
  },

  // Vehicles
  getVehicles: async (params?: { status?: string; vehicle_type?: string; search?: string }): Promise<{ items: Vehicle[]; total: number }> => {
    const res = await api.get<{ items: Vehicle[]; total: number }>("/vehicles", { params });
    return res.data;
  },
  getVehicle: async (id: number): Promise<Vehicle> => {
    const res = await api.get<Vehicle>(`/vehicles/${id}`);
    return res.data;
  },
  createVehicle: async (data: Partial<Vehicle>): Promise<Vehicle> => {
    const res = await api.post<Vehicle>("/vehicles", data);
    return res.data;
  },
  updateVehicle: async (id: number, data: Partial<Vehicle>): Promise<Vehicle> => {
    const res = await api.put<Vehicle>(`/vehicles/${id}`, data);
    return res.data;
  },
  retireVehicle: async (id: number): Promise<Vehicle> => {
    const res = await api.post<Vehicle>(`/vehicles/${id}/retire`);
    return res.data;
  },

  // Drivers
  getDrivers: async (params?: { status?: string; category?: string; search?: string }): Promise<{ items: Driver[]; total: number }> => {
    const res = await api.get<{ items: Driver[]; total: number }>("/drivers", { params });
    return res.data;
  },
  createDriver: async (data: Partial<Driver>): Promise<Driver> => {
    const res = await api.post<Driver>("/drivers", data);
    return res.data;
  },
  updateDriver: async (id: number, data: Partial<Driver>): Promise<Driver> => {
    const res = await api.put<Driver>(`/drivers/${id}`, data);
    return res.data;
  },

  // Trips
  getTrips: async (params?: { status?: string; vehicle_id?: number; search?: string }): Promise<{ items: Trip[]; total: number }> => {
    const res = await api.get<{ items: Trip[]; total: number }>("/trips", { params });
    return res.data;
  },
  getTrip: async (id: number): Promise<Trip> => {
    const res = await api.get<Trip>(`/trips/${id}`);
    return res.data;
  },
  createTrip: async (data: Partial<Trip>): Promise<Trip> => {
    const res = await api.post<Trip>("/trips", data);
    return res.data;
  },
  dispatchTrip: async (id: number, start_odometer_km?: number): Promise<Trip> => {
    const res = await api.post<Trip>(`/trips/${id}/dispatch`, { start_odometer_km });
    return res.data;
  },
  completeTrip: async (id: number, end_odometer_km: number): Promise<Trip> => {
    const res = await api.post<Trip>(`/trips/${id}/complete`, { end_odometer_km });
    return res.data;
  },
  cancelTrip: async (id: number, cancellation_reason: string): Promise<Trip> => {
    const res = await api.post<Trip>(`/trips/${id}/cancel`, { cancellation_reason });
    return res.data;
  },

  // Maintenance
  getMaintenance: async (params?: { vehicle_id?: number; status?: string }): Promise<{ items: MaintenanceRecord[]; total: number }> => {
    const res = await api.get<{ items: MaintenanceRecord[]; total: number }>("/maintenance", { params });
    return res.data;
  },
  scheduleMaintenance: async (data: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> => {
    const res = await api.post<MaintenanceRecord>("/maintenance", data);
    return res.data;
  },
  startMaintenance: async (id: number): Promise<MaintenanceRecord> => {
    const res = await api.post<MaintenanceRecord>(`/maintenance/${id}/start`);
    return res.data;
  },
  completeMaintenance: async (id: number, cost: number, next_service_odometer_km?: number, service_provider?: string): Promise<MaintenanceRecord> => {
    const res = await api.post<MaintenanceRecord>(`/maintenance/${id}/complete`, {
      cost,
      next_service_odometer_km,
      service_provider,
    });
    return res.data;
  },
  cancelMaintenance: async (id: number): Promise<MaintenanceRecord> => {
    const res = await api.post<MaintenanceRecord>(`/maintenance/${id}/cancel`);
    return res.data;
  },

  // Fuel
  getFuelRecords: async (params?: { vehicle_id?: number; record_type?: string }): Promise<{ items: FuelRecord[]; total: number }> => {
    const res = await api.get<{ items: FuelRecord[]; total: number }>("/fuel", { params });
    return res.data;
  },
  createFuelRecord: async (data: Partial<FuelRecord>): Promise<FuelRecord> => {
    const res = await api.post<FuelRecord>("/fuel", data);
    return res.data;
  },

  // Expenses
  getExpenses: async (params?: { vehicle_id?: number; category?: string }): Promise<{ items: ExpenseRecord[]; total: number }> => {
    const res = await api.get<{ items: ExpenseRecord[]; total: number }>("/expenses", { params });
    return res.data;
  },
  createExpense: async (data: Partial<ExpenseRecord>): Promise<ExpenseRecord> => {
    const res = await api.post<ExpenseRecord>("/expenses", data);
    return res.data;
  },
  deleteExpense: async (id: number): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  },

  // Reporting & Sustainability
  getKPIs: async (): Promise<OperationalKPIs> => {
    const res = await api.get<OperationalKPIs>("/reports/kpis");
    return res.data;
  },
  getSustainability: async (): Promise<SustainabilityAnalytics> => {
    const res = await api.get<SustainabilityAnalytics>("/reports/sustainability");
    return res.data;
  },

  // Pipelines
  triggerPipeline: async (pipeline_name: string = "daily_fleet_analytics"): Promise<PipelineRun> => {
    const res = await api.post<PipelineRun>("/pipelines/run", { pipeline_name, source_type: "database" });
    return res.data;
  },
  getPipelineHistory: async (): Promise<{ items: PipelineRun[]; total: number }> => {
    const res = await api.get<{ items: PipelineRun[]; total: number }>("/pipelines/history");
    return res.data;
  },

  // AI Intelligence
  getDetections: async (params?: { severity?: string; is_resolved?: boolean }): Promise<{ items: AIDetection[]; total: number }> => {
    const res = await api.get<{ items: AIDetection[]; total: number }>("/intelligence/detections", { params });
    return res.data;
  },
  resolveDetection: async (id: number): Promise<AIDetection> => {
    const res = await api.post<AIDetection>(`/intelligence/detections/${id}/resolve`);
    return res.data;
  },
  getMaintenanceRisk: async (): Promise<MaintenanceRiskItem[]> => {
    const res = await api.get<MaintenanceRiskItem[]>("/intelligence/maintenance-risk");
    return res.data;
  },
  getDeliveryDelayRisk: async (): Promise<DeliveryDelayRiskItem[]> => {
    const res = await api.get<DeliveryDelayRiskItem[]>("/intelligence/delivery-delay-risk");
    return res.data;
  },

  // Users
  createUser: async (data: Partial<User> & { password?: string }): Promise<User> => {
    const res = await api.post<User>("/users", data);
    return res.data;
  },
  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    const res = await api.put<User>(`/users/${id}`, data);
    return res.data;
  },

  // Reports
  exportReportCsv: async (reportType: string = "trips"): Promise<Blob> => {
    const res = await api.get(`/reports/export/csv?report_type=${reportType}`, {
      responseType: "blob",
    });
    return res.data;
  },

  // Audit
  getAuditLogs: async (params?: { action?: string; search?: string }): Promise<{ items: AuditLog[]; total: number }> => {
    const res = await api.get<{ items: AuditLog[]; total: number }>("/audit", { params });
    return res.data;
  },

  // FleetCopilot AI
  queryCopilot: async (message: string): Promise<CopilotQueryResponse> => {
    const res = await api.post<CopilotQueryResponse>("/copilot/query", { message });
    return res.data;
  },
};
