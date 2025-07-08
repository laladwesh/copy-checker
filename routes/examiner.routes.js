// routes/examiner.routes.js
const express = require("express");
const {
  listPending,
  listHistory,
  getCopy,
  markPage,
  markCompleteCopy,
  listQueries,
  getSingleQuery,
  replyQuery, // Re-added replyQuery
} = require("../controllers/examiner.controller");
const { verifyToken } = require("../middleware/jwtAuth");
const { ensureRole } = require("../middleware/auth");
const upload = require("../middleware/fileUpload"); // Assuming multer setup for file uploads

const router = express.Router();

router.use(verifyToken, ensureRole("examiner"));

// Copy Management
router.get("/copies/pending", listPending);
router.get("/copies/history", listHistory);
router.get("/copies/:id", getCopy);
router.patch("/copies/:id/mark-page", markPage);
router.patch("/copies/:id/complete", markCompleteCopy); // Mark copy as fully evaluated

// Query Management
router.get("/queries", listQueries); // Examiner sees queries approved by admin
router.get("/queries/:id", getSingleQuery); // Examiner views a single query
router.patch("/queries/:id/reply", replyQuery); // Examiner replies to a query

module.exports = router;
