const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  googleId: { type: String },
  role: {
    type: String,
    enum: ["admin", "examiner", "student"],
    required: true,
  },
  batch: { type: String }, // only for students
  gender: { type: String },
  createdAt: { type: Date, default: Date.now },
  
  // Examiner Performance Tracking
  examinerStats: {
    totalCopiesAssigned: { type: Number, default: 0 },
    totalCopiesEvaluated: { type: Number, default: 0 },
    totalCopiesReassigned: { type: Number, default: 0 }, // Copies taken away due to inactivity
    averageCheckingTimeHours: { type: Number, default: 0 }, // Average time to complete a copy
    currentWorkload: { type: Number, default: 0 }, // Currently assigned pending/examining copies
    performanceScore: { type: Number, default: 100 }, // 0-100 score based on speed and reliability
    lastActiveAt: { type: Date }, // Last time they checked/updated a copy
    isActive: { type: Boolean, default: true }, // Can be set to false for inactive examiners
    warningCount: { type: Number, default: 0 }, // Number of warnings for slow checking
  },
});

module.exports = mongoose.model("User", UserSchema);
