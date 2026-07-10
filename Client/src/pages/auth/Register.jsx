import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { HeartPulse } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8).optional().or(z.literal("")),
  password: z.string().min(6),
});

const inputClass =
  "mt-1.5 w-full rounded-xl border border-border bg-surface-elevated px-3 py-2.5 text-sm text-text outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20";

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
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-32 left-0 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl dark:bg-emerald-800/10" />
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
          <h1 className="text-xl font-semibold text-text">Create account</h1>
          <p className="mt-1 text-sm text-text-muted">Patient registration only.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="text-sm font-medium text-text">Name</label>
              <input className={inputClass} {...register("name")} />
              {errors.name && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-text">Email</label>
              <input type="email" autoComplete="email" className={inputClass} {...register("email")} />
              {errors.email && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email.message}</div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-text">Phone (optional)</label>
              <input autoComplete="tel" className={inputClass} {...register("phone")} />
              {errors.phone && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone.message}</div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-text">Password</label>
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                {...register("password")}
              />
              {errors.password && (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password.message}</div>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account?{" "}
            <Link className="font-semibold text-brand-600 hover:underline dark:text-brand-400" to="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
