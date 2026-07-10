import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import Unauthorized from "../pages/Unauthorized";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import PatientDoctorSearch from "../pages/patient/DoctorSearch";
import PatientDoctorAvailability from "../pages/patient/DoctorAvailability";
import BookingFlow from "../pages/patient/BookingFlow";
import MyAppointments from "../pages/patient/MyAppointments";
import PatientAppointmentDetail from "../pages/patient/AppointmentDetail";
import Medications from "../pages/patient/Medications";

import DoctorDashboard from "../pages/doctor/Dashboard";
import DoctorAppointmentDetail from "../pages/doctor/AppointmentDetail";
import PostVisitForm from "../pages/doctor/PostVisitForm";
import LeaveManager from "../pages/doctor/LeaveManager";

import AdminDoctorList from "../pages/admin/DoctorList";
import AdminDoctorForm from "../pages/admin/DoctorForm";
import LeaveCalendar from "../pages/admin/LeaveCalendar";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/patients/doctors" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute allowedRoles={["patient"]} />}>
        <Route path="/patients/doctors" element={<PatientDoctorSearch />} />
        <Route path="/patients/doctors/:doctorId/availability" element={<PatientDoctorAvailability />} />
        <Route path="/patients/booking" element={<BookingFlow />} />
        <Route path="/patients/appointments" element={<MyAppointments />} />
        <Route path="/patients/appointments/:appointmentId" element={<PatientAppointmentDetail />} />
        <Route path="/patients/medications" element={<Medications />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["doctor"]} />}>
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/appointments/:appointmentId" element={<DoctorAppointmentDetail />} />
        <Route path="/doctor/appointments/:appointmentId/complete" element={<PostVisitForm />} />
        <Route path="/doctor/leave" element={<LeaveManager />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin/doctors" element={<AdminDoctorList />} />
        <Route path="/admin/doctors/new" element={<AdminDoctorForm />} />
        <Route path="/admin/doctors/:doctorId" element={<AdminDoctorForm />} />
        <Route path="/admin/leaves" element={<LeaveCalendar />} />
      </Route>

      <Route path="*" element={<div className="px-4 py-10 text-center text-slate-600">Not found</div>} />
    </Routes>
  );
}

