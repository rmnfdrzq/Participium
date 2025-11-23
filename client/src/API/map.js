import axiosInstance from "./axiosInstance.js";

// Get all approved reports
export const getAllApprovedReports = async () => {
  return await axiosInstance.get("/api/reports/approved");
};

