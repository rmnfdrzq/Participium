import { Link } from "react-router";
import styles from "./footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          <div className={styles.footerSection}>
            <h4>Participium</h4>
            <p>Citizen participation platform of the Municipality of Turin</p>
          </div>
          <div className={styles.footerSection}>
            <h4>Contact</h4>
            <p>Email: info@participium.torino.it</p>
            <p>Tel: +39 011 XXX XXXX</p>
          </div>
          <div className={styles.footerSection}>
            <h4>Useful Links</h4>
            <p><Link to="/login">Login</Link></p>
            <p><Link to="/signup">Register</Link></p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; 2025 Municipality of Turin - Participium. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

