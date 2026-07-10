import { format, parseISO } from "date-fns";
import { api } from "./api";

export const medicationsApi = {
  async list() {
    const res = await api.get("/patients/medications");
    return res?.data?.data;
  },
};

export function formatMedicationDate(value) {
  if (!value) return "—";
  try {
    const dt =
      typeof value === "string" && value.includes("T") ? parseISO(value) : new Date(value);
    if (Number.isNaN(dt.getTime())) return String(value);
    return format(dt, "PP");
  } catch {
    return String(value);
  }
}

export function formatScheduleTimes(times = []) {
  if (!times?.length) return "—";
  return times
    .map((t) => {
      const [hh, mm] = String(t).split(":").map(Number);
      if (!Number.isFinite(hh)) return t;
      const period = hh >= 12 ? "PM" : "AM";
      const hour12 = hh % 12 || 12;
      return `${hour12}:${String(mm || 0).padStart(2, "0")} ${period}`;
    })
    .join(", ");
}
