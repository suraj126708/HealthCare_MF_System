import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bell,
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  HeartPulse,
  Lock,
  Mail,
  Shield,
  Stethoscope,
  UserCircle,
  Users,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Card, { CardDescription, CardHeader, CardTitle } from "../components/ui/Card";

const ROLE_FEATURES = [
  {
    icon: UserCircle,
    role: "Patient",
    color: "text-brand-600 bg-brand-50 dark:bg-brand-950/50 dark:text-brand-400",
    features: [
      "Search doctors by specialization",
      "Hold slots & submit symptoms before visit",
      "Email + Google Calendar confirmation",
      "View appointments & medication reminders",
      "AI-generated post-visit summaries",
    ],
  },
  {
    icon: Stethoscope,
    role: "Doctor",
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400",
    features: [
      "Appointment queue sorted by date & status",
      "AI pre-visit urgency triage & brief",
      "Structured prescriptions & clinical notes",
      "Automatic patient-friendly summaries",
      "Leave management with patient notifications",
    ],
  },
  {
    icon: Shield,
    role: "Admin",
    color: "text-violet-600 bg-violet-50 dark:bg-violet-950/50 dark:text-violet-400",
    features: [
      "Create & manage doctor profiles",
      "Configure working hours & slot duration",
      "Leave calendar for all doctors",
      "Conflict-safe cancellation cascade",
      "Full audit trail for all actions",
    ],
  },
];

const SYSTEM_HIGHLIGHTS = [
  {
    icon: Lock,
    title: "Double-booking prevention",
    description:
      "MongoDB partial unique index enforces slot safety at the database level — no race conditions, no Redis locks.",
  },
  {
    icon: Clock,
    title: "5-minute slot holds",
    description:
      "Pending appointments with TTL auto-expire abandoned holds. Patients get a clean 410 if they confirm too late.",
  },
  {
    icon: Bell,
    title: "Reliable notifications",
    description:
      "Persist-first email delivery with exponential backoff retries. Failed sends are never silently lost.",
  },
  {
    icon: Brain,
    title: "AI visit summaries",
    description:
      "OpenAI primary with Groq fallback. Pre-visit triage and post-visit patient-friendly recaps — LLM outages never block bookings.",
  },
  {
    icon: Calendar,
    title: "Google Calendar sync",
    description:
      "Admin-level OAuth adds patients as attendees. Invites, updates, and cancellations flow through Google automatically.",
  },
  {
    icon: Mail,
    title: "Email confirmations",
    description:
      "Booking confirmations, reminders, cancellations, and leave notices — all persisted and retried on failure.",
  },
];

const TECH_STACK = [
  { name: "React + Vite", category: "Frontend" },
  { name: "Tailwind CSS", category: "Styling" },
  { name: "Node.js + Express", category: "Backend" },
  { name: "MongoDB", category: "Database" },
  { name: "OpenAI + Groq", category: "AI / LLM" },
  { name: "Google Calendar", category: "Integrations" },
  { name: "Nodemailer", category: "Email" },
  { name: "JWT + bcrypt", category: "Auth" },
];

const STATS = [
  { value: "3", label: "Role-based portals" },
  { value: "AI", label: "Pre & post-visit summaries" },
  { value: "100%", label: "Conflict-safe booking" },
  { value: "24/7", label: "Medication reminders" },
];

function SectionBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
      {children}
    </span>
  );
}

export default function Landing() {
  const { user } = useAuth();

  const dashboardPath =
    user?.role === "doctor"
      ? "/doctor/dashboard"
      : user?.role === "admin"
        ? "/admin/dashboard"
        : user?.role === "patient"
          ? "/patients/doctors"
          : null;

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative border-b border-border bg-gradient-to-b from-brand-50/80 via-surface-elevated to-surface-elevated dark:from-brand-950/30 dark:via-surface-elevated dark:to-surface-elevated">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl dark:bg-brand-800/20" />
          <div className="absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-800/10" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <SectionBadge>
              <HeartPulse className="h-3.5 w-3.5" />
              Healthcare Appointment & Follow-up Manager
            </SectionBadge>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
              Smart clinic appointments,{" "}
              <span className="bg-gradient-to-r from-brand-600 to-emerald-600 bg-clip-text text-transparent dark:from-brand-400 dark:to-emerald-400">
                from booking to follow-up
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-text-muted sm:text-xl">
              A full-stack platform for patients, doctors, and admins — with conflict-safe booking,
              AI-powered visit summaries, automatic email & calendar sync, and medication reminders.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {dashboardPath ? (
                <Link to={dashboardPath}>
                  <Button size="lg" icon={ArrowRight} iconPosition="right">
                    Go to your portal
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" icon={ArrowRight} iconPosition="right">
                      Get started as patient
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="secondary">
                      Sign in
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-surface/80 p-4 text-center backdrop-blur-sm"
              >
                <div className="text-2xl font-bold text-brand-600 dark:text-brand-400">{stat.value}</div>
                <div className="mt-1 text-xs text-text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <SectionBadge>
            <Users className="h-3.5 w-3.5" />
            Three portals, one platform
          </SectionBadge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text">Built for every role</h2>
          <p className="mx-auto mt-3 max-w-2xl text-text-muted">
            Patients book and follow up. Doctors manage visits with AI assistance. Admins oversee
            the entire clinic operation.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {ROLE_FEATURES.map(({ icon: Icon, role, color, features }) => (
            <Card key={role} hover className="flex flex-col">
              <CardHeader>
                <div className={`mb-4 inline-flex rounded-xl p-3 ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle>{role} Portal</CardTitle>
                <CardDescription>
                  Everything a {role.toLowerCase()} needs in one place.
                </CardDescription>
              </CardHeader>
              <ul className="mt-auto space-y-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* System Design */}
      <section className="border-y border-border bg-surface-muted/50 py-20 dark:bg-surface-muted/20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <SectionBadge>
              <Zap className="h-3.5 w-3.5" />
              Engineering highlights
            </SectionBadge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-text">
              Designed for reliability
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-text-muted">
              Beyond the UI — the backend is built to handle real-world clinic edge cases.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SYSTEM_HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <Card key={title} hover>
                <div className="mb-4 inline-flex rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <SectionBadge>
            <Activity className="h-3.5 w-3.5" />
            Patient journey
          </SectionBadge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-text">How booking works</h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "01", title: "Search & pick", desc: "Find a doctor by specialization and choose an available slot." },
            { step: "02", title: "Hold & describe", desc: "Slot held for 5 minutes while you submit your symptoms." },
            { step: "03", title: "Confirm", desc: "Confirm booking — receive email confirmation & calendar invite." },
            { step: "04", title: "Follow up", desc: "After visit, read AI summary and track medication reminders." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="relative rounded-2xl border border-border bg-surface p-5">
              <span className="text-3xl font-bold text-brand-100 dark:text-brand-900">{step}</span>
              <h3 className="mt-2 font-semibold text-text">{title}</h3>
              <p className="mt-1.5 text-sm text-text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t border-border bg-surface-muted/50 py-20 dark:bg-surface-muted/20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-text">Tech stack</h2>
            <p className="mx-auto mt-3 max-w-xl text-text-muted">
              Modern, production-ready technologies powering every layer.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {TECH_STACK.map(({ name, category }) => (
              <div
                key={name}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-center shadow-sm"
              >
                <div className="text-sm font-semibold text-text">{name}</div>
                <div className="text-xs text-text-subtle">{category}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-14 text-center text-white shadow-xl dark:from-brand-700 dark:to-brand-900">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight">Ready to experience it?</h2>
            <p className="mx-auto mt-3 max-w-lg text-brand-100">
              Register as a patient to book appointments, or sign in with your doctor or admin
              credentials.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {dashboardPath ? (
                <Link to={dashboardPath}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
                  >
                    Open portal
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
                    >
                      Create patient account
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                  <Link to="/login">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                    >
                      Sign in
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              HM
            </div>
            <span className="text-sm font-medium text-text-muted">
              Healthcare Appointment & Follow-up Manager
            </span>
          </div>
          <p className="text-xs text-text-subtle">
            Built with React, Node.js, MongoDB & AI — for modern clinic operations.
          </p>
        </div>
      </footer>
    </div>
  );
}
