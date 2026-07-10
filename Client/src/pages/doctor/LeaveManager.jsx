import { useState } from "react";
import toast from "react-hot-toast";
import { doctorApi } from "../../services/doctor";

export default function LeaveManager() {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await doctorApi.markLeave({ date, reason });
      const count = data?.affectedAppointments ?? 0;
      toast.success(`Leave marked. ${count} appointment(s) cancelled.`);
      setReason("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark leave");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-lg font-semibold text-slate-900">Leave manager</h1>
      <p className="mt-1 text-sm text-slate-600">
        Mark a leave day and notify affected patients.
      </p>

      <form onSubmit={onSubmit} className="mt-6 max-w-xl rounded-xl border border-slate-200 bg-white p-5">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Leave date</label>
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
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Mark leave"}
          </button>
        </div>
      </form>
    </div>
  );
}

