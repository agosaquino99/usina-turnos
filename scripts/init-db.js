require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

(async () => {
  const rootUser = process.env.DB_ROOT_USER || 'root';
  const rootPass = process.env.DB_ROOT_PASSWORD || '';
  const dbUser = process.env.DB_USER || 'agenda_user';
  const dbPass = process.env.DB_PASSWORD || 'Local_9Intermedio';
  const dbName = process.env.DB_NAME || 'agenda_usina';

  console.log('Conectando como root...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: rootUser,
    password: rootPass,
    multipleStatements: true // <-- Esencial para ejecutar múltiples tablas e inserciones de golpe
  });

  // 1. Crear la base de datos si no existe
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  
  // 2. Seleccionar la base de datos para que las tablas se creen dentro de ella
  await conn.query(`USE \`${dbName}\``);

  // 3. Crear usuario exclusivo si no existe
  const [rows] = await conn.query("SELECT 1 FROM mysql.user WHERE user=? AND host='localhost'", [dbUser]);
  if (rows.length === 0) {
    await conn.query(`CREATE USER '${dbUser}'@'localhost' IDENTIFIED BY ?`, [dbPass]);
    console.log('Usuario exclusivo creado:', dbUser);
  } else {
    await conn.query(`ALTER USER '${dbUser}'@'localhost' IDENTIFIED BY ?`, [dbPass]);
    console.log('Usuario existente actualizado:', dbUser);
  }
  
  await conn.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${dbName}\`.* TO '${dbUser}'@'localhost'`);
  await conn.query('FLUSH PRIVILEGES');

  // 4. Leer y ejecutar el archivo schema.sql limpio
  const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'config', 'schema.sql'), 'utf8');
  await conn.query(sql);

  await conn.end();
  console.log('Esquema creado/actualizado OK');

})().catch((e) => { 
  console.error('Error:', e.message); 
  process.exit(1); 
});