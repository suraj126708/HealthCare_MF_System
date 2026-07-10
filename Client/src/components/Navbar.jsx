import React from "react";
import { Link, NavLink } from "react-router-dom";
import { HeartPulse, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";
import Button from "./ui/Button";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-brand-600 text-white dark:bg-brand-500"
            : "text-text-muted hover:bg-surface-muted hover:text-text",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const role = user?.role;

  const navLinks = (
    <>
      {!user && (
        <>
          <NavItem to="/">Home</NavItem>
          <NavItem to="/login">Login</NavItem>
          <NavItem to="/register">Register</NavItem>
        </>
      )}

      {role === "patient" && (
        <>
          <NavItem to="/patients/doctors">Doctors</NavItem>
          <NavItem to="/patients/appointments">My Appointments</NavItem>
          <NavItem to="/patients/medications">Medications</NavItem>
        </>
      )}

      {role === "doctor" && (
        <>
          <NavItem to="/doctor/dashboard">Dashboard</NavItem>
          <NavItem to="/doctor/leave">Leave</NavItem>
        </>
      )}

      {role === "admin" && (
        <>
          <NavItem to="/admin/dashboard">Dashboard</NavItem>
          <NavItem to="/admin/doctors">Doctors</NavItem>
          <NavItem to="/admin/leaves">Leave Calendar</NavItem>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-text">MediBook</div>
            <div className="text-xs text-text-subtle">
              Hospital Appointments
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">{navLinks}</nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium text-text">{user.name}</div>
                <div className="text-xs capitalize text-text-subtle">
                  {user.role}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                icon={LogOut}
              >
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <Link to="/login" className="hidden sm:block">
              <Button size="sm">Sign in</Button>
            </Link>
          )}

          <ThemeToggle />

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted hover:bg-surface-muted md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
          {navLinks}
        </nav>
      )}
    </header>
  );
}
