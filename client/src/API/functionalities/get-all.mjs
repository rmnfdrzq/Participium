const SERVER_URL = "http://localhost:3001";

//get only and all operators
export const getAllOperators = async () => { //get all and only operators
  const response = await fetch(`${SERVER_URL}/api/admin`, {
    credentials: 'include'
  });
  if (!response.ok) {
    const errDetail = await response.json();
    throw errDetail.error;
  }
  return await response.json();
};

//get all default offices 
export const getAllOffices = async () => { 
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

//get all roles
export const getAllRoles = async () => {
  const response = await fetch(`${SERVER_URL}/api/roles`, {
    credentials: "include", 
  });
  if(response.ok){
    return await response.json();
  } else {
    const text = await response.text();
    throw new Error(text);
  }
};

// get all categories
export const getAllCategories = async () => {
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

// Get all pending reports
export const getAllPendingReports = async () => {
  const response = await fetch(`${SERVER_URL}/api/reports`, {
    credentials: 'include'
  });
  if (!response.ok) {
    const errDetail = await response.json();
    throw errDetail.error;
  }
  return await response.json();
};

export const getAllApprovedReports = async () => {
  const response = await fetch (`${SERVER_URL}/api/reports/approved`, {
    credentials: 'include'
  });
  if (!response.ok) {
    const errDetail = await response.json();
    throw errDetail.error;
  }
  return await response.json(); 
};
