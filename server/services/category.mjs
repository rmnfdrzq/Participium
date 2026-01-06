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

// Get all category IDs associated with an operator
export const getCategoriesByOperator = async (operator_id) => {
  const sql = `
    SELECT category_id 
    FROM operator_categories 
    WHERE operator_id = $1
    ORDER BY category_id
  `;
  
  const result = await pool.query(sql, [operator_id]);
  
  // Se non ci sono categorie associate, ritorna [1]
  if (result.rows.length === 0) {
    return [1];
  }
  
  return result.rows.map(row => row.category_id);
};
