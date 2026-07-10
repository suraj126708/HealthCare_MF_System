import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import adminApi from "../../services/admin";

export default function LeaveCalendar() {
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDoctors(true);
      try {
        const data = await adminApi.listDoctors();
        const list = data?.doctors ?? data ?? [];
        if (!cancelled) {
          setDoctors(list);
          if (list[0]?._id || list[0]?.id) {
            setDoctorId(list[0]._id || list[0].id);
          }
        }
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load doctors");
      } finally {
        if (!cancelled) setLoadingDoctors(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!doctorId) {
      toast.error("Select a doctor");
      return;
    }
    setSubmitting(true);
    try {
      const data = await adminApi.markDoctorLeave({ doctorId, date, reason });
      const count = data?.affectedAppointments ?? 0;
      toast.success(`Leave marked. ${count} appointment(s) affected.`);
      setReason("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark leave");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-lg font-semibold text-slate-900">Leave calendar</h1>
      <p className="mt-1 text-sm text-slate-600">
        Mark leave for any doctor and confirm affected appointment count.
      </p>

      <form onSubmit={onSubmit} className="mt-6 max-w-xl rounded-xl border border-slate-200 bg-white p-5">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Doctor</label>
            <select
              value={doctorId}
              disabled={loadingDoctors}
              onChange={(e) => setDoctorId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              {doctors.map((doc) => {
                const id = doc._id || doc.id;
                return (
                  <option key={id} value={id}>
                    {doc.name} ({doc.specialization || "General"})
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="Optional reason"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || loadingDoctors}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Mark leave"}
          </button>
        </div>
      </form>
    </div>
  );
}

