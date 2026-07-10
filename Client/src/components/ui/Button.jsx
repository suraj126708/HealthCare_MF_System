import React from "react";

const VARIANTS = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500 shadow-sm dark:bg-brand-500 dark:hover:bg-brand-400",
  secondary:
    "bg-surface text-text border border-border hover:bg-surface-muted focus-visible:ring-brand-500 dark:bg-surface-elevated dark:hover:bg-surface-muted",
  ghost:
    "bg-transparent text-text-muted hover:bg-surface-muted hover:text-text focus-visible:ring-brand-500",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm",
  outline:
    "border border-border-strong bg-transparent text-text hover:bg-surface-muted focus-visible:ring-brand-500",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  icon: Icon,
  iconPosition = "left",
  ...props
}) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "dark:focus-visible:ring-offset-slate-900",
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        className,
      ].join(" ")}
      {...props}
    >
      {Icon && iconPosition === "left" && <Icon className="h-4 w-4 shrink-0" />}
      {children}
      {Icon && iconPosition === "right" && <Icon className="h-4 w-4 shrink-0" />}
    </button>
  );
}
