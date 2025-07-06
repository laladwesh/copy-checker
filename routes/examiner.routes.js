const express = require('express');
const {
  listPending,
  listHistory,
  getCopy,
  markPage,
  replyQuery,
  listQueries,
  getSingleQuery, // NEW: Import the new getSingleQuery function
  markCompleteCopy
} = require('../controllers/examiner.controller'); // Make sure this path is correct
const { ensureRole } = require('../middleware/auth');
const { verifyToken } = require('../middleware/jwtAuth');
const router = express.Router();

// All routes in this router will use verifyToken and ensureRole('examiner')
router.use(verifyToken, ensureRole('examiner'));

router.get('/copies/pending', listPending);
router.get('/copies/history', listHistory);
router.get('/copies/:id', getCopy);
router.post('/copies/:id/mark', markPage);
router.post('/copies/:id/complete', markCompleteCopy); // Allow POST for marking copies complete

router.post('/queries/:id/reply', replyQuery); // Existing route for replying to a query
router.get('/queries', listQueries); // Route for listing all queries for the examiner
router.get('/queries/:id', getSingleQuery); // NEW: Route for getting a single query by ID

module.exports = router;