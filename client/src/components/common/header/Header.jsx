import { useState, useEffect, useRef } from "react";
import logo from "../../../images/logo.svg";
import styles from "./header.module.css";
import { Link } from "react-router";

export function Header(props) {
  const [showLogout, setShowLogout] = useState(false);
  const userSectionRef = useRef(null);
  const popupRef = useRef(null);

  const handleLogoutClick = async () => {
    if (props.handleLogout) {
      await props.handleLogout();
    }
    setShowLogout(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showLogout &&
        userSectionRef.current &&
        popupRef.current &&
        !userSectionRef.current.contains(event.target) &&
        !popupRef.current.contains(event.target)
      ) {
        setShowLogout(false);
      }
    };

    if (showLogout) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLogout]);


  return (
    <header className={styles.header}>
      <div className={styles.headerLogoContainer}>
        <img src={logo} alt="Logo" className={styles.headerLogo} />

        <span className={styles.headerBrand}>
          <Link to={"/"} className="navbar-brand">Participium</Link>
        </span>
      </div>
      {props.user && (
        <div className={`${styles.userSection} pointer`} ref={userSectionRef}>
          <div
            className={styles.headerGreeting}
            onClick={() => setShowLogout(!showLogout)}
          >
            Hello, {props.user.username || props.user.name || props.user.email}
          </div>
          {showLogout && (
            <div className={styles.logoutPopup} ref={popupRef}>
              <button
                className={styles.logoutButton}
                onClick={handleLogoutClick}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
