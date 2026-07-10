import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { doctorApi } from "../../services/doctor";

const emptyPrescriptionRow = {
  drug: "",
  dosage: "",
  frequencyPerDay: 1,
  durationDays: 1,
};

export default function PostVisitForm() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm({
    defaultValues: {
      clinicalNotes: "",
      prescription: [{ ...emptyPrescriptionRow }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "prescription",
  });

  const hasRows = useMemo(() => fields.length > 0, [fields.length]);

  const onSubmit = async (values) => {
    if (!values.prescription?.length) {
      setError("prescription", {
        type: "manual",
        message: "Add at least one prescription row.",
      });
      return;
    }

    clearErrors("prescription");

    try {
      const payload = {
        clinicalNotes: values.clinicalNotes,
        prescription: values.prescription.map((row) => ({
          drug: row.drug,
          dosage: row.dosage,
          frequencyPerDay: Number(row.frequencyPerDay),
          durationDays: Number(row.durationDays),
        })),
      };

      const data = await doctorApi.completeAppointment({
        appointmentId,
        clinicalNotes: payload.clinicalNotes,
        prescription: payload.prescription,
      });

      toast.success(
        `Visit completed${data?.medicationRemindersCreated != null ? ` • reminders: ${data.medicationRemindersCreated}` : ""}`,
      );
      navigate("/doctor/dashboard", { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to complete appointment");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-lg font-semibold text-slate-900">Complete visit</h1>
      <p className="mt-1 text-sm text-slate-600">
        Add notes and at least one prescription row.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="text-sm font-medium text-slate-700">Clinical notes</label>
          <textarea
            rows={5}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            {...register("clinicalNotes", {
              required: "Clinical notes are required",
              minLength: { value: 8, message: "Please add more detail" },
            })}
          />
          {errors.clinicalNotes && (
            <div className="mt-1 text-xs text-red-600">{errors.clinicalNotes.message}</div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Prescription rows</h2>
            <button
              type="button"
              onClick={() => append({ ...emptyPrescriptionRow })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Add row
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-5"
              >
                <input
                  placeholder="Drug"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  {...register(`prescription.${idx}.drug`, { required: "Required" })}
                />
                <input
                  placeholder="Dosage"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  {...register(`prescription.${idx}.dosage`, { required: "Required" })}
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Freq/day"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  {...register(`prescription.${idx}.frequencyPerDay`, {
                    required: "Required",
                    min: { value: 1, message: "Min 1" },
                  })}
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Days"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  {...register(`prescription.${idx}.durationDays`, {
                    required: "Required",
                    min: { value: 1, message: "Min 1" },
                  })}
                />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {!hasRows && (
            <div className="mt-2 text-xs text-red-600">At least one prescription row is required.</div>
          )}
          {errors.prescription?.message && (
            <div className="mt-2 text-xs text-red-600">{errors.prescription.message}</div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "Submit post-visit"}
        </button>
      </form>
    </div>
  );
}

