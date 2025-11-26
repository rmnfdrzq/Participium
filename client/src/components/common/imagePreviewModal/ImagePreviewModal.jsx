import styles from "./imagePreviewModal.module.css";

export function ImagePreviewModal({ imageUrl, onClose }) {
  if (!imageUrl) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.closeButton} onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <img
        src={imageUrl}
        alt="Preview"
        className={styles.image}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

