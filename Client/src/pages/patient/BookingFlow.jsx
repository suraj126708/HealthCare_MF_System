import React, { useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import SlotGrid from "../../components/SlotGrid";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  alertWarning,
  card,
  cardMuted,
  cardSm,
  emptyState,
  input,
  label,
  pageWrap,
} from "../../constants/ui";
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

  const [step, setStep] = useState(1);
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
    if (remaining <= 0) return;

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
    if (remaining <= 0) return;

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
      <div className={pageWrap}>
        <div className={card}>
          <h1 className="text-lg font-semibold text-text">Booking</h1>
          <p className="mt-1 text-sm text-text-muted">Choose a doctor first.</p>
          <Button className="mt-4" onClick={() => navigate("/patients/doctors")}>
            Browse doctors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={pageWrap}>
      <PageHeader title="Booking flow" description={`Step ${step} of 3`}>
        {hasHold && (
          <div className={`${cardSm} text-sm text-text`}>
            Hold: <span className="font-medium text-brand-600 dark:text-brand-400">{remaining}s</span>
          </div>
        )}
      </PageHeader>

      {expiredBanner && (
        <div className={`mt-4 ${alertWarning}`}>Slot expired, pick another.</div>
      )}

      <div className={`mt-6 ${card}`}>
        {step === 1 && (
          <>
            <h2 className="text-sm font-semibold text-text">1) Pick a slot</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className={label}>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    const next = e.target.value;
                    setDate(next);
                    loadSlots(next);
                  }}
                  className={input}
                />
              </div>
              <div className="text-xs text-text-subtle">
                You’ll see a countdown after holding a slot.
              </div>
            </div>

            <div className="mt-4">
              {loadingSlots ? (
                <div className={`${cardMuted} text-sm text-text-muted`}>Loading…</div>
              ) : (
                <SlotGrid slots={slots} onPick={(slotStart) => onPickSlot(slotStart)} />
              )}
            </div>

            {submitting && <div className="mt-3 text-xs text-text-subtle">Holding slot…</div>}
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-sm font-semibold text-text">2) Symptoms</h2>
            <p className="mt-1 text-sm text-text-muted">
              Held slot: <span className="font-medium text-text">{holdLabel}</span>
            </p>

            <form className="mt-4 space-y-3" onSubmit={onSubmitSymptoms}>
              <div>
                <label className={label}>Describe symptoms</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  required
                  rows={4}
                  className={input}
                  placeholder="e.g. Fever for 3 days, mild chest tightness…"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" disabled={submitting || !symptoms.trim()}>
                  {submitting ? "Saving…" : "Continue"}
                </Button>
              </div>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-sm font-semibold text-text">3) Review</h2>
            <div className="mt-4 grid gap-3">
              <div className={cardMuted}>
                <div className="text-xs font-medium text-text-muted">Slot</div>
                <div className="mt-1 text-sm font-semibold text-text">{holdLabel}</div>
              </div>

              <div className={cardMuted}>
                <div className="text-xs font-medium text-text-muted">Your symptoms</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-text">{symptoms}</div>
              </div>

              <div className={cardSm}>
                <div className="text-xs font-medium text-text-muted">Chief complaint (confirmation)</div>
                <div className="mt-1 text-sm font-semibold text-text">{chiefComplaint || "—"}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button type="button" disabled={submitting} onClick={onConfirm}>
                {submitting ? "Confirming…" : "Confirm appointment"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-text-subtle">
              If the hold expires, you’ll be returned to slot selection (no silent retry).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
