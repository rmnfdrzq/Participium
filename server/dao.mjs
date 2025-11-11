import { Pool } from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';
import utils from './utils.mjs';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// console.log("Loaded dao.mjs and changed insertReport");



//given username (email) and password does the login -> searches in citizen and then onperators tables
export const getUser = async (username, password) => {
  try {
    const sql = 'SELECT * FROM "citizens" WHERE email = $1';
    const result = await pool.query(sql, [username]);

    const row = result.rows[0];
    if (!row) return await getOperators(username, password);

    const user = { id: row.citizen_id, username: row.username, type: "user" };

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

//given username (email) and password does the login -> searches only in the onperators tables
export const getOperators = async (username, password) => {
  try {
    const sql = 'SELECT * FROM "operators" WHERE email = $1';
    const result = await pool.query(sql, [username]);

    const row = result.rows[0];
    if (!row) return false;

    const user = { id: row.operator_id, username: row.username, type: "operator" };

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

//ginen user data creates a citizen
export const createUser = async (username, email,first_name,last_name , email_notifications, password) => {
  const salt = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, async (err, hashedPassword) => {
      if (err) return reject(err);

      const sql = 'INSERT INTO citizens (username, email,first_name,last_name, password_hash,email_notifications, salt) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING citizen_id';
      const values = [username, email,first_name,last_name, hashedPassword.toString('hex'),email_notifications, salt];

      try {
        const result = await pool.query(sql, values);
        resolve({ id: result.rows[0].citizen_id, username: username , first_name: first_name });
      } catch (err) {
        reject(err);
      }
    });
  });
};

//returns all default offices 
export const getAllOffices = async () => {
  try {
    const sql = 'SELECT * FROM offices';
    const result = await pool.query(sql);
    return result.rows.map((e) => {return { id: e.office_id, name: e.name};});
  } catch (err) {
    throw err;
  }
};

//returns all operators with its data 
export const getAllOperators = async () => {
  try {
    const sql = `
      SELECT o.operator_id, o.email, o.username, o.office_id, off.name as office_name
      FROM operators o
      LEFT JOIN offices off ON o.office_id = off.office_id
      ORDER BY o.operator_id DESC
    `;
    const result = await pool.query(sql);
    return result.rows.map((row) => ({
      id: row.operator_id,
      email: row.email,
      username: row.username,
      office_id: row.office_id,
      office_name: row.office_name,
      role: 'municipality_user'
    }));
  } catch (err) {
    throw err;
  }
};

export const insertReport = async ({ title, citizen_id, description, image_urls, latitude, longitude }) => {

  //console.log("Running updated insertReport with citizen_id:", citizen_id);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const reportSql = `
      INSERT INTO reports (citizen_id, title, description, latitude, longitude, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING report_id, citizen_id, title, description, latitude, longitude, created_at
    `;
    const reportValues = [citizen_id, title, description, latitude, longitude];
    const reportResult = await client.query(reportSql, reportValues);
    const report = reportResult.rows[0];

    const imagesSql = `
      INSERT INTO photos (report_id, image_url, uploaded_at)
      VALUES ($1, $2, NOW())
      RETURNING photo_id, report_id, image_url, uploaded_at
    `;
    const images = [];
    for (const url of image_urls){
      const imageResult = await client.query(imagesSql, [report.report_id, url]);
      images.push(imageResult.rows[0]);
    }

    await client.query('COMMIT');

    return { ...report, images };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

//given operator data creates an operator
export const createMunicipalityUser = async (email, username, password, office_id) => {
  const salt = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, async (err, hashedPassword) => {
      if (err) return reject(err);

      const sql = `
        INSERT INTO operators (email, username, password_hash, salt, office_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING operator_id
      `;
      const values = [email, username, hashedPassword.toString('hex'), salt, office_id];

      try {
        const result = await pool.query(sql, values);
        resolve({ id: result.rows[0].operator_id, username });
      } catch (err) {
        reject(err);
      }
    });
  });
};


// returns all categories
export const getAllCategories = async () => {
  try {
    const sql = 'SELECT * FROM categories';
    const result = await pool.query(sql);
    
    return result.rows.map((e) => ({
      id: e.category_id,
      name: e.name,
      office_id: e.office_id
    }));
  } catch (err) {
    throw err;
  }
};

