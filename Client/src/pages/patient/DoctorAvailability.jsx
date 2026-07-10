import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import SlotGrid from "../../components/SlotGrid";
import { doctorsApi } from "../../services/doctors";

export default function DoctorAvailability() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([]);

  const doctorIdSafe = useMemo(() => doctorId, [doctorId]);

  const load = async (d) => {
    setLoading(true);
    try {
      const data = await doctorsApi.getAvailability({ doctorId: doctorIdSafe, date: d });
      setSlots(data?.slots ?? data ?? []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorIdSafe]);

  const onPick = (slotStart) => {
    navigate(`/patients/booking?doctorId=${encodeURIComponent(doctorIdSafe)}&date=${encodeURIComponent(date)}`, {
      state: { slotStart },
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Availability</h1>
          <p className="mt-1 text-sm text-slate-600">Pick a time slot to start booking.</p>
        </div>
        <Link to="/patients/doctors" className="text-sm font-medium text-slate-900 underline">
          Back to doctors
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                const next = e.target.value;
                setDate(next);
                load(next);
              }}
              className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div className="text-xs text-slate-500">
            Tip: booking holds the slot for a short time while you fill symptoms.
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Loading…
            </div>
          ) : (
            <SlotGrid slots={slots} onPick={onPick} />
          )}
        </div>
      </div>
    </div>
  );
}

