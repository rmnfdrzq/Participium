import { useState, useActionState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector, useDispatch } from "react-redux";
import { clearLocation } from "../../../store/locationSlice";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../../../API/API.js";
import styles from "./insertReportPage.module.css";

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Create red marker icon
const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function InsertReportPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [message, setMessage] = useState("");
  const [reportCreated, setReportCreated] = useState(null);
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const location = useSelector((state) => state.location);

  // Get user info
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userInfo = await API.getUserInfo();
        setUser(userInfo);
      } catch (err) {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  // Redirect to map page if location data is missing (but not if report is already created)
  useEffect(() => {
    if (
      !reportCreated &&
      (!location.position || !location.address || !location.coordinates)
    ) {
      navigate("/map");
    }
  }, [location, navigate, reportCreated]);

  const handleInsertReport = async (reportData) => {
    try {
      if (!reportData.images || reportData.images.length === 0) {
        throw new Error("No images selected for upload.");
      }

      const imageUrls = [];

      for (const file of reportData.images) {
        const cleanFileName = file.name
          .replace(/\s+/g, "_")
          .replace(/[^\w.-]/g, "");

        // Get signed URL from server and public URL
        const { signedUrl, publicUrl } = await API.getImageUploadUrl(
          cleanFileName
        );
        if (!signedUrl) throw new Error("Failed to get signed URL.");

        // Upload image to Supabase Storage using the signed URL
        const uploadResponse = await API.uploadImageToSignedUrl(
          signedUrl,
          file
        );
        if (!uploadResponse.ok) throw new Error("Image upload failed.");

        // Store the public URL of the uploaded image
        imageUrls.push(publicUrl);
      }

      // Combine report data with uploaded image URLs
      const reportWithUrls = {
        title: reportData.title,
        description: reportData.description,
        category_id: reportData.category,
        anonymous: reportData.anonymous,
        image_urls: imageUrls,
        latitude: location.coordinates?.lat,
        longitude: location.coordinates?.lng,
      };

      // API call to save the report
      const created = await API.insertReport(reportWithUrls);

      setReportCreated(created);
      dispatch(clearLocation());
    } catch (err) {
      setMessage({ msg: err.message || err, type: "danger" });
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await API.getAllCategories(); // returns [{id, name},...]
        setCategories(data);
      } catch (error) {
        console.error("Error in get all offices:", error);
        setCategories([]); // fallback vuoto
      }
    };

    fetchCategories();
  }, []);

  return (
    <>
      {reportCreated ? (
        <ReportSummary
          report={reportCreated}
          user={user}
          message={message}
          categories={categories}
        />
      ) : (
        <InsertReportForm
          handleInsertReport={handleInsertReport}
          message={message}
          location={location}
          categories={categories}
        />
      )}
    </>
  );
}

function InsertReportForm({
  handleInsertReport,
  message,
  location,
  categories,
}) {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [state, formAction, isPending] = useActionState(insertReportFunction, {
    title: "",
    description: "",
    category: "",
    anonymous: false,
    images: [],
  });

  async function insertReportFunction(prevState, formData) {
    const reportData = {
      title: formData.get("title"),
      description: formData.get("description"),
      category: parseInt(formData.get("category")),
      anonymous: formData.get("anonymous") === "on",
      images: selectedFiles,
      latitude: location.coordinates?.lat,
      longitude: location.coordinates?.lng,
    };

    try {
      await handleInsertReport(reportData);
      return { success: true };
    } catch (error) {
      return {
        title: "",
        description: "",
        category: "",
        anonymous: false,
        images: [],
      };
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      alert("You can upload a maximum of 3 images");
      e.target.value = "";
      return;
    }
    setSelectedFiles(files);

    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const mapCenter = location.position || [45.0703, 7.6868];
  const mapZoom = location.position ? 15 : 13;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.contentWrapper}>
        {isPending && (
          <div className={styles.alert}>
            Please, wait for the server's response...
          </div>
        )}
        <div className={styles.formContainer}>
          <h1 className={styles.title}>Submit Report</h1>

          <form action={formAction} className={styles.form}>
            {/* Map Section */}
            <div className={styles.mapSection}>
              <div className={styles.mapContainer}>
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  scrollWheelZoom={false}
                  className={styles.map}
                  zoomControl={false}
                  dragging={false}
                  touchZoom={false}
                  doubleClickZoom={false}
                  boxZoom={false}
                  keyboard={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {location.position && (
                    <Marker position={location.position} icon={redIcon}>
                      <Popup>{location.address}</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
              {location.address && location.coordinates && (
                <div className={styles.locationInfo}>
                  <p className={styles.address}>
                    <strong>Address:</strong> {location.address}
                  </p>
                  <p className={styles.coordinates}>
                    <strong>Coordinates:</strong>{" "}
                    {location.coordinates.lat.toFixed(6)},{" "}
                    {location.coordinates.lng.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.label}>
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                className={styles.input}
                required
                minLength={3}
                placeholder="Enter title"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="category" className={styles.label}>
                Report Type *
              </label>
              <select
                id="category"
                name="category"
                className={styles.select}
                required
              >
                <option value="">Select report type</option>
                {categories.map((cat, index) => (
                  <option key={index} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                className={styles.textarea}
                rows={4}
                required
                minLength={10}
                placeholder="Describe the problem in detail"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="images" className={styles.label}>
                Images * (1-3 photos required)
              </label>
              <input
                type="file"
                id="images"
                name="images"
                className={styles.fileInput}
                accept="image/*"
                multiple
                required
                onChange={handleFileChange}
              />
              <p className={styles.helpText}>
                You can upload up to 3 images.{" "}
                {selectedFiles.length > 0 &&
                  `${selectedFiles.length} file(s) selected.`}
              </p>
              {previewUrls.length > 0 && (
                <div className={styles.previewContainer}>
                  {previewUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className={styles.previewImage}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className={styles.formGroup} style={{ display: "none" }}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="anonymous"
                  className={styles.checkbox}
                />
                <span>
                  Make this report anonymous (your name will not be visible in
                  the public list)
                </span>
              </label>
            </div>

            <div className={styles.footerButtons}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => navigate(-1)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={isPending || selectedFiles.length === 0}
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ReportSummary({ report, user, message, categories }) {
  const navigate = useNavigate();

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.contentWrapper}>
        <div className={styles.formContainer}>
          <h3 className={styles.title}>Report Created Successfully</h3>

          <div className={styles.successMessage}>
            Your report has been submitted successfully!
          </div>

          <div className={styles.reportDetails}>
            <h5>Report Details</h5>
            <p>
              <strong>Title:</strong> {report.title}
            </p>
            <p>
              <strong>Latitude:</strong> {report.latitude}{" "}
              <strong>Longitude:</strong> {report.longitude}
            </p>
            <p>
              <strong>Description:</strong> {report.description}
            </p>
            <p>
              <strong>Category:</strong>{" "}
              {categories.find((cat) => cat.id === report.category_id)?.name ||
                "Unknown"}
            </p>
            {/*<p>
            <strong>Anonymous:</strong> {report.anonymous ? "Yes" : "No"}
          </p>*/}
            <p>
              <strong>Images:</strong> {report.images.length} file(s) attached
            </p>
          </div>

          {!report.anonymous && (
            <div className={styles.reportDetails}>
              <h5>User Information</h5>
              <p>
                <strong>User:</strong> {user?.name || user?.username}
              </p>
              {user?.email && (
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
              )}
            </div>
          )}

          <div className={styles.footerButtons}>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => navigate("/")}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
