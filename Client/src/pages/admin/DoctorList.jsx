import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../../components/ui/Button";
import PageHeader from "../../components/ui/PageHeader";
import {
  link,
  pageWrap,
  tableHead,
  tableWrap,
  td,
  th,
  trDivider,
} from "../../constants/ui";
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
    <div className={pageWrap}>
      <PageHeader title="Doctors" description="Manage doctor profiles.">
        <Link to="/admin/doctors/new">
          <Button size="sm">Add doctor</Button>
        </Link>
      </PageHeader>

      <div className={`mt-6 ${tableWrap}`}>
        <table className="min-w-full text-left text-sm">
          <thead className={tableHead}>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Email</th>
              <th className={th}>Specialization</th>
              <th className={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className={`${td} text-text-muted`}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              items.map((doc) => {
                const id = doc.id || doc._id;
                return (
                  <tr key={id} className={trDivider}>
                    <td className={`${td} font-medium`}>{doc.name}</td>
                    <td className={td}>{doc.email}</td>
                    <td className={td}>{doc.profile.specialization}</td>
                    <td className={td}>
                      <Link to={`/admin/doctors/${id}`} className={link}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className={`${td} text-text-muted`}>
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
