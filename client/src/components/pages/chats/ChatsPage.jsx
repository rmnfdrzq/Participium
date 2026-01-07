import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useSocket } from "../../../context/SocketContext";
import API from "../../../API/API.js";
import styles from "./chatsPage.module.css";

/**
 * Chats page component - displays list of chats and chat messages
 * @param {Object} props - Component props
 * @param {Object} props.user - Current logged in user
 * @returns {JSX.Element} ChatsPage component
 */
export default function ChatsPage({ user }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { socket } = useSocket();
  
  const [chats, setChats] = useState([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Get report ID from URL params
  const activeReportId = searchParams.get("reportId");

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load chats list
  useEffect(() => {
    const loadChats = async () => {
      try {
        setIsLoadingChats(true);
        const data = await API.getChats();
        setChats(data);
      } catch (err) {
        console.error("Failed to load chats:", err);
        setError("Failed to load chats");
      } finally {
        setIsLoadingChats(false);
      }
    };

    loadChats();
  }, []);

  // Load chat details when reportId changes
  useEffect(() => {
    if (!activeReportId) {
      setSelectedChat(null);
      setMessages([]);
      return;
    }

    const loadChatDetails = async () => {
      try {
        setIsLoadingMessages(true);
        setError(null);
        const data = await API.getChatDetails(activeReportId);
        setSelectedChat(data);
        setMessages(data.messages || []);
        
        // Reset unread count for this chat in local state (server already marked as read)
        setChats((prev) => {
          const targetChat = prev.find(c => c.report_id === parseInt(activeReportId, 10));
          const readCount = targetChat?.unread_count || 0;
          
          // Dispatch event to update header badge
          if (readCount > 0) {
            window.dispatchEvent(new CustomEvent('chat-read', { detail: { count: readCount } }));
          }
          
          return prev.map((chat) =>
            chat.report_id === parseInt(activeReportId, 10)
              ? { ...chat, unread_count: 0 }
              : chat
          );
        });
        
        // Focus on input after loading
        setTimeout(() => {
          inputRef.current?.focus();
          scrollToBottom();
        }, 100);
      } catch (err) {
        console.error("Failed to load chat details:", err);
        setError("Failed to load chat");
        setSelectedChat(null);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadChatDetails();
  }, [activeReportId, scrollToBottom]);

  // Join socket room when chat is selected
  useEffect(() => {
    if (!socket || !activeReportId) return;

    socket.emit("join_report", activeReportId);

    return () => {
      socket.emit("leave_report", activeReportId);
    };
  }, [socket, activeReportId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      // Only add if it's for the current chat and not already in the list (deduplication)
      if (message.report_id === parseInt(activeReportId, 10)) {
        setMessages((prev) => {
          // Check if message already exists (prevent duplicates from multiple rooms)
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
        scrollToBottom();
      }
      
      // Update last message in chats list (with deduplication check)
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.report_id !== message.report_id) return chat;
          // Skip if this message is already the last message
          if (chat.last_message?.sent_at === message.sent_at && 
              chat.last_message?.content === message.content) {
            return chat;
          }
          
          // Increment unread count if:
          // - This chat is NOT currently open
          // - For citizens: message is from operator (including system messages)
          // - For operators: message is from citizen
          const isCurrentChat = message.report_id === parseInt(activeReportId, 10);
          const isFromOther = user.role === "user" 
            ? message.sender_type === "operator"
            : message.sender_type === "citizen";
          const shouldIncrementUnread = !isCurrentChat && isFromOther;
          
          return {
            ...chat,
            last_message: {
              content: message.content,
              sender_type: message.sender_type,
              sent_at: message.sent_at,
            },
            message_count: chat.message_count + 1,
            last_activity: message.sent_at,
            unread_count: shouldIncrementUnread 
              ? (chat.unread_count || 0) + 1 
              : chat.unread_count,
          };
        })
      );
    };

    socket.on("new_message", handleNewMessage);

    return () => {
      socket.off("new_message", handleNewMessage);
    };
  }, [socket, activeReportId, scrollToBottom]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle chat selection
  const handleSelectChat = (reportId) => {
    setSearchParams({ reportId: reportId.toString() }, { replace: true });
  };

  // Handle back to chats list
  const handleBackToList = () => {
    setSearchParams({}, { replace: true });
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !activeReportId || isSending) return;

    try {
      setIsSending(true);
      await API.sendReportMessage(activeReportId, newMessage.trim());
      setNewMessage("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Failed to send message:", err);
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / 86400000);

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Format full date for messages
  const formatMessageTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Check if user is sender
  const isMySender = (message) => {
    if (user.role === "user") {
      return message.sender_type === "citizen";
    }
    return message.sender_type === "operator";
  };

  // Check if message is a system message (status update)
  const isSystemMessage = (message) => {
    return message.sender_id === 0 || message.content?.startsWith("📋");
  };

  // Get status color class
  const getStatusClass = (statusId) => {
    switch (statusId) {
      case 2: return styles.statusAssigned;
      case 3: return styles.statusInProgress;
      case 4: return styles.statusSuspended;
      case 6: return styles.statusResolved;
      default: return "";
    }
  };

  return (
    <div className={styles.container}>
      {/* Chats list sidebar */}
      <aside className={`${styles.sidebar} ${activeReportId ? styles.hiddenOnMobile : ""}`}>
        <div className={styles.sidebarHeader}>
          <h2>Chats</h2>
        </div>
        
        <div className={styles.chatsList}>
          {isLoadingChats ? (
            <div className={styles.loading}>
              <div className={styles.loadingSpinner}></div>
              <span>Loading chats...</span>
            </div>
          ) : chats.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>💬</div>
              <p>No chats yet</p>
              <small>Chats will appear here when you have reports assigned</small>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.report_id}
                className={`${styles.chatItem} ${
                  parseInt(activeReportId, 10) === chat.report_id ? styles.active : ""
                }`}
                onClick={() => handleSelectChat(chat.report_id)}
              >
                <div className={styles.chatItemHeader}>
                  <span className={styles.chatTitle}>{chat.title}</span>
                  <div className={styles.chatHeaderRight}>
                    {chat.unread_count > 0 && (
                      <span className={styles.unreadBadge}>
                        {chat.unread_count > 9 ? "9+" : chat.unread_count}
                      </span>
                    )}
                    <span className={styles.chatTime}>
                      {formatTime(chat.last_activity)}
                    </span>
                  </div>
                </div>
                <div className={styles.chatItemBody}>
                  <span className={`${styles.chatStatus} ${getStatusClass(chat.status_id)}`}>
                    {chat.status_name}
                  </span>
                  {chat.last_message && (
                    <p className={styles.lastMessage}>
                      {chat.last_message.sender_type === "operator" ? "Officer: " : ""}
                      {chat.last_message.content}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <main className={`${styles.chatArea} ${!activeReportId ? styles.hiddenOnMobile : ""}`}>
        {!activeReportId ? (
          <div className={styles.noChatSelected}>
            <div className={styles.noChatIcon}>💬</div>
            <p>Select a chat to start messaging</p>
          </div>
        ) : isLoadingMessages ? (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner}></div>
            <span>Loading messages...</span>
          </div>
        ) : error && !selectedChat ? (
          <div className={styles.error}>{error}</div>
        ) : selectedChat ? (
          <>
            {/* Chat header */}
            <div className={styles.chatHeader}>
              <button 
                className={styles.backButton} 
                onClick={handleBackToList}
                aria-label="Back to chats list"
              >
                ‹
              </button>
              <div className={styles.chatHeaderInfo}>
                <h3>{selectedChat.title}</h3>
                <span className={`${styles.chatStatus} ${getStatusClass(selectedChat.status_id)}`}>
                  {selectedChat.status_name}
                </span>
              </div>
              <button
                className={styles.showOnMapButton}
                onClick={() => navigate(`/map?reportId=${selectedChat.report_id}`)}
              >
                Show on Map
              </button>
            </div>

            {/* Messages area */}
            <div className={styles.messagesArea}>
              {messages.length === 0 ? (
                <div className={styles.noMessages}>
                  <div className={styles.noMessagesIcon}>✉️</div>
                  <p>No messages yet</p>
                  <small>Start the conversation by sending a message</small>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const isSystem = isSystemMessage(message);
                    return (
                      <div
                        key={message.id || index}
                        className={`${styles.message} ${
                          isSystem
                            ? styles.systemMessage
                            : isMySender(message)
                            ? styles.myMessage
                            : styles.theirMessage
                        }`}
                      >
                        <div className={styles.messageContent}>
                          <p>{message.content}</p>
                          <span className={styles.messageTime}>
                            {formatMessageTime(message.sent_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message input */}
            <form className={styles.messageForm} onSubmit={handleSendMessage}>
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className={styles.messageInput}
                disabled={isSending}
                autoComplete="off"
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={!newMessage.trim() || isSending}
                aria-label="Send message"
              >
                {isSending ? "•••" : "➤"}
              </button>
            </form>
          </>
        ) : null}
      </main>
    </div>
  );
}

