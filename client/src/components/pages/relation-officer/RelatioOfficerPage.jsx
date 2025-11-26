import { useState, useEffect } from "react";
import API from "../../../API/API.js";
import { useNavigate } from "react-router";
import "./RelationOfficerPage.css";

import { useDispatch, useSelector } from "react-redux";
import { setSelectedReport } from "../../../store/reportSlice";
import { STATUS_MAP } from "../../../constants/statusMap";

function RelationOfficerPage() {
  const dispatch = useDispatch();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();


  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await API.getAllPendingReports(); //to load reports
      setReports(data);
    } catch (err) {
      setError("Failed to load reports: " + err);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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

        <div className="content-header">
          <h1 className="page-title">Reports Overview</h1>
        </div>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Created At</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className="clickable-row"
                  onClick={() => {
                    dispatch(setSelectedReport(report));
                    navigate("/inspectReport");
                  }}
                >
                  <td className="report-id">{report.id}</td>
                  <td className="report-title">{report.title}</td>
                  <td className="report-date">
                    {formatDate(report.created_at)}
                  </td>
                  <td>
                    <span
                      className="status-pill"
                      style={{
                        backgroundColor: STATUS_MAP[report.status.id]?.color || "gray",
                      }}
                    >
                      {STATUS_MAP[report.status.id]?.label || "Unknown"}
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

export default RelationOfficerPage;
