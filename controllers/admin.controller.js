// controllers/admin.controller.js
const User = require("../models/User");
const Copy = require("../models/Copy"); // Assuming Copy model is separate and updated
const Paper = require("../models/Paper"); // Your Question Paper model
const Query = require("../models/Query");
const pdfGen = require("../utils/pdfGenerator"); // For merging images to PDF, returns { buffer, pageCount }
const {
  getOrCreateFolder,
  uploadFileToFolder,
} = require("../config/googleDrive");
const { PDFDocument } = require("pdf-lib"); // Used to get page count from an existing PDF

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
// Admin can create an exam and upload question paper (PDF or images) at that time
exports.createExam = async (req, res, next) => {
  try {
    const { title, course, examType, date, totalMarks } = req.body;

    // --- Add detailed logs for debugging ---
    console.log("--- Inside createExam controller ---");
    console.log("Request Body:", req.body);
    console.log("req.files:", req.files); // Log the entire req.files object
    console.log("req.files.paper:", req.files.paper); // Log the 'paper' field files
    // --- End detailed logs ---

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

    let finalPdfBuffer = pdfFile.buffer; // Directly use the buffer from memory storage
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

    // Upload the final question paper PDF to Google Drive
    const questionPapersRootId = await getOrCreateFolder("question_papers");
    console.log(
      `[Admin] Uploading final Question Paper PDF (${finalFilename})...`
    );
    const driveFile = await uploadFileToFolder(
      finalPdfBuffer,
      finalFilename,
      pdfFile.mimetype, // Use the actual mimetype from the uploaded file
      questionPapersRootId
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
      totalMarks: parseInt(totalMarks), // Ensure totalMarks is a number
      // CORRECTED: Use driveFile.viewLink for both 'url' and 'viewLink' fields
      driveFile: {
        id: driveFile.id,
        url: driveFile.viewLink, // <--- CHANGED THIS LINE
        viewLink: driveFile.viewLink,
      },
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
    // No manual file cleanup needed here as Multer memoryStorage handles it.
    res.status(500).json({
      message: "Failed to create exam due to an internal server error.",
      error: err.message, // Provide the actual error message for debugging
    });
  }
};

// Provides the "pool where all exams should be there" for the admin panel
exports.listPapers = async (req, res, next) => {
  try {
    // Populate assigned examiners to show their names in the admin panel
    const papers = await Paper.find().populate(
      "assignedExaminers",
      "name email"
    );
    res.json(papers);
  } catch (err) {
    next(err);
  }
};

// NEW: Assign Examiners to an Exam (Paper) and Distribute Copies
exports.assignExaminersToExam = async (req, res, next) => {
  try {
    const { examinerIds } = req.body; // Array of examiner IDs passed from frontend
    const paperId = req.params.id; // The ID of the Paper (Exam) to which examiners are assigned

    if (!paperId) {
      return res.status(400).json({ message: "Exam (Paper) ID is required." });
    }

    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res
        .status(404)
        .json({ message: "Exam (Question Paper) not found." });
    }

    // Validate examiners exist and are indeed examiners
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

    // Update the Paper's assignedExaminers pool
    // This stores which examiners are responsible for this exam
    paper.assignedExaminers = validExaminerObjectIds; // Use the validated IDs
    await paper.save();

    // Find all pending copies for this specific exam that are not yet assigned
    const pendingUnassignedCopies = await Copy.find({
      questionPaper: paperId,
      status: "pending",
      examiners: { $size: 0 }, // Only copies with no assigned examiners
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

    // Distribute copies equally among assigned examiners (round-robin approach)
    let examinerIndex = 0;
    for (const copy of pendingUnassignedCopies) {
      const currentExaminerId = validExaminerObjectIds[examinerIndex];
      copy.examiners = [currentExaminerId]; // Assign only one examiner per copy for marking
      await copy.save();
      examinerIndex = (examinerIndex + 1) % validExaminerObjectIds.length;
    }

    res.status(200).json({
      message: `Examiners assigned to exam and ${pendingUnassignedCopies.length} pending copies distributed.`,
      paper: paper, // Return updated paper details
    });
  } catch (err) {
    console.error("Error assigning examiners to exam:", err);
    next(err);
  }
};

// 3. Answer Copy Management (Manual Upload by Admin/Examiner)
// Copies are uploaded first, without examiner assignment
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
      const pdfGenResult = await pdfGen(buffers); // pdfGen returns { buffer, pageCount }
      finalPdfBuffer = pdfGenResult.buffer;
      numPagesInPdf = pdfGenResult.pageCount;

      finalFilename = `copy-${Date.now()}.pdf`;
    } else {
      throw new Error("No copyPdf or images provided"); // Should be caught by initial check
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res
        .status(404)
        .json({ message: "Student not found or invalid user role." });
    }
    const batch = student.batch;

    const rootId = await getOrCreateFolder("copies");
    const batchId = await getOrCreateFolder(batch, rootId);
    const stuFolderId = await getOrCreateFolder(studentId.toString(), batchId); // Ensure ID is string for folder name

    const driveFile = await uploadFileToFolder(
      finalPdfBuffer,
      finalFilename,
      "application/pdf", // Always PDF now
      stuFolderId
    );

    // Initialize 'pages' array in DB for examiner annotations/marks
    const initialPagesData = [];
    for (let i = 1; i <= numPagesInPdf; i++) {
      initialPagesData.push({
        pageNumber: i,
        marksAwarded: 0,
        comments: [],
        annotations: "{}", // Default empty JSON for frontend annotations
      });
    }

    // Save Copy document - EXAMINERS ARE NOT ASSIGNED AT THIS STAGE
    const copy = new Copy({
      student: studentId,
      questionPaper: paperId,
      driveFile, // Contains id, link, viewLink to the single PDF
      // Removed pageImageFiles as per the new approach
      totalPages: numPagesInPdf, // Store the total number of pages from the PDF
      status: "pending", // Copies start as pending
      pages: initialPagesData, // Store the initialized page data
      examiners: [], // Initialize with empty array, will be assigned later
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
      .populate("examiners", "name email"); // Populate examiner details for admin view
    res.json(copies);
  } catch (err) {
    next(err);
  }
};

// 4. Query Management (No changes needed here for this request)
exports.listQueries = async (req, res, next) => {
  try {
    const qs = await Query.find({ status: "pending" })
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

exports.approveQuery = async (req, res, next) => {
  try {
    const q = await Query.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!q) {
      return res.status(404).json({ message: "Query not found." });
    }
    res.json(q);
  } catch (err) {
    next(err);
  }
};

exports.rejectQuery = async (req, res, next) => {
  try {
    const q = await Query.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!q) {
      return res.status(404).json({ message: "Query not found." });
    }
    res.json(q);
  } catch (err) {
    next(err);
  }
};

// 5. Admin Control for Student Copy Visibility (No changes needed here for this request)
exports.toggleCopyRelease = async (req, res, next) => {
  try {
    const copyId = req.params.id;
    const copy = await Copy.findById(copyId);

    if (!copy) {
      return res.status(404).json({ message: "Copy not found." });
    }

    if (copy.status !== "completed") {
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

// 6. Handle scanned copy upload (simulated printer scanning)
// This function already largely aligns with the new single PDF approach for copies.
exports.uploadScannedCopy = async (req, res, next) => {
  try {
    const { studentEmail, questionPaperId } = req.body;
    const files = req.files;

    if (!studentEmail || !questionPaperId || !files || files.length === 0) {
      return res.status(400).json({
        message: "Student email, question paper ID, and files are required.",
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
    if (!questionPaper) {
      return res.status(404).json({ message: "Question Paper not found." });
    }
    console.log("[ScanCopy] Associating copy with exam:", questionPaper.title);

    let finalPdfBuffer;
    let finalFilename;
    let numPagesInPdf = 0;

    // Ensure these folders exist on Drive
    const rootId = await getOrCreateFolder("copies");
    // Use 'unassigned_batch' if student.batch is null or undefined for folder creation
    const batchFolderName = student.batch
      ? String(student.batch)
      : "unassigned_batch";
    const batchId = await getOrCreateFolder(batchFolderName, rootId);
    const stuFolderId = await getOrCreateFolder(
      student._id.toString(),
      batchId
    );

    const isPdfUpload = files[0].mimetype === "application/pdf";

    if (isPdfUpload) {
      // Case 1: User uploaded a PDF directly
      finalPdfBuffer = files[0].buffer;
      finalFilename = files[0].originalname;
      console.log(`[ScanCopy] Processing existing PDF: ${finalFilename}`);

      // Get page count for the existing PDF
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
      // Case 2: User uploaded images, convert to PDF
      const imageBuffers = files.map((file) => file.buffer);
      console.log(
        `[ScanCopy] Converting ${imageBuffers.length} images to PDF...`
      );

      const pdfGenResult = await pdfGen(imageBuffers); // pdfGen returns { buffer, pageCount }
      finalPdfBuffer = pdfGenResult.buffer;
      numPagesInPdf = pdfGenResult.pageCount; // Get page count from the generated PDF

      const studentEmailSafe = String(student.email).replace(
        /[^a-zA-Z0-9]/g,
        "_"
      );
      finalFilename = `scanned_copy_${studentEmailSafe}_${Date.now()}.pdf`;
    }

    // --- CORE LOGIC: Upload ONLY the single final PDF to Google Drive ---
    console.log(
      `[ScanCopy] Uploading final PDF (${finalFilename}) to Google Drive...`
    );
    const uploadedFileDetails = await uploadFileToFolder(
      finalPdfBuffer,
      finalFilename,
      "application/pdf", // Always PDF now
      stuFolderId
    );
    console.log(
      `[ScanCopy] PDF uploaded to Drive with ID: ${uploadedFileDetails.id}`
    );

    // --- Initialize 'pages' array in DB for annotations, comments, marks ---
    const initialPagesData = [];
    for (let i = 1; i <= numPagesInPdf; i++) {
      initialPagesData.push({
        pageNumber: i,
        marksAwarded: 0,
        comments: [],
        annotations: "{}", // Default empty JSON for frontend annotations
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
      totalPages: numPagesInPdf, // Store the total number of pages from the PDF
      status: "pending",
      pages: initialPagesData, // Store the initialized page data
      examiners: [], // Initially no examiners assigned
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
