require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool, query } = require('../src/config/db');

(async () => {
  const name = process.env.ADMIN_NAME || 'Administrador';
  const email = (process.env.ADMIN_EMAIL || 'agosaquino99@gmail.com').toLowerCase();
  const pass = process.env.ADMIN_PASSWORD || 'planeta_Apple9';
  const hash = await bcrypt.hash(pass, 10);

  const exists = await query('SELECT id FROM users WHERE email=?', [email]);
  if (exists.length) {
    await query('UPDATE users SET name=?, password_hash=?, role="admin" WHERE email=?', [name, hash, email]);
    console.log('Admin actualizado:', email);
  } else {
    await query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,"admin")', [name, email, hash]);
    console.log('Admin creado:', email, '/', pass);
  }
  await pool.end();
})().catch((e) => { console.error(e); process.exit(1); });