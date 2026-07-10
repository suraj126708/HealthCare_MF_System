import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Badge from "../../components/Badge";
import PageHeader from "../../components/ui/PageHeader";
import { card, cardMuted, emptyState, pageWrap } from "../../constants/ui";
import { formatPrescriptionLine } from "../../constants/prescription";
import { appointmentsApi } from "../../services/appointments";

export default function PatientAppointmentDetail() {
  const { appointmentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await appointmentsApi.getById({ appointmentId });
        if (!cancelled) setData(d?.appointment ?? d ?? null);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load appointment");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  return (
    <div className={pageWrap}>
      <PageHeader title="Appointment" />
      {loading && <div className={`mt-4 ${emptyState}`}>Loading…</div>}
      {!loading && data && (
        <div className={`mt-4 ${card}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-text">
                {data.doctorName || data.doctor?.name || "Doctor"}
              </div>
              <div className="mt-1 text-xs text-text-muted">{data.slotStart || "Slot"}</div>
            </div>
            <Badge variant="status" value={data.status || "pending"} />
          </div>

          {data.patientFriendlySummary && (
            <div className={`mt-4 ${cardMuted}`}>
              <div className="text-xs font-medium text-text-muted">Summary</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-text">
                {data.patientFriendlySummary}
              </div>
            </div>
          )}

          {data.followUpSteps && (
            <div className={`mt-4 ${cardMuted}`}>
              <div className="text-xs font-medium text-text-muted">Follow-up steps</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-text">{data.followUpSteps}</div>
            </div>
          )}

          {!!(data.medicationSchedule || data.postVisitSummary?.prescription?.length || data.prescription?.length) && (
            <div className={`mt-4 ${cardMuted}`}>
              <div className="text-xs font-medium text-text-muted">Medication schedule</div>
              <div className="mt-1 text-sm text-text">
                {data.medicationSchedule || "See prescribed medication list below."}
              </div>
              {Array.isArray(data.postVisitSummary?.prescription) && data.postVisitSummary.prescription.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text">
                  {data.postVisitSummary.prescription.map((p, idx) => (
                    <li key={`${p.drug}-${idx}`}>{formatPrescriptionLine(p)}</li>
                  ))}
                </ul>
              )}
              {!data.postVisitSummary?.prescription?.length &&
                Array.isArray(data.prescription) &&
                data.prescription.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text">
                    {data.prescription.map((p, idx) => (
                      <li key={`${p.drug}-${idx}`}>{formatPrescriptionLine(p)}</li>
                    ))}
                  </ul>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
