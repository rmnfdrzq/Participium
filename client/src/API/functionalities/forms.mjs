const SERVER_URL = "http://localhost:3001";

// registration of municipality user given userdata {username, email, password,office_id}
export const createMunicipalityUser = async (userData) => { // admin creates municipality user
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

export const insertReport = async (reportData) => {
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

export const updateReportStatus = async (reportId, newStatus, rejection_reason=null) => {
  const response = await fetch(`${SERVER_URL}/api/reports/${reportId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status: newStatus, rejection_reason: rejection_reason })
  });
  if (!response.ok) {
    const errDetail = await response.json();
    throw errDetail.error;
  }
  return await response.json();
}