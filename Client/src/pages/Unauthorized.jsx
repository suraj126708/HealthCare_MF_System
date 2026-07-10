import React from "react";
import { Link } from "react-router-dom";
import { pageWrap, card, link } from "../constants/ui";

export default function Unauthorized() {
  return (
    <div className={pageWrap}>
      <div className={card}>
        <h1 className="text-lg font-semibold text-text">Unauthorized</h1>
        <p className="mt-1 text-sm text-text-muted">
          You do not have permission to view this page.
        </p>
        <p className="mt-4">
          <Link className={link} to="/">
            Go home
          </Link>
        </p>
      </div>
    </div>
  );
}
