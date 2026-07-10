import React from "react";

export default function PageHeader({ title, description, children, className = "" }) {
  return (
    <div className={["flex flex-wrap items-end justify-between gap-4", className].join(" ")}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
