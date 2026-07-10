import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  btnDangerOutline,
  card,
  cardMuted,
  input,
  inputInline,
  label,
  labelSm,
  pageWrap,
  select,
} from "../../constants/ui";
import adminApi from "../../services/admin";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DAY_TO_NUMBER = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const NUMBER_TO_DAY = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const toWeekdayName = (value) => {
  if (typeof value === "number") return NUMBER_TO_DAY[value] || null;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return WEEKDAYS.find((d) => d.toLowerCase() === normalized) || null;
  }
  return null;
};

const makeDefaultWorkingHours = () =>
  WEEKDAYS.map((day) => ({
    day,
    startTime: "09:00",
    endTime: "17:00",
  }));

export default function AdminDoctorForm() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const isEdit = useMemo(() => Boolean(doctorId), [doctorId]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      specialization: "",
      slotDurationMinutes: 30,
      workingHours: makeDefaultWorkingHours(),
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "workingHours",
  });
  const workingHours = watch("workingHours") || [];
  const [selectedDays, setSelectedDays] = useState([]);
  const [dayToAdd, setDayToAdd] = useState(WEEKDAYS[0]);

  const missingDays = useMemo(() => {
    const selected = new Set(workingHours.map((h) => h?.day).filter(Boolean));
    return WEEKDAYS.filter((day) => !selected.has(day));
  }, [workingHours]);

  useEffect(() => {
    if (missingDays.length > 0 && !missingDays.includes(dayToAdd)) {
      setDayToAdd(missingDays[0]);
      return;
    }
    if (missingDays.length === 0) {
      setDayToAdd("");
    }
  }, [dayToAdd, missingDays]);

  const toggleDaySelection = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const removeSelectedDays = () => {
    if (!selectedDays.length) return;
    const selectedSet = new Set(selectedDays);
    const indexesToRemove = workingHours
      .map((h, idx) => (selectedSet.has(h?.day) ? idx : -1))
      .filter((idx) => idx >= 0);
    if (!indexesToRemove.length) return;
    remove(indexesToRemove);
    setSelectedDays([]);
  };

  const addMissingDay = () => {
    if (!dayToAdd) return;
    append({
      day: dayToAdd,
      startTime: "09:00",
      endTime: "17:00",
    });
  };

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.getDoctorById({ doctorId });
        const doc = data?.doctor ?? data ?? {};
        const profile = doc.profile ?? {};
        const sourceHours = profile.workingHours ?? doc.workingHours ?? [];
        const normalizedHours = sourceHours
          .map((h) => {
            const day = toWeekdayName(h?.day ?? h?.weekday);
            if (!day) return null;
            return {
              day,
              startTime: h?.startTime || "09:00",
              endTime: h?.endTime || "17:00",
            };
          })
          .filter(Boolean)
          .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day));

        if (!cancelled) {
          reset({
            name: doc.name || "",
            email: doc.email || "",
            password: "",
            specialization: profile.specialization || doc.specialization || "",
            slotDurationMinutes: Number(
              profile.slotDurationMinutes || doc.slotDurationMinutes || 30,
            ),
            workingHours:
              normalizedHours.length > 0 ? normalizedHours : makeDefaultWorkingHours(),
          });
          setSelectedDays([]);
        }
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load doctor");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorId, isEdit, reset]);

  const onSubmit = async (values) => {
    const payload = {
      name: values.name,
      email: values.email,
      specialization: values.specialization,
      slotDurationMinutes: Number(values.slotDurationMinutes),
      workingHours: (values.workingHours || [])
        .map((h) => ({
          day: DAY_TO_NUMBER[h.day],
          startTime: h.startTime,
          endTime: h.endTime,
        }))
        .filter((h) => Number.isInteger(h.day)),
    };

    if (!isEdit && values.password) {
      payload.password = values.password;
    }

    try {
      if (isEdit) {
        await adminApi.updateDoctor({ doctorId, payload });
        toast.success("Doctor updated");
      } else {
        await adminApi.createDoctor({ ...payload, password: values.password });
        toast.success("Doctor created");
      }
      navigate("/admin/doctors", { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save doctor");
    }
  };

  return (
    <div className={pageWrap}>
      <PageHeader title={isEdit ? "Edit doctor" : "Create doctor"} />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
        <div className={card}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Name</label>
              <input className={input} {...register("name", { required: "Name is required" })} />
              {errors.name && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</div>
              )}
            </div>
            <div>
              <label className={label}>Email</label>
              <input
                type="email"
                className={input}
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</div>
              )}
            </div>
            {!isEdit && (
              <div>
                <label className={label}>Password</label>
                <input
                  type="password"
                  className={input}
                  {...register("password", { required: "Password is required" })}
                />
                {errors.password && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</div>
                )}
              </div>
            )}
            <div>
              <label className={label}>Specialization</label>
              <input
                className={input}
                {...register("specialization", { required: "Specialization is required" })}
              />
              {errors.specialization && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.specialization.message}
                </div>
              )}
            </div>
            <div>
              <label className={label}>Slot duration</label>
              <select className={select} {...register("slotDurationMinutes", { required: true })}>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>
        </div>

        <div className={card}>
          <h2 className="text-sm font-semibold text-text">Working hours</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={removeSelectedDays}
              disabled={!selectedDays.length}
              className={`${btnDangerOutline} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Remove selected days
            </button>
            <div className="ml-auto flex items-center gap-2">
              <select
                value={dayToAdd}
                onChange={(e) => setDayToAdd(e.target.value)}
                disabled={missingDays.length === 0}
                className={`${inputInline} !mt-0 px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {missingDays.length === 0 ? (
                  <option value="">All weekdays added</option>
                ) : (
                  missingDays.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))
                )}
              </select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addMissingDay}
                disabled={!dayToAdd}
              >
                Add day
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className={`grid items-center gap-2 p-3 sm:grid-cols-3 ${cardMuted}`}
              >
                <label className="flex items-center gap-2 sm:col-span-3">
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(workingHours[idx]?.day)}
                    onChange={() => toggleDaySelection(workingHours[idx]?.day)}
                    className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs text-text-muted">Select to remove</span>
                </label>
                <input
                  readOnly
                  className={`${inputInline} bg-surface-muted`}
                  {...register(`workingHours.${idx}.day`)}
                />
                <input
                  type="time"
                  className={inputInline}
                  {...register(`workingHours.${idx}.startTime`, { required: true })}
                />
                <input
                  type="time"
                  className={inputInline}
                  {...register(`workingHours.${idx}.endTime`, { required: true })}
                />
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : isEdit ? "Update doctor" : "Create doctor"}
        </Button>
      </form>
    </div>
  );
}
