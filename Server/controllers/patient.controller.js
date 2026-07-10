const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const PreVisitSummary = require('../models/PreVisitSummary');
const PostVisitSummary = require('../models/PostVisitSummary');
const MedicationReminder = require('../models/MedicationReminder');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const slotService = require('../services/slotService');
const llmService = require('../services/llmService');
const calendarService = require('../services/calendarService');
const notificationService = require('../services/notificationService');
const { formatAppointmentReference } = require('../utils/appointmentId');

function dayRange(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

exports.listDoctors = asyncHandler(async (req, res) => {
  const { specialization, q } = req.query || {};

  const matchUsers = { role: 'doctor', isActive: true };
  if (q) matchUsers.name = { $regex: String(q), $options: 'i' };

  const doctors = await User.find(matchUsers).select('_id name email').lean();
  const doctorIds = doctors.map((d) => d._id);

  const matchProfiles = { userId: { $in: doctorIds } };
  if (specialization) matchProfiles.specialization = specialization;

  const profiles = await DoctorProfile.find(matchProfiles).lean();
  const byUserId = new Map(profiles.map((p) => [p.userId.toString(), p]));

  const data = doctors
    .map((d) => ({
      id: d._id.toString(),
      name: d.name,
      email: d.email,
      profile: byUserId.get(d._id.toString()) || null,
    }))
    .filter((d) => (specialization ? d.profile !== null : true));

  res.json({ success: true, data });
});

exports.getAvailability = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;
  const { date } = req.query || {};
  const slots = await slotService.getAvailability(doctorId, date);
  res.json({ success: true, data: slots });
});

exports.hold = asyncHandler(async (req, res, next) => {
  const { doctorId, slotStart } = req.body || {};
  if (!doctorId || !slotStart) return next(new AppError(400, 'doctorId and slotStart are required'));

  const appt = await slotService.holdSlot({
    patientId: req.user.id,
    doctorId,
    slotStart,
  });

  res.status(201).json({
    success: true,
    data: {
      appointmentId: appt._id.toString(),
      status: appt.status,
      expiresAt: appt.expiresAt,
    },
  });
});

exports.symptoms = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { symptoms } = req.body || {};
  if (!symptoms) return next(new AppError(400, 'symptoms are required'));

  const appt = await Appointment.findOne({ _id: id, patientId: req.user.id });
  if (!appt) return next(new AppError(404, 'Appointment not found'));

  appt.symptoms = symptoms;
  await appt.save();

  const llm = await llmService.generatePreVisitSummary(symptoms);

  const payload =
    llm && llm.llmStatus === 'failed'
      ? { llmStatus: 'failed' }
      : {
          urgencyLevel: llm.urgencyLevel,
          chiefComplaint: llm.chiefComplaint,
          suggestedQuestions: llm.suggestedQuestions,
          llmStatus: llm.llmStatus || 'success',
          llmProvider: llm.llmProvider,
        };

  await PreVisitSummary.findOneAndUpdate(
    { appointmentId: appt._id },
    {
      $set: {
        appointmentId: appt._id,
        symptomsRaw: symptoms,
        ...payload,
      },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, data: payload });
});

exports.confirm = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const appt = await Appointment.findOne({ _id: id, patientId: req.user.id });
  if (!appt) return next(new AppError(404, 'Appointment not found'));

  const confirmed = await slotService.confirmSlot({ appointmentId: id });

  const doctor = await User.findById(confirmed.doctorId).select('email').lean();
  const patient = await User.findById(confirmed.patientId).select('email').lean();
  const eventId = await calendarService.createEvent(confirmed, doctor?.email, patient?.email);
  if (eventId) {
    confirmed.calendarEventId = eventId;
    await confirmed.save();
  }

  await notificationService.create({
    type: 'booking_confirmation',
    recipientId: confirmed.patientId,
    appointmentId: confirmed._id,
  });
  await notificationService.create({
    type: 'booking_confirmation',
    recipientId: confirmed.doctorId,
    appointmentId: confirmed._id,
  });

  res.json({
    success: true,
    data: { appointmentId: confirmed._id.toString(), status: confirmed.status },
  });
});

exports.cancel = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  const appt = await Appointment.findOne({ _id: id, patientId: req.user.id });
  if (!appt) return next(new AppError(404, 'Appointment not found'));

  appt.status = 'cancelled';
  appt.cancelReason = reason || 'Cancelled by patient';
  await appt.save();

  if (appt.calendarEventId) {
    await calendarService.deleteEvent(appt.calendarEventId);
  }

  await notificationService.create({
    type: 'cancellation',
    recipientId: appt.doctorId,
    appointmentId: appt._id,
  });

  res.json({ success: true, data: { appointmentId: appt._id.toString(), status: appt.status } });
});

exports.listAppointments = asyncHandler(async (req, res) => {
  const { status, date } = req.query || {};
  const q = { patientId: req.user.id };
  if (status) q.status = status;

  if (date) {
    const range = dayRange(date);
    if (range) q.slotStart = { $gte: range.start, $lte: range.end };
  }

  const appts = await Appointment.find(q).sort({ slotStart: -1 }).lean();

  const doctorIds = [...new Set(appts.map((a) => a.doctorId?.toString()).filter(Boolean))];
  const appointmentIds = appts.map((a) => a._id);

  const [doctors, profiles, preVisits] = await Promise.all([
    User.find({ _id: { $in: doctorIds } }).select('_id name').lean(),
    DoctorProfile.find({ userId: { $in: doctorIds } }).select('userId specialization').lean(),
    PreVisitSummary.find({ appointmentId: { $in: appointmentIds } })
      .select('appointmentId chiefComplaint')
      .lean(),
  ]);

  const doctorNames = new Map(doctors.map((d) => [d._id.toString(), d.name]));
  const specializations = new Map(profiles.map((p) => [p.userId.toString(), p.specialization]));
  const chiefComplaints = new Map(
    preVisits.map((p) => [p.appointmentId.toString(), p.chiefComplaint])
  );

  const data = appts.map((a) => {
    const doctorKey = a.doctorId?.toString();
    const apptKey = a._id.toString();
    return {
      ...a,
      id: apptKey,
      referenceId: formatAppointmentReference(a._id),
      doctorName: doctorNames.get(doctorKey) || null,
      specialization: specializations.get(doctorKey) || null,
      chiefComplaint: chiefComplaints.get(apptKey) || null,
    };
  });

  res.json({ success: true, data });
});

exports.getAppointment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const appt = await Appointment.findOne({ _id: id, patientId: req.user.id }).lean();
  if (!appt) return next(new AppError(404, 'Appointment not found'));

  const [post, doctor, profile] = await Promise.all([
    PostVisitSummary.findOne({ appointmentId: id }).lean(),
    User.findById(appt.doctorId).select('name').lean(),
    DoctorProfile.findOne({ userId: appt.doctorId }).select('specialization').lean(),
  ]);

  res.json({
    success: true,
    data: {
      ...appt,
      id: appt._id.toString(),
      referenceId: formatAppointmentReference(appt._id),
      doctorName: doctor?.name || null,
      specialization: profile?.specialization || null,
      postVisitSummary: post || null,
    },
  });
});

exports.listMedications = asyncHandler(async (req, res) => {
  const patientId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const FREQUENCY_LABELS = {
    OD: 'Once daily',
    BD: 'Twice daily',
    TDS: 'Three times daily',
    QID: 'Four times daily',
  };
  const INSTRUCTION_LABELS = {
    before_food: 'Before food',
    after_food: 'After food',
  };

  const completedAppts = await Appointment.find({
    patientId,
    status: 'completed',
  })
    .select('_id slotStart doctorId')
    .sort({ slotStart: -1 })
    .lean();

  const apptIds = completedAppts.map((a) => a._id);
  const doctorIds = [...new Set(completedAppts.map((a) => a.doctorId?.toString()).filter(Boolean))];

  const [summaries, reminders, doctors, profiles] = await Promise.all([
    PostVisitSummary.find({ appointmentId: { $in: apptIds } }).lean(),
    MedicationReminder.find({ patientId }).sort({ startDate: -1 }).lean(),
    User.find({ _id: { $in: doctorIds } }).select('_id name').lean(),
    DoctorProfile.find({ userId: { $in: doctorIds } }).select('userId specialization').lean(),
  ]);

  const apptById = new Map(completedAppts.map((a) => [a._id.toString(), a]));
  const summaryByAppt = new Map(summaries.map((s) => [s.appointmentId.toString(), s]));
  const doctorNames = new Map(doctors.map((d) => [d._id.toString(), d.name]));
  const specializations = new Map(profiles.map((p) => [p.userId.toString(), p.specialization]));

  const reminderByKey = new Map(
    reminders.map((r) => [`${r.appointmentId?.toString()}:${r.drug?.toLowerCase()}`, r])
  );

  const all = [];

  for (const appt of completedAppts) {
    const apptKey = appt._id.toString();
    const summary = summaryByAppt.get(apptKey);
    if (!summary?.prescription?.length) continue;

    const doctorKey = appt.doctorId?.toString();

    for (const rx of summary.prescription) {
      const reminder =
        reminderByKey.get(`${apptKey}:${rx.drug?.toLowerCase()}`) ||
        reminders.find(
          (r) =>
            r.appointmentId?.toString() === apptKey &&
            r.drug?.toLowerCase() === rx.drug?.toLowerCase()
        );

      const endDate = reminder?.endDate
        ? new Date(reminder.endDate)
        : (() => {
            const d = new Date(appt.slotStart);
            d.setDate(d.getDate() + (Number(rx.durationDays) || 0));
            return d;
          })();

      const isActive = Boolean(reminder?.active) && endDate >= today;

      all.push({
        id: reminder?._id?.toString() || `${apptKey}-${rx.drug}`,
        appointmentId: apptKey,
        referenceId: formatAppointmentReference(appt._id),
        drug: rx.drug,
        dosage: rx.dosage,
        frequency: rx.frequency || null,
        frequencyLabel:
          FREQUENCY_LABELS[rx.frequency] ||
          (rx.frequencyPerDay ? `${rx.frequencyPerDay} time(s) daily` : null),
        frequencyPerDay: rx.frequencyPerDay || reminder?.frequencyPerDay || null,
        durationDays: rx.durationDays || reminder?.durationDays || null,
        instruction: rx.instruction || reminder?.instruction || null,
        instructionLabel: INSTRUCTION_LABELS[rx.instruction || reminder?.instruction] || null,
        timesOfDay: reminder?.timesOfDay || [],
        startDate: reminder?.startDate || appt.slotStart,
        endDate,
        status: isActive ? 'active' : 'expired',
        doctorName: doctorNames.get(doctorKey) || null,
        specialization: specializations.get(doctorKey) || null,
        visitDate: appt.slotStart,
      });
    }
  }

  const active = all.filter((m) => m.status === 'active');

  res.json({
    success: true,
    data: {
      active,
      all,
      counts: { active: active.length, total: all.length },
    },
  });
});

