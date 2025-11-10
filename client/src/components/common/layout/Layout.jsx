import { Outlet } from "react-router";
import { Header } from "../header/Header";
import { Footer } from "../footer/Footer";
import styles from "./layout.module.css";

export function DefaultLayout(props) {
  return (
    <div className={styles.pageLayout}>
      <Header user={props.user} handleLogout={props.handleLogout} />

      <div className={styles.contentArea}>
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}
