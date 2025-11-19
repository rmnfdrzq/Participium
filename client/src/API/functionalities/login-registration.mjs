
const SERVER_URL = "http://localhost:3001";

//credential {username,password}
export const logIn = async (credentials) => { // Authenticates a user and creates a session
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


export const getUserInfo = async () => { //get user authenticated in the session -> user {id,username,type}
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


export const logOut = async () => { //Logs out the current user by destroying the session
  const response = await fetch(SERVER_URL + "/api/sessions/current", {
    method: "DELETE",
    credentials: "include",
  });
  if (response.ok) return null;
};

// registration userdata {username, first_name,last_name,email_notification,email,password}
export const signUp = async (userData) => { // Registers a new user 
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