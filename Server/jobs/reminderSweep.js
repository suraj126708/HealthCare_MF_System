const cron = require('node-cron');
const MedicationReminder = require('../models/MedicationReminder');
const User = require('../models/User');
const emailService = require('../services/emailService');

function isDueNow(timesOfDay, now) {
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const current = `${hh}:${mm}`;
  return Array.isArray(timesOfDay) && timesOfDay.includes(current);
}

function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function startReminderSweepJob() {
  // every 15 min
  cron.schedule('*/15 * * * *', async () => {
    const now = new Date();
    const due = await MedicationReminder.find({
      active: true,
      endDate: { $gte: now },
    }).limit(200);

    for (const r of due) {
      if (!isDueNow(r.timesOfDay, now)) continue;
      if (sameDay(r.lastSentDate, now)) continue;

      const user = await User.findById(r.patientId).select('name email').lean();
      if (!user?.email) continue;

      try {
        await emailService.sendNotificationEmail({
          to: user.email,
          type: 'reminder',
          context: {
            recipientName: user.name,
            recipientRole: 'patient',
            drug: r.drug,
            dosage: r.dosage,
          },
        });
        r.lastSentDate = now;
        await r.save();
      } catch {
        // reminders are best-effort; retry handled by notification system for Notification docs,
        // but MedicationReminder send failures are just skipped here for simplicity
      }
    }
  });
}

module.exports = { startReminderSweepJob };

