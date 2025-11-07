import {  } from './models.mjs';   
import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'participium',
  password: 'changeme',
  port: 5432,
});

export const getUser = async (username, password) => {
  try {
    const sql = 'SELECT * FROM "citizens" WHERE email = $1';
    const result = await pool.query(sql, [username]);

    const row = result.rows[0];
    if (!row) return false;

    const user = { id: row.citizen_id, username: row.username };

    return new Promise((resolve, reject) => {
      crypto.scrypt(password, row.salt, 32, (err, hashedPassword) => {
        if (err) return reject(err);

        const match = crypto.timingSafeEqual(
          Buffer.from(row.password_hash, 'hex'),
          hashedPassword
        );

        resolve(match ? user : false);
      });
    });
  } catch (err) {
    throw err;
  }
};


export const createUser = async (username, email,first_name,last_name, password) => {
  const salt = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, async (err, hashedPassword) => {
      if (err) return reject(err);

      const sql = 'INSERT INTO "citizens"(username, email,first_name,last_name, password_hash, salt) VALUES($1, $2, $3, $4, $5, $6) RETURNING citizen_id';
      const values = [username, email,first_name,last_name, hashedPassword.toString('hex'), salt];

      try {
        const result = await pool.query(sql, values);
        resolve({ id: result.rows[0].citizen_id, username });
      } catch (err) {
        reject(err);
      }
    });
  });
};


/*

const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

client.connect()
  .then(() => console.log("✅ Connected to PostgreSQL on Neon"))
  .catch(err => console.error("❌ Connection error:", err.stack));

module.exports = client;
// LA VARIABILE client E' L'EQUIVALENTE DEL db DI SQLITE3

------ESEMPIO DI QUERY ------

client.query('SELECT * FROM citizens', (err, res) => {
  if (err) throw err;
  console.log(res.rows);
});


*/
