import React from "react";
import { Toaster } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ThemeToggle from "./components/ThemeToggle";
import AppRoutes from "./routes/AppRoutes";

function AuthTopBar() {
  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
      <ThemeToggle />
    </div>
  );
}

function AppFrame() {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="min-h-screen bg-surface-elevated text-text">
      {!isAuthPage && <Navbar />}
      {isAuthPage && <AuthTopBar />}
      <main>
        <AppRoutes />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          className: "dark:!bg-surface-elevated dark:!text-text dark:!border dark:!border-border",
        }}
      />
    </div>
  );
}

export default function App() {
  return <AppFrame />;
}
