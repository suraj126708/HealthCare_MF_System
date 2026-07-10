import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

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
    <div className="mx-auto max-w-md px-4 py-40 ">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-slate-900">Login</h1>
        <p className="mt-1 text-sm text-slate-600">Access your portal.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              {...register("email")}
            />
            {errors.email && (
              <div className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Password
            </label>

            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-12 text-sm outline-none focus:border-slate-400"
                {...register("password")}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-800"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {errors.password && (
              <div className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Login"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          New patient?{" "}
          <Link className="font-medium text-slate-900 underline" to="/register">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
