import React from "react";
import { format, parseISO } from "date-fns";
import { cardMuted, emptyState } from "../constants/ui";

function slotStartOf(slot) {
  if (typeof slot === "string") return slot;
  if (slot && typeof slot === "object") return slot.slotStart ?? "";
  return String(slot ?? "");
}

function slotLabel(slotStart) {
  if (!slotStart) return "";
  try {
    const dt = slotStart.includes("T")
      ? parseISO(slotStart)
      : new Date(slotStart);
    if (Number.isNaN(dt.getTime())) return String(slotStart);
    return format(dt, "p");
  } catch {
    return String(slotStart);
  }
}

function slotBooked(slot) {
  if (slot && typeof slot === "object") {
    if (slot.available === false) return true;
    if (slot.booked === true) return true;
  }
  return false;
}

export default function SlotGrid({
  slots = [],
  disabledSlots = new Set(),
  onPick,
}) {
  if (!slots.length) {
    return (
      <div className={`${emptyState}`}>
        No slots for this date.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((slot) => {
        const slotStart = slotStartOf(slot);
        const booked = slotBooked(slot);
        const disabled =
          booked || disabledSlots.has(slot) || disabledSlots.has(slotStart);
        return (
          <button
            key={slotStart}
            type="button"
            disabled={disabled}
            onClick={() => onPick?.(slotStart)}
            className={[
              "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
              disabled
                ? "cursor-not-allowed border-border bg-surface-muted text-text-subtle"
                : "border-border bg-surface text-text hover:border-brand-300 hover:bg-brand-50 dark:hover:border-brand-700 dark:hover:bg-brand-950/40",
            ].join(" ")}
          >
            {booked ? `${slotLabel(slotStart)} · Booked` : slotLabel(slotStart)}
          </button>
        );
      })}
    </div>
  );
}
