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

// Get all companies
export const getAllCompanies = async () => {
  return await axiosInstance.get("/api/companies");
};

// Get specific categories for company
export const getCompanyCategories = async (companyId) => {
  return await axiosInstance.get(`/api/admin/companies/${companyId}/categories`);
};

// Add a category to an operator (admin only)
export const addOperatorCategory = async (data) => {
  return await axiosInstance.post("/api/admin/addcategory", data);
};

// Remove a category from an operator (admin only)
export const removeOperatorCategory = async (data) => {
  return await axiosInstance.delete("/api/admin/removecategory", { data }); // chat gpt told me to add the {} to the delete
  //if it causes some errors remove them
};