import { useState, useEffect } from "react";
import API from "../../../API/API.js";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import styles from "./inspectReportPage.module.css";

function InspectReportPage() {
  const selectedReport = useSelector((state) => state.report.selected);
  const navigate = useNavigate();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [officers, setOfficers] = useState([]);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedReport) loadOfficers();
  }, [selectedReport]);

  const loadOfficers = async () => {
    try {
      const officersData = await API.getOperatorsByOffice(
        selectedReport.office.id
      );
      setOfficers(officersData);
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

  const approveReport = async () => {
    if (!selectedOfficer) {
      alert("Please select an officer.");
      return;
    }

    await API.setOperatorByReport(selectedReport.id, selectedOfficer);
    await API.updateReportStatus(selectedReport.id, 2);
    navigate(-1);
  };

  return (
    <div className={styles.pageContainer}>

      <button className={styles.backButton} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <h1 className={styles.pageTitle}>Inspect Report</h1>

      {!selectedReport ? (
        <p>No report selected.</p>
      ) : (
        <>
          <div className={styles.reportSection}>
            <p className={styles.labelRow}><strong>ID:</strong> {selectedReport.id}</p>
            <p className={styles.labelRow}><strong>Status:</strong> {selectedReport.status.name}</p>
            {selectedReport.status.id === 5 && (
            <p className={styles.labelRow}><strong>Rejection Reason:</strong> {selectedReport.rejection_reason || "No reason provided"}</p>)}
            <p className={styles.labelRow}><strong>Title:</strong> {selectedReport.title}</p>
            <p className={styles.labelRow}><strong>Description:</strong> {selectedReport.description}</p>
            <p className={styles.labelRow}><strong>Created At:</strong> {selectedReport.created_at}</p>
            <p className={styles.labelRow}><strong>Coordinates:</strong> {selectedReport.latitude}, {selectedReport.longitude}</p>
            <p className={styles.labelRow}><strong>Citizen:</strong> {selectedReport.citizen.username}</p>
            <p className={styles.labelRow}><strong>Category:</strong> {selectedReport.category.name}</p>

            {selectedReport.photos?.length > 0 && (
              <>
                <strong>Photos:</strong>
                <div className={styles.photosContainer}>
                  {selectedReport.photos.map((photo) => (
                    <img
                      key={photo.photo_id}
                      src={photo.image_url}
                      alt="Report"
                      className={styles.photoItem}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Officer Dropdown */}
          {selectedReport.status.id == 1 &&<div className={styles.reportSection}>
            <strong>Assign Officer:</strong>
            <select
              value={selectedOfficer || ""}
              onChange={(e) => setSelectedOfficer(Number(e.target.value))}
              className={styles.select}
            >
              <option value="">-- Select an Officer --</option>
              {officers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.username}
                </option>
              ))}
            </select>

            {error && <p className={styles.errorMessage}>{error}</p>}
          </div>}

          {selectedReport.status.id == 1 && <div className={styles.buttonRow}>
            <button className={styles.primaryButton} onClick={approveReport}>
              Approve Report
            </button>

            <button
              className={styles.dangerButton}
              onClick={() => setShowRejectModal(true)}
            >
              Reject Report
            </button>
          </div>}
        </>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3 className={styles.modalTitle}>Reject Report</h3>

            <textarea
              className={styles.modalTextarea}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
            />

            <div className={styles.modalActions}>
              <button
                className={styles.primaryButton}
                onClick={submitRejectReason}
                disabled={rejectReason.trim().length < 5}
              >
                Submit
              </button>
              <button
                className={styles.dangerButton}
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InspectReportPage;
