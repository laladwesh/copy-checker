const jwt = require("jsonwebtoken");
const User = require("../models/User");
// Called after successful passport.authenticate()
// req.user is the Mongo user object from your strategy
// controllers/auth.controller.js
exports.googleCallback = (req, res) => {
  const payload = { sub: req.user._id, role: req.user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "2h" });

  // Redirect straight to /<role>?token=<jwt>
  const redirectUrl = `${process.env.CLIENT_URL}/${req.user.role}?token=${token}`;
  res.redirect(redirectUrl);
};

// You can still have a /me that reads the token from auth header:
exports.getMe = (req, res) => {
  // Your JWT-verify middleware will need to populate req.user

  const userid = req.user;
  if (!userid) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = User.findById(userid._id, "-password -__v")
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      console.log("User details fetched successfully:", user);
      res.json({ id: user._id, email: user.email, role: user.role, name: user.name});
    })
    .catch((err) => {
      console.error("Error fetching user:", err);
      res.status(500).json({ error: "Internal server error" });
    });
  return user;
};

exports.logout = (req, res) => {
  // With JWTs there’s no server-side logout; client just drops the token
  res.json({ success: true });
};
