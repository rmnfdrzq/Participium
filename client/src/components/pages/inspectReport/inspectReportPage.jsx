import { useState, useEffect } from "react";
import API from "../../../API/API.js";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";

function InspectReportPage() {
  const selectedReport = useSelector((state) => state.report.selected);
  const navigate = useNavigate();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleRejectReport = () => {
    setShowRejectModal(true);
  };

  const submitRejectReason = () => {
    API.updateReportStatus(selectedReport.id, 5, rejectReason);
    setShowRejectModal(false);
    setRejectReason("");
    navigate(-1);
  };

  return (
    <div>
      <h1>Inspect Report</h1>

      {!selectedReport ? (
        <p>No report selected.</p>
      ) : (
        <div>
          <p>
            <strong>ID:</strong> {selectedReport.id}
          </p>
          <p>
            <strong>Title:</strong> {selectedReport.title}
          </p>
          <p>
            <strong>Description</strong>
            {selectedReport.description}
          </p>
          <p>
            <strong>Created At:</strong> {selectedReport.created_at}
          </p>
          <p>
            <strong>Coordinates: </strong>
            {selectedReport.latitude}, {selectedReport.longitude}
          </p>
          <p>
            <strong>Citizen: </strong>
            {selectedReport.citizen.username}
          </p>
          <p>
            <strong>Category: </strong>
            {selectedReport.category.name}
          </p>

          {/* Images part  */}
          {selectedReport.photos?.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <p>
                <strong>Photos:</strong>
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "0.5rem",
                }}
              >
                {selectedReport.photos.map((photo) => (
                  <img
                    key={photo.photo_id}
                    src={photo.image_url}
                    alt={`Report photo ${photo.photo_id}`}
                    style={{
                      width: "250px",
                      height: "180px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Buttons to accept or reject the report */}
          <button
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "green",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={() =>
              API.updateReportStatus(selectedReport.id, 2).then(() =>
                navigate(-1)
              )
            }
          >
            Approve Report
          </button>

          <button
            style={{
              marginTop: "1rem",
              marginLeft: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "red",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={handleRejectReport}
          >
            Reject Report
          </button>

          {/* Reject Modal */}

          {showRejectModal && (
            <div>
              <h3>Reject Report</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div>
                <button onClick={submitRejectReason}>Submit</button>
                <button onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InspectReportPage;
