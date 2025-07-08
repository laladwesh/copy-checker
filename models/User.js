const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  googleId: { type: String },
  role: {
    type: String,
    enum: ["admin", "examiner", "student"],
    required: true,
  },
  batch: { type: String }, // only for students
  gender: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
