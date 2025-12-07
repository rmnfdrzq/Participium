import axiosInstance from "./axiosInstance.js";

// Get all roles
export const getAllRoles = async () => {
  return await axiosInstance.get("/api/roles");
};

// Create municipality user (admin creates municipality user)
// userData: {username, email, password, office_id, company_id}
export const createMunicipalityUser = async (userData) => {
  return await axiosInstance.post("/api/admin/createuser", userData);
};

// Get all operators
export const getAllOperators = async () => {
  return await axiosInstance.get("/api/admin");
};

// Get all offices
export const getAllOffices = async () => {
  return await axiosInstance.get("/api/offices");
};

// Get all companies
export const getAllCompanies = async () => {
  return await axiosInstance.get("/api/companies");
};
