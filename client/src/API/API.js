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
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsSeen,
  markAllNotificationsAsSeen,
  getReportMessages,
  sendReportMessage,
} from "./notification.js";
import { getChats, getChatDetails, getUnreadMessagesCount, markChatAsRead } from "./chat.js";

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

  // Comments methods
  getMessages,
  addMessage,
  getInternalComments,
  addInternalComment,

  // Notification methods
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsSeen,
  markAllNotificationsAsSeen,
  getReportMessages,
  sendReportMessage,

  // Chat methods
  getChats,
  getChatDetails,
  getUnreadMessagesCount,
  markChatAsRead,
};

export default API;
