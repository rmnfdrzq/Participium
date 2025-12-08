import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import API from "../../../API/API.js";
import styles from "./profilePage.module.css";

export default function ProfilePage({
  user,
  citizenProfile,
  setCitizenProfile,
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    telegram_username: "",
    email_notifications: false,
    profile_photo_url: "",
    verified: false,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadProfile();
  }, [user, navigate]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await API.getCitizenProfile();
      setFormData({
        username: data.username || "",
        email: data.email || "",
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        telegram_username: data.telegram_username || "",
        email_notifications: data.email_notifications || false,
        profile_photo_url: data.profile_photo_url || "",
        verified: data.verified || false,
      });
      // Also update the shared state
      if (setCitizenProfile) {
        setCitizenProfile(data);
      }
    } catch (err) {
      setError("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    let newValue = type === "checkbox" ? checked : value;

    // Special handling for telegram_username - ensure it starts with @
    if (name === "telegram_username" && newValue) {
      // Remove any leading @ symbols first, then add one
      newValue = "@" + newValue.replace(/^@+/, "");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
    setError("");
    setSuccess("");
  };

  const handleAvatarClick = () => {
    if (!isUploadingAvatar) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB");
      return;
    }

    setError("");
    setIsUploadingAvatar(true);

    try {
      // Get signed URL for upload
      const { signedUrl, publicUrl } = await API.getImageUploadUrl(file.name);

      // Upload image to signed URL
      await API.uploadImageToSignedUrl(signedUrl, file);

      // Update profile with new avatar URL
      await API.updateCitizenProfile({ profile_photo_url: publicUrl });

      // Update local state
      setFormData((prev) => ({ ...prev, profile_photo_url: publicUrl }));

      // Update shared state so Header updates immediately
      if (setCitizenProfile) {
        setCitizenProfile((prev) => ({
          ...prev,
          profile_photo_url: publicUrl,
        }));
      }

      setSuccess("Avatar updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      // Clean telegram_username - if it's just "@" or empty, send empty string
      const cleanTelegramUsername =
        formData.telegram_username && formData.telegram_username !== "@"
          ? formData.telegram_username
          : "";

      const updates = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        telegram_username: cleanTelegramUsername,
        email_notifications: formData.email_notifications,
      };

      await API.updateCitizenProfile(updates);

      // Update shared state so Header updates immediately
      if (setCitizenProfile) {
        setCitizenProfile((prev) => ({ ...prev, ...updates }));
      }

      setSuccess("Changes saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = () => {
    const first = formData.first_name?.[0] || "";
    const last = formData.last_name?.[0] || "";
    return (
      (first + last).toUpperCase() ||
      formData.username?.[0]?.toUpperCase() ||
      "?"
    );
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loader}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.profileCard}>
        <h1 className={styles.title}>My Profile</h1>

        {error && (
          <div className={`${styles.notification} ${styles.error}`}>
            {error}
          </div>
        )}
        {success && (
          <div className={`${styles.notification} ${styles.success}`}>
            {success}
          </div>
        )}

        {/* Avatar Section */}
        <div className={styles.avatarSection}>
          <div
            className={`${styles.avatarWrapper} ${
              isUploadingAvatar ? styles.uploading : ""
            }`}
            onClick={handleAvatarClick}
            title={
              isUploadingAvatar ? "Uploading..." : "Click to change avatar"
            }
          >
            {formData.profile_photo_url && !isUploadingAvatar ? (
              <img
                src={formData.profile_photo_url}
                alt="Avatar"
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {isUploadingAvatar ? null : getInitials()}
              </div>
            )}

            {/* Loader overlay when uploading */}
            {isUploadingAvatar && (
              <div className={styles.avatarLoaderOverlay}>
                <div className={styles.spinner}></div>
              </div>
            )}

            {/* Camera overlay on hover (only when not uploading) */}
            {!isUploadingAvatar && (
              <div className={styles.avatarOverlay}>
                <svg
                  className={styles.cameraIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className={styles.fileInput}
            disabled={isUploadingAvatar}
          />
          <span className={styles.avatarHint}>
            {isUploadingAvatar
              ? "Uploading photo..."
              : "Click to upload a new photo"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              className={styles.input}
              disabled
            />
            <span className={styles.hint}>Username cannot be changed</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              className={styles.input}
              disabled
            />
            <span className={styles.hint}>Email cannot be changed</span>
          </div>

          {/* Verification Status */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Verification</label>
            {formData.verified ? (
              <div className={styles.verifiedBadge}>
                <span className={styles.verifiedIcon}>✓</span>
                <span>Verified</span>
              </div>
            ) : (
              <div className={styles.unverifiedSection}>
                <span className={styles.unverifiedText}>Not verified</span>
                <button
                  type="button"
                  className={styles.verifyButton}
                  onClick={() => navigate("/verify-email", { state: { fromProfile: true } })}
                >
                  Verify Email
                </button>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>First Name</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Last Name</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Telegram Username</label>
            <input
              type="text"
              name="telegram_username"
              value={formData.telegram_username}
              onChange={handleChange}
              className={styles.input}
              placeholder="@your_username"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="email_notifications"
                checked={formData.email_notifications}
                onChange={handleChange}
                className={styles.checkbox}
              />
              <span>Receive email notifications</span>
            </label>
          </div>

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
