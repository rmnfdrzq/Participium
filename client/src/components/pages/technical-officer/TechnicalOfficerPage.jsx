import { useState, useEffect } from "react";
import API from "../../../API/API.js";
import { useNavigate } from "react-router";
import "./TechnicalOfficerPage.css";

import { useDispatch } from "react-redux";
import { setSelectedReport } from "../../../store/reportSlice";
import { STATUS_MAP } from "../../../constants/statusMap";

function TechnicalOfficerPage() {
  const dispatch = useDispatch();
  const [reports, setReports] = useState([]);
  const [myCategories, setMyCategories] = useState([]);
  const [currentReports, setCurrentReports] = useState([]);
  const [oldReports, setOldReports] = useState([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Quando reports o myCategories cambiano, dividi i report
    divideReports();
  }, [reports, myCategories]);

  const loadData = async () => {
    try {
      // Carica sia i report che le categorie dell'operatore
      const [reportsData, categoriesData] = await Promise.all([
        API.getAllReportsForTechOfficer(),
        API.getMyCategories()
      ]);
      
      setReports(reportsData);
      setMyCategories(categoriesData.categories || [1]);
    } catch (err) {
      setError("Failed to load data: " + err);
    }
  };

  const divideReports = () => {
    if (reports.length === 0 || myCategories.length === 0) {
      setCurrentReports(reports);
      setOldReports([]);
      return;
    }

    const current = [];
    const old = [];

    reports.forEach(report => {
      if (myCategories.includes(report.category?.id)) {
        current.push(report);
      } else {
        old.push(report);
      }
    });

    setCurrentReports(current);
    setOldReports(old);
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

  // Filter reports based on selected status
  const filterReportsByStatus = (reportsList) => {
    return statusFilter === "all"
      ? reportsList
      : reportsList.filter(
          (report) => report.status?.id === parseInt(statusFilter)
        );
  };

  const filteredCurrentReports = filterReportsByStatus(currentReports);
  const filteredOldReports = filterReportsByStatus(oldReports);

  const handleRowClick = (report) => {
    dispatch(setSelectedReport(report));
    navigate("/inspectReport");
  };

  const renderReportsTable = (reportsList, showEmpty = true) => {
    if (reportsList.length === 0 && !showEmpty) {
      return null;
    }

    return (
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
            {reportsList.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No reports found
                </td>
              </tr>
            ) : (
              reportsList.map((report) => (
                <tr
                  key={report.id}
                  className="clickable-row"
                  onClick={() => handleRowClick(report)}
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

        {/* Current Reports Section */}
        <div className="reports-section">
          {renderReportsTable(filteredCurrentReports, true)}
        </div>

        {/* Old Reports Section - Only show if there are old reports */}
        {filteredOldReports.length > 0 && (<>
          <div className="content-header">
            <h1 className="page-title" >
              Old Reports
            </h1>
          </div>
          <div className="reports-section">
          {renderReportsTable(filteredOldReports, false)}
        </div> </>
        )}
      </div>
    </div>
  );
}

export default TechnicalOfficerPage;