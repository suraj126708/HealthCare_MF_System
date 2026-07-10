import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-md px-3 py-2 text-sm font-medium",
          isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();

  const role = user?.role;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
            HM
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-slate-900">Hospital</div>
            <div className="text-xs text-slate-500">Appointments</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {!user && (
            <>
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
              <NavItem to="/admin/doctors">Doctors</NavItem>
              <NavItem to="/admin/leaves">Leave Calendar</NavItem>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">{user.role}</div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="text-xs text-slate-500">Signed out</div>
          )}
        </div>
      </div>
    </header>
  );
}

