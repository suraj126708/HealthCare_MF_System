const bcrypt = require('bcrypt');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const PreVisitSummary = require('../models/PreVisitSummary');
const PostVisitSummary = require('../models/PostVisitSummary');
const MedicationReminder = require('../models/MedicationReminder');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const calendarService = require('../services/calendarService');
const notificationService = require('../services/notificationService');

function dayRange(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

exports.createDoctor = asyncHandler(async (req, res, next) => {
  const { name, email, password, specialization, workingHours, slotDurationMinutes } =
    req.body || {};

  if (!name || !email || !password || !specialization) {
    return next(
      new AppError(
        400,
        'name, email, password, specialization are required'
      )
    );
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) return next(new AppError(409, 'Email already in use'));

  const passwordHash = await bcrypt.hash(String(password), 10);

  const user = await User.create({
    name,
    email: String(email).toLowerCase(),
    passwordHash,
    role: 'doctor',
  });

  const profile = await DoctorProfile.create({
    userId: user._id,
    specialization,
    workingHours: Array.isArray(workingHours) ? workingHours : [],
    slotDurationMinutes: slotDurationMinutes ?? 30,
  });

  res.status(201).json({
    success: true,
    data: {
      doctor: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        profile,
      },
    },
  });
});

exports.listDoctors = asyncHandler(async (req, res) => {
  const { specialization } = req.query || {};
  const match = { role: 'doctor' };

  const doctors = await User.find(match)
    .select('_id name email isActive')
    .lean();

  const doctorIds = doctors.map((d) => d._id);

  const profileQuery = { userId: { $in: doctorIds } };
  if (specialization) profileQuery.specialization = specialization;

  const profiles = await DoctorProfile.find(profileQuery).lean();
  const byUserId = new Map(profiles.map((p) => [p.userId.toString(), p]));

  const data = doctors
    .map((d) => ({
      id: d._id.toString(),
      name: d.name,
      email: d.email,
      isActive: d.isActive,
      profile: byUserId.get(d._id.toString()) || null,
    }))
    .filter((d) => (specialization ? d.profile !== null : true));

  res.json({ success: true, data });
});

exports.getDoctor = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const user = await User.findById(doctorId).select('_id name email isActive role');
  if (!user || user.role !== 'doctor') return next(new AppError(404, 'Doctor not found'));

  const profile = await DoctorProfile.findOne({ userId: user._id });

  res.json({
    success: true,
    data: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      profile,
    },
  });
});

exports.updateDoctor = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const body = req.body || {};

  const user = await User.findById(doctorId);
  if (!user || user.role !== 'doctor') return next(new AppError(404, 'Doctor not found'));

  const userFields = ['name', 'email', 'phone', 'isActive'];
  for (const f of userFields) {
    if (body[f] !== undefined) user[f] = body[f];
  }
  if (body.email) user.email = String(body.email).toLowerCase();
  await user.save();

  const profileUpdate = {};
  const profileFields = ['specialization', 'workingHours', 'slotDurationMinutes'];
  for (const f of profileFields) {
    if (body[f] !== undefined) profileUpdate[f] = body[f];
  }

  const profile = await DoctorProfile.findOneAndUpdate(
    { userId: user._id },
    { $set: profileUpdate },
    { new: true }
  );

  res.json({
    success: true,
    data: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      profile,
    },
  });
});

exports.addLeaveDay = asyncHandler(async (req, res, next) => {
  const { doctorId } = req.params;
  const { date, reason } = req.body || {};

  const range = dayRange(date);
  if (!range) return next(new AppError(400, 'Invalid date'));

  const doctor = await User.findById(doctorId).select('_id role');
  if (!doctor || doctor.role !== 'doctor') return next(new AppError(404, 'Doctor not found'));

  const profile = await DoctorProfile.findOne({ userId: doctor._id });
  if (!profile) return next(new AppError(404, 'Doctor profile not found'));

  profile.leaveDays.push({ date: new Date(date), reason });
  await profile.save();

  const appts = await Appointment.find({
    doctorId: doctor._id,
    status: { $in: ['pending', 'confirmed'] },
    slotStart: { $gte: range.start, $lte: range.end },
  });

  let affected = 0;
  for (const appt of appts) {
    appt.status = 'cancelled_leave';
    appt.cancelReason = reason || 'Doctor on leave';
    await appt.save();
    affected += 1;

    if (appt.calendarEventId) {
      await calendarService.deleteEvent(appt.calendarEventId);
    }

    await notificationService.create({
      type: 'leave_notice',
      recipientId: appt.patientId,
      appointmentId: appt._id,
    });
  }

  res.json({
    success: true,
    data: { leaveDay: date, affectedAppointments: affected },
  });
});

function toCountMap(rows, keyField = '_id') {
  const map = {};
  for (const row of rows) {
    const key = row[keyField] ?? 'unknown';
    map[key] = row.count;
  }
  return map;
}

function lastNDays(n) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const trendDays = 14;
  const trendStart = new Date();
  trendStart.setDate(trendStart.getDate() - (trendDays - 1));
  trendStart.setHours(0, 0, 0, 0);

  const [
    usersByRole,
    appointmentsByStatus,
    appointmentsTrend,
    specializations,
    notificationsByStatus,
    notificationsByType,
    urgencyLevels,
    topDoctors,
    recentAppointments,
    activeMedicationReminders,
    completedVisits,
    totalAppointments,
    totalLeaveDays,
    activeDoctors,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Appointment.aggregate([
      { $match: { createdAt: { $gte: trendStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    DoctorProfile.aggregate([
      { $group: { _id: '$specialization', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Notification.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Notification.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    PreVisitSummary.aggregate([{ $group: { _id: '$urgencyLevel', count: { $sum: 1 } } }]),
    Appointment.aggregate([
      { $group: { _id: '$doctorId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'doctor',
        },
      },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          doctorId: '$_id',
          name: '$doctor.name',
          count: 1,
        },
      },
    ]),
    Appointment.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate('patientId', 'name')
      .populate('doctorId', 'name')
      .select('status slotStart createdAt patientId doctorId')
      .lean(),
    MedicationReminder.countDocuments({ active: true }),
    PostVisitSummary.countDocuments(),
    Appointment.countDocuments(),
    DoctorProfile.aggregate([
      { $unwind: '$leaveDays' },
      { $count: 'count' },
    ]).then((r) => r[0]?.count ?? 0),
    User.countDocuments({ role: 'doctor', isActive: true }),
  ]);

  const roleCounts = toCountMap(usersByRole);
  const statusCounts = toCountMap(appointmentsByStatus);
  const trendMap = toCountMap(appointmentsTrend);

  res.json({
    success: true,
    data: {
      overview: {
        patients: roleCounts.patient ?? 0,
        doctors: roleCounts.doctor ?? 0,
        admins: roleCounts.admin ?? 0,
        activeDoctors,
        totalAppointments,
        completedVisits,
        activeMedicationReminders,
        totalLeaveDays,
      },
      appointmentsByStatus: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })),
      appointmentsTrend: lastNDays(trendDays).map((date) => ({
        date,
        count: trendMap[date] ?? 0,
      })),
      specializations: specializations.map((s) => ({
        name: s._id,
        count: s.count,
      })),
      notificationsByStatus: notificationsByStatus.map((n) => ({
        status: n._id,
        count: n.count,
      })),
      notificationsByType: notificationsByType.map((n) => ({
        type: n._id,
        count: n.count,
      })),
      urgencyLevels: urgencyLevels.map((u) => ({
        level: u._id,
        count: u.count,
      })),
      topDoctors: topDoctors.map((d) => ({
        doctorId: d.doctorId?.toString(),
        name: d.name || 'Unknown',
        appointments: d.count,
      })),
      recentAppointments: recentAppointments.map((a) => ({
        id: a._id.toString(),
        status: a.status,
        slotStart: a.slotStart,
        createdAt: a.createdAt,
        patientName: a.patientId?.name || 'Patient',
        doctorName: a.doctorId?.name || 'Doctor',
      })),
    },
  });
});

exports.removeLeaveDay = asyncHandler(async (req, res, next) => {
  const { doctorId, leaveId } = req.params;

  const profile = await DoctorProfile.findOne({ userId: doctorId });
  if (!profile) return next(new AppError(404, 'Doctor profile not found'));

  const before = profile.leaveDays.length;
  profile.leaveDays = profile.leaveDays.filter((l) => l._id.toString() !== leaveId);
  if (profile.leaveDays.length === before) {
    return next(new AppError(404, 'Leave not found'));
  }
  await profile.save();

  res.json({ success: true, data: { removed: leaveId } });
});

