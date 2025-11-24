import {
  getAllRoles,
  createMunicipalityUser,
  getAllOperators,
  getAllOffices,
} from "./admin.js";
import { logIn, getUserInfo, logOut, signUp } from "./auth.js";
import { getAllApprovedReports } from "./map.js";
import {
  insertReport,
  getAllCategories,
  updateReportStatus,
  getAllPendingReports,
  getOperatorsByOffice,
  setOperatorByReport
} from "./report.js";
import { getImageUploadUrl, uploadImageToSignedUrl } from "./image.js";

const API = {
  // Admin methods
  getAllRoles,
  createMunicipalityUser,
  getAllOperators,
  getAllOffices,

  // Auth methods
  logIn,
  getUserInfo,
  logOut,
  signUp,

  // Map methods
  getAllApprovedReports,

  // Report methods
  insertReport,
  getAllCategories,
  updateReportStatus,
  getAllPendingReports,
  getOperatorsByOffice,
  setOperatorByReport,

  // Image methods
  getImageUploadUrl,
  uploadImageToSignedUrl,
};

export default API;
