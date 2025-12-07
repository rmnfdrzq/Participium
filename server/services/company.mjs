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

// returns all companies /api/companies
export const getAllCompanies = async () => {
  try {
    const sql = 'SELECT * FROM companies';
    const result = await pool.query(sql);

    return result.rows.map((e) => ({ id: e.company_id,name: e.name, description: e.description}));
  } catch (err) {
    throw err;
  }
};
