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

//given username (email) and password does the login -> searches in citizen and then operators tables
export const getUser = async (username, password) => {
    // First try to find in operators table
    const operatorSql = 'SELECT o.*, r.name as role_name FROM operators o JOIN roles r ON o.role_id = r.role_id WHERE o.email = $1 OR o.username = $1';
    const operatorResult = await pool.query(operatorSql, [username]);

    if (operatorResult.rows.length > 0) {
      const row = operatorResult.rows[0];
      const user = {
        id: row.operator_id,
        username: row.username,
        role: row.role_name
      };

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
    }

    // If not found in operators, try citizens
    const citizenSql = 'SELECT * FROM citizens WHERE email = $1 OR username = $1';
    const citizenResult = await pool.query(citizenSql, [username]);

    const row = citizenResult.rows[0];
    if (!row) return false;

    const user = { id: row.citizen_id, username: row.username, role: "user", verified: row.verified };

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
};

//get all mainteiners by office_id
export const getMainteinerByOffice = async ( office_id ) => {
  const sql = `SELECT o.operator_id, o.username, c.name AS company_name
    FROM operators o LEFT JOIN companies c ON o.company_id = c.company_id
    WHERE o.role_id = (SELECT role_id FROM roles WHERE name = 'External maintainer') 
    AND o.office_id = $1`;  
  const result = await pool.query(sql,[office_id]);

  return result.rows.map(e => ({ id: e.operator_id, username: e.username, company: e.company_name }));
};

//get all technical officers by relation officer's office_id
export const getTechnicalOfficersByOffice = async (officeId) => {
  const sqlGetTechnicalOfficers = 'SELECT * FROM operators WHERE office_id = $1 AND role_id = (SELECT role_id FROM roles WHERE name = \'Technical office staff member\')';
  const resultOfficers = await pool.query(sqlGetTechnicalOfficers, [officeId]);

  return resultOfficers.rows
    .map((e) => ({ id: e.operator_id, email: e.email, username: e.username,office_id: e.office_id }));
}

//given username (email) and password does the login -> searches only in the onperators tables
export const getOperators = async (username, password) => {
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
};

//returns all operators with its data 
export const getAllOperators = async () => {
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
