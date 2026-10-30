import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral" | "purple";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default", className = "" }) => {
  const variantStyles = {
    default: "bg-slate-100 text-slate-800 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
    purple: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const norm = status?.toLowerCase();
  switch (norm) {
    case "available":
    case "active":
    case "completed":
    case "success":
      return <Badge variant="success">{status.replace("_", " ").toUpperCase()}</Badge>;
    case "dispatched":
    case "in_progress":
      return <Badge variant="info">{status.replace("_", " ").toUpperCase()}</Badge>;
    case "maintenance":
    case "scheduled":
    case "warning":
    case "medium":
      return <Badge variant="warning">{status.replace("_", " ").toUpperCase()}</Badge>;
    case "retired":
    case "suspended":
    case "cancelled":
    case "failed":
    case "critical":
    case "high":
      return <Badge variant="danger">{status.replace("_", " ").toUpperCase()}</Badge>;
    default:
      return <Badge variant="neutral">{status?.replace("_", " ")?.toUpperCase() || "UNKNOWN"}</Badge>;
  }
};
