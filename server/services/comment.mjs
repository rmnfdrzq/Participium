import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

/**
 * Add an internal comment to a report (operators only)
 * @param {number} report_id - The report ID
 * @param {number} sender_operator_id - The operator ID who is sending the comment
 * @param {string} content - The comment content
 * @returns {object} The created comment
 */
export const addInternalComment = async (
  report_id,
  sender_operator_id,
  content
) => {
  const sql = `
    INSERT INTO internal_comment (report_id, sender_operator_id, content, created_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING internal_comment_id, report_id, sender_operator_id, content, created_at
  `;

  const result = await pool.query(sql, [
    report_id,
    sender_operator_id,
    content,
  ]);
  return result.rows[0];
};

/**
 * Get all internal comments for a report
 * @param {number} report_id - The report ID
 * @returns {array} List of internal comments with sender info
 */
export const getInternalComments = async (report_id) => {
  const sql = `
    SELECT 
      ic.internal_comment_id,
      ic.report_id,
      ic.content,
      ic.created_at,
      ic.sender_operator_id,
      o.username as sender_username,
      o.email as sender_email,
      r.name as sender_role
    FROM internal_comment ic
    JOIN operators o ON ic.sender_operator_id = o.operator_id
    JOIN roles r ON o.role_id = r.role_id
    WHERE ic.report_id = $1
    ORDER BY ic.created_at ASC
  `;

  const result = await pool.query(sql, [report_id]);
  return result.rows.map((row) => ({
    id: row.internal_comment_id,
    report_id: row.report_id,
    content: row.content,
    created_at: row.created_at,
    sender: {
      id: row.sender_operator_id,
      username: row.sender_username,
      email: row.sender_email,
      role: row.sender_role,
    },
  }));
};

/**
 * Add a public message to a report (citizen <-> operator communication)
 * @param {number} report_id - The report ID
 * @param {string} sender_type - Either 'citizen' or 'operator'
 * @param {number} sender_id - The sender's ID (citizen_id or operator_id)
 * @param {string} content - The message content
 * @returns {object} The created message
 */
export const addMessage = async (
  report_id,
  sender_type,
  sender_id,
  content
) => {
  const sql = `
    INSERT INTO messages (report_id, sender_type, sender_id, content, sent_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING message_id, report_id, sender_type, sender_id, content, sent_at
  `;

  const result = await pool.query(sql, [
    report_id,
    sender_type,
    sender_id,
    content,
  ]);
  return result.rows[0];
};

/**
 * Get all public messages for a report
 * @param {number} report_id - The report ID
 * @returns {array} List of messages
 */
export const getMessages = async (report_id) => {
  const sql = `
    SELECT 
      m.message_id,
      m.report_id,
      m.sender_type,
      m.sender_id,
      m.content,
      m.sent_at
    FROM messages m
    WHERE m.report_id = $1
    ORDER BY m.sent_at ASC
  `;

  const result = await pool.query(sql, [report_id]);
  return result.rows.map((row) => ({
    id: row.message_id,
    report_id: row.report_id,
    sender_type: row.sender_type,
    sender_id: row.sender_id,
    content: row.content,
    sent_at: row.sent_at,
  }));
};
