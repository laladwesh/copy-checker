const Copy = require("../models/Copy");
const Query = require("../models/Query");
const User = require("../models/User"); // Assuming you have a User model

exports.listCopies = async (req, res, next) => {
  try {
    // Students can only see copies that are completed AND released by admin
    const copies = await Copy.find({
      student: req.user._id,
      status: "evaluated",
      isReleasedToStudent: true, // NEW: Filter by release status
    })
    .select("-examiners -assignedAt -lastUpdatedByExaminer -reassignmentCount -evaluationStartedAt -evaluationCompletedAt") // Exclude examiner-related fields
    .populate("questionPaper"); // Do NOT populate examiners here for student anonymity
    res.json(copies);
  } catch (err) {
    next(err);
  }
};

exports.getCopy = async (req, res, next) => {
  try {
    const copy = await Copy.findById(req.params.id)
      .select("-examiners -assignedAt -lastUpdatedByExaminer -reassignmentCount -evaluationStartedAt -evaluationCompletedAt") // Exclude examiner-related fields
      .populate("questionPaper"); // Do NOT populate examiners here for student anonymity
    // Ensure the copy belongs to the student requesting it
    if (!copy || copy.student.toString() !== req.user._id.toString()) {
      return res
        .status(404)
        .json({ message: "Copy not found or unauthorized." });
    }
    console.log("Copy retrieved:", copy.isReleasedToStudent);
    // Ensure the copy is released to the student
    if (!copy.isReleasedToStudent) {
      return res
        .status(403)
        .json({ message: "This copy has not been released yet." });
    }
    res.json(copy);
  } catch (err) {
    next(err);
  }
};

exports.raiseQuery = async (req, res, next) => {
  try {
    const { pageNumber, text } = req.body;
    const copy = await Copy.findById(req.params.id);

    if (!copy || copy.student.toString() !== req.user._id.toString()) {
      return res
        .status(404)
        .json({ message: "Copy not found or unauthorized." });
    }

    // NEW: Check if the copy is evaluated and released before allowing a query
    if (copy.status !== "evaluated" || !copy.isReleasedToStudent) {
      return res
        .status(403)
        .json({
          message: "Cannot raise a query on an unevaluated or unreleased copy.",
        });
    }

    // NEW LOGIC: Check for existing pending or approved queries for this page on this copy
    const existingQuery = await Query.findOne({
      copy: req.params.id,
      pageNumber: pageNumber,
      raisedBy: req.user._id, // Ensure it's the same student raising it
      status: { $in: ["pending", "approved_by_admin", "resolved_by_examiner"] }, // Consider what statuses should block new queries
    });

    if (existingQuery) {
      return res.status(409).json({
        message: `A query for page ${pageNumber} of this copy is already pending or being reviewed.`,
      });
    }
    // END NEW LOGIC

    const q = new Query({
      copy: req.params.id,
      pageNumber,
      text,
      raisedBy: req.user._id,
      status: "pending", // Default status for new queries, goes to admin first
    });
    await q.save();

    // Optionally, populate the query for a richer response
    const newQuery = await Query.findById(q._id)
      .populate("raisedBy", "email name")
      .populate({
        path: "copy",
        select: "-examiners -assignedAt -lastUpdatedByExaminer -reassignmentCount -evaluationStartedAt -evaluationCompletedAt", // Exclude examiner info
        populate: {
          path: "questionPaper",
          select: "title",
        },
      });

    res.status(201).json(newQuery);
  } catch (err) {
    next(err);
  }
};

// NEW: List queries for the logged-in student
exports.listQueries = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    // Optionally, allow filtering by copyId if needed for StudentCopyViewer
    const filter = { raisedBy: studentId };
    if (req.query.copyId) {
      filter.copy = req.query.copyId;
    }

    const queries = await Query.find(filter)
      .populate("raisedBy", "name email")
      .populate({
        path: "copy",
        select: "-examiners -assignedAt -lastUpdatedByExaminer -reassignmentCount -evaluationStartedAt -evaluationCompletedAt", // Exclude examiner info
        populate: {
          path: "questionPaper",
          select: "title", // Only need title for display
        },
      });
    res.json(queries);
  } catch (err) {
    next(err);
  }
};
