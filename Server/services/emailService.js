const nodemailer = require("nodemailer");

const APP_NAME = "Hospital Appointment Management";

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateTime(date) {
  if (!date) return "—";
  return `${formatDate(date)} at ${formatTime(date)}`;
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "").replace(/\/$/, "");
}

function detailRow(label, value) {
  if (!value) return "";
  return `
    <tr>
      <td style="padding:10px 0;color:#64748b;font-size:14px;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;color:#0f172a;font-size:14px;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>`;
}

function baseLayout({ title, preheader, bodyHtml, ctaLabel, ctaUrl }) {
  const safeTitle = escapeHtml(title);
  const safePreheader = escapeHtml(preheader || title);
  const ctaBlock =
    ctaLabel && ctaUrl
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
          <tr>
            <td style="border-radius:8px;background:#0f766e;">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                ${escapeHtml(ctaLabel)}
              </a>
            </td>
          </tr>
        </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e,#115e59);padding:28px 32px;">
              <p style="margin:0;color:#ccfbf1;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(APP_NAME)}</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;line-height:1.3;font-weight:700;">${safeTitle}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
              ${ctaBlock}
              <p style="margin:32px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
                This is an automated message from ${escapeHtml(APP_NAME)}. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function appointmentDetailsTable(context) {
  const rows = [
    detailRow("Appointment ID", context.appointmentReference || context.appointmentId),
    detailRow("Patient", context.patientName),
    detailRow("Doctor", context.doctorName),
    detailRow("Specialization", context.specialization),
    detailRow("Date", formatDate(context.slotStart)),
    detailRow(
      "Time",
      `${formatTime(context.slotStart)} – ${formatTime(context.slotEnd)}`,
    ),
    detailRow("Symptoms", context.symptoms),
    detailRow("Reason", context.cancelReason),
  ].join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Appointment details</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        </td>
      </tr>
    </table>`;
}

function greeting(name) {
  return `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">Hello ${escapeHtml(name || "there")},</p>`;
}

function wrap(subject, html, text) {
  return { subject, html, text };
}

function appointmentLink(context, role) {
  const base = getFrontendUrl();
  if (!base || !context.appointmentId) return null;
  const path = role === "doctor" ? "doctor" : "patients";
  return `${base}/${path}/appointments/${context.appointmentId}`;
}

function templateFor(type, context = {}) {
  const name = context.recipientName;
  const role = context.recipientRole;
  const link = appointmentLink(context, role);

  switch (type) {
    case "booking_confirmation": {
      const isDoctor = role === "doctor";
      const title = "Appointment confirmed";
      const intro = isDoctor
        ? "A patient appointment has been confirmed on your schedule."
        : "Your appointment has been successfully confirmed.";
      const bodyHtml = `
        ${greeting(name)}
        <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.6;">${intro}</p>
        <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">Please arrive a few minutes early and bring any relevant medical records.</p>
        ${appointmentDetailsTable(context)}`;
      const text = [
        `Hello ${name || "there"},`,
        "",
        intro,
        "",
        "Appointment details:",
        context.appointmentReference || context.appointmentId
          ? `Appointment ID: ${context.appointmentReference || context.appointmentId}`
          : "",
        `Patient: ${context.patientName || "—"}`,
        `Doctor: ${context.doctorName || "—"}`,
        `Specialization: ${context.specialization || "—"}`,
        `Date: ${formatDate(context.slotStart)}`,
        `Time: ${formatTime(context.slotStart)} – ${formatTime(context.slotEnd)}`,
        context.symptoms ? `Symptoms: ${context.symptoms}` : "",
        link ? `\nView appointment: ${link}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return wrap(
        title,
        baseLayout({
          title,
          preheader: `${isDoctor ? "New confirmed appointment" : "Your appointment is confirmed"} with ${context.doctorName || "your doctor"}`,
          bodyHtml,
          ctaLabel: link ? "View appointment" : null,
          ctaUrl: link,
        }),
        text,
      );
    }

    case "reminder": {
      const title = "Medication reminder";
      const drugLine = [context.drug, context.dosage]
        .filter(Boolean)
        .join(" — ");
      const bodyHtml = `
        ${greeting(name)}
        <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.6;">This is your scheduled medication reminder.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#ecfeff;border:1px solid #a5f3fc;border-radius:8px;">
          <tr>
            <td style="padding:20px;">
              <p style="margin:0 0 6px;color:#0e7490;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Take now</p>
              <p style="margin:0;color:#0f172a;font-size:20px;font-weight:700;line-height:1.4;">${escapeHtml(drugLine || "Your medication")}</p>
              ${context.dosage ? `<p style="margin:8px 0 0;color:#475569;font-size:14px;">Dosage: ${escapeHtml(context.dosage)}</p>` : ""}
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;color:#64748b;font-size:14px;line-height:1.6;">Follow your doctor's instructions. Contact your healthcare provider if you have questions about side effects or missed doses.</p>`;
      const text = [
        `Hello ${name || "there"},`,
        "",
        "This is your scheduled medication reminder.",
        "",
        drugLine ? `Medication: ${drugLine}` : "",
        context.dosage ? `Dosage: ${context.dosage}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return wrap(
        title,
        baseLayout({
          title,
          preheader: `Reminder to take ${context.drug || "your medication"}`,
          bodyHtml,
        }),
        text,
      );
    }

    case "cancellation": {
      const title = "Appointment cancelled";
      const intro = "An appointment on your schedule has been cancelled.";
      const bodyHtml = `
        ${greeting(name)}
        <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.6;">${intro}</p>
        ${context.cancelReason ? `<p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${escapeHtml(context.cancelReason)}</p>` : ""}
        ${appointmentDetailsTable(context)}`;
      const text = [
        `Hello ${name || "there"},`,
        "",
        intro,
        context.cancelReason ? `Reason: ${context.cancelReason}` : "",
        "",
        `Appointment ID: ${context.appointmentReference || context.appointmentId || "—"}`,
        `Patient: ${context.patientName || "—"}`,
        `Doctor: ${context.doctorName || "—"}`,
        `Date: ${formatDate(context.slotStart)}`,
        `Time: ${formatTime(context.slotStart)} – ${formatTime(context.slotEnd)}`,
        link ? `\nView details: ${link}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return wrap(
        title,
        baseLayout({
          title,
          preheader: `Appointment cancelled for ${formatDateTime(context.slotStart)}`,
          bodyHtml,
          ctaLabel: link ? "View details" : null,
          ctaUrl: link,
        }),
        text,
      );
    }

    case "leave_notice": {
      const title = "Appointment cancelled — doctor on leave";
      const intro = `Your appointment with ${escapeHtml(context.doctorName || "your doctor")} has been cancelled because the doctor is on leave.`;
      const bodyHtml = `
        ${greeting(name)}
        <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.6;">${intro}</p>
        ${context.cancelReason ? `<p style="margin:0 0 8px;color:#64748b;font-size:14px;line-height:1.6;"><strong>Leave reason:</strong> ${escapeHtml(context.cancelReason)}</p>` : ""}
        <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">Please book a new appointment at your convenience.</p>
        ${appointmentDetailsTable(context)}`;
      const text = [
        `Hello ${name || "there"},`,
        "",
        `Your appointment with ${context.doctorName || "your doctor"} has been cancelled because the doctor is on leave.`,
        context.cancelReason ? `Leave reason: ${context.cancelReason}` : "",
        "",
        `Appointment ID: ${context.appointmentReference || context.appointmentId || "—"}`,
        `Doctor: ${context.doctorName || "—"}`,
        `Date: ${formatDate(context.slotStart)}`,
        `Time: ${formatTime(context.slotStart)} – ${formatTime(context.slotEnd)}`,
        link ? `\nBook again: ${getFrontendUrl()}/patients/appointments` : "",
      ]
        .filter(Boolean)
        .join("\n");

      return wrap(
        title,
        baseLayout({
          title,
          preheader: `Appointment on ${formatDate(context.slotStart)} cancelled due to doctor leave`,
          bodyHtml,
          ctaLabel: getFrontendUrl() ? "Book a new appointment" : null,
          ctaUrl: getFrontendUrl()
            ? `${getFrontendUrl()}/patients/appointments`
            : null,
        }),
        text,
      );
    }

    default: {
      const title = "Notification";
      const bodyHtml = `
        ${greeting(name)}
        <p style="margin:0;color:#334155;font-size:15px;line-height:1.6;">You have a new notification: <strong>${escapeHtml(type)}</strong>.</p>`;
      return wrap(
        title,
        baseLayout({ title, preheader: `New notification: ${type}`, bodyHtml }),
        `Hello ${name || "there"},\n\nYou have a new notification: ${type}.`,
      );
    }
  }
}

exports.sendNotificationEmail = async ({ to, type, context }) => {
  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const { subject, html, text } = templateFor(type, context || {});

    const transport = getTransport();
    await transport.sendMail({ from, to, subject, html, text });
    return true;
  } catch (error) {
    console.error(`Failed to send ${type} email to ${to}:`, error);
    return false;
  }
};
