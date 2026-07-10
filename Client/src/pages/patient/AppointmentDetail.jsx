import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Badge from "../../components/Badge";
import { appointmentsApi } from "../../services/appointments";

export default function PatientAppointmentDetail() {
  const { appointmentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await appointmentsApi.getById({ appointmentId });
        if (!cancelled) setData(d?.appointment ?? d ?? null);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load appointment");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-lg font-semibold text-slate-900">Appointment</h1>
      {loading && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading…
        </div>
      )}
      {!loading && data && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {data.doctorName || data.doctor?.name || "Doctor"}
              </div>
              <div className="mt-1 text-xs text-slate-600">{data.slotStart || "Slot"}</div>
            </div>
            <Badge variant="status" value={data.status || "pending"} />
          </div>

          {data.patientFriendlySummary && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-medium text-slate-500">Summary</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {data.patientFriendlySummary}
              </div>
            </div>
          )}

          {data.followUpSteps && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-medium text-slate-500">Follow-up steps</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {data.followUpSteps}
              </div>
            </div>
          )}

          {!!(data.medicationSchedule || data.prescription?.length) && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-medium text-slate-500">Medication schedule</div>
              <div className="mt-1 text-sm text-slate-800">
                {data.medicationSchedule || "See prescribed medication list below."}
              </div>
              {Array.isArray(data.prescription) && data.prescription.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                  {data.prescription.map((p, idx) => (
                    <li key={`${p.drug}-${idx}`}>
                      {p.drug} - {p.dosage}, {p.frequencyPerDay}x/day for {p.durationDays} day(s)
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

