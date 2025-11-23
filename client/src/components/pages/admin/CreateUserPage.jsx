import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import API from "../../../API/API.js";
import "./CreateUserPage.css";

const CreateUserPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offices, setOffices] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    office_id: "",
    role: "",
  });

  useEffect(() => {
    loadOffices();
    loadRoles();
  }, []);

  const loadOffices = async () => {
    try {
      const data = await API.getAllOffices();
      setOffices(data);
    } catch (err) {
      setError("Failed to load offices");
    }
  };

  const loadRoles = async () => {
    try {
      const data = await API.getAllRoles();
      const filteredRoles = data.filter((role) => role.name !== "Admin");
      setRoles(filteredRoles);
    } catch (err) {
      setError("Failed to load roles");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await API.createMunicipalityUser(newUser);
      navigate("/admin");
    } catch (err) {
      setError(err || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin");
  };

  return (
    <div className="createuser-page">
      <div className="createuser-content">
        <div className="createuser-card">
          <h1 className="createuser-title">Create New User</h1>
          <p className="createuser-subtitle">
            Add a new municipality user or urban planner
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="createuser-form">
            <div className="form-field">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={newUser.username}
                onChange={handleInputChange}
                placeholder="Enter username"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={newUser.email}
                onChange={handleInputChange}
                placeholder="Enter email"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={newUser.password}
                onChange={handleInputChange}
                minLength={6}
                placeholder="Enter password"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="office_id">Office</label>
              <select
                id="office_id"
                name="office_id"
                value={newUser.office_id}
                onChange={handleInputChange}
                required
                className={!newUser.office_id ? "placeholder" : ""}
              >
                <option value="" disabled>
                  Select user office
                </option>
                {offices.map((office) => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
                required
                className={!newUser.role ? "placeholder" : ""}
              >
                <option value="" disabled>
                  Select user role
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <small className="form-text">
                Note: Role and office cannot be modified after user creation.
              </small>
            </div>

            <div className="button-group">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn-createuser"
                disabled={loading}
              >
                {loading ? "Creating User..." : "Create User"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUserPage;
