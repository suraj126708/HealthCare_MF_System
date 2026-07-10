const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const AppError = require('../utils/AppError');

function toDateOnly(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function minutesToMs(m) {
  return m * 60 * 1000;
}

function parseHHMM(s) {
  const [hh, mm] = String(s || '').split(':').map((x) => Number(x));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return { hh, mm };
}

function atTime(date, hhmm) {
  const parsed = parseHHMM(hhmm);
  if (!parsed) return null;
  const d = new Date(date);
  d.setHours(parsed.hh, parsed.mm, 0, 0);
  return d;
}

exports.getAvailability = async (doctorId, dateStr) => {
  const date = toDateOnly(dateStr);
  if (!date) throw new AppError(400, 'Invalid date');

  const profile = await DoctorProfile.findOne({ userId: doctorId }).lean();
  if (!profile) throw new AppError(404, 'Doctor profile not found');

  const day = date.getDay(); // 0=Sun
  const wh = (profile.workingHours || []).find((w) => w.day === day);
  if (!wh) return [];

  const start = atTime(date, wh.startTime);
  const end = atTime(date, wh.endTime);
  if (!start || !end || end <= start) return [];

  const leaveHit = (profile.leaveDays || []).some((l) => {
    const ld = new Date(l.date);
    ld.setHours(0, 0, 0, 0);
    return ld.getTime() === date.getTime();
  });
  if (leaveHit) return [];

  const duration = profile.slotDurationMinutes || 30;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await Appointment.find({
    doctorId,
    status: { $in: ['pending', 'confirmed'] },
    slotStart: { $gte: dayStart, $lte: dayEnd },
  })
    .select('slotStart')
    .lean();

  const taken = new Set(existing.map((a) => new Date(a.slotStart).toISOString()));

  const slots = [];
  for (let t = new Date(start); t < end; t = new Date(t.getTime() + minutesToMs(duration))) {
    const slotStart = new Date(t);
    const slotEnd = new Date(t.getTime() + minutesToMs(duration));
    if (slotEnd > end) break;
    slots.push({
      slotStart: slotStart.toISOString(),
      slotEnd: slotEnd.toISOString(),
      available: !taken.has(slotStart.toISOString()),
    });
  }

  return slots;
};

exports.holdSlot = async ({ patientId, doctorId, slotStart }) => {
  const start = new Date(slotStart);
  if (Number.isNaN(start.getTime())) throw new AppError(400, 'Invalid slotStart');

  const profile = await DoctorProfile.findOne({ userId: doctorId }).lean();
  if (!profile) throw new AppError(404, 'Doctor profile not found');

  const duration = profile.slotDurationMinutes || 30;
  const end = new Date(start.getTime() + minutesToMs(duration));

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  try {
    const appt = await Appointment.create({
      patientId,
      doctorId,
      slotStart: start,
      slotEnd: end,
      status: 'pending',
      expiresAt,
    });

    return appt;
  } catch (err) {
    if (err?.code === 11000) {
      throw new AppError(409, 'Slot already taken', 'SLOT_CONFLICT');
    }
    throw err;
  }
};

exports.confirmSlot = async ({ appointmentId }) => {
  const updated = await Appointment.findOneAndUpdate(
    { _id: appointmentId, status: 'pending', expiresAt: { $gt: new Date() } },
    { $set: { status: 'confirmed', expiresAt: null } },
    { new: true }
  );

  if (!updated) {
    throw new AppError(410, 'Hold expired, please rebook');
  }

  return updated;
};

