const Copy = require("../models/Copy");
const Query = require("../models/Query"); // Assuming you have a Query model

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
      status: "evaluated", // Corrected: Use 'evaluated' status for history
    }).populate("student questionPaper");
    res.json(copies);
  } catch (err) {
    next(err);
  }
};

exports.getCopy = async (req, res, next) => {
  try {
    const copy = await Copy.findById(req.params.id)
      .populate("student") // Populate student details
      .populate("questionPaper"); // Populate questionPaper details

    // Note: If 'driveFile' and 'totalPages' are nested deeply within questionPaper
    // or are not default populated, you might need to adjust the questionPaper schema
    // or use deeper populate options here.
    // However, for typical schemas, `.populate("questionPaper")` should fetch
    // all its direct fields, including driveFile and totalPages if they are direct.

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

    if (!copy.examiners.includes(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You are not assigned to this copy." });
    }

    const pageIndex = copy.pages.findIndex((p) => p.pageNumber === pageNumber);

    if (pageIndex > -1) {
      copy.pages[pageIndex].marksAwarded = marks;
      copy.pages[pageIndex].comments = comments;
      copy.pages[pageIndex].annotations = annotations;
      copy.pages[pageIndex].lastAnnotatedBy = req.user._id;
      copy.pages[pageIndex].lastAnnotatedAt = new Date();
    } else {
      copy.pages.push({
        pageNumber,
        marksAwarded: marks,
        comments,
        annotations,
        lastAnnotatedBy: req.user._id,
        lastAnnotatedAt: new Date(),
      });
    }

    copy.pages.sort((a, b) => a.pageNumber - b.pageNumber);

    // Update copy status based on evaluation progress
    if (
      copy.pages.length === copy.totalPages &&
      copy.pages.every((p) => typeof p.marksAwarded === "number")
    ) {
      // If all pages are marked and have marks, change status to 'pending' (ready for final review/completion)
      // This logic depends on your workflow. If marking a page means it's ready for completion,
      // and 'evaluated' is the final state, 'pending' here might be 'examining' or simply keep current.
      // Given your `markCompleteCopy` sets to 'evaluated', this should likely be 'examining' or no change if it's not the final step.
      // I'll keep it as 'pending' based on your original intention, but be mindful of your workflow.
      copy.status = "pending";
    } else if (copy.status === "pending" || copy.status === "assigned") {
      // If it's the first page being marked, change status to 'examining'
      copy.status = "examining";
    }

    await copy.save();
    const updatedCopy = await Copy.findById(req.params.id)
      .populate("student")
      .populate("questionPaper")
      .populate("examiners");
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

    await q.populate({
      path: "copy",
      select: "examiners",
    });

    // Ensure the examiner responding is assigned to the copy related to this query
    if (!q.copy || !q.copy.examiners.includes(req.user._id.toString())) { // Convert to string for comparison
      return res.status(403).json({
        message: "Forbidden: You are not authorized to reply to this query.",
      });
    }

    q.response = response;
    q.status = "resolved"; // Mark query as resolved upon reply
    await q.save();

    const updatedQuery = await Query.findById(queryId)
      .populate("raisedBy", "email")
      .populate({
        path: "copy",
        populate: {
          path: "questionPaper",
          select: "title",
        },
      });

    res.json(updatedQuery);
  } catch (err) {
    next(err);
  }
};

exports.listQueries = async (req, res, next) => {
  try {
    const queries = await Query.find({
      status: "pending", // Only show pending queries by default for the examiner
    })
      .populate("raisedBy", "email")
      .populate({
        path: "copy",
        // Using `match` here effectively filters the *parent* Query document
        // if the populated `copy` field doesn't match the condition.
        // This is efficient.
        match: { examiners: req.user._id },
        populate: {
          path: "questionPaper",
          select: "title",
        },
      });

    // Filter out queries where the copy was not found (due to the match condition)
    // `queries.filter((q) => q.copy !== null)` is correct because `match`
    // on a populated field causes documents not matching the `match` criteria
    // to have that populated field as `null`.
    const examinerQueries = queries.filter((q) => q.copy !== null);

    res.json(examinerQueries);
  } catch (err) {
    next(err);
  }
};

exports.markCompleteCopy = async (req, res, next) => {
  try {
    const copy = await Copy.findById(req.params.id);

    if (!copy) {
      return res.status(404).json({ message: "Copy not found" });
    }

    if (!copy.examiners.includes(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You are not assigned to this copy." });
    }

    // Ensure all pages are marked before marking the copy complete
    if (copy.pages.length !== copy.totalPages || !copy.pages.every((p) => typeof p.marksAwarded === "number")) {
        return res.status(400).json({ message: "All pages must be marked before completing the copy." });
    }

    copy.status = "evaluated"; // Set status to 'evaluated' when marking complete
    await copy.save();

    const updatedCopy = await Copy.findById(req.params.id)
      .populate("student")
      .populate("questionPaper")
      .populate("examiners");

    res.json(updatedCopy);
  } catch (err) {
    next(err);
  }
}

// NEW: Controller function to get a single query by ID
exports.getSingleQuery = async (req, res, next) => {
  try {
    const query = await Query.findById(req.params.id)
      .populate('raisedBy', 'email name')
      .populate({
        path: 'copy',
        populate: {
          path: 'questionPaper',
          select: 'title totalPages driveFile.id' // Select necessary fields for frontend
        }
      });

    if (!query) {
      return res.status(404).json({ message: 'Query not found.' });
    }

    // IMPORTANT: Ensure the examiner is authorized to view this query
    // The query.copy.examiners array must contain req.user._id
    const isAuthorized = query.copy?.examiners?.includes(req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized to view this query.' });
    }

    res.json(query);
  } catch (err) {
    next(err);
  }
};

// Removed `exports.replyToQuery` as `exports.replyQuery` is already defined and used.