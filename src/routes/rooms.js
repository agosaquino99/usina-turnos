const express = require('express');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const rows = await query('SELECT id,name,slug,description FROM rooms ORDER BY id');
  res.json(rows);
});

module.exports = router;