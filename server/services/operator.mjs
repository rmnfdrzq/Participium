import { Pool } from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

//given username (email) and password does the login -> searches only in the onperators tables
export const getOperators = async (username, password) => {
  try {
    const sql = 'SELECT * FROM operators JOIN roles ON operators.role_id = roles.role_id WHERE email = $1';
    const result = await pool.query(sql, [username]);

    const row = result.rows[0];
    if (!row) return false;

    const user = { id: row.operator_id, username: row.username, role: row.role_name };

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

//returns all operators with its data 
export const getAllOperators = async () => {
  try {
    const sql = `
      SELECT o.operator_id, o.email, o.username, o.office_id, off.name as office_name, r.name as role_name
      FROM operators o
      LEFT JOIN offices off ON o.office_id = off.office_id
      LEFT JOIN roles r ON o.role_id = r.role_id
      ORDER BY o.operator_id DESC
    `;
    const result = await pool.query(sql);
    return result.rows.map((row) => ({
      id: row.operator_id,
      email: row.email,
      username: row.username,
      office_id: row.office_id,
      office_name: row.office_name,
      role: row.role_name
    }));
  } catch (err) {
    throw err;
  }
};

//given operator data creates an operator
export const createMunicipalityUser = async (email, username, password, office_id, role_id, company_id) => {
  const salt = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, async (err, hashedPassword) => {
      if (err) return reject(err);

      const sql = `
        INSERT INTO operators (email, username, password_hash, salt, office_id, role_id, company_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING operator_id
      `;
      const values = [email, username, hashedPassword.toString('hex'), salt, office_id, role_id,company_id];

      try {
        const result = await pool.query(sql, values);
        resolve({ id: result.rows[0].operator_id, username });
      } catch (err) {
        reject(err);
      }
    });
  });
};
