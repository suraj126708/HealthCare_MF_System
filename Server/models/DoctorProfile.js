const mongoose = require('mongoose');

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: { type: String, required: true },
    workingHours: [
      {
        day: { type: Number, min: 0, max: 6 },
        startTime: String,
        endTime: String,
      },
    ],
    slotDurationMinutes: { type: Number, default: 30 },
    leaveDays: [{ date: Date, reason: String }],
  },
  { timestamps: true }
);

doctorProfileSchema.index({ specialization: 1 });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
