import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { doctorsApi } from "../../services/doctors";

// make a card format of this
function DoctorCard({ doctor }) {
  return (
    <div className="flex max-w-sm flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl font-bold text-slate-700 border border-slate-100">
          {doctor.name ? doctor.name.charAt(0) : "D"}
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold tracking-tight text-slate-900">
            {doctor.name}
          </h3>
          <p className="text-xs font-medium text-slate-500">
            {doctor.profile?.specialization}
          </p>
        </div>
      </div>

      <Link
        to={`/patients/doctors/${doctor.id}/availability`}
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
      >
        View availability
      </Link>
    </div>
  );
}

export default function PatientDoctorSearch() {
  const [specialization, setSpecialization] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);

  const canSearch = useMemo(
    () => specialization.trim() || q.trim(),
    [specialization, q],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await doctorsApi.searchDoctors({ specialization, q });
        if (!cancelled) setDoctors(data?.doctors ?? data ?? []);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load doctors");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await doctorsApi.searchDoctors({ specialization, q });
      setDoctors(data?.doctors ?? data ?? []);
      // console.log("doctors : " + doctors);
    } catch (e2) {
      toast.error(e2?.response?.data?.message || "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Find a doctor
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Search by specialization or name.
          </p>
        </div>
      </div>

      <form
        onSubmit={onSearch}
        className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3"
      >
        <div>
          <label className="text-sm font-medium text-slate-700">
            Specialization
          </label>
          <input
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="e.g. Cardiology"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name keywords"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading || !canSearch}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Loading…
          </div>
        )}
        {!loading && doctors?.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No doctors found.
          </div>
        )}
        {!loading &&
          doctors?.map((d) => (
            <DoctorCard
              key={d.id || d._id}
              doctor={{ ...d, id: d.id || d._id }}
            />
          ))}
      </div>
    </div>
  );
}
