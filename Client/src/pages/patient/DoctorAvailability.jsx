import React, { useEffect, useMemo, useState } from "react";
import { addMinutes, format, isSameDay, parseISO } from "date-fns";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import SlotGrid from "../../components/SlotGrid";
import PageHeader from "../../components/ui/PageHeader";
import {
  cardSm,
  cardMuted,
  input,
  label,
  link,
  pageWrap,
} from "../../constants/ui";
import { doctorsApi } from "../../services/doctors";

export default function DoctorAvailability() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState([]);

  const doctorIdSafe = useMemo(() => doctorId, [doctorId]);

  const disabledSlots = useMemo(() => {
    const selected = new Date(`${date}T00:00:00`);
    if (Number.isNaN(selected.getTime()) || !isSameDay(selected, new Date())) {
      return new Set();
    }

    const cutoff = addMinutes(new Date(), 5);
    const blocked = new Set();

    for (const slot of slots) {
      const slotStart = typeof slot === "string" ? slot : slot?.slotStart ?? "";
      if (!slotStart) continue;

      const dt = slotStart.includes("T") ? parseISO(slotStart) : new Date(slotStart);
      if (!Number.isNaN(dt.getTime()) && dt < cutoff) {
        blocked.add(slot);
        blocked.add(slotStart);
      }
    }

    return blocked;
  }, [date, slots]);

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
    const dt = slotStart.includes("T") ? parseISO(slotStart) : new Date(slotStart);
    const cutoff = addMinutes(new Date(), 5);
    if (!Number.isNaN(dt.getTime()) && dt < cutoff) {
      toast.error("Please pick a slot at least 5 minutes from now.");
      return;
    }

    navigate(`/patients/booking?doctorId=${encodeURIComponent(doctorIdSafe)}&date=${encodeURIComponent(date)}`, {
      state: { slotStart },
    });
  };

  return (
    <div className={pageWrap}>
      <PageHeader title="Availability" description="Pick a time slot to start booking.">
        <Link to="/patients/doctors" className={link}>
          Back to doctors
        </Link>
      </PageHeader>

      <div className={`mt-6 ${cardSm}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className={label}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                const next = e.target.value;
                setDate(next);
                load(next);
              }}
              className={input}
            />
          </div>
          <div className="text-xs text-text-subtle">
            Tip: booking holds the slot for a short time while you fill symptoms.
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className={`${cardMuted} text-sm text-text-muted`}>Loading…</div>
          ) : (
            <SlotGrid slots={slots} disabledSlots={disabledSlots} onPick={onPick} />
          )}
        </div>
      </div>
    </div>
  );
}
