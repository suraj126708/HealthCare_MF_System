import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../../services/api";

export default function Medications() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get("/patients/medications");
        const data = res?.data?.data;
        if (!cancelled) setItems(data?.medications ?? data ?? []);
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-lg font-semibold text-slate-900">Medications</h1>
      <p className="mt-1 text-sm text-slate-600">Active reminders.</p>

      <div className="mt-6 grid gap-3">
        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No active medications.
          </div>
        )}
        {!loading &&
          items.map((m) => (
            <div key={m.id || m._id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-900">
                {m.drug || m.name || "Medication"}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                {m.dosage ? `${m.dosage} • ` : ""}
                {m.frequencyPerDay ? `${m.frequencyPerDay}x/day • ` : ""}
                {m.nextDoseAt ? `Next: ${m.nextDoseAt}` : ""}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

