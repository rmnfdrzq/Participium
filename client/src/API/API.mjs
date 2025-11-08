
const SERVER_URL = "http://localhost:3001";

/**
 * Authenticates a user with the provided credentials.
 * @param {Object} credentials - User login credentials
 * @param {string} credentials.username - User email/username
 * @param {string} credentials.password - User password
 * @returns {Promise<Object>} User object with id and name
 * @throws {string} Error message if authentication fails
 */
const logIn = async (credentials) => {
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

/**
 * Retrieves the current authenticated user's information from the server.
 * @returns {Promise<Object>} User object with id and name if authenticated
 * @throws {Object} Error object with error message if not authenticated
 */
const getUserInfo = async () => {
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

/**
 * Logs out the current user by destroying the session on the server.
 * @returns {Promise<null>} Returns null if logout is successful
 */
const logOut = async () => {
  const response = await fetch(SERVER_URL + "/api/sessions/current", {
    method: "DELETE",
    credentials: "include",
  });
  if (response.ok) return null;
};

/**
 * Registers a new user account with the provided user data.
 * @param {Object} userData - User registration data
 * @param {string} userData.name - User full name
 * @param {string} userData.email - User email address
 * @param {string} userData.password - User password (minimum 6 characters)
 * @returns {Promise<Object>} User object with id and name if registration is successful
 * @throws {Object} Error object with validation errors or error message if registration fails
 */
const signUp = async (userData) => {
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

const getAllOperators = async () => {
  const response = await fetch(`${SERVER_URL}/api/admin`, {
    credentials: 'include'
  });
  if (!response.ok) {
    const errDetail = await response.json();
    throw errDetail.error;
  }
  return await response.json();
};


const createMunicipalityUser = async (userData) => {
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

const API = { logIn, getUserInfo, logOut, signUp, getAllOperators, getAllOffices, createMunicipalityUser };
export default API;
