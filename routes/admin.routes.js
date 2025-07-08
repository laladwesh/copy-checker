// routes/admin.routes.js
const express = require("express");
const {
  createUser,
  listUsers,
  getStudentsByBatch,
  getExaminers,
  createExam,
  listPapers,
  assignExaminersToExam,
  uploadCopy,
  listCopies,
  listQueries,
  approveQuery,
  rejectQuery,
  toggleExamCopyRelease,
  uploadScannedCopy,
  getCopiesByExam,
  getAdminCopyDetails,
  toggleCopyRelease,
  resolveQueryByAdmin, // NEW
} = require("../controllers/admin.controller");
const { verifyToken } = require("../middleware/jwtAuth");
const { ensureRole } = require("../middleware/auth");
const upload = require("../middleware/fileUpload"); // Assumed to export a configured multer instance

const router = express.Router();

router.use(verifyToken, ensureRole("admin"));

// User Management
router.post("/users", createUser);
router.get("/users", listUsers);
router.get("/students", getStudentsByBatch);
router.get("/examiners", getExaminers);

// Exam (Question Paper) Management - "pool where all exams should be there"
router.post(
  "/exams",
  upload.fields([
    { name: "paper", maxCount: 1 }, // For a single PDF question paper
    { name: "images", maxCount: 5 }, // For image uploads, max 5 images
  ]),
  createExam
);
router.get("/exams", listPapers);
router.post("/exams/:id/assign-examiners", assignExaminersToExam);

// Answer Copy Management (Manual Uploads)
router.post(
  "/copies",
  upload.fields([
    { name: "copyPdf", maxCount: 1 },
    { name: "images", maxCount: 20 }, // For images
  ]),
  uploadCopy
);
router.get("/copies", listCopies);

// Query Management
router.get("/queries", listQueries);
router.patch("/queries/:id/approve", approveQuery);
router.patch("/queries/:id/reject", rejectQuery);
router.patch("/queries/:id/resolve", resolveQueryByAdmin); // NEW ROUTE for admin to resolve
router.get("/exams/:examId/copies", getCopiesByExam); // Get all copies for a specific exam
router.get("/copies/view/:id", getAdminCopyDetails); // Get details of a single copy for admin viewing

// Admin Features
router.patch("/copies/single/:id/toggle-release", toggleCopyRelease);
router.patch("/copies/:examId/toggle-release", toggleExamCopyRelease);
router.post(
  "/upload/scanned-copy",
  upload.fields([
    { name: "scannedPdf", maxCount: 1 },
    { name: "scannedImages", maxCount: 50 },
  ]),
  uploadScannedCopy
);

module.exports = router;
