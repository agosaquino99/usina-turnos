require('dotenv').config();
const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

async function sendReservationConfirmation({ user, room, reservation }) {
  const subject = 'Confirmacion de reserva - ' + room.name;
  const body = [
    'Hola ' + user.name + ',',
    '',
    'Tu reserva se registro correctamente.',
    '',
    'Sala: ' + room.name,
    'Fecha: ' + reservation.date,
    'Horario: ' + reservation.start_time + ' a ' + reservation.end_time,
    'Motivo: ' + reservation.purpose,
    'Usuario: ' + user.email,
    'Estado: ' + reservation.status,
    '',
    'Saludos,',
    'Agenda Usina del Conocimiento',
  ].join('\n');

  const to = user.email;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { ok: false, message: 'SMTP no configurado; la confirmacion no pudo enviarse.' };
  }
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text: body,
    });
    return { ok: true, message: 'Correo de confirmacion enviado.' };
  } catch (err) {
    return { ok: false, message: 'No pudo enviarse la confirmacion por correo: ' + err.message };
  }
}

module.exports = { sendReservationConfirmation };