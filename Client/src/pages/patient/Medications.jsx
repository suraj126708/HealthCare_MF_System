import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { frequencyLabel, instructionLabel } from "../../constants/prescription";
import {
  card,
  ddValue,
  dtLabel,
  emptyState,
  filterBtn,
  pageWrap,
  subheading,
} from "../../constants/ui";
import {
  formatMedicationDate,
  formatScheduleTimes,
  medicationsApi,
} from "../../services/medications";

const FILTERS = [
  { value: "active", label: "Active" },
  { value: "all", label: "All medications" },
];

function MedicationCard({ medication }) {
  const freq =
    medication.frequencyLabel ||
    frequencyLabel(medication.frequency, medication.frequencyPerDay);
  const instruction =
    medication.instructionLabel || instructionLabel(medication.instruction);

  return (
    <article className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">{medication.drug || "Medication"}</h2>
          <p className="mt-1 text-xs text-text-muted">
            {medication.doctorName || "Doctor"}
            {medication.specialization ? ` · ${medication.specialization}` : ""}
          </p>
        </div>
        <span
          className={[
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
            medication.status === "active"
              ? "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-950/50 dark:text-teal-400 dark:ring-teal-800"
              : "bg-surface-muted text-text-muted ring-border",
          ].join(" ")}
        >
          {medication.status === "active" ? "Active" : "Expired"}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className={dtLabel}>Dose</dt>
          <dd className={ddValue}>{medication.dosage || "—"}</dd>
        </div>
        <div>
          <dt className={dtLabel}>Frequency</dt>
          <dd className={ddValue}>{freq || "—"}</dd>
        </div>
        <div>
          <dt className={dtLabel}>Instruction</dt>
          <dd className={ddValue}>{instruction || "—"}</dd>
        </div>
        <div>
          <dt className={dtLabel}>Duration</dt>
          <dd className={ddValue}>
            {medication.durationDays ? `${medication.durationDays} day(s)` : "—"}
          </dd>
        </div>
        <div>
          <dt className={dtLabel}>Reminder times</dt>
          <dd className={ddValue}>{formatScheduleTimes(medication.timesOfDay)}</dd>
        </div>
        <div>
          <dt className={dtLabel}>Visit date</dt>
          <dd className={ddValue}>{formatMedicationDate(medication.visitDate)}</dd>
        </div>
        <div>
          <dt className={dtLabel}>Course</dt>
          <dd className={ddValue}>
            {formatMedicationDate(medication.startDate)} – {formatMedicationDate(medication.endDate)}
          </dd>
        </div>
        {medication.referenceId && (
          <div>
            <dt className={dtLabel}>Appointment ref</dt>
            <dd className={`${ddValue} font-medium`}>{medication.referenceId}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export default function Medications() {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("active");
  const [activeItems, setActiveItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [counts, setCounts] = useState({ active: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await medicationsApi.list();
        if (cancelled) return;
        setActiveItems(data?.active ?? []);
        setAllItems(data?.all ?? []);
        setCounts(data?.counts ?? { active: 0, total: 0 });
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load medications");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = useMemo(
    () => (filter === "active" ? activeItems : allItems),
    [filter, activeItems, allItems],
  );

  return (
    <div className={pageWrap}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">My medications</h1>
          <p className={subheading}>
            Prescriptions from completed visits with dose, schedule, and instructions.
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={filterBtn(filter === option.value)}
            >
              {option.label}
              {option.value === "active" && counts.active > 0 ? ` (${counts.active})` : ""}
              {option.value === "all" && counts.total > 0 ? ` (${counts.total})` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {loading && <div className={emptyState}>Loading medications…</div>}

        {!loading && visibleItems.length === 0 && (
          <div className={emptyState}>
            {filter === "active"
              ? "No active medications right now."
              : "No prescribed medications found from completed visits."}
          </div>
        )}

        {!loading &&
          visibleItems.map((medication) => (
            <MedicationCard key={medication.id} medication={medication} />
          ))}
      </div>
    </div>
  );
}
