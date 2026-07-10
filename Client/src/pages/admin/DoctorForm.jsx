import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
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
              normalizedHours.length > 0
                ? normalizedHours
                : makeDefaultWorkingHours(),
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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-lg font-semibold text-slate-900">
        {isEdit ? "Edit doctor" : "Create doctor"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && <div className="mt-1 text-xs text-red-600">{errors.name.message}</div>}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && <div className="mt-1 text-xs text-red-600">{errors.email.message}</div>}
            </div>
            {!isEdit && (
              <div>
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  {...register("password", { required: "Password is required" })}
                />
                {errors.password && (
                  <div className="mt-1 text-xs text-red-600">{errors.password.message}</div>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700">Specialization</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                {...register("specialization", { required: "Specialization is required" })}
              />
              {errors.specialization && (
                <div className="mt-1 text-xs text-red-600">{errors.specialization.message}</div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Slot duration</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                {...register("slotDurationMinutes", { required: true })}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Working hours</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={removeSelectedDays}
              disabled={!selectedDays.length}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove selected days
            </button>
            <div className="ml-auto flex items-center gap-2">
              <select
                value={dayToAdd}
                onChange={(e) => setDayToAdd(e.target.value)}
                disabled={missingDays.length === 0}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
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
              <button
                type="button"
                onClick={addMissingDay}
                disabled={!dayToAdd}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add day
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
                <label className="flex items-center gap-2 sm:col-span-3">
                  <input
                    type="checkbox"
                    checked={selectedDays.includes(workingHours[idx]?.day)}
                    onChange={() => toggleDaySelection(workingHours[idx]?.day)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <span className="text-xs text-slate-600">Select to remove</span>
                </label>
                <input
                  readOnly
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  {...register(`workingHours.${idx}.day`)}
                />
                <input
                  type="time"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  {...register(`workingHours.${idx}.startTime`, { required: true })}
                />
                <input
                  type="time"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
                  {...register(`workingHours.${idx}.endTime`, { required: true })}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : isEdit ? "Update doctor" : "Create doctor"}
        </button>
      </form>
    </div>
  );
}

