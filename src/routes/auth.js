const express = require('express');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const { query } = require('../config/db');
const { loginRules } = require('../validators');
const router = express.Router();

router.post('/login', loginRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const rows = await query('SELECT id,name,email,password_hash,role FROM users WHERE email=?', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Credenciales invalidas' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciales invalidas' });

  req.session.userId = user.id;
  req.session.name = user.name;
  req.session.email = user.email;
  req.session.role = user.role;
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  res.json({ id: req.session.userId, name: req.session.name, email: req.session.email, role: req.session.role });
});

module.exports = router;