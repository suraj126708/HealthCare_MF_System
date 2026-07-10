const express = require("express");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const DoctorProfile = require("./models/DoctorProfile");
const Appointment = require("./models/Appointment");
const auth = require("./middleware/auth");
const roleGuard = require("./middleware/roleGuard");
const slotService = require("./services/slotService");

const router = express.Router();

// 1) Seed basic users: one admin, one doctor, one patient
router.post("/seed-basic-users", async (req, res, next) => {
  try {
    console.log("[SEED] Creating/checking demo users...");

    const password = "Password123!";
    const passwordHash = await bcrypt.hash(password, 10);

    const admin =
      (await User.findOne({ email: "admin@test.com" })) ||
      (await User.create({
        name: "Admin",
        email: "admin@test.com",
        passwordHash,
        role: "admin",
      }));

    const doctorUser =
      (await User.findOne({ email: "doctor@test.com" })) ||
      (await User.create({
        name: "Dr Demo",
        email: "doctor@test.com",
        passwordHash,
        role: "doctor",
      }));

    const patient =
      (await User.findOne({ email: "patient@test.com" })) ||
      (await User.create({
        name: "Patient Demo",
        email: "patient@test.com",
        passwordHash,
        role: "patient",
      }));

    const profile =
      (await DoctorProfile.findOne({ userId: doctorUser._id })) ||
      (await DoctorProfile.create({
        userId: doctorUser._id,
        specialization: "general",
        workingHours: [
          { day: 1, startTime: "09:00", endTime: "12:00" }, // Monday
        ],
        slotDurationMinutes: 30,
      }));

    console.log(
      `[SEED] Completed | Admin: ${admin.email} | Doctor: ${doctorUser.email} | Patient: ${patient.email}`,
    );

    res.json({
      success: true,
      data: {
        password,
        admin: { id: admin._id, email: admin.email },
        doctor: { id: doctorUser._id, email: doctorUser.email },
        patient: { id: patient._id, email: patient.email },
        doctorProfile: profile,
      },
    });
  } catch (err) {
    console.error("[SEED ERROR]", err);
    next(err);
  }
});

// 2) Quick login helper: returns accessToken for any of the seeded users
router.post("/login-demo", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    console.log(`[LOGIN-DEMO] Login attempt: ${email}`);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "email & password required",
      });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });

    if (!user) {
      console.log(`[LOGIN-DEMO] User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);

    if (!ok) {
      console.log(`[LOGIN-DEMO] Invalid password: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log(
      `[LOGIN-DEMO] Success | User: ${user.email} | Role: ${user.role}`,
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
        },
        note: "Use /api/auth/login for real JWT + cookies",
      },
    });
  } catch (err) {
    console.error("[LOGIN-DEMO ERROR]", err);
    next(err);
  }
});

// 3) Patient flow demo: hold → confirm with today's first slot
router.post(
  "/demo-patient-flow",
  auth,
  roleGuard("patient"),
  async (req, res, next) => {
    try {
      const { doctorId, date } = req.body || {};

      console.log(
        `[PATIENT FLOW] Patient ${req.user.id} requested appointment | Doctor: ${doctorId} | Date: ${date}`,
      );

      if (!doctorId || !date) {
        return res.status(400).json({
          success: false,
          message: "doctorId and date (YYYY-MM-DD) required",
        });
      }

      const slots = await slotService.getAvailability(doctorId, date);

      console.log(`[PATIENT FLOW] Available slots found: ${slots.length}`);

      if (!slots.length) {
        console.log("[PATIENT FLOW] No slots available");

        return res.json({
          success: true,
          data: {
            message: "No free slots for that date",
          },
        });
      }

      const firstSlot = slots.find((s) => s.available !== false) || slots[0];

      const hold = await slotService.holdSlot({
        patientId: req.user.id,
        doctorId,
        slotStart: firstSlot.slotStart,
      });

      console.log(`[PATIENT FLOW] Slot held | Appointment ID: ${hold._id}`);

      const confirmed = await slotService.confirmSlot({
        appointmentId: hold._id,
      });

      console.log(
        `[PATIENT FLOW] Appointment confirmed | Appointment ID: ${confirmed._id}`,
      );

      res.json({
        success: true,
        data: {
          chosenSlot: firstSlot,
          hold: {
            id: hold._id,
            status: hold.status,
          },
          confirmed: {
            id: confirmed._id,
            status: confirmed.status,
          },
        },
      });
    } catch (err) {
      console.error("[PATIENT FLOW ERROR]", err);
      next(err);
    }
  },
);

// 4) Admin leave demo for a given doctor & date
router.post(
  "/demo-admin-leave",
  auth,
  roleGuard("admin"),
  async (req, res, next) => {
    try {
      const { doctorId, date } = req.body || {};

      console.log(
        `[ADMIN] Leave request | Doctor: ${doctorId} | Date: ${date}`,
      );

      if (!doctorId || !date) {
        return res.status(400).json({
          success: false,
          message: "doctorId and date (YYYY-MM-DD) required",
        });
      }

      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const updated = await Appointment.updateMany(
        {
          doctorId,
          status: { $in: ["pending", "confirmed"] },
          slotStart: { $gte: start, $lte: end },
        },
        {
          $set: {
            status: "cancelled_leave",
            cancelReason: "demo leave",
          },
        },
      );

      console.log(
        `[ADMIN] Cancelled ${updated.modifiedCount} appointments for leave`,
      );

      res.json({
        success: true,
        data: {
          date,
          affectedAppointments: updated.modifiedCount,
        },
      });
    } catch (err) {
      console.error("[ADMIN ERROR]", err);
      next(err);
    }
  },
);

module.exports = router;

// Run independently with a simple terminal menu: `node Api_Testing.js`
if (require.main === module) {
  require("dotenv").config();
  const connectDB = require("./config/db");
  const errorHandler = require("./middleware/errorHandler");
  const readline = require("readline");

  const app = express();
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ success: true, data: { status: "ok" } });
  });

  app.use("/api/testing", router);
  app.use(errorHandler);

  const PORT = process.env.TEST_PORT || 5050;

  (async () => {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Api_Testing server running on port ${PORT}`);
      console.log(`Health:  http://localhost:${PORT}/api/health`);
      console.log(`Base:    http://localhost:${PORT}/api/testing`);
      console.log("");
      showMenu();
    });
  })();

  function showMenu() {
    console.log("Select a testing action:");
    console.log("  1) Seed basic users (admin/doctor/patient)");
    console.log("  2) Login demo user (no JWT, just DB check)");
    console.log("  2a) Real login via /api/auth/login (prints accessToken)");
    console.log("  3) Patient flow: hold + confirm (requires JWT)");
    console.log("  4) Admin demo leave (requires JWT)");
    console.log("  5) Doctor complete appointment (requires JWT)");
    console.log("  q) Quit");
    promptChoice();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function promptChoice() {
    rl.question("> ", async (answer) => {
      const choice = String(answer || "")
        .trim()
        .toLowerCase();

      try {
        if (choice === "1") {
          await runSeed();
        } else if (choice === "2") {
          await runLoginDemo();
        } else if (choice === "2a") {
          await runRealLogin();
        } else if (choice === "3") {
          await runPatientFlow();
        } else if (choice === "4") {
          await runAdminLeave();
        } else if (choice === "5") {
          await runDoctorComplete();
        } else if (choice === "q") {
          rl.close();
          process.exit(0);
          return;
        } else {
          console.log("Unknown choice, try again.");
        }
      } catch (err) {
        console.error("Error running action:", err?.message || err);
      }

      console.log("");
      showMenu();
    });
  }

  async function runSeed() {
    console.log("→ POST /api/testing/seed-basic-users");
    const res = await fetch(
      `http://localhost:${PORT}/api/testing/seed-basic-users`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
    );
    const json = await res.json();
    console.log("Status:", res.status);
    console.dir(json, { depth: null });
  }

  async function runLoginDemo() {
    const defaultEmail = "patient@test.com";
    const defaultPassword = "Password123!";

    const email = await questionAsync(
      `Email [${defaultEmail}]: `,
      defaultEmail,
    );
    const password = await questionAsync(
      `Password [${defaultPassword}]: `,
      defaultPassword,
    );

    console.log("→ POST /api/testing/login-demo");
    const res = await fetch(`http://localhost:${PORT}/api/testing/login-demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    console.log("Status:", res.status);
    console.dir(json, { depth: null });
  }

  async function runRealLogin() {
    const defaultEmail = "patient@test.com";
    const defaultPassword = "Password123!";

    const email = await questionAsync(`Email [${defaultEmail}]: `, defaultEmail);
    const password = await questionAsync(
      `Password [${defaultPassword}]: `,
      defaultPassword,
    );

    console.log("→ POST /api/auth/login");
    const res = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    console.log("Status:", res.status);
    console.dir(json, { depth: null });
  }

  async function runPatientFlow() {
    const doctorId = await questionAsync("Doctor ID: ");
    const date = await questionAsync("Date (YYYY-MM-DD): ");
    const accessToken = await questionAsync("Patient accessToken (JWT): ");

    console.log("→ POST /api/testing/demo-patient-flow");
    const res = await fetch(
      `http://localhost:${PORT}/api/testing/demo-patient-flow`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ doctorId, date }),
      },
    );
    const json = await res.json();
    console.log("Status:", res.status);
    console.dir(json, { depth: null });
  }

  async function runAdminLeave() {
    const doctorId = await questionAsync("Doctor ID: ");
    const date = await questionAsync("Date (YYYY-MM-DD): ");
    const accessToken = await questionAsync("Admin accessToken (JWT): ");

    console.log("→ POST /api/testing/demo-admin-leave");
    const res = await fetch(
      `http://localhost:${PORT}/api/testing/demo-admin-leave`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ doctorId, date }),
      },
    );
    const json = await res.json();
    console.log("Status:", res.status);
    console.dir(json, { depth: null });
  }

  async function runDoctorComplete() {
    const appointmentId = await questionAsync("Appointment ID: ");
    const accessToken = await questionAsync("Doctor accessToken (JWT): ");
    const clinicalNotes = await questionAsync("clinicalNotes: ");

    const prescriptionRaw = await questionAsync(
      'prescription JSON (e.g. [{"drug":"Paracetamol","dosage":"500mg","frequencyPerDay":2,"durationDays":3}]): ',
    );

    let prescription;
    try {
      prescription = JSON.parse(prescriptionRaw);
    } catch {
      console.log("Invalid JSON for prescription.");
      return;
    }

    console.log("→ POST /api/doctor/appointments/:id/complete");
    const res = await fetch(
      `http://localhost:${PORT}/api/doctor/appointments/${appointmentId}/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ clinicalNotes, prescription }),
      },
    );

    const json = await res.json();
    console.log("Status:", res.status);
    console.dir(json, { depth: null });
  }

  function questionAsync(prompt, fallback) {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        const trimmed = String(answer || "").trim();
        if (!trimmed && fallback !== undefined) return resolve(fallback);
        resolve(trimmed);
      });
    });
  }
}
