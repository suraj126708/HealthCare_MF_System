import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
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

function canComplete(status) {
  return status === "confirmed";
}

function QueueCard({ appointment }) {
  const appointmentId = appointment.id || appointment._id;
  const status = appointment.status || "pending";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {appointment.patientName || appointment.patient?.name || "Patient"}
          </div>
          <div className="mt-1 text-xs text-slate-600">Patient appointment</div>
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
          <dt className="text-xs font-medium text-slate-500">Date & time</dt>
          <dd className="mt-1 text-sm text-slate-800">
            {slotLabel(appointment.slotStart)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">
            Chief complaint
          </dt>
          <dd className="mt-1 text-sm text-slate-800">
            {appointment.chiefComplaint || "Not provided yet"}
          </dd>
        </div>
      </dl>

      {/* {appointment.symptoms && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-500">Symptoms</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
            {appointment.symptoms}
          </div>
        </div>
      )} */}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Link
          to={`/doctor/appointments/${appointmentId}`}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          View details
        </Link>
        {canComplete(status) && (
          <Link
            to={`/doctor/appointments/${appointmentId}/complete`}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Complete appointment
          </Link>
        )}
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const loadQueue = async (nextDate) => {
    setLoading(true);
    try {
      const data = await doctorApi.listAppointments({ date: nextDate });
      const appointments = data?.appointments ?? data ?? [];
      const sorted = [...appointments].sort(
        (a, b) =>
          new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime(),
      );
      setItems(sorted);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titleDate = useMemo(() => date, [date]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Doctor dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Today&apos;s queue, sorted by slot time.
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              const next = e.target.value;
              setDate(next);
              loadQueue(next);
            }}
            className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading queue…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No appointments for {titleDate}.
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
