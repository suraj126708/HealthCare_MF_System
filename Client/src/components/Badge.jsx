import React from "react";

const URGENCY_STYLES = {
  Low: "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/50 dark:text-green-400 dark:ring-green-800",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-800",
  High: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800",
};

const STATUS_STYLES = {
  pending: "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800",
  completed: "bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/50 dark:text-green-400 dark:ring-green-800",
  cancelled: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800",
  cancelled_leave: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-800",
};

export default function Badge({ variant = "status", value, className = "" }) {
  const styles =
    variant === "urgency" ? URGENCY_STYLES[value] : STATUS_STYLES[String(value)];

  const fallback = "bg-surface-muted text-text-muted ring-border";

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

