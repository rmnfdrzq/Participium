import {
  getAllRoles,
  createMunicipalityUser,
  getAllOperators,
  getAllCompanies,
  getCompanyCategories,
  addOperatorCategory,
  removeOperatorCategory,
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
  autoAssignMaintainer,
  autoAssignTechnicalOfficer,
} from "./report.js";
import {
  getAssignedReportsForMaintainer,
  updateReportStatusByMaintainer,
} from "./maintainer.js";
import { getImageUploadUrl, uploadImageToSignedUrl } from "./image.js";
import { getAllReportsForTechOfficer, getMyCategories } from "./techofficer.js";
import {
  getCitizenProfile,
  updateCitizenProfile,
  requestVerificationCode,
  verifyEmail,
  checkValidateToken,
} from "./citizen.js";
import {
  getMessages,
  addMessage,
  getInternalComments,
  addInternalComment
} from "./comment.js";

const API = {
  // Admin methods
  getAllRoles,
  createMunicipalityUser,
  getAllOperators,
  getAllCompanies,
  getCompanyCategories,
  addOperatorCategory,
  removeOperatorCategory,

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
  autoAssignMaintainer,
  autoAssignTechnicalOfficer,

  // Image methods
  getImageUploadUrl,
  uploadImageToSignedUrl,

  // Tech Officer methods
  getAllReportsForTechOfficer,
  getMyCategories,

  // Citizen methods
  getCitizenProfile,
  updateCitizenProfile,
  requestVerificationCode,
  verifyEmail,
  checkValidateToken,

  //comments methods
  getMessages,
  addMessage,
  getInternalComments,
  addInternalComment,
};

export default API;
