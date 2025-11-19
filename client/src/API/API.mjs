import { logIn, getUserInfo, logOut, signUp } from "./functionalities/login-registration.mjs";
import { getAllOperators, getAllOffices, getAllRoles, getAllCategories, getAllPendingReports } from "./functionalities/get-all.mjs";
import { getImageUploadUrl, uploadImageToSignedUrl } from "./functionalities/images.mjs";
import { createMunicipalityUser,  insertReport, updateReportStatus } from "./functionalities/forms.mjs";

const API = { logIn, getUserInfo, logOut, signUp, getAllOperators, getAllOffices, getAllRoles, 
    createMunicipalityUser, getAllCategories, insertReport, getImageUploadUrl, uploadImageToSignedUrl, 
    getAllPendingReports, updateReportStatus };
    
export default API;
