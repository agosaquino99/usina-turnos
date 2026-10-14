const express = require('express');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { userRules } = require('../validators');
const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const rows = await query('SELECT id,name,email,role,created_at FROM users ORDER BY id');
  res.json(rows);
});

router.post('/', userRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, password, role } = req.body;
  if (!password) return res.status(400).json({ error: 'password requerida' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const r = await query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
      [name, email, hash, role || 'user']);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    res.status(409).json({ error: 'Email ya existe' });
  }
});

router.put('/:id', userRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const id = Number(req.params.id);
  const { name, email, password, role } = req.body;
  const fields = ['name=?', 'email=?', 'role=?'];
  const params = [name, email, role || 'user'];
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    fields.push('password_hash=?');
    params.push(hash);
  }
  params.push(id);
  try {
    await query(`UPDATE users SET ${fields.join(',')} WHERE id=?`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: 'Email ya existe' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.session.userId) return res.status(400).json({ error: 'No puede eliminarse a si mismo' });
  await query('DELETE FROM users WHERE id=?', [id]);
  res.json({ ok: true });
});

module.exports = router;