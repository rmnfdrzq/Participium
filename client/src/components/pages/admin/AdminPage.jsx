import { useState, useEffect } from "react";
import API from "../../../API/API.js";
import { useNavigate } from "react-router";
import "./AdminPage.css";

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await API.getAllOperators();
      setUsers(data);
    } catch (err) {
      setError("Failed to load users: " + err);
    }
  };

  const handleCreateUserClick = () => {
    navigate("/admin/createuser");
  };

  const handleEditOperator = (operatorId) => {
    navigate(`/admin/edit/${operatorId}`);
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      Admin: "Admin",
      "Municipal public relations officer":
        "Municipal public relations officer",
      "Technical office staff member": "Technical office staff member",
      "Municipal administrator": "Municipal administrator",
      "External maintainer": "External maintainer",
    };
    return roleMap[role] || role;
  };

  const getRoleClass = (role) => {
    switch (role) {
      case "Admin":
        return "role-admin";
      case "Municipal public relations officer":
        return "role-municipal-relations";
      case "Technical office staff member":
        return "role-technical";
      case "Municipal administrator":
        return "role-municipal-administrator";
      default:
        return "role-default";
    }
  };

  const getOfficeDisplay = (office) => {
    switch (office) {
      case undefined:
      case null:
      case "":
        return "Organization";
      case "Water Department":
        return "Water";
      case "Accessibility Office":
        return "Accessibility";
      case "Sewage Department":
        return "Sewage";
      case "Lighting Department":
        return "Lighting";
      case "Waste Management":
        return "Waste";
      case "Traffic Department":
        return "Traffic";
      case "Public Works":
        return "Public Works";
      case "Parks Department":
        return "Parks";
      case "General Services":
        return "General";
      default:
        return office;
    }
  };

  const getOfficeClass = (office) => {
    switch (office) {
      case undefined:
      case null:
      case "":
        return "office-organization";
      case "Water Department":
        return "office-water";
      case "Accessibility Office":
        return "office-accessibility";
      case "Sewage Department":
        return "office-sewage";
      case "Lighting Department":
        return "office-lighting";
      case "Waste Management":
        return "office-waste";
      case "Traffic Department":
        return "office-traffic";
      case "Public Works":
        return "office-public-works";
      case "Parks Department":
        return "office-parks";
      case "General Services":
        return "office-general";
      default:
        return "office-default";
    }
  };

  const renderOffices = (officeData) => {
    if(!officeData || (Array.isArray(officeData) && officeData.length === 0)) {
      return (
      <span className="office-organization">
        Organization
      </span>
    );
  }
    if (Array.isArray(officeData)) {
      return (
        <div className="offices-list">
          {officeData.map((office, index) => (
            <span key={index} className={getOfficeClass(office)}>
              {getOfficeDisplay(office)}
            </span>
          ))}
        </div>
      );
    }
    
    return (
      <span className={getOfficeClass(officeData)}>
        {getOfficeDisplay(officeData)}
      </span>
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-content">
        {error && (
          <div className="alert alert-error">
            {error}
            <button className="alert-close" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
            <button className="alert-close" onClick={() => setSuccess("")}>
              ×
            </button>
          </div>
        )}

        <div className="content-header">
          <h1 className="page-title">Operators</h1>
          <button className="btn-create" onClick={handleCreateUserClick}>
            Create municipal user
          </button>
        </div>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Login</th>
                <th>Office</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userItem) => (
                <tr key={userItem.id}>
                  <td className="user-name">{userItem.username}</td>
                  <td className="user-login">{userItem.email}</td>
                  <td className="office-cell">
                    {renderOffices(userItem.offices || userItem.office_name)}
                  </td>
                  <td className="role-cell">
                    <span className={getRoleClass(userItem.role)}>
                      {getRoleDisplay(userItem.role)}
                    </span>
                  </td>
                  <td>
                    {userItem.role !== "Technical office staff member" && (
                      <button 
                      className="btn-edit"
                      disabled
                    >
                      Not editable
                    </button>
                    ) || (
                      <button 
                      className="btn-edit"
                      onClick={() => handleEditOperator(userItem.id)}
                    >
                      Edit
                    </button>
                    )}  
                    
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;