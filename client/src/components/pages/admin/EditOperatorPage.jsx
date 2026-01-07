import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import API from "../../../API/API.js"; 
import "./EditOperatorPage.css";

const EditOperatorPage = () => {
  const navigate = useNavigate();
  const { operatorId } = useParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [availableOffices, setAvailableOffices] = useState([]);
  const [operatorData, setOperatorData] = useState(null);
  const [selectedOffices, setSelectedOffices] = useState([]);
  const [initialOffices, setInitialOffices] = useState([]);

  useEffect(() => {
    loadOperatorData();
  }, [operatorId]);

  useEffect(() => {
    if (operatorData) {
      loadAvailableOffices();
    }
  }, [operatorData]);

  const loadOperatorData = async () => {
    setLoadingData(true);
    try {
      const operators = await API.getAllOperators();
      const operator = operators.find(op => op.id === parseInt(operatorId));
      
      if (!operator) {
        setError("Operator not found");
        return;
      }

      setOperatorData(operator);
      
      const officeNames = Array.isArray(operator.offices) ? operator.offices : [];
      setInitialOffices(officeNames);
      
    } catch (err) {
      setError("Failed to load operator data: " + err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadAvailableOffices = async () => {
    try {
      if (operatorData.role === "Technical office staff member" || 
          operatorData.role === "External maintainer") {
        const categories = await API.getAllCategories();
        const filtered = categories.filter(c => c.office !== "Organization Office");
        setAvailableOffices(filtered);
        
        const selectedIds = filtered
          .filter(office => initialOffices.includes(office.office))
          .map(office => office.id);
        setSelectedOffices(selectedIds);
      }
    } catch (err) {
      setError("Failed to load offices: " + err);
    }
  };

  const handleOfficeToggle = (officeId) => {
    setSelectedOffices((prev) => {
      const isSelected = prev.includes(officeId);
      return isSelected
        ? prev.filter(id => id !== officeId)
        : [...prev, officeId];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const currentOfficeIds = availableOffices
        .filter(office => initialOffices.includes(office.office))
        .map(office => office.id);
      
      const toAdd = selectedOffices.filter(id => !currentOfficeIds.includes(id));
      const toRemove = currentOfficeIds.filter(id => !selectedOffices.includes(id));

      for (const categoryId of toAdd) {
        await API.addOperatorCategory({ 
            operator_id: parseInt(operatorId), 
            category_id: categoryId 
        });
      }

      for (const categoryId of toRemove) {
        await API.removeOperatorCategory({
            operator_id: parseInt(operatorId), 
            category_id: categoryId 
        });
      }

      setSuccess("Operator offices updated successfully!");
      
      setTimeout(() => {
        navigate("/admin");
      }, 1500);
      
    } catch (err) {
      setError(err.error || err.message || "Failed to update operator");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin");
  };

  const getOfficeClass = (office) => {
    switch (office) {
      case (!office):
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

  if (loadingData) {
    return (
      <div className="editoperator-page">
        <div className="editoperator-content">
          <div className="editoperator-card">
            <p>Loading operator data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!operatorData) {
    return (
      <div className="editoperator-page">
        <div className="editoperator-content">
          <div className="editoperator-card">
            <div className="alert alert-error">Operator not found</div>
            <button className="btn-cancel" onClick={handleCancel}>
              Back to Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canEditOffices = operatorData.role === "Technical office staff member" || 
                         operatorData.role === "External maintainer";

  return (
    <div className="editoperator-page">
      <div className="editoperator-content">
        <div className="editoperator-card">
          <h1 className="editoperator-title">Edit Operator</h1>
          <p className="editoperator-subtitle">
            Modify operator's office assignments
          </p>

        

          <form onSubmit={handleSubmit} className="editoperator-form">
            <div className="form-field">
              <label>Username</label>
              <input
                type="text"
                value={operatorData.username}
                disabled
              />
            </div>

            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                value={operatorData.email}
                disabled
              />
            </div>

            <div className="form-field">
              <label>Role</label>
              <input
                type="text"
                value={operatorData.role}
                disabled
              />
            </div>

            {!canEditOffices ? (
              <div className="form-field">
                <label>Current Offices</label>
                <div className="info-field">
                  {(
                    initialOffices.map((office, index) => (
                      <span key={index} className={`office-badge ${getOfficeClass(office)}`}>
                        {office}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="form-field">
                <label>Manage Offices *</label>
                {availableOffices.length === 0 ? (
                  <p className="form-text">No offices available</p>
                ) : (
                  <div className="checkbox-group">
                    {availableOffices.sort((a, b) => a.id - b.id).map((office) => (
                      <label key={office.id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectedOffices.includes(office.id)}
                          onChange={() => handleOfficeToggle(office.id)}
                        />
                        <span>{office.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                <small className="form-text">
                  Select one or more offices. Selected: {selectedOffices.length}
                </small>
              </div>
            )}

            <div className="button-group">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>

              {canEditOffices && (
                <button
                  type="submit"
                  className="btn-save"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </form>

            {error && (
                <div className="notification error">
                    {typeof error === "string" ? error : error.msg || JSON.stringify(error)}
                </div>
                )}

                {loading && (
                <div className="notification info">
                    Saving changes, please wait...
                </div>
                )}

                {success && (
                <div className="notification success">
                    {success}
                </div>
            )}
            
        </div>
      </div>
    </div>
  );
};

export default EditOperatorPage;