import axiosInstance from "./axiosInstance.js";

// Get all reports assigned to external maintainer
export const getAssignedReportsForMaintainer = async () => {
  return await axiosInstance.get("/api/reports/assigned");
};

// Update report status by external maintainer
export const updateReportStatusByMaintainer = async (reportId, statusId) => {
  return await axiosInstance.put(`/api/reports/${reportId}/status`, {
    status_id: statusId,
  });
};
