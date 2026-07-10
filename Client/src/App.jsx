import React from "react";
import { Toaster } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import AppRoutes from "./routes/AppRoutes";

function AppFrame() {
  const location = useLocation();
  const hideNavbar = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {!hideNavbar && <Navbar />}
      <main>
        <AppRoutes />
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  return <AppFrame />;
}
