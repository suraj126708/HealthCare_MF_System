const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['booking_confirmation', 'reminder', 'cancellation', 'leave_notice'],
    },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    channel: { type: String, default: 'email' },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    attempts: { type: Number, default: 0 },
    nextRetryAt: Date,
    lastError: String,
  },
  { timestamps: true }
);

notificationSchema.index({ status: 1, nextRetryAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
