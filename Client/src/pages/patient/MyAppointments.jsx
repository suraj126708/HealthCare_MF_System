import React, { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Badge from "../../components/Badge";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  btnDangerOutline,
  card,
  ddValue,
  dtLabel,
  emptyState,
  input,
  labelSm,
  modalOverlay,
  modalPanel,
  pageWrap,
} from "../../constants/ui";
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
    <div className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text">
            {appointment.doctorName || appointment.doctor?.name || "Doctor"}
          </div>
          <div className="mt-1 text-xs text-text-muted">
            {appointment.specialization || "General practice"}
          </div>
        </div>
        <Badge variant="status" value={status} />
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className={dtLabel}>Date & time</dt>
          <dd className={ddValue}>{slotLabel(appointment.slotStart || appointment.dateTime)}</dd>
        </div>
        <div>
          <dt className={dtLabel}>Chief complaint</dt>
          <dd className={ddValue}>{appointment.chiefComplaint || "Not provided yet"}</dd>
        </div>
      </dl>

      {canCancel(status) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="button"
            disabled={cancelling}
            onClick={() => onCancel(id)}
            className={btnDangerOutline}
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
    <div className={pageWrap}>
      <PageHeader title="My appointments" description="Pending, confirmed, and completed.">
        <Link to="/patients/doctors">
          <Button size="sm">Book new</Button>
        </Link>
      </PageHeader>

      <div className="mt-6 grid gap-3">
        {loading && <div className={emptyState}>Loading…</div>}
        {!loading && items.length === 0 && <div className={emptyState}>No appointments yet.</div>}
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
          className={modalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCancelModal();
          }}
        >
          <div className={modalPanel}>
            <div className="text-sm font-semibold text-text">Cancel appointment</div>
            <div className="mt-1 text-xs text-text-muted">
              Add a reason (optional). This action can’t be undone.
            </div>

            <div className="mt-4">
              <label className={labelSm}>Reason (optional)</label>
              <textarea
                value={cancelModal.reason}
                onChange={(e) => setCancelModal((s) => ({ ...s, reason: e.target.value }))}
                rows={3}
                placeholder="e.g. Not feeling well, need to reschedule…"
                className={input}
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" disabled={Boolean(cancellingId)} onClick={closeCancelModal}>
                Close
              </Button>
              <Button variant="danger" size="sm" disabled={Boolean(cancellingId)} onClick={confirmCancel}>
                {cancellingId ? "Cancelling…" : "Confirm cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
