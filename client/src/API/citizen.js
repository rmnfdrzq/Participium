import axiosInstance from "./axiosInstance";

// Get citizen profile of the logged-in user
export const getCitizenProfile = async () => {
  return await axiosInstance.get("/api/citizens");
};

// Update citizen profile of the logged-in user
export const updateCitizenProfile = async (updates) => {
  return await axiosInstance.put("/api/citizens", updates);
};
