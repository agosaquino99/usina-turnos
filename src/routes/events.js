const express = require('express');
const { validationResult } = require('express-validator');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { eventRules } = require('../validators');
const router = express.Router();
function normTime(t) { return String(t).length === 5 ? t + ':00' : t; }

router.get('/', requireAuth, async (req, res) => {
  const { date, roomId } = req.query;
  let sql = `SELECT e.*, rm.name AS room_name, u.name AS creator_name
             FROM events e JOIN rooms rm ON rm.id=e.room_id JOIN users u ON u.id=e.user_id
             WHERE e.status='scheduled'`;
  const params = [];
  if (date) { sql += ' AND e.event_date=?'; params.push(date); }
  if (roomId) { sql += ' AND e.room_id=?'; params.push(Number(roomId)); }
  sql += ' ORDER BY e.event_date ASC, e.start_time ASC';
  const rows = await query(sql, params);
  res.json(rows);
});

router.get('/upcoming', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 10), 50);
  const rows = await query(
    `SELECT e.*, rm.name AS room_name FROM events e JOIN rooms rm ON rm.id=e.room_id
     WHERE e.status='scheduled' AND e.event_date >= CURDATE()
     ORDER BY e.event_date ASC, e.start_time ASC LIMIT ?`, [limit]);
  res.json(rows);
});

router.post('/', requireAdmin, eventRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { roomId, title, description, date } = req.body;
  let startTime = req.body.startTime;
  let endTime = req.body.endTime;
  startTime = normTime(startTime); endTime = normTime(endTime);
  const roomRows = await query('SELECT id,slug FROM rooms WHERE id=?', [Number(roomId)]);
  if (!roomRows.length) return res.status(404).json({ error: 'Sala no encontrada' });
  if (roomRows[0].slug !== 'general') return res.status(400).json({ error: 'Los eventos se registran en Sala General' });
  if (String(startTime) >= String(endTime)) return res.status(400).json({ error: 'Horario invalido' });

  const overlaps = await query(
    `SELECT id FROM events WHERE room_id=? AND event_date=? AND status='scheduled'
     AND NOT (end_time <= ? OR start_time >= ?)`,
    [Number(roomId), date, startTime, endTime]
  );
  if (overlaps.length) return res.status(409).json({ error: 'El horario se superpone con otro evento' });

  const result = await query(
    `INSERT INTO events (room_id,user_id,title,description,event_date,start_time,end_time,status)
     VALUES (?,?,?,?,?,?,?,'scheduled')`,
    [Number(roomId), req.session.userId, title, description || null, date, startTime, endTime]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/:id', requireAdmin, eventRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const id = Number(req.params.id);
  const { roomId, title, description, date } = req.body;
  let startTime = normTime(req.body.startTime);
  let endTime = normTime(req.body.endTime);
  if (String(startTime) >= String(endTime)) return res.status(400).json({ error: 'Horario invalido' });
  const overlaps = await query(
    `SELECT id FROM events WHERE room_id=? AND event_date=? AND status='scheduled' AND id<>?
     AND NOT (end_time <= ? OR start_time >= ?)`,
    [Number(roomId), date, id, startTime, endTime]
  );
  if (overlaps.length) return res.status(409).json({ error: 'El horario se superpone con otro evento' });
  await query(`UPDATE events SET room_id=?,title=?,description=?,event_date=?,start_time=?,end_time=? WHERE id=?`,
    [Number(roomId), title, description || null, date, startTime, endTime, id]);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await query("UPDATE events SET status='cancelled' WHERE id=?", [id]);
  res.json({ ok: true });
});

module.exports = router;