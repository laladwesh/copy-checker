// models/Copy.js
const mongoose = require("mongoose");

// Define a sub-schema for a single page's data
const PageSchema = new mongoose.Schema(
  {
    pageNumber: { type: Number, required: true },
    marksAwarded: { type: Number, default: 0 },
    comments: [{ type: String }], // Array of strings for multiple comments
    annotations: { type: String, default: "{}" }, // Store JSON string of annotations (e.g., SVG paths, coordinates)
    marks: {
      type: [
        {
          type: { type: String, enum: ["correct", "wrong"], required: true },
          x: { type: Number, required: true },
          y: { type: Number, required: true },
          timestamp: { type: Date, default: Date.now }
        }
      ],
      default: []
    }, // Array of draggable marks (right/wrong) with positions - LEGACY
    pageMarks: {
      type: [
        {
          value: { type: Number, required: true }, // Numeric mark value (e.g., 0, 0.5, 1, 2, etc.)
          x: { type: Number, required: true },
          y: { type: Number, required: true },
          timestamp: { type: Date, default: Date.now }
        }
      ],
      default: []
    }, // Array of numeric marks placed by drag/drop with positions
    lastAnnotatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastAnnotatedAt: {
      type: Date,
    },
  },
  { _id: false }
);

const CopySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  questionPaper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Paper",
    required: true,
  },
  driveFile: {
    id: { type: String, required: true },
    link: { type: String, required: true }, // Main link to the full PDF on Drive
    viewLink: { type: String },
  },
  totalPages: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "examining", "evaluated", "re-evaluating"],
    default: "pending",
  },
  pages: [PageSchema], // Array of subdocuments for page-specific data (annotations, marks)
  examiners: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  assignedAt: { type: Date }, // When the copy was assigned to current examiner
  lastUpdatedByExaminer: { type: Date }, // Last time examiner made any change
  reassignmentCount: { type: Number, default: 0 }, // How many times this copy was reassigned
  evaluationStartedAt: { type: Date }, // When examiner started checking (status changed to examining)
  evaluationCompletedAt: { type: Date }, // When evaluation was completed
  isReleasedToStudent: { type: Boolean, default: false }, // NEW: Track if copy is released to student
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Copy", CopySchema);
