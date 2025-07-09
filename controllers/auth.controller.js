const jwt = require("jsonwebtoken");

// Called after successful passport.authenticate()
// req.user is the Mongo user object from your strategy
// controllers/auth.controller.js
exports.googleCallback = (req, res) => {
  const payload = { sub: req.user._id, role: req.user.role };
  const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

  // Redirect straight to /<role>?token=<jwt>
  const redirectUrl = `${process.env.CLIENT_URL}/${req.user.role}?token=${token}`;
  res.redirect(redirectUrl);
};


// You can still have a /me that reads the token from auth header:
exports.getMe = (req, res) => {
  // Your JWT-verify middleware will need to populate req.user
  res.json({ user: req.user });
};

exports.logout = (req, res) => {
  // With JWTs there’s no server-side logout; client just drops the token
  res.json({ success: true });
};
