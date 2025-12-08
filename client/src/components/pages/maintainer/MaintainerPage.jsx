import { useState, useEffect } from "react";
import API from "../../../API/API.js";
import { STATUS_MAP } from "../../../constants/statusMap";
import { ImagePreviewModal } from "../../common/imagePreviewModal/ImagePreviewModal";
import "./MaintainerPage.css";

function MaintainerPage() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatusId, setNewStatusId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await API.getAssignedReportsForMaintainer();
      setReports(data);
    } catch (err) {
      setError("Failed to load reports: " + err);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter reports based on selected status
  const filteredReports =
    statusFilter === "all"
      ? reports
      : reports.filter(
          (report) => report.status?.id === parseInt(statusFilter)
        );

  const handleStatusChange = (statusId) => {
    setNewStatusId(statusId);
    setShowStatusModal(true);
  };

  const confirmStatusUpdate = async () => {
    if (!selectedReport || !newStatusId) return;

    setIsUpdating(true);
    try {
      await API.updateReportStatusByMaintainer(selectedReport.id, newStatusId);

      // Update local state
      const updatedReports = reports.map((r) =>
        r.id === selectedReport.id
          ? {
              ...r,
              status: { id: newStatusId, name: STATUS_MAP[newStatusId]?.label },
            }
          : r
      );
      setReports(updatedReports);
      setSelectedReport({
        ...selectedReport,
        status: { id: newStatusId, name: STATUS_MAP[newStatusId]?.label },
      });

      setShowStatusModal(false);
      setNewStatusId(null);
    } catch (err) {
      setError("Failed to update status: " + err);
    } finally {
      setIsUpdating(false);
    }
  };

  const closeDetailView = () => {
    setSelectedReport(null);
  };

  return (
    <div className="maintainer-page">
      <div className="maintainer-content">
        {error && (
          <div className="alert alert-error">
            {error}
            <button className="alert-close" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        <div className="content-header">
          <h1 className="page-title">My Assigned Reports</h1>
          <div className="filter-container">
            <span className="filter-label">Filter:</span>
            <select
              className="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Default (All)</option>
              <option value="2">Assigned</option>
              <option value="3">In Progress</option>
              <option value="4">Suspended</option>
              <option value="6">Resolved</option>
            </select>
          </div>
        </div>

        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Created At</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className={`clickable-row ${
                    selectedReport?.id === report.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedReport(report)}
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Report Detail Panel */}
        {selectedReport && (
          <div className="report-detail-panel">
            <div className="detail-header">
              <h2>Report Details</h2>
              <button className="close-button" onClick={closeDetailView}>
                ×
              </button>
            </div>

            <div className="detail-content">
              <div className="detail-row">
                <span className="detail-label">ID</span>
                <span className="detail-value">{selectedReport.id}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Title</span>
                <span className="detail-value">{selectedReport.title}</span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Description</span>
                <span className="detail-value">
                  {selectedReport.description}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">
                  <span
                    className="status-pill"
                    style={{
                      backgroundColor:
                        STATUS_MAP[selectedReport.status?.id]?.color || "gray",
                    }}
                  >
                    {STATUS_MAP[selectedReport.status?.id]?.label || "Unknown"}
                  </span>
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Created At</span>
                <span className="detail-value">
                  {formatDate(selectedReport.created_at)}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Location</span>
                <span className="detail-value">
                  {selectedReport.latitude}, {selectedReport.longitude}
                </span>
              </div>

              <div className="detail-row">
                <span className="detail-label">Category</span>
                <span className="detail-value">
                  {selectedReport.category?.name || "N/A"}
                </span>
              </div>

              {/* Photos */}
              {selectedReport.photos?.length > 0 && (
                <div className="photos-section">
                  <span className="detail-label">Photos</span>
                  <div className="photos-grid">
                    {selectedReport.photos.map((photo, index) => (
                      <img
                        key={photo.photo_id}
                        src={photo.image_url}
                        alt="Report"
                        className="photo-thumbnail"
                        onClick={() => setSelectedImageIndex(index)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update Section */}
              <div className="status-update-section">
                <span className="detail-label">Update Status</span>
                <div className="status-buttons">
                  <button
                    className="status-btn in-progress"
                    onClick={() => handleStatusChange(3)}
                    disabled={selectedReport.status?.id === 3}
                  >
                    In Progress
                  </button>
                  <button
                    className="status-btn suspended"
                    onClick={() => handleStatusChange(4)}
                    disabled={selectedReport.status?.id === 4}
                  >
                    Suspended
                  </button>
                  <button
                    className="status-btn resolved"
                    onClick={() => handleStatusChange(6)}
                    disabled={selectedReport.status?.id === 6}
                  >
                    Resolved
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Update Confirmation Modal */}
        {showStatusModal && (
          <div
            className="modal-overlay"
            onClick={(e) =>
              e.target === e.currentTarget && setShowStatusModal(false)
            }
          >
            <div className="confirm-modal">
              <p className="confirm-question">
                Are you sure you want to change the status to{" "}
                <strong>{STATUS_MAP[newStatusId]?.label}</strong>?
              </p>
              <div className="modal-buttons">
                <button
                  className="cancel-button"
                  onClick={() => setShowStatusModal(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  className="confirm-button"
                  onClick={confirmStatusUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {selectedImageIndex !== null && selectedReport && (
          <ImagePreviewModal
            images={selectedReport.photos?.map((p) => p.image_url) || []}
            initialIndex={selectedImageIndex}
            onClose={() => setSelectedImageIndex(null)}
          />
        )}
      </div>
    </div>
  );
}

export default MaintainerPage;
