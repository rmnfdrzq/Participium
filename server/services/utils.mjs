import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.ETHEREAL_HOST || "smtp.ethereal.email",
  port: 587,
  secure: false, // Port 587 uses STARTTLS, not implicit TLS
  requireTLS: true, // Require TLS upgrade
  auth: {
    user: process.env.ETHEREAL_USER,
    pass: process.env.ETHEREAL_PASS,
  },
  tls: {
    rejectUnauthorized: true, // Verify server certificate
  },
});

export const sendEmail = async (to, subject, text) => {
  const info = await transporter.sendMail({
    from: `"Participium" <${process.env.ETHEREAL_USER}>`,
    to,
    subject,
    text,
  });

  return info;
};
