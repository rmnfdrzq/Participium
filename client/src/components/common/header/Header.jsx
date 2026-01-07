import { useState, useRef, useEffect } from "react";
import logo from "../../../images/logo.svg";
import styles from "./header.module.css";
import { Link, useNavigate } from "react-router";
import { useSocket } from "../../../context/SocketContext";
import API from "../../../API/API.js";

export function Header(props) {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  const isCitizen = props.user?.role === "user";
  const isTechOfficer = props.user?.role === "Technical office staff member" || props.user?.role === "External maintainer";
  const canAccessChats = isCitizen || isTechOfficer;
  const citizenProfile = props.citizenProfile;

  // Load notifications for citizens
  useEffect(() => {
    if (!isCitizen) return;

    const loadNotifications = async () => {
      try {
        const [notifs, countData] = await Promise.all([
          API.getNotifications(),
          API.getUnreadNotificationCount(),
        ]);
        setNotifications(notifs);
        setUnreadCount(countData.count);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };

    loadNotifications();
  }, [isCitizen]);

  // Load unread messages count from database
  useEffect(() => {
    if (!canAccessChats) return;

    const loadUnreadMessagesCount = async () => {
      try {
        const data = await API.getUnreadMessagesCount();
        setUnreadMessagesCount(data.count);
      } catch (error) {
        console.error("Failed to load unread messages count:", error);
      }
    };

    loadUnreadMessagesCount();
  }, [canAccessChats]);

  // Listen for new notifications via WebSocket
  useEffect(() => {
    if (!socket || !isCitizen) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("new_notification", handleNewNotification);

    return () => {
      socket.off("new_notification", handleNewNotification);
    };
  }, [socket, isCitizen]);

  // Track processed message IDs to prevent duplicate badge increments
  const processedMessageIds = useRef(new Set());

  // Listen for chat-read events to decrease unread count
  useEffect(() => {
    if (!canAccessChats) return;

    const handleChatRead = (event) => {
      const { count } = event.detail;
      setUnreadMessagesCount((prev) => Math.max(0, prev - count));
    };

    window.addEventListener('chat-read', handleChatRead);

    return () => {
      window.removeEventListener('chat-read', handleChatRead);
    };
  }, [canAccessChats]);

  // Listen for new messages via WebSocket
  useEffect(() => {
    if (!socket || !canAccessChats) return;

    const handleNewMessage = (message) => {
      // Skip if we've already processed this message (prevent duplicates from multiple rooms)
      if (processedMessageIds.current.has(message.id)) {
        return;
      }
      processedMessageIds.current.add(message.id);

      // Skip if this message is from the current user (they sent it)
      const isFromMe = (isCitizen && message.sender_type === "citizen") ||
                       (isTechOfficer && message.sender_type === "operator");
      if (isFromMe) {
        return;
      }

      // Check if user is currently viewing this specific chat
      const urlParams = new URLSearchParams(window.location.search);
      const activeReportId = urlParams.get("reportId");
      const isViewingThisChat = window.location.pathname.includes("/chats") && 
                                activeReportId && 
                                parseInt(activeReportId, 10) === message.report_id;

      // Only increment if not currently viewing this chat
      if (!isViewingThisChat) {
        setUnreadMessagesCount((prev) => prev + 1);
      }
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, canAccessChats, isCitizen, isTechOfficer]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = () => {
    if (isCitizen && citizenProfile) {
      const first = citizenProfile.first_name?.[0] || "";
      const last = citizenProfile.last_name?.[0] || "";
      if (first || last) return (first + last).toUpperCase();
    }
    return props.user?.username?.[0]?.toUpperCase() || "?";
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const markAsSeen = async (notificationId) => {
    try {
      await API.markNotificationAsSeen(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, seen: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as seen:", error);
    }
  };

  const markAllAsSeen = async () => {
    try {
      await API.markAllNotificationsAsSeen();
      setNotifications((prev) => prev.map((n) => ({ ...n, seen: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as seen:", error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.seen) {
      markAsSeen(notification.id);
    }
    setIsNotifOpen(false);
    // Navigate to map with report_id to focus on the specific marker
    navigate(`/map?reportId=${notification.report_id}`);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLogoContainer}>
        <img src={logo} alt="Logo" className={styles.headerLogo} />

        <Link to={"/"} className={styles.headerBrand}>
          Participium
        </Link>
      </div>
      {props.user && (
        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <div className={styles.headerGreeting}>
              Hello,{" "}
              {props.user.username || props.user.name || props.user.email}
            </div>

            {/* Notification bell - only for citizens */}
            {isCitizen && (
              <div className={styles.notificationContainer} ref={notifRef}>
                <button
                  className={styles.notificationButton}
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  aria-label="Notifications"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className={styles.notificationBadge}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className={styles.notificationDropdown}>
                    <div className={styles.notificationHeader}>
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsSeen}>Mark all read</button>
                      )}
                    </div>

                    <div className={styles.notificationList}>
                      {notifications.length === 0 ? (
                        <div className={styles.noNotifications}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notif) => (
                          <div
                            key={notif.id}
                            className={`${styles.notificationItem} ${
                              !notif.seen ? styles.unread : ""
                            }`}
                            onClick={() => handleNotificationClick(notif)}
                          >
                            <p>{notif.message}</p>
                            <small>{formatTime(notif.sent_at)}</small>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Avatar with dropdown menu */}
            <div className={styles.avatarContainer} ref={menuRef}>
              <div
                className={styles.headerAvatar}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                title="Menu"
              >
                {isCitizen && citizenProfile?.profile_photo_url ? (
                  <img
                    src={citizenProfile.profile_photo_url}
                    alt="Avatar"
                    className={styles.headerAvatarImg}
                  />
                ) : (
                  <span className={styles.headerAvatarInitials}>
                    {getInitials()}
                  </span>
                )}
                {/* Unread messages badge on avatar */}
                {canAccessChats && unreadMessagesCount > 0 && (
                  <span className={styles.avatarBadge}>
                    {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                  </span>
                )}
              </div>

              {isMenuOpen && (
                <div className={styles.avatarDropdown}>
                  {/* Messages button for citizens and tech officers */}
                  {canAccessChats && (
                    <button
                      className={styles.dropdownItem}
                      onClick={() => {
                        navigate("/chats");
                        setIsMenuOpen(false);
                      }}
                    >
                      Messages
                      {unreadMessagesCount > 0 && (
                        <span className={styles.dropdownBadge}>
                          {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                        </span>
                      )}
                    </button>
                  )}
                  {isCitizen && (
                    <button
                      className={styles.dropdownItem}
                      onClick={() => {
                        navigate("/profile");
                        setIsMenuOpen(false);
                      }}
                    >
                      Edit profile
                    </button>
                  )}
                  <button
                    className={`${styles.dropdownItem} ${styles.logoutItem}`}
                    onClick={() => {
                      props.onLogoutClick();
                      setIsMenuOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
