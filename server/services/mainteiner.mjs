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

//get all mainteiners by office_id
export const getMainteinerByOffice = async (officeId) => {
  const sql = `SELECT o.operator_id, o.username, c.name AS company_name
    FROM operators o LEFT JOIN companies c ON o.company_id = c.company_id
    WHERE o.office_id = $1 AND o.role_id = (SELECT role_id FROM roles WHERE name = 'External maintainer')`;

  const result = await pool.query(sql, [officeId]);

  return result.rows.map(e => ({ id: e.operator_id, username: e.username, company: e.company_name }));
};

