import dotenv from 'dotenv';
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'alan.okeefe54@ethereal.email',
        pass: 'dnyNWufZpf4PZ9EvtB'
    }
});




export const sendEmail = async (to, subject, text) => {
    const info = await transporter.sendMail({
      from: `"Participium" <alan.okeefe54@ethereal.email>`,
      to,
      subject,
      text,
    });

    return info;
};
