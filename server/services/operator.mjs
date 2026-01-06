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
export const getMainteinerByOffice = async ( category_id ) => {
  const sql = `SELECT DISTINCT o.operator_id, o.username, c.name AS company_name
    FROM operators o 
    LEFT JOIN companies c ON o.company_id = c.company_id
    LEFT JOIN operator_categories oc ON o.operator_id = oc.operator_id
    WHERE o.role_id = (SELECT role_id FROM roles WHERE name = 'External maintainer') 
    AND oc.category_id = $1`;
  const result = await pool.query(sql,[category_id]);

  return result.rows.map(e => ({ id: e.operator_id, username: e.username, company: e.company_name }));
};

//get all technical officers by relation officer's office_id
export const getTechnicalOfficersByOffice = async (category_id) => {
  const sqlGetTechnicalOfficers = `SELECT DISTINCT o.operator_id, o.email, o.username
    FROM operators o
    LEFT JOIN operator_categories oc ON o.operator_id = oc.operator_id
    WHERE oc.category_id = $1 
    AND o.role_id = (SELECT role_id FROM roles WHERE name = 'Technical office staff member')`;
  const resultOfficers = await pool.query(sqlGetTechnicalOfficers, [category_id]);

  return resultOfficers.rows
    .map((e) => ({ id: e.operator_id, email: e.email, username: e.username}));
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
      SELECT o.operator_id, o.email, o.username, r.name as role_name, 
      COALESCE(
          json_agg(DISTINCT c.office) FILTER (WHERE c.office IS NOT NULL),
          '[]'
        ) as offices
      FROM operators o
      LEFT JOIN roles r ON o.role_id = r.role_id
      LEFT JOIN operator_categories oc ON o.operator_id = oc.operator_id
      LEFT JOIN categories c ON oc.category_id = c.category_id
      GROUP BY o.operator_id, o.email, o.username, r.name
      ORDER BY o.operator_id DESC
    `;
    const result = await pool.query(sql);
    return result.rows.map((row) => ({
      id: row.operator_id,
      email: row.email,
      username: row.username,
      role: row.role_name,
      offices: row.offices
    }));
};

//given operator data creates an operator
export const createMunicipalityUser = async (email, username, password,role_id, company_id) => {
  const salt = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, async (err, hashedPassword) => {
      if (err) return reject(err);

      const sql = `
        INSERT INTO operators (email, username, password_hash, salt, role_id, company_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING operator_id
      `;
      const values = [email, username, hashedPassword.toString('hex'), salt, role_id,company_id];

      try {
        const result = await pool.query(sql, values);
        resolve({ id: result.rows[0].operator_id, username });
      } catch (err) {
        reject(err);
      }
    });
  });
};

// Add a category to an operator (only if operator is Technical staff and his company manages the category)
export const addOperatorCategory = async (operator_id, category_id) => {
  // Check operator exists and is Technical office staff member, and get company_id
  const opSql = `SELECT o.operator_id, o.company_id, r.name as role_name
    FROM operators o JOIN roles r ON o.role_id = r.role_id
    WHERE o.operator_id = $1`;
  const opRes = await pool.query(opSql, [operator_id]);
  const op = opRes.rows[0];
  if (!op) throw { status: 404, message: 'Operator not found' };
  if (op.role_name !== 'Technical office staff member' && op.role_name !== 'External maintainer') throw { status: 422, message: 'Operator is not a technical staff member or an external mainteiner' };

  // Check company manages the category
  const compSql = `SELECT 1 FROM company_categories WHERE company_id = $1 AND category_id = $2`;
  const compRes = await pool.query(compSql, [op.company_id, category_id]);
  if (compRes.rows.length === 0) throw { status: 422, message: 'Company does not manage this category' };

  // Insert association
  const insertSql = `INSERT INTO operator_categories (operator_id, category_id) VALUES ($1, $2) RETURNING operator_id, category_id`;
  try {
    const ins = await pool.query(insertSql, [operator_id, category_id]);
    return ins.rows[0];
  } catch (err) {
    // Unique violation
    if (err.code === '23505') throw { status: 409, message: 'Operator already has this category' };
    throw err;
  }
};

// Remove a category from an operator (only if operator is Technical staff member)
export const removeOperatorCategory = async (operator_id, category_id) => {
  // Check operator exists and is Technical office staff member
  const opSql = `SELECT o.operator_id, r.name as role_name FROM operators o JOIN roles r ON o.role_id = r.role_id WHERE o.operator_id = $1`;
  const opRes = await pool.query(opSql, [operator_id]);
  const op = opRes.rows[0];
  if (!op) throw { status: 404, message: 'Operator not found' };
  if (op.role_name !== 'Technical office staff member' && op.role_name !== 'External maintainer') throw { status: 422, message: 'Operator is not a technical staff member or an external mainteiner' };

  const delSql = `DELETE FROM operator_categories WHERE operator_id = $1 AND category_id = $2 RETURNING operator_id`;
  const delRes = await pool.query(delSql, [operator_id, category_id]);
  if (delRes.rows.length === 0) throw { status: 404, message: 'Operator-category association not found' };
  return { operator_id, category_id };
};
