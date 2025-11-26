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

  const getRoleDisplay = (role) => {
    const roleMap = {
      Admin: "Admin",
      "Municipal public relations officer":
        "Municipal public relations officer",
      "Technical office staff member": "Technical office staff member",
      "Municipal administrator": "Municipal administrator",
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
    const officeMap = {
      "Organization Office": "Organization",
      "Water Department": "Water",
      "Accessibility Office": "Accessibility",
      "Sewage Department": "Sewage",
      "Lighting Department": "Lighting",
      "Waste Management": "Waste",
      "Traffic Department": "Traffic",
      "Public Works": "Public Works",
      "Parks Department": "Parks",
      "General Services": "General",
    };
    return officeMap[office] || office;
  };

  const getOfficeClass = (office) => {
    // Puoi personalizzare gli stili per ogni ufficio
    switch (office) {
      case "Organization Office":
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
              </tr>
            </thead>
            <tbody>
              {users.map((userItem) => (
                <tr key={userItem.id}>
                  <td className="user-name">{userItem.username}</td>
                  <td className="user-login">{userItem.email}</td>
                  <td className="office-cell">
                    <span className={getOfficeClass(userItem.office_name)}>
                      {getOfficeDisplay(userItem.office_name)}
                    </span>
                  </td>
                  <td className="role-cell">
                    <span className={getRoleClass(userItem.role)}>
                      {getRoleDisplay(userItem.role)}
                    </span>
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
