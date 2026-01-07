import axiosInstance from "./axiosInstance.js";

// Get all chats for logged user
export const getChats = async () => {
  return await axiosInstance.get("/api/chats");
};

// Get chat details by report ID
export const getChatDetails = async (reportId) => {
  return await axiosInstance.get(`/api/chats/${reportId}`);
};

// Get total unread messages count
export const getUnreadMessagesCount = async () => {
  return await axiosInstance.get("/api/chats/unread/count");
};

// Mark a chat as read
export const markChatAsRead = async (reportId) => {
  return await axiosInstance.post(`/api/chats/${reportId}/read`);
};

