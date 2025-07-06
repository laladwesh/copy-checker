const express = require('express');
const {
  listPending,
  listHistory,
  getCopy,
  markPage,
  replyQuery,
  listQueries // NEW: Import the new listQueries function
  , // Import the new function for listing examiner's queries
  markCompleteCopy
} = require('../controllers/examiner.controller');
const { ensureRole } = require('../middleware/auth');
const { verifyToken } = require('../middleware/jwtAuth');
const router = express.Router();

// All routes in this router will use verifyToken and ensureRole('examiner')
router.use(verifyToken, ensureRole('examiner'));

router.get('/copies/pending', listPending);
router.get('/copies/history', listHistory);
router.get('/copies/:id', getCopy);
router.post('/copies/:id/mark', markPage);
router.post('/copies/:id/complete', markCompleteCopy); // Allow POST for marking pages
router.post('/queries/:id/reply', replyQuery);
router.get('/queries', listQueries); // NEW: Add a route for listing examiner's queries

module.exports = router;