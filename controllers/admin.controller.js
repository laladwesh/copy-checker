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
const sendEmail = require("../utils/sendEmail");
const { assignedCopiesHtml } = require("../utils/emailTemplates");
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const {
  smartDistributeCopies,
  autoReallocateIdleCopies,
  updateExaminerStats,
  manualReallocate
} = require("../utils/smartAllocation");
const getDirectDriveDownloadLink = (fileId) => {
    if (!fileId) return null;
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
};

// Delete a single copy by ID
// Delete a single copy by ID (also remove associated queries and Drive file)
exports.deleteCopy = async (req, res, next) => {
  try {
    const copyId = req.params.id;
    if (!copyId) return res.status(400).json({ message: "Copy ID is required." });
    const copy = await Copy.findById(copyId);
    if (!copy) return res.status(404).json({ message: "Copy not found." });

    // Allow deleting copies regardless of their status (including 'examining').
    // Note: previously deletion of 'examining' copies was blocked to avoid
    // potential conflicts when an examiner is actively working on a copy.
    // The caller should ensure this action is safe in their workflow.

    // Delete queries associated with this copy
    await Query.deleteMany({ copy: copy._id });

    // Delete drive file if present
    try {
      if (copy.driveFile && copy.driveFile.id && drive) {
        await drive.files.delete({ fileId: copy.driveFile.id });
      }
    } catch (driveErr) {
      console.error("[WARNING] Warning: failed to delete copy drive file:", driveErr.message);
      // Do not fail the whole operation on drive errors
    }

    await Copy.deleteOne({ _id: copyId });
    res.json({ message: "Copy deleted successfully." });
  } catch (err) {
    next(err);
  }
};

// Delete an exam (Paper) and its copies + queries + Drive files
exports.deleteExam = async (req, res, next) => {
  try {
    const paperId = req.params.id;
    if (!paperId) return res.status(400).json({ message: "Exam ID is required." });

    const paper = await Paper.findById(paperId);
    if (!paper) return res.status(404).json({ message: "Exam not found." });

    // Prevent deletion if any copy is currently being examined
    const activeCopy = await Copy.findOne({ questionPaper: paperId, status: "examining" });
    if (activeCopy) {
      return res.status(400).json({ message: "Cannot delete exam while some copies are being examined." });
    }

    // Find all copies for this paper
    const paperCopies = await Copy.find({ questionPaper: paperId });

    // Delete queries and drive files for each copy
    for (const cp of paperCopies) {
      try {
        await Query.deleteMany({ copy: cp._id });
        if (cp.driveFile && cp.driveFile.id && drive) {
          await drive.files.delete({ fileId: cp.driveFile.id });
        }
      } catch (innerErr) {
        console.error("[WARNING] Warning: error while cleaning a copy during exam delete:", innerErr.message);
      }
    }

    // Delete copies
    await Copy.deleteMany({ questionPaper: paperId });

    // Delete the paper drive file if present
    try {
      if (paper.driveFile && paper.driveFile.id && drive) {
        await drive.files.delete({ fileId: paper.driveFile.id });
      }
    } catch (driveErr) {
      console.error("[WARNING] Warning: failed to delete paper drive file:", driveErr.message);
    }

    // Finally delete Paper document
    await Paper.deleteOne({ _id: paperId });

    res.json({ message: "Exam and its copies deleted successfully." });
  } catch (err) {
    next(err);
  }
};

// Bulk delete exams by IDs (body: { examIds: [] })
exports.deleteExamsBulk = async (req, res, next) => {
  try {
    const { examIds } = req.body;
    if (!Array.isArray(examIds) || examIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty examIds array." });
    }

    // Validate IDs
    const valid = examIds.every((id) => mongoose.Types.ObjectId.isValid(id));
    if (!valid) return res.status(400).json({ message: "One or more exam IDs are invalid." });

    // Check for any active copies
    const active = await Copy.findOne({ questionPaper: { $in: examIds }, status: "examining" });
    if (active) return res.status(400).json({ message: "Cannot delete exams while some copies are being examined." });

    // For each exam, delete associated copies, queries and drive files
    for (const id of examIds) {
      const paper = await Paper.findById(id);
      const paperCopies = await Copy.find({ questionPaper: id });
      for (const cp of paperCopies) {
        try {
          await Query.deleteMany({ copy: cp._id });
          if (cp.driveFile && cp.driveFile.id && drive) {
            await drive.files.delete({ fileId: cp.driveFile.id });
          }
        } catch (e) {
          console.error("[WARNING] Warning: cleaning copy during bulk exam delete:", e.message);
        }
      }
      await Copy.deleteMany({ questionPaper: id });
      if (paper && paper.driveFile && paper.driveFile.id && drive) {
        try {
          await drive.files.delete({ fileId: paper.driveFile.id });
        } catch (e) {
          console.error("[WARNING] Warning: deleting paper drive file during bulk delete:", e.message);
        }
      }
      await Paper.deleteOne({ _id: id });
    }

    res.json({ message: `${examIds.length} exam(s) deleted.` });
  } catch (err) {
    next(err);
  }
};

// Bulk delete copies by IDs (body: { copyIds: [] })
exports.deleteCopiesBulk = async (req, res, next) => {
  try {
    const { copyIds } = req.body;
    if (!Array.isArray(copyIds) || copyIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty copyIds array." });
    }
    const valid = copyIds.every((id) => mongoose.Types.ObjectId.isValid(id));
    if (!valid) return res.status(400).json({ message: "One or more copy IDs are invalid." });

    for (const id of copyIds) {
      const cp = await Copy.findById(id);
      if (!cp) continue;
      // Delete queries associated with this copy
      await Query.deleteMany({ copy: cp._id });
      // Attempt to delete drive file (non-fatal)
      if (cp.driveFile && cp.driveFile.id && drive) {
        try {
          await drive.files.delete({ fileId: cp.driveFile.id });
        } catch (e) {
          console.error("[WARNING] Warning: deleting copy drive file during bulk delete:", e.message);
        }
      }
      await Copy.deleteOne({ _id: id });
    }

    res.json({ message: "Requested copies processed for deletion." });
  } catch (err) {
    next(err);
  }
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

        // Implement a simple on-disk cache to speed up repeat requests and support Range requests
        const cacheDir = path.join(os.tmpdir(), 'pims_pdf_cache');
        if (!fsSync.existsSync(cacheDir)) {
          try { fsSync.mkdirSync(cacheDir, { recursive: true }); } catch (e) { /* ignore */ }
        }

        const cachedFilePath = path.join(cacheDir, `${fileId}.pdf`);

        // Utility: serve from local cache with Range support
        const serveFromCache = (filePath) => {
          try {
            const stat = fsSync.statSync(filePath);
            const total = stat.size;

            // Support Range header for partial content (enables fast first-page render in browsers)
            const range = req.headers.range;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${fileId}.pdf"`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // cache for 1 day

            if (range) {
              const parts = range.replace(/bytes=/, '').split('-');
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
              if (start >= total || end >= total) {
                res.status(416).setHeader('Content-Range', `bytes */${total}`);
                return res.end();
              }
              res.status(206);
              res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
              res.setHeader('Content-Length', (end - start) + 1);
              const stream = fsSync.createReadStream(filePath, { start, end });
              return stream.pipe(res);
            } else {
              res.setHeader('Content-Length', total);
              const stream = fsSync.createReadStream(filePath);
              return stream.pipe(res);
            }
          } catch (e) {
            console.error('Error serving cached file:', e);
            // fallback to direct drive streaming below
          }
        };

        // If cached file exists, serve it (fast)
        if (fsSync.existsSync(cachedFilePath)) {
          console.log(`[Backend] Serving cached PDF for ${fileId}`);
          return serveFromCache(cachedFilePath);
        }

        // Otherwise, fetch the file from Drive into a temp file, stream to response and write to cache
        const tmpPath = path.join(cacheDir, `${fileId}_${Date.now()}.download`);
        const driveRes = await drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' });

        // Set minimal headers for streaming initial content
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileId}.pdf"`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400');

        // Pipe drive stream into a PassThrough to duplicate for disk write
        const { PassThrough } = require('stream');
        const pass = new PassThrough();
        const writeStream = fsSync.createWriteStream(tmpPath);

        driveRes.data.pipe(pass);
        pass.pipe(writeStream);
        pass.pipe(res);

        let wrote = false;
        writeStream.on('finish', () => {
          try {
            fsSync.renameSync(tmpPath, cachedFilePath);
            wrote = true;
            console.log(`[Backend] Cached PDF saved for ${fileId} at ${cachedFilePath}`);
          } catch (e) {
            console.warn(`[Backend] Failed to move cached PDF for ${fileId}:`, e.message);
            try { fsSync.unlinkSync(tmpPath); } catch (ee) { }
          }
        });

        driveRes.data.on('end', () => {
          console.log(`[Backend] Finished streaming PDF file from Drive: ${fileId}`);
        });

        driveRes.data.on('error', (err) => {
          console.error(`[Backend] Error streaming PDF file ${fileId} from Drive:`, err);
          if (!res.headersSent) {
            if (err.code === 403) {
              res.status(403).json({ message: "Access to Google Drive file forbidden. Check file permissions or authentication." });
            } else if (err.code === 404) {
              res.status(404).json({ message: "Google Drive file not found or deleted." });
            } else {
              res.status(500).json({ message: "Failed to stream file from Google Drive due to an unexpected error." });
            }
          }
        });

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
    const { name, email, role, gender, batch, department } = req.body;
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
    const normalizedDepartment = department ? department.toLowerCase() : undefined;
    const user = new User({ name, email, role, gender, batch, department: normalizedDepartment });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, gender, batch, department } = req.body;

    if (!name || !email || !role) {
      return res
        .status(400)
        .json({ message: "Name, email, and role are required." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if email is being changed and if new email already exists
    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(409)
          .json({ message: "User with this email already exists." });
      }
    }

    // Update basic fields
    user.name = name;
    user.email = email;
    user.role = role;
    user.gender = gender;

    // Handle role-specific fields
    if (role === "student") {
      user.batch = batch || "";
      // Clear examiner-specific fields if role changed from examiner to student
      user.department = "";
      user.aadharCard = "";
      user.panCard = "";
      user.accountNumber = "";
      user.bankName = "";
      user.ifscCode = "";
      user.profileComplete = false;
    } else if (role === "examiner") {
      user.department = department ? department.toLowerCase() : "";
      // Don't allow admin to set banking fields - examiner must enter them via profile
      // Clear student-specific fields if role changed from student to examiner
      user.batch = "";
    } else if (role === "admin") {
      // Clear all role-specific fields
      user.batch = "";
      user.department = "";
      user.aadharCard = "";
      user.panCard = "";
      user.accountNumber = "";
      user.bankName = "";
      user.ifscCode = "";
      user.profileComplete = false;
    }

    await user.save();
    res.json(user);
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

// Bulk create students from Excel data
exports.bulkCreateStudents = async (req, res, next) => {
  try {
    const { students } = req.body;
    
    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: "No students data provided." });
    }

    // Add limit check to prevent abuse
    if (students.length > 1000) {
      return res.status(400).json({ message: "Cannot upload more than 1000 students at once." });
    }

    const results = {
      success: [],
      failed: [],
      total: students.length
    };

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const studentData of students) {
      try {
        const { name, email, gender, batch } = studentData;
        
        // Validate required fields
        if (!name || !email || !batch) {
          results.failed.push({
            data: studentData,
            reason: "Missing required fields (name, email, or batch)"
          });
          continue;
        }

        // Validate email format
        if (!emailRegex.test(email)) {
          results.failed.push({
            data: studentData,
            reason: "Invalid email format"
          });
          continue;
        }

        // Sanitize inputs
        const sanitizedName = name.toString().trim().substring(0, 100);
        const sanitizedEmail = email.toString().trim().toLowerCase();
        const sanitizedBatch = batch.toString().trim().substring(0, 20);
        const sanitizedGender = gender ? gender.toString().trim().substring(0, 20) : "";

        // Check if user already exists
        const existingUser = await User.findOne({ email: sanitizedEmail });
        if (existingUser) {
          results.failed.push({
            data: studentData,
            reason: "User with this email already exists"
          });
          continue;
        }

        // Create the student
        const user = new User({
          name: sanitizedName,
          email: sanitizedEmail,
          role: "student",
          gender: sanitizedGender,
          batch: sanitizedBatch
        });
        
        await user.save();
        results.success.push(user);
      } catch (err) {
        results.failed.push({
          data: studentData,
          reason: err.message || "Unknown error"
        });
      }
    }

    res.status(200).json({
      message: `Bulk upload completed. ${results.success.length} students created, ${results.failed.length} failed.`,
      results
    });
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
    console.error("[ERROR] Error creating exam:", err);
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

    // Prevent assigning examiners when there are no copies uploaded for this exam.
    const totalCopiesForExam = await Copy.countDocuments({ questionPaper: paperId });
    if (totalCopiesForExam === 0) {
      return res.status(400).json({
        message:
          "Cannot assign examiners: there are no uploaded copies for this exam.",
      });
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
    // track how many copies each examiner received in this distribution
    const assignedCounts = {};
    for (const copy of pendingUnassignedCopies) {
      const currentExaminerId = validExaminerObjectIds[examinerIndex];
      copy.examiners = [currentExaminerId];
      await copy.save();
      const idStr = currentExaminerId.toString();
      assignedCounts[idStr] = (assignedCounts[idStr] || 0) + 1;
      examinerIndex = (examinerIndex + 1) % validExaminerObjectIds.length;
    }

    // Send notification emails to examiners who received copies
    try {
      const frontendBase = process.env.FRONTEND_URL;
      const loginLink = `${frontendBase}/auth/success`;
      // Fetch examiner user objects from validExaminers (we already have these)
      for (const examiner of validExaminers) {
        const idStr = examiner._id.toString();
        const count = assignedCounts[idStr] || 0;
        if (count > 0 && examiner.email) {
          const html = assignedCopiesHtml({
            examinerName: examiner.name || examiner.email,
            paperTitle: paper.title || "(Exam)",
            count,
            link: loginLink,
            email: examiner.email,
          });
          const subject = `Assigned: ${count} copy(ies) for ${paper.title || "Exam"}`;
          // fire and forget, but await so we can log failures
          try {
            await sendEmail({ to: examiner.email, subject, html });
          } catch (emailErr) {
            console.error(`[ERROR] Failed to send assignment email to ${examiner.email}:`, emailErr);
          }
        }
      }
    } catch (notifyErr) {
      console.error("[ERROR] Error sending assignment emails:", notifyErr);
    }

    res.status(200).json({
      message: `Examiners assigned to exam and ${pendingUnassignedCopies.length} pending copies distributed.`,
      paper: paper,
    });
  } catch (err) {
    console.error("[ERROR] Error assigning examiners to exam:", err);
    next(err);
  }
};

// Undo / Remove assigned examiners from an exam and unassign copies that aren't evaluated
exports.unassignExaminersFromExam = async (req, res, next) => {
  try {
    const paperId = req.params.id;
    if (!paperId) {
      return res.status(400).json({ message: "Exam (Paper) ID is required." });
    }

    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: "Exam (Question Paper) not found." });
    }

    const prevAssignedCount = (paper.assignedExaminers || []).length;
    paper.assignedExaminers = [];
    await paper.save();

    // Clear examiners only on copies that are still pending (not assigned/being examined/evaluated)
    // This prevents removing examiners from copies that are currently being checked ('examining')
    const updateResult = await Copy.updateMany(
      {
        questionPaper: paperId,
        status: "pending",
        examiners: { $exists: true, $ne: [] },
      },
      { $set: { examiners: [] } }
    );

    const modified = updateResult.modifiedCount ?? updateResult.nModified ?? 0;

    res.status(200).json({
      message: `Removed ${prevAssignedCount} assigned examiners and unassigned ${modified} copies.`,
      paper,
      modifiedCopies: modified,
    });
  } catch (err) {
    console.error("[ERROR] Error unassigning examiners from exam:", err);
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
    console.error("[ERROR] Error redistributing copies:", err);
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
      driveFile: {
        id: driveFile.id,
        link: driveFile.contentLink || driveFile.viewLink, // Use contentLink as the main link
        viewLink: driveFile.viewLink,
      },
      totalPages: numPagesInPdf,
      status: "pending",
      pages: initialPagesData,
      examiners: [],
    });
    await copy.save();

    res.status(201).json(copy);
  } catch (err) {
    console.error("[ERROR] Error uploading copy:", err);
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
    // Allow uploading scanned copies even if exam has assigned examiners.
    // Previously this returned a 400 and prevented uploads when examiners
    // were assigned. That blocked admins from adding more copies after
    // an undo/unassign action or in other workflows. Log a warning but
    // continue processing the upload.
    if (questionPaper.assignedExaminers && questionPaper.assignedExaminers.length !== 0) {
      console.warn(
        `[ScanCopy] Uploading to exam (${questionPaper._id}) which has ${questionPaper.assignedExaminers.length} assigned examiner(s). Proceeding with upload.`
      );
    }
    // Prevent duplicate uploads for the same student & exam by checking existing copies.
    const existingCopy = await Copy.findOne({
      questionPaper: questionPaperId,
      student: student._id,
    });
    if (existingCopy) {
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
        link: uploadedFileDetails.contentLink || uploadedFileDetails.viewLink,
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
    console.error("[ERROR] Error uploading scanned copy:", err);
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

// NEW: Add examiner to exam
exports.addExaminerToExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { examinerId } = req.body;

    if (!examinerId) {
      return res.status(400).json({ message: "Examiner ID is required." });
    }

    // Validate examiner exists and has examiner role
    const examiner = await User.findById(examinerId);
    if (!examiner) {
      return res.status(404).json({ message: "Examiner not found." });
    }
    if (examiner.role !== 'examiner') {
      return res.status(400).json({ message: "User is not an examiner." });
    }

    // Find exam
    const exam = await Paper.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // Check if examiner already assigned
    if (exam.assignedExaminers?.includes(examinerId)) {
      return res.status(400).json({ message: "Examiner already assigned to this exam." });
    }

    // Add examiner to exam
    exam.assignedExaminers = exam.assignedExaminers || [];
    exam.assignedExaminers.push(examinerId);
    await exam.save();

    res.json({ 
      message: "Examiner added successfully.",
      exam 
    });
  } catch (err) {
    next(err);
  }
};

// NEW: Move copy to different examiner
exports.moveCopyToExaminer = async (req, res, next) => {
  try {
    const { copyId } = req.params;
    const { newExaminerId } = req.body;

    if (!newExaminerId) {
      return res.status(400).json({ message: "New examiner ID is required." });
    }

    // Validate new examiner exists and has examiner role
    const newExaminer = await User.findById(newExaminerId);
    if (!newExaminer) {
      return res.status(404).json({ message: "New examiner not found." });
    }
    if (newExaminer.role !== 'examiner') {
      return res.status(400).json({ message: "User is not an examiner." });
    }

    // Find copy with populated data
    const copy = await Copy.findById(copyId).populate('questionPaper').populate('student');
    if (!copy) {
      return res.status(404).json({ message: "Copy not found." });
    }

    // Only allow moving if copy is not evaluated
    if (copy.status === 'evaluated') {
      return res.status(400).json({ message: "Cannot move an evaluated copy." });
    }

    // Update copy examiners
    copy.examiners = [newExaminerId];
    copy.status = 'pending'; // Reset to pending status
    await copy.save();

    // Send email notification to new examiner
    try {
      const frontendBase = process.env.FRONTEND_URL;
      const loginLink = `${frontendBase}/auth/success`;
      const paperTitle = copy.questionPaper?.title || 'Exam';
      const studentName = copy.student?.name || 'Student';
      
      const html = assignedCopiesHtml({
        examinerName: newExaminer.name || newExaminer.email,
        paperTitle: paperTitle,
        count: 1,
        link: loginLink,
        email: newExaminer.email,
      });
      const subject = `New Copy Assigned: ${studentName}'s answer for ${paperTitle}`;
      
      await sendEmail({ to: newExaminer.email, subject, html });
    } catch (emailErr) {
      console.error(`Failed to send email to ${newExaminer.email}:`, emailErr);
      // Don't fail the request if email fails
    }

    res.json({ 
      message: "Copy moved to new examiner successfully.",
      copy 
    });
  } catch (err) {
    next(err);
  }
};

// NEW: Bulk move copies to different examiner
exports.bulkMoveCopies = async (req, res, next) => {
  try {
    const { copyIds, newExaminerId } = req.body;

    if (!copyIds || !Array.isArray(copyIds) || copyIds.length === 0) {
      return res.status(400).json({ message: "Copy IDs array is required." });
    }

    if (!newExaminerId) {
      return res.status(400).json({ message: "New examiner ID is required." });
    }

    // Validate new examiner exists and has examiner role
    const newExaminer = await User.findById(newExaminerId);
    if (!newExaminer) {
      return res.status(404).json({ message: "New examiner not found." });
    }
    if (newExaminer.role !== 'examiner') {
      return res.status(400).json({ message: "User is not an examiner." });
    }

    // Find all copies
    const copies = await Copy.find({ _id: { $in: copyIds } }).populate('questionPaper').populate('student');
    
    if (copies.length === 0) {
      return res.status(404).json({ message: "No copies found." });
    }

    // Check if any copy is evaluated
    const evaluatedCopy = copies.find(c => c.status === 'evaluated');
    if (evaluatedCopy) {
      return res.status(400).json({ message: "Cannot move evaluated copies. Please unselect evaluated copies." });
    }

    // Update all copies
    let movedCount = 0;
    for (const copy of copies) {
      copy.examiners = [newExaminerId];
      copy.status = 'pending'; // Reset to pending status
      await copy.save();
      movedCount++;
    }

    // Send email notification to new examiner
    try {
      const frontendBase = process.env.FRONTEND_URL;
      const loginLink = `${frontendBase}/auth/success`;
      const paperTitle = copies[0]?.questionPaper?.title || 'Exam';
      
      const html = assignedCopiesHtml({
        examinerName: newExaminer.name || newExaminer.email,
        paperTitle: paperTitle,
        count: movedCount,
        link: loginLink,
        email: newExaminer.email,
      });
      const subject = `New Assignment: ${movedCount} copy(ies) for ${paperTitle}`;
      
      await sendEmail({ to: newExaminer.email, subject, html });
    } catch (emailErr) {
      console.error(`Failed to send email to ${newExaminer.email}:`, emailErr);
      // Don't fail the request if email fails
    }

    res.json({ 
      message: `${movedCount} copies moved to new examiner successfully.`,
      movedCount
    });
  } catch (err) {
    next(err);
  }
};

// Bulk delete users
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
};

// ==================== SMART ALLOCATION & PERFORMANCE TRACKING ====================

/**
 * Simple equal distribute copies for an exam - round robin distribution
 * POST /api/admin/exams/:examId/smart-distribute
 */
exports.smartDistribute = async (req, res, next) => {
  try {
    const { examId } = req.params;
    
    // Get the exam/paper
    const paper = await Paper.findById(examId).populate('assignedExaminers');
    if (!paper || !paper.assignedExaminers || paper.assignedExaminers.length === 0) {
      return res.status(400).json({ message: 'No examiners assigned to this exam' });
    }

    // Get unassigned copies (pending copies with no examiners)
    const copiesToDistribute = await Copy.find({
      questionPaper: examId,
      status: 'pending',
      $or: [
        { examiners: { $size: 0 } },
        { examiners: { $exists: false } }
      ]
    }).populate('student', 'name email');

    if (copiesToDistribute.length === 0) {
      return res.json({ message: 'No pending copies to assign', assignedCount: 0 });
    }

    // Simple round-robin distribution
    const examiners = paper.assignedExaminers;
    let assignedCount = 0;
    let currentExaminerIndex = 0;

    for (const copy of copiesToDistribute) {
      const examiner = examiners[currentExaminerIndex];
      
      copy.examiners = [examiner._id];
      copy.assignedAt = new Date();
      copy.status = 'pending';
      await copy.save();

      assignedCount++;
      currentExaminerIndex = (currentExaminerIndex + 1) % examiners.length;
    }

    // Send email notifications to examiners
    const examinerCopyCounts = {};
    for (const copy of copiesToDistribute) {
      const examinerId = copy.examiners[0].toString();
      examinerCopyCounts[examinerId] = (examinerCopyCounts[examinerId] || 0) + 1;
    }

    for (const examiner of examiners) {
      const count = examinerCopyCounts[examiner._id.toString()] || 0;
      if (count > 0) {
        try {
          await sendEmail({
            to: examiner.email,
            subject: `${count} New Answer ${count === 1 ? 'Copy' : 'Copies'} Assigned - ${paper.title}`,
            html: `
              <h2>Dear ${examiner.name},</h2>
              <p>You have been assigned <strong>${count} answer ${count === 1 ? 'copy' : 'copies'}</strong> for evaluation.</p>
              <p><strong>Exam:</strong> ${paper.title}</p>
              <p><strong>Course:</strong> ${paper.course || 'N/A'}</p>
              <p><strong>Total Marks:</strong> ${paper.totalMarks || 'N/A'}</p>
              <p>Please log into the system to begin evaluation.</p>
              <p>Thank you!</p>
            `
          });
        } catch (emailErr) {
          console.error(`[ERROR] Failed to send email to ${examiner.email}:`, emailErr);
        }
      }
    }

    res.json({
      message: `${assignedCount} copies distributed equally among ${examiners.length} examiner(s)`,
      assignedCount,
      examinerCount: examiners.length,
      averageCopiesPerExaminer: Math.round((assignedCount / examiners.length) * 10) / 10
    });

  } catch (err) {
    console.error("[ERROR] Error in distribution:", err);
    next(err);
  }
};

/**
 * Trigger auto-reallocation of idle copies
 * POST /api/admin/auto-reallocate
 * Body: { idleThresholdHours: 24, warningThresholdHours: 12 }
 */
exports.triggerAutoReallocation = async (req, res, next) => {
  try {
    const { idleThresholdHours = 24, warningThresholdHours = 12 } = req.body;
    const result = await autoReallocateIdleCopies(idleThresholdHours, warningThresholdHours);
    res.json({
      message: 'Auto-reallocation completed',
      ...result
    });
  } catch (err) {
    console.error("[ERROR] Error in auto-reallocation:", err);
    next(err);
  }
};

/**
 * Get examiner performance statistics
 * GET /api/admin/examiner-performance?examId=xxx
 */
exports.getExaminerPerformance = async (req, res, next) => {
  try {
    const { examId } = req.query;
    
    let query = { role: 'examiner' };
    
    const examiners = await User.find(query)
      .select('name email examinerStats')
      .sort({ 'examinerStats.performanceScore': -1 });

    // If examId provided, get exam-specific stats
    if (examId) {
      const examStats = await Promise.all(examiners.map(async (examiner) => {
        const totalAssigned = await Copy.countDocuments({
          questionPaper: examId,
          examiners: examiner._id
        });

        const totalEvaluated = await Copy.countDocuments({
          questionPaper: examId,
          examiners: examiner._id,
          status: 'evaluated'
        });

        const currentPending = await Copy.countDocuments({
          questionPaper: examId,
          examiners: examiner._id,
          status: { $in: ['pending', 'examining'] }
        });

        const avgTime = await Copy.aggregate([
          {
            $match: {
              questionPaper: new mongoose.Types.ObjectId(examId),
              examiners: examiner._id,
              status: 'evaluated',
              assignedAt: { $exists: true },
              evaluationCompletedAt: { $exists: true }
            }
          },
          {
            $project: {
              checkingTime: {
                $divide: [
                  { $subtract: ['$evaluationCompletedAt', '$assignedAt'] },
                  1000 * 60 * 60 // Convert to hours
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgCheckingTime: { $avg: '$checkingTime' }
            }
          }
        ]);

        return {
          examinerId: examiner._id,
          name: examiner.name,
          email: examiner.email,
          examSpecific: {
            totalAssigned,
            totalEvaluated,
            currentPending,
            completionRate: totalAssigned > 0 ? ((totalEvaluated / totalAssigned) * 100).toFixed(1) : 0,
            avgCheckingTimeHours: avgTime.length > 0 ? avgTime[0].avgCheckingTime.toFixed(1) : 0
          },
          overall: examiner.examinerStats || {}
        };
      }));

      return res.json(examStats);
    }

    // Return overall stats
    const stats = examiners.map(examiner => ({
      examinerId: examiner._id,
      name: examiner.name,
      email: examiner.email,
      stats: examiner.examinerStats || {}
    }));

    res.json(stats);
  } catch (err) {
    console.error("[ERROR] Error getting examiner performance:", err);
    next(err);
  }
};

/**
 * Update examiner stats manually
 * POST /api/admin/examiners/:examinerId/update-stats
 */
exports.updateExaminerStatsManual = async (req, res, next) => {
  try {
    const { examinerId } = req.params;
    const updatedExaminer = await updateExaminerStats(examinerId);
    res.json({
      message: 'Examiner stats updated successfully',
      examiner: {
        id: updatedExaminer._id,
        name: updatedExaminer.name,
        stats: updatedExaminer.examinerStats
      }
    });
  } catch (err) {
    console.error("[ERROR] Error updating examiner stats:", err);
    next(err);
  }
};

/**
 * Manual reallocate a copy to a different examiner
 * POST /api/admin/copies/:copyId/reallocate
 * Body: { newExaminerId: "xxx" }
 */
exports.manualReallocateCopy = async (req, res, next) => {
  try {
    const { copyId } = req.params;
    const { newExaminerId } = req.body;

    if (!newExaminerId) {
      return res.status(400).json({ message: 'New examiner ID is required' });
    }

    const result = await manualReallocate(copyId, newExaminerId);
    res.json(result);
  } catch (err) {
    console.error("[ERROR] Error in manual reallocation:", err);
    next(err);
  }
};

/**
 * Get idle copies report
 * GET /api/admin/idle-copies?thresholdHours=24
 */
exports.getIdleCopies = async (req, res, next) => {
  try {
    const { thresholdHours = 24, examId } = req.query;
    const idleDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    let query = {
      status: { $in: ['pending', 'examining'] },
      assignedAt: { $lt: idleDate },
      examiners: { $exists: true, $not: { $size: 0 } }
    };

    if (examId) {
      query.questionPaper = examId;
    }

    const idleCopies = await Copy.find(query)
      .populate('examiners', 'name email')
      .populate('questionPaper', 'title course')
      .populate('student', 'name email')
      .sort({ assignedAt: 1 });

    const report = idleCopies.map(copy => ({
      copyId: copy._id,
      student: copy.student ? { name: copy.student.name, email: copy.student.email } : null,
      exam: copy.questionPaper ? { title: copy.questionPaper.title, course: copy.questionPaper.course } : null,
      examiner: copy.examiners[0] ? { name: copy.examiners[0].name, email: copy.examiners[0].email } : null,
      assignedAt: copy.assignedAt,
      hoursIdle: Math.floor((Date.now() - new Date(copy.assignedAt)) / (1000 * 60 * 60)),
      status: copy.status,
      reassignmentCount: copy.reassignmentCount || 0
    }));

    res.json({
      totalIdleCopies: report.length,
      thresholdHours,
      copies: report
    });
  } catch (err) {
    console.error("[ERROR] Error getting idle copies:", err);
    next(err);
  }
};

/**
 * Get performance dashboard summary
 * GET /api/admin/performance-dashboard?examId=xxx
 */
exports.getPerformanceDashboard = async (req, res, next) => {
  try {
    const { examId } = req.query;

    let examQuery = {};
    if (examId) {
      examQuery.questionPaper = examId;
    }

    // Overall stats
    const totalCopies = await Copy.countDocuments(examQuery);
    const pendingCopies = await Copy.countDocuments({ ...examQuery, status: 'pending' });
    const examiningCopies = await Copy.countDocuments({ ...examQuery, status: 'examining' });
    const evaluatedCopies = await Copy.countDocuments({ ...examQuery, status: 'evaluated' });
    
    // Idle copies (>24 hours)
    const idleDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const idleCopies = await Copy.countDocuments({
      ...examQuery,
      status: { $in: ['pending', 'examining'] },
      assignedAt: { $lt: idleDate }
    });

    // Top performers
    const topPerformers = await User.find({ role: 'examiner' })
      .select('name examinerStats')
      .sort({ 'examinerStats.performanceScore': -1 })
      .limit(5);

    // Bottom performers (need attention)
    const bottomPerformers = await User.find({ 
      role: 'examiner',
      'examinerStats.currentWorkload': { $gt: 0 }
    })
      .select('name examinerStats')
      .sort({ 'examinerStats.performanceScore': 1 })
      .limit(5);

    // Average checking time
    const avgCheckingTime = await Copy.aggregate([
      {
        $match: {
          ...examQuery,
          status: 'evaluated',
          assignedAt: { $exists: true },
          evaluationCompletedAt: { $exists: true }
        }
      },
      {
        $project: {
          checkingTime: {
            $divide: [
              { $subtract: ['$evaluationCompletedAt', '$assignedAt'] },
              1000 * 60 * 60
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$checkingTime' }
        }
      }
    ]);

    res.json({
      overview: {
        totalCopies,
        pendingCopies,
        examiningCopies,
        evaluatedCopies,
        idleCopies,
        completionRate: totalCopies > 0 ? ((evaluatedCopies / totalCopies) * 100).toFixed(1) : 0,
        averageCheckingTimeHours: avgCheckingTime.length > 0 ? avgCheckingTime[0].avgTime.toFixed(1) : 0
      },
      topPerformers: topPerformers.map(e => ({
        name: e.name,
        performanceScore: e.examinerStats?.performanceScore || 0,
        copiesEvaluated: e.examinerStats?.totalCopiesEvaluated || 0,
        avgTimeHours: e.examinerStats?.averageCheckingTimeHours || 0
      })),
      needsAttention: bottomPerformers.map(e => ({
        name: e.name,
        performanceScore: e.examinerStats?.performanceScore || 0,
        currentWorkload: e.examinerStats?.currentWorkload || 0,
        reassignedCopies: e.examinerStats?.totalCopiesReassigned || 0
      }))
    });
  } catch (err) {
    console.error("[ERROR] Error getting performance dashboard:", err);
    next(err);
  }
};

/**
 * Toggle examiner active status
 * POST /api/admin/examiners/:examinerId/toggle-active
 * Body: { isActive: true/false }
 */
exports.toggleExaminerActive = async (req, res, next) => {
  try {
    const { examinerId } = req.params;
    const { isActive } = req.body;

    const examiner = await User.findById(examinerId);
    if (!examiner || examiner.role !== 'examiner') {
      return res.status(404).json({ message: 'Examiner not found' });
    }

    examiner.examinerStats.isActive = isActive;
    await examiner.save();

    res.json({
      message: `Examiner ${isActive ? 'activated' : 'deactivated'} successfully`,
      examiner: {
        id: examiner._id,
        name: examiner.name,
        isActive: examiner.examinerStats.isActive
      }
    });
  } catch (err) {
    console.error("[ERROR] Error toggling examiner active status:", err);
    next(err);
  }
};

