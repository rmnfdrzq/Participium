import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import API from "../../../API/API.js"; 
import "./CreateUserPage.css";

const CreateUserPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offices, setOffices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    office_id: [], //array for the offices ids
    role: "", // external mainteiner
    company: "", // participium
  });

  // Find id of the restricted roles
  const technicalOfficeRole = roles.find(r => r.name === "Technical office staff member");
  const externalMaintainerRole = roles.find(r => r.name === "External maintainer");

  // verify if it is one of the exceptions
  const isRestrictedOffice = newUser.role !== (technicalOfficeRole?.id?.toString() || "") &&
                          newUser.role !== (externalMaintainerRole?.id?.toString() || "");

  // Return the list of visible offices
  const filteredOffices = isRestrictedOffice 
    ? offices.filter(o => o.office === "Organization Office") 
    : offices.filter(o => o.office !== "Organization Office") ;

  const participium = companies.find(c => c.name === "Participium");
  const filteredRoles = participium && newUser.company === participium.id.toString()
    ? roles.filter(r => r.name !== "External maintainer")
    : roles.filter(r => r.name === "External maintainer");

  useEffect(() => {
    loadOffices();
    loadRoles();
    loadCompanies();
  }, []);

  const loadOffices = async () => {
    try {
      const data = await API.getAllCategories();
      setOffices(data);
    } catch (err) {
      setError("Failed to load offices");
    }
  };

  const loadCompanies = async () => {
    try {
      const data = await API.getAllCompanies();
      setCompanies(data);
    } catch (err) {
      setError("Failed to load companies");
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

  useEffect(() => {
    if (newUser.company) {
      loadCompanyCategories(newUser.company);
    } else {
      loadOffices();
      setNewUser(prev => ({ ...prev, office_id: [] }));
    }
  }, [newUser.company]);

  const loadCompanyCategories = async (companyId) => {
    setLoading(true);
    try {
      const data = await API.getCompanyCategories(companyId);
      setOffices(data);
    } catch (err) {
      setError("Failed to load categories for this company");
      loadOffices();
    }finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleOfficeToggle = (officeId) => {
    setNewUser((prev) => {
      const isSelected = prev.office_id.includes(officeId);
      return {
        ...prev,
        office_id: isSelected
          ? prev.office_id.filter(id => id !== officeId)
          : [...prev.office_id, officeId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newUser.office_id.length === 0) {
      setError("Please select at least one office");
      return;
    }

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

          {error && (
            <div className="alert alert-error">
              {typeof error === "string" ? error : error.msg || JSON.stringify(error)}
            </div>
          )}

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
              <label htmlFor="company">Company</label>
              <select
                id="company"
                name="company"
                value={newUser.company}
                onChange={handleInputChange}
                required
                className={!newUser.company ? "placeholder" : ""}
              >
                <option value="" disabled>
                  Select operator company
                </option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <small className="form-text">
                Note: Companies cannot be modified after user creation.
              </small>
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
                  Select operator role
                </option>
                {filteredRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <small className="form-text">
                Note: Roles cannot be modified after user creation.
              </small>
            </div>

            <div className="form-field">
              <label>Offices</label>
              <div className="checkbox-group">
                {filteredOffices.sort((a, b) => a.id - b.id).map((office) => (
                  <label key={office.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newUser.office_id.includes(office.id)}
                      onChange={() => handleOfficeToggle(office.id)}
                    />
                    <span>{office.name}</span>
                  </label>
                ))}
              </div>
              <small className="form-text">
                Select one or more offices. Note: Offices cannot be modified after user creation.
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
