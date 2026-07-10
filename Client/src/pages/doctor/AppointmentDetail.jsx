import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Badge from "../../components/Badge";
import { doctorApi } from "../../services/doctor";

function slotLabel(slotStart) {
  if (!slotStart) return "—";
  try {
    const dt =
      typeof slotStart === "string" && slotStart.includes("T")
        ? parseISO(slotStart)
        : new Date(slotStart);
    if (Number.isNaN(dt.getTime())) return String(slotStart);
    return format(dt, "PPpp");
  } catch {
    return String(slotStart);
  }
}

export default function DoctorAppointmentDetail() {
  const { appointmentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await doctorApi.getAppointmentById({ appointmentId });
        if (!cancelled) setData(res?.appointment ?? res ?? null);
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

  const summary = data?.preVisitSummary ?? data ?? {};

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-lg font-semibold text-slate-900">Appointment</h1>
      {loading && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading…
        </div>
      )}
      {!loading && data && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {data.patientName || data.patient?.name || "Patient"}
              </div>
              <div className="mt-1 text-xs text-slate-600">{slotLabel(data.slotStart)}</div>
            </div>
            <Badge variant="urgency" value={summary.urgencyLevel || "Low"} />
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500">Chief complaint</div>
            <div className="mt-1 text-sm text-slate-900">
              {summary.chiefComplaint || "Not available"}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-500">Suggested questions</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
              {(summary.suggestedQuestions ?? []).slice(0, 3).map((q) => (
                <li key={q}>{q}</li>
              ))}
              {(summary.suggestedQuestions ?? []).length === 0 && <li>No suggestions</li>}
            </ul>
          </div>

          <div className="mt-4">
            <Link
              to={`/doctor/appointments/${appointmentId}/complete`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Complete appointment
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

