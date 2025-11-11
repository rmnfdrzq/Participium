
const SERVER_URL = "http://localhost:3001";

//credential {username,password}
const logIn = async (credentials) => { // Authenticates a user and creates a session
  const response = await fetch(SERVER_URL + "/api/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(credentials),
  });
  if (response.ok) {
    const user = await response.json();
    return user;
  } else {
    const errDetails = await response.text();
    throw errDetails;
  }
};


const getUserInfo = async () => { //get user authenticated in the session -> user {id,username,type}
  const response = await fetch(SERVER_URL + "/api/sessions/current", {
    credentials: "include",
  });
  const user = await response.json();
  if (response.ok) {
    return user;
  } else {
    throw user; // an object with the error coming from the server
  }
};


const logOut = async () => { //Logs out the current user by destroying the session
  const response = await fetch(SERVER_URL + "/api/sessions/current", {
    method: "DELETE",
    credentials: "include",
  });
  if (response.ok) return null;
};

// registration userdata {username, first_name,last_name,email_notification,email,password}
const signUp = async (userData) => { // Registers a new user 
  const response = await fetch(SERVER_URL + "/api/registration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(userData),
  });
  if (response.ok) {
    const user = await response.json();
    return user;
  } else {
    const errDetails = await response.json();
    throw errDetails;
  }
};

//get only and all operators
const getAllOperators = async () => { //get all and only operators
  const response = await fetch(`${SERVER_URL}/api/admin`, {
    credentials: 'include'
  });
  if (!response.ok) {
    const errDetail = await response.json();
    throw errDetail.error;
  }
  return await response.json();
};

// registration of municipality user given userdata {username, email, password,office_id}
const createMunicipalityUser = async (userData) => { // admin creates municipality user
  const response = await fetch(`${SERVER_URL}/api/admin/createuser`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    const errDetail = await response.json();
    throw errDetail.error;
  }
  return await response.json();
};

//get all default offices 
const getAllOffices = async () => { 
  const response = await fetch(`${SERVER_URL}/api/offices`, {
    credentials: "include",
  });
  if (response.ok) {
    return await response.json();
  } else {
    const text = await response.text();
    throw new Error(text);
  }
};

// get all categories
const getAllCategories = async () => {
  const response = await fetch(`${SERVER_URL}/api/categories`, {
    credentials: "include", 
  });

  if (response.ok) {
    return await response.json();
  } else {
    const text = await response.text();
    throw new Error(text); 
  }
};

const getImageUploadUrl = async (cleanFileName) => {
  const response =  await fetch(`${SERVER_URL}/api/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: cleanFileName }),
      });
  if (response.ok) {
    const url = await response.json();
    return url;
  } else {
    const errDetails = await response.text();
    throw errDetails;
  }
};

const uploadImageToSignedUrl = async (uploadURL, fileBlob) => {
  const response = await fetch(uploadURL, {
    method: "PUT",
    body: fileBlob,
  });
  return response;
};

const insertReport = async (reportData) => {
  const response = await fetch(`${SERVER_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(reportData)
  });
  if (!response.ok) {
    const errDetail = await response.json();
    throw errDetail.error;
  }
  return await response.json();
};

const API = { logIn, getUserInfo, logOut, signUp, getAllOperators, getAllOffices, createMunicipalityUser, getAllCategories, insertReport, getImageUploadUrl, uploadImageToSignedUrl };
export default API;
