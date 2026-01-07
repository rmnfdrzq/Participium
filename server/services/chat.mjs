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
 * Get all chats for a citizen (reports they created with message history)
 * @param {number} citizen_id - The citizen ID
 * @returns {array} List of chats with last message and unread count
 */
export const getChatsByCitizen = async (citizen_id) => {
  const sql = `
    SELECT 
      r.report_id,
      r.title,
      r.status_id,
      s.name as status_name,
      r.created_at as report_created_at,
      (
        SELECT json_build_object(
          'content', m.content,
          'sender_type', m.sender_type,
          'sent_at', m.sent_at
        )
        FROM messages m
        WHERE m.report_id = r.report_id
        ORDER BY m.sent_at DESC
        LIMIT 1
      ) as last_message,
      (
        SELECT COUNT(*)::int
        FROM messages m
        WHERE m.report_id = r.report_id
      ) as message_count,
      (
        SELECT MAX(m.sent_at)
        FROM messages m
        WHERE m.report_id = r.report_id
      ) as last_activity,
      (
        SELECT COUNT(*)::int
        FROM messages m
        WHERE m.report_id = r.report_id
        AND m.sender_type != 'citizen'
        AND m.sent_at > COALESCE(
          (SELECT last_read_at FROM chat_reads cr 
           WHERE cr.user_type = 'citizen' AND cr.user_id = $1 AND cr.report_id = r.report_id),
          '1970-01-01'::timestamp
        )
      ) as unread_count
    FROM reports r
    JOIN statuses s ON r.status_id = s.status_id
    WHERE r.citizen_id = $1
    AND r.status_id NOT IN (1, 5)
    ORDER BY 
      COALESCE(
        (SELECT MAX(m.sent_at) FROM messages m WHERE m.report_id = r.report_id),
        r.created_at
      ) DESC
  `;

  const result = await pool.query(sql, [citizen_id]);
  return result.rows.map((row) => ({
    report_id: row.report_id,
    title: row.title,
    status_id: row.status_id,
    status_name: row.status_name,
    report_created_at: row.report_created_at,
    last_message: row.last_message,
    message_count: row.message_count,
    last_activity: row.last_activity || row.report_created_at,
    unread_count: row.unread_count || 0,
  }));
};

/**
 * Get all chats for an operator (reports assigned to them)
 * @param {number} operator_id - The operator ID
 * @param {string} role - The operator role
 * @returns {array} List of chats with last message and unread count
 */
export const getChatsByOperator = async (operator_id, role) => {
  let whereClause;
  
  if (role === "External maintainer") {
    whereClause = "r.assigned_to_external_id = $1";
  } else {
    whereClause = "r.assigned_to_operator_id = $1";
  }

  const sql = `
    SELECT 
      r.report_id,
      r.title,
      r.status_id,
      s.name as status_name,
      r.created_at as report_created_at,
      c.citizen_id,
      c.username as citizen_username,
      (
        SELECT json_build_object(
          'content', m.content,
          'sender_type', m.sender_type,
          'sent_at', m.sent_at
        )
        FROM messages m
        WHERE m.report_id = r.report_id
        ORDER BY m.sent_at DESC
        LIMIT 1
      ) as last_message,
      (
        SELECT COUNT(*)::int
        FROM messages m
        WHERE m.report_id = r.report_id
      ) as message_count,
      (
        SELECT MAX(m.sent_at)
        FROM messages m
        WHERE m.report_id = r.report_id
      ) as last_activity,
      (
        SELECT COUNT(*)::int
        FROM messages m
        WHERE m.report_id = r.report_id
        AND m.sender_type != 'operator'
        AND m.sent_at > COALESCE(
          (SELECT last_read_at FROM chat_reads cr 
           WHERE cr.user_type = 'operator' AND cr.user_id = $1 AND cr.report_id = r.report_id),
          '1970-01-01'::timestamp
        )
      ) as unread_count
    FROM reports r
    JOIN statuses s ON r.status_id = s.status_id
    LEFT JOIN citizens c ON r.citizen_id = c.citizen_id
    WHERE ${whereClause}
    AND r.status_id NOT IN (1, 5)
    ORDER BY 
      COALESCE(
        (SELECT MAX(m.sent_at) FROM messages m WHERE m.report_id = r.report_id),
        r.created_at
      ) DESC
  `;

  const result = await pool.query(sql, [operator_id]);
  return result.rows.map((row) => ({
    report_id: row.report_id,
    title: row.title,
    status_id: row.status_id,
    status_name: row.status_name,
    report_created_at: row.report_created_at,
    citizen: row.citizen_id ? {
      id: row.citizen_id,
      username: row.citizen_username,
    } : null,
    last_message: row.last_message,
    message_count: row.message_count,
    last_activity: row.last_activity || row.report_created_at,
    unread_count: row.unread_count || 0,
  }));
};

/**
 * Get chat details by report ID
 * @param {number} report_id - The report ID
 * @returns {object} Chat details
 */
export const getChatDetails = async (report_id) => {
  const sql = `
    SELECT 
      r.report_id,
      r.title,
      r.description,
      r.status_id,
      s.name as status_name,
      r.created_at,
      r.citizen_id,
      c.username as citizen_username,
      r.assigned_to_operator_id,
      op.username as operator_username,
      r.assigned_to_external_id,
      ext.username as external_username
    FROM reports r
    JOIN statuses s ON r.status_id = s.status_id
    LEFT JOIN citizens c ON r.citizen_id = c.citizen_id
    LEFT JOIN operators op ON r.assigned_to_operator_id = op.operator_id
    LEFT JOIN operators ext ON r.assigned_to_external_id = ext.operator_id
    WHERE r.report_id = $1
  `;

  const result = await pool.query(sql, [report_id]);
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    report_id: row.report_id,
    title: row.title,
    description: row.description,
    status_id: row.status_id,
    status_name: row.status_name,
    created_at: row.created_at,
    citizen: row.citizen_id ? {
      id: row.citizen_id,
      username: row.citizen_username,
    } : null,
    operator: row.assigned_to_operator_id ? {
      id: row.assigned_to_operator_id,
      username: row.operator_username,
    } : null,
    external: row.assigned_to_external_id ? {
      id: row.assigned_to_external_id,
      username: row.external_username,
    } : null,
  };
};

/**
 * Get report participants (citizen and operator IDs) for WebSocket emission
 * @param {number} report_id - The report ID
 * @returns {object} Object with citizen_id, operator_id, external_id
 */
export const getReportParticipants = async (report_id) => {
  const sql = `
    SELECT 
      citizen_id,
      assigned_to_operator_id as operator_id,
      assigned_to_external_id as external_id
    FROM reports
    WHERE report_id = $1
  `;

  const result = await pool.query(sql, [report_id]);
  if (result.rows.length === 0) return null;
  return result.rows[0];
};

/**
 * Mark a chat as read for a user (updates last_read_at timestamp)
 * @param {string} userType - 'citizen' or 'operator'
 * @param {number} userId - The user's ID
 * @param {number} reportId - The report/chat ID
 */
export const markChatAsRead = async (userType, userId, reportId) => {
  const sql = `
    INSERT INTO chat_reads (user_type, user_id, report_id, last_read_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_type, user_id, report_id)
    DO UPDATE SET last_read_at = NOW()
    RETURNING *
  `;

  const result = await pool.query(sql, [userType, userId, reportId]);
  return result.rows[0];
};

/**
 * Get total unread message count for a user across all chats
 * @param {string} userType - 'citizen' or 'operator'
 * @param {number} userId - The user's ID
 * @returns {number} Total unread count
 */
export const getTotalUnreadCount = async (userType, userId) => {
  let sql;
  
  if (userType === 'citizen') {
    sql = `
      SELECT COALESCE(SUM(unread), 0)::int as total
      FROM (
        SELECT 
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.report_id = r.report_id
            AND m.sender_type != 'citizen'
            AND m.sent_at > COALESCE(
              (SELECT last_read_at FROM chat_reads cr 
               WHERE cr.user_type = 'citizen' AND cr.user_id = $1 AND cr.report_id = r.report_id),
              '1970-01-01'::timestamp
            )
          ) as unread
        FROM reports r
        WHERE r.citizen_id = $1
        AND r.status_id NOT IN (1, 5)
      ) sub
    `;
  } else {
    sql = `
      SELECT COALESCE(SUM(unread), 0)::int as total
      FROM (
        SELECT 
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.report_id = r.report_id
            AND m.sender_type != 'operator'
            AND m.sent_at > COALESCE(
              (SELECT last_read_at FROM chat_reads cr 
               WHERE cr.user_type = 'operator' AND cr.user_id = $1 AND cr.report_id = r.report_id),
              '1970-01-01'::timestamp
            )
          ) as unread
        FROM reports r
        WHERE (r.assigned_to_operator_id = $1 OR r.assigned_to_external_id = $1)
        AND r.status_id NOT IN (1, 5)
      ) sub
    `;
  }

  const result = await pool.query(sql, [userId]);
  return result.rows[0]?.total || 0;
};

