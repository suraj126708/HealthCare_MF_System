# Frontend — Healthcare Appointment Manager

## Stack

React (Vite) + Tailwind, React Router, Axios, Context API (no Redux — not needed at this scope), `react-hook-form` + `zod` for form validation, `date-fns`, `react-hot-toast` for notifications.

## Minimal folder layout

```
client/src/
  pages/
    patient/   # DoctorSearch, DoctorAvailability, BookingFlow, MyAppointments, AppointmentDetail, Medications
    doctor/    # Dashboard, AppointmentDetail, PostVisitForm, LeaveManager
    admin/     # DoctorList, DoctorForm, LeaveCalendar
    auth/      # Login, Register
  components/  # shared: Navbar, ProtectedRoute, Modal, Badge, LoadingSpinner, SlotGrid
  context/     # AuthContext.jsx
  services/    # api.js (axios instance), auth.js, doctors.js, appointments.js
  routes/      # AppRoutes.jsx
```

## Portals & pages

### Patient

- **DoctorSearch** — filter by specialization, text search, list of `DoctorCard`s.
- **DoctorAvailability** — pick a date, `SlotGrid` shows free slots for that doctor (calls `GET /patients/doctors/:id/availability`).
- **BookingFlow** — 3-step: (1) confirm slot → `POST hold`, show countdown until `expiresAt` (2) symptom form → `POST symptoms`, show returned urgency/chief complaint back to the patient as a simple confirmation, not a triage badge (3) review → `POST confirm`. If the hold timer runs out mid-flow, show "slot expired, pick another" and send them back to step 1 — don't silently retry.
- **MyAppointments** — list with status pills (pending/confirmed/cancelled/completed).
- **AppointmentDetail** — after `completed`, shows `patientFriendlySummary`, medication schedule, follow-up steps.
- **Medications** — active `MedicationReminder`s with next-dose time.

### Doctor

- **Dashboard** — today's appointments queue, sorted by `slotStart`.
- **AppointmentDetail** — shows `preVisitSummary`: urgency `Badge` (color-coded: Low=green, Medium=amber, High=red), chief complaint, 3 suggested questions.
- **PostVisitForm** — `clinicalNotes` textarea + a repeatable prescription row (`drug`, `dosage`, `frequencyPerDay`, `durationDays`) using `react-hook-form`'s `useFieldArray` — this structured array is what actually drives reminders, so validate it's non-empty before submit.
- **LeaveManager** — mark a leave date; show a confirmation modal stating how many existing appointments will be cancelled (fetch count before submit, or just show the count returned in the response and toast it).

### Admin

- **DoctorList** — table, click into `DoctorForm`.
- **DoctorForm** — create/edit: specialization, per-weekday working hours (simple 7-row time-range inputs), slot duration dropdown (15/30/45/60 min).
- **LeaveCalendar** — same leave-marking capability as doctor's own, scoped to any doctor.

## Shared components

- **Navbar** — renders links based on `user.role` from `AuthContext`.
- **ProtectedRoute** — wraps routes, redirects to `/login` if no user, or to `/unauthorized` if wrong role.
- **Badge** — urgency/status color mapping, single reusable component.
- **SlotGrid** — grid of time buttons, disabled state for taken slots, click → triggers hold.
- **Modal**, **LoadingSpinner**, **Toast** (via `react-hot-toast`, no custom component needed).

## State & auth

`AuthContext` holds `{ user, accessToken }`. Axios instance has a response interceptor: on `401`, call `/auth/refresh` once, retry the original request; on second failure, log out and redirect to `/login`. Don't put the refresh token anywhere in JS-accessible storage — it's an `httpOnly` cookie, the frontend never touches it directly.

## Styling notes

- Tailwind, no component library needed at this scope.
- Color convention: urgency Low=`green-500`, Medium=`amber-500`, High=`red-500`; appointment status pending=`gray`, confirmed=`blue`, completed=`green`, cancelled=`red`.
- Booking flow and doctor queue are the two screens most likely to be used on a phone in a real clinic — keep `SlotGrid` and the appointment list responsive (stack on mobile) rather than table-only layouts.

# NOTE : use tailwind css
