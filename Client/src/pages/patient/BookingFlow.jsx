import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import SlotGrid from "../../components/SlotGrid";
import { doctorsApi } from "../../services/doctors";
import { appointmentsApi } from "../../services/appointments";

function secondsRemaining(expiresAtIso) {
  if (!expiresAtIso) return 0;
  const ms = new Date(expiresAtIso).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}

export default function BookingFlow() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const doctorId = params.get("doctorId") || "";
  const initialDate = params.get("date") || format(new Date(), "yyyy-MM-dd");
  const initialSlotStart = location.state?.slotStart || null;

  const [step, setStep] = useState(1); // 1 hold, 2 symptoms, 3 review
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [hold, setHold] = useState(() => ({
    appointmentId: null,
    slotStart: initialSlotStart,
    expiresAt: null,
  }));

  const [symptoms, setSymptoms] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expiredBanner, setExpiredBanner] = useState(false);

  const timerRef = useRef(null);
  const [remaining, setRemaining] = useState(0);

  const hasHold = Boolean(hold.appointmentId && hold.expiresAt);

  const loadSlots = async (d) => {
    if (!doctorId) return;
    setLoadingSlots(true);
    try {
      const data = await doctorsApi.getAvailability({ doctorId, date: d });
      setSlots(data?.slots ?? data ?? []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  // Start / update countdown for holds.
  useEffect(() => {
    if (!hasHold) {
      setRemaining(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return undefined;
    }

    const tick = () => {
      const r = secondsRemaining(hold.expiresAt);
      setRemaining(r);
      if (r <= 0) {
        setExpiredBanner(true);
        toast.error("Slot expired, pick another");
        setHold({ appointmentId: null, slotStart: null, expiresAt: null });
        setStep(1);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [hasHold, hold.expiresAt]);

  const holdLabel = useMemo(() => {
    if (!hold.slotStart) return "";
    try {
      const iso = hold.slotStart;
      const dt = iso.includes("T") ? parseISO(iso) : new Date(iso);
      return format(dt, "PPpp");
    } catch {
      return String(hold.slotStart);
    }
  }, [hold.slotStart]);

  const onPickSlot = async (slotStart) => {
    setExpiredBanner(false);
    setSubmitting(true);
    try {
      const data = await appointmentsApi.holdSlot({ doctorId, slotStart });
      setHold({
        appointmentId: data?.appointmentId,
        slotStart,
        expiresAt: data?.expiresAt,
      });
      setStep(2);
      toast.success("Slot held");
    } catch (e) {
      const code = e?.response?.status;
      if (code === 409) {
        toast.error("That slot was just taken. Pick another.");
        loadSlots(date);
      } else {
        toast.error(e?.response?.data?.message || "Failed to hold slot");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitSymptoms = async (e) => {
    e.preventDefault();
    if (!hasHold) {
      toast.error("Hold a slot first");
      setStep(1);
      return;
    }
    if (remaining <= 0) return; // expiry effect will reset

    setSubmitting(true);
    try {
      const data = await appointmentsApi.submitSymptoms({
        appointmentId: hold.appointmentId,
        symptoms,
      });
      setChiefComplaint(data?.chiefComplaint || "");
      setStep(3);
      toast.success("Symptoms saved");
    } catch (e2) {
      toast.error(e2?.response?.data?.message || "Failed to submit symptoms");
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirm = async () => {
    if (!hasHold) {
      toast.error("Hold expired. Pick another slot.");
      setStep(1);
      return;
    }
    if (remaining <= 0) return; // expiry effect will reset

    setSubmitting(true);
    try {
      await appointmentsApi.confirm({ appointmentId: hold.appointmentId });
      toast.success("Appointment confirmed");
      navigate("/patients/appointments", { replace: true });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409 || status === 410) {
        setExpiredBanner(true);
        toast.error("Slot expired, pick another");
        setHold({ appointmentId: null, slotStart: null, expiresAt: null });
        setStep(1);
      } else {
        toast.error(e?.response?.data?.message || "Failed to confirm");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!doctorId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h1 className="text-lg font-semibold text-slate-900">Booking</h1>
          <p className="mt-1 text-sm text-slate-600">
            Choose a doctor first.
          </p>
          <button
            type="button"
            onClick={() => navigate("/patients/doctors")}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Browse doctors
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Booking flow</h1>
          <p className="mt-1 text-sm text-slate-600">Step {step} of 3</p>
        </div>
        {hasHold && (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            Hold: <span className="font-medium">{remaining}s</span>
          </div>
        )}
      </div>

      {expiredBanner && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Slot expired, pick another.
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        {step === 1 && (
          <>
            <h2 className="text-sm font-semibold text-slate-900">1) Pick a slot</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="text-sm font-medium text-slate-700">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDate(next);
                    loadSlots(next);
                  }}
                  className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <div className="text-xs text-slate-500">
                You’ll see a countdown after holding a slot.
              </div>
            </div>

            <div className="mt-4">
              {loadingSlots ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  Loading…
                </div>
              ) : (
                <SlotGrid
                  slots={slots}
                  onPick={(slotStart) => onPickSlot(slotStart)}
                />
              )}
            </div>

            {submitting && (
              <div className="mt-3 text-xs text-slate-500">Holding slot…</div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-sm font-semibold text-slate-900">2) Symptoms</h2>
            <p className="mt-1 text-sm text-slate-600">
              Held slot: <span className="font-medium text-slate-900">{holdLabel}</span>
            </p>

            <form className="mt-4 space-y-3" onSubmit={onSubmitSymptoms}>
              <div>
                <label className="text-sm font-medium text-slate-700">Describe symptoms</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  required
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="e.g. Fever for 3 days, mild chest tightness…"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !symptoms.trim()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? "Saving…" : "Continue"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-sm font-semibold text-slate-900">3) Review</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium text-slate-500">Slot</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{holdLabel}</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-medium text-slate-500">Your symptoms</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{symptoms}</div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium text-slate-500">Chief complaint (confirmation)</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {chiefComplaint || "—"}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={onConfirm}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? "Confirming…" : "Confirm appointment"}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              If the hold expires, you’ll be returned to slot selection (no silent retry).
            </p>
          </>
        )}
      </div>
    </div>
  );
}

