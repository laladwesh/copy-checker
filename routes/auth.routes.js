const express = require("express");
const passport = require("passport");
const {
  googleCallback,
  getMe,
  logout,
} = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/jwtAuth");
const { ensureAuthenticated } = require("../middleware/auth");
const router = express.Router();

// Kick off OAuth (no session)
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

// Handle callback, issue JWT, then redirect
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false,
  }),
  googleCallback
);

router.get("/me", verifyToken, ensureAuthenticated , getMe);
router.get("/logout", logout);

module.exports = router;
