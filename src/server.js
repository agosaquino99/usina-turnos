require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const path = require('path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roomRoutes = require('./routes/rooms');
const reservationRoutes = require('./routes/reservations');
const eventRoutes = require('./routes/events');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: 'agenda.sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

// Static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/events', eventRoutes);

// SPA-ish fallback for unknown routes -> index
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Agenda Usina corriendo en http://localhost:${PORT}`);
});