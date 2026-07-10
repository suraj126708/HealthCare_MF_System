/** Shared theme-aware Tailwind class strings */

export const pageWrap = "mx-auto max-w-6xl px-4 py-8";

export const card = "rounded-2xl border border-border bg-surface p-5 shadow-sm";
export const cardSm = "rounded-xl border border-border bg-surface p-4 shadow-sm";
export const cardMuted = "rounded-xl border border-border bg-surface-muted p-4";

export const input =
  "mt-1.5 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60";

export const inputInline =
  "w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60";

export const select = input;
export const textarea = input;

export const label = "text-sm font-medium text-text";
export const labelSm = "text-xs font-medium text-text-muted";

export const heading = "text-2xl font-bold tracking-tight text-text";
export const subheading = "mt-1 text-sm text-text-muted";

export const emptyState = "rounded-2xl border border-border bg-surface p-4 text-sm text-text-muted";

export const tableWrap = "overflow-x-auto rounded-2xl border border-border bg-surface";
export const tableHead = "border-b border-border bg-surface-muted";
export const th = "px-4 py-3 text-left text-sm font-semibold text-text-muted";
export const td = "px-4 py-3 text-sm text-text";
export const trDivider = "border-b border-border";

export const modalOverlay = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm";
export const modalPanel = "w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl";

export const link = "font-semibold text-brand-600 hover:underline dark:text-brand-400";

export const dtLabel = "text-xs font-medium text-text-muted";
export const ddValue = "mt-1 text-sm text-text";

export const filterBtn = (active) =>
  [
    "rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
    active
      ? "bg-brand-600 text-white dark:bg-brand-500"
      : "border border-border bg-surface text-text-muted hover:bg-surface-muted hover:text-text",
  ].join(" ");

export const alertWarning =
  "rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";

export const btnDangerOutline =
  "rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40";

