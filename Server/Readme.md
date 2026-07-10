# Backend — Healthcare Appointment Manager

## Stack

Node.js + Express, MongoDB (Atlas or local) + Mongoose, JWT (`jsonwebtoken`) + `bcrypt`, `nodemailer`, `googleapis` (Calendar), `openai` SDK + `groq-sdk` (fallback), `node-cron`, `zod` (validation), `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize`, `xss-clean`, `morgan`.

## Minimal folder layout

You're doing setup yourself, so this is guidance, not a mandate — one level of nesting, nothing clever:

```
server/
  config/         # db.js, env.js
  models/         # User.js, DoctorProfile.js, Appointment.js, PreVisitSummary.js, PostVisitSummary.js, MedicationReminder.js, Notification.js
  routes/         # auth.routes.js, admin.routes.js, doctor.routes.js, patient.routes.js
  controllers/    # one per route file
  middleware/     # auth.js, roleGuard.js, errorHandler.js, rateLimiter.js
  services/       # emailService.js, calendarService.js, llmService.js, slotService.js, notificationService.js
  jobs/           # reminderSweep.js, notificationRetry.js
  utils/          # AppError.js, asyncHandler.js
  app.js
  server.js
```

## Middleware

- **`auth.js`** — verifies access JWT, attaches `req.user`.
- **`roleGuard(...roles)`** — `403` if `req.user.role` not in allowed list.
- **`errorHandler.js`** — centralized, catches `AppError` + Mongoose `ValidationError` + the `E11000` duplicate-key case (→ `409 Slot already taken`), always returns the standard error envelope. Register last in `app.js`.
- **`rateLimiter.js`** — stricter limits on `/auth/*` and booking hold endpoint (prevents slot-hold spam).
- Global: `helmet()`, `cors({credentials:true, origin: <frontend_url>})`, `mongoSanitize()`, `xss()` on body before it touches controllers — this matters directly for the `symptoms` and `clinicalNotes` free-text fields that later get interpolated into LLM prompts.

## Services

**`slotService.js`** — the core booking logic.

- `getAvailability(doctorId, date)`: builds candidate slots from `DoctorProfile.workingHours` + `slotDurationMinutes`, subtracts existing `pending`/`confirmed` appointments and `leaveDays` for that date.
- `holdSlot(patientId, doctorId, slotStart)`: `Appointment.create({..., status:'pending', expiresAt: Date.now()+5*60*1000})` inside try/catch — catch `E11000` → throw `AppError(409, 'Slot already taken')`.
- `confirmSlot(appointmentId)`: `findOneAndUpdate({_id, status:'pending', expiresAt:{$gt: new Date()}}, {status:'confirmed'})` — if it returns `null`, the hold expired; respond `410 Hold expired, please rebook`.

**`llmService.js`** — provider fallback, always JSON-mode.

```js
async function generateStructured(prompt, schema) {
  try {
    return await callOpenAI(prompt, schema); // response_format: { type: "json_object" }
  } catch (err) {
    try {
      return await callGroq(prompt, schema); // llama-3.3-70b-versatile, JSON mode
    } catch (err2) {
      return { llmStatus: "failed" }; // never throw — caller persists this and moves on
    }
  }
}
```

Exact prompts (verbatim from the PS, don't paraphrase these when implementing):

- Pre-visit: `"Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"`
- Post-visit: `"Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>"`

Wrap both with an explicit JSON schema instruction (e.g. `"Respond ONLY with JSON matching: {urgencyLevel, chiefComplaint, suggestedQuestions[]}"`) and pass `response_format:{type:"json_object"}` on the OpenAI call. Parse defensively — a malformed JSON response is treated the same as a failed call, not a crash.

**`calendarService.js`** — doctor/admin OAuth2 only (see below), `createEvent`, `updateEvent`, `deleteEvent`, always adds the patient's email as an `attendee` so Google sends them the invite/update/cancellation — no patient-side OAuth needed.

**`emailService.js`** — `nodemailer` transport, template functions per `Notification.type` (`booking_confirmation`, `reminder`, `cancellation`, `leave_notice`).

**`notificationService.js`** — `create()` writes the `Notification` doc, then attempts send immediately; on failure sets `status:'failed'`, `attempts+1`, `nextRetryAt` per backoff table (see DB_SCHEMA.md).

## Jobs (`node-cron`, in-process — works fine on Render, would not on Vercel serverless)

- **`reminderSweep`** — every 15 min: find `MedicationReminder{active:true}` where a `timesOfDay` slot is due and `lastSentDate` isn't today → send email, update `lastSentDate`.
- **`notificationRetry`** — every 5 min: find `Notification{status:'failed', attempts<5, nextRetryAt<=now}` → resend, update attempts/backoff.

## Auth

- Access token: 15 min expiry, sent in response body.
- Refresh token: 7 day expiry, `httpOnly` cookie, hash stored on `User.refreshTokenHash`, rotated on every `/auth/refresh` call (old hash invalidated).
- Passwords: `bcrypt`, cost factor 10+.

## Google Calendar OAuth model

Only the **admin** (or each doctor individually, your call — admin-only is simpler) completes the OAuth consent screen once; refresh token stored server-side (encrypted at rest or in env/secrets, not in a public collection). All calendar events get created under that authenticated calendar, with the patient added as an attendee by email. This avoids requiring every patient to grant Calendar API scopes just to book an appointment.

## `.env.example`

```
PORT=5000
MONGO_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
OPENAI_API_KEY=
GROQ_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_REFRESH_TOKEN=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
FRONTEND_URL=
```

## Error response convention

```json
{ "success": false, "message": "Slot already taken", "code": "SLOT_CONFLICT" }
```

Use one `AppError(statusCode, message, code)` class everywhere; never let a raw Mongoose/driver error reach the client.

## Seed demo data

To populate your database with realistic sample data:

```bash
cd Server
npm run seed
```

What it seeds:

- 1 admin user
- 20 doctors + `DoctorProfile`
- 50 patients
- 35-40 appointments
- Pre/post visit summaries for completed appointments
- Medication reminders
- Notifications

Default seeded credentials:

- Password for all seeded users: `Password@123`
- Admin email: `admin@hospital.local`
