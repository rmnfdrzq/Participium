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
      office: e.office
    }));
};

// returns all categories of a company
export const getCompanyCategories = async (companyId) => {
    const sql = `
      SELECT c.category_id as id, c.name, c.office
      FROM categories c
      INNER JOIN company_categories cc ON c.category_id = cc.category_id
      WHERE cc.company_id = $1
      ORDER BY c.name
    `;
    
    const result = await pool.query(sql, [companyId]);

    return result.rows.map((e) => ({
      id: e.id,
      name: e.name,
      office: e.office
    }));
};
