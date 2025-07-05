const express = require("express");
const {
  listCopies,
  getCopy,
  raiseQuery,
} = require("../controllers/student.controller");
const { ensureAuthenticated, ensureRole } = require("../middleware/auth");
const { verifyToken } = require("../middleware/jwtAuth");
const router = express.Router();

router.use(verifyToken, ensureRole("student"));

router.get("/copies", listCopies);
router.get("/copies/:id", getCopy);
router.post("/copies/:id/query", raiseQuery);

module.exports = router;
