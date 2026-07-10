const mongoose = require('mongoose');

const medicationReminderSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    drug: String,
    dosage: String,
    timesOfDay: [String],
    startDate: Date,
    endDate: Date,
    lastSentDate: Date,
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

medicationReminderSchema.index({ active: 1, endDate: 1 });

module.exports = mongoose.model('MedicationReminder', medicationReminderSchema);
