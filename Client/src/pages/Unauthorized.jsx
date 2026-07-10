import React from "react";
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-slate-900">Unauthorized</h1>
        <p className="mt-1 text-sm text-slate-600">
          You don’t have access to this page.
        </p>
        <div className="mt-4">
          <Link className="text-sm font-medium text-slate-900 underline" to="/">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

