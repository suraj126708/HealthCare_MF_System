import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Activity,
  CalendarDays,
  Pill,
  Stethoscope,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Badge from "../../components/Badge";
import Card, { CardDescription, CardHeader, CardTitle } from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import { emptyState, pageWrap, tableHead, tableWrap, td, th, trDivider } from "../../constants/ui";
import adminApi from "../../services/admin";

const STATUS_COLORS = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#94a3b8",
  cancelled_leave: "#ef4444",
};

const URGENCY_COLORS = {
  Low: "#22c55e",
  Medium: "#f59e0b",
  High: "#ef4444",
};

const NOTIF_STATUS_COLORS = {
  pending: "#f59e0b",
  sent: "#22c55e",
  failed: "#ef4444",
};

const CHART_COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#ea580c", "#16a34a", "#db2777"];

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-text">{value}</p>
          {hint ? <p className="mt-1 text-xs text-text-subtle">{hint}</p> : null}
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function ChartCard({ title, description, children, className = "" }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <div className="h-72">{children}</div>
    </Card>
  );
}

function formatSlot(slotStart) {
  if (!slotStart) return "—";
  try {
    const dt =
      typeof slotStart === "string" && slotStart.includes("T")
        ? parseISO(slotStart)
        : new Date(slotStart);
    if (Number.isNaN(dt.getTime())) return String(slotStart);
    return format(dt, "MMM d, yyyy · h:mm a");
  } catch {
    return String(slotStart);
  }
}

function formatTrendDate(dateStr) {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

function formatNotifType(type) {
  if (!type) return "Unknown";
  return type.replace(/_/g, " ");
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await adminApi.getDashboardStats();
        if (!cancelled) setStats(data);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const overview = stats?.overview ?? {};

  const appointmentStatusData = useMemo(
    () =>
      (stats?.appointmentsByStatus ?? []).map((item) => ({
        name: item.status.replace(/_/g, " "),
        value: item.count,
        status: item.status,
      })),
    [stats],
  );

  const trendData = useMemo(
    () =>
      (stats?.appointmentsTrend ?? []).map((item) => ({
        ...item,
        label: formatTrendDate(item.date),
      })),
    [stats],
  );

  const specializationData = stats?.specializations ?? [];
  const urgencyData = stats?.urgencyLevels ?? [];
  const notifStatusData = stats?.notificationsByStatus ?? [];
  const notifTypeData = (stats?.notificationsByType ?? []).map((item) => ({
    name: formatNotifType(item.type),
    count: item.count,
  }));
  const topDoctors = stats?.topDoctors ?? [];
  const recentAppointments = stats?.recentAppointments ?? [];

  if (loading) {
    return (
      <div className={pageWrap}>
        <PageHeader title="Admin dashboard" description="System-wide overview and analytics." />
        <div className={`mt-6 ${emptyState}`}>Loading dashboard…</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={pageWrap}>
        <PageHeader title="Admin dashboard" description="System-wide overview and analytics." />
        <div className={`mt-6 ${emptyState}`}>Unable to load dashboard data.</div>
      </div>
    );
  }

  return (
    <div className={pageWrap}>
      <PageHeader
        title="Admin dashboard"
        description="Summarized view of patients, doctors, appointments, notifications, and AI triage across the clinic."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Patients"
          value={overview.patients ?? 0}
          hint={`${overview.admins ?? 0} admin account(s)`}
        />
        <StatCard
          icon={Stethoscope}
          label="Doctors"
          value={overview.doctors ?? 0}
          hint={`${overview.activeDoctors ?? 0} active`}
        />
        <StatCard
          icon={CalendarDays}
          label="Appointments"
          value={overview.totalAppointments ?? 0}
          hint={`${overview.completedVisits ?? 0} completed visits`}
        />
        <StatCard
          icon={Pill}
          label="Active medications"
          value={overview.activeMedicationReminders ?? 0}
          hint={`${overview.totalLeaveDays ?? 0} leave day(s) scheduled`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Appointments by status" description="Current distribution across all booking states.">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={appointmentStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {appointmentStatusData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#64748b"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="New appointments (14 days)"
          description="Daily booking volume based on appointment creation date."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Appointments"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Doctors by specialization" description="Staff coverage across clinical areas.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={specializationData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-text-muted)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              />
              <Bar dataKey="count" name="Doctors" radius={[8, 8, 0, 0]}>
                {specializationData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pre-visit urgency (AI triage)" description="Urgency levels from symptom analysis.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={urgencyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="level" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              />
              <Bar dataKey="count" name="Cases" radius={[8, 8, 0, 0]}>
                {urgencyData.map((entry) => (
                  <Cell key={entry.level} fill={URGENCY_COLORS[entry.level] || "#64748b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Notification delivery" description="Email notification pipeline health.">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={notifStatusData.map((item) => ({
                  name: item.status,
                  value: item.count,
                  status: item.status,
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
              >
                {notifStatusData.map((entry) => (
                  <Cell key={entry.status} fill={NOTIF_STATUS_COLORS[entry.status] || "#64748b"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Notifications by type" description="Breakdown of outbound email events.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={notifTypeData} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11 }}
                stroke="var(--color-text-muted)"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              />
              <Bar dataKey="count" name="Count" fill="#7c3aed" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              Top doctors by appointments
            </CardTitle>
            <CardDescription>Most booked clinicians in the system.</CardDescription>
          </CardHeader>
          <div className={tableWrap}>
            <table className="min-w-full text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Doctor</th>
                  <th className={th}>Appointments</th>
                </tr>
              </thead>
              <tbody>
                {topDoctors.map((doc) => (
                  <tr key={doc.doctorId} className={trDivider}>
                    <td className={`${td} font-medium`}>{doc.name}</td>
                    <td className={td}>{doc.appointments}</td>
                  </tr>
                ))}
                {topDoctors.length === 0 && (
                  <tr>
                    <td colSpan={2} className={`${td} text-text-muted`}>
                      No appointment data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent appointments</CardTitle>
            <CardDescription>Latest bookings across all patients and doctors.</CardDescription>
          </CardHeader>
          <div className={tableWrap}>
            <table className="min-w-full text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Patient</th>
                  <th className={th}>Doctor</th>
                  <th className={th}>Slot</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAppointments.map((appt) => (
                  <tr key={appt.id} className={trDivider}>
                    <td className={`${td} font-medium`}>{appt.patientName}</td>
                    <td className={td}>{appt.doctorName}</td>
                    <td className={`${td} text-text-muted`}>{formatSlot(appt.slotStart)}</td>
                    <td className={td}>
                      <Badge variant="status" value={appt.status} />
                    </td>
                  </tr>
                ))}
                {recentAppointments.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`${td} text-text-muted`}>
                      No appointments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
