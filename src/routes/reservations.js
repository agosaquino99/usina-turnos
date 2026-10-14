const express = require('express');
const { validationResult } = require('express-validator');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { reservationRules } = require('../validators');
const { sendReservationConfirmation } = require('../services/email');
const router = express.Router();
function normTime(t) { return String(t).length === 5 ? t + ':00' : t; }
function hasOverlap(existing, start, end) {
  // existing: {start_time,end_time}; strings compare as HH:MM:SS or HH:MM
  return !(existing.end_time <= start || existing.start_time >= end);
}

// List reservations
router.get('/', requireAuth, async (req, res) => {
  const { date, roomId, all } = req.query;
  let sql = `SELECT r.*, u.name AS user_name, u.email AS user_email, rm.name AS room_name
             FROM reservations r JOIN users u ON u.id=r.user_id JOIN rooms rm ON rm.id=r.room_id WHERE 1=1`;
  const params = [];
  if (req.session.role !== 'admin' || all !== 'true') {
    sql += ' AND r.user_id=?';
    params.push(req.session.userId);
  }
  if (date) { sql += ' AND r.reservation_date=?'; params.push(date); }
  if (roomId) { sql += ' AND r.room_id=?'; params.push(Number(roomId)); }
  sql += ' ORDER BY r.reservation_date DESC, r.start_time';
  const rows = await query(sql, params);
  res.json(rows);
});

router.get('/upcoming', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 10), 50);
  const all = req.query.all === 'true' && req.session.role === 'admin';
  let sql = `SELECT r.*, u.name AS user_name, u.email AS user_email, rm.name AS room_name
             FROM reservations r JOIN users u ON u.id=r.user_id JOIN rooms rm ON rm.id=r.room_id
             WHERE r.status='confirmed' AND r.reservation_date >= CURDATE()`;
  const params = [];
  if (!all) { sql += ' AND r.user_id=?'; params.push(req.session.userId); }
  sql += ' ORDER BY r.reservation_date ASC, r.start_time ASC LIMIT ?';
  params.push(limit);
  const rows = await query(sql, params);
  res.json(rows);
});

router.get('/availability', requireAuth, async (req, res) => {
  const { roomId, date } = req.query;
  if (!roomId || !date) return res.status(400).json({ error: 'roomId y date requeridos' });
  const rows = await query(
    `SELECT r.id, r.start_time, r.end_time, r.purpose, r.status, u.name AS user_name
     FROM reservations r JOIN users u ON u.id=r.user_id
     WHERE r.room_id=? AND r.reservation_date=? ORDER BY r.start_time`,
    [Number(roomId), date]
  );
  res.json(rows);
});

function normTime(t) { return String(t).length === 5 ? t + ':00' : t; }

router.post('/', reservationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  let { roomId, date, startTime, endTime, purpose } = req.body;
  startTime = normTime(startTime); endTime = normTime(endTime);
  const roomRows = await query('SELECT id,name,slug FROM rooms WHERE id=?', [Number(roomId)]);
  if (!roomRows.length) return res.status(404).json({ error: 'Sala no encontrada' });
  if (roomRows[0].slug !== 'reunion') return res.status(400).json({ error: 'Esta sala no admite reservas por horario' });

  if (String(startTime) >= String(endTime)) return res.status(400).json({ error: 'Horario invalido' });

  // solapamiento
  const overlaps = await query(
    `SELECT id FROM reservations WHERE room_id=? AND reservation_date=? AND status='confirmed'
     AND NOT (end_time <= ? OR start_time >= ?)`,
    [Number(roomId), date, startTime, endTime]
  );
  if (overlaps.length) return res.status(409).json({ error: 'El horario se superpone con otra reserva' });

  const result = await query(
    `INSERT INTO reservations (room_id,user_id,reservation_date,start_time,end_time,purpose,status)
     VALUES (?,?,?,?,?,?,'confirmed')`,
    [Number(roomId), req.session.userId, date, startTime, endTime, purpose]
  );
  const reservation = { id: result.insertId, room_id: Number(roomId), user_id: req.session.userId,
    reservation_date: date, start_time: startTime, end_time: endTime, purpose, status: 'confirmed' };
  const userRows = await query('SELECT id,name,email FROM users WHERE id=?', [req.session.userId]);
  const user = userRows[0];
  const room = roomRows[0];
  const emailResult = await sendReservationConfirmation({ user, room: { name: room.name }, reservation: { ...reservation, date } });
  // map date key for email body already uses reservation.date
  reservation.date = date;
  res.status(201).json({ reservation, email: emailResult });
});

router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query(
    `SELECT r.*, u.name AS user_name, u.email AS user_email, rm.name AS room_name
     FROM reservations r JOIN users u ON u.id=r.user_id JOIN rooms rm ON rm.id=r.room_id
     WHERE r.id=?`, [id]);
  if (!rows.length) return res.status(404).json({ error: 'No encontrada' });
  const r = rows[0];
  if (req.session.role !== 'admin' && r.user_id !== req.session.userId) {
    return res.status(403).json({ error: 'Permisos insuficientes' });
  }
  res.json(r);
});

// Cancelar reserva (usuario propietario o admin)
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const rows = await query('SELECT * FROM reservations WHERE id=?', [id]);
  if (!rows.length) return res.status(404).json({ error: 'No encontrada' });
  const r = rows[0];
  if (req.session.role !== 'admin' && r.user_id !== req.session.userId) {
    return res.status(403).json({ error: 'Permisos insuficientes' });
  }
  await query("UPDATE reservations SET status='cancelled' WHERE id=?", [id]);
  res.json({ ok: true });
});

// Modificar reserva (admin)
router.put('/:id', requireAdmin, reservationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const id = Number(req.params.id);
  let { roomId, date, startTime, endTime, purpose } = req.body;
  startTime = normTime(startTime); endTime = normTime(endTime);
  const rows = await query('SELECT * FROM reservations WHERE id=?', [id]);
  if (!rows.length) return res.status(404).json({ error: 'No encontrada' });
  if (String(startTime) >= String(endTime)) return res.status(400).json({ error: 'Horario invalido' });
  const overlaps = await query(
    `SELECT id FROM reservations WHERE room_id=? AND reservation_date=? AND status='confirmed' AND id<>?
     AND NOT (end_time <= ? OR start_time >= ?)`,
    [Number(roomId), date, id, startTime, endTime]
  );
  if (overlaps.length) return res.status(409).json({ error: 'El horario se superpone con otra reserva' });
  await query(`UPDATE reservations SET room_id=?,reservation_date=?,start_time=?,end_time=?,purpose=? WHERE id=?`,
    [Number(roomId), date, startTime, endTime, purpose, id]);
  res.json({ ok: true });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await query('DELETE FROM reservations WHERE id=?', [id]);
  res.json({ ok: true });
});

module.exports = router;