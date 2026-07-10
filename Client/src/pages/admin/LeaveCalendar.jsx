import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import { card, input, label, pageWrap, select } from "../../constants/ui";
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
    <div className={pageWrap}>
      <PageHeader
        title="Leave calendar"
        description="Mark leave for any doctor and confirm affected appointment count."
      />

      <form onSubmit={onSubmit} className={`mt-6 max-w-xl ${card}`}>
        <div className="space-y-4">
          <div>
            <label className={label}>Doctor</label>
            <select
              value={doctorId}
              disabled={loadingDoctors}
              onChange={(e) => setDoctorId(e.target.value)}
              className={select}
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
            <label className={label}>Date</label>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={input}
            />
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
          <Button type="submit" disabled={submitting || loadingDoctors}>
            {submitting ? "Submitting…" : "Mark leave"}
          </Button>
        </div>
      </form>
    </div>
  );
}
