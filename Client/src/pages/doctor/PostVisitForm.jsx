import { useMemo } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import DrugAutocomplete from "../../components/DrugAutocomplete";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  btnDangerOutline,
  card,
  cardMuted,
  inputInline,
  label,
  labelSm,
  pageWrap,
  select,
} from "../../constants/ui";
import {
  FREQUENCY_OPTIONS,
  INSTRUCTION_OPTIONS,
  frequencyPerDayFromCode,
} from "../../constants/prescription";
import { doctorApi } from "../../services/doctor";

const emptyPrescriptionRow = {
  drug: "",
  dosage: "",
  frequency: "OD",
  durationDays: 1,
  instruction: "after_food",
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
      const prescription = values.prescription.map((row) => ({
        drug: row.drug.trim(),
        dosage: row.dosage.trim(),
        frequency: row.frequency,
        frequencyPerDay: frequencyPerDayFromCode(row.frequency),
        durationDays: Number(row.durationDays),
        instruction: row.instruction,
      }));

      const data = await doctorApi.completeAppointment({
        appointmentId,
        clinicalNotes: values.clinicalNotes,
        prescription,
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
    <div className={pageWrap}>
      <PageHeader
        title="Complete visit"
        description="Add notes and at least one prescription row. Drug names are suggested from RxNorm."
      />

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div className={card}>
          <label className={label}>Clinical notes</label>
          <textarea
            rows={5}
            className={inputInline}
            {...register("clinicalNotes", {
              required: "Clinical notes are required",
              minLength: { value: 8, message: "Please add more detail" },
            })}
          />
          {errors.clinicalNotes && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.clinicalNotes.message}
            </div>
          )}
        </div>

        <div className={card}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-text">Prescription rows</h2>
            <Button type="button" variant="secondary" size="sm" onClick={() => append({ ...emptyPrescriptionRow })}>
              Add row
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            {fields.map((field, idx) => (
              <div key={field.id} className={cardMuted}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className={labelSm}>Drug</label>
                    <Controller
                      control={control}
                      name={`prescription.${idx}.drug`}
                      rules={{ required: "Drug is required" }}
                      render={({ field: drugField }) => (
                        <DrugAutocomplete
                          value={drugField.value}
                          onChange={drugField.onChange}
                          onBlur={drugField.onBlur}
                          error={errors.prescription?.[idx]?.drug?.message}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <label className={labelSm}>Dose</label>
                    <input
                      placeholder="e.g. 500 mg"
                      className={inputInline}
                      {...register(`prescription.${idx}.dosage`, { required: "Dose is required" })}
                    />
                    {errors.prescription?.[idx]?.dosage && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.prescription[idx].dosage.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelSm}>Frequency</label>
                    <select className={select} {...register(`prescription.${idx}.frequency`, { required: "Required" })}>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <option key={opt.code} value={opt.code}>
                          {opt.code} — {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelSm}>Duration (days)</label>
                    <input
                      type="number"
                      min={1}
                      className={inputInline}
                      {...register(`prescription.${idx}.durationDays`, {
                        required: "Duration is required",
                        min: { value: 1, message: "Min 1 day" },
                      })}
                    />
                    {errors.prescription?.[idx]?.durationDays && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.prescription[idx].durationDays.message}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelSm}>Instruction</label>
                    <select className={select} {...register(`prescription.${idx}.instruction`, { required: "Required" })}>
                      {INSTRUCTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button type="button" onClick={() => remove(idx)} className={btnDangerOutline}>
                    Remove row
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!hasRows && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
              At least one prescription row is required.
            </div>
          )}
          {errors.prescription?.message && (
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">{errors.prescription.message}</div>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit post-visit"}
        </Button>
      </form>
    </div>
  );
}
