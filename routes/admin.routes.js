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
  unassignExaminersFromExam,
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
  resolveQueryByAdmin,
  redistributeCopies,
  deleteUserBulk,
  deleteCopy,
  deleteExam,
  deleteExamsBulk,
  deleteCopiesBulk,
  addExaminerToExam,
  moveCopyToExaminer,
  bulkMoveCopies,
  // Smart allocation and performance tracking
  smartDistribute,
  triggerAutoReallocation,
  getExaminerPerformance,
  updateExaminerStatsManual,
  manualReallocateCopy,
  getIdleCopies,
  getPerformanceDashboard,
  toggleExaminerActive,
} = require("../controllers/admin.controller");
const { verifyToken } = require("../middleware/jwtAuth");
const { ensureRole } = require("../middleware/auth");
const upload = require("../middleware/fileUpload");

const router = express.Router();

router.use(verifyToken, ensureRole("admin"));
router.post("/users", createUser);
router.get("/users", listUsers);
router.get("/students", getStudentsByBatch);
router.get("/examiners", getExaminers);
router.delete("/users/bulk", deleteUserBulk);
router.post(
  "/exams",
  upload.fields([
    { name: "paper", maxCount: 1 }, // For a single PDF question paper
    { name: "images", maxCount: 5 }, // For image uploads, max 5 images
  ]),
  createExam,
);
router.get("/exams", listPapers);
router.delete("/exams/:id", deleteExam);
router.delete("/exams", deleteExamsBulk);
router.post("/exams/:id/assign-examiners", assignExaminersToExam);
router.post("/exams/:id/unassign-examiners", unassignExaminersFromExam);
router.post("/exams/:examId/redistribute-copies", redistributeCopies);
router.patch("/exams/:examId/add-examiner", addExaminerToExam);
router.patch("/copies/:copyId/move-examiner", moveCopyToExaminer);
router.patch("/copies/bulk-move", bulkMoveCopies);
router.post(
  "/copies",
  upload.fields([
    { name: "copyPdf", maxCount: 1 },
    { name: "images", maxCount: 20 }, // For images
  ]),
  uploadCopy,
);
router.get("/copies", listCopies);
router.get("/queries", listQueries);
router.patch("/queries/:id/approve", approveQuery);
router.patch("/queries/:id/reject", rejectQuery);
router.patch("/queries/:id/resolve", resolveQueryByAdmin);
router.get("/exams/:examId/copies", getCopiesByExam);
router.get("/copies/view/:id", getAdminCopyDetails);
router.delete("/copies/:id", deleteCopy);
router.delete("/copies", deleteCopiesBulk);
router.patch("/copies/single/:id/toggle-release", toggleCopyRelease);
router.patch("/copies/:examId/toggle-release", toggleExamCopyRelease);
router.post(
  "/upload/scanned-copy",
  upload.fields([
    { name: "scannedPdf", maxCount: 1 },
    { name: "scannedImages", maxCount: 50 },
  ]),
  uploadScannedCopy,
);

// ==================== SMART ALLOCATION & PERFORMANCE ROUTES ====================
// Smart distribute copies for an exam
router.post("/exams/:examId/smart-distribute", smartDistribute);

// Trigger auto-reallocation of idle copies
router.post("/auto-reallocate", triggerAutoReallocation);

// Get examiner performance statistics
router.get("/examiner-performance", getExaminerPerformance);

// Update examiner stats manually
router.post("/examiners/:examinerId/update-stats", updateExaminerStatsManual);

// Manual reallocate a copy
router.post("/copies/:copyId/reallocate", manualReallocateCopy);

// Get idle copies report
router.get("/idle-copies", getIdleCopies);

// Get performance dashboard
router.get("/performance-dashboard", getPerformanceDashboard);

// Toggle examiner active status
router.post("/examiners/:examinerId/toggle-active", toggleExaminerActive);

module.exports = router;
