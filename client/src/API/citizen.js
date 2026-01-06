import axiosInstance from "./axiosInstance";

// Get citizen profile of the logged-in user
export const getCitizenProfile = async () => {
  return await axiosInstance.get("/api/citizens");
};

// Update citizen profile of the logged-in user
export const updateCitizenProfile = async (updates) => {
  return await axiosInstance.put("/api/citizens", updates);
};

// Request email verification code (sends 6-digit code to user's email)
export const requestVerificationCode = async () => {
  return await axiosInstance.post("/api/citizens/verification-code");
};

// Verify email with the code received via email
export const verifyEmail = async (code) => {
  return await axiosInstance.post("/api/citizens/verify-email", { code });
};

// Get active email verification token info
export const checkValidateToken = async () => {
  return await axiosInstance.get("/api/citizens/verification-token");
};