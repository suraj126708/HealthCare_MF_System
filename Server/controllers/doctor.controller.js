const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const PreVisitSummary = require('../models/PreVisitSummary');
const PostVisitSummary = require('../models/PostVisitSummary');
const MedicationReminder = require('../models/MedicationReminder');
const Notification = require('../models/Notification');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const llmService = require('../services/llmService');
const notificationService = require('../services/notificationService');
const calendarService = require('../services/calendarService');

function dayRange(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function timesOfDayFromFrequency(freq) {
  const f = Number(freq);
  if (!Number.isFinite(f) || f <= 0) return [];
  if (f === 1) return ['09:00'];
  if (f === 2) return ['09:00', '21:00'];
  if (f === 3) return ['09:00', '15:00', '21:00'];
  if (f >= 4) return ['09:00', '13:00', '17:00', '21:00'];
  return [];
}

exports.listAppointments = asyncHandler(async (req, res) => {
  const { date, status } = req.query || {};
  const q = { doctorId: req.user.id };
  if (status) q.status = status;

  if (date) {
    const range = dayRange(date);
    if (range) q.slotStart = { $gte: range.start, $lte: range.end };
  }

  const appts = await Appointment.find(q).sort({ slotStart: 1 }).lean();

  const patientIds = [...new Set(appts.map((a) => a.patientId?.toString()).filter(Boolean))];
  const appointmentIds = appts.map((a) => a._id);

  const [patients, preVisits] = await Promise.all([
    User.find({ _id: { $in: patientIds } }).select('_id name').lean(),
    PreVisitSummary.find({ appointmentId: { $in: appointmentIds } })
      .select('appointmentId chiefComplaint urgencyLevel suggestedQuestions')
      .lean(),
  ]);

  const patientNames = new Map(patients.map((p) => [p._id.toString(), p.name]));
  const preVisitByAppt = new Map(preVisits.map((p) => [p.appointmentId.toString(), p]));

  const data = appts.map((a) => {
    const patientKey = a.patientId?.toString();
    const apptKey = a._id.toString();
    const preVisit = preVisitByAppt.get(apptKey) || null;

    return {
      ...a,
      id: apptKey,
      patientName: patientNames.get(patientKey) || null,
      chiefComplaint: preVisit?.chiefComplaint || null,
      urgencyLevel: preVisit?.urgencyLevel || null,
      preVisitSummary: preVisit,
    };
  });

  res.json({ success: true, data });
});

exports.getAppointment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const appt = await Appointment.findOne({ _id: id, doctorId: req.user.id }).lean();
  if (!appt) return next(new AppError(404, 'Appointment not found'));

  const [preVisit, patient] = await Promise.all([
    PreVisitSummary.findOne({ appointmentId: id }).lean(),
    User.findById(appt.patientId).select('name').lean(),
  ]);

  res.json({
    success: true,
    data: {
      ...appt,
      id: appt._id.toString(),
      patientName: patient?.name || null,
      preVisitSummary: preVisit || null,
    },
  });
});

exports.completeAppointment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { clinicalNotes, prescription } = req.body || {};

  if (!clinicalNotes) return next(new AppError(400, 'clinicalNotes are required'));
  if (!Array.isArray(prescription) || prescription.length < 1) {
    return next(new AppError(400, 'prescription must be a non-empty array'));
  }

  const appt = await Appointment.findOne({ _id: id, doctorId: req.user.id });
  if (!appt) return next(new AppError(404, 'Appointment not found'));
  if (appt.status !== 'confirmed') {
    return next(new AppError(400, "Appointment must be 'confirmed' to complete"));
  }

  const llm = await llmService.generatePostVisitSummary(clinicalNotes);
  const postVisitPayload =
    llm.llmStatus === 'failed'
      ? { llmStatus: 'failed' }
      : {
          llmStatus: llm.llmStatus || 'success',
          llmProvider: llm.llmProvider,
          patientFriendlySummary: llm.patientFriendlySummary,
          followUpSteps: llm.followUpSteps,
        };

  await PostVisitSummary.findOneAndUpdate(
    { appointmentId: appt._id },
    {
      $set: {
        appointmentId: appt._id,
        clinicalNotes,
        prescription,
        ...postVisitPayload,
      },
    },
    { upsert: true, new: true }
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let remindersCreated = 0;
  for (const p of prescription) {
    const durationDays = Number(p.durationDays) || 0;
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + durationDays);

    await MedicationReminder.create({
      appointmentId: appt._id,
      patientId: appt.patientId,
      drug: p.drug,
      dosage: p.dosage,
      timesOfDay: timesOfDayFromFrequency(p.frequencyPerDay),
      startDate: today,
      endDate,
      active: true,
    });
    remindersCreated += 1;
  }

  appt.status = 'completed';
  await appt.save();

  res.json({
    success: true,
    data: {
      appointmentId: appt._id.toString(),
      llmStatus: llm.llmStatus || 'failed',
      medicationRemindersCreated: remindersCreated,
    },
  });
});

exports.addLeaveDay = asyncHandler(async (req, res, next) => {
  const { date, reason } = req.body || {};
  const range = dayRange(date);
  if (!range) return next(new AppError(400, 'Invalid date'));

  const profile = await DoctorProfile.findOne({ userId: req.user.id });
  if (!profile) return next(new AppError(404, 'Doctor profile not found'));

  profile.leaveDays.push({ date: new Date(date), reason });
  await profile.save();

  const appts = await Appointment.find({
    doctorId: req.user.id,
    status: { $in: ['pending', 'confirmed'] },
    slotStart: { $gte: range.start, $lte: range.end },
  });

  let affected = 0;
  for (const appt of appts) {
    appt.status = 'cancelled_leave';
    appt.cancelReason = reason || 'Doctor on leave';
    await appt.save();
    affected += 1;

    if (appt.calendarEventId) await calendarService.deleteEvent(appt.calendarEventId);

    await notificationService.create({
      type: 'leave_notice',
      recipientId: appt.patientId,
      appointmentId: appt._id,
    });
  }

  res.json({ success: true, data: { leaveDay: date, affectedAppointments: affected } });
});

exports.getProfile = asyncHandler(async (req, res, next) => {
  const profile = await DoctorProfile.findOne({ userId: req.user.id }).lean();
  if (!profile) return next(new AppError(404, 'Doctor profile not found'));
  res.json({ success: true, data: profile });
});

