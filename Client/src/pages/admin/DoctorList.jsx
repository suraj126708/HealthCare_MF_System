import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import adminApi from "../../services/admin";

export default function AdminDoctorList() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await adminApi.listDoctors();
        if (!cancelled) setItems(data?.doctors ?? data ?? []);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load doctors");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Doctors</h1>
          <p className="mt-1 text-sm text-slate-600">Manage doctor profiles.</p>
        </div>
        <Link
          to="/admin/doctors/new"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Add doctor
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
              <th className="px-4 py-3 font-semibold text-slate-700">
                Specialization
              </th>
              <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-5 text-slate-600">
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              items.map((doc) => {
                const id = doc.id || doc._id;
                return (
                  <tr key={id} className="border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-900">{doc.name}</td>
                    <td className="px-4 py-3 text-slate-700">{doc.email}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {doc.profile.specialization}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/doctors/${id}`}
                        className="font-medium text-slate-900 underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-5 text-slate-600">
                  No doctors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
