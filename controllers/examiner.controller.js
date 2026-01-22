const Copy = require("../models/Copy");
const Query = require("../models/Query"); // Assuming you have a Query model

exports.listPending = async (req, res, next) => {
  try {
    // Show copies that are pending OR examining (not yet evaluated)
    // Only remove from list when examiner clicks "Confirm & Finish" (status becomes "evaluated")
    // Do NOT populate student information - keep copies anonymous for examiners
    const copies = await Copy.find({
      examiners: req.user._id,
      status: { $in: ["pending", "examining"] },
    }).populate("questionPaper");
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
    }).populate("questionPaper");
    res.json(copies);
  } catch (err) {
    next(err);
  }
};

exports.getExaminerCopyDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const copy = await Copy.findById(id)
          // Do NOT populate student details for examiner - keep anonymous
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
          // Remove or anonymize student info for examiner
          student: undefined,
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

    //check that is that the same examiner assigned to this copy if not return 403 unauthorized
    // Do not populate student details for examiner (anonymous)
    const copy = await Copy.findById(req.params.id).populate("questionPaper"); // Populate questionPaper details
    const examiner = req.user._id;
    if (!copy) {
      return res.status(404).json({ message: "Copy not found" });
    }
    if (!copy.examiners.includes(examiner)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You are not assigned to this copy." });
    }
    // Remove student before sending to examiner
    const response = copy.toObject();
    delete response.student;
    res.json(response);
  } catch (err) {
    next(err);
  }
};

exports.markPage = async (req, res, next) => {
  try {
    const { pageNumber, marks, comments, annotations, queryId } = req.body; // Capture queryId from request body
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

    let oldMarks = null;
    let oldComments = "";
    let copyActionMessages = []; // For copy.action (if you still want it)
    let queryActionMessages = []; // For query.action

    if (pageIndex > -1) {
      // Page exists, capture old values for comparison
      oldMarks = copy.pages[pageIndex].marksAwarded;
      oldComments = copy.pages[pageIndex].comments; // Keep as is, will handle null/undefined below

      // Update existing page details
      copy.pages[pageIndex].marksAwarded = marks;
      copy.pages[pageIndex].comments = comments;
      copy.pages[pageIndex].annotations = annotations;
      copy.pages[pageIndex].lastAnnotatedBy = req.user._id;
      copy.pages[pageIndex].lastAnnotatedAt = new Date();
    } else {
      // New page entry (this scenario is less common for query updates)
      copy.pages.push({
        pageNumber,
        marksAwarded: marks,
        comments,
        annotations,
        lastAnnotatedBy: req.user._id,
        lastAnnotatedAt: new Date(),
      });
      copyActionMessages.push(`Added details for page ${pageNumber}.`);
      queryActionMessages.push(`Added details for page ${pageNumber}.`);
    }

    copy.pages.sort((a, b) => a.pageNumber - b.pageNumber);

    // --- Determine Action Messages for Copy and Query ---
    // Compare new values with old values (if page existed)
    if (pageIndex > -1) { // Only if updating an existing page
        if (oldMarks !== marks) {
            const oldM = oldMarks !== null ? oldMarks : 'N/A';
            const newM = marks !== null ? marks : 'N/A';
            copyActionMessages.push(`Marks changed from ${oldM} to ${newM} on page ${pageNumber}.`);
            queryActionMessages.push(`Marks changed from ${oldM} to ${newM}.`); // Shorter for query context
        }

        // FIX: Ensure oldComments and comments are strings before trimming
        const oldCommentsString = oldComments === null || oldComments === undefined ? '' : String(oldComments);
        const newCommentsString = comments === null || comments === undefined ? '' : String(comments);

        if (oldCommentsString.trim() !== newCommentsString.trim()) {
            const oldC = oldCommentsString.trim() === '' ? '[empty]' : `"${oldCommentsString}"`;
            const newC = newCommentsString.trim() === '' ? '[empty]' : `"${newCommentsString}"`;
            copyActionMessages.push(`Comments changed from ${oldC} to ${newC} on page ${pageNumber}.`);
            queryActionMessages.push(`Comments changed from ${oldC} to ${newC}.`); // Shorter for query context
        }
        // Add logic for annotations if needed
    }

    // Set copy.action (if you still want this on the copy itself)
    if (copyActionMessages.length > 0) {
        copy.action = copyActionMessages.join(" | ");
    } else {
        copy.action = ""; // Clear if no specific changes were made in this call
    }

    // --- Update Query.action if queryId is provided ---
    if (queryId && queryActionMessages.length > 0) {
        const query = await Query.findById(queryId);
        if (query) {
            // Append new action to existing query.action or set it
            // Consider if you want to overwrite or append. Appending is safer for history.
            query.action = (query.action ? query.action + " | " : "") + queryActionMessages.join(" | ");
            await query.save();
        } else {
            console.warn(`Query with ID ${queryId} not found for action update.`);
        }
    }
    // --- End Query.action update ---


    // --- Status Update Logic ---
    // DO NOT auto-mark as "evaluated" when all pages are marked
    // Only change to "evaluated" when examiner explicitly calls completeCopy endpoint
    // Just update status to "examining" if currently pending/assigned
    if (copy.status === "pending" || copy.status === "assigned") {
        copy.status = "examining";
    }
    // --- End Status Update Logic ---

    await copy.save();
    const updatedCopy = await Copy.findById(req.params.id)
      .populate("questionPaper")
      .populate("examiners");
    const resp = updatedCopy.toObject();
    delete resp.student;
    res.json(resp);
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
    const examinerQueries = queries
      .filter((q) => q.copy && q.copy.examiners.includes(req.user._id.toString()))
      .map((q) => {
        const obj = q.toObject();
        // anonymize who raised the query
        if (obj.raisedBy) obj.raisedBy = { email: 'Anonymous' };
        // ensure student info on copy is not leaked
        if (obj.copy && obj.copy.student) delete obj.copy.student;
        return obj;
      });

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
      .populate("questionPaper")
      .populate("examiners");

    const resp = updatedCopy.toObject();
    delete resp.student;
    res.json(resp);
  } catch (err) {
    next(err);
  }
};

exports.getSingleQuery = async (req, res, next) => {
  try {
    const query = await Query.findById(req.params.id)
      // Do not reveal student identity to examiner; keep raisedBy anonymous
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

    // Anonymize raisedBy before returning to examiner
    const qObj = query.toObject();
    if (qObj.raisedBy) {
      qObj.raisedBy = { email: "Anonymous" };
    }
    if (qObj.copy && qObj.copy.examiners) {
      // ensure student info on copy not leaked
      if (qObj.copy.student) delete qObj.copy.student;
    }

    res.json(qObj);
  } catch (err) {
    next(err);
  }
};
