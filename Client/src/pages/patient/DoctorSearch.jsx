import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Stethoscope } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  emptyState,
  input,
  label,
  pageWrap,
  select,
} from "../../constants/ui";
import { doctorsApi } from "../../services/doctors";

const SPECIALIZATIONS = [
  "All",
  "Cardiology",
  "Dermatology",
  "Orthopedics",
  "Pediatrics",
  "Neurology",
  "ENT",
  "General Medicine",
  "Psychiatry",
];

function DoctorCard({ doctor }) {
  return (
    <div className="flex max-w-sm flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-200 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-800">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-brand-50 text-xl font-bold text-brand-700 dark:bg-brand-950/50 dark:text-brand-400">
          {doctor.name ? doctor.name.charAt(0) : "D"}
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold tracking-tight text-text">{doctor.name}</h3>
          <p className="flex items-center gap-1 text-xs font-medium text-text-muted">
            <Stethoscope className="h-3.5 w-3.5" />
            {doctor.profile?.specialization}
          </p>
        </div>
      </div>

      <Link to={`/patients/doctors/${doctor.id}/availability`}>
        <Button className="w-full" size="sm">
          View availability
        </Button>
      </Link>
    </div>
  );
}

export default function PatientDoctorSearch() {
  const [specialization, setSpecialization] = useState("All");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);

  const searchParams = useMemo(() => {
    const spec = specialization === "All" ? "" : specialization;
    return { specialization: spec, q: q.trim() };
  }, [specialization, q]);

  const loadDoctors = async (params = searchParams) => {
    setLoading(true);
    try {
      const data = await doctorsApi.searchDoctors(params);
      setDoctors(data?.doctors ?? data ?? []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = async (e) => {
    e.preventDefault();
    await loadDoctors(searchParams);
  };

  const onClearFilters = async () => {
    setSpecialization("All");
    setQ("");
    setLoading(true);
    try {
      const data = await doctorsApi.searchDoctors({ specialization: "", q: "" });
      setDoctors(data?.doctors ?? data ?? []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={pageWrap}>
      <PageHeader title="Find a doctor" description="Search by specialization or name." />

      <form
        onSubmit={onSearch}
        className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-4"
      >
        <div>
          <label className={label}>Specialization</label>
          <select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className={select}
          >
            {SPECIALIZATIONS.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Search</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name keywords"
            className={input}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Searching…" : "Search"}
          </Button>
        </div>
        <div className="flex items-end">
          <Button type="button" variant="secondary" disabled={loading} onClick={onClearFilters} className="w-full">
            Clear filters
          </Button>
        </div>
      </form>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading && <div className={emptyState}>Loading…</div>}
        {!loading && doctors?.length === 0 && <div className={emptyState}>No doctors found.</div>}
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
