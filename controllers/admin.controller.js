const User = require("../models/User");
const Copy = require("../models/Copy");
const Paper = require("../models/Paper"); // Your Question Paper model
const Query = require("../models/Query");
const pdfGen = require("../utils/pdfGenerator");
const {
  getOrCreateFolder,
  uploadFileToFolder,
  drive
} = require("../config/googleDrive");
const { PDFDocument } = require("pdf-lib");
const { google } = require('googleapis');
const { default: mongoose } = require("mongoose");
const getDirectDriveDownloadLink = (fileId) => {
    if (!fileId) return null;
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
};
// Utility function to sanitize folder names (replace invalid characters)
const sanitizeFolderName = (name) => {
  return String(name)
    .replace(/[^a-zA-Z0-9-_. ]/g, "_")
    .substring(0, 100); // Limit length
};

// --- NEW FUNCTION: Serve PDF directly from Google Drive via backend ---
exports.serveDrivePdf = async (req, res, next) => {
    try {
        const { fileId } = req.params;

        if (!fileId) {
            return res.status(400).json({ message: "File ID is required." });
        }

        // Use the imported 'drive' instance for making the Google Drive API call
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' }, // 'alt=media' is crucial for getting the file content
            { responseType: 'stream' }       // Get the response as a stream
        );

        // Set the appropriate headers for PDF content
        res.setHeader('Content-Type', 'application/pdf');
        // 'inline' means the browser should try to display it; 'attachment' means download
        res.setHeader('Content-Disposition', `inline; filename="${fileId}.pdf"`);

        // Set CORS headers. IMPORTANT: Adjust this for production.
        // For development, '*' is generally fine.
        // For production, change '*' to your actual frontend's domain (e.g., 'https://yourfrontend.com').
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');


        // Pipe the Google Drive file stream directly to the response for efficient serving
        response.data
            .on('end', () => {
                console.log(`[Backend] Served PDF file successfully: ${fileId}`);
            })
            .on('error', err => {
                console.error(`[Backend] Error streaming PDF file ${fileId} from Drive:`, err);
                // Handle errors that occur during the streaming process (e.g., connection drops)
                if (!res.headersSent) { // Only send error if headers haven't been sent yet
                    if (err.code === 403) {
                        res.status(403).json({ message: "Access to Google Drive file forbidden. Check file permissions or authentication." });
                    } else if (err.code === 404) {
                        res.status(404).json({ message: "Google Drive file not found or deleted." });
                    } else {
                        res.status(500).json({ message: "Failed to stream file from Google Drive due to an unexpected error." });
                    }
                }
            })
            .pipe(res); // Connect the Google Drive stream to the HTTP response stream

    } catch (err) {
        // This catch block handles errors that occur before the stream even starts,
        // such as issues with `drive.files.get` call itself (e.g., invalid fileId, initial auth error)
        console.error("[Backend] Error fetching PDF metadata or initiating stream from Drive:", err);
        if (err.response) {
            // Google APIs often return errors with a `response` object
            if (err.response.status === 403) {
                return res.status(403).json({ message: "Access denied to Google Drive file. Verify file sharing settings or OAuth2 token permissions." });
            } else if (err.response.status === 404) {
                return res.status(404).json({ message: "Google Drive file not found." });
            }
        }
        next(err); // Pass any other unhandled errors to your Express error handling middleware
    }
};

// 1. User Management (No changes needed here for this request)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, role, gender, batch } = req.body;
    if (!name || !email || !role) {
      return res
        .status(400)
        .json({ message: "Name, email, and role are required." });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists." });
    }

    const user = new User({ name, email, role, gender, batch });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    next(err);
  }
};

exports.getStudentsByBatch = async (req, res, next) => {
  try {
    const students = await User.find({
      role: "student",
      batch: req.query.batch,
    });
    res.json(students);
  } catch (err) {
    next(err);
  }
};

exports.getExaminers = async (req, res, next) => {
  try {
    const exs = await User.find({ role: "examiner" });
    res.json(exs);
  } catch (err) {
    next(err);
  }
};

// 2. Exam (Question Paper) Management
exports.createExam = async (req, res, next) => {
  try {
    const { title, course, examType, date, totalMarks } = req.body;

    console.log("--- Inside createExam controller ---");
    console.log("Request Body:", req.body);
    console.log("req.files:", req.files);
    console.log("req.files.paper:", req.files.paper);

    // 1. Basic validation for form fields
    if (!title || !course || !examType || !date || !totalMarks) {
      console.error(
        "[Admin Error] Missing exam details (title, course, examType, date, totalMarks)."
      );
      return res.status(400).json({
        message:
          "All exam details (title, course, exam type, date, total marks) are required.",
      });
    }

    // 2. Validate file upload: Expecting exactly one PDF under 'paper' field
    const uploadedPaperFiles = req.files.paper;

    if (!uploadedPaperFiles || uploadedPaperFiles.length === 0) {
      console.error("[Admin Error] No question paper PDF file found.");
      return res
        .status(400)
        .json({ message: "Question paper PDF file is required." });
    }

    if (uploadedPaperFiles.length > 1) {
      console.error(
        "[Admin Error] Multiple files uploaded for question paper, but only one PDF is expected."
      );
      return res
        .status(400)
        .json({ message: "Only one question paper PDF file can be uploaded." });
    }

    const pdfFile = uploadedPaperFiles[0];

    if (pdfFile.mimetype !== "application/pdf") {
      console.error(
        `[Admin Error] Unsupported file type: ${pdfFile.mimetype}. Only PDF is allowed.`
      );
      return res
        .status(400)
        .json({ message: "Only PDF files are allowed for question papers." });
    }

    // Validate date format
    const examDate = new Date(date);
    if (isNaN(examDate.getTime())) {
      console.error("[Admin Error] Invalid date format provided.");
      return res.status(400).json({ message: "Invalid date format for exam." });
    }

    let finalPdfBuffer = pdfFile.buffer;
    let finalFilename = pdfFile.originalname;
    let numPagesInPdf = 0;

    console.log(`[Admin] Processing question paper PDF: ${finalFilename}`);

    // Extract page count from the uploaded PDF
    try {
      const loadedPdf = await PDFDocument.load(finalPdfBuffer);
      numPagesInPdf = loadedPdf.getPageCount();
    } catch (pdfErr) {
      console.error(
        "[Admin Error] Could not load PDF to get page count:",
        pdfErr
      );
      return res
        .status(500)
        .json({ message: "Failed to process uploaded PDF for page count." });
    }
    console.log(`[Admin] PDF has ${numPagesInPdf} pages.`);

    // --- NEW LOGIC FOR FOLDER STRUCTURE ---
    // 1. Get or create the root folder for all exams
    const examsRootId = await getOrCreateFolder("Exams"); // Central folder for all exams

    // 2. Create a unique folder for THIS specific exam
    // Sanitize title for folder name
    const sanitizedTitle = sanitizeFolderName(title);
    // Combine title and a timestamp/random string for uniqueness if titles can repeat
    const examFolderName = `${sanitizedTitle}_${Date.now()}`;
    const examFolderId = await getOrCreateFolder(examFolderName, examsRootId);
    console.log(
      `[Admin] Exam folder created/found: '${examFolderName}' with ID: ${examFolderId}`
    );

    // 3. Upload the question paper PDF directly into this exam's folder
    console.log(
      `[Admin] Uploading Question Paper PDF (${finalFilename}) into exam folder...`
    );
    const driveFile = await uploadFileToFolder(
      finalPdfBuffer,
      finalFilename,
      pdfFile.mimetype,
      examFolderId // Upload to the newly created exam-specific folder
    );
    console.log(
      `[Admin] Question paper uploaded to Drive: ${driveFile.viewLink}`
    );

    // Create the new Paper (Exam) document in the database
    const paper = new Paper({
      title,
      course,
      examType,
      date: examDate,
      totalMarks: parseInt(totalMarks),
      driveFile: {
        id: driveFile.id,
        url: driveFile.viewLink,
        viewLink: driveFile.viewLink,
      },
      driveFolderId: examFolderId, // NEW: Save the ID of the exam's dedicated folder
      totalPages: numPagesInPdf,
      assignedExaminers: [],
    });
    await paper.save();
    console.log(
      `[Admin] Exam '${paper.title}' created successfully with ID: ${paper._id}`
    );

    res.status(201).json({
      message: "Exam created successfully!",
      exam: paper,
    });
  } catch (err) {
    console.error("Error creating exam:", err);
    res.status(500).json({
      message: "Failed to create exam due to an internal server error.",
      error: err.message,
    });
  }
};

// Provides the "pool where all exams should be there" for the admin panel
exports.listPapers = async (req, res, next) => {
  try {
    const papers = await Paper.find().populate(
      "assignedExaminers",
      "name email"
    ).sort({ date: -1 }); // Sort by date, newest first
    res.json(papers);
  } catch (err) {
    next(err);
  }
};

// NEW: Assign Examiners to an Exam (Paper) and Distribute Copies
exports.assignExaminersToExam = async (req, res, next) => {
  try {
    const { examinerIds } = req.body;
    const paperId = req.params.id;

    if (!paperId) {
      return res.status(400).json({ message: "Exam (Paper) ID is required." });
    }

    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res
        .status(404)
        .json({ message: "Exam (Question Paper) not found." });
    }

    const validExaminers = await User.find({
      _id: { $in: examinerIds },
      role: "examiner",
    });
    if (validExaminers.length !== examinerIds.length) {
      const foundExaminerIds = validExaminers.map((e) => e._id.toString());
      const invalidIds = examinerIds.filter(
        (id) => !foundExaminerIds.includes(id)
      );
      return res.status(400).json({
        message: `One or more provided examiner IDs are invalid or not examiners: ${invalidIds.join(
          ", "
        )}`,
      });
    }
    const validExaminerObjectIds = validExaminers.map((e) => e._id);

    paper.assignedExaminers = validExaminerObjectIds;
    await paper.save();

    const pendingUnassignedCopies = await Copy.find({
      questionPaper: paperId,
      status: "pending",
      examiners: { $size: 0 },
    });

    if (pendingUnassignedCopies.length === 0) {
      return res.status(200).json({
        message:
          "Examiners assigned to exam. No new pending unassigned copies to distribute.",
        paper: paper,
      });
    }

    if (!validExaminerObjectIds || validExaminerObjectIds.length === 0) {
      return res.status(200).json({
        message:
          "No examiners provided. Existing pending copies remain unassigned.",
        paper: paper,
      });
    }

    let examinerIndex = 0;
    for (const copy of pendingUnassignedCopies) {
      const currentExaminerId = validExaminerObjectIds[examinerIndex];
      copy.examiners = [currentExaminerId];
      await copy.save();
      examinerIndex = (examinerIndex + 1) % validExaminerObjectIds.length;
    }

    res.status(200).json({
      message: `Examiners assigned to exam and ${pendingUnassignedCopies.length} pending copies distributed.`,
      paper: paper,
    });
  } catch (err) {
    console.error("Error assigning examiners to exam:", err);
    next(err);
  }
};


// NEW: Function to redistribute copies based on examiner performance
exports.redistributeCopies = async (req, res, next) => {
  try {
    const { examId } = req.params; // Expect examId from route parameters

    const paper = await Paper.findById(examId).populate('assignedExaminers', '_id name email');
    if (!paper) {
      return res.status(404).json({ message: "Exam (Question Paper) not found." });
    }

    const assignedExaminers = paper.assignedExaminers;
    if (!assignedExaminers || assignedExaminers.length === 0) {
      return res.status(400).json({ message: "No examiners assigned to this exam." });
    }

    // Find all copies for this exam that are still 'pending' and are currently assigned
    // or unassigned (if we want to re-distribute everything not yet evaluated)
    // For this logic, we'll focus on unassigned pending copies for redistribution
    const pendingUnassignedCopies = await Copy.find({
      questionPaper: examId,
      status: "pending",
      examiners: { $size: 0 } // Only copies that are pending AND currently unassigned
    });

    if (pendingUnassignedCopies.length === 0) {
      return res.status(200).json({ message: "No unassigned pending copies to redistribute." });
    }

    // Calculate performance for each examiner for this specific exam
    const examinerPerformance = {}; // { examinerId: count_evaluated_copies }
    for (const examiner of assignedExaminers) {
      const evaluatedCount = await Copy.countDocuments({
        questionPaper: examId,
        status: "evaluated",
        examiners: examiner._id // Copies successfully evaluated by this examiner
      });
      examinerPerformance[examiner._id.toString()] = evaluatedCount;
    }

    // Sort examiners by their performance (number of evaluated copies) in descending order.
    // This means examiners who have checked more copies will appear earlier in the list.
    const sortedExaminers = [...assignedExaminers].sort((a, b) => {
      const perfA = examinerPerformance[a._id.toString()] || 0;
      const perfB = examinerPerformance[b._id.toString()] || 0;
      return perfB - perfA; // Sort descending (higher performance first)
    });

    let assignedCount = 0;
    let examinerIndex = 0; // Start distributing from the highest performing examiner

    // Distribute the remaining pending copies in a round-robin fashion,
    // but using the performance-sorted list of examiners.
    for (const copy of pendingUnassignedCopies) {
      const currentExaminer = sortedExaminers[examinerIndex];
      copy.examiners = [currentExaminer._id]; // Assign the copy to the current examiner
      await copy.save();
      assignedCount++;

      // Move to the next examiner in the sorted list. This ensures that
      // higher-performing examiners get more copies first until the pool is exhausted.
      examinerIndex = (examinerIndex + 1) % sortedExaminers.length;
    }

    res.status(200).json({
      message: `${assignedCount} copies redistributed based on examiner performance.`,
      redistributedCopiesCount: assignedCount,
    });

  } catch (err) {
    console.error("Error redistributing copies:", err);
    next(err);
  }
};

// 3. Answer Copy Management (Manual Upload by Admin/Examiner)
exports.uploadCopy = async (req, res, next) => {
  try {
    const { studentId, paperId } = req.body;
    const files = req.files || {};
    let finalPdfBuffer;
    let finalFilename;
    let numPagesInPdf = 0;

    if (
      !studentId ||
      !paperId ||
      (!files.copyPdf?.length && !files.images?.length)
    ) {
      return res.status(400).json({
        message:
          "Student ID, Question Paper ID, and at least one file (PDF or images) are required.",
      });
    }

    if (files.copyPdf && files.copyPdf.length > 0) {
      const file = files.copyPdf[0];
      finalPdfBuffer = file.buffer;
      finalFilename = file.originalname;

      try {
        const loadedPdf = await PDFDocument.load(finalPdfBuffer);
        numPagesInPdf = loadedPdf.getPageCount();
      } catch (pdfErr) {
        console.error(
          "[Copy Upload Error] Could not load existing PDF to get page count:",
          pdfErr
        );
        throw new Error("Failed to process uploaded PDF for page count.");
      }
    } else if (files.images && files.images.length > 0) {
      const buffers = files.images.map((f) => f.buffer);
      const pdfGenResult = await pdfGen(buffers);
      finalPdfBuffer = pdfGenResult.buffer;
      numPagesInPdf = pdfGenResult.pageCount;

      finalFilename = `copy-${Date.now()}.pdf`;
    } else {
      throw new Error("No copyPdf or images provided");
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res
        .status(404)
        .json({ message: "Student not found or invalid user role." });
    }

    // --- NEW LOGIC FOR FOLDER STRUCTURE FOR COPIES ---
    const questionPaper = await Paper.findById(paperId);
    if (!questionPaper) {
      return res.status(404).json({ message: "Question Paper not found." });
    }
    // Check if the question paper has a driveFolderId stored
    if (!questionPaper.driveFolderId) {
      console.error(
        `[Copy Upload Error] Question Paper (ID: ${paperId}) does not have a driveFolderId. Cannot organize copy.`
      );
      return res.status(500).json({
        message:
          "Associated exam folder not found on Google Drive. Please re-upload the question paper or check its settings.",
      });
    }

    const examFolderId = questionPaper.driveFolderId;
    console.log(
      `[Copy] Found exam folder ID: ${examFolderId} for QPID: ${paperId}`
    );

    // Create/get "answer_copies" subfolder within the specific exam's folder
    const answerCopiesFolderId = await getOrCreateFolder(
      "answer_copies",
      examFolderId
    );
    console.log(
      `[Copy] Answer Copies folder ID: ${answerCopiesFolderId} within exam folder.`
    );

    // Continue with batch and student folders inside "answer_copies"
    const batchFolderName = student.batch
      ? sanitizeFolderName(student.batch)
      : "unassigned_batch";
    const batchFolderId = await getOrCreateFolder(
      batchFolderName,
      answerCopiesFolderId
    );
    console.log(`[Copy] Batch folder ID: ${batchFolderId}`);

    const stuFolderId = await getOrCreateFolder(
      student._id.toString(), // Use student._id as folder name for uniqueness
      batchFolderId
    );
    console.log(`[Copy] Student folder ID: ${stuFolderId}`);

    const driveFile = await uploadFileToFolder(
      finalPdfBuffer,
      finalFilename,
      "application/pdf", // Always PDF now
      stuFolderId // Upload to the student's folder inside answer_copies/batch
    );
    // --- END NEW LOGIC ---

    // Initialize 'pages' array in DB for examiner annotations/marks
    const initialPagesData = [];
    for (let i = 1; i <= numPagesInPdf; i++) {
      initialPagesData.push({
        pageNumber: i,
        marksAwarded: 0,
        comments: [],
        annotations: "{}",
      });
    }

    const copy = new Copy({
      student: studentId,
      questionPaper: paperId,
      driveFile,
      totalPages: numPagesInPdf,
      status: "pending",
      pages: initialPagesData,
      examiners: [],
    });
    await copy.save();

    res.status(201).json(copy);
  } catch (err) {
    console.error("Error uploading copy:", err);
    next(err);
  }
};

exports.listCopies = async (req, res, next) => {
  try {
    const copies = await Copy.find()
      .populate("student", "name email batch")
      .populate("questionPaper", "title totalPages")
      .populate("examiners", "name email");
    res.json(copies);
  } catch (err) {
    next(err);
  }
};

// 4. Query Management
exports.listQueries = async (req, res, next) => {
  try {
    // Admin should see all queries regardless of status
    const qs = await Query.find({})
      .populate({
        path: "copy",
        populate: [
          { path: "student", select: "name email" },
          { path: "questionPaper", select: "title" },
        ],
      })
      .populate("raisedBy", "name email");
    res.json(qs);
  } catch (err) {
    next(err);
  }
};

// MODIFIED: Admin approves query (forwards to examiner)
exports.approveQuery = async (req, res, next) => {
  try {
    const q = await Query.findById(req.params.id);
    if (!q) {
      return res.status(404).json({ message: "Query not found." });
    }
    // Only allow approval if status is pending
    if (q.status !== "pending") {
      return res
        .status(400)
        .json({
          message: `Query cannot be approved from status: ${q.status}.`,
        });
    }

    q.status = "approved_by_admin";
    await q.save();
    res.json(q);
  } catch (err) {
    next(err);
  }
};

// MODIFIED: Admin rejects query
exports.rejectQuery = async (req, res, next) => {
  try {
    const q = await Query.findById(req.params.id);
    if (!q) {
      return res.status(404).json({ message: "Query not found." });
    }
    // Only allow rejection if status is pending or approved_by_admin
    if (q.status !== "pending" && q.status !== "approved_by_admin") {
      return res
        .status(400)
        .json({
          message: `Query cannot be rejected from status: ${q.status}.`,
        });
    }

    q.status = "rejected_by_admin";
    await q.save();
    res.json(q);
  } catch (err) {
    next(err);
  }
};

// NEW: Admin resolves query by adding a response
exports.resolveQueryByAdmin = async (req, res, next) => {
  try {
    const { responseText } = req.body;
    if (!responseText) {
      return res.status(400).json({ message: "Response text is required." });
    }

    const q = await Query.findById(req.params.id);
    if (!q) {
      return res.status(404).json({ message: "Query not found." });
    }
    // Only allow resolution if status is pending or approved_by_admin
    if (q.status !== "pending" && q.status !== "approved_by_admin") {
      return res
        .status(400)
        .json({
          message: `Query cannot be resolved from status: ${q.status}.`,
        });
    }

    q.status = "resolved_by_admin";
    q.response = responseText;
    await q.save();
    res.json(q);
  } catch (err) {
    next(err);
  }
};

// 5. Admin Control for Student Copy Visibility (No changes needed here for this request)
exports.toggleExamCopyRelease = async (req, res, next) => {
  try {
    const { examId } = req.params;

    // Find all copies for this exam that are 'evaluated'
    const copiesToUpdate = await Copy.find({
      questionPaper: examId,
      status: "evaluated",
    });

    if (copiesToUpdate.length === 0) {
      return res.status(404).json({
        message:
          "No evaluated copies found for this exam to toggle release status.",
      });
    }

    // Determine the target release status:
    // If ANY of the evaluated copies are currently released, the action will be to UNRELEASE ALL.
    // Otherwise (if all are unreleased), the action will be to RELEASE ALL.
    const anyReleased = copiesToUpdate.some((copy) => copy.isReleasedToStudent);
    const newReleaseStatus = !anyReleased; // If any are released, new status is false; otherwise true.

    // Update all relevant copies
    await Copy.updateMany(
      { questionPaper: examId, status: "evaluated" },
      { $set: { isReleasedToStudent: newReleaseStatus } }
    );

    res.json({
      message: `All evaluated copies for exam ${examId} successfully ${
        newReleaseStatus ? "released to students" : "unreleased"
      }.`,
      // Optionally, you might refetch and send the updated copies,
      // but for a bulk update, a message is often sufficient.
      // The frontend will likely refetch the list.
    });
  } catch (err) {
    next(err);
  }
};

// 6. Handle scanned copy upload (simulated printer scanning)
exports.uploadScannedCopy = async (req, res, next) => {
  try {
    const { studentEmail, questionPaperId } = req.body;
    const uploadedFiles = req.files;

    if (!studentEmail || !questionPaperId || !uploadedFiles) {
      return res.status(400).json({
        message: "Student email, question paper ID, and files are required.",
      });
    }

    let fileToProcess = null;
    let isPdfUpload = false;

    if (uploadedFiles.scannedPdf && uploadedFiles.scannedPdf.length > 0) {
      fileToProcess = uploadedFiles.scannedPdf[0];
      isPdfUpload = true;
      console.log("[ScanCopy] Processing PDF from 'scannedPdf' field.");
    } else if (
      uploadedFiles.scannedImages &&
      uploadedFiles.scannedImages.length > 0
    ) {
      fileToProcess = uploadedFiles.scannedImages;
      isPdfUpload = false;
      console.log(
        `[ScanCopy] Processing images from 'scannedImages' field. Total: ${fileToProcess.length}`
      );
    } else {
      return res.status(400).json({
        message: "No scanned PDF or image files provided.",
      });
    }

    const student = await User.findOne({
      email: studentEmail,
      role: "student",
    });
    if (!student) {
      return res
        .status(404)
        .json({ message: "Student not found with this email." });
    }
    console.log("[ScanCopy] Found student:", student.email);

    const questionPaper = await Paper.findById(questionPaperId);
    // Check if the question paper exists
    if (!questionPaper) {
      return res.status(404).json({ message: "Question Paper not found." });
    }
    if(questionPaper.assignedExaminers.length !== 0) {
      return res.status(400).json({
        message:
          "Cannot upload scanned copy for this exam as it already has assigned examiners.",
      });
    }
    //add check to ensure student is not already associated with this question paper
    if (questionPaper.students && questionPaper.students.includes(student._id)) {
      return res.status(400).json({
        message: "This student already has a scanned copy for this exam.",
      });
    }
    
    console.log("[ScanCopy] Associating copy with exam:", questionPaper.title);

    // --- NEW LOGIC FOR FOLDER STRUCTURE FOR SCANNED COPIES ---
    // Retrieve the exam's dedicated folder ID
    if (!questionPaper.driveFolderId) {
      console.error(
        `[ScanCopy Error] Question Paper (ID: ${questionPaperId}) does not have a driveFolderId. Cannot organize scanned copy.`
      );
      return res.status(500).json({
        message:
          "Associated exam folder not found on Google Drive. Please ensure the question paper was uploaded correctly.",
      });
    }

    const examFolderId = questionPaper.driveFolderId;
    console.log(
      `[ScanCopy] Found exam folder ID: ${examFolderId} for QPID: ${questionPaperId}`
    );

    // Create/get "answer_copies" subfolder within the specific exam's folder
    const answerCopiesFolderId = await getOrCreateFolder(
      "answer_copies",
      examFolderId
    );
    console.log(
      `[ScanCopy] Answer Copies folder ID: ${answerCopiesFolderId} within exam folder.`
    );

    // Continue with batch and student folders inside "answer_copies"
    const batchFolderName = student.batch
      ? sanitizeFolderName(student.batch)
      : "unassigned_batch";
    const batchFolderId = await getOrCreateFolder(
      batchFolderName,
      answerCopiesFolderId
    );
    console.log(`[ScanCopy] Batch folder ID: ${batchFolderId}`);

    const stuFolderId = await getOrCreateFolder(
      student._id.toString(), // Use student._id as folder name for uniqueness
      batchFolderId
    );
    console.log(`[ScanCopy] Student folder ID: ${stuFolderId}`);
    // --- END NEW LOGIC ---

    let finalPdfBuffer;
    let finalFilename;
    let numPagesInPdf = 0;

    if (isPdfUpload) {
      finalPdfBuffer = fileToProcess.buffer;
      finalFilename = fileToProcess.originalname;
      console.log(`[ScanCopy] Processing existing PDF: ${finalFilename}`);

      try {
        const loadedPdf = await PDFDocument.load(finalPdfBuffer);
        numPagesInPdf = loadedPdf.getPageCount();
      } catch (pdfErr) {
        console.error(
          "[ScanCopy Error] Could not load existing PDF to get page count:",
          pdfErr
        );
        throw new Error("Failed to process uploaded PDF for page count.");
      }
      console.log(`[ScanCopy] Existing PDF has ${numPagesInPdf} pages.`);
    } else {
      const imageBuffers = fileToProcess.map((file) => file.buffer);
      console.log(
        `[ScanCopy] Converting ${imageBuffers.length} images to PDF...`
      );

      const pdfGenResult = await pdfGen(imageBuffers);
      finalPdfBuffer = pdfGenResult.buffer;
      numPagesInPdf = pdfGenResult.pageCount;

      const studentEmailSafe = sanitizeFolderName(student.email);
      finalFilename = `scanned_copy_${studentEmailSafe}_${Date.now()}.pdf`;
    }

    console.log(
      `[ScanCopy] Uploading final PDF (${finalFilename}) to Google Drive...`
    );
    const uploadedFileDetails = await uploadFileToFolder(
      finalPdfBuffer,
      finalFilename,
      "application/pdf",
      stuFolderId // Upload to the student's folder under the correct exam structure
    );
    console.log(
      `[ScanCopy] PDF uploaded to Drive with ID: ${uploadedFileDetails.id}`
    );

    const initialPagesData = [];
    for (let i = 1; i <= numPagesInPdf; i++) {
      initialPagesData.push({
        pageNumber: i,
        marksAwarded: 0,
        comments: [],
        annotations: "{}",
      });
    }
    console.log(
      `[ScanCopy] Initialized ${numPagesInPdf} pages in DB for annotation tracking.`
    );

    const newCopy = new Copy({
      student: student._id,
      questionPaper: questionPaper._id,
      driveFile: {
        id: uploadedFileDetails.id,
        link: uploadedFileDetails.viewLink,
        viewLink: uploadedFileDetails.viewLink,
      },
      totalPages: numPagesInPdf,
      status: "pending",
      pages: initialPagesData,
      examiners: [],
    });

    await newCopy.save();
    console.log(`[ScanCopy] Copy record saved to DB: ${newCopy._id}`);

    res.status(201).json({
      message: "Scanned copy uploaded and registered successfully!",
      copy: newCopy,
    });
  } catch (err) {
    console.error("Error uploading scanned copy:", err);
    next(err);
  }
};

exports.getCopiesByExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    // Fetch the exam details
    const exam = await Paper.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // Fetch copies for that exam
    const copies = await Copy.find({ questionPaper: examId })
      .populate("student", "name email batch") // Populate student name and email
      .populate("examiners", "name email"); // Populate examiner names and emails

    // Return both exam and copies in an object
    res.json({ exam, copies });
  } catch (err) {
    next(err);
  }
};

// NEW: Get a single copy's details for admin viewing (read-only)
exports.getAdminCopyDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const copy = await Copy.findById(id)
            .populate("student", "name email batch")
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

exports.toggleCopyRelease = async (req, res, next) => {
  try {
    const copyId = req.params.id;
    const copy = await Copy.findById(copyId);

    if (!copy) {
      return res.status(404).json({ message: "Copy not found." });
    }

    if (copy.status !== "evaluated") {
      return res
        .status(400)
        .json({ message: "Only completed copies can be released/unreleased." });
    }

    copy.isReleasedToStudent = !copy.isReleasedToStudent;
    await copy.save();

    res.json({
      message: `Copy release status updated to ${
        copy.isReleasedToStudent ? "released" : "unreleased"
      }.`,
      copy: copy,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteUserBulk = async (req, res, next) => {
  try {
    const { userIds } = req.body; // Expecting an array of user IDs to delete

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty user IDs array." });
    }

    // Validate that all provided IDs are valid ObjectIDs
    const validObjectIds = userIds.every((id) => mongoose.Types.ObjectId.isValid(id));
    if (!validObjectIds) {
      return res.status(400).json({ message: "One or more invalid user IDs provided." });
    }

    // Delete users in bulk
    const result = await User.deleteMany({ _id: { $in: userIds } });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No users found with the provided IDs." });
    }

    res.json({
      message: `${result.deletedCount} users deleted successfully.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    next(err);
  }
}