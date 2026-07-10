import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Badge from "../../components/Badge";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  card,
  ddValue,
  dtLabel,
  emptyState,
  input,
  labelSm,
  pageWrap,
} from "../../constants/ui";
import { doctorApi } from "../../services/doctor";

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "cancelled_leave", label: "Cancelled (leave)" },
];

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

function canComplete(status) {
  return status === "confirmed";
}

function QueueCard({ appointment }) {
  const appointmentId = appointment.id || appointment._id;
  const status = appointment.status || "pending";

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text">
            {appointment.patientName || appointment.patient?.name || "Patient"}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {appointment.referenceId ? `Ref ${appointment.referenceId}` : "Patient appointment"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="status" value={status} />
          {appointment.urgencyLevel && (
            <Badge variant="urgency" value={appointment.urgencyLevel} />
          )}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className={dtLabel}>Doctor</dt>
          <dd className={ddValue}>
            {appointment.doctorName || "—"}
            {appointment.specialization ? (
              <span className="block text-xs text-text-muted">{appointment.specialization}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className={dtLabel}>Date & time</dt>
          <dd className={ddValue}>{slotLabel(appointment.slotStart)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className={dtLabel}>Chief complaint</dt>
          <dd className={ddValue}>{appointment.chiefComplaint || "Not provided yet"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Link to={`/doctor/appointments/${appointmentId}`}>
          <Button variant="secondary" size="sm">
            View details
          </Button>
        </Link>
        {canComplete(status) && (
          <Link to={`/doctor/appointments/${appointmentId}/complete`}>
            <Button size="sm">Complete appointment</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const loadQueue = async ({ nextDate = date, nextStatus = status } = {}) => {
    setLoading(true);
    try {
      const data = await doctorApi.listAppointments({
        date: nextDate,
        status: nextStatus || undefined,
      });
      const appointments = data?.appointments ?? data ?? [];
      const sorted = [...appointments].sort(
        (a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime(),
      );
      setItems(sorted);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleDate = useMemo(() => date, [date]);

  return (
    <div className={pageWrap}>
      <PageHeader title="Doctor dashboard" description="Today's queue, sorted by slot time.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
            <label className={labelSm}>Status</label>
            <select
              value={status}
              onChange={(e) => {
                const nextStatus = e.target.value;
                setStatus(nextStatus);
                loadQueue({ nextDate: date, nextStatus });
              }}
              className={input}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelSm}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                const next = e.target.value;
                setDate(next);
                loadQueue({ nextDate: next, nextStatus: status });
              }}
              className={input}
            />
          </div>
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-3">
        {loading && <div className={emptyState}>Loading queue…</div>}
        {!loading && items.length === 0 && (
          <div className={emptyState}>
            No appointments for {titleDate}
            {status ? ` with status "${status}"` : ""}.
          </div>
        )}
        {!loading &&
          items.map((appt) => (
            <QueueCard key={appt.id || appt._id} appointment={appt} />
          ))}
      </div>
    </div>
  );
}
