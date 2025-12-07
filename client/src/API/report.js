import axiosInstance from "./axiosInstance.js";

// Create new report
export const insertReport = async (reportData) => {
  return await axiosInstance.post("/api/reports", reportData);
};

// Get all categories
export const getAllCategories = async () => {
  return await axiosInstance.get("/api/categories");
};

// Update report status
// reportId: Report ID
// newStatus: New status
// rejection_reason: Rejection reason (optional)
export const updateReportStatus = async (reportId, newStatus, rejection_reason = null) => {
  return await axiosInstance.put(`/api/reports/${reportId}/status`, {
    status_id: newStatus,
    rejection_reason: rejection_reason
  });
};

// Get all pending reports
export const getAllPendingReports = async () => {
  return await axiosInstance.get("/api/reports");
};

// Get operators by office ID
export const getOperatorsByOffice = async (office_id) => {
  return await axiosInstance.get('/api/operators', {
    params: { office_id: office_id } // Axios lo trasforma in ?officeId=9
  });
}

// Set operator for a report
export const setOperatorByReport = async (reportId, operatorId) => {
  return await axiosInstance.put(`/api/reports/${reportId}/operator`, {
    operatorId: operatorId
  });
}