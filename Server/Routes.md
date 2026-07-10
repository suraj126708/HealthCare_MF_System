# API Routes — Healthcare Appointment Manager

Base URL: `/api`. Protected routes require `Authorization: Bearer <accessToken>`.
Response envelope everywhere: `{ "success": boolean, "data"?: ..., "message"?: string }`.
Error envelope: `{ "success": false, "message": string, "code"?: string }`.

---

## Auth

| Method | Path             | Role                | Body                                                                  |
| ------ | ---------------- | ------------------- | --------------------------------------------------------------------- |
| POST   | `/auth/register` | public              | `{ name, email, password, phone }` → always creates `role: 'patient'` |
| POST   | `/auth/login`    | public              | `{ email, password }`                                                 |
| POST   | `/auth/refresh`  | uses refresh cookie | —                                                                     |
| POST   | `/auth/logout`   | authenticated       | —                                                                     |

**Login response:**

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "name": "...", "role": "patient" },
    "accessToken": "jwt..."
  }
}
```

Refresh token set as `httpOnly, secure, sameSite=strict` cookie — never returned in JSON body.

---

## Admin (`role: admin`)

| Method | Path                                      | Body                                                                             |
| ------ | ----------------------------------------- | -------------------------------------------------------------------------------- |
| POST   | `/admin/doctors`                          | `{ name, email, password, specialization, workingHours[], slotDurationMinutes }` |
| GET    | `/admin/doctors`                          | — (supports `?specialization=`)                                                  |
| GET    | `/admin/doctors/:doctorId`                | —                                                                                |
| PATCH  | `/admin/doctors/:doctorId`                | any subset of doctor fields                                                      |
| POST   | `/admin/doctors/:doctorId/leave`          | `{ date: "2026-07-15", reason }`                                                 |
| DELETE | `/admin/doctors/:doctorId/leave/:leaveId` | —                                                                                |

**`POST /admin/doctors/:doctorId/leave` — this is the leave-conflict endpoint. On success it:**

1. Adds the leave entry to `DoctorProfile.leaveDays`.
2. Finds all `Appointment`s where `doctorId` matches and `slotStart` falls on that date and `status IN [pending, confirmed]`.
3. Sets each to `status: 'cancelled_leave'`, deletes the associated Google Calendar event.
4. Creates a `Notification(type: 'leave_notice')` per affected patient and sends the email immediately (falls into retry queue on failure).
5. Response includes the count of affected appointments:

```json
{
  "success": true,
  "data": { "leaveDay": "2026-07-15", "affectedAppointments": 3 }
}
```

Patient must rebook manually — the appointment is **not** auto-rescheduled.

---

## Doctor (`role: doctor`)

| Method | Path                                 | Body                                                                               |
| ------ | ------------------------------------ | ---------------------------------------------------------------------------------- |
| GET    | `/doctor/appointments?date=&status=` | —                                                                                  |
| GET    | `/doctor/appointments/:id`           | — includes populated `preVisitSummary`                                             |
| POST   | `/doctor/appointments/:id/complete`  | `{ clinicalNotes, prescription: [{drug, dosage, frequencyPerDay, durationDays}] }` |
| POST   | `/doctor/leave`                      | `{ date, reason }` — same cascade as admin route, self-service                     |
| GET    | `/doctor/profile`                    | —                                                                                  |

**`POST /doctor/appointments/:id/complete`:**

1. Validates appointment belongs to this doctor and `status='confirmed'`.
2. Saves `clinicalNotes` + `prescription[]`.
3. Calls LLM (post-visit prompt) → on success stores `patientFriendlySummary` + `followUpSteps`; on failure sets `llmStatus:'failed'` but **does not block** the rest of the flow.
4. Creates `MedicationReminder` docs directly from `prescription[]` (never from LLM output).
5. Sets `Appointment.status = 'completed'`.

```json
// Response
{
  "success": true,
  "data": {
    "appointmentId": "...",
    "llmStatus": "success",
    "medicationRemindersCreated": 2
  }
}
```

---

## Patient (`role: patient`)

| Method | Path                                                       | Body                                       |
| ------ | ---------------------------------------------------------- | ------------------------------------------ |
| GET    | `/patients/doctors?specialization=&q=`                     | — search/filter                            |
| GET    | `/patients/doctors/:doctorId/availability?date=YYYY-MM-DD` | — computed free slots                      |
| POST   | `/patients/appointments/hold`                              | `{ doctorId, slotStart }`                  |
| POST   | `/patients/appointments/:id/symptoms`                      | `{ symptoms }`                             |
| POST   | `/patients/appointments/:id/confirm`                       | —                                          |
| DELETE | `/patients/appointments/:id`                               | `{ reason? }`                              |
| GET    | `/patients/appointments?status=`                           | —                                          |
| GET    | `/patients/appointments/:id`                               | — includes `postVisitSummary` if completed |
| GET    | `/patients/medications`                                    | — active reminders                         |

### Booking flow (in order)

**1. Hold the slot**

```
POST /patients/appointments/hold
{ "doctorId": "664f...", "slotStart": "2026-07-15T09:00:00.000Z" }
```

```json
{
  "success": true,
  "data": {
    "appointmentId": "...",
    "status": "pending",
    "expiresAt": "2026-07-15T08:35:00.000Z"
  }
}
```

Fails with `409` if the partial unique index rejects it (someone else holds/has this slot).

**2. Submit symptoms (triggers pre-visit LLM call)**

```
POST /patients/appointments/:id/symptoms
{ "symptoms": "Fever for 3 days, mild chest tightness, occasional dry cough" }
```

```json
{
  "success": true,
  "data": {
    "urgencyLevel": "Medium",
    "chiefComplaint": "Persistent fever with chest tightness",
    "suggestedQuestions": [
      "Is the chest tightness worse with exertion or breathing?",
      "Any history of asthma or respiratory conditions?",
      "Has the fever responded to over-the-counter medication?"
    ]
  }
}
```

If the LLM call fails after both providers, respond `200` anyway with `"llmStatus": "failed"` — booking must never be blocked by an LLM outage.

**3. Confirm**

```
POST /patients/appointments/:id/confirm
```

Only succeeds if not expired and still `pending`. On success: creates the Google Calendar event on the doctor's calendar with the patient as an attendee, sets `status: 'confirmed'`, fires `Notification(booking_confirmation)` to both parties.

**4. Cancel**

```
DELETE /patients/appointments/:id
{ "reason": "Schedule conflict" }
```

Deletes the calendar event, sets `status: 'cancelled'`, notifies the doctor.

---

## Auth/role guard summary

| Prefix        | Allowed roles |
| ------------- | ------------- |
| `/admin/*`    | admin         |
| `/doctor/*`   | doctor        |
| `/patients/*` | patient       |
| `/auth/*`     | public / self |

Keep it to these three prefixes — no shared generic `/appointments/:id` route. Fewer branches, fewer edge cases to explain in the write-up.
