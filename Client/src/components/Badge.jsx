import React from "react";

const URGENCY_STYLES = {
  Low: "bg-green-50 text-green-700 ring-green-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  High: "bg-red-50 text-red-700 ring-red-200",
};

const STATUS_STYLES = {
  pending: "bg-slate-50 text-slate-700 ring-slate-200",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
  completed: "bg-green-50 text-green-700 ring-green-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
  cancelled_leave: "bg-red-50 text-red-700 ring-red-200",
};

export default function Badge({ variant = "status", value, className = "" }) {
  const styles =
    variant === "urgency" ? URGENCY_STYLES[value] : STATUS_STYLES[String(value)];

  const fallback = "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles ?? fallback,
        className,
      ].join(" ")}
    >
      {String(value)}
    </span>
  );
}

