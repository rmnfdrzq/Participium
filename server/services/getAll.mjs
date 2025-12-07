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


//returns all default offices 
export const getAllOffices = async () => {
  try {
    const sql = 'SELECT * FROM offices';
    const result = await pool.query(sql);
    return result.rows.map((e) => { return { id: e.office_id, name: e.name }; });
  } catch (err) {
    throw err;
  }
};

//returns all roles
export const getAllRoles = async () => {
  try {
    const sql = ' SELECT * FROM roles';
    const result = await pool.query(sql);
    return result.rows.map((e) => { return { id: e.role_id, name: e.name }; });
  } catch (err) {
    throw err;
  }
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

