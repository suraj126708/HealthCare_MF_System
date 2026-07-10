const Notification = require('../models/Notification');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const emailService = require('./emailService');
const { formatAppointmentReference } = require('../utils/appointmentId');

const BACKOFF_MS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000,
  6 * 60 * 60 * 1000,
];

async function buildEmailContext(notification) {
  const user = await User.findById(notification.recipientId)
    .select('name email role')
    .lean();
  if (!user?.email) throw new Error('Recipient email not found');

  const context = {
    recipientName: user.name,
    recipientRole: user.role,
  };

  if (notification.appointmentId) {
    const appt = await Appointment.findById(notification.appointmentId).lean();
    if (appt) {
      const [patient, doctor, profile] = await Promise.all([
        User.findById(appt.patientId).select('name').lean(),
        User.findById(appt.doctorId).select('name').lean(),
        DoctorProfile.findOne({ userId: appt.doctorId }).select('specialization').lean(),
      ]);

      Object.assign(context, {
        appointmentId: appt._id.toString(),
        appointmentReference: formatAppointmentReference(appt._id),
        slotStart: appt.slotStart,
        slotEnd: appt.slotEnd,
        symptoms: appt.symptoms,
        cancelReason: appt.cancelReason,
        patientName: patient?.name,
        doctorName: doctor?.name,
        specialization: profile?.specialization,
        status: appt.status,
      });
    } else {
      context.appointmentId = notification.appointmentId.toString();
    }
  }

  return { to: user.email, context };
}

async function attemptSend(notification) {
  const { to, context } = await buildEmailContext(notification);

  await emailService.sendNotificationEmail({
    to,
    type: notification.type,
    context,
  });
}

async function markFailed(notification, err) {
  const nextAttempts = (notification.attempts || 0) + 1;
  notification.attempts = nextAttempts;
  notification.lastError = err?.message || 'send failed';

  if (nextAttempts >= 5) {
    notification.status = 'failed';
    notification.nextRetryAt = null;
  } else {
    notification.status = 'failed';
    notification.nextRetryAt = new Date(Date.now() + BACKOFF_MS[nextAttempts - 1]);
  }

  await notification.save();
}

async function markSent(notification) {
  notification.status = 'sent';
  notification.nextRetryAt = null;
  await notification.save();
}

exports.create = async ({ type, recipientId, appointmentId }) => {
  const doc = await Notification.create({
    type,
    recipientId,
    appointmentId,
    status: 'pending',
    attempts: 0,
  });

  try {
    await attemptSend(doc);
    await markSent(doc);
  } catch (err) {
    await markFailed(doc, err);
  }

  return doc;
};

exports.retryOne = async (notification) => {
  try {
    await attemptSend(notification);
    await markSent(notification);
    return { ok: true };
  } catch (err) {
    await markFailed(notification, err);
    return { ok: false };
  }
};

