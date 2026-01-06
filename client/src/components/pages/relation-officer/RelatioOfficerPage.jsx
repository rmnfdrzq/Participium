import { useState, useEffect } from "react";
import API from "../../../API/API.js";
import { useNavigate } from "react-router";
import "./RelationOfficerPage.css";

import { useDispatch } from "react-redux";
import { setSelectedReport } from "../../../store/reportSlice";
import { STATUS_MAP } from "../../../constants/statusMap";

function RelationOfficerPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await API.getAllPendingReports();
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

  // Same filter logic as other pages
  const filterReportsByStatus = (reportsList) => {
    return statusFilter === "all"
      ? reportsList
      : reportsList.filter(
          (report) => report.status?.id === parseInt(statusFilter)
        );
  };

  const filteredReports = filterReportsByStatus(reports);

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

        {/* HEADER */}
        <div className="content-header">
          <h1 className="page-title">Reports Overview</h1>
          <div className="filter-container">
            <span className="filter-label">Filter:</span>
            <select
              className="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Default (All)</option>
              <option value="1">Pending Approval</option>
              <option value="2">Assigned</option>
              <option value="3">In Progress</option>
              <option value="4">Suspended</option>
              <option value="6">Resolved</option>
            </select>
          </div>
        </div>

        {/* REPORTS TABLE */}
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
              {filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#666",
                    }}
                  >
                    No reports found
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
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
                          backgroundColor:
                            STATUS_MAP[report.status?.id]?.color || "gray",
                        }}
                      >
                        {STATUS_MAP[report.status?.id]?.label || "Unknown"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default RelationOfficerPage;
