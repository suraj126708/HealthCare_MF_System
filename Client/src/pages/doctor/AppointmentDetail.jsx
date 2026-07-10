import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Badge from "../../components/Badge";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { card, cardMuted, emptyState, pageWrap } from "../../constants/ui";
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
    <div className={pageWrap}>
      <PageHeader title="Appointment" />
      {loading && <div className={`mt-4 ${emptyState}`}>Loading…</div>}
      {!loading && data && (
        <div className={`mt-4 ${card}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-text">
                {data.patientName || data.patient?.name || "Patient"}
              </div>
              <div className="mt-1 text-xs text-text-muted">{slotLabel(data.slotStart)}</div>
            </div>
            <Badge variant="urgency" value={summary.urgencyLevel || "Low"} />
          </div>

          <div className={`mt-4 ${cardMuted}`}>
            <div className="text-xs font-medium text-text-muted">Chief complaint</div>
            <div className="mt-1 text-sm text-text">{summary.chiefComplaint || "Not available"}</div>
          </div>

          <div className={`mt-4 ${cardMuted}`}>
            <div className="text-xs font-medium text-text-muted">Suggested questions</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text">
              {(summary.suggestedQuestions ?? []).slice(0, 3).map((q) => (
                <li key={q}>{q}</li>
              ))}
              {(summary.suggestedQuestions ?? []).length === 0 && <li>No suggestions</li>}
            </ul>
          </div>

          <div className="mt-4">
            <Link to={`/doctor/appointments/${appointmentId}/complete`}>
              <Button>Complete appointment</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
