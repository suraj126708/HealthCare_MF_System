const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    slotStart: { type: Date, required: true },
    slotEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'cancelled_leave', 'completed'],
      default: 'pending',
    },
    expiresAt: Date,
    symptoms: String,
    calendarEventId: String,
    cancelReason: String,
  },
  { timestamps: true }
);

appointmentSchema.index(
  { doctorId: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
  }
);

appointmentSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: 'pending' },
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
