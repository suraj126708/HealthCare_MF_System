import React, { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Badge from "../../components/Badge";
import { appointmentsApi } from "../../services/appointments";

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

function canCancel(status) {
  return status === "pending" || status === "confirmed";
}

function AppointmentCard({ appointment, onCancel, cancelling }) {
  const id = appointment.id || appointment._id;
  const status = appointment.status || "pending";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {appointment.doctorName || appointment.doctor?.name || "Doctor"}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {appointment.specialization || "General practice"}
          </div>
        </div>
        <Badge variant="status" value={status} />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-slate-500">Date & time</dt>
          <dd className="mt-1 text-sm text-slate-800">
            {slotLabel(appointment.slotStart || appointment.dateTime)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Chief complaint</dt>
          <dd className="mt-1 text-sm text-slate-800">
            {appointment.chiefComplaint || "Not provided yet"}
          </dd>
        </div>
      </dl>

      {canCancel(status) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={cancelling}
            onClick={() => onCancel(id)}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Cancel appointment"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MyAppointments() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelModal, setCancelModal] = useState(() => ({
    open: false,
    appointmentId: null,
    reason: "",
  }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await appointmentsApi.list();
      setItems(data?.appointments ?? data ?? []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCancel = (appointmentId) => {
    setCancelModal({ open: true, appointmentId, reason: "" });
  };

  const closeCancelModal = () => {
    if (cancellingId) return;
    setCancelModal({ open: false, appointmentId: null, reason: "" });
  };

  const confirmCancel = async () => {
    const appointmentId = cancelModal.appointmentId;
    if (!appointmentId) return;

    const reason = cancelModal.reason.trim() || undefined;

    setCancellingId(appointmentId);
    try {
      await appointmentsApi.cancel({ appointmentId, reason });
      toast.success("Appointment cancelled");
      setItems((prev) =>
        prev.map((a) =>
          (a.id || a._id) === appointmentId ? { ...a, status: "cancelled" } : a,
        ),
      );
      setCancelModal({ open: false, appointmentId: null, reason: "" });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to cancel appointment");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">My appointments</h1>
          <p className="mt-1 text-sm text-slate-600">Pending, confirmed, and completed.</p>
        </div>
        <Link
          to="/patients/doctors"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Book new
        </Link>
      </div>

      <div className="mt-6 grid gap-3">
        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No appointments yet.
          </div>
        )}
        {!loading &&
          items.map((a) => (
            <AppointmentCard
              key={a.id || a._id}
              appointment={a}
              onCancel={onCancel}
              cancelling={cancellingId === (a.id || a._id)}
            />
          ))}
      </div>

      {cancelModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCancelModal();
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="text-sm font-semibold text-slate-900">Cancel appointment</div>
            <div className="mt-1 text-xs text-slate-600">
              Add a reason (optional). This action can’t be undone.
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-700">Reason (optional)</label>
              <textarea
                value={cancelModal.reason}
                onChange={(e) =>
                  setCancelModal((s) => ({ ...s, reason: e.target.value }))
                }
                rows={3}
                placeholder="e.g. Not feeling well, need to reschedule…"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={Boolean(cancellingId)}
                onClick={closeCancelModal}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Close
              </button>
              <button
                type="button"
                disabled={Boolean(cancellingId)}
                onClick={confirmCancel}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancellingId ? "Cancelling…" : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
