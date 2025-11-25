import axiosInstance from "./axiosInstance";

// Get all reports for logged in technical officer
export const getAllReportsForTechOfficer = async () => {
  return await axiosInstance.get("/api/reports/assigned");
};