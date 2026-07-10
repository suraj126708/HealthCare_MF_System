require("dotenv").config();
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const User = require("./models/User");
const DoctorProfile = require("./models/DoctorProfile");
const Appointment = require("./models/Appointment");
const PreVisitSummary = require("./models/PreVisitSummary");
const PostVisitSummary = require("./models/PostVisitSummary");
const MedicationReminder = require("./models/MedicationReminder");
const Notification = require("./models/Notification");

const SPECIALIZATIONS = [
  "Cardiology",
  "Dermatology",
  "Orthopedics",
  "Pediatrics",
  "Neurology",
  "ENT",
  "General Medicine",
  "Psychiatry",
];

const FIRST_NAMES = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Arjun",
  "Ishaan",
  "Kabir",
  "Anaya",
  "Diya",
  "Saanvi",
  "Meera",
  "Riya",
  "Tara",
];

const LAST_NAMES = [
  "Sharma",
  "Patel",
  "Verma",
  "Singh",
  "Khan",
  "Gupta",
  "Nair",
  "Iyer",
  "Mehta",
  "Reddy",
];

const DRUGS = [
  { drug: "Paracetamol", dosage: "500mg" },
  { drug: "Azithromycin", dosage: "250mg" },
  { drug: "Cetirizine", dosage: "10mg" },
  { drug: "Pantoprazole", dosage: "40mg" },
  { drug: "Vitamin D3", dosage: "60K IU" },
];

const SYMPTOMS = [
  "Headache and mild fever for two days",
  "Persistent dry cough and sore throat",
  "Lower back pain after lifting heavy items",
  "Skin rash with itching on both arms",
  "Fatigue and poor sleep for one week",
];

const CLINICAL_NOTES = [
  "Likely viral infection. Hydration and symptomatic treatment advised.",
  "Muscle strain. Rest and anti-inflammatory medication prescribed.",
  "Allergic dermatitis suspected. Topical treatment started.",
  "Early migraine pattern. Trigger diary advised.",
  "Acute sinusitis likely. Steam inhalation and short medication course.",
];

const toTime = (h, m = 0) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const maybe = (p = 0.5) => Math.random() < p;

const plusDays = (base, n) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};

const atHour = (date, hour, minute = 0) => {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
};

function buildWorkingHours() {
  const days = [1, 2, 3, 4, 5, 6];
  return days.map((day) => {
    const startHour = maybe(0.4) ? 10 : 9;
    const endHour = maybe(0.3) ? 18 : 17;
    return { day, startTime: toTime(startHour), endTime: toTime(endHour) };
  });
}

function timesForFrequency(frequencyPerDay) {
  if (frequencyPerDay <= 1) return ["09:00"];
  if (frequencyPerDay === 2) return ["09:00", "21:00"];
  return ["08:00", "14:00", "20:00"];
}

async function clearCollections() {
  await Promise.all([
    Notification.deleteMany({}),
    MedicationReminder.deleteMany({}),
    PostVisitSummary.deleteMany({}),
    PreVisitSummary.deleteMany({}),
    Appointment.deleteMany({}),
    DoctorProfile.deleteMany({}),
    User.deleteMany({}),
  ]);
}

async function seed() {
  await connectDB();
  console.log("Seeding database...");

  await clearCollections();

  const passwordHash = await bcrypt.hash("Password@123", 10);

  const admin = await User.create({
    name: "System Admin",
    email: "admin@hospital.local",
    passwordHash,
    role: "admin",
    phone: "9999999999",
  });

  const doctors = [];
  for (let i = 1; i <= 20; i += 1) {
    const first = rand(FIRST_NAMES);
    const last = rand(LAST_NAMES);
    const user = await User.create({
      name: `Dr. ${first} ${last}`,
      email: `doctor${i}@hospital.local`,
      passwordHash,
      role: "doctor",
      phone: `98${String(10000000 + i).slice(-8)}`,
      isActive: true,
    });

    await DoctorProfile.create({
      userId: user._id,
      specialization: SPECIALIZATIONS[(i - 1) % SPECIALIZATIONS.length],
      workingHours: buildWorkingHours(),
      slotDurationMinutes: [15, 30, 45][(i - 1) % 3],
      leaveDays: maybe(0.35)
        ? [{ date: plusDays(new Date(), randInt(5, 25)), reason: "Personal leave" }]
        : [],
    });

    doctors.push(user);
  }

  const patients = [];
  for (let i = 1; i <= 50; i += 1) {
    const first = rand(FIRST_NAMES);
    const last = rand(LAST_NAMES);
    const user = await User.create({
      name: `${first} ${last}`,
      email: `patient${i}@hospital.local`,
      passwordHash,
      role: "patient",
      phone: `97${String(10000000 + i).slice(-8)}`,
      isActive: true,
    });
    patients.push(user);
  }

  const appointments = [];
  const usedSlots = new Set();
  const totalAppointments = randInt(35, 40);

  while (appointments.length < totalAppointments) {
    const doctor = rand(doctors);
    const patient = rand(patients);
    const dayOffset = randInt(-20, 10);
    const date = plusDays(new Date(), dayOffset);
    const hour = rand([9, 10, 11, 12, 14, 15, 16, 17]);
    const minute = rand([0, 30]);
    const slotStart = atHour(date, hour, minute);
    const slotKey = `${doctor._id.toString()}_${slotStart.toISOString()}`;
    if (usedSlots.has(slotKey)) continue;
    usedSlots.add(slotKey);

    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
    const status = dayOffset < -2 ? rand(["completed", "cancelled"]) : rand(["confirmed", "pending"]);

    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId: doctor._id,
      slotStart,
      slotEnd,
      status,
      expiresAt: status === "pending" ? plusDays(new Date(), 1) : undefined,
      symptoms: rand(SYMPTOMS),
      calendarEventId: status === "confirmed" ? `evt_${Math.random().toString(36).slice(2, 12)}` : undefined,
      cancelReason: status === "cancelled" ? "Patient requested reschedule" : undefined,
    });
    appointments.push(appointment);
  }

  const completedAppointments = appointments.filter((a) => a.status === "completed");
  for (const appointment of completedAppointments) {
    const frequencyPerDay = rand([1, 2, 3]);
    const durationDays = rand([5, 7, 10, 14]);
    const medicine = rand(DRUGS);

    await PreVisitSummary.create({
      appointmentId: appointment._id,
      symptomsRaw: appointment.symptoms,
      urgencyLevel: rand(["Low", "Medium", "High"]),
      chiefComplaint: appointment.symptoms,
      suggestedQuestions: [
        "When did the symptoms begin?",
        "Are symptoms worse at specific times?",
        "Any history of similar episodes?",
      ],
      llmStatus: "success",
      llmProvider: rand(["openai", "groq"]),
    });

    await PostVisitSummary.create({
      appointmentId: appointment._id,
      clinicalNotes: rand(CLINICAL_NOTES),
      prescription: [
        {
          drug: medicine.drug,
          dosage: medicine.dosage,
          frequencyPerDay,
          durationDays,
        },
      ],
      patientFriendlySummary:
        "Please take medicines on time, stay hydrated, and monitor symptoms. Return if condition worsens.",
      followUpSteps: ["Take medicines as prescribed", "Avoid strenuous activity", "Review after 1 week"],
      llmStatus: "success",
      llmProvider: rand(["openai", "groq"]),
    });

    await MedicationReminder.create({
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      drug: medicine.drug,
      dosage: medicine.dosage,
      timesOfDay: timesForFrequency(frequencyPerDay),
      startDate: new Date(appointment.slotStart),
      endDate: plusDays(appointment.slotStart, durationDays),
      active: true,
    });
  }

  for (const appointment of appointments) {
    const type =
      appointment.status === "cancelled"
        ? "cancellation"
        : appointment.status === "confirmed"
          ? "booking_confirmation"
          : "reminder";
    await Notification.create({
      type,
      recipientId: appointment.patientId,
      appointmentId: appointment._id,
      status: maybe(0.8) ? "sent" : "failed",
      attempts: maybe(0.2) ? randInt(1, 3) : 0,
      nextRetryAt: maybe(0.2) ? plusDays(new Date(), 1) : undefined,
      lastError: maybe(0.15) ? "SMTP timeout" : undefined,
    });
  }

  const counts = await Promise.all([
    User.countDocuments({ role: "patient" }),
    User.countDocuments({ role: "doctor" }),
    User.countDocuments({ role: "admin" }),
    Appointment.countDocuments({}),
    PreVisitSummary.countDocuments({}),
    PostVisitSummary.countDocuments({}),
    MedicationReminder.countDocuments({}),
    Notification.countDocuments({}),
  ]);

  console.log("Seed completed.");
  console.log(`Patients: ${counts[0]}`);
  console.log(`Doctors: ${counts[1]}`);
  console.log(`Admins: ${counts[2]}`);
  console.log(`Appointments: ${counts[3]}`);
  console.log(`PreVisitSummary: ${counts[4]}`);
  console.log(`PostVisitSummary: ${counts[5]}`);
  console.log(`MedicationReminder: ${counts[6]}`);
  console.log(`Notification: ${counts[7]}`);
  console.log("Login password for seeded users: Password@123");
  console.log("Admin email: admin@hospital.local");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
    process.exit();
  });
