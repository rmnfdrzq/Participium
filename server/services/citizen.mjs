import { Pool } from "pg";
import crypto from "crypto";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  }
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

//ginen user data creates a citizen
export const createUser = async (
  username,
  email,
  first_name,
  last_name,
  email_notifications,
  password
) => {
  const salt = crypto.randomBytes(16).toString("hex");

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, async (err, hashedPassword) => {
      if (err) return reject(err);

      const sql =
        "INSERT INTO citizens (username, email,first_name,last_name, password_hash,email_notifications, salt) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING citizen_id";
      const values = [
        username,
        email,
        first_name,
        last_name,
        hashedPassword.toString("hex"),
        email_notifications,
        salt,
      ];

      try {
        const result = await pool.query(sql, values);
        resolve({
          id: result.rows[0].citizen_id,
          username: username,
          first_name: first_name,
        });
      } catch (err) {
        reject(err);
      }
    });
  });
};

export const getUserInfoById = async (userId) => {
  try {
    const sql =
      "SELECT email, username, first_name, last_name, profile_photo_url, telegram_username, email_notifications, verified from citizens WHERE citizen_id = $1";
    const result = await pool.query(sql, [userId]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

export const updateUserById = async (userId, updates) => {
  try {
    const keys = Object.keys(updates);
    if (keys.length === 0) return null;

    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");

    const values = keys.map((key) => updates[key]);

    const sql = `
      UPDATE citizens
      SET ${setClause}
      WHERE citizen_id = $${keys.length + 1}
      RETURNING *;
    `;

    values.push(userId);

    const result = await pool.query(sql, values);
    return result.rows[0];
  } catch (err) {
    throw err;
  }
};

const sendEmail = async (to, subject, text) => {
  try {
    const info = await transporter.sendMail({
       from: `"Participium" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
    });

    return info;
  } catch (err) {
    throw err;
  }
};

export const generateEmailVerificationCode = async (userId) => {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expires_at = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Check if there's an existing code for the user and delete it
    const deleteSql = "DELETE FROM verification_codes WHERE citizen_id = $1";
    await pool.query(deleteSql, [userId]);

    // Insert new citizen-code pair
    const sql = `
      INSERT INTO verification_codes (citizen_id, code, created_at, expires_at)
      VALUES ($1, $2, NOW(), $3);
    `;
    await pool.query(sql, [userId, code, expires_at]);

    // Send the code via email
    const userInfo = await getUserInfoById(userId);
    if (userInfo) {
      await sendEmail(
        userInfo.email,
        "Your Email Verification Code",
        `Your verification code is: ${code}`
      );
    }

    return expires_at;
  } catch (err) {
    throw err;
  }
};

export const verifyEmailCode = async (userId, code) => {
  try {
    const sql = `
      SELECT * FROM verification_codes
      WHERE citizen_id = $1 AND code = $2 AND expires_at > NOW()
    `;
    const result = await pool.query(sql, [userId, code]);
    if (result.rows.length === 0) {
      return false;
    }
    const updateSql = `
      UPDATE citizens
      SET verified = TRUE
      WHERE citizen_id = $1
    `;
    await pool.query(updateSql, [userId]);
    if (result.rows.length === 0) {
      return false;
    }
    // Delete the code after successful verification
    const deleteSql = "DELETE FROM verification_codes WHERE citizen_id = $1";
    await pool.query(deleteSql, [userId]);
    return true;
  } catch (err) {
    throw err;
  }
};
