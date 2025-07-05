const Copy = require("../models/Copy");
const Query = require("../models/Query");

exports.listPending = async (req, res, next) => {
  try {
    const copies = await Copy.find({
      examiners: req.user._id,
      status: "pending",
    }).populate("student questionPaper");
    res.json(copies);
  } catch (err) {
    next(err);
  }
};

exports.listHistory = async (req, res, next) => {
  try {
    const copies = await Copy.find({
      examiners: req.user._id,
      status: "completed",
    }).populate("student questionPaper");
    res.json(copies);
  } catch (err) {
    next(err);
  }
};

exports.getCopy = async (req, res, next) => {
  try {
    const copy = await Copy.findById(req.params.id)
      .populate("student") // Populate student email
      .populate("questionPaper"); // This ensures questionPaper is populated
    // The totalPages and pageImageFiles will be directly on the copy and copy.questionPaper objects
    res.json(copy);
  } catch (err) {
    next(err);
  }
};

exports.markPage = async (req, res, next) => {
  try {
    const { pageNumber, marks, comments, annotations } = req.body;
    const copy = await Copy.findById(req.params.id);

    if (!copy) {
      return res.status(404).json({ message: "Copy not found" });
    }

    // Ensure the examiner is assigned to this copy
    if (!copy.examiners.includes(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You are not assigned to this copy." });
    }

    // Find if the page already has an entry
    const pageIndex = copy.pages.findIndex((p) => p.pageNumber === pageNumber);

    if (pageIndex > -1) {
      // Update existing page entry
      copy.pages[pageIndex].marks = marks;
      copy.pages[pageIndex].comments = comments;
      copy.pages[pageIndex].annotations = annotations;
    } else {
      // Add new page entry
      copy.pages.push({ pageNumber, marks, comments, annotations });
    }

    // Sort pages to maintain order (optional, but good practice)
    copy.pages.sort((a, b) => a.pageNumber - b.pageNumber);

    // If all pages are marked, set status to completed
    // This assumes copy.totalPages is accurate
    // It's crucial to ensure `copy.totalPages` is correctly set when the copy is created.
    if (
      copy.pages.length === copy.totalPages &&
      copy.pages.every((p) => typeof p.marks === "number")
    ) {
      copy.status = "completed";
    }

    await copy.save();
    // Re-populate for response to ensure frontend has latest data including totalPages
    const updatedCopy = await Copy.findById(req.params.id)
      .populate("student")
      .populate("questionPaper");
    res.json(updatedCopy);
  } catch (err) {
    next(err);
  }
};

exports.replyQuery = async (req, res, next) => {
  try {
    const { response } = req.body;
    const queryId = req.params.id;

    const q = await Query.findById(queryId);

    if (!q) {
      return res.status(404).json({ message: "Query not found" });
    }

    // Ensure the examiner responding is assigned to the copy related to this query
    // You'll need to populate the 'copy' field of the query to access its examiners
    await q.populate({
      path: "copy",
      select: "examiners", // Only fetch the examiners field from the copy
    });

    if (!q.copy || !q.copy.examiners.includes(req.user._id)) {
      return res
        .status(403)
        .json({
          message: "Forbidden: You are not authorized to reply to this query.",
        });
    }

    q.response = response;
    q.status = "resolved"; // Mark query as resolved upon reply
    await q.save();

    // Re-populate the query to send comprehensive data back
    const updatedQuery = await Query.findById(queryId)
      .populate("raisedBy", "email") // Populate student email
      .populate({
        path: "copy",
        populate: {
          path: "questionPaper",
          select: "title", // Populate question paper title
        },
      });

    res.json(updatedQuery);
  } catch (err) {
    next(err);
  }
};

// NEW: Endpoint to list queries assigned to the current examiner
exports.listQueries = async (req, res, next) => {
  try {
    // Find queries where the associated copy's examiners array contains the current user's ID
    const queries = await Query.find({
      status: "pending", // Only show pending queries by default for the examiner
    })
      .populate("raisedBy", "email") // Populate student email
      .populate({
        path: "copy",
        match: { examiners: req.user._id }, // Filter copies that the current examiner is assigned to
        populate: {
          path: "questionPaper",
          select: "title", // Populate question paper title
        },
      });

    // Filter out queries where the copy was not found (due to the match condition)
    const examinerQueries = queries.filter((q) => q.copy !== null);

    res.json(examinerQueries);
  } catch (err) {
    next(err);
  }
};
