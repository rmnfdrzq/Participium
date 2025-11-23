import axiosInstance from "./axiosInstance.js";

// Authenticate user
// credentials: {username, password}
export const logIn = async (credentials) => {
  return await axiosInstance.post("/api/sessions", credentials);
};

// Get current user information
export const getUserInfo = async () => {
  return await axiosInstance.get("/api/sessions/current");
};

// Log out user
export const logOut = async () => {
  return await axiosInstance.delete("/api/sessions/current");
};

// Register new user
// userData: {username, first_name, last_name, email_notification, email, password}
export const signUp = async (userData) => {
  return await axiosInstance.post("/api/registration", userData);
};
