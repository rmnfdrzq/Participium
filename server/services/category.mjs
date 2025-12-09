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

// returns all categories
export const getAllCategories = async () => {
    const sql = 'SELECT * FROM categories';
    const result = await pool.query(sql);

    return result.rows.map((e) => ({
      id: e.category_id,
      name: e.name,
      office_id: e.office_id
    }));
};

