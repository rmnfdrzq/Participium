import { useState, useEffect } from "react";
import API from "../../../API/API.js";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { ImagePreviewModal } from "../../common/imagePreviewModal/ImagePreviewModal";
import { STATUS_MAP } from "../../../constants/statusMap";
import styles from "./inspectReportPage.module.css";

function InspectReportPage() {
  const selectedReport = useSelector((state) => state.report.selected);
  const navigate = useNavigate();

  const [loggedUser, setLoggedUser] = useState(null);
  const isTechnicalOfficer =
    loggedUser?.role === "Technical office staff member";
  const isExternalMaintainer = loggedUser?.role === "External maintainer";

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMaintainerModal, setShowMaintainerModal] = useState(false);
  const [newStatusId, setNewStatusId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [officers, setOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [selectedMaintainer, setSelectedMaintainer] = useState(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [address, setAddress] = useState("Loading address...");
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [maintainer, setMaintainer] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await API.getUserInfo();
        setLoggedUser(user);
        if (selectedReport) {
          loadOfficers();
          loadAddress();
        }
      } catch (err) {
        console.error("Failed to load user", err);
      }
    };
    load();
  }, [selectedReport]);

  const loadAddress = async () => {
    if (!selectedReport?.latitude || !selectedReport?.longitude) {
      setAddress("Address not available");
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedReport.latitude}&lon=${selectedReport.longitude}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress("Address not found");
      }
    } catch (err) {
      setAddress("Failed to load address");
    }
  };

  const loadOfficers = async () => {
    try {
      const officersData = await API.getOperatorsByOffice(
        selectedReport.office.id
      );
      setOfficers(officersData);
      if (selectedReport.assigned_to_external) {
        const reportMaintainer = officersData.find(
          (o) => o.id === selectedReport.assigned_to_external
        );
        setMaintainer(reportMaintainer);
      }
    } catch (err) {
      setError("Failed to load officers: " + err);
    }
  };

  const submitRejectReason = async () => {
    await API.updateReportStatus(selectedReport.id, 5, rejectReason);
    setShowRejectModal(false);
    setRejectReason("");
    navigate(-1);
  };

  const handleApproveClick = () => {
    if (!selectedOfficer) {
      setWarning("Please select an officer.");
      setTimeout(() => setWarning(""), 3000);
      return;
    }
    setShowApproveModal(true);
  };

  const handleAssignMaintainer = async () => {
    if (!selectedMaintainer) {
      setWarning("Please select a maintainer.");
      setTimeout(() => setWarning(""), 3000);
      return;
    }
    setShowMaintainerModal(true);
  };

  const confirmAssignMaintainer = async () => {
    await API.setMaintainerByReport(selectedReport.id, selectedMaintainer);
    setShowMaintainerModal(false);
    navigate(-1);
  };

  const confirmApproveReport = async () => {
    await API.setOperatorByReport(selectedReport.id, selectedOfficer);
    await API.updateReportStatus(selectedReport.id, 2);
    setShowApproveModal(false);
    navigate(-1);
  };

  const handleStatusChange = (statusId) => {
    setNewStatusId(statusId);
    setShowStatusModal(true);
  };

  const confirmStatusUpdate = async () => {
    await API.updateReportStatus(selectedReport.id, newStatusId);
    setShowStatusModal(false);
    navigate(-1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!selectedReport) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.noReport}>No report selected.</p>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Warning Notification */}
      {warning && (
        <div className={`${styles.notification} ${styles.warning}`}>
          {warning}
        </div>
      )}

      <div className={styles.card}>
        <h1 className={styles.title}>Inspect Report</h1>

        {/* Report Details */}
        <div className={styles.section}>
          <div className={styles.row}>
            <span className={styles.label}>Status</span>
            <span className={styles.value}>
              <span
                className={styles.statusBadge}
                style={{
                  backgroundColor:
                    STATUS_MAP[selectedReport.status.id]?.color || "#667eea",
                }}
              >
                {selectedReport.status.name}
              </span>
            </span>
          </div>

          {/* Show assigned maintainer if exists   */}
          {(isTechnicalOfficer && selectedReport.assigned_to_external) && (
            <div className={styles.row}>
              <span className={styles.label}>Assigned Maintainer</span>
              <span className={styles.value}>
                {maintainer?.username}
                {maintainer?.company && ` (${maintainer.company})`}
              </span>
            </div>
          )}

          {selectedReport.status.id === 5 && (
            <div className={styles.row}>
              <span className={styles.label}>Rejection Reason</span>
              <span className={`${styles.value} ${styles.rejection}`}>
                {selectedReport.rejection_reason || "No reason provided"}
              </span>
            </div>
          )}

          <div className={styles.row}>
            <span className={styles.label}>Title</span>
            <span className={styles.value}>{selectedReport.title}</span>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Description</span>
            <span className={styles.value}>{selectedReport.description}</span>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Created At</span>
            <span className={styles.value}>
              {formatDate(selectedReport.created_at)}
            </span>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Address</span>
            <span className={styles.value}>{address}</span>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Coordinates</span>
            <span className={styles.value}>
              {selectedReport.latitude}, {selectedReport.longitude}
            </span>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Citizen</span>
            <span className={styles.value}>
              {selectedReport.citizen?.username || "Anonymous"}
            </span>
          </div>

          <div className={styles.row}>
            <span className={styles.label}>Category</span>
            <span className={styles.value}>{selectedReport.category.name}</span>
          </div>
        </div>

        {/* Photos */}
        {selectedReport.photos?.length > 0 && (
          <div className={`${styles.section} ${styles.sectionNoBorder}`}>
            <h3 className={styles.sectionTitle}>Photos</h3>
            <div className={styles.photosGrid}>
              {selectedReport.photos.map((photo, index) => (
                <img
                  key={photo.photo_id}
                  src={photo.image_url}
                  alt="Report"
                  className={styles.photo}
                  onClick={() => setSelectedImageIndex(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Officer Assignment */}
        {selectedReport.status.id === 1 && (
          <div className={`${styles.section} ${styles.sectionNoBorder}`}>
            <h3 className={styles.sectionTitle}>Assign Officer</h3>
            <select
              value={selectedOfficer || ""}
              onChange={(e) => setSelectedOfficer(Number(e.target.value))}
              className={styles.select}
            >
              <option value="">Select an officer...</option>
              {officers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.username}
                </option>
              ))}
            </select>
            {error && <p className={styles.error}>{error}</p>}
          </div>
        )}

        {isTechnicalOfficer && selectedReport.assigned_to_external == null && (
          <div className={`${styles.section} ${styles.sectionNoBorder}`}>
            <h3 className={styles.sectionTitle}>Assign External Maintainer</h3>

            <select
              value={selectedMaintainer || ""}
              onChange={(e) => setSelectedMaintainer(Number(e.target.value))}
              className={styles.select}
            >
              <option value="">Select a maintainer...</option>
              {officers.map((maintainer) => (
                <option key={maintainer.id} value={maintainer.id}>
                  {maintainer.username} — {maintainer.company}
                </option>
              ))}
            </select>

            <button
              className={`${styles.primaryButton} ${styles.buttonSpaced}`}
              onClick={handleAssignMaintainer}
              disabled={!selectedMaintainer}
            >
              Assign Maintainer
            </button>
          </div>
        )}

        {/* Action Buttons */}
        {selectedReport.status.id === 1 && (
          <div className={styles.actionButtons}>
            <button
              className={styles.primaryButton}
              onClick={handleApproveClick}
            >
              Approve Report
            </button>
            <button
              className={styles.dangerButton}
              onClick={() => setShowRejectModal(true)}
            >
              Reject Report
            </button>
          </div>
        )}

        {/* External Maintainer Status Update */}
        {isExternalMaintainer && selectedReport.status.id !== 6 && (
          <div className={`${styles.section} ${styles.sectionNoBorder}`}>
            <h3 className={styles.sectionTitle}>Update Status</h3>
            <div className={styles.actionButtons}>
              <button
                className={styles.primaryButton}
                onClick={() => handleStatusChange(3)}
                disabled={selectedReport.status.id === 3}
              >
                Mark as In Progress
              </button>
              <button
                className={styles.warningButton}
                onClick={() => handleStatusChange(4)}
                disabled={selectedReport.status.id === 4}
              >
                Mark as Suspended
              </button>
              <button
                className={styles.successButton}
                onClick={() => handleStatusChange(6)}
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className={styles.footerButtons}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            Back
          </button>

          {/*Comment page button */}
          {(isTechnicalOfficer || isExternalMaintainer) && (
            <button
              className={styles.backButton}
              onClick={() => navigate("/comments")}
              disabled={!maintainer && isTechnicalOfficer} 
            >
              View Comments
            </button>
          )}
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div
          className={styles.confirmModalOverlay}
          onClick={(e) =>
            e.target === e.currentTarget && setShowApproveModal(false)
          }
        >
          <div className={styles.confirmModal}>
            <p className={styles.confirmQuestion}>
              Are you sure you want to approve this report?
            </p>
            <div className={styles.confirmModalButtons}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowApproveModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={confirmApproveReport}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Reject Report</h3>
            <p className={styles.modalDescription}>
              Please provide a reason for rejecting this report.
            </p>

            <textarea
              className={styles.textarea}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
            />

            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.dangerButton}
                onClick={submitRejectReason}
                disabled={rejectReason.trim().length < 5}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Confirmation Modal */}
      {showStatusModal && (
        <div
          className={styles.confirmModalOverlay}
          onClick={(e) =>
            e.target === e.currentTarget && setShowStatusModal(false)
          }
        >
          <div className={styles.confirmModal}>
            <p className={styles.confirmQuestion}>
              Are you sure you want to change the status to{" "}
              <strong>{STATUS_MAP[newStatusId]?.label}</strong>?
            </p>
            <div className={styles.confirmModalButtons}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={confirmStatusUpdate}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maintainer Assignment Confirmation Modal */}
      {showMaintainerModal && (
        <div
          className={styles.confirmModalOverlay}
          onClick={(e) =>
            e.target === e.currentTarget && setShowMaintainerModal(false)
          }
        >
          <div className={styles.confirmModal}>
            <p className={styles.confirmQuestion}>
              Are you sure you want to assign this report to the selected maintainer?
            </p>
            <div className={styles.confirmModalButtons}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowMaintainerModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={confirmAssignMaintainer}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImageIndex !== null && (
        <ImagePreviewModal
          images={selectedReport.photos?.map((p) => p.image_url) || []}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}
    </div>
  );
}

export default InspectReportPage;