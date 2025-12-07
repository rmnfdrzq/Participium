import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

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
