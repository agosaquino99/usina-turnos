function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Permisos insuficientes' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };