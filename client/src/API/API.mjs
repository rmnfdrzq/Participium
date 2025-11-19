import { logIn, getUserInfo, logOut, signUp } from "./functionalities/login-registration.mjs";
import { getAllOperators, getAllOffices, getAllRoles, getAllCategories } from "./functionalities/get-all.mjs";
import { getImageUploadUrl, uploadImageToSignedUrl } from "./functionalities/images.mjs";
import { createMunicipalityUser,  insertReport } from "./functionalities/forms.mjs";

const API = { logIn, getUserInfo, logOut, signUp, getAllOperators, getAllOffices, getAllRoles, createMunicipalityUser, getAllCategories, insertReport, getImageUploadUrl, uploadImageToSignedUrl };
export default API;
