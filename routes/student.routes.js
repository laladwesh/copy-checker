// routes/student.routes.js
const express = require('express');
const {
  listCopies,
  getCopy,
  raiseQuery,
  listQueries, // NEW: Import listQueries
} = require('../controllers/student.controller');
const { verifyToken } = require('../middleware/jwtAuth');
const { ensureRole } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken, ensureRole('student'));

// Copy Management
router.get('/copies', listCopies);
router.get('/copies/:id', getCopy);

// Query Management
router.post('/copies/:id/queries', raiseQuery); // Student raises query on a copy
router.get('/queries', listQueries); // NEW: Route to list queries for the student

module.exports = router;
