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

exports.getExaminerCopyDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const copy = await Copy.findById(id)
            .populate("student", "name email")
            .populate({
                path: "questionPaper",
                select: "title totalPages driveFile.id totalMarks",
            })
            .populate("examiners", "name email");

        if (!copy) {
            return res.status(404).json({ message: "Copy not found." });
        }

        // --- MODIFIED LOGIC ---

        // 1. Construct internal API endpoints for serving PDFs using the file IDs
        // These URLs will point to your backend's new `serveDrivePdf` endpoint
        const answerCopyDirectLink = copy.driveFile && copy.driveFile.id
            ? `/api/drive/pdf/${copy.driveFile.id}` // Frontend will request this URL
            : null;

        const questionPaperDirectLink = copy.questionPaper && copy.questionPaper.driveFile && copy.questionPaper.driveFile.id
            ? `/api/drive/pdf/${copy.questionPaper.driveFile.id}` // Frontend will request this URL
            : null;

        // 2. Create a modified response object to include the new direct links
        const responseCopy = {
            ...copy.toObject(), // Convert Mongoose document to a plain JavaScript object
            driveFile: {
                ...(copy.driveFile ? copy.driveFile.toObject() : {}), // Ensure driveFile exists before toObject
                directDownloadLink: answerCopyDirectLink // Replace external link with internal proxy link
            },
            questionPaper: {
                ...(copy.questionPaper ? copy.questionPaper.toObject() : {}), // Ensure questionPaper exists
                driveFile: {
                    ...(copy.questionPaper && copy.questionPaper.driveFile ? copy.questionPaper.driveFile.toObject() : {}),
                    directDownloadLink: questionPaperDirectLink // Replace external link with internal proxy link
                }
            }
        };

        // --- END MODIFIED LOGIC ---

        res.json(responseCopy); // Send the modified response
    } catch (err) {
        next(err);
    }
};


exports.getCopy = async (req, res, next) => {
  try {
    const copy = await Copy.findById(req.params.id)
      .populate("student") // Populate student details
      .populate("questionPaper"); // Populate questionPaper details

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

    if (
      copy.pages.length === copy.totalPages &&
      copy.pages.every((p) => typeof p.marksAwarded === "number")
    ) {
      copy.status = "pending";
    } else if (copy.status === "pending" || copy.status === "assigned") {
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

    if (!q.copy || !q.copy.examiners.includes(req.user._id.toString())) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to reply to this query.",
      });
    }

    q.response = response;
    q.status = "resolved_by_examiner"; // Use a distinct status for examiner resolution
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
    // Find all queries that are either 'approved_by_admin' or 'resolved_by_examiner'
    // and then filter them by the examiner's ID after populating the copy.
    const queries = await Query.find({
      $or: [
        { status: "approved_by_admin" },
        { status: "resolved_by_examiner" },
      ],
    })
      .populate("raisedBy", "email")
      .populate({
        path: "copy",
        select: "examiners questionPaper", // Select examiners and questionPaper for filtering and display
        populate: {
          path: "questionPaper",
          select: "title",
        },
      });

    // Manually filter queries where the associated copy is assigned to the current examiner
    const examinerQueries = queries.filter(
      (q) => q.copy && q.copy.examiners.includes(req.user._id.toString())
    );

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

    if (
      copy.pages.length !== copy.totalPages ||
      !copy.pages.every((p) => typeof p.marksAwarded === "number")
    ) {
      return res
        .status(400)
        .json({
          message: "All pages must be marked before completing the copy.",
        });
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
};

exports.getSingleQuery = async (req, res, next) => {
  try {
    const query = await Query.findById(req.params.id)
      .populate("raisedBy", "email name")
      .populate({
        path: "copy",
        populate: {
          path: "questionPaper",
          select: "title totalPages driveFile.id", // Select necessary fields for frontend
        },
      });

    if (!query) {
      return res.status(404).json({ message: "Query not found." });
    }

    const isAuthorized = query.copy?.examiners?.includes(
      req.user._id.toString()
    );

    if (!isAuthorized) {
      return res
        .status(403)
        .json({ message: "Unauthorized to view this query." });
    }

    res.json(query);
  } catch (err) {
    next(err);
  }
};
