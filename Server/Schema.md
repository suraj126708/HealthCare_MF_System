# Database Schema — Healthcare Appointment Manager

MongoDB + Mongoose. All collections use `{ timestamps: true }` unless noted. Every field below is what you actually implement — nothing decorative.

## Collections

`User`, `DoctorProfile`, `Appointment`, `PreVisitSummary`, `PostVisitSummary`, `MedicationReminder`, `Notification`

---

### User

```js
{
  name: String,          // required
  email: String,         // required, unique, lowercase
  passwordHash: String,  // required, bcrypt
  role: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
  phone: String,
  refreshTokenHash: String,       // rotated every refresh, null = logged out
  isActive: { type: Boolean, default: true } // soft-deactivate doctors, never hard-delete
}
```

**Index:** `{ email: 1 }` unique.

Patients self-register. Doctors and the admin account are created directly (admin seeded once, doctors created via `POST /admin/doctors`) — there's no public doctor/admin signup, matching the PS ("Admin creates and manages doctor profiles").

---

### DoctorProfile

```js
{
  userId: { type: ObjectId, ref: 'User', required: true, unique: true },
  specialization: { type: String, required: true, index: true },
  workingHours: [{
    day: { type: Number, min: 0, max: 6 },  // 0 = Sunday
    startTime: String,   // "09:00"
    endTime: String      // "17:00"
  }],
  slotDurationMinutes: { type: Number, default: 30 },
  leaveDays: [{ date: Date, reason: String }]
}
```

**Index:** `{ specialization: 1 }`.

---

### Appointment

```js
{
  patientId: { type: ObjectId, ref: 'User', required: true },
  doctorId:  { type: ObjectId, ref: 'User', required: true },
  slotStart: { type: Date, required: true },
  slotEnd:   { type: Date, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'cancelled_leave', 'completed'],
    default: 'pending'
  },
  expiresAt: Date,        // set only while status='pending'; TTL kills abandoned holds
  symptoms: String,
  calendarEventId: String, // Google Calendar event id, set on confirm
  cancelReason: String
}
```

**Indexes — this is where double-booking actually gets prevented, not in route logic:**

```js
// Partial unique index: only one active/held slot per doctor per time
appointmentSchema.index(
  { doctorId: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
  },
);

// TTL: auto-expire abandoned holds after ~5 min (set expiresAt = now + 5min on creation)
appointmentSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: "pending" } },
);
```

Two simultaneous booking attempts on the same slot → Mongo rejects the second insert with `E11000`. The route catches that specific error code and returns `409 Slot already taken` — no distributed lock, no Redis, no manual read-then-write race.

---

### PreVisitSummary

```js
{
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true, unique: true },
  symptomsRaw: String,
  urgencyLevel: { type: String, enum: ['Low', 'Medium', 'High'] },
  chiefComplaint: String,
  suggestedQuestions: [String],   // exactly 3, per PS prompt spec
  llmStatus: { type: String, enum: ['success', 'failed'], default: 'success' },
  llmProvider: { type: String, enum: ['openai', 'groq'] }
}
```

### PostVisitSummary

```js
{
  appointmentId: { type: ObjectId, ref: 'Appointment', required: true, unique: true },
  clinicalNotes: { type: String, required: true },   // doctor's raw input
  prescription: [{
    drug: String,
    dosage: String,
    frequencyPerDay: Number,
    durationDays: Number
  }],
  patientFriendlySummary: String,   // LLM narrative — display only, never parsed
  followUpSteps: [String],
  llmStatus: { type: String, enum: ['success', 'failed'], default: 'success' },
  llmProvider: { type: String, enum: ['openai', 'groq'] }
}
```

`prescription[]` is a structured form input from the doctor — **not** derived from LLM text. `MedicationReminder` docs are generated directly from this array. The LLM only produces the human-readable narrative.

### MedicationReminder

```js
{
  appointmentId: { type: ObjectId, ref: 'Appointment' },
  patientId: { type: ObjectId, ref: 'User' },
  drug: String,
  dosage: String,
  timesOfDay: [String],   // e.g. ["09:00","21:00"], derived from frequencyPerDay
  startDate: Date,
  endDate: Date,
  lastSentDate: Date,     // dedupe guard so cron doesn't double-fire same day
  active: { type: Boolean, default: true }
}
```

**Index:** `{ active: 1, endDate: 1 }` — cron sweep query.

### Notification

```js
{
  type: { type: String, enum: ['booking_confirmation', 'reminder', 'cancellation', 'leave_notice'] },
  recipientId: { type: ObjectId, ref: 'User' },
  appointmentId: { type: ObjectId, ref: 'Appointment' },
  channel: { type: String, default: 'email' },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  nextRetryAt: Date,
  lastError: String
}
```

**Index:** `{ status: 1, nextRetryAt: 1 }` — retry sweep query. Backoff schedule: 1m → 5m → 15m → 1h → 6h, then mark `failed` permanently after 5 attempts.

---

## Design rationale (for your system-design write-up)

- Slot-conflict prevention lives in a **DB index**, not app code — survives concurrent requests across multiple server instances/processes.
- Summaries are separate collections from `Appointment` so a failed or regenerated LLM call never risks corrupting the booking record itself.
- Reminders are derived at post-visit time from structured fields, never from generated prose — keeps the one component that triggers real-world notifications deterministic.
