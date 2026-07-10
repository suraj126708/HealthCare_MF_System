const mongoose = require('mongoose');

const postVisitSummarySchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
    },
    clinicalNotes: { type: String, required: true },
    prescription: [
      {
        drug: String,
        dosage: String,
        frequencyPerDay: Number,
        durationDays: Number,
      },
    ],
    patientFriendlySummary: String,
    followUpSteps: [String],
    llmStatus: { type: String, enum: ['success', 'failed'], default: 'success' },
    llmProvider: { type: String, enum: ['openai', 'groq'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PostVisitSummary', postVisitSummarySchema);
