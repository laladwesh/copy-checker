const jwt = require("jsonwebtoken");

// Called after successful passport.authenticate()
// req.user is the Mongo user object from your strategy
exports.googleCallback = (req, res) => {
  // 1) Build payload
  const payload = {
    sub: req.user._id,
    role: req.user.role,
  };

  // 2) Sign token
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "2h" });

  // 3) Redirect back to your React app with the token
  //    e.g. http://localhost:3000/auth/success?token=…
  const redirectUrl = `${process.env.CLIENT_URL}/auth/success?token=${token}`;
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
