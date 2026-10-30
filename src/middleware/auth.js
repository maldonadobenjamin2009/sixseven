function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Tu sesión venció. Iniciá sesión nuevamente." });
  }
  next();
}

module.exports = { requireAuth };
