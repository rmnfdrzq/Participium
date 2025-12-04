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

//get all technical officers by relation officer's office_id
export const getTechnicalOfficersByOffice = async (officeId) => {
  const sqlGetTechnicalOfficers = 'SELECT * FROM operators WHERE office_id = $1 AND role_id = (SELECT role_id FROM roles WHERE name = \'Technical office staff member\')';
  const resultOfficers = await pool.query(sqlGetTechnicalOfficers, [officeId]);

  return resultOfficers.rows
    .map((e) => ({ id: e.operator_id, email: e.email, username: e.username,office_id: e.office_id }));
}

