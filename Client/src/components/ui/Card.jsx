import React from "react";

export default function Card({ className = "", children, hover = false, ...props }) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-surface p-6 shadow-sm",
        hover && "transition-all duration-200 hover:border-brand-200 hover:shadow-md dark:hover:border-brand-800",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children }) {
  return <div className={["mb-4", className].join(" ")}>{children}</div>;
}

export function CardTitle({ className = "", children }) {
  return (
    <h3 className={["text-lg font-semibold tracking-tight text-text", className].join(" ")}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = "", children }) {
  return <p className={["mt-1 text-sm text-text-muted", className].join(" ")}>{children}</p>;
}
