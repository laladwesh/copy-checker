// ensureAuthenticated & role guard
exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Not authenticated" });
};

exports.ensureRole = (role) => (req, res, next) => {
  if (req.user && req.user.role === role) return next();
  return res.status(403).json({ error: "Forbidden: wrong role" });
};
