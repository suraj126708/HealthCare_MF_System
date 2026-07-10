import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8).optional().or(z.literal("")),
  password: z.string().min(6),
});

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    try {
      await registerUser({
        ...values,
        phone: values.phone || undefined,
      });
      toast.success("Account created");
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-slate-900">Register</h1>
        <p className="mt-1 text-sm text-slate-600">Patients only.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              {...register("name")}
            />
            {errors.name && (
              <div className="mt-1 text-xs text-red-600">{errors.name.message}</div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              {...register("email")}
            />
            {errors.email && (
              <div className="mt-1 text-xs text-red-600">{errors.email.message}</div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Phone (optional)</label>
            <input
              autoComplete="tel"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              {...register("phone")}
            />
            {errors.phone && (
              <div className="mt-1 text-xs text-red-600">{errors.phone.message}</div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              {...register("password")}
            />
            {errors.password && (
              <div className="mt-1 text-xs text-red-600">{errors.password.message}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-medium text-slate-900 underline" to="/login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

