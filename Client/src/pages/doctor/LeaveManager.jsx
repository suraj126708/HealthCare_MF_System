import { useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { card, input, label, pageWrap } from "../../constants/ui";
import { doctorApi } from "../../services/doctor";

export default function LeaveManager() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (date < today) {
      toast.error("Cannot mark leave for a past date.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await doctorApi.markLeave({ date, reason });
      const count = data?.affectedAppointments ?? 0;
      toast.success(`Leave marked. ${count} appointment(s) cancelled.`);
      setDate("");
      setReason("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark leave");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={pageWrap}>
      <PageHeader
        title="Leave manager"
        description="Mark a leave day and notify affected patients."
      />

      <form onSubmit={onSubmit} className={`mt-6 max-w-xl ${card}`}>
        <div className="space-y-4">
          <div>
            <label className={label}>Leave date</label>
            <input
              required
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={input}
            />
            <p className="mt-1 text-xs text-text-subtle">Past dates cannot be selected.</p>
          </div>
          <div>
            <label className={label}>Reason</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={input}
              placeholder="Optional reason"
            />
          </div>
          <Button type="submit" disabled={submitting || (date && date < today)}>
            {submitting ? "Submitting…" : "Mark leave"}
          </Button>
        </div>
      </form>
    </div>
  );
}
