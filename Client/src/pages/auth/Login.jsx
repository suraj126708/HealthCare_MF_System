import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, HeartPulse } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import { input, label, link } from "../../constants/ui";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    try {
      await login(values);
      toast.success("Logged in");
      navigate(from, { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-brand-200/30 blur-3xl dark:bg-brand-800/20" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-text">MediBook</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-text">Welcome back</h1>
          <p className="mt-1 text-sm text-text-muted">Sign in to access your portal.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="text-sm font-medium text-text">Email</label>
              <input
                type="email"
                autoComplete="email"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                {...register("email")}
              />
              {errors.email && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.email.message}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-text">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 pr-12 text-sm text-text outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-text-subtle hover:text-text"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.password.message}
                </div>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            New patient?{" "}
            <Link className="font-semibold text-brand-600 hover:underline dark:text-brand-400" to="/register">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
