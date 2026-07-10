const mongoose = require('mongoose');

const preVisitSummarySchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
    },
    symptomsRaw: String,
    urgencyLevel: { type: String, enum: ['Low', 'Medium', 'High'] },
    chiefComplaint: String,
    suggestedQuestions: [String],
    llmStatus: { type: String, enum: ['success', 'failed'], default: 'success' },
    llmProvider: { type: String, enum: ['openai', 'groq'] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PreVisitSummary', preVisitSummarySchema);
