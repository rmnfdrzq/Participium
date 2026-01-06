import axiosInstance from "./axiosInstance";

// Get all reports assigned to logged in technical officer
export const getAllReportsForTechOfficer = async () => {
  return await axiosInstance.get("/api/reports/assigned");
};

// Get categories for authenticated operator
export const getMyCategories = async () => {
  return await axiosInstance.get('/api/operators/my-categories');
};