import {
  getAllRoles,
  createMunicipalityUser,
  getAllOperators,
  getAllOffices,
  getAllCompanies,
} from "./admin.js";
import { logIn, getUserInfo, logOut, signUp } from "./auth.js";
import { getAllApprovedReports } from "./map.js";
import {
  insertReport,
  getAllCategories,
  updateReportStatus,
  getAllPendingReports,
  getOperatorsByOffice,
  setOperatorByReport,
  setMaintainerByReport,
} from "./report.js";
import {
  getAssignedReportsForMaintainer,
  updateReportStatusByMaintainer,
} from "./maintainer.js";
import { getImageUploadUrl, uploadImageToSignedUrl } from "./image.js";
import { getAllReportsForTechOfficer } from "./techofficer.js";
import {
  getCitizenProfile,
  updateCitizenProfile,
  requestVerificationCode,
  verifyEmail,
} from "./citizen.js";

const API = {
  // Admin methods
  getAllRoles,
  createMunicipalityUser,
  getAllOperators,
  getAllOffices,
  getAllCompanies,

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
  setMaintainerByReport,
  getAssignedReportsForMaintainer,
  updateReportStatusByMaintainer,

  // Image methods
  getImageUploadUrl,
  uploadImageToSignedUrl,

  // Tech Officer methods
  getAllReportsForTechOfficer,

  // Citizen methods
  getCitizenProfile,
  updateCitizenProfile,
  requestVerificationCode,
  verifyEmail,
};

export default API;
