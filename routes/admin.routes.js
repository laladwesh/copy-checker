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
router.delete("/users", deleteUserBulk);
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

module.exports = router;
