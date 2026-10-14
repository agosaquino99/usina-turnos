const { body } = require('express-validator');

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1 }),
];

const userRules = [
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('email').isEmail().normalizeEmail(),
  body('password').optional().isString().isLength({ min: 6 }),
  body('role').optional().isIn(['user', 'admin']),
];

const reservationRules = [
  body('roomId').isInt({ min: 1 }),
  body('date').isISO8601().toDate(),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  body('purpose').trim().isLength({ min: 3, max: 255 }),
];

const eventRules = [
  body('roomId').isInt({ min: 1 }),
  body('title').trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('date').isISO8601().toDate(),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  body('endTime').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
];

module.exports = { loginRules, userRules, reservationRules, eventRules };